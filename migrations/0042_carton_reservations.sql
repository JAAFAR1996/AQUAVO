-- 0042_carton_reservations
-- Carton reservations, held apart from the physical movement ledger.
--
-- WHY NOT A MOVEMENT: packaging_inventory_movements is immutable by trigger and
-- records real physical quantity changes. A reservation is neither — it is a
-- mutable claim that later becomes a consumption or is released. Writing it as a
-- negative movement would make on-hand lie about what is physically in the room,
-- and releasing it would require editing an immutable ledger.
--
-- So:
--   on_hand   = SUM(packaging_inventory_movements.quantity)
--   reserved  = SUM(carton_reservations.quantity) WHERE state = 'active'
--   available = on_hand - reserved
--
-- Available stock is derived, never stored. There is no counter to drift.
-- ROLLBACK: 0042_carton_reservations_rollback.sql

BEGIN;

CREATE TABLE IF NOT EXISTS carton_reservations (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id      text NOT NULL REFERENCES orders(id),
  material_id   text NOT NULL REFERENCES fulfillment_materials(id),
  quantity      numeric NOT NULL,
  state         text NOT NULL DEFAULT 'active',
  plan_id       text,
  -- Stable per user action, so a retried reserve request cannot double-book.
  idempotency_key   text NOT NULL,
  consumed_event_id text REFERENCES order_fulfillment_events(id),
  released_reason   text,
  reserved_by       text,
  reserved_at       timestamptz NOT NULL DEFAULT now(),
  state_changed_at  timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='cres_state_chk') THEN
    ALTER TABLE carton_reservations ADD CONSTRAINT cres_state_chk
      CHECK (state IN ('active','released','consumed')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='cres_qty_positive_chk') THEN
    ALTER TABLE carton_reservations ADD CONSTRAINT cres_qty_positive_chk
      CHECK (quantity > 0) NOT VALID;
  END IF;
  -- A consumed reservation must name the fulfillment event that consumed it;
  -- an active one must not pretend it already has.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='cres_consumed_ref_chk') THEN
    ALTER TABLE carton_reservations ADD CONSTRAINT cres_consumed_ref_chk
      CHECK ((state = 'consumed') = (consumed_event_id IS NOT NULL)) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='cres_released_reason_chk') THEN
    ALTER TABLE carton_reservations ADD CONSTRAINT cres_released_reason_chk
      CHECK (state <> 'released' OR length(btrim(COALESCE(released_reason,''))) > 0) NOT VALID;
  END IF;
END $$;

-- Retry protection: the same reserve request maps to the same row.
CREATE UNIQUE INDEX IF NOT EXISTS cres_idempotency_uidx
  ON carton_reservations(idempotency_key);

-- One active reservation per order+material. A carton change releases the old
-- one and reserves the new one inside a single transaction, so this never
-- blocks a legitimate edit — it blocks double-booking.
CREATE UNIQUE INDEX IF NOT EXISTS cres_one_active_uidx
  ON carton_reservations(order_id, material_id) WHERE state = 'active';

-- Drives the availability query.
CREATE INDEX IF NOT EXISTS cres_active_material_idx
  ON carton_reservations(material_id) WHERE state = 'active';

CREATE INDEX IF NOT EXISTS cres_order_idx ON carton_reservations(order_id);

INSERT INTO schema_migrations (version, checksum, applied_by, notes)
SELECT '0042_carton_reservations', 'pending', current_user,
       'reservation state machine; available = on_hand - active reservations, derived not stored'
WHERE NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version='0042_carton_reservations');

COMMIT;
