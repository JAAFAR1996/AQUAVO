# AQUAVO GLOBAL PERFECTION CAMPAIGN — MASTER REPORT

**Branch:** `perfection-campaign/aquavo-global-level`
**Commander (lead agent):** Claude Code (Opus 4.8)
**Team:** 12 specialist subagents (`.claude/agents/`), isolated contexts, real parallel dispatch.
**Mission:** Make AQUAVO feel like a global premium aquarium brand — faster, calmer, safer, more trustworthy, more beautiful, more convincing on mobile — not a generic store and not an AI-generated template.

> **On "Agent Teams":** Claude Code 2.1.177 has no branded Agent-Teams mode. This used the real supported equivalent — project subagents dispatched as isolated-context agents, with lead-agent synthesis. Team definitions are durable under `.claude/agents/` (gitignored, local).

---

## 📚 DELIVERABLES (all written this campaign)
| File | Owner agent |
|---|---|
| `AQUAVO_GLOBAL_PERFECTION_MASTER_REPORT.md` | Lead (this file) |
| `AQUAVO_FILE_BY_FILE_AUDIT.md` | File-by-File Inspector |
| `AQUAVO_DELETE_CANDIDATES.md` | Root Cleanup Archaeologist |
| `AQUAVO_UI_UX_2026_RESEARCH.md` | UI/UX Research Lead |
| `AQUAVO_PREMIUM_REDIRECTION_PLAN.md` | Visual Direction Lead |
| `AQUAVO_PERFORMANCE_AND_SPEED_PLAN.md` | Speed & Performance Lead |
| `AQUAVO_CONVERSION_FLOW_AUDIT.md` | Conversion + Checkout Lead |
| `AQUAVO_TRACKING_AND_PIXEL_AUDIT.md` | Tracking & Ads Data Lead |
| `AQUAVO_COPY_AND_BRAND_AUDIT.md` | Content & Copy Lead |
| `AQUAVO_QA_AND_DEPLOYMENT_CHECKLIST.md` | Technical Risk & QA Lead |
| `reports/08_architecture.md` | Architecture Lead |
| `reports/09_accessibility_mobile.md` | Accessibility & Mobile Lead |
| `reports/01–07` | Phase-1 audit team |

---

## ✅ SAFE FIXES APPLIED THIS CAMPAIGN (Phase 2)
All verified: `tsc` clean on touched files, order-confirmation tests 6/6, `vite build` exit 0.

| Fix | File | Why |
|---|---|---|
| Removed all emoji (🛒🚚🎁💰🎉💎🥇🥈🥉) from the order-confirmation page | `client/src/pages/order-confirmation.tsx` | Flagship zero-emoji brand-rule violation; reads premium now |
| Shipping-progress made theme-aware (was `text-white/70` → invisible in light mode) | `client/src/components/cart/shipping-progress.tsx` | Visible in both themes |
| Guarded 2 unguarded confetti bursts behind `prefers-reduced-motion` | `client/src/pages/beginner-guide.tsx`, `client/src/components/products/product-comparison.tsx` | Calm/accessible, consistent with order-confirmation |

**Phase-1 safe batch (already committed `bec46e1` + verified by the tracking agent):** product-card rating guard, TikTok Purchase dedup, TikTok SPA PageView, TikTok pixel ID→env, guest order-confirmation fallback, removed fake viewer counter + broken interval, analytics `req.body ?? {}`.

---

## 🔭 WHAT EACH AGENT FOUND (top line)

