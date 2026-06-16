# AQUAVO — Conversion + Cart/Checkout/Order Flow Audit

**Scope:** Product cards → PDP → cart drawer → checkout (dialog + page) → COD submit → confirmation.
**Constraint:** No fake urgency, no fake scarcity, no fake reviews. Builds on report 05 (does not repeat 3D/viewer-counter findings).
**Mode:** Read-only. No source modified.
**Tags:** SAFE = low-risk, copy/markup-level, ship now. STRATEGIC = needs design/product decision or backend coordination.

---

## 0. The headline problem: TWO divergent checkout flows

There are **two separate checkout implementations** that are silently inconsistent:

- **Desktop** opens `CheckoutDialog` (`components/cart/checkout-dialog.tsx`) — a modal.
- **Mobile** routes to `/checkout` (`pages/checkout.tsx`) — a full page.

Branch point: `navbar.tsx:427-434`
```
if (isMobile) setLocation("/checkout"); else setTimeout(() => setIsCheckoutOpen(true), 150);
```

They have drifted:

| Behavior | Dialog (desktop) | Page (mobile) |
|---|---|---|
| Shipping fee source | `/api/settings/shipping` (admin-configurable, fallback 5000) — `checkout-dialog.tsx:86-90` | hardcoded `BAGHDAD_SHIPPING`/`OTHER_GOVERNORATES_SHIPPING` constants — `checkout.tsx:236-237` |
| Success UX | closes dialog → opens `InvoiceDialog` via `handleCheckoutComplete` (`navbar.tsx:123-134`) | in-page success screen with WhatsApp confirm CTA (`checkout.tsx:282-314`) |
| `OrderSummary` line items | not passed `cartItems` → **no per-item list shown** (`checkout-dialog.tsx:452`) | passes `cartItems` → shows item list (`checkout.tsx:362`) |
| `credentials: "include"` on coupon | **missing** (`checkout-dialog.tsx:382`) | present (`checkout.tsx:252`) |

This means desktop and mobile customers literally get different summaries, different shipping logic, and different post-order screens. If admin changes the shipping fee, **only desktop reflects it.** This is the single biggest correctness/trust risk in the flow.

**Fix (STRATEGIC):** Collapse to one shared checkout component used by both, parameterized by container (modal vs page). At minimum, unify shipping-fee source and pass `cartItems` to `OrderSummary` in both. Today the constants make both resolve to 5000 so the bug is *latent* — it activates the moment the admin setting diverges from the constant.

---

## 1. Product Card (`components/products/product-card.tsx`)

### 1.1 Add-to-cart silently ignores variants — SAFE/STRATEGIC
`handleAddToCart` (line 47-68) calls `addItem(product)` with no variant. For `hasVariants` products the card shows "من {minPrice}" (line 185) but the button adds the **base product at base price with no variant chosen**. The user lands a wrong/ambiguous line in the cart.
**Fix:** For `hasVariants` products, the card CTA should read "اختر الخيار" and link to PDP instead of adding directly (STRATEGIC: needs the button to branch on `product.hasVariants`). SAFE interim: change button label to "عرض الخيارات" when `hasVariants`.

### 1.2 Low-stock badge is the only urgency, and it's real — keep, but copy is bare
Line 87-91: `متبقي {stock} فقط` when `stock <= 4`. This is legitimately data-driven (not fake), good. No change needed beyond confirming `stock` is accurate.

### 1.3 `originalPrice` strike shown on card but no savings % — SAFE
Line 173-177 shows strikethrough original price. No "وفّر X%" badge. Showing the saved amount/percent is a proven, honest conversion lever (the discount is real).
**Fix (SAFE):** Add `وفّر {formatPrice(originalPrice - price)}` near the strike price.

### 1.4 A/B test on button text but no visible variant assignment safety — note only
Lines 35-38 pull `EXPERIMENTS.ADD_TO_CART_BUTTON`. Fine. Just confirm SSR/hydration doesn't flash variant A→B.

### 1.5 Quick actions hidden on mobile — STRATEGIC
Line 126: `hidden sm:flex`. On mobile there is **no wishlist / quick-view / compare** affordance on the card at all. Mobile is the majority of Iraqi traffic. Wishlist especially is a soft-conversion capture.
**Fix (STRATEGIC):** Show at least a wishlist heart on mobile cards (top-left corner, always visible).

---

## 2. PDP (`pages/product-details.tsx`)

