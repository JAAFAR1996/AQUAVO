-- ============================================================================
-- DEPRECATED — DO NOT EXECUTE
-- Superseded on 2026-07-30 by docs/inventory/phase1a5-full/canonical/
-- Kept for provenance only. This file is NOT a source of truth.
-- ============================================================================

-- ============================================================================
-- full-inventory-test-apply.sql
-- TARGET: TEST BRANCH ONLY — br-floral-voice-a4a0c5iu
-- Phase 1A.5 FULL | OWNER_CONFIRMED_CURRENT_STOREFRONT_AS_CANONICAL_INVENTORY_TRUTH
-- ============================================================================
-- EXECUTION CONTRACT
--   This file contains NO top-level BEGIN/COMMIT/ROLLBACK. The executor owns the
--   transaction and MUST submit the whole file in ONE transaction:
--       BEGIN; <entire file>  -- then COMMIT (test branch) or ROLLBACK
--   One transaction for the entire run. Never one commit per row.
--
-- WRITES: inventory_reconciliations (INSERT), inventory_movements (INSERT).
-- Everything else is written BY EXISTING TRIGGERS, never by this file:
--   project_inventory_movement_to_product_stock -> products.stock /
--   products.variants[].stock / product_variant_reconciliation
-- This file NEVER issues UPDATE or DELETE against products, products.variants,
-- inventory_movements, or any historical row.
--
-- NOT USED ANYWHERE: opening_balance, movement_type='adjustment',
-- DISABLE TRIGGER, session_replication_role, UPDATE of storefront stock.
-- ============================================================================

\set execution_id 'PHASE1A5-TEST-20260730'

-- ── STEP 0. Gates. Any failure aborts the whole transaction. ───────────────
DO $$
DECLARE v_mode text; v_loc text; v_dupes int;
BEGIN
  SELECT value INTO v_mode FROM settings WHERE key='inventory_ledger_mode';
  IF COALESCE(v_mode,'off') <> 'enforce' THEN
    RAISE EXCEPTION 'ABORT: inventory_ledger_mode is %, expected enforce', COALESCE(v_mode,'off');
  END IF;

  SELECT id INTO v_loc FROM inventory_locations WHERE code='MAIN' AND is_active=true;
  IF v_loc IS NULL THEN RAISE EXCEPTION 'ABORT: MAIN inventory location missing'; END IF;

  SELECT count(*) INTO v_dupes FROM inventory_movements
   WHERE idempotency_key LIKE 'phase1a5:test:%';
  IF v_dupes > 0 THEN
    RAISE EXCEPTION 'ABORT: % rows from a previous phase1a5 test run already exist', v_dupes;
  END IF;
END $$;

-- ── STEP 1. Materialise the plan, then LOCK, then RE-READ under the lock ───
-- Locks use the exact key shape of prevent_negative_inventory_balance so we
-- contend with real order traffic instead of racing it.
CREATE TEMP TABLE phase1a5_plan ON COMMIT DROP AS
-- >>> _canonical_plan.sql inlined <<<
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
         (sf.product_id IS NOT NULL)             AS in_storefront,
         sf.storefront, led.ledger, COALESCE(led.movement_count,0) AS movement_count
  FROM sf FULL OUTER JOIN led
    ON led.product_id=sf.product_id AND led.variant_id IS NOT DISTINCT FROM sf.variant_id
)
SELECT j.*,
  CASE
    WHEN in_storefront AND ledger IS NOT NULL AND COALESCE(storefront,0)<>ledger THEN 'A'
    WHEN NOT in_storefront AND variant_id IS NOT NULL                            THEN 'B'
    WHEN in_storefront AND ledger IS NULL AND COALESCE(storefront,0)>0           THEN 'C'
    WHEN in_storefront AND ledger IS NULL AND COALESCE(storefront,0)=0           THEN 'NOOP'
    WHEN in_storefront AND ledger IS NOT NULL AND COALESCE(storefront,0)=ledger  THEN 'MATCH'
    ELSE 'D' END AS category,
  CASE
    WHEN in_storefront AND ledger IS NOT NULL         THEN COALESCE(storefront,0)-ledger
    WHEN NOT in_storefront AND variant_id IS NOT NULL THEN 0-ledger
    WHEN in_storefront AND ledger IS NULL             THEN COALESCE(storefront,0)
  END AS adjustment,
  CASE
    WHEN in_storefront AND ledger IS NOT NULL         THEN COALESCE(storefront,0)
    WHEN NOT in_storefront AND variant_id IS NOT NULL THEN 0
    WHEN in_storefront AND ledger IS NULL             THEN COALESCE(storefront,0)
  END AS target_balance
FROM j;

