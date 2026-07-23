# Pre-Neon readiness — final local evidence

Every command below was **re-run on 2026-07-23** for this report. No figure is carried over
from an earlier session.

---

## 1. Branch

```console
$ git branch --show-current
feat/accounting-canonical-fulfillment
```

## 2. Commits

The brief referred to "13 relevant commits". The actual count on this branch is **18**.
Correcting rather than repeating it:

```console
$ git rev-list --count main..HEAD
18

$ git log --oneline main..HEAD
f1356b3 feat(admin): warn about a stock shortfall BEFORE confirming, not after
dda6bea fix(accounting): finish the flagged follow-up swaps — four were real money bugs
676c809 fix(accounting): derive the finance-audit rounding tolerance instead of guessing it
9f1905f fix(fulfillment): margin rendered 100x too large; project stock before confirming
f04accf docs(fulfillment): record the admin UX and consolidation passes in the hardening report
1e35308 feat(admin): Arabic RTL fulfillment-costing panel inside each order
b1c89e3 refactor(accounting): redirect remaining financial consumers to the canonical engine
041b843 test(fulfillment): migration safety for the hardening migration
308b342 fix(tooling): track the accounting check + verifier CLI under the repo's TOOLS/ casing
d2eb410 docs(fulfillment): hardening report + read-only verifier CLI
46f03fa feat(fulfillment): independent integrity verifier + local Playwright workflow
bf788f2 feat(fulfillment): authenticated admin API + canonical order cost breakdown
748ae2e fix(fulfillment): real sequence allocation, typed DB contract, reversal integrity, drafts, profile versions, cost approval
3f5530d feat(fulfillment): domain enforcement + real transactional integration tests
eee8837 feat(fulfillment): transactional confirmation service (idempotent) + reversals
847f7a1 docs(accounting): Stage A audit, research, canonical model, consolidation + fulfillment plans
a6624fc security(admin): env-only test credentials + transparent read-only audit script
ff90377 feat(accounting): canonical engine, NULL-not-zero costs, consumer redirects, fulfillment schema+engine
```

All 18 are committed. Nothing from this effort is uncommitted.

## 3. Git status — not clean, explained

```console
$ git status --porcelain | wc -l
78     # 17 modified, 8 deleted, 53 untracked
```

**None of it belongs to the accounting/fulfillment effort.** Breakdown:

| Group | Count | What it is |
|---|---|---|
| `client/src/**` modified/deleted | 17 | in-flight UX/motion work from `feat/aquavo-ux-ui-motion-2026`, predates this branch |
| `playwright-report/**` | 6 | regenerated browser report output |
| `.claude-flow/`, `.swarm/`, `config-backups/`, `ruvector.db` | 14 | tool state, not project source |
| `docs/ux-ui-audit-2026/`, `skool-downloader-extension/` | 2 dirs | untracked side projects |
| `migrations/archive_orphan_backup_tables{,_rollback}.sql` | 2 | ⚠️ untracked SQL, **not** in the Neon plan |
| zero-byte shell-quoting artifacts | 38 | garbage files named `({`, `a.code`, `{const`, … — see below |
| `client/src/components/products/__tests__/product-3d-viewer.test.tsx` | 1 | untracked test |
| `Binzhou_Houyi (1) (1).xlsx` | 1 | business spreadsheet, modified |

The 38 zero-byte artifacts are residue from mis-quoted shell commands. Under the freeze in
`.claude/SAFETY-POLICY.md` **I did not delete them.** They are captured in the backup. They
need your one-word approval, and any removal will name each file explicitly.

Every file above is inside `_backups/FishWebClean-preneon-20260723-000738.tar.gz`.

## 4. File inventory

```console
$ git ls-files | wc -l
4629                          # tracked
$ git status --porcelain | grep -c '^??'
53                            # untracked
$ git status --porcelain --ignored | grep -c '^!!'
83                            # ignored
```

Full itemization with sizes: `docs/recovery/pre-neon-backup-manifest.md` §4.

## 5. Full test suite — re-run, 1299 confirmed

