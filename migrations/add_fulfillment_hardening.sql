-- Fulfillment hardening (additive, idempotent). Applies AFTER add_fulfillment_costing.sql.
-- Apply surgically (NOT db:push). Not yet applied to prod.
--
-- Covers:
--   (1) genuinely concurrency-safe per-order sequence ALLOCATION (counter row, not MAX+1)
--   (3) reversal integrity (exact negation, one active reversal, no cycles, no self-reversal)
--   (4) mutable preparation DRAFTS kept OUT of the immutable confirmed-lines table
--   (5) profile FAMILY / VERSION separation with lock-on-use
--   (6) auditable material COST-APPROVAL records (history, never overwrite evidence)

-- ═════════════════════════════════════════════════════════════════════════════
-- (1) Per-order sequence allocation
-- ═════════════════════════════════════════════════════════════════════════════
-- A dedicated counter row per order. Allocation is a single atomic statement:
--   INSERT ... ON CONFLICT (order_id) DO UPDATE SET next_sequence = ... + 1 RETURNING
-- which takes a ROW-level lock on exactly one order's counter. Two concurrent
-- requests for the SAME order serialize on that row and receive DIFFERENT numbers
-- (both succeed). Requests for DIFFERENT orders never contend — no global lock.
-- This is real allocation; MAX(sequence)+1 was only collision *detection*.
CREATE TABLE IF NOT EXISTS order_fulfillment_sequences (
  order_id      text PRIMARY KEY REFERENCES orders(id),
  next_sequence integer NOT NULL DEFAULT 1,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Backfill counters for orders that already have events (idempotent).
INSERT INTO order_fulfillment_sequences (order_id, next_sequence)
SELECT order_id, MAX(sequence_number) + 1 FROM order_fulfillment_events GROUP BY order_id
ON CONFLICT (order_id) DO UPDATE
  SET next_sequence = GREATEST(order_fulfillment_sequences.next_sequence, EXCLUDED.next_sequence);

-- ═════════════════════════════════════════════════════════════════════════════
-- (5) Profile FAMILY (identity) vs profile VERSION (packaging_profiles row)
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS packaging_profile_families (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  family_key  text NOT NULL,                 -- stable human key, e.g. 'small-box-standard'
  name        text NOT NULL,
  applies_to  jsonb,                         -- suggestion rules live on the family
  active      boolean NOT NULL DEFAULT true,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ppf_key_uidx ON packaging_profile_families(family_key);

-- packaging_profiles becomes a VERSION of a family.
ALTER TABLE packaging_profiles ADD COLUMN IF NOT EXISTS profile_family_id text REFERENCES packaging_profile_families(id);
ALTER TABLE packaging_profiles ADD COLUMN IF NOT EXISTS previous_version_id text REFERENCES packaging_profiles(id);
ALTER TABLE packaging_profiles ADD COLUMN IF NOT EXISTS superseded_by_id text REFERENCES packaging_profiles(id);
ALTER TABLE packaging_profiles ADD COLUMN IF NOT EXISTS creation_reason text;
ALTER TABLE packaging_profiles ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false; -- true once used by a confirmed event
ALTER TABLE packaging_profiles ADD COLUMN IF NOT EXISTS locked_at timestamptz;
ALTER TABLE packaging_profiles ADD COLUMN IF NOT EXISTS created_by text;

-- Adopt orphan legacy profiles into single-version families so the model is total.
DO $$
DECLARE p RECORD; fid text;
BEGIN
  FOR p IN SELECT id, name FROM packaging_profiles WHERE profile_family_id IS NULL LOOP
    fid := gen_random_uuid()::text;
    INSERT INTO packaging_profile_families (id, family_key, name)
      VALUES (fid, 'legacy-' || p.id, p.name);
    UPDATE packaging_profiles SET profile_family_id = fid WHERE id = p.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS pp_family_version_uidx
  ON packaging_profiles(profile_family_id, version);
CREATE INDEX IF NOT EXISTS pp_family_idx ON packaging_profiles(profile_family_id);

-- A locked (used) profile version is immutable; editing must create a NEW version.
CREATE OR REPLACE FUNCTION pp_guard_locked() RETURNS trigger AS $BODY$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.locked THEN RAISE EXCEPTION 'profile version % is locked by a confirmed event and cannot be deleted', OLD.id; END IF;
    RETURN OLD;
  END IF;
  IF OLD.locked THEN
    -- only lifecycle/link columns may move after lock; never the costing definition
    IF NEW.expected_cost   IS DISTINCT FROM OLD.expected_cost
       OR NEW.version      IS DISTINCT FROM OLD.version
       OR NEW.profile_family_id IS DISTINCT FROM OLD.profile_family_id
       OR NEW.effective_date IS DISTINCT FROM OLD.effective_date THEN
      RAISE EXCEPTION 'profile version % is locked by a confirmed event — create a new version instead', OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END; $BODY$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS pp_locked_guard ON packaging_profiles;
CREATE TRIGGER pp_locked_guard BEFORE UPDATE OR DELETE ON packaging_profiles
  FOR EACH ROW EXECUTE FUNCTION pp_guard_locked();

-- Profile ITEMS of a locked version are immutable too (they define the expected cost).
CREATE OR REPLACE FUNCTION ppi_guard_locked() RETURNS trigger AS $BODY$
DECLARE is_locked boolean;
BEGIN
  SELECT locked INTO is_locked FROM packaging_profiles
   WHERE id = COALESCE(NEW.profile_id, OLD.profile_id);
  IF is_locked THEN
    RAISE EXCEPTION 'profile version is locked by a confirmed event — create a new version instead';
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $BODY$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS ppi_locked_guard ON packaging_profile_items;
CREATE TRIGGER ppi_locked_guard BEFORE INSERT OR UPDATE OR DELETE ON packaging_profile_items
  FOR EACH ROW EXECUTE FUNCTION ppi_guard_locked();

-- Confirmed events record the family too (exact version already exists).
ALTER TABLE order_fulfillment_events ADD COLUMN IF NOT EXISTS profile_family_id text REFERENCES packaging_profile_families(id);

-- ═════════════════════════════════════════════════════════════════════════════
-- (6) Auditable material cost-approval records — the SOURCE OF TRUTH for cost
-- ═════════════════════════════════════════════════════════════════════════════
-- The catalog's current_unit_cost is a denormalized MIRROR of the single active
-- approved record. Cost changes append history; evidence is never overwritten.
CREATE TABLE IF NOT EXISTS material_cost_records (
  id                 text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  material_id        text NOT NULL REFERENCES fulfillment_materials(id),
  cost_basis         text NOT NULL,          -- purchase_batch | verified_manual_standard
  purchase_id        text REFERENCES packaging_purchases(id), -- required when purchase_batch
  unit_cost          numeric,                -- NULL = unknown; 0 allowed ONLY when verified & approved
  currency           text NOT NULL DEFAULT 'IQD',
  approval_status    text NOT NULL DEFAULT 'pending', -- pending | approved | rejected | superseded
  approved_by        text,
  approved_at        timestamptz,
  effective_date     timestamptz NOT NULL DEFAULT now(),
  reason             text NOT NULL,
  evidence_url       text,
  superseded_by_id   text REFERENCES material_cost_records(id),
  superseded_at      timestamptz,
  created_by         text,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mcr_material_idx ON material_cost_records(material_id);
-- At most ONE active approved cost record per material.
CREATE UNIQUE INDEX IF NOT EXISTS mcr_active_approved_uidx
  ON material_cost_records(material_id)
  WHERE approval_status = 'approved' AND superseded_by_id IS NULL;

-- Catalog points at the approved record that is the source of its current cost.
ALTER TABLE fulfillment_materials ADD COLUMN IF NOT EXISTS current_cost_record_id text REFERENCES material_cost_records(id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='mcr_basis_chk') THEN
    ALTER TABLE material_cost_records ADD CONSTRAINT mcr_basis_chk
      CHECK (cost_basis IN ('purchase_batch','verified_manual_standard')) NOT VALID; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='mcr_status_chk') THEN
    ALTER TABLE material_cost_records ADD CONSTRAINT mcr_status_chk
      CHECK (approval_status IN ('pending','approved','rejected','superseded')) NOT VALID; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='mcr_cost_nonneg') THEN
    ALTER TABLE material_cost_records ADD CONSTRAINT mcr_cost_nonneg
      CHECK (unit_cost IS NULL OR unit_cost >= 0) NOT VALID; END IF;
  -- purchase_batch basis must cite the batch; an approved record must name its approver.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='mcr_basis_evidence_chk') THEN
    ALTER TABLE material_cost_records ADD CONSTRAINT mcr_basis_evidence_chk
      CHECK (cost_basis <> 'purchase_batch' OR purchase_id IS NOT NULL) NOT VALID; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='mcr_approved_fields_chk') THEN
    ALTER TABLE material_cost_records ADD CONSTRAINT mcr_approved_fields_chk
      CHECK (approval_status <> 'approved'
             OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)) NOT VALID; END IF;
  -- Verified ZERO cost is legitimate but must be JUSTIFIED, and it only becomes
  -- effective through approval (the catalog may mirror an APPROVED record only —
  -- see fmat_guard_cost_consistency). A zero with no stated reason is never valid.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='mcr_zero_cost_chk') THEN
    ALTER TABLE material_cost_records ADD CONSTRAINT mcr_zero_cost_chk
      CHECK (unit_cost IS NULL OR unit_cost > 0
             OR length(btrim(coalesce(reason,''))) > 0) NOT VALID; END IF;
