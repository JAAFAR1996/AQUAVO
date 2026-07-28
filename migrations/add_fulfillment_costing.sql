-- Per-order fulfillment-cost system (additive, idempotent). Integrates with the
-- canonical accounting engine. Apply surgically (NOT db:push). Not yet applied to prod.
--
-- STRUCTURE (corrected):
--   * Catalog = identity + CURRENT approved standard-cost reference only.
--   * Purchase batches (packaging_purchases) own supplier/qty/total/unit-cost/invoice.
--   * Stock is derived from an IMMUTABLE movement ledger (no free-updated counters).
--   * Fulfillment EVENTS: many per order (original, N reshipments, N returns, …),
--     de-duplicated by a unique idempotency key (NOT by order+type).
--   * Every money column NULLABLE: NULL = unknown (never 0). Snapshots immutable.
--   * cost_component_type keeps product COGS and AQUAVO fulfillment strictly apart.

-- 1) Catalog: identity + current standard-cost reference ----------------------
CREATE TABLE IF NOT EXISTS fulfillment_materials (
  id                    text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name                  text NOT NULL,
  category              text,                  -- box|sticker|insert|tape|filler|label|bag|protection|sealing|thermal|other
  cost_component_type   text NOT NULL DEFAULT 'aquavo_fulfillment_material',
  unit                  text,                  -- piece|meter|sheet|gram|order (unit OF USE)
  current_unit_cost     numeric,               -- current approved standard cost; NULL = unknown
  current_cost_purchase_id text,               -- FK set after packaging_purchases exists (see below)
  currency              text NOT NULL DEFAULT 'IQD',
  cost_confidence       text,                  -- high|medium|low (NULL when unknown)
  tax_classification    text,
  accounting_code       text,                  -- stable accounting code
  active                boolean NOT NULL DEFAULT true,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- 2) Purchase batches own the purchasing truth (no duplicate totals in catalog) -
