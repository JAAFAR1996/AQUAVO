# AQUAVO — QA & Deployment Checklist

**Branch:** `perfection-campaign/aquavo-global-level`
**Reviewed:** 2026-06-16
**Author:** Technical Risk & QA Lead
**Scope:** Safe-batch commit `bec46e1` + uncommitted working-tree changes, merge to `main`.

---

## 1. Real Test / Build / Typecheck Status

All results below were captured by running the actual commands in this environment.

| Check | Command | Result |
|-------|---------|--------|
| Client typecheck | `npx tsc -p tsconfig.json --noEmit` | **PASS** — exit 0, **0 errors** |
| Server typecheck | `npx tsc -p tsconfig.server.json --noEmit` | **0 errors reported — but NOT trustworthy** (see note) |
| Unit tests (full suite) | `npx vitest run` | **1074 / 1075 passed**, 1 failed (78 test files, 1 failed) |
| Unit tests (failing test isolated) | `npx vitest run client/src/__tests__/cart.test.tsx` | **16 / 16 PASS** in 763ms — confirms flake, not a real failure |
| Client production build | `npx vite build` | **PASS** — exit 0, bundles + brotli/gzip emitted |

### Notes on each result

- **Server typecheck reports 0 errors because `tsconfig.server.json` sets `"noCheck": true`.** This compiler option **disables type checking entirely** — it only validates that files parse. The server is effectively unchecked at the type level. This matches the known issue "tsconfig.json excludes server/**/* from type checking." Do not read "0 errors" as "server is type-safe."
- **The single failing unit test is a load-induced timeout, not a regression.** Under the full suite, total setup time was ~487s and import ~455s, starving the test's 5000ms timeout. Run in isolation, the same test (`cart.test.tsx > should keep order payload minimal and preserve variant labels`) passes in 763ms. Effective unit-test health: **green**.
- **Playwright E2E was NOT run.** `playwright.config.ts` hard-requires `PLAYWRIGHT_BASE_URL`/`E2E_BASE_URL` and explicitly refuses to run against production (`aquavoiq.com`). No safe local/staging server was running, so E2E coverage is unverified this cycle. ~30 spec files exist but their pass state is unknown.

---

## 2. Risk Register

| # | Issue | Severity | File / Location | Mitigation |
|---|-------|----------|-----------------|------------|
| R1 | Server code is **not type-checked** (`noCheck: true`) — type regressions ship silently | HIGH | `tsconfig.server.json` | Long-term: flip to real checking and fix fallout incrementally. Short-term: rely on `npx tsc -p tsconfig.json` (client) + esbuild bundle success as the only gate. Do not claim server type-safety. |
| R2 | **308 `as any` casts** in `server/` | MEDIUM | `server/**/*.ts` | Combined with R1, these are unchecked escape hatches. Accept for this merge (pre-existing, not introduced by safe batch); track as debt. |
| R3 | **80 raw `req.body` references** without `?? {}` guard in routes | MEDIUM | `server/routes/*.ts` | Known sendBeacon/no-Content-Type crash class. Safe batch hardened `analytics.ts`; the other 79 remain. Audit high-traffic POST/beacon routes before next release. |
| R4 | **Uncommitted working-tree changes are NOT in commit `bec46e1`** and will be lost or shipped inconsistently | HIGH | `.gitignore`, `client/src/components/navbar.tsx`, `server/middleware/security.ts`, `vercel.json`, deleted `.env.production` | Decide explicitly: commit them on this branch (recommended — they look intentional and correct) or stash. Do not merge with a dirty tree. |
| R5 | CSP `'wasm-unsafe-eval'` added to `script-src` in two places | LOW | `server/middleware/security.ts`, `vercel.json` | Needed for `model-viewer` (3D WASM). Verify both CSP sources stay in sync (they currently match). Low risk; loosens script policy only for WASM, not arbitrary eval. |
| R6 | `.env.production` deleted in working tree (committed secrets are documented debt per reports/02) | HIGH (security) | repo root | Confirm secrets are rotated and stored in Vercel env, not in git history. Deletion alone does not purge history. Pre-existing follow-up, not a blocker for the code merge but must be tracked. |
| R7 | Neon cold-start: embeddings reset per cold start; serverless relies on keyword fallback | MEDIUM | embedding-generator / VetRAG | Already mitigated in `error-handler.ts` (503 + Retry-After on Neon wake). No action; confirm keyword search path still default. |
| R8 | BigInt/Decimal from Neon can break `res.json()` | LOW | `server/routes/*.ts` | Sanitizer present only in `accounting.ts` and `orders.ts`. New numeric endpoints must apply the same `JSON.parse(JSON.stringify(..., bigint→Number))` guard. |
| R9 | Full vitest run is slow/flaky (~97s wall, setup-starved timeouts) | LOW | test infra | For CI gating, prefer sharding or raise `testTimeout`; treat single timeouts as flake, re-run isolated before trusting a "fail." |
| R10 | E2E unverified this cycle | MEDIUM | `e2e/**` | Run `npm run test:e2e` against a local/staging URL before production promote. |

---

## 3. Pre-Deploy Checklist