END $$;

-- An approved cost record is evidence: its financial content can never be edited.
CREATE OR REPLACE FUNCTION mcr_guard_approved() RETURNS trigger AS $BODY$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.approval_status IN ('approved','superseded') THEN
      RAISE EXCEPTION 'approved cost records are evidence and cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.approval_status IN ('approved','superseded') THEN
    IF NEW.unit_cost   IS DISTINCT FROM OLD.unit_cost
       OR NEW.cost_basis  IS DISTINCT FROM OLD.cost_basis
       OR NEW.material_id IS DISTINCT FROM OLD.material_id
       OR NEW.purchase_id IS DISTINCT FROM OLD.purchase_id
       OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
       OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
       OR NEW.effective_date IS DISTINCT FROM OLD.effective_date THEN
      RAISE EXCEPTION 'approved cost record is immutable — supersede it with a new record';
    END IF;
    -- only the supersession link and status may move forward
    IF NEW.approval_status NOT IN ('approved','superseded') THEN
      RAISE EXCEPTION 'an approved cost record can only move to superseded';
    END IF;
  END IF;
  RETURN NEW;
END; $BODY$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS mcr_approved_guard ON material_cost_records;
CREATE TRIGGER mcr_approved_guard BEFORE UPDATE OR DELETE ON material_cost_records
  FOR EACH ROW EXECUTE FUNCTION mcr_guard_approved();

