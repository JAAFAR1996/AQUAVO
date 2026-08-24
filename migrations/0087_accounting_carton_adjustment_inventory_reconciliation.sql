-- 0087_accounting_carton_adjustment_inventory_reconciliation.sql
-- Keep fulfillment adjustments, per-order reporting and inventory valuation aligned
-- with the immutable accounting ledger. Historical carton evidence gaps are waived
-- by the owner; no carton cost is invented for those old orders.

BEGIN;

DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE version='0086_accounting_cutover_readiness_and_test_reporting'
      AND rolled_back_at IS NULL
  ) THEN
    RAISE EXCEPTION '0087_REQUIRES_ACTIVE_0086';
  END IF;
END
$guard$;

CREATE OR REPLACE FUNCTION public.post_fulfillment_adjustment_journal(p_event_id text)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  e public.order_fulfillment_events%ROWTYPE;
  f public.order_accounting_facts%ROWTYPE;
  v_entry_id text;
  v_entry_at timestamptz;
  v_period text;
BEGIN
  SELECT * INTO e FROM public.order_fulfillment_events WHERE id=p_event_id;
  IF NOT FOUND OR e.event_type<>'adjustment' OR e.workflow_state<>'confirmed' THEN
    RETURN NULL;
  END IF;
  IF e.cost_status NOT IN ('exact','verified_zero') OR e.actual_cost IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO f FROM public.order_accounting_facts WHERE order_id=e.order_id;
  IF NOT FOUND THEN
    -- Adjustments may be confirmed before delivery. The delivery-time fulfillment
    -- posting function replays confirmed adjustments after the accounting fact exists.
    RETURN NULL;
  END IF;

  SELECT id INTO v_entry_id
  FROM public.journal_entries
  WHERE source_type='order_fulfillment_event'
    AND source_id=e.id
    AND event_kind='fulfillment_adjustment_recognition';

  IF FOUND THEN
    IF (SELECT total_debit FROM public.journal_entries WHERE id=v_entry_id)<>e.actual_cost THEN
      RAISE EXCEPTION 'FULFILLMENT_ADJUSTMENT_JOURNAL_IMMUTABLE: cost changed for event %',e.id;
    END IF;
    RETURN v_entry_id;
  END IF;

  v_entry_at:=GREATEST(e.recorded_at,f.recognized_at);
  v_period:=to_char(v_entry_at AT TIME ZONE 'Asia/Baghdad','YYYY-MM');

  INSERT INTO public.journal_entries(
    entry_date,period_key,source_type,source_id,event_kind,description,
    total_debit,total_credit,evidence,created_by
  ) VALUES(
    v_entry_at,v_period,'order_fulfillment_event',e.id,
    'fulfillment_adjustment_recognition','إثبات كلفة تعديل تجهيز وتغليف AQUAVO',
    e.actual_cost,e.actual_cost,
    jsonb_build_object(
      'order_id',e.order_id,
      'order_accounting_fact_id',f.id,
      'fulfillment_event_id',e.id,
      'source','confirmed_fulfillment_adjustment'
    ),
    e.recorded_by
  ) RETURNING id INTO v_entry_id;

  INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo)
  VALUES(v_entry_id,1,'5100',e.actual_cost,'تعديل مواد تجهيز وتغليف الطلب');

  INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo)
  VALUES(v_entry_id,2,'1210',e.actual_cost,'استهلاك إضافي من مخزون مواد التجهيز');

  PERFORM public.validate_journal_entry(v_entry_id);
  RETURN v_entry_id;
END
$function$;

CREATE OR REPLACE FUNCTION public.post_order_fulfillment_journal(p_order_id text)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  f public.order_accounting_facts%ROWTYPE;
  o public.orders%ROWTYPE;
  v_entry_id text;
  v_events bigint;
  v_bad bigint;
  v_cost numeric;
