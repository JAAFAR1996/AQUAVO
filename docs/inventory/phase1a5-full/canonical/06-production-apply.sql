-- ============================================================================
-- 06-production-apply.sql
-- TARGET: Production br-patient-mouse-a4d4cgr4
-- Decision: OWNER_CONFIRMED_CURRENT_STOREFRONT_AS_CANONICAL_INVENTORY_TRUTH
-- ============================================================================
-- DO NOT RUN until ALL of these are true:
--   1. 02-test-apply.sql committed on a FRESH test branch and 03-test-verify.sql
--      passed every expectation.
--   2. 04-post-settlement-tests.sql passed every expectation.
--   3. A backup branch was created from Production at approval time and its id
--      is passed below as -v backup_branch_id=br-...
--   4. 05-production-preflight.sql was re-run AFTER the backup and showed
--      no category D and no unexplained drift.
--   5. The owner sent, verbatim:
--      OWNER_APPROVES_FULL_STOREFRONT_CANONICAL_INVENTORY_RECONCILIATION
--
-- EXECUTION CONTRACT — one transaction, no exceptions:
--   psql "$PROD_URL" -v ON_ERROR_STOP=1 \
--        -v execution_id="FULL-INV-PROD-<UTC_TIMESTAMP>" \
--        -v backup_branch_id="br-..." \
--        -v test_branch_id="br-..." \
--        -v test_execution_id="FULL-INV-TEST-<UTC_TIMESTAMP>" \
--        --single-transaction -f 06-production-apply.sql
--   This file contains NO BEGIN/COMMIT/ROLLBACK. Never add one.
--   Any RAISE below aborts everything. Do not retry. Do not auto-correct.
--
-- WRITES, and nothing else:
--   INSERT inventory_reconciliations, INSERT inventory_movements.
-- The storefront is written only by the existing trigger
-- project_inventory_movement_to_product_stock. No UPDATE, no DELETE, anywhere.
-- ============================================================================

\if :{?execution_id}
\else
\echo 'FATAL: -v execution_id=FULL-INV-PROD-<UTC_TIMESTAMP> required'
\quit
\endif
\if :{?backup_branch_id}
\else
\echo 'FATAL: -v backup_branch_id=br-... required (create the backup FIRST)'
\quit
\endif
\if :{?test_branch_id}
\else
\echo 'FATAL: -v test_branch_id=br-... required'
\quit
\endif
\if :{?test_execution_id}
\else
\echo 'FATAL: -v test_execution_id=FULL-INV-TEST-... required'
\quit
\endif

SET LOCAL fullinv.execution_id     = :'execution_id';
SET LOCAL fullinv.backup_branch_id = :'backup_branch_id';
SET LOCAL fullinv.test_branch_id   = :'test_branch_id';
SET LOCAL fullinv.test_execution_id= :'test_execution_id';

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
   WHERE idempotency_key LIKE 'fullinv:production:%'
      OR source_id = 'FULL-INVENTORY-STOREFRONT-TRUTH-PRODUCTION';
  IF v_prior > 0 THEN
    RAISE EXCEPTION 'ABORT: % production settlement rows already exist — this run would duplicate', v_prior;
  END IF;
END $$;

-- ── STEP 1. Freeze the "before" picture inside the transaction ───────────
-- Compared again at STEP 6. Nothing is hard-coded: whatever Production looks
-- like right now is the contract this run must not violate.
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
  (SELECT count(*) FROM cost_ledger)                                             AS cost_ledger_n,
  (SELECT count(*) FROM cash_settlements)                                        AS cash_settlements_n,
  (SELECT COALESCE(sum(rounded_total),0) FROM orders WHERE status='delivered')   AS delivered_revenue,
  (SELECT count(*) FROM inventory_movements WHERE movement_type='opening_balance') AS opening_balance_n,
  (SELECT md5(string_agg(concat_ws(':',id,product_id,COALESCE(variant_id,'~'),
       quantity_delta::text,movement_type),'|' ORDER BY id))
     FROM inventory_movements WHERE movement_type='opening_balance')             AS opening_balance_h;