-- Catalog cost and its cited record can never contradict each other.
CREATE OR REPLACE FUNCTION fmat_guard_cost_consistency() RETURNS trigger AS $BODY$
DECLARE rec RECORD;
BEGIN
  IF NEW.current_cost_record_id IS NULL THEN
    -- No approved record cited ⇒ the catalog must not claim a cost, and must not
    -- cite a purchase either (that was the old contradictory pair).
    IF NEW.current_unit_cost IS NOT NULL THEN
      RAISE EXCEPTION 'fulfillment_materials.current_unit_cost requires an approved cost record';
    END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO rec FROM material_cost_records WHERE id = NEW.current_cost_record_id;
  IF rec IS NULL THEN RAISE EXCEPTION 'cited cost record % does not exist', NEW.current_cost_record_id; END IF;
  IF rec.material_id IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'cited cost record belongs to a different material';
  END IF;
  IF rec.approval_status <> 'approved' THEN
    RAISE EXCEPTION 'cited cost record is not approved';
  END IF;
  IF NEW.current_unit_cost IS DISTINCT FROM rec.unit_cost THEN
    RAISE EXCEPTION 'current_unit_cost contradicts the approved cost record';
  END IF;
  IF NEW.current_cost_purchase_id IS DISTINCT FROM rec.purchase_id THEN
    RAISE EXCEPTION 'current_cost_purchase_id contradicts the approved cost record';
  END IF;
  RETURN NEW;
END; $BODY$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS fmat_cost_consistency ON fulfillment_materials;
CREATE TRIGGER fmat_cost_consistency BEFORE INSERT OR UPDATE ON fulfillment_materials
  FOR EACH ROW EXECUTE FUNCTION fmat_guard_cost_consistency();

