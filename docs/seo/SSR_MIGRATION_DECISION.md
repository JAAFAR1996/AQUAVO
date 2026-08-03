# AQUAVO SSR Migration Decision

Status: Draft architecture decision for Preview validation only.

## Decision

Use native Vite SSR with the existing Wouter router and React hydration for AQUAVO's public acquisition routes. Do not add a second production router and do not migrate the entire application in one release.

The current semantic preview handler is an interim crawler-remediation experiment. It proves that crawlers can receive H1s, catalog links, product facts, status codes, and structured data, but it is not the final rendering architecture because the existing client entry still uses `createRoot()` and replaces the preview shell.

## Why native Vite SSR + Wouter

- AQUAVO already uses Vite, React, and Wouter.
- Wouter officially supports server rendering through a top-level `Router` with `ssrPath` and `ssrSearch`, followed by React hydration in the browser.
- Vite SSR is designed to run the same application in Node.js, generate HTML, and hydrate it on the client.
- Reusing the current router, providers, page components, and CSS minimizes visual and behavioral risk.
- No new routing framework is required for the first implementation.

## Vike evaluation

Vike was evaluated because it supports progressive SSR/SSG migration for existing Vite applications. It remains a valid fallback if maintaining the native SSR integration becomes expensive.

It is not the first choice for this repository because:

- Vike prefers owning application routing.
- AQUAVO currently has a large Wouter route tree and route-dependent effects.
- A shallow integration would temporarily introduce two routing layers.
- Native Wouter SSR provides the required request path and search handling with less architectural change.

Vike should be reconsidered only after the first native SSR slice is measured, or if the project later needs broader pre-rendering, streaming, server routing conventions, or a framework-managed data layer.

## Scope of the first true-SSR slice

Migrate only these public routes first:

1. `/`
2. `/products`
3. `/products/:slug`
4. `/faq`
5. `/about`
6. Public policy and contact pages

Keep these outside the first slice:

- `/admin/*`
- accounting and finance pages
- authentication and profile pages
- cart and checkout
- order tracking containing customer data
- experimental AI and internal tools

## Target rendering architecture

### Server entry

- Receive the requested pathname and query string.
- Fetch only the public data needed by the route.
- Render the existing provider and component tree inside Wouter's `Router` using `ssrPath` and `ssrSearch`.
- Generate the route metadata and JSON-LD from the same public data object.
- Return the correct HTTP status code before sending HTML.

### Client entry

- Render the same provider and component tree used by the server.
- Use `hydrateRoot()` when server HTML is present.
- Keep `createRoot()` only as a fallback for routes intentionally left as SPA pages.
- Initialize analytics, pixels, onboarding, browser storage, and motion effects only after hydration begins.

### Data hydration

- Serialize only public product/category data into page context.
- Escape serialized data safely before embedding it in HTML.
- Seed TanStack Query with the server response to prevent skeleton flashes and duplicate initial requests.
- Ensure the server and browser use the same initial route data and locale.

## Non-negotiable constraints

- No visual redesign.
- Reuse the existing React components and CSS.
- Server HTML and client HTML must match so React can hydrate without errors.
- Browser-only APIs such as `window`, `navigator`, `localStorage`, and `sessionStorage` must be isolated from server execution.
- Product and category data must come from the same database queries used to create metadata and structured data.
- Preview environments remain `noindex, nofollow, noarchive`.
- Nothing is merged to `main` until live Preview evidence passes.

## Product variants

Do not publish `ProductGroup` markup until every variant can be directly preselected using a distinct URL or query parameter and the page shows the matching image, price, availability, and cart selection.

Interim merchant markup uses one truthful `Product` and `Offer` corresponding to the initially selected/default variant, while visible HTML lists all available options. After variant deep links are implemented, upgrade to `ProductGroup`, `hasVariant`, `variesBy`, and unique variant identifiers.

## Validation stack

### Deterministic tests

- Vitest semantic HTML contracts
- real Arabic category values, not invented aliases
- all active products linked from the collection page
- valid Product/Offer and Breadcrumb JSON-LD
- 404 for missing products
- variants and price ranges visible in initial HTML

### Live Preview tests

- Playwright HTTP and browser audit
- console and page-error monitoring
- screenshots after the client app mounts
- semantic shell removed after client render
- no preview indexing
- category and product links resolve

### Visual parity

- Capture Production and Preview with the same browser, viewport, locale, reduced-motion setting, and storage state.
- Disable animation and transition timing only during capture.
- Produce Production, Preview, and difference images.
- Fail when the changed-pixel ratio exceeds the approved threshold.

### Quality budgets

- Lighthouse CI performance warning threshold
- accessibility and best-practices hard gates
- LCP, CLS, TBT, console, title, language, description, link names, and heading order

### External verification before merge

- Google Rich Results Test
- Schema.org Validator
- Google Search Console live URL test after production rollout
- Ahrefs recrawl and comparison against the baseline

## Acceptance criteria

The implementation is not ready to merge until all conditions are true:

1. Vercel Preview is available.
2. Raw HTML contains the route's real H1, content, links, canonical, and JSON-LD.
3. Client rendering produces no fatal console or hydration errors.
4. Automated visual comparison confirms the existing site design is unchanged.
5. Product listing exposes the full active catalog and real database categories.
6. Valid product pages return 200; missing products return 404.
7. Preview headers and metadata block indexing.
8. Focused CI, Playwright live audit, visual parity, and Lighthouse budgets pass.
9. Structured data is validated against the visible page content.
10. The PR remains Draft until owner review.

## Current blocker

Vercel has rejected Preview builds because the account reached a build rate limit. This is an infrastructure/account limitation, not evidence that the live Preview works. The live Playwright, visual parity, and Lighthouse workflow must be run as soon as a Preview URL is available.
