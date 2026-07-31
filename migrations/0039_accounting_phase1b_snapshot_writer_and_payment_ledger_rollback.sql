-- =============================================================================
-- ROLLBACK for 0039_accounting_phase1b_snapshot_writer_and_payment_ledger
-- =============================================================================
-- DO NOT RUN AGAINST PRODUCTION without the explicit owner release token.
--
-- Restores the exact pre-0039 state observed on branch
-- br-late-thunder-a42sjx9q "backup-before-accounting-phase1b-20260730"
-- (created 2026-07-30T15:18:39Z, 79s before 0039 was applied):
--
--   * trigger  order_items_b_write_financial_snapshots   -> absent
--   * function write_order_item_financial_snapshots()    -> absent
--   * view     accounting_readiness_status               -> absent
--   * setting  payment_ledger_enabled                    -> 'false'
--   * setting  financial_snapshot_writer_enabled         -> absent
--
-- It touches NO order, order line, product, cost or inventory row. The snapshot
-- columns already written on order lines are left exactly as they are — they are
-- historical financial facts and are never rewritten by a rollback.
-- =============================================================================

BEGIN;

DROP TRIGGER IF EXISTS order_items_b_write_financial_snapshots ON public.order_items_relational;

DROP VIEW IF EXISTS public.accounting_readiness_status;

DROP FUNCTION IF EXISTS public.write_order_item_financial_snapshots();

UPDATE public.settings
   SET value = 'false', updated_at = now()
 WHERE key = 'payment_ledger_enabled';

DELETE FROM public.settings
 WHERE key = 'financial_snapshot_writer_enabled';

-- Mark the ledger row rolled back rather than deleting it (append-only history).
UPDATE public.schema_migrations
   SET rolled_back_at = now()
 WHERE version = '0039_accounting_phase1b_snapshot_writer_and_payment_ledger'
   AND rolled_back_at IS NULL;

COMMIT;
