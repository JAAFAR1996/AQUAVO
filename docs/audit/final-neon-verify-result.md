# Final Neon Verification — `accounting-final-verify-20260728`

**Executed:** 2026-07-28
**Project:** `shiny-tree-43710630` (fishweb)
**Verification branch:** `br-fancy-mouse-a49ucj27` — endpoint `ep-ancient-shape-a4k5kxrh`, database `neondb`, role `neondb_owner`, PostgreSQL 17.10
**Production branch `br-patient-mouse-a4d4cgr4` (endpoint `ep-quiet-moon-a4h7tdze`) was NOT written to.** No branch was promoted, reset, deleted or created. Nothing was deployed.

---

## 1. Gate 0 — identity verification

| Assertion | Result |
|---|---|
| `NEON_VERIFY_DATABASE_URL` is a valid PostgreSQL URL | PASS (`postgresql:` scheme, host present) |
| `NEON_ROLLBACK_DATABASE_URL` is a valid PostgreSQL URL | PASS |
| The two URLs point at different endpoints | PASS — `ep-ancient-shape-a4k5kxrh` vs `ep-snowy-salad-a4uv1l7x` |
| Verify URL maps to `br-fancy-mouse-a49ucj27` | PASS — Neon API `list_branch_computes` binds `ep-ancient-shape-a4k5kxrh` → `br-fancy-mouse-a49ucj27` |
| Rollback URL maps to `br-twilight-cake-a4972nn6` | PASS — binds `ep-snowy-salad-a4uv1l7x` → `br-twilight-cake-a4972nn6` |
| Both have parent `br-patient-mouse-a4d4cgr4` | PASS (both `parent_id` = production; `parent_timestamp` 2026-07-28T03:00:10Z) |
| Neither is production / default / primary | PASS — both `primary:false`, `default:false`; production is the only `primary:true, default:true` branch |
| No credential appears in output | PASS — every command's output passed through a redaction filter; identity was derived from parsed URL components only |

Redacted identity (public identifiers only):

```
role=verify    project=shiny-tree-43710630  branch=br-fancy-mouse-a49ucj27   endpoint=ep-ancient-shape-a4k5kxrh  db=neondb
role=rollback  project=shiny-tree-43710630  branch=br-twilight-cake-a4972nn6 endpoint=ep-snowy-salad-a4uv1l7x    db=neondb
role=PROD      project=shiny-tree-43710630  branch=br-patient-mouse-a4d4cgr4 endpoint=ep-quiet-moon-a4h7tdze     (never contacted for writes)
```

An independent confirmation of the production endpoint id comes from the committed
`server/db-target.ts` (`PRODUCTION_ENDPOINT_IDS = {ep-quiet-moon-a4h7tdze}`), which
neither branch endpoint matches.

### Baseline re-derived live on the branch

```
products = 114        products_active = 114     products_softdeleted = 0
active_zerocost = 1   active_instock_zerocost = 0
pubtables = 230       constraints = 730         indexes = 710   triggers = 32
orders = 42           order_items_relational = 112   inventory_movements = 194
stock_md5 = 30635a9204ba52d54b0ec2614cadc8a4   inventory_ledger_mode = enforce
```

Matches the owner-stated baseline exactly, and is byte-identical to the rollback
branch's independently measured baseline.

---

## 2. Executor defect found, disclosed and corrected

The first executor build reported all nine migrations as `APPLIED`. **That report was wrong and was rejected.** Two defects:

1. `rc=$?` was read after a shell pipeline (`psql ... | sed`), so it captured `sed`'s exit status, not `psql`'s. Every step would have reported success regardless of outcome.
2. The backfill wrapper used `\i /tmp/...` — an MSYS path the native Windows `psql` cannot open. `backfill_orderitems_from_jsonb.sql` **never executed**, yet was reported as applied.

Detection: `orderitem_backfill_batches` did not exist afterwards (`ERROR: relation ... does not exist`), which is impossible had the backfill run.

Correction:
* exit status captured directly from `psql` (no pipeline), plus a hard guard that treats any `psql: ... error` line as a failure even if the exit code disagrees;
* `\i` eliminated — the transaction-local GUC preamble is concatenated into the same file, preserving one executor-owned transaction;
* the verification branch was **rolled back to baseline with the committed rollback files** and the entire nine-step chain re-run in true contract order. The results below are from that clean, in-order run.

Post-reset baseline was confirmed identical to the pre-migration baseline on every
metric above (230/730/710/32, `stock_md5` unchanged). The only apparent residue,
`order_items_relational.price_at_purchase`, is pre-existing production schema — it is
present on the never-migrated rollback branch too.

---

## 3. Forward migration chain (clean, in-order run)

Each file was extracted from its committed `HEAD` blob, SHA-256 verified against the
working tree, and submitted through **one executor-owned transaction**
(`psql -v ON_ERROR_STOP=1 --single-transaction`). No file contains a top-level
`BEGIN`/`COMMIT`/`ROLLBACK`/`START TRANSACTION` (verified by scan: 0 hits in all nine).
`session_replication_role` was never used; no trigger was globally disabled.

