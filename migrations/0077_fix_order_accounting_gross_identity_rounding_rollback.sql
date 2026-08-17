-- 0077_fix_order_accounting_gross_identity_rounding_rollback
-- Rollback is allowed only if no accounting fact depends on explicit rounding.

BEGIN;

DO $do$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.order_accounting_facts
    WHERE COALESCE(rounding_adjustment, 0) <> 0
  ) THEN
    RAISE EXCEPTION
      '0077_ROLLBACK_BLOCKED: accounting facts with explicit rounding exist; restoring the old gross identity would invalidate realized sales'
      USING ERRCODE='55000';
  END IF;
END
$do$;

ALTER TABLE public.order_accounting_facts
  DROP CONSTRAINT IF EXISTS order_accounting_facts_gross_identity_chk;

ALTER TABLE public.order_accounting_facts
  ADD CONSTRAINT order_accounting_facts_gross_identity_chk
  CHECK (gross_collected = product_revenue + customer_delivery_fee) NOT VALID;

ALTER TABLE public.order_accounting_facts
  VALIDATE CONSTRAINT order_accounting_facts_gross_identity_chk;

UPDATE public.schema_migrations
SET rolled_back_at=clock_timestamp(),
    notes=COALESCE(notes,'') || ' [gross identity rounding fix rolled back before explicit-rounding facts existed]'
WHERE version='0077_fix_order_accounting_gross_identity_rounding';

COMMIT;