-- Category D is never written and never auto-corrected.
DO $$
DECLARE v_d int;
BEGIN
  SELECT count(*) INTO v_d FROM phase1a5_plan WHERE category='D';
  IF v_d > 0 THEN RAISE EXCEPTION 'ABORT: % rows classified D (BLOCKED_FOR_OWNER_REVIEW)', v_d; END IF;
END $$;

-- Take every advisory lock, in a deterministic order, before re-reading.
SELECT pg_advisory_xact_lock(
         hashtextextended(
           product_id || '|' || COALESCE(variant_id,'') || '|' ||
           (SELECT id FROM inventory_locations WHERE code='MAIN' AND is_active=true), 0))
FROM phase1a5_plan
WHERE category IN ('A','B','C') AND adjustment <> 0
ORDER BY product_id, COALESCE(variant_id,'');

-- Re-read storefront + ledger UNDER the lock and abort if anything moved.
DO $$
DECLARE v_drift int;
BEGIN
  SELECT count(*) INTO v_drift
  FROM phase1a5_plan p
  WHERE p.category IN ('A','B','C') AND p.adjustment <> 0
    AND (
      COALESCE((SELECT SUM(m.quantity_delta) FROM inventory_movements m
                 WHERE m.product_id = p.product_id
                   AND m.variant_id IS NOT DISTINCT FROM p.variant_id
                   AND m.location_id = (SELECT id FROM inventory_locations
                                         WHERE code='MAIN' AND is_active=true)), 0)
        IS DISTINCT FROM COALESCE(p.ledger, 0)
      OR
      COALESCE(CASE
        WHEN p.variant_id IS NULL THEN (SELECT pr.stock FROM products pr WHERE pr.id=p.product_id)
        ELSE (SELECT (e->>'stock')::int FROM products pr,
                jsonb_array_elements(COALESCE(pr.variants,'[]'::jsonb)) e
               WHERE pr.id=p.product_id AND e->>'id'=p.variant_id)
      END, -1) IS DISTINCT FROM COALESCE(p.storefront, -1)
    );
  IF v_drift > 0 THEN
    RAISE EXCEPTION 'ABORT: % planned rows drifted between plan and lock — re-run preflight', v_drift;
  END IF;
END $$;

-- ── STEP 2. Evidence rows (inventory_reconciliations) ─────────────────────
-- status='applied' is terminal and sits OUTSIDE inventory_reconciliations_active_unique_idx,
-- so it never collides with the 25/6 stocktake rows and never leaves an active row behind.
-- physical_count and approved_opening_stock stay NULL: this is a CURRENT settlement,
-- not a stock count and not an opening balance.
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
  CASE WHEN p.variant_id IS NULL THEN p.storefront END,
  CASE WHEN p.variant_id IS NOT NULL THEN COALESCE(p.storefront, 0) END,
  NULL, NULL,
  'applied',
  jsonb_build_object(
    'decision',                 'OWNER_CONFIRMED_CURRENT_STOREFRONT_AS_CANONICAL_INVENTORY_TRUTH',
    'owner',                    'jaafar',
    'execution_id',             :'execution_id',
    'category',                 p.category,
    'storefront_stock_before',  p.storefront,
    'ledger_before',            COALESCE(p.ledger, 0),
    'calculated_adjustment',    p.adjustment,
    'expected_ledger_after',    p.target_balance,
    'expected_storefront_after',p.storefront,
    'movement_count_before',    p.movement_count,
    'test_branch_id',           'br-floral-voice-a4a0c5iu',
    'production_branch_id',     'br-patient-mouse-a4d4cgr4',
    'real_order_path_test_status','externally_executed_owner_attested_passed',
    'before_hash', md5(concat_ws('|', p.product_id, COALESCE(p.variant_id,'NULL'),
                        (SELECT id FROM inventory_locations WHERE code='MAIN' AND is_active=true),
                        COALESCE(p.storefront,-1)::text, COALESCE(p.ledger,-999999)::text,
                        p.movement_count::text))
  ),
  CASE p.category
    WHEN 'A' THEN 'Phase 1A.5 — ledger settled to current storefront stock (owner decision).'
    WHEN 'B' THEN 'Phase 1A.5 — variant no longer present in products.variants; canonical stock is 0. Variant row already archived (is_active=false) by sync_product_variant_reconciliation.'
    WHEN 'C' THEN 'Phase 1A.5 — no ledger history existed; current storefront stock recorded as a manual_adjustment, deliberately NOT an opening_balance.'
  END,
  NULL, NULL,
  'owner:jaafar', now()
FROM phase1a5_plan p
WHERE p.category IN ('A','B','C') AND p.adjustment <> 0;

