-- ============================================================================
-- 01-test-apply.sql
-- TARGET: the NEW test branch only (inventory-full-reconciliation-test-<TS>)
-- NEVER run against br-patient-mouse-a4d4cgr4.
-- Decision: OWNER_CONFIRMED_CURRENT_STOREFRONT_AS_CANONICAL_INVENTORY_TRUTH
-- ============================================================================
-- EXECUTION CONTRACT
--   No BEGIN/COMMIT/ROLLBACK in this file. Run it as ONE transaction:
--       psql "$TEST_BRANCH_URL" -v ON_ERROR_STOP=1 \
--            -v execution_id="FULL-INV-TEST-<UTC_TIMESTAMP>" \
--            --single-transaction -f 01-test-apply.sql
--   Any RAISE below aborts the whole run and leaves the branch untouched.
--
-- WRITES, and nothing else:
--   INSERT inventory_reconciliations   (evidence)
--   INSERT inventory_movements         (the settlement)
-- Storefront stock is written only by the EXISTING trigger
-- project_inventory_movement_to_product_stock. This file issues no UPDATE and
-- no DELETE against anything.
-- ============================================================================

\if :{?execution_id}
\else
\echo 'FATAL: run with -v execution_id=FULL-INV-TEST-<UTC_TIMESTAMP>'
\quit
\endif

\if :{?test_branch_id}
\else
\echo 'FATAL: run with -v test_branch_id=<the new branch id, br-...>'
\quit
\endif

-- Recorded into every evidence and movement metadata row below.
SET LOCAL fullinv.test_branch_id = :'test_branch_id';

-- ── STEP 0. Gates ─────────────────────────────────────────────────────────
DO $$
DECLARE v_mode text; v_loc text; v_prior int;
BEGIN
  SELECT value INTO v_mode FROM settings WHERE key='inventory_ledger_mode';
  IF COALESCE(v_mode,'off') <> 'enforce' THEN
    RAISE EXCEPTION 'ABORT: inventory_ledger_mode=% (expected enforce)', COALESCE(v_mode,'off');
  END IF;

  SELECT id INTO v_loc FROM inventory_locations WHERE code='MAIN' AND is_active=true;
  IF v_loc IS NULL THEN RAISE EXCEPTION 'ABORT: MAIN inventory location missing'; END IF;

  SELECT count(*) INTO v_prior FROM inventory_movements
   WHERE idempotency_key LIKE 'fullinv:test:%'
      OR source_id = 'FULL-INVENTORY-STOREFRONT-TRUTH-TEST';
  IF v_prior > 0 THEN
    RAISE EXCEPTION 'ABORT: % settlement rows already exist on this branch', v_prior;
  END IF;
END $$;

-- ── STEP 0b. Freeze the "before" picture inside this transaction ───────
-- Every "unchanged" assertion at STEP 5 compares against THIS, not against
-- numbers baked into the file.
CREATE TEMP TABLE fullinv_before ON COMMIT DROP AS
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
  (SELECT count(*) FROM inventory_movements)                                     AS movements_n,
  (SELECT md5(string_agg(concat_ws(':',id,product_id,COALESCE(variant_id,'~'),
       quantity_delta::text,movement_type,COALESCE(idempotency_key,'~')),'|' ORDER BY id))
     FROM inventory_movements)                                                   AS movements_h,
  (SELECT count(*) FROM inventory_reconciliations)                               AS reconciliations_n,
  (SELECT count(*) FROM product_variant_reconciliation)                          AS pvr_n,
  (SELECT count(*) FROM notification_log)                                        AS notifications_n,
  (SELECT count(*) FROM accounting_audit_trail)                                  AS accounting_n,
  (SELECT count(*) FROM cash_settlements)                                        AS cash_settlements_n,
  (SELECT COALESCE(sum(rounded_total),0) FROM orders WHERE status='delivered')   AS delivered_revenue;

