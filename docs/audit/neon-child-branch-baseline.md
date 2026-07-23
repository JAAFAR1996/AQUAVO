# Neon Child-Branch Verification — Phase 0 Baseline

**Date:** 2026-07-23
**Scope:** Read-only identity and baseline capture, via the connected Neon MCP integration.
**Status:** Phase 0 COMPLETE. Branch creation BLOCKED — see `neon-verification-final.md`.

No credentials, connection strings, or customer PII appear in this document.

---

## 1. Project identity

| Field | Value |
|---|---|
| Organization | `Eng` (`org-sweet-glitter-04175211`) |
| Project name | `fishweb` |
| Project ID | `shiny-tree-43710630` |
| Platform / region | `aws` / `aws-us-east-1` |
| PostgreSQL major version (project) | 17 |
| Created | 2025-11-04T02:09:40Z |
| History retention | 21600 s (6 h) |

Only one project exists in the account, so there is no ambiguity between candidates.

## 2. Production branch identity

| Field | Value |
|---|---|
| Branch name | `production` |
| Branch ID | `br-patient-mouse-a4d4cgr4` |
| Parent branch ID | *(none — root branch)* |
| Parent LSN | `0/27B67428` |
| Parent timestamp | 2026-04-12T22:05:56Z |
| `primary` / `default` | true / true |
| `protected` | **false** |
| Last reset | 2026-04-13T00:27:25Z |
| Logical size | 75,440,128 bytes |
| State | ready |

`production` is a root branch: it has no `parent_id`. Its `parent_lsn` / `parent_timestamp`
fields are residue of the 2026-04-13 reset, not evidence of a live parent.

### Sibling branches (all children of production, none touched)

| Branch ID | Name | State |
|---|---|---|
| `br-late-credit-a4jtp4ll` | production-restore-before-yee-19939-content-fix-20260723 | ready |
| `br-royal-leaf-a4cszt3k` | production-restore-before-opening-balances-20260723 | ready |
| `br-summer-bar-a467617q` | production-restore-before-product-identity-fixes-20260723 | ready |
| `br-dry-cell-a4mfg8uc` | production-restore-before-inventory-supplier-import-20260723 | ready |
| `br-rough-heart-a42qr8im` | production-restore-before-database-repair-20260723 | ready |
| `br-rapid-unit-a4maj64e` | database-repair-final-validation-20260722 | ready |
| `br-misty-voice-a45ytfz4` | mcp-migration-2026-07-13T08-53-31 | ready |
| `br-noisy-cell-a4hwu1ys` | development | archived |
| `br-patient-feather-a4pwlsxb` | (unnamed) | archived |
| `br-green-cloud-a4drtbz2` | production_old_2026-04-12T22:27:00Z | archived |
| `br-lingering-silence-a4oz7n59` | production_old_2026-04-12T22:06:00Z | archived |
| `br-bitter-art-a45rc24z` | production_old_2026-04-12T10:27:00Z | archived |
| `br-old-mouse-a4ihokgt` | production_old_2026-04-11T22:00:00Z | archived |
| `br-proud-recipe-a41bjn5t` | production_old_2026-03-22T06:32:00Z | archived |
| `br-bitter-brook-a4g8svmw` | production_old_2026-03-22T11:32:00Z | archived |

The `production-restore-before-*-20260723` series confirms the "Pre-Neon safety package"
backup discipline recorded in project memory.

## 3. Multi-signal identity confirmation

The project was **not** identified by display name alone. Five independent signals were
checked by read-only SQL against `br-patient-mouse-a4d4cgr4`:

| Signal | Observed | Matches expectation |
|---|---|---|
| Database name | `neondb` | ✅ Neon default, as documented |
| PostgreSQL version | `PostgreSQL 17.10 (2947584) on aarch64-unknown-linux-gnu` | ✅ project `pg_version: 17` |
| Non-system schemas | 3 | ✅ |
| `public` table count | 196 | ✅ large AQUAVO schema |
| `products` row count | 143 | ✅ AQUAVO catalog scale |
| `orders` row count | 37 | ✅ AQUAVO order scale |
| `order_items_relational` rows / distinct orders | **100 / 25** | ✅ exactly matches `neon-forensics.md` (2026-07-21) |
| `packaging_*` tables | **0 (absent)** | ✅ fulfillment costing migration not yet applied |
| `fulfillment_*` tables | **0 (absent)** | ✅ fulfillment costing migration not yet applied |

