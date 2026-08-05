-- 0070_accounting_ledger_backed_views.sql
-- Make official Accounting V2 summaries read return-sensitive amounts from the
-- immutable double-entry ledger, include AQUAVO fulfillment in per-order
-- contribution profit, and serialize return verification per order.
BEGIN;

CREATE OR REPLACE FUNCTION public.accounting_period_account_balance(
  p_period_key text,
  p_account_code text
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $function$
  SELECT COALESCE(SUM(
    CASE
      WHEN a.normal_side='debit' THEN l.debit-l.credit
      ELSE l.credit-l.debit
    END
  ),0)
  FROM public.journal_entries j
  JOIN public.journal_lines l ON l.entry_id=j.id
  JOIN public.chart_of_accounts a ON a.code=l.account_code
  WHERE j.period_key=p_period_key
    AND j.status='posted'
    AND l.account_code=p_account_code
$function$;

-- Keep the public view shape unchanged for the API while replacing only the
-- four metrics whose raw-table formulas diverge after reversals.
DO $do$
DECLARE
  v_def text;
  v_alias text;
  v_alias_pos integer;
  v_prefix text;
  v_rev_pos integer;
  v_start integer;
  v_end integer;
  v_marker constant text:='COALESCE(( SELECT sum(';
BEGIN
  SELECT pg_get_viewdef(
    'public.v_accounting_period_readiness'::regclass,
    true
  ) INTO v_def;

  v_alias:=' AS cogs,';
  v_alias_pos:=position(v_alias IN v_def);
  v_prefix:=left(v_def,v_alias_pos-1);
  v_rev_pos:=position(reverse(v_marker) IN reverse(v_prefix));
  IF v_alias_pos=0 OR v_rev_pos=0 THEN
    RAISE EXCEPTION 'PATCH_COGS_NOT_FOUND';
  END IF;
  v_start:=length(v_prefix)-v_rev_pos-length(v_marker)+2;
  v_end:=v_alias_pos+length(v_alias)-1;
  v_def:=
    left(v_def,v_start-1)||
    'public.accounting_period_account_balance(m.period_key, ''4000''::text) AS cogs,'||
    substring(v_def FROM v_end+1);

  v_alias:=' AS fulfillment_cost,';
  v_alias_pos:=position(v_alias IN v_def);
  v_prefix:=left(v_def,v_alias_pos-1);
  v_rev_pos:=position(reverse(v_marker) IN reverse(v_prefix));
  IF v_alias_pos=0 OR v_rev_pos=0 THEN
    RAISE EXCEPTION 'PATCH_FULFILLMENT_NOT_FOUND';
  END IF;
  v_start:=length(v_prefix)-v_rev_pos-length(v_marker)+2;
  v_end:=v_alias_pos+length(v_alias)-1;
  v_def:=
    left(v_def,v_start-1)||
    'public.accounting_period_account_balance(m.period_key, ''5100''::text) AS fulfillment_cost,'||
    substring(v_def FROM v_end+1);

  v_alias:=' AS sales_returns,';
  v_alias_pos:=position(v_alias IN v_def);
  v_prefix:=left(v_def,v_alias_pos-1);
  v_rev_pos:=position(reverse(v_marker) IN reverse(v_prefix));
  IF v_alias_pos=0 OR v_rev_pos=0 THEN
    RAISE EXCEPTION 'PATCH_SALES_RETURNS_NOT_FOUND';
  END IF;
  v_start:=length(v_prefix)-v_rev_pos-length(v_marker)+2;
  v_end:=v_alias_pos+length(v_alias)-1;
  v_def:=
    left(v_def,v_start-1)||
    'public.accounting_period_account_balance(m.period_key, ''4100''::text) AS sales_returns,'||
    substring(v_def FROM v_end+1);

  v_alias:=' AS actual_return_loss,';
  v_alias_pos:=position(v_alias IN v_def);
  v_prefix:=left(v_def,v_alias_pos-1);
  v_rev_pos:=position(reverse(v_marker) IN reverse(v_prefix));
  IF v_alias_pos=0 OR v_rev_pos=0 THEN
    RAISE EXCEPTION 'PATCH_RETURN_LOSS_NOT_FOUND';
  END IF;
  v_start:=length(v_prefix)-v_rev_pos-length(v_marker)+2;
  v_end:=v_alias_pos+length(v_alias)-1;
  v_def:=
    left(v_def,v_start-1)||
    'public.accounting_period_account_balance(m.period_key, ''4200''::text) AS actual_return_loss,'||
    substring(v_def FROM v_end+1);

  EXECUTE
    'CREATE OR REPLACE VIEW public.v_accounting_period_readiness AS '||v_def;
END;
$do$;

CREATE OR REPLACE VIEW public.v_order_accounting AS
SELECT
  f.order_id,
  o.order_number,
  o.source,
  o.status,
  o.payment_status,
  o.cod_received,
  f.recognized_at,
  f.period_key,
  f.gross_collected,
  f.customer_delivery_fee,
  f.carrier_fee,
  f.product_revenue,
  f.merchant_net,
  f.delivery_subsidy,
  f.delivery_surplus,
  f.cash_custody,
  f.cogs_amount,
  f.cost_status,
  CASE
    WHEN f.cogs_amount IS NULL THEN NULL::numeric
    ELSE
      f.product_revenue-
      f.cogs_amount-
      f.delivery_subsidy-
      COALESCE(
        (
          SELECT SUM(e.actual_cost)
          FROM public.order_fulfillment_events e
          WHERE e.order_id=f.order_id
            AND e.event_type='original'
            AND e.workflow_state='confirmed'
        ),
        CASE
          WHEN COALESCE(o.box_cost,0)>0 THEN o.box_cost
          ELSE 0
        END
      )
  END AS contribution_profit,
  CASE
    WHEN s.id IS NULL THEN 'unsettled'::text
    ELSE s.status
  END AS settlement_status,
  s.settlement_id,
  f.policy_version
FROM public.order_accounting_facts f
JOIN public.orders o ON o.id=f.order_id
LEFT JOIN public.order_accounting_settlements s ON s.order_fact_id=f.id;

-- PostgreSQL executes triggers with the same timing/event in name order. This
-- lock trigger therefore runs before order_returns_prepare_verification and
-- serializes every return approval for one order. A second transaction waits,
-- then re-reads already-verified quantities instead of approving an over-return.
CREATE OR REPLACE FUNCTION public.lock_order_return_verification()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status='verified' AND OLD.status IS DISTINCT FROM 'verified' THEN
    PERFORM pg_advisory_xact_lock(
      hashtextextended('accounting-return:'||NEW.order_id,0)
    );
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS order_returns_00_lock_verification
ON public.order_return_events;

CREATE TRIGGER order_returns_00_lock_verification
BEFORE UPDATE OF status ON public.order_return_events
FOR EACH ROW
EXECUTE FUNCTION public.lock_order_return_verification();

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0070_accounting_ledger_backed_views',
  '7405ed5956e2d1e583a03c7f87565d342eee06aa0a3e65375dc23033468854b7',
  'Read return-sensitive metrics from the ledger, include fulfillment in contribution profit, and serialize return verification per order'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
