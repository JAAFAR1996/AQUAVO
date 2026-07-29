-- ============================================================================
-- add_order_item_snapshot_immutability.sql
--
-- MISSION §11 — "ممنوع إعادة حساب الماضي".
--
-- DESIGN HISTORY (both corrections made before production)
-- --------------------------------------------------------
-- v1 froze a line only when its cost snapshot was 'exact'/'verified_zero'.
-- Production has 0 of 114 active products able to produce either status, so it
-- protected nothing: price_at_purchase, quantity and total_price were editable
-- on every order in the database.
--
-- v2 rebound the freeze to the ORDER'S financial state. Review then found four
-- remaining routes to rewriting history, all closed here:
--   (1) UNFREEZE — flipping delivered -> pending in one statement, then editing
--       freely in the next. The freeze was evaluated per-statement, not sticky.
--   (2) INSERT — the guard covered UPDATE/DELETE only, so a brand-new line
--       could be appended to a delivered order, inventing revenue.
--   (3) DELETE — an entire realized order could be removed, taking its lines
--       (and the financial evidence) with it.
--   (4) CORRECTION BYPASS — a session GUC plus an approved row unlocked edits,
--       but the workflow was incomplete: applied_at was never stamped, a
--       correction_id could be replayed, and the request's field/old/new values
--       were never checked against the actual change, so a request to fix one
--       field authorized changing any field to any value.
--
-- PHASE 1A POSITION: THERE IS NO BYPASS. Every financial mutation of a realized
-- order is refused, unconditionally. No GUC, no session flag, no role, no
-- approved row opens it. The correction tables ship as future structure only
-- and are deliberately NOT consulted by any trigger.
-- The audited correction path arrives in a separate migration and must satisfy
-- the requirements listed at the bottom of this file before it is enabled.
--
-- FROZEN WHEN (mirrors isFinanciallyRealizedOrder in shared/order-financials.ts):
--     orders.status = 'delivered'
--  OR orders.status IN ('returned','rejected_returned')
--  OR orders.financially_counted IS TRUE
--
-- EXECUTION CONTRACT: no top-level BEGIN/COMMIT — the executor wraps the file.
-- Idempotent. NOT APPLIED TO PRODUCTION BY THIS CHANGE.
-- Reversible via add_order_item_snapshot_immutability_rollback.sql.
-- ============================================================================

-- ── 1. M-5: allow 'verified_zero' in the status vocabulary ─────────────────
ALTER TABLE order_items_relational
  DROP CONSTRAINT IF EXISTS order_items_cost_status_chk;

ALTER TABLE order_items_relational
  ADD CONSTRAINT order_items_cost_status_chk
  CHECK (
    cost_snapshot_status IS NULL
    OR cost_snapshot_status IN ('exact', 'verified_zero', 'estimated', 'incomplete', 'unknown')
  ) NOT VALID;

-- ── 2. The shared realization predicate ────────────────────────────────────
CREATE OR REPLACE FUNCTION is_financially_realized_order(
  p_status text,
  p_financially_counted boolean
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(p_financially_counted, false) = true
      OR lower(btrim(COALESCE(p_status, ''))) IN ('delivered', 'returned', 'rejected_returned');
$$;

COMMENT ON FUNCTION is_financially_realized_order(text, boolean) IS
  'Mirrors isFinanciallyRealizedOrder() in shared/order-financials.ts. Freezing '
  'depends on the ORDER''S financial state, never on cost completeness.';

-- ── 3. Correction tables — FUTURE STRUCTURE, INERT IN PHASE 1A ─────────────
-- Created so the shape is settled and reviewable. NO trigger reads them, so a
-- row here grants nothing. See FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED.
CREATE TABLE IF NOT EXISTS financial_correction_requests (
  correction_id        text PRIMARY KEY,
  order_id             text NOT NULL,
  order_item_id        text,
  table_name           text NOT NULL,
  field_name           text NOT NULL,
  old_value            text,
  new_value            text,
  reason               text NOT NULL,
  evidence_document_id text,
  requested_by         text NOT NULL,
  approved_by          text,
  requested_at         timestamptz NOT NULL DEFAULT now(),
  approved_at          timestamptz,
  applied_at           timestamptz,
  fiscal_period        text,
  before_hash          text,
  after_hash           text,
  CONSTRAINT fcr_approval_complete CHECK (
    (approved_by IS NULL AND approved_at IS NULL)
    OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)
  ),
  CONSTRAINT fcr_reason_nonblank CHECK (btrim(reason) <> ''),
  -- An approver who is also the requester is not an approval.
  CONSTRAINT fcr_separate_approver CHECK (approved_by IS NULL OR approved_by <> requested_by)
);

