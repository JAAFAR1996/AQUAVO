-- ============================================================================
-- F-5: let a product express "cost is UNKNOWN" separately from "cost is a
--      verified zero"
-- ============================================================================
-- EXECUTION CONTRACT (mandatory)
--   This file contains NO top-level BEGIN / COMMIT / ROLLBACK. The EXECUTOR owns
--   the transaction and MUST submit the complete file through one write-capable
--   transactional call:
--       BEGIN;  <entire file>  COMMIT;      -- on any error: ROLLBACK;
--
-- THE DEFECT
--   products.cost_price / packaging_cost / insert_cost are `numeric DEFAULT '0'`.
--   A product created without any cost information is therefore born holding a
--   value that is indistinguishable from a deliberately-entered zero. Zero is
--   overloaded to mean "unknown", which defeats the NULL-not-zero rule at its
--   source.
--
--   PRODUCTION EVIDENCE (read-only, 2026-07-24, project shiny-tree-43710630,
--   branch br-patient-mouse-a4d4cgr4):
--       114 total products; 114 active (deleted_at IS NULL); 0 soft-deleted
--       113 active with cost_price > 0        0 active with cost_price IS NULL
--         1 active with cost_price = 0        (houyi-mountain-wood, stock = 0)
--         0 active IN-STOCK with cost_price = 0
--       114/114 active with packaging_cost = 0 AND insert_cost = 0
--   An earlier header cited "30 products with cost_price = 0, 143 of 143" — that
--   was the verification branch counted WITHOUT a `deleted_at IS NULL` filter
--   (29 of the 30 were soft-deleted rows, since permanently removed). It is
--   withdrawn; see docs/audit/live-product-cost-reconciliation.md.
--
-- THE DESIGN
--   The numeric columns are NOT modified — no existing value is rewritten, no
--   default is dropped (dropping it would change insert behaviour for a table
--   another workstream owns). Instead each cost component gains an explicit
--   RESOLUTION column recording what its number MEANS:
--
--     'known'        the number is real evidence          (value must be > 0)
--     'verified_zero' the cost is genuinely zero, confirmed by a human, with
--                     a recorded note                     (value must be = 0)
--     'unresolved'   we do not know what this number means — treat as UNKNOWN
--
--   Plus a small evidence trail: who resolved it, when, and why.
--
-- THE BACKFILL — classification only where evidence exists. NO GUESSING.
--     cost > 0   -> 'known'         (a positive number is evidence of itself)
--     cost IS NULL -> 'unresolved'  (already explicitly unknown)
--     cost = 0   -> 'unresolved'    (AMBIGUOUS — the whole point of F-5. It is
--                                    deliberately NOT promoted to
--                                    'verified_zero'. Only a human, recording a
--                                    note, may do that.)
--   The stored zeros themselves are left untouched, so nothing is silently
--   reinterpreted and the migration is fully reversible.
--
-- ACCOUNTING BEHAVIOUR (server/services/accounting-engine.ts)
--   resolveCostComponent(value, resolution):
--     value IS NULL                        -> null (unknown)
--     value  > 0                           -> value
--     value  = 0 AND resolution='verified_zero' -> 0 (a real, exact zero)
--     value  = 0 otherwise                 -> null (UNKNOWN — never a silent 0)
--   An unknown component does not fabricate a cost and is never coerced to 0;
--   its line is reported `incomplete` (some components known) or `unknown` (no
--   component known) and the order can no longer report an EXACT profit.
--   Because an unresolved zero contributed exactly 0 to COGS before this change
--   and contributes nothing at all after it, the monetary COGS total is
--   unchanged — only the honesty of the status changes.
--
-- COMPATIBILITY POLICY
--   * Additive only; every column is nullable. A deployment running the OLD
--     code against the NEW schema is unaffected (it never reads the columns).
--   * The NEW code treats a missing/NULL resolution identically to
--     'unresolved', so it is correct BEFORE this migration is applied too.
--     Applying the migration is therefore not a prerequisite for the fix — it
--     is what lets an operator ever say "verified_zero".
--   * No API contract is broken: the resolution fields are additional.
-- ============================================================================

DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'products'
  ) THEN
    RAISE EXCEPTION 'add_product_cost_resolution: products table is missing';
  END IF;
