# Production Accounting Cutover Plan

**Target:** `shiny-tree-43710630` / `br-patient-mouse-a4d4cgr4` (production, endpoint `ep-quiet-moon-a4h7tdze`)
**Status: NOT APPLIED. This plan is prepared for owner confirmation only.**

Evidence base: `final-neon-verify-result.md` (branch `br-fancy-mouse-a49ucj27`) and
`final-neon-rollback-result.md` (branch `br-twilight-cake-a4972nn6`). Both branches are
direct children of production taken at `parent_timestamp 2026-07-28T03:00:10Z` and both
began from the identical baseline production holds today.

> **Open item before executing:** the accounting Playwright matrix
> (`certification.spec.ts`, `fulfillment-admin.spec.ts`, 56 tests across four projects)
> has **not** been run against the final verification branch. See §15.

---

## 1. Ordered migration filenames

Apply in exactly this order. The order is a dependency order, not a preference:
2 installs the batch-scoped trigger exceptions that 3 relies on; 5 hardens the tables 4
creates; 6 adds a column to a table 4 creates; 9 depends on the `*_resolution` columns 7
adds.

1. `migrations/add_order_item_cost_snapshot.sql`
2. `migrations/add_orderitem_backfill_trigger_safety.sql`
3. `migrations/backfill_orderitems_from_jsonb.sql`
4. `migrations/add_fulfillment_costing.sql`
5. `migrations/add_fulfillment_hardening.sql`
6. `migrations/add_pim_line_identity.sql`
7. `migrations/add_product_cost_resolution.sql`
8. `migrations/fix_blocked_ips_timestamptz.sql`
9. `migrations/drop_product_cost_zero_defaults.sql`

## 2. Full SHA-256 hashes (verify before each step)

| # | File | SHA-256 |
|---|---|---|
| 1 | `add_order_item_cost_snapshot.sql` | `e507bce47ae334aa77de3df5b38ea2f53e3e656ea6d84f51a2433c4650b3b0ed` |
| 2 | `add_orderitem_backfill_trigger_safety.sql` | `ee96e878f98a53c8f303fc0f6be1c629da883cc4e6d2edbc01a717ce73c7cb89` |
| 3 | `backfill_orderitems_from_jsonb.sql` | `bbe942d34716dfc9941f8419559cc78fb45350bafd4faa8a24db962c758a3ac2` |
| 4 | `add_fulfillment_costing.sql` | `ea34a32f5f3d84b5913ca700531941a5ba7f53edf9ba125aa865345a979901d1` |
| 5 | `add_fulfillment_hardening.sql` | `5a7f43634f801f7dc2c77a5f621204c39b1ae1b9cf245a1377e2c67615547f47` |
| 6 | `add_pim_line_identity.sql` | `0b60607b46d17a7f8c34a873f63b2f64b4541b9586a364301ff3124a020dbd03` |
| 7 | `add_product_cost_resolution.sql` | `fd88ddd6f154f939462d30f2736da4443d304a9aea9606dc15387a08432552aa` |
| 8 | `fix_blocked_ips_timestamptz.sql` | `46d064dab3a21e45c09f2c994ca7124d4784c4d92d82165dbf867c47534ba2fb` |
| 9 | `drop_product_cost_zero_defaults.sql` | `5b9f414bc14f1029e8d2da4a29e665cb9494326115ee2a3de39e25261c0d060a` |

Rollback partners (§11) carry these hashes:

| Rollback file | SHA-256 |
|---|---|
| `add_order_item_cost_snapshot_rollback.sql` | `8811d78cc24830e1c70c61b11d1194918d73e6afe516a7ad4132044715dd1ae4` |
| `add_orderitem_backfill_trigger_safety_rollback.sql` | `7a969e6fff28dd838442d90c9ba7f648229d13c04673bc77ba5a76eb6a3e003a` |
| `backfill_orderitems_from_jsonb_rollback.sql` | `9baedea40786549c6d9cd00c3b16dd3304b8a2d6c20930444d9246edc43a0f44` |
| `add_fulfillment_costing_rollback.sql` | `80fb2b54da93ed0f3c932e71e9321a3adfe185476facd29ccf686cb46f291296` |
| `add_fulfillment_hardening_rollback.sql` | `8a7d97347556de33a7e8fc0c214e85f2fd881ac9e95a70b35724ea3282c510b4` |
| `add_pim_line_identity_rollback.sql` | `c105afb2b0ef55774544380e848eb877374e3d2dd5141ab9237bd3d442b82ec2` |
| `add_product_cost_resolution_rollback.sql` | `4e3fdaa8f87e44f6b1900ef7f1ba6ed93660ad643d653740aba4b31393176708` |
| `fix_blocked_ips_timestamptz_rollback.sql` | `1deb966884d3dff4b1038eae7c22ac6e4d7a593124f212630c54c201f80b9494` |
| `drop_product_cost_zero_defaults_rollback.sql` | `3a8f2cbcb3fff67cbc460c9745843b59b10325c7d94cf2430a162662062a23df` |

