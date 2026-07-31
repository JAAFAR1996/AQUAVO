-- ROLLBACK 0040. Drops only columns/constraints/indexes this migration added.
-- No pre-existing fulfillment_materials column is touched.
BEGIN;
DROP INDEX IF EXISTS fmat_kind_active_idx;
DROP INDEX IF EXISTS fmat_sku_uidx;
ALTER TABLE fulfillment_materials
  DROP CONSTRAINT IF EXISTS fmat_internal_le_external_chk,
  DROP CONSTRAINT IF EXISTS fmat_dims_positive_chk,
  DROP CONSTRAINT IF EXISTS fmat_basis_chk,
  DROP CONSTRAINT IF EXISTS fmat_kind_chk;
ALTER TABLE fulfillment_materials
  DROP COLUMN IF EXISTS archived_at,
  DROP COLUMN IF EXISTS safety_padding_cm,
  DROP COLUMN IF EXISTS max_weight_kg,
  DROP COLUMN IF EXISTS external_height_cm,
  DROP COLUMN IF EXISTS external_width_cm,
  DROP COLUMN IF EXISTS external_length_cm,
  DROP COLUMN IF EXISTS internal_height_cm,
  DROP COLUMN IF EXISTS internal_width_cm,
  DROP COLUMN IF EXISTS internal_length_cm,
  DROP COLUMN IF EXISTS low_stock_threshold,
  DROP COLUMN IF EXISTS stock_tracked,
  DROP COLUMN IF EXISTS calculation_basis,
  DROP COLUMN IF EXISTS material_kind,
  DROP COLUMN IF EXISTS sku;
UPDATE schema_migrations SET rolled_back_at = now()
 WHERE version='0040_packaging_carton_catalog' AND rolled_back_at IS NULL;
COMMIT;