1. **File-by-File Inspector** — ~140 keep / 8 improve / 7 merge / 6 delete-candidate / 5 dangerous / 7 unused / 3 duplicate-sets. **Dangerous:** `server/routes/simulation.ts` `GET /cultural-twin` is unguarded. **Unused:** `lib/mock-data.ts`, `server/services/claude-client.ts`, dead `components/reviews/` stack. **Duplicates:** two 404 pages, two temperature-guide pages (SEO duplicate-content risk).
2. **Root Cleanup** — ~155 SAFE-DELETE root files (grep-verified unreferenced); ~78 MB reclaimable (~60 MB is spreadsheets to ARCHIVE off-repo). **KEEP traps:** `vite-plugin-meta-images.ts`, `api/_html-template.ts`, `global.d.ts`, `migrations/*.sql`.
3. **Architecture** — #1 risk: **in-memory state in serverless** (OAuth CSRF map, product cache + setInterval) breaks on Vercel lambdas. Server typecheck disabled (`noCheck`) → **308 `as any`**. Clean core: single `registerRoutes()`, real storage layer, clean `shared/` contract. `gemini-ai.ts` is actually Groq (misnamed); `claude-client.ts` dead.
4. **UI/UX Research** — AQUAVO is genuinely top-half vs Baymard benchmark (exposed variants, shipping-on-PDP, honest COD checkout, reviews hidden until real). Verified two report-03 risks already fixed in code. Strongest remaining: zero-emoji transactional UI (now done), hero scrim, one honest stock line, justify the phone field, navbar IA, tame animation, inline return policy, PDP accordions.
5. **Visual Direction** — Thesis: **redirection is subtraction, not addition.** Kill the six infinite CSS animations on commerce surfaces (biggest template→premium jump + INP win), restrain the type scale (h1 9xl/800 → 5xl/700), spend color with discipline (coral = money only), premium card pass, first-5-seconds still hero, collapse six navbar variants into one.
6. **Performance** — Real Lighthouse: homepage Perf **59**, LCP **5.5s**, main-thread **7.8s**, total only 590 KiB → gap is hydration, not bytes. GLB models 12–13 MB each, uncompressed, on the PDP critical path. Top fixes: compress GLBs (gltf-transform → 1.5–3 MB), lazy-mount the 3D viewer, lazy-import the 277 KB model-viewer off non-3D PDPs, defer below-fold homepage sections, precompute VetRAG embeddings.
7. **Conversion + Checkout** — **Two divergent checkout implementations** (mobile `/checkout` page vs desktop `CheckoutDialog`) have drifted on shipping source/coupons/success UX, and **neither routes to `/order-confirmation/:id`** (confetti/loyalty/invoice effectively unseen). Dead "أبلغني عند التوفر" button. Cards add variant products at base price with no variant selected.
8. **Tracking** — Verified all three Phase-1 tracking fixes are **correct**. Remaining: AddToCart is PDP-only (cards/quick-add fire nothing — dead `ttqAddToCart` import in `cart-context.ts`); no server-side TikTok Events API; TikTok deferred 8s + prod-only loses early funnel; drop the hardcoded pixel-ID fallback.
9. **Copy & Brand** — No Arabic "visit us" copy exists (good), but **`ssr-meta.ts` publishes `openingHoursSpecification` + precise geo** → implies a walk-in showroom AND contradicts 24/7 (AQUAVO has no showroom). Unverifiable superlatives ("أول وأكبر"), hard "24 ساعة فقط" delivery claim, contradictory support hours (9am vs 10am), and emoji-as-voice across many pages.
10. **Accessibility & Mobile** — Strong overall (44px targets, 16px inputs, reduced-motion blocks, focus rings, Radix traps, skip link). **One real blocker:** the custom governorate dropdown in checkout (`customer-info-form.tsx`) is mouse-only — keyboard/SR users can't complete checkout.
11. **QA** — Client tsc 0 errors; vitest **1074/1075** (1 load-timeout, passes isolated); build OK. **CAUTION** to merge: dirty working tree (pre-existing CSP/navbar files) must be resolved; server `noCheck` means "0 errors" is hollow; E2E + secret rotation unverified.
12. **Security (Phase 1, still open)** — 🔴 git-tracked live secrets (`env.prod`, `.replit`, `script/inspect-gallery.ts`) — documented in `reports/02`, deferred by owner.

---

