-- ============================================================================
-- F-4: per-LINE identity for packaging_inventory_movements
-- ============================================================================
-- EXECUTION CONTRACT (mandatory)
--   This file contains NO top-level BEGIN / COMMIT / ROLLBACK. The EXECUTOR owns
--   the transaction and MUST submit the complete file through one write-capable
--   transactional call:
--       BEGIN;  <entire file>  COMMIT;      -- on any error: ROLLBACK;
--
-- THE DEFECT (empirically proven — see docs/audit/accounting-semantics-remediation.md §F-4)
--   server/services/fulfillment-service.ts minted one stock movement per
--   fulfillment LINE but keyed it
--       idempotency_key = 'use:' || event_id || ':' || material_id
--   while `pim_idempotency_uidx` is UNIQUE on idempotency_key alone. The key
--   therefore carries NO per-line component, so a single, entirely legitimate
--   event that lists the SAME material on TWO lines (e.g. two different box
--   sizes recorded under one material id, or a split quantity with different
--   cost components) produces the SAME key twice and the second INSERT dies
--   with SQLSTATE 23505 — aborting the whole confirmation transaction.
--
-- THE FIX (additive, reversible, does NOT weaken duplicate protection)
--   1. Add nullable column `line_id` referencing order_fulfillment_lines(id).
--      Every fulfillment_usage movement created from now on records the exact
--      line it deducted stock for.
--   2. Keep `pim_idempotency_uidx` EXACTLY as it is — global request-level
--      de-duplication is unchanged, so a replayed request is still blocked.
--   3. Add `pim_line_uidx`: UNIQUE on line_id WHERE line_id IS NOT NULL.
--      This is a STRICTLY STRONGER guarantee than before: at most ONE stock
--      movement may ever exist per fulfillment line. Previously nothing at the
--      database level prevented two movements for one line under two different
--      idempotency keys.
--   The application then keys usage movements 'use:<event_id>:<line_id>', which
--   is unique per line by construction while remaining stable for that line.
--
-- BACKFILL POLICY — deliberately NONE.
--   Existing rows keep line_id = NULL. Their line cannot be inferred without
--   guessing (the old key only identified a material, and the ambiguous case is
--   precisely the one where more than one line shares a material). Historical
--   rows therefore stay explicitly unattributed rather than being silently
--   assigned to an arbitrary line. `pim_line_uidx` is a partial index, so NULL
--   rows are unaffected by it.
-- ============================================================================

-- Fail closed: nothing to do (and nothing safe to do) if the base table is absent.
DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'packaging_inventory_movements'
  ) THEN
    RAISE EXCEPTION 'add_pim_line_identity: packaging_inventory_movements is missing — apply migrations/add_fulfillment_costing.sql first';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'order_fulfillment_lines'
  ) THEN
    RAISE EXCEPTION 'add_pim_line_identity: order_fulfillment_lines is missing — apply migrations/add_fulfillment_costing.sql first';
  END IF;
END
$guard$;

ALTER TABLE packaging_inventory_movements
  ADD COLUMN IF NOT EXISTS line_id text;

DO $fk$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pim_line_fk') THEN
    ALTER TABLE packaging_inventory_movements
      ADD CONSTRAINT pim_line_fk FOREIGN KEY (line_id)
      REFERENCES order_fulfillment_lines(id);
  END IF;
END
$fk$;

-- At most ONE movement per fulfillment line. Partial: historical rows (line_id
-- NULL) are exempt, and non-usage movements (purchases, reversals) stay NULL.
CREATE UNIQUE INDEX IF NOT EXISTS pim_line_uidx
  ON packaging_inventory_movements(line_id)
  WHERE line_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS pim_event_idx
  ON packaging_inventory_movements(event_id);

COMMENT ON COLUMN packaging_inventory_movements.line_id IS
  'F-4: the order_fulfillment_lines row this movement deducted stock for. NULL for pre-migration rows and for movements not derived from a fulfillment line (purchases, reversals). Gives the idempotency key a per-line component so one event may legitimately carry the same material on two lines.';
