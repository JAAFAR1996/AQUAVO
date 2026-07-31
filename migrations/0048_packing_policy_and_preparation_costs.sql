-- 0048_packing_policy_and_preparation_costs
-- The support policy defaults, and the only two seeded materials.
--
-- SEEDED: PRICE_LABEL (50 IQD) and THANK_YOU_SOCIAL_CARD (100 IQD), both
-- per_order and both NOT stock-tracked — they are accounting costs, not
-- inventory. Counted once per order however many cartons it takes.
--
-- NOT SEEDED: any carton. No sizes, no prices, no quantities. The owner enters
-- the real ones; inventing a carton would put a fabricated dimension into a
-- system whose whole point is refusing to fabricate dimensions.
--
-- Costs go through material_cost_records rather than being written straight to
-- current_unit_cost, so the effective-dated, approved cost trail exists from the
-- first day and a later price change is prospective by construction.
-- ROLLBACK: 0048_packing_policy_and_preparation_costs_rollback.sql

BEGIN;

-- 1) Support policy -----------------------------------------------------------
INSERT INTO settings (key, value)
SELECT k, v FROM (VALUES
  ('packing_min_support_ratio',         '0.80'),
  ('packing_max_overhang_ratio',        '0.20'),
  ('packing_fragile_min_support_ratio', '0.95'),
  ('packing_contact_epsilon_mm',        '1'),
  ('packing_min_contact_area_mm2',      '100'),
  -- Kill switches: turn the feature off without a deploy or a rollback.
  ('carton_planner_enabled',            'true'),
  ('carton_reservations_enabled',       'true')
) AS seed(k, v)
WHERE NOT EXISTS (SELECT 1 FROM settings s WHERE s.key = seed.k);

-- 2) The two fixed preparation costs -----------------------------------------
INSERT INTO fulfillment_materials
  (id, name, category, sku, material_kind, calculation_basis, stock_tracked,
   unit, currency, active, notes)
SELECT gen_random_uuid()::text, m.name, m.category, m.sku, 'consumable', 'per_order', false,
       'order', 'IQD', true, m.notes
FROM (VALUES
  ('ملصق السعر',            'label', 'PRICE_LABEL',
   'يُحتسب مرة واحدة لكل طلب مهما كان عدد الكراتين'),
  ('كارت الشكر والتواصل',   'insert', 'THANK_YOU_SOCIAL_CARD',
   'يُحتسب مرة واحدة لكل طلب مهما كان عدد الكراتين')
) AS m(name, category, sku, notes)
WHERE NOT EXISTS (SELECT 1 FROM fulfillment_materials f WHERE f.sku = m.sku);

-- 3) Their approved, effective-dated costs ------------------------------------
INSERT INTO material_cost_records
  (id, material_id, cost_basis, unit_cost, currency, approval_status,
   approved_by, approved_at, effective_date, reason, created_by)
SELECT gen_random_uuid()::text, f.id, 'verified_manual_standard', c.cost, 'IQD', 'approved',
       'owner', now(), now(), c.reason, 'migration-0048'
FROM (VALUES
  ('PRICE_LABEL',            50::numeric,  'كلفة ملصق السعر المعتمدة من المالك'),
  ('THANK_YOU_SOCIAL_CARD',  100::numeric, 'كلفة كارت الشكر والتواصل المعتمدة من المالك')
) AS c(sku, cost, reason)
JOIN fulfillment_materials f ON f.sku = c.sku
WHERE NOT EXISTS (
  SELECT 1 FROM material_cost_records r
   WHERE r.material_id = f.id AND r.approval_status = 'approved' AND r.superseded_at IS NULL
);

-- Mirror the approved cost onto the catalogue's current-cost reference, which is
-- what the planner and the draft builder read.
UPDATE fulfillment_materials f
   SET current_unit_cost = r.unit_cost,
       current_cost_record_id = r.id,
       cost_confidence = 'high',
       updated_at = now()
  FROM material_cost_records r
 WHERE r.material_id = f.id
   AND r.approval_status = 'approved'
   AND r.superseded_at IS NULL
   AND f.sku IN ('PRICE_LABEL','THANK_YOU_SOCIAL_CARD')
   AND f.current_unit_cost IS DISTINCT FROM r.unit_cost;

INSERT INTO schema_migrations (version, checksum, applied_by, notes)
SELECT '0048_packing_policy_and_preparation_costs', 'pending', current_user,
       'support policy defaults + PRICE_LABEL 50 and THANK_YOU_SOCIAL_CARD 100 per_order; NO cartons seeded'
WHERE NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version='0048_packing_policy_and_preparation_costs');

COMMIT;