-- ═════════════════════════════════════════════════════════════════════════════
-- (4) Mutable preparation DRAFTS — never accounting events
-- ═════════════════════════════════════════════════════════════════════════════
-- A draft is editable and has NO effect on profit, fulfillment totals, packaging
-- stock or reports. Confirmation converts it into ONE immutable event in a single
-- transaction and marks the draft consumed.
CREATE TABLE IF NOT EXISTS fulfillment_preparation_drafts (
  id                 text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id           text NOT NULL REFERENCES orders(id),
  event_type         text NOT NULL DEFAULT 'original',
  state              text NOT NULL DEFAULT 'suggested', -- suggested|editing|awaiting_confirmation|consumed|discarded
  profile_family_id  text REFERENCES packaging_profile_families(id),
  profile_id         text REFERENCES packaging_profiles(id),
  profile_version    integer,
  suggestion_reason  text,
  expected_cost      numeric,                 -- server-calculated; NULL = not derivable
  cost_status        text NOT NULL DEFAULT 'unknown',
  confirmed_event_id text REFERENCES order_fulfillment_events(id), -- set on conversion
  consumed_at        timestamptz,
  created_by         text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fpd_order_idx ON fulfillment_preparation_drafts(order_id);
-- At most one OPEN draft per (order, event_type) — keeps the owner's screen unambiguous.
CREATE UNIQUE INDEX IF NOT EXISTS fpd_open_uidx
  ON fulfillment_preparation_drafts(order_id, event_type)
  WHERE state IN ('suggested','editing','awaiting_confirmation');

CREATE TABLE IF NOT EXISTS fulfillment_preparation_draft_lines (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  draft_id      text NOT NULL REFERENCES fulfillment_preparation_drafts(id) ON DELETE CASCADE,
  material_id   text REFERENCES fulfillment_materials(id),  -- NULL = named manual line
  material_name text NOT NULL,
  category      text,                          -- box|sticker|card|tape|wrap|extra|other
  description   text,
  quantity      numeric NOT NULL,
  unit          text,
  unit_cost     numeric,                       -- NULL = unknown (never 0)
  cost_status   text NOT NULL DEFAULT 'unknown',
  source        text NOT NULL DEFAULT 'manual',-- catalog|profile|manual
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fpdl_draft_idx ON fulfillment_preparation_draft_lines(draft_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fpd_state_chk') THEN
    ALTER TABLE fulfillment_preparation_drafts ADD CONSTRAINT fpd_state_chk
      CHECK (state IN ('suggested','editing','awaiting_confirmation','consumed','discarded')) NOT VALID; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fpd_consumed_chk') THEN
    ALTER TABLE fulfillment_preparation_drafts ADD CONSTRAINT fpd_consumed_chk
      CHECK (state <> 'consumed' OR confirmed_event_id IS NOT NULL) NOT VALID; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fpdl_qty_chk') THEN
    ALTER TABLE fulfillment_preparation_draft_lines ADD CONSTRAINT fpdl_qty_chk
      CHECK (quantity > 0) NOT VALID; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fpdl_cost_chk') THEN
    ALTER TABLE fulfillment_preparation_draft_lines ADD CONSTRAINT fpdl_cost_chk
      CHECK (unit_cost IS NULL OR unit_cost >= 0) NOT VALID; END IF;
END $$;

-- A consumed draft is frozen: its lines are the evidence behind an immutable event.
CREATE OR REPLACE FUNCTION fpd_guard_consumed() RETURNS trigger AS $BODY$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.state = 'consumed' THEN RAISE EXCEPTION 'a consumed draft cannot be deleted'; END IF;
    RETURN OLD;
  END IF;
  IF OLD.state = 'consumed' AND NEW.state <> 'consumed' THEN
    RAISE EXCEPTION 'a consumed draft cannot be reopened — create a new draft';
  END IF;
  IF OLD.state = 'consumed' THEN
    IF NEW.expected_cost IS DISTINCT FROM OLD.expected_cost
       OR NEW.confirmed_event_id IS DISTINCT FROM OLD.confirmed_event_id
       OR NEW.profile_id IS DISTINCT FROM OLD.profile_id THEN
      RAISE EXCEPTION 'a consumed draft is frozen';
    END IF;
  END IF;
  RETURN NEW;
END; $BODY$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS fpd_consumed_guard ON fulfillment_preparation_drafts;
CREATE TRIGGER fpd_consumed_guard BEFORE UPDATE OR DELETE ON fulfillment_preparation_drafts
  FOR EACH ROW EXECUTE FUNCTION fpd_guard_consumed();

CREATE OR REPLACE FUNCTION fpdl_guard_consumed() RETURNS trigger AS $BODY$
DECLARE st text;
BEGIN
  SELECT state INTO st FROM fulfillment_preparation_drafts
   WHERE id = COALESCE(NEW.draft_id, OLD.draft_id);
  IF st = 'consumed' THEN
    RAISE EXCEPTION 'draft lines are frozen after confirmation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $BODY$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS fpdl_consumed_guard ON fulfillment_preparation_draft_lines;
CREATE TRIGGER fpdl_consumed_guard BEFORE INSERT OR UPDATE OR DELETE ON fulfillment_preparation_draft_lines
  FOR EACH ROW EXECUTE FUNCTION fpdl_guard_consumed();

-- Confirmed events remember which draft produced them (idempotent re-confirmation).
ALTER TABLE order_fulfillment_events ADD COLUMN IF NOT EXISTS draft_id text REFERENCES fulfillment_preparation_drafts(id);
CREATE UNIQUE INDEX IF NOT EXISTS ofe_draft_uidx ON order_fulfillment_events(draft_id) WHERE draft_id IS NOT NULL;

-- Manual quick-entry descriptors on the immutable line (item 8).
ALTER TABLE order_fulfillment_lines ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE order_fulfillment_lines ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE order_fulfillment_lines ADD COLUMN IF NOT EXISTS unit text;
ALTER TABLE order_fulfillment_lines ADD COLUMN IF NOT EXISTS note text;

-- ═════════════════════════════════════════════════════════════════════════════
-- (3) Reversal integrity
-- ═════════════════════════════════════════════════════════════════════════════
-- One ACTIVE reversal per target event. A reversal that has itself been reversed
-- (workflow_state='reversed') frees the slot, so an explicit new event can re-reverse.
CREATE UNIQUE INDEX IF NOT EXISTS ofe_one_active_reversal_uidx
  ON order_fulfillment_events(reversal_of_event_id)
  WHERE reversal_of_event_id IS NOT NULL AND workflow_state <> 'reversed';

-- One reversal per movement, ever (movements are immutable and never re-reversed).
CREATE UNIQUE INDEX IF NOT EXISTS pim_one_reversal_uidx
  ON packaging_inventory_movements(reversal_of_movement_id)
  WHERE reversal_of_movement_id IS NOT NULL;

DO $$
BEGIN
  -- An event can never reverse itself.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ofe_no_self_reversal_chk') THEN
    ALTER TABLE order_fulfillment_events ADD CONSTRAINT ofe_no_self_reversal_chk
      CHECK (reversal_of_event_id IS NULL OR reversal_of_event_id <> id) NOT VALID; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ofe_no_self_parent_chk') THEN
    ALTER TABLE order_fulfillment_events ADD CONSTRAINT ofe_no_self_parent_chk
      CHECK (parent_event_id IS NULL OR parent_event_id <> id) NOT VALID; END IF;
  -- A movement can never reverse itself.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='pim_no_self_reversal_chk') THEN
    ALTER TABLE packaging_inventory_movements ADD CONSTRAINT pim_no_self_reversal_chk
      CHECK (reversal_of_movement_id IS NULL OR reversal_of_movement_id <> id) NOT VALID; END IF;
  -- A 'reversal' movement MUST cite the movement it negates; a non-reversal must not.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='pim_reversal_ref_chk') THEN
    ALTER TABLE packaging_inventory_movements ADD CONSTRAINT pim_reversal_ref_chk
      CHECK ((movement_type = 'reversal') = (reversal_of_movement_id IS NOT NULL)) NOT VALID; END IF;
  -- A 'reversal' movement is never zero (an arbitrary signed value is rejected by the
  -- exact-negation trigger below; this rules out the degenerate no-op case up front).
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='pim_reversal_nonzero_chk') THEN
    ALTER TABLE packaging_inventory_movements ADD CONSTRAINT pim_reversal_nonzero_chk
      CHECK (movement_type <> 'reversal' OR quantity <> 0) NOT VALID; END IF;
