-- 0091_growth_operating_system_rollback.sql
BEGIN;
DROP VIEW IF EXISTS public.v_growth_order_customer_identity;
DROP TABLE IF EXISTS public.business_expense_inbox;
DROP TABLE IF EXISTS public.product_bundle_items;
DROP TABLE IF EXISTS public.product_bundles;
DROP TABLE IF EXISTS public.customer_lifecycle_jobs;
DROP TABLE IF EXISTS public.customer_aquarium_profiles;
DROP TABLE IF EXISTS public.product_repurchase_profiles;
DROP TABLE IF EXISTS public.inventory_sku_daily;
DROP TABLE IF EXISTS public.purchase_measurement_receipts;
DROP TABLE IF EXISTS public.order_attribution;

DELETE FROM public.business_metric_definitions
WHERE metric_key IN (
  'attribution_coverage_pct','purchase_measurement_coverage_pct','ready_lifecycle_jobs',
  'fast_inventory_value','slow_dead_inventory_value','unposted_expense_inbox'
);

UPDATE public.schema_migrations
SET rolled_back_at=now(),
    notes=COALESCE(notes,'') || ' | Rolled back AQUAVO Growth OS 0091.'
WHERE version='0091_growth_operating_system' AND rolled_back_at IS NULL;
COMMIT;
