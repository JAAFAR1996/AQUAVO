-- ============================================================================
-- RECONCILIATION REPORT — orders.items (JSONB) vs order_items_relational
-- ============================================================================
-- READ-ONLY. No writes, no DDL, no transaction control. Safe on production.
--
-- Run this BEFORE and AFTER backfill_orderitems_from_jsonb.sql. It defines the
-- CANONICAL LINE IDENTITY used by the backfill, so the two can never disagree:
--
--   (order_id, product_id, variant_key, quantity, price_at_purchase,
--    total_price, occurrence_rank)
--
-- variant_key is normalized deterministically:
--   variantId  → else lower(trim(variantLabel))  → else '~none~'
-- For relational rows the same fields are read from frozen `metadata`.
--
-- A line is VALID only when every commercial fact is really present. Quantity is
-- never defaulted to 1 and price is never defaulted to 0 — inventing either would
-- fabricate historical commercial evidence.
-- ============================================================================

-- ── REPORT A: line validity, by reason code ────────────────────────────────
WITH j_raw AS (
  SELECT o.id AS order_id, e.ord AS jsonb_index, e.item
  FROM orders o
  CROSS JOIN LATERAL jsonb_array_elements(o.items) WITH ORDINALITY AS e(item, ord)
  WHERE jsonb_typeof(o.items) = 'array'
),
j_parsed AS (
  SELECT order_id, jsonb_index, item,
    NULLIF(btrim(item->>'productId'), '')        AS product_id,
    NULLIF(btrim(item->>'quantity'), '')         AS q_txt,
    NULLIF(btrim(item->>'priceAtPurchase'), '')  AS p_txt,
    NULLIF(btrim(item->>'lineTotal'), '')        AS t_txt
  FROM j_raw
),
j_typed AS (
  SELECT *,
    CASE WHEN q_txt ~ '^[0-9]+$'                 THEN q_txt::numeric END AS qty,
    CASE WHEN p_txt ~ '^[0-9]+(\.[0-9]+)?$'      THEN p_txt::numeric END AS price,
    CASE WHEN t_txt ~ '^[0-9]+(\.[0-9]+)?$'      THEN t_txt::numeric END AS total
  FROM j_parsed
),
j_classified AS (
  SELECT *,
    CASE
      WHEN jsonb_typeof(item) <> 'object'                                    THEN 'malformed_jsonb_line'
      WHEN product_id IS NULL                                                THEN 'missing_product_id'
      WHEN NOT EXISTS (SELECT 1 FROM products p WHERE p.id = product_id)     THEN 'missing_product'
      WHEN q_txt IS NULL OR qty IS NULL OR qty <= 0                          THEN 'invalid_quantity'
      WHEN p_txt IS NULL                                                     THEN 'missing_price'
      WHEN price IS NULL                                                     THEN 'invalid_price'
      WHEN t_txt IS NOT NULL AND total IS NULL                               THEN 'invalid_total'
      WHEN t_txt IS NOT NULL AND total <> qty * price                        THEN 'total_mismatch'
      ELSE NULL
    END AS reason_code
  FROM j_typed
)
SELECT
  COALESCE(reason_code, '(valid)') AS reason_code,
  count(*)                         AS lines,
  count(DISTINCT order_id)         AS orders_affected
FROM j_classified
GROUP BY 1
ORDER BY 2 DESC, 1;


