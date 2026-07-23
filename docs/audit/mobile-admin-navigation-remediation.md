# Mobile Admin Navigation Remediation (F-7)

Owner: MobileAdminAccessibilityAgent · Scope: admin responsive navigation + its UI/E2E tests only.

## 1. The defect (F-7, HIGH)

At 393 px (Pixel 5) the admin **الطلبات** (Orders) tab could not be activated — clicks never
switched the panel, **المنتجات** (Products) stayed selected, and Orders / the Fulfillment panel
were unreachable on phones. It worked instantly on desktop, and a screenshot showed the tab
rendered and unobstructed.

## 2. Root cause (verified, not guessed)

I reproduced F-7 inside the pinned E2E harness (verify branch only) at 393×852 and measured the
Orders trigger with `elementFromPoint` + geometry. On the **unfixed** build:

```
Orders tab rect: x≈472, width≈80  → center x ≈ 512
document.scrollWidth = 842   clientWidth = 393   → horizontalOverflow = TRUE
elementFromPoint(center) = the Orders <button> itself (nothing on top, pointer-events: auto)
click() → Timeout: the center point (x≈512) lies OUTSIDE the 393 px viewport
```

So nothing was covering the tab. The page had **~449 px of horizontal overflow**
(`scrollWidth 842` vs `clientWidth 393`). The admin dashboard's default panel renders the
Products table — 8 columns, wrapped in `<div className="border rounded-lg">` with **no internal
horizontal scroll**. That intrinsically-wide table stretched the shared admin layout to 842 px.
The tab strip (`w-full`, `flex-wrap`) then laid out across 842 px, pushing the later-wrapped tabs
(Orders is the 7th) to x-coordinates beyond the 393 px viewport. A real finger — and Playwright —
cannot reach a control whose hit-target sits in the horizontally-scrolled-away region. Desktop
(1280 px) had room for the table, so the layout never overflowed and the bug never appeared.

A second, independent RTL defect surfaced while testing: the Radix `Tabs` root defaults to
`dir="ltr"`. With no `dir` passed, the entire tab area (list **and** panels) computed
`direction: ltr` even though `<html dir="rtl">`. Measured: المنتجات at x≈23 (left), الطلبات at
x≈113 (right) — the Arabic tabs read left-to-right, the wrong direction for an RTL dashboard.

## 3. The fix and why

Files changed:
- `client/src/pages/admin-dashboard.tsx`
- `client/src/components/admin/orders-management.tsx`

### 3.1 Eliminate the horizontal overflow (root cause of F-7)
- Products table wrapper: `border rounded-lg` → `border rounded-lg **overflow-x-auto**`. The wide
  table now scrolls inside its own box and can never stretch the page.
