# AQUAVO Commerce Flow Audit — 05_commerce_flow

Read-only audit of cart, checkout, order, and product flows. Date: 2026-06-15.
Scope files reviewed: cart-context, cart-suggestions, checkout, orders route + storage,
product-details, product-card/top-selling, analytics beacons.

---

## 1. CART

**Files:** `client/src/contexts/cart-context.tsx`, `client/src/components/cart/cart-suggestions.tsx`,
`server/routes/products.ts` (cart-suggestions endpoint).

Findings:
- Guest/server cart split is handled cleanly. Guest cart in `syncStorage` (`cart-v2`), logged-in
  cart on server with merge-on-login (cart-context.tsx:120-187). Merge pushes local items then
  refetches; failures are non-fatal.
- `addItem` blocks price<=0 products with a clear "غير متوفر حالياً" toast (cart-context.tsx:208-219).
  `addItems` filters `Number(p.price) > 0` (cart-context.tsx:296). Good price=0 handling.
- Optimistic update + rollback on remove/update is correct (cart-context.tsx:388-498).
- **Cart suggestions co-purchase fallback: CORRECT.** `server/routes/products.ts:217-276`. Co-purchase
  map first; if empty, falls back to `getTrendingProducts()` filtered by `parseFloat(price)>0 && stock>0`
  and excluding items already in cart (lines 263-272). Matches the CLAUDE.md gotcha requirement.
- NOTE (SAFE): the server `cart-suggestions` correctly filters in-stock/price; the client
  `cart-suggestions.tsx` renders an empty price string when price<=0 (line 56-59) but since the
  server never returns such items, this is dead-defensive only.

No correctness bugs in cart.

---

## 2. CHECKOUT

**Files:** `client/src/pages/checkout.tsx`, `server/storage/order-storage.ts` (createOrderSecure),
`server/routes/orders.ts`.

Findings:
- **Payment = COD only: COMPLIANT.** No credit-card / gateway copy anywhere in checkout or
  `client/src/components/cart/**`. Primary CTA reads "الدفع عند الاستلام — تأكيد طلبي"
  (checkout.tsx:375); footer + confirmation show "الدفع عند الاستلام" / "الدفع نقداً عند الاستلام"
  (checkout.tsx:403, order-confirmation.tsx:366). Grep for credit|visa|mastercard|بطاقة returned
  nothing in commerce components.
- **Shipping = flat fee: COMPLIANT but split by governorate.** Checkout uses
  `BAGHDAD_SHIPPING` vs `OTHER_GOVERNORATES_SHIPPING` (checkout.tsx:236). Server authoritative fee
  comes from `settings.shipping_fee` with fallback 5000 (order-storage.ts:254-257). Confirm both
  client constants equal 5,000 IQD so client estimate matches server charge (see Issue C).
- **Server is authoritative on totals: GOOD.** `createOrderSecure` ignores the client-sent `total`,
  recomputes from locked product rows (`lockProductForUpdate`), re-validates stock & variant stock,
  re-parses positive prices, re-applies coupon with expiry/min/maxUses checks
  (order-storage.ts:172-280). Client `total` field (checkout.tsx:169) is decorative only. No price
  tampering risk.
- Coupon `else` branch shows a hard-coded shipping message for unknown coupon types
  (checkout.tsx:273) — harmless but odd copy for a non-shipping coupon type.
- Cashback redemption requires logged-in user — enforced both in route (orders.ts:119-124) and
  storage (order-storage.ts:168-170). Good defense in depth.

---

## 3. ORDER FLOW

**Files:** `server/routes/orders.ts`, `server/storage/order-storage.ts`,
`client/src/pages/order-confirmation.tsx`, `client/src/pages/order-tracking.tsx`.

Findings:
- **Public tracking is PII-safe.** `GET /track/:orderNumber` (orders.ts:343-393) returns only
  id/orderNumber/status/total/dates/estimatedDelivery/items — no name/phone/address. Defined BEFORE
  `/:id` to avoid route shadowing (correct).
- **`GET /:id` ownership: CORRECT.** requireAuth + `reqUser.role !== 'admin' && order.userId !== reqUser.id`
  → 403 (orders.ts:396-411). Guest orders cannot be read here.
- **`getOrder` UUID-or-orderNumber lookup is SAFE.** `orders.id` is `text` (shared/schema.ts:131),
  not a uuid column, so querying by a non-UUID orderNumber on the id column does not throw; it falls
  through to the orderNumber lookup (order-storage.ts:84-91). No cast error.
- BigInt/Decimal serialization on order creation is handled with the exact CLAUDE.md replacer plus a
  fallback object (orders.ts:222-235). Good.
- **Issue A (MEDIUM — guest order confirmation shows empty data):** `order-confirmation.tsx:89-92`
  fetches `/api/orders/${orderId}` — the **authenticated** `/:id` route. Guest checkouts have no
  session, so this 401s; the page then renders the `orderData = null` fallback (order-confirmation.tsx:142-156)
  showing only a sliced ID, no items/total/loyalty. Checkout's own inline success view
  (checkout.tsx:282-313) is fine, but any navigation to `/order-confirmation/:id` for a guest is degraded.
  The PII-safe `/track/:orderNumber` endpoint should be used as a fallback for guests.

