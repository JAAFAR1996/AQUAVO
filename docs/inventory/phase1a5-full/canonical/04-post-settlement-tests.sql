-- ============================================================================
-- 03-post-settlement-tests.sql
-- Run on the TEST BRANCH after 01 committed and 02 passed.
--     psql "$TEST_BRANCH_URL" -v ON_ERROR_STOP=0 -f 03-post-settlement-tests.sql
-- Every test opens its OWN transaction and ends in ROLLBACK. Nothing survives.
-- ON_ERROR_STOP=0 is deliberate: tests 4 and 6 are EXPECTED to raise.
--
-- No inventory_movement is ever inserted by hand in tests 1-3 and 5. The row
-- must be produced by the existing trigger record_order_item_inventory_sale,
-- driven through the real order path: INSERT orders -> INSERT
-- order_items_relational with metadata->>'variantId', exactly as
-- server/storage/order-storage.ts writes it.
--
-- Expected state at the start (from the settlement):
--   houyi-check-valve        / NULL      ledger 12, storefront 12   (was A)
--   houyi-connectors-4mm     / shape-y   ledger 50, storefront 50   (was A)
--   houyi-connectors-4mm     / shape-t   ledger 50, storefront 50   (untouched neighbour)
--   houyi-connectors-4mm     / shape-i   ledger 50, storefront 50   (untouched neighbour)
--   houyi-terminalia-leaves  / NULL      ledger  5, storefront  5   (was C)
--   houyi-white-sand         / 2kg       ledger  0, NOT in storefront (was B, archived)
-- ============================================================================

\set QUIET off

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ TEST 1 — sell a product with no variants (houyi-check-valve)             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
BEGIN;
\echo '--- T1 before ---'
SELECT (SELECT COALESCE(SUM(quantity_delta),0) FROM inventory_movements
         WHERE product_id='houyi-check-valve' AND variant_id IS NULL) AS ledger,
       (SELECT stock FROM products WHERE id='houyi-check-valve')      AS storefront,
       (SELECT count(*) FROM inventory_movements
         WHERE product_id='houyi-check-valve' AND movement_type='sale') AS sale_movements;
-- EXPECT ledger 12, storefront 12, sale_movements 0

INSERT INTO orders (id, order_number, items, total, rounded_total, shipping_cost,
                    discount_total, status, payment_status, customer_name,
                    customer_phone, shipping_address)
VALUES ('FULLINV-T1-ORDER', 'FULLINV-T1',
        '[{"productId":"houyi-check-valve","quantity":1,"priceAtPurchase":197}]'::jsonb,
        5197, 5250, 5000, 0, 'pending', 'pending',
        'FULLINV TEST', '07000000000', 'test');

INSERT INTO order_items_relational (id, order_id, product_id, quantity,
                                    price_at_purchase, total_price, metadata)
VALUES ('FULLINV-T1-LINE', 'FULLINV-T1-ORDER', 'houyi-check-valve', 1, 197, 197, NULL);

\echo '--- T1 after (trigger fired, no manual movement inserted) ---'
SELECT (SELECT COALESCE(SUM(quantity_delta),0) FROM inventory_movements
         WHERE product_id='houyi-check-valve' AND variant_id IS NULL) AS ledger,
       (SELECT stock FROM products WHERE id='houyi-check-valve')      AS storefront,
       (SELECT count(*) FROM inventory_movements
         WHERE source_type='order_line' AND source_id='FULLINV-T1-ORDER') AS sale_movements,
       (SELECT string_agg(movement_type||'/'||quantity_delta||'/'||idempotency_key, ', ')
          FROM inventory_movements WHERE source_id='FULLINV-T1-ORDER')    AS detail;
-- EXPECT ledger 11, storefront 11, sale_movements 1,
--        detail = sale/-1/order_item:FULLINV-T1-LINE
ROLLBACK;

