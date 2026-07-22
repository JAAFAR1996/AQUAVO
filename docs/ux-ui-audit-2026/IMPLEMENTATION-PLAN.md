# AQUAVO — Implementation Plan

Derived from `AUDIT.md` + `MOTION-RESEARCH.md`. Scope is deliberately narrow and evidence-driven: this pass fixes what was found broken/missing live, and does not re-implement the large, separate backlog already sitting in `AQUAVO_CONVERSION_FLOW_AUDIT.md` / `ACCESSIBILITY.md` / `AQUAVO_COPY_AND_BRAND_AUDIT.md` (those are real but belong to their own commerce-logic/copy tracks, not a UI/motion mission).

## Phase A — Critical fixes

### A1. Remove the dead/misleading duplicate production CSP definition (P1-1)
**Why:** `vercel.json` and `server/middleware/security.ts` defined two different CSP policies under the same name. Verified via `vercel.json`'s `rewrites` block that the Express one was **only ever live for `/api/*`, `/.well-known/*`, `/oauth/*`** — page loads (home, listing, PDP) get their CSP purely from `vercel.json`'s edge `headers` config, confirmed by matching its domain list against the live console errors exactly. So this was a real "two sources of truth" hygiene bug (a future engineer editing `security.ts` would reasonably but wrongly believe they're changing production page CSP), but **it was not the cause of, and this fix does not resolve,** the live Meta CAPI-Gateway `connect-src` console errors — those are unchanged, on purpose (see below).
**Files:** `server/middleware/security.ts`.
**Change:** Removed the production CSP `res.setHeader` block; left a comment explaining why (page routes never hit it) and pointing at `vercel.json` as the actual source of truth. Dev-mode CSP branch untouched (local `pnpm dev` doesn't go through `vercel.json`).
**Explicitly NOT done:** adding the Meta CAPI-Gateway's `*.run.app`/`*.on.aws` domains to `vercel.json`'s `connect-src`. Those are shared multi-tenant Cloud Run/AWS-ECS hostnames — wildcarding them would allow-list *any* app on those platforms, a real CSP security regression, in exchange for silencing a cosmetic console error on a non-critical Meta pixel transport path (the primary `facebook.com/tr` pixel call is already allow-listed and working). If AQUAVO wants this specific Meta feature, the right ask is Meta/the pixel vendor for a static domain — not loosening `connect-src` to a TLD wildcard.
**Risk:** Low — removes dead code, no behavior change for any route that was actually being served.
**Verify:** `pnpm check` / `pnpm test` / `pnpm build:client` clean (done — see `RESULTS.md`). Reloading the live site will **still show the 5 CAPI-Gateway console errors** — that is expected and correct, not a regression; see the "not done" note above.

### A2. Desktop checkout: pass `cartItems` to `OrderSummary`, add missing `credentials:"include"` on coupon fetch
Specified in `AQUAVO_CONVERSION_FLOW_AUDIT.md` §4.1, §4.2; verified still present, then fixed.
**Files:** `client/src/components/cart/checkout-dialog.tsx`.
**Change 1:** `<OrderSummary cartItems={cartItems} ... />` — the component already had a fully-implemented optional `cartItems` prop (`checkout/order-summary.tsx:16,35-55`, itemized list + variant label + per-line price) that was simply never passed at this call site, unlike the mobile `/checkout` page which already does. One-line fix, no component changes needed.
**Change 2:** added `credentials: "include"` to the `/api/coupons/validate` fetch, matching what `checkout.tsx` (mobile) already does.
**Risk:** Low — additive prop pass-through and a standard fetch option; doesn't change any existing behavior for users not affected by the bug.
**Not done (STRATEGIC, correctly out of scope):** unifying the shipping-fee source between the dialog and the page. Per the commerce-flow specialist audit, both currently resolve to the same 5000 IQD constant, so this bug is latent, not live — collapsing two checkout implementations into one shared component is a larger architectural change than a targeted UI-audit pass should make without its own dedicated design/test cycle.

## Phase B — Visual system
No visual-system changes were implemented this pass. The audit found the existing token/component system consistent and correctly applied (score 8/10 brand alignment); the identified visual gaps (photography consistency, LocalBusiness JSON-LD) are asset-production and copy/SEO work respectively, not component-level UI defects. Nothing here to avoid inventing busywork.

## Phase C — Motion system

### C1. Global `prefers-reduced-motion` gate for framer-motion (P1-4)
**Why:** `motion.ts`'s well-built token system and 35 files' worth of framer-motion usage aren't respecting the OS reduced-motion setting except in one manually-checked case. CSS animations already do this correctly — framer-motion is the one gap.
**Files:** `client/src/App.tsx`.
**Change:** Import `MotionConfig` from `framer-motion`, wrap `AppShell`'s returned JSX with `<MotionConfig reducedMotion="user">`.
**Risk:** Zero for users without the OS flag set (no visual change). For users with it set, framer-motion animations switch to opacity-only cross-fades — this is framer-motion's own built-in, well-tested behavior for this mode, not custom logic.
**Verify:** Toggle OS/emulated `prefers-reduced-motion: reduce`, confirm framer-motion-driven transitions (page transition, any `motion.div` reveal) no longer translate/scale.

No other motion changes are made this pass — see `MOTION-RESEARCH.md` for the full accept/reject table. The system already in place is sound; it just wasn't fully wired to the accessibility setting.

## Phase D — Performance & accessibility

### D1. Flag (not fix) the PDP paint-delay (P1-3)
**Why:** Root-causing a ~2s blank-viewport delay on the PDP requires a performance trace (Chrome DevTools `performance_start_trace`/`performance_analyze_insight` or equivalent), which is a separate, deeper investigation than this mission's tool access reasonably supports in one pass without risking a wrong guess turning into a wrong fix. Guessing at the cause (e.g., blindly adding a skeleton, or blindly code-splitting something) risks masking the real problem or introducing a regression without evidence.
**Action taken:** Documented with reproducible evidence (`evidence/before/desktop-pdp-viewport.png` vs `desktop-pdp-waited.png`, and the network/console logs in `AUDIT.md` P1-3) so the performance track has a concrete, evidenced starting point instead of a vague "PDP feels slow."
**Recommended next step (not this pass):** a Chrome DevTools performance trace on `/products/:slug` to identify what's blocking first paint between the 200 API responses and content appearing, then decide between a skeleton state (masks perceived latency) vs. fixing the actual blocking work (fixes it for real). Do the trace before choosing.

### D2. Global reduced-motion gate (see C1 — accessibility and motion overlap here by design)

## Phase E — Verification

Run after Phase A/C changes:
1. `pnpm check` (`tsc`) — must pass with no new errors.
2. `pnpm test` (vitest) — must pass; no test touches CSP or MotionConfig directly, so this is a regression guard, not a targeted test.
3. `pnpm build:client` — must succeed; confirms `MotionConfig` import doesn't break the build.
4. Manual: reload `/`, `/products`, `/products/:slug` and confirm reduced-motion toggling behaves as expected post-C1. Note: the 5 Meta CAPI-Gateway `connect-src` console errors seen on the live site are **expected to still appear** post-A1 — that fix removes dead code, not the errors (see A1's "explicitly NOT done").
5. Independent adversarial review (Phase 12 of the mission) before calling this done.

No Lighthouse/axe/E2E run was performed as part of *this* implementation step beyond what's captured above — see `RESULTS.md` for exactly what was and wasn't run, and why (headless Lighthouse against a live production domain from this environment was not attempted; the changes are narrow enough that `tsc`/`vitest`/build + manual console verification is proportionate evidence for their risk level).
