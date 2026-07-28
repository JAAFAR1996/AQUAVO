-- ============================================================================
-- fix_product_cost_history_nullable.sql
--
-- RED TEAM M-6 — `product_cost_history` cannot express an unknown cost.
--
-- The F-5/F-10 work (add_product_cost_resolution.sql,
-- drop_product_cost_zero_defaults.sql) removed `DEFAULT '0'` from `products`
-- and added resolution columns, so a zero there can be distinguished from a
-- missing value. `product_cost_history` was never given the same treatment: its
-- three cost columns are still `numeric NOT NULL DEFAULT '0'` with no
-- resolution columns. Every zero in that table is therefore ambiguous by
-- construction — the engine works around it by treating history rows as usable
-- only when `> 0` (accounting-engine.ts), which means a genuinely-zero
-- historical cost is UNREPRESENTABLE.
--
-- This matters directly: 39 of the 182 historical sale lines are costed
-- `estimated_history`, i.e. from this table.
--
-- WHAT THIS DOES:
--   1. Drops the DEFAULT '0' — an omitted cost now lands as NULL.
--   2. Drops NOT NULL — NULL becomes expressible, meaning "not recorded".
--   3. Adds *_resolution columns with the same vocabulary as `products`.
--   4. Adds evidence/approval columns required by mission §11.
--   5. Backfills resolution WITHOUT reinterpreting any amount.
--
-- WHAT THIS DOES NOT DO:
--   * Does not change a single cost amount. Existing zeros stay zero.
--   * Does not promote any zero to 'verified_zero'. A zero recorded before
--     resolution tracking existed is ambiguous, and only a human with a note
--     may declare it verified — identical to the rule in
--     add_product_cost_resolution.sql.
--
-- PREREQUISITE: add_product_cost_resolution.sql (for vocabulary consistency).
-- EXECUTION CONTRACT: no top-level BEGIN/COMMIT — the executor wraps the file.
-- Idempotent. NOT APPLIED TO PRODUCTION BY THIS CHANGE.
-- Reversible via fix_product_cost_history_nullable_rollback.sql.
-- ============================================================================

-- ── 1-2. Make "not recorded" expressible ───────────────────────────────────
ALTER TABLE product_cost_history
  ALTER COLUMN cost_price      DROP DEFAULT,
  ALTER COLUMN packaging_cost  DROP DEFAULT,
  ALTER COLUMN insert_cost     DROP DEFAULT;

ALTER TABLE product_cost_history
  ALTER COLUMN cost_price      DROP NOT NULL,
  ALTER COLUMN packaging_cost  DROP NOT NULL,
  ALTER COLUMN insert_cost     DROP NOT NULL;

-- ── 3. Resolution columns, same vocabulary as products ─────────────────────
ALTER TABLE product_cost_history
  ADD COLUMN IF NOT EXISTS cost_price_resolution     text,
  ADD COLUMN IF NOT EXISTS packaging_cost_resolution text,
  ADD COLUMN IF NOT EXISTS insert_cost_resolution    text,
  ADD COLUMN IF NOT EXISTS cost_resolution_note      text;

-- ── 4. Evidence and approval — mission §11 "قواعد كلفة المنتج" ─────────────
ALTER TABLE product_cost_history
  ADD COLUMN IF NOT EXISTS purchase_lot_id text,
  ADD COLUMN IF NOT EXISTS evidence_ids    jsonb,
  ADD COLUMN IF NOT EXISTS approved_by     text,
  ADD COLUMN IF NOT EXISTS approved_at     timestamp,
  ADD COLUMN IF NOT EXISTS reason          text;

COMMENT ON COLUMN product_cost_history.evidence_ids IS
  'References to evidence_files proving this cost. A cost version with no '
  'evidence can never support an exact snapshot. Mission §11.';
COMMENT ON COLUMN product_cost_history.cost_price_resolution IS
  'known | verified_zero | unresolved. A zero with resolution unresolved is an '
  'UNKNOWN cost, never a cost of zero. See Red Team M-6.';

-- ── 5. Backfill resolution only. No amount is touched. ─────────────────────
-- Fills NULL resolutions exactly as add_product_cost_resolution.sql does:
-- a positive amount is 'known'; NULL or zero is 'unresolved'. A zero is NEVER
-- promoted to 'verified_zero'.
UPDATE product_cost_history
SET cost_price_resolution =
      CASE WHEN cost_price IS NOT NULL AND cost_price > 0 THEN 'known' ELSE 'unresolved' END
