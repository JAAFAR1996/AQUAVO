-- ============================================================================
-- add_order_item_snapshot_immutability.sql
--
-- MISSION §11 — "ممنوع إعادة حساب الماضي".
--
-- WHAT CHANGED, AND WHY (design correction before production)
-- -----------------------------------------------------------
-- The first version of this migration froze a line only when its cost snapshot
-- was 'exact' or 'verified_zero'. Read-only inspection of production then
-- showed that 0 of 114 active products can currently produce either status:
-- 29 have a known purchase cost, but packaging_cost_resolution and
-- insert_cost_resolution are 'unresolved' for ALL of them, so every real line
-- lands as 'incomplete' or 'unknown'.
--
-- The practical effect was that the guard protected nothing:
-- `price_at_purchase`, `quantity` and `total_price` were editable on every
-- order in the database.
--
-- The freeze is therefore rebound to the ORDER'S FINANCIAL STATE, not to cost
-- completeness. An unknown COST must remain honestly unknown — but that is no
-- licence to rewrite the SALE price or the quantity that was actually shipped.
--
-- FROZEN WHEN (mirrors isFinanciallyRealizedOrder in shared/order-financials.ts;
-- the two must not drift):
--     orders.status = 'delivered'                      (REALIZED_STATUSES)
--  OR orders.status IN ('returned','rejected_returned') (post-delivery; makes
--                                                        the freeze sticky, so a
--                                                        return cannot reopen the
--                                                        original sale)
--  OR orders.financially_counted IS TRUE                (explicit operator include)
--
-- NOT frozen: pending / confirmed / processing / shipped / cancelled /
-- rejected / rejected_carrier — ordinary order editing keeps working.
--
-- Also fixes (Red Team M-5): order_items_cost_status_chk omitted
-- 'verified_zero', a value the TypeScript type and buildProductCostSnapshot
-- both emit.
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

-- ── 2. The shared realization predicate, in SQL ────────────────────────────
-- One definition, used by every guard below. IMMUTABLE so it can be inlined.
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

-- ── 3. Correction-request ledger (fail-closed) ─────────────────────────────
-- The full correction UI is out of scope for Phase 1A. What ships now is the
-- evidence table plus a guard that refuses every unapproved edit, so history
-- cannot be rewritten while the workflow is still being built.
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
  CONSTRAINT fcr_reason_nonblank CHECK (btrim(reason) <> '')
);

COMMENT ON TABLE financial_correction_requests IS
  'Append-only evidence for every authorized change to realized financial data. '
  'A correction that left no row here did not happen through the approved path. '
  'Mission §11 "تصحيح خطأ تاريخي".';

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

-- ── 4. Authorization check ─────────────────────────────────────────────────
-- Deliberately NOT a bare session flag. The GUC only names a correction id; the
-- authority comes from a row that must already exist, be approved, and match
-- this exact order. A forgotten `SET` authorizes nothing on its own.
CREATE OR REPLACE FUNCTION assert_financial_correction_authorized(
  p_order_id text,
  p_row_id   text,
  p_table    text
) RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_correction_id text;
  v_ok            boolean;
BEGIN
  v_correction_id := NULLIF(btrim(current_setting('aquavo.correction_id', true)), '');
  IF v_correction_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT true INTO v_ok
  FROM financial_correction_requests r
  WHERE r.correction_id = v_correction_id
    AND r.order_id      = p_order_id
    AND r.table_name    = p_table
    AND r.approved_by   IS NOT NULL
    AND r.approved_at   IS NOT NULL
    AND r.applied_at    IS NULL
    AND (r.order_item_id IS NULL OR r.order_item_id = p_row_id)
  LIMIT 1;

  IF COALESCE(v_ok, false) THEN
    RETURN v_correction_id;
  END IF;
  RETURN NULL;
END
$$;

-- ── 5. Guard: order_items_relational ───────────────────────────────────────
CREATE OR REPLACE FUNCTION guard_order_item_financial_history()
RETURNS trigger
LANGUAGE plpgsql
AS $guard$
DECLARE
  v_status     text;
  v_counted    boolean;
  v_realized   boolean;
  v_changed    boolean;
  v_correction text;
  v_row        order_items_relational%ROWTYPE;