### 2.1 Sticky mobile add-to-cart already exists — but incomplete (P1.8, line 999-1015)
Good: there is a sticky bar. Gaps:
- It has **no quantity** and **no variant indicator**, so a user who picked variant/qty above gets a bar that ignores both visually (it does call the same `handleAddToCart` so it respects state — but the bar shows only base `product.name`, not the selected variant label). Confusing for variant products.
- It uses `displayPrice` correctly (line 1003) — good.
- No "added" confirmation state on the sticky button (the main button flips to green "تمت الإضافة!" at line 622, the sticky one never does).
**Fix (SAFE):** Mirror the `isAddedToCart` state into the sticky button; show selected variant label + qty in the sticky text. See proposal in §7.

### 2.2 "أبلغني عند التوفر" button does nothing — STRATEGIC (trust leak)
Line 668-673: out-of-stock products render a "أبلغني عند التوفر" (Notify me) button with **no onClick handler**. Clicking does nothing. This is worse than not having it — it signals a dead store.
**Fix:** Either wire it to a back-in-stock email/WhatsApp capture, or replace with a WhatsApp "اسأل عن التوفر" link (reuses existing `WHATSAPP_URL`). SAFE interim: make it a WhatsApp deep link.

### 2.3 Stock messaging threshold mismatch card vs PDP — SAFE
Card uses `<= 4` (line 87); PDP uses `<= 5` (line 515). Cosmetic inconsistency; align both.

### 2.4 Rating block shows `rating/5` in specs tab even with 0 reviews — SAFE
Specs table (line 837-839) always renders `التقييم: {rating}/5`. With no reviews this shows "0/5" which actively *hurts* trust. The hero rating is correctly gated by `reviewCount > 0` (line 446) — the specs row is not.
**Fix (SAFE):** Gate the specs `التقييم` row on `reviewCount > 0`.

### 2.5 Trust signals are good but generic; warranty copy is vague — SAFE
Quick-info card (line 676-712): توصيل 24h / استبدال المعيب / ضمان الجودة. Solid and honest. "ضمان الجودة / منتج أصلي" is fine. Consider linking "استبدال المعيب" to the actual return policy (currently only the shipping tab explains the 48h window — line 904-909). Users see the promise but not the terms inline.
**Fix (SAFE):** Make "استبدال المعيب" tile a link/anchor to the shipping&returns tab.

### 2.6 Description progressive disclosure at 220 chars is aggressive — SAFE
Line 554: truncates at 220 chars. For a considered purchase (heaters/filters) the spec-rich description is a selling tool. 220 is short.
**Fix (SAFE):** Raise to ~400, or keep collapse but expand-by-default on desktop.

### 2.7 `handleShare` text uses raw `toLocaleString` not `formatPrice` — SAFE (minor)
Line 239: shares price as `…toLocaleString('en-US') د.ع` — inconsistent with the IQD formatting used everywhere else.

### 2.8 Reviews tab always invites "شاركنا تجربتك" — fine, but no review submission visible
Line 876-881 shows an invite alert. Confirm `ProductReviews` actually has a submit path; if reviews can't be left, this is a dead promise. (Not inspected — flag for verification.)

---

## 3. Cart drawer (`navbar.tsx:346-441`)

### 3.1 `ShippingProgress` is invisible in light mode — SAFE (bug)
`components/cart/shipping-progress.tsx` hardcodes `text-white/70`, `bg-white/[0.03]`, `border-white/10`. In light theme this is white text on white → **invisible**. The one piece of delivery reassurance in the cart vanishes for light-mode users.
**Fix (SAFE):** Use theme tokens (`text-muted-foreground`, `bg-muted/30`, `border-border`).

### 3.2 Cart drawer has no subtotal-vs-total / no delivery line — SAFE
Line 422-426 shows only "المجموع: {totalPrice}" (subtotal). The 5,000 delivery isn't surfaced until checkout. Surfacing it here (honestly, as a known flat fee) reduces checkout-step sticker shock.
**Fix (SAFE):** Add a muted "+ 5,000 د.ع توصيل · الدفع عند الاستلام" line under the subtotal.

### 3.3 No item count / no "متابعة التسوق" — minor SAFE
Drawer title is static "سلة التسوق" with no count. Add `({totalItems})`.

### 3.4 Quantity stepper has no max guard in drawer — STRATEGIC
Line 396-404: `updateQuantity(item.id, item.quantity + 1)` with no stock cap (PDP caps at `displayStock`, drawer does not). A user can drive qty past stock and only discover it at order submit (server rejection → generic error toast). 
**Fix:** Pass stock into cart items and cap in `updateQuantity`, or validate before submit with a clear message.

### 3.5 Empty-cart state is good — keep
Line 354-361: icon + "تصفح المنتجات" link. Clean.

---

## 4. Checkout (dialog + page)