\echo '--- T1 residue check ---'
SELECT (SELECT count(*) FROM orders WHERE id='FULLINV-T1-ORDER')           AS orders,
       (SELECT count(*) FROM order_items_relational WHERE id='FULLINV-T1-LINE') AS lines,
       (SELECT count(*) FROM inventory_movements WHERE source_id='FULLINV-T1-ORDER') AS movements,
       (SELECT COALESCE(SUM(quantity_delta),0) FROM inventory_movements
         WHERE product_id='houyi-check-valve' AND variant_id IS NULL)     AS ledger,
       (SELECT stock FROM products WHERE id='houyi-check-valve')          AS storefront;
-- EXPECT 0, 0, 0, ledger 12, storefront 12


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ TEST 2 — sell a Category A variant (houyi-connectors-4mm / shape-y)      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
BEGIN;
\echo '--- T2 before (all three variants) ---'
SELECT e->>'id' AS variant, (e->>'stock')::int AS storefront,
       (SELECT COALESCE(SUM(m.quantity_delta),0) FROM inventory_movements m
         WHERE m.product_id='houyi-connectors-4mm' AND m.variant_id=e->>'id') AS ledger
FROM products p, jsonb_array_elements(p.variants) e
WHERE p.id='houyi-connectors-4mm' ORDER BY 1;
-- EXPECT shape-i 50/50, shape-t 50/50, shape-y 50/50

INSERT INTO orders (id, order_number, items, total, rounded_total, shipping_cost,
                    discount_total, status, payment_status, customer_name,
                    customer_phone, shipping_address)
VALUES ('FULLINV-T2-ORDER', 'FULLINV-T2',
        '[{"productId":"houyi-connectors-4mm","variantId":"shape-y","quantity":1,"priceAtPurchase":175}]'::jsonb,
        5175, 5250, 5000, 0, 'pending', 'pending',
        'FULLINV TEST', '07000000000', 'test');

-- variantId lives in metadata — this is exactly how order-storage.ts writes it
-- and exactly what record_order_item_inventory_sale reads.
INSERT INTO order_items_relational (id, order_id, product_id, quantity,
                                    price_at_purchase, total_price, metadata)
VALUES ('FULLINV-T2-LINE', 'FULLINV-T2-ORDER', 'houyi-connectors-4mm', 1, 175, 175,
        '{"variantId":"shape-y","variantLabel":"شكل Y (تفريعة مزدوجة)"}'::jsonb);

\echo '--- T2 after ---'
SELECT e->>'id' AS variant, (e->>'stock')::int AS storefront,
       (SELECT COALESCE(SUM(m.quantity_delta),0) FROM inventory_movements m
         WHERE m.product_id='houyi-connectors-4mm' AND m.variant_id=e->>'id') AS ledger
FROM products p, jsonb_array_elements(p.variants) e
WHERE p.id='houyi-connectors-4mm' ORDER BY 1;
-- EXPECT shape-i 50/50 UNCHANGED, shape-t 50/50 UNCHANGED, shape-y 49/49

SELECT count(*) AS sale_movements, min(movement_type) AS type, min(source_type) AS source,
       min(quantity_delta) AS delta, min(variant_id) AS variant, min(idempotency_key) AS key
FROM inventory_movements WHERE source_id='FULLINV-T2-ORDER';
-- EXPECT 1 | sale | order_line | -1 | shape-y | order_item:FULLINV-T2-LINE

SELECT stock AS product_stock FROM products WHERE id='houyi-connectors-4mm';
-- EXPECT 149 — the trigger-derived sum 50+50+49, not an independent write.
ROLLBACK;

\echo '--- T2 residue check ---'
SELECT (SELECT count(*) FROM orders WHERE id='FULLINV-T2-ORDER') AS orders,
       (SELECT count(*) FROM inventory_movements WHERE source_id='FULLINV-T2-ORDER') AS movements,
       (SELECT stock FROM products WHERE id='houyi-connectors-4mm') AS product_stock,
       (SELECT (e->>'stock')::int FROM products p, jsonb_array_elements(p.variants) e
         WHERE p.id='houyi-connectors-4mm' AND e->>'id'='shape-y') AS shape_y_stock;
