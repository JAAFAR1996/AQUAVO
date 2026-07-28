-- Rollback for add_pim_line_identity.sql — idempotent, dependency order.
-- Restores the pre-migration shape of packaging_inventory_movements exactly:
-- pim_idempotency_uidx is never touched by either direction, so duplicate
-- request protection is identical before, during and after.
--
-- NOTE: dropping line_id discards the per-line attribution recorded while the
-- migration was live. That is the intended, honest behaviour of a rollback —
-- the column is additive and no other object depends on it.
--
-- EXECUTION CONTRACT: no top-level BEGIN/COMMIT — the executor owns the
-- transaction and submits this whole file inside one.

DROP INDEX IF EXISTS pim_line_uidx;
DROP INDEX IF EXISTS pim_event_idx;

ALTER TABLE IF EXISTS packaging_inventory_movements
  DROP CONSTRAINT IF EXISTS pim_line_fk;

ALTER TABLE IF EXISTS packaging_inventory_movements
  DROP COLUMN IF EXISTS line_id;
