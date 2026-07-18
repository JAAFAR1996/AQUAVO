# AQUAVO Test Results

Date: 2026-07-12

## Final phase-focused verification

- TypeScript: passed.
- Production build: passed.
- Phase 10 SEO/motion/trust/privacy suite: 18/18 passed across 5 files.
- Journey after responsive fix: 6/6 passed.
- Checkout isolated rerun: 4/4 passed.
- v2 Chromium Playwright foundation: 8/8 passed.
- Route/viewport browser matrix: 90/90 checks passed the final H1/title/overflow contract.
- Identity render: 23/23 HTML masters, zero failed resources; 69 exports created.
- Post-review critical suite: 22/22 passed across checkout, product details, certificate, SEO and motion tests.
- Post-review TypeScript and production build: passed.

## Full Vitest run

The earlier full run exposed checkout test timeouts caused by per-character text entry under parallel suite load. The delivery form and legacy cart checkout tests now set text fields directly while retaining real user interactions for selects, checkboxes and submission controls.

The affected focused set passed 21/21. The complete Vitest suite then passed with exit code 0 using four workers. It still emits existing non-fatal warnings for React `act(...)`, absent AI keys in the test environment and incomplete query mocks.

## Playwright limits

- Full Chromium collection: command timed out after 120 seconds without a final test summary.
- Accessibility/responsive/checkout/v2 four-file subset: command timed out after 120 seconds without a final summary because legacy tests wait on frontend-only API behavior.
- Focused v2 foundation: 8/8 passed with one worker.

## Build warnings

Build succeeds but warns about chunks over 500 kB. The largest recorded optional chunk is the model viewer at approximately 991 kB minified; it is now downloaded only after explicit customer activation. Its size remains a performance risk, not a build failure.
