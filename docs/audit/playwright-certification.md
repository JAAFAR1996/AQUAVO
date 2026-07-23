# Playwright E2E Certification — AQUAVO

**Agent:** PlaywrightReliabilityAgent
**Date:** 2026-07-23
**Branch:** `feat/accounting-canonical-fulfillment`
**Target under test:** `http://127.0.0.1:5199` (loopback), database = Neon **verify child branch**
`ep-rapid-breeze-a46glg7f` (`NEON_VERIFY_DATABASE_URL`)
**Production was never contacted.** Production endpoint `ep-quiet-moon-a4h7tdze` / branch
`br-patient-mouse-a4d4cgr4` is structurally rejected by the harness (see §3).

> **Status (rev. 2 — 2026-07-23, after the coordinator applied F-4 and F-5).**
> **11 of the 13** required dimensions are certified outright; **2 are partial**, each held back
> by a **newly discovered product defect** rather than by a missing test:
> **F-6** — 29 of 102 advertised-in-stock products cannot actually be ordered, and
> **F-7** — the admin tab strip is inoperable on a phone viewport.
> Nothing was assertion-weakened or silently passed. Serial and parallel runs produce an
> identical pass/fail set, so every failure is a deterministic defect, not flakiness.
>
> Rev. 1 of this report (5 certified / 8 blocked) is superseded; the superseded figures are
> retained in §6 for contrast.

---

## 1. Why the dev server died during Playwright — root cause

The previous attempt reported the dev server dying mid-run with `POSTCHECK ready=000`. There
are **three distinct defects**, all reproduced in this session with evidence.

### RC-1 (primary) — Vite's logger calls `process.exit(1)` on *any* Vite-level error

`server/vite.ts` builds the dev Vite server with a custom logger:

```ts
customLogger: {
  ...viteLogger,
  error: (msg, options) => {
    viteLogger.error(msg, options);
    process.exit(1);          // ← kills the entire application process
  },
},
```

Any Vite error — a transform failure, a bad import, a port conflict, an aborted HMR socket —
terminates the **whole Express server**, not just the Vite middleware. There is no supervision,
so every remaining test in the run then fails against a dead port. This is exactly the observed
`ready=000` signature.

**Reproduced verbatim.** Server log, run of 2026-07-23T11:33:18Z:

```
11:33:18.191Z [err] WebSocket server error: Port 24678 is already in use
11:33:18.263Z [harness] SERVER PROCESS EXITED code=1 signal=null
```

### RC-2 — Vite's HMR WebSocket binds a fixed port (24678), and orphaned servers hold it

Vite dev binds `24678` for HMR. Only one dev server can exist at a time. A dev server orphaned
by a previous run keeps the port, so the *next* run's Vite logs "Port 24678 is already in use",
which RC-1 converts into `process.exit(1)`. **One crashed run poisons every subsequent run** —
which is why the prior attempt "never produced a clean run".

Confirmed with `netstat`: PID 17720 from a killed run was still `LISTENING` on both `5201` and
`24678`.

### RC-3 — The process tree was not being killed, creating those orphans

The server is `node → tsx cli → re-exec'd node`. The real listener is a **grandchild**
(observed: harness child pid 50572, actual listener pid 20388). Killing only the direct child,
or going through a `.cmd`/shell shim, leaves the grandchild alive holding both ports.

### Contributing factors (not the primary cause, but real)

| # | Issue | Effect |
|---|---|---|
| C-1 | Only **chromium** engines are installed (`ms-playwright/` has chromium + headless shell only; no firefox, no webkit). The old config declared 5 projects including `firefox`, `webkit`, `Mobile Safari`. | 3 of 5 projects could not launch a browser at all — a large share of the prior 148 failures. |
| C-2 | `server/index.ts` `uncaughtException` handler ends with `setTimeout(() => process.exit(1), 1000)`. | A second, independent way for the app to self-terminate mid-run. |
| C-3 | `POST /api/login` is rate-limited to **5 failures / 15 min / IP** (`skipSuccessfulRequests: true`). | Negative-path auth tests exhaust the budget and poison later logins. Mitigated here by never using failed logins for setup; still a hazard for `auth.spec.ts`. |
| C-4 | Playwright reporters **silently wrote nothing** when `outputFolder`/`outputFile` pointed inside the git-tracked `playwright-report/`. | The prior attempt had no report to show even for the tests that did run. Fixed by writing to `e2e-artifacts/`. |