-- ── REPORT B: unresolved lines in detail (order id + position only, no PII) ─
WITH j_raw AS (
  SELECT o.id AS order_id, e.ord AS jsonb_index, e.item
  FROM orders o
  CROSS JOIN LATERAL jsonb_array_elements(o.items) WITH ORDINALITY AS e(item, ord)
  WHERE jsonb_typeof(o.items) = 'array'
),
j_parsed AS (
  SELECT order_id, jsonb_index, item,
    NULLIF(btrim(item->>'productId'), '')       AS product_id,
    NULLIF(btrim(item->>'quantity'), '')        AS q_txt,
    NULLIF(btrim(item->>'priceAtPurchase'), '') AS p_txt,
    NULLIF(btrim(item->>'lineTotal'), '')       AS t_txt
  FROM j_raw
),
j_typed AS (
  SELECT *,
    CASE WHEN q_txt ~ '^[0-9]+$'            THEN q_txt::numeric END AS qty,
    CASE WHEN p_txt ~ '^[0-9]+(\.[0-9]+)?$' THEN p_txt::numeric END AS price,
    CASE WHEN t_txt ~ '^[0-9]+(\.[0-9]+)?$' THEN t_txt::numeric END AS total
  FROM j_parsed
)
SELECT order_id, jsonb_index, product_id, q_txt AS quantity_raw, p_txt AS price_raw, t_txt AS total_raw,
  CASE
    WHEN jsonb_typeof(item) <> 'object'                                THEN 'malformed_jsonb_line'
    WHEN product_id IS NULL                                            THEN 'missing_product_id'
    WHEN NOT EXISTS (SELECT 1 FROM products p WHERE p.id = product_id) THEN 'missing_product'
    WHEN q_txt IS NULL OR qty IS NULL OR qty <= 0                      THEN 'invalid_quantity'
    WHEN p_txt IS NULL                                                 THEN 'missing_price'
    WHEN price IS NULL                                                 THEN 'invalid_price'
    WHEN t_txt IS NOT NULL AND total IS NULL                           THEN 'invalid_total'
    WHEN t_txt IS NOT NULL AND total <> qty * price                    THEN 'total_mismatch'
  END AS reason_code
FROM j_typed
WHERE (CASE
    WHEN jsonb_typeof(item) <> 'object'                                THEN 'malformed_jsonb_line'
    WHEN product_id IS NULL                                            THEN 'missing_product_id'
    WHEN NOT EXISTS (SELECT 1 FROM products p WHERE p.id = product_id) THEN 'missing_product'
    WHEN q_txt IS NULL OR qty IS NULL OR qty <= 0                      THEN 'invalid_quantity'
    WHEN p_txt IS NULL                                                 THEN 'missing_price'
    WHEN price IS NULL                                                 THEN 'invalid_price'
    WHEN t_txt IS NOT NULL AND total IS NULL                           THEN 'invalid_total'
    WHEN t_txt IS NOT NULL AND total <> qty * price                    THEN 'total_mismatch'
  END) IS NOT NULL
ORDER BY order_id, jsonb_index;


