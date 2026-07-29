-- ============================================================================
-- add_order_item_snapshot_immutability_rollback.sql
--
-- Reverses add_order_item_snapshot_immutability.sql.
--
-- Removes both immutability triggers and their helper functions, and restores
-- the previous (narrower) cost-status CHECK.
--
-- Deliberately does NOT drop `financial_correction_requests` or
-- `financial_correction_audit`: they hold evidence of corrections that actually
-- happened. Destroying an audit trail to undo a schema change is never
-- acceptable. Drop them by hand only after confirming they are empty.
--
-- ⚠️ After this rollback, the financial fields of realized orders are editable
-- again by any writer. Mission §11's guarantee is NOT enforced while reverted.
--
-- EXECUTION CONTRACT: no top-level BEGIN/COMMIT — the executor wraps the file.
-- Idempotent.
-- ============================================================================

DROP TRIGGER IF EXISTS order_financial_history_immutable ON orders;
DROP TRIGGER IF EXISTS order_item_financial_history_immutable ON order_items_relational;
-- Legacy name from the first design, in case an older version was applied.
DROP TRIGGER IF EXISTS order_item_cost_snapshot_immutable ON order_items_relational;

DROP TRIGGER IF EXISTS fca_append_only ON financial_correction_audit;
DROP TRIGGER IF EXISTS fcr_append_only ON financial_correction_requests;

DROP FUNCTION IF EXISTS guard_order_financial_history();
DROP FUNCTION IF EXISTS guard_order_item_financial_history();
DROP FUNCTION IF EXISTS guard_order_item_cost_snapshot();
DROP FUNCTION IF EXISTS guard_correction_tables_append_only();
DROP FUNCTION IF EXISTS raise_financial_history_frozen(text);
DROP FUNCTION IF EXISTS assert_financial_correction_authorized(text, text, text);
DROP FUNCTION IF EXISTS is_financially_realized_order(text, boolean);

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
  reqs integer := 0;
  auds integer := 0;
BEGIN
  IF to_regclass('public.financial_correction_requests') IS NOT NULL THEN
    SELECT count(*) INTO reqs FROM financial_correction_requests;
  END IF;
  IF to_regclass('public.financial_correction_audit') IS NOT NULL THEN
    SELECT count(*) INTO auds FROM financial_correction_audit;
  END IF;
  RAISE NOTICE
    'Correction evidence retained: % request(s), % audit row(s). A rollback '
    'never drops audit history.', reqs, auds;
END
$notice$;

DO $verify$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM pg_trigger
  WHERE NOT tgisinternal
    AND tgname IN ('order_item_financial_history_immutable',
                   'order_financial_history_immutable',
                   'order_item_cost_snapshot_immutable',
                   'fca_append_only', 'fcr_append_only');
  IF n <> 0 THEN
    RAISE EXCEPTION 'ROLLBACK INCOMPLETE: % trigger(s) still present', n;
  END IF;
END
$verify$;
