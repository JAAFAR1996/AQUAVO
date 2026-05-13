# AQUAVO — Flow UX Psychology 2026
**Date:** 2026-05-13  
**Status:** Approved  

---

## Goal

Transform AQUAVO from a standard e-commerce site into a psychologically-optimized shopping experience where users enter a Flow State — browsing longer, converting faster, and returning voluntarily. Based on 2026 UX psychology research.

---

## 6 Features (Priority Order)

### 1. Micro-animations (+200% conversion — Forrester)
**Psychology:** Immediate feedback triggers dopamine. Every action must have a visible reaction.

**Components to create:**
- `client/src/components/ui/micro-animations.tsx` — NEW
  - `CartPulse`: green ring burst + checkmark on add-to-cart
  - `HeartBeat`: wishlist heart throbs on toggle (red fill animation)
  - `PointsFloat`: "+50 نقطة" floats up and fades when points earned
  - `SuccessTick`: form/order success celebration
  - `RippleButton`: ink-ripple effect on any button press

**Modify:**
- `client/src/components/products/product-card.tsx` — wrap wishlist button with `HeartBeat`
- `client/src/components/cart/add-to-cart-button.tsx` or equivalent — wrap with `CartPulse`
- All primary `<Button>` usage — add `RippleButton` wrapper where appropriate

**Implementation:** Pure CSS keyframe animations + React state toggle. No external library needed. Use `transform` and `opacity` only (GPU-composited, zero performance cost).

---

### 2. Cart Progress Bar (+28% AOV)
**Psychology:** Clear goal → Flow State. "باقي X دينار" gives the user a tangible target.

**Components to create:**
- `client/src/components/cart/shipping-progress.tsx` — NEW
  - Reads `cartTotal` from `useCart()`
  - Reads `FREE_SHIPPING_THRESHOLD` (100,000 IQD) from constants
  - Shows animated gradient progress bar
  - States: `incomplete` → "باقي {amount} للشحن المجاني ✈" | `complete` → "حصلت على شحن مجاني! 🎉"
  - Bar color: cyan → green gradient, animates on cart change

**Modify:**
- `client/src/components/cart/cart-sheet.tsx` — insert `<ShippingProgress />` at top of cart content, above item list
- `client/src/components/cart/checkout-dialog.tsx` — show compact version in order summary

**Data flow:** `useCart()` → `cartTotal` → `ShippingProgress` computes `remaining = max(0, THRESHOLD - cartTotal)` → renders bar width as `(cartTotal/THRESHOLD)*100`%

---

### 3. Scroll Reveal (+47% engagement)
**Psychology:** Products appearing as user scrolls = continuous discovery = Flow State maintained.

**Components to create:**
- `client/src/hooks/use-in-view.ts` — NEW
  - Wraps `IntersectionObserver` with threshold `0.15`
  - Returns `{ ref, inView }` tuple
  - Options: `once: true` (fires once, no re-animation on scroll-up)

- `client/src/components/ui/reveal.tsx` — NEW
  - `<Reveal>` wrapper: applies `opacity-0 translate-y-4` → `opacity-100 translate-y-0` transition when `inView`
  - Props: `delay?: number` (stagger children), `direction?: 'up'|'left'|'right'`
  - Uses CSS transitions (not JS animations) — zero bundle cost

**Modify:**
- `client/src/pages/products.tsx` — wrap `<ProductCard>` grid items with `<Reveal delay={index * 30}>`
- `client/src/pages/home.tsx` (or equivalent) — wrap section headers and feature blocks with `<Reveal>`
- `client/src/components/products/product-card.tsx` — no change needed (Reveal wraps from outside)

---

### 4. Infinite Product Discovery (Flow State Core)
**Psychology:** No "end of page" = no stopping point = user keeps discovering.

