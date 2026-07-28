-- Rollback for add_order_item_cost_snapshot.sql — idempotent (IF EXISTS everywhere).
-- Safe: these columns/constraints are only READ as an optional preferred source;
-- without them the engine falls back to the effective-dated resolver as before.

ALTER TABLE order_items_relational
  DROP CONSTRAINT IF EXISTS order_items_cost_nonneg,
  DROP CONSTRAINT IF EXISTS order_items_cost_status_chk,
  DROP CONSTRAINT IF EXISTS order_items_cost_source_chk,
  DROP CONSTRAINT IF EXISTS order_items_cost_confidence_chk,
  DROP CONSTRAINT IF EXISTS order_items_cost_version_chk;

ALTER TABLE order_items_relational
  DROP COLUMN IF EXISTS unit_cost_price,
  DROP COLUMN IF EXISTS unit_packaging_cost,
  DROP COLUMN IF EXISTS unit_insert_cost,
  DROP COLUMN IF EXISTS cost_snapshot_status,
  DROP COLUMN IF EXISTS cost_snapshot_source,
  DROP COLUMN IF EXISTS cost_snapshot_confidence,
  DROP COLUMN IF EXISTS cost_snapshot_version,
  DROP COLUMN IF EXISTS cost_snapshot_at;