BEGIN
  v_row := CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;

  SELECT o.status, o.financially_counted INTO v_status, v_counted
  FROM orders o WHERE o.id = OLD.order_id;

  v_realized := is_financially_realized_order(v_status, v_counted);
  IF NOT v_realized THEN
    -- Open order: normal editing is allowed and must keep working.
    RETURN v_row;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Every column that participates in a historical financial figure. Note
    -- this list is NOT conditioned on cost status: an unknown cost is still
    -- frozen, because the SALE price and quantity are facts regardless.
    v_changed :=
         OLD.product_id                     IS DISTINCT FROM NEW.product_id
      OR OLD.quantity                       IS DISTINCT FROM NEW.quantity
      OR OLD.price_at_purchase              IS DISTINCT FROM NEW.price_at_purchase
      OR OLD.total_price                    IS DISTINCT FROM NEW.total_price
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
  END IF;

  v_correction := assert_financial_correction_authorized(OLD.order_id, OLD.id, 'order_items_relational');

  IF v_correction IS NULL THEN
    RAISE EXCEPTION
      'order line % belongs to a financially realized order (status=%) and its '
      'historical financial fields are immutable. Changing a product price or '
      'cost must never alter a past order (mission §11). To correct a proven '
      'error, insert an APPROVED row into financial_correction_requests and '
      'replay inside one transaction with aquavo.correction_id set.',
      OLD.id, COALESCE(v_status, 'unknown')
      USING ERRCODE = 'raise_exception';
  END IF;

  INSERT INTO financial_correction_audit
    (correction_id, table_name, row_id, operation, before_row, after_row)
  VALUES (v_correction, 'order_items_relational', OLD.id, lower(TG_OP),
          to_jsonb(OLD), CASE TG_OP WHEN 'DELETE' THEN NULL ELSE to_jsonb(NEW) END);

  RETURN v_row;
END
$guard$;

DROP TRIGGER IF EXISTS order_item_cost_snapshot_immutable ON order_items_relational;
DROP TRIGGER IF EXISTS order_item_financial_history_immutable ON order_items_relational;

CREATE TRIGGER order_item_financial_history_immutable
  BEFORE UPDATE OR DELETE ON order_items_relational
  FOR EACH ROW
  EXECUTE FUNCTION guard_order_item_financial_history();

-- ── 6. Guard: orders (order-level financial fields) ────────────────────────
-- Protecting only the line table would be pointless: revenue is read from
-- orders.rounded_total, shipping from orders.shipping_cost, packaging from
-- orders.box_cost, and the JSONB orders.items is a second copy of the lines.
-- Any of those could rewrite a historical report on its own.
CREATE OR REPLACE FUNCTION guard_order_financial_history()
RETURNS trigger
LANGUAGE plpgsql
AS $guard$
DECLARE
  v_changed    boolean;
  v_correction text;
BEGIN
  -- Judge on the OLD row: an order that was realized cannot be edited by first
  -- flipping its own status in the same statement.
  IF NOT is_financially_realized_order(OLD.status, OLD.financially_counted) THEN
    RETURN NEW;
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

  IF NOT v_changed THEN
    -- status / carrier / cod_received / addresses stay editable: fulfilment
    -- facts change after delivery, financial facts do not.
    RETURN NEW;
  END IF;

  v_correction := assert_financial_correction_authorized(OLD.id, OLD.id, 'orders');

  IF v_correction IS NULL THEN
    RAISE EXCEPTION
      'order % is financially realized (status=%) and its financial fields '
      '(total, rounded_total, shipping_cost, box_cost, discount_total, '
      'coupon/loyalty amounts, items) are immutable. Use an approved '
      'financial_correction_requests row.',
      OLD.id, COALESCE(OLD.status, 'unknown')
      USING ERRCODE = 'raise_exception';
  END IF;

  INSERT INTO financial_correction_audit
    (correction_id, table_name, row_id, operation, before_row, after_row)
  VALUES (v_correction, 'orders', OLD.id, 'update', to_jsonb(OLD), to_jsonb(NEW));

  RETURN NEW;
END
$guard$;

DROP TRIGGER IF EXISTS order_financial_history_immutable ON orders;

CREATE TRIGGER order_financial_history_immutable
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION guard_order_financial_history();

-- ── 7. Verify both guards are installed ────────────────────────────────────
DO $verify$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM pg_trigger
  WHERE NOT tgisinternal
    AND tgname IN ('order_item_financial_history_immutable', 'order_financial_history_immutable');
  IF n <> 2 THEN
    RAISE EXCEPTION 'ABORT: expected 2 immutability triggers, found %', n;
  END IF;
END
$verify$;
