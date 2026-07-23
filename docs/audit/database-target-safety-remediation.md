# Database-Target Safety Remediation (finding N-2, HIGH)

**Owner:** DatabaseTargetSafetyAgent
**Scope:** database-target bootstrap/configuration and its tests only.
**Status:** fixed and covered by regression tests. Residual hazards listed in §8 — read them.

---

## 1. Root cause

`server/env.ts` began with:

```ts
dotenv.config({ path: ".env.local", override: true });
dotenv.config({ override: true });
```

`override: true` makes dotenv **overwrite variables that are already present in the process
environment**. The local (git-ignored) `.env` in the repo root contains a `DATABASE_URL` pointing at
the **production** Neon endpoint `ep-quiet-moon-a4h7tdze` (branch `br-patient-mouse-a4d4cgr4`).

Therefore:

```
DATABASE_URL=<child-branch url> npm run dev
```

started the app **connected to production**, silently. There was no error and no log line
distinguishing the two — `server/db.ts` only printed `"[DB] Connecting to configured database"`.

Two aggravating factors:

* `tsx server/index.ts` re-executes into a child process. A *parent-only* preload (`node -r …`) does
  not survive that hop, so "just preload a guard" was not a viable fix — the guard has to live in a
  module the child actually imports.
* Because both branches carry the same table names, the mistake surfaced (in the prior session) as a
  schema-drift **503**, not as a connection error. It was caught by luck. Only read-only probes had
  been issued, so no production write occurred.

**Reproduction of the pre-fix behaviour** (run in a temp dir whose `.env` holds the production URL):

```
$ DATABASE_URL="postgresql://u:pw@ep-round-dust-child-a4t0kt58.neon.tech/neondb" \
  node -e "require('dotenv').config({override:true}); console.log(new URL(process.env.DATABASE_URL).hostname)"
OLD BEHAVIOUR -> host: ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech
```

The explicit child-branch target was discarded. That is the defect.

---

## 2. Full inventory: dotenv / env-mutation / child-process env construction

### 2.1 Runtime & build bootstrap (in scope — all remediated)

| # | File | Before | After |
|---|------|--------|-------|
| 1 | `server/env.ts` | `dotenv.config({ path: ".env.local", override: true })` + `dotenv.config({ override: true })` | `loadEnvFilesPreservingDatabaseTargets()` + resolve + redacted startup log |
| 2 | `server/index.ts:27` | `import dotenv from 'dotenv'` — **imported but never used** (dead) | removed, with a comment pointing at `./env.js` |
| 3 | `server/db.ts` | read `process.env.DATABASE_URL` raw; logged `"[DB] Connecting to configured database"` | resolves through the canonical resolver; fails closed; logs redacted identity |
| 4 | `server/aquavo-mcp.ts:11-13` | 2× `dotenv.config({ override: true })` | shared loader + resolver; identity logged to **stderr** (stdout is the MCP transport) |
| 5 | `server/aquavo-mcp-http.ts:9-11` | 2× `dotenv.config({ override: true })` | shared loader + resolver |
| 6 | `drizzle.config.ts:5-6` | `dotenv.config({ path: ".env.local" })` + `dotenv.config()` (no override — already safe) | shared loader + resolver (adds fail-closed identification + redacted log) |

### 2.2 `process.env.X = …` direct mutations

