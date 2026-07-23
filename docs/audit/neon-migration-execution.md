# Neon Migration Execution — Verification Branch

**Branch:** `br-round-dust-a4t0kt58` (verification branch, database `neondb`, role `neondb_owner`, PostgreSQL 17.10)
**Production branch `br-patient-mouse-a4d4cgr4` was NOT touched.** No promotion, no deletion, no deploy.
**Status:** all five operations applied cleanly.

---

## 1. Per-operation integrity gate

Before each operation the working-tree file, the `HEAD` blob and the Gate 0 expected hash were compared.
**All five matched on all three values.** No operation was run against a modified file.

| # | Migration | SHA-256 (working tree = HEAD = Gate 0 expected) | Gate |
|---|---|---|---|
| 1 | `migrations/add_order_item_cost_snapshot.sql` | `e507bce47ae334aa77de3df5b38ea2f53e3e656ea6d84f51a2433c4650b3b0ed` | PASS |
| 2 | `migrations/add_orderitem_backfill_trigger_safety.sql` | `ee96e878f98a53c8f303fc0f6be1c629da883cc4e6d2edbc01a717ce73c7cb89` | PASS |
| 3 | `migrations/backfill_orderitems_from_jsonb.sql` | `bbe942d34716dfc9941f8419559cc78fb45350bafd4faa8a24db962c758a3ac2` | PASS |
| 4 | `migrations/add_fulfillment_costing.sql` | `ea34a32f5f3d84b5913ca700531941a5ba7f53edf9ba125aa865345a979901d1` | PASS |
| 5 | `migrations/add_fulfillment_hardening.sql` | `5a7f43634f801f7dc2c77a5f621204c39b1ae1b9cf245a1377e2c67615547f47` | PASS |

Also verified (read-only, not executed as a migration):
`migrations/backfill_orderitems_reconcile_report.sql` = `874f5d8e246373e55b15c5c2a5c3c38462009f8b84c0c12bde8b6e7c235f0c25` (WT = HEAD).

### Transaction-command scan

```
grep -niE '(^|[^[:alnum:]_])(begin|commit|rollback|start[[:space:]]+transaction)([^[:alnum:]_]|$)' <file>
```

Findings, per file, after classifying every hit:

| File | `BEGIN` hits | `COMMIT` / `ROLLBACK` hits | Executable top-level transaction command? |
|---|---|---|---|
| `add_order_item_cost_snapshot.sql` | 1 — `DO $$ BEGIN` (line 22) | none | **No** |
| `add_orderitem_backfill_trigger_safety.sql` | 5 — `DO $guard$ BEGIN` (57), two function bodies (117, 224), two inner `BEGIN … EXCEPTION` blocks (127, 241) | all in comments (6, 9, 22, 42, 195) | **No** |
| `backfill_orderitems_from_jsonb.sql` | 3 — `DO $guard$ BEGIN` (79), `DO $backfill$ BEGIN` (110), inner `BEGIN … EXCEPTION` (122) | comments (5, 8, 11–13) and five `CREATE TEMP TABLE … ON COMMIT DROP` clauses (140, 185, 195, 211, 237) | **No** |
| `add_fulfillment_costing.sql` | 5 — all `DO $$ BEGIN` / function bodies | none | **No** |
| `add_fulfillment_hardening.sql` | 12 — all `DO $$ BEGIN` / function bodies | none | **No** |

**Conclusion:** no file issues a top-level `BEGIN`/`COMMIT`/`ROLLBACK`/`START TRANSACTION`. The executor owned the transaction for every operation, exactly as the files' execution contracts require.

---

## 2. Baseline re-confirmation (Gate 0 values, re-derived)

```sql
select version(), current_database(), current_user;
select count(*) from pg_tables where schemaname='public';
select count(*) from order_items_relational;
select count(*) from orders;
select to_regclass('public.order_item_backfill_control'),
       to_regclass('public.orderitem_backfill_batches'),
       to_regclass('public.fulfillment_cost_lines');
```

```
PostgreSQL 17.10 (2947584) on aarch64-unknown-linux-gnu, ... |neondb|neondb_owner
185
100
37
||
```

