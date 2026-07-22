-- ─────────────────────────────────────────────────────────────────────────────
-- Reconciliation backfill: copy order lines that exist ONLY in orders.items
-- (JSONB) into order_items_relational, so analytics/top-selling/inventory stop
-- undercounting (~12 orders / ~539k IQD found in Stage A).
--
-- SAFETY:
--   • Idempotent — an order that already has ANY relational rows is skipped, so
--     re-running never duplicates.
--   • Only inserts lines whose product_id still exists (FK-safe); orphan lines are
--     reported by the dry-run and skipped, never force-inserted.
--   • cost snapshot columns are set to 0 (NO historical cost is fabricated here —
--     these lines are "estimated" downstream; a separate reviewed job may later
--     populate them from product_cost_history).
--   • Every inserted row is tagged metadata.backfilled=true for clean rollback.
--
-- RUN ORDER: (1) apply add_order_item_cost_snapshot.sql first (adds unit_* cols),
--            (2) run the DRY RUN below and eyeball the counts,
--            (3) run the INSERT.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── STEP 1: DRY RUN (read-only) — how many orders/lines would be backfilled ──
WITH missing AS (
  SELECT o.id AS order_id, elem AS item
  FROM orders o
  CROSS JOIN LATERAL jsonb_array_elements(o.items) AS elem
  WHERE o.items IS NOT NULL
    AND jsonb_typeof(o.items) = 'array'
    AND NOT EXISTS (SELECT 1 FROM order_items_relational oi WHERE oi.order_id = o.id)
)
SELECT
  count(DISTINCT order_id)                                                           AS orders_to_backfill,
  count(*)                                                                           AS total_lines,
  count(*) FILTER (WHERE EXISTS (SELECT 1 FROM products p WHERE p.id = item->>'productId')) AS lines_insertable,
  count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id = item->>'productId')) AS lines_skipped_missing_product
FROM missing;

-- ── STEP 2: INSERT (write) — run only after the dry-run looks right ──
INSERT INTO order_items_relational
  (id, order_id, product_id, quantity, price_at_purchase, total_price,
   unit_cost_price, unit_packaging_cost, unit_insert_cost,
   cost_snapshot_status, cost_snapshot_source, cost_snapshot_confidence, metadata)
SELECT
  gen_random_uuid()::text,
  o.id,
  item->>'productId',
  COALESCE(NULLIF(item->>'quantity','')::int, 1),
  COALESCE(NULLIF(item->>'priceAtPurchase','')::numeric, 0),
  COALESCE(
    NULLIF(item->>'lineTotal','')::numeric,
    COALESCE(NULLIF(item->>'priceAtPurchase','')::numeric, 0) * COALESCE(NULLIF(item->>'quantity','')::int, 1)
  ),
  -- Cost is UNKNOWN for these historical JSONB-only lines → NULL, never 0.
  -- (Only use an inline snapshot if the JSONB line already carried one.)
  NULLIF(item->>'costPrice','')::numeric,
  NULLIF(item->>'packagingCost','')::numeric,
  NULLIF(item->>'insertCost','')::numeric,
  CASE WHEN NULLIF(item->>'costPrice','') IS NULL THEN 'unknown' ELSE 'exact' END,
  CASE WHEN NULLIF(item->>'costPrice','') IS NULL THEN 'none'    ELSE 'product_current' END,
  NULL,
  jsonb_strip_nulls(jsonb_build_object(
    'variantId',   item->>'variantId',
    'variantLabel',item->>'variantLabel',
    'backfilled',  true
  ))
FROM orders o
CROSS JOIN LATERAL jsonb_array_elements(o.items) AS item
WHERE o.items IS NOT NULL
  AND jsonb_typeof(o.items) = 'array'
  AND NOT EXISTS (SELECT 1 FROM order_items_relational oi WHERE oi.order_id = o.id)
  AND EXISTS   (SELECT 1 FROM products p WHERE p.id = item->>'productId');

-- ── STEP 3: VERIFY (read-only) — no order should remain fully unbackfilled ──
-- Expect 0 rows for orders that have JSONB lines with a still-existing product
-- but no relational rows.
SELECT o.id
FROM orders o
WHERE o.items IS NOT NULL AND jsonb_typeof(o.items) = 'array'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(o.items) AS it
    WHERE EXISTS (SELECT 1 FROM products p WHERE p.id = it->>'productId')
  )
  AND NOT EXISTS (SELECT 1 FROM order_items_relational oi WHERE oi.order_id = o.id);
