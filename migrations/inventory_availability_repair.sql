-- inventory_availability_repair.sql
-- F-6 — controlled reconciliation of GENUINELY divergent storefront SKUs.
--
-- ⚠️  NOT applied to production by this agent. NOT run via db:push.
--     Apply surgically, inside a transaction, only after REPORT A of
--     inventory_availability_reconciliation_report.sql has been reviewed on the
--     target branch. Idempotent (ON CONFLICT DO NOTHING) — safe to re-run.
--
-- WHAT IT DOES
-- -----------
-- For every SKU that is ADVERTISED as available (products.stock>0 / variant
-- stock>0, price>0, not soft-deleted) but whose canonical balance AT THE
-- CHECKOUT GRANULARITY (variant_id IS NOT DISTINCT FROM the ordered variant, at
-- location MAIN) is <= 0, it inserts ONE `opening_balance` inventory movement
-- that raises the canonical balance to exactly the physically-counted advertised
-- stock:
--
--     quantity_delta = advertised_stock - current_canonical_balance   (> 0)
--     resulting balance = current + delta = advertised_stock
--
-- WHY THIS IS SAFE / NOT A BLIND OVERWRITE
-- ----------------------------------------
--  * It only ever OPENS availability for SKUs the merchant already advertises as
--    physically in stock (stock>0). Zero/negative advertised SKUs are never
--    touched, so nothing that should read as unavailable becomes available.
--  * It does not UPDATE inventory_canonical_balances (a view) nor blindly copy
--    products.stock over the ledger. It appends an auditable opening movement,
--    the same mechanism the owner's original storefront-opening batch used. The
--    ledger stays an append-only, reconstructable history.
--  * delta = advertised - current is always > 0 here (current <= 0 < advertised),
--    so prevent_negative_inventory_balance cannot fire.
--  * The AFTER-INSERT projection trigger recomputes products.stock (or the
--    variant's stock in the jsonb) from SUM(quantity_delta) = advertised_stock,
--    i.e. it writes back the SAME number — no double counting, variant stock
--    stays correct.
--  * Idempotency key `availability-reconciliation:<product>:<variant|base>`
--    guarantees at most one opening per SKU across repeated runs.
--
-- PRE-FLIGHT: run Report A first and eyeball the delta column. Expect the repair
-- to affect exactly the rows Report A returns.

BEGIN;

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
divergent AS (
    SELECT s.product_id,
           s.variant_id,
           s.advertised_stock,
           (SELECT COALESCE(SUM(m.quantity_delta), 0)
            FROM inventory_movements m, main
            WHERE m.product_id = s.product_id
              AND m.variant_id IS NOT DISTINCT FROM s.variant_id
              AND m.location_id = main.id) AS canonical_stock
    FROM advertised_skus s
)
INSERT INTO inventory_movements (
    id, product_id, variant_id, location_id, quantity_delta,
    movement_type, source_type, source_id, idempotency_key,
    currency, happened_at, metadata, created_by, created_at
)
SELECT gen_random_uuid()::text,
       d.product_id,
       d.variant_id,
       (SELECT id FROM main),
       (d.advertised_stock - d.canonical_stock),                       -- > 0
       'opening_balance',
       'availability_reconciliation',
       NULL,
       'availability-reconciliation:' || d.product_id || ':' || COALESCE(d.variant_id, 'base'),
       'IQD',
       now(),
       jsonb_build_object(
           'reason', 'F-6 storefront availability reconciliation',
           'advertised_stock', d.advertised_stock,
           'canonical_before', d.canonical_stock
       ),
       'system:inventory-availability-remediation',
       now()
FROM divergent d
WHERE d.canonical_stock <= 0
  AND d.advertised_stock > 0
ON CONFLICT (idempotency_key) DO NOTHING;

-- Verify NOTHING is left divergent before committing. If this returns > 0 rows,
-- ROLLBACK and investigate — do not commit a partial repair.
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
)
SELECT s.product_id, s.variant_id, s.advertised_stock,
       (SELECT COALESCE(SUM(m.quantity_delta), 0)
        FROM inventory_movements m, main
        WHERE m.product_id = s.product_id
          AND m.variant_id IS NOT DISTINCT FROM s.variant_id
          AND m.location_id = main.id) AS canonical_after
FROM advertised_skus s
WHERE (SELECT COALESCE(SUM(m.quantity_delta), 0)
       FROM inventory_movements m, main
       WHERE m.product_id = s.product_id
         AND m.variant_id IS NOT DISTINCT FROM s.variant_id
         AND m.location_id = main.id) <= 0;

-- Review the two result sets above, THEN choose:
--   COMMIT;    -- if the post-repair check returned 0 rows
--   ROLLBACK;  -- otherwise
-- Left as ROLLBACK by default so an accidental full-file run changes nothing.
ROLLBACK;