-- ── STEP 1. Plan -> temp table ────────────────────────────────────────────
CREATE TEMP TABLE fullinv_plan ON COMMIT DROP AS
WITH loc AS (
  SELECT id FROM inventory_locations WHERE code='MAIN' AND is_active=true LIMIT 1
),
sf AS (
  SELECT p.id AS product_id, NULL::text AS variant_id, COALESCE(p.stock,0) AS storefront
  FROM products p WHERE COALESCE(p.has_variants,false)=false
  UNION ALL
  SELECT p.id, e->>'id', COALESCE((e->>'stock')::int,0)
  FROM products p, jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) e
  WHERE COALESCE(p.has_variants,false)=true
),
led AS (
  SELECT m.product_id, m.variant_id, SUM(m.quantity_delta) AS ledger, COUNT(*) AS movement_count
  FROM inventory_movements m, loc WHERE m.location_id=loc.id GROUP BY 1,2
),
j AS (
  SELECT COALESCE(sf.product_id,led.product_id) AS product_id,
         COALESCE(sf.variant_id,led.variant_id)  AS variant_id,
         (sf.product_id IS NOT NULL)             AS storefront_present,
         sf.storefront, led.ledger, COALESCE(led.movement_count,0) AS movement_count
  FROM sf FULL OUTER JOIN led
    ON led.product_id=sf.product_id AND led.variant_id IS NOT DISTINCT FROM sf.variant_id
)
SELECT j.*,
  CASE
    WHEN storefront_present AND ledger IS NOT NULL AND COALESCE(storefront,0)<>ledger THEN 'A'
    WHEN NOT storefront_present AND variant_id IS NOT NULL                            THEN 'B'
    WHEN storefront_present AND ledger IS NULL AND COALESCE(storefront,0)>0           THEN 'C'
    WHEN storefront_present AND ledger IS NULL AND COALESCE(storefront,0)=0           THEN 'NOOP'
    WHEN storefront_present AND ledger IS NOT NULL AND COALESCE(storefront,0)=ledger  THEN 'MATCH'
    ELSE 'D' END AS category,
  CASE
    WHEN storefront_present AND ledger IS NOT NULL         THEN COALESCE(storefront,0)-ledger
    WHEN NOT storefront_present AND variant_id IS NOT NULL THEN 0-ledger
    WHEN storefront_present AND ledger IS NULL             THEN COALESCE(storefront,0)
  END AS adjustment,
  CASE
    WHEN storefront_present AND ledger IS NOT NULL         THEN COALESCE(storefront,0)
    WHEN NOT storefront_present AND variant_id IS NOT NULL THEN 0
    WHEN storefront_present AND ledger IS NULL             THEN COALESCE(storefront,0)
  END AS target_balance,
  md5(concat_ws('|', j.product_id, COALESCE(j.variant_id,'NULL'),
       (SELECT id FROM loc), COALESCE(j.storefront,-1)::text,
       COALESCE(j.ledger,-999999)::text, COALESCE(j.movement_count,0)::text)) AS before_hash
FROM j;

-- D is never touched.
DO $$
DECLARE v_d int;
BEGIN
  SELECT count(*) INTO v_d FROM fullinv_plan WHERE category='D';
  IF v_d > 0 THEN RAISE EXCEPTION 'ABORT: % rows are category D (BLOCKED_FOR_OWNER_REVIEW)', v_d; END IF;
END $$;

-- Category B: assert the proven archiving mechanism already ran.
-- sync_product_variant_reconciliation sets is_active=false automatically when
-- products.variants changes. We assert that state; we never flip the flag by
-- hand, and we never delete the row.
DO $$
DECLARE v_bad int;
BEGIN
  SELECT count(*) INTO v_bad
  FROM fullinv_plan p
  JOIN product_variant_reconciliation v
    ON v.product_id=p.product_id AND v.variant_id=p.variant_id
  WHERE p.category='B' AND v.is_active = true;
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'ABORT: % category-B variants still have product_variant_reconciliation.is_active=true; the sync trigger has not archived them. Owner review required — do not flip the flag manually.', v_bad;
  END IF;

  SELECT count(*) INTO v_bad
  FROM fullinv_plan p
  LEFT JOIN product_variant_reconciliation v
    ON v.product_id=p.product_id AND v.variant_id=p.variant_id
  WHERE p.category='B' AND v.product_id IS NULL;
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'ABORT: % category-B rows have no product_variant_reconciliation row; inventory_movements_variant_fk would reject them', v_bad;
  END IF;
END $$;

