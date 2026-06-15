# AQUAVO — Tracking Pixels Audit (Report 06)

Date: 2026-06-15 | Scope: Meta/Facebook Pixel, TikTok Pixel, server-side Conversions API. Read-only analysis.

## 1. What is installed

| Vendor | Mechanism | File | Loaded by |
|--------|-----------|------|-----------|
| Meta Pixel (browser) | `fbq` stub injected in JS, loads `connect.facebook.net/en_US/fbevents.js` | `client/src/lib/meta-pixel.ts` | `useMetaPixelInit()` on app mount, `App.tsx:883` |
| Meta Conversions API (server) | `POST /api/capi/event` → Graph API v21.0 | `server/routes/capi.ts` | `sendCAPI()` inside every `metaTrack*` fn |
| TikTok Pixel | `ttq` stub, loads `analytics.tiktok.com/i18n/pixel/events.js`, hardcoded ID `D7OD1FBC77U8CJLLA610` | `client/src/lib/third-party-analytics.ts` + wrappers in `client/src/lib/tiktok-pixel.ts` | `DeferredThirdPartyAnalytics`, `App.tsx:201-221` |
| GA4 | separate (`trackPurchase` etc.) | `client/src/lib/analytics.ts` | not in this audit's scope |

Notes on loading:
- Meta Pixel inits eagerly on mount (correct — stub queues events so early `metaTrack*` calls aren't dropped). PageView fired only by `useMetaPageView()` route hook, NOT in `init` — avoids double PageView. Good.
- TikTok loads **deferred ~8s** after mount via `setTimeout` + `requestIdleCallback`, and **only on production hosts** (`isHostedAnalyticsOrigin()`: aquavoiq.com / *.vercel.app). On localhost TikTok never loads.

## 2. Event firing — mapping to code

| Event | Meta | TikTok | Where fired |
|-------|------|--------|-------------|
| PageView | `trackMetaPageView` | `ttq.page()` once at load | Meta: `use-meta-pixel.ts:28` (every route). TikTok: `third-party-analytics.ts:73` (single, no SPA route tracking) |
| ViewContent | `metaTrackViewContent` | `ttqViewContent` | `product-details.tsx:127,135` |
| AddToCart | `metaTrackAddToCart` | `ttqAddToCart` | `product-details.tsx:203,211` (PDP). Note: cart-context imports `ttqAddToCart` only |
| AddToWishlist | `metaTrackAddToWishlist` | `ttqAddToWishlist` | `wishlist-context.tsx:132-170` |
| Search | `metaTrackSearch` | `ttqSearch` | `search-results.tsx:124,129` |
| InitiateCheckout | `metaTrackInitiateCheckout` | `ttqInitiateCheckout` | `checkout-dialog.tsx:131,140`; `checkout.tsx:75,84` |
| AddPaymentInfo | — (no Meta event) | `ttqAddPaymentInfo` | `checkout-dialog.tsx:208`; `checkout.tsx:137` |
| PlaceAnOrder | — (Meta has no such event) | `ttqPlaceAnOrder` | `checkout-dialog.tsx:311`; `checkout.tsx:186` |
| Purchase | `metaTrackPurchase` | `ttqPurchase` | `order-confirmation.tsx:99,110` AND `metaTrackPurchase` at order-submit in `checkout-dialog.tsx:322` + `checkout.tsx:196` |
| CompleteRegistration | `metaTrackCompleteRegistration` | `ttqCompleteRegistration` | `auth-context.tsx:157-159` |

## 3. Coverage matrix

| Event | Fired? | Where (file:line) | Gap |
|-------|--------|-------------------|-----|
| PageView | Yes (both) | meta `use-meta-pixel.ts:28`; ttq `third-party-analytics.ts:73` | TikTok PageView fires ONCE on load only — no SPA route-change tracking (Meta does it right). TikTok PageView lost on first visit if user converts within 8s (deferred load). |
| ViewContent | Yes (both) | `product-details.tsx:127/135` | OK. value+IQD present. |
| AddToCart | Yes (both) | `product-details.tsx:203/211` | Only fires from PDP. AddToCart from product cards / quick-add / cart-context paths NOT tracked. |
| AddToWishlist | Yes (both) | `wishlist-context.tsx:132-170` | OK |
| Search | Yes (both) | `search-results.tsx:124/129` | OK |
| InitiateCheckout | Yes (both) | `checkout-dialog.tsx:131/140` | OK, value+IQD present |
| AddPaymentInfo | TikTok only | `checkout-dialog.tsx:208` | No Meta equivalent (acceptable — Meta has no standard AddPaymentInfo for COD). |
| PlaceAnOrder | TikTok only | `checkout-dialog.tsx:311` | TikTok-specific; fine. |
| Purchase | Yes (both) | `order-confirmation.tsx:99/110` + submit-time in dialog/checkout | **DOUBLE-FIRE risk** (see below). Meta protected by dedup; TikTok NOT. |
| CompleteRegistration | Yes (both) | `auth-context.tsx:157-159` | OK |

## 4. Findings

### 4.1 Double-firing of Purchase (HIGH)
`metaTrackPurchase` is called at **two moments**: at order submit (`checkout-dialog.tsx:322`, `checkout.tsx:196`) and again on the confirmation page (`order-confirmation.tsx:110`).
- **Meta is protected**: `metaTrackPurchase` dedups per `orderId` via `localStorage` key `meta_px_<orderId>` (`meta-pixel.ts:192-199`), plus `eventID` dedup across Pixel↔CAPI. So Meta Purchase counts once.
- **TikTok is NOT protected**: `ttqPlaceAnOrder` (submit) and `ttqPurchase` (confirmation) have no dedup guard. If a confirmation page is reloaded, `ttqPurchase` fires again every time → inflated TikTok Purchase + revenue. PlaceAnOrder and Purchase are distinct TikTok events so they don't collide with each other, but `ttqPurchase` itself is re-fireable on refresh.

### 4.2 TikTok Purchase value is correct currency but TikTok no server-side API (MEDIUM)
All TikTok events ship `currency: 'IQD'` and `value`. Good. But there is **no TikTok Events API (server-side)** — only browser pixel. Meta has full CAPI; TikTok has none. iOS/ad-blocker loss is unmitigated for TikTok.

### 4.3 TikTok Pixel ID is hardcoded (MEDIUM)
`third-party-analytics.ts:72` hardcodes `D7OD1FBC77U8CJLLA610`. Meta uses env (`VITE_META_PIXEL_ID`). TikTok ID should be env-driven for parity and to disable on staging.

### 4.4 TikTok deferred 8s + production-only (MEDIUM)
TikTok loads 8s after mount and only on prod hosts. Fast converters and bounce traffic in the first 8s have no TikTok PageView/ViewContent. This protects LCP but loses top-of-funnel signal. Meta loads eagerly so it's unaffected.

### 4.5 TikTok has no SPA route PageView (MEDIUM)
`ttq.page()` fires once at load only. Navigations within the SPA produce no further TikTok PageView. Meta correctly re-fires PageView per route via `useMetaPageView`.

### 4.6 Secrets committed to repo (HIGH — security, not tracking accuracy)
`.env` and `.env.production` contain **live `META_CAPI_TOKEN` values** committed to the repo (`.env.production` is staged as deleted `D` in git status but `.env` still holds a live token). TikTok client secret also present in `.env`/`.env.vercel`. These should be rotated and removed from version control. (Out of strict tracking scope but critical.)

### 4.7 Consent / GDPR (LOW for Iraq market)
No consent gating before pixels fire. TikTok stub lists `holdConsent/grantConsent` methods but they are never called. Meta fires with no consent check. For the Iraqi market this is low priority, but if EU traffic exists it is a compliance gap. CAPI sends `client_ip_address` + hashed phone unconditionally.

### 4.8 Positives
- Meta hybrid Pixel+CAPI with shared `eventID` dedup is implemented correctly (`meta-pixel.ts` passes `{eventID}`, CAPI forwards `event_id`).
- Iraqi phone normalization to `9647...` before SHA-256 hashing (`capi.ts:23-29`) is correct for Meta matching.
- `fbc`/`fbp` cookies captured and forwarded to CAPI.
- CSP (prod block, `security.ts:70-81`) whitelists `connect.facebook.net`, `graph.facebook.com`, `analytics.tiktok.com`. `img-src https:` covers pixel GIFs.
- CAPI gracefully no-ops when env unset (`capi.ts:42-45`).
- All events carry `value` + `currency: IQD`.

### 4.9 CSP dev/prod mismatch (INFO)
Dev CSP block (`security.ts:53/57`) omits `analytics.tiktok.com`. Irrelevant because TikTok only loads on prod hosts anyway, but worth noting.

### 4.10 Dead checkout file (INFO)
`client/src/pages/checkout.tsx` is not routed in `App.tsx` (only `checkout-dialog.tsx` and `order-confirmation` are wired). Duplicate tracking logic lives in an apparently unused page — keep them in sync or remove.

## 5. Recommendations

### SAFE (low risk, do now)
1. **Add TikTok Purchase dedup** in `ttqPurchase` mirroring Meta's localStorage `meta_px_<orderId>` pattern (key e.g. `ttq_px_<orderId>`). Fixes 4.1 TikTok inflation.
2. **Pick ONE Purchase fire location.** Fire Purchase only on `order-confirmation.tsx` (canonical, post-success) and remove the submit-time `metaTrackPurchase`/`ttqPlaceAnOrder` Purchase duplication, OR keep submit-time only and drop confirmation. Recommended: confirmation page only.
3. **Move TikTok Pixel ID to env** (`VITE_TIKTOK_PIXEL_ID`) for parity with Meta and to disable on staging (4.3).
4. **Add TikTok SPA PageView**: call `window.ttq?.page()` in the existing route hook alongside `trackMetaPageView` (4.5).
5. **Remove committed secrets** from `.env`/`.env.production`, rotate the leaked `META_CAPI_TOKEN` and TikTok secret, ensure `.env*` is gitignored (4.6).
6. **Track AddToCart from all add paths** (product cards / quick-add / cart-context), not just PDP (matrix gap).

### STRATEGIC (larger effort)
1. **Add TikTok Events API (server-side)** to mirror Meta CAPI — recover iOS/ad-blocker losses for TikTok. Reuse the `/api/capi/event` pattern; add `/api/tiktok/event` with `event_id` dedup shared with the browser pixel.
2. **Reduce TikTok 8s defer** to a smaller window or load on first interaction so early-funnel events aren't lost, while keeping LCP protection (4.4).
3. **Add a Meta `ViewCategory`/category-page ViewContent and Lead/Contact** events if running awareness campaigns.
4. **Consent management layer** using TikTok's `holdConsent`/`grantConsent` and a Meta gate if/when targeting EU traffic (4.7).
5. **Server-side enriched matching for TikTok/Meta**: forward hashed email + external_id (user id) on Purchase from server, not just phone, to raise match quality.

---

## Coverage matrix summary

| Event | Fired? | Where | Gap |
|-------|--------|-------|-----|
| PageView | Both | meta `use-meta-pixel.ts:28`; ttq `third-party-analytics.ts:73` | TikTok: once-only, no SPA route tracking, lost in first 8s |
| ViewContent | Both | `product-details.tsx:127/135` | none |
| AddToCart | Both | `product-details.tsx:203/211` | only PDP path; cards/quick-add untracked |
| AddToWishlist | Both | `wishlist-context.tsx:132-170` | none |
| Search | Both | `search-results.tsx:124/129` | none |
| InitiateCheckout | Both | `checkout-dialog.tsx:131/140` | none |
| AddPaymentInfo | TikTok only | `checkout-dialog.tsx:208` | no Meta equiv (acceptable) |
| PlaceAnOrder | TikTok only | `checkout-dialog.tsx:311` | TikTok-specific |
| Purchase | Both | `order-confirmation.tsx:99/110` + submit-time dialog/checkout | DOUBLE-FIRE: Meta deduped, TikTok NOT (refresh inflates) |
| CompleteRegistration | Both | `auth-context.tsx:157-159` | none |