> ⚠️ **CORRECTED 2026-07-23.** The first revision of this table asserted "`order_items`
> table present: 0 (absent)" and treated that as proof there was no relational side. That
> was a **false negative** produced by an exact-name filter. See §6 for the full
> contradiction resolution. The relational table exists as `order_items_relational`.

The `order_items_relational` row/order counts (100 / 25) are the decisive fingerprint: they
reproduce the independently recorded 2026-07-21 forensic audit exactly.

### Query used

```sql
SELECT current_database() AS db, version() AS pg,
 (SELECT count(*) FROM information_schema.tables WHERE table_schema='public') AS tables,
 (SELECT count(*) FROM information_schema.schemata
    WHERE schema_name NOT LIKE 'pg\_%' AND schema_name<>'information_schema') AS schemas,
 (SELECT count(*) FROM products) AS products,
 (SELECT count(*) FROM orders) AS orders,
 (SELECT count(*) FROM information_schema.tables
    WHERE table_schema='public' AND table_name LIKE 'packaging%') AS packaging_tables,
 (SELECT count(*) FROM information_schema.tables
    WHERE table_schema='public' AND table_name='order_items') AS order_items_tbl;
```

## 4. Pre-migration object baseline (production branch, read-only)

| Metric | Value |
|---|---|
| `public` tables | 196 |
| Constraints (`pg_constraint`, public) | 528 |
| Indexes (`pg_indexes`, public) | 574 |
| User triggers (non-internal, public) | 29 |
| Functions (`pg_proc`, public) | 178 |
| Orders total | 37 |
| Orders with non-empty JSONB `items` | 37 |
| Orders with NULL/empty `items` | 0 |
| JSONB line items (total) | 173 |
| Relational order-item rows (`order_items_relational`) | **100** *(corrected — see §6)* |
| Distinct orders with relational lines | **25 of 37** |
| `fulfillment_*` tables | 0 |
| `packaging_*` tables | 0 |
| Table-list fingerprint (md5 of sorted `public` table names) | `88b839d9f2e106c925e82348312b2975` |

### Query used

```sql
SELECT
 (SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace
    WHERE n.nspname='public') AS constraints,
 (SELECT count(*) FROM pg_indexes WHERE schemaname='public') AS indexes,
 (SELECT count(*) FROM pg_trigger t
    JOIN pg_class cl ON cl.oid=t.tgrelid
    JOIN pg_namespace n ON n.oid=cl.relnamespace
    WHERE n.nspname='public' AND NOT t.tgisinternal) AS triggers,
 (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public') AS functions,
 (SELECT count(*) FROM orders WHERE items IS NOT NULL AND jsonb_array_length(items) > 0)
    AS orders_with_jsonb_items,
 (SELECT count(*) FROM orders WHERE items IS NULL OR jsonb_array_length(items)=0)
    AS orders_without_items,
 (SELECT count(*) FROM information_schema.tables
    WHERE table_schema='public' AND table_name LIKE 'fulfillment%') AS fulfillment_tables,
 (SELECT md5(string_agg(table_name,',' ORDER BY table_name))
    FROM information_schema.tables WHERE table_schema='public') AS table_list_fingerprint;
```

> ⚠️ **CORRECTED 2026-07-23.** The first revision of this section claimed "Relational
> order-item rows: N/A — `order_items` table does not exist" and concluded that the
> JSONB/relational comparison axis had no relational side. **That conclusion was wrong.**
> Superseded by §6.

