-- 0045_order_return_packaging_losses
-- Return-loss classification for packaging.
--
-- THE PROBLEM THIS SOLVES. When a shipped order comes back, the carton is
-- destroyed. But it was already consumed at shipment: a fulfillment_usage
-- movement removed it from stock and order_fulfillment_lines froze its cost.
-- Nothing physical happens at return time — the carton does not leave stock a
-- second time, and it never comes back.
--
-- So the return must be recorded as a RECLASSIFICATION, not an expense:
--   * no inventory movement at all. An earlier design wrote a zero-quantity
--     movement, which is both semantically wrong (the ledger records real
--     physical quantity changes) and literally impossible — pim_direction_chk
--     matches no branch for quantity = 0, so the INSERT would fail;
--   * not an order_fulfillment_events row either. That table has no metadata
--     column, and an event with no cost lines makes buildFulfillmentResolver
--     return NULL for the whole order, reporting a fully-known packaging cost
--     as "incomplete";
--   * hence this table, whose rows carry is_reclassification_only = true and are
--     DISPLAYED but never summed into any expense total.
--
-- QUANTITY. One shipment line may carry several cartons and they may come back
-- across separate returns, so a line can be classified more than once. What is
-- capped is the CUMULATIVE quantity: the sum of all classifications against a
-- line can never exceed what that line actually consumed.
--
-- SCOPE. Automatic classification covers CARTONS ONLY (material_kind='carton').
-- The price sticker and the thank-you card come back with the order, are not
-- damaged, and their 50 and 100 IQD stay part of the original fulfillment
-- snapshot — not reversed, not duplicated, not reclassified. Any other material
-- becomes a loss only when an admin explicitly records it, which is what
-- classification_mode = 'admin_recorded' means.
-- ROLLBACK: 0045_order_return_packaging_losses_rollback.sql

BEGIN;

CREATE TABLE IF NOT EXISTS order_return_packaging_losses (
  id                   text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id             text NOT NULL REFERENCES orders(id),
  -- NOT NULL: every classification belongs to a specific return event. That is
  -- what lets one shipment line be classified across several returns while each
  -- return event still reports only its own loss.
  return_event_id      text NOT NULL REFERENCES order_return_events(id),
  fulfillment_event_id text NOT NULL REFERENCES order_fulfillment_events(id),
  fulfillment_line_id  text NOT NULL REFERENCES order_fulfillment_lines(id),

  material_id            text REFERENCES fulfillment_materials(id),
  material_name_snapshot text NOT NULL,
  quantity               numeric NOT NULL,

  -- Copied from the shipment snapshot. Never recomputed: the cost recognised at
  -- shipment is the cost being reclassified, whatever the catalogue says today.
  original_unit_cost_snapshot  numeric,
  original_total_cost_snapshot numeric,
  original_cost_status         text NOT NULL,

  loss_category       text NOT NULL DEFAULT 'damaged_carton',
  classification_mode text NOT NULL DEFAULT 'automatic',

  -- The flag that keeps profit correct. TRUE means: this amount was already
  -- recognised as an expense at shipment; show it, do not add it again.
  is_reclassification_only boolean NOT NULL DEFAULT true,

  reason      text NOT NULL DEFAULT 'كارتونة تالفة بسبب طلب راجع',
  recorded_by text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='orpl_category_chk') THEN
    ALTER TABLE order_return_packaging_losses ADD CONSTRAINT orpl_category_chk
      CHECK (loss_category IN ('damaged_carton','damaged_material','missing_material')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='orpl_mode_chk') THEN
    ALTER TABLE order_return_packaging_losses ADD CONSTRAINT orpl_mode_chk
      CHECK (classification_mode IN ('automatic','admin_recorded')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='orpl_qty_positive_chk') THEN
    ALTER TABLE order_return_packaging_losses ADD CONSTRAINT orpl_qty_positive_chk
      CHECK (quantity > 0) NOT VALID;
  END IF;
  -- Automatic classification is only ever damaged_carton. Anything else is a
  -- deliberate human record and must say so.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='orpl_auto_is_carton_chk') THEN
    ALTER TABLE order_return_packaging_losses ADD CONSTRAINT orpl_auto_is_carton_chk
      CHECK (classification_mode <> 'automatic' OR loss_category = 'damaged_carton') NOT VALID;
  END IF;
  -- An admin-recorded loss must state why.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='orpl_admin_reason_chk') THEN
    ALTER TABLE order_return_packaging_losses ADD CONSTRAINT orpl_admin_reason_chk
      CHECK (classification_mode <> 'admin_recorded'
             OR length(btrim(COALESCE(reason,''))) >= 3) NOT VALID;
  END IF;