END $$;

-- Exact negation + no cross-linking of unrelated orders/materials/events.
CREATE OR REPLACE FUNCTION pim_guard_reversal() RETURNS trigger AS $BODY$
DECLARE orig RECORD;
BEGIN
  IF NEW.reversal_of_movement_id IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO orig FROM packaging_inventory_movements WHERE id = NEW.reversal_of_movement_id;
  IF orig IS NULL THEN RAISE EXCEPTION 'reversed movement % does not exist', NEW.reversal_of_movement_id; END IF;

  -- A reversal may not reverse a reversal (that would be a chain/cycle risk); reversing
  -- a reversal is done by an explicit NEW correction event, not by re-linking.
  IF orig.movement_type = 'reversal' THEN
    RAISE EXCEPTION 'cannot reverse a reversal movement — post an explicit correction instead';
  END IF;

  -- EXACT opposite quantity. Not "some signed quantity".
  IF NEW.quantity IS DISTINCT FROM (-orig.quantity) THEN
    RAISE EXCEPTION 'reversal quantity % must be the exact negative of the referenced movement (%)',
      NEW.quantity, orig.quantity;
  END IF;

  -- Same material, and the same order (or both order-less). Unrelated rows cannot link.
  IF NEW.material_id IS DISTINCT FROM orig.material_id THEN
    RAISE EXCEPTION 'reversal must target the same material as the referenced movement';
  END IF;
  IF NEW.order_id IS DISTINCT FROM orig.order_id THEN
    RAISE EXCEPTION 'reversal must belong to the same order as the referenced movement';
  END IF;
  RETURN NEW;