-- ── STEP 2. Classify, from the database, right now ───────────────────────
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
    WHEN storefront_present AND ledger IS NOT NULL         THEN COALESCE(storefront,0)-COALESCE(ledger,0)
    WHEN NOT storefront_present AND variant_id IS NOT NULL THEN 0-COALESCE(ledger,0)
    WHEN storefront_present AND ledger IS NULL             THEN COALESCE(storefront,0)-0
  END AS adjustment,
  CASE
    WHEN storefront_present AND ledger IS NOT NULL         THEN COALESCE(storefront,0)
    WHEN NOT storefront_present AND variant_id IS NOT NULL THEN 0
    WHEN storefront_present AND ledger IS NULL             THEN COALESCE(storefront,0)
  END AS target_balance,
  md5(concat_ws('|', j.product_id, COALESCE(j.variant_id,'NULL'), (SELECT id FROM loc),
       COALESCE(j.storefront,-1)::text, COALESCE(j.ledger,-999999)::text,
       COALESCE(j.movement_count,0)::text)) AS before_hash
FROM j;

-- Category D is never written and never auto-corrected.
DO $$
DECLARE v_d int;
BEGIN
  SELECT count(*) INTO v_d FROM fullinv_plan WHERE category='D';
  IF v_d > 0 THEN
    RAISE EXCEPTION 'ABORT: % rows are category D — STOP_FOR_OWNER_REVIEW', v_d;
  END IF;
END $$;

-- Category B: assert the archiving the audit proved. Never flip is_active by hand.
DO $$
DECLARE v_bad int;
BEGIN
  SELECT count(*) INTO v_bad
  FROM fullinv_plan p JOIN product_variant_reconciliation v
    ON v.product_id=p.product_id AND v.variant_id=p.variant_id
  WHERE p.category='B' AND v.is_active = true;
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'ABORT: % category-B variants still have is_active=true. sync_product_variant_reconciliation has not archived them. STOP_FOR_OWNER_REVIEW — do not flip the flag manually.', v_bad;
  END IF;

  SELECT count(*) INTO v_bad
  FROM fullinv_plan p LEFT JOIN product_variant_reconciliation v
    ON v.product_id=p.product_id AND v.variant_id=p.variant_id
  WHERE p.category='B' AND v.product_id IS NULL;
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'ABORT: % category-B rows lack a product_variant_reconciliation row; inventory_movements_variant_fk would reject them', v_bad;
  END IF;
END $$;

-- ── STEP 3. Locks in a fixed order, then re-read under the lock ──────────
-- Key shape is identical to prevent_negative_inventory_balance so we contend
-- with live order traffic rather than racing it.
SELECT pg_advisory_xact_lock(
         hashtextextended(
           product_id || '|' || COALESCE(variant_id,'') || '|' ||
           (SELECT id FROM inventory_locations WHERE code='MAIN' AND is_active=true), 0))
FROM fullinv_plan
WHERE category IN ('A','B','C')
ORDER BY product_id, variant_id NULLS FIRST;

-- Recompute every number under the lock. The plan above was advisory; THIS is
-- what gets written.
CREATE TEMP TABLE fullinv_final ON COMMIT DROP AS
WITH loc AS (SELECT id FROM inventory_locations WHERE code='MAIN' AND is_active=true LIMIT 1)
SELECT p.product_id, p.variant_id, p.category, p.storefront_present, p.before_hash,
       p.storefront                                   AS storefront_planned,
       p.ledger                                       AS ledger_planned,
       CASE
         WHEN p.variant_id IS NULL THEN (SELECT pr.stock FROM products pr WHERE pr.id=p.product_id)
         ELSE (SELECT (e->>'stock')::int FROM products pr,
                 jsonb_array_elements(COALESCE(pr.variants,'[]'::jsonb)) e
                WHERE pr.id=p.product_id AND e->>'id'=p.variant_id)
       END                                            AS storefront_locked,
       (SELECT COALESCE(SUM(m.quantity_delta),0) FROM inventory_movements m, loc
         WHERE m.product_id=p.product_id
           AND m.variant_id IS NOT DISTINCT FROM p.variant_id
           AND m.location_id=loc.id)                  AS ledger_locked
FROM fullinv_plan p
WHERE p.category IN ('A','B','C');

ALTER TABLE fullinv_final ADD COLUMN target_balance int;
ALTER TABLE fullinv_final ADD COLUMN adjustment     int;

-- A: storefront - ledger | B: 0 - ledger | C: storefront - ledger (ledger is 0)
UPDATE fullinv_final
   SET target_balance = CASE WHEN category='B' THEN 0 ELSE COALESCE(storefront_locked,0) END;
UPDATE fullinv_final
   SET adjustment = target_balance - COALESCE(ledger_locked,0);

