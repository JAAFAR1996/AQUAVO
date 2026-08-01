-- ROLLBACK of 0049_default_preparation_profile
--
-- Deliberately asymmetric, because a profile version that a confirmed order has
-- already used is EVIDENCE, not configuration. `pp_guard_locked` (from
-- add_fulfillment_hardening.sql) raises on DELETE of a locked version, so a
-- naive DELETE would abort this whole transaction the moment one order shipped.
--
-- So:
--   * never used  → remove the rows entirely, back to the pre-0049 state;
--   * used at all → keep every row and just deactivate, so the family stops
--                   being suggested for NEW orders while the historical trail
--                   that priced old orders stays readable forever.
--
-- Either way the two materials and their approved cost records from 0048 are
-- left alone: this migration never created them.

BEGIN;

-- 1) Unused version → delete items, then the version itself.
DELETE FROM packaging_profile_items i
 USING packaging_profiles p, packaging_profile_families f
 WHERE i.profile_id = p.id
   AND p.profile_family_id = f.id
   AND f.family_key = 'default-preparation'
   AND p.locked = false
   AND NOT EXISTS (
     SELECT 1 FROM order_fulfillment_events e WHERE e.profile_id = p.id
   );

DELETE FROM packaging_profiles p
 USING packaging_profile_families f
 WHERE p.profile_family_id = f.id
   AND f.family_key = 'default-preparation'
   AND p.locked = false
   AND NOT EXISTS (
     SELECT 1 FROM order_fulfillment_events e WHERE e.profile_id = p.id
   );

-- 2) Family goes only if nothing of it survived step 1.
DELETE FROM packaging_profile_families f
 WHERE f.family_key = 'default-preparation'
   AND NOT EXISTS (
     SELECT 1 FROM packaging_profiles p WHERE p.profile_family_id = f.id
   );

-- 3) Anything that DID survive is retired rather than removed, so
--    suggestProfileForOrder stops returning it (it filters on active = true).
UPDATE packaging_profile_families
   SET active = false,
       notes = coalesce(notes || ' · ', '') || 'retired by 0049 rollback; retained because a confirmed order used it',
       updated_at = now()
 WHERE family_key = 'default-preparation'
   AND active = true;

-- Flagged, not deleted: the ledger keeps the fact that this migration ran and
-- was rolled back. Matches every other rollback in 0040-0048.
UPDATE schema_migrations SET rolled_back_at = now()
 WHERE version='0049_default_preparation_profile' AND rolled_back_at IS NULL;

COMMIT;