## 🗑️ SAFE TO DELETE vs DO NOT DELETE
**Safe to delete (evidence in `AQUAVO_DELETE_CANDIDATES.md` — ~155 files, none done yet, all need a `git rm` commit):** `old_app.tsx`, `tmp_*/fix_*/check_*/diag_*` scripts, root `*.py`, JSON/CSV/TSV dumps, ~40 root screenshots, Lighthouse JSONs, `*.log`, error dumps, stray files (`chunk`, `nul`, `New Text Document.txt`).
**Archive off-repo (don't destroy — business value):** pricing/supplier `.xlsx` (~60 MB), research/company/marketing dirs.
**DO NOT delete:** `vite-plugin-meta-images.ts` (imported by vite.config), `api/_html-template.ts` (build-generated), `global.d.ts`, `migrations/*.sql`, `deep-check.js` (tied to package.json `main`).
**Note:** `client/public/test_wood*.glb` are **untracked** (not deployed) — no repo action needed.

---

## 💡 STRONGEST UI/UX IDEAS (need your approval — `AQUAVO_PREMIUM_REDIRECTION_PLAN.md`)
1. **Subtraction over addition** — remove the six perpetual animations on commerce pages → instant premium + better INP.
2. **First-5-seconds homepage** — full-width still hero, scrim + safe zone, one CTA, fast grid below.
3. **Restrained type & color** — calmer headings; coral reserved for price/money, cyan for interaction only.
4. **Premium product cards** — solid surface, tighter radius, one badge, quiet hover.
5. **Unify the two checkouts** into one flow that routes to the rich confirmation page.
6. **Mobile sticky add-to-cart** that respects variant + quantity (base exists; refine).
7. **Navbar IA** — collapse ~10 items + six style variants into one calm bar + "أدوات" menu.
8. **Honest trust hierarchy** — one stock line, justified phone field, inline return policy, real-reviews-only pipeline.

---

## 🌍 WHAT WILL MAKE AQUAVO LOOK GLOBAL / FASTER / MORE TRUSTWORTHY
- **Global look:** kill perpetual motion, restrain type/color, premium cards, still hero, zero-emoji transactional UI (started), single calm navbar.
- **Faster:** compress GLB models (biggest win), lazy-mount/lazy-import the 3D viewer, defer below-fold homepage work, precompute embeddings, `/models/` cache header.
- **More trustworthy:** remove showroom-implying `openingHoursSpecification`/geo from SEO, drop unverifiable superlatives, fix the keyboard-inaccessible checkout dropdown, unify checkout so buyers see the real confirmation, real-reviews-only.

---

## ⚠️ WHAT NEEDS YOUR APPROVAL (strategic / risky)
- Secret remediation (rotate + untrack + history scrub).
- The redirection plan (animations, type scale, navbar, hero) — visual decisions.
- Checkout unification + routing to `/order-confirmation` (touches money flow — test carefully).
- GLB compression + lazy 3D (needs visual QA on each model).
- Root cleanup `git rm` of ~155 files + archiving spreadsheets.
- Guarding `simulation.ts /cultural-twin`; removing dead code (`claude-client.ts`, `mock-data.ts`, `components/reviews/`); de-duping the two 404 / two temperature-guide pages.
- SEO copy fixes in `ssr-meta.ts` (opening hours/geo/superlatives).

---

## 🧪 MANUAL TESTING
- Order-confirmation page: confirm no emoji, layout intact, guest fallback shows the order.
- Cart/checkout on mobile + desktop: confirm shipping copy visible in both themes.
- Reduced-motion OS setting: confirm confetti is suppressed on guide/compare/confirmation.
- Product grid: no "★ 0 (0)"; TikTok Purchase not double-counting on refresh.
- Checkout keyboard-only: the governorate dropdown is the known blocker (not yet fixed).

## 🏁 NEXT BEST ACTION (recommended order)
1. **You:** resolve secrets (rotate + untrack) — unblocks a clean merge.
2. **Quick safe wins (low risk, high signal):** SEO showroom/geo removal, fix checkout dropdown a11y, guard `/cultural-twin`, delete `test_wood`-class dead artifacts + dead code.
3. **Perf:** GLB compression + lazy 3D (biggest speed lever).
4. **Strategic visual pass:** animations + hero + navbar (approve the redirection plan first).
5. **Checkout unification** with full QA, then merge to `main` and promote to production.