## 3. Expected locks and risk

All nine take an `ACCESS EXCLUSIVE` lock on the tables they alter, held only for the
duration of their (short) transaction. Note that `ACCESS EXCLUSIVE` on a hot table blocks
reads as well as writes, so the risk driver is **lock-queue latency**, not raw runtime.

| # | Tables locked | Lock | Risk | Note |
|---|---|---|---|---|
| 1 | `order_items_relational` | ACCESS EXCLUSIVE | **Low** | 8 nullable `ADD COLUMN` (metadata-only in PG 11+, no rewrite) + 5 `CHECK … NOT VALID` (no scan) |
| 2 | `orderitem_trigger_safety_audit` (new), 2 `CREATE OR REPLACE FUNCTION` | ACCESS EXCLUSIVE on the new table | **Medium** | Replaces two live trigger functions on `order_items_relational`. Behaviour change is additive (a batch-scoped exception) but it is live trigger logic |
| 3 | `order_items_relational` (INSERT), temp tables | ROW EXCLUSIVE | **Medium** | The only data-writing step. Inserts ~83 rows on the verified baseline. Aborts if any line is unresolved or ambiguous |
| 4 | 8 new tables | ACCESS EXCLUSIVE on new tables only | **Low** | Pure creation; existing tables untouched |
| 5 | 5 new tables + triggers on the tables from 4 | ACCESS EXCLUSIVE on those | **Low** | Only touches objects created in 4 |
| 6 | `packaging_inventory_movements` | ACCESS EXCLUSIVE | **Low** | Created in 4, so effectively empty. Adds `line_id` + partial unique index. Strictly strengthens duplicate protection |
| 7 | `products` | ACCESS EXCLUSIVE | **Low** | 6 nullable `ADD COLUMN` + 2 `CHECK … NOT VALID`. `products` is small (114 rows) but is read on every storefront page — keep the transaction short |
| 8 | `blocked_ips`, `login_attempts` | ACCESS EXCLUSIVE | **Medium** | `ALTER TYPE … USING` **rewrites both tables**. Cost scales with `login_attempts` size — check it in §5. Does not change `is_active`, so nothing is mass-unblocked |
| 9 | `products` | ACCESS EXCLUSIVE | **Low** | `DROP DEFAULT` ×3, `SET DEFAULT 'unresolved'` ×3. Catalog-only, no rewrite |

Highest-risk steps: **2** (live trigger replacement), **3** (only data write), **8** (only table rewrite).

## 4. Estimated execution duration

Measured on both child branches (identical data volume to production). Two independent runs agree within ~15%.

| # | Verify branch | Rollback branch | Plan for |
|---|---|---|---|
| 1 | 1966 ms | 2230 ms | ~3 s |
| 2 | 2742 ms | 2960 ms | ~4 s |
| 3 | 3365 ms | 2999 ms | ~4 s |
| 4 | 8517 ms | 7195 ms | ~10 s |
| 5 | 13996 ms | 13317 ms | ~17 s |
| 6 | 3083 ms | 2971 ms | ~4 s |
| 7 | 3795 ms | 2971 ms | ~5 s |
| 8 | 2801 ms | 3280 ms | ~4 s |
| 9 | 3764 ms | 4112 ms | ~5 s |
| **Total** | **44.0 s** | **42.0 s** | **~60 s** with headroom |

Production's compute is larger than the 0.25 CU branch computes, so these are
conservative. Budget a 10-minute window including checks.

## 5. Pre-migration production read-only checks

Run these against production **read-only** and require every value to match before starting.

