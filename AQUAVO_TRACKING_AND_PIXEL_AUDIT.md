# AQUAVO — Tracking & Pixel Audit (Updated)

Date: 2026-06-16 | Scope: Meta Pixel + Conversions API (CAPI), TikTok Pixel, event coverage, dedup, refresh/route behavior, value/currency, consent, server-side gap. Read-only. Builds on `reports/06_tracking_pixels.md`.

---

## 0. Verification of the applied campaign (commit bec46e1)

All three claimed fixes are present and **correct**:

1. **TikTok Purchase dedup (`ttq_px_<orderId>`)** — `tiktok-pixel.ts:280-288`. Mirrors Meta's localStorage guard. Fires once per real `orderId`, skips dedup gracefully in private-browsing (`catch` allows fire). **Correct.**
2. **TikTok SPA PageView via route hook** — `use-meta-pixel.ts:33` calls `ttqPage()` inside `useMetaPageView`'s `useEffect([location])`, alongside `trackMetaPageView()`. `ttqPage()` (`tiktok-pixel.ts:47-50`) is a safe no-op until the SDK loads. Initial load PageView is fired once inside `loadTikTokPixel()` (`third-party-analytics.ts:80`). The mount-time route-hook call no-ops (SDK not yet loaded due to defer), so there is **no double initial PageView**. **Correct.**
3. **TikTok pixel ID via `VITE_TIKTOK_PIXEL_ID`** — `third-party-analytics.ts:74-76`, with fallback to the historical hardcoded ID `D7OD1FBC77U8CJLLA610` if env unset. **Correct**, though the fallback still ships the live ID in the bundle (see 4.3).

---

## 1. What is installed

| Vendor | Mechanism | File | Loaded by |
|--------|-----------|------|-----------|
| Meta Pixel (browser) | `fbq` stub → `connect.facebook.net/.../fbevents.js` | `client/src/lib/meta-pixel.ts` | `useMetaPixelInit()` eager on mount |
| Meta Conversions API (server) | `POST /api/capi/event` → Graph API | `server/routes/capi.ts` | `sendCAPI()` inside every `metaTrack*` |
| TikTok Pixel (browser) | `ttq` stub → `analytics.tiktok.com/.../events.js` | `tiktok-pixel.ts` (wrappers) + `third-party-analytics.ts` (loader) | `DeferredThirdPartyAnalytics`, deferred ~8s, prod hosts only |
| TikTok Events API (server) | **NONE** | — | — |
| Metricool | `be.js` tracker | `third-party-analytics.ts:20-24` | same deferred loader |
| GA4 | `analytics.ts` (`trackPurchase` etc.) | `client/src/lib/analytics.ts` | out of scope |