-- ── REPORT C: canonical reconciliation summary ─────────────────────────────
-- exact matches · missing lines · surplus relational rows · ambiguous groups ·
-- metadata disagreements.
WITH j_raw AS (
  SELECT o.id AS order_id, e.ord AS jsonb_index, e.item
  FROM orders o
  CROSS JOIN LATERAL jsonb_array_elements(o.items) WITH ORDINALITY AS e(item, ord)
  WHERE jsonb_typeof(o.items) = 'array'
),
j_typed AS (
  SELECT order_id, jsonb_index, item,
    NULLIF(btrim(item->>'productId'), '') AS product_id,
    COALESCE(NULLIF(btrim(item->>'variantId'), ''),
             NULLIF(lower(btrim(item->>'variantLabel')), ''),
             '~none~')                    AS variant_key,
    CASE WHEN NULLIF(btrim(item->>'quantity'),'') ~ '^[0-9]+$'
         THEN NULLIF(btrim(item->>'quantity'),'')::numeric END AS qty,
    CASE WHEN NULLIF(btrim(item->>'priceAtPurchase'),'') ~ '^[0-9]+(\.[0-9]+)?$'
         THEN NULLIF(btrim(item->>'priceAtPurchase'),'')::numeric END AS price,
    CASE WHEN NULLIF(btrim(item->>'lineTotal'),'') ~ '^[0-9]+(\.[0-9]+)?$'
         THEN NULLIF(btrim(item->>'lineTotal'),'')::numeric END AS total
  FROM j_raw
),
j_valid AS (
  SELECT order_id, jsonb_index, product_id, variant_key, qty::int AS quantity,
         price AS price_at_purchase, COALESCE(total, qty * price) AS total_price
  FROM j_typed
  WHERE product_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM products p WHERE p.id = product_id)
    AND qty IS NOT NULL AND qty > 0
    AND price IS NOT NULL
    AND (total IS NULL OR total = qty * price)
),
j_ranked AS (
  SELECT *, row_number() OVER (
    PARTITION BY order_id, product_id, variant_key, quantity, price_at_purchase, total_price
    ORDER BY jsonb_index) AS occ
  FROM j_valid
),
r_base AS (
  SELECT id, order_id, product_id, quantity, price_at_purchase, total_price,
    COALESCE(NULLIF(btrim(metadata->>'variantId'), ''),
             NULLIF(lower(btrim(metadata->>'variantLabel')), ''),
             '~none~') AS variant_key
  FROM order_items_relational
),
r_ranked AS (
  SELECT *, row_number() OVER (
    PARTITION BY order_id, product_id, variant_key, quantity, price_at_purchase, total_price
    ORDER BY id) AS occ
  FROM r_base
),
-- A (order, product, qty, price) cluster is AMBIGUOUS when the JSONB side holds
-- more than one variant AND some relational row carries no variant metadata:
-- that row cannot be proven to represent any particular duplicate line.
cluster_ambig AS (
  SELECT order_id, product_id, quantity, price_at_purchase
  FROM j_ranked GROUP BY 1,2,3,4 HAVING count(DISTINCT variant_key) > 1
  INTERSECT
  SELECT order_id, product_id, quantity, price_at_purchase
  FROM r_ranked WHERE variant_key = '~none~'
),
matched AS (
  SELECT j.* FROM j_ranked j JOIN r_ranked r
    ON  r.order_id=j.order_id AND r.product_id=j.product_id
    AND r.variant_key=j.variant_key AND r.quantity=j.quantity
    AND r.price_at_purchase=j.price_at_purchase AND r.total_price=j.total_price
    AND r.occ=j.occ
),
missing AS (
  SELECT j.* FROM j_ranked j
  LEFT JOIN r_ranked r
    ON  r.order_id=j.order_id AND r.product_id=j.product_id
    AND r.variant_key=j.variant_key AND r.quantity=j.quantity
    AND r.price_at_purchase=j.price_at_purchase AND r.total_price=j.total_price
    AND r.occ=j.occ
  WHERE r.id IS NULL
),
surplus AS (
  SELECT r.* FROM r_ranked r
  LEFT JOIN j_ranked j
    ON  j.order_id=r.order_id AND j.product_id=r.product_id
    AND j.variant_key=r.variant_key AND j.quantity=r.quantity
    AND j.price_at_purchase=r.price_at_purchase AND j.total_price=r.total_price
    AND j.occ=r.occ
  WHERE j.order_id IS NULL
)
SELECT
  (SELECT count(*) FROM j_ranked)       AS jsonb_lines_valid,
  (SELECT count(*) FROM r_ranked)       AS relational_rows,
  (SELECT count(*) FROM matched)        AS exact_matches,
  (SELECT count(*) FROM missing)        AS missing_lines,
  (SELECT count(*) FROM surplus)        AS surplus_relational_rows,
  (SELECT count(*) FROM cluster_ambig)  AS ambiguous_duplicate_groups,
  -- metadata disagreement: a relational row whose variant_key is unknown to the
  -- JSONB side for that (order, product, qty, price) cluster.
  (SELECT count(*) FROM surplus s
     WHERE EXISTS (SELECT 1 FROM j_ranked j
       WHERE j.order_id=s.order_id AND j.product_id=s.product_id
         AND j.quantity=s.quantity AND j.price_at_purchase=s.price_at_purchase))
                                        AS metadata_disagreements,
  -- deterministic-missing = insertable by the backfill (not in an ambiguous cluster)
  (SELECT count(*) FROM missing m WHERE NOT EXISTS (
     SELECT 1 FROM cluster_ambig c
     WHERE c.order_id=m.order_id AND c.product_id=m.product_id
       AND c.quantity=m.quantity AND c.price_at_purchase=m.price_at_purchase))
                                        AS deterministic_missing_lines;