```console
$ npx vitest run
 Test Files  100 passed (100)
      Tests  1299 passed (1299)
   Start at  23:56:35
   Duration  142.95s
```

**1299 is confirmed by independent re-run**, not repeated from the prior session.

## 6. Server / API tests

```console
$ npx vitest run server/__tests__/
 Test Files  31 passed (31)
      Tests  403 passed (403)
   Duration  65.31s
```

## 7. Frontend tests

```console
$ npx vitest run client/
 Test Files  67 passed (67)
      Tests  688 passed (688)
   Duration  75.56s
```

(31 + 67 = 98 files; the remaining 2 of 100 are under `test/` and `scripts/`.)

## 8. Strict accounting typechecks

```console
$ npm run check:accounting
> tsc --noEmit -p tsconfig.accounting.json
EXIT=0                        # clean, no output

$ npm run check:accounting:routes
[check:accounting:routes] 53 PRE-EXISTING strict errors in legacy modules (not owned by this effort):
  - server/services/analytics-tracker.ts
  - server/services/embedding-generator.ts
  - server/services/recommendation-engine.ts
  - server/storage/index.ts
  - server/storage/user-storage.ts
[check:accounting:routes] OK — no strict errors in owned files.
```

## 9. Whole-repo typecheck

```console
$ npx tsc --noEmit -p tsconfig.json
client/src/pages/products.tsx(364,16): error TS2551: Property 'imageUrls' does not exist on type 'Product'. Did you mean 'images'?
```

One error, **pre-existing**, in the in-flight UX branch's file. Not introduced by, and not
touched by, this effort. Everything else typechecks.

## 10. Migration apply / re-apply / rollback

```console
$ npx vitest run server/__tests__/fulfillment-migration.test.ts \
    server/__tests__/fulfillment-hardening-migration.test.ts \
    server/__tests__/migration-idempotency.test.ts

 ✓ server/__tests__/migration-idempotency.test.ts        (5 tests)  7946ms
 ✓ server/__tests__/fulfillment-migration.test.ts        (7 tests)  8139ms
 ✓ server/__tests__/fulfillment-hardening-migration.test.ts (9 tests) 8335ms

 Test Files  3 passed (3)
      Tests  21 passed (21)
```

These exercise apply → re-apply (idempotency) → rollback against a real PostgreSQL engine
(PGlite), not a mock.

## 11. Local Playwright

```console
$ npx playwright test e2e/fulfillment-admin.spec.ts --list
Error: Missing E2E base URL. Set PLAYWRIGHT_BASE_URL or E2E_BASE_URL to a safe local/staging URL

$ PLAYWRIGHT_BASE_URL=http://localhost:5000 npx playwright test e2e/fulfillment-admin.spec.ts --list
Total: 15 tests in 1 file
```

The bare invocation **refusing to run** is the designed safety behaviour — the config will not
guess a target URL, so Playwright cannot be pointed at production by accident. With an explicit
local URL, 15 tests are discovered across 5 projects. They have **not been executed** (that
needs a running server and an authenticated admin session — part of the post-Neon gate, item H).

## 12. Independent fulfillment verifier

```console
$ npm run verify:fulfillment
> node TOOLS/verify-fulfillment.mjs
DATABASE_URL is required. Refusing to guess a connection.
```

Correct: the verifier is read-only and refuses to invent a connection string. It is **blocked
on Neon by design** and is step 10 of the child-branch plan.

## 13. No hardcoded credentials in owned code

```console
$ git grep -InE "(npm_|neondb_owner|postgres(ql)?://)" -- \
    server/services/fulfillment* server/services/accounting-engine.ts \
    server/routes/fulfillment* TOOLS/ migrations/add_fulfillment* e2e/
TOOLS/verify-fulfillment.mjs:4://   DATABASE_URL=postgres://... node tools/verify-fulfillment.mjs
```

One hit, a usage comment with an ellipsis. **No credential in any file this effort owns.**

⚠️ **Pre-existing repo-wide finding, unrelated to this effort but you should see it.** A
repo-wide scan found ~16 tracked files under `scratch/` and `Launch_Ideas/promot/` whose
connection strings have the password replaced by the literal `REDACTED_ROTATE_ME`, but which
still expose the **production Neon host and role**:

```
postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb
```

No live password is in the working tree. But the placeholder name says the real one was
committed at some point, so it is presumably still in git history. Recommend rotating the
`neondb_owner` password. I have not modified these files.

## 14. No browser state or PII committed

```console
$ git ls-files | grep -iE 'storageState|auth\.json|cookies|\.har$|playwright/\.auth'
(no matches)
```

No session storage, no cookie jar, no HAR capture, no auth fixture is tracked.

## 15. No production writes

- `DATABASE_URL` is **not set** in this shell — the verifier proved it by refusing to run (§12).
- Every migration test runs against ephemeral in-process PGlite, never a remote host.
- Playwright refuses to start without an explicit base URL (§11).
- Nothing in this session opened a connection to Neon. No Neon branch was created.

## 16. Exactly what is proposed for Neon

**Two migrations, in this order:**

```
1. migrations/add_fulfillment_costing.sql     sha256 ea34a32f5f3d84b5913ca700531941a5ba7f53edf9ba125aa865345a979901d1
2. migrations/add_fulfillment_hardening.sql   sha256 5a7f43634f801f7dc2c77a5f621204c39b1ae1b9cf245a1377e2c67615547f47
```

Each wrapped in its own `BEGIN … COMMIT` (required — see
`docs/audit/neon-migration-review.md` §2.2).

**Rollback, in the reverse order:**

```
1. migrations/add_fulfillment_hardening_rollback.sql  sha256 8a7d97347556de33a7e8fc0c214e85f2fd881ac9e95a70b35724ea3282c510b4
2. migrations/add_fulfillment_costing_rollback.sql    sha256 80fb2b54da93ed0f3c932e71e9321a3adfe185476facd29ccf686cb46f291296
```

Reversing the rollback order **fails** — `DROP TRIGGER IF EXISTS x ON t` errors when `t` is
already gone. This is not a preference.

**Explicitly excluded:** `archive_orphan_backup_tables.sql`,
`backfill_orderitems_from_jsonb.sql`, and every other file in `migrations/`.

## 17. Gate summary

| Gate | Result |
|---|---|
| Branch | `feat/accounting-canonical-fulfillment` ✅ |
| Commits | 18 (not 13) — all committed ✅ |
| Git status | not clean; every item explained and backed up ✅ |
| Full suite | 100 files / **1299 tests** passed ✅ |
| Server/API | 31 files / 403 tests ✅ |
| Frontend | 67 files / 688 tests ✅ |
| Migration apply/reapply/rollback | 21 tests ✅ |
| `check:accounting` | clean ✅ |
| `check:accounting:routes` | no errors in owned files ✅ |
| `tsc` whole repo | 1 pre-existing error, unrelated ⚠️ |
| Playwright | 15 tests discovered; not executed ⏸ blocked on running server |
| Verifier | blocked on `DATABASE_URL` ⏸ by design |
| Credentials in owned code | none ✅ |
| Prod Neon host in legacy tracked files | present ⚠️ rotate |
| Browser state / PII | none tracked ✅ |
| Production writes | none ✅ |
| Backup | 4.53 GiB verified, secrets excluded ✅ |
| `TOOLS/gmail-creator/` recovery | exhausted, unrecovered ❌ |

**Local verification passes.** The two remaining ⏸ items are precisely what the Neon child
branch exists to unblock.

---

# READINESS UPDATE — expanded four-operation set (2026-07-23)

**Gate status: LOCAL VERIFICATION COMPLETE. Neon execution NOT authorized.**

## What changed since the last readiness pass

The migration set grew from two operations to four. Read-only forensics against production
(`neon-child-branch-baseline.md` §6) established that `order_items_relational` exists with
100 rows covering 25 of 37 orders — **12 orders (73 lines) have no relational rows**, and
the fulfillment/accounting work reads those lines. Repairing that requires two operations
that must run *before* the fulfillment migrations.

## Readiness checklist