### 4.1 Coupon fetch missing `credentials: "include"` in dialog — SAFE (bug)
`checkout-dialog.tsx:380-384` omits `credentials: "include"` (page version has it, `checkout.tsx:252`). User-scoped or session-bound coupons may fail on desktop only.

### 4.2 Order summary in dialog shows no line items — SAFE
`checkout-dialog.tsx:452` doesn't pass `cartItems`, so desktop users review a total with no itemization before paying. The component fully supports it (`order-summary.tsx:35-52`).
**Fix (SAFE):** Pass `cartItems={cartItems}`.

### 4.3 Emojis in checkout/confirmation copy violate brand rule — SAFE
CLAUDE.md rule #7: zero emoji. Present:
- `confirmation-view.tsx`: 💡 (line 191,205), 🌟 (197), 💰 (221)
- `order-confirmation.tsx`: 🛒 (367), 🚚 (397), 🎁 (409), 💰 (419), 🎉/💎/🥇/🥈/🥉 (455)
**Fix (SAFE):** Strip emojis; use lucide icons already imported.

### 4.4 "تقريب لأقرب 250 د.ع" adds money silently — STRATEGIC (trust)
`order-summary.tsx:22` and `confirmation-view.tsx:59` round the total **up** to the nearest 250 IQD and add the difference to what the customer pays. It's labeled, and registered users get it back as credit — but guests pay the rounding with only a "register to get it back" nudge (`order-summary.tsx:117-119`). Charging guests extra (even ~250 IQD) for not registering reads as a dark pattern and can erode trust at the most sensitive moment.
**Fix (STRATEGIC):** Either round *down* (absorb it), or round to nearest (not always up), or make the rounding genuinely optional. At minimum keep the label prominent — but reconsider charging guests the delta.

### 4.5 Phone is the only contact captured — no email for guests — STRATEGIC
Guests provide name/phone/governorate/address. No email → no order-status email, no abandoned-cart follow-up, no back-in-stock. Phone-only is normal in Iraq, but an **optional** email field unlocks lifecycle marketing.
**Fix (STRATEGIC):** Add optional email field; use for order confirmation + recovery.

### 4.6 No abandoned-checkout recovery — STRATEGIC
`InitiateCheckout` pixels fire (good for ads) but there's no on-site save (e.g. persist customerInfo to localStorage so a returning user doesn't re-type). Re-entry from a dropped checkout starts blank.
**Fix (SAFE/STRATEGIC):** Persist `customerInfo` to localStorage on change; rehydrate on mount (the auth auto-fill already does this for logged-in users — extend to guests).

### 4.7 Governorate dropdown is custom (good) but no default & buried delivery time — SAFE
`customer-info-form.tsx` searchable dropdown is solid. But delivery copy ("24 ساعة") doesn't appear next to the governorate choice — surface "يوصل خلال 24 ساعة لكل المحافظات" right under the picker to reinforce speed at decision time.

### 4.8 Single generic error toast on submit failure — STRATEGIC
Both flows (`checkout-dialog.tsx:347-354`, `checkout.tsx:222-228`) catch all errors into one toast. A stock-conflict, a coupon expiry, and a network drop all look identical to the user, with the modal/page still full. No inline field-level recovery, no retry button.
**Fix:** Map known server error codes to specific inline messages (esp. out-of-stock → show which item).

### 4.9 No loading skeleton on the submit button beyond text — SAFE
`confirmation-view.tsx:259` shows "جاري المعالجة..." — fine, but add a spinner icon for clarity on slow Iraqi mobile connections.

### 4.10 `agreed` checkbox required but unchecked submit just silently no-ops — SAFE
`handleConfirmOrder` returns early if `!agreed` (`checkout-dialog.tsx:222`) and the button is `disabled` (`confirmation-view.tsx:257`). Because the button is disabled, a user who doesn't notice the checkbox sees a dead button with no explanation.
**Fix (SAFE):** Keep button enabled; on click without `agreed`, flash/scroll-to the checkbox with a hint.

---

## 5. Confirmation (`pages/order-confirmation.tsx` + in-page success)

### 5.1 Guest fallback added this campaign — verified good
Line 129-140: authed `/api/orders/:id` then PII-safe `/api/orders/track/:id` fallback. Solid — guests now see a real confirmation, not an empty page.

### 5.2 Two different success experiences (see §0) — STRATEGIC
Mobile `/checkout` shows an inline success screen (`checkout.tsx:282`) and never navigates to `/order-confirmation/:id`; desktop opens `InvoiceDialog`. So the rich confetti/loyalty confirmation page (`order-confirmation.tsx`) is only reached via direct link / tracking — **neither checkout flow routes to it on success.** That's a large amount of good post-purchase UX (confetti, loyalty rewards, invoice, tracking CTA) that most buyers never see.
**Fix (STRATEGIC):** Route both flows to `/order-confirmation/:id` on success.