-- Category identity must not have changed under the lock.
DO $$
DECLARE v_bad int;
BEGIN
  SELECT count(*) INTO v_bad FROM fullinv_final
   WHERE (category='B' AND storefront_locked IS NOT NULL)
      OR (category<>'B' AND storefront_locked IS NULL);
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'ABORT: % rows changed storefront presence under the lock — STOP_FOR_OWNER_REVIEW', v_bad;
  END IF;
END $$;

-- ── STEP 4. adjustment = 0  ->  SKIP_WITH_EVIDENCE, never a zero movement ─
-- inventory_movements_quantity_check forbids quantity_delta = 0, and a row that
-- settled itself (a real sale closed the gap) needs a record, not a write.
INSERT INTO inventory_reconciliations (
  product_id, variant_id, location_id,
  observed_product_stock, observed_variant_stock,
  physical_count, approved_opening_stock,
  status, evidence, notes, counted_by, counted_at, approved_by, approved_at
)
SELECT f.product_id, f.variant_id,
  (SELECT id FROM inventory_locations WHERE code='MAIN' AND is_active=true),
  CASE WHEN f.variant_id IS NULL     THEN COALESCE(f.storefront_locked,0) END,
  CASE WHEN f.variant_id IS NOT NULL THEN COALESCE(f.storefront_locked,0) END,
  NULL, NULL, 'applied',
  jsonb_build_object(
    'decision','OWNER_CONFIRMED_CURRENT_STOREFRONT_AS_CANONICAL_INVENTORY_TRUTH',
    'owner','jaafar',
    'execution_id',              current_setting('fullinv.execution_id'),
    'outcome',                   'SKIP_WITH_EVIDENCE',
    'category',                  f.category,
    'storefront_present',        f.storefront_present,
    'storefront_stock_before',   f.storefront_locked,
    'ledger_before',             f.ledger_locked,
    'calculated_adjustment',     0,
    'reason',                    'Row already matched storefront truth when the lock was taken; no movement written.',
    'before_hash',               f.before_hash,
    'production_branch_id',      'br-patient-mouse-a4d4cgr4',
    'backup_branch_id',          current_setting('fullinv.backup_branch_id'),
    'test_branch_id',            current_setting('fullinv.test_branch_id'),
    'test_execution_id',         current_setting('fullinv.test_execution_id'),
    'executed_at',               now()
  ),
  'Skipped: adjustment computed to 0 under the advisory lock. No inventory movement written.',
  NULL, NULL, 'owner:jaafar', now()
FROM fullinv_final f
WHERE f.adjustment = 0;

-- ── STEP 5. Evidence, then movements, for every non-zero row ─────────────
INSERT INTO inventory_reconciliations (
  product_id, variant_id, location_id,
  observed_product_stock, observed_variant_stock,
  physical_count, approved_opening_stock,
  status, evidence, notes, counted_by, counted_at, approved_by, approved_at
)
SELECT f.product_id, f.variant_id,
  (SELECT id FROM inventory_locations WHERE code='MAIN' AND is_active=true),
  CASE WHEN f.variant_id IS NULL     THEN COALESCE(f.storefront_locked,0) END,
  CASE WHEN f.variant_id IS NOT NULL THEN COALESCE(f.storefront_locked,0) END,
  NULL,                    -- physical_count: not a stock count
  NULL,                    -- approved_opening_stock: not an opening balance
  'applied',
  jsonb_build_object(
    'decision','OWNER_CONFIRMED_CURRENT_STOREFRONT_AS_CANONICAL_INVENTORY_TRUTH',
    'owner','jaafar',
    'execution_id',              current_setting('fullinv.execution_id'),
    'outcome',                   'EXECUTED',
    'category',                  f.category,
    'product_id',                f.product_id,
    'variant_id',                f.variant_id,
    'storefront_present',        f.storefront_present,
    'storefront_stock_before',   f.storefront_locked,
    'ledger_before',             f.ledger_locked,
    'calculated_adjustment',     f.adjustment,
    'ledger_after',              f.target_balance,
    'storefront_after',          f.storefront_locked,
    'before_hash',               f.before_hash,
    'after_hash', md5(concat_ws('|', f.product_id, COALESCE(f.variant_id,'NULL'),
                       (SELECT id FROM inventory_locations WHERE code='MAIN' AND is_active=true),
                       COALESCE(f.storefront_locked,-1)::text, f.target_balance::text)),
    'production_branch_id',      'br-patient-mouse-a4d4cgr4',
    'backup_branch_id',          current_setting('fullinv.backup_branch_id'),
    'test_branch_id',            current_setting('fullinv.test_branch_id'),
    'test_execution_id',         current_setting('fullinv.test_execution_id'),
    'real_order_path_test_status','externally_executed_owner_attested_passed',
    'real_order_path_test_branch','br-floral-voice-a4a0c5iu',
    'real_order_path_test_method','orders_and_order_items_relational_forced_rollback_transaction',
    'real_order_path_test_result','one_order_line_sale_movement_stock_50_to_49_then_full_rollback_zero_residue',
    'real_order_path_test_executor','external_neon_write_connector',
    'reason','Full inventory settlement of the canonical ledger to current storefront truth',
    'executed_at',               now()
  ),
  CASE f.category
    WHEN 'A' THEN 'Ledger settled to current storefront stock (owner decision).'
    WHEN 'B' THEN 'Variant no longer present in products.variants; canonical stock is 0. The product_variant_reconciliation row stays archived (is_active=false) and is deliberately NOT deleted.'
    WHEN 'C' THEN 'No ledger history existed; current storefront stock recorded via manual_adjustment, deliberately NOT an opening_balance.'
  END,
  NULL, NULL, 'owner:jaafar', now()