-- EXPECT 0, 0, 150, 50


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ TEST 3 — sell a Category C row (houyi-terminalia-leaves)                 ║
-- ║ DEVIATION: the brief asks for a Category C VARIANT. None exists — both   ║
-- ║ Category C rows are has_variants=false / variant_id=NULL. This tests the ║
-- ║ same property: a ledger born from manual_adjustment, not opening_balance.║
-- ╚══════════════════════════════════════════════════════════════════════════╝
BEGIN;
\echo '--- T3 before ---'
SELECT (SELECT COALESCE(SUM(quantity_delta),0) FROM inventory_movements
         WHERE product_id='houyi-terminalia-leaves') AS ledger,
       (SELECT stock FROM products WHERE id='houyi-terminalia-leaves') AS storefront,
       (SELECT string_agg(DISTINCT movement_type,',') FROM inventory_movements
         WHERE product_id='houyi-terminalia-leaves') AS movement_types;
-- EXPECT ledger 5, storefront 5, movement_types = manual_adjustment (never opening_balance)

INSERT INTO orders (id, order_number, items, total, rounded_total, shipping_cost,
                    discount_total, status, payment_status, customer_name,
                    customer_phone, shipping_address)
VALUES ('FULLINV-T3-ORDER', 'FULLINV-T3',
        '[{"productId":"houyi-terminalia-leaves","quantity":1,"priceAtPurchase":500}]'::jsonb,
        5500, 5500, 5000, 0, 'pending', 'pending',
        'FULLINV TEST', '07000000000', 'test');

INSERT INTO order_items_relational (id, order_id, product_id, quantity,
                                    price_at_purchase, total_price, metadata)
VALUES ('FULLINV-T3-LINE', 'FULLINV-T3-ORDER', 'houyi-terminalia-leaves', 1, 500, 500, NULL);

\echo '--- T3 after ---'
SELECT (SELECT COALESCE(SUM(quantity_delta),0) FROM inventory_movements
         WHERE product_id='houyi-terminalia-leaves') AS ledger,
       (SELECT stock FROM products WHERE id='houyi-terminalia-leaves') AS storefront,
       (SELECT count(*) FROM inventory_movements WHERE source_id='FULLINV-T3-ORDER') AS sale_movements;
-- EXPECT ledger 4, storefront 4, sale_movements 1
ROLLBACK;

\echo '--- T3 residue check ---'
SELECT (SELECT COALESCE(SUM(quantity_delta),0) FROM inventory_movements
         WHERE product_id='houyi-terminalia-leaves') AS ledger,
       (SELECT stock FROM products WHERE id='houyi-terminalia-leaves') AS storefront,
       (SELECT count(*) FROM inventory_movements WHERE source_id='FULLINV-T3-ORDER') AS movements;
-- EXPECT 5, 5, 0


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ TEST 4 — a Category B variant must NOT be sellable                       ║
-- ║ (houyi-white-sand / 2kg — archived, ledger 0)                            ║
-- ║ Two independent layers are asserted:                                     ║
-- ║   L1 application: order-storage.ts throws "Invalid variant" because the  ║
-- ║      variant is absent from products.variants — proven by query below.   ║
-- ║   L2 database: even bypassing L1, prevent_negative_inventory_balance     ║
-- ║      RAISES because 0 + (-1) < 0. This block must FAIL.                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
\echo '--- T4 layer 1: is the variant reachable from the storefront at all? ---'
SELECT (SELECT count(*) FROM products p, jsonb_array_elements(p.variants) e
         WHERE p.id='houyi-white-sand' AND e->>'id'='2kg')     AS variant_in_storefront,
       (SELECT is_active FROM product_variant_reconciliation
         WHERE product_id='houyi-white-sand' AND variant_id='2kg') AS pvr_is_active,
       (SELECT COALESCE(SUM(quantity_delta),0) FROM inventory_movements
         WHERE product_id='houyi-white-sand' AND variant_id='2kg')  AS ledger;
-- EXPECT variant_in_storefront 0 (order-storage.ts cannot resolve it -> throws),
--        pvr_is_active false, ledger 0.

BEGIN;
\echo '--- T4 layer 2: forcing it at the DB level MUST raise ---'
INSERT INTO orders (id, order_number, items, total, rounded_total, shipping_cost,
                    discount_total, status, payment_status, customer_name,
                    customer_phone, shipping_address)
