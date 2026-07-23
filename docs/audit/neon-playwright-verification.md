# Playwright verification against the Neon verification branch

**Agent:** ApplicationShadowAgent
**Date:** 2026-07-23
**Target:** local app on `http://localhost:5055`, `DATABASE_URL` pinned to the Neon
**verification** branch `br-round-dust-a4t0kt58` (endpoint `ep-rapid-breeze-…`). Production
(`br-patient-mouse-a4d4cgr4`) and the rollback branch were never contacted.
**Config used:** the existing `playwright.config.ts` and the existing specs in `e2e/`. No
spec was written, modified or stubbed for this run.

> **Status: PARTIAL — executed, but no clean full-suite pass was obtained.**
> The application process dies part-way through every Playwright run (see §4). Every
> number below is the real observed output; nothing is extrapolated.

---

## 1. How the app was started (and one safety finding)

`npm run dev` could **not** be used as-is. `server/env.ts` runs

```
dotenv.config({ path: ".env.local", override: true });
dotenv.config({ override: true });
```

`override: true` means the committed `.env` **wins over an inherited `DATABASE_URL`**.
Starting the app with `DATABASE_URL="$NEON_VERIFY_DATABASE_URL" npm run dev` therefore
silently connected to the endpoint in `.env` — a *different* endpoint from the
verification branch.

This was caught on the very first probe: `/ready` returned **503** claiming the seven
cost-snapshot columns were missing, while `psql` against the verification branch showed
all 15 columns present. Only read-only requests (`/ready`, `/health`) had been issued at
that point; the process was killed immediately and no write ever reached that database.

`tsx` also re-execs a child process, so a `node --require` preload on the parent alone is
not inherited. The working invocation pins `DATABASE_URL` behind a `process.env` Proxy in
a preload placed in **`NODE_OPTIONS`** so every child re-applies it:

```
PORT=5055 DISABLE_SCHEDULED_JOBS=true NODE_ENV=development \
ALLOW_REMOTE_DATABASE_IN_DEV=true \
NODE_OPTIONS="--require <scratch>/lock-db-url.cjs" \
node node_modules/tsx/dist/cli.mjs server/index.ts
```

`ALLOW_REMOTE_DATABASE_IN_DEV=true` is required because `assertSafeDevelopmentDatabase()`
refuses a Neon-like URL in development. The verification branch is exactly the
"known safe staging/test database" that guard documents.

**FINDING P-1 (operational, high).** There is no supported way to point this app at a
non-`.env` database. `override: true` makes the environment lose to a committed file, and
the failure is *silent* — it presents as a schema-drift error, not a connection error. Any
operator following the obvious command would have run their verification against whatever
`.env` holds. Recommend `dotenv.config()` without `override`, or an explicit
`DATABASE_URL_OVERRIDE`/profile mechanism.

Post-start confirmation that the app was on the right branch:

```
DATABASE_URL host seen by app modules = ep-rapid-breeze-a46glg7f.us-east-1.aws.neon.tech
driver result: [{"db":"neondb","addr":"169.254.254.254/32","cols":"15","oir":"173"}]
readiness: {"ready":true,"missingColumns":[],"orderCreationEnabled":true,
            "detail":"Schema satisfies this application version."}
```

`GET /ready` → **HTTP 200**.

---

## 2. Coverage by required dimension — what exists, what ran

| Required dimension | Spec that covers it | Executed? | Result |
|---|---|---|---|
| Desktop viewport | `chromium` project (1280×720) on `home`, `responsive`, `accessibility` | yes | see §3 |
| Mobile viewport | `Mobile Chrome` project (Pixel 5) on the same specs | yes | see §3 |
| Arabic RTL | `e2e/accessibility.spec.ts`, `e2e/responsive.spec.ts`, `e2e/pages/base.page.ts` | yes | see §3 |
| Light theme | `e2e/fulfillment-admin.spec.ts:170`, `e2e/ui-components.spec.ts`, `e2e/contexts.spec.ts` | **no** | blocked — §5 |
| Dark theme | same as light | **no** | blocked — §5 |
| Preparation workflow | `e2e/fulfillment-admin.spec.ts:53` | **no** | skipped by design — §5 |
| Approval + history interfaces | `e2e/fulfillment-admin.spec.ts:53` (approve cost, reverse, history) | **no** | skipped by design — §5 |

The specs for theme, preparation workflow and approval/history **do exist** — this is not a
missing-spec gap. They are gated behind credentials and an opt-in flag I do not have.

---

## 3. Executed runs — real counts

All runs: `PLAYWRIGHT_BASE_URL=http://localhost:5055`, projects `chromium` +
`Mobile Chrome`, `--reporter=list`.

