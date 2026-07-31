-- 0046_return_packaging_loss_source
-- Tells reports where order_return_events.packaging_loss came from.
--
-- THE DOUBLE-COUNT THIS PREVENTS. accounting.ts sums packaging_loss into
-- totalFinancialImpactAll. Once returns auto-populate that column from the
-- shipment snapshot, the same carton cost would be subtracted twice: once as
-- packaging cost (already recognised at shipment) and again as a return loss.
--
-- With this column, reports sum ONLY rows marked 'manual' — the historical
-- figures an admin typed in by hand, which were never part of a fulfillment
-- snapshot. Rows marked 'fulfillment_snapshot' are DISPLAYED as a
-- return-related reclassification and excluded from every expense total.
--
-- All four existing rows are backfilled to 'manual' and all four carry
-- packaging_loss = 0, so this migration has zero financial effect on history.
-- ROLLBACK: 0046_return_packaging_loss_source_rollback.sql

BEGIN;

ALTER TABLE order_return_events
  ADD COLUMN IF NOT EXISTS packaging_loss_source text NOT NULL DEFAULT 'manual';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ore_packaging_loss_source_chk') THEN
    ALTER TABLE order_return_events ADD CONSTRAINT ore_packaging_loss_source_chk
      CHECK (packaging_loss_source IN ('manual','fulfillment_snapshot')) NOT VALID;
  END IF;
END $$;

-- Explicit and idempotent. The DEFAULT already covers existing rows; this makes
-- the intent visible and survives a partially applied run.
UPDATE order_return_events
   SET packaging_loss_source = 'manual'
 WHERE packaging_loss_source IS NULL;

CREATE INDEX IF NOT EXISTS ore_loss_source_idx ON order_return_events(packaging_loss_source);

INSERT INTO schema_migrations (version, checksum, applied_by, notes)
SELECT '0046_return_packaging_loss_source', 'pending', current_user,
       'separates hand-entered legacy packaging losses from snapshot reclassifications; prevents double counting'
WHERE NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version='0046_return_packaging_loss_source');

COMMIT;