---

## 2. The production-targeting hazard (N-2) — the default case

`server/env.ts` runs:

```ts
dotenv.config({ path: ".env.local", override: true });
dotenv.config({ override: true });
```

Measured, in this repo, with **nothing inherited** (hostname only; no credential printed):

```
inherited DATABASE_URL: unset
resolved  DATABASE_URL: ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech   ← PRODUCTION
```

**Scope of this finding.** This is the *default* case: when no `DATABASE_URL` is supplied by the
process environment, the operator's own committed `.env` supplies a **production** URL, so
`npm run dev` with a clean shell points the application at production. Agent 1's fix guarantees
that an **explicitly supplied process variable wins**, and the coordinator independently proved
that in a real `tsx` child — so the fix works; what remains is that the operator `.env` default
still points at production.

The harness does not rely on either behaviour. `env-lock.mjs` removes the ambiguity entirely by
dropping every DB-shaped key from the `.env` files and neutralising `dotenv.config` before
`server/env.ts` can run, so the resolved target is whatever the harness verified and nothing
else. `server/env.ts` was **not modified** by this agent.

---

## 3. Stabilisation changes (all within Playwright/E2E ownership)

| File | Purpose |
|---|---|
| `e2e/support/target-safety.mjs` | Single source of truth for "is this production?". Production endpoint/branch ids and web hosts are denied; the DB allow-list is **fail-closed** — only `localhost` or `ep-rapid-breeze-a46glg7f*` is accepted, anything else aborts. |
| `e2e/support/env-lock.mjs` | **Runs inside the application process** via `NODE_OPTIONS=--import` (which *is* inherited by the tsx child). Loads `.env.local`/`.env` itself, **drops every DB-shaped key**, pins `DATABASE_URL` to the verified target, then **monkey-patches `dotenv.config` to a no-op** so `server/env.ts` cannot re-introduce production. Asserts the final value and `process.exit(78)` if it is production. Also seals `DATABASE_URL` behind a non-configurable getter. |
| `e2e/support/server-harness.mjs` | Owns the app lifecycle: preflight kill of the app port **and Vite's fixed 24678** (removes RC-1's trigger — RC-2), spawns `node node_modules/tsx/dist/cli.mjs server/index.ts` **directly, no shell shim** (RC-3), tees timestamped, credential-redacted stdout+stderr to `e2e-artifacts/server.log`, bounded readiness polling, tree-kill + port-verified teardown. |
| `e2e/support/seed-synthetic-auth.mjs` | Seeds `e2e-admin@e2e.aquavo.invalid` / `e2e-user@e2e.aquavo.invalid` (RFC 2606 reserved TLD — can never collide with a real customer or receive mail) with a **fresh random password per run**, hashed with the same scrypt scheme as `server/utils/auth.ts`. Never written to disk. Refuses non-allow-listed databases. Also **releases stale loopback IP blocks** and clears failed-login history for the synthetic accounts — without this, one run's negative-path auth tests permanently lock out every later run (see **F-8**). |
| `e2e/support/global-setup.mjs` | Orchestrates target verification → seeding → server start → readiness → **runtime target proof** → `run-manifest.json`; returns a teardown that stops the server. |
| `e2e/support/fixtures.ts` | Per-project theme pinning through the app's own `localStorage['theme']`; browser `console.error` / `pageerror` / `requestfailed` capture attached to the report on failure; `adminPage` / `customerPage` pre-authenticated contexts. |
| `e2e/support/test-credentials.ts` | Added `lazyAdminCredentials()` — resolution happens at property access, not module load. |
| `e2e/contexts.spec.ts`, `e2e/admin.spec.ts` | Switched to the lazy resolver. Previously `contexts.spec.ts` resolved credentials at **module scope**, so a missing env var aborted collection and took the whole run down. |
| `playwright.config.ts` | Loopback default base URL; production hosts rejected at config load; `globalSetup`; **serial by default** (`workers: 1`) with `E2E_WORKERS` opt-in; 4 real projects (desktop/mobile × light/dark, locale `ar-IQ`, tz `Asia/Baghdad`); firefox/webkit gated behind `E2E_EXTRA_ENGINES` because those engines are not installed; `trace: 'retain-on-failure'` so a zero-retry run still captures the browser console; reports written to `e2e-artifacts/`. |
| `e2e/certification.spec.ts` | New — one test per certification dimension. |

