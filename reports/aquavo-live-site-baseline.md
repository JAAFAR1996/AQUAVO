# AQUAVO Live Site Baseline

Audit date: 2026-07-11
Target: `https://www.aquavoiq.com`
Method: read-only Chromium inspection, responsive screenshots, DOM/heading/overflow checks and browser performance observation. No orders or external messages were sent.

## Confirmed baseline findings

| Area | Evidence before implementation | Severity |
|---|---|---|
| Routes | `/deals` and `/tank-builder` are in the sitemap but render the client 404 inside an HTTP 200 response | High |
| Unknown URLs | Unregistered paths return the SPA shell with HTTP 200 | High |
| SSR body | Visible SEO sections are appended outside `#root` | High |
| Headings | Appended SSR content causes multiple visible H1 elements | High |
| Layout | Large blank region appears after React content | High |
| CLS | Indicative Playwright observer readings ranged about 1.03–1.10 | High |
| Product layout | Horizontal overflow measured 156px at 1024×768, 449px at 768×1024 and 6px at 360×800 | High |
| Product performance | Indicative product-page LCP was about 6.16s; observed load completion was roughly 4–6s | Medium |
| Certificate | Existing YEE certificate is treated as real pending full interaction regression; no placeholder conclusion is carried forward | Critical preservation requirement |
| Contact truth | Restrictive hours conflict with the approved 24/7 support statement | Medium |
| Accessibility | Nested interactive navigation elements produce duplicate tab stops; footer newsletter has no programmatic label | High |

## Evidence location

Baseline screenshots are preserved outside Git at:

`C:\Users\jaafa\AppData\Local\Temp\aquavo-audit-2026-07-11`

The figures above are baseline diagnostics, not Lighthouse scores. Fresh comparable measurements will be recorded after the implementation build.

## Phase 1 correction already verified locally

The local implementation now keeps the React root as the only visible SPA body content, does not defer the application stylesheet, and does not add a timed loading overlay. Dedicated guide HTML remains supported as a separate server response.