```sql
select version(), current_database(), current_user;
-- expect: PostgreSQL 17.10 | neondb | neondb_owner

select count(*) total,
       count(*) filter (where deleted_at is null)     active,
       count(*) filter (where deleted_at is not null) soft_deleted,
       count(*) filter (where deleted_at is null and cost_price = 0)               active_zero_cost,
       count(*) filter (where deleted_at is null and cost_price = 0 and stock > 0) active_instock_zero_cost
from products;
-- expect: 114 | 114 | 0 | 1 | 0

select (select count(*) from pg_tables  where schemaname='public') tables,   -- expect 230
       (select count(*) from pg_indexes where schemaname='public') indexes,  -- expect 710
       (select count(*) from orders)                               orders,   -- expect 42
       (select count(*) from order_items_relational)                oir,     -- expect 112
       (select count(*) from inventory_movements)                   moves;   -- expect 194

select md5(string_agg(id::text||':'||coalesce(stock::text,'~'), ',' order by id)) from products;
-- expect: 30635a9204ba52d54b0ec2614cadc8a4

select value from settings where key='inventory_ledger_mode';   -- expect: enforce

-- migration targets must all be ABSENT (clean slate):
select to_regclass('public.fulfillment_materials'),
       to_regclass('public.orderitem_backfill_batches'),
       to_regclass('public.orderitem_trigger_safety_audit');
-- expect: three NULLs

-- sizes the only rewrite (step 8):
select count(*) from login_attempts;
select count(*) from blocked_ips;

-- confirm the three cost DEFAULTs are still present:
select column_name, column_default from information_schema.columns
where table_name='products' and column_name in ('cost_price','packaging_cost','insert_cost');
-- expect: 0 / 0 / 0
```

**Abort if any value differs.** A drifted baseline invalidates the certification.

Also confirm no long-running transaction is holding locks:

```sql
select pid, state, xact_start, query from pg_stat_activity
where xact_start < now() - interval '30 seconds' and state <> 'idle';
```

## 6. Backup / PITR checkpoint

1. Confirm Neon PITR retention covers the window; note the current LSN and UTC timestamp.
2. Create a **backup branch from production immediately before starting**, named
   `production-backup-before-accounting-cutover-<YYYYMMDD>`. This is the primary
   restore path and is cheaper and faster than replaying rollbacks.
3. Record the branch id and its `parent_lsn` in the run log.
4. Do not delete it until the cutover has been stable for at least one full business day.

## 7. Transactional execution commands

Set `DATABASE_URL` (or a dedicated `NEON_PROD_DATABASE_URL`) in the **process
environment** — never rely on a `.env` file. Never echo it.

For each of steps 1, 2, 4, 5, 6, 7, 8, 9:

```bash
# integrity gate — must print the SHA-256 from §2 and match HEAD
git rev-parse "HEAD:migrations/<file>.sql"
git show    "HEAD:migrations/<file>.sql" | sha256sum

# executor-owned transaction, abort on first error
psql "$PROD_URL" -v ON_ERROR_STOP=1 --single-transaction \
     -f migrations/<file>.sql
```

Step 3 (backfill) needs a transaction-local batch id in the **same** transaction. Do
**not** use `\i` — concatenate the preamble so it is one file, one transaction:

```bash
BATCH=$(psql "$PROD_URL" -At -c "select gen_random_uuid()")
{ printf "SELECT set_config('aquavo.backfill_batch_id','%s',true);\n" "$BATCH"
  git show HEAD:migrations/backfill_orderitems_from_jsonb.sql
} > /tmp/step3.sql

psql "$PROD_URL" -v ON_ERROR_STOP=1 --single-transaction -f /tmp/step3.sql
# RECORD $BATCH — it is the only key that can reverse this step.
```

`aquavo.backfill_allow_unresolved` must **not** be set. If the migration aborts because a
line is unresolved, that is the intended fail-closed behaviour — stop and investigate; do
not override.

Executor requirements (learned the hard way — see `final-neon-verify-result.md` §2):
* capture `psql`'s exit code **directly**, never through a pipeline (`cmd | sed` returns
  `sed`'s status);
* additionally treat any `psql: … error` line in the output as a failure;
* never use `\i` with a POSIX path when running a native Windows `psql`;
* verify each file against its `HEAD` blob immediately before executing it.

**Prohibited throughout:** `session_replication_role`, globally disabling triggers,
editing a migration to make it pass.

## 8. Readiness checks (immediately after step 9, before deploying)