### Scheduled / background jobs
Disabled for every E2E run. `env-lock.mjs` sets `DISABLE_SCHEDULED_JOBS=true` inside the app
process and the harness sets it in the spawn environment. Confirmed in the server log:
`Scheduled jobs disabled by DISABLE_SCHEDULED_JOBS`.

### Readiness
The application exposes `/health` and `/health/db`. **There is no `/ready` route**, and adding
one would mean editing `server/index.ts`, which is outside this agent's ownership. Readiness is
therefore defined as **`/health` 200 AND `/health/db` 200 AND `/` 200**, polled every 2 s with a
bounded 240 s timeout, and aborting immediately if the server process exits. Observed waits:
17 s – 155 s (Neon cold start dominates).

### Log and console collection
- Server: `e2e-artifacts/server.log` — every line timestamped and passed through a
  `postgres://…` redactor.
- Browser: console errors, page errors and failed requests are captured per test and attached
  on failure; `trace: 'retain-on-failure'` additionally embeds the full console log,
  plus screenshot and video.

### `npm run build && npm start` was evaluated and rejected
`script/build.ts` hard-bakes `"process.env.NODE_ENV": '"production"'` into `dist/index.js`.
Under `NODE_ENV=production` the session cookie is `secure: true`, so it is never sent over
`http://127.0.0.1`, and strict CSRF origin checking activates — authentication cannot work.
The dev server (tsx) is the only viable E2E target, so RC-1/RC-2/RC-3 had to be neutralised
rather than side-stepped.

---

## 4. The target-safety assertion

Four independent gates, each fail-closed:

1. **Config load** — `playwright.config.ts` throws if the base URL is an AQUAVO production/preview host.
2. **Pre-spawn** — `resolveE2EDatabaseUrl()` runs `assertNonProductionDatabase()`; the committed `.env` is deliberately *not* consulted. Anything that is not `localhost` or `ep-rapid-breeze-a46glg7f*` aborts.
3. **In-process, runtime** — `env-lock.mjs` asserts against the value the application will actually use, *after* neutralising dotenv, and exits 78 otherwise. Observed on every run (stderr, both parent and tsx child):

   ```
   [e2e-env-lock] OK — dotenv neutralised (1 db key(s) dropped from .env files).
   DATABASE_URL endpoint=ep-rapid-breeze-a46glg7f host=ep-rapid-breeze-a46glg7f.us-east-1.aws.neon.tech
   NODE_ENV=development DISABLE_SCHEDULED_JOBS=true
   ```

   Corroborated by the application's own line:
   `[DB-TARGET] role=primary key=DATABASE_URL env=child-branch endpoint=ep-rapid-breeze-a46glg7f`

4. **Behavioural proof, post-readiness** — global setup logs in with an account that was seeded
   **only on the verify branch**. If the running server were on any other database that login
   returns 401 and the run aborts before a single test executes. This is a proof of the target
   the server actually resolved, not a prediction.

   ```
   [e2e-global-setup] Target proof OK — the running server authenticated an account that
   exists only on the verify child branch.
   ```

This gate demonstrably works: one parallel attempt hit a transient
`getaddrinfo ENOTFOUND ep-rapid-breeze-a46glg7f…`, the proof failed, and the harness refused to
run rather than testing an unknown target.

Making it structurally impossible to reach production: the production endpoint id and branch id
are on a **deny** list, and the E2E database is on an **allow** list of exactly two entries.
A production URL cannot satisfy the allow-list even if the deny-list were bypassed.

---

## 5. Defects found (owned by other agents — reported, not fixed)