END $$;

-- IDEMPOTENCY, not exclusivity.
--
-- A first attempt used UNIQUE(fulfillment_line_id) alone. That is wrong once a
-- shipment line carries more than one carton: two partial returns each bringing
-- back one carton of a two-carton line are two legitimate classifications, and
-- the single-column constraint would reject the second.
--
-- Scoping uniqueness to the RETURN EVENT keeps the property that actually
-- matters — processing the same return event twice inserts nothing the second
-- time — while allowing a line to be classified across several distinct returns.
-- Over-classification is prevented separately, by cumulative quantity.
CREATE UNIQUE INDEX IF NOT EXISTS orpl_event_line_uidx
  ON order_return_packaging_losses(return_event_id, fulfillment_line_id);

CREATE INDEX IF NOT EXISTS orpl_order_idx ON order_return_packaging_losses(order_id);
CREATE INDEX IF NOT EXISTS orpl_event_idx ON order_return_packaging_losses(fulfillment_event_id);
CREATE INDEX IF NOT EXISTS orpl_line_idx ON order_return_packaging_losses(fulfillment_line_id);
CREATE INDEX IF NOT EXISTS orpl_return_event_idx ON order_return_packaging_losses(return_event_id);

-- CUMULATIVE CEILING — no carton unit is ever written off twice.
--
-- A CHECK constraint cannot see other rows, so this is a trigger. It sums every
-- classification already recorded against the same shipment line and refuses an
-- insert that would push the total past the quantity that line actually
-- consumed. Two concurrent returns cannot both slip through: the service takes a
-- transaction-scoped advisory lock on the line before checking, and this trigger
-- is the backstop for anything that reaches the table by another route.
CREATE OR REPLACE FUNCTION orpl_enforce_cumulative_quantity() RETURNS trigger AS $BODY$
DECLARE
  v_consumed  numeric;
  v_already   numeric;
BEGIN
  SELECT quantity INTO v_consumed
    FROM order_fulfillment_lines WHERE id = NEW.fulfillment_line_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'fulfillment line % does not exist', NEW.fulfillment_line_id;
  END IF;

  SELECT COALESCE(SUM(quantity), 0) INTO v_already
    FROM order_return_packaging_losses
   WHERE fulfillment_line_id = NEW.fulfillment_line_id;

  IF v_already + NEW.quantity > v_consumed THEN
    RAISE EXCEPTION
      'classified quantity (% already + % requested) exceeds the % consumed by fulfillment line %',
      v_already, NEW.quantity, v_consumed, NEW.fulfillment_line_id;
  END IF;

  RETURN NEW;
END; $BODY$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orpl_cumulative_guard ON order_return_packaging_losses;
CREATE TRIGGER orpl_cumulative_guard BEFORE INSERT ON order_return_packaging_losses
  FOR EACH ROW EXECUTE FUNCTION orpl_enforce_cumulative_quantity();

-- Append-only: a classification is evidence. Corrections are new rows, never
-- silent edits of an existing one.
CREATE OR REPLACE FUNCTION orpl_block_mutation() RETURNS trigger AS $BODY$
BEGIN
  RAISE EXCEPTION 'return packaging-loss classifications are immutable; record a new classification instead';
END; $BODY$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orpl_immutable ON order_return_packaging_losses;
CREATE TRIGGER orpl_immutable BEFORE UPDATE OR DELETE ON order_return_packaging_losses
  FOR EACH ROW EXECUTE FUNCTION orpl_block_mutation();

INSERT INTO schema_migrations (version, checksum, applied_by, notes)
SELECT '0045_order_return_packaging_losses', 'pending', current_user,
       'carton-only return-loss reclassification; no inventory movement, no second expense'
WHERE NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version='0045_order_return_packaging_losses');

COMMIT;
