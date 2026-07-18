# Performance and accessibility

## Production-build measurements

Local production server, Lighthouse 12.8.2 mobile profile, 2026-07-12:

| Run | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---:|---:|---:|---:|---:|---:|---:|
| Before chart-chunk correction | 33 | 96 | 93 | 100 | 10.5 s | 0 | 1,410 ms |
| After chart-chunk correction | 50 | 96 | 93 | 100 | 5.7 s | 0 | 840 ms |

The corrected build no longer requests `vendor-charts`, admin dashboard, accounting, or PDF generator chunks on the homepage. Lighthouse's Best Practices result is depressed by two local-environment artifacts: Express's local CSP blocks the inline theme bootstrap while Vercel's deployed CSP explicitly permits it, and the local production server has no `DATABASE_URL`, producing a 503 for a data request. Preview must be measured separately before cutover.

The site does **not** meet the requested mobile Performance >= 90 or LCP <= 2.5 s in this local lab run. No perfect score is claimed. Remaining initial React/animation/UI JavaScript and hydration work is material future optimization. CLS is 0 and the 991 kB model-viewer chunk remains absent from initial HTML/network until activation.

Enforced gzip budgets:

- public entry JavaScript <= 60 kB (measured 44.39 kB);
- public CSS <= 50 kB (measured 44.36 kB);
- product route JavaScript <= 25 kB (measured 19.27 kB);
- deferred model-viewer <= 300 kB (measured 278.24 kB);
- initial HTML must not reference the 3D chunk.

## Accessibility

- Focused v2 browser matrix passes desktop, tablet, and mobile layout.
- Checkout blocks invalid data without sending an order.
- YEE proof supports keyboard open, zoom, reset, Escape, and close.
- 3D provides named activation/reset/zoom controls and static-image fallback.
- Reduced motion removes nonessential motion without hiding information.
- Lighthouse found one 12 px footer copyright contrast miss (4.4:1 versus 4.5:1); the color was raised from `text-white/45` to `text-white/65` and requires final Preview remeasurement.

Automated checks do not prove full WCAG 2.2 conformance. A physical screen-reader pass was not performed. The older broad Playwright files produced 14 stale assertions against retired navigation/checkout behavior; the current release-specific 10-test Chromium matrix passed 10/10. This legacy-suite debt prevents a genuine 10/10 score but does not contradict the focused current-flow evidence.