---

## 4. PRODUCT PAGES

**Files:** `client/src/pages/product-details.tsx`, `client/src/components/products/product-card.tsx`,
`server/storage/product-storage.ts` (getTopSellingProducts).

Findings:
- **Top-selling filters CORRECTLY.** `getTopSellingProducts` applies `gt(products.stock, 0)` on both
  bestSellers and productOfWeek queries (product-storage.ts:536, 540) and the empty-fallback query
  (line 550), plus in-memory `parseFloat(price)>0` filters (lines 545, 553). Matches CLAUDE.md gotcha.
- **product-details price=0 / stock handling: GOOD.** `hasPrice` gate (product-details.tsx:178),
  `isOutOfStock` (line 168), add-to-cart and quantity controls gated on `hasPrice && displayStock>0`
  (lines 600, 621, 677, 683). Out-of-stock and coming-soon states are distinct.
- Quantity cap uses `product.stock` not `displayStock` in one handler (product-details.tsx:244) — for
  variant products the cap should be the variant stock. Minor (SAFE) inconsistency; server re-validates
  variant stock so it cannot oversell.

No correctness bugs on product pages.

---

## 5. BUG HUNT (BigInt / req.body / auth-ownership)

- **BigInt/Decimal:** Order POST sanitizes before res.json (orders.ts:222-235). Other order responses
  (`enrichOrderItems`, track) return Drizzle numeric as strings, serialized fine. No raw BigInt leak found.
- **req.body null on sendBeacon: SAFE.** All beacon callers send
  `new Blob([payload], { type: "application/json" })` (App.tsx:1006-1008, 1131-1138; meta-pixel.ts:326),
  so Content-Type is set and the JSON parser populates `req.body`. `capi/event` and
  `analytics/presence*` already use `req.body ?? {}`. `track-visit`/`update-visit`
  (analytics.ts:512, 562) destructure `req.body` without `?? {}`, but both are wrapped in try/catch
  returning `{ok:true}`, so a missing body cannot crash. Issue B below is hardening only.
- **Auth/ownership:** Order read paths correct (see §3). Order POST allows guest orders by design
  (userId nullable) — IP ban check + rate limiter (orderLimiter 10/hr) guard abuse (orders.ts:76-102).

---

## RECOMMENDATIONS

### SAFE (low-risk hardening)
- S1. order-confirmation.tsx: for guests (or on 401), fall back to `GET /api/orders/track/:orderNumber`
  so the confirmation page shows items/total instead of an empty shell. (Fixes Issue A.)
- S2. analytics.ts:512 & :562 — use `(req.body ?? {})` for consistency with the other beacon routes.
  (Issue B; defensive only, currently caught.)
- S3. product-details.tsx:244 — cap quantity on `displayStock` (variant-aware) rather than
  `product.stock`.
- S4. checkout.tsx:273 — clean up the coupon-type `else` copy (currently a shipping message for an
  unrelated coupon type).

### STRATEGIC (product/architecture)
- T1. Verify `BAGHDAD_SHIPPING` and `OTHER_GOVERNORATES_SHIPPING` in `client/src/lib/constants/shipping.ts`
  both equal 5,000 IQD to honor the documented flat-fee policy AND match the server's single
  `settings.shipping_fee` (order-storage.ts:256). If the server only stores one flat fee but the client
  shows a per-governorate estimate, the displayed estimate can diverge from the charged total. (Issue C.)
- T2. cart-context saveCart() has a no-op branch for logged-in users (lines 193-198) and relies on each
  mutator hitting the API — consider documenting/removing to avoid future confusion.

---

## PRIORITIZED ISSUE LIST (highest priority first)

1. **[MEDIUM — UX/correctness] Issue A:** Guest order-confirmation page fetches the auth-only
   `/api/orders/:id`, 401s, and renders an empty confirmation (no items/total). Use the PII-safe
   `/track/:orderNumber` fallback. (order-confirmation.tsx:89-92, 142-156)
2. **[LOW — correctness] Issue C:** Client shipping estimate is per-governorate
   (`BAGHDAD_SHIPPING` / `OTHER_GOVERNORATES_SHIPPING`) while server charges a single
   `settings.shipping_fee` (fallback 5000). Confirm constants == 5,000 to avoid estimate vs charged
   mismatch and to honor the flat-fee policy. (checkout.tsx:236; order-storage.ts:254-257)
3. **[LOW — hardening] Issue B:** `analytics.ts` track-visit/update-visit destructure `req.body`
   without `?? {}`. Currently safe (try/catch), but inconsistent with other beacon routes.
   (analytics.ts:512, 562)
4. **[LOW — minor] Issue D:** product-details quantity cap uses base `product.stock` instead of
   variant `displayStock`. Server re-validates, so no oversell. (product-details.tsx:244)
5. **[NIT] Issue E:** Misleading coupon-type `else` copy in checkout. (checkout.tsx:273)

**No high/critical correctness bugs found.** Server-side order creation (price recompute, row locking,
stock revalidation, coupon revalidation), BigInt sanitization, public-tracking PII safety, order
ownership checks, top-selling stock/price filters, and cart-suggestions trending fallback are all
implemented correctly per the CLAUDE.md gotchas.
