-- 0089_reconciliation_queue_integrity_rollback.sql
BEGIN;

CREATE OR REPLACE VIEW public.order_financial_reconciliation_queue AS
SELECT
  order_id,
  order_number,
  order_status,
  payment_status,
  cod_received,
  financially_counted,
  order_total,
  verified_payment_amount,
  reconciled_settlement_amount,
  documented_adjustment_amount,
  reconciliation_reason
FROM public.order_financial_reconciliation
WHERE reconciliation_reason <> 'no_conflict_detected';

CREATE OR REPLACE VIEW public.order_total_reconciliation AS
SELECT
  o.id AS order_id,
  o.order_number,
  o.items_subtotal_snapshot,
  o.shipping_cost,
  o.discount_total,
  o.formula_total_snapshot,
  o.total,
  o.rounded_total,
  o.rounding_adjustment_snapshot,
  o.total - o.formula_total_snapshot AS formula_delta,
  CASE
    WHEN o.items_subtotal_snapshot IS NULL THEN 'missing_snapshot'
    WHEN abs(o.total - o.formula_total_snapshot) > 1::numeric THEN 'formula_mismatch'
    WHEN o.rounded_total IS NOT NULL AND o.rounded_total < o.total THEN 'rounded_below_total'
    ELSE 'no_conflict_detected'
  END AS reconciliation_reason
FROM public.orders o;

CREATE OR REPLACE VIEW public.order_total_reconciliation_queue AS
SELECT
  order_id,
  order_number,
  items_subtotal_snapshot,
  shipping_cost,
  discount_total,
  formula_total_snapshot,
  total,
  rounded_total,
  rounding_adjustment_snapshot,
  formula_delta,
  reconciliation_reason
FROM public.order_total_reconciliation
WHERE reconciliation_reason <> 'no_conflict_detected';

UPDATE public.schema_migrations
SET rolled_back_at=now(),
    notes=COALESCE(notes,'')||' | Rolled back reconciliation queue integrity changes.'
WHERE version='0089_reconciliation_queue_integrity'
  AND rolled_back_at IS NULL;

COMMIT;
