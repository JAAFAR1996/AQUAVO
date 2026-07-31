-- ============================================================================
-- 00-baseline.sql   —   READ-ONLY. No INSERT/UPDATE/DELETE anywhere in this file.
-- Run on the NEW test branch immediately after creating it, before 01.
-- ============================================================================

\echo '=== identity + mode ==='
SELECT current_database()                                                        AS db,
       current_user                                                              AS role,
       version()                                                                 AS engine,
       (SELECT id FROM inventory_locations WHERE code='MAIN' AND is_active=true) AS main_location,
       (SELECT value FROM settings WHERE key='inventory_ledger_mode')            AS ledger_mode,
       now() AT TIME ZONE 'utc'                                                  AS utc_now;
-- ABORT unless ledger_mode='enforce' and main_location='3bbe2906-3b51-44dd-825d-af94c4acf526'.

\echo '=== baseline counts + fingerprints (must equal Production) ==='
SELECT
  (SELECT count(*) FROM orders)                                                  AS orders_n,
  (SELECT md5(string_agg(concat_ws(':',id,order_number,total::text,rounded_total::text,
       shipping_cost::text,discount_total::text,status,payment_status),'|' ORDER BY id))
     FROM orders)                                                                AS orders_h,
  (SELECT count(*) FROM order_items_relational)                                  AS order_items_n,
  (SELECT md5(string_agg(concat_ws(':',id,order_id,product_id,quantity::text,
       price_at_purchase::text,total_price::text),'|' ORDER BY id))
     FROM order_items_relational)                                                AS order_items_h,
  (SELECT md5(string_agg(concat_ws(':',id,COALESCE(unit_cost_price::text,'~'),
       COALESCE(cost_snapshot_source,'~'),COALESCE(cost_snapshot_status,'~')),'|' ORDER BY id))
     FROM order_items_relational)                                                AS costs_h,
  (SELECT count(*) FROM products)                                                AS products_n,
  (SELECT md5(string_agg(concat_ws(':',id,COALESCE(stock,0)::text,
       COALESCE(has_variants,false)::text,COALESCE(variants::text,'~')),'|' ORDER BY id))
     FROM products)                                                              AS products_h,
  (SELECT count(*) FROM inventory_movements)                                     AS movements_n,
  (SELECT md5(string_agg(concat_ws(':',id,product_id,COALESCE(variant_id,'~'),
       quantity_delta::text,movement_type,COALESCE(idempotency_key,'~')),'|' ORDER BY id))
     FROM inventory_movements)                                                   AS movements_h,
  (SELECT count(*) FROM inventory_reconciliations)                               AS reconciliations_n,
  (SELECT count(*) FROM product_variant_reconciliation)                          AS pvr_n,
  (SELECT md5(string_agg(concat_ws(':',product_id,variant_id,COALESCE(observed_stock,-1)::text,
       COALESCE(approved_canonical_stock,-1)::text,reconciliation_status,is_active::text),
       '|' ORDER BY product_id,variant_id))
     FROM product_variant_reconciliation)                                        AS pvr_h,
  (SELECT count(*) FROM notification_log)                                        AS notifications_n,
  (SELECT count(*) FROM accounting_audit_trail)                                  AS accounting_n,
  (SELECT count(*) FROM cost_ledger)                                             AS cost_ledger_n,
  (SELECT count(*) FROM cash_settlements)                                        AS cash_settlements_n,
  (SELECT COALESCE(sum(total),0)         FROM orders)                            AS sum_total,
  (SELECT COALESCE(sum(rounded_total),0) FROM orders)                            AS sum_rounded_total,
  (SELECT COALESCE(sum(rounded_total),0) FROM orders WHERE status='delivered')   AS delivered_revenue,
  (SELECT count(*) FROM orders WHERE status='delivered')                         AS delivered_orders;
-- EXPECTED (a fresh child of Production is byte-identical):
--   orders_n 43            orders_h        ca3b1e066ad48a9147747db36fff4693
--   order_items_n 201      order_items_h   46eea063a9368999912fbbc620bb6714
--                          costs_h         ff7a08ed5ad808c648d53970343f2c5d
--   products_n 114         products_h      cc11f2eca746af38b78812c23241da86
--   movements_n 220        movements_h     1fbe8afbd7825f0d796daca6333b5a8f
--   reconciliations_n 215  pvr_n 120       pvr_h 3720adcda7eef5e8c2c01e0f4c04bed3
--   notifications_n 170    accounting_n 9  cost_ledger_n 6   cash_settlements_n 2
--   sum_total 2206314.00   sum_rounded_total 2155920.00
--   delivered_revenue 1967920.00           delivered_orders 39

\echo '=== the branch must be clean of any prior test run ==='
SELECT count(*) AS prior_test_movements
FROM inventory_movements
WHERE idempotency_key LIKE 'fullinv:test:%'
   OR idempotency_key LIKE 'phase1a5:%'
   OR source_id IN ('FULL-INVENTORY-STOREFRONT-TRUTH-TEST','PHASE-1A5-TEST','PHASE-1A5-PRODUCTION');
