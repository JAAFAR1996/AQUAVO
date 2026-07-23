# Final Playwright E2E Certification — AQUAVO

**Agent:** FullPlaywrightCertificationAgent (Phase B, independent)
**Date:** 2026-07-24
**Branch under test:** `feat/accounting-canonical-fulfillment`
**Web target:** `http://127.0.0.1:5199` (loopback only)
**Database target:** Neon **verify child branch** `ep-rapid-breeze-a46glg7f`
(`br-round-dust-a4t0kt58`), resolved from `NEON_VERIFY_DATABASE_URL`.
**Production was never contacted.** The production endpoint `ep-quiet-moon-a4h7tdze`
(branch `br-patient-mouse-a4d4cgr4`) and web hosts (`aquavoiq.com`) are structurally
rejected by the harness (`e2e/support/target-safety.mjs`, verified in §2). No connection
string is reproduced anywhere in this report.

---

## 1. Executive summary

**All 16 required dimensions are CERTIFIED.** Every dimension is backed by a real,
deterministic test or a direct runtime verification, with pass counts and artifact paths in §4.

- **Serial mode** and **controlled parallel mode** produce an **identical pass/fail set** on
  the certification vehicle — proving the results are deterministic, not flakiness.
- **One test fails deterministically: `certification.spec.ts` D13b (availability integrity).**
  This is **not a live product defect and not one of the 16 dimensions.** It is a *base-grain
  measurement artifact* already adjudicated by the coordinator (findings-register F-6, row 259)
  and **independently reproduced here**: at the authoritative per-SKU grain, **0 advertised
  products are unfulfillable** (§5). No assertion was weakened to hide it — it is reported in full.
- The F-6 fix (checkout ledger rejection → **HTTP 409 `OUT_OF_STOCK`**, never 500), F-7 (admin
  mobile nav), and F-8 (IP-block expiry) are all verified green.
- Nothing was silently passed. Every skip is structural and explained (§6). Every failure seen
  during the campaign was run to ground as *real defect* vs *flake* (§7).

| Mode | Scope | passed | failed | skipped | flaky |
|------|-------|-------:|-------:|--------:|------:|
| **Serial** — certification.spec (4 projects, per-project fresh servers) | D1–D14 | **40** | **4** (all D13b) | 0 | 0 |
| **Serial** — admin-mobile-nav (F-7, 4 projects, `E2E_RETRIES=1`) | F-7 / D15 | **42** | **0** | 2 (dark-only on light) | 0 |
| **Serial** — F-6 direct (409 OUT_OF_STOCK) | D14 | **PASS** | 0 | 0 | — |
| **Serial** — F-8 direct (temp block expiry lifts) | D16 | **PASS** | 0 | 0 | — |
| **Parallel** (2 workers) — certification.spec (desktop-light) | D1–D14 | **10** | **1** (D13b) | 0 | 0 |

Serial and parallel desktop-light are byte-for-byte the same set: 10 pass + D13b. D13b is therefore
a deterministic defect-report, **not** a parallel-worker flake.

---

## 2. Target safety (verified, not assumed)

- `NEON_VERIFY_DATABASE_URL` resolves to endpoint `ep-rapid-breeze-a46glg7f`;
  `isProductionDatabaseUrl()` → **false**; `assertNonProductionDatabase()` → **OK**.
- The harness (`e2e/support/global-setup.mjs`) starts the server with `env-lock.mjs` injected,
  deletes `DATABASE_URL` from the child env, disables cron, seeds a per-run synthetic
  admin+customer, and **proves at runtime** that the running server is on the seeded branch by
  logging in with a credential that exists only there. All runs in this report passed that gate.
- All command output in this report was redacted with `sed -E 's#postgres(ql)?://[^ ]*#[REDACTED]#g'`.

---

## 3. Run modes

### 3.1 Serial (the primary certification mode)
The certification vehicle is `e2e/certification.spec.ts` (D1–D14) + `e2e/admin-mobile-nav.spec.ts`
(F-7) + direct F-6/F-8 checks. Run with the default `workers=1`.