-- ── STEP 2. Advisory locks, then re-read under the lock ──────────────────
-- Same key shape as prevent_negative_inventory_balance, so we contend with real
-- order traffic instead of racing it. Deterministic order avoids deadlock.
SELECT pg_advisory_xact_lock(
         hashtextextended(
           product_id || '|' || COALESCE(variant_id,'') || '|' ||
           (SELECT id FROM inventory_locations WHERE code='MAIN' AND is_active=true), 0))
FROM fullinv_plan
WHERE category IN ('A','B','C') AND adjustment <> 0
ORDER BY product_id, COALESCE(variant_id,'');

DO $$
DECLARE v_loc text; v_drift int;
BEGIN
  SELECT id INTO v_loc FROM inventory_locations WHERE code='MAIN' AND is_active=true;
  SELECT count(*) INTO v_drift
  FROM fullinv_plan p
  WHERE p.category IN ('A','B','C') AND p.adjustment <> 0
    AND (
      COALESCE((SELECT SUM(m.quantity_delta) FROM inventory_movements m
                 WHERE m.product_id=p.product_id
                   AND m.variant_id IS NOT DISTINCT FROM p.variant_id
                   AND m.location_id=v_loc), 0) IS DISTINCT FROM COALESCE(p.ledger,0)
      OR
      COALESCE(CASE
        WHEN p.variant_id IS NULL THEN (SELECT pr.stock FROM products pr WHERE pr.id=p.product_id)
        ELSE (SELECT (e->>'stock')::int FROM products pr,
                jsonb_array_elements(COALESCE(pr.variants,'[]'::jsonb)) e
               WHERE pr.id=p.product_id AND e->>'id'=p.variant_id)
      END, -1) IS DISTINCT FROM COALESCE(p.storefront,-1)
    );
  IF v_drift > 0 THEN
    RAISE EXCEPTION 'ABORT: % planned rows drifted between plan and lock', v_drift;
  END IF;
END $$;

-- ── STEP 3. Evidence rows ────────────────────────────────────────────────
-- status='applied' is terminal and sits OUTSIDE
-- inventory_reconciliations_active_unique_idx (partial index over
-- pending/count_required/counted/approved), so it never collides with the 25/6
-- stocktake rows and leaves no active row behind.
INSERT INTO inventory_reconciliations (
  product_id, variant_id, location_id,
  observed_product_stock, observed_variant_stock,
  physical_count, approved_opening_stock,
  status, evidence, notes,
  counted_by, counted_at, approved_by, approved_at
)
SELECT
  p.product_id,
  p.variant_id,
  (SELECT id FROM inventory_locations WHERE code='MAIN' AND is_active=true),
  CASE WHEN p.variant_id IS NULL     THEN COALESCE(p.storefront,0) END,
  CASE WHEN p.variant_id IS NOT NULL THEN COALESCE(p.storefront,0) END,
  NULL,                     -- physical_count: this is not a stock count
  NULL,                     -- approved_opening_stock: this is not an opening balance
  'applied',
  jsonb_build_object(
    'decision',                   'OWNER_CONFIRMED_CURRENT_STOREFRONT_AS_CANONICAL_INVENTORY_TRUTH',
    'owner',                      'jaafar',
    'execution_id',               :'execution_id',
    'category',                   p.category,
    'product_id',                 p.product_id,
    'variant_id',                 p.variant_id,
    'storefront_present',         p.storefront_present,
    'storefront_stock_before',    p.storefront,
    'ledger_before',              COALESCE(p.ledger,0),
    'calculated_adjustment',      p.adjustment,
    'expected_ledger_after',      p.target_balance,
    'expected_storefront_after',  p.storefront,
    'before_hash',                p.before_hash,
    'production_parent_branch',   'br-patient-mouse-a4d4cgr4',
    'test_branch_id',             current_setting('fullinv.test_branch_id', true),
    'reason',                     'Full inventory settlement of the canonical ledger to current storefront truth',
    'real_order_path_test_status','externally_executed_owner_attested_passed',
    'real_order_path_test_branch','br-floral-voice-a4a0c5iu',
    'real_order_path_test_method','orders_and_order_items_relational_forced_rollback_transaction',
    'real_order_path_test_result','one_order_line_sale_movement_stock_50_to_49_then_full_rollback_zero_residue',
    'real_order_path_test_executor','external_neon_write_connector',
    'executed_at',                now()
  ),
  CASE p.category
    WHEN 'A' THEN 'Ledger settled to current storefront stock (owner decision).'
    WHEN 'B' THEN 'Variant no longer present in products.variants; canonical stock is 0. The product_variant_reconciliation row is already archived (is_active=false) by sync_product_variant_reconciliation and is deliberately NOT deleted.'
    WHEN 'C' THEN 'No ledger history existed; current storefront stock recorded via manual_adjustment, deliberately NOT an opening_balance.'
  END,
  NULL, NULL,               -- counted_by, counted_at
  'owner:jaafar', now()
