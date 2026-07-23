-- Rollback for add_product_cost_resolution.sql — idempotent.
--
-- SAFE BY CONSTRUCTION: the forward migration never modified cost_price,
-- packaging_cost or insert_cost, so dropping the resolution columns restores
-- products to its exact pre-migration state. No business number is affected.
--
-- After rollback the engine's resolveCostComponent() sees no resolution and
-- falls back to 'unresolved' for every zero — i.e. the conservative reading.
-- Any 'verified_zero' classification an operator had recorded is lost, which is
-- the correct direction of failure (evidence is discarded, never invented).
--
-- EXECUTION CONTRACT: no top-level BEGIN/COMMIT — the executor owns the
-- transaction and submits this whole file inside one.

DROP INDEX IF EXISTS products_cost_unresolved_idx;

ALTER TABLE IF EXISTS products DROP CONSTRAINT IF EXISTS products_verified_zero_evidence_chk;
ALTER TABLE IF EXISTS products DROP CONSTRAINT IF EXISTS products_cost_resolution_chk;

ALTER TABLE IF EXISTS products
  DROP COLUMN IF EXISTS cost_price_resolution,
  DROP COLUMN IF EXISTS packaging_cost_resolution,
  DROP COLUMN IF EXISTS insert_cost_resolution,
  DROP COLUMN IF EXISTS cost_resolution_note,
  DROP COLUMN IF EXISTS cost_resolution_by,
  DROP COLUMN IF EXISTS cost_resolution_at;
