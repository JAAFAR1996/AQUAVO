-- ============================================================================
-- TRIGGER SAFETY: order_items_relational backfill vs. two LIVE-PRODUCTION-ONLY
-- triggers (record_order_item_inventory_sale, prevent_unsafe_order_dependency_mutation)
-- ============================================================================
-- EXECUTION CONTRACT (mandatory)
--   This file contains NO top-level BEGIN / COMMIT / ROLLBACK. The EXECUTOR owns
--   the transaction and MUST submit the complete file through one write-capable
--   transactional call:
--       BEGIN;  <entire file>  COMMIT;      -- on any error: ROLLBACK;
--
-- WHY THIS MIGRATION EXISTS
--   docs/audit/orderitem-trigger-forensics.md captured, VERBATIM and with
--   SHA-256 fingerprints, two triggers/functions that exist ONLY in live
--   production and appear in NO committed migration:
--     * record_order_item_inventory_sale()          (AFTER INSERT on order_items_relational)
--     * prevent_unsafe_order_dependency_mutation()   (BEFORE DELETE/UPDATE OF order_id)
--   This file CREATE OR REPLACEs both functions, reproducing their captured
--   behaviour EXACTLY, and adds two narrow, evidence-producing exceptions so
--   that an AUTHORIZED, BATCH-TAGGED historical backfill (see
--   migrations/backfill_orderitems_from_jsonb.sql, owned by another workstream)
--   can (a) insert historical lines with NO new inventory movement, and
--   (b) have ITS OWN batch's rows deleted by ITS OWN rollback script, without
--   opening ANY blanket bypass for anything else.
--
--   FORBIDDEN and NOT used anywhere below: DISABLE TRIGGER ALL, ALTER TABLE
--   ... DISABLE TRIGGER, session_replication_role, role-wide bypasses,
--   permanent global flags, "latest batch" auto-selection, trusting row
--   metadata alone (every bypass below re-validates against the persisted
--   orderitem_backfill_batches control row inside this same statement).
--
-- SESSION-LOCAL PARAMETERS (GUCs) — no defaults, nothing sticks past the tx:
--   aquavo.backfill_batch_id            uuid text  — the batch under way / being rolled back
--   aquavo.backfill_rollback_authorized 'on'        — required IN ADDITION to the batch id,
--                                                      ONLY for the delete-exception (§2)
--   Neither GUC affects normal application traffic: with both unset (the
--   default for every ordinary INSERT/DELETE), both functions run their
--   ORIGINAL, unmodified logic end-to-end.
-- ============================================================================