BEGIN
  SELECT * INTO f FROM public.order_accounting_facts WHERE order_id=p_order_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO o FROM public.orders WHERE id=p_order_id;

  SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER(WHERE cost_status NOT IN ('exact','verified_zero') OR actual_cost IS NULL)::bigint,
    COALESCE(SUM(actual_cost) FILTER(
      WHERE cost_status IN ('exact','verified_zero') AND actual_cost IS NOT NULL
    ),0)
  INTO v_events,v_bad,v_cost
  FROM public.order_fulfillment_events
  WHERE order_id=p_order_id
    AND event_type='original'
    AND workflow_state='confirmed';

  IF v_events=0 THEN
    v_cost:=COALESCE(o.box_cost,0);
    IF v_cost<=0 THEN RETURN NULL; END IF;
  ELSIF v_bad>0 THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_entry_id
  FROM public.journal_entries
  WHERE source_type='order'
    AND source_id=p_order_id
    AND event_kind='fulfillment_recognition';

  IF FOUND THEN
    IF (SELECT total_debit FROM public.journal_entries WHERE id=v_entry_id)<>v_cost THEN
      RAISE EXCEPTION 'FULFILLMENT_JOURNAL_IMMUTABLE: cost changed for order %; reverse and repost',p_order_id;
    END IF;
  ELSE
    INSERT INTO public.journal_entries(
      entry_date,period_key,source_type,source_id,event_kind,description,
      total_debit,total_credit,evidence
    ) VALUES(
      f.recognized_at,f.period_key,'order',p_order_id,'fulfillment_recognition',
      'إثبات كلفة مواد تجهيز وتغليف AQUAVO',v_cost,v_cost,
      jsonb_build_object(
        'order_accounting_fact_id',f.id,
        'source',CASE WHEN v_events>0 THEN 'confirmed_fulfillment_event' ELSE 'legacy_box_cost' END
      )
    ) RETURNING id INTO v_entry_id;

    INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo)
    VALUES(v_entry_id,1,'5100',v_cost,'مواد تجهيز وتغليف الطلب');

    INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo)
    VALUES(v_entry_id,2,'1210',v_cost,'استهلاك مخزون مواد التجهيز');

    PERFORM public.validate_journal_entry(v_entry_id);
  END IF;

  -- If a carton adjustment was chosen before delivery, it could not be posted at
  -- confirmation time because the accounting fact did not exist yet. Replay it now.
  PERFORM public.post_fulfillment_adjustment_journal(e.id)
  FROM public.order_fulfillment_events e
  WHERE e.order_id=p_order_id
    AND e.event_type='adjustment'
    AND e.workflow_state='confirmed';

  RETURN v_entry_id;
END
$function$;

CREATE OR REPLACE FUNCTION public.post_fulfillment_after_confirmation()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_original text;
  v_reversal text;
  v_total numeric;
  v_period text;
  v_kind text;
BEGIN
  IF NEW.workflow_state='confirmed'
     AND (
       TG_OP='INSERT'
       OR OLD.workflow_state IS DISTINCT FROM 'confirmed'
       OR OLD.actual_cost IS DISTINCT FROM NEW.actual_cost
       OR OLD.cost_status IS DISTINCT FROM NEW.cost_status
     ) THEN
    IF NEW.event_type='original' THEN
      PERFORM public.post_order_fulfillment_journal(NEW.order_id);
    ELSIF NEW.event_type='adjustment' THEN
      PERFORM public.post_fulfillment_adjustment_journal(NEW.id);
    END IF;
  END IF;

  IF TG_OP='UPDATE'
     AND OLD.workflow_state='confirmed'
     AND NEW.workflow_state='reversed'
     AND OLD.event_type IN ('original','adjustment') THEN
    IF OLD.event_type='original' THEN
      SELECT id,total_debit,period_key
      INTO v_original,v_total,v_period
      FROM public.journal_entries
      WHERE source_type='order'
        AND source_id=NEW.order_id
        AND event_kind='fulfillment_recognition';
      v_kind:='fulfillment_reversal';
    ELSE
      SELECT id,total_debit,period_key
      INTO v_original,v_total,v_period
      FROM public.journal_entries
      WHERE source_type='order_fulfillment_event'
        AND source_id=NEW.id
        AND event_kind='fulfillment_adjustment_recognition';
      v_kind:='fulfillment_adjustment_reversal';
    END IF;

    IF v_original IS NOT NULL THEN
      INSERT INTO public.journal_entries(
        entry_date,period_key,source_type,source_id,event_kind,description,
        total_debit,total_credit,reversal_of_entry_id,evidence,created_by
      ) VALUES(
        clock_timestamp(),
        to_char(clock_timestamp() AT TIME ZONE 'Asia/Baghdad','YYYY-MM'),
        'order_fulfillment_event',NEW.id,v_kind,
        'عكس كلفة تجهيز طلب: '||COALESCE(NEW.adjustment_reason,'تم عكس حدث التجهيز'),
        v_total,v_total,v_original,
        jsonb_build_object('order_id',NEW.order_id,'original_period',v_period),
        NEW.recorded_by
      )
      ON CONFLICT(source_type,source_id,event_kind) DO NOTHING
      RETURNING id INTO v_reversal;

      IF v_reversal IS NOT NULL THEN
        INSERT INTO public.journal_lines(
          entry_id,line_number,account_code,debit,credit,memo,dimensions
        )
        SELECT
          v_reversal,line_number,account_code,credit,debit,
          'عكس: '||COALESCE(memo,''),dimensions
        FROM public.journal_lines
        WHERE entry_id=v_original
        ORDER BY line_number;
        PERFORM public.validate_journal_entry(v_reversal);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END
$function$;

