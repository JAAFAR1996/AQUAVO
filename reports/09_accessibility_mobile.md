# AQUAVO — Accessibility & Mobile Usability Audit
**Author:** Accessibility & Mobile Usability Lead (read-only) · **Date:** 2026-06-16
**Scope:** `client/src` components + pages, dark-theme RTL Arabic store. Builds on report 03's a11y notes.
**Method:** Source inspection + mobile screenshots (cro-08/09, qa-03/04, audit-11/12). No source modified.

---

## Executive summary

AQUAVO is in **strong shape** for a11y/mobile — materially better than most stores its size, and several report-03 risks are already fixed:

- **R1 (rating "0 (0)" wall)** — FIXED. `product-card.tsx:195` now guards `(product.reviewCount ?? 0) > 0`.
- **R2 (double stock signal)** — FIXED. `product-details.tsx:512-538` shows a single indicator, low-threshold only (`متبقي N فقط` when `≤5`, else `متوفر`).
- **R4 (no mobile sticky CTA)** — FIXED. `product-details.tsx:1001` adds a `fixed bottom-0 … md:hidden` price + add-to-cart bar with `safe-bottom`.
- **R6 (hero legibility)** — PARTIALLY FIXED. `minimal-hero.tsx:29` adds a `bg-black/20` scrim.
- **R8 (unlabeled navbar icons)** — FIXED. Theme switcher (`theme-switcher.tsx:68`) and font-size "T" (`font-size-controller.tsx:147`) both carry `aria-label` + `sr-only`.

Solid existing infrastructure:
- **Touch targets**: buttons are `min-h-[44px]` globally on mobile (`index.css:573`); icon buttons `h-11 w-11` mobile → `h-9` desktop (`button.tsx:31`). Meets WCAG 2.5.5 / Apple HIG.
- **iOS zoom guard**: inputs `font-size:16px` on mobile (`index.css:585`).
- **Reduced motion**: TWO global blanket blocks (`index.css:602`, `index.css:794`) neutralize all animation/transition; confetti guarded on `home.tsx:38` and `order-confirmation.tsx:90`.
- **Focus visible**: thick `ring-4 ring-primary ring-offset-4` on all interactive elements (`index.css:302-313`).
- **Dialog/Sheet**: Radix primitives → native focus trap, ESC, scroll-lock; close buttons carry `aria-label="إغلاق"` + `sr-only` (`dialog.tsx:45`, `sheet.tsx:70`).
- **Skip link** present (`App.tsx:921` → `#main-content`), `<main id="main-content">` on most pages, navbar `role="navigation"` + `aria-label`.
- **a11y helper library** exists (`accessibility/a11y-components.tsx`): SkipToContent, LiveRegion, useFocusTrap, AccessibleField, contrast checker.

The findings below are the **remaining gaps** — mostly one genuinely broken custom widget, a few unguarded confetti calls, and polish items.

---

## Findings

