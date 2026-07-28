-- ============================================================================
-- add_order_item_snapshot_immutability.sql
--
-- MISSION §11 item 10 — "أضف Database Trigger يمنع تعديل Exact snapshots بعد
-- اعتمادها، باستثناء مسار تصحيح مدقق ومصرح به."
--
-- Until now, the immutability of an order line's cost snapshot was a CONVENTION
-- enforced only by application code. Red Team B-7 established that nothing at
-- the database level prevented drizzle-kit, `db:push`, the MCP server, a psql
-- session, or any other route from rewriting a frozen cost. §11 requires that
-- changing a product's price or cost provably cannot alter a historical order.
-- A convention cannot prove that; a trigger can.
--
-- MODELLED ON the only DB-enforced immutability already in this repo:
-- `ofl_immutable` on order_fulfillment_lines (add_fulfillment_costing.sql).
-- The audited-exception mechanism follows add_orderitem_backfill_trigger_safety.sql.
--
-- ALSO FIXES (Red Team M-5): `order_items_cost_status_chk` omitted
-- 'verified_zero', a value the TypeScript type and buildProductCostSnapshot both
-- emit. Any verified-zero write would have been rejected by the database.
--
-- WHAT IS PROTECTED: the frozen financial fields of a line whose snapshot
-- status is 'exact' or 'verified_zero' — the two statuses that assert evidence.
-- Lines that are 'estimated'/'incomplete'/'unknown' stay mutable, because the
-- Historical Cost Evidence Reconstruction workflow must be able to upgrade them.
--
-- WHAT IS NOT PROTECTED: non-financial columns (metadata). Those may change.
--
-- THE AUDITED CORRECTION PATH: two session-local GUCs must BOTH be set inside
-- the same transaction. Neither has a default; neither survives the transaction.
--   aquavo.snapshot_correction_id         a correction-request id (text)
--   aquavo.snapshot_correction_authorized must equal 'on'
-- Every use writes an evidence row BEFORE the mutation proceeds, so an
-- authorized correction is provable after the fact. There is deliberately NO
-- role-wide bypass, NO session_replication_role usage, and NO global flag.
--
-- EXECUTION CONTRACT: no top-level BEGIN/COMMIT — the executor wraps the file.
-- Idempotent. NOT APPLIED TO PRODUCTION BY THIS CHANGE.
-- Reversible via add_order_item_snapshot_immutability_rollback.sql.
-- ============================================================================

-- ── 1. M-5: allow 'verified_zero' in the status vocabulary ─────────────────
-- Drop and re-add rather than mutate: a CHECK cannot be altered in place.
-- Re-added NOT VALID, consistent with the original — historical rows are not
-- reinterpreted.
ALTER TABLE order_items_relational
  DROP CONSTRAINT IF EXISTS order_items_cost_status_chk;

ALTER TABLE order_items_relational
  ADD CONSTRAINT order_items_cost_status_chk
  CHECK (
    cost_snapshot_status IS NULL
    OR cost_snapshot_status IN ('exact', 'verified_zero', 'estimated', 'incomplete', 'unknown')
  ) NOT VALID;

COMMENT ON CONSTRAINT order_items_cost_status_chk ON order_items_relational IS
  'Includes verified_zero: a cost confirmed to BE zero, which is categorically '
  'different from an unknown cost stored as zero. See Red Team M-5.';

-- ── 2. Evidence table for authorized corrections ───────────────────────────
CREATE TABLE IF NOT EXISTS order_item_snapshot_corrections (
  id            bigserial PRIMARY KEY,
  order_item_id text        NOT NULL,
  order_id      text,
  correction_id text        NOT NULL,
  operation     text        NOT NULL,
  before_row    jsonb       NOT NULL,
  after_row     jsonb,
  db_user       text        NOT NULL DEFAULT current_user,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_item_snapshot_corrections_op_chk
    CHECK (operation IN ('update', 'delete'))
);

COMMENT ON TABLE order_item_snapshot_corrections IS
  'Append-only evidence of every authorized modification to a frozen order-line '
  'cost snapshot. A correction that left no row here did not happen through the '
  'authorized path. Mission §11 "تصحيح خطأ تاريخي".';

-- ── 3. The guard ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION guard_order_item_cost_snapshot()
RETURNS trigger
LANGUAGE plpgsql
AS $guard$
DECLARE
  correction_id   text;
  authorized      text;
  financial_changed boolean;
BEGIN
  -- Only lines asserting evidence are frozen. An estimated line must stay
  -- mutable so the reconstruction workflow can upgrade it to exact.
  IF COALESCE(OLD.cost_snapshot_status, '') NOT IN ('exact', 'verified_zero') THEN
    RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  -- Read the audited-correction GUCs. Missing GUC => empty string, not error.
  correction_id := current_setting('aquavo.snapshot_correction_id', true);
  authorized    := current_setting('aquavo.snapshot_correction_authorized', true);

  IF TG_OP = 'UPDATE' THEN
    -- Non-financial edits (e.g. metadata) are always permitted. Only the frozen
    -- money fields are guarded, so ordinary bookkeeping is not obstructed.
    financial_changed :=
         OLD.unit_cost_price      IS DISTINCT FROM NEW.unit_cost_price
      OR OLD.unit_packaging_cost  IS DISTINCT FROM NEW.unit_packaging_cost
      OR OLD.unit_insert_cost     IS DISTINCT FROM NEW.unit_insert_cost
      OR OLD.cost_snapshot_status IS DISTINCT FROM NEW.cost_snapshot_status
      OR OLD.cost_snapshot_source IS DISTINCT FROM NEW.cost_snapshot_source
      OR OLD.price_at_purchase    IS DISTINCT FROM NEW.price_at_purchase
      OR OLD.quantity             IS DISTINCT FROM NEW.quantity;

    IF NOT financial_changed THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Financial mutation of a frozen line: both GUCs required, in this
  -- transaction. Checked every call — nothing is cached or inherited.
  IF correction_id IS NULL OR correction_id = ''
     OR authorized IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION
      'order line % carries a % cost snapshot and is immutable. Changing a '
      'product price or cost must never alter a historical order (mission §11). '
      'To correct a proven error, open a Correction Request and replay through '
      'the audited path with aquavo.snapshot_correction_id and '
      'aquavo.snapshot_correction_authorized set in the same transaction.',
      OLD.id, OLD.cost_snapshot_status
      USING ERRCODE = 'raise_exception';
  END IF;

  -- Authorized. Write the evidence BEFORE allowing the change, so the record
  -- exists even if a later statement in this transaction fails.
  INSERT INTO order_item_snapshot_corrections
    (order_item_id, order_id, correction_id, operation, before_row, after_row)
  VALUES (
    OLD.id,
    OLD.order_id,
    correction_id,
    lower(TG_OP),
    to_jsonb(OLD),
    CASE TG_OP WHEN 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );

  RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
END
$guard$;

DROP TRIGGER IF EXISTS order_item_cost_snapshot_immutable ON order_items_relational;

CREATE TRIGGER order_item_cost_snapshot_immutable
  BEFORE UPDATE OR DELETE ON order_items_relational
  FOR EACH ROW
  EXECUTE FUNCTION guard_order_item_cost_snapshot();

-- ── 4. Verify the trigger is actually installed ────────────────────────────
DO $verify$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'order_item_cost_snapshot_immutable'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'ABORT: order_item_cost_snapshot_immutable was not created';
  END IF;
END
$verify$;