### 5.3 Confetti is good; gated on reduced-motion — keep
Line 88-119. Correct accessibility gating.

### 5.4 Post-purchase has no cross-sell / "أكمل حوضك" — STRATEGIC
Confirmation page ends with tracking/invoice/home buttons. No recommendations. Post-purchase is prime for accessory cross-sell (honest, useful).
**Fix (STRATEGIC):** Add a "يكمّل طلبك" recommendation row (reuse existing `RecommendationsSection`/trending).

---

## 6. Cross-cutting

- **Currency formatting:** mostly `formatIQD`/`formatPrice`; one raw `toLocaleString` in PDP share (§2.7).
- **Stock truth source:** card/PDP/drawer/submit each validate stock differently; only the server is authoritative, surfaced as a generic toast. Centralize.
- **Trust strip:** checkout *page* has a nice footer trust strip (`checkout.tsx:399-427`); the *dialog* has none. Add equivalent to dialog.

---

## 7. Mobile sticky add-to-cart — proposal

A sticky bar already exists (`product-details.tsx:999-1015`). Upgrade it rather than rebuild:

**Current gaps:** no qty, no variant label, no "added" feedback, no quick "go to cart".

**Proposed (STRATEGIC, but low-risk — single component, mobile only):**
```
[ price + selected variant label ]   [ − qty + ]   [ أضف للسلة → ]
```
- Show `selectedVariant?.label` next to name so variant buyers see what they're adding.
- Mirror `isAddedToCart`: after add, button flips to "تمت الإضافة ✓" then to "اذهب للسلة" (opens drawer) for ~4s — captures the next step while intent is hot.
- Include the compact qty stepper (reuse the one at line 589-611) so users don't scroll up.
- Respect `safe-bottom` (already present) and keep `z-50` below any open dialog.
- Hide when the in-view main CTA is on screen (IntersectionObserver) to avoid double CTAs — optional polish.

This is the highest-ROI mobile change: it keeps price + CTA + variant + qty persistently in thumb reach on the longest page in the funnel.

---

## TOP 12 CONVERSION / FRICTION FINDINGS (priority order)

1. **Two divergent checkout flows (mobile page vs desktop dialog)** drift on shipping source, line items, coupon credentials, and success UX — latent shipping-fee bug + inconsistent trust. (§0) STRATEGIC
2. **Neither checkout flow routes to the rich `/order-confirmation` page** — confetti, loyalty rewards, invoice, and tracking CTA are effectively dead post-purchase UX. (§5.2) STRATEGIC
3. **"أبلغني عند التوفر" button is dead** (no handler) — signals a broken store on every out-of-stock PDP. (§2.2) STRATEGIC
4. **`ShippingProgress` is invisible in light mode** (hardcoded white text) — the cart's only delivery reassurance disappears. (§3.1) SAFE
5. **Rounding-up charges guests extra IQD** with only a "register to get it back" nudge — dark-pattern risk at the payment moment. (§4.4) STRATEGIC
6. **Product card adds variant products at base price with no variant chosen** — wrong/ambiguous cart lines. (§1.1) STRATEGIC
7. **Desktop order summary shows no line items** + **coupon fetch missing `credentials:"include"`** — review-before-pay gap and coupon failures on desktop only. (§4.2, §4.1) SAFE
8. **Brand-violating emojis** throughout checkout/confirmation copy (rule #7). (§4.3) SAFE
9. **No email captured for guests** → no order email, no abandoned-cart/back-in-stock lifecycle. (§4.5) STRATEGIC
10. **Mobile cards expose no wishlist/quick-view** (`hidden sm:flex`) — zero soft-conversion capture for the majority audience. (§1.5) STRATEGIC
11. **Sticky mobile add-to-cart ignores variant label/qty and has no added-state** — confusing for variant buyers; misses the post-add next step. (§2.1, §7) SAFE→STRATEGIC
12. **Generic catch-all error toast on order submit** (esp. out-of-stock) with no inline recovery + disabled-button-with-no-explanation on terms checkbox. (§4.8, §4.10) SAFE→STRATEGIC

Honorable mentions: specs tab shows "0/5" rating with no reviews (§2.4); cart drawer hides the 5,000 delivery until checkout (§3.2); no honest "وفّر X%" on discounted cards (§1.3); drawer quantity has no stock cap (§3.4); no abandoned-checkout localStorage persistence for guests (§4.6); post-purchase has no cross-sell (§5.4).