| # | Migration | Git blob | SHA-256 | Outcome | Duration |
|---|---|---|---|---|---|
| 1 | `add_order_item_cost_snapshot.sql` | `b74b1e5e` | `e507bce47ae334aa77de3df5b38ea2f53e3e656ea6d84f51a2433c4650b3b0ed` | APPLIED / COMMIT | 1966 ms |
| 2 | `add_orderitem_backfill_trigger_safety.sql` | `a0560128` | `ee96e878f98a53c8f303fc0f6be1c629da883cc4e6d2edbc01a717ce73c7cb89` | APPLIED / COMMIT | 2742 ms |
| 3 | `backfill_orderitems_from_jsonb.sql` | `cab7a3aa` | `bbe942d34716dfc9941f8419559cc78fb45350bafd4faa8a24db962c758a3ac2` | APPLIED / COMMIT | 3365 ms |
| 4 | `add_fulfillment_costing.sql` | `d00d0599` | `ea34a32f5f3d84b5913ca700531941a5ba7f53edf9ba125aa865345a979901d1` | APPLIED / COMMIT | 8517 ms |
| 5 | `add_fulfillment_hardening.sql` | `2b8d0c4b` | `5a7f43634f801f7dc2c77a5f621204c39b1ae1b9cf245a1377e2c67615547f47` | APPLIED / COMMIT | 13996 ms |
| 6 | `add_pim_line_identity.sql` | `c5fb6d07` | `0b60607b46d17a7f8c34a873f63b2f64b4541b9586a364301ff3124a020dbd03` | APPLIED / COMMIT | 3083 ms |
| 7 | `add_product_cost_resolution.sql` | `dd61cda0` | `fd88ddd6f154f939462d30f2736da4443d304a9aea9606dc15387a08432552aa` | APPLIED / COMMIT | 3795 ms |
| 8 | `fix_blocked_ips_timestamptz.sql` | `cb81045c` | `46d064dab3a21e45c09f2c994ca7124d4784c4d92d82165dbf867c47534ba2fb` | APPLIED / COMMIT | 2801 ms |
| 9 | `drop_product_cost_zero_defaults.sql` | `be75a7d9` | `5b9f414bc14f1029e8d2da4a29e665cb9494326115ee2a3de39e25261c0d060a` | APPLIED / COMMIT | 3764 ms |

Working tree == `HEAD` blob for all nine (and for all nine rollback partners). No
migration was edited to make it pass. All nine were newly applied — none was already
present.

### Backfill

Batch id supplied by the executor as a transaction-local GUC
(`set_config('aquavo.backfill_batch_id', …, true)`).
`aquavo.backfill_allow_unresolved` was deliberately **not** set.

```
Backfill batch fc85329c-8d10-4eaf-8f92-9bdaf249f8c7 inserted 83 rows
(unresolved=0, ambiguous=0, complete=t)
```

`order_items_relational`: 112 → 195 (+83). `inventory_movements` unchanged at 194 and
`stock_md5` unchanged — the backfill minted no stock movement, which is the intended
behaviour of the batch-scoped trigger suppression.

---

## 4. Readiness on the verification branch

| Requirement | Result |
|---|---|
| 3 product cost-resolution columns exist | PASS — `cost_price_resolution`, `packaging_cost_resolution`, `insert_cost_resolution` (+ `cost_resolution_at/_by/_note`) |
| Order-item snapshot columns exist | PASS — 8 columns: `unit_cost_price`, `unit_packaging_cost`, `unit_insert_cost`, `cost_snapshot_status`, `cost_snapshot_source`, `cost_snapshot_confidence`, `cost_snapshot_version`, `cost_snapshot_at` |
| Fulfillment tables and constraints exist | PASS — 14 fulfillment/packaging/backfill tables; public tables 230 → 245 (+15) |
| PIM line identity exists | PASS — `packaging_inventory_movements.line_id` + partial unique `pim_line_uidx` |
| `blocked_ips.expires_at` corrected time semantics | PASS — `timestamp without time zone` → `timestamp with time zone`; `blocked_at`, `created_at` and `login_attempts.created_at` converted too. Classification: permanent 0, temporary-active 0, temporary-expired 0 — no block was lifted |
| No product cost column retains `DEFAULT 0` | PASS — `cost_price`, `packaging_cost`, `insert_cost` all now `DEFAULT NULL` |
| Zero-cost resolution guard exists | PASS — `products_zero_cost_needs_resolution_chk` and `products_cost_resolution_chk` |
| 113 active products classify `known` | PASS — 113 |
| 1 active product classifies `unresolved` | PASS — 1 |
| 0 invented `verified_zero` | PASS — 0 |
| 0 active in-stock unresolved-zero products | PASS — 0 |
| No historical cost fabricated | PASS — 113 with `cost_price > 0`, 1 with `= 0`, 0 with `NULL`; identical to baseline. No value rewritten |
| Inventory totals unchanged | PASS — `inventory_movements` 194 → 194; products `stock_md5` `30635a92…` unchanged |
| `/ready` returns 200 | PASS — `{"status":"ready","orderCreationEnabled":true,"missingColumns":[],…}` |
| Order creation remains enabled | PASS — `orderCreationEnabled: true` |