CREATE OR REPLACE FUNCTION public.accounting_order_account_balance(
  p_order_id text,
  p_account_code text
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $function$
  SELECT CASE WHEN COUNT(*)=0 THEN NULL::numeric ELSE SUM(
    CASE
      WHEN a.normal_side='debit' THEN l.debit-l.credit
      ELSE l.credit-l.debit
    END
  ) END
  FROM public.journal_entries j
  JOIN public.journal_lines l ON l.entry_id=j.id
  JOIN public.chart_of_accounts a ON a.code=l.account_code
  WHERE j.status='posted'
    AND l.account_code=p_account_code
    AND (
      j.source_id=p_order_id
      OR j.evidence->>'order_id'=p_order_id
    )
$function$;

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
  COALESCE(
    public.accounting_order_account_balance(f.order_id,'3000'),
    f.product_revenue
  ) AS product_revenue,
  f.merchant_net,
  f.delivery_subsidy,
  f.delivery_surplus,
  f.cash_custody,
  f.cogs_amount,
  f.cost_status,
  CASE
    WHEN f.cogs_amount IS NULL THEN NULL::numeric
    ELSE
      COALESCE(public.accounting_order_account_balance(f.order_id,'3000'),f.product_revenue)
      - f.cogs_amount
      - f.delivery_subsidy
      - COALESCE(
          public.accounting_order_account_balance(f.order_id,'5100'),
          (
            SELECT SUM(e.actual_cost)
            FROM public.order_fulfillment_events e
            WHERE e.order_id=f.order_id
              AND e.workflow_state='confirmed'
          ),
          CASE WHEN COALESCE(o.box_cost,0)>0 THEN o.box_cost ELSE 0 END
        )
  END AS contribution_profit,
  CASE WHEN s.id IS NULL THEN 'unsettled'::text ELSE s.status END AS settlement_status,
  s.settlement_id,
  f.policy_version
FROM public.order_accounting_facts f
JOIN public.orders o ON o.id=f.order_id
LEFT JOIN public.order_accounting_settlements s ON s.order_fact_id=f.id
WHERE COALESCE(o.is_test,false)=false;

-- v_accounting_period_readiness previously compared non-variant products only to
-- inventory movements whose variant_id was NULL. Products collapsed from a sole
-- default variant therefore showed false mismatches. Reuse the canonical queue,
-- which already resolves those source-shape transitions correctly.
DO $patch$
DECLARE
  v_def text;
  v_start integer;
  v_marker_pos integer;
  v_end integer;
  v_marker constant text := '), flags AS (';
BEGIN
  SELECT pg_get_viewdef('public.v_accounting_period_readiness'::regclass,true)
  INTO v_def;

  v_start:=position('inventory_check AS (' IN v_def);
  IF v_start=0 THEN RAISE EXCEPTION '0087_INVENTORY_CHECK_START_NOT_FOUND'; END IF;

  v_marker_pos:=position(v_marker IN substring(v_def FROM v_start));
  IF v_marker_pos=0 THEN RAISE EXCEPTION '0087_INVENTORY_CHECK_END_NOT_FOUND'; END IF;

  v_end:=v_start+v_marker_pos-2;
  v_def:=left(v_def,v_start-1)
    ||'inventory_check AS (SELECT COUNT(*)::bigint AS mismatches FROM public.inventory_reconciliation_queue)'
    ||substring(v_def FROM v_end+2);

  EXECUTE 'CREATE OR REPLACE VIEW public.v_accounting_period_readiness AS '||v_def;
END
$patch$;

-- Three products were collapsed from a single default variant to non-variant
-- storefront products, but their top-level cost_price stayed at an obsolete
-- value. Their verified default-variant costs are authoritative and already match
-- the GL inventory valuation.
WITH costs AS (
  SELECT
    p.id,
    (
      SELECT NULLIF(v.value->>'costPrice','')::numeric
      FROM jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) v(value)
      WHERE COALESCE((v.value->>'isDefault')::boolean,false)=true
      LIMIT 1
    ) AS new_cost
  FROM public.products p
  WHERE p.id IN (
    'houyi-ceramic-ring',
    'houyi-breathing-ring-white',
    'houyi-feeding-cup'
  )
    AND COALESCE(p.has_variants,false)=false
)
UPDATE public.products p
SET
  cost_price=c.new_cost,
  cost_resolution_note=concat_ws(
    ' | ',
    NULLIF(p.cost_resolution_note,''),
    '0087 sync top-level cost to sole default variant after variant collapse'
  ),
  cost_resolution_by='migration_0087',
  cost_resolution_at=clock_timestamp()
FROM costs c
WHERE p.id=c.id
  AND c.new_cost IS NOT NULL
  AND p.cost_price IS DISTINCT FROM c.new_cost;

-- Owner decision on 2026-08-24: old shipments may remain without a reconstructed
-- carton. Resolve the historical evidence flags without inventing any box cost.
UPDATE public.accounting_review_flags
SET
  status='resolved',
  resolved_at=clock_timestamp(),
  resolved_by='owner_approved_historical_no_carton'
WHERE status='open'
  AND category='carton_evidence_missing';

-- Backfill any already-confirmed real carton adjustments. The function is
-- idempotent because journal source_type/source_id/event_kind is unique.
SELECT public.post_fulfillment_adjustment_journal(id)
FROM public.order_fulfillment_events
WHERE event_type='adjustment'
  AND workflow_state='confirmed'
ORDER BY recorded_at;

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0087_accounting_carton_adjustment_inventory_reconciliation',
  '81929ea7de6b2d1360f677c96a2b8cbc4afe87da153cf976caa9b86c6969ff82',
  'Post confirmed fulfillment adjustments to ledger, make per-order revenue/fulfillment ledger-backed, use canonical inventory reconciliation queue, sync collapsed product costs, and resolve owner-approved historical carton flags'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