### F-4 — PIM per-line identity (`line_id`) missing on the E2E target branch — **CLEARED**
`POST /api/admin/fulfillment/purchases` returned **500**, `column "line_id" does not exist`,
matching the known state "fulfillment costing migrations NOT applied to Neon".

**Cleared 2026-07-23** by the coordinator, who applied `migrations/add_pim_line_identity.sql`
(sha256 `0b60607b…`) to `br-round-dust-a4t0kt58`. Verified here:
`packaging_inventory_movements.line_id` is present and both `pim_idempotency_uidx` (preserved)
and `pim_line_uidx` (new) exist.

### F-5 — product cost resolution (`products.cost_price_resolution`) missing — **CLEARED**
`shared/schema.ts:118` declares `costPriceResolution: text("cost_price_resolution")`, but the
verify branch's `products` table had only `cost_price`, `packaging_cost`, `insert_cost`, so
`GET /api/products` returned **500** and the storefront catalogue was entirely unavailable.

**Cleared 2026-07-23** by the coordinator, who applied
`migrations/add_product_cost_resolution.sql` (sha256 `98b2878a…`). Verified here: the column
exists and the distribution on real data is **113 `known` / 30 `unresolved` / 0 `verified_zero`**
— i.e. no cost was invented as a zero. `GET /api/products` now returns **200**.

---

### F-6 — the storefront advertises products it cannot actually sell  *(NEW — open)*
`products.stock` (what the catalogue shows, and what gates "add to cart") and
`inventory_canonical_balances` (what `createOrderSecure` enforces) disagree.

Measured on the verification branch: **29 of 102** products that the storefront advertises as
in stock have **no positive canonical ledger balance**. A customer who adds one to the cart and
checks out receives:

```
HTTP 500  {"message":"insufficient canonical inventory balance for product
           aquavo-driftwood-small-collection, variant <NULL>, location 3bbe2906-…"}
```

This was discovered by D13 failing on a product picked purely because the API said it was in
stock. It is a live, customer-facing revenue defect, not a test-data artifact.
**Owner: order-creation / inventory (Agent 2).** Asserted by `D13b`, which fails deliberately.

### F-7 — the admin dashboard's tab strip is inoperable on a phone viewport  *(NEW — open)*
On the Pixel 5 project (393 px), clicking the **الطلبات** tab does not change the selection:
`المنتجات` stays `[selected]` and the products table stays mounted. The harness re-clicks and
re-checks for **45 seconds** and the tab never activates; the same code passes instantly on both
desktop projects. The failure screenshot shows the tab fully rendered, unclipped and unobstructed
(`TabsList` is `flex flex-wrap`, so nothing is scrolled off-screen).

Consequence: **an admin on a phone cannot reach the Orders tab at all**, and therefore cannot
reach the per-order fulfillment/costing panel. Reproducible in both serial and parallel runs, on
both `mobile-light` and `mobile-dark`. **Owner: admin frontend.**

### F-8 — expired IP blocks are never released (3-hour timezone skew)  *(NEW — open)*
`POST /api/login` consults `blocked_ips` before checking the password and answers **429**. A row
whose `expires_at` was **09:54:20.907Z** — three hours in the past — was still served as an
active block, and the API reported `expiresAt: 12:54:20.907Z`. The +03:00 (Asia/Baghdad) skew
means `getBlockInfo()`'s expiry comparison never fires, so a block that should last 5 minutes
**never lifts**.

Real impact: any user (or IP) that trips "5 failed logins" is locked out permanently rather than
for 5 minutes. It also broke this suite — a previous run's negative-path auth tests blocked
`127.0.0.1` in the *database*, and the block survived every server restart. **Owner: auth /
security.** The harness now releases loopback blocks during seeding (see §3).

### F-9 — `e2e/fulfillment-admin.spec.ts` navigates to a route that does not exist  *(NEW — open)*
That spec drives `/admin/orders/${orderId}`. **There is no such route.** The fulfillment panel is
mounted inside the admin dashboard's الطلبات tab, in the per-order detail dialog
(`orders-management.tsx` → `<OrderFulfillmentPanel/>`, `data-testid="order-fulfillment-panel"`).
Its UI test could therefore never have passed. `e2e/certification.spec.ts` uses the correct flow.
Left in place rather than edited, because that spec's ownership sits with the fulfillment work.

