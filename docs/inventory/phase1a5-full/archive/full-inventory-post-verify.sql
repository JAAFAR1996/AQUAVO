-- ============================================================================
-- DEPRECATED — DO NOT EXECUTE
-- Superseded on 2026-07-30 by docs/inventory/phase1a5-full/canonical/
-- Kept for provenance only. This file is NOT a source of truth.
-- ============================================================================

-- ============================================================================
-- full-inventory-post-verify.sql   —   READ-ONLY.
-- Run in a SEPARATE session after the production transaction COMMITted.
-- ============================================================================

-- ── 1. Ledger equals storefront everywhere. Expect ZERO rows. ────────────
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
SELECT pid AS product_id, vid AS variant_id, in_sf, storefront, ledger
FROM j
WHERE (in_sf AND COALESCE(storefront,0) <> COALESCE(ledger,0))
   OR (NOT in_sf AND COALESCE(ledger,0) <> 0);
-- EXPECT: 0 rows.

-- ── 2. Post-commit fingerprints. Compare against the post-backup baseline. ─
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
  (SELECT count(*) FROM inventory_movements)        AS movements_n,
  (SELECT count(*) FROM inventory_reconciliations)  AS reconciliations_n,
  (SELECT count(*) FROM product_variant_reconciliation) AS pvr_n,
  (SELECT count(*) FROM notification_log)           AS notifications_n,
  (SELECT count(*) FROM accounting_audit_trail)     AS accounting_n,
  (SELECT count(*) FROM cost_ledger)                AS cost_ledger_n,
  (SELECT count(*) FROM cash_settlements)           AS cash_settlements_n,
  (SELECT COALESCE(sum(total),0)         FROM orders) AS sum_total,
  (SELECT COALESCE(sum(rounded_total),0) FROM orders) AS sum_rounded_total,
  (SELECT COALESCE(sum(rounded_total),0) FROM orders WHERE status='delivered') AS delivered_revenue,
  (SELECT value FROM settings WHERE key='inventory_ledger_mode') AS ledger_mode;
-- EXPECT: orders_h / order_items_h / costs_h / notifications_n / accounting_n /
--         cost_ledger_n / cash_settlements_n / sum_total / sum_rounded_total /
--         delivered_revenue ALL identical to baseline. ledger_mode = 'enforce'.
--         movements_n and reconciliations_n each = baseline + settlement count.

-- ── 3. Everything written carries the production execution id, nothing else. ─
SELECT movement_type, source_type, source_id,
       count(*) AS n, sum(quantity_delta) AS net_quantity_change,
       min(created_at) AS first_at, max(created_at) AS last_at
FROM inventory_movements
WHERE idempotency_key LIKE 'phase1a5:production:%'
GROUP BY 1,2,3;
-- EXPECT: exactly one row — manual_adjustment / owner_stock_reconciliation /
--         PHASE-1A5-PRODUCTION.

SELECT count(*) AS movements_created_outside_the_settlement
FROM inventory_movements
WHERE created_at >= (SELECT min(created_at) FROM inventory_movements
                      WHERE idempotency_key LIKE 'phase1a5:production:%')
  AND idempotency_key NOT LIKE 'phase1a5:production:%';
-- EXPECT: 0 (any non-zero row here is a real customer order placed during the
--         window — identify it before calling this a defect).

-- ── 4. History is intact. ────────────────────────────────────────────────
SELECT count(*) AS opening_balance_rows, min(created_at) AS earliest, max(created_at) AS latest
FROM inventory_movements WHERE movement_type = 'opening_balance';
-- EXPECT: identical count and timestamps to baseline — the 25/6 stocktake and
--         every opening balance untouched.

SELECT count(*) AS forbidden_type_rows FROM inventory_movements WHERE movement_type = 'adjustment';
-- EXPECT: 0.

-- ── 5. Archived variants stayed archived, at zero. ───────────────────────
SELECT count(*) AS inactive_variants,
       count(*) FILTER (WHERE ledger <> 0) AS inactive_variants_with_nonzero_ledger
FROM (
  SELECT v.product_id, v.variant_id,
         (SELECT COALESCE(SUM(m.quantity_delta),0) FROM inventory_movements m
           WHERE m.product_id=v.product_id AND m.variant_id=v.variant_id) AS ledger
  FROM product_variant_reconciliation v WHERE v.is_active = false) x;
-- EXPECT: inactive_variants_with_nonzero_ledger = 0.

-- ── 6. Storefront was never written by us. ───────────────────────────────
SELECT id, stock, (SELECT COALESCE(SUM((e->>'stock')::int),0) FROM jsonb_array_elements(variants) e) AS variant_sum
FROM products
WHERE COALESCE(has_variants,false)=true
  AND stock <> (SELECT COALESCE(SUM((e->>'stock')::int),0) FROM jsonb_array_elements(variants) e);
-- EXPECT: 0 rows — products.stock is still the trigger-derived sum of variants.

-- ── 7. Site / API check (manual) ─────────────────────────────────────────
--   Open the storefront and confirm the displayed stock numbers are unchanged.
--   Do NOT create a test order on Production.
--   The first REAL customer order after this settlement is the live proof:
--   watch it, confirm the trigger writes exactly one order_line sale movement
--   and that ledger and storefront move together by the ordered quantity.