END
$guard$;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost_price_resolution      text,
  ADD COLUMN IF NOT EXISTS packaging_cost_resolution  text,
  ADD COLUMN IF NOT EXISTS insert_cost_resolution     text,
  ADD COLUMN IF NOT EXISTS cost_resolution_note       text,
  ADD COLUMN IF NOT EXISTS cost_resolution_by         text,
  ADD COLUMN IF NOT EXISTS cost_resolution_at         timestamptz;

-- Vocabulary guard. NOT VALID: pre-existing rows are validated by the backfill
-- below, and the constraint is enforced for every future write regardless.
DO $chk$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_cost_resolution_chk') THEN
    ALTER TABLE products ADD CONSTRAINT products_cost_resolution_chk CHECK (
      (cost_price_resolution     IS NULL OR cost_price_resolution     IN ('known','verified_zero','unresolved')) AND
      (packaging_cost_resolution IS NULL OR packaging_cost_resolution IN ('known','verified_zero','unresolved')) AND
      (insert_cost_resolution    IS NULL OR insert_cost_resolution    IN ('known','verified_zero','unresolved'))
    ) NOT VALID;
  END IF;
END
$chk$;

-- A 'verified_zero' claim is meaningless without a recorded reason. Enforced
-- for every future write; NOT VALID so it can never fail on legacy rows (the
-- backfill below never produces 'verified_zero').
DO $chk2$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_verified_zero_evidence_chk') THEN
    ALTER TABLE products ADD CONSTRAINT products_verified_zero_evidence_chk CHECK (
      NOT (
        (cost_price_resolution = 'verified_zero'
         OR packaging_cost_resolution = 'verified_zero'
         OR insert_cost_resolution = 'verified_zero')
        AND (cost_resolution_note IS NULL OR btrim(cost_resolution_note) = '')
      )
    ) NOT VALID;
  END IF;
END
$chk2$;

-- ── Backfill (idempotent: only ever fills NULL resolutions) ──────────────────
-- Positive value => 'known'. Everything else (NULL or 0) => 'unresolved'.
-- A zero is NEVER promoted to 'verified_zero' here.
UPDATE products SET cost_price_resolution =
  CASE WHEN cost_price IS NOT NULL AND cost_price::numeric > 0 THEN 'known' ELSE 'unresolved' END
WHERE cost_price_resolution IS NULL;

UPDATE products SET packaging_cost_resolution =
  CASE WHEN packaging_cost IS NOT NULL AND packaging_cost::numeric > 0 THEN 'known' ELSE 'unresolved' END
WHERE packaging_cost_resolution IS NULL;

UPDATE products SET insert_cost_resolution =
  CASE WHEN insert_cost IS NOT NULL AND insert_cost::numeric > 0 THEN 'known' ELSE 'unresolved' END
WHERE insert_cost_resolution IS NULL;

-- Fail closed: the backfill must not have invented a single verified zero.
DO $verify$
DECLARE bad bigint;
BEGIN
  SELECT count(*) INTO bad FROM products
   WHERE cost_price_resolution = 'verified_zero'
      OR packaging_cost_resolution = 'verified_zero'
      OR insert_cost_resolution = 'verified_zero';
  IF bad > 0 THEN
    RAISE EXCEPTION 'add_product_cost_resolution: backfill produced % verified_zero rows — it must never classify an ambiguous zero', bad;
  END IF;

  SELECT count(*) INTO bad FROM products
   WHERE cost_price_resolution IS NULL
      OR packaging_cost_resolution IS NULL
      OR insert_cost_resolution IS NULL;
  IF bad > 0 THEN
    RAISE EXCEPTION 'add_product_cost_resolution: % products left with an unclassified cost component', bad;
  END IF;
END
$verify$;

CREATE INDEX IF NOT EXISTS products_cost_unresolved_idx
  ON products(id)
  WHERE cost_price_resolution = 'unresolved'
     OR packaging_cost_resolution = 'unresolved'
     OR insert_cost_resolution = 'unresolved';

COMMENT ON COLUMN products.cost_price_resolution IS
  'F-5: what cost_price MEANS. known (>0, real) | verified_zero (=0, human-confirmed, requires cost_resolution_note) | unresolved (UNKNOWN — accounting treats it as NULL, never as 0).';
