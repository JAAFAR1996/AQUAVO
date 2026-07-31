-- 0043_order_packing_plans
-- The validated packing plan for an order, with every placement coordinate.
--
-- Stored so the plan can be audited long after it was produced: which carton,
-- which product, at which coordinates, in which orientation, with what support
-- ratio and what load. Reconstructing that later from the planner would depend
-- on the catalogue not having changed, which is exactly the assumption an audit
-- must not make.
--
-- Geometry is stored as INTEGER MILLIMETRES and weights as INTEGER GRAMS —
-- identical to the units the planner computes in, so a stored plan and a
-- recomputed plan are comparable byte for byte with no rounding step between.
--
-- `manual_pack_required` is a first-class state. It means the owner is packing
-- outside the automated model; it is deliberately NOT a validated safe plan and
-- carries no reservation.
-- ROLLBACK: 0043_order_packing_plans_rollback.sql

BEGIN;

CREATE TABLE IF NOT EXISTS order_packing_plans (
  id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id        text NOT NULL REFERENCES orders(id),
  state           text NOT NULL DEFAULT 'proposed',
  plan_hash       text,
  engine_version  text,
  carton_count    integer NOT NULL DEFAULT 0,
  -- NULL when ANY chosen carton has no recorded cost. Never coerced to 0.
  total_known_cost numeric,
  cost_status     text NOT NULL DEFAULT 'incomplete',
  -- Full validation report: every check and its verdict, kept for audit.
  validation_report jsonb,
  explanation_ar  text,
  manual_reason   text,
  superseded_by_id text REFERENCES order_packing_plans(id),
  created_by      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_packing_plan_items (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  plan_id       text NOT NULL REFERENCES order_packing_plans(id) ON DELETE CASCADE,
  carton_index  integer NOT NULL,
  material_id   text REFERENCES fulfillment_materials(id),
  product_id    text NOT NULL,
  variant_id    text,
  unit_seq      integer NOT NULL DEFAULT 1,
  product_name_snapshot text NOT NULL,

  pos_x_mm  integer NOT NULL,
  pos_y_mm  integer NOT NULL,   -- height above the carton floor
  pos_z_mm  integer NOT NULL,
  dim_x_mm  integer NOT NULL,
  dim_y_mm  integer NOT NULL,   -- vertical extent occupied
  dim_z_mm  integer NOT NULL,
  rotation_type integer NOT NULL,
  weight_g  integer NOT NULL,

  -- Validation outcome, frozen with the plan.
  support_ratio_bp integer,     -- 0..10000
  load_on_g        integer,
  created_at       timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='opp_state_chk') THEN
    ALTER TABLE order_packing_plans ADD CONSTRAINT opp_state_chk CHECK (
      state IN ('proposed','validated','reserved','consumed','superseded',
                'manual_pack_required','rejected')
    ) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='opp_cost_status_chk') THEN
    ALTER TABLE order_packing_plans ADD CONSTRAINT opp_cost_status_chk
      CHECK (cost_status IN ('exact','incomplete')) NOT VALID;
  END IF;
  -- Leaving the automated model always requires a stated reason.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='opp_manual_reason_chk') THEN
    ALTER TABLE order_packing_plans ADD CONSTRAINT opp_manual_reason_chk
      CHECK (state <> 'manual_pack_required'
             OR length(btrim(COALESCE(manual_reason,''))) >= 3) NOT VALID;
  END IF;
  -- A plan that reached a stock- or money-bearing state must have been
  -- validated: it carries a hash and a full report.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='opp_validated_evidence_chk') THEN
    ALTER TABLE order_packing_plans ADD CONSTRAINT opp_validated_evidence_chk CHECK (
      state NOT IN ('validated','reserved','consumed')
      OR (plan_hash IS NOT NULL AND validation_report IS NOT NULL)
    ) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='oppi_geometry_chk') THEN
    ALTER TABLE order_packing_plan_items ADD CONSTRAINT oppi_geometry_chk CHECK (
      pos_x_mm >= 0 AND pos_y_mm >= 0 AND pos_z_mm >= 0 AND
      dim_x_mm > 0  AND dim_y_mm > 0  AND dim_z_mm > 0  AND
      weight_g >= 0 AND rotation_type BETWEEN 0 AND 5 AND
      (support_ratio_bp IS NULL OR (support_ratio_bp BETWEEN 0 AND 10000)) AND
      (load_on_g IS NULL OR load_on_g >= 0)
    ) NOT VALID;
  END IF;
END $$;

-- At most one live plan per order. Superseded and rejected plans stay for audit.
CREATE UNIQUE INDEX IF NOT EXISTS opp_one_live_uidx
  ON order_packing_plans(order_id)
  WHERE state IN ('proposed','validated','reserved','consumed','manual_pack_required');

CREATE INDEX IF NOT EXISTS opp_order_idx ON order_packing_plans(order_id);
CREATE INDEX IF NOT EXISTS oppi_plan_idx ON order_packing_plan_items(plan_id);

CREATE UNIQUE INDEX IF NOT EXISTS oppi_placement_uidx
  ON order_packing_plan_items(plan_id, carton_index, product_id, COALESCE(variant_id,''), unit_seq);

DROP TRIGGER IF EXISTS opp_set_updated_at ON order_packing_plans;
CREATE TRIGGER opp_set_updated_at BEFORE UPDATE ON order_packing_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO schema_migrations (version, checksum, applied_by, notes)
SELECT '0043_order_packing_plans', 'pending', current_user,
       'validated packing plans with integer mm/g placement coordinates and audit report'
WHERE NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version='0043_order_packing_plans');

COMMIT;
