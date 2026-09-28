-- 0091_growth_operating_system_rollback.sql
BEGIN;
DROP TABLE IF EXISTS public.business_expense_inbox;
DROP TABLE IF EXISTS public.product_bundle_items;
DROP TABLE IF EXISTS public.product_bundles;
DROP TABLE IF EXISTS public.customer_lifecycle_jobs;
DROP TABLE IF EXISTS public.product_repurchase_profiles;
DROP TABLE IF EXISTS public.inventory_sku_daily;
DROP TABLE IF EXISTS public.purchase_measurement_receipts;

ALTER TABLE public.customer_profiles
  DROP CONSTRAINT IF EXISTS customer_profiles_tank_volume_chk,
  DROP CONSTRAINT IF EXISTS customer_profiles_aquarium_source_chk,
  DROP COLUMN IF EXISTS tank_volume_liters,
  DROP COLUMN IF EXISTS tank_dimensions,
  DROP COLUMN IF EXISTS livestock,
  DROP COLUMN IF EXISTS plants,
  DROP COLUMN IF EXISTS filter_setup,
  DROP COLUMN IF EXISTS heater_setup,
  DROP COLUMN IF EXISTS water_profile,
  DROP COLUMN IF EXISTS goals,
  DROP COLUMN IF EXISTS aquarium_profile_source,
  DROP COLUMN IF EXISTS aquarium_last_verified_at;

DELETE FROM public.business_metric_definitions
WHERE metric_key IN (
  'attribution_coverage_pct','purchase_measurement_coverage_pct','ready_lifecycle_jobs',
  'fast_inventory_value','slow_dead_inventory_value','unposted_expense_inbox'
);

UPDATE public.schema_migrations
SET rolled_back_at=now(),
    notes=COALESCE(notes,'') || ' | Rolled back Growth OS 0091.'
WHERE version='0091_growth_operating_system' AND rolled_back_at IS NULL;
COMMIT;