COMMENT ON TABLE financial_correction_requests IS
  'FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED — Phase 1A ships this table as '
  'future structure only. No trigger consults it; inserting an approved row '
  'grants no permission whatsoever. The enabling migration must first guarantee '
  'single-use, atomic applied_at, and table/row/field/old/new matching.';

CREATE TABLE IF NOT EXISTS financial_correction_audit (
  id            bigserial PRIMARY KEY,
  correction_id text        NOT NULL,
  table_name    text        NOT NULL,
  row_id        text        NOT NULL,
  operation     text        NOT NULL,
  before_row    jsonb       NOT NULL,
  after_row     jsonb,
  db_user       text        NOT NULL DEFAULT current_user,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fca_op_chk CHECK (operation IN ('update', 'delete'))
);

-- Append-only, enforced. An audit trail that can be edited is not evidence.
CREATE OR REPLACE FUNCTION guard_correction_tables_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    '% is append-only: UPDATE and DELETE are not permitted on correction evidence.',
    TG_TABLE_NAME
    USING ERRCODE = 'raise_exception';
END
$$;

DROP TRIGGER IF EXISTS fca_append_only ON financial_correction_audit;
CREATE TRIGGER fca_append_only
  BEFORE UPDATE OR DELETE ON financial_correction_audit
  FOR EACH ROW EXECUTE FUNCTION guard_correction_tables_append_only();

DROP TRIGGER IF EXISTS fcr_append_only ON financial_correction_requests;
CREATE TRIGGER fcr_append_only
  BEFORE DELETE ON financial_correction_requests
  FOR EACH ROW EXECUTE FUNCTION guard_correction_tables_append_only();

