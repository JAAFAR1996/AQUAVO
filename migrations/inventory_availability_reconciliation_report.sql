-- inventory_availability_reconciliation_report.sql
-- F-6 — storefront availability vs. canonical inventory ledger divergence report.
-- READ-ONLY. Contains only SELECTs. Safe to run against any branch (incl. prod)
-- for diagnosis; it never writes. NOT applied via db:push.
--
-- Background
-- ----------
-- Production runs an out-of-band "enforce"-mode inventory ledger
-- (settings.inventory_ledger_mode='enforce'). Every order line inserted into
-- order_items_relational records a `sale` movement in inventory_movements, and
-- the BEFORE-INSERT trigger prevent_negative_inventory_balance RAISES
-- "insufficient canonical inventory balance ..." — aborting checkout — whenever
-- the canonical running balance for the SKU that the line actually hits would go
-- negative. The balance is checked at the exact granularity the sale is written:
--   * non-variant line -> variant_id IS NULL   (base pool) at location MAIN
--   * variant line     -> variant_id = <ordered variant> at location MAIN
-- (see prevent_negative_inventory_balance / record_order_item_inventory_sale).
--
-- The canonical view:
--   inventory_canonical_balances(product_id, variant_id, location_id,
--                                canonical_stock, last_movement_at)
--   = SELECT ... sum(quantity_delta) ... FROM inventory_movements
--     GROUP BY product_id, variant_id, location_id;
--
-- A product/variant is GENUINELY divergent (a real customer gets HTTP 500 -> now
-- HTTP 409) only when it is ADVERTISED as available (stock>0, price>0, not
-- soft-deleted) but the canonical balance AT THE LEVEL CHECKOUT WILL HIT is <= 0.

-- ─────────────────────────────────────────────────────────────────────────────
-- REPORT A (AUTHORITATIVE) — per-SKU divergence at the exact granularity the
-- enforce trigger checks. This is THE definitive divergent-product list.
-- ─────────────────────────────────────────────────────────────────────────────
WITH main AS (
    SELECT id FROM inventory_locations WHERE code = 'MAIN' AND is_active LIMIT 1
),
advertised_skus AS (
    -- Non-variant products advertise a single base SKU.
    SELECT p.id AS product_id,
           NULL::text AS variant_id,
           NULL::text AS variant_label,
           p.name,
           p.stock AS advertised_stock
    FROM products p
    WHERE p.has_variants = false
      AND p.stock > 0
      AND CAST(p.price AS numeric) > 0
      AND p.deleted_at IS NULL
    UNION ALL
    -- Variant products advertise each in-stock variant SKU.
    SELECT p.id,
           (v->>'id'),
           (v->>'label'),
           p.name,
           COALESCE((v->>'stock')::int, 0)
    FROM products p,
         jsonb_array_elements(p.variants) v
    WHERE p.has_variants = true
      AND CAST(p.price AS numeric) > 0
      AND p.deleted_at IS NULL
      AND COALESCE((v->>'stock')::int, 0) > 0
),
scored AS (
    SELECT s.*,
           (SELECT COALESCE(SUM(m.quantity_delta), 0)
            FROM inventory_movements m, main
            WHERE m.product_id = s.product_id
              AND m.variant_id IS NOT DISTINCT FROM s.variant_id
              AND m.location_id = main.id) AS canonical_stock
    FROM advertised_skus s
)
SELECT product_id,
       variant_id,
       variant_label,
       name,
       advertised_stock,
       canonical_stock,
       (advertised_stock - canonical_stock) AS opening_delta_needed
FROM scored
WHERE canonical_stock <= 0            -- checkout would RAISE here
ORDER BY name, variant_label NULLS FIRST;

-- ─────────────────────────────────────────────────────────────────────────────
-- REPORT B (SUMMARY) — counts.
-- ─────────────────────────────────────────────────────────────────────────────
WITH main AS (
    SELECT id FROM inventory_locations WHERE code = 'MAIN' AND is_active LIMIT 1
),
advertised_skus AS (
    SELECT p.id AS product_id, NULL::text AS variant_id, p.stock AS advertised_stock
    FROM products p
    WHERE p.has_variants = false AND p.stock > 0
      AND CAST(p.price AS numeric) > 0 AND p.deleted_at IS NULL
    UNION ALL
    SELECT p.id, (v->>'id'), COALESCE((v->>'stock')::int, 0)
    FROM products p, jsonb_array_elements(p.variants) v
    WHERE p.has_variants = true AND CAST(p.price AS numeric) > 0 AND p.deleted_at IS NULL
      AND COALESCE((v->>'stock')::int, 0) > 0
),
scored AS (
    SELECT s.*,
           (SELECT COALESCE(SUM(m.quantity_delta), 0)
            FROM inventory_movements m, main
            WHERE m.product_id = s.product_id
              AND m.variant_id IS NOT DISTINCT FROM s.variant_id
              AND m.location_id = main.id) AS canonical_stock
    FROM advertised_skus s
)
SELECT COUNT(*)                                       AS advertised_skus,
       COUNT(*) FILTER (WHERE canonical_stock <= 0)   AS unorderable_skus,
       COUNT(DISTINCT product_id) FILTER (WHERE canonical_stock <= 0)
                                                       AS unorderable_products
FROM scored;

-- ─────────────────────────────────────────────────────────────────────────────
-- REPORT C (LEGACY / e2e D13b PARITY) — reproduces the exact query e2e
-- certification D13b uses, kept ONLY for comparison. NOTE: this query inspects
-- ONLY the base `variant_id IS NULL` balance, so it FALSELY flags variant
-- products (whose stock lives per-variant, never in the base pool) as divergent.
-- Report A is authoritative; the gap between C and A is the false-positive set.
-- (Defect in e2e/certification.spec.ts D13b reported to the coordinator.)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT p.id, p.stock, p.has_variants
FROM products p
WHERE p.stock > 0
  AND CAST(p.price AS numeric) > 0
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM inventory_canonical_balances b
      WHERE b.product_id = p.id
        AND b.variant_id IS NULL
        AND b.canonical_stock > 0
  )
ORDER BY p.stock DESC;
