-- ============================================================================
-- ROLLBACK for backfill_orderitems_from_jsonb.sql — EXPLICIT BATCH ID REQUIRED
-- ============================================================================
-- EXECUTION CONTRACT (mandatory)
--   No top-level BEGIN / COMMIT / ROLLBACK. The EXECUTOR owns the transaction and
--   MUST submit the complete file through one write-capable transactional call:
--       BEGIN;  <entire file>  COMMIT;      -- on any error: ROLLBACK;
--
-- REQUIRED PARAMETER — set in the SAME transaction, BEFORE this file:
--       SET LOCAL aquavo.backfill_batch_id = '<exact-batch-uuid>';
--   There is NO default. "Most recent batch" selection was removed: `latest` can
--   change between preview and execution, or select a different batch after
--   another run, so an implicit target is unsafe. Without the setting this file
--   raises and deletes nothing.
--
--   Find the batch id with:
--       SELECT batch_id, started_at, finished_at, rows_inserted,
--              unresolved_lines, ambiguous_groups, reconciliation_complete
--       FROM orderitem_backfill_batches
--       WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
--       ORDER BY started_at DESC;
--
-- OPTIONAL — control-table disposal policy (see the two modes at the foot):
--       SET LOCAL aquavo.backfill_drop_control_table = 'on';
--
-- SAFETY CONTRACT — can only ever delete rows one specific batch inserted:
--   * Selector is metadata #>> '{backfill,batch_id}' = <the exact uuid>.
--   * App-created rows have NO metadata.backfill key, so they are unreachable.
--   * Rows of any OTHER batch are equally unreachable.
--   * The deleted count is compared against the recorded rows_inserted INSIDE the
--     same transaction; a mismatch raises and the executor rolls back.
--
-- ROLLBACK ORDER: this file runs BEFORE add_order_item_cost_snapshot_rollback.sql.
-- ============================================================================

DO $rollback$
DECLARE
  v_txt      text := current_setting('aquavo.backfill_batch_id', true);
  v_batch    uuid;
  v_rec      orderitem_backfill_batches%ROWTYPE;
  v_selected bigint;
  v_appish   bigint;
  v_deleted  bigint;
  v_drop     text := COALESCE(current_setting('aquavo.backfill_drop_control_table', true), 'off');
  v_active   bigint;
BEGIN
  ---------------------------------------------------------------------------
  -- 1. An explicit, well-formed batch id is mandatory.
  ---------------------------------------------------------------------------
  IF v_txt IS NULL OR btrim(v_txt) = '' THEN
    RAISE EXCEPTION
      'ABORT: no batch id supplied. Set "SET LOCAL aquavo.backfill_batch_id = ''<uuid>'';" '
      'in the same transaction. There is deliberately no default.';
  END IF;

  BEGIN
    v_batch := btrim(v_txt)::uuid;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'ABORT: aquavo.backfill_batch_id (%) is not a valid uuid.', v_txt;
  END;

  ---------------------------------------------------------------------------
  -- 2. Validate the batch record.
  ---------------------------------------------------------------------------
  SELECT * INTO v_rec FROM orderitem_backfill_batches WHERE batch_id = v_batch;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ABORT: batch % does not exist.', v_batch;
  END IF;
  IF v_rec.finished_at IS NULL THEN
    RAISE EXCEPTION 'ABORT: batch % never completed; refusing to roll back a partial batch.', v_batch;
  END IF;
  IF v_rec.rolled_back_at IS NOT NULL THEN
    RAISE EXCEPTION 'ABORT: batch % was already rolled back at %.', v_batch, v_rec.rolled_back_at;
  END IF;

  ---------------------------------------------------------------------------
  -- 3. Validate the row set BEFORE deleting anything.
  ---------------------------------------------------------------------------
  SELECT count(*) INTO v_selected
  FROM order_items_relational
  WHERE metadata #>> '{backfill,batch_id}' = v_batch::text;

  IF v_selected <> COALESCE(v_rec.rows_inserted, -1) THEN
    RAISE EXCEPTION
      'ABORT: row-count mismatch for batch % — selected %, batch recorded %. '
      'Refusing to delete a set that does not match the audit record.',
      v_batch, v_selected, v_rec.rows_inserted;
  END IF;

  -- Belt and braces: nothing selected may look app-created.
  SELECT count(*) INTO v_appish
  FROM order_items_relational
  WHERE metadata #>> '{backfill,batch_id}' = v_batch::text
    AND (metadata IS NULL OR NOT (metadata ? 'backfill'));
  IF v_appish > 0 THEN
    RAISE EXCEPTION 'ABORT: % selected row(s) lack backfill provenance. Refusing.', v_appish;
  END IF;

  ---------------------------------------------------------------------------
  -- 4. Delete exactly that batch, then re-verify the count in-transaction.
  ---------------------------------------------------------------------------
  DELETE FROM order_items_relational
  WHERE metadata #>> '{backfill,batch_id}' = v_batch::text;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted <> v_rec.rows_inserted THEN
    RAISE EXCEPTION
      'ABORT: deleted % row(s) but batch recorded %. Rolling back.', v_deleted, v_rec.rows_inserted;
  END IF;

  UPDATE orderitem_backfill_batches
  SET rolled_back_at = now(),
      note = COALESCE(note, '') || ' | rolled back ' || v_deleted || ' rows'
  WHERE batch_id = v_batch;

  RAISE NOTICE 'Batch % rolled back: % rows deleted (matches audit record).', v_batch, v_deleted;

  ---------------------------------------------------------------------------
  -- 5. Control-table disposal — explicit policy, two supported modes.
  ---------------------------------------------------------------------------
  -- MODE A — CHILD-BRANCH FULL ROLLBACK (aquavo.backfill_drop_control_table='on')
  --   Drops orderitem_backfill_batches so the schema returns byte-for-byte to its
  --   former object set, satisfying "all introduced objects removed". Permitted
  --   ONLY when no active (un-rolled-back) batch remains. Intended for the
  --   disposable rollback-test branch.
  --
  -- MODE B — PRODUCTION EMERGENCY ROLLBACK (default, 'off')
  --   DOCUMENTED EXCEPTION: the control table is retained deliberately. It is the
  --   audit trail proving what was inserted and reversed, and destroying it would
  --   destroy the evidence the rollback is meant to produce. Under this mode the
  --   schema does NOT return byte-for-byte to its former object set: exactly one
  --   introduced object (orderitem_backfill_batches) remains, by design. Rollback
  --   must therefore be described as "complete except for the retained audit
  --   table", never as an unqualified full rollback.
  IF v_drop = 'on' THEN
    SELECT count(*) INTO v_active
    FROM orderitem_backfill_batches
    WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;

    IF v_active > 0 THEN
      RAISE EXCEPTION
        'ABORT: refusing to drop the control table — % un-rolled-back batch(es) remain.', v_active;
    END IF;

    DROP TABLE orderitem_backfill_batches;
    RAISE NOTICE 'Control table dropped (MODE A: child-branch full rollback).';
  ELSE
    RAISE NOTICE 'Control table RETAINED (MODE B: production audit trail). '
                 'Rollback is complete except for this documented exception.';
  END IF;
END
$rollback$;
