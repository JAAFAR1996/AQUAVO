# Test-count reconciliation — final, 1417 authoritative

**Agent:** Agent 4 — TestCoverageAgent, independent, local-only, no DB connection.
**Scope of edits:** `vitest.config.ts` (`include` glob only) + this report. No source, migration,
or test files were touched.
**Date:** 2026-07-23. Every number below is from a command re-run in this session; none is
carried over from an earlier report.

---

## TL;DR

| Figure | Command | Value |
|---|---|---|
| Baseline (before this session's config change) | `npx vitest run` (no path) | **1386 tests / 105 files** (1 flaky failure in `client/src/pages/__tests__/home.test.tsx`, unrelated to this work — passed on every subsequent re-run) |
| `shared/__tests__/schema.test.ts` — discovered by no command before this change | `npx vitest run shared` | **31 tests / 1 file** |
| **Reconciled authoritative total (after config change)** | `npx vitest run` (no path) | **1417 tests / 106 files — matches the ~1417 expectation exactly (1386 + 31)** |

---

## 1. Every vitest config in the repo

Searched with `Glob **/vitest*.config.*`. Results, and disposition:

| Path | In scope? | Why |
|---|---|---|
| `vitest.config.ts` (repo root) | **Yes — authoritative** | The only config `package.json`'s `test`/`test:*` scripts and `npx vitest` resolve to. |
| `.claude/worktrees/jovial-germain-89e4df/vitest.config.ts` | No | Separate git worktree, not part of this branch's tree; excluded from the root config anyway (`.claude/worktrees/**` is in `exclude`). |
| `.claude/worktrees/hardcore-noether-c55378/vitest.config.ts` | No | Same as above. |
| `node_modules/.pnpm/@vercel+analytics.../vitest.config.mts` | No | Third-party package's own internal config, irrelevant to this repo's test suite. |
| `node_modules/.pnpm/@vercel+speed-insights.../vitest.config.mts` | No | Same. |

Only `vitest.config.ts` at the repo root needed a change.

### Before (verbatim)

```ts
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
```

No `shared/**` glob existed anywhere in `include`, so `shared/__tests__/schema.test.ts` was
discovered by **no** vitest invocation — confirmed by running `npx vitest run` with no path
(105 files / 1386 tests, no `shared/` file listed) and by grepping the config for `shared` (no
match) before making any change.

### After (verbatim, only change highlighted)

```ts
include: [
  'client/src/**/*.{test,spec}.{ts,tsx}',
  'server/**/*.{test,spec}.{ts,tsx}',
  'shared/**/*.{test,spec}.{ts,tsx}',   // <-- added
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
```

`exclude` was left untouched — nothing under `shared/` needed excluding.

---

## 2. Proof of no double-counting

The five `include` globs each anchor to a **distinct top-level directory** —
`client/src/`, `server/`, `shared/`, `test/`, `scripts/` — with no directory nested inside
another. A file can match at most one glob. Confirmed two ways:

1. **File-count arithmetic.** Running each category glob in isolation and summing:

   | Category | Files | Tests |
   |---|---|---|
   | `client/src/**` | 67 | 688 |
   | `server/**` | 36 | 490 |
   | `shared/**` | 1 | 31 |
   | `test/**` | 1 | 183 |
   | `scripts/**` | 1 | 25 |
   | **Sum** | **106** | **1417** |

   The full-suite run (`npx vitest run`, no path) reported **exactly** 106 files / 1417 tests —
   an exact match to the sum with no excess, which is only possible if no file was counted
   twice.

2. **Delta check.** Baseline (before the config edit) was 105 files / 1386 tests. After adding
   `shared/**`, the only structural change, the new total is 106 files / 1417 tests. Delta =
   +1 file / +31 tests, which is exactly `shared/__tests__/schema.test.ts`'s own file/test count
   (confirmed in §1's `shared`-only run) — not more, not less. No pre-existing file started
   being matched by two globs.

`shared/__tests__/schema.test.ts` was also confirmed to be the **only** test file under
`shared/` (`Glob shared/**/*.test.*` and `Glob shared/__tests__/**` both return only this one
file).

---

## 3. Per-category real run output

All commands run with `npx vitest run <path>`, generous timeouts, real terminal output
transcribed below (counts only; full logs were not persisted, per the read-only/no-secrets
constraint — none of these outputs contained secrets).

| Category | Command | Files | Tests | Result |
|---|---|---|---|---|
| Shared only | `npx vitest run shared` | 1 | 31 | **31 passed** |
| Server only | `npx vitest run server` | 36 | 490 | **490 passed** |
| Client only | `npx vitest run client` | 67 | 688 | **688 passed** |
| `test/` only | `npx vitest run "test/accounting-finance.test.ts"` (the only file under `test/`; a bare `test` path arg is a *substring* filter in vitest and matches every `*.test.ts`/`__tests__` file repo-wide — verified this pitfall and used an explicit file path instead) | 1 | 183 | **183 passed** |
| `scripts/` only | `npx vitest run scripts` | 1 | 25 | **25 passed** |
| Migration tests (5 files under `server/__tests__` with "migrat" in the filename: `fulfillment-migration.test.ts`, `migration-idempotency.test.ts`, `fulfillment-hardening-migration.test.ts`, `migration-transaction-contract.test.ts`, `orderitem-backfill-migration.test.ts`) | `npx vitest run <the 5 files above>` | 5 | 53 | **53 passed** (these 5 files/53 tests are a subset of the 490 "server only" tests above, not additive to the 1417 total) |
| **Complete authoritative suite** | `npx vitest run` (no path) | **106** | **1417** | **1417 passed** |

Note on the `test/` glob pitfall: an earlier attempt (`npx vitest run test`) returned 106 files /
1417 tests — i.e. the *entire* suite — because vitest's CLI path argument is a substring match
against resolved file paths, and the literal string `test` occurs in almost every spec's path
(`__tests__/…`, `…\*.test.ts`). This is **not** evidence of "test/ has 1417 tests"; it was a
filter artifact. Re-verified with `Glob test/**/*.{test,spec}.{ts,tsx}` (returns exactly one
file, `test/accounting-finance.test.ts`) and ran that file explicitly instead.

---

## 4. Other required commands

| Command | Result |
|---|---|
| `npm run check` (`tsc`) | **Pass** — no output, exit clean. |
| `npm run check:accounting` (`tsc --noEmit -p tsconfig.accounting.json`) | **Pass** — no output, exit clean. |
| `npm run check:accounting:routes` (`node TOOLS/check-accounting-routes.mjs`) | **Pass** — reports "53 PRE-EXISTING strict errors in legacy modules (not owned by this effort)" across `server/services/analytics-tracker.ts`, `server/services/embedding-generator.ts`, `server/services/recommendation-engine.ts`, `server/storage/index.ts`, `server/storage/user-storage.ts`; concludes `OK — no strict errors in owned files.` (This is the script's own gating logic, not a failure.) |
| `npm run build` | **Pass** — client + SSR build completed (`⚡ Done in 1491ms`), `dist/index.js` emitted (3.1mb, flagged by Vite's own size warning only, not an error). |

---

## 5. Credential scan

Pattern: `postgres://|postgresql://|npg_|sk-[A-Za-z0-9]{32}|AKIA[0-9A-Z]{16}`, run against tracked
files with `git grep -nE`. **213 total matches.** Every match was individually classified;
**zero LIVE credentials found.** No secret value is reproduced below — only file paths, line
numbers, and classification.

### Classification breakdown

| Class | Count | Description |
|---|---|---|
| **PLACEHOLDER — redacted literal** | 196 | The literal string `REDACTED_ROTATE_ME`, present verbatim in one-off data-migration scripts under `scripts/` (176 files) and `scratch/` (14 files), plus 6 doc/prompt references. This is the same literal a prior agent's session flagged and mistakenly called "195 live credentials" — it is deliberately-redacted placeholder text, not a working connection string. Representative files (each 1 hit): `scripts/check-schema.ts`, `scripts/fix-images.ts`, `scratch/update-stock.mjs`, `docs/audit/findings-register.md`, `docs/audit/pre-neon-readiness.md`, `Launch_Ideas/promot/AQUAVO_MEGA_SYSTEM_PROMPT.md`, `Launch_Ideas/promot/_db_query.js`, `Launch_Ideas/promot/_db_query.cjs`. |
| **PLACEHOLDER — example/template connection string** | 17 | Generic template strings such as `postgres://user:pass@host:5432/database`, `postgres://localhost:5432/dev`, `postgresql://user:password@host:5432/database?sslmode=require`, or truncated `postgres://...` — no real host, user, or password. Files: `.env.example:10`, `docs/DEPLOYMENT.md:89`, `docs/START_HERE.md:57`, `TOOLS/verify-fulfillment.mjs:4` (a comment showing expected env-var shape), `.agents/skills/cloudflare-wrangler/SKILL.md:210,495`, `All_Skills_Extracted/cloudflare-wrangler.md:210,495`, `AQUAVO_ALL_SKILLS_RAW.md:2174,2459`, `scripts/insert-missing-decor.ts:4`, `docs/audit/pre-neon-readiness.md:195` (quoting the `verify-fulfillment.mjs` comment), and this report itself (`docs/audit/test-count-reconciliation.md`, lines documenting the scan pattern and its own findings — self-referential, not a hit on a real secret). |
| **LIVE** | 0 | None found. No `npg_…`, `sk-…`, or `AKIA…` pattern matched anything outside the pattern documentation in this report and the prior audit doc. |

**Conclusion: all 213 matches are placeholders (either the deliberately-redacted literal or
generic template text). No live database URL, API key, or AWS access key was found in tracked
files.**

---

## 6. Final reconciliation — is it exactly 1417?

**Yes.** `npx vitest run` (no path, the authoritative command) reports:

```
Test Files  106 passed (106)
     Tests  1417 passed (1417)
```

This equals 1386 (pre-change baseline) + 31 (`shared/__tests__/schema.test.ts`, previously
undiscovered) = **1417**, exactly matching the stated expectation. It is also independently
confirmed by the per-category sum in §2 (67+36+1+1+1 = 106 files; 688+490+31+183+25 = 1417
tests), which is the strongest proof against double-counting: two independent methods
(single full-suite run vs. sum of disjoint category runs) agree to the test.

All 1417 tests **passed** in the full-suite run in this session (0 failed). Note: an isolated
run of `npx vitest run` performed as the very first baseline check (before the config edit,
scoped to the *old* 105-file set) showed 1 failing test in
`client/src/pages/__tests__/home.test.tsx` (a `waitFor` timing assertion). That same file
passed cleanly in every subsequent run in this session (client-only run, and the final
full-suite run) — it is flaky/timing-sensitive, not a regression from the config change, and it
is outside this agent's edit authority (test files are off-limits) to fix.

---

## 7. Skipped / todo / excluded tests

- **`.skip(...)` / `.todo(...)`**: **0 found.** Searched `client/src`, `server`, `shared`,
  `test`, `scripts` for `\.(skip|todo)\(` across all `*.test.{ts,tsx}` / `*.spec.{ts,tsx}` files
  — no matches. Every one of the 1417 discovered tests actually executes and reports
  pass/fail; none is programmatically skipped or marked todo. This is also consistent with
  every `vitest run` summary line in this report showing only a `passed` count with no
  separate `skipped`/`todo` figure (vitest prints those explicitly when present).
- **Excluded by `vitest.config.ts`'s `exclude` array** (by design, not a gap):
  - `node_modules/**`, `**/node_modules/**`, `dist/**` — build/dependency output, not source.
  - `.claude/worktrees/**` — separate git worktrees with their own copies of the repo (each has
    its own `vitest.config.ts`, not part of this branch).
  - `e2e/**` — **Playwright** end-to-end specs, deliberately excluded from the Vitest run
    because they're a different test runner (`npm run test:e2e` → `playwright test`, not
    `vitest`). Per task instructions, these were **counted but not run**:
    **29 spec files** under `e2e/`: `accessibility.spec.ts`, `admin.spec.ts`,
    `advanced-features.spec.ts`, `advanced-pages.spec.ts`, `api-integration.spec.ts`,
    `auth.spec.ts`, `calculators.spec.ts`, `cart.spec.ts`, `chat.spec.ts`, `checkout.spec.ts`,
    `contexts.spec.ts`, `effects-interactions.spec.ts`, `extended-features.spec.ts`,
    `features.spec.ts`, `final-features.spec.ts`, `fish.spec.ts`, `fulfillment-admin.spec.ts`,
    `gallery.spec.ts`, `home.spec.ts`, `journey.spec.ts`, `navigation.spec.ts`,
    `page-features.spec.ts`, `products.spec.ts`, `responsive.spec.ts`,
    `security-widgets.spec.ts`, `system-features.spec.ts`, `ui-components.spec.ts`,
    `user-flows.spec.ts`, `utilities.spec.ts`.

---

## 8. Summary

- **Config change:** added `'shared/**/*.{test,spec}.{ts,tsx}'` to `vitest.config.ts`'s `include`
  array (one line). No other config file needed changing; `exclude` untouched.
- **No double-counting:** the five include globs anchor to disjoint top-level directories; the
  full-suite total (106 files / 1417 tests) exactly equals the sum of five independently-run,
  non-overlapping category totals.
- **Final authoritative total: 106 test files / 1417 tests, all passing** via
  `npx vitest run` — matches the expected 1386 + 31 = 1417 exactly.
- **`npm run check`, `check:accounting`, `check:accounting:routes`, `build`: all pass.**
- **Credential scan: 213 pattern matches, 0 live — all placeholders** (196 the redacted literal
  `REDACTED_ROTATE_ME`, 17 generic template connection strings / self-referential doc text).
- **Skipped/todo: 0.** **Excluded by design: Playwright's 29 `e2e/**` spec files** (different
  test runner, not run by this task per instructions).