---

## 6. Certification results

Suite: `e2e/certification.spec.ts` — 11 tests × 4 projects = **44**.
Projects: `desktop-light`, `desktop-dark`, `mobile-light`, `mobile-dark`
(locale `ar-IQ`, timezone `Asia/Baghdad`, chromium engine).

> **These figures SUPERSEDE the earlier blocked run.** The superseded run
> (24 passed / 0 failed / **28 skipped**) was taken before F-4 and F-5 were applied, when 8 of
> the 13 dimensions could not execute at all. It is retained below only for contrast.

### Current results — after F-4 / F-5 were applied

| Run | Workers | Passed | Failed | Skipped | Duration |
|---|---|---|---|---|---|
| Certification — **serial** (default) | 1 | **38** | **6** | **0** | 9.3 min |
| Certification — **parallel** | 4 | **38** | **6** | **0** | 4.4 min |

Serial and parallel produce the **identical** pass/fail set — the 6 failures are deterministic
defects (F-6 ×4, F-7 ×2), not flakiness. Nothing is skipped any more.

### Superseded results — before the migrations were applied

| Run | Workers | Passed | Failed | Skipped | Duration |
|---|---|---|---|---|---|
| ~~Certification — serial~~ | 1 | 24 | 0 | 28 | 1.5 min |
| ~~Certification — parallel~~ | 2 | 24 | 0 | 28 | 4.8 min |
| ~~Certification — parallel~~ | 4 | 24 | 0 | 28 | 1.3 min |
| ~~Certification — parallel, cold Vite cache~~ | 4 | 21 | 3 | 28 | 7.1 min |
| Legacy suite (6 specs, `desktop-light`) — serial | 1 | 195 | 26 | 0 | 22.6 min |

The legacy-suite row is retained as the dev-server stability evidence (§7); its failures were
dominated by F-5, which is now cleared.

### Per-dimension table

| # | Dimension | Status | Evidence |
|---|---|---|---|
| 1 | **Arabic RTL** | ✅ CERTIFIED (4/4) | `D1` — asserts `<html dir="rtl" lang="ar">`, computed `direction: rtl`, and ≥3 consecutive Arabic characters in rendered body text (an empty shell cannot pass). Zero page errors. |
| 2 | **Desktop** | ✅ CERTIFIED (2/2) | `D2/D3` — viewport ≥1000 px asserted, no horizontal overflow. Screenshot attached per project. |
| 3 | **Mobile** | ✅ CERTIFIED (2/2) | `D2/D3` — viewport ≤500 px (Pixel 5) asserted, no horizontal overflow. Screenshot attached. |
| 4 | **Light mode** | ✅ CERTIFIED (2/2) | `D4/D5` — theme pinned via the app's own `localStorage['theme']`; `documentElement.className` contains `light` and the stored value round-trips. Screenshot attached. |
| 5 | **Dark mode** | ✅ CERTIFIED (2/2) | `D4/D5` — same, asserting `dark`. Screenshot attached. |
| 6 | **Preparation workflow** | ✅ CERTIFIED (4/4) | `D7` — material created → stock received (`75000/50` ⇒ unit cost `1500`, server-derived) → replay with the same idempotency key returns `reused: true` and the balance stays `50` → draft opened → catalog line + named manual line → confirm returns `201` → **replay returns the same `eventId` and `alreadyConfirmed: true`, and stock is `49`, i.e. deducted exactly once.** |
| 7 | **Approval / history** | ✅ CERTIFIED (4/4) | `D7` — an **unapproved** proposal is asserted *not* to become the current cost; after approval `costs.current.unitCost === 1500` and `costs.history.length ≥ 1`. |
| 8 | **Cost status display** | ⚠️ **PARTIAL** — data ✅ 4/4, admin panel ✅ desktop 2/2 / ❌ mobile 2/2 | Data: a new material is `status: "unknown"` with `unitCost === null` (**never a fabricated 0**), and a single unknown line forces the whole draft to `expectedCost: null` + `costStatus: "incomplete"` rather than silently contributing zero. UI: the panel renders in RTL and never matches `/التكلفة المتوقعة\s*0\s*د\.ع/` on desktop; **on mobile the panel is unreachable because of F-7.** |
| 9 | **Expected vs actual cost** | ✅ CERTIFIED (4/4) | `D7` — server-computed `expectedCost === 1900` (1500 catalog + 2×200 manual, with the line total `400` computed server-side, never by the client); on confirm `actualCost === 1900`. |
| 10 | **Contribution profit** | ✅ CERTIFIED (4/4) | `D7` — `aquavoFulfillmentCost` is captured before confirm, asserted to have **moved** after confirm (proving a draft has no accounting effect until confirmed), and the breakdown carries `contributionProfit` and `dataStatus`. Full breakdown attached as `profitability-breakdown`. |
| 11 | **Returns and reversal history** | ✅ CERTIFIED (4/4) | `D7` — reversal returns `reused: false`, the replay returns the **same** `reversalEventId` with `reused: true`, and the independent verifier (`GET /verify`) reports **zero `critical` findings**. Report attached as `fulfillment-verify-report`. |
| 12 | **Storefront order creation** | ⚠️ **PARTIAL** — mechanism ✅ 4/4, availability ❌ 4/4 | `D13` — the catalogue renders in the browser (screenshot attached), a real order is created via `POST /api/orders` → `201`, and the order is **read back** by id → `200`. `D13b` fails: **29 of 102** advertised-in-stock products cannot be ordered at all (**F-6**). |
| 13 | **WhatsApp / admin creation** | ✅ CERTIFIED (4/4) | `D14` — a real manual (WhatsApp-channel) invoice is created via `POST /api/admin/invoices` → `201` with a persisted id, **read back** via `GET /api/admin/invoices/:id` → `200`, and the admin orders surface is asserted to expose the `source` channel discriminator that separates WhatsApp from storefront orders. |