Loading model:
- **Meta** inits eagerly (stub queues events, so early `metaTrack*` calls aren't dropped). PageView fired ONLY by `useMetaPageView` route hook — no double PageView.
- **TikTok** loads deferred (~8s, `requestIdleCallback`) and only on prod hosts. On localhost it never loads — all `ttq*` calls no-op.

---

## 2. Events coverage matrix (updated)

| Event | Meta (Pixel+CAPI) | TikTok (Pixel only) | Where fired | Status / Gap |
|-------|------|--------|-------------|------|
| PageView | Yes — route hook every nav | Yes — initial in loader + **now** every route via `ttqPage()` | meta `use-meta-pixel.ts:29`; ttq `use-meta-pixel.ts:33` + `third-party-analytics.ts:80` | **FIXED.** TikTok still loses first-8s page views (deferred load) — top-of-funnel only. |
| ViewContent | Yes | Yes | `product-details.tsx:188/196` | OK. value + IQD present. |
| AddToCart | Yes | Yes | `product-details.tsx:188(ttq)/196(meta)` — **PDP only** | **STILL WEAK.** Card/quick-add/`addItems` paths fire neither pixel. `cart-context.tsx:7` imports `ttqAddToCart` but **never calls it** (dead import). |
| AddToWishlist | Yes | Yes | `wishlist-context.tsx` | OK |
| Search | Yes | Yes | `search-results.tsx` | OK |
| InitiateCheckout | Yes | Yes | `checkout-dialog.tsx:131/140`; `checkout.tsx:75/84` | OK, value + IQD |
| AddPaymentInfo | — (no Meta event) | Yes | `checkout-dialog.tsx:208`; `checkout.tsx:137` | Acceptable (COD, no Meta standard) |
| PlaceAnOrder | — | Yes | `checkout-dialog.tsx:311`; `checkout.tsx:186` (submit-time) | TikTok-specific; distinct from Purchase |
| Purchase | Yes | Yes | Meta: submit `checkout-dialog.tsx:322` + confirm `order-confirmation.tsx:159`. TikTok: confirm `order-confirmation.tsx:148` only | **OK now.** Both deduped per `orderId`. See 4.1. |
| CompleteRegistration | Yes | Yes | `auth-context.tsx` | OK |

---

## 3. What's CORRECT (strengths)

- **Meta hybrid Pixel + CAPI** with shared `eventID` dedup is implemented correctly (`meta-pixel.ts` passes `{eventID}`, `sendCAPI` forwards same `event_id`).
- **Purchase dedup is now solid on both platforms.** Meta fires at submit AND confirmation but both use `orderNumber || id` and the `meta_px_<orderId>` guard → counts once even across reloads. TikTok `Purchase` fires only at confirmation, guarded by `ttq_px_<orderId>` → reload-safe. Submit-time TikTok uses `PlaceAnOrder` (a distinct event), so no collision with `Purchase`.
- **TikTok SPA PageView fixed** — route hook now keeps TikTok in sync with Meta.
- **TikTok pixel ID is env-driven** (`VITE_TIKTOK_PIXEL_ID`).
- **All monetary events carry `value` + `currency: 'IQD'`.** AddToCart/InitiateCheckout multiply by quantity correctly.
- `fbc`/`fbp` cookies captured and forwarded to CAPI; CAPI no-ops cleanly when env unset.
- `sendBeacon` used for CAPI reliability on page-close, with `fetch keepalive` fallback.
- Pixel calls wrapped in try/catch at submit-time so tracking never blocks checkout.
- CSP (prod) whitelists `connect.facebook.net`, `graph.facebook.com`, `analytics.tiktok.com`.

---

## 4. What's WEAK / still needs fixing

### 4.1 Purchase fires from two places — fragile, not broken (LOW-MEDIUM)
Correctness currently depends entirely on the `orderId` being identical at submit-time and on the confirmation page, AND on localStorage persisting between them. Both hold today (`orderNumber || id` used consistently). Risks:
- If localStorage is cleared/blocked between submit and confirmation, **Meta Purchase double-counts** (TikTok is safe because submit uses PlaceAnOrder, not Purchase).
- Submit-time Meta uses `serverTotal`; confirmation uses `full.total`. If these ever diverge, the deduped (first) value wins silently.
- **Recommendation:** fire Purchase from a single canonical location (confirmation page). The submit-time `metaTrackPurchase` is redundant given the confirmation handler.

### 4.2 AddToCart only tracked from PDP (MEDIUM — loses optimization data)
`metaTrackAddToCart` / `ttqAddToCart` fire only in `product-details.tsx`. Adds from product cards, quick-add buttons, and `addItems` (bundle add) in `cart-context.tsx` fire **nothing**. `cart-context.tsx` even imports `ttqAddToCart` but never invokes it — dead import.
- Impact: Meta/TikTok AddToCart audiences and optimization signals undercount real cart activity; AddToCart→Purchase funnels are skewed.
- **Recommendation:** fire AddToCart (Meta + TikTok) inside `cart-context.addItem()` so every entry path is covered; then remove the now-redundant PDP calls (or guard against double-fire if PDP uses `addItem`).

### 4.3 No TikTok Events API / server-side (MEDIUM — unmitigated signal loss)
Meta has full CAPI; TikTok has **browser pixel only**. No `/api/tiktok/event` exists. iOS ATT, ad-blockers, and the 8s deferred load all silently drop TikTok conversions with no server-side recovery. This is the single biggest remaining gap for TikTok ROAS accuracy.
- **Recommendation:** add a server-side TikTok Events API endpoint mirroring `capi.ts`, sharing the same `event_id`/`orderId` for dedup with the browser pixel, sending hashed phone/email + `external_id`.

### 4.4 TikTok deferred 8s + prod-only (MEDIUM — early-funnel loss)
TikTok loads ~8s post-mount and only on prod hosts. Fast converters and bouncers in the first 8s generate no TikTok PageView/ViewContent. Protects LCP but loses top-of-funnel. The new SPA `ttqPage()` route hook does NOT recover these — the stub queues only `methods`, and events fired before `ttq.load()` are not all replayed reliably.
- **Recommendation:** shorten defer or load on first interaction; the future Events API (4.3) would also backfill.

### 4.5 Pixel ID fallback still ships the live ID (LOW)
`VITE_TIKTOK_PIXEL_ID || "D7OD1FBC77U8CJLLA610"` — staging/preview builds without the env var still load the production pixel and pollute prod data. Env-parity achieved, but the hardcoded fallback defeats the "disable on staging" goal.
- **Recommendation:** drop the fallback; if `VITE_TIKTOK_PIXEL_ID` is unset, skip `ttq.load()` entirely.

### 4.6 Consent / privacy (LOW for Iraq, HIGH if EU traffic)
No consent gating. TikTok stub lists `holdConsent`/`grantConsent` but they're never called. Meta and CAPI fire unconditionally; CAPI sends `client_ip_address` + hashed phone with no consent check. Fine for the Iraqi market; a compliance gap if EU/UK visitors exist.

### 4.7 Match-quality enrichment (LOW — opportunity)
Meta CAPI Purchase forwards hashed phone only. Adding hashed email + `external_id` (user id) from the server would raise Meta/TikTok match rates. TikTok `ttqIdentify` exists but should be wired on login/register and Purchase.

### 4.8 Dead/duplicate checkout file (INFO)
`client/src/pages/checkout.tsx` carries a full duplicate of the dialog's tracking logic but is not the primary wired flow (`checkout-dialog.tsx` is). Keep in sync or remove to avoid divergent tracking.

---

## 5. Priority summary

| # | Issue | Severity | Effort |
|---|-------|----------|--------|
| 4.3 | No TikTok server-side Events API | MEDIUM | High |
| 4.2 | AddToCart PDP-only (cards/quick-add untracked; dead import) | MEDIUM | Low |
| 4.4 | TikTok 8s defer loses early funnel | MEDIUM | Med |
| 4.1 | Purchase dual-fire relies on localStorage+orderId | LOW-MED | Low |
| 4.5 | Hardcoded pixel-ID fallback pollutes staging | LOW | Low |
| 4.6 | No consent gating | LOW (IQ) | Med |
| 4.7 | Thin server match data (phone only) | LOW | Med |

---

## 6. Coverage matrix (one-line summary)

| Event | Meta | TikTok | Verdict |
|-------|------|--------|---------|
| PageView | route hook | initial + route hook (FIXED) | OK (TikTok loses first 8s) |
| ViewContent | yes | yes | OK |
| AddToCart | PDP only | PDP only | WEAK — non-PDP paths untracked |
| AddToWishlist | yes | yes | OK |
| Search | yes | yes | OK |
| InitiateCheckout | yes | yes | OK |
| AddPaymentInfo | — | yes | OK (COD) |
| PlaceAnOrder | — | yes | OK |
| Purchase | submit+confirm, deduped | confirm, deduped (FIXED) | OK (fragile, single-source preferred) |
| CompleteRegistration | yes | yes | OK |
| **Server-side TikTok** | n/a | **MISSING** | GAP |