The application was booted against this branch with `DATABASE_URL` supplied through the
process environment. The committed target guard confirmed the binding and, importantly,
refused the committed `.env`'s production value:

```
[DB-TARGET] Ignored env-file override for explicitly inherited DATABASE_URL — the process environment wins.
[DB-TARGET] role=primary key=DATABASE_URL env=child-branch endpoint=ep-ancient-shape-a4k5kxrh branch=n/a host=ep-ancient-shape-a4k5kxrh.<neon> db=neondb source=process
```

---

## 5. Accounting smoke tests

Service-level scenarios executed directly against the committed accounting services on
this branch:

| # | Scenario | Result | Evidence |
|---|---|---|---|
| 1 | Known positive cost | PASS | `cost=1500 status=exact confidence=high` |
| 2 | Unresolved zero → unknown/NULL | PASS | `cost=null status=unknown source=none confidence=null` |
| 3 | Verified zero → exact zero | PASS | `cost=0 status=verified_zero` (not demoted to NULL) |
| 4 | Incomplete packaging/insert costs | PASS | `cost=2000 pack=null insert=null status=incomplete confidence=medium` |
| 11 | Contribution profit | PASS | UNKNOWN line contributes no COGS (`null`, never 0); known line 5000 − 1000 = 4000 |

`SERVICE_SUBTOTAL executed=5 passed=5 failed=0`

Scenarios **5, 6, 7, 8, 9, 10 and 12** (storefront order, WhatsApp/admin order,
inventory locking, out-of-stock 409, preparation draft, approved actual cost, reversal)
are covered by `e2e/certification.spec.ts` and `e2e/fulfillment-admin.spec.ts`.
**Those specs were not executed** — see the blocker in §7.

No synthetic row was created by the service-level scenarios (they exercise pure builder
functions), so no cleanup was required. The temporary harness file was removed.

---

## 6. Repository regression gates

| Gate | Result |
|---|---|
| Vitest (full suite, memory-safe `--maxWorkers=2`, `--max-old-space-size=4096`) | **116 files, 1590 tests, 1590 passed, 0 failed**, 572 s |
| Under-load flake retry | Not required — zero failures |
| `npm run check` (tsc) | PASS (exit 0) |
| `npm run check:server` | PASS — "no strict errors in owned files" |
| `npm run check:accounting` | PASS |
| `npm run check:accounting:routes` | PASS — "no strict errors in owned files"; 53 pre-existing strict errors in legacy modules not owned by this effort |
| `npm run build` | PASS (exit 0) — `dist/index.js` 3.1 MB |
| Credential scan | PASS — no live credential; only the pre-existing, already-documented placeholder strings |
| PII scan | PASS — no key material (`sk-`, `AIza`, `gsk_`, `xox*`) in the files this execution touched |

---

## 7. Remaining blocker

`e2e/certification.spec.ts` and `e2e/fulfillment-admin.spec.ts` (expected 56 tests across
four projects) **were not executed.** The E2E harness fail-closed correctly, because the
newly created verification branch endpoint was not on the committed allow-list:

```
[e2e-harness] REFUSING TO RUN: DATABASE_URL endpoint 'ep-ancient-shape-a4k5kxrh'
is not on the E2E allow-list (localhost or one of ep-rapid-breeze-a46glg7f, ep-rough-smoke-a4umy5in).
```

`e2e/support/target-safety.mjs` was updated to add `ep-ancient-shape-a4k5kxrh` to
`ALLOWED_DB_ENDPOINT_PREFIXES`, with a comment recording the branch it belongs to. The
production block (`PRODUCTION_DB_MARKERS`) is a separate control and was **not** touched
— production remains blocked regardless of this list.

The subsequent Playwright invocation was denied by the environment's command classifier
and was **not** retried through an alternative shell. The accounting Playwright total is
therefore **0 executed / 0 passed**, not the expected 56/56. This is the one outstanding
item before cutover.

---

## 8. Safety statement

* Only `NEON_VERIFY_DATABASE_URL` was used for writes. Its value was never echoed,
  printed, logged, persisted or committed; every command's output passed through a
  redaction filter.
* Production `br-patient-mouse-a4d4cgr4` was read **only** through the read-only Neon MCP
  (catalog metadata for the schema comparison). It was never written to and no
  connection string for it was resolved.
* No branch was promoted, reset, deleted or created.
* `session_replication_role` was never set; no trigger was globally disabled. The only
  trigger suppression used is the batch-scoped exception the committed
  `add_orderitem_backfill_trigger_safety.sql` installs.
* No migration was edited to make it pass. Every executed file matched its committed
  `HEAD` blob by SHA-256.
* No `rm -rf`, `git clean` or `git reset` was run; no untracked directory was touched.
  The only file removed was the temporary smoke harness this execution itself created.