```sql
-- 3 product cost-resolution columns
select count(*) from information_schema.columns
where table_name='products' and column_name like '%_resolution';           -- expect 3

-- order-item snapshot columns
select count(*) from information_schema.columns
where table_name='order_items_relational'
  and column_name ~ 'unit_(cost|packaging|insert)|cost_snapshot';          -- expect 8

-- fulfillment surface + PIM identity
select count(*) from pg_tables where schemaname='public'
  and tablename ~ 'fulfillment|packaging|orderitem_(backfill|trigger)';    -- expect 14
select count(*) from pg_indexes where indexname='pim_line_uidx';           -- expect 1

-- corrected time semantics
select data_type from information_schema.columns
where table_name='blocked_ips' and column_name='expires_at';               -- expect timestamp with time zone

-- no cost column retains DEFAULT 0
select column_name, column_default from information_schema.columns
where table_name='products' and column_name in ('cost_price','packaging_cost','insert_cost');
-- expect three NULL defaults

-- zero-cost guard present
select conname from pg_constraint where conrelid='products'::regclass
  and conname='products_zero_cost_needs_resolution_chk';                   -- expect 1 row

-- classification, and that nothing was invented or fabricated
select cost_price_resolution, count(*) from products where deleted_at is null
group by 1;                       -- expect known=113, unresolved=1, verified_zero absent/0
select count(*) from products where deleted_at is null and cost_price is null;   -- expect 0
select count(*) from products where deleted_at is null and stock>0
  and cost_price_resolution<>'known' and coalesce(cost_price,0)=0;               -- expect 0

-- totals moved only as designed
select (select count(*) from pg_tables where schemaname='public') tables,   -- expect 245
       (select count(*) from order_items_relational)               oir,     -- expect 195
       (select count(*) from inventory_movements)                  moves,   -- expect 194 (UNCHANGED)
       (select count(*) from products)                             products;-- expect 114
select md5(string_agg(id::text||':'||coalesce(stock::text,'~'), ',' order by id)) from products;
-- expect 30635a9204ba52d54b0ec2614cadc8a4 (UNCHANGED)

-- backfill audit record
select batch_id, rows_inserted, unresolved_lines, ambiguous_groups, reconciliation_complete
from orderitem_backfill_batches;   -- expect the recorded batch, 83, 0, 0, t
```

## 9. Smoke tests (post-deploy)

1. `GET /ready` → `200`, `{"status":"ready","orderCreationEnabled":true,"missingColumns":[]}`
2. `GET /health` → `200`
3. Product listing and one product detail page render.
4. Place one **storefront** order end-to-end; confirm its `order_items_relational` rows
   carry a populated cost snapshot with the expected `cost_snapshot_status`.
5. Place one **WhatsApp/admin** order; same assertion.
6. Attempt to order an out-of-stock item → expect **409**, no stock movement.
7. Confirm inventory locking: two concurrent orders for the last unit — exactly one wins.
8. Create a fulfillment **preparation draft**; confirm it persists.
9. Record an **approved actual cost**; confirm the approval guard accepts it.
10. **Reverse** the fulfillment event; confirm the reversal guard and that stock returns.
11. Check contribution profit for the new orders: an UNKNOWN cost must render as unknown,
    never as 0 COGS.
12. Confirm the single `unresolved` product still classifies `unresolved` and is not
    orderable at a fabricated zero cost.

Remove every synthetic order created by steps 4–10 by exact id.

## 10. Rollback trigger conditions

Roll back immediately if any of these occur:

* any migration returns non-zero, or any `psql: … error` appears in its output;
* step 3 reports `unresolved > 0`, `ambiguous > 0`, or `reconciliation_complete = f`;
* step 3's inserted row count differs materially from the certified 83 without a
  known, explained data change;
* any §8 readiness check fails — in particular a non-zero `verified_zero` count
  (a fabricated zero) or any active in-stock unresolved-zero product;
* `inventory_movements` count or the products `stock_md5` changes during migration;
* `/ready` returns non-200 or `orderCreationEnabled:false` after deploy;
* order creation fails, or any order is created with a fabricated `0` COGS;
* error rate or p95 latency on order creation regresses materially post-deploy;
* a temporary IP block fails to lift after step 8.

If the failure is a **schema** failure, prefer the rollback chain (§11). If data
integrity is in doubt, prefer **restoring the §6 backup branch** — it is faster and has
no dependency on the rollback files being correct.

## 11. Exact rollback order

Reverse dependency order. Each file is committed; none may be invented.

1. `drop_product_cost_zero_defaults_rollback.sql`
2. `fix_blocked_ips_timestamptz_rollback.sql`
3. `add_product_cost_resolution_rollback.sql`
4. `add_pim_line_identity_rollback.sql`
5. `add_fulfillment_hardening_rollback.sql`
6. `add_fulfillment_costing_rollback.sql`
7. `backfill_orderitems_from_jsonb_rollback.sql`
8. `add_orderitem_backfill_trigger_safety_rollback.sql`
9. `add_order_item_cost_snapshot_rollback.sql`