| # | Specs | Workers | passed | failed | skipped | Verdict |
|---|---|---|---|---|---|---|
| 1 | home, responsive, accessibility, ui-components, fulfillment-admin | default | 0 | 298 | 6 | **VOID** — app was already down before the run started |
| 2 | home, responsive, fulfillment-admin | 4 | 11 | 125 | 6 | **VOID** — app died mid-run |
| 3 | home, responsive, accessibility, fulfillment-admin | 6 | **36** | **148** | **6** | partial; app died mid-run (`POSTCHECK ready=000`) |
| 4 | home only | 2 | — | — | — | **no result** — `PRECHECK ready=200`, then the run exceeded a 7-minute wall clock without finishing a single spec file across 2 projects |

Run 3 is the only run where the app was verified up immediately before the suite
(`PRECHECK ready=200`) and verified down immediately after (`POSTCHECK ready=000`) — the
server and Playwright were launched inside a single foreground command specifically to rule
out the background-task reaping seen in runs 1–2. The app still died, so **the 148 failures
are dominated by the app being unreachable, not by product defects.** I am not attributing
them to the UI, and I am not claiming the 36 passes constitute dimension coverage beyond
"the pages that ran before the process died, rendered".

Artifacts produced: `playwright-report/` (HTML) and `test-results/` were written by these
runs. Because the failures are infrastructure-caused, the screenshots/videos in them show
connection errors rather than meaningful UI state; they are not offered as evidence.

Run 4 shows the second half of the problem: even a **single** spec file across two projects
did not finish in seven minutes. Between the app dying under load and the suite's wall-clock
cost, **no clean Playwright result was obtained on this branch, and none is claimed.**

**FINDING P-2 (blocker for E2E, high).** The Vite-dev-mode server does not survive a
Playwright run. It exits with no stack trace, no `uncaughtException` handler output, and no
OOM message — the log simply stops, in all three runs, shortly after client-side
`Failed to fetch top selling products: انتهت مهلة الطلب` warnings. Until this is fixed (or
the suite is run against a built production bundle via `npm run build && npm start`), the
E2E suite cannot certify anything on this branch. **I did not attempt the production-bundle
route — that is the recommended next step and it was not reached.**

---

## 4. What I did *not* do

- I did **not** run the full 30-spec suite, nor the `firefox` / `webkit` / `Mobile Safari`
  projects.
- I did **not** obtain a green run of any spec set.
- I did **not** verify light/dark theme, the preparation workflow, or the approval/history
  interfaces through the browser. Their service-layer equivalents *were* verified directly —
  see `docs/audit/neon-shadow-comparison.md` §Part 1 — but that is not UI coverage and is
  not presented as such.

---

## 5. Credential and opt-in gaps (honest statement)

`e2e/fulfillment-admin.spec.ts` — the spec that covers the preparation workflow, the cost
approval interface, the event history interface, and the RTL light/dark rendering of the
fulfillment panel — is gated twice:

```ts
test.skip(!WRITABLE, "Set E2E_FULFILLMENT_WRITABLE=true and point PLAYWRIGHT_BASE_URL
  at a LOCAL app with a WRITABLE database. ...");
```

and `resolveAdminCredentials()` throws:

```
Missing E2E admin credentials. Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD in your
environment. There is NO default password — test and preview credentials must never
match production.
```

**No admin credential was available to me, and I did not create one.** Provisioning a
synthetic admin account was considered and rejected: the coordinator's instruction was to
state the gap and exercise the service layer instead of manufacturing a session, and an
attempt to generate an admin credential file was independently blocked by policy. The
6 `skipped` in every run above are these tests skipping exactly as designed.

`e2e/contexts.spec.ts` is worse than skipped: it calls `resolveAdminCredentials()` at
**module scope** (line 5), so without credentials it throws during collection and **aborts
the entire Playwright run** before any test executes. That is why run 1 produced zero
passes. It had to be excluded from the file list for any run to proceed.

**FINDING P-3 (test-infrastructure, medium).** A missing optional credential should skip a
spec, not abort collection for every other spec. `e2e/contexts.spec.ts:5` should resolve
credentials lazily inside `beforeAll`/`test`, like `fulfillment-admin.spec.ts` does.

---

## 6. To reproduce / finish this work

```
# 1. start the app pinned to the verification branch (see §1 for the preload)
# 2. supply an admin credential for the verification branch only
E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... \
E2E_FULFILLMENT_WRITABLE=true \
PLAYWRIGHT_BASE_URL=http://localhost:5055 \
npx playwright test e2e/fulfillment-admin.spec.ts
```

That single spec closes the theme, preparation-workflow and approval/history gaps in one
run. It must be pointed at a writable non-production database — it creates accounting rows.