**Certified outright: 11 of 13. Partial: 2 of 13** (cost status display, storefront order
creation) — each partial is caused by a **newly discovered product defect** (F-7, F-6), not by a
missing test and not by anything in the harness.

No assertion was weakened to turn a failure green. Where a test had to change to reach the code
under test, only *navigation or candidate selection* changed, never an assertion:

- `D9`'s UI test was corrected to the real panel location (F-9); its assertions are unchanged.
- `D13` now selects its product from the canonical ledger instead of trial-and-error, because
  `POST /api/orders` is capped at **10/hour/IP** — and the divergence that trial-and-error
  exposed is asserted in full by `D13b` rather than being absorbed.
- The costing-suite precondition probe was fixed: it previously treated *any* 500 from a
  deliberately bogus material id as schema drift and wrongly skipped all six costing dimensions.
  It now only trips on a missing-relation/column error.

---

## 7. Broader legacy-suite run (dev-server stability evidence)

To demonstrate that RC-1/RC-2/RC-3 are actually fixed — the previous attempt could never keep
the server alive — six legacy spec files were run serially on `desktop-light`:
`home`, `navigation`, `contexts`, `auth`, `accessibility`, `responsive`.

**Result: 221 tests — 195 passed · 26 failed · 0 skipped · 22.6 min · single dev server.**

The critical observation is that **the server process survived the entire 22.6-minute run.**
`e2e-artifacts/server.log` contains exactly one `SERVER PROCESS EXITED` line, at `12:34:49Z`,
and it is the **last line in the file** — the harness's own teardown after the run completed.
There is no mid-run exit, no `Port 24678 is already in use`, and no `EADDRINUSE`. Liveness was
independently confirmed with `GET /health → 200` at multiple points during the run while
`SERVER PROCESS EXITED` count was still `0`.

This is the direct contrast with the previous attempt, which never completed a run because the
server died partway through (`POSTCHECK ready=000`, best observed 36 passed / 148 failed).

