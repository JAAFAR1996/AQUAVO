-- ============================================================================
-- ROLLBACK for migrations/drop_product_cost_zero_defaults.sql
-- ============================================================================
-- EXECUTION CONTRACT (mandatory)
--   NO top-level BEGIN / COMMIT. The EXECUTOR wraps the whole file:
--       BEGIN;  <entire file>  COMMIT;      -- on any error: ROLLBACK;
--
-- Restores the exact pre-migration DDL:
--   * DEFAULT '0' back on the three numeric cost columns;
--   * the *_resolution DEFAULT 'unresolved' removed;
--   * the zero-needs-resolution CHECK dropped.
--
-- This rollback does NOT rewrite any row. Products created while the migration
-- was in force keep their NULL (UNKNOWN) costs — restoring the default must not
-- retroactively fabricate a 0 for them. That asymmetry is deliberate: the
-- rollback undoes the SCHEMA change, never the accounting truth.
--
-- It also does not touch the F-5 *_resolution columns themselves; those are
-- reverted by migrations/add_product_cost_resolution_rollback.sql, which must
-- run AFTER this file if a full revert is intended.
-- ============================================================================

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_zero_cost_needs_resolution_chk;

ALTER TABLE products ALTER COLUMN cost_price_resolution     DROP DEFAULT;
ALTER TABLE products ALTER COLUMN packaging_cost_resolution DROP DEFAULT;
ALTER TABLE products ALTER COLUMN insert_cost_resolution    DROP DEFAULT;

ALTER TABLE products ALTER COLUMN cost_price     SET DEFAULT '0';
ALTER TABLE products ALTER COLUMN packaging_cost SET DEFAULT '0';
ALTER TABLE products ALTER COLUMN insert_cost    SET DEFAULT '0';

-- Fail closed: the pre-migration DDL must be fully restored.
DO $verify$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'products'
     AND column_name IN ('cost_price','packaging_cost','insert_cost')
     AND column_default IS NOT NULL;
  IF n <> 3 THEN
    RAISE EXCEPTION 'rollback: expected 3 cost columns with a DEFAULT, found %', n;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_zero_cost_needs_resolution_chk') THEN
    RAISE EXCEPTION 'rollback: products_zero_cost_needs_resolution_chk still present';
  END IF;
END
$verify$;

COMMENT ON COLUMN products.cost_price IS NULL;