FROM fullinv_plan p
WHERE p.category IN ('A','B','C') AND p.adjustment <> 0;

-- ── STEP 4. The settlement movements ─────────────────────────────────────
-- quantity_delta comes from the plan computed against the database. No literal
-- quantity appears anywhere in this file.
INSERT INTO inventory_movements (
  product_id, variant_id, location_id, quantity_delta,
  movement_type, source_type, source_id, idempotency_key,
  currency, happened_at, created_by, metadata
)
SELECT
  p.product_id,
  p.variant_id,
  (SELECT id FROM inventory_locations WHERE code='MAIN' AND is_active=true),
  p.adjustment,
  'manual_adjustment',
  'owner_stock_reconciliation',
  'FULL-INVENTORY-STOREFRONT-TRUTH-TEST',
  'fullinv:test:storefront-truth:' || p.product_id || ':' ||
    COALESCE(p.variant_id,'NULL') || ':' || :'execution_id',
  'IQD',
  now(),
  'owner:jaafar',
  jsonb_build_object(
    'decision',                   'OWNER_CONFIRMED_CURRENT_STOREFRONT_AS_CANONICAL_INVENTORY_TRUTH',
    'owner',                      'jaafar',
    'execution_id',               :'execution_id',
    'category',                   p.category,
    'product_id',                 p.product_id,
    'variant_id',                 p.variant_id,
    'storefront_present',         p.storefront_present,
    'storefront_stock_before',    p.storefront,
    'ledger_before',              COALESCE(p.ledger,0),
    'calculated_adjustment',      p.adjustment,
    'expected_ledger_after',      p.target_balance,
    'expected_storefront_after',  p.storefront,
    'before_hash',                p.before_hash,
    'production_parent_branch',   'br-patient-mouse-a4d4cgr4',
    'test_branch_id',             current_setting('fullinv.test_branch_id', true),
    'reason',                     'Full inventory settlement of the canonical ledger to current storefront truth',
    'real_order_path_test_status','externally_executed_owner_attested_passed',
    'real_order_path_test_branch','br-floral-voice-a4a0c5iu',
    'real_order_path_test_method','orders_and_order_items_relational_forced_rollback_transaction',
    'real_order_path_test_result','one_order_line_sale_movement_stock_50_to_49_then_full_rollback_zero_residue',
    'real_order_path_test_executor','external_neon_write_connector',
    'executed_at',                now()
  )
FROM fullinv_plan p
WHERE p.category IN ('A','B','C') AND p.adjustment <> 0;

