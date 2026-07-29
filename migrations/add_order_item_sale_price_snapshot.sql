-- ============================================================================
-- add_order_item_sale_price_snapshot.sql
--
-- MISSION §11 — "تثبيت الأسعار والكلف تاريخياً — ممنوع إعادة حساب الماضي".
--
-- The cost side of a sale is already frozen on the order line
-- (add_order_item_cost_snapshot.sql). The SALE PRICE side is not: the line
-- carries `price_at_purchase`, but with no record of WHERE that price came
-- from, WHEN it was frozen, or what discount produced it. A reader cannot
-- distinguish a price that was snapshotted at sale time from one that was
-- backfilled later from the catalogue.
--
-- §11 requires both halves to be immutable, so that changing a product's price
-- or cost affects ONLY orders created after the change takes effect.
--
-- WHAT THIS ADDS (all nullable, all additive):
--   unit_sale_price_snapshot        list price per unit at sale time
--   discount_snapshot               per-unit discount applied at sale time
--   final_unit_sale_price_snapshot  what the customer was actually charged
--   sale_price_snapshot_at          when the snapshot was taken
--   sale_price_source               provenance of the figure
--
-- WHY NULLABLE: the 182 historical lines have no such snapshot and one cannot
-- be manufactured for them. NULL means "not snapshotted", which is the truth.
-- A default would fabricate provenance for rows that never had it — the exact
-- failure mode §3 of the mission forbids.
--
-- WHAT THIS DOES NOT DO:
--   * No backfill. Not from products.price, not from price_history, not from
--     total_price / quantity. Deriving a "snapshot" from today's catalogue is
--     precisely the retroactive recalculation §11 prohibits.
--   * No modification of price_at_purchase. It stays the operative figure for
--     historical revenue; these columns add provenance for NEW lines.
--
-- EXECUTION CONTRACT: no top-level BEGIN/COMMIT — the executor wraps the file.
-- Idempotent. NOT APPLIED TO PRODUCTION BY THIS CHANGE.
-- Reversible via add_order_item_sale_price_snapshot_rollback.sql.
-- ============================================================================

-- Record whether this is the FIRST application, before mutating anything.
-- The fail-closed verify at the end must only assert on a first run: on a
-- re-run the table legitimately contains snapshots written by the application
-- since, and asserting against those would make the migration non-idempotent.
CREATE TEMP TABLE IF NOT EXISTS _sale_price_migration_state AS
SELECT NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'order_items_relational'
    AND column_name = 'sale_price_source'
) AS first_application;

ALTER TABLE order_items_relational
  ADD COLUMN IF NOT EXISTS unit_sale_price_snapshot       numeric,
  ADD COLUMN IF NOT EXISTS discount_snapshot              numeric,
  ADD COLUMN IF NOT EXISTS final_unit_sale_price_snapshot numeric,
  ADD COLUMN IF NOT EXISTS sale_price_snapshot_at         timestamp,
  ADD COLUMN IF NOT EXISTS sale_price_source              text;

COMMENT ON COLUMN order_items_relational.unit_sale_price_snapshot IS
  'List price per unit frozen at sale time. NULL = never snapshotted (historical row). Never backfilled from the catalogue.';
COMMENT ON COLUMN order_items_relational.final_unit_sale_price_snapshot IS
  'Price per unit actually charged, after discount. The figure a tax report must use for revenue.';
COMMENT ON COLUMN order_items_relational.sale_price_source IS
  'product_current | price_history | manual | none — provenance of the snapshot.';

-- ── Constraints ────────────────────────────────────────────────────────────
-- All NOT VALID: historical rows are evidence and are never reinterpreted or
-- rejected retroactively. These govern what may be written from now on.

DO $c1$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_sale_price_nonneg') THEN
    ALTER TABLE order_items_relational
      ADD CONSTRAINT order_items_sale_price_nonneg
      CHECK (
        (unit_sale_price_snapshot       IS NULL OR unit_sale_price_snapshot       >= 0) AND
        (discount_snapshot              IS NULL OR discount_snapshot              >= 0) AND
        (final_unit_sale_price_snapshot IS NULL OR final_unit_sale_price_snapshot >= 0)
      ) NOT VALID;
  END IF;
END
$c1$;

DO $c2$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_sale_price_source_chk') THEN
    ALTER TABLE order_items_relational
      ADD CONSTRAINT order_items_sale_price_source_chk
      CHECK (
        sale_price_source IS NULL
        OR sale_price_source IN ('product_current', 'price_history', 'manual', 'none')
      ) NOT VALID;
  END IF;
END
$c2$;

-- Arithmetic coherence: list - discount = final. Only enforced when all three
-- are present, so a partially-populated row is not rejected.
DO $c3$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_sale_price_identity_chk') THEN
    ALTER TABLE order_items_relational
      ADD CONSTRAINT order_items_sale_price_identity_chk
      CHECK (
        unit_sale_price_snapshot IS NULL
        OR discount_snapshot IS NULL
        OR final_unit_sale_price_snapshot IS NULL
        OR final_unit_sale_price_snapshot = unit_sale_price_snapshot - discount_snapshot
      ) NOT VALID;
  END IF;
END
$c3$;

-- A snapshot claiming provenance must say when it was taken. Provenance
-- without a timestamp cannot be audited against a price-history row.
DO $c4$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_sale_price_provenance_chk') THEN
    ALTER TABLE order_items_relational
      ADD CONSTRAINT order_items_sale_price_provenance_chk
      CHECK (
        sale_price_source IS NULL
        OR sale_price_source = 'none'
        OR sale_price_snapshot_at IS NOT NULL
      ) NOT VALID;
  END IF;
END
$c4$;

-- ── Verify: the migration must not have invented any snapshot ──────────────
-- Fail-closed. If any row gained a sale-price snapshot as a side effect of this
-- migration, that is fabricated financial provenance and the transaction must
-- abort rather than ship it.
DO $verify$
DECLARE
  fabricated integer;
  is_first   boolean;
BEGIN
  SELECT first_application INTO is_first FROM _sale_price_migration_state LIMIT 1;
  IF NOT COALESCE(is_first, false) THEN
    RAISE NOTICE 'Re-run detected: skipping first-application assertion (existing snapshots are application-written, not fabricated).';
    RETURN;
  END IF;

  SELECT count(*) INTO fabricated
  FROM order_items_relational
  WHERE sale_price_snapshot_at IS NOT NULL
     OR sale_price_source IS NOT NULL;

  IF fabricated > 0 THEN
    RAISE EXCEPTION
      'ABORT: % row(s) carry a sale-price snapshot immediately after an '
      'additive migration that writes no data. A snapshot must be created by '
      'the order-creation path at sale time, never by a migration.', fabricated;
  END IF;
END
$verify$;

DROP TABLE IF EXISTS _sale_price_migration_state;
