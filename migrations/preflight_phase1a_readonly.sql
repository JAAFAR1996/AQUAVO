-- ============================================================================
-- preflight_phase1a_readonly.sql
--
-- READ-ONLY. Run BEFORE applying any Phase 1A migration (three migrations; the
-- cash-settlement one was withdrawn as redundant).
-- Contains no DDL, no INSERT/UPDATE/DELETE. Safe to run against production.
--
-- Purpose: prove the preconditions each migration depends on, so a migration
-- aborts in review rather than mid-apply.
--
-- Results recorded against production (project shiny-tree-43710630) on
-- 2026-07-28 are noted per query as ACTUAL.
-- ============================================================================

-- ── 1. Which Phase 1A objects already exist? (expect: none, first run) ─────
-- ACTUAL 2026-07-28: 0 rows — no migration applied.
SELECT 'column' AS kind, table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'order_items_relational' AND column_name IN (
      'unit_sale_price_snapshot','discount_snapshot',
      'final_unit_sale_price_snapshot','sale_price_snapshot_at','sale_price_source'))
    OR (table_name = 'product_cost_history' AND column_name IN (
      'cost_price_resolution','packaging_cost_resolution','insert_cost_resolution',
      'cost_resolution_note','purchase_lot_id','evidence_ids','approved_by',
      'approved_at','reason'))
  )
UNION ALL
SELECT 'trigger', tgrelid::regclass::text, tgname
FROM pg_trigger WHERE tgname = 'order_item_cost_snapshot_immutable' AND NOT tgisinternal
UNION ALL
SELECT 'constraint', conrelid::regclass::text, conname
FROM pg_constraint
WHERE conname IN ('cash_settlements_carrier_number_key','cash_settlements_gross_identity_chk');
-- NOTE: both names above belong to a WITHDRAWN migration. They must stay absent.
-- Production's real protection is cash_settlements_settlement_number_key +
-- cash_settlements_net_formula_check, which pre-date this work.

-- ── 2. Duplicate settlement keys (informational) ───────────────────────────
-- Production already enforces UNIQUE(settlement_number) globally via
-- `cash_settlements_settlement_number_key`, so this cannot return rows. Kept as
-- an independent confirmation that the constraint is doing its job.
-- ACTUAL 2026-07-28: 0 rows.
SELECT carrier, settlement_number, count(*) AS occurrences
FROM public.cash_settlements
GROUP BY carrier, settlement_number
HAVING count(*) > 1;

-- ── 3. Rows violating gross = fees + net (informational) ───────────────────
-- Production enforces `cash_settlements_net_formula_check` (VALIDATED, all
-- statuses), so this cannot return rows either. Kept as confirmation.
-- ACTUAL 2026-07-28: 0 rows.
SELECT id, settlement_number, carrier,
       gross_amount, fees_amount, net_amount,
       (gross_amount - fees_amount - net_amount) AS identity_delta
FROM public.cash_settlements
WHERE status = 'reconciled'
  AND gross_amount <> fees_amount + net_amount;

-- ── 4. BLOCKS fix_product_cost_history_nullable_rollback.sql ──────────────
-- The rollback refuses to run while any NULL cost exists (it will not fabricate
-- a 0). Forward migration is unaffected.
-- ACTUAL 2026-07-28: null_costs = 0, zero_costs = 0.
SELECT
  count(*) FILTER (WHERE cost_price IS NULL OR packaging_cost IS NULL OR insert_cost IS NULL) AS null_costs,
  count(*) FILTER (WHERE cost_price = 0) AS zero_cost_rows,
  count(*) AS total_rows
FROM public.product_cost_history;

-- ── 5. Rows the immutability trigger will freeze on creation ──────────────
-- Only 'exact'/'verified_zero' lines become immutable. A high count here means
-- a large behavioural change; 0 means the trigger is purely forward-looking.
-- ACTUAL 2026-07-28: exact = 0, verified_zero = 0 → forward-looking only.
SELECT
  count(*) FILTER (WHERE cost_snapshot_status = 'exact') AS will_freeze_exact,
  count(*) FILTER (WHERE cost_snapshot_status = 'verified_zero') AS will_freeze_verified_zero,
  count(*) FILTER (WHERE cost_snapshot_status IS NULL) AS null_status,
  count(*) AS total_lines
FROM public.order_items_relational;

-- ── 6. Values that would violate the new status CHECK vocabulary ──────────
-- CHECK is NOT VALID so history is not rejected, but an unexpected value here
-- signals a writer this branch does not know about.
-- ACTUAL 2026-07-28: only NULL and estimated_* families present.
SELECT cost_snapshot_status, count(*) AS n
FROM public.order_items_relational
GROUP BY cost_snapshot_status
ORDER BY n DESC;

-- ── 7. Financial fingerprints — capture BEFORE and compare AFTER ──────────
-- No migration in Phase 1A writes data, so every figure below MUST be
-- byte-identical after the apply. Any drift means a migration mutated money.
-- ACTUAL 2026-07-28: orders=42, order_lines=195, products=114,
--                    cost_history=120, settlements=2, expenses=0,
--                    delivered_revenue=1967920.00,
--                    settlement gross=2022170 fees=195000 net=1827170.
SELECT
  (SELECT count(*) FROM public.orders)                    AS orders,
  (SELECT count(*) FROM public.order_items_relational)    AS order_lines,
  (SELECT count(*) FROM public.products)                  AS products,
  (SELECT count(*) FROM public.product_cost_history)      AS cost_history_rows,
  (SELECT count(*) FROM public.cash_settlements)          AS settlements,
  (SELECT count(*) FROM public.expenses)                  AS expenses,
  (SELECT coalesce(sum(rounded_total), 0) FROM public.orders
     WHERE lower(trim(status)) = 'delivered')             AS delivered_revenue,
  (SELECT coalesce(sum(gross_amount), 0) FROM public.cash_settlements
     WHERE status = 'reconciled')                         AS settle_gross,
  (SELECT coalesce(sum(fees_amount), 0) FROM public.cash_settlements
     WHERE status = 'reconciled')                         AS settle_fees,
  (SELECT coalesce(sum(net_amount), 0) FROM public.cash_settlements
     WHERE status = 'reconciled')                         AS settle_net;

-- ── 8. Lock / duration exposure ───────────────────────────────────────────
-- Table sizes drive how long an ACCESS EXCLUSIVE lock is held. All Phase 1A
-- DDL is metadata-only (ADD COLUMN nullable-no-default, ADD CONSTRAINT NOT
-- VALID, CREATE TRIGGER), so duration should be milliseconds regardless — but
-- confirm the tables are small before accepting that.
SELECT relname,
       pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
       (SELECT reltuples::bigint FROM pg_class WHERE oid = c.oid) AS approx_rows
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND relname IN ('order_items_relational','product_cost_history','cash_settlements','orders')
ORDER BY pg_total_relation_size(c.oid) DESC;

-- ── 9. Long-running transactions that would queue behind the DDL ──────────
-- ADD COLUMN takes ACCESS EXCLUSIVE. If a long transaction is open, the DDL
-- waits and every subsequent query queues behind it. Prefer a quiet window.
SELECT pid, state, now() - xact_start AS xact_age, left(query, 120) AS query
FROM pg_stat_activity
WHERE datname = current_database()
  AND xact_start IS NOT NULL
  AND now() - xact_start > interval '5 seconds'
ORDER BY xact_age DESC;
