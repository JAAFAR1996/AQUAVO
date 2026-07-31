-- 0041_product_packing_data
-- Packed dimensions, weight and stacking rules per product (or per variant).
--
-- WHY A SIDE TABLE RATHER THAN COLUMNS ON products:
--   1. variants live inside products.variants JSONB — you cannot add a column
--      per variant, and a variant needs its own packed size;
--   2. products carries financial-immutability triggers and heavy read traffic;
--   3. this data arrives gradually and needs its own provenance and audit.
--
-- The measured geometry is NULLable on purpose. NULL means "not measured", and
-- the planner refuses to plan rather than substituting a zero. A fabricated
-- dimension would produce a confident, wrong carton recommendation.
--
-- can_support_items_above defaults to FALSE. The safe default is that nothing
-- may be stacked on a product until someone states otherwise.
-- ROLLBACK: 0041_product_packing_data_rollback.sql

BEGIN;

CREATE TABLE IF NOT EXISTS product_packing_data (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id    text NOT NULL REFERENCES products(id),
  -- NULL = applies to the whole product; a value = overrides for that variant.
  variant_id    text,

  -- Geometry, as PACKED (ready to ship), in centimetres. NULL = unknown.
  packed_height_cm  numeric,   -- spreadsheet column «طول المنتج مع كارتونة»
  packed_width_cm   numeric,   -- spreadsheet column «عرض المنتج مع كارتونتة»
  packed_depth_cm   numeric,   -- the only geometric dimension not yet collected
  packed_weight_kg  numeric,

  -- Orientation
  rotation_allowed   boolean NOT NULL DEFAULT true,
  must_stay_upright  boolean NOT NULL DEFAULT false,

  -- Stacking safety
  fragile                       boolean NOT NULL DEFAULT false,
  compressible                  boolean NOT NULL DEFAULT false,
  can_support_items_above       boolean NOT NULL DEFAULT false,
  max_supported_weight_above_kg numeric,

  -- Per-product overrides of the global support policy. NULL = use policy.
  minimum_support_ratio      numeric,
  maximum_overhang_ratio     numeric,
  requires_full_base_support boolean NOT NULL DEFAULT false,

  -- Folding. `foldable` alone never decides anything — the planner only uses
  -- folded geometry when all three folded dimensions are recorded.
  foldable          boolean NOT NULL DEFAULT false,
  folded_height_cm  numeric,
  folded_width_cm   numeric,
  folded_depth_cm   numeric,

  -- Packing constraints
  safety_allowance_cm      numeric,
  requires_separate_carton boolean NOT NULL DEFAULT false,
  max_qty_per_carton       integer,

  -- Provenance
  source            text,            -- excel_import | owner_measured | supplier_spec
  import_draft_id   text,
  measured_by       text,
  measured_at       timestamptz,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- One row per product, or per product+variant. COALESCE keeps the product-level
-- row (variant_id NULL) unique alongside its variant rows.
CREATE UNIQUE INDEX IF NOT EXISTS ppd_product_variant_uidx
  ON product_packing_data(product_id, COALESCE(variant_id, ''));

CREATE INDEX IF NOT EXISTS ppd_product_idx ON product_packing_data(product_id);

-- Queue of rows still missing what the planner needs.
CREATE INDEX IF NOT EXISTS ppd_incomplete_idx ON product_packing_data(product_id)
  WHERE packed_depth_cm IS NULL OR packed_weight_kg IS NULL
     OR packed_height_cm IS NULL OR packed_width_cm IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ppd_dims_positive_chk') THEN
    ALTER TABLE product_packing_data ADD CONSTRAINT ppd_dims_positive_chk CHECK (
      (packed_height_cm IS NULL OR packed_height_cm > 0) AND
      (packed_width_cm  IS NULL OR packed_width_cm  > 0) AND
      (packed_depth_cm  IS NULL OR packed_depth_cm  > 0) AND
      (packed_weight_kg IS NULL OR packed_weight_kg > 0) AND
      (folded_height_cm IS NULL OR folded_height_cm > 0) AND
      (folded_width_cm  IS NULL OR folded_width_cm  > 0) AND
      (folded_depth_cm  IS NULL OR folded_depth_cm  > 0) AND
      (safety_allowance_cm IS NULL OR safety_allowance_cm >= 0) AND
      (max_supported_weight_above_kg IS NULL OR max_supported_weight_above_kg >= 0) AND
      (max_qty_per_carton IS NULL OR max_qty_per_carton > 0)
    ) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ppd_ratio_range_chk') THEN
    ALTER TABLE product_packing_data ADD CONSTRAINT ppd_ratio_range_chk CHECK (
      (minimum_support_ratio  IS NULL OR (minimum_support_ratio  >= 0 AND minimum_support_ratio  <= 1)) AND
      (maximum_overhang_ratio IS NULL OR (maximum_overhang_ratio >= 0 AND maximum_overhang_ratio <= 1))
    ) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ppd_source_chk') THEN
    ALTER TABLE product_packing_data ADD CONSTRAINT ppd_source_chk
      CHECK (source IS NULL OR source IN ('excel_import','owner_measured','supplier_spec')) NOT VALID;
  END IF;
END $$;

DROP TRIGGER IF EXISTS ppd_set_updated_at ON product_packing_data;
CREATE TRIGGER ppd_set_updated_at BEFORE UPDATE ON product_packing_data
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO schema_migrations (version, checksum, applied_by, notes)
SELECT '0041_product_packing_data', 'pending', current_user,
       'packed geometry, weight and stacking rules per product/variant; nothing seeded'
WHERE NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version='0041_product_packing_data');

COMMIT;
