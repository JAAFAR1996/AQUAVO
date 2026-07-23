# Final Security & Target Verification (Phase B — independent, adversarial)

**Agent:** SecurityAndTargetVerifier
**Date:** 2026-07-24
**Method:** Independent adversarial probes written and executed against the live code
(`server/db-target.ts`, `server/env.ts`, `TOOLS/script-db-guard.mjs`,
`server/storage/security-storage.ts`, `e2e/support/*`). Phase A's "closed" claims
were **not trusted** — each surface was attacked with a concrete repro. No probe
wrote to or mutated production; production identity was proven rejected *before*
any connection was attempted.

**Production identifiers (never written to):**
endpoint `ep-quiet-moon-a4h7tdze`, branch `br-patient-mouse-a4d4cgr4`.
**Synthetic secret** used to prove non-leakage: `sup3rs3cr3t-DONOTLOG`.
**Allow-listed verify child branch:** `ep-rapid-breeze-a46glg7f`.

Probes live in the session scratchpad (`probe-resolver.ts`, `probe-scriptguard.mjs`,
`entry-env.ts`, `probe-e2e.mjs`) with raw captured output in `raw-*.out`.
A regression test was added at
`server/__tests__/adversarial-ip-block-process-tz.test.ts` (own file, no overlap).

---

## Verdict summary

| # | Surface | Verdict |
|---|---------|---------|
| 1 | `.env` / `.env.local` override of explicit DB target (cwd, nested, blank var) | **CONFIRMED-SAFE** |
| 2 | Child-process (`tsx` re-exec) target inheritance | **CONFIRMED-SAFE** |
| 3 | Local `.env` default safety (what stops prod) | **CONFIRMED-SAFE** (fail-closed) |
| 4 | Production rejection (endpoint id + `?options=…branch=…`, evasions) | **CONFIRMED-SAFE** |
| 5 | `resolveScriptDatabaseUrl()` script guard | **CONFIRMED-SAFE** (stricter than documented) |
| 6 | IP-block expiry (timestamptz, tz/DST, session + process TZ) | **CONFIRMED-SAFE** |
| 7 | Credential redaction (startup + guard logging) | **CONFIRMED-SAFE** (0 leaks) |
| 8 | E2E branch pinning (Playwright harness) | **CONFIRMED-SAFE** (allow-list) |

No holes found. One **by-design residual risk** documented under Surface 3.

---

## Surface 1 — Environment precedence — CONFIRMED-SAFE

**Attack:** place a `.env` (and `.env.local`) that hard-codes the **production**
`DATABASE_URL`/`NEON_VERIFY_DATABASE_URL` in the process cwd (and in a nested cwd),
while the shell explicitly inherits the child-branch target. Try to make the file win.

**Method:** `loadEnvFilesPreservingDatabaseTargets()` + `resolveDatabaseTarget()`
driven with a caller-supplied env object and a temp cwd holding a prod `.env`.

**Evidence (redacted):**
```
[DB-TARGET] Ignored env-file override for explicitly inherited DATABASE_URL — the process environment wins.
  clobberAttempts=["DATABASE_URL"]
  resulting DATABASE_URL endpoint = ep-rapid-breeze-a46glg7f...
  SOME_OTHER after load (non-db key) = fromenvfile        <- non-DB keys still override (intended)
  RESOLVED env=child-branch endpoint=ep-rapid-breeze-a46glg7f source=process
```
- Nested-cwd variant: same result (`env=child-branch`).
- **Blank explicit var** variant (`NEON_VERIFY_DATABASE_URL="   "`, prod in `.env`):
  the blank does NOT masquerade as an explicit target, so the `.env` prod value is
  taken — and then **correctly rejected** by the verify role guard
  (`threw PRODUCTION_TARGET`). Blank ≠ explicit is handled safely in both directions.

**Verdict:** Protected DB keys explicitly present in the process env always beat the
env files; non-DB keys still honour `override:true`. **CONFIRMED-SAFE.**

## Surface 2 — Child-process target inheritance — CONFIRMED-SAFE

**Attack:** a real `tsx` invocation re-execs a node grandchild. Confirm the grandchild
uses the inherited explicit child-branch target, not the prod `.env` sitting in cwd.

**Method:** spawned the real `node_modules/.bin/tsx entry-env.ts` from a temp cwd
containing a production `.env`, with `DATABASE_URL=<child>` inherited. `entry-env.ts`
imports `server/env.ts` exactly as `server/index.ts` does (env.ts only resolves+logs,
never connects).