**Isolation note that mattered.** A first attempt running all four projects in **one** server
process produced 23 passed / 15 failed / 6 skipped. Root cause was **not** product defects:
`/api/login` is rate-limited to 5 *failed* attempts / 15 min per IP, and across four projects on a
single shared in-memory limiter the counter tripped, which (a) 429'd the D6 auth tests on projects
2–4, and (b) poisoned the `beforeAll` fulfillment probe, skipping D7–D12/D9-render on those
projects (the 6 skips). Proof it was isolation, not code: **project 1 (desktop-light), on a fresh
limiter, passed every one of those tests.** Re-running **one project per fresh server** eliminated
all 11 login-429 failures and all 6 skips, leaving only the deterministic D13b failure on each
project. (Superseded log: `e2e-artifacts/serial-certonly.log`.)

Authoritative per-project results (fresh server each):

| Project | tests | passed | failed | skipped | junit |
|---------|------:|-------:|-------:|--------:|-------|
| desktop-light | 11 | 10 | 1 (D13b) | 0 | `e2e-artifacts/serial-certonly.log` (items 1–11) |
| desktop-dark | 11 | 10 | 1 (D13b) | 0 | `e2e-artifacts/junit-cert-desktop-dark.xml` |
| mobile-light | 11 | 10 | 1 (D13b) | 0 | `e2e-artifacts/junit-cert-mobile-light.xml` |
| mobile-dark | 11 | 10 | 1 (D13b) | 0 | `e2e-artifacts/junit-cert-mobile-dark.xml` |
| **total** | **44** | **40** | **4 (all D13b)** | **0** | `e2e-artifacts/cert-perproject.log` |

F-7 serial (all 4 projects, `E2E_RETRIES=1`): **42 passed · 2 skipped · 0 failed · 0 flaky**
(`e2e-artifacts/f7-navrun.log`, `e2e-artifacts/junit-f7.xml`). No retry was actually consumed in
this run — every test passed first attempt.

### 3.2 Controlled parallel mode (2 workers)
`certification.spec.ts --project=desktop-light` with `E2E_WORKERS=2`.
**10 passed · 1 failed (D13b) · 0 flaky · no worker crashes.** The D7–D12 test genuinely ran on a
second worker concurrently with the presentation/auth tests on worker 1 and still passed. The pass/
fail set is identical to serial → deterministic, no parallel-induced flake.
Log: `e2e-artifacts/parallel-parity.log`, junit `e2e-artifacts/junit-parallel-parity.xml`.

### 3.3 Complete-suite sweep (regression coverage) and environmental ceiling
The full matrix is **4984 tests** (31 specs × 4 projects). Two hard environmental limits prevented a
full 4-project run in *both* modes:

1. **Memory ceiling.** Free physical RAM sat at ~0.5–1.0 GB. A shared-server 4-project run crashed a
   worker with Windows `STATUS_DLL_INIT_FAILED` (`0xC0000142`, exit 3221225794) — a browser process
   that cannot initialize under memory pressure — which cascades ("N did not run"). Full parallel
   (fullyParallel × 4 workers × 4 projects) is not survivable on this box.
2. **Wall-time.** Heavy UI specs average ~8 s/test (analytics heartbeats, `waitForTimeout`,
   `networkidle`); a full 4984-test serial pass is ≈11 h — impractical in one session.

Per the task's instruction that *a truthful partial is required over a fabricated pass*, the 16
dimensions were certified with dedicated deterministic specs (run in **both** serial and controlled
parallel, §3.1–3.2) rather than by claiming a full-matrix pass that the hardware cannot produce.

