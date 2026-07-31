-- 0049_default_preparation_profile
--
-- WHY THIS EXISTS
-- 0048 seeded PRICE_LABEL (50 IQD) and THANK_YOU_SOCIAL_CARD (100 IQD) with
-- approved, effective-dated cost records. It did NOT seed anything that APPLIES
-- them, so nothing ever did:
--
--   fulfillment-draft-service.ts:241  → suggestProfileForOrder(...)
--   packaging-profile-service.ts:337  → `if (families.length === 0) return null`
--
-- With no profile family, every draft opened empty and the two fixed costs never
-- reached an order. This adds the one missing row: a default family whose
-- version 1 contains exactly those two materials, quantity 1 each.
--
-- ONCE PER ORDER, NOT PER CARTON: both materials are calculation_basis
-- 'per_order' (set in 0048), so a five-carton order still counts 50 + 100 once.
-- The quantity here is the profile multiplier, not a carton count.
--
-- NOT SEEDED: no carton, no dimension, no weight. Unchanged from 0048.
--
-- HISTORICAL ORDERS ARE UNTOUCHED. A confirmed fulfillment event freezes its own
-- material names, quantities and unit costs on immutable lines, so introducing a
-- profile now cannot reach backwards into an order that already shipped.
--
-- ROLLBACK: 0049_default_preparation_profile_rollback.sql

BEGIN;

-- 1) The family ---------------------------------------------------------------
-- applies_to.default = true is what scores the family in suggestProfileForOrder
-- when an order matches no more specific rule. Guarded on family_key, which is
-- uniquely indexed (ppf_key_uidx), so re-applying is a no-op.
INSERT INTO packaging_profile_families (id, family_key, name, applies_to, active, notes)
SELECT gen_random_uuid()::text,
       'default-preparation',
       'تجهيز الطلب الافتراضي',
       '{"default": true}'::jsonb,
       true,
       'ملصق السعر وكارت الشكر — يُحتسبان مرة وحدة لكل طلب مهما كان عدد الكراتين'
WHERE NOT EXISTS (
  SELECT 1 FROM packaging_profile_families WHERE family_key = 'default-preparation'
);

-- 2) Version 1 ----------------------------------------------------------------
-- expected_cost is left to the sum of the CURRENTLY approved costs, and stays
-- NULL if either is unresolved — an unknown cost must render as «غير معروف»,
-- never as 0. A later price change does not rewrite this row: the service
-- creates a NEW version, and confirmed events keep their own frozen snapshot.
INSERT INTO packaging_profiles
  (id, profile_family_id, name, applies_to, expected_cost, effective_date,
   version, creation_reason, created_by, active)
SELECT gen_random_uuid()::text,
       f.id,
       'تجهيز الطلب الافتراضي',
       '{"default": true}'::jsonb,
       (
         SELECT CASE WHEN count(*) FILTER (WHERE r.unit_cost IS NULL) > 0
                       OR count(*) <> 2
                     THEN NULL
                     ELSE sum(r.unit_cost)
                END
           FROM fulfillment_materials m
           JOIN material_cost_records r
             ON r.material_id = m.id
            AND r.approval_status = 'approved'
            AND r.superseded_at IS NULL
          WHERE m.sku IN ('PRICE_LABEL','THANK_YOU_SOCIAL_CARD')
       ),
       now(),
       1,
       'migration-0049: default preparation profile so the two fixed per-order costs actually apply',
       'migration-0049',
       true
  FROM packaging_profile_families f
 WHERE f.family_key = 'default-preparation'
   AND NOT EXISTS (
     SELECT 1 FROM packaging_profiles p WHERE p.profile_family_id = f.id AND p.version = 1
   );

-- 3) Its two items ------------------------------------------------------------
-- Joined on sku, so a material that is absent contributes no row rather than a
-- fabricated one. Guarded per (profile, material) for idempotency.
INSERT INTO packaging_profile_items (id, profile_id, material_id, quantity)
SELECT gen_random_uuid()::text, p.id, m.id, 1
  FROM packaging_profiles p
  JOIN packaging_profile_families f ON f.id = p.profile_family_id
  JOIN fulfillment_materials m ON m.sku IN ('PRICE_LABEL','THANK_YOU_SOCIAL_CARD')
 WHERE f.family_key = 'default-preparation'
   AND p.version = 1
   AND NOT EXISTS (
     SELECT 1 FROM packaging_profile_items i
      WHERE i.profile_id = p.id AND i.material_id = m.id
   );

INSERT INTO schema_migrations (version, checksum, applied_by, notes)
SELECT '0049_default_preparation_profile', 'pending', current_user,
       'default packaging profile family + version 1 applying PRICE_LABEL and THANK_YOU_SOCIAL_CARD once per order; NO cartons seeded'
WHERE NOT EXISTS (
  SELECT 1 FROM schema_migrations WHERE version='0049_default_preparation_profile'
);

COMMIT;