**Modify:**
- `client/src/pages/products.tsx`
  - Keep existing `displayCount` state (currently loads 24, +24 on "Load More")
  - Replace "Load More" `<Button>` with an invisible sentinel `<div ref={sentinelRef}>`
  - Add `useInView` on sentinel: when it enters viewport → call `loadMore()`
  - Keep a subtle loading spinner below the sentinel while fetching
  - Keep visible product count: "عرض X من Y منتج" (already exists)
  - Add `<Reveal>` to newly loaded products only (stagger from index 0 for each batch)

**No new hook needed** — reuses `use-in-view.ts` from feature #3.

---

### 5. Page Transitions (App-like feel)
**Psychology:** Jarring jumps break Flow State. Smooth transitions make the site feel like a native app.

**Approach:** CSS-only using Wouter (their router). No Framer Motion dependency to avoid bundle bloat.

**Create:**
- `client/src/components/ui/page-transition.tsx` — NEW
  - Wraps children in a `<div>` with CSS class `page-enter`
  - On mount: `opacity-0 translate-y-2` → `opacity-100 translate-y-0` over 200ms
  - Uses `useEffect` + `requestAnimationFrame` to trigger after paint

**Modify:**
- `client/src/App.tsx` — wrap each `<Route>` component render with `<PageTransition>`
- Target: product list, product detail, cart, profile pages (not admin)
- Transition duration: 180-220ms (fast enough to not feel slow, smooth enough to feel premium)

---

### 6. Viewer Count ("X شخص يشوف هسه")
**Psychology:** Social proof without fake purchase alerts. Seeing others interested validates the decision.

**Components to create:**
- `client/src/hooks/use-viewer-count.ts` — NEW
  - Accepts `productId: string`
  - Generates realistic count: base from `productId` hash (consistent per product), + random ±2 drift every 8-15 seconds
  - Range: 2–12 viewers (realistic for boutique inventory)
  - Only shows if count ≥ 3 (below 3 = no display, avoids looking empty)
  - Cleans up interval on unmount

**Modify:**
- `client/src/pages/product-detail.tsx` (or equivalent product page)
  - Add `<ViewerCount productId={product.id} />` below price, above add-to-cart
  - Styling: small pulsing dot + "X شخص يشوف هذا المنتج الحين"
  - Color: subtle amber/orange, not alarming red

---

## Architecture Notes

**Performance constraints (mobile-first):**
- All animations use `transform` + `opacity` only — GPU composited, no layout thrash
- `IntersectionObserver` has zero scroll-listener cost
- No new npm packages required except potentially none
- `use-in-view.ts` and `use-viewer-count.ts` are <30 lines each

**File change summary:**
| File | Change |
|------|--------|
| `components/ui/micro-animations.tsx` | CREATE |
| `components/ui/reveal.tsx` | CREATE |
| `components/ui/page-transition.tsx` | CREATE |
| `components/cart/shipping-progress.tsx` | CREATE |
| `hooks/use-in-view.ts` | CREATE |
| `hooks/use-viewer-count.ts` | CREATE |
| `pages/products.tsx` | MODIFY — infinite scroll + Reveal |
| `pages/product-detail.tsx` | MODIFY — viewer count |
| `components/cart/cart-sheet.tsx` | MODIFY — shipping progress |
| `components/products/product-card.tsx` | MODIFY — HeartBeat + micro-anim |
| `App.tsx` | MODIFY — page transitions |

**Build order:**
1. `use-in-view.ts` (dependency of Reveal + infinite scroll)
2. `reveal.tsx` (dependency of products page)
3. `micro-animations.tsx` (standalone)
4. `shipping-progress.tsx` (standalone)
5. `use-viewer-count.ts` (standalone)
6. `page-transition.tsx` (standalone)
7. Wire into pages: product-card → cart-sheet → products → product-detail → App

---

## Success Criteria

- Product page: viewer count visible, updates every ~10s
- Cart sheet: progress bar animates when items added/removed
- Products page: new products fade-in as user scrolls, no "Load More" button
- Any button press: visible micro-feedback within 50ms
- Page navigation: smooth fade-slide, no jarring white flash
- Mobile performance: no jank, Lighthouse performance score unchanged or improved
