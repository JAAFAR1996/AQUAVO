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
  return_event_id      text REFERENCES order_return_events(id),
  fulfillment_event_id text NOT NULL REFERENCES order_fulfillment_events(id),
  -- The exact consumed line being classified. Carries the uniqueness guarantee.
  fulfillment_line_id  text REFERENCES order_fulfillment_lines(id),

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

-- One classification per consumed fulfillment line, ever. This is what makes
-- repeated return processing a no-op, makes two partial returns of the same
-- order yield a single carton loss, and stops a full return after a partial
-- carton classification from double-counting the same carton unit.
CREATE UNIQUE INDEX IF NOT EXISTS orpl_line_uidx
  ON order_return_packaging_losses(fulfillment_line_id)
  WHERE fulfillment_line_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS orpl_order_idx ON order_return_packaging_losses(order_id);
CREATE INDEX IF NOT EXISTS orpl_event_idx ON order_return_packaging_losses(fulfillment_event_id);

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