-- ── 4. The single refusal ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION raise_financial_history_frozen(p_detail text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'البيانات المالية للطلب محققة ومجمدة. مسار التصحيح المدقق غير منفذ حالياً، لذلك لا يسمح بالتعديل المباشر. [FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED] %',
    p_detail
    USING ERRCODE = 'raise_exception';
END
$$;

-- ── 5. Guard: order_items_relational (INSERT + UPDATE + DELETE) ────────────
CREATE OR REPLACE FUNCTION guard_order_item_financial_history()
RETURNS trigger
LANGUAGE plpgsql
AS $guard$
DECLARE
  v_order_id text;
  v_status   text;
  v_counted  boolean;
  v_changed  boolean;
BEGIN
  v_order_id := CASE TG_OP WHEN 'INSERT' THEN NEW.order_id ELSE OLD.order_id END;

  SELECT o.status, o.financially_counted INTO v_status, v_counted
  FROM orders o WHERE o.id = v_order_id;

  -- RE-PARENTING is an INSERT in disguise: moving an editable line from an open
  -- order onto a realized one would append revenue to frozen history without
  -- ever running an INSERT. The DESTINATION parent must be checked too.
  IF TG_OP = 'UPDATE' AND NEW.order_id IS DISTINCT FROM OLD.order_id THEN
    DECLARE
      v_new_status  text;
      v_new_counted boolean;
    BEGIN
      SELECT o.status, o.financially_counted INTO v_new_status, v_new_counted
      FROM orders o WHERE o.id = NEW.order_id;

      IF is_financially_realized_order(v_new_status, v_new_counted) THEN
        PERFORM raise_financial_history_frozen(
          format('cannot re-parent line %s onto realized order %s (status=%s)',
                 OLD.id, NEW.order_id, COALESCE(v_new_status, 'unknown')));
      END IF;
    END;
  END IF;

  IF NOT is_financially_realized_order(v_status, v_counted) THEN
    RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  -- GAP 2: appending a line to a realized order invents revenue and COGS out
  -- of nothing. There is no legitimate reason for it outside a correction.
  IF TG_OP = 'INSERT' THEN
    PERFORM raise_financial_history_frozen(
      format('cannot INSERT a line into realized order %s (status=%s)',
             v_order_id, COALESCE(v_status, 'unknown')));
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_changed :=
         OLD.product_id                     IS DISTINCT FROM NEW.product_id
      OR OLD.quantity                       IS DISTINCT FROM NEW.quantity
      OR OLD.price_at_purchase              IS DISTINCT FROM NEW.price_at_purchase
      OR OLD.total_price                    IS DISTINCT FROM NEW.total_price
      OR OLD.order_id                       IS DISTINCT FROM NEW.order_id
      OR OLD.unit_cost_price                IS DISTINCT FROM NEW.unit_cost_price
      OR OLD.unit_packaging_cost            IS DISTINCT FROM NEW.unit_packaging_cost
      OR OLD.unit_insert_cost               IS DISTINCT FROM NEW.unit_insert_cost
      OR OLD.cost_snapshot_status           IS DISTINCT FROM NEW.cost_snapshot_status
      OR OLD.cost_snapshot_source           IS DISTINCT FROM NEW.cost_snapshot_source
      OR OLD.cost_snapshot_confidence       IS DISTINCT FROM NEW.cost_snapshot_confidence
      OR OLD.cost_snapshot_version          IS DISTINCT FROM NEW.cost_snapshot_version
      OR OLD.cost_snapshot_at               IS DISTINCT FROM NEW.cost_snapshot_at
      OR OLD.unit_sale_price_snapshot       IS DISTINCT FROM NEW.unit_sale_price_snapshot
      OR OLD.discount_snapshot              IS DISTINCT FROM NEW.discount_snapshot
      OR OLD.final_unit_sale_price_snapshot IS DISTINCT FROM NEW.final_unit_sale_price_snapshot
      OR OLD.sale_price_snapshot_at         IS DISTINCT FROM NEW.sale_price_snapshot_at
      OR OLD.sale_price_source              IS DISTINCT FROM NEW.sale_price_source;

    IF NOT v_changed THEN
      RETURN NEW;  -- non-financial edit (e.g. metadata) stays allowed
    END IF;

    PERFORM raise_financial_history_frozen(
      format('order line %s belongs to realized order %s (status=%s)',
             OLD.id, v_order_id, COALESCE(v_status, 'unknown')));
  END IF;

  -- DELETE of a realized line destroys the evidence for a booked sale.
  PERFORM raise_financial_history_frozen(
    format('cannot DELETE line %s of realized order %s (status=%s)',
           OLD.id, v_order_id, COALESCE(v_status, 'unknown')));
  RETURN NULL;
END
$guard$;

DROP TRIGGER IF EXISTS order_item_cost_snapshot_immutable ON order_items_relational;
DROP TRIGGER IF EXISTS order_item_financial_history_immutable ON order_items_relational;

CREATE TRIGGER order_item_financial_history_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON order_items_relational
  FOR EACH ROW
  EXECUTE FUNCTION guard_order_item_financial_history();

-- ── 6. Guard: orders (UPDATE + DELETE, and STICKY realization) ─────────────
CREATE OR REPLACE FUNCTION guard_order_financial_history()
RETURNS trigger
LANGUAGE plpgsql
AS $guard$
DECLARE
  v_changed boolean;
  v_old_s   text;
  v_new_s   text;
BEGIN
  -- ── GAP 5: creating an already-realized order ────────────────────────────
  -- A row inserted straight into a realized state has never been through the
  -- order lifecycle: no stock reservation, no cost snapshot, no fulfilment.
  -- Worse, the INSERT guard on order_items_relational would then refuse its own
  -- lines, leaving an order with amounts and an items JSONB but no line rows.
  -- The legitimate sequence is: create open -> add lines -> compute -> deliver.
  IF TG_OP = 'INSERT' THEN
    IF is_financially_realized_order(NEW.status, NEW.financially_counted) THEN
      PERFORM raise_financial_history_frozen(
        format('cannot INSERT an order already in a realized state '
               '(status=%s, financially_counted=%s). Create the order open, add '
               'its lines, then transition it.',
               COALESCE(NEW.status, 'null'), COALESCE(NEW.financially_counted::text, 'null')));
    END IF;
    RETURN NEW;
  END IF;

  -- Judged on the OLD row: an order that WAS realized stays governed here.
  IF NOT is_financially_realized_order(OLD.status, OLD.financially_counted) THEN
    RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  -- GAP 3: deleting a realized order erases a booked sale and its lines.
  IF TG_OP = 'DELETE' THEN
    PERFORM raise_financial_history_frozen(
      format('cannot DELETE realized order %s (status=%s)', OLD.id, COALESCE(OLD.status, 'unknown')));
  END IF;

  -- GAP 1: realization is STICKY. Any transition that would make the order
  -- un-realized is refused outright — otherwise history could be rewritten in
  -- two statements: unfreeze, then edit. This also covers flipping
  -- financially_counted from true to false when that flag was the sole reason
  -- the order was realized.
  IF NOT is_financially_realized_order(NEW.status, NEW.financially_counted) THEN
    PERFORM raise_financial_history_frozen(
      format('order %s is financially realized (status=%s) and cannot be moved back to '
             'an unrealized state (attempted status=%s, financially_counted=%s)',
             OLD.id, COALESCE(OLD.status, 'unknown'),
             COALESCE(NEW.status, 'unknown'), COALESCE(NEW.financially_counted::text, 'null')));
  END IF;

  -- ── GAP 6: LIFECYCLE, independent of the money ───────────────────────────
  -- The rule above is about AMOUNTS. It is not enough on its own, because
  -- financially_counted=true keeps an order "realized" no matter what status it
  -- is given — and 39 of 43 production orders carry that flag. So
  -- delivered -> pending would have passed the money check while returning the
  -- order to the open pipeline, where it could be picked up for a second
  -- shipment, a second stock deduction, or a fresh order notification.
  --
  -- Delivery is therefore terminal as a LIFECYCLE fact. Once an order has
  -- reached a delivered/returned state it may only move within that set.
  --
  -- The permitted targets are taken from what the system actually does, not
  -- invented: 'returned' is present in production data (2 orders), and
  -- 'rejected_returned' is classified as a post-delivery return outcome by the
  -- accounting reader (RETURN_STATUSES in server/routes/accounting.ts), though
  -- no row currently uses it. Reversing a return (returned -> delivered) is NOT
  -- permitted; no code path performs it.
  --
  -- Carrier, cod_received, payment status and addresses stay editable WITHOUT a
  -- status change, so genuine post-delivery collection work is unaffected.
  v_old_s := lower(btrim(COALESCE(OLD.status, '')));
  v_new_s := lower(btrim(COALESCE(NEW.status, '')));

  IF v_old_s IN ('delivered', 'returned', 'rejected_returned')
     AND v_new_s IS DISTINCT FROM v_old_s
     AND v_new_s NOT IN ('returned', 'rejected_returned') THEN
    PERFORM raise_financial_history_frozen(
      format('order %s has reached the terminal state "%s"; moving it to "%s" would '
             'return it to the open pipeline and risk a second shipment, a second '
             'stock deduction or a duplicate notification. Permitted targets: '
             'returned, rejected_returned.', OLD.id, v_old_s, v_new_s));
  END IF;

  v_changed :=
       OLD.total             IS DISTINCT FROM NEW.total
    OR OLD.rounded_total     IS DISTINCT FROM NEW.rounded_total
    OR OLD.shipping_cost     IS DISTINCT FROM NEW.shipping_cost
    OR OLD.box_cost          IS DISTINCT FROM NEW.box_cost
    OR OLD.discount_total    IS DISTINCT FROM NEW.discount_total
    OR OLD.coupon_id         IS DISTINCT FROM NEW.coupon_id
    OR OLD.points_used       IS DISTINCT FROM NEW.points_used
    OR OLD.cashback_used     IS DISTINCT FROM NEW.cashback_used
    OR OLD.points_discount   IS DISTINCT FROM NEW.points_discount
    OR OLD.rounding_cashback IS DISTINCT FROM NEW.rounding_cashback
    OR OLD.items             IS DISTINCT FROM NEW.items;

  IF v_changed THEN
    PERFORM raise_financial_history_frozen(
      format('order %s is financially realized (status=%s); total, rounded_total, '
             'shipping_cost, box_cost, discount_total, coupon/loyalty amounts and '
             'items are immutable', OLD.id, COALESCE(OLD.status, 'unknown')));
  END IF;

  -- Fulfilment facts (carrier, cod_received, address, delivered->returned)
  -- remain editable: they genuinely change after delivery.
  RETURN NEW;
END
$guard$;

DROP TRIGGER IF EXISTS order_financial_history_immutable ON orders;

CREATE TRIGGER order_financial_history_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION guard_order_financial_history();

-- ── 7. Verify ──────────────────────────────────────────────────────────────
DO $verify$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM pg_trigger
  WHERE NOT tgisinternal
    AND tgname IN ('order_item_financial_history_immutable', 'order_financial_history_immutable',
                   'fca_append_only', 'fcr_append_only');
  IF n <> 4 THEN
    RAISE EXCEPTION 'ABORT: expected 4 guard triggers, found %', n;
  END IF;

  -- The bypass must be gone. If a future edit reintroduces a GUC read in these
  -- guards, this migration should be re-reviewed rather than silently shipped.
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname IN ('guard_order_item_financial_history', 'guard_order_financial_history')
      AND prosrc ILIKE '%current_setting%'
  ) THEN
    RAISE EXCEPTION 'ABORT: a guard function reads a session setting — Phase 1A must have NO bypass';
  END IF;
END
$verify$;

-- ============================================================================
-- BEFORE THE CORRECTION PATH MAY BE ENABLED (separate migration), it must:
--   * require an approver distinct from the requester;
--   * match table, row, field, old_value and new_value against the actual change;
--   * be single-use, with applied_at stamped atomically in the same transaction;
--   * record before_hash and after_hash;
--   * keep both audit tables append-only;
--   * reset TAX FINAL to false pending accountant review;
--   * ship with replay, field-escalation and value-substitution attack tests.
-- ============================================================================