**Evidence (redacted, `raw-startup.out`):**
```
[DB-TARGET] Ignored env-file override for explicitly inherited DATABASE_URL — the process environment wins.
[DB-TARGET] role=primary key=DATABASE_URL env=child-branch endpoint=ep-rapid-breeze-a46glg7f ... source=process
[entry] FINAL DATABASE_URL host = ep-rapid-breeze-a46glg7f.us-east-1.aws.neon.tech
```
The tsx re-exec grandchild resolved to the child branch. **CONFIRMED-SAFE.**

## Surface 3 — Local `.env` default safety — CONFIRMED-SAFE (fail-closed)

**Attack:** the everyday case — a dev runs the app with **no** explicit `DATABASE_URL`
and a `.env` that points at production. Does startup silently reach prod?

**Method:** real `tsx` startup, `env -u DATABASE_URL`, prod `.env`, `NODE_ENV=development`,
no opt-in.

**Evidence (redacted, `raw-local.out`):**
```
exit=1
Error: Local dev/browser QA startup blocked: DATABASE_URL appears remote or Neon-like.
  ... explicitly set ALLOW_REMOTE_DATABASE_IN_DEV=true only for a known safe staging/test database.
  at assertSafeDevelopmentDatabase (server/env.ts:53)
```
Startup **fails closed** before any DB use. The stop is
`assertSafeDevelopmentDatabase()` in `server/env.ts`: in non-prod/non-test, a remote
(Neon-like) `DATABASE_URL` throws unless `ALLOW_REMOTE_DATABASE_IN_DEV=true`.

**By-design residual risk (documented, not a defect):** with the explicit opt-in
`ALLOW_REMOTE_DATABASE_IN_DEV=true`, a prod `.env` *does* connect in dev — but it emits
a redacted `[DB-TARGET] WARNING: connected to the PRODUCTION database while NODE_ENV is
"development"` (see `raw-local2.out`, secret not leaked). This is the intentional escape
hatch for staging; the warning fires but nothing blocks it. Worth an operator note; not
a hole in the guard.

## Surface 4 — Production rejection — CONFIRMED-SAFE

**Attack:** slip production past `resolveDatabaseTarget()` for verify/rollback (and
primary+`requireNonProduction`) via: prod endpoint id, prod **branch inside
`?options=…branch=br-patient-mouse-…`**, uppercased ids, `-pooler` suffix, and endpoint
carried only in `?options=endpoint=…`.

**Evidence (redacted, `raw-resolver.out`):**
```
prod endpoint (verify):                    threw PRODUCTION_TARGET -> SAFE
prod endpoint (primary+requireNonProduction): threw PRODUCTION_TARGET -> SAFE
prod branch via ?options (verify):         threw PRODUCTION_TARGET -> SAFE
EP-QUIET-MOON-A4H7TDZE (uppercase):        threw PRODUCTION_TARGET -> SAFE
ep-quiet-moon-a4h7tdze-pooler:             threw PRODUCTION_TARGET -> SAFE
?options=endpoint%3Dep-quiet-moon-...:     threw PRODUCTION_TARGET -> SAFE
?branch=BR-PATIENT-MOUSE-A4D4CGR4:         threw PRODUCTION_TARGET -> SAFE
```
Host is lower-cased, `-pooler` stripped, ids parsed from both host and `options`/`branch`
query params, and matched case-insensitively against the prod sets. Every evasion caught.
**CONFIRMED-SAFE.**

## Surface 5 — Script target validation — CONFIRMED-SAFE (stricter than documented)

**Attack:** make a write-capable script accept production in `migrate`/`verify`, or let
a `.env` override an inherited child target.

**Evidence (redacted, `raw-scriptguard.out`):**
```
mode=migrate  DATABASE_URL=prod           -> threw PRODUCTION_REJECTED
mode=verify   DATABASE_URL=prod           -> threw PRODUCTION_REJECTED
mode=write    DATABASE_URL=prod           -> threw PRODUCTION_REJECTED   (also rejected!)
mode=read     DATABASE_URL=prod           -> threw PRODUCTION_REJECTED   (also rejected!)
prod-branch-in-options, migrate           -> threw PRODUCTION_REJECTED
.env=prod + inherited child, migrate      -> resolved env=child-branch (SAFE, .env ignored)
allowProduction:true, migrate             -> env=production (documented human-signoff hatch)
```
Finding: production is rejected in **all** modes unless `allowProduction:true`, not just
migrate/verify as the header comment implies — i.e. safer than documented. `.env`
override of an inherited target is neutralised identically to `server/db-target.ts`.
**CONFIRMED-SAFE.**

## Surface 6 — IP-block expiry — CONFIRMED-SAFE

