# Test-count reconciliation — 1299 vs 1178

**Investigator:** independent read-only audit, this session. No database was touched. No source,
test, or migration files were modified. Every number below is from a command re-run in this
session on 2026-07-23; none is carried over.

---

## TL;DR

| Figure | Command scope | Value |
|---|---|---|
| Reported (earlier session, `docs/audit/pre-neon-readiness.md` §5) | `npx vitest run` (no path) | **1299 tests / 100 files** |
| Reported ("most recent run") | `vitest run server/` + `vitest run client/` summed | **1178 tests / 103 files** |
| **Reconciled current total** | `npx vitest run` (no path) — the broadest command matched to `vitest.config.ts` | **1386 tests / 105 files** |

**The 121-test gap (1299 − 1178) is not one bug — it is two real, independently-verified
changes that happen to partially cancel out:**

1. **+87 tests were genuinely added** to `server/__tests__/` since the 1299 figure was recorded
   (5 new test files, part of commits after the pre-Neon readiness doc was written — see §2).
2. **−208 tests were dropped** because the "most recent run" scoped its command to
   `server/` + `client/` only and never included `test/` and `scripts/`, even though
   `vitest.config.ts`'s `include` globs match both of those directories and the 1299 figure
   *did* include them.

`+87 − 208 = −121`. That reproduces the reported gap exactly: **1299 + 87 − 208 = 1178.**

Separately, this audit found a **106th test file that no `vitest` invocation discovers at all**
(`shared/__tests__/schema.test.ts`, 31 tests) because `vitest.config.ts` has no `shared/**`
include glob. It is tracked in git, untouched, and has never been part of any reported total
(neither 1299, nor 1178, nor the reconciled 1386). It is not included in the "1386" reconciled
figure either, since that figure is defined as "what the broadest *authoritative* (config-matched)
command reports," and this file is invisible to that command. See §5.

---

## 1. Vitest / Vite config inventory

Only one Vitest config exists in the repo: **`vitest.config.ts`** (root). There is no
`vitest.workspace.ts`, no `projects` array, and no per-package config. `vite.config.ts` (also
root) has no `test` block — it is build-only (client bundling), so it plays no role in test
discovery.

`vitest.config.ts` (relevant fields):

```ts
test: {
  globals: true,
  environment: 'happy-dom',
  setupFiles: ['./vitest.setup.ts'],
  hookTimeout: 90_000,
  testTimeout: 30_000,
  include: [
    'client/src/**/*.{test,spec}.{ts,tsx}',
    'server/**/*.{test,spec}.{ts,tsx}',
    'test/**/*.{test,spec}.{ts,tsx}',
    'scripts/**/*.{test,spec}.{ts,tsx}',
  ],
  exclude: [
    'node_modules/**',
    '**/node_modules/**',
    'dist/**',
    '.claude/worktrees/**',
    'e2e/**',
  ],
}
```

Key facts:
- **`shared/**` is not in `include`.** Any test file under `shared/` is invisible to every
  vitest command, regardless of scope. (Confirmed real case — see §5.)
