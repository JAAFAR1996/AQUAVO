-- ============================================================================
-- fix_product_cost_history_nullable_rollback.sql
--
-- Reverses fix_product_cost_history_nullable.sql.
--
-- ⚠️ NOT LOSSLESS, and refuses rather than guessing.
--
-- The forward migration made NULL expressible. Restoring NOT NULL requires a
-- value for every NULL, and there is no honest one: writing 0 would assert
-- "this cost was zero" for a cost that is merely unrecorded — the exact
-- ambiguity the forward migration removed, and a fabrication of financial data.
--
-- So this rollback ABORTS if any NULL cost exists. Resolve them deliberately
-- first (supply the real cost, or delete the row if it is spurious).
--
-- EXECUTION CONTRACT: no top-level BEGIN/COMMIT — the executor wraps the file.
-- Idempotent when no NULLs are present.
-- ============================================================================

DO $guard$
DECLARE
  null_costs integer;
BEGIN
  SELECT count(*) INTO null_costs
  FROM product_cost_history
  WHERE cost_price IS NULL OR packaging_cost IS NULL OR insert_cost IS NULL;

  IF null_costs > 0 THEN
    RAISE EXCEPTION
      'ABORT: % cost-history row(s) hold a NULL (unrecorded) cost. Restoring '
      'NOT NULL would require writing 0, which asserts a cost of zero for a '
      'cost that is merely unknown. Resolve these rows explicitly before '
      'rolling back — this migration will not fabricate a value.', null_costs;
  END IF;
END
$guard$;

ALTER TABLE product_cost_history
  DROP CONSTRAINT IF EXISTS pch_verified_zero_evidence_chk,
  DROP CONSTRAINT IF EXISTS pch_cost_resolution_chk;

ALTER TABLE product_cost_history
  DROP COLUMN IF EXISTS reason,
  DROP COLUMN IF EXISTS approved_at,
  DROP COLUMN IF EXISTS approved_by,
  DROP COLUMN IF EXISTS evidence_ids,
  DROP COLUMN IF EXISTS purchase_lot_id,
  DROP COLUMN IF EXISTS cost_resolution_note,
  DROP COLUMN IF EXISTS insert_cost_resolution,
  DROP COLUMN IF EXISTS packaging_cost_resolution,
  DROP COLUMN IF EXISTS cost_price_resolution;

-- Safe now: the guard above proved there are no NULLs.
ALTER TABLE product_cost_history
  ALTER COLUMN cost_price      SET NOT NULL,
  ALTER COLUMN packaging_cost  SET NOT NULL,
  ALTER COLUMN insert_cost     SET NOT NULL;

ALTER TABLE product_cost_history
  ALTER COLUMN cost_price      SET DEFAULT '0',
  ALTER COLUMN packaging_cost  SET DEFAULT '0',
  ALTER COLUMN insert_cost     SET DEFAULT '0';