**Design (verified by reading):** duration is written by the **DB** clock
(`now() + make_interval(secs=>N)`), and the in-force decision is a single shared SQL
predicate `(expires_at IS NULL OR expires_at > now())` used by `isIPBlocked`,
`getBlockInfo`, `getBlockedIPs`, stats, and cleanup. The middleware read path
(`server/routes/users.ts` → `getBlockInfo`) and cleanup share that one predicate; there
is **no** JS-clock comparison anywhere in the read path. `expires_at IS NULL` =
permanent, never auto-lifted; a NULL/absent expiry fails **safe** (stays blocked). The
migration converts the four tz-less columns to `timestamptz USING … AT TIME ZONE 'UTC'`,
repairing the +03:00 read skew without touching `is_active` (no mass unblock).

**Existing regression suite** `server/__tests__/blocked-ip-expiry.test.ts` — **11/11 pass**
(real Postgres via PGlite): exact 5-min duration, active vs expired boundary at ±1s,
permanent survival, fail-safe NULL, app/DB predicate agreement, cleanup lifts only
expired temporaries, and **session** TZ independence (UTC / Asia/Baghdad / America/New_York).

**Added adversarial test** `server/__tests__/adversarial-ip-block-process-tz.test.ts` —
**4/4 pass**: attacks the one clock the existing suite doesn't — the Node **process**
`TZ` (`process.env.TZ` = UTC, Asia/Baghdad, Pacific/Kiritimati +14, Etc/GMT+12). A
just-expired block stays lifted and an active block stays blocked under every process
TZ, proving the JS clock is inert (the predicate is instant-based in-DB). No 5-minute
block outlives its window; no permanent block wrongly lifts.

**Verdict:** **CONFIRMED-SAFE.**

## Surface 7 — Credential redaction — CONFIRMED-SAFE

**Attack:** set connection strings to the synthetic secret `sup3rs3cr3t-DONOTLOG` and
exercise startup logging, resolver labels, error messages, and script-guard labels.
Then grep **raw** (un-redacted) captured output for the secret.

**Evidence:** aggregate grep across all six raw output files
(`raw-resolver.out`, `raw-scriptguard.out`, `raw-startup.out`, `raw-local.out`,
`raw-local2.out`, `raw-e2e.out`):
```
raw-e2e.out:0
raw-local.out:0
raw-local2.out:0
raw-resolver.out:0
raw-scriptguard.out:0
raw-startup.out:0
Total matches: 0
```
Redacted labels are rebuilt from parsed URL parts (`endpoint`, `host=<id>.<neon>`,
`db`), never by substituting the secret out of the raw URL. Error messages name only
the endpoint id. **0 leaks. CONFIRMED-SAFE.**

## Surface 8 — E2E branch pinning — CONFIRMED-SAFE

**Attack:** coax the Playwright harness (`resolveE2EDatabaseUrl`,
`assertNonProductionDatabase`) to resolve to production, or fall back to the committed
`.env` (which points at prod).

**Evidence (redacted, `raw-e2e.out`):**
```
assertNonProductionDatabase: prod endpoint / prod branch-in-options / uppercased  -> REJECTED
assertNonProductionDatabase: non-allow-listed child (ep-some-other-a99)           -> REJECTED
assertNonProductionDatabase: verify child (ep-rapid-breeze-a46glg7f)              -> ACCEPTED
resolveE2EDatabaseUrl: E2E_DATABASE_URL=prod        -> REJECTED
resolveE2EDatabaseUrl: NEON_VERIFY_DATABASE_URL=prod-> REJECTED
resolveE2EDatabaseUrl: empty env                    -> REJECTED (no .env fallback)
isProductionWebUrl: aquavoiq.com / www / fist-live.vercel.app -> true ; localhost -> false
```
The E2E guard is **allow-list** based: only localhost or `ep-rapid-breeze-a46glg7f*`
passes — even other child branches are refused. Empty env throws rather than reading the
committed prod `.env`. The `env-lock.mjs` (injected via `NODE_OPTIONS=--import`, inherited
by the tsx child) additionally drops all DB-shaped keys from `.env`/`.env.local`, pins the
launcher-verified target, no-ops `dotenv.config`, and re-asserts non-production at runtime
(`exit 78` on violation) plus a non-configurable `process.env.DATABASE_URL` trap.
**CONFIRMED-SAFE.**

---

## Blockers

None. All probes executed locally against real code with no production access required —
each production target was rejected before any connection attempt, so the safety boundary
was never approached.

## Notes to coordinator

- **Doc drift (minor, not a defect):** `TOOLS/script-db-guard.mjs` header says migrate/verify
  reject production, but the implementation rejects production in **all** modes unless
  `allowProduction:true`. Behaviour is safer than documented; consider aligning the comment.
- **Operator note (by design):** `ALLOW_REMOTE_DATABASE_IN_DEV=true` in dev will connect to a
  prod `.env` target (with a redacted WARNING, no block). Correct as an intentional staging
  escape hatch; flagged for awareness only.