-- ── Evidence table: append-only record of every time either exception fired ─
-- Owned by this migration; dropped by this migration's rollback. Kept
-- deliberately separate from orderitem_backfill_batches (owned by the backfill
-- migration) so this workstream never has to ALTER a table another workstream
-- owns, and so the evidence trail survives even if that table's shape changes.
CREATE TABLE IF NOT EXISTS orderitem_trigger_safety_audit (
  id            bigserial PRIMARY KEY,
  event_type    text NOT NULL,
  batch_id      uuid NOT NULL,
  order_item_id text,
  order_id      text,
  detail        jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

DO $guard$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oitsa_event_type_chk') THEN
    ALTER TABLE orderitem_trigger_safety_audit ADD CONSTRAINT oitsa_event_type_chk
      CHECK (event_type IN ('inventory_sale_suppressed', 'audited_delete_authorized')) NOT VALID;
  END IF;
END
$guard$;

CREATE INDEX IF NOT EXISTS oitsa_batch_idx ON orderitem_trigger_safety_audit(batch_id);
CREATE INDEX IF NOT EXISTS oitsa_order_item_idx ON orderitem_trigger_safety_audit(order_item_id);


-- ═════════════════════════════════════════════════════════════════════════════
-- (1) record_order_item_inventory_sale() — inventory-sale exception
-- ═════════════════════════════════════════════════════════════════════════════
-- ORIGINAL (captured live, SHA-256 c14f31465132476698f4f587cc15849bf3a535f919e-
-- ab51dd0c0ab35f45dee3c per docs/audit/orderitem-trigger-forensics.md §2):
--   gate on settings.inventory_ledger_mode='enforce' → look up MAIN location →
--   INSERT a negative 'sale' inventory_movements row keyed by
--   idempotency_key = 'order_item:'||NEW.id, ON CONFLICT DO NOTHING.
--
-- EXCEPTION added here: skip the movement (no INSERT into inventory_movements
-- at all) ONLY when ALL SIX hold, re-checked every single call, right after the
-- ORIGINAL enforce-mode gate (so when mode<>'enforce' nothing changes — the
-- function still returns immediately, exactly as before):
--   1. session GUC aquavo.backfill_batch_id holds a non-empty batch id;
--   2. NEW.metadata->'backfill'->>'batch_id' is present on the inserted row;
--   3. the two batch ids are textually IDENTICAL;
--   4. that batch id exists as a row in orderitem_backfill_batches;
--   5. that row's source/migration identify the ONE approved order-item
--      backfill (source='orders.items', migration='backfill_orderitems_from_jsonb.sql');
--   6. that row is the batch CURRENTLY BEING WRITTEN by this same transaction —
--      chosen rule: finished_at IS NULL AND rolled_back_at IS NULL. Justification:
--      migrations/backfill_orderitems_from_jsonb.sql opens the batch row FIRST
--      (INSERT ... RETURNING batch_id) and only stamps finished_at AFTER every
--      row for that batch has been inserted (see its STEP 3e). So at the exact
--      moment this AFTER-INSERT trigger fires for a row belonging to that open
--      batch, finished_at is necessarily still NULL — it is not a loophole, it
--      is the one moment in the batch's lifecycle this trigger can observe.
--      A FINISHED batch (finished_at set) can never again cause a NEW insert
--      matching condition 6, so a completed batch cannot be "reopened" by this
--      rule to suppress movements for unrelated future inserts.
-- Every suppression is recorded in orderitem_trigger_safety_audit BEFORE
-- returning — that INSERT is on the same statement/transaction as the skipped
-- movement, so "suppression happened" is provable even though the movement
-- itself never existed.
-- Otherwise (any one condition fails) the ORIGINAL logic runs, completely
-- unchanged, byte-for-byte the same INSERT ... ON CONFLICT DO NOTHING as before.
CREATE OR REPLACE FUNCTION public.record_order_item_inventory_sale()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  mode text;
  main_location text;
  line_variant text;
  v_guc_batch_txt text;
  v_row_batch_txt text;
  v_guc_batch uuid;
  v_eligible boolean := false;
BEGIN
  SELECT value INTO mode FROM settings WHERE key='inventory_ledger_mode';
  IF COALESCE(mode,'off')<>'enforce' THEN RETURN NEW; END IF;

  -- ── backfill inventory-sale exception (checked BEFORE any movement work) ──
  v_guc_batch_txt := NULLIF(btrim(current_setting('aquavo.backfill_batch_id', true)), '');
  v_row_batch_txt := NULLIF(btrim(NEW.metadata->'backfill'->>'batch_id'), '');

  IF v_guc_batch_txt IS NOT NULL AND v_row_batch_txt IS NOT NULL
     AND v_guc_batch_txt = v_row_batch_txt THEN
    BEGIN
      v_guc_batch := v_guc_batch_txt::uuid;
    EXCEPTION WHEN others THEN
      v_guc_batch := NULL; -- malformed GUC can never authorize anything
    END;

    IF v_guc_batch IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM orderitem_backfill_batches
        WHERE batch_id = v_guc_batch
          AND source = 'orders.items'
          AND migration = 'backfill_orderitems_from_jsonb.sql'
          AND finished_at IS NULL
          AND rolled_back_at IS NULL
      ) INTO v_eligible;
    END IF;

    IF v_eligible THEN
      INSERT INTO orderitem_trigger_safety_audit
        (event_type, batch_id, order_item_id, order_id, detail)
      VALUES (
        'inventory_sale_suppressed', v_guc_batch, NEW.id, NEW.order_id,
        jsonb_build_object('product_id', NEW.product_id, 'quantity', NEW.quantity)
      );
      RETURN NEW;
    END IF;
  END IF;
  -- ── end exception; anything not matching all six conditions falls through
  --    to the ORIGINAL, unmodified behaviour below ──────────────────────────

  SELECT id INTO main_location FROM inventory_locations WHERE code='MAIN' AND is_active=true LIMIT 1;
  IF main_location IS NULL THEN RAISE EXCEPTION 'MAIN inventory location is not configured'; END IF;
  line_variant:=NULLIF(NEW.metadata->>'variantId','');
  INSERT INTO inventory_movements(product_id,variant_id,location_id,quantity_delta,movement_type,source_type,source_id,idempotency_key,currency,happened_at,created_by,metadata)
  VALUES (NEW.product_id,line_variant,main_location,-NEW.quantity,'sale','order_line',NEW.order_id,'order_item:'||NEW.id,'IQD',now(),'database_trigger',jsonb_build_object('order_id',NEW.order_id,'order_item_id',NEW.id))
  ON CONFLICT(idempotency_key) DO NOTHING;
  RETURN NEW;
END;
$function$;