**Interpretation (corrected).** All 37 orders carry line items in `orders.items` JSONB
(173 lines). A relational mirror exists as `order_items_relational` (100 lines) covering
25 of the 37 orders. The two stores **agree exactly** wherever both exist. The
JSONB-vs-relational comparison axis is therefore live and testable on real production
data — but only across the 25-order overlap; the 12 uncovered orders are a genuine
coverage gap whose **root cause is identified but which remains unrepaired** (§6.5).

## 5. Migration file integrity — VERIFIED

Full SHA-256 recomputed from working-tree bytes and compared against
`docs/audit/neon-migration-review.md`:

| File | Lines | Recorded (review doc) | Recomputed (full) | Match |
|---|---|---|---|---|
| `migrations/add_fulfillment_costing.sql` | 255 | `ea34a32f…9901d1` | `ea34a32f5f3d84b5913ca700531941a5ba7f53edf9ba125aa865345a979901d1` | ✅ |
| `migrations/add_fulfillment_hardening.sql` | 449 | `5a7f4363…547f47` | `5a7f43634f801f7dc2c77a5f621204c39b1ae1b9cf245a1377e2c67615547f47` | ✅ |
| `migrations/add_fulfillment_costing_rollback.sql` | — | — | `80fb2b54da93ed0f3c932e71e9321a3adfe185476facd29ccf686cb46f291296` | recorded here |
| `migrations/add_fulfillment_hardening_rollback.sql` | — | — | `8a7d97347556de33a7e8fc0c214e85f2fd881ac9e95a70b35724ea3282c510b4` | recorded here |

Both forward migrations are byte-identical to what was reviewed. The integrity gate
**passes**; nothing about the migration files blocks this task.

## 6. Contradiction resolution — relational order items (2026-07-23)

### 6.1 Old claim vs new claim

| | Claim | Source |
|---|---|---|
| **Prior verified evidence** | `order_items_relational` exists; 100 rows; 25 of 37 orders covered; JSONB-only orders are a *subset* | `docs/audit/neon-forensics.md`, 2026-07-21 |
| **Phase 0 rev. 1 (WRONG)** | `order_items` absent; all 37 orders JSONB-only; "no relational side" | this doc, first revision |
| **Reconciliation (AUTHORITATIVE)** | `order_items_relational` exists; **100 rows; 25 of 37 orders** | fresh queries below, 2026-07-23 |

**The prior evidence was correct. The Phase 0 rev. 1 claim was wrong.** The two data sets
are numerically identical (100 rows / 25 orders) two days apart.

### 6.2 Root cause of the false negative

Phase 0 rev. 1 used this predicate:

```sql
SELECT count(*) FROM information_schema.tables
WHERE table_schema='public' AND table_name='order_items'   -- exact equality
```

This is an **exact-equality filter**, which cannot match `order_items_relational`. It
returned `0`, and that `0` was then over-interpreted as "no relational order-item storage
exists anywhere" — an unsupported leap from "no table with this exact name" to "no table
serving this purpose."

Classification against the four candidate explanations:

| Candidate explanation | Verdict |
|---|---|
| Checked the wrong table name | ✅ **THIS.** Queried `order_items`, actual name is `order_items_relational` |
| Used an incomplete table filter | ✅ **THIS.** Exact equality instead of a `LIKE '%order%item%'` sweep |
| Queried wrong schema / database / branch | ❌ No — same project, branch, DB, role (§6.6) |
| Confused `order_items` with `order_items_relational` | ⚠️ Partly — the absence of one was reported as the absence of the other |
| Production database actually changed | ❌ **No.** Counts identical to the 2026-07-21 audit |

No production change occurred. This was a query-construction defect in my own Phase 0
report, not a data event.

### 6.3 Discovery sweep — every order-item-like relation, all schemas

```sql
SELECT n.nspname AS schema, c.relname AS name,
  CASE c.relkind WHEN 'r' THEN 'table' WHEN 'v' THEN 'view' WHEN 'm' THEN 'matview'
       WHEN 'p' THEN 'part_table' WHEN 'f' THEN 'foreign' ELSE c.relkind::text END AS kind
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r','v','m','p','f')
  AND (lower(c.relname) LIKE '%order%item%' OR lower(c.relname) LIKE '%item%order%'
    OR lower(c.relname) LIKE '%order_line%' OR lower(c.relname) LIKE '%line_item%'
    OR lower(c.relname) LIKE '%orderitem%');
```

