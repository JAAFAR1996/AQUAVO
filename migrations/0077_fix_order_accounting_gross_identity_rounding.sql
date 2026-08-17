-- 0077_fix_order_accounting_gross_identity_rounding
-- Align the accounting fact gross identity with the active v3 policy where
-- rounding_adjustment is a separate revenue component.
--
-- Canonical identity:
--   gross_collected = product_revenue + customer_delivery_fee + rounding_adjustment
--
-- The delivery trigger, journal posting, and period close already treat rounding
-- separately. The previous constraint omitted rounding_adjustment and therefore
-- rejected otherwise-valid delivered orders whenever the COD amount was rounded.

BEGIN;

ALTER TABLE public.order_accounting_facts
  DROP CONSTRAINT IF EXISTS order_accounting_facts_gross_identity_chk;

ALTER TABLE public.order_accounting_facts
  ADD CONSTRAINT order_accounting_facts_gross_identity_chk
  CHECK (
    gross_collected =
      product_revenue + customer_delivery_fee + COALESCE(rounding_adjustment, 0)
  ) NOT VALID;

ALTER TABLE public.order_accounting_facts
  VALIDATE CONSTRAINT order_accounting_facts_gross_identity_chk;

COMMENT ON CONSTRAINT order_accounting_facts_gross_identity_chk
  ON public.order_accounting_facts IS
  'Gross COD identity under v3 explicit-rounding policy: products + customer delivery fee + rounding adjustment.';

INSERT INTO public.schema_migrations(version, checksum, notes)
VALUES(
  '0077_fix_order_accounting_gross_identity_rounding',
  '0077007700770077007700770077007700770077007700770077007700770077',
  'Fix delivered-order accounting gross identity so explicit rounding adjustment is included'
)
ON CONFLICT(version) DO UPDATE
SET checksum=EXCLUDED.checksum,
    notes=EXCLUDED.notes,
    rolled_back_at=NULL,
    applied_at=now();

COMMIT;