VALUES ('FULLINV-T4-ORDER', 'FULLINV-T4',
        '[{"productId":"houyi-white-sand","variantId":"2kg","quantity":1,"priceAtPurchase":2498}]'::jsonb,
        7498, 7500, 5000, 0, 'pending', 'pending',
        'FULLINV TEST', '07000000000', 'test');

INSERT INTO order_items_relational (id, order_id, product_id, quantity,
                                    price_at_purchase, total_price, metadata)
VALUES ('FULLINV-T4-LINE', 'FULLINV-T4-ORDER', 'houyi-white-sand', 1, 2498, 2498,
        '{"variantId":"2kg","variantLabel":"2 كغ"}'::jsonb);
-- EXPECT: ERROR  insufficient canonical inventory balance for product
--         houyi-white-sand, variant 2kg, location ...
-- If this INSERT SUCCEEDS, the settlement is unsafe — stop and report.
ROLLBACK;

\echo '--- T4 residue check ---'
SELECT (SELECT count(*) FROM orders WHERE id='FULLINV-T4-ORDER') AS orders,
       (SELECT COALESCE(SUM(quantity_delta),0) FROM inventory_movements
         WHERE product_id='houyi-white-sand' AND variant_id='2kg') AS ledger,
       (SELECT is_active FROM product_variant_reconciliation
         WHERE product_id='houyi-white-sand' AND variant_id='2kg') AS pvr_is_active;
-- EXPECT 0, 0, false


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ TEST 5 — sale then sale_reversal (houyi-connectors-4mm / shape-t)        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
BEGIN;
INSERT INTO orders (id, order_number, items, total, rounded_total, shipping_cost,
                    discount_total, status, payment_status, customer_name,
                    customer_phone, shipping_address)
VALUES ('FULLINV-T5-ORDER', 'FULLINV-T5',
        '[{"productId":"houyi-connectors-4mm","variantId":"shape-t","quantity":1,"priceAtPurchase":175}]'::jsonb,
        5175, 5250, 5000, 0, 'pending', 'pending',
        'FULLINV TEST', '07000000000', 'test');

INSERT INTO order_items_relational (id, order_id, product_id, quantity,
                                    price_at_purchase, total_price, metadata)
VALUES ('FULLINV-T5-LINE', 'FULLINV-T5-ORDER', 'houyi-connectors-4mm', 1, 175, 175,
        '{"variantId":"shape-t","variantLabel":"شكل T (تفريعة ثلاثية)"}'::jsonb);

\echo '--- T5 after sale ---'
SELECT (SELECT COALESCE(SUM(m.quantity_delta),0) FROM inventory_movements m
         WHERE m.product_id='houyi-connectors-4mm' AND m.variant_id='shape-t') AS ledger,
       (SELECT (e->>'stock')::int FROM products p, jsonb_array_elements(p.variants) e
         WHERE p.id='houyi-connectors-4mm' AND e->>'id'='shape-t')             AS storefront;
-- EXPECT 49, 49

-- Reversal through the lifecycle trigger: cancelling the order fires
-- reverse_order_inventory_on_terminal_status. No manual movement is inserted.
UPDATE orders SET status='cancelled' WHERE id='FULLINV-T5-ORDER';

\echo '--- T5 after reversal ---'
SELECT (SELECT COALESCE(SUM(m.quantity_delta),0) FROM inventory_movements m
         WHERE m.product_id='houyi-connectors-4mm' AND m.variant_id='shape-t') AS ledger,
       (SELECT (e->>'stock')::int FROM products p, jsonb_array_elements(p.variants) e
         WHERE p.id='houyi-connectors-4mm' AND e->>'id'='shape-t')             AS storefront;
-- EXPECT 50, 50

-- Both movements hang off source_id = the order id. NOTE: this trigger links the
-- reversal by source_type + idempotency_key, NOT by reversed_movement_id — that
-- column stays NULL here, and that is the correct expected behaviour.
SELECT movement_type, source_type, quantity_delta, variant_id, idempotency_key,
       reversed_movement_id