Result — **complete set, all schemas, tables + views + matviews**:

| Schema | Name | Kind | Rows |
|---|---|---|---|
| `public` | `order_items_relational` | table | 100 |
| `public` | `purchase_order_items` | table | (supplier POs — unrelated to customer orders) |

`public.order_items` genuinely does **not** exist, under any casing, quoting, view, or
synonym. Its absence is real but irrelevant — it was never the operative table.

### 6.4 `order_items_relational` structure

Columns (7):

| Column | Type | Nullable |
|---|---|---|
| `id` | text | NO (PK) |
| `order_id` | text | NO (FK → `orders.id`) |
| `product_id` | text | NO (FK → `products.id`) |
| `quantity` | integer | NO |
| `price_at_purchase` | numeric | NO |
| `total_price` | numeric | NO |
| `metadata` | jsonb | YES |

Constraints: `order_items_relational_pkey` (PK on `id`);
`order_items_relational_order_id_orders_id_fk` → `orders(id)`;
`order_items_relational_product_id_products_id_fk` → `products(id)`.

Indexes: `order_items_relational_pkey` (unique), `order_items_order_id_idx` (btree
`order_id`), `order_items_product_id_idx` (btree `product_id`).

Integrity: **0 orphan lines**, **0 lines referencing a missing product**. 3
`(order_id, product_id)` pairs appear more than once — these are legitimate repeated
line entries, confirmed because JSONB line counts match relational line counts exactly
for every affected order.

**There are no cost-snapshot columns.** `unit_cost_price`, `unit_packaging_cost`,
`unit_insert_cost`, `cost_snapshot_status`, `cost_snapshot_source`,
`cost_snapshot_confidence` — **0 of 6 present**. See §6.7.

### 6.5 The 37-order coverage matrix

```sql
WITH o AS (SELECT id, COALESCE(jsonb_array_length(
             CASE WHEN jsonb_typeof(items)='array' THEN items END),0) AS j_lines FROM orders),
     r AS (SELECT order_id, count(*) AS r_lines FROM order_items_relational GROUP BY 1)
SELECT ... FROM o LEFT JOIN r ON r.order_id=o.id;
```

| Category | Orders |
|---|---:|
| JSONB items present and valid | **37** |
| JSONB empty / null | **0** |
| Relational lines present | **25** |
| Both JSONB and relational | **25** |
| JSONB-only | **12** |
| Relational-only | **0** |
| Neither | **0** |
| **Total** | **37** |

Line-level agreement across the 25-order overlap, grouped by `(order_id, product_id)`:

| Comparison | Result |
|---|---:|
| Comparison groups | 97 |
| **Exact agreement** (line count + quantity + price) | **97 (100%)** |
| Line-count disagreement | 0 |
| Quantity disagreement | 0 |
| Price disagreement | 0 |
| Product present in relational but not JSONB | 0 |
| Product present in JSONB but not relational | 0 |

**Wherever both stores exist, they agree perfectly.** There is no divergence defect — only
a coverage gap. JSONB total 173 lines; relational 100 lines; the 73-line difference is
exactly the 12 uncovered orders.

#### Root cause of the 12-order gap — order source (gap NOT repaired)

Neither date nor status explains the gap (covered and uncovered orders interleave on the
same days; 36 of 37 orders share status `delivered`). **Order source is a clean
discriminator:**

| `orders.source` | Orders | Covered | Uncovered |
|---|---:|---:|---:|
| `whatsapp` (admin-created) | 19 | **19 (100%)** | 0 |
| `website` (storefront checkout) | 18 | 6 | **12** |

Within `website`, the gap is a contiguous time window:

- `2026-04-24` → covered
- **`2026-05-12` … `2026-06-17` → all 12 uncovered**
- `2026-06-22` onward (5 orders) → all covered

