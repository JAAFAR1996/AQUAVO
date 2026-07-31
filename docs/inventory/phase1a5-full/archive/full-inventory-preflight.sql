-- ============================================================================
-- DEPRECATED — DO NOT EXECUTE
-- Superseded on 2026-07-30 by docs/inventory/phase1a5-full/canonical/
-- Kept for provenance only. This file is NOT a source of truth.
-- ============================================================================

-- ============================================================================
-- full-inventory-preflight.sql   —   READ-ONLY. Contains no INSERT/UPDATE/DELETE.
-- Phase 1A.5 FULL | OWNER_CONFIRMED_CURRENT_STOREFRONT_AS_CANONICAL_INVENTORY_TRUTH
-- ============================================================================
-- Run this on Production (br-patient-mouse-a4d4cgr4) AND on the test branch
-- before anything else. Safe to run any number of times, on any branch.
-- ============================================================================

-- ── 0. Identity + mode gate ────────────────────────────────────────────────
SELECT current_database()                                            AS db,
       current_user                                                  AS role,
       version()                                                     AS engine,
       (SELECT id FROM inventory_locations WHERE code='MAIN' AND is_active=true) AS main_location,
       (SELECT value FROM settings WHERE key='inventory_ledger_mode') AS ledger_mode;
-- ABORT unless ledger_mode = 'enforce' and main_location is not null.

-- ── 1. Baseline (record every number before touching anything) ─────────────
SELECT
  (SELECT count(*) FROM orders)                     AS orders_n,
  (SELECT md5(string_agg(concat_ws(':',id,order_number,total::text,rounded_total::text,
       shipping_cost::text,discount_total::text,status,payment_status),'|' ORDER BY id))
     FROM orders)                                   AS orders_h,
  (SELECT count(*) FROM order_items_relational)     AS order_items_n,
  (SELECT md5(string_agg(concat_ws(':',id,order_id,product_id,quantity::text,
       price_at_purchase::text,total_price::text),'|' ORDER BY id))
     FROM order_items_relational)                   AS order_items_h,
  (SELECT md5(string_agg(concat_ws(':',id,COALESCE(unit_cost_price::text,'~'),
       COALESCE(cost_snapshot_source,'~'),COALESCE(cost_snapshot_status,'~')),'|' ORDER BY id))
     FROM order_items_relational)                   AS costs_h,
  (SELECT count(*) FROM products)                   AS products_n,
  (SELECT md5(string_agg(concat_ws(':',id,COALESCE(stock,0)::text,
       COALESCE(has_variants,false)::text,COALESCE(variants::text,'~')),'|' ORDER BY id))
     FROM products)                                 AS products_h,
  (SELECT count(*) FROM inventory_movements)        AS movements_n,
  (SELECT md5(string_agg(concat_ws(':',id,product_id,COALESCE(variant_id,'~'),
       quantity_delta::text,movement_type,COALESCE(idempotency_key,'~')),'|' ORDER BY id))
     FROM inventory_movements)                      AS movements_h,
  (SELECT count(*) FROM inventory_reconciliations)  AS reconciliations_n,
  (SELECT count(*) FROM product_variant_reconciliation) AS pvr_n,
  (SELECT md5(string_agg(concat_ws(':',product_id,variant_id,COALESCE(observed_stock,-1)::text,
       COALESCE(approved_canonical_stock,-1)::text,reconciliation_status,is_active::text),
       '|' ORDER BY product_id,variant_id))
     FROM product_variant_reconciliation)           AS pvr_h,
  (SELECT count(*) FROM notification_log)           AS notifications_n,
  (SELECT count(*) FROM accounting_audit_trail)     AS accounting_n,
  (SELECT count(*) FROM cost_ledger)                AS cost_ledger_n,
  (SELECT count(*) FROM cash_settlements)           AS cash_settlements_n,
  (SELECT COALESCE(sum(total),0)         FROM orders) AS sum_total,
  (SELECT COALESCE(sum(rounded_total),0) FROM orders) AS sum_rounded_total,
  (SELECT COALESCE(sum(rounded_total),0) FROM orders WHERE status='delivered') AS delivered_revenue,
  (SELECT count(*) FROM orders WHERE status='delivered') AS delivered_orders;

-- ── 2. Category counts + net movement (the go/no-go summary) ───────────────
-- >>> paste _canonical_plan.sql here <<<
SELECT category,
       count(*)                            AS rows,
       sum(adjustment)                     AS net_quantity_change,
       count(*) FILTER (WHERE adjustment = 0) AS zero_adjustment_rows
FROM plan
GROUP BY category
ORDER BY category;
-- ABORT if category 'D' has any row. D is never auto-corrected.

