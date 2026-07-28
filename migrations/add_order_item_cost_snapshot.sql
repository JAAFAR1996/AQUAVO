-- Additive migration: immutable per-unit cost snapshot on order lines, with
-- explicit completeness metadata. FULLY IDEMPOTENT — safe to re-run any number
-- of times (columns via IF NOT EXISTS; every named CHECK guarded by a pg_constraint
-- lookup in a DO block, since ADD CONSTRAINT is not itself idempotent).
-- Apply surgically (NOT via db:push — the drizzle tablesFilter has drifted).
--
-- CORRECTNESS RULE (owner-mandated): a missing/unavailable cost is NULL, never 0.
-- A stored 0 means a VERIFIED zero cost. All CHECKs are NOT VALID so they apply to
-- new/updated rows only and NEVER rewrite or reinterpret historical rows.

ALTER TABLE order_items_relational
  ADD COLUMN IF NOT EXISTS unit_cost_price          numeric,   -- NULL = unknown (never 0)
  ADD COLUMN IF NOT EXISTS unit_packaging_cost      numeric,
  ADD COLUMN IF NOT EXISTS unit_insert_cost         numeric,
  ADD COLUMN IF NOT EXISTS cost_snapshot_status     text,      -- exact|estimated|incomplete|unknown
  ADD COLUMN IF NOT EXISTS cost_snapshot_source     text,      -- product_current|cost_history|manual|none
  ADD COLUMN IF NOT EXISTS cost_snapshot_confidence text,      -- high|medium|low (NULL allowed)
  ADD COLUMN IF NOT EXISTS cost_snapshot_version    integer,
  ADD COLUMN IF NOT EXISTS cost_snapshot_at         timestamptz;

DO $$
BEGIN
  -- non-negative money guard (NULL always allowed = unknown)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_cost_nonneg') THEN
    ALTER TABLE order_items_relational
      ADD CONSTRAINT order_items_cost_nonneg
      CHECK (
        (unit_cost_price     IS NULL OR unit_cost_price     >= 0) AND
        (unit_packaging_cost IS NULL OR unit_packaging_cost >= 0) AND
        (unit_insert_cost    IS NULL OR unit_insert_cost    >= 0)
      ) NOT VALID;
  END IF;

  -- allowed snapshot status values (NULL allowed for legacy rows)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_cost_status_chk') THEN
    ALTER TABLE order_items_relational
      ADD CONSTRAINT order_items_cost_status_chk
      CHECK (cost_snapshot_status IS NULL OR cost_snapshot_status IN ('exact','estimated','incomplete','unknown'))
      NOT VALID;
  END IF;

  -- allowed snapshot source values
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_cost_source_chk') THEN
    ALTER TABLE order_items_relational
      ADD CONSTRAINT order_items_cost_source_chk
      CHECK (cost_snapshot_source IS NULL OR cost_snapshot_source IN ('product_current','cost_history','manual','none'))
      NOT VALID;
  END IF;

  -- allowed confidence values
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_cost_confidence_chk') THEN
    ALTER TABLE order_items_relational
      ADD CONSTRAINT order_items_cost_confidence_chk
      CHECK (cost_snapshot_confidence IS NULL OR cost_snapshot_confidence IN ('high','medium','low'))
      NOT VALID;
  END IF;

  -- version must be a positive integer when present
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_cost_version_chk') THEN
    ALTER TABLE order_items_relational
      ADD CONSTRAINT order_items_cost_version_chk
      CHECK (cost_snapshot_version IS NULL OR cost_snapshot_version >= 1)
      NOT VALID;
  END IF;
END $$;

-- Do NOT backfill from CURRENT product cost; that would falsely freeze today's cost
-- onto historical orders. Any backfill must come from product_cost_history via a
-- separate reviewed job, marked cost_snapshot_status='estimated'.
