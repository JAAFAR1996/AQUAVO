-- 0040_packaging_carton_catalog
-- Additive only. Extends fulfillment_materials so a CARTON can be described
-- physically (internal dimensions, weight ceiling, padding) and so any material
-- can declare how its cost is applied to an order.
--
-- WHY EXTEND RATHER THAN ADD A `cartons` TABLE: a carton already IS a
-- fulfillment material in this schema — it is purchased through
-- packaging_purchases, costed through material_cost_records, consumed through
-- packaging_inventory_movements and frozen into order_fulfillment_lines. A
-- parallel table would duplicate four working subsystems. These are NEW columns,
-- not existing columns given a second meaning.
--
-- Every new column is NULLable or carries a safe default, so existing rows stay
-- valid and no table rewrite is needed. CHECKs are NOT VALID: new rows only.
-- ROLLBACK: 0040_packaging_carton_catalog_rollback.sql

BEGIN;

ALTER TABLE fulfillment_materials
  ADD COLUMN IF NOT EXISTS sku                  text,
  ADD COLUMN IF NOT EXISTS material_kind        text NOT NULL DEFAULT 'consumable',
  ADD COLUMN IF NOT EXISTS calculation_basis    text NOT NULL DEFAULT 'per_order',
  ADD COLUMN IF NOT EXISTS stock_tracked        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS low_stock_threshold  numeric,
  ADD COLUMN IF NOT EXISTS internal_length_cm   numeric,
  ADD COLUMN IF NOT EXISTS internal_width_cm    numeric,
  ADD COLUMN IF NOT EXISTS internal_height_cm   numeric,
  ADD COLUMN IF NOT EXISTS external_length_cm   numeric,
  ADD COLUMN IF NOT EXISTS external_width_cm    numeric,
  ADD COLUMN IF NOT EXISTS external_height_cm   numeric,
  ADD COLUMN IF NOT EXISTS max_weight_kg        numeric,
  ADD COLUMN IF NOT EXISTS safety_padding_cm    numeric,
  -- Soft archive. A material referenced by a historical fulfillment line is
  -- never hard-deleted; archiving hides it from new plans and keeps every past
  -- snapshot readable.
  ADD COLUMN IF NOT EXISTS archived_at          timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fmat_kind_chk') THEN
    ALTER TABLE fulfillment_materials ADD CONSTRAINT fmat_kind_chk
      CHECK (material_kind IN ('carton','consumable')) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fmat_basis_chk') THEN
    ALTER TABLE fulfillment_materials ADD CONSTRAINT fmat_basis_chk
      CHECK (calculation_basis IN ('per_order','per_carton','per_product_unit')) NOT VALID;
  END IF;

  -- Dimensions and weights are either unknown (NULL) or strictly positive.
  -- A zero dimension is not "free", it is nonsense, and it would let a carton
  -- pass a fit check it cannot physically pass.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fmat_dims_positive_chk') THEN
    ALTER TABLE fulfillment_materials ADD CONSTRAINT fmat_dims_positive_chk CHECK (
      (internal_length_cm IS NULL OR internal_length_cm > 0) AND
      (internal_width_cm  IS NULL OR internal_width_cm  > 0) AND
      (internal_height_cm IS NULL OR internal_height_cm > 0) AND
      (external_length_cm IS NULL OR external_length_cm > 0) AND
      (external_width_cm  IS NULL OR external_width_cm  > 0) AND
      (external_height_cm IS NULL OR external_height_cm > 0) AND
      (max_weight_kg      IS NULL OR max_weight_kg      > 0) AND
      (safety_padding_cm  IS NULL OR safety_padding_cm >= 0) AND
      (low_stock_threshold IS NULL OR low_stock_threshold >= 0)
    ) NOT VALID;
  END IF;

  -- The internal box must actually fit inside the external box when both are
  -- recorded.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fmat_internal_le_external_chk') THEN
    ALTER TABLE fulfillment_materials ADD CONSTRAINT fmat_internal_le_external_chk CHECK (
      (external_length_cm IS NULL OR internal_length_cm IS NULL OR internal_length_cm <= external_length_cm) AND
      (external_width_cm  IS NULL OR internal_width_cm  IS NULL OR internal_width_cm  <= external_width_cm) AND
      (external_height_cm IS NULL OR internal_height_cm IS NULL OR internal_height_cm <= external_height_cm)
    ) NOT VALID;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS fmat_sku_uidx
  ON fulfillment_materials(sku) WHERE sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS fmat_kind_active_idx
  ON fulfillment_materials(material_kind, active) WHERE archived_at IS NULL;

INSERT INTO schema_migrations (version, checksum, applied_by, notes)
SELECT '0040_packaging_carton_catalog', 'pending', current_user,
       'carton physical attributes + calculation basis + soft archive on fulfillment_materials'
WHERE NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version='0040_packaging_carton_catalog');

COMMIT;
