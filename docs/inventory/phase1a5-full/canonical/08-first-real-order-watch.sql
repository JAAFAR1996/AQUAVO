-- ============================================================================
-- 08-first-real-order-watch.sql   —   READ-ONLY.
-- Run on Production when the FIRST real customer order arrives after the
-- settlement. This is the live proof that the reconciled ledger behaves.
-- Never create a test order on Production to trigger this.
--
--   psql "$PROD_URL" -v since="2026-07-30 00:00:00" -f 08-first-real-order-watch.sql
--   `since` = the COMMIT timestamp of 06-production-apply.sql (UTC).
-- ============================================================================

\if :{?since}
\else
\echo 'FATAL: -v since="<UTC timestamp of the production COMMIT>" required'
\quit
\endif

\echo '=== 1. Orders placed after the settlement ==='
SELECT id, order_number, status, payment_status, total, rounded_total, created_at
FROM orders
WHERE created_at > :'since'::timestamp
ORDER BY created_at;
-- No rows yet => FIRST_REAL_ORDER_STATUS: WAITING_FOR_FIRST_REAL_ORDER. Stop here.

\echo '=== 2. Each new line must have produced EXACTLY ONE order_line sale ==='
SELECT oi.order_id, oi.id AS order_item_id, oi.product_id,
       oi.metadata->>'variantId'                       AS line_variant,
       oi.quantity                                     AS ordered_qty,
       count(m.id)                                     AS sale_movements,
       COALESCE(sum(m.quantity_delta),0)               AS total_delta,
       string_agg(DISTINCT m.movement_type,',')        AS movement_types,
       string_agg(DISTINCT m.source_type,',')          AS source_types,
       string_agg(DISTINCT m.variant_id,',')           AS movement_variants,
       string_agg(DISTINCT m.idempotency_key,',')      AS keys
FROM order_items_relational oi
JOIN orders o ON o.id = oi.order_id
LEFT JOIN inventory_movements m
       ON m.idempotency_key = 'order_item:' || oi.id
WHERE o.created_at > :'since'::timestamp
GROUP BY 1,2,3,4,5
ORDER BY 1,2;
-- FOR EVERY ROW:
--   sale_movements    = 1                      (exactly one, never zero, never two)
--   movement_types    = 'sale'
--   source_types      = 'order_line'
--   total_delta       = -ordered_qty           (decreased once, no jump)
--   movement_variants = line_variant           (NULL line -> NULL movement)
--   keys              = 'order_item:<order_item_id>'

\echo '=== 3. Ledger and storefront moved together, by exactly the ordered qty ==='
WITH loc AS (SELECT id FROM inventory_locations WHERE code='MAIN' AND is_active=true LIMIT 1),
touched AS (
  SELECT DISTINCT oi.product_id, NULLIF(oi.metadata->>'variantId','') AS variant_id
  FROM order_items_relational oi JOIN orders o ON o.id=oi.order_id
  WHERE o.created_at > :'since'::timestamp)
SELECT t.product_id, t.variant_id,
       (SELECT COALESCE(SUM(m.quantity_delta),0) FROM inventory_movements m, loc
         WHERE m.product_id=t.product_id
           AND m.variant_id IS NOT DISTINCT FROM t.variant_id
           AND m.location_id=loc.id)                                AS ledger_now,
       CASE WHEN t.variant_id IS NULL
            THEN (SELECT p.stock FROM products p WHERE p.id=t.product_id)
            ELSE (SELECT (e->>'stock')::int FROM products p,
                    jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) e
                   WHERE p.id=t.product_id AND e->>'id'=t.variant_id)
       END                                                          AS storefront_now
FROM touched t ORDER BY 1,2 NULLS FIRST;
-- ledger_now MUST equal storefront_now on every row.

\echo '=== 4. No duplicate or stray movement in the window ==='
SELECT id, product_id, variant_id, movement_type, quantity_delta,
       source_type, source_id, created_by, idempotency_key, created_at
FROM inventory_movements
WHERE created_at > :'since'::timestamptz
  AND idempotency_key NOT LIKE 'fullinv:production:%'
ORDER BY created_at;
-- Every row here must be explainable by an order in query 1:
--   sale          / order_line            / created_by=database_trigger
--   sale_reversal / order_status_reversal / created_by=database_trigger
--     (key 'order_reversal:<order_id>:<order_item_id>'; reversed_movement_id
--      stays NULL — that is the real behaviour of
--      reverse_order_inventory_on_terminal_status, not a defect)
-- Anything else is unexplained. Investigate before calling the project closed.

\echo '=== 5. Global invariant still holds. EXPECT all zero. ==='
WITH loc AS (SELECT id FROM inventory_locations WHERE code='MAIN' AND is_active=true LIMIT 1),
sf AS (
  SELECT p.id AS product_id, NULL::text AS variant_id, COALESCE(p.stock,0) AS storefront
  FROM products p WHERE COALESCE(p.has_variants,false)=false
  UNION ALL
  SELECT p.id, e->>'id', COALESCE((e->>'stock')::int,0)
  FROM products p, jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) e
  WHERE COALESCE(p.has_variants,false)=true),
led AS (SELECT m.product_id, m.variant_id, SUM(m.quantity_delta) AS ledger
        FROM inventory_movements m, loc WHERE m.location_id=loc.id GROUP BY 1,2),
j AS (SELECT COALESCE(sf.product_id,led.product_id) pid, COALESCE(sf.variant_id,led.variant_id) vid,
             (sf.product_id IS NOT NULL) in_sf, sf.storefront, led.ledger
      FROM sf FULL OUTER JOIN led
        ON led.product_id=sf.product_id AND led.variant_id IS NOT DISTINCT FROM sf.variant_id)
SELECT count(*) FILTER (WHERE in_sf AND COALESCE(storefront,0) <> COALESCE(ledger,0)) AS mismatches,
       count(*) FILTER (WHERE NOT in_sf AND COALESCE(ledger,0) <> 0)                  AS removed_variant_nonzero,
       (SELECT count(*) FROM (SELECT 1 FROM inventory_movements, loc
          WHERE location_id=loc.id GROUP BY product_id, variant_id
          HAVING SUM(quantity_delta) < 0) x)                                          AS negative_balances
FROM j;

-- OUTCOME:
--   all expectations met  -> FIRST_REAL_ORDER_STATUS: VERIFIED
--   no orders yet         -> FIRST_REAL_ORDER_STATUS: WAITING_FOR_FIRST_REAL_ORDER
--   anything else         -> FIRST_REAL_ORDER_STATUS: FAILED — report, do not patch.
