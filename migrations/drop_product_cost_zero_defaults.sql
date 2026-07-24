-- ============================================================================
-- F-10: stop `numeric DEFAULT '0'` from silently manufacturing ambiguous zeros
-- ============================================================================
-- EXECUTION CONTRACT (mandatory)
--   This file contains NO top-level BEGIN / COMMIT / ROLLBACK. The EXECUTOR owns
--   the transaction and MUST submit the complete file through one write-capable
--   transactional call:
--       BEGIN;  <entire file>  COMMIT;      -- on any error: ROLLBACK;
--
--   PREREQUISITE: migrations/add_product_cost_resolution.sql must be applied
--   first (this file depends on the *_resolution columns existing).
--
-- THE DEFECT
--   products.cost_price / packaging_cost / insert_cost are `numeric DEFAULT '0'`.
--   Any INSERT that omits a cost — an import, an admin "create product" form
--   that leaves the field blank — produces a row whose 0 is indistinguishable
--   from a human saying "this genuinely costs nothing". F-5 added the
--   *_resolution columns so the two can be told apart; this migration removes
--   the mechanism that keeps creating the ambiguity in the first place.
--
-- LIVE STATE THIS WAS PREPARED AGAINST (production, read-only verification
-- 2026-07-24, branch br-patient-mouse-a4d4cgr4):
--     114 total products; 114 active; 0 soft-deleted
--     113 active products with cost_price > 0
--       1 active product with cost_price = 0  (houyi-mountain-wood, stock = 0)
--       0 active IN-STOCK products with cost_price = 0
--     114/114 active products with packaging_cost = 0 AND insert_cost = 0
--   So there is no live COGS exposure today: the single ambiguous cost_price
--   belongs to an out-of-stock product that cannot be ordered. The risk this
--   migration removes is entirely FORWARD-LOOKING — the next product created
--   without a cost. The 114 zero packaging/insert costs stay AMBIGUOUS and are
--   deliberately NOT reinterpreted here; only an operator with evidence may
--   promote one to 'verified_zero'.
--
-- THE DESIGN
--   1. DROP DEFAULT on the three numeric cost columns. An omitted cost now lands
--      as NULL, which every read path already understands as UNKNOWN.
--   2. SET DEFAULT 'unresolved' on the three *_resolution columns, so a row
--      created without resolution metadata is EXPLICITLY unresolved rather than
--      silently NULL.
--   3. A CHECK that makes an ambiguous zero impossible to write going forward:
--      a cost of exactly 0 must be accompanied by a resolution that says what
--      that 0 means. NOT VALID, so pre-existing rows are untouched — the
--      add_product_cost_resolution backfill already classified all of them as
--      'unresolved', which satisfies the constraint anyway.
--
-- NOT CHANGED
--   * No stored value is rewritten. No historical cost is fabricated or erased.
--   * No column is made NOT NULL.
--   * order_items_relational cost columns are untouched (immutable snapshots).
--
-- COMPATIBILITY
--   Additive/relaxing only. OLD code that INSERTs a product WITHOUT a cost used
--   to get 0 and now gets NULL — which is the point, and which every current
--   read path (resolveCostComponent, buildProductCostSnapshot) already treats as
--   UNKNOWN. OLD code that INSERTs an explicit 0 must now also supply a
--   resolution; the application layer does this (insertProductSchema defaults
--   omitted costs to NULL and never writes a bare 0).
--
-- REVERSIBLE: migrations/drop_product_cost_zero_defaults_rollback.sql
-- ============================================================================

DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products'
      AND column_name = 'cost_price_resolution'
  ) THEN
    RAISE EXCEPTION 'drop_product_cost_zero_defaults: add_product_cost_resolution.sql must be applied first';
  END IF;
END
$guard$;

-- ── 1. An omitted cost is UNKNOWN (NULL), not a zero ────────────────────────
ALTER TABLE products ALTER COLUMN cost_price     DROP DEFAULT;
ALTER TABLE products ALTER COLUMN packaging_cost DROP DEFAULT;
ALTER TABLE products ALTER COLUMN insert_cost    DROP DEFAULT;

-- ── 2. A row created without resolution metadata is EXPLICITLY unresolved ───
ALTER TABLE products ALTER COLUMN cost_price_resolution     SET DEFAULT 'unresolved';
ALTER TABLE products ALTER COLUMN packaging_cost_resolution SET DEFAULT 'unresolved';
ALTER TABLE products ALTER COLUMN insert_cost_resolution    SET DEFAULT 'unresolved';

-- ── 3. A stored 0 must declare what it means ────────────────────────────────
DO $chk$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_zero_cost_needs_resolution_chk') THEN
    ALTER TABLE products ADD CONSTRAINT products_zero_cost_needs_resolution_chk CHECK (
      (cost_price     IS NULL OR cost_price::numeric     <> 0 OR cost_price_resolution     IS NOT NULL) AND
      (packaging_cost IS NULL OR packaging_cost::numeric <> 0 OR packaging_cost_resolution IS NOT NULL) AND
      (insert_cost    IS NULL OR insert_cost::numeric    <> 0 OR insert_cost_resolution    IS NOT NULL)
    ) NOT VALID;
  END IF;
END
$chk$;

-- ── Fail closed: the migration must not have invented evidence ──────────────
DO $verify$
DECLARE bad bigint;
BEGIN
  SELECT count(*) INTO bad
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'products'
     AND column_name IN ('cost_price','packaging_cost','insert_cost')
     AND column_default IS NOT NULL;
  IF bad > 0 THEN
    RAISE EXCEPTION 'drop_product_cost_zero_defaults: % cost column(s) still carry a DEFAULT', bad;
  END IF;

  -- No zero may have been promoted to a verified zero by this migration.
  SELECT count(*) INTO bad FROM products
   WHERE deleted_at IS NULL
     AND cost_price IS NOT NULL AND cost_price::numeric = 0
     AND cost_price_resolution = 'verified_zero'
     AND (cost_resolution_note IS NULL OR btrim(cost_resolution_note) = '');
  IF bad > 0 THEN
    RAISE EXCEPTION 'drop_product_cost_zero_defaults: % unevidenced verified_zero row(s)', bad;
  END IF;
END
$verify$;

COMMENT ON COLUMN products.cost_price IS
  'F-10: NO column default. Omitted => NULL => UNKNOWN. A stored 0 means nothing on its own — cost_price_resolution says whether it is a verified zero or an unresolved (unknown) one.';