-- ── STEP 3. The movements. quantity_delta is computed, never hard-coded. ──
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
  'PHASE-1A5-TEST',
  'phase1a5:test:storefront-truth:' || p.product_id || ':' ||
    COALESCE(p.variant_id,'NULL') || ':' || :'execution_id',
  'IQD',
  now(),
  'owner:jaafar',
  jsonb_build_object(
    'decision',                  'OWNER_CONFIRMED_CURRENT_STOREFRONT_AS_CANONICAL_INVENTORY_TRUTH',
    'owner',                     'jaafar',
    'decision_timestamp',        now(),
    'execution_id',              :'execution_id',
    'category',                  p.category,
    'storefront_stock_before',   p.storefront,
    'ledger_before',             COALESCE(p.ledger, 0),
    'calculated_adjustment',     p.adjustment,
    'expected_ledger_after',     p.target_balance,
    'expected_storefront_after', p.storefront,
    'production_branch_id',      'br-patient-mouse-a4d4cgr4',
    'test_branch_id',            'br-floral-voice-a4a0c5iu',
    'reason',                    'Phase 1A.5 full inventory settlement to current storefront truth',
    'real_order_path_test_status','externally_executed_owner_attested_passed',
    'before_hash', md5(concat_ws('|', p.product_id, COALESCE(p.variant_id,'NULL'),
                        (SELECT id FROM inventory_locations WHERE code='MAIN' AND is_active=true),
                        COALESCE(p.storefront,-1)::text, COALESCE(p.ledger,-999999)::text,
                        p.movement_count::text))
  )
FROM phase1a5_plan p
WHERE p.category IN ('A','B','C') AND p.adjustment <> 0;

-- ── STEP 4. In-transaction assertions. Any failure => whole tx rolls back. ─
DO $$
DECLARE v_loc text; v_bad int; v_written int; v_planned int;
BEGIN
  SELECT id INTO v_loc FROM inventory_locations WHERE code='MAIN' AND is_active=true;

  SELECT count(*) INTO v_planned FROM phase1a5_plan
   WHERE category IN ('A','B','C') AND adjustment <> 0;
  SELECT count(*) INTO v_written FROM inventory_movements
   WHERE idempotency_key LIKE 'phase1a5:test:%';
  IF v_written <> v_planned THEN
    RAISE EXCEPTION 'ABORT: wrote % movements, planned %', v_written, v_planned;
  END IF;

  -- every settled row's ledger now equals its target
  SELECT count(*) INTO v_bad FROM phase1a5_plan p
   WHERE p.category IN ('A','B','C') AND p.adjustment <> 0
     AND (SELECT COALESCE(SUM(m.quantity_delta),0) FROM inventory_movements m
           WHERE m.product_id=p.product_id
             AND m.variant_id IS NOT DISTINCT FROM p.variant_id
             AND m.location_id=v_loc) <> p.target_balance;
  IF v_bad > 0 THEN RAISE EXCEPTION 'ABORT: % rows did not reach target balance', v_bad; END IF;

  -- no negative canonical balance anywhere
  SELECT count(*) INTO v_bad FROM (
    SELECT product_id, variant_id, SUM(quantity_delta) s FROM inventory_movements
     WHERE location_id=v_loc GROUP BY 1,2 HAVING SUM(quantity_delta) < 0) x;
  IF v_bad > 0 THEN RAISE EXCEPTION 'ABORT: % rows have a negative canonical balance', v_bad; END IF;

  -- exactly one settlement movement per settled row
  SELECT count(*) INTO v_bad FROM (
    SELECT product_id, variant_id FROM inventory_movements
     WHERE idempotency_key LIKE 'phase1a5:test:%'
     GROUP BY 1,2 HAVING count(*) > 1) x;
  IF v_bad > 0 THEN RAISE EXCEPTION 'ABORT: duplicate settlement movements on % rows', v_bad; END IF;

  -- only manual_adjustment / owner_stock_reconciliation was written
  SELECT count(*) INTO v_bad FROM inventory_movements
   WHERE idempotency_key LIKE 'phase1a5:test:%'
     AND (movement_type <> 'manual_adjustment' OR source_type <> 'owner_stock_reconciliation');
  IF v_bad > 0 THEN RAISE EXCEPTION 'ABORT: % movements have the wrong type/source', v_bad; END IF;

  -- ledger mode untouched
  IF (SELECT value FROM settings WHERE key='inventory_ledger_mode') <> 'enforce' THEN
    RAISE EXCEPTION 'ABORT: inventory_ledger_mode changed during the transaction';
  END IF;
END $$;

-- ── STEP 5. Final shape of the run (read this before COMMIT/ROLLBACK) ─────
SELECT category, count(*) AS movements_written, sum(adjustment) AS net_quantity_change
FROM phase1a5_plan
WHERE category IN ('A','B','C') AND adjustment <> 0
GROUP BY category ORDER BY category;
