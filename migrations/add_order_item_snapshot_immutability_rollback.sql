-- ============================================================================
-- add_order_item_snapshot_immutability_rollback.sql
--
-- Reverses add_order_item_snapshot_immutability.sql.
--
-- Removes the immutability trigger and restores the previous (narrower) status
-- CHECK. Deliberately does NOT drop `order_item_snapshot_corrections`: that
-- table holds evidence of authorized corrections that actually happened, and
-- destroying an audit trail to undo a schema change is never acceptable. Drop
-- it by hand only if you are certain it is empty.
--
-- ⚠️ After this rollback, frozen cost snapshots are mutable again by any
-- writer. Mission §11's guarantee is not enforced while it is reverted.
--
-- EXECUTION CONTRACT: no top-level BEGIN/COMMIT — the executor wraps the file.
-- Idempotent.
-- ============================================================================

DROP TRIGGER IF EXISTS order_item_cost_snapshot_immutable ON order_items_relational;
DROP FUNCTION IF EXISTS guard_order_item_cost_snapshot();

-- Restore the original vocabulary (without 'verified_zero'), matching
-- add_order_item_cost_snapshot.sql exactly.
ALTER TABLE order_items_relational
  DROP CONSTRAINT IF EXISTS order_items_cost_status_chk;

ALTER TABLE order_items_relational
  ADD CONSTRAINT order_items_cost_status_chk
  CHECK (
    cost_snapshot_status IS NULL
    OR cost_snapshot_status IN ('exact', 'estimated', 'incomplete', 'unknown')
  ) NOT VALID;

DO $notice$
DECLARE
  evidence_rows integer;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_name = 'order_item_snapshot_corrections') THEN
    SELECT count(*) INTO evidence_rows FROM order_item_snapshot_corrections;
    RAISE NOTICE
      'order_item_snapshot_corrections retained with % row(s) — audit evidence '
      'is not dropped by a rollback.', evidence_rows;
  END IF;
END
$notice$;

DO $verify$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'order_item_cost_snapshot_immutable' AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'ROLLBACK INCOMPLETE: trigger still present';
  END IF;
END
$verify$;
