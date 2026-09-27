-- 0089_reconciliation_queue_integrity.sql
-- Keep test orders out of operational reconciliation queues and make the
-- order-total queue about arithmetic integrity only. Rounding policy is a
-- separate concern and must not turn a formula-correct order into a mismatch.

BEGIN;

DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.schema_migrations
    WHERE version='0088_allow_zero_stock_variant_shape_changes'
      AND rolled_back_at IS NULL
  ) THEN
    RAISE EXCEPTION '0089_REQUIRES_ACTIVE_0088';
  END IF;
END
$guard$;

CREATE OR REPLACE VIEW public.order_financial_reconciliation_queue AS
SELECT
  r.order_id,
  r.order_number,
  r.order_status,
  r.payment_status,
  r.cod_received,
  r.financially_counted,
  r.order_total,
  r.verified_payment_amount,
  r.reconciled_settlement_amount,
  r.documented_adjustment_amount,
  r.reconciliation_reason
FROM public.order_financial_reconciliation r
JOIN public.orders o ON o.id=r.order_id
WHERE r.reconciliation_reason <> 'no_conflict_detected'
  AND COALESCE(o.is_test,false)=false;

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

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0089_reconciliation_queue_integrity',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'Exclude test orders from operational financial reconciliation and keep order-total reconciliation scoped to subtotal/shipping/discount arithmetic. Runner must normalize checksum to SHA-256(file bytes).'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