FROM inventory_movements
WHERE source_id='FULLINV-T5-ORDER'
ORDER BY created_at, movement_type;
-- EXPECT exactly two rows:
--   sale          | order_line            | -1 | shape-t | order_item:FULLINV-T5-LINE            | NULL
--   sale_reversal | order_status_reversal |  1 | shape-t | order_reversal:FULLINV-T5-ORDER:FULLINV-T5-LINE | NULL

-- Cancelling twice must not double-reverse (ON CONFLICT DO NOTHING).
UPDATE orders SET status='rejected' WHERE id='FULLINV-T5-ORDER';
SELECT count(*) FILTER (WHERE movement_type='sale_reversal') AS reversals,
       (SELECT COALESCE(SUM(m.quantity_delta),0) FROM inventory_movements m
         WHERE m.product_id='houyi-connectors-4mm' AND m.variant_id='shape-t') AS ledger
FROM inventory_movements WHERE source_id='FULLINV-T5-ORDER';
-- EXPECT reversals 1, ledger 50 — the second terminal transition adds nothing.
ROLLBACK;

\echo '--- T5 residue check ---'
SELECT (SELECT COALESCE(SUM(m.quantity_delta),0) FROM inventory_movements m
         WHERE m.product_id='houyi-connectors-4mm' AND m.variant_id='shape-t') AS ledger,
       (SELECT count(*) FROM inventory_movements WHERE source_id='FULLINV-T5-ORDER') AS movements,
       (SELECT count(*) FROM orders WHERE id='FULLINV-T5-ORDER') AS orders;
-- EXPECT 50, 0, 0


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ TEST 6 — idempotency: re-running the settlement must be impossible       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
BEGIN;
\echo '--- T6: replay one settlement key. MUST raise unique_violation. ---'
INSERT INTO inventory_movements (product_id, variant_id, location_id, quantity_delta,
                                 movement_type, source_type, source_id, idempotency_key,
                                 currency, happened_at, created_by, metadata)
SELECT m.product_id, m.variant_id, m.location_id, m.quantity_delta,
       m.movement_type, m.source_type, m.source_id, m.idempotency_key,
       m.currency, now(), m.created_by, m.metadata
FROM inventory_movements m
WHERE m.idempotency_key LIKE 'fullinv:test:%'
ORDER BY m.idempotency_key
LIMIT 1;
-- EXPECT: ERROR  duplicate key value violates unique constraint
--         "inventory_movements_idempotency_key_key"
-- Success here would mean the settlement can be applied twice. Stop and report.
ROLLBACK;

\echo '--- T6 residue check ---'
SELECT count(*) AS settlement_movements FROM inventory_movements
WHERE idempotency_key LIKE 'fullinv:test:%';
-- EXPECT 70 — unchanged.


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ FINAL — the branch is exactly as 02 left it                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
\echo '=== FINAL residue sweep. EXPECT zeros and the post-settlement counts. ==='
SELECT
  (SELECT count(*) FROM orders WHERE id LIKE 'FULLINV-T%')                  AS test_orders,
  (SELECT count(*) FROM order_items_relational WHERE id LIKE 'FULLINV-T%')  AS test_lines,
  (SELECT count(*) FROM inventory_movements WHERE source_id LIKE 'FULLINV-T%-ORDER') AS test_movements,
  (SELECT count(*) FROM orders)                                             AS orders_n,
  (SELECT count(*) FROM order_items_relational)                             AS order_items_n,
  (SELECT count(*) FROM inventory_movements)                                AS movements_n,
  (SELECT count(*) FROM inventory_reconciliations)                          AS reconciliations_n,
  (SELECT count(*) FROM notification_log)                                   AS notifications_n,
  (SELECT count(*) FROM accounting_audit_trail)                             AS accounting_n,
  (SELECT count(*) FROM cash_settlements)                                   AS cash_n,
  (SELECT value FROM settings WHERE key='inventory_ledger_mode')            AS ledger_mode;
-- EXPECT: 0 | 0 | 0 | 43 | 201 | 290 | 285 | 170 | 9 | 2 | enforce
