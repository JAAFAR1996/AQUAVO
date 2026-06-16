# AQUAVO — UI/UX 2026 Global Research & Screen-by-Screen Audit (Deep Pass)
**Author:** UI/UX Global Research Lead · **Date:** 2026-06-16
**Builds on** `reports/03_uiux_and_research.md` and `reports/07_premium_direction_proposal.md` — this pass does **not** repeat them. It goes screen by screen, verifies which report-03 risks are already fixed in code, and pulls fresh 2026 patterns with numbers.
**Evidence base:** repo screenshots (`audit-*.png`, `cro-*.jpeg`), `client/src` source, and cited web research.
**Method:** extract *principles/patterns* from global standards — never copy competitor designs. Brand rules enforced throughout: no physical store, no fake numbers/urgency/reviews/viewer counters, zero emoji, calm premium Iraqi aquarium feel.

---

## STATUS SINCE REPORT 03 — what is already fixed (verified in code)
Two of the highest-leverage report-03 risks have shipped, so this pass treats them as closed and moves on:

- **R1 (empty review widgets on cards) — FIXED.** `product-card.tsx:195` now guards `{(product.reviewCount ?? 0) > 0 && (...)}`. The "0 ★ (0)" wall is gone. *Note:* screenshots `cro-02`/`cro-09` still show "(0) ★" because they predate the fix — the live code is correct. Do not re-flag.
- **R4 (no sticky mobile add-to-cart) — FIXED.** `product-details.tsx:1000-1015` renders a `fixed bottom-0 … md:hidden` bar with price + name + "أضف للسلة", gated on `hasPrice && !isOutOfStock`, with `safe-bottom` inset. This is exactly the Baymard/Mobiloud mobile pattern.
- **Shipping honesty — confirmed clean.** `shipping-progress.tsx` states the flat 5,000 IQD fee; there is **no** fake "spend X more for free shipping" gamification. Correct for AQUAVO's flat-fee model.

Still open from report 03: emoji in transactional copy (D5), navbar clutter + unlabeled icons (R5/R8), double-stock indicator on PDP (R2), over-animation (R3), hero scrim (R6). Those are carried into the screen-by-screen below with deeper specifics.

---

## PART A — 2026 Global Standards (patterns + principles, cited)