- [ ] **Decide on uncommitted changes (R4).** Commit navbar/security/vercel/.gitignore/.env.production on this branch or stash — tree must be clean before merge.
- [ ] Confirm `npx tsc -p tsconfig.json --noEmit` → 0 errors (client). **Currently PASS.**
- [ ] Confirm `npx vite build` → exit 0. **Currently PASS.**
- [ ] Re-run any failing unit test in isolation; only block on reproducible failures. **Current sole failure is flake.**
- [ ] Verify CSP in `vercel.json` and `server/middleware/security.ts` are consistent (both now carry `'wasm-unsafe-eval'`). **Currently consistent.**
- [ ] Confirm all required secrets exist in Vercel project env (DATABASE_URL, CLOUDFLARE_*, GROQ_API_KEY*, GEMINI_API_KEY*, VITE_TIKTOK_PIXEL_ID). Note: test run warned no Gemini/Groq keys locally — expected locally, must be set in prod.
- [ ] Confirm secrets rotated if `.env.production` was ever committed (R6).
- [ ] Run E2E smoke against staging/local: `PLAYWRIGHT_BASE_URL=http://localhost:5000 npm run test:e2e` (at least chromium).
- [ ] Smoke-test the safe-batch UI changes (script in Section 4) on a preview deployment.
- [ ] Sanity-check production OG/meta via `api/ssr-meta.ts` for a product page (absolute image URLs, no fish/plants in JSON-LD).
- [ ] Verify `npm run start` boots `dist/index.js` without crash (Neon serverless 1.1.0 already in place per commit history).

---

## 4. Manual Smoke-Test Script (Safe-Batch Changes — commit bec46e1)

Run on a preview/staging deploy. Each step targets one change in the safe batch.

1. **Product card rating guard** (`product-card.tsx`)
   - Open the products listing. Find a product with **0 reviews**.
   - EXPECT: no rating widget / no "0 (0)" stars rendered. Products **with** reviews still show stars + count.

2. **TikTok Purchase dedup** (`tiktok-pixel.ts`)
   - With TikTok pixel ID set, complete a checkout to the confirmation page.
   - In DevTools Network/Console, confirm a single TikTok `Purchase` event. Refresh the confirmation page → EXPECT **no duplicate** Purchase (localStorage guard, mirrors Meta).

3. **TikTok pixel env + SPA PageView** (`third-party-analytics.ts`, `use-meta-pixel.ts`)
   - Confirm pixel loads from `VITE_TIKTOK_PIXEL_ID` (fallback still works if unset).
   - Navigate between routes (home → products → product) **without full reload**. EXPECT a TikTok `PageView` fired on each client-side route change.

4. **Guest order-confirmation fallback** (`order-confirmation.tsx`)
   - As a **guest** (logged out), reach the order confirmation page.
   - EXPECT data loads via the PII-safe `/track/:id` endpoint (no auth error, no PII leakage). Logged-in users use the normal path.
   - With OS "reduce motion" enabled, EXPECT confetti is suppressed/calmed.

5. **Product details cleanup** (`product-details.tsx`)
   - Open any product detail page; leave it open 30–60s.
   - EXPECT: no fake/animated "viewer counter" appears; no console errors from a stale `setInterval`. In-stock copy reads calmly. Page still loads fully (the removed redundant full-catalog fetch should not break related items).

6. **Analytics req.body hardening** (`analytics.ts`)
   - Trigger a `navigator.sendBeacon` analytics call (page unload / nav away) — beacons often omit Content-Type.
   - EXPECT: server does not 500; request is accepted/ignored gracefully (`req.body ?? {}`).

7. **Working-tree extras (verify if committed before merge):**
   - Navbar cart → checkout (mobile): uses `setLocation("/checkout")` (SPA nav) instead of `window.location.href`. EXPECT no full page reload, cart sheet closes.
   - 3D model-viewer renders on a product with a GLB (validates `'wasm-unsafe-eval'` CSP).

---

## 5. GO / CAUTION / NO-GO

### Verdict: **CAUTION**

The code on commit `bec46e1` is sound and low-risk: client typecheck is clean (0 errors), the production build succeeds, and unit tests are effectively green (the lone failure is a reproducible load-starved timeout that passes in isolation). The safe-batch changes are small, well-scoped UX/analytics/hardening fixes with no schema or data-layer risk.

CAUTION rather than GO for three reasons:

1. **Dirty working tree (R4, blocker for a clean merge).** There are uncommitted, intentional-looking changes — CSP `'wasm-unsafe-eval'` (server + vercel.json), a navbar SPA-navigation fix, `.gitignore` updates, and a deleted `.env.production` — that are **not part of commit `bec46e1`**. Merging now would ship the branch without them or in an inconsistent state. These must be committed (recommended) or stashed first.
2. **Server is not type-checked (R1).** `tsconfig.server.json` has `noCheck: true`, so the "0 server errors" result is meaningless. Server type regressions are invisible to CI. Acceptable for this merge since the safe batch barely touches the server (one `req.body` guard), but it is a standing HIGH risk to flag.
3. **E2E and secret-rotation unverified this cycle (R10, R6).** Playwright did not run (no safe base URL), and committed-secret cleanup remains documented debt.

**To convert CAUTION → GO:** commit/stash the working-tree changes (clean tree), keep the two CSP sources in sync, run an E2E chromium smoke against a preview deploy, and confirm prod secrets are set in Vercel (and rotated if `.env.production` was ever in history). Once the tree is clean, the actual code in this branch is safe to merge.
