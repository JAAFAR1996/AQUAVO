# Packaging & Carton Planner — Operator Runbook

**Branch under test:** `feature/accounting-packaging-carton-planner`
**Production:** never written to. Not during this runbook, not at any point.

This runbook is executed by an operator holding **write-capable** Neon access.
The implementing session's Neon MCP is read-only — every write tool is absent —
so branch creation and migration application must be performed here.

Follow it literally. Return everything listed in
**[REQUIRED OPERATOR RETURN PACKAGE](#required-operator-return-package)**.

---

## STOP-ON-FAILURE RULE — read this first

> **If any step fails, stop immediately.**
>
> - Do **not** run the remaining steps.
> - Do **not** attempt to repair, patch or work around the failure.
> - Do **not** touch Production, its data, or its `schema_migrations` in any way.
> - Do **not** delete the test branch — it is the evidence.
>
> Return the failing command, its full stdout and stderr, and the branch it ran
> on. A halted run with a clear error is a successful outcome for this runbook;
> a "fixed" run that hides what went wrong is not.

---

## 0. Preconditions and hard rules

| | |
|---|---|
| Neon project | `shiny-tree-43710630` (`fishweb`) |
| Production branch | `br-patient-mouse-a4d4cgr4` — **read-only reference, never a target** |
| Pre-0039 backup | `br-late-thunder-a42sjx9q` (*backup-before-accounting-phase1b-20260730*) |
| Database | `neondb`, role `neondb_owner`, PostgreSQL 17 |

### Absolute rules

1. **Every SQL statement in this runbook runs on a CLONED TEST BRANCH.**
   Not one statement is executed against `br-patient-mouse-a4d4cgr4`.
2. The 0039 verification branch is **cloned from** `br-late-thunder-a42sjx9q`.
3. The no-op verification branch is **cloned from** `br-patient-mouse-a4d4cgr4`.
   It is a clone. The no-op test proves the migration is inert on a
   post-0039 database — proving that **on a copy** is the entire point.
4. The carton-migration branch is **cloned from** `br-patient-mouse-a4d4cgr4`.
5. Production is read **only** for the before/after proofs in §1 and §7, using
   `SELECT` statements exclusively.
6. Never run `npm run db:push`. The schema has drifted; push would attempt a
   destructive reconciliation.
7. No merge, no push to a protected release branch, no Production deployment.

---

## ⚠ Migration 0039 — SEMANTIC RECONSTRUCTION, NOT THE ORIGINAL ARTIFACT

Read this before running anything in §2. Misreading it will make you report a
false failure.

`migrations/0039_accounting_phase1b_snapshot_writer_and_payment_ledger.sql`
**is not the original migration file.** The original was applied to Production on
2026-07-30 and was never committed to git. It was searched for exhaustively on
2026-07-31 — the repository, every commit of its history, the 176-commit mirror
at `Documents/AQUAVO-Backups/git-independence-q2f-20260731/repository-mirror.git`,
and every release archive on the machine. **It does not exist anywhere.**

The committed file is a **semantic reconstruction**, rebuilt object by object
from live Production definitions via `pg_get_functiondef()`,
`pg_get_triggerdef()` and `pg_get_viewdef()`.

### The two checksums are different, and that is correct

| | value | what it is |
|---|---|---|
| Production `schema_migrations.checksum` | `7b76a29582d293d8413b32205afb38400f35faa06127d1a67f40c75f2ea30b11` | the **original, missing** artifact |
| SHA-256 of the committed file | `9f00fac1a2356c274207035e182346912f880b2f188671c3272ea23357e58962` | the **reconstruction** |

> **Do not compare these two values.** They will never match and are not meant
> to. Comments, statement ordering and whitespace of the original are
> unknowable, so byte-level equality is neither claimed nor achievable.
>
> **Never describe this file as byte-identical to the original.**
> **Never report the two checksums as equal, or a mismatch as a defect.**

What **is** being proved in §2 is **semantic equivalence**: applying the
reconstruction to a pre-0039 database produces a catalog identical to
Production's, verified across all six object categories.

When registering it on a fresh branch, use the **reconstruction's own**
checksum, never Production's.

---

## 1. Production BEFORE proof (read-only)

Run against `br-patient-mouse-a4d4cgr4` with `SELECT` only. Record the output —
you will run the identical query again in §7.

```sql
SELECT 'max_migration'  k, max(version) v FROM schema_migrations
UNION ALL SELECT 'carton_tables', count(*)::text
  FROM information_schema.tables WHERE table_schema='public' AND table_name IN
  ('product_packing_data','carton_reservations','order_packing_plans',
   'order_packing_plan_items','admin_stock_alerts','order_return_packaging_losses',
   'packing_import_drafts','packing_import_draft_lines')
UNION ALL SELECT 'fulfillment_materials', count(*)::text FROM fulfillment_materials
UNION ALL SELECT 'orders', count(*)::text FROM orders
UNION ALL SELECT 'orders_financial_hash',
  md5(string_agg(id||':'||total||':'||coalesce(rounded_total::text,'-')||':'||
                 coalesce(box_cost::text,'-'), E'\n' ORDER BY id)) FROM orders
UNION ALL SELECT 'inventory_movements', count(*)::text FROM inventory_movements
UNION ALL SELECT 'packaging_inventory_movements', count(*)::text FROM packaging_inventory_movements;

-- The 0039 ledger row, verbatim.
SELECT version, checksum, applied_at, applied_by, rolled_back_at
  FROM schema_migrations
 WHERE version = '0039_accounting_phase1b_snapshot_writer_and_payment_ledger';
```

**Reference values recorded 2026-07-31:**

| key | value |
|---|---|
| `max_migration` | `0039_accounting_phase1b_snapshot_writer_and_payment_ledger` |
| `carton_tables` | `0` |
| `fulfillment_materials` | `0` |
| `orders` | `44` |
| `orders_financial_hash` | `7f55493b0e52aed78cfcc444261c3567` |
| `packaging_inventory_movements` | `0` |
| 0039 `checksum` | `7b76a29582d293d8413b32205afb38400f35faa06127d1a67f40c75f2ea30b11` |
| 0039 `applied_at` | `2026-07-30T15:19:58.891Z` |
| 0039 `rolled_back_at` | `null` |

`orders`, `inventory_movements` and `orders_financial_hash` may legitimately
differ if genuine new customer orders arrived. That is fine — what matters is
that they are **identical in §1 and §7**, i.e. unchanged *by this runbook*.

---

## 2. Migration 0039 — semantic equivalence

### The catalog signature query

Used throughout. Run it identically on every branch you compare.

```sql
WITH sig AS (
 SELECT 'T:'||table_name AS s, 'tables' k FROM information_schema.tables
   WHERE table_schema='public' AND table_type='BASE TABLE'
 UNION ALL SELECT 'C:'||table_name||'.'||column_name||':'||data_type||':'||is_nullable||':'||coalesce(column_default,'-'), 'columns'
   FROM information_schema.columns WHERE table_schema='public'
 UNION ALL SELECT 'F:'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')='||md5(pg_get_functiondef(p.oid)), 'functions'
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f'
 UNION ALL SELECT 'G:'||c.relname||'.'||t.tgname||'='||md5(pg_get_triggerdef(t.oid)), 'triggers'
   FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND NOT t.tgisinternal
 UNION ALL SELECT 'K:'||conrelid::regclass::text||'.'||conname||'='||md5(pg_get_constraintdef(oid)), 'constraints'
   FROM pg_constraint WHERE connamespace='public'::regnamespace
 UNION ALL SELECT 'I:'||indexname||'='||md5(indexdef), 'indexes'
   FROM pg_indexes WHERE schemaname='public'
)
SELECT k, count(*) n, md5(string_agg(s, E'\n' ORDER BY s)) h FROM sig GROUP BY k ORDER BY k;
```

**Production reference, 2026-07-31:**

| category | n | h |
|---|---|---|
| columns | 3386 | `795fa0a819e341c1282375d5013a6547` |
| constraints | 843 | `d7ea3dfb966bc827052f53f4b9e4c918` |
| functions | 194 | `95d0ebfba9bc8fc53672cc9d7973a2a1` |
| indexes | 767 | `a6beebd05d96d56c463e87459450683f` |
| tables | 250 | `79ea96a5b521dcc331756868d4de1562` |
| triggers | 49 | `6b0dd7824f25fd047f85c5dde82c726b` |

### 2a. It reproduces Production's catalog

```bash
# CLONE of the pre-0039 backup. Never the backup itself.
neon branches create \
  --project-id shiny-tree-43710630 \
  --name verify-0039-<YYYYMMDD> \
  --parent br-late-thunder-a42sjx9q
# record the returned branch id
```

1. Run the signature query on the new branch. **Record all six rows — BEFORE.**
2. Apply the reconstruction:
   ```bash
   psql "$VERIFY_URL" -v ON_ERROR_STOP=1 \
     -f migrations/0039_accounting_phase1b_snapshot_writer_and_payment_ledger.sql
   ```
   Capture stdout and stderr.
3. Run the signature query again. **Record all six rows — AFTER.**

**PASS:** the six AFTER rows match the Production reference table above exactly,
in both `n` and `h`.

**This — and only this — is the semantic-equivalence proof.** Do not compare
file checksums.

### 2b. It is a no-op on an already-migrated database

```bash
# CLONE of Production. The migration is applied to the CLONE, never to Production.
neon branches create \
  --project-id shiny-tree-43710630 \
  --name noop-0039-<YYYYMMDD> \
  --parent br-patient-mouse-a4d4cgr4
```

1. Signature query on the clone. **Record — BEFORE.**
2. `psql "$NOOP_URL" -v ON_ERROR_STOP=1 -f migrations/0039_...sql`
3. Signature query again. **Record — AFTER.**
4. Also confirm the settings did not move:
   ```sql
   SELECT key, value FROM settings
    WHERE key IN ('payment_ledger_enabled','financial_snapshot_writer_enabled');
   -- both must still be 'true', and no row may have been inserted or updated
   ```

**PASS:** BEFORE and AFTER are byte-identical across all six categories. That
proves running this file against Production would change nothing.

---

## 3. Apply migrations 0040–0048

```bash
# CLONE of Production.
neon branches create \
  --project-id shiny-tree-43710630 \
  --name carton-test-<YYYYMMDD> \
  --parent br-patient-mouse-a4d4cgr4
```

Apply **in this order**, each with `ON_ERROR_STOP=1`, capturing stdout and
stderr for every file:

| # | file |
|---|---|
| 0040 | `0040_packaging_carton_catalog.sql` |
| 0041 | `0041_product_packing_data.sql` |
| 0042 | `0042_carton_reservations.sql` |
| 0043 | `0043_order_packing_plans.sql` |
| 0044 | `0044_admin_stock_alerts.sql` |
| 0045 | `0045_order_return_packaging_losses.sql` |
| 0046 | `0046_return_packaging_loss_source.sql` |
| 0047 | `0047_packing_import_drafts.sql` |
| 0048 | `0048_packing_policy_and_preparation_costs.sql` |

Each is wrapped in `BEGIN … COMMIT`, is idempotent, and registers itself in
`schema_migrations`.

---

## 4. Post-migration assertions

Run all of these on the carton-test branch. Record every result.

```sql
-- A1. Exactly two preparation materials, both per_order, neither stock-tracked.
SELECT sku, calculation_basis, stock_tracked, current_unit_cost
  FROM fulfillment_materials WHERE sku IS NOT NULL ORDER BY sku;
--   PRICE_LABEL           | per_order | f |  50
--   THANK_YOU_SOCIAL_CARD | per_order | f | 100

-- A2. NO carton was invented.
SELECT count(*) FROM fulfillment_materials WHERE material_kind = 'carton';   -- 0

-- A3. No product packing data was invented.
SELECT count(*) FROM product_packing_data;                                   -- 0

-- A4. All eight new tables exist.
SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN
  ('product_packing_data','carton_reservations','order_packing_plans','order_packing_plan_items',
   'admin_stock_alerts','order_return_packaging_losses','packing_import_drafts',
   'packing_import_draft_lines');                                            -- 8

-- A5. The dedup / idempotency indexes exist.
SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname IN
 ('asa_one_open_uidx','cres_one_active_uidx','cres_idempotency_uidx',
  'orpl_event_line_uidx','ppd_product_variant_uidx','opp_one_live_uidx')
 ORDER BY indexname;                                                         -- all 6

-- A6. The cumulative return-quantity guard exists.
SELECT tgname FROM pg_trigger WHERE tgname = 'orpl_cumulative_guard';        -- 1 row

-- A7. Approved, effective-dated cost trail for both seeded materials.
SELECT f.sku, r.approval_status, r.cost_basis, r.unit_cost
  FROM material_cost_records r JOIN fulfillment_materials f ON f.id = r.material_id
 WHERE f.sku IN ('PRICE_LABEL','THANK_YOU_SOCIAL_CARD') ORDER BY f.sku;
--   both 'approved' / 'verified_manual_standard' / 50 and 100

-- A8. Support policy and kill switches seeded.
SELECT key, value FROM settings
 WHERE key LIKE 'packing_%' OR key LIKE 'carton_%' ORDER BY key;
--   packing_min_support_ratio 0.80 · packing_max_overhang_ratio 0.20
--   packing_fragile_min_support_ratio 0.95 · carton_planner_enabled true
--   carton_reservations_enabled true

-- A9. Historical order financials untouched on the test branch.
SELECT count(*) AS orders,
       md5(string_agg(id||':'||total||':'||coalesce(rounded_total::text,'-')||':'||
                      coalesce(box_cost::text,'-'), E'\n' ORDER BY id)) AS financial_hash
  FROM orders;
--   must equal the §1 Production BEFORE values

-- A10. Product inventory untouched.
SELECT count(*) FROM inventory_movements;                 -- unchanged from §1
SELECT count(*) FROM packaging_inventory_movements;       -- unchanged from §1

-- A11. Existing return events still 'manual' and still zero.
SELECT packaging_loss_source, count(*), sum(packaging_loss)
  FROM order_return_events GROUP BY 1;                    -- manual | 4 | 0

-- A12. Operational flags unchanged.
SELECT key, value FROM settings
 WHERE key IN ('inventory_ledger_mode','payment_ledger_enabled','financial_snapshot_writer_enabled');
--   enforce / true / true

-- A13. Tax Final still fail-closed.
SELECT tax_report_ready, primary_tax_blocker FROM accounting_readiness_status;
--   tax_report_ready must be FALSE
```

---

## 5. Rollback, then MANDATORY re-apply

A rollback that leaves debris behind only reveals itself on the next apply. The
re-apply is **not optional** — during local testing it caught two real defects.

### 5a. Roll back in reverse order

Apply the `_rollback.sql` files **0048 → 0040**, capturing output for each:

```
0048_packing_policy_and_preparation_costs_rollback.sql
0047_packing_import_drafts_rollback.sql
0046_return_packaging_loss_source_rollback.sql
0045_order_return_packaging_losses_rollback.sql
0044_admin_stock_alerts_rollback.sql
0043_order_packing_plans_rollback.sql
0042_carton_reservations_rollback.sql
0041_product_packing_data_rollback.sql
0040_packaging_carton_catalog_rollback.sql
```

Then assert:

```sql
-- R1. All eight new tables are gone.
SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN
  ('product_packing_data','carton_reservations','order_packing_plans','order_packing_plan_items',
   'admin_stock_alerts','order_return_packaging_losses','packing_import_drafts',
   'packing_import_draft_lines');                                            -- 0

-- R2. The carton columns are gone.
SELECT count(*) FROM information_schema.columns WHERE table_schema='public'
   AND table_name='fulfillment_materials'
   AND column_name IN ('sku','material_kind','internal_length_cm');           -- 0

-- R3. Every feature migration is flagged rolled back.
SELECT version, rolled_back_at FROM schema_migrations
 WHERE version LIKE '004%' ORDER BY version;                                  -- all 9 non-null

-- R4. ★ Approved cost records SURVIVED. They are evidence and are never deleted;
--     mcr_approved_guard forbids it. The seeded materials are ARCHIVED, not dropped.
SELECT count(*) FROM material_cost_records WHERE created_by = 'migration-0048'; -- 2
SELECT count(*) FROM fulfillment_materials
 WHERE name IN ('ملصق السعر','كارت الشكر والتواصل');                            -- 2

-- R5. The pre-existing fulfillment schema was NOT taken down with it.
SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN
  ('fulfillment_materials','packaging_inventory_movements',
   'order_fulfillment_events','order_fulfillment_lines');                     -- 4

-- R6. Historical fixture data untouched.
SELECT count(*) FROM orders;                                                  -- unchanged
SELECT count(*) FROM order_return_events;                                     -- unchanged
```

### 5b. ★ MANDATORY re-apply

1. **Re-apply 0039 if — and only if — the branch state requires it.** On a
   branch cloned from Production, 0039 is already present and this step is a
   no-op; run it anyway and confirm it changes nothing. On a branch cloned from
   the pre-0039 backup, apply it first.
2. **Re-apply 0040 → 0048 in order**, capturing output for each.
3. **Re-run every assertion in §4 (A1–A13).** All must pass again.
4. **Re-apply-specific assertions:**

```sql
-- P1. ★ No duplicate preparation materials after the rollback/re-apply cycle.
SELECT sku, count(*) FROM fulfillment_materials
 WHERE sku IN ('PRICE_LABEL','THANK_YOU_SOCIAL_CARD') GROUP BY sku;
--   exactly one row each, count = 1

SELECT name, count(*) FROM fulfillment_materials
 WHERE name IN ('ملصق السعر','كارت الشكر والتواصل') GROUP BY name;
--   exactly one row each, count = 1

-- P2. The archived materials were REVIVED in place, not re-created alongside.
SELECT sku, active, archived_at FROM fulfillment_materials
 WHERE sku IN ('PRICE_LABEL','THANK_YOU_SOCIAL_CARD') ORDER BY sku;
--   active = true, archived_at IS NULL

-- P3. ★ Approved cost records were not duplicated either.
SELECT count(*) FROM material_cost_records WHERE created_by = 'migration-0048'; -- 2

-- P4. Still no invented carton.
SELECT count(*) FROM fulfillment_materials WHERE material_kind='carton';        -- 0
```

**If P1 returns a count of 2 for either sku or name, STOP.** That is the
duplicate-seed defect and it must be reported, not corrected in place.

---

## 6. Concurrency proof — two independent connections

This is the guarantee that two orders cannot both take the last carton. It
**cannot** be staged on a single connection: the whole mechanism is a
transaction-scoped advisory lock, and one connection cannot block itself.

### 6a. Set up exactly one available carton

On the carton-test branch (with 0040–0048 applied):

```sql
INSERT INTO fulfillment_materials
  (id, name, sku, category, material_kind, calculation_basis, stock_tracked,
   unit, currency, active, internal_length_cm, internal_width_cm,
   internal_height_cm, max_weight_kg)
VALUES ('conc-carton','كارتونة اختبار التزامن','CONC-TEST','box','carton',
        'per_carton', true, 'piece','IQD', true, 27, 20, 14, 5);

-- Exactly ONE unit on hand.
INSERT INTO packaging_inventory_movements
  (id, material_id, movement_type, quantity, idempotency_key)
VALUES ('conc-receipt','conc-carton','purchase_receipt', 1, 'conc:receipt:1');

-- Two orders that will compete for it.
INSERT INTO orders (id, status) VALUES ('conc-order-a','confirmed')
  ON CONFLICT DO NOTHING;
INSERT INTO orders (id, status) VALUES ('conc-order-b','confirmed')
  ON CONFLICT DO NOTHING;

-- Confirm the starting point: on_hand 1, reserved 0, available 1.
SELECT
  COALESCE((SELECT SUM(quantity) FROM packaging_inventory_movements
             WHERE material_id='conc-carton'),0) AS on_hand,
  COALESCE((SELECT SUM(quantity) FROM carton_reservations
             WHERE material_id='conc-carton' AND state='active'),0) AS reserved;
```

### 6b. Run the race

Open **two separate psql sessions**, A and B, both connected to the carton-test
branch. This is what the application does inside `reserveCartons()`.

**Connection A:**
```sql
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('carton:conc-carton'));

SELECT COALESCE((SELECT SUM(quantity) FROM packaging_inventory_movements
                  WHERE material_id='conc-carton'),0)
     - COALESCE((SELECT SUM(quantity) FROM carton_reservations
                  WHERE material_id='conc-carton' AND state='active'),0) AS available;
-- expect: 1

INSERT INTO carton_reservations
  (id, order_id, material_id, quantity, state, idempotency_key)
VALUES ('res-a','conc-order-a','conc-carton',1,'active','reserve:conc-order-a:req-a:conc-carton');
-- DO NOT COMMIT YET. Move to connection B.
```

**Connection B — while A is still open:**
```sql
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('carton:conc-carton'));
-- ★ This BLOCKS. Record that it blocks; that is the mechanism working.
```

**Back on connection A:**
```sql
COMMIT;
```

**Connection B unblocks. Continue on B:**
```sql
SELECT COALESCE((SELECT SUM(quantity) FROM packaging_inventory_movements
                  WHERE material_id='conc-carton'),0)
     - COALESCE((SELECT SUM(quantity) FROM carton_reservations
                  WHERE material_id='conc-carton' AND state='active'),0) AS available;
-- ★ expect: 0  — B now sees A's reservation

-- The application raises INSUFFICIENT_CARTON_STOCK at exactly this point and
-- rolls back. Reproduce that decision explicitly:
DO $$
DECLARE v_available numeric;
BEGIN
  SELECT COALESCE((SELECT SUM(quantity) FROM packaging_inventory_movements
                    WHERE material_id='conc-carton'),0)
       - COALESCE((SELECT SUM(quantity) FROM carton_reservations
                    WHERE material_id='conc-carton' AND state='active'),0)
    INTO v_available;
  IF v_available < 1 THEN
    RAISE EXCEPTION 'INSUFFICIENT_CARTON_STOCK: available %, need 1', v_available;
  END IF;
END $$;
-- ★ expect: ERROR ... INSUFFICIENT_CARTON_STOCK: available 0, need 1

ROLLBACK;
```

### 6c. Assert the outcome

```sql
-- C1. Exactly ONE active reservation. No over-reservation.
SELECT count(*) FROM carton_reservations
 WHERE material_id='conc-carton' AND state='active';                          -- 1

-- C2. It belongs to order A. B holds nothing.
SELECT order_id, quantity, state FROM carton_reservations
 WHERE material_id='conc-carton';                                             -- conc-order-a | 1 | active

-- C3. No duplicate reservations for the same order+material.
SELECT order_id, material_id, count(*) FROM carton_reservations
 WHERE state='active' GROUP BY 1,2 HAVING count(*) > 1;                       -- 0 rows

-- C4. Available is now 0 and never went negative.
SELECT COALESCE((SELECT SUM(quantity) FROM packaging_inventory_movements
                  WHERE material_id='conc-carton'),0)
     - COALESCE((SELECT SUM(quantity) FROM carton_reservations
                  WHERE material_id='conc-carton' AND state='active'),0) AS available;  -- 0

-- C5. The unique index would have blocked a duplicate anyway. Prove it.
INSERT INTO carton_reservations
  (id, order_id, material_id, quantity, state, idempotency_key)
VALUES ('res-a2','conc-order-a','conc-carton',1,'active','reserve:conc-order-a:req-a2:conc-carton');
-- ★ expect: ERROR ... duplicate key value violates unique constraint "cres_one_active_uidx"
```

**Record the complete stdout and stderr of BOTH connections**, including the
observed blocking on B and the exact `INSUFFICIENT_CARTON_STOCK` message.

---

## 7. Production AFTER proof (read-only)

Re-run the **exact** §1 queries against `br-patient-mouse-a4d4cgr4`.

**PASS conditions:**

- `max_migration` is still `0039_accounting_phase1b_snapshot_writer_and_payment_ledger`
- `carton_tables` is still `0`
- `fulfillment_materials` is still `0`
- `packaging_inventory_movements` is still `0`
- `orders`, `inventory_movements` and `orders_financial_hash` are **identical to
  the §1 values**
- the 0039 `schema_migrations` row is **byte-identical** to §1 — same `checksum`,
  same `applied_at`, same `applied_by`, and `rolled_back_at` still `null`

Any difference means Production was touched. **Stop and report it.**

---

## 8. Vercel Preview — NOT YET

Do **not** run `vercel link` or `vercel deploy`. Preview happens only after the
owner has reviewed and accepted this runbook's results.

---

## REQUIRED OPERATOR RETURN PACKAGE

Return **all seventeen items**, verbatim and unedited. Truncated or summarised
output is not accepted — the point of this package is that someone else can
check your work rather than take it on trust.

| # | item |
|---|---|
| 1 | **Test branch names and IDs** — all three (verify-0039, noop-0039, carton-test) |
| 2 | **Parent branch of each**, stated explicitly |
| 3 | **The exact branch-creation commands** you ran |
| 4 | **The exact apply command for every migration**, in the order run |
| 5 | **stdout and stderr of every operation**, complete |
| 6 | **The six catalog hashes BEFORE and AFTER**, for §2a and §2b |
| 7 | **Semantic-equivalence proof for 0039** — the §2a AFTER table alongside the Production reference. *Not* a file-checksum comparison. |
| 8 | **No-op proof on the Production CLONE** — §2b BEFORE and AFTER identical |
| 9 | **Results of applying 0040–0048** |
| 10 | **Results of post-migration assertions A1–A13** |
| 11 | **Results of the rollback**, including R1–R6 |
| 12 | **Results of the re-apply after rollback**, including A1–A13 re-run and P1–P4 |
| 13 | **Results of the two-connection concurrency test** — both connections' full output, the observed block on B, the `INSUFFICIENT_CARTON_STOCK` error, and C1–C5 |
| 14 | **Preparation-material duplication check** — P1, P2 and P3 output |
| 15 | **Proof Production did not change** — §1 and §7 side by side |
| 16 | **Proof Production `schema_migrations` was not touched** — the 0039 row from §1 and §7 side by side |
| 17 | **Every difference, warning, error or anomaly observed** — including anything that looked harmless. Do not omit, filter or resolve any of it. |

### What must NOT be in the package

- Any statement that the reconstruction's checksum equals Production's.
- Any repaired, retried or worked-around failure presented as a pass.
- Any SQL executed against `br-patient-mouse-a4d4cgr4` other than `SELECT`.
- Any change to Production data, schema or `schema_migrations`.
- Any Vercel deployment.
- Any merge or push to a protected branch.

---

## What must never happen

- `npm run db:push` — the schema has drifted; push would reconcile destructively.
- Any write to `products.stock`, variant stock or `inventory_movements` from a
  carton code path.
- Re-applying 0039 to Production. The row already exists and stays as it is.
- `vercel deploy --prod` without the separate Production release token.
- Merging to `main`.
