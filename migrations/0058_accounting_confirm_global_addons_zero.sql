-- 0058_accounting_confirm_global_addons_zero.sql
-- Owner decision recorded 2026-08-03: carton, label, card and any later common
-- preparation item are order-level fulfillment costs. Product-level packaging
-- and insert components are therefore verified zero for all active products.
BEGIN;

DO $$
BEGIN
  IF EXISTS(
    SELECT 1 FROM public.products
    WHERE deleted_at IS NULL
      AND (COALESCE(packaging_cost,0)<>0 OR COALESCE(insert_cost,0)<>0)
  ) THEN
    RAISE EXCEPTION 'GLOBAL_ZERO_CONFIRMATION_BLOCKED: at least one active product has a non-zero product-level packaging or insert cost';
  END IF;
END $$;

UPDATE public.products
SET packaging_cost=0,
    insert_cost=0,
    packaging_cost_resolution='verified_zero',
    insert_cost_resolution='verified_zero',
    cost_resolution_note='Owner confirmation 2026-08-03: shared box, labels, cards and future common add-ons are costed at order fulfillment level, not inside product unit cost.',
    cost_resolution_by='owner_confirmation:jaafar:2026-08-03',
    cost_resolution_at=clock_timestamp(),
    updated_at=clock_timestamp()
WHERE deleted_at IS NULL
  AND COALESCE(packaging_cost,0)=0
  AND COALESCE(insert_cost,0)=0;

UPDATE public.accounting_review_flags
SET status='resolved',
    resolved_at=clock_timestamp() AT TIME ZONE 'UTC',
    resolved_by='owner_confirmation:jaafar:2026-08-03'
WHERE category='product_cost'
  AND entity_id='aquavo-2026-08-01'
  AND status='open';

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0058_accounting_confirm_global_addons_zero',
  'cdec46f305974012aea164c4209c27563a7eab50eb27174526f1644b4f529d73',
  'Confirm product-level packaging and insert costs as verified zero; common preparation costs remain versioned per order'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