CREATE TABLE IF NOT EXISTS packaging_purchases (
  id                   text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  material_id          text NOT NULL REFERENCES fulfillment_materials(id),
  quantity             numeric NOT NULL,       -- units OF USE bought (e.g. cartons a roll seals)
  total_cost           numeric,               -- NULL = unknown
  unit_cost            numeric,               -- derived total/quantity; NULL = unknown
  currency             text NOT NULL DEFAULT 'IQD',
  supplier             text,
  purchase_invoice_url text,
  purchase_date        timestamptz,
  reorder_threshold    numeric,
  approved             boolean NOT NULL DEFAULT false, -- becomes the catalog's standard-cost ref when approved
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS packaging_purchases_material_idx ON packaging_purchases(material_id);

-- 3) Packaging profiles (versioned) -------------------------------------------
CREATE TABLE IF NOT EXISTS packaging_profiles (
  id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name            text NOT NULL,
  applies_to      jsonb,                       -- category/dimensions/weight/fragility rules
  expected_cost   numeric,                     -- NULL until derivable
  effective_date  timestamptz,
  version         integer NOT NULL DEFAULT 1,
  active          boolean NOT NULL DEFAULT true,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS packaging_profile_items (
  id           text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  profile_id   text NOT NULL REFERENCES packaging_profiles(id) ON DELETE CASCADE,
  material_id  text NOT NULL REFERENCES fulfillment_materials(id),
  quantity     numeric NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS packaging_profile_items_profile_idx ON packaging_profile_items(profile_id);

-- 4) Fulfillment EVENTS (many per order) + workflow state ---------------------
CREATE TABLE IF NOT EXISTS order_fulfillment_events (
  id                text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id          text NOT NULL REFERENCES orders(id),
  event_type        text NOT NULL DEFAULT 'original',  -- original|reshipment|return_handling|replacement|adjustment
  sequence_number   integer NOT NULL DEFAULT 1,        -- ordering of events within an order
  parent_event_id   text REFERENCES order_fulfillment_events(id),  -- e.g. reshipment → original
  reversal_of_event_id text REFERENCES order_fulfillment_events(id), -- reversal negates this event
  idempotency_key   text NOT NULL,                     -- prevents duplicate PROCESSING of a request
  workflow_state    text NOT NULL DEFAULT 'confirmed', -- not_started|suggested|awaiting_confirmation|confirmed|adjusted|reversed
  cost_status       text NOT NULL DEFAULT 'incomplete',-- exact|estimated|incomplete|unknown  (financial certainty)
  profile_id        text REFERENCES packaging_profiles(id),
  profile_version   integer,
  expected_cost     numeric,
  actual_cost       numeric,                            -- sum of known line totals; NULL if incomplete
  variance          numeric,
  variance_reason   text,
  confidence        text,
  recorded_by       text,
  recorded_at       timestamptz NOT NULL DEFAULT now(),
  adjustment_reason text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
-- de-dup by request identity ONLY; multiple events per (order,type) are allowed.
CREATE UNIQUE INDEX IF NOT EXISTS ofe_idempotency_uidx ON order_fulfillment_events(idempotency_key);
CREATE INDEX IF NOT EXISTS ofe_order_idx ON order_fulfillment_events(order_id);

-- 5) Immutable per-event fulfillment lines ------------------------------------
CREATE TABLE IF NOT EXISTS order_fulfillment_lines (
  id                    text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id              text NOT NULL REFERENCES order_fulfillment_events(id) ON DELETE CASCADE,
  order_id              text NOT NULL REFERENCES orders(id),
  material_id           text REFERENCES fulfillment_materials(id), -- nullable: exceptional manual line
  material_name_snapshot text NOT NULL,
  cost_component_type   text NOT NULL DEFAULT 'aquavo_fulfillment_material',
  quantity              numeric NOT NULL,
  unit_cost_snapshot    numeric,               -- NULL = unknown at confirm time (never 0)
  total_cost            numeric,               -- NULL when unit cost unknown
  source                text,                  -- catalog|profile|manual|none
  cost_status           text NOT NULL DEFAULT 'unknown',
  confidence            text,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ofl_event_idx ON order_fulfillment_lines(event_id);
CREATE INDEX IF NOT EXISTS ofl_order_idx ON order_fulfillment_lines(order_id);

-- 6) Immutable packaging-inventory movement ledger (source of truth for stock) -
CREATE TABLE IF NOT EXISTS packaging_inventory_movements (
  id                   text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  material_id          text NOT NULL REFERENCES fulfillment_materials(id),
  purchase_id          text REFERENCES packaging_purchases(id),
  movement_type        text NOT NULL,          -- purchase_receipt|fulfillment_usage|damage_waste|return_to_stock|correction|reversal
  quantity             numeric NOT NULL,       -- signed: +receipt/return, −usage/waste
  order_id             text REFERENCES orders(id),
  event_id             text REFERENCES order_fulfillment_events(id),
  idempotency_key      text NOT NULL,          -- prevents double stock deduction on retry
  source_document      text,
  reversal_of_movement_id text REFERENCES packaging_inventory_movements(id),
  recorded_by          text,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS pim_idempotency_uidx ON packaging_inventory_movements(idempotency_key);
CREATE INDEX IF NOT EXISTS pim_material_idx ON packaging_inventory_movements(material_id);

-- 7) Auditable adjustments / reversals (never silent edits) -------------------
CREATE TABLE IF NOT EXISTS fulfillment_adjustments (
  id           text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id     text NOT NULL REFERENCES orders(id),
  event_id     text REFERENCES order_fulfillment_events(id),
  type         text NOT NULL DEFAULT 'adjustment', -- adjustment|reversal
  amount       numeric,
  reason       text NOT NULL,
  recorded_by  text,
  recorded_at  timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fulfillment_adjustments_order_idx ON fulfillment_adjustments(order_id);

-- Guarded CHECK constraints (idempotent; NOT VALID = new rows only) ------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fmat_cost_nonneg') THEN
    ALTER TABLE fulfillment_materials ADD CONSTRAINT fmat_cost_nonneg
      CHECK (current_unit_cost IS NULL OR current_unit_cost >= 0) NOT VALID; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fmat_component_chk') THEN
    ALTER TABLE fulfillment_materials ADD CONSTRAINT fmat_component_chk
      CHECK (cost_component_type IN ('aquavo_fulfillment_material')) NOT VALID; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ofe_state_chk') THEN
    ALTER TABLE order_fulfillment_events ADD CONSTRAINT ofe_state_chk
      CHECK (workflow_state IN ('not_started','suggested','awaiting_confirmation','confirmed','adjusted','reversed')) NOT VALID; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ofe_cost_status_chk') THEN
    ALTER TABLE order_fulfillment_events ADD CONSTRAINT ofe_cost_status_chk
      CHECK (cost_status IN ('exact','estimated','incomplete','unknown')) NOT VALID; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ofe_event_chk') THEN
    ALTER TABLE order_fulfillment_events ADD CONSTRAINT ofe_event_chk
      CHECK (event_type IN ('original','reshipment','return_handling','replacement','adjustment')) NOT VALID; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ofl_status_chk') THEN
    ALTER TABLE order_fulfillment_lines ADD CONSTRAINT ofl_status_chk
      CHECK (cost_status IN ('exact','estimated','incomplete','unknown')) NOT VALID; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ofl_component_chk') THEN
    ALTER TABLE order_fulfillment_lines ADD CONSTRAINT ofl_component_chk
      CHECK (cost_component_type IN ('aquavo_fulfillment_material')) NOT VALID; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ofl_cost_nonneg') THEN
    ALTER TABLE order_fulfillment_lines ADD CONSTRAINT ofl_cost_nonneg
      CHECK ((unit_cost_snapshot IS NULL OR unit_cost_snapshot >= 0)
         AND (total_cost IS NULL OR total_cost >= 0)) NOT VALID; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='pim_type_chk') THEN
    ALTER TABLE packaging_inventory_movements ADD CONSTRAINT pim_type_chk
      CHECK (movement_type IN ('purchase_receipt','fulfillment_usage','damage_waste','return_to_stock','correction','reversal')) NOT VALID; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fadj_type_chk') THEN
    ALTER TABLE fulfillment_adjustments ADD CONSTRAINT fadj_type_chk
      CHECK (type IN ('adjustment','reversal')) NOT VALID; END IF;
END $$;

-- deferred FK: catalog.current_cost_purchase_id → packaging_purchases(id)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fmat_current_purchase_fk') THEN
    ALTER TABLE fulfillment_materials ADD CONSTRAINT fmat_current_purchase_fk
      FOREIGN KEY (current_cost_purchase_id) REFERENCES packaging_purchases(id) NOT VALID; END IF;
END $$;

-- ── Domain integrity ─────────────────────────────────────────────────────────
-- (2) At most ONE active (non-reversed) 'original' event per order.
CREATE UNIQUE INDEX IF NOT EXISTS ofe_one_active_original_uidx
  ON order_fulfillment_events(order_id)
  WHERE event_type = 'original' AND workflow_state <> 'reversed';

-- (3) Deterministic event chronology: unique sequence per order.
CREATE UNIQUE INDEX IF NOT EXISTS ofe_order_sequence_uidx
  ON order_fulfillment_events(order_id, sequence_number);

-- (8) Movement direction guard (receipts/returns positive; usage/waste negative).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='pim_direction_chk') THEN
    ALTER TABLE packaging_inventory_movements ADD CONSTRAINT pim_direction_chk CHECK (
      (movement_type IN ('purchase_receipt','return_to_stock') AND quantity > 0) OR
      (movement_type IN ('fulfillment_usage','damage_waste')   AND quantity < 0) OR
      (movement_type IN ('correction','reversal'))
    ) NOT VALID; END IF;