Matches Gate 0: PG 17.10, `neondb`, `neondb_owner`, 185 tables, `order_items_relational` = 100, `orders` = 37, control/fulfillment tables absent. `orderitem_backfill_batches` was also absent.

Additional pre-state relevant to the trigger proofs:

```sql
select key,value from settings where key='inventory_ledger_mode';   -- enforce
select count(*) from inventory_movements;                            -- 185
select id, code, is_active from inventory_locations;                 -- 3bbe2906-… | MAIN | t
select count(*) filter (where order_is_hard_deletable(id)) as deletable,
       count(*) filter (where not order_is_hard_deletable(id)) as audited from orders;
--   deletable=0, audited=37
```

`inventory_ledger_mode = 'enforce'`, so the inventory-sale trigger is fully live and the proofs below are not vacuous. All 37 orders are audited, so the delete guard is live too.

Pre-migration snapshots taken for later comparison:

```
order_items_relational : 100 rows
products stock         : 143 rows, md5 = cc1f84635c7ec9453a238437f0adff6d
inventory_movements    : 185 rows
```

---

## 3. Execution log

Each operation ran as its own `psql` invocation with `-v ON_ERROR_STOP=1` in a single executor-owned transaction.

### Operation 1 — `add_order_item_cost_snapshot.sql`

```
psql "$NEON_VERIFY_DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction \
     -f migrations/add_order_item_cost_snapshot.sql
```

```
ALTER TABLE
DO
```
Exit 0. Eight nullable cost-snapshot columns added; five `NOT VALID` CHECK constraints created.

### Operation 2 — `add_orderitem_backfill_trigger_safety.sql`

```
psql "$NEON_VERIFY_DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction \
     -f migrations/add_orderitem_backfill_trigger_safety.sql
```

```
CREATE TABLE
DO
CREATE INDEX
CREATE INDEX
CREATE FUNCTION
CREATE FUNCTION
```
Exit 0. `orderitem_trigger_safety_audit` created; `record_order_item_inventory_sale()` and `prevent_unsafe_order_dependency_mutation()` replaced with the exception-bearing versions.

### Operation 3 — `backfill_orderitems_from_jsonb.sql`

Wrapped by the executor because the file needs GUCs set in the same transaction:

```sql
BEGIN;
  -- pre-state captured inside the transaction
  SELECT set_config('aquavo.backfill_batch_id', gen_random_uuid()::text, true) AS batch_uuid;
  -- aquavo.backfill_allow_unresolved deliberately NOT set
  \i migrations/backfill_orderitems_from_jsonb.sql
COMMIT;
```

```
 phase | order_items | inv_movements |             oir_md5              |            stock_md5
-------+-------------+---------------+----------------------------------+----------------------------------
 PRE   |         100 |           185 | c9d4bc78ab43435d22e22197912eb503 | cc1f84635c7ec9453a238437f0adff6d

              batch_uuid
--------------------------------------
 1833092b-4c7f-4835-9038-dca33e1ce33d

NOTICE:  Backfill batch 1833092b-4c7f-4835-9038-dca33e1ce33d inserted 73 rows (unresolved=0, ambiguous=0, complete=t).

   phase    |              batch_uuid              | order_items | inv_movements
------------+--------------------------------------+-------------+---------------
 POST-IN-TX | 1833092b-4c7f-4835-9038-dca33e1ce33d |         173 |           185

               batch_id               | rows_inserted | unresolved_lines | ambiguous_groups | reconciliation_complete | finished | rolled_back_at
--------------------------------------+---------------+------------------+------------------+-------------------------+----------+----------------
 1833092b-4c7f-4835-9038-dca33e1ce33d |            73 |                0 |                0 | t                       | t        |
```
Exit 0. **Batch UUID: `1833092b-4c7f-4835-9038-dca33e1ce33d`** (not a secret). Full detail in `neon-backfill-verification.md`.

### Operation 4 — `add_fulfillment_costing.sql`

```
psql "$NEON_VERIFY_DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction \
     -f migrations/add_fulfillment_costing.sql
```
Exit 0. 8 tables, 11 indexes, 12 guarded CHECK/FK constraints, 2 functions, 3 triggers.
Three `NOTICE: trigger "…" does not exist, skipping` messages from the idempotent `DROP TRIGGER IF EXISTS` guards — expected on first application.

