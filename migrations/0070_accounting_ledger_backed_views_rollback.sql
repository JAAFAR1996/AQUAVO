-- 0070_accounting_ledger_backed_views_rollback.sql
-- Restores the pre-0070 raw-table reporting formulas and per-order contribution
-- formula, removes the return-verification lock, then removes the period helper.
BEGIN;

DROP TRIGGER IF EXISTS order_returns_00_lock_verification
ON public.order_return_events;
DROP FUNCTION IF EXISTS public.lock_order_return_verification();

DO $do$
DECLARE
  v_def text;
  v_old text;
  v_new text;
BEGIN
  SELECT pg_get_viewdef(
    'public.v_accounting_period_readiness'::regclass,
    true
  ) INTO v_def;

  -- pg_get_viewdef normalizes schema and relation aliases differently between
  -- PostgreSQL releases. Accept both the authored and normalized expressions so
  -- rollback is based on semantics rather than one exact pretty-printed string.
  v_old:='public.accounting_period_account_balance(m.period_key, ''4000''::text)';
  IF position(v_old IN v_def)=0 THEN
    v_old:='accounting_period_account_balance(period_key, ''4000''::text)';
  END IF;
  v_new:='COALESCE(( SELECT sum(f.cogs_amount) AS sum FROM order_accounting_facts f WHERE f.period_key = m.period_key), 0::numeric)';
  IF position(v_old IN v_def)=0 THEN
    RAISE EXCEPTION '0070_ROLLBACK_BLOCKED: ledger-backed COGS expression not found';
  END IF;
  v_def:=replace(v_def,v_old,v_new);

  v_old:='public.accounting_period_account_balance(m.period_key, ''5100''::text)';
  IF position(v_old IN v_def)=0 THEN
    v_old:='accounting_period_account_balance(period_key, ''5100''::text)';
  END IF;
  v_new:='COALESCE(( SELECT sum(CASE WHEN (EXISTS ( SELECT 1 FROM order_fulfillment_events e WHERE e.order_id = f.order_id AND e.event_type = ''original''::text AND e.workflow_state = ''confirmed''::text)) THEN ( SELECT sum(e.actual_cost) AS sum FROM order_fulfillment_events e WHERE e.order_id = f.order_id AND e.event_type = ''original''::text AND e.workflow_state = ''confirmed''::text) ELSE o.box_cost END) AS sum FROM order_accounting_facts f JOIN orders o ON o.id = f.order_id WHERE f.period_key = m.period_key), 0::numeric)';
  IF position(v_old IN v_def)=0 THEN
    RAISE EXCEPTION '0070_ROLLBACK_BLOCKED: ledger-backed fulfillment expression not found';
  END IF;
  v_def:=replace(v_def,v_old,v_new);

  v_old:='public.accounting_period_account_balance(m.period_key, ''4100''::text)';
  IF position(v_old IN v_def)=0 THEN
    v_old:='accounting_period_account_balance(period_key, ''4100''::text)';
  END IF;
  v_new:='COALESCE(( SELECT sum(r.refund_amount) AS sum FROM order_return_events r WHERE r.status = ''verified''::text AND to_char(((r.updated_at AT TIME ZONE ''UTC''::text) AT TIME ZONE ''Asia/Baghdad''::text), ''YYYY-MM''::text) = m.period_key), 0::numeric)';
  IF position(v_old IN v_def)=0 THEN
    RAISE EXCEPTION '0070_ROLLBACK_BLOCKED: ledger-backed sales-return expression not found';
  END IF;
  v_def:=replace(v_def,v_old,v_new);

  v_old:='public.accounting_period_account_balance(m.period_key, ''4200''::text)';
  IF position(v_old IN v_def)=0 THEN
    v_old:='accounting_period_account_balance(period_key, ''4200''::text)';
  END IF;
  v_new:='COALESCE(( SELECT sum(COALESCE(r.delivery_cost_loss, 0::numeric) + COALESCE(r.return_shipping_cost, 0::numeric) + COALESCE(r.packaging_loss, 0::numeric) + COALESCE(r.product_write_off_amount, 0::numeric) + CASE WHEN r.restocked = true THEN 0::numeric ELSE COALESCE(r.cogs_loss, 0::numeric) END) AS sum FROM order_return_events r WHERE r.status = ''verified''::text AND to_char(((r.updated_at AT TIME ZONE ''UTC''::text) AT TIME ZONE ''Asia/Baghdad''::text), ''YYYY-MM''::text) = m.period_key), 0::numeric)';
  IF position(v_old IN v_def)=0 THEN
    RAISE EXCEPTION '0070_ROLLBACK_BLOCKED: ledger-backed return-loss expression not found';
  END IF;
  v_def:=replace(v_def,v_old,v_new);

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
    ELSE f.product_revenue-f.cogs_amount-f.delivery_subsidy
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

DROP FUNCTION IF EXISTS public.accounting_period_account_balance(text,text);

UPDATE public.schema_migrations
SET rolled_back_at=now()
WHERE version='0070_accounting_ledger_backed_views'
  AND rolled_back_at IS NULL;

COMMIT;