### A1 — Custom governorate dropdown is not keyboard/SR accessible [HIGH]
**File:** `client/src/components/cart/checkout/customer-info-form.tsx:104-160`
**Issue:** The محافظة selector is a hand-rolled `<button>` + `<ul>/<li>` combobox. Problems:
- Options use `onMouseDown` only — **no keyboard selection** (no ArrowUp/Down/Enter handling).
- No ARIA roles: missing `role="combobox"`/`role="listbox"`/`role="option"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, `aria-selected`.
- `<li>` items are not focusable and not announced as options.
- Trigger button (`id="governorate"`) has no `aria-expanded={govOpen}`.

**WCAG/mobile impact:** Fails WCAG 2.1.1 (Keyboard), 4.1.2 (Name/Role/Value). Keyboard and screen-reader users **cannot select a governorate** — this blocks checkout completion, the single most important conversion flow. (The inline-no-portal design was chosen to work inside the Radix Dialog, so it can't be naively swapped.)
**Fix (STRATEGIC):** Replace with Radix `Select`/`Command` configured with a portal container set to the dialog, OR add full keyboard + ARIA combobox semantics to the custom widget (roving focus on options, `role="listbox"`, `aria-activedescendant`, `aria-expanded` on trigger). High effort but unblocks a critical path.

### A2 — Checkout error messages not programmatically tied to inputs [MED]
**File:** `customer-info-form.tsx:61-95, 170-189` (name, phone, address, governorate, notes)
**Issue:** Errors render as a sibling `<p>` with no `role="alert"`, no `id`, and inputs lack `aria-invalid` / `aria-describedby`. Only a red border + icon convey the error (color-only signal).
**WCAG impact:** Fails 3.3.1 (Error Identification) and 1.4.1 (Use of Color) for SR users — the field's invalid state and the reason aren't announced. (Note: the project already has `AccessibleField` in `a11y-components.tsx` that does exactly this — it's just unused here.)
**Fix (SAFE):** Add `aria-invalid={!!errors.x}`, `aria-describedby="x-error"`, give the error `<p id="x-error" role="alert">`. Or wrap fields in the existing `AccessibleField`.

### A3 — Inputs missing `autoComplete` / `inputMode` [MED]
**File:** `customer-info-form.tsx` (phone `:81`, name `:61`, address `:174`)
**Issue:** Phone is `type="tel"` (good) but has no `inputMode="numeric"` and no `autoComplete="tel"`; name/address lack `autoComplete="name"`/`"street-address"`.
**Mobile impact:** Phone field won't surface the numeric keypad reliably; no browser autofill on mobile → more typing friction at the highest-drop-off step. Hurts mobile conversion more than desktop.
**Fix (SAFE):** Add `inputMode="numeric"` + `autoComplete="tel"` to phone; `autoComplete="name"` / `"street-address"` to the others.

### A4 — Unguarded confetti ignores prefers-reduced-motion [MED]
**Files:** `client/src/components/products/product-comparison.tsx:80-94`; `client/src/pages/beginner-guide.tsx:387`
**Issue:** The brief notes confetti "now guarded" — true for `home.tsx` and `order-confirmation.tsx`, but these two fire `canvas-confetti` with **no** `matchMedia("(prefers-reduced-motion: reduce)")` check. (The CSS blanket reduced-motion block does NOT stop canvas-confetti, which animates via JS/canvas.)
**WCAG impact:** Fails 2.3.3 (Animation from Interactions) for users who opted out of motion (vestibular triggers).
**Fix (SAFE):** Mirror the existing guard — early-return if `window.matchMedia("(prefers-reduced-motion: reduce)").matches` before calling confetti.

### A5 — `<main id="main-content">` missing on PDP loading/error states & several pages [MED]
**File:** `product-details.tsx:273` (loading) and `:285` (error) use bare `<main>`; the success state `:330` has the id. Also `checkout.tsx:336`, `compare.tsx:39` use `<main>` without `id="main-content"`.
**Impact:** The skip link (`App.tsx:921 → #main-content`) silently does nothing while the PDP is loading or errored, and on checkout/compare — keyboard users land back at the top. Fails the intent of WCAG 2.4.1 (Bypass Blocks) on those views.
**Fix (SAFE):** Add `id="main-content"` to every `<main>`.

### A6 — Font-size controller (the "T") is desktop-only [MED]
**File:** `navbar.tsx:226` wraps `FontSizeControllerCompact` in `hidden md:block`.
**Impact:** Mobile users — the majority of traffic and the cohort most likely to need larger text — cannot reach the text-resize control at all. (Browser pinch-zoom still works, but the in-app control is advertised as the a11y affordance and is absent on mobile.) Weakens 1.4.4 (Resize Text) support on mobile.
**Fix (SAFE/STRATEGIC):** Surface the font-size control inside the mobile menu Sheet (`navbar.tsx:171-184`) so it's reachable on phones.

### A7 — Skip link & sheet sides use physical `left`/`right` in an RTL app [LOW]
**Files:** `index.css:318` (`.skip-to-main` → `focus:left-4`); `navbar.tsx:346` cart `SheetContent side="left"`; `dialog.tsx:45` close `right-4`.
**Issue:** In an RTL layout the skip link appears on the visual *left* (against the natural reading start on the right), and the cart drawer slides from the left while the mobile menu slides from the right (`side="right"`). Inconsistent edge logic; not broken, but disorienting.
**Mobile/RTL impact:** Minor disorientation; cart-from-left in RTL is a mild convention mismatch. Cosmetic, no WCAG failure.
**Fix (SAFE):** Use logical properties (`inset-inline-start`) for the skip link; consider `side="right"` for the cart to match RTL "drawer from the trailing edge" expectations (verify against screenshots before changing — may be intentional).