FROM fullinv_final f
WHERE f.adjustment <> 0;

INSERT INTO inventory_movements (
  product_id, variant_id, location_id, quantity_delta,
  movement_type, source_type, source_id, idempotency_key,
  currency, happened_at, created_by, metadata
)
SELECT f.product_id, f.variant_id,
  (SELECT id FROM inventory_locations WHERE code='MAIN' AND is_active=true),
  f.adjustment,
  'manual_adjustment',
  'owner_stock_reconciliation',
  'FULL-INVENTORY-STOREFRONT-TRUTH-PRODUCTION',
  'fullinv:production:storefront-truth:' || f.product_id || ':' ||
    COALESCE(f.variant_id,'NULL') || ':' || current_setting('fullinv.execution_id'),
  'IQD', now(), 'owner:jaafar',
  jsonb_build_object(
    'decision','OWNER_CONFIRMED_CURRENT_STOREFRONT_AS_CANONICAL_INVENTORY_TRUTH',
    'owner','jaafar',
    'execution_id',              current_setting('fullinv.execution_id'),
    'category',                  f.category,
    'product_id',                f.product_id,
    'variant_id',                f.variant_id,
    'storefront_present',        f.storefront_present,
    'storefront_stock_before',   f.storefront_locked,
    'ledger_before',             f.ledger_locked,
    'calculated_adjustment',     f.adjustment,
    'ledger_after',              f.target_balance,
    'storefront_after',          f.storefront_locked,
    'before_hash',               f.before_hash,
    'after_hash', md5(concat_ws('|', f.product_id, COALESCE(f.variant_id,'NULL'),
                       (SELECT id FROM inventory_locations WHERE code='MAIN' AND is_active=true),
                       COALESCE(f.storefront_locked,-1)::text, f.target_balance::text)),
    'production_branch_id',      'br-patient-mouse-a4d4cgr4',
    'backup_branch_id',          current_setting('fullinv.backup_branch_id'),
    'test_branch_id',            current_setting('fullinv.test_branch_id'),
    'test_execution_id',         current_setting('fullinv.test_execution_id'),
    'real_order_path_test_status','externally_executed_owner_attested_passed',
    'real_order_path_test_branch','br-floral-voice-a4a0c5iu',
    'real_order_path_test_method','orders_and_order_items_relational_forced_rollback_transaction',
    'real_order_path_test_result','one_order_line_sale_movement_stock_50_to_49_then_full_rollback_zero_residue',
    'real_order_path_test_executor','external_neon_write_connector',
    'reason','Full inventory settlement of the canonical ledger to current storefront truth',
    'executed_at',               now()
  )
FROM fullinv_final f
WHERE f.adjustment <> 0;

