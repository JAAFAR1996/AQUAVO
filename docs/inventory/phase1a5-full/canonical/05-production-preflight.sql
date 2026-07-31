-- ============================================================================
-- 05-production-preflight.sql   —   READ-ONLY. Zero INSERT/UPDATE/DELETE.
-- TARGET: Production br-patient-mouse-a4d4cgr4
-- Run TWICE: once before requesting owner approval, and AGAIN immediately after
-- the backup branch is created, before 06 executes.
-- ============================================================================

\echo '=== 1. identity — must be Production ==='
SELECT current_database()                                                        AS db,
       current_user                                                              AS role,
       version()                                                                 AS engine,
       (SELECT id FROM inventory_locations WHERE code='MAIN' AND is_active=true) AS main_location,
       (SELECT count(*) FROM inventory_locations)                                AS locations_total,
       (SELECT value FROM settings WHERE key='inventory_ledger_mode')            AS ledger_mode,
       now() AT TIME ZONE 'utc'                                                  AS utc_now;
-- ABORT unless ledger_mode='enforce' and main_location resolves.
-- Confirm out-of-band that you are on br-patient-mouse-a4d4cgr4 (name=production,
-- default=true, primary=true, parent=None) — SQL alone cannot prove the branch id.

\echo '=== 2. baseline (record; compare against LAST_VERIFIED_STATE.json) ==='
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

\echo '=== 3. no prior production settlement exists ==='
SELECT count(*) AS existing_production_settlement_rows
FROM inventory_movements
WHERE source_id = 'FULL-INVENTORY-STOREFRONT-TRUTH-PRODUCTION'
   OR idempotency_key LIKE 'fullinv:production:%';
-- MUST be 0.

\echo '=== 4. classification, rebuilt from scratch ==='
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
             (sf.product_id IS NOT NULL)             AS storefront_present,
             sf.storefront, led.ledger
      FROM sf FULL OUTER JOIN led
        ON led.product_id=sf.product_id AND led.variant_id IS NOT DISTINCT FROM sf.variant_id)
SELECT CASE
         WHEN storefront_present AND ledger IS NOT NULL AND COALESCE(storefront,0)<>ledger THEN 'A'
         WHEN NOT storefront_present AND variant_id IS NOT NULL                            THEN 'B'
         WHEN storefront_present AND ledger IS NULL AND COALESCE(storefront,0)>0           THEN 'C'
         WHEN storefront_present AND ledger IS NULL AND COALESCE(storefront,0)=0           THEN 'NOOP'
         WHEN storefront_present AND ledger IS NOT NULL AND COALESCE(storefront,0)=ledger  THEN 'MATCH'
         ELSE 'D' END AS category,
       count(*) AS rows,
       sum(CASE
             WHEN storefront_present AND ledger IS NOT NULL         THEN COALESCE(storefront,0)-ledger
             WHEN NOT storefront_present AND variant_id IS NOT NULL THEN 0-ledger
             WHEN storefront_present AND ledger IS NULL             THEN COALESCE(storefront,0)
           END) AS net_adjustment
FROM j GROUP BY 1 ORDER BY 1;
-- Baseline of 2026-07-30T04:32:58Z: A 45 (-293) | B 23 (-135) | C 2 (+6)
--                                   MATCH 117 | NOOP 17 | D absent.
--
-- A DIFFERENT RESULT IS NOT AUTOMATICALLY A FAILURE. Classify the cause with
-- query 5 before deciding:
--   * a real new order  -> recompute and continue (06 recomputes under lock anyway)
--   * a product edit / variant added or removed -> re-read the row detail
--   * ANY category D    -> STOP. OWNER_REVIEW_REQUIRED. Never auto-correct D.

\echo '=== 5. what moved since the baseline (explains any drift) ==='
SELECT id, product_id, variant_id, movement_type, quantity_delta,
       source_type, source_id, created_by, created_at
FROM inventory_movements
WHERE created_at > TIMESTAMPTZ '2026-07-30 04:32:58Z'
ORDER BY created_at;

SELECT id, order_number, status, payment_status, created_at
FROM orders
WHERE created_at > TIMESTAMP '2026-07-30 04:32:58'
ORDER BY created_at;

\echo '=== 6. category D detail — if any row appears here, STOP ==='
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
             (sf.product_id IS NOT NULL)             AS storefront_present,
             sf.storefront, led.ledger
      FROM sf FULL OUTER JOIN led
        ON led.product_id=sf.product_id AND led.variant_id IS NOT DISTINCT FROM sf.variant_id)
SELECT 'BLOCKED_FOR_OWNER_REVIEW' AS action, j.*
FROM j
WHERE NOT (
      (storefront_present AND ledger IS NOT NULL)
   OR (NOT storefront_present AND variant_id IS NOT NULL)
   OR (storefront_present AND ledger IS NULL));
-- EXPECT 0 rows. A row here means a ledger entry exists for variant_id IS NULL on
-- a product that now has variants, or another shape none of A/B/C describes.

\echo '=== 7. category B archiving is already in place ==='
SELECT count(*) FILTER (WHERE is_active=false) AS archived,
       count(*) FILTER (WHERE is_active=true)  AS active
FROM product_variant_reconciliation;
-- archived MUST equal the Category B count from query 4 (baseline: 23 / 97).
-- If a Category B row is still active, STOP: sync_product_variant_reconciliation
-- has not archived it, and 06 will abort rather than flip the flag by hand.

\echo '=== 8. hygiene — all zero ==='
SELECT
  (SELECT count(*) FROM inventory_movements WHERE movement_type='adjustment')     AS forbidden_type_rows,
  (SELECT count(*) FROM inventory_movements
     WHERE location_id <> (SELECT id FROM inventory_locations WHERE code='MAIN')) AS non_main_movements,
  (SELECT count(*) FROM inventory_movements m
     LEFT JOIN products p ON p.id=m.product_id WHERE p.id IS NULL)                AS orphan_movements,
  (SELECT count(*) FROM inventory_reconciliations
     WHERE status IN ('pending','count_required','counted','approved'))           AS active_recon_rows,
  (SELECT count(*) FROM inventory_movements WHERE movement_type='opening_balance') AS opening_balance_rows;
-- opening_balance_rows is recorded, not zero-checked: baseline 185. It must be
-- IDENTICAL after 06 — the 25/6 stocktake is never touched.
