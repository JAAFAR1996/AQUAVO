-- ============================================================================
-- DEPRECATED — DO NOT EXECUTE
-- Superseded on 2026-07-30 by docs/inventory/phase1a5-full/canonical/
-- Kept for provenance only. This file is NOT a source of truth.
-- ============================================================================

-- ============================================================================
-- full-inventory-test-verify.sql   —   READ-ONLY.
-- Run on the TEST BRANCH after full-inventory-test-apply.sql has COMMITted.
-- Every query below must return the stated expectation, or the run is a failure.
-- ============================================================================

-- ── 1. Did anything remain unsettled? Expect ZERO rows. ───────────────────
-- (Re-runs the canonical classification from scratch: if the settlement worked,
--  categories A/B/C must be empty and everything is MATCH or NOOP.)
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
SELECT pid, vid, in_sf, storefront, ledger
FROM j
WHERE (in_sf AND COALESCE(storefront,0) <> COALESCE(ledger,0))
   OR (NOT in_sf AND COALESCE(ledger,0) <> 0);
-- EXPECT: 0 rows.

-- ── 2. Exactly the planned movements were written, nothing else. ──────────
SELECT movement_type, source_type, source_id, count(*) AS n, sum(quantity_delta) AS net
FROM inventory_movements
WHERE idempotency_key LIKE 'phase1a5:test:%'
GROUP BY 1,2,3;
-- EXPECT: one row — manual_adjustment / owner_stock_reconciliation / PHASE-1A5-TEST.

SELECT count(*) AS unexpected_new_movement_types
FROM inventory_movements
WHERE created_at > (SELECT min(created_at) FROM inventory_movements
                     WHERE idempotency_key LIKE 'phase1a5:test:%')
  AND idempotency_key NOT LIKE 'phase1a5:test:%';
-- EXPECT: 0 — no sale / purchase / opening_balance appeared as a side effect.

-- ── 3. No storefront was written by us. ───────────────────────────────────
-- The projection trigger may rewrite products.stock / variants[].stock, but the
-- value it writes must equal what was already there. Expect ZERO rows.
WITH loc AS (SELECT id FROM inventory_locations WHERE code='MAIN' AND is_active=true LIMIT 1)
SELECT p.id, e->>'id' AS variant_id, (e->>'stock')::int AS storefront,
       (SELECT COALESCE(SUM(m.quantity_delta),0) FROM inventory_movements m, loc
         WHERE m.product_id=p.id AND m.variant_id = e->>'id' AND m.location_id=loc.id) AS ledger
FROM products p, jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) e
WHERE COALESCE(p.has_variants,false)=true
  AND (e->>'stock')::int <> (SELECT COALESCE(SUM(m.quantity_delta),0) FROM inventory_movements m, loc
                              WHERE m.product_id=p.id AND m.variant_id=e->>'id' AND m.location_id=loc.id);
-- EXPECT: 0 rows.

-- products.stock for variant products must still equal the sum of its variants.
SELECT id, stock, (SELECT SUM((e->>'stock')::int) FROM jsonb_array_elements(variants) e) AS variant_sum
FROM products
WHERE COALESCE(has_variants,false)=true
  AND stock <> (SELECT COALESCE(SUM((e->>'stock')::int),0) FROM jsonb_array_elements(variants) e);
-- EXPECT: 0 rows.

-- ── 4. Category B: archived variants reached 0 and stayed archived. ───────
SELECT v.product_id, v.variant_id, v.is_active, v.reconciliation_status,
       v.observed_stock, v.approved_canonical_stock,
       (SELECT COALESCE(SUM(m.quantity_delta),0) FROM inventory_movements m
         WHERE m.product_id=v.product_id AND m.variant_id=v.variant_id) AS ledger
FROM product_variant_reconciliation v
WHERE v.is_active = false
ORDER BY 1,2;
-- EXPECT: every row ledger = 0, is_active still false, and the variant still
--         absent from products.variants (nothing was resurrected).

SELECT count(*) AS resurrected_variants
FROM product_variant_reconciliation v
JOIN products p ON p.id = v.product_id
WHERE v.is_active = false
  AND EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) z
               WHERE z->>'id' = v.variant_id);
-- EXPECT: 0.

-- ── 5. Nothing financial moved. Compare to the preflight baseline. ────────
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
  (SELECT count(*) FROM notification_log)           AS notifications_n,
  (SELECT count(*) FROM accounting_audit_trail)     AS accounting_n,
  (SELECT count(*) FROM cash_settlements)           AS cash_settlements_n,
  (SELECT COALESCE(sum(rounded_total),0) FROM orders WHERE status='delivered') AS delivered_revenue,
  (SELECT count(*) FROM inventory_movements)        AS movements_n,
  (SELECT count(*) FROM inventory_reconciliations)  AS reconciliations_n;
-- EXPECT: orders/order_items/costs/notifications/accounting/cash/revenue IDENTICAL
--         to preflight. movements_n and reconciliations_n each grew by exactly
--         the number of settlement rows, and by nothing else.

-- ── 6. Ledger mode never changed. ────────────────────────────────────────
SELECT value FROM settings WHERE key='inventory_ledger_mode';  -- EXPECT: enforce