-- EXPECT 0. Non-zero means you are on the OLD branch — stop and create a fresh one.

\echo '=== category counts to be settled ==='
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
j AS (SELECT COALESCE(sf.product_id,led.product_id) AS product_id,
             COALESCE(sf.variant_id,led.variant_id)  AS variant_id,
             (sf.product_id IS NOT NULL)             AS in_storefront,
             sf.storefront, led.ledger
      FROM sf FULL OUTER JOIN led
        ON led.product_id=sf.product_id AND led.variant_id IS NOT DISTINCT FROM sf.variant_id)
SELECT CASE
         WHEN in_storefront AND ledger IS NOT NULL AND COALESCE(storefront,0)<>ledger THEN 'A'
         WHEN NOT in_storefront AND variant_id IS NOT NULL                            THEN 'B'
         WHEN in_storefront AND ledger IS NULL AND COALESCE(storefront,0)>0           THEN 'C'
         WHEN in_storefront AND ledger IS NULL AND COALESCE(storefront,0)=0           THEN 'NOOP'
         WHEN in_storefront AND ledger IS NOT NULL AND COALESCE(storefront,0)=ledger  THEN 'MATCH'
         ELSE 'D' END AS category,
       count(*) AS rows,
       sum(CASE
             WHEN in_storefront AND ledger IS NOT NULL         THEN COALESCE(storefront,0)-ledger
             WHEN NOT in_storefront AND variant_id IS NOT NULL THEN 0-ledger
             WHEN in_storefront AND ledger IS NULL             THEN COALESCE(storefront,0)
           END) AS net_quantity_change
FROM j GROUP BY 1 ORDER BY 1;
-- EXPECT: A 45 (-293) | B 23 (-135) | C 2 (+6) | MATCH 117 | NOOP 17 | D absent.
-- Any D row => STOP. D is never auto-corrected.

\echo '=== category B: the archiving mechanism must already have run ==='
SELECT count(*) FILTER (WHERE is_active=false) AS archived,
       count(*) FILTER (WHERE is_active=true)  AS active
FROM product_variant_reconciliation;
-- EXPECT archived = 23 (exactly the Category B count), active = 97.

\echo '=== constraints (must match what the runbook was written against) ==='
SELECT conrelid::regclass::text AS tbl, conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conrelid IN ('inventory_movements'::regclass,
                   'inventory_reconciliations'::regclass,
                   'product_variant_reconciliation'::regclass)
ORDER BY 1,2;
-- KEY EXPECTATIONS:
--   inventory_movements_type_check          accepts 'manual_adjustment', and the
--                                           forbidden 'adjustment' is NOT in the list
--   inventory_movements_idempotency_key_key UNIQUE (idempotency_key)
--   inventory_movements_quantity_check      CHECK (quantity_delta <> 0)
--   inventory_movements_variant_fk          FK (product_id,variant_id)
--                                           -> product_variant_reconciliation
--                                           (NOT enforced when variant_id IS NULL)
--   product_variant_reconciliation_status_check
--                                           pending|conflict|counted|approved|rejected

\echo '=== triggers (every tgenabled must be O) ==='
SELECT c.relname AS tbl, t.tgname, t.tgenabled
FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
WHERE NOT t.tgisinternal
  AND c.relname IN ('inventory_movements','products','order_items_relational','orders')
ORDER BY 1,2;
-- Anything other than 'O' = ABORT. The settlement depends on these firing:
--   inventory_movements_prevent_negative        BEFORE INSERT
--   inventory_movements_project_product_stock   AFTER INSERT  (writes the storefront)
--   inventory_movements_immutable               BEFORE UPDATE/DELETE
--   products_a_enforce_variant_stock_projection BEFORE INSERT/UPDATE OF variants
--   products_sync_variant_reconciliation        AFTER INSERT/UPDATE OF variants
--   order_items_record_inventory_sale           AFTER INSERT (the real order path)
--   orders_reverse_inventory_on_terminal_status AFTER UPDATE OF status

\echo '=== unique index that governs reconciliation status ==='
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename='inventory_reconciliations' ORDER BY 1;
-- inventory_reconciliations_active_unique_idx is PARTIAL over
-- (pending, count_required, counted, approved). We insert status='applied',
-- which is outside it, so it can never collide.

\echo '=== hygiene: all must be 0 ==='
SELECT
  (SELECT count(*) FROM inventory_movements WHERE movement_type='adjustment')        AS forbidden_type_rows,
  (SELECT count(*) FROM inventory_movements
     WHERE location_id <> (SELECT id FROM inventory_locations WHERE code='MAIN'))    AS non_main_movements,
  (SELECT count(*) FROM inventory_movements m
     LEFT JOIN products p ON p.id=m.product_id WHERE p.id IS NULL)                   AS orphan_movements,
  (SELECT count(*) FROM inventory_reconciliations
     WHERE status IN ('pending','count_required','counted','approved'))              AS active_recon_rows;