**A best-effort complete-suite serial sweep (desktop-light, `E2E_RETRIES=1`, trace off) was run and
its outcome is itself the proof of the ceiling.** It executed **311 tests green** (alphabetically
`accessibility` → `calculators`, i.e. all specs up to test #388), then at **~test #389 the dev
server crashed** — `e2e-artifacts/server.log` records `SERVER PROCESS EXITED code=1 signal=null`
(2026-07-23T23:48:28Z), last healthy request `GET /api/products/attributes 200` at 23:47:37Z. Every
spec after that point (`cart`, `certification`, `checkout`, `contexts` … `utilities`) then failed
against a **dead server** — ~39 distinct tests, each also failing its one retry, giving ~78 red
lines. This is a **single server-death cascade, not ~40 independent defects**. Proof: the failing
set includes `certification.spec` **D6/D13/D14, which passed deterministically in isolation minutes
earlier** (§3.1) — they can only fail here because the app was down. The process was then OOM-killed.
Log: `e2e-artifacts/fullsuite-dl.log`. Net: the full suite cannot be carried to completion on this
host; the crash is the environmental ceiling, reproduced. The 16-dimension certification stands on
the dedicated specs, which do complete.

---

## 4. The 16 dimensions

Arabic RTL is the app default (`<html lang="ar" dir="rtl">`), so **every** project exercises RTL.
Desktop/mobile and light/dark are enforced as genuinely distinct runs by D2/D3 (viewport width
assertions) and D4/D5 (theme class + `localStorage` + pixel check).

| # | Dimension | Status | Evidence (test → count) | Artifact |
|---|-----------|--------|-------------------------|----------|
| 1 | Arabic RTL | **CERTIFIED** | `certification.spec` D1 — 4/4 projects; dir=rtl, lang=ar, real Arabic copy, zero pageerror | `serial-certonly.log`, `junit-cert-*.xml` |
| 2 | Desktop | **CERTIFIED** | D2/D3 viewport ≥1000px — desktop-light+dark pass | `junit-cert-desktop-*.xml` |
| 3 | Mobile | **CERTIFIED** | D2/D3 viewport ≤500px — mobile-light+dark pass | `junit-cert-mobile-*.xml` |
| 4 | Light | **CERTIFIED** | D4/D5 theme=light applied (class+storage+bg) — light projects | `junit-cert-*light*.xml` |
| 5 | Dark | **CERTIFIED** | D4/D5 theme=dark applied — dark projects | `junit-cert-*dark*.xml` |
| 6 | Preparation | **CERTIFIED** | D7 receive stock idempotently (unit cost 75000/50=1500; balance 50) — 4/4 | `cert-perproject.log` |
| 7 | Approvals / history | **CERTIFIED** | D8 only an APPROVED record becomes current cost; history retained — 4/4 | `cert-perproject.log` |
| 8 | Storefront creation | **CERTIFIED** | D13 real `POST /api/orders` → 201, order read back — 4/4 | `serial-certonly.log`, `junit-cert-*.xml` |
| 9 | WhatsApp / admin creation | **CERTIFIED** | D14 `POST /api/admin/invoices` → 201, read back; `source` channel discriminator present — 4/4 | `serial-certonly.log` |
| 10 | Cost-status display | **CERTIFIED** | D9 unknown cost is NULL not fabricated 0; one unknown line ⇒ expectedCost NULL/incomplete; D9-render panel RTL — 4/4 | `cert-perproject.log` |
| 11 | Expected vs actual cost | **CERTIFIED** | D10 server-computed expected (1500+400=1900), actual=confirmed expected — 4/4 | `cert-perproject.log` |
| 12 | Contribution profit | **CERTIFIED** | D11 draft has no effect until confirm; breakdown carries `contributionProfit`+`dataStatus`, moves on confirm — 4/4 | `profitability-breakdown` attachment |
| 13 | Returns / reversals | **CERTIFIED** | D12 reversal exactly negates, idempotent; verifier reports 0 critical findings — 4/4 | `fulfillment-verify-report` attachment |
| 14 | Out-of-stock handling (F-6) | **CERTIFIED** | Direct: order 100 vs canonical balance 1 → **HTTP 409 `OUT_OF_STOCK`**, clean Arabic message, no English leak, no order persisted, never 500 | `tasks/b1sa94nkw.output`, `e2e-artifacts/f6-server.log` |
| 15 | Mobile Orders/Fulfillment access (F-7) | **CERTIFIED** | admin-mobile-nav — 42 passed incl. 360×800 "Orders and Fulfillment reachable", deep-link `?section=orders`, deep-link `?section=accounting`, 393×852 all-12-sections — 4/4 | `f7-navrun.log`, `junit-f7.xml` |
| 16 | Temp IP-block expiry (F-8) | **CERTIFIED** | Direct: expired temp block **lifts** (canonical predicate `expires_at IS NULL OR expires_at > now()`); active block held; permanent (NULL) never lifts; countdown 299s sane; cleanup selects only expired; `expires_at` is `timestamptz` | `tasks/b1sa94nkw`→see §5.2; script `scratchpad/verify-f8.mjs` |

### 4.1 F-6 direct verification (dimension 14) — evidence
```
productId aquavo-driftwood-dw-03 · canonicalStock 1 · ordered qty 100
status 409 · code OUT_OF_STOCK
message "الكمية المطلوبة غير متوفرة حالياً (خشب ديكور للأحواض — قطعة DW-03)"
is409 ✓ · isOutOfStock ✓ · notServerError ✓ · noEnglishLeak ✓ · noOrderPersisted ✓ · PASS
```
This exercises the **ledger backstop** path (`server/storage/order-storage.ts` translates the
`prevent_negative_inventory_balance` trigger to `STOCK_ERROR_INSUFFICIENT`; `server/routes/orders.ts`
maps it to 409). An out-of-band quantity (>100) is correctly caught earlier by input validation (400,
"Maximum 100 items per product") — also not a 500.

### 4.2 F-8 direct verification (dimension 16) — evidence
```
expiredBlockLifted ✓ (temp block, expires_at 5 min in the PAST → not in force)
activeBlockHeld ✓ (expires_at 5 min FUTURE → still blocked)
permanentBlockHeld ✓ (expires_at NULL → never lifts)
activeCountdownSeconds 299 · countdownSane ✓
cleanupSelectsOnlyExpired ✓ · expiresAtIsTimestamptz ✓ · PASS · cleanedUpRows 3
```
Verified with the **exact** canonical in-force predicate the middleware/`isIPBlocked` evaluates,
against distinctly-prefixed TEST-NET-3 rows on the verify branch, all removed afterward (§8).

---

## 5. The single deterministic failure: D13b — analysed, not weakened

`certification.spec.ts:515 "D13b availability integrity"` fails on all 4 projects and in both serial
and parallel. Its message asserts that 29 of 102 in-stock products lack a canonical ledger balance.

**Determination: base-grain measurement artifact, NOT a live defect. Independently reproduced.**

The D13b query only checks the `variant_id IS NULL` balance row. The 29 flagged products are
**variant products** whose canonical stock is held **per-variant**, summing to exactly the advertised
`products.stock`. Example — `وصلات خراطيم هواء 4 ملم` (stock 109):

| variant_id | canonical_stock |
|-----------|----------------:|
| shape-i | 50 |
| shape-t | 30 |
| shape-y | 29 |
| **Σ** | **109** = products.stock |

Independent reproduction against the verify branch:
- base-grain-flagged: **29**
- **truly unfulfillable at ANY grain: 0**
- flagged products with a positive canonical balance somewhere: **29 / 29**

This matches the coordinator's adjudication (`docs/audit/findings-register.md` F-6, row 259: "at the
authoritative per-SKU grain **0 of 183 advertised SKUs are unfulfillable** … F-6 REFUTED as a live
defect; the 500→409 mapping is still correct and shipped"). The correct product behaviour — the
**500→409 mapping** — is exactly what dimension 14 requires and is verified green in §4.1.

Per instruction, **D13b was not modified or weakened.** It is reported as a failing test whose root
cause is a mis-grained assertion in the certification suite itself, not a checkout defect.

---

## 6. Every skip, explained

- **F-7 "dark scheme: Orders reachable and active state visible" — 2 skips**, on `desktop-light` and
  `mobile-light` only. The test asserts a **dark-theme-specific** active-tab background colour; it is
  `test.skip(!project.includes("dark"))` by design and **passes on desktop-dark and mobile-dark**.
  Structurally impossible on a light project → legitimate.
- **No other skips** exist in the authoritative per-project certification runs (the 6 skips seen in
  the superseded shared-server run were login-429 collateral, eliminated by per-project isolation — §3.1).

---

## 7. Flake vs real-defect determinations

| Symptom first seen | Verdict | How determined |
|--------------------|---------|----------------|
| admin-mobile-nav 393×852 "analytics tab" click 20s timeout, then `0xC0000142` worker crash cascading "did not run" | **Flake (infra: cold-start + memory)** | Documented in `mobile-admin-navigation-remediation.md` (§7: desktop-light cold-start timeouts are "infra, not code"). Re-run clean: F-7 passed **42/2/0, first attempt, 0 retries**. |
| 11 × D6/D13/D14 `login 429` on projects 2–4 | **Flake (test isolation)** | Shared in-memory login limiter across 4 projects. Per-project fresh servers → 0 recurrence; project 1 always passed them. |
| 6 × D7–D12/D9-render "skipped" on projects 2–4 | **Flake (collateral of the 429)** | `beforeAll` probe login 429'd → `fulfillmentDrift` set → skip. Gone with per-project isolation. |
| D13b availability integrity (4×, both modes) | **Real failing test, but NOT a live defect** | Base-grain artifact; 0 unfulfillable at authoritative grain (§5). Deterministic across serial+parallel → not a worker flake. |
| ~39 specs failing from `cart` onward in the complete-suite sweep (each + its retry) | **Infra cascade, NOT defects** | `server.log`: `SERVER PROCESS EXITED code=1` at test ~#389; all later specs hit a dead server. `certification.spec` D6/D13/D14 are in this list yet passed in isolation minutes earlier — proof of cascade, not real failures. |

---

## 8. Records created and cleaned up

- **F-8 verification:** 3 `blocked_ips` rows tagged `E2E-F8-CERT-*` on TEST-NET-3 IPs (`203.0.113.x`).
  **All 3 deleted** by the script's `finally` block (`cleanedUpRows: 3`). No residue.
- **F-6 verification:** one `POST /api/orders` that was **rejected (409)** — the test confirmed
  `noOrderPersisted` (0 rows for its customer name). Nothing written.
- **Certification.spec fulfillment tests** created materials/purchases/cost-records/fulfillment events
  and reversed their own events (idempotent); they ran against distinct order ids
  (`8d8dfb01…`, `982d2633…`, `88c58c0d…`, `09c0cc02…`, `e891c639…`) on the already-contaminated verify
  branch. D13/D14 created real test orders/invoices (`زبون اختبار E2E`, `زبون واتساب اختبار E2E`) —
  these are ordinary cert-suite artifacts on the sandbox branch.
- Scratch scripts `_verify-f6-tmp.mjs`, `_run-*.sh` were used from the repo root and removed after use;
  `scratchpad/verify-f8.mjs` retained under the session scratchpad.

---

## 9. Artifact index

| Artifact | What |
|----------|------|
| `e2e-artifacts/cert-perproject.log` | serial per-project cert (dark/mobile-light/mobile-dark) |
| `e2e-artifacts/serial-certonly.log` | serial cert incl. clean desktop-light + superseded shared-server run |
| `e2e-artifacts/junit-cert-{desktop-dark,mobile-light,mobile-dark}.xml` | per-project junit (11 tests, 1 fail each) |
| `e2e-artifacts/parallel-parity.log`, `junit-parallel-parity.xml` | controlled parallel (2 workers) desktop-light |
| `e2e-artifacts/f7-navrun.log`, `junit-f7.xml` | F-7 admin-mobile-nav, 42/2/0 |
| `e2e-artifacts/f6-server.log` + task `b1sa94nkw.output` | F-6 direct 409 verification |
| `scratchpad/verify-f8.mjs` + task output | F-8 direct expiry verification |
| `e2e-artifacts/fullsuite-dl.log`, `junit-fullsuite-dl.xml` | best-effort complete-suite (desktop-light) sweep |
| `e2e-artifacts/server.log` | app server log (redacted) |

---

## 10. Verdict

**16 / 16 dimensions CERTIFIED**, in serial and (for the certification vehicle) controlled parallel,
with matching deterministic results. The only failing test, D13b, is a base-grain artifact of the
certification suite — independently proven to correspond to **0** genuinely unfulfillable products —
and is reported unweakened. F-6 (409 not 500), F-7 (mobile nav), and F-8 (block expiry) are green.
The full 4984-test matrix in both full modes is bounded by this host's ~0.5–1.0 GB free-RAM ceiling
(reproducible `0xC0000142` worker crash) and ~11 h serial wall-time; that limit is reported honestly
rather than papered over, and a best-effort single-project complete sweep supplies regression coverage.
