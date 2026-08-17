-- 0078_accounting_external_handoff_hardening_rollback
-- Safely removes the external-handoff structures introduced by 0078.
--
-- Constraint VALIDATE operations are intentionally not reversed: NOT VALID constraints
-- already enforced new writes, and retaining successful historical validation is a
-- monotonic integrity improvement that does not alter balances.
--
-- Rollback is blocked once immutable carrier-correction evidence has been recorded or
-- once the seeded inventory-reconciliation review flag has entered a workflow state.

BEGIN;

DO $do$
DECLARE
  v_seed_flag_id text := 'inventory-reconciliation-'||md5('INVENTORY-UNIFY-20260817');
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.order_accounting_carrier_corrections
    LIMIT 1
  ) THEN
    RAISE EXCEPTION
      '0078_ROLLBACK_BLOCKED: immutable carrier-correction evidence exists; preserve the accounting trail'
      USING ERRCODE='55000';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.accounting_review_flags
    WHERE id=v_seed_flag_id
      AND status<>'open'
  ) THEN
    RAISE EXCEPTION
      '0078_ROLLBACK_BLOCKED: the seeded inventory reconciliation review flag has already entered accounting workflow'
      USING ERRCODE='55000';
  END IF;
END
$do$;

-- Restore the settlement validation logic that existed before 0078. The trigger using
-- this function remains in place; only carrier resolution returns to the prior snapshot
-- precedence (fact snapshot -> immutable snapshot -> order carrier).
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
    SELECT 1
    FROM public.cash_settlement_items
    WHERE settlement_id=NEW.id
      AND reconciliation_status NOT IN ('matched','approved')
  ) THEN
    RAISE EXCEPTION 'SETTLEMENT_UNRESOLVED_ITEMS: settlement % contains unresolved items',NEW.id;
  END IF;

  FOR r IN
    SELECT *
    FROM public.cash_settlement_items
    WHERE settlement_id=NEW.id
    ORDER BY id
  LOOP
    SELECT *
      INTO f
    FROM public.order_accounting_facts
    WHERE order_id=r.order_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'SETTLEMENT_FACT_MISSING: order % has no accounting fact',r.order_id;
    END IF;

    SELECT COALESCE(f.carrier_snapshot,cs.carrier,o.carrier)
      INTO v_carrier
    FROM public.orders o
    LEFT JOIN public.order_accounting_carrier_snapshots cs ON cs.order_id=o.id
    WHERE o.id=r.order_id;

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

    SELECT id,order_id,status,amount
      INTO pe
    FROM public.payment_events
    WHERE id=r.payment_event_id;

    IF NOT FOUND OR pe.order_id<>r.order_id OR pe.status<>'completed' OR pe.amount<>f.gross_collected THEN
      RAISE EXCEPTION 'SETTLEMENT_PAYMENT_EVENT_MISMATCH: order % payment event %',r.order_id,r.payment_event_id;
    END IF;

    IF EXISTS(
      SELECT 1
      FROM public.order_accounting_settlements os
      WHERE os.order_fact_id=f.id
        AND os.status='matched'
        AND os.settlement_id<>NEW.id
    ) THEN
      RAISE EXCEPTION 'SETTLEMENT_DUPLICATE_ORDER: order % already matched',r.order_id;
    END IF;
  END LOOP;

  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS inventory_movements_owner_reconciliation_review
  ON public.inventory_movements;
DROP FUNCTION IF EXISTS public.flag_owner_stock_reconciliation_for_accounting();

DELETE FROM public.accounting_review_flags
WHERE id='inventory-reconciliation-'||md5('INVENTORY-UNIFY-20260817')
  AND status='open';

DROP TRIGGER IF EXISTS order_accounting_carrier_corrections_validate_insert
  ON public.order_accounting_carrier_corrections;
DROP FUNCTION IF EXISTS public.validate_order_accounting_carrier_correction_insert();
DROP TRIGGER IF EXISTS order_accounting_carrier_corrections_immutable
  ON public.order_accounting_carrier_corrections;
DROP FUNCTION IF EXISTS public.reject_order_accounting_carrier_correction_mutation();
DROP FUNCTION IF EXISTS public.accounting_effective_carrier(text);
DROP TABLE IF EXISTS public.order_accounting_carrier_corrections;

UPDATE public.schema_migrations
SET rolled_back_at=clock_timestamp(),
    notes=COALESCE(notes,'') || ' [external-handoff hardening rolled back before immutable carrier-correction evidence existed]'
WHERE version='0078_accounting_external_handoff_hardening';

COMMIT;