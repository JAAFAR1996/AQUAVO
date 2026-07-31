-- ============================================================================
-- 02-test-verify.sql   —   READ-ONLY. Run on the test branch after 01 committed.
-- Each block states its own expectation. Anything else = the run failed.
-- ============================================================================

\echo '=== 1. Nothing left unsettled. EXPECT 0 rows. ==='
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
WHERE (in_sf AND COALESCE(storefront,0) <> COALESCE(ledger,0))     -- A and C must match
   OR (NOT in_sf AND COALESCE(ledger,0) <> 0);                     -- B must be zero
-- EXPECT: 0 rows.

\echo '=== 2. Per-category outcome. ==='
SELECT m.metadata->>'category' AS category,
       count(*)                AS movements,
       sum(m.quantity_delta)   AS net_quantity_change
FROM inventory_movements m
WHERE m.idempotency_key LIKE 'fullinv:test:%'
GROUP BY 1 ORDER BY 1;
-- EXPECT: A 45 (-293) | B 23 (-135) | C 2 (+6).

SELECT movement_type, source_type, source_id, created_by, count(*) AS n
FROM inventory_movements
WHERE idempotency_key LIKE 'fullinv:test:%'
GROUP BY 1,2,3,4;
-- EXPECT: exactly one row —
--   manual_adjustment | owner_stock_reconciliation | FULL-INVENTORY-STOREFRONT-TRUTH-TEST | owner:jaafar | 70

\echo '=== 3. No movement of any other kind was created. EXPECT 0. ==='
SELECT count(*) AS foreign_movements_in_window
FROM inventory_movements
WHERE created_at >= (SELECT min(created_at) FROM inventory_movements
                      WHERE idempotency_key LIKE 'fullinv:test:%')
  AND idempotency_key NOT LIKE 'fullinv:test:%';

SELECT count(*) AS forbidden_types
FROM inventory_movements
WHERE idempotency_key LIKE 'fullinv:test:%'
  AND movement_type IN ('opening_balance','adjustment','sale','purchase_receipt');
-- EXPECT 0. History (the 25/6 opening balances) is untouched.

\echo '=== 4. Storefront was never written by us. EXPECT 0 rows each. ==='
WITH loc AS (SELECT id FROM inventory_locations WHERE code='MAIN' AND is_active=true LIMIT 1)
SELECT p.id AS product_id, e->>'id' AS variant_id, (e->>'stock')::int AS storefront
FROM products p, jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) e
WHERE COALESCE(p.has_variants,false)=true
  AND (e->>'stock')::int <> (SELECT COALESCE(SUM(m.quantity_delta),0)
                               FROM inventory_movements m, loc
                              WHERE m.product_id=p.id AND m.variant_id=e->>'id'
                                AND m.location_id=loc.id);

SELECT id, stock, (SELECT COALESCE(SUM((e->>'stock')::int),0) FROM jsonb_array_elements(variants) e) AS variant_sum
FROM products
WHERE COALESCE(has_variants,false)=true
  AND stock <> (SELECT COALESCE(SUM((e->>'stock')::int),0) FROM jsonb_array_elements(variants) e);
-- products.stock is still the trigger-derived sum. We never wrote it directly.

\echo '=== 5. Category B: archived, zeroed, not deleted, not resurrected. ==='
SELECT count(*)                                    AS archived_variants,
       count(*) FILTER (WHERE ledger <> 0)         AS with_nonzero_ledger,
       count(*) FILTER (WHERE in_storefront)       AS resurrected
FROM (
  SELECT v.product_id, v.variant_id,
         (SELECT COALESCE(SUM(m.quantity_delta),0) FROM inventory_movements m
           WHERE m.product_id=v.product_id AND m.variant_id=v.variant_id) AS ledger,
         EXISTS (SELECT 1 FROM products p, jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) z
                  WHERE p.id=v.product_id AND z->>'id'=v.variant_id) AS in_storefront
  FROM product_variant_reconciliation v WHERE v.is_active=false) x;
-- EXPECT: archived_variants 23 | with_nonzero_ledger 0 | resurrected 0.

SELECT count(*) AS pvr_rows FROM product_variant_reconciliation;
-- EXPECT 120 — nothing was deleted.

\echo '=== 6. Evidence rows are shaped correctly. ==='
SELECT status, approved_by,
       count(*)                                              AS n,
       count(*) FILTER (WHERE physical_count IS NOT NULL)     AS bad_physical_count,
       count(*) FILTER (WHERE approved_opening_stock IS NOT NULL) AS bad_opening_stock,
       count(*) FILTER (WHERE counted_by IS NOT NULL)         AS bad_counted_by,
       count(*) FILTER (WHERE counted_at IS NOT NULL)         AS bad_counted_at,
       count(*) FILTER (WHERE approved_at IS NULL)            AS missing_approved_at
FROM inventory_reconciliations
WHERE evidence->>'decision' = 'OWNER_CONFIRMED_CURRENT_STOREFRONT_AS_CANONICAL_INVENTORY_TRUTH'
GROUP BY 1,2;
-- EXPECT: applied | owner:jaafar | 70 | 0 | 0 | 0 | 0 | 0.

SELECT count(*) AS movements_missing_a_metadata_field
FROM inventory_movements
WHERE idempotency_key LIKE 'fullinv:test:%'
  AND NOT (metadata ?& ARRAY['decision','owner','execution_id','category','product_id',
        'storefront_present','storefront_stock_before','ledger_before','calculated_adjustment',
        'expected_ledger_after','expected_storefront_after','before_hash',
        'production_parent_branch','test_branch_id','reason','real_order_path_test_status','executed_at']);
-- EXPECT 0.

\echo '=== 7. Nothing financial moved. ==='
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
  (SELECT count(*) FROM cash_settlements)                                      AS cash_n,
  (SELECT COALESCE(sum(rounded_total),0) FROM orders WHERE status='delivered') AS delivered_revenue,
  (SELECT count(*) FROM inventory_movements)                                   AS movements_n,
  (SELECT count(*) FROM inventory_reconciliations)                             AS reconciliations_n,
  (SELECT value FROM settings WHERE key='inventory_ledger_mode')               AS ledger_mode;
-- EXPECT: orders_n 43 / orders_h ca3b1e066ad48a9147747db36fff4693
--         order_items_n 201 / order_items_h 46eea063a9368999912fbbc620bb6714
--         costs_h ff7a08ed5ad808c648d53970343f2c5d
--         notifications_n 170 | accounting_n 9 | cash_n 2
--         delivered_revenue 1967920.00
--         movements_n 290 (220 + 70) | reconciliations_n 285 (215 + 70)
--         ledger_mode enforce