-- ── STEP 6. Pre-COMMIT assertions. Any failure = full ROLLBACK. ──────────
DO $$
DECLARE v_loc text; v_bad int; v_exec int; v_skip int; v_before fullinv_before%ROWTYPE;
BEGIN
  SELECT id INTO v_loc FROM inventory_locations WHERE code='MAIN' AND is_active=true;
  SELECT * INTO v_before FROM fullinv_before;

  SELECT count(*) INTO v_exec FROM fullinv_final WHERE adjustment <> 0;
  SELECT count(*) INTO v_skip FROM fullinv_final WHERE adjustment  = 0;

  -- movement and reconciliation deltas are exactly right
  IF (SELECT count(*) FROM inventory_movements) <> v_before.movements_n + v_exec THEN
    RAISE EXCEPTION 'ABORT: inventory_movements grew by % , expected %',
      (SELECT count(*) FROM inventory_movements) - v_before.movements_n, v_exec;
  END IF;
  IF (SELECT count(*) FROM inventory_reconciliations) <> v_before.reconciliations_n + v_exec + v_skip THEN
    RAISE EXCEPTION 'ABORT: inventory_reconciliations grew by the wrong amount';
  END IF;

  -- A -> storefront, B -> 0, C -> storefront
  SELECT count(*) INTO v_bad FROM fullinv_final f
   WHERE (SELECT COALESCE(SUM(m.quantity_delta),0) FROM inventory_movements m
           WHERE m.product_id=f.product_id
             AND m.variant_id IS NOT DISTINCT FROM f.variant_id
             AND m.location_id=v_loc) <> f.target_balance;
  IF v_bad > 0 THEN RAISE EXCEPTION 'ABORT: % rows missed their target balance', v_bad; END IF;

  SELECT count(*) INTO v_bad FROM fullinv_final WHERE category='B' AND target_balance <> 0;
  IF v_bad > 0 THEN RAISE EXCEPTION 'ABORT: % category-B rows target a non-zero balance', v_bad; END IF;

  -- no negative balance anywhere
  SELECT count(*) INTO v_bad FROM (
    SELECT 1 FROM inventory_movements WHERE location_id=v_loc
     GROUP BY product_id, variant_id HAVING SUM(quantity_delta) < 0) x;
  IF v_bad > 0 THEN RAISE EXCEPTION 'ABORT: % rows hold a negative canonical balance', v_bad; END IF;

  -- exactly one settlement movement per settled row, correct type/source/author
  SELECT count(*) INTO v_bad FROM (
    SELECT 1 FROM inventory_movements WHERE idempotency_key LIKE 'fullinv:production:%'
     GROUP BY product_id, variant_id HAVING count(*) > 1) x;
  IF v_bad > 0 THEN RAISE EXCEPTION 'ABORT: duplicate settlement on % rows', v_bad; END IF;

  SELECT count(*) INTO v_bad FROM inventory_movements
   WHERE idempotency_key LIKE 'fullinv:production:%'
     AND (movement_type <> 'manual_adjustment'
          OR source_type <> 'owner_stock_reconciliation'
          OR source_id  <> 'FULL-INVENTORY-STOREFRONT-TRUTH-PRODUCTION'
          OR created_by <> 'owner:jaafar'
          OR quantity_delta = 0);
  IF v_bad > 0 THEN RAISE EXCEPTION 'ABORT: % movements are malformed', v_bad; END IF;

  -- historical movements untouched once this run's rows are excluded
  IF (SELECT count(*) FROM inventory_movements WHERE movement_type='opening_balance')
       <> v_before.opening_balance_n
     OR (SELECT md5(string_agg(concat_ws(':',id,product_id,COALESCE(variant_id,'~'),
              quantity_delta::text,movement_type),'|' ORDER BY id))
           FROM inventory_movements WHERE movement_type='opening_balance')
       IS DISTINCT FROM v_before.opening_balance_h THEN
    RAISE EXCEPTION 'ABORT: opening_balance history changed';
  END IF;

  IF (SELECT md5(string_agg(concat_ws(':',id,product_id,COALESCE(variant_id,'~'),
           quantity_delta::text,movement_type,COALESCE(idempotency_key,'~')),'|' ORDER BY id))
        FROM inventory_movements WHERE idempotency_key NOT LIKE 'fullinv:production:%')
     IS DISTINCT FROM v_before.movements_h THEN
    RAISE EXCEPTION 'ABORT: a pre-existing inventory_movement was altered';
  END IF;

  -- storefront never jumped: every live variant still equals its ledger, and
  -- products.stock is still the trigger-derived variant sum
  SELECT count(*) INTO v_bad
  FROM products pr, jsonb_array_elements(COALESCE(pr.variants,'[]'::jsonb)) e
  WHERE COALESCE(pr.has_variants,false)=true
    AND (e->>'stock')::int <> (SELECT COALESCE(SUM(m.quantity_delta),0) FROM inventory_movements m
                                WHERE m.product_id=pr.id AND m.variant_id=e->>'id'
                                  AND m.location_id=v_loc);
  IF v_bad > 0 THEN RAISE EXCEPTION 'ABORT: % storefront variants diverge from the ledger', v_bad; END IF;

  SELECT count(*) INTO v_bad FROM products
   WHERE COALESCE(has_variants,false)=true
     AND stock <> (SELECT COALESCE(SUM((e->>'stock')::int),0) FROM jsonb_array_elements(variants) e);
  IF v_bad > 0 THEN RAISE EXCEPTION 'ABORT: % products.stock values are not the variant sum', v_bad; END IF;

  -- archived variants stayed archived, at zero, not resurrected, not deleted
  SELECT count(*) INTO v_bad FROM product_variant_reconciliation v
   WHERE v.is_active=false
     AND (SELECT COALESCE(SUM(m.quantity_delta),0) FROM inventory_movements m
           WHERE m.product_id=v.product_id AND m.variant_id=v.variant_id) <> 0;
  IF v_bad > 0 THEN RAISE EXCEPTION 'ABORT: % archived variants still hold stock', v_bad; END IF;

  SELECT count(*) INTO v_bad FROM product_variant_reconciliation v JOIN products p ON p.id=v.product_id
   WHERE v.is_active=false
     AND EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) z
                  WHERE z->>'id'=v.variant_id);
  IF v_bad > 0 THEN RAISE EXCEPTION 'ABORT: % archived variants were resurrected', v_bad; END IF;

  IF (SELECT count(*) FROM product_variant_reconciliation) <> v_before.pvr_n THEN
    RAISE EXCEPTION 'ABORT: product_variant_reconciliation row count changed';
  END IF;

  -- nothing financial moved
  IF (SELECT count(*) FROM orders) <> v_before.orders_n
     OR (SELECT md5(string_agg(concat_ws(':',id,order_number,total::text,rounded_total::text,
           shipping_cost::text,discount_total::text,status,payment_status),'|' ORDER BY id))
         FROM orders) IS DISTINCT FROM v_before.orders_h THEN
    RAISE EXCEPTION 'ABORT: orders changed';
  END IF;
  IF (SELECT count(*) FROM order_items_relational) <> v_before.order_items_n
     OR (SELECT md5(string_agg(concat_ws(':',id,order_id,product_id,quantity::text,
           price_at_purchase::text,total_price::text),'|' ORDER BY id))
         FROM order_items_relational) IS DISTINCT FROM v_before.order_items_h THEN
    RAISE EXCEPTION 'ABORT: order_items changed';
  END IF;
  IF (SELECT md5(string_agg(concat_ws(':',id,COALESCE(unit_cost_price::text,'~'),
        COALESCE(cost_snapshot_source,'~'),COALESCE(cost_snapshot_status,'~')),'|' ORDER BY id))
      FROM order_items_relational) IS DISTINCT FROM v_before.costs_h THEN
    RAISE EXCEPTION 'ABORT: costs changed';
  END IF;
  IF (SELECT count(*) FROM notification_log)       <> v_before.notifications_n
     OR (SELECT count(*) FROM accounting_audit_trail) <> v_before.accounting_n
     OR (SELECT count(*) FROM cost_ledger)           <> v_before.cost_ledger_n
     OR (SELECT count(*) FROM cash_settlements)      <> v_before.cash_settlements_n
     OR (SELECT COALESCE(sum(rounded_total),0) FROM orders WHERE status='delivered')
          <> v_before.delivered_revenue THEN
    RAISE EXCEPTION 'ABORT: notifications / accounting / cost ledger / settlements / revenue changed';
  END IF;

  IF (SELECT value FROM settings WHERE key='inventory_ledger_mode') <> 'enforce' THEN
    RAISE EXCEPTION 'ABORT: inventory_ledger_mode changed during the transaction';
  END IF;

  RAISE NOTICE 'PRE-COMMIT OK — % executed, % skipped with evidence', v_exec, v_skip;
END $$;

-- ── STEP 7. Final shape. Read this, then COMMIT. ─────────────────────────
SELECT category,
       count(*) FILTER (WHERE adjustment <> 0) AS executed,
       count(*) FILTER (WHERE adjustment  = 0) AS skipped_with_evidence,
       sum(adjustment)                          AS net_quantity_change
FROM fullinv_final GROUP BY category ORDER BY category;

SELECT current_setting('fullinv.execution_id') AS execution_id,
       count(*)                                AS movements_written,
       sum(quantity_delta)                     AS net_quantity_change
FROM inventory_movements WHERE idempotency_key LIKE 'fullinv:production:%';