**Conclusion:** the admin/WhatsApp order-creation path has always written relational lines.
The storefront checkout path did not write them between ~2026-05-12 and ~2026-06-17; a fix
landed around 2026-06-22 and that path has written them correctly since. The 12 orders in
that window were never repaired because the backfill is inoperable (§6.7).

Affected order IDs (not PII):
`39c94727-1ebb-4fc8-a3bc-1720c5b42c30`, `922f863a-da42-41f5-89cd-cd6abf98d560`,
`08973941-b61a-4445-98c3-3b9431b7727e`, `632e71ef-6138-4dc1-aac2-8cc805eb43e7`,
`e5ea3cda-cca8-4cfc-b14d-a6cdaaaa57f6`, `7e17819c-d628-425a-9401-65cd2e5facbe`,
`07ed9e6a-416b-4e0e-88cd-b6b8f2cae630`, `6f11d0f2-960d-4cfc-9ebb-09c84543d6ec`,
`60ba9a7f-ef8e-488d-8871-b0f7ccd4abf6`, `7201a77f-9194-4dbd-9268-6a44fca54cdf`,
`29fc8ce5-a1f2-4007-a735-00f426840584`, `c7b6b69e-b4ca-4bcb-87cf-c337a90e2185`.

### 6.6 Identity revalidation (fresh, uncached)

Executed in the same statement as the row counts, so the target cannot differ between them:

```sql
SELECT current_database(), current_user, current_schema(), version(),
       pg_current_wal_lsn(), now(),
       (SELECT count(*) FROM order_items_relational) AS rel_rows;
```

| Field | Value |
|---|---|
| MCP `projectId` argument | `shiny-tree-43710630` ✅ |
| MCP `branchId` argument | `br-patient-mouse-a4d4cgr4` ✅ |
| `current_database()` | `neondb` ✅ |
| `current_user` | `neondb_owner` ⚠️ see finding below |
| `current_schema()` | `public` ✅ |
| `version()` | PostgreSQL 17.10 (2947584) ✅ |
| `pg_current_wal_lsn()` | `0/4A7DBB20` — live, advancing |
| `now()` | 2026-07-23T02:49:44Z — fresh, not cached |
| `order_items_relational` rows in same query | 100 ✅ |

Every query in this reconciliation passed `projectId` and `branchId` explicitly. The
advancing LSN and live `now()` confirm real execution against the primary production
compute, not a cached result.

> **NEW FINDING (security).** The connected MCP executes as **`neondb_owner`** — the
> full-privilege owner role. Read-only mode is currently enforced *only* by the MCP
> server layer, not by database privileges. If write capability is granted, it will be
> granted at owner level against production. Feed this into the hardening proposal:
> the branch-verification work should use a least-privilege branch-scoped role.

### 6.7 Consequential finding — the backfill script cannot run

`migrations/backfill_orderitems_from_jsonb.sql` INSERTs into:

```
unit_cost_price, unit_packaging_cost, unit_insert_cost,
cost_snapshot_status, cost_snapshot_source, cost_snapshot_confidence
```

**None of these six columns exist** on the live `order_items_relational` (7 columns total).
The script would fail immediately with `column ... does not exist`. Its prerequisite,
`migrations/add_order_item_cost_snapshot.sql`, has **not** been applied to production.

Corroborating evidence — the backfill stamps `metadata->>'backfilled' = true` on every row
it writes. Of the 100 live rows, **0 carry that marker** (15 have NULL metadata, 85 have
other metadata). This independently confirms the backfill has **never been run** on
production, and that all 100 rows came from the application write path.

**Ordering consequence for the migration plan:** `add_order_item_cost_snapshot.sql` must be
applied *before* the backfill can repair the 12-order gap. This dependency is not stated in
the current two-migration sequence and should be resolved on the verification branch.

## 7. Actions NOT taken

- No branch created.
- No write of any kind, on any branch.
- No production schema change, migration, promotion, endpoint change, or env-var change.
- No credential displayed, reused, or requested.
- No customer PII read or reproduced.