| Gate | Status | Evidence |
|---|---|---|
| All 4 forward files hashed, full SHA-256 | ✅ | `neon-migration-review.md` (expanded set) |
| All 4 rollback files hashed | ✅ | same |
| Forward order defined + dependencies explicit | ✅ | snapshot → backfill → costing → hardening |
| Rollback order defined (exact reverse) | ✅ | backfill rollback **before** snapshot rollback |
| Snapshot migration idempotent (apply → reapply) | ✅ | 20-test PGlite suite |
| Snapshot rollback complete (8 cols + 5 constraints) | ✅ | verified, then reapplied |
| Snapshot safe against live 7-column shape | ✅ | fixture *is* the 7-column shape |
| No historical row gets today's product cost | ✅ | asserted: all snapshots NULL post-apply |
| Unknown cost stays NULL, verified zero stays 0 | ✅ | dedicated test |
| Backfill refuses to run without its prerequisite | ✅ | hard guard raises, 0 rows written |
| Backfill idempotent (re-run = 0 rows, no empty batch) | ✅ | test 8 |
| Backfill preserves the 100 app rows byte-for-byte | ✅ | full-row JSON comparison |
| Backfill reconciles line-by-line, not order-by-order | ✅ | partial-order top-up test |
| Legitimate repeated product lines preserved | ✅ | exact-duplicate line test |
| Batch-specific rollback removes only its 73 rows | ✅ | tests 9–11 |
| Rollback never deletes app-created rows | ✅ | dedicated test |
| Independent verifier (does not reuse migration SQL) | ✅ | TS reconciler in the suite |
| Full server suite green | ✅ | **432/432**, 33 files |
| Storefront dual-write regression guard | ✅ | `order-creation-dual-write.test.ts`, 9 tests |
| Neon child-branch execution | ⛔ **BLOCKED** | MCP read-only; OAuth full access needed |
| Production branch protection enabled | ⛔ **NOT DONE** | `protected: false` — owner action H1 |

## Production state at this gate — unchanged

- The 12-order coverage gap **remains unrepaired in production**. Nothing has been written.
- `add_order_item_cost_snapshot.sql` is **not applied** to production.
- The current branch's `order-storage.ts` writes `unit_cost_price` etc. — columns production
  does not have. **Deploying this branch without operation #1 would break all order
  creation.** Deployment ordering is: migration #1 first, then deploy.
- Production branch `br-patient-mouse-a4d4cgr4` is `protected: false`; `allowed_ips` empty.

## Remaining blockers

1. **Neon MCP is read-only** — needs OAuth re-consent with full access.
2. **Owner decision** — whether operations #1 and #2 join the authorized set (this document
   prepares them; it does not authorize them).
3. **Recommended first** — enable production branch protection (H1) before write scope is
   granted.

---

# DEPLOYMENT COMPATIBILITY MATRIX (2026-07-23, rev. 3)

"Old app" = any build **before** `ff90377` (does not write cost-snapshot columns).
"New app" = this branch (writes 8 cost-snapshot columns via `createOrderSecure`).

| Database schema | Old app | New app |
|---|---|---|
| **Before snapshot migration** | ✅ Works. Writes the original 7 columns only. This is production today. | ⛔ **MUST NOT RECEIVE TRAFFIC.** `GET /ready` returns **503** naming the missing columns; order creation returns 503 `SCHEMA_NOT_READY`. Without the guard every checkout would fail on `column ... does not exist`. |
| **After snapshot migration (#1)** | ✅ Compatible. The 8 columns are nullable and additive; the old app simply ignores them and leaves them NULL. | ✅ **Supported.** Readiness passes; costs freeze at sale, NULL when unknown. |
| **After all four operations** | ✅ Compatible. Fulfillment tables are new and unreferenced by the old app; backfilled rows are ordinary relational rows. | ✅ **Supported.** Full target state. |
| **After rollback (all 4 reversed)** | ✅ Compatible — back to the pre-migration shape it already handles. | ⛔ **Requires the OLD app version.** The new app writes columns that no longer exist; readiness fails 503 by design. **Roll the app back before, or together with, the schema.** |

## Rolling deployment order

1. Apply **operation #1** (`add_order_item_cost_snapshot.sql`). Additive and
   nullable, so the currently-deployed old app keeps working throughout — there is
   no window in which live traffic is broken.
2. Verify `GET /ready` returns 200 on a canary of the new app.
3. Roll out the **new app**. Instances failing readiness are never given traffic.
4. Apply operations **#2 → #3 → #4** (backfill, then fulfillment costing, then
   hardening). None of these is required for order creation to work.

