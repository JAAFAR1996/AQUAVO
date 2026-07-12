# AQUAVO Performance Results

Date: 2026-07-12

## Measured evidence

Local Chromium, Vite development server, homepage:

| Viewport | LCP observer | CLS observer | DOMContentLoaded | Load |
|---|---:|---:|---:|---:|
| 1440×900 | 256 ms | 0 | 64 ms | 67 ms |
| 390×844 | 964 ms | 0 | 868 ms | 872 ms |

These are local development measurements, not field data and not Lighthouse scores. They are useful only as regression evidence that the current homepage produced zero observed layout shift in those runs.

## Exact bundle changes observed

- Privacy page chunk reduced from approximately 12.60 kB to 4.87 kB minified: 7.73 kB less, about 61.3% smaller.
- Product-card chunk remains approximately 9.65 kB minified after the Phase 5 simplification from approximately 15.54 kB: 5.89 kB less, about 37.9% smaller.
- Investor route chunk reduced from approximately 13.44 kB to 2.04 kB minified after removing unverified projections: 11.40 kB less, about 84.8% smaller.
- Minimal Precision motion added about 1.17 kB to the built CSS before gzip in the comparable builds and added no JavaScript runtime dependency.

## Remaining risks

- Build still reports chunks over 500 kB, led by the model viewer around 991 kB minified and large PDF/chart/admin chunks.
- The latest CSS bundle is about 363.94 kB before gzip (45.12 kB from Vite's gzip estimate); it remains a performance-review target.
- The frontend-only dev run produces API/auth failures and cannot represent production network timing.
- No real-user Core Web Vitals or deploy-preview Lighthouse data was available.

Status: core changes did not introduce measured CLS; large optional chunks remain a release risk to review in Phase 12/14.