- Orders table wrapper (the Orders panel's own 7-column table): same `overflow-x-auto`, so the
  Orders section stays fully usable on phones and is not clipped by the container guard.
- Admin container: added `min-w-0 max-w-full overflow-x-clip` as a defence-in-depth guard so no
  future wide panel can push the nav off-screen again.
- `Tabs` / `TabsList`: `min-w-0 max-w-full`, and the list is wrapped in its own
  `overflow-x-auto` context.

### 3.2 Chosen nav pattern: viewport-capped **wrapping** tab strip
The strip is capped to the viewport and **wraps** onto multiple rows, so **every** section is
visible and one tap away at any width — no tab is ever off-screen and none is hidden behind a
scroll or a menu. This was chosen over a horizontal-scroll strip / overflow menu / drawer because
the acceptance criteria require **Orders and Fulfillment reachable in one clear interaction**: a
scroll strip would push Orders (7th) off-screen and need a swipe first; a drawer/menu adds a hop.
Wrapping keeps every section a single, direct tap and satisfies "no hidden unreachable tab". Font
size is unchanged and readable; the fix is layout containment, not shrinking.
- Operational tabs were reordered so the highest-traffic sections lead: **Products → Orders →
  Accounting/Fulfillment → Invoices → …**
- Each `TabsTrigger` gets `min-h-[44px]` — an adequate (≥44 px) touch target.
- `aria-label="أقسام لوحة التحكم"` on the list.

### 3.3 Correct RTL
- `dir="rtl"` on the `Tabs` root. The list and panels now compute `direction: rtl`; المنتجات
  (first) is visually right-most, الطلبات to its left — correct Arabic reading order. Radix
  roving-tabindex arrow keys are mirrored correctly for RTL.

### 3.4 Section persists in the URL (refresh / back-forward / deep link)
The active section is controlled state mirrored into `?section=<value>` via `history.pushState`,
validated against an allow-list (a stale/hostile `?section=` can't select a bogus panel), with a
`popstate` listener. Result: refresh restores the section, browser back/forward walk the section
history, and `/admin?section=orders` (or `=accounting`) deep-links straight to that panel.

## 4. Required checks — evidence

| Check | Result | Evidence |
|---|---|---|
| No hidden/unreachable tab | PASS | "every section reachable" tests loop all 12 sections at 393 / 360 / 768 / 1280 |
| Orders & Fulfillment in one interaction | PASS | single `click` activates; Orders + Accounting deep-link tests |
| Keyboard accessible | PASS | focus + ArrowLeft moves focus to a `role=tab`, Enter activates the panel |
| Adequate touch targets | PASS | every tab boundingBox height ≥ 44 px (asserted ≥ 40) |
| Arabic RTL ordering | PASS (after `dir="rtl"`) | المنتجات.x > الطلبات.x on all projects |
| Active-state visible | PASS | active trigger has non-transparent background; asserted in dark project |
| Dark and light | PASS | mobile-dark + desktop-dark projects green; dedicated dark test |
| No horizontal page overflow | PASS | `scrollWidth ≤ clientWidth+1` asserted per section (was 842 vs 393) |
| iPhone-width (393) & Android-width (360) | PASS | dedicated viewport tests |
| Tablet (768) & desktop (1280) | PASS | dedicated viewport tests |
| Browser back/forward | PASS | back → Orders active, forward → Customers active |
| Section survives refresh / deep link | PASS | `?section=` deep-link tests |

## 5. Playwright coverage — real counts

New spec: `e2e/admin-mobile-nav.spec.ts` (12 tests). Run across all four harness projects
(`desktop-light`, `desktop-dark`, `mobile-light`, `mobile-dark`) = 44 executed (the dark-only
active-state test skips on the two light projects).

Widths/conditions exercised: 393×852, 360×800, 768×1024 (tablet), 1280×720 (desktop), RTL,
light, dark, direct navigation to Orders, direct navigation to Fulfillment/Accounting, and
navigation through the mobile UI (tap, keyboard, back/forward).

Reproduction evidence for the root cause was captured with a throwaway diagnostic spec
(removed after use): pre-fix `scrollWidth 842 / clientWidth 393`, Orders center x≈512,
`click → Timeout`; post-fix `scrollWidth 393 / clientWidth 393`, Orders center x≈153,
`activatedAfterClick = true`.

**Result (all four projects, `E2E_RETRIES=1`): 42 passed · 2 skipped · 0 failed (7.0 min).**
The 2 skips are the dark-only active-state test on the two light projects (by design). Every
width, RTL, light and dark, keyboard, touch-target, back/forward, refresh and both deep-link
tests are green on desktop-light, desktop-dark, mobile-light and mobile-dark.

Intermediate honesty note: the FIRST pre-fix-verification run surfaced two real defects that this
remediation then fixed — the RTL-ordering test failed on all four projects (Radix `dir="ltr"`
default, fixed with `dir="rtl"`), and desktop-light saw cold-start timeouts (infra, not code).
The final run above is after both the fix and the `dir="rtl"` correction.

Artifacts: `e2e-artifacts/admin-nav-run.log` (list output), `e2e-artifacts/junit.xml`,
`e2e-artifacts/html-report/`, traces/screenshots under `e2e-artifacts/test-output/` (failures only).

## 6. Vitest baseline
Full suite after the change: **114 files / 1559 tests / 0 failed** (`npx vitest run`, exit 0 —
log at `e2e-artifacts/vitest-baseline.log`), at or above the 112/1538 baseline. The directly
relevant unit test `client/src/pages/__tests__/admin-dashboard.test.tsx` is 4/4 green. The nav
edit is additive (controlled value + URL sync + containment classes + `dir="rtl"`); no unit
contract changed.

## 7. Left open / notes
- The container carries `overflow-x-clip` as a guard. Any *other* admin panel with an
  intrinsically-wide table that lacks its own `overflow-x-auto` would be clipped rather than
  scrollable on very narrow screens. Products and Orders tables are fixed here; a sweep of the
  remaining panels' tables (analytics, audit-logs, customers, reviews) is recommended but is
  outside this agent's nav ownership — reported for a follow-up.
- Shared Playwright config (`playwright.config.ts`, `e2e/support/*`) was **not** modified; the new
  spec was added as a standalone file per the ownership boundary.
- Cold-start note: on a cold Neon verify branch the server can take ~165 s to become ready; the
  first project's early tests can then exceed the 60 s per-test timeout on the first (cold) run.
  This is infra warm-up, not a code defect — the same tests pass once warm. The suite was run with
  `E2E_RETRIES=1` to absorb cold-start flakiness.