END $$;

-- (4) Immutability: confirmed events/lines/movements cannot be silently edited.
CREATE OR REPLACE FUNCTION fulfillment_block_mutation() RETURNS trigger AS $BODY$
BEGIN
  RAISE EXCEPTION 'immutable fulfillment record: use an adjustment/reversal event instead';
END; $BODY$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ofe_guard_confirmed() RETURNS trigger AS $BODY$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.workflow_state IN ('confirmed','adjusted','reversed') THEN
      RAISE EXCEPTION 'cannot delete a settled fulfillment event';
    END IF;
    RETURN OLD;
  END IF;
  -- UPDATE: once settled, financial snapshot is frozen; only workflow_state may move.
  IF OLD.workflow_state IN ('confirmed','adjusted','reversed') THEN
    IF NEW.expected_cost IS DISTINCT FROM OLD.expected_cost
       OR NEW.actual_cost IS DISTINCT FROM OLD.actual_cost
       OR NEW.variance    IS DISTINCT FROM OLD.variance
       OR NEW.cost_status IS DISTINCT FROM OLD.cost_status
       OR NEW.profile_id  IS DISTINCT FROM OLD.profile_id
       OR NEW.profile_version IS DISTINCT FROM OLD.profile_version THEN
      RAISE EXCEPTION 'confirmed fulfillment event financial snapshot is immutable';
    END IF;
  END IF;
  RETURN NEW;
END; $BODY$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ofl_immutable ON order_fulfillment_lines;
CREATE TRIGGER ofl_immutable BEFORE UPDATE OR DELETE ON order_fulfillment_lines
  FOR EACH ROW EXECUTE FUNCTION fulfillment_block_mutation();

DROP TRIGGER IF EXISTS pim_immutable ON packaging_inventory_movements;
CREATE TRIGGER pim_immutable BEFORE UPDATE OR DELETE ON packaging_inventory_movements
  FOR EACH ROW EXECUTE FUNCTION fulfillment_block_mutation();

DROP TRIGGER IF EXISTS ofe_guard ON order_fulfillment_events;
CREATE TRIGGER ofe_guard BEFORE UPDATE OR DELETE ON order_fulfillment_events
  FOR EACH ROW EXECUTE FUNCTION ofe_guard_confirmed();
