-- ============================================================================
-- DEPRECATED — DO NOT EXECUTE
-- Superseded on 2026-07-30 by docs/inventory/phase1a5-full/canonical/
-- Kept for provenance only. This file is NOT a source of truth.
-- ============================================================================

-- ============================================================================
-- SHARED CANONICAL PLAN CTE — Phase 1A.5 FULL
-- OWNER_DECISION: OWNER_CONFIRMED_CURRENT_STOREFRONT_AS_CANONICAL_INVENTORY_TRUTH
-- ============================================================================
-- This block is INCLUDED VERBATIM by every script in this folder. It is the ONE
-- definition of "what the storefront says" and "what the ledger says". Never
-- fork it — if it changes, it changes for preflight, apply and verify together.
--
-- Storefront truth (owner decision):
--   has_variants=false -> products.stock                (variant_id = NULL)
--   has_variants=true  -> products.variants[].stock     (variant_id = element.id)
--   products.stock for a variant product is a TRIGGER-DERIVED SUM
--   (enforce_product_stock_from_variants) and is NEVER used to settle a variant.
--
-- Ledger truth: SUM(inventory_movements.quantity_delta) at the MAIN location,
--   matched with variant_id IS NOT DISTINCT FROM (NULL-safe).
--
-- Categories:
--   A    in storefront + in ledger, numbers differ   -> adjustment = storefront - ledger
--   B    in ledger, variant_id no longer in products.variants -> adjustment = 0 - ledger
--   C    in storefront with stock > 0, no ledger rows at all  -> adjustment = storefront - 0
--   D    anything else                               -> BLOCKED_FOR_OWNER_REVIEW
--   MATCH / NOOP                                     -> excluded, never written
-- ============================================================================

WITH loc AS (
  SELECT id FROM inventory_locations WHERE code = 'MAIN' AND is_active = true LIMIT 1
),
sf AS (
  SELECT p.id AS product_id, NULL::text AS variant_id, COALESCE(p.stock, 0) AS storefront
  FROM products p
  WHERE COALESCE(p.has_variants, false) = false
  UNION ALL
  SELECT p.id, e->>'id', COALESCE((e->>'stock')::int, 0)
  FROM products p, jsonb_array_elements(COALESCE(p.variants, '[]'::jsonb)) e
  WHERE COALESCE(p.has_variants, false) = true
),
led AS (
  SELECT m.product_id, m.variant_id, SUM(m.quantity_delta) AS ledger, COUNT(*) AS movement_count
  FROM inventory_movements m, loc
  WHERE m.location_id = loc.id
  GROUP BY 1, 2
),
j AS (
  SELECT COALESCE(sf.product_id, led.product_id) AS product_id,
         COALESCE(sf.variant_id,  led.variant_id)  AS variant_id,
         (sf.product_id IS NOT NULL)               AS in_storefront,
         sf.storefront,
         led.ledger,
         COALESCE(led.movement_count, 0)           AS movement_count
  FROM sf
  FULL OUTER JOIN led
    ON led.product_id = sf.product_id
   AND led.variant_id IS NOT DISTINCT FROM sf.variant_id
),
plan AS (
  SELECT j.*,
    CASE
      WHEN in_storefront AND ledger IS NOT NULL AND COALESCE(storefront,0) <> ledger THEN 'A'
      WHEN NOT in_storefront AND variant_id IS NOT NULL                              THEN 'B'
      WHEN in_storefront AND ledger IS NULL AND COALESCE(storefront,0) >  0           THEN 'C'
      WHEN in_storefront AND ledger IS NULL AND COALESCE(storefront,0) =  0           THEN 'NOOP'
      WHEN in_storefront AND ledger IS NOT NULL AND COALESCE(storefront,0) = ledger   THEN 'MATCH'
      ELSE 'D'
    END AS category,
    CASE
      WHEN in_storefront AND ledger IS NOT NULL              THEN COALESCE(storefront,0) - ledger
      WHEN NOT in_storefront AND variant_id IS NOT NULL      THEN 0 - ledger
      WHEN in_storefront AND ledger IS NULL                  THEN COALESCE(storefront,0)
    END AS adjustment,
    CASE
      WHEN in_storefront AND ledger IS NOT NULL         THEN COALESCE(storefront,0)
      WHEN NOT in_storefront AND variant_id IS NOT NULL THEN 0
      WHEN in_storefront AND ledger IS NULL             THEN COALESCE(storefront,0)
    END AS target_balance
  FROM j
)
-- Executable rows only: a category we are allowed to write, and a non-zero delta
-- (inventory_movements_quantity_check forbids quantity_delta = 0).
-- SELECT * FROM plan WHERE category IN ('A','B','C') AND adjustment <> 0;