WHERE cost_price_resolution IS NULL;

UPDATE product_cost_history
SET packaging_cost_resolution =
      CASE WHEN packaging_cost IS NOT NULL AND packaging_cost > 0 THEN 'known' ELSE 'unresolved' END
WHERE packaging_cost_resolution IS NULL;

UPDATE product_cost_history
SET insert_cost_resolution =
      CASE WHEN insert_cost IS NOT NULL AND insert_cost > 0 THEN 'known' ELSE 'unresolved' END
WHERE insert_cost_resolution IS NULL;

ALTER TABLE product_cost_history
  ALTER COLUMN cost_price_resolution     SET DEFAULT 'unresolved',
  ALTER COLUMN packaging_cost_resolution SET DEFAULT 'unresolved',
  ALTER COLUMN insert_cost_resolution    SET DEFAULT 'unresolved';

-- ── 6. Vocabulary constraint ───────────────────────────────────────────────
DO $vocab$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pch_cost_resolution_chk') THEN
    ALTER TABLE product_cost_history
      ADD CONSTRAINT pch_cost_resolution_chk
      CHECK (
        (cost_price_resolution     IS NULL OR cost_price_resolution     IN ('known','verified_zero','unresolved')) AND
        (packaging_cost_resolution IS NULL OR packaging_cost_resolution IN ('known','verified_zero','unresolved')) AND
        (insert_cost_resolution    IS NULL OR insert_cost_resolution    IN ('known','verified_zero','unresolved'))
      ) NOT VALID;
  END IF;
END
$vocab$;

-- A verified_zero must be evidenced by a human note — mirrors
-- products_verified_zero_evidence_chk.
DO $evidence$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pch_verified_zero_evidence_chk') THEN
    ALTER TABLE product_cost_history
      ADD CONSTRAINT pch_verified_zero_evidence_chk
      CHECK (
        (cost_price_resolution     IS DISTINCT FROM 'verified_zero' AND
         packaging_cost_resolution IS DISTINCT FROM 'verified_zero' AND
         insert_cost_resolution    IS DISTINCT FROM 'verified_zero')
        OR (cost_resolution_note IS NOT NULL AND btrim(cost_resolution_note) <> '')
      ) NOT VALID;
  END IF;
END
$evidence$;

-- ── 7. Fail-closed verification ────────────────────────────────────────────
DO $verify$
DECLARE
  invented    integer;
  unclassified integer;
  defaults_left integer;
BEGIN
  -- The backfill must not have invented a single verified_zero.
  SELECT count(*) INTO invented
  FROM product_cost_history
  WHERE 'verified_zero' IN (
    COALESCE(cost_price_resolution,''),
    COALESCE(packaging_cost_resolution,''),
    COALESCE(insert_cost_resolution,'')
  ) AND (cost_resolution_note IS NULL OR btrim(cost_resolution_note) = '');
  IF invented > 0 THEN
    RAISE EXCEPTION
      'ABORT: backfill produced % unevidenced verified_zero row(s). A zero '
      'recorded before resolution tracking existed is AMBIGUOUS and must stay '
      'unresolved.', invented;
  END IF;

  -- Every row must be classified.
  SELECT count(*) INTO unclassified
  FROM product_cost_history
  WHERE cost_price_resolution IS NULL
     OR packaging_cost_resolution IS NULL
     OR insert_cost_resolution IS NULL;
  IF unclassified > 0 THEN
    RAISE EXCEPTION 'ABORT: % row(s) left with an unclassified cost component', unclassified;
  END IF;

  -- No cost column may still carry a DEFAULT — that was the F-10 defect.
  SELECT count(*) INTO defaults_left
  FROM information_schema.columns
  WHERE table_name = 'product_cost_history'
    AND column_name IN ('cost_price','packaging_cost','insert_cost')
    AND column_default IS NOT NULL;
  IF defaults_left > 0 THEN
    RAISE EXCEPTION 'ABORT: % cost column(s) still carry a DEFAULT', defaults_left;
  END IF;
END
$verify$;