### 1. The baseline is low — "decent" PDP UX is rare
Baymard's 2026 benchmark: only **48% of desktop** and **38% of mobile** sites reach "decent or better" product-page UX; **67% hide shipping cost** on the PDP, **57% use dropdowns instead of button selectors** for variants, **78% ship unstructured descriptions**. Meeting these basics already puts a store in the top half.
Source: [Baymard — Product Page UX 2026](https://baymard.com/blog/current-state-ecommerce-product-page-ux)

### 2. Variant selectors must be exposed buttons, not dropdowns
Button-style variant pickers that show availability up front beat hidden dropdowns. 42% of users judge size/spec from the selector + imagery. *Pattern: expose options, show stock state per option.*
Source: [Baymard](https://baymard.com/blog/current-state-ecommerce-product-page-ux)

### 3. Show total/scale + return policy on the PDP itself
67% omit shipping on the PDP and 44% bury the return policy — yet **60% of users look for return info on the product page**. Surface cost + returns inline, not only at checkout. For physical goods, "scale" cues (size reference) reduce returns.
Source: [Baymard](https://baymard.com/blog/current-state-ecommerce-product-page-ux)

### 4. Mobile-first is the default surface (~60% of sales)
Mobile is ~60% of 2026 ecommerce. Design the thumb path first: swipeable gallery with a position indicator ("3/1"), sticky bottom buy bar, large tap targets. Mobile PDP UX is *worse* than desktop industry-wide (38% decent) — a real differentiator.
Sources: [Salesforce checkout 2026](https://www.salesforce.com/commerce/online-payment-solution/checkout-guide/), [Mobiloud PDP 2026](https://www.mobiloud.com/blog/ecommerce-product-detail-page-best-practices), [The Good — mobile checkout](https://thegood.com/insights/mobile-checkout-best-practices/)

### 5. Quiet luxury = restraint, whitespace, one focal point
2026 premium direction: generous whitespace as "crafted breathing room," restrained/streamlined palette, refined sans-serif used sparingly at the right scale, **one bold focal point per view** with everything else calm. "The quietest designs make the loudest impact." Over-animation and glow read as generic/AI.
Sources: [Figma — Web Design Trends 2026](https://www.figma.com/resource-library/web-design-trends/), [Envato — Font Trends 2026](https://elements.envato.com/learn/font-trends), [Digital Silk — Minimalist Web Design 2026](https://www.digitalsilk.com/digital-trends/minimalist-web-design-trends/)

### 6. Luxury CTA = high-contrast, calm, single
Farfetch-class pattern: one clean high-contrast primary CTA per view that stands out against a minimal page; the path to purchase is "elegantly simple and deeply functional" without visual clutter. Frictionless ≠ stripped — it should still feel premium.
Source: [KN Digital — Luxury eCommerce UX 2026](https://kndigital.co/ecommerce-ux-best-practices/), [ConvertCart — Luxury PDP examples](https://www.convertcart.com/blog/luxury-product-page-ecommerce)

### 7. DTC trust is earned by UX clarity, not endorsements
For DTC brands "your site is your sales rep." Trust comes from usability + clarity + brand-origin/values/materials info — not celebrity or stock photography. Niche DTC stores rarely need heavy on-site search; invest in clear category paths and education instead.
Sources: [Vervaunt — Best DTC sites](https://vervaunt.com/best-designed-dtc-ecommerce-websites), [Baymard — DTC search](https://baymard.com/blog/dtc-search), [Brightter — DTC trust via UX](https://www.brightter.com/articles/how-los-angeless-direct-to-consumer-brands-build-trust-with-better-ux)

### 8. COD checkout: justify the phone field, validate inline, be transparent
When a phone field is required without explanation, users enter false data or abandon. Since phone IS the delivery key in Iraq COD, justify it ("نحتاجه للتوصيل") and validate format inline in real time. Give a delivery date/range not a vague speed, use adaptive (specific) error messages, keep one page, minimum fields, no surprise costs.
Sources: [Baymard — Checkout UX](https://baymard.com/blog/current-state-of-checkout-ux), [BigCommerce — Checkout Optimization 2026](https://www.bigcommerce.com/articles/ecommerce/checkout-optimization/), [Salesforce](https://www.salesforce.com/commerce/online-payment-solution/checkout-guide/)

### 9. Social proof only when real — and let staff reply
Authentic reviews lift conversion; **89% of sites never respond to negative reviews** and 63% block traversing reviewer photos. The opportunity for AQUAVO: when real reviews exist, surface them with visible expert (staff) replies — fits the "calm expert house" voice. Until then, hide (already done).
Source: [Baymard](https://baymard.com/blog/current-state-ecommerce-product-page-ux)

### 10. Guest wishlist / save without account
89% of sites force registration to save items, yet save features drive ~21% of journeys. Allowing guest save/wishlist is a quiet conversion lever that respects the COD, low-friction shopper.
Source: [Baymard](https://baymard.com/blog/current-state-ecommerce-product-page-ux)

---

## PART B — SCREEN BY SCREEN (standard → AQUAVO meets/misses → fit)

### 1) HOME — `cro-01-homepage-above-fold.jpeg`, `audit-01`
**Standard:** one bold focal point + calm surroundings (§5/§6); honest trust signals near the fold (§7); fast LCP hero (§4).
**Meets:** Strong above-fold composition — aquascape hero + a clean "اختيارات AQUAVO" ranked list (#1/#2/#3) + a single primary CTA "تصفح المنتجات". Honest trust strip ("منتجات أصلية · توصيل خلال 24 ساعة · الدفع عند الاستلام · دعم 24/7") is real and on-brand. Ranked picks are a smart, non-fake form of social proof (curation, not invented numbers).
**Misses:** (a) **Hero headline legibility** — the cyan "أحواض" + coral "العراق" words land on a busy mid-tone aquascape with no scrim; edges read layered/templated (report-03 R6, still open). (b) Two competing focal blocks above the fold (left ranked-list card + right hero) split attention; quiet luxury wants one. (c) "أصلي 100%" pill on the hero is fine, but verify it never drifts into unverifiable claims.
**Fit for AQUAVO:** add a left-to-dark gradient scrim + fixed text safe-zone behind the headline (keeps the aquascape, restores legibility); let the hero be the single dominant focal point with the ranked list moving below or made visually secondary. No new colors, no motion.

### 2) PRODUCTS GRID — `cro-02`, `cro-09-mobile-products.jpeg`, `audit-02`
**Standard:** button (not dropdown) filters showing availability (§2); calm grid with one focal element per card; price + key spec scannable (§1).
**Meets:** Card layout is clean — image, brand, name, price, "أضف السلة", "جديد" badge. Filter/sort is exposed as **buttons/pills** (category chips, السعر, الفلتر, sort) — matches §2, better than the 57% who hide behind dropdowns. "عرض 24 من 109 منتج" gives honest result counts. Card rating now correctly hidden at 0 reviews (R1 fixed).
**Misses:** (a) **Mobile chip row is heavy** (report-03 R7) — category pills + "الفلتر/السعر/جديد/الأكثر مبيعاً/صديق للبيئة" wrap into a dense band above the grid (`cro-09`); noisy vs. quiet-luxury. (b) Discount strike-through pricing (e.g. ~~4,025~~ 3,000) appears on cards — fine **only if** originalPrice is a true former price, never an invented anchor. (c) Two-up mobile cards with a "متوسطة" availability tag are good, but the tag styling competes with the "جديد" badge.
**Fit:** collapse mobile filters into a single "الفلتر" sheet trigger + a one-line sort; keep category as a quiet scrollable rail, not a wrapping block. Audit that every strike-through price is a real historical price.

### 3) PDP — `audit-03`, `audit-12-mobile-product.png`, `cro-03/04/05`, `cro-06` (desktop)
**Standard:** exposed variant buttons (§2), shipping + returns inline (§3), structured/collapsible description (§1), one calm primary CTA (§6), mobile sticky buy bar (§4).
**Meets — genuinely strong, top-half globally:**
- Variant selector is **button-style** ("XY-180 — صغير" / "XY-2835 — كبير") showing the choice inline — beats the 57% dropdown failure (§2).
- **Shipping shown on the PDP** ("التوصيل 5,000 د.ع لكل العراق · يوصل خلال 24 ساعة") — beats the 67% who hide it (§3).
- Model code, real stock count, dialect-correct benefit copy, quantity stepper, share + wishlist, 24/7 support line, gallery with "3/1" position indicator + zoom.
- **Mobile sticky buy bar is implemented** (`product-details.tsx:1000`) — the §4 highest-leverage mobile lever, already shipped.
- Mobile PDP order (image → title → price) in `audit-12` is correct mobile-first sequencing.
**Misses:** (a) **Double stock indicator** still live (report-03 R2): green "متوفر (5 قطعة)" stacked above amber "متبقي 5 فقط" (`cro-06`/`audit-12`). It's real data, not fake urgency, but stacking two leans pressure-y and clashes with calm-premium — show one, and only show "متبقي N" below a low threshold. (b) **Return policy not surfaced on the PDP body** (§3 — 60% of users want it there); a return page exists (`return-policy.tsx`) but isn't linked inline. (c) Description is a wall of paragraphs — §1 wants collapsible spec/care/shipping accordions so the first view stays focused.
**Fit:** keep the genuinely strong IA; (1) collapse to a single stock line, (2) add a one-line "الإرجاع خلال X أيام" link near the CTA, (3) wrap long care/spec copy in calm accordions. All on-brand, no fabrication.

### 4) CART SHEET — `audit-05-cart-drawer.png`
**Standard:** clear line items + qty steppers, transparent subtotal, one obvious checkout CTA, relevant (not pushy) cross-sell.
**Meets:** Slide-over with line items, per-item qty steppers, subtotal ("المجموع 12,500"), checkout CTA, and a `cart-suggestions.tsx` "أكمل حوضك" rail (contextual, calm cross-sell — good for an aquarium house). `shipping-progress.tsx` states the honest flat fee, no fake free-shipping bar.
**Misses:** (a) Drawer is dense at small widths — line items + suggestions + totals compete; ensure the checkout CTA is always visible (sticky within the sheet). (b) No inline delivery ETA in the cart (§8 favors showing the date/window early).
**Fit:** pin the checkout CTA to the sheet bottom; add a one-line "يوصل خلال 24 ساعة · 5,000 د.ع" under the subtotal. Keep "أكمل حوضك" but cap it to ~3 items so it stays calm.

### 5) CHECKOUT — `cro-07-checkout-full.jpeg`, `audit-07`
**Standard (§8):** one page, minimum fields, justify the phone, inline validation, delivery date/range, transparent totals, no surprises.
**Meets — close to global-grade COD:** Single page; minimal fields (name, phone, governorate, address, optional notes, optional coupon); order summary with subtotal + 5,000 delivery + total + "الدفع عند الاستلام" + **"لا توجد تكاليف مخفية"** + "خلال 24 ساعة". Phone placeholder shows the Iraqi format (07801234567). Guest checkout offered alongside login. This is honest and low-friction — already better than most.
**Misses:** (a) **Emoji in the login/guest banner** (the ✦/sparkle glyph in `cro-07`) and a slightly long sales-y line — trim to one calm sentence, drop the glyph (zero-emoji rule). (b) **Phone field isn't justified** (§8) — add a quiet helper "نحتاجه للتوصيل فقط" and inline format validation. (c) Summary line "0" appears under أجور التوصيل beside "5,000" — looks like a stray/duplicate value; verify it's not a rendering artifact. (d) Delivery shown as "خلال 24 ساعة" (a speed) — §8 prefers a concrete window; acceptable here given the 24h promise, but make it unambiguous.
**Fit:** keep the one-page COD flow; add phone justification + inline validation, remove the banner glyph, fix the "0" artifact. Smallest changes, biggest trust.

### 6) ORDER CONFIRMATION — `order-confirmation.tsx`
**Standard:** calm reassurance, clear next steps, consistent premium iconography.
**Misses — direct brand-rule violation (CLAUDE.md "zero emoji"):** lines 367/397/409/419/455 hardcode 🛒 / 🚚 / 🎁 / 💰 / 🎉 / 💎🥇🥈🥉 in transactional copy ("🛒 N منتجات", "🚚 التوصيل", "🎁 الخصم", "💰 الدفع نقداً", "🎉 تهانينا! ترقيت…💎 الماسي"). This is the clearest live inconsistency with the premium, zero-emoji voice.
**Fit:** replace every emoji with the existing lucide icon set already used across the app (ShoppingCart, Truck, Tag, Wallet, Award) for a consistent agency-grade look. Pure win, low risk.

### 7) MOBILE (cross-screen) — `cro-08-mobile-home.jpeg`, `audit-11`, `cro-09`, `audit-12`
**Standard (§4):** thumb-first, sticky buy bar, swipeable gallery w/ indicator, large targets, minimal nav overlay.
**Meets:** Mobile home leads with hero + CTA + ranked picks; mobile PDP has the sticky buy bar + "3/1" gallery indicator + zoom; bottom-icon utility row (cart/wishlist/search/account) is thumb-reachable. Solid mobile-first foundation.
**Misses:** (a) Mobile home stacks two card surfaces (hero card + "اختيارات AQUAVO" card) before any product — pushes the grid far down; consider hero → trust strip → products sooner. (b) The unlabeled "T" (text-size?) and monitor (theme?) controls (report-03 R8) sit in the mobile/desktop bar with no `aria-label`/tooltip — a11y + clarity gap. (c) Dense mobile filter band (see §2).

### NAVBAR (cross-screen) — `cro-01`, `cro-06`, `audit-*`
**Standard (§5/§7):** few primary links, secondary tools grouped, calm.
**Misses (report-03 R5/R8, still open):** desktop bar packs ~10 items (الرئيسية، المنتجات، المفضلة، موسوعة الأسماك، الحاسبات، طبيب الأسماك، ألبوم العائلة، رحلتك) + login + two unlabeled icon toggles + search + wishlist + cart. Dense, reads busy, dilutes premium. The content library (encyclopedia, calculators, fish-doctor, journey, gallery) is a real DTC-trust asset (§7) — but as a flat row it's clutter.
**Fit:** promote 4–5 primary links (الرئيسية، المنتجات، العروض، المفضلة) and fold the education tools under one labeled "أدوات" / mega-menu; label or remove the two icon toggles.

### MOTION (cross-screen) — `index.css`, `tailwind.config.ts`
**Standard (§5):** reserve motion for entrance/interaction; perpetual loops hurt INP and calm.
**Misses (report-03 R3, still open):** many infinite keyframes (`fish-swim 15s`, `float`, `slow-zoom 20s`, `pulse-glow`, `water-ripple`, `wave`). On commerce surfaces this competes with product focus.
**Fit:** disable perpetual loops on home/grid/PDP/checkout; keep short one-shot entrances; honor `prefers-reduced-motion` for framer-motion too.

---

## PART C — Where AQUAVO sits vs global level
**Already global-grade or better:** exposed button variant selectors (§2), shipping-on-PDP (§3), one-page honest COD checkout (§8), sticky mobile buy bar (§4), reviews hidden until real (§9), disciplined dark-ocean tokens + honest trust strip, no fake urgency/counters/prices. AQUAVO is firmly in the **top half** of the Baymard benchmark.
**Gaps to close:** transactional emoji (brand-rule break), navbar clutter + unlabeled icons, double-stock indicator, hero scrim/legibility, perpetual animation, return-policy + phone-justification not surfaced inline, no guest-save / real-review pipeline yet.

---

## THE 10 STRONGEST PATTERNS AQUAVO SHOULD ADOPT
1. **Zero-emoji transactional UI** — replace 🛒🚚🎁💰🎉💎 in `order-confirmation.tsx` (and any checkout banner glyph) with the existing lucide icons. Direct brand-rule fix, lowest risk, highest consistency. (§5; CLAUDE.md)
2. **Hero scrim + text safe-zone** — dark gradient behind the headline so the cyan/coral words stay legible over any aquascape, making the hero the single focal point. (§5/§6)
3. **One honest stock line on the PDP** — collapse the stacked green "متوفر (N)" + amber "متبقي N فقط" into one indicator; show "متبقي N" only below a low threshold. Calm, still truthful. (§5)
4. **Justify the phone field + inline validation at checkout** — quiet "نحتاجه للتوصيل فقط" helper + real-time Iraqi-format check + adaptive error text. (§8)
5. **Navbar IA pass** — 4–5 primary links + a labeled "أدوات" menu for the education tools; label/remove the unlabeled "T"/monitor toggles. (§5/§7)
6. **Tame perpetual animation + honor reduced-motion** on all commerce surfaces; reserve motion for one-shot entrances. (§5)
7. **Surface return policy inline on the PDP** (one-line "الإرجاع خلال X أيام" link near the CTA) — 60% of buyers look for it there. (§3)
8. **Collapse PDP description into calm accordions** (specs / care / shipping) so the first view stays focused. (§1)
9. **Guest wishlist/save** — let shoppers save without an account; quiet conversion lever for low-friction COD buyers. (§10)
10. **Real-review pipeline with visible expert replies** — post-delivery request → verified reviews → show ratings with calm staff responses (the "expert aquarium house" voice). Never fabricate; keep hidden until real. (§9)