Same executor contract (`-v ON_ERROR_STOP=1 --single-transaction`, SHA-256 verified).

Step 7 requires **two** transaction-local GUCs and the **exact** batch id recorded in §7:

```bash
{ printf "SELECT set_config('aquavo.backfill_batch_id','%s',true);\n" "$BATCH"
  printf "SELECT set_config('aquavo.backfill_rollback_authorized','on',true);\n"
  git show HEAD:migrations/backfill_orderitems_from_jsonb_rollback.sql
} > /tmp/rb7.sql
psql "$PROD_URL" -v ON_ERROR_STOP=1 --single-transaction -f /tmp/rb7.sql
```

It deletes only rows whose `metadata->'backfill'->>'batch_id'` equals that batch, verifies
the count against the audit record both before and after, and aborts on mismatch.

Do **not** set `aquavo.backfill_drop_control_table`. Leaving it unset retains
`orderitem_backfill_batches` — the MODE B production audit trail. This is the expected
end state, and is the only schema object that will remain (see §12).

## 12. Post-migration verification (after a rollback, if one is performed)

Expect production to return to the §5 baseline **exactly**, with one documented exception:

* `orderitem_backfill_batches` remains (+1 table, +11 columns, +1 constraint, +1 index),
  retaining the batch row with `rolled_back_at` set. This is the committed audit-trail
  contract, not drift.
* The three `products` cost defaults return as `'0'::numeric` rather than production's
  original `0`. These are the same numeric zero default — verified
  `(0::numeric) = ('0'::numeric)` → `t`. Cosmetic catalog text only.

Everything else must match: 230 tables, 730 constraints, 710 indexes, 32 triggers,
114/114/0 products, 42 orders, 112 order items, 194 inventory movements, products
`stock_md5 = 30635a9204ba52d54b0ec2614cadc8a4`, and identical trigger and routine
fingerprints. This was demonstrated end-to-end on `br-twilight-cake-a4972nn6`.

## 13. Application deployment order

The migrations are additive and backward-compatible: every new column is nullable, every
new CHECK is `NOT VALID`, and no existing column is dropped or retyped in a way the
current code reads. Therefore:

1. **Migrations first, application second.** The currently deployed application keeps
   working against the migrated schema — it simply ignores the new columns.
2. Run the §8 readiness checks. Do not deploy if any fails.
3. Deploy the application (server and client together — the accounting engine and the
   fulfillment admin UI ship as one unit).
4. Run the §9 smoke tests.
5. Keep the §6 backup branch for at least one business day.

Do **not** deploy the application before the migrations: the new code reads the
`*_resolution` columns and the cost-snapshot columns, and `/ready` reports
`missingColumns` and disables order creation if the schema is behind.

## 14. Expected downtime

**None.** All nine steps are short transactions; the total measured runtime is ~44 s and
each individual statement holds its `ACCESS EXCLUSIVE` lock only briefly. There is no
blue/green switch and no application restart is required between migrations.

Caveats to plan for:
* Step 8 rewrites `blocked_ips` and `login_attempts`. If `login_attempts` is large, that
  step's lock is held longer — size it in §5 and, if the row count is high, run the
  cutover in a low-traffic window.
* Steps 1, 7 and 9 take `ACCESS EXCLUSIVE` on `order_items_relational` / `products`,
  which are read on hot paths. A pre-existing long transaction will queue behind the
  lock request and stall reads — check `pg_stat_activity` (§5) first.
* Recommended: a low-traffic window with a short statement timeout
  (`SET LOCAL lock_timeout = '5s'`) so a blocked step fails fast and retries rather than
  stalling the site.

## 15. Outstanding item before this plan may be executed

The accounting Playwright matrix — `e2e/certification.spec.ts` and
`e2e/fulfillment-admin.spec.ts`, expected **56 executed / 56 passed / 0 failed / 0
skipped** across `desktop-light`, `desktop-dark`, `mobile-light`, `mobile-dark` — has
**not** been run against `br-fancy-mouse-a49ucj27`.

`e2e/support/target-safety.mjs` has been updated to allow-list the verification branch
endpoint `ep-ancient-shape-a4k5kxrh` (the production block is a separate control and was
not modified), but the test invocation itself was denied by the environment's command
classifier and was not retried through another shell.

Smoke scenarios 5, 6, 7, 8, 9, 10 and 12 in §9 are exactly what those specs cover.
Until they are green, that coverage rests on the manual post-deploy smoke tests rather
than on automated certification.
