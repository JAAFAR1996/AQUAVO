# AQUAVO Fixes Applied

This is an append-only implementation ledger.

## 2026-07-11 — Phase 1 foundation

- Removed the critical home shell and visible crawlable sections injected outside `#root` from both Vercel and Express HTML paths.
- Stopped converting the application stylesheet to `media="print"` on the home response.
- Removed the timed loading/shimmer overlay from `client/index.html`.
- Corrected product ItemList image selection to use the typed `images`, `image` and `thumbnail` fields.
- Corrected customer phone content from `07747880678` to `07747880673` in server email and generated-content instructions.
- Added regression tests for React-root ownership and the document loading shell.
- Added a shared strict route recognizer and return HTTP 404 for unknown SPA routes from Vercel and Express while preserving the client NotFound page.
- Registered `/deals`; `/tank-builder` now resolves to the existing setup wizard pending its dedicated build phase.

Verification:

- Focused Vitest: 5 files, 26 tests passed.
- TypeScript client check: passed.
- Production build: passed.
- `git diff --check`: passed.