-- ── 3. Full executable plan, row by row ────────────────────────────────────
-- >>> paste _canonical_plan.sql here <<<
SELECT p.category, p.product_id, pr.name AS product_name,
       COALESCE(pr.has_variants,false) AS has_variants,
       p.variant_id,
       v.label AS variant_label,
       p.storefront AS storefront_stock,
       p.ledger     AS ledger_balance,
       p.adjustment AS adjustment_required,
       p.target_balance,
       p.movement_count,
       (SELECT m.movement_type FROM inventory_movements m
         WHERE m.product_id = p.product_id
           AND m.variant_id IS NOT DISTINCT FROM p.variant_id
         ORDER BY m.created_at DESC, m.id DESC LIMIT 1)     AS latest_movement_type,
       (SELECT max(m.created_at) FROM inventory_movements m
         WHERE m.product_id = p.product_id
           AND m.variant_id IS NOT DISTINCT FROM p.variant_id) AS latest_movement_at,
       (SELECT m.source_id FROM inventory_movements m
         WHERE m.product_id = p.product_id
           AND m.variant_id IS NOT DISTINCT FROM p.variant_id
           AND m.movement_type IN ('sale','sale_reversal')
         ORDER BY m.created_at DESC LIMIT 1)                AS latest_order_id,
       p.in_storefront                                      AS is_currently_sold_on_website,
       v.reconciliation_status                              AS pvr_status,
       v.is_active                                          AS pvr_is_active,
       CASE WHEN p.category='D' THEN 'BLOCKED'
            WHEN (SELECT count(*) FROM inventory_movements m
                   WHERE m.product_id=p.product_id
                     AND m.variant_id IS NOT DISTINCT FROM p.variant_id
                     AND m.movement_type IN ('sale','sale_reversal')) > 0 THEN 'MEDIUM'
            ELSE 'LOW' END                                  AS risk,
       CASE p.category
         WHEN 'A' THEN 'manual_adjustment -> storefront'
         WHEN 'B' THEN 'manual_adjustment -> 0 (variant already archived)'
         WHEN 'C' THEN 'manual_adjustment 0 -> storefront (NOT opening_balance)'
         ELSE 'BLOCKED_FOR_OWNER_REVIEW' END               AS proposed_action,
       md5(concat_ws('|', p.product_id, COALESCE(p.variant_id,'NULL'),
            (SELECT id FROM inventory_locations WHERE code='MAIN' AND is_active=true),
            COALESCE(p.storefront,-1)::text, COALESCE(p.ledger,-999999)::text,
            p.movement_count::text))                        AS before_hash
FROM plan p
JOIN products pr ON pr.id = p.product_id
LEFT JOIN product_variant_reconciliation v
       ON v.product_id = p.product_id AND v.variant_id = p.variant_id
WHERE p.category IN ('A','B','C','D')
ORDER BY p.category, p.product_id, p.variant_id NULLS FIRST;

-- ── 4. Guard rails that must all pass before apply ─────────────────────────
SELECT
  (SELECT count(*) FROM inventory_movements
     WHERE source_id = 'PHASE-1A5-PRODUCTION'
        OR idempotency_key LIKE 'phase1a5:production:%')      AS existing_production_keys,   -- must be 0
  (SELECT count(*) FROM inventory_movements
     WHERE location_id <> (SELECT id FROM inventory_locations WHERE code='MAIN')) AS non_main_movements, -- must be 0
  (SELECT count(*) FROM inventory_movements m
     LEFT JOIN products p ON p.id = m.product_id WHERE p.id IS NULL) AS orphan_product_movements,        -- must be 0
  (SELECT count(*) FROM inventory_reconciliations
     WHERE status IN ('pending','count_required','counted','approved')) AS active_reconciliation_rows;
-- active_reconciliation_rows > 0 does NOT block: we insert with status='applied',
-- which sits outside inventory_reconciliations_active_unique_idx (partial index).

-- ── 5. Constraint / trigger inventory (prove nothing changed under us) ─────
SELECT conname, pg_get_constraintdef(oid) AS def, conrelid::regclass::text AS tbl
FROM pg_constraint
WHERE conrelid IN ('inventory_movements'::regclass,
                   'inventory_reconciliations'::regclass,
                   'product_variant_reconciliation'::regclass)
ORDER BY tbl, conname;

SELECT c.relname AS tbl, t.tgname, t.tgenabled
FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
WHERE NOT t.tgisinternal
  AND c.relname IN ('inventory_movements','products','product_variant_reconciliation')
ORDER BY c.relname, t.tgname;
-- every tgenabled must be 'O' (enabled, origin). Anything else = ABORT.
