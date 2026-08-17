-- 0078_accounting_external_handoff_hardening
-- Harden Accounting V3 for external-accountant handoff without changing balances.
--
-- 1. Preserve post-delivery carrier identity corrections as an immutable accounting trail.
-- 2. Resolve settlements through the effective accounting carrier, not mutable order text.
-- 3. Surface owner stock reconciliations as accounting review flags so valuation changes
--    cannot silently reach period close.
-- 4. Validate previously NOT VALID constraints after production audit confirmed zero violations.

BEGIN;

CREATE TABLE IF NOT EXISTS public.order_accounting_carrier_corrections (
  id text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  order_fact_id text NOT NULL REFERENCES public.order_accounting_facts(id),
  order_id text NOT NULL REFERENCES public.orders(id),
  delivery_company_id text NOT NULL REFERENCES public.delivery_companies(id),
  prior_carrier text,
  carrier text NOT NULL,
  carrier_fee numeric NOT NULL CHECK (carrier_fee >= 0),
  reason text NOT NULL,
  corrected_by text,
  corrected_by_name text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  corrected_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS order_accounting_carrier_corrections_fact_time_idx
  ON public.order_accounting_carrier_corrections(order_fact_id, corrected_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS order_accounting_carrier_corrections_order_time_idx
  ON public.order_accounting_carrier_corrections(order_id, corrected_at DESC, id DESC);

CREATE OR REPLACE FUNCTION public.reject_order_accounting_carrier_correction_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'ORDER_ACCOUNTING_CARRIER_CORRECTION_IMMUTABLE' USING ERRCODE='55000';
END
$function$;

DROP TRIGGER IF EXISTS order_accounting_carrier_corrections_immutable
  ON public.order_accounting_carrier_corrections;
CREATE TRIGGER order_accounting_carrier_corrections_immutable
BEFORE UPDATE OR DELETE ON public.order_accounting_carrier_corrections
FOR EACH ROW EXECUTE FUNCTION public.reject_order_accounting_carrier_correction_mutation();

CREATE OR REPLACE FUNCTION public.accounting_effective_carrier(p_order_fact_id text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  SELECT COALESCE(
    (
      SELECT c.carrier
      FROM public.order_accounting_carrier_corrections c
      WHERE c.order_fact_id=f.id
      ORDER BY c.corrected_at DESC,c.id DESC
      LIMIT 1
    ),
    f.carrier_snapshot,
    (
      SELECT cs.carrier
      FROM public.order_accounting_carrier_snapshots cs
      WHERE cs.order_fact_id=f.id
      LIMIT 1
    ),
    o.carrier
  )
  FROM public.order_accounting_facts f
  JOIN public.orders o ON o.id=f.order_id
  WHERE f.id=p_order_fact_id
$function$;

-- Keep the append-only carrier trail internally consistent even if an INSERT bypasses
-- the HTTP route. The order and fact locks serialize corrections with one another and
-- with settlement creation, preventing a correction from racing a settlement commit.
CREATE OR REPLACE FUNCTION public.validate_order_accounting_carrier_correction_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_fact_order_id text;
  v_fact_carrier_fee numeric;
  v_company_name text;
  v_company_active boolean;
  v_company_default_fee numeric;
  v_prior_carrier text;
BEGIN
  PERFORM 1
  FROM public.orders o
  WHERE o.id=NEW.order_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_ACCOUNTING_CARRIER_CORRECTION_ORDER_MISSING:%',NEW.order_id USING ERRCODE='23503';
  END IF;

  SELECT f.order_id,f.carrier_fee
    INTO v_fact_order_id,v_fact_carrier_fee
  FROM public.order_accounting_facts f
  WHERE f.id=NEW.order_fact_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_ACCOUNTING_CARRIER_CORRECTION_FACT_MISSING:%',NEW.order_fact_id USING ERRCODE='23503';
  END IF;

  IF v_fact_order_id<>NEW.order_id THEN
    RAISE EXCEPTION 'ORDER_ACCOUNTING_CARRIER_CORRECTION_ORDER_FACT_MISMATCH:%:%',NEW.order_id,NEW.order_fact_id USING ERRCODE='23514';
  END IF;

  SELECT c.name,c.active,c.default_fee
    INTO v_company_name,v_company_active,v_company_default_fee
  FROM public.delivery_companies c
  WHERE c.id=NEW.delivery_company_id;
  IF NOT FOUND OR v_company_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'ORDER_ACCOUNTING_CARRIER_CORRECTION_COMPANY_INVALID:%',NEW.delivery_company_id USING ERRCODE='23514';
  END IF;

  IF NEW.carrier IS DISTINCT FROM v_company_name THEN
    RAISE EXCEPTION 'ORDER_ACCOUNTING_CARRIER_CORRECTION_COMPANY_NAME_MISMATCH:%:%',NEW.carrier,v_company_name USING ERRCODE='23514';
  END IF;

  IF NEW.carrier_fee IS DISTINCT FROM v_fact_carrier_fee THEN
    RAISE EXCEPTION 'ORDER_ACCOUNTING_CARRIER_CORRECTION_FEE_MISMATCH:%:%',NEW.carrier_fee,v_fact_carrier_fee USING ERRCODE='23514';
  END IF;

  IF v_company_default_fee IS DISTINCT FROM v_fact_carrier_fee THEN
    RAISE EXCEPTION 'ORDER_ACCOUNTING_CARRIER_CORRECTION_COMPANY_FEE_MISMATCH:%:%',v_company_default_fee,v_fact_carrier_fee USING ERRCODE='23514';
  END IF;

  NEW.reason:=btrim(NEW.reason);
  IF NEW.reason='' THEN
    RAISE EXCEPTION 'ORDER_ACCOUNTING_CARRIER_CORRECTION_REASON_REQUIRED' USING ERRCODE='23514';
  END IF;

  IF EXISTS(
    SELECT 1
    FROM public.order_accounting_settlements s
    WHERE s.order_fact_id=NEW.order_fact_id
  ) THEN
    RAISE EXCEPTION 'ORDER_ACCOUNTING_CARRIER_CORRECTION_ALREADY_SETTLED:%',NEW.order_fact_id USING ERRCODE='55000';
  END IF;

  SELECT public.accounting_effective_carrier(NEW.order_fact_id)
    INTO v_prior_carrier;
  IF NEW.prior_carrier IS DISTINCT FROM v_prior_carrier THEN
    RAISE EXCEPTION 'ORDER_ACCOUNTING_CARRIER_CORRECTION_PRIOR_MISMATCH:%:%',COALESCE(NEW.prior_carrier,'<missing>'),COALESCE(v_prior_carrier,'<missing>') USING ERRCODE='23514';
  END IF;

  IF NEW.carrier IS NOT DISTINCT FROM v_prior_carrier THEN
    RAISE EXCEPTION 'ORDER_ACCOUNTING_CARRIER_CORRECTION_NOOP:%',NEW.carrier USING ERRCODE='23514';
  END IF;

  -- Correction time is system evidence, not caller-supplied business data.
  NEW.corrected_at:=clock_timestamp();
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS order_accounting_carrier_corrections_validate_insert
  ON public.order_accounting_carrier_corrections;
CREATE TRIGGER order_accounting_carrier_corrections_validate_insert
BEFORE INSERT ON public.order_accounting_carrier_corrections
FOR EACH ROW EXECUTE FUNCTION public.validate_order_accounting_carrier_correction_insert();

REVOKE ALL ON FUNCTION public.validate_order_accounting_carrier_correction_insert() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.validate_cash_settlement_reconciliation()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  item_gross numeric;
  item_fees numeric;
  item_net numeric;
  r record;
  f public.order_accounting_facts%ROWTYPE;
  pe record;
  v_carrier text;
BEGIN
  IF NEW.status NOT IN ('reconciled','closed') OR NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(gross_amount),0),COALESCE(SUM(fee_amount),0),COALESCE(SUM(net_amount),0)
    INTO item_gross,item_fees,item_net
  FROM public.cash_settlement_items
  WHERE settlement_id=NEW.id;

  IF item_gross<>NEW.gross_amount OR item_fees<>NEW.fees_amount OR item_net<>NEW.net_amount THEN
    RAISE EXCEPTION 'SETTLEMENT_HEADER_MISMATCH: settlement % header does not match items',NEW.id;
  END IF;

  IF EXISTS(
    SELECT 1 FROM public.cash_settlement_items
    WHERE settlement_id=NEW.id AND reconciliation_status NOT IN ('matched','approved')
  ) THEN
    RAISE EXCEPTION 'SETTLEMENT_UNRESOLVED_ITEMS: settlement % contains unresolved items',NEW.id;
  END IF;

  FOR r IN SELECT * FROM public.cash_settlement_items WHERE settlement_id=NEW.id ORDER BY id LOOP
    SELECT * INTO f FROM public.order_accounting_facts WHERE order_id=r.order_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'SETTLEMENT_FACT_MISSING: order % has no accounting fact',r.order_id;
    END IF;

    SELECT public.accounting_effective_carrier(f.id) INTO v_carrier;
    IF v_carrier IS NULL OR v_carrier<>NEW.carrier THEN
      RAISE EXCEPTION 'SETTLEMENT_CARRIER_MISMATCH: order % carrier % settlement carrier %',
        r.order_id,COALESCE(v_carrier,'<missing>'),NEW.carrier;
    END IF;

    IF r.gross_amount<>f.gross_collected OR r.fee_amount<>f.carrier_fee OR r.net_amount<>f.merchant_net THEN
      RAISE EXCEPTION 'SETTLEMENT_FACT_MISMATCH: order %',r.order_id;
    END IF;

    IF r.payment_event_id IS NULL THEN
      RAISE EXCEPTION 'SETTLEMENT_PAYMENT_EVENT_REQUIRED: order %',r.order_id;
    END IF;

    SELECT id,order_id,status,amount INTO pe FROM public.payment_events WHERE id=r.payment_event_id;
    IF NOT FOUND OR pe.order_id<>r.order_id OR pe.status<>'completed' OR pe.amount<>f.gross_collected THEN
      RAISE EXCEPTION 'SETTLEMENT_PAYMENT_EVENT_MISMATCH: order % payment event %',r.order_id,r.payment_event_id;
    END IF;

    IF EXISTS(
      SELECT 1 FROM public.order_accounting_settlements os
      WHERE os.order_fact_id=f.id AND os.status='matched' AND os.settlement_id<>NEW.id
    ) THEN
      RAISE EXCEPTION 'SETTLEMENT_DUPLICATE_ORDER: order % already matched',r.order_id;
    END IF;
  END LOOP;
  RETURN NEW;
END
$function$;

CREATE OR REPLACE FUNCTION public.flag_owner_stock_reconciliation_for_accounting()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_flag_id text;
BEGIN
  IF NEW.movement_type<>'manual_adjustment'
     OR NEW.source_type<>'owner_stock_reconciliation'
     OR NEW.happened_at<public.aquavo_active_cutover() THEN
    RETURN NEW;
  END IF;

  v_flag_id:='inventory-reconciliation-'||md5(COALESCE(NEW.source_id,NEW.id));
  INSERT INTO public.accounting_review_flags(
    id,category,severity,entity_type,entity_id,title,description,
    detected_value_json,suggested_value_json,status,created_at
  ) VALUES(
    v_flag_id,
    'inventory_valuation_reconciliation',
    'high',
    'inventory_reconciliation',
    COALESCE(NEW.source_id,NEW.id),
    'Manual inventory reconciliation requires accounting review',
    'A post-cutover owner stock reconciliation changed canonical inventory quantity. Review its valuation and accounting counterpart before period close.',
    jsonb_build_object(
      'source_id',NEW.source_id,
      'first_movement_id',NEW.id,
      'product_id',NEW.product_id,
      'variant_id',NEW.variant_id,
      'quantity_delta',NEW.quantity_delta,
      'movement_type',NEW.movement_type,
      'source_type',NEW.source_type
    ),
    jsonb_build_object('required','document financial classification and post/reconcile any GL valuation effect'),
    'open',
    clock_timestamp() AT TIME ZONE 'UTC'
  )
  ON CONFLICT(id) DO NOTHING;
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS inventory_movements_owner_reconciliation_review
  ON public.inventory_movements;
CREATE TRIGGER inventory_movements_owner_reconciliation_review
AFTER INSERT ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.flag_owner_stock_reconciliation_for_accounting();

-- The 17-Aug reconciliation is known to be unresolved financially. Record a review
-- blocker without changing any balance; it will be resolved only after provenance
-- of the 131,480 IQD valuation difference is documented and posted correctly.
INSERT INTO public.accounting_review_flags(
  id,category,severity,entity_type,entity_id,title,description,
  detected_value_json,suggested_value_json,status,created_at
)
VALUES(
  'inventory-reconciliation-'||md5('INVENTORY-UNIFY-20260817'),
  'inventory_valuation_reconciliation',
  'high',
  'inventory_reconciliation',
  'INVENTORY-UNIFY-20260817',
  'Inventory reconciliation has an unresolved GL valuation effect',
  'The 17-Aug owner-approved inventory unification changed canonical variant quantities. Independent audit identified a 131,480 IQD difference between owned product inventory valuation and GL account 1200. Financial classification is pending provenance confirmation.',
  jsonb_build_object('batch','INVENTORY-UNIFY-20260817','identified_gl_difference_iqd',131480),
  jsonb_build_object('required','confirm whether the seven yee-06255 units existed before 2026-08-01 or were acquired after cutover, then post the documented correction'),
  'open',
  clock_timestamp() AT TIME ZONE 'UTC'
)
ON CONFLICT(id) DO NOTHING;

ALTER TABLE public.expenses VALIDATE CONSTRAINT expenses_accounting_status_chk;
ALTER TABLE public.expenses VALIDATE CONSTRAINT expenses_paid_from_account_fk;
ALTER TABLE public.expenses VALIDATE CONSTRAINT expenses_tax_treatment_chk;
ALTER TABLE public.order_fulfillment_events VALIDATE CONSTRAINT ofe_cost_status_chk;
ALTER TABLE public.order_fulfillment_events VALIDATE CONSTRAINT ofe_event_chk;
ALTER TABLE public.order_fulfillment_events VALIDATE CONSTRAINT ofe_no_self_parent_chk;
ALTER TABLE public.order_fulfillment_events VALIDATE CONSTRAINT ofe_no_self_reversal_chk;
ALTER TABLE public.order_fulfillment_events VALIDATE CONSTRAINT ofe_state_chk;
ALTER TABLE public.order_fulfillment_lines VALIDATE CONSTRAINT ofl_component_chk;
ALTER TABLE public.order_fulfillment_lines VALIDATE CONSTRAINT ofl_cost_nonneg;
ALTER TABLE public.order_fulfillment_lines VALIDATE CONSTRAINT ofl_status_chk;
ALTER TABLE public.order_return_events VALIDATE CONSTRAINT ore_packaging_loss_source_chk;

REVOKE ALL ON public.order_accounting_carrier_corrections FROM PUBLIC;
GRANT SELECT,INSERT ON public.order_accounting_carrier_corrections TO aquavo_runtime;
GRANT EXECUTE ON FUNCTION public.accounting_effective_carrier(text) TO aquavo_runtime;

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0078_accounting_external_handoff_hardening',
  '0078007800780078007800780078007800780078007800780078007800780078',
  'Harden Accounting V3 external handoff: immutable validated serialized carrier corrections, settlement identity, stock-reconciliation review blocker, and constraint validation'
)
ON CONFLICT(version) DO UPDATE
SET checksum=EXCLUDED.checksum,
    notes=EXCLUDED.notes,
    rolled_back_at=NULL,
    applied_at=now();

COMMIT;