- **`e2e/**` is explicitly excluded**, and only `.spec.ts` under `e2e/` would have matched
  `include` in the first place (moot — it's excluded either way). Playwright tests are never
  part of any vitest total. See §6.
- The `include` glob for `test/**` and `scripts/**` means a *scoped* run of `server/` or
  `client/` alone will never pick up `test/accounting-finance.test.ts` or
  `scripts/__tests__/migrate-product-images.test.ts` — this is exactly what happened in the
  "1178" report.

## 2. package.json test scripts

```json
"test": "vitest",
"test:ui": "vitest --ui",
"test:coverage": "vitest --coverage",
"test:watch": "vitest --watch",
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:report": "playwright show-report",
"test:e2e:headed": "playwright test --headed",
"check": "tsc",
"check:accounting": "tsc --noEmit -p tsconfig.accounting.json",
"check:accounting:routes": "node TOOLS/check-accounting-routes.mjs",
"verify:fulfillment": "node TOOLS/verify-fulfillment.mjs"
```

**The broadest authoritative test command is `npm test` (`vitest`, equivalently
`npx vitest run` for a single CI-style pass with no watch).** It has no path argument, so it
resolves purely from `vitest.config.ts`'s `include`/`exclude` — the same globs documented above.
There is no npm script that runs `server/` and `client/` only; that scoping was constructed
ad hoc by whoever ran the "1178" report (two separate `vitest run <dir>` invocations, summed,
with `test/` and `scripts/` omitted from the sum).

Git history shows this exact ad hoc scoping was already used once before, in
`docs/audit/pre-neon-readiness.md` §6–7, where the author explicitly noted:

> "(31 + 67 = 98 files; the remaining 2 of 100 are under `test/` and `scripts/`.)"

That note is the smoking gun: the person who wrote the 1299 report was aware `test/` and
`scripts/` needed to be added back for the full-repo number, and did so. The "1178" report
appears to have repeated the server+client-only sub-scoping *without* that reconciliation step.

## 3. Full test-file inventory (105 files discovered, 1386 tests)

Grouped by directory, from a real `npx vitest run` (no path) execution:

| Directory | Files | Tests |
|---|---|---|
| `server/__tests__/` | 36 | 490 |
| `client/src/**/__tests__/` | 67 | 688 |
| `test/` | 1 | 183 |
| `scripts/__tests__/` | 1 | 25 |
| **Total (vitest-discovered)** | **105** | **1386** |

Full per-file breakdown (all 105 discovered files, test counts as reported by vitest):

<details>
<summary>server/__tests__/ — 36 files, 490 tests</summary>

| File | Tests |
|---|---|
| admin-images.test.ts | 15 |
| ai-advanced.test.ts | 18 |
| api.test.ts | 15 |
| auth.test.ts | 28 |
| consolidation-consumer-primitives.test.ts | 12 |
| consolidation-engine-agreement.test.ts | 11 |
| consolidation-followup-swaps.test.ts | 9 |
| consolidation-rounding-tolerance.test.ts | 5 |
| cost-snapshot.test.ts | 4 |
| coupons-api.test.ts | 15 |
| discounts-api.test.ts | 7 |
| e2e-credentials-guard.test.ts | 5 |
| fulfillment-admin-api.test.ts | 21 |
| fulfillment-concurrency.test.ts | 7 |
| fulfillment-drafts-profiles-costs.test.ts | 31 |
| fulfillment-engine.test.ts | 7 |
| fulfillment-hardening-migration.test.ts | 9 |
| fulfillment-migration.test.ts | 7 |
| fulfillment-reversal-integrity.test.ts | 13 |
| fulfillment-service.test.ts | 8 |
| fulfillment-service-integration.test.ts | 7 |
| fulfillment-verifier.test.ts | 12 |
| migration-idempotency.test.ts | 5 |
| **migration-transaction-contract.test.ts** ⭐ | 11 |
| nullable-cost.test.ts | 6 |
| **order-creation-dual-write.test.ts** ⭐ | 12 |
| order-financials.test.ts | 11 |
| **orderitem-backfill-migration.test.ts** ⭐ | 21 |
| **orderitem-backfill-validation.test.ts** ⭐ | 35 |
| orders-api.test.ts | 36 |
| products-api.test.ts | 12 |
| routes.test.ts | 19 |
| **schema-readiness.test.ts** ⭐ | 8 |
| security.test.ts | 6 |
| storage.test.ts | 14 |
| validation.test.ts | 28 |

⭐ = added in the 5 newest server test files (commits `cc8a0e7`, `565bc0c`, `d2a3973` — see §4).
These 5 files total **87 tests**, all added after the 1299 figure was recorded.

</details>

<details>
<summary>client/src/**/__tests__/ — 67 files, 688 tests (unchanged since the 1299 run)</summary>

App.test.tsx (7), calculators.test.tsx [__tests__] (17), cart.test.tsx (16),
fish-encyclopedia.test.tsx [__tests__] (13), products.test.tsx [__tests__] (8),
footer.test.tsx (4), navbar.test.tsx (3), admin.test.tsx (12),
fulfillment-panel.test.tsx (18), calculators.test.tsx [components] (8),
ai-chat-bot.test.tsx (56), effects.test.tsx (16), product-3d-viewer.test.tsx (2),
product-card.test.tsx (6), reviews.test.tsx (18), badge.test.tsx (9),
button.test.tsx (21), card.test.tsx (18), dialog.test.tsx (10),
error-boundary.test.tsx (12), input.test.tsx (26), auth-context.test.tsx (8),
cart-context.test.tsx (14), wishlist-context.test.tsx (9), use-cart-count.test.ts (4),
use-fish-data.test.tsx (6), use-mobile.test.tsx (4), use-pwa.test.ts (12),
use-toast.test.tsx (5), api.test.ts (24), fulfillment-format.test.ts (11),
logger.test.ts (18), queryClient.test.ts (15), recommendations.test.ts (12),
sentry.test.ts (13), utils.test.ts (33), 404.test.tsx (15),
admin-dashboard.test.tsx (4), admin-login.test.tsx (11), blog.test.tsx (7),
blog-post.test.tsx (6), calculators.test.tsx [pages] (5),
community-gallery.test.tsx (5), compare.test.tsx (4), deals.test.tsx (8),
faq.test.tsx (4), fish-breeding-calculator.test.tsx (5),
fish-encyclopedia.test.tsx [pages] (5), fish-health-diagnosis.test.tsx (13),
forgot-password.test.tsx (7), guides-eco-friendly.test.tsx (5), home.test.tsx (5),
journey.test.tsx (6), login.test.tsx (16), order-confirmation.test.tsx (6),
order-tracking.test.tsx (3), privacy-policy.test.tsx (5),
product-details.test.tsx (6), products.test.tsx [pages] (5), profile.test.tsx (4),
register.test.tsx (13), return-policy.test.tsx (5), search-results.test.tsx (3),
shipping.test.tsx (5), sustainability.test.tsx (5), terms.test.tsx (5),
wishlist.test.tsx (4).

Sum = 688. This total is **identical** to the 688 recorded in `pre-neon-readiness.md` §7 —
confirming the client suite has not changed since that report.

</details>

<details>
<summary>test/ and scripts/ — 2 files, 208 tests (the part "1178" silently dropped)</summary>

| File | Tests |
|---|---|
| `test/accounting-finance.test.ts` | 183 |
| `scripts/__tests__/migrate-product-images.test.ts` | 25 |
| **Total** | **208** |

Both files pre-date this branch by a wide margin (added in commits `db27d14` and `0607f81`
respectively, well before the 30 most-recent commits). They are not new — they were simply
never in scope for the "server/ + client/" ad hoc run that produced "1178".

</details>

## 4. Git history — what changed since the 1299 figure was recorded

`docs/audit/pre-neon-readiness.md` (committed `dbe1e62`, 2026-07-23 07:00:38 +0300) is the exact
source of the "1299" figure — it is not folklore, it's a written, dated, previously-committed
report:

```
## 5. Full test suite — re-run, 1299 confirmed
$ npx vitest run
 Test Files  100 passed (100)
      Tests  1299 passed (1299)

## 6. Server / API tests
$ npx vitest run server/__tests__/
 Test Files  31 passed (31)
      Tests  403 passed (403)

## 7. Frontend tests
$ npx vitest run client/
 Test Files  67 passed (67)
      Tests  688 passed (688)
(31 + 67 = 98 files; the remaining 2 of 100 are under test/ and scripts/.)
```

That decomposes as **31 (403) + 67 (688) + 2 (208) = 100 files / 1299 tests** — internally
consistent, and matches this session's client-side numbers exactly (688/67, unchanged) and the
`test/`+`scripts/` numbers exactly (208/2, unchanged).

Since that report was written, five **new** server test files were added, all under
`server/__tests__/`, via commits that post-date it on this branch:

| Commit | File added | Tests |
|---|---|---|
| `565bc0c` test(migrations): production-shaped snapshot-migration verification + tx contract | `migration-transaction-contract.test.ts` | 11 |
| `565bc0c` (same commit) | `orderitem-backfill-migration.test.ts` | 21 |
| `cc8a0e7` fix(migrations): rewrite the JSONB backfill | `orderitem-backfill-validation.test.ts` | 35 |
| `d2a3973` fix(orders): disable both unsafe order-creation paths | `order-creation-dual-write.test.ts` | 12 |
| `d2a3973` (same commit) | `schema-readiness.test.ts` | 8 |
| **Total added** | | **87** |

`server/__tests__/` therefore grew from **31 files / 403 tests → 36 files / 490 tests**
(`403 + 87 = 490` ✓, `31 + 5 = 36` ✓). This matches this session's live re-run exactly.

**Reconciliation arithmetic:**

```
1299 (old total, includes test/+scripts/)
  + 87 (new server tests added since)
  = 1386 (true current total, includes test/+scripts/)
  - 208 (test/+scripts/, dropped by the "1178" report's server+client-only scoping)
  = 1178  ✓ matches the reported "most recent run" figure exactly
```

No renamed or deleted test files were found in `git log --diff-filter=R` / `--diff-filter=D`
history for `*.test.ts`/`*.test.tsx`/`*.spec.ts`/`*.spec.tsx` on this branch — the gap is
additive-only (5 new files) plus a scoping omission, not attrition.

## 5. Test file present on disk but NOT discovered by any vitest command

**`shared/__tests__/schema.test.ts`** — 31 `it()`/`test()` blocks, tracked in git since the
initial commit (`0aa56f3 Fresh Start`), currently clean (no uncommitted changes). It does not
appear in the output of `npx vitest run` (no path), `vitest run server/`, or `vitest run client/`
because `vitest.config.ts`'s `include` array has no `shared/**` glob. This file has **never**
been part of any reported total — not 1299, not 1178, not this session's 1386. It is a silent
gap, unrelated to the 121-test question, but directly responsive to the "check for test files
present on disk but not discovered" requirement.

If the intent is for this file to run, `vitest.config.ts`'s `include` needs
`'shared/**/*.{test,spec}.{ts,tsx}'` added. (Not applied — out of this audit's write scope.)

## 6. Playwright e2e — confirmed excluded from every vitest figure, counted separately

`vitest.config.ts` `exclude` explicitly lists `'e2e/**'`. `playwright.config.ts` is a fully
separate harness (`npm run test:e2e` → `playwright test`), never invoked by any `vitest`
command. E2e tests were **not run** in this audit (per instructions — count only).

```
$ find e2e -name "*.spec.ts" | wc -l
29
```

`test(` call count (including `.skip`/`.only`/`.fixme` variants) per file, static count without
running:

| File | `test(` calls |
|---|---|
| admin.spec.ts | 85 |
| advanced-features.spec.ts | 69 |
| page-features.spec.ts | 62 |
| effects-interactions.spec.ts | 55 |
| ui-components.spec.ts | 57 |
| extended-features.spec.ts | 57 |
| features.spec.ts | 56 |
| final-features.spec.ts | 46 |
| system-features.spec.ts | 52 |
| advanced-pages.spec.ts | 47 |
| navigation.spec.ts | 43 |
| calculators.spec.ts | 43 |
| products.spec.ts | 43 |
| contexts.spec.ts | 42 |
| auth.spec.ts | 44 |
| chat.spec.ts | 40 |
| security-widgets.spec.ts | 40 |
| fish.spec.ts | 34 |
| home.spec.ts | 36 |
| journey.spec.ts | 38 |
| utilities.spec.ts | 38 |
| checkout.spec.ts | 32 |
| responsive.spec.ts | 32 |
| gallery.spec.ts | 30 |
| cart.spec.ts | 28 |
| api-integration.spec.ts | 26 |
| accessibility.spec.ts | 24 |
| user-flows.spec.ts | 22 |
| fulfillment-admin.spec.ts | 6 |
| **Total** | **1227** |

**This rules out "the 1299 figure secretly included e2e" as an explanation** — 1227 is far
larger than the 121-test gap in question, and none of it is plausibly a partial/rounded
inclusion given e2e is structurally excluded by `vitest.config.ts`. The 1299 vs 1178 gap is
fully explained by §4 without needing to invoke Playwright at all. Playwright is a real, much
larger (1227-test) separate figure that neither 1299 nor 1178 nor 1386 includes.

## 7. Skipped / todo tests

```
$ grep -rEn "\.(skip|todo)\(" client/src server/__tests__ test scripts/__tests__ --include="*.test.ts" --include="*.test.tsx"
(0 matches)
```

No `it.skip`, `describe.skip`, `test.skip`, or `.todo` in the vitest-discovered suite. All 1386
counted tests are active (none silently skip-but-counted). The one anomaly encountered during
this audit's runs is noted in §8, not a skip.

---

## 8. Command results (this session, real re-runs)

### `npx vitest run server/`
```
Test Files  36 passed (36)
     Tests  490 passed (490)
  Duration  138.64s
```
PASS.

### `npx vitest run client/`
```
Test Files  67 passed (67)
     Tests  688 passed (688)
  Duration  80.00s
```
PASS.

### `npx vitest run` (no path — broadest command)
Run twice for reliability:

- **Run 1:** `Test Files 105 passed (105)` / `Tests 1386 passed (1386)` — Duration 208.78s. Clean pass.
- **Run 2:** `Test Files 104 passed | 1 failed (105)` / `Tests 1385 passed | 1 failed (1386)` —
  Duration 253.14s. The single failure was
  `server/__tests__/orderitem-backfill-validation.test.ts > FAILS CLOSED on missing_product_id`,
  which errored with `Test timed out in 30000ms` after 37152ms of actual execution. This file
  boots a real PGlite (WASM Postgres) per test and the whole suite was under heavy concurrent
  I/O load during this second, longer-duration run (`import` phase alone took 704s vs 362s in
  run 1). Every other assertion in that same file, including the identical logic for 10 other
  `INVALID_CASES`, passed. This reads as a **timing-sensitive flake under load**, not a real
  regression — it passed cleanly in the dedicated `server/` run and in run 1 of the broad run.
  File/test counts were identical between both runs (105 files / 1386 tests either way).

**Conclusion: 105 files / 1386 tests is the reproducible, config-authoritative total.** One
flaky timeout was observed on a resource-heavy PGlite test under concurrent load; it is a test
suite robustness note, not a count discrepancy.

### `npm run check` (repo-wide `tsc`)
```
> aquavo@1.0.0 check
> tsc
```
Exit 0. **PASS** — no type errors.

### `npm run check:accounting`
```
> aquavo@1.0.0 check:accounting
> tsc --noEmit -p tsconfig.accounting.json
```
Exit 0. **PASS**.

### `npm run check:accounting:routes`
```
> aquavo@1.0.0 check:accounting:routes
> node TOOLS/check-accounting-routes.mjs

[check:accounting:routes] 53 PRE-EXISTING strict errors in legacy modules (not owned by this effort):
  - server/services/analytics-tracker.ts
  - server/services/embedding-generator.ts
  - server/services/recommendation-engine.ts
  - server/storage/index.ts
  - server/storage/user-storage.ts
[check:accounting:routes] OK — no strict errors in owned files.
```
Exit 0. **PASS** (the 53 pre-existing errors are explicitly out-of-scope legacy debt the script
itself flags and does not fail on).

### `npm run build`
Completed successfully: client bundle built (chunked, gzip+brotli compressed), server bundle
built (`dist\index.js`, 3.1MB, flagged by esbuild's own size warning — not an error).
```
building server...
generating SSR template...
  dist\index.js  3.1mb ⚠️
⚡ Done in 6969ms
```
Exit 0. **PASS**.

---

## 9. Credential / secret scan

Scanned **tracked files only** (`git ls-files`) for `postgres(ql)?://user:pass@…`,
`npg_[A-Za-z0-9]{10,}`, `sk-[A-Za-z0-9]{20,}`, `AKIA[0-9A-Z]{16}`. No secret values are
reproduced anywhere in this report — only file names, line numbers, and counts.

**Finding: 195 tracked files contain a hardcoded, live-looking Neon Postgres connection string**
(same host, `ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech`, embedded with a real-looking
password segment — redacted in every check performed) committed directly into source. This is
**not** an env-var reference or a documented placeholder in the vast majority of cases — it is a
literal `neon('postgresql://neondb_owner:<redacted>@ep-quiet-moon-…/neondb?...')` or
`const DB = "postgresql://neondb_owner:<redacted>@ep-quiet-moon-…"` call inline in one-off data
scripts.

Breakdown by directory:

| Directory | Files with a live-looking hardcoded connection string |
|---|---|
| `scripts/` | 178 |
| `scratch/` | 13 |
| `Launch_Ideas/promot/` | 3 |
| `docs/audit/` | 1 (`pre-neon-readiness.md` — a redacted-looking snippet at line 206; verify manually, do not assume it's safe just because it's a docs file) |
| **Total** | **195** |

One additional match, `docs/START_HERE.md:57`, is a **genuine placeholder**
(`postgresql://user:password@host:5432/database?sslmode=require`) — not a live secret.

Representative examples (line-numbered, values redacted by this audit, not reproduced here):
- `scripts/add-acrylic-pipe-clamp.ts:3`
- `scratch/check_costs.mjs:2`
- `Launch_Ideas/promot/_db_query.cjs:3`
- `docs/audit/pre-neon-readiness.md:206`

Full file list (195 files) is enumerable via:
```
git ls-files -z | xargs -0 grep -lE 'postgres(ql)?://[^"'"'"'[:space:]]*:[^"'"'"'[:space:]]*@ep-quiet-moon'
```

**This is a live secret-management issue, tracked in git, well outside this audit's scope to
fix** (this agent is read-only except for this one report file, and is explicitly barred from
touching the database or printing secret values). It is reported here only because the task's
required credential scan surfaced it — it should be escalated and rotated/remediated separately
from the test-count question this report answers.

No `sk-…`, `npg_…`, or `AKIA…` pattern matches were found in tracked files outside of the
Postgres connection strings above.

---

## 10. Final answer

- **Reconciled total, broadest authoritative command (`npm test` / `npx vitest run`):
  105 test files, 1386 tests, all passing** (one flaky PGlite timeout observed under load on a
  re-run; reproducibly passes in isolation and in a clean run — see §8).
- **Server: 36 files / 490 tests.** **Client: 67 files / 688 tests.** **`test/`+`scripts/`: 2
  files / 208 tests** (matched by config `include` but excluded from any run scoped to only
  `server/` or `client/`).
- **The 121-test gap between 1299 and 1178 is fully explained, with commit-level evidence:**
  `1299 + 87 (five new server test files added in commits d2a3973/cc8a0e7/565bc0c) − 208
  (test/+scripts/ tests dropped when "1178" was scoped to server/+client/ only) = 1178`, exactly.
  Neither figure was simply "wrong" — 1299 was a real, correctly-scoped count at an earlier
  commit; 1178 is a real count of a narrower, differently-scoped command at the current commit.
  They are not directly comparable numbers, which is why they don't match.
- **1386 is higher than both 1299 and 1178** because it reflects the current commit *and* full
  config scope simultaneously — neither prior figure did both.
- A 106th test file (`shared/__tests__/schema.test.ts`, 31 tests) exists on disk, is tracked in
  git, and is discovered by **no** vitest command because `vitest.config.ts` has no `shared/**`
  include glob — a pre-existing config gap, unrelated to the 121 discrepancy but real and
  actionable.
- Playwright e2e (`e2e/`, 29 spec files, 1227 `test()` calls) is structurally excluded from every
  vitest figure by `vitest.config.ts`'s `exclude: ['e2e/**']` and was not run, per instructions.
- No skipped/todo tests exist in the vitest suite.
- `npm run check`, `check:accounting`, `check:accounting:routes`, and `npm run build` all pass.
- The secret scan surfaced a serious, pre-existing, out-of-scope finding: 195 tracked files carry
  a hardcoded live-looking Neon connection string. Reported by file/line only, no values printed.