-- ═════════════════════════════════════════════════════════════════════════════
-- (2) prevent_unsafe_order_dependency_mutation() — audited-delete exception
-- ═════════════════════════════════════════════════════════════════════════════
-- ORIGINAL (captured live, SHA-256 98c626552eb4fe75728dc7c64648e2a50b952f9503d-
-- d4b7060550d8e5219f631): generic reusable guard, called with TG_ARGV[0] as the
-- name of the "order id" column. On UPDATE, an unchanged order id is a no-op.
-- Otherwise it RAISEs unless order_is_hard_deletable(old_order_id).
--
-- This function is (by construction — it takes TG_ARGV[0] as a parameter, not a
-- hardcoded column) POTENTIALLY reused by triggers on OTHER tables too. The
-- exception below is therefore scoped as tightly as physically possible:
--   * TG_OP must be exactly 'DELETE' (never UPDATE — an order_id REASSIGNMENT
--     is never authorized by this exception, only a batch-scoped row removal);
--   * TG_TABLE_NAME must be exactly 'order_items_relational' (a same-named
--     trigger reused on any other table takes the ORIGINAL path unconditionally,
--     because OLD.metadata may not even exist on another table's row shape);
--   * ALL SIX conditions below must hold, or the ORIGINAL order_is_hard_deletable
--     check (and its RAISE) runs exactly as before, with no observable
--     difference to any table's normal DELETE/UPDATE-of-order_id behaviour.
--
-- The six conditions:
--   1. session GUC aquavo.backfill_rollback_authorized = 'on' (a SEPARATE flag
--      from the batch id — two independent settings must both be supplied,
--      not one setting doing double duty);
--   2. session GUC aquavo.backfill_batch_id holds a non-empty, valid-uuid batch id;
--   3. OLD.metadata->'backfill'->>'batch_id' equals that batch id EXACTLY;
--   4. that batch exists in orderitem_backfill_batches, source/migration match
--      the one approved order-item backfill, AND it is ELIGIBLE FOR ROLLBACK:
--      finished_at IS NOT NULL (completed — never delete out of a batch that
--      is still being written) AND rolled_back_at IS NULL (never already
--      rolled back — matches exactly the eligibility rule
--      migrations/backfill_orderitems_from_jsonb_rollback.sql itself enforces
--      before it issues its DELETE, so the two guards agree on what "eligible"
--      means);
--   5. the row is backfill-created: OLD.metadata ? 'backfill' (an
--      application-created row — no 'backfill' key at all — can NEVER satisfy
--      condition 3 either, since NULL <> the batch id string; this is stated
--      explicitly and checked directly, not left as an implicit consequence);
--   6. TG_OP = 'DELETE' (see above — enforced by the outer IF, restated here
--      for the record).
-- Every authorized bypass is recorded in orderitem_trigger_safety_audit BEFORE
-- the row is allowed to proceed to deletion.
CREATE OR REPLACE FUNCTION public.prevent_unsafe_order_dependency_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  old_order_id text;
  new_order_id text;
  v_authorized boolean := false;
  v_guc_authorized boolean;
  v_guc_batch_txt text;
  v_guc_batch uuid;
  v_row_batch_txt text;
  v_has_backfill_key boolean;
  v_batch_eligible boolean;
BEGIN
  old_order_id:=to_jsonb(OLD)->>TG_ARGV[0];
  IF TG_OP='UPDATE' THEN
    new_order_id:=to_jsonb(NEW)->>TG_ARGV[0];
    IF old_order_id IS NOT DISTINCT FROM new_order_id THEN RETURN NEW; END IF;
  END IF;

  -- ── audited-delete exception (DELETE on order_items_relational only) ──────
  IF TG_OP = 'DELETE' AND TG_TABLE_NAME = 'order_items_relational' THEN
    v_guc_authorized := COALESCE(current_setting('aquavo.backfill_rollback_authorized', true), 'off') = 'on';
    v_guc_batch_txt   := NULLIF(btrim(current_setting('aquavo.backfill_batch_id', true)), '');
    v_row_batch_txt   := NULLIF(btrim(OLD.metadata->'backfill'->>'batch_id'), '');
    v_has_backfill_key := (OLD.metadata IS NOT NULL AND OLD.metadata ? 'backfill');

    IF v_guc_authorized AND v_guc_batch_txt IS NOT NULL
       AND v_has_backfill_key AND v_row_batch_txt IS NOT NULL
       AND v_guc_batch_txt = v_row_batch_txt THEN
      BEGIN
        v_guc_batch := v_guc_batch_txt::uuid;
      EXCEPTION WHEN others THEN
        v_guc_batch := NULL;
      END;

      IF v_guc_batch IS NOT NULL THEN
        SELECT EXISTS (
          SELECT 1 FROM orderitem_backfill_batches
          WHERE batch_id = v_guc_batch
            AND source = 'orders.items'
            AND migration = 'backfill_orderitems_from_jsonb.sql'
            AND finished_at IS NOT NULL
            AND rolled_back_at IS NULL
        ) INTO v_batch_eligible;

        IF v_batch_eligible THEN
          INSERT INTO orderitem_trigger_safety_audit
            (event_type, batch_id, order_item_id, order_id, detail)
          VALUES (
            'audited_delete_authorized', v_guc_batch, OLD.id, old_order_id,
            jsonb_build_object('product_id', OLD.product_id, 'quantity', OLD.quantity)
          );
          v_authorized := true;
        END IF;
      END IF;
    END IF;
  END IF;
  -- ── end exception; anything not matching all six conditions falls through
  --    to the ORIGINAL, unmodified guard below ──────────────────────────────

  IF NOT v_authorized THEN
    IF old_order_id IS NOT NULL AND NOT order_is_hard_deletable(old_order_id) THEN
      RAISE EXCEPTION 'order % is audited and its dependent records cannot be removed or detached', old_order_id;
    END IF;
  END IF;

  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;