-- ── STEP 5. Assertions. Any failure rolls the whole transaction back. ────
DO $$
DECLARE v_loc text; v_bad int; v_written int; v_planned int; v_before fullinv_before%ROWTYPE;
BEGIN
  SELECT id INTO v_loc FROM inventory_locations WHERE code='MAIN' AND is_active=true;
  SELECT * INTO v_before FROM fullinv_before;

  SELECT count(*) INTO v_planned FROM fullinv_plan
   WHERE category IN ('A','B','C') AND adjustment <> 0;
  SELECT count(*) INTO v_written FROM inventory_movements
   WHERE idempotency_key LIKE 'fullinv:test:%';
  IF v_written <> v_planned THEN
    RAISE EXCEPTION 'ABORT: wrote % movements, planned %', v_written, v_planned;
  END IF;

  SELECT count(*) INTO v_bad FROM inventory_reconciliations
   WHERE evidence->>'execution_id' = :'execution_id';
  IF v_bad <> v_planned THEN
    RAISE EXCEPTION 'ABORT: wrote % evidence rows, planned %', v_bad, v_planned;
  END IF;

  -- A -> storefront, B -> 0, C -> storefront
  SELECT count(*) INTO v_bad FROM fullinv_plan p
   WHERE p.category IN ('A','B','C') AND p.adjustment <> 0
     AND (SELECT COALESCE(SUM(m.quantity_delta),0) FROM inventory_movements m
           WHERE m.product_id=p.product_id
             AND m.variant_id IS NOT DISTINCT FROM p.variant_id
             AND m.location_id=v_loc) <> p.target_balance;
  IF v_bad > 0 THEN RAISE EXCEPTION 'ABORT: % rows missed their target balance', v_bad; END IF;

  SELECT count(*) INTO v_bad FROM fullinv_plan
   WHERE category='B' AND adjustment <> 0 AND target_balance <> 0;
  IF v_bad > 0 THEN RAISE EXCEPTION 'ABORT: % category-B rows target a non-zero balance', v_bad; END IF;

  -- no negative canonical balance anywhere on the branch
  SELECT count(*) INTO v_bad FROM (
    SELECT 1 FROM inventory_movements WHERE location_id=v_loc
     GROUP BY product_id, variant_id HAVING SUM(quantity_delta) < 0) x;
  IF v_bad > 0 THEN RAISE EXCEPTION 'ABORT: % rows hold a negative canonical balance', v_bad; END IF;

  -- exactly one settlement movement per settled row
  SELECT count(*) INTO v_bad FROM (
    SELECT 1 FROM inventory_movements WHERE idempotency_key LIKE 'fullinv:test:%'
     GROUP BY product_id, variant_id HAVING count(*) > 1) x;
  IF v_bad > 0 THEN RAISE EXCEPTION 'ABORT: duplicate settlement on % rows', v_bad; END IF;

  -- only the sanctioned type/source was written
  SELECT count(*) INTO v_bad FROM inventory_movements
   WHERE idempotency_key LIKE 'fullinv:test:%'
     AND (movement_type <> 'manual_adjustment'
          OR source_type <> 'owner_stock_reconciliation'
          OR source_id  <> 'FULL-INVENTORY-STOREFRONT-TRUTH-TEST'
          OR created_by <> 'owner:jaafar');
  IF v_bad > 0 THEN RAISE EXCEPTION 'ABORT: % movements carry the wrong type/source/author', v_bad; END IF;

  -- no opening_balance and no forbidden type was created by this run
  SELECT count(*) INTO v_bad FROM inventory_movements
   WHERE idempotency_key LIKE 'fullinv:test:%'
     AND movement_type IN ('opening_balance','adjustment');
  IF v_bad > 0 THEN RAISE EXCEPTION 'ABORT: % forbidden movement types created', v_bad; END IF;

  -- storefront must not have jumped: every active variant's stock still equals
  -- its ledger, and products.stock is still the trigger-derived variant sum
  SELECT count(*) INTO v_bad
  FROM products pr, jsonb_array_elements(COALESCE(pr.variants,'[]'::jsonb)) e
  WHERE COALESCE(pr.has_variants,false)=true
    AND (e->>'stock')::int <> (SELECT COALESCE(SUM(m.quantity_delta),0)
                                 FROM inventory_movements m
                                WHERE m.product_id=pr.id AND m.variant_id=e->>'id'
                                  AND m.location_id=v_loc);
  IF v_bad > 0 THEN RAISE EXCEPTION 'ABORT: % storefront variants diverge from the ledger', v_bad; END IF;

  SELECT count(*) INTO v_bad FROM products
   WHERE COALESCE(has_variants,false)=true
     AND stock <> (SELECT COALESCE(SUM((e->>'stock')::int),0) FROM jsonb_array_elements(variants) e);
  IF v_bad > 0 THEN RAISE EXCEPTION 'ABORT: % products.stock values are not the variant sum', v_bad; END IF;

  -- archived variants stayed archived and reached zero
  SELECT count(*) INTO v_bad
  FROM product_variant_reconciliation v
  WHERE v.is_active=false
    AND (SELECT COALESCE(SUM(m.quantity_delta),0) FROM inventory_movements m
          WHERE m.product_id=v.product_id AND m.variant_id=v.variant_id) <> 0;
  IF v_bad > 0 THEN RAISE EXCEPTION 'ABORT: % archived variants still hold stock', v_bad; END IF;

  SELECT count(*) INTO v_bad
  FROM product_variant_reconciliation v JOIN products p ON p.id=v.product_id
  WHERE v.is_active=false
    AND EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) z
                 WHERE z->>'id'=v.variant_id);
  IF v_bad > 0 THEN RAISE EXCEPTION 'ABORT: % archived variants were resurrected into the storefront', v_bad; END IF;

  -- nothing financial moved: compared against the snapshot frozen at STEP 0b,
  -- not against hard-coded numbers, so a branch created after a real new order
  -- still passes for the right reason.
  IF (SELECT count(*) FROM orders)                 <> v_before.orders_n
     OR (SELECT count(*) FROM order_items_relational) <> v_before.order_items_n
     OR (SELECT count(*) FROM notification_log)       <> v_before.notifications_n
     OR (SELECT count(*) FROM accounting_audit_trail) <> v_before.accounting_n
     OR (SELECT count(*) FROM cash_settlements)       <> v_before.cash_settlements_n
     OR (SELECT COALESCE(sum(rounded_total),0) FROM orders WHERE status='delivered')
          <> v_before.delivered_revenue THEN
    RAISE EXCEPTION 'ABORT: an order / notification / accounting / cash / revenue value changed';
  END IF;

  IF (SELECT md5(string_agg(concat_ws(':',id,order_number,total::text,rounded_total::text,
        shipping_cost::text,discount_total::text,status,payment_status),'|' ORDER BY id))
      FROM orders) IS DISTINCT FROM v_before.orders_h THEN
    RAISE EXCEPTION 'ABORT: orders fingerprint changed';
  END IF;

  IF (SELECT md5(string_agg(concat_ws(':',id,order_id,product_id,quantity::text,
        price_at_purchase::text,total_price::text),'|' ORDER BY id))
      FROM order_items_relational) IS DISTINCT FROM v_before.order_items_h THEN
    RAISE EXCEPTION 'ABORT: order_items fingerprint changed';
  END IF;

  IF (SELECT md5(string_agg(concat_ws(':',id,COALESCE(unit_cost_price::text,'~'),
        COALESCE(cost_snapshot_source,'~'),COALESCE(cost_snapshot_status,'~')),'|' ORDER BY id))
      FROM order_items_relational) IS DISTINCT FROM v_before.costs_h THEN
    RAISE EXCEPTION 'ABORT: costs fingerprint changed';
  END IF;

  -- pre-existing movements were never altered
  IF (SELECT md5(string_agg(concat_ws(':',id,product_id,COALESCE(variant_id,'~'),
        quantity_delta::text,movement_type,COALESCE(idempotency_key,'~')),'|' ORDER BY id))
      FROM inventory_movements WHERE idempotency_key NOT LIKE 'fullinv:test:%')
     IS DISTINCT FROM v_before.movements_h THEN
    RAISE EXCEPTION 'ABORT: a pre-existing inventory_movement was altered';
  END IF;

  IF (SELECT count(*) FROM inventory_movements) <> v_before.movements_n + v_planned THEN
    RAISE EXCEPTION 'ABORT: inventory_movements did not grow by exactly %', v_planned;
  END IF;
  IF (SELECT count(*) FROM inventory_reconciliations) <> v_before.reconciliations_n + v_planned THEN
    RAISE EXCEPTION 'ABORT: inventory_reconciliations did not grow by exactly %', v_planned;
  END IF;
  IF (SELECT count(*) FROM product_variant_reconciliation) <> v_before.pvr_n THEN
    RAISE EXCEPTION 'ABORT: product_variant_reconciliation row count changed';
  END IF;

  IF (SELECT value FROM settings WHERE key='inventory_ledger_mode') <> 'enforce' THEN
    RAISE EXCEPTION 'ABORT: inventory_ledger_mode changed during the transaction';
  END IF;
END $$;

-- ── STEP 6. What this run did ────────────────────────────────────────────
SELECT category, count(*) AS movements_written, sum(adjustment) AS net_quantity_change
FROM fullinv_plan
WHERE category IN ('A','B','C') AND adjustment <> 0
GROUP BY category ORDER BY category;
-- EXPECT: A 45 (-293) | B 23 (-135) | C 2 (+6). Total 70, net -422.