END; $BODY$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS pim_reversal_guard ON packaging_inventory_movements;
CREATE TRIGGER pim_reversal_guard BEFORE INSERT ON packaging_inventory_movements
  FOR EACH ROW EXECUTE FUNCTION pim_guard_reversal();

-- Event-level reversal guard: same order, no cycles, target must be settled.
CREATE OR REPLACE FUNCTION ofe_guard_reversal() RETURNS trigger AS $BODY$
DECLARE orig RECORD; cyclic boolean;
BEGIN
  IF NEW.reversal_of_event_id IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO orig FROM order_fulfillment_events WHERE id = NEW.reversal_of_event_id;
  IF orig IS NULL THEN RAISE EXCEPTION 'reversed event % does not exist', NEW.reversal_of_event_id; END IF;
  IF orig.order_id IS DISTINCT FROM NEW.order_id THEN
    RAISE EXCEPTION 'a reversal must belong to the same order as the event it reverses';
  END IF;
  IF orig.workflow_state NOT IN ('confirmed','adjusted') THEN
    RAISE EXCEPTION 'only a settled event can be reversed (state=%)', orig.workflow_state;
  END IF;

  -- Cycle check: walk the reversal chain upward from the target; if we reach NEW.id
  -- the link would close a cycle. Depth-bounded by the recursive CTE's own visited set.
  WITH RECURSIVE chain(id, depth) AS (
    SELECT e.reversal_of_event_id, 1
      FROM order_fulfillment_events e WHERE e.id = NEW.reversal_of_event_id
    UNION ALL
    SELECT e.reversal_of_event_id, c.depth + 1
      FROM chain c JOIN order_fulfillment_events e ON e.id = c.id
     WHERE c.id IS NOT NULL AND c.depth < 64
  )
  SELECT EXISTS (SELECT 1 FROM chain WHERE id = NEW.id) INTO cyclic;
  IF cyclic THEN RAISE EXCEPTION 'reversal reference would form a cycle'; END IF;

  RETURN NEW;
END; $BODY$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS ofe_reversal_guard ON order_fulfillment_events;
CREATE TRIGGER ofe_reversal_guard BEFORE INSERT OR UPDATE ON order_fulfillment_events
  FOR EACH ROW EXECUTE FUNCTION ofe_guard_reversal();