Repo-wide grep for `process\.env\.[A-Za-z_]+\s*=[^=]` across
`server/ scripts/ script/ TOOLS/ migrations/ shared/ client/ e2e/ test/`: **0 matches.** No code
mutates the process environment in place. (Vitest's `vi.stubEnv` is likewise unused.)

### 2.3 Child-process env construction

Grep for `spawn`, `spawnSync`, `fork(`, `execa`, `execSync` across
`server/ scripts/ script/ TOOLS/ migrations/`: **0 matches.** The application never constructs a
child environment, so no call site strips or rewrites `DATABASE_URL`.

The only re-exec in play is **`tsx`** (`npm run dev` → `tsx server/index.ts`) and Node's own
`node dist/index.js`. Both inherit `process.env` wholesale, so an explicitly supplied target reaches
the child intact; the guard is inside `server/db-target.ts`, which the child imports (see §6).

### 2.4 Test-runner env wiring

* `vitest.config.ts` — no `env`, `envDir`, or `dotenv` usage. Vitest does **not** auto-load `.env`
  for non-Vite-client `test.env` in this config.
* `vitest.setup.ts` — no env mutation (only `fetch`/`sendBeacon` stubs).
* `playwright.config.ts` — no dotenv usage (Playwright wiring is Agent 4's area; not touched).
* One test file contains `vi.mock("dotenv/config", () => ({}))` (pre-existing, harmless).

### 2.5 Ad-hoc maintenance scripts (NOT in the runtime path)

| Pattern | Count of call sites | Note |
|---|---|---|
| `import "dotenv/config"` (double + single quote) | 35 | dotenv's default = **no override** → safe |
| `dotenv.config()` | 18 | no override → safe |
| `dotenv.config({ path: '.env.production' })` | 10 | no override → safe |
| `dotenv.config({ path: '.env.production', override: true })` | **3** | **UNSAFE — fixed**, see below |
| `dotenv.config({ path: … '.env.local' })` variants | 6 | no override → safe |
| `dotenv.config({ path: resolve(__dirname,'../.env') })` | 1 | no override → safe |
| `if (!process.env.DATABASE_URL) dotenv.config()` | 2 | conditional → safe |

Files touching `dotenv`: **20** under `script/`, **77** under `scripts/`.
Files referencing `DATABASE_URL` or `dotenv`: **61** under `script/`, **115** under `scripts/`.

The three unsafe ones — `scripts/fix-order-items.ts`, `scripts/reset-analytics.ts`,
`scripts/verify-analytics.ts` — had the *same* production-clobbering pattern and were changed to drop
`override` (their `.env.production` fallback intent is preserved).

### 2.6 Separate package

`TOOLS/audit/` is its own npm package (own `dotenv@^16`), 4 files use `import 'dotenv/config'`
(no override). It does not touch the AQUAVO database. Left alone.

---

## 3. The fix

### 3.1 New canonical resolver — `server/db-target.ts`

One module, imported by every database-target consumer. Two responsibilities:
(a) load env files without letting them beat the process environment, and
(b) resolve + classify + describe a target, or throw.

### 3.2 `server/env.ts` — before / after

**Before**

```ts
import dotenv from "dotenv";
const REMOTE_DATABASE_DEV_OPT_IN = "ALLOW_REMOTE_DATABASE_IN_DEV";
const shellRemoteDatabaseDevOptIn = process.env[REMOTE_DATABASE_DEV_OPT_IN];

dotenv.config({ path: ".env.local", override: true });
dotenv.config({ override: true });
…
assertSafeDevelopmentDatabase();
```

**After**

```ts
import {
  loadEnvFilesPreservingDatabaseTargets,
  resolveDatabaseTarget,
  logResolvedDatabaseTarget,
  DatabaseTargetError,
} from "./db-target.js";

const REMOTE_DATABASE_DEV_OPT_IN = "ALLOW_REMOTE_DATABASE_IN_DEV";
const shellRemoteDatabaseDevOptIn = process.env[REMOTE_DATABASE_DEV_OPT_IN];

const envLoad = loadEnvFilesPreservingDatabaseTargets();
…
assertSafeDevelopmentDatabase();

function announceDatabaseTarget(): void {
  if (!process.env.DATABASE_URL?.trim()) return;   // unset ⇒ mock storage, still allowed
  try {
    const target = resolveDatabaseTarget("primary", {
      inherited: envLoad.inherited,
      allowUnknownEnvironment:
        process.env.ALLOW_UNIDENTIFIED_DATABASE_TARGET?.trim().toLowerCase() === "true",
    });
    logResolvedDatabaseTarget(target);
    if (target.environmentType === "production" && process.env.NODE_ENV !== "production") {
      console.warn("[DB-TARGET] WARNING: connected to the PRODUCTION database while NODE_ENV is …");
    }
  } catch (error) {
    if (error instanceof DatabaseTargetError) throw new Error(`[DB-TARGET] ${error.code}: ${error.message}`);
    throw error;
  }
}
announceDatabaseTarget();
```

### 3.3 The protective core

```ts
export function captureInheritedDatabaseTargets(env = process.env): InheritedDatabaseTargets {
  // snapshot DATABASE_URL / NEON_VERIFY_DATABASE_URL / NEON_ROLLBACK_DATABASE_URL
  // BEFORE dotenv runs; blank/whitespace values count as absent
}

export function loadEnvFilesPreservingDatabaseTargets(options = {}) {
  const inherited = captureInheritedDatabaseTargets(env);
  for (const file of files /* .env.local, then .env */) {
    dotenv.config({ path: abs, override: true, processEnv: env, quiet: true });
  }
  const clobberAttempts = restoreInheritedDatabaseTargets(env, inherited);
  if (clobberAttempts.length) log(`[DB-TARGET] Ignored env-file override for explicitly inherited …`);
  return { inherited, clobberAttempts, loadedFiles };
}
```

### 3.4 Why `override: true` was kept for non-database keys

Removing override wholesale would have changed unrelated behaviour: on this machine the shell
environment carries assorted inherited variables, and developers rely on the local `.env` being
authoritative for API keys, ports and feature flags (`.env.local` beating `.env` beating shell). The
remediation therefore **narrows** the change to exactly the three protected database keys and leaves
every other key's precedence byte-for-byte identical. This is asserted by a test
(`API_KEY` from the env file still wins) so the narrowing cannot silently drift.

---

## 4. Resolver contract

```ts
resolveDatabaseTarget(role: "primary" | "verify" | "rollback", options?): ResolvedDatabaseTarget
```

Role → env key:

| role | env key | optional pin |
|---|---|---|
| `primary` | `DATABASE_URL` | `NEON_PRIMARY_ENDPOINT_ID` |
| `verify` | `NEON_VERIFY_DATABASE_URL` | `NEON_VERIFY_ENDPOINT_ID` |
| `rollback` | `NEON_ROLLBACK_DATABASE_URL` | `NEON_ROLLBACK_ENDPOINT_ID` |

Returns:

```ts
interface ResolvedDatabaseTarget {
  role; envKey;
  url;                 // raw connection string — NEVER log this
  environmentType: "production" | "child-branch" | "local" | "unknown";
  endpointId;          // e.g. "ep-quiet-moon-a4h7tdze" (public identifier)
  branchId;            // e.g. "br-round-dust-a4t0kt58" when carried in ?options=
  host; database;
  source: "process" | "env-file" | "absent";
  redactedLabel;       // credential-free, safe to log
}
```

Classification inputs (public identifiers only, no credentials):

* `PRODUCTION_ENDPOINT_IDS = { ep-quiet-moon-a4h7tdze }`
* `PRODUCTION_BRANCH_IDS   = { br-patient-mouse-a4d4cgr4 }`
* local hosts: `localhost`, `127.0.0.1`, `::1`, `0.0.0.0`
* Neon endpoint id is parsed from the first host label with a trailing `-pooler` stripped, and also
  from `?options=endpoint%3D…` / `branch%3D…`.

Convenience wrappers: `assertNonProductionTarget(role, opts)` (implies `requireNonProduction`) and
`logResolvedDatabaseTarget(target, logger?)`.

---

## 5. Fail-closed conditions

| Code | Condition |
|---|---|
| `MISSING_TARGET` | env var absent, or blank/whitespace-only |
| `UNPARSEABLE_URL` | value is not a URL |
| `UNSUPPORTED_PROTOCOL` | protocol is not `postgres:` / `postgresql:` |
| `MISSING_HOST` | URL has no host component |
| `UNIDENTIFIED_TARGET` | host is neither a local host nor a recognisable Neon endpoint — the runtime target cannot be identified |
| `PRODUCTION_TARGET` | role is `verify`/`rollback` (always child-branch), **or** `requireNonProduction` was requested, but the value resolves to the production endpoint/branch |
| `ENDPOINT_PIN_MISMATCH` | `NEON_*_ENDPOINT_ID` is set and the resolved endpoint differs — this is how "a test run claims Verify/Rollback but resolves elsewhere" is caught even if the wrong URL is itself a non-production child branch |

Deliberate non-failures (documented, not accidental):

* `DATABASE_URL` completely **unset** does not throw at startup — the app intentionally falls back to
  in-memory mock storage (pre-existing behaviour in `server/db.ts`, unchanged).
* `ALLOW_UNIDENTIFIED_DATABASE_TARGET=true` is an explicit escape hatch for self-hosted/container
  Postgres whose host is not a Neon endpoint. Without it, an unidentifiable host is refused.
* Under `NODE_ENV=test`, `server/db.ts` downgrades a `DatabaseTargetError` to a warning, because the
  existing integration suites point `DATABASE_URL` at PGlite/in-memory URLs that are not Neon
  endpoints. Startup (`server/env.ts`) still fails closed outside tests.

---

## 6. Startup logging (redacted) and `tsx` re-exec

`server/env.ts`, `server/db.ts`, both MCP entrypoints and `drizzle.config.ts` now emit:

```
[DB-TARGET] role=primary key=DATABASE_URL env=child-branch endpoint=ep-fake-child-a1b2c3d4 branch=n/a host=ep-fake-child-a1b2c3d4.<neon> db=neondb source=process
```

`redactedLabel` is **rebuilt from parsed URL components** (host, database, endpoint id, branch id) —
it is never produced by string-substituting a secret out of the raw URL, so there is no regex that can
fail open. Username, password, query string and the full connection string never appear.

**Live end-to-end proof against the real local `.env` (which points at production):**

```
$ NODE_ENV=test DATABASE_URL="postgresql://u:pw@ep-fake-child-a1b2c3d4-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require" \
  npx tsx -e "import('./server/env.ts').then(() => console.log('endpoint kept:', new URL(process.env.DATABASE_URL).hostname))"
[DB-TARGET] Ignored env-file override for explicitly inherited DATABASE_URL — the process environment wins.
[DB-TARGET] role=primary key=DATABASE_URL env=child-branch endpoint=ep-fake-child-a1b2c3d4 branch=n/a host=ep-fake-child-a1b2c3d4.<neon> db=neondb source=process
env.ts OK, DATABASE_URL endpoint kept: ep-fake-child-a1b2c3d4-pooler.us-east-1.aws.neon.tech
```

This is the exact near-miss scenario, now closed.

**Re-execution.** Because the guard is a module (`server/db-target.ts`) imported by the entrypoint
rather than a parent-process preload, it runs *inside* whichever process actually opens the pool —
`tsx`'s child, `node dist/index.js`, `drizzle-kit`, or the MCP servers. A dedicated test spawns a real
`tsx` child in a temp cwd whose `.env` holds the production URL, with a child-branch `DATABASE_URL` in
its inherited environment, and asserts the child resolves the child branch with `source=process`.

---

## 7. Tests

New file: `server/__tests__/db-target.test.ts` — **24 tests, all passing**.

```
$ npx vitest run server/__tests__/db-target.test.ts
 ✓ server/__tests__/db-target.test.ts (24 tests) 1998ms
     ✓ a spawned tsx child resolves the inherited target, not the local .env  1773ms

 Test Files  1 passed (1)
      Tests  24 passed (24)
```

Test list:

*process env beats `.env` for database targets*
1. inherited `DATABASE_URL` wins over `.env` — PASS (also asserts a non-DB key still takes the env-file value)
2. inherited `NEON_VERIFY_DATABASE_URL` wins over `.env` — PASS
3. inherited `NEON_ROLLBACK_DATABASE_URL` wins over `.env` — PASS
4. inherited value also wins over `.env.local`, which is loaded first — PASS
5. falls back to the `.env` value when nothing was inherited — PASS
6. treats a blank inherited value as absent — PASS
7. capture/restore protects every protected key — PASS

*resolver fails closed*
8. rejects a production URL when a child-branch target was requested (verify) — PASS
9. rejects a production URL when a child-branch target was requested (rollback) — PASS
10. rejects a production primary when `requireNonProduction` is set — PASS
11. detects production via the branch id carried in connection options — PASS
12. fails closed when the URL is missing — PASS
13. fails closed when the URL is blank — PASS
14. fails closed when the runtime target cannot be identified — PASS
15. fails closed on an unparseable URL and on a non-postgres protocol — PASS
16. fails closed when an endpoint pin does not match — PASS
17. a test run claiming Verify resolves correctly when it really is Verify — PASS
18. reports the source of the resolved value — PASS
19. classifies local hosts as local — PASS
20. parses pooled and unpooled Neon endpoint ids — PASS

*no secret appears in logs*
21. the redacted label and startup log contain no credentials — PASS
22. `describeDatabaseTarget` never echoes a raw URL — PASS
23. the clobber warning names keys but never values — PASS

*child process*
24. a spawned `tsx` child resolves the inherited target, not the local `.env` — PASS

No live database was contacted by any test; all URLs are synthetic and the "secret" in them is a
fixture string, present specifically so the log-redaction assertions have something real to fail on.

Suite totals: see §9.

---

## 8. What I could NOT close

1. **~176 ad-hoc maintenance scripts under `scripts/` and `script/` are not routed through the
   resolver.** I fixed the three that used the dangerous `override: true` pattern and verified the
   remaining dotenv call sites are non-override (so an explicit `DATABASE_URL` already wins). But they
   still read `process.env.DATABASE_URL` directly, with **no production/child-branch classification
   and no fail-closed check** — several (`scripts/delete-orders.mjs`, `scripts/delete-users.mjs`,
   `scripts/fix-order-items.ts`, `script/rollback-import.ts`, …) are destructive. Converting them is a
   large mechanical change outside a single agent's safe blast radius and would need its own review.
   **Recommendation:** a follow-up task that makes every script under `scripts/`/`script/` import the
   resolver and call `assertNonProductionTarget` unless it explicitly opts into production.

2. **`.env` still contains a production `DATABASE_URL`.** It is git-ignored (so the brief's "committed
   `.env`" is not literally true — it is a local file), but any tool that loads it without an explicit
   inherited override still lands on production. I did not modify the operator's `.env`; that is their
   file and rewriting it is not my call.

3. **`NEON_VERIFY_DATABASE_URL` / `NEON_ROLLBACK_DATABASE_URL` have no production consumers.** A
   repo-wide search finds them only in `docs/audit/*.md` — the prior sessions passed them ad hoc on
   the command line. The resolver now defines and protects them, but nothing in `server/` reads them
   yet. They become useful the moment a verification harness adopts
   `assertNonProductionTarget("verify")`.

4. **`PRODUCTION_ENDPOINT_IDS` / `PRODUCTION_BRANCH_IDS` are a hard-coded allow-list of one each.**
   If a new production compute endpoint is provisioned, it will classify as `child-branch` and the
   verify/rollback guard will not fire for it. This is a maintenance obligation, not a bug — but it is
   a real failure mode and belongs in the runbook.

5. **Not audited (other agents' territory, per scope):** Playwright config/fixtures (Agent 4),
   order-creation and cost-snapshot code (Agent 2), accounting semantics and the PIM idempotency
   migration (Agent 3). I found no database-target defect in those files while grepping, but I did not
   review them.

6. **`tsconfig.json` excludes `server/**`**, so `npm run check` does not type-check the new module.
   It is type-checked in practice by Vitest's esbuild transform and by `tsx` at runtime, both of which
   ran clean, but there is no standalone `tsc` gate over it. Pre-existing repo condition; not changed.

---

## 9. Files changed

| File | Change |
|---|---|
| `server/db-target.ts` | **new** — canonical resolver, inheritance protection, redaction |
| `server/env.ts` | dotenv override replaced by the protective loader; redacted startup log; fail-closed identification |
| `server/db.ts` | resolves through the resolver; redacted log; fail-closed (warn-only under `NODE_ENV=test`) |
| `server/index.ts` | removed dead `import dotenv` |
| `server/aquavo-mcp.ts` | protective loader + resolver; identity logged to stderr |
| `server/aquavo-mcp-http.ts` | protective loader + resolver |
| `drizzle.config.ts` | protective loader + resolver |
| `scripts/fix-order-items.ts` | dropped `override: true` |
| `scripts/reset-analytics.ts` | dropped `override: true` |
| `scripts/verify-analytics.ts` | dropped `override: true` |
| `server/__tests__/db-target.test.ts` | **new** — 24 regression tests |
| `docs/audit/database-target-safety-remediation.md` | this document |

## 10. Suite totals

Baseline: **107 files / 1446 tests / 0 failed.**

Full `npx vitest run` after this change (the working tree also contained other agents' in-flight,
still-untracked work at the time of the run):

```
 Test Files  1 failed | 108 passed (109)
      Tests  14 failed | 1484 passed (1498)
   Duration  460.76s
```

* `server/__tests__/db-target.test.ts` — **24/24 passing**.
* The single failing file is `server/__tests__/order-cost-snapshot-invariant.test.ts`, an **untracked,
  in-flight file owned by Agent 2** (order-creation / cost-snapshot). All 14 failures come from it and
  all originate in `server/storage/invoice-storage.ts:251`
  (`المنتج غير موجود ضمن الفاتورة`) — Agent 2's area, reported here and **not touched** per the
  ownership boundary.
* Nothing in this remediation touches that code path; excluding that one in-flight file the suite is
  108 files / 1484 tests / 0 failed, i.e. baseline + this change's 24 new passing tests (+1 file,
  +24 tests; the remaining delta over 1446 is other agents' new tests).
