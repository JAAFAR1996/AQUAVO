-- ============================================================================
-- 07-production-post-verify.sql   —   READ-ONLY.
-- Run in a SEPARATE session after 06 COMMITted on Production.
-- ============================================================================

\echo '=== 1. Ledger equals storefront everywhere. EXPECT 0 rows. ==='
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
SELECT pid AS product_id, vid AS variant_id, in_sf AS storefront_present, storefront, ledger
FROM j
WHERE (in_sf AND COALESCE(storefront,0) <> COALESCE(ledger,0))
   OR (NOT in_sf AND COALESCE(ledger,0) <> 0);

\echo '=== 2. The four closing conditions. EXPECT all zero. ==='
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
SELECT
  count(*) FILTER (WHERE in_sf AND COALESCE(storefront,0) <> COALESCE(ledger,0)) AS active_storefront_mismatches,
  count(*) FILTER (WHERE NOT in_sf AND COALESCE(ledger,0) <> 0)                  AS removed_variant_nonzero_ledgers,
  count(*) FILTER (WHERE in_sf AND COALESCE(storefront,0) > 0 AND ledger IS NULL) AS positive_stock_without_ledger,
  count(*) FILTER (WHERE NOT ((in_sf AND ledger IS NOT NULL)
                           OR (NOT in_sf AND vid IS NOT NULL)
                           OR (in_sf AND ledger IS NULL)))                        AS unexpected_D
FROM j;
-- EXPECT 0 | 0 | 0 | 0.

\echo '=== 3. What this execution wrote ==='
SELECT metadata->>'execution_id' AS execution_id,
       metadata->>'category'     AS category,
       count(*)                  AS movements,
       sum(quantity_delta)       AS net_quantity_change
FROM inventory_movements
WHERE idempotency_key LIKE 'fullinv:production:%'
GROUP BY 1,2 ORDER BY 2;

SELECT movement_type, source_type, source_id, created_by, count(*) AS n,
       min(created_at) AS first_at, max(created_at) AS last_at
FROM inventory_movements
WHERE idempotency_key LIKE 'fullinv:production:%'
GROUP BY 1,2,3,4;
-- EXPECT exactly one row:
--   manual_adjustment | owner_stock_reconciliation | FULL-INVENTORY-STOREFRONT-TRUTH-PRODUCTION | owner:jaafar

SELECT evidence->>'outcome' AS outcome, count(*) AS n
FROM inventory_reconciliations
WHERE evidence->>'execution_id' IS NOT NULL
  AND evidence->>'decision' = 'OWNER_CONFIRMED_CURRENT_STOREFRONT_AS_CANONICAL_INVENTORY_TRUTH'
GROUP BY 1;
-- EXECUTED + SKIP_WITH_EVIDENCE must equal the planned row count.

\echo '=== 4. Movement IDs, reconciliation IDs and keys — for the final report ==='
SELECT id AS movement_id, product_id, variant_id, quantity_delta,
       metadata->>'category'                AS category,
       metadata->>'ledger_before'           AS ledger_before,
       metadata->>'ledger_after'            AS ledger_after,
       metadata->>'storefront_stock_before' AS storefront,
       metadata->>'before_hash'             AS before_hash,
       metadata->>'after_hash'              AS after_hash,
       idempotency_key
FROM inventory_movements
WHERE idempotency_key LIKE 'fullinv:production:%'
ORDER BY product_id, variant_id NULLS FIRST;

SELECT id AS reconciliation_id, product_id, variant_id, status, approved_by, approved_at,
       evidence->>'outcome' AS outcome
FROM inventory_reconciliations
WHERE evidence->>'decision' = 'OWNER_CONFIRMED_CURRENT_STOREFRONT_AS_CANONICAL_INVENTORY_TRUTH'
ORDER BY product_id, variant_id NULLS FIRST;

\echo '=== 5. History intact ==='
SELECT count(*) AS opening_balance_rows,
       md5(string_agg(concat_ws(':',id,product_id,COALESCE(variant_id,'~'),
            quantity_delta::text,movement_type),'|' ORDER BY id)) AS opening_balance_h
FROM inventory_movements WHERE movement_type='opening_balance';
-- MUST equal the pre-execution values recorded by 05 (baseline: 185 rows).

SELECT count(*) AS forbidden_type_rows FROM inventory_movements WHERE movement_type='adjustment';
-- EXPECT 0.

SELECT md5(string_agg(concat_ws(':',id,product_id,COALESCE(variant_id,'~'),
       quantity_delta::text,movement_type,COALESCE(idempotency_key,'~')),'|' ORDER BY id))
       AS pre_existing_movements_h
FROM inventory_movements WHERE idempotency_key NOT LIKE 'fullinv:production:%';
-- MUST equal the movements_h recorded by 05 before the run.

\echo '=== 6. Nothing financial moved ==='
SELECT
  (SELECT count(*) FROM orders)                                                AS orders_n,
  (SELECT md5(string_agg(concat_ws(':',id,order_number,total::text,rounded_total::text,
       shipping_cost::text,discount_total::text,status,payment_status),'|' ORDER BY id))
     FROM orders)                                                              AS orders_h,
  (SELECT count(*) FROM order_items_relational)                                AS order_items_n,
  (SELECT md5(string_agg(concat_ws(':',id,order_id,product_id,quantity::text,
       price_at_purchase::text,total_price::text),'|' ORDER BY id))
     FROM order_items_relational)                                              AS order_items_h,
  (SELECT md5(string_agg(concat_ws(':',id,COALESCE(unit_cost_price::text,'~'),
       COALESCE(cost_snapshot_source,'~'),COALESCE(cost_snapshot_status,'~')),'|' ORDER BY id))
     FROM order_items_relational)                                              AS costs_h,
  (SELECT count(*) FROM notification_log)                                      AS notifications_n,
  (SELECT count(*) FROM accounting_audit_trail)                                AS accounting_n,
  (SELECT count(*) FROM cost_ledger)                                           AS cost_ledger_n,
  (SELECT count(*) FROM cash_settlements)                                      AS cash_n,
  (SELECT COALESCE(sum(rounded_total),0) FROM orders WHERE status='delivered') AS delivered_revenue,
  (SELECT count(*) FROM product_variant_reconciliation)                        AS pvr_n,
  (SELECT count(*) FROM product_variant_reconciliation WHERE is_active=false)  AS pvr_archived,
  (SELECT value FROM settings WHERE key='inventory_ledger_mode')               AS ledger_mode;
-- Compare every column against the 05 baseline. Only movements/reconciliations
-- are allowed to have grown. ledger_mode must still be 'enforce'.

\echo '=== 7. Storefront was never written directly ==='
SELECT id, stock,
       (SELECT COALESCE(SUM((e->>'stock')::int),0) FROM jsonb_array_elements(variants) e) AS variant_sum
FROM products
WHERE COALESCE(has_variants,false)=true
  AND stock <> (SELECT COALESCE(SUM((e->>'stock')::int),0) FROM jsonb_array_elements(variants) e);
-- EXPECT 0 rows — products.stock is still the trigger-derived sum.

-- ── MANUAL, not SQL ──────────────────────────────────────────────────────
--   Open the storefront / API and confirm the displayed stock numbers are the
--   SAME as before the settlement. They must be: the ledger moved to the
--   storefront, never the reverse.
--   DO NOT create a test order on Production.
--   Then run 08-first-real-order-watch.sql when the first real order lands.