### Operation 5 — `add_fulfillment_hardening.sql`

```
psql "$NEON_VERIFY_DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction \
     -f migrations/add_fulfillment_hardening.sql
```
Exit 0. `INSERT 0 0` on the sequence-counter backfill (no pre-existing fulfillment events — correct). 5 tables, profile family/version separation, cost-approval records, drafts, reversal integrity. Seven expected first-run `DROP TRIGGER IF EXISTS` notices.

---

## 4. Post-execution schema state

```sql
select (select count(*) from pg_tables where schemaname='public') tables,
       (select count(*) from pg_constraint c join pg_class r on r.oid=c.conrelid
          join pg_namespace n on n.oid=r.relnamespace where n.nspname='public') constraints,
       (select count(*) from pg_indexes where schemaname='public') indexes,
       (select count(*) from pg_trigger t join pg_class r on r.oid=t.tgrelid
          join pg_namespace n on n.oid=r.relnamespace
        where n.nspname='public' and not t.tgisinternal) triggers;
```

```
 tables | constraints | indexes | triggers
--------+-------------+---------+----------
    200 |         610 |     613 |       43
```

| Metric | Gate 0 baseline | After 5 operations | Delta |
|---|---|---|---|
| public tables | 185 | 200 | +15 |
| constraints | 529 | 610 | +81 |
| indexes | 574 | 613 | +39 |
| user triggers | 32 | 43 | +11 |

All 15 new tables confirmed present:
`fulfillment_materials`, `packaging_purchases`, `packaging_profiles`, `packaging_profile_items`,
`order_fulfillment_events`, `order_fulfillment_lines`, `packaging_inventory_movements`,
`fulfillment_adjustments`, `order_fulfillment_sequences`, `packaging_profile_families`,
`material_cost_records`, `fulfillment_preparation_drafts`, `fulfillment_preparation_draft_lines`,
`orderitem_trigger_safety_audit`, `orderitem_backfill_batches`.

### Trigger function fingerprints on `order_items_relational`

```sql
select tgname, encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')
from pg_trigger t join pg_proc p on p.oid=t.tgfoid
where t.tgrelid='order_items_relational'::regclass and not t.tgisinternal order by tgname;
```

| Trigger | SHA-256 after | Gate 0 baseline | Interpretation |
|---|---|---|---|
| `order_items_guard_order_detach` | `c7c8c844af5f819ac52461c18fab9cf4ec6757531ccc4e08967fbebb5a91dd3e` | `98c6265…19f631` | **Changed — intended.** Operation 2 `CREATE OR REPLACE`s this function to add the batch-scoped audited-delete exception. |
| `order_items_record_inventory_sale` | `efaa7f4081a64ffd98d6d7f34de4d2c575ed275438a4758124cd56307654de2f` | `c14f314…5dee3c` | **Changed — intended.** Operation 2 adds the batch-scoped inventory-sale suppression exception. |
| `order_items_refresh_financial_snapshot` | `a99c1a1d43f9a1423952f169dede585ec0f88ac8178d9ef72c5f32342e1435a4` | `a99c1a1d43f9a1423952f169dede585ec0f88ac8178d9ef72c5f32342e1435a4` | **Unchanged — identical to Gate 0.** Confirms the migrations touched only the two functions they declare. |

The third function's byte-identical hash is the control: it proves the migration set did not incidentally rewrite unrelated trigger logic.

---

## 5. Safety statement

* Only `NEON_VERIFY_DATABASE_URL` was used. Its value was never echoed, printed, logged, or written to any file; every command's output was piped through a credential-redaction filter.
* `NEON_ROLLBACK_DATABASE_URL`, `DATABASE_URL` and production branch `br-patient-mouse-a4d4cgr4` were never referenced.
* No branch was promoted or deleted; nothing was deployed.
* No `rm -rf`, `git clean`, or `git reset` was run; no untracked directory was touched.
* Every synthetic row created for the trigger proofs was removed (see `neon-backfill-verification.md` §E).