### A8 — Hero scrim may be too light for cyan/coral headline over busy aquascape [LOW]
**File:** `minimal-hero.tsx:29` — `bg-black/20`.
**Issue:** Report 03 R6 flagged headline legibility; a 20% black scrim is a step up but on a bright aquascape the cyan/coral gradient text can still fall below 4.5:1 in patches.
**WCAG impact:** Potential 1.4.3 (Contrast) borderline on the hero headline depending on the background image.
**Fix (SAFE):** Deepen to a directional gradient scrim (e.g. `from-black/55 via-black/25`) behind the text safe-zone, or add `drop-shadow` to the headline. Verify with a contrast check against the shipped hero image.

### A9 — Decorative/icon images and inline SVG icons — mostly handled, spot gaps [LOW]
**Files:** Logo correctly `alt="" role="presentation"` (`navbar.tsx:191-193`); cart item images have descriptive alt (`navbar.tsx:372`). Gap: a few decorative inline icons in copy lack `aria-hidden` (e.g. sticky-CTA `ShoppingCart` `product-details.tsx:1011`, checkout footer social icons `checkout.tsx:414,423`). These sit next to visible text so impact is low, but the icon gets read as graphic by some SRs.
**Fix (SAFE):** Add `aria-hidden="true"` to purely decorative lucide icons that accompany text.

### A10 — `useFocusTrap` query and keyboard-nav helpers under-used; rely on Radix [INFO]
**File:** `a11y-components.tsx:54-81`
**Note:** The home-grown `useFocusTrap` selector misses `audio/video/[contenteditable]` and disabled-element filtering, but it appears unused — real dialogs/sheets use Radix (which traps correctly). No action needed unless a non-Radix modal is added. Flagging so it isn't adopted as-is.

---

## RTL / Arabic correctness
Good overall: `dir="rtl"` set on `html,body` (`index.css:806`), per-section `dir="rtl"`, RTL list markers handled (`index.css:816`), phone input correctly forced `dir="ltr"` (`customer-info-form.tsx:88`). Only the physical-direction utilities in A7 are off-pattern.

## Contrast (dark theme)
Tokens are disciplined (`--primary #199bb8`, `--accent #ff7b5a` on `#0a1628`). `text-muted-foreground` on dark passes for body but is borderline for the smallest sizes (`text-[10px]` rating/badges in `product-card.tsx`) — verify 4.5:1 / 3:1-for-large. Amber/green/red stock text on dark all use the `dark:` variants (`product-details.tsx:518,525,533`) so they're tuned. No systemic contrast failure found; A8 hero is the one image-dependent risk.

---

## Top 10 mobile / a11y fixes (priority order)

1. **[HIGH] Make the governorate dropdown keyboard + screen-reader operable** (`customer-info-form.tsx:104`) — it currently blocks checkout for keyboard/SR users. Replace with Radix Select (portal into dialog) or add full combobox ARIA + keyboard. [STRATEGIC]
2. **[MED] Wire checkout field errors to inputs** — `aria-invalid` + `aria-describedby` + `role="alert"` on error text (reuse existing `AccessibleField`). [SAFE]
3. **[MED] Add `inputMode="numeric"` + `autoComplete` to checkout inputs** (phone/name/address) — numeric keypad + autofill on mobile. [SAFE]
4. **[MED] Guard the two unguarded confetti calls** (`product-comparison.tsx:80`, `beginner-guide.tsx:387`) with the reduced-motion check already used elsewhere. [SAFE]
5. **[MED] Add `id="main-content"` to all `<main>`** including PDP loading/error, checkout, compare — so the skip link works everywhere. [SAFE]
6. **[MED] Surface the font-size ("T") control on mobile** by placing it in the mobile menu Sheet (`navbar.tsx:171`). [SAFE]
7. **[LOW] Deepen the hero scrim / add headline drop-shadow** (`minimal-hero.tsx:29`) and verify ≥4.5:1 against the shipped image. [SAFE]
8. **[LOW] Use logical RTL direction** for the skip link (`inset-inline-start`) and reconsider cart `side` to match RTL drawer convention (`index.css:318`, `navbar.tsx:346`). [SAFE]
9. **[LOW] `aria-hidden` on decorative lucide icons** beside text (sticky CTA, checkout footer socials). [SAFE]
10. **[LOW] Verify contrast of the smallest `text-[10px]` rating/badge text** on dark; bump size or weight if below 4.5:1. [SAFE]

**Bottom line:** Only one finding (A1, governorate dropdown) is a true blocker; everything else is polish. The team has clearly invested in a11y/mobile — touch targets, reduced-motion, focus rings, skip link, Radix focus traps, and the report-03 fixes are all in place.