The 26 remaining failures are **application/data failures, not harness instability** — they were
dominated by F-5 (the product catalogue 500s, so every product-dependent assertion fails:
featured products, search flow, products grid, tablet/desktop product rendering) plus a handful
of genuine UI gaps (404 page copy, footer links, register-page navigation, newsletter, WhatsApp
link). Per-failure traces, screenshots, videos and captured console errors are in
`e2e-artifacts/test-output/` (26 directories, one per failed test).

> **Note.** This legacy run predates the F-4/F-5 migrations. Its 26 failures were counted while
> the catalogue was still 500ing, so the figure is an upper bound and would now be materially
> lower. It is retained **only** as dev-server stability evidence — that is the claim it
> supports, and that claim is unaffected by the migrations. It has deliberately **not** been
> re-run and re-quoted as a certification result.

---

## 8. Artifact paths

| Artifact | Path |
|---|---|
| Run manifest (target, readiness, seeded accounts) | `e2e-artifacts/run-manifest.json` |
| Application server log (timestamped, redacted) | `e2e-artifacts/server.log` |
| HTML report | `e2e-artifacts/html-report/index.html` |
| Per-test traces, screenshots, videos, console-error attachments | `e2e-artifacts/test-output/<test-slug>/` |

Open a trace with `npx playwright show-trace e2e-artifacts/test-output/<slug>/trace.zip`.

> Reporters must **not** be pointed at `playwright-report/` — writes into that git-tracked
> directory silently produced no output in this environment (C-4).

---

## 9. How to run

```bash
# serial (default)
NEON_VERIFY_DATABASE_URL=<verify branch> npx playwright test e2e/certification.spec.ts

# controlled parallelism
E2E_WORKERS=4 npx playwright test e2e/certification.spec.ts

# the costing dimensions (D7–D12) need a real order on the target branch:
E2E_FULFILLMENT_ORDER_ID=<order uuid> npx playwright test e2e/certification.spec.ts
```

No `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` is required or accepted from the operator —
credentials are synthesised per run by global setup.

---

## 10. Recommendations for the owning agents

1. **`server/vite.ts` — remove `process.exit(1)` from `customLogger.error`.** *(RC-1.)*
   A Vite transform error must not kill the HTTP server. This is the single highest-value fix in
   this report and it currently has **no owner** — it sits outside every agent's declared
   ownership, which is why it survived. Registering it as a finding is requested.
2. **`server/vite.ts` / `vite.config.ts`** — make the HMR port configurable (or `strictPort:
   false`) so concurrent/orphaned dev servers cannot deadlock each other. *(RC-2.)*
3. **`server/env.ts`** — the explicit-process-variable fix has landed; what remains is that the
   operator's committed `.env` default still points at production, so `npm run dev` with a clean
   shell reaches production. Consider moving the production URL out of the committed `.env`
   entirely. *(N-2.)*
4. **F-6 — inventory divergence (order creation / inventory owner).** Reconcile `products.stock`
   with `inventory_canonical_balances`, or gate "add to cart" on the canonical ledger. Today
   29 of 102 advertised products fail checkout with a 500.
5. **F-7 — admin tab strip (admin frontend owner).** The الطلبات tab cannot be activated at
   393 px, so admins on phones cannot reach orders or the fulfillment panel at all.
6. **F-8 — IP-block expiry (auth / security owner).** `blocked_ips.expires_at` is read back with
   a +03:00 skew, so expired blocks never lift and a 5-minute lockout becomes permanent.
7. **F-9 — `e2e/fulfillment-admin.spec.ts`** drives `/admin/orders/:id`, a route that does not
   exist. Point it at the الطلبات tab's detail dialog
   (`data-testid="order-fulfillment-panel"`), as `e2e/certification.spec.ts` now does.
8. **Playwright browsers** — `npx playwright install firefox webkit` if cross-engine coverage is
   wanted; today only chromium exists and the config gates the others behind
   `E2E_EXTRA_ENGINES=true` rather than emitting hundreds of phantom failures.
9. **`authLimiter` / `orderLimiter`** — consider exempting loopback. `authLimiter` is
   5 failures/15 min and `orderLimiter` is 10 orders/hour per IP; both constrain how much an E2E
   suite can exercise from one machine. *(C-3.)*
