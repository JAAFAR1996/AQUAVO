# AQUAVO V2 completion release — 2026-07-13

## Release baseline

- Starting branch: `codex/aquavo-website-v2-20260711`
- Starting commit: `b5a2e9f`
- Previous Production: `dpl_3PCTuLs8rDGfP1fvC1yp7cjyVvd7`
- Rollback candidate: `dpl_GKYYoFE88eNMngedF3yALc8wz1Ab`
- Historical repository credential cleanup remains unresolved; no Git history is included in deployment exports.

## Route decisions

| Current route | User intent | Index | Decision | Canonical destination | Redirect |
|---|---|---:|---|---|---:|
| `/about` | AQUAVO identity and operator | yes | keep | `/about` | — |
| `/about-aquavo` | duplicate brand introduction | no | merge | `/about` | 301 |
| `/guides/filter-choice` | choose a filter | yes | keep | same | — |
| `/guides/aquarium-filter-guide` | overlapping filter guide | no | merge | `/guides/filter-choice` | 301 |
| `/guides/heater-choice` | choose heater wattage | yes | keep | same | — |
| `/guides/aquarium-heater-guide` | overlapping heater guide | no | merge | `/guides/heater-choice` | 301 |
| unfinished tool routes | utility intent | no sitemap inclusion | retain temporarily for direct use and further product review | self while retained | — |

## Implemented release gates

- 404: HTTP 404, `noindex, follow`, dedicated Arabic title/description, no unknown-route canonical or social metadata.
- Sitemap: index plus pages, products, and guides child sitemaps. Products are queried with selected public fields and soft-deleted/invalid slugs excluded.
- Product metadata: complete factual sentence or safe fallback; no mid-sentence ellipsis; duplicate brand suffix removed.
- Structured data: `ItemList.numberOfItems` derives from the final list.
- Preload: homepage LCP image only on home, primary product image only on product pages, no unrelated image preload elsewhere.
- Customer copy: SSR/crawling/JavaScript explanations removed from the shared visible template.
- Order tracking: POST requires order number plus last four customer phone digits; legacy GET reveals nothing; generic failures, minimal response and rate limiting.
- Discovery metadata: broken API Catalog/OpenAPI/MCP/Agent Skills/ACP advertisements return 410 and discovery headers were removed.
- CSP: external ChatGPT, Claude and Facebook form actions removed; `form-action` is same-origin only.
- Motion: reusable 100/190/340 ms tokens, restrained header/hero/one-shot section/card feedback, and immediate reduced-motion equivalents.

## Third-party/CSP inventory

| Origin group | Active purpose | Decision |
|---|---|---|
| Google Analytics / Tag Manager | commerce analytics | retained |
| Meta | browser Pixel and server CAPI | retained |
| TikTok, Clarity, PostHog, Plausible, Metricool, Cloudflare Insights, Sentry | existing deferred analytics/observability integrations | retained pending independent owner analytics audit |
| jsDelivr / unpkg | deferred runtime dependencies | retained |
| ChatGPT / Claude / Facebook `form-action` | no approved form submission | removed |

## Validation before deployment

- TypeScript: passed.
- Complete Vitest: 97 files, 1,165 tests passed. Existing non-failing React `act` and dialog-description warnings remain.
- Production build: passed; 4,007 modules transformed.
- Performance budgets: entry 44.88 KB gzip; CSS 44.80 KB; product route 19.27 KB; deferred 3D 278.24 KB; no initial model-viewer preload.
- Local Playwright: V2/checkout/YEE/3D 10/10; six-viewport and reduced-motion verification 7/7.
- No real order was submitted; checkout verification stopped at invalid-data validation.

## Honest limitations

- A distributed rate-limit store is still preferable to the per-instance memory store; the second verifier is the primary enumeration protection.
- Lighthouse mobile Performance previously measured below the requested 90 target. Bundle budgets pass, but a new post-release measurement is required and the site must not be called 10/10.
- Automated checks do not prove complete WCAG 2.2 conformance; a physical screen-reader review remains outstanding.
- The broad historical React test suite still emits non-failing `act` and dialog-description warnings that should be cleaned separately.