**Never** deploy the new app before step 1. That is the only ordering that breaks
customer checkout, and it is precisely what the readiness guard now prevents.

## Rollback compatibility

Reverse order (hardening → costing → backfill-batch → snapshot). Because the new
app depends on the snapshot columns, **the application must be rolled back to the
old version before — or in the same window as — step 4**. If the schema is rolled
back first, the new app's readiness probe fails and it stops accepting traffic
rather than corrupting orders: degraded, but safe and loud.

Guard implementation: `server/services/schema-readiness.ts`; endpoint `GET /ready`;
route guard in `server/routes/orders.ts`. Tests:
`server/__tests__/schema-readiness.test.ts` (8).

# COMPLETE LOCAL VERIFICATION (2026-07-23, rev. 3)

Reported separately, not as one aggregate. The earlier "432/432" figure was the
server suite alone and should not have been described as complete project verification.

| Suite / gate | Command | Result |
|---|---|---|
| Server tests | `vitest run server/` | ✅ **490 passed** (36 files) |
| Client tests | `vitest run client/` | ✅ **688 passed** (67 files) |
| **Total unit/integration** | — | ✅ **1,178 passed, 0 failed (103 files)** |
| API/route tests | included above (`api.test.ts`, `routes.test.ts`, `orders-api.test.ts`, `fulfillment-admin-api.test.ts`) | ✅ pass |
| Migration tests | `orderitem-backfill-migration` (21) · `orderitem-backfill-validation` (35) · `migration-transaction-contract` (11) · `fulfillment-migration` · `fulfillment-hardening-migration` · `migration-idempotency` | ✅ pass |
| Strict accounting typecheck | `npm run check:accounting` | ✅ clean |
| Accounting route typecheck | `npm run check:accounting:routes` | ✅ OK — no strict errors in owned files |
| Repository typecheck | `npm run check` | ✅ **clean (0 errors)** |
| Production build | `npm run build` | ✅ client + server built (`dist/index.js`) |
| Security / credential scan | pattern scan over all changed files | ✅ no live credentials introduced |
| Independent fulfillment verifier | `npm run verify:fulfillment` | ⛔ **NOT RUN** — requires `DATABASE_URL`; it correctly refuses to guess a connection. Gated on the Neon child branch. |
| Playwright fulfillment workflow | `npm run test:e2e` | ⛔ **NOT RUN** — needs a running app + seeded DB. Gated on the Neon child branch. |

## Notes on the two gates that did not run

Both are **branch-gated by design**, not skipped. `verify:fulfillment` refuses to
run without an explicit `DATABASE_URL` — the correct behaviour, since guessing a
connection is exactly the failure mode this whole effort is guarding against. The
Playwright fulfillment workflow needs a live app against a real database. Both are
first-class items in the child-branch plan and will run there.

## Pre-existing typecheck error — FIXED, not explained away

`client/src/pages/products.tsx:364` referenced `p.imageUrls`, which does not exist
on `Product` (the field is `images`). Introduced by `81024b5` during SEO work, it
silently emitted `image: undefined` on every JSON-LD ItemList entry on the products
page — a real SEO defect, not merely a type complaint. Fixed to
`p.thumbnail || p.images?.[0]`, matching `deals.tsx` and `admin-dashboard.tsx`.
`npm run check` is now clean for the first time in this effort.

## Pre-existing observation (NOT introduced here, no action taken)

`docs/audit/pre-neon-readiness.md` (earlier section) contains a production
connection string with the password already redacted as `REDACTED_ROTATE_ME`, but
the host and role name remain visible. Not a live credential and left untouched as
historical evidence — folded into hardening item H5 (rotation).
