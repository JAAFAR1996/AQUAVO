# AQUAVO Browser Verification After

Date: 2026-07-12

## Automated v2 flow

Chromium, one worker, `e2e/v2-foundation.spec.ts`:

- Desktop foundation: passed
- Tablet foundation: passed
- Mobile foundation: passed
- Footer trust/legal/contact facts: passed
- Store recovery at tablet and mobile: passed
- YEE keyboard proof viewer: passed
- Checkout COD total and invalid-data block: passed

Result: 8/8 passed in 25.0 seconds. No real order was placed.

## Route and viewport matrix

Fifteen routes were checked at all six required widths:

- 1440×900
- 1024×768
- 768×1024
- 430×932
- 390×844
- 360×800

Routes: homepage, products, FAQ, shipping, return policy, privacy, terms, about, why AQUAVO, contact, calculators, journey, YEE certificate, checkout and an invalid route.

Final matrix result:

- 90 checks
- 0 horizontal-overflow failures
- 0 missing or duplicate visible H1 failures
- 0 unresolved `__META_TITLE__` placeholders

The first settled matrix exposed `/journey` overflow at 390 and 360 px. The nine progress controls were reduced from 40 px to 32 px on mobile, reduced-motion behavior was added to their Framer Motion interactions, and the route container now clips transient horizontal entrance movement. Journey unit tests passed 6/6 and direct 390/360 rechecks matched viewport width exactly. The full 90-check matrix was then repeated and passed.

## Screenshots

Twelve full-page screenshots are stored under `reports/screenshots/phase12`:

- Homepage at all six widths
- Store/recovery state at all six widths

The 360 px homepage, 360 px store and 768×1024 homepage screenshots were visually inspected after capture.

## Known environment behavior

- Vite's frontend-only fallback returns HTTP 200 for an invalid route. This is not used as 404 evidence.
- The v2 foundation test and server implementation are the evidence for the true HTTP 404 behavior completed in Phase 1.
- Frontend-only mode returns HTML for API/auth requests, producing expected console errors and store recovery UI; production backend behavior was not mutated or exercised.
- The full legacy Playwright Chromium collection and a four-file legacy subset each exceeded the 120-second command window. They are recorded as timeouts, not passes or product failures.
