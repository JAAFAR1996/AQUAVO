# AQUAVO SSR Migration Decision

Status: Draft architecture decision for Preview validation only.

## Decision

Use Vike with `vike-react` as the progressive SSR/SSG layer for public acquisition routes. Do not migrate the entire AQUAVO application in one release.

The current semantic preview handler is an interim crawler-remediation experiment. It proves that crawlers can receive H1s, catalog links, product facts, status codes, and structured data, but it is not the final rendering architecture because the existing client entry still uses `createRoot()` and replaces the preview shell.

## Why Vike

- It is designed to add SSR/SSG progressively to an existing Vite application.
- SSR can be enabled per page, so admin, accounting, authenticated profile, cart, and checkout routes can remain SPA routes initially.
- It supports React integration and can render the same component tree on the server and client.
- It avoids a full framework rewrite while keeping a path to server routing, pre-rendering, streaming, and data fetching.

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

## Non-negotiable constraints

- No visual redesign.
- Reuse the existing React components and CSS.
- Server HTML and client HTML must match so React can use `hydrateRoot()` without hydration errors.
- Browser-only APIs such as `window`, `navigator`, `localStorage`, and `sessionStorage` must be isolated from server execution.
- Product and category data must come from the same database queries used to create metadata and structured data.
- Preview environments remain `noindex, nofollow, noarchive`.
- Nothing is merged to `main` until live Preview evidence passes.

## Data and hydration plan

- Fetch route data on the server.
- Serialize only public product/category fields into page context.
- Seed TanStack Query on the client with the server response to prevent a skeleton flash and a duplicate initial request.
- Render the same route component and provider tree on both sides.
- Attach React using hydration rather than replacing the server DOM.
- Keep analytics, pixels, onboarding effects, and other browser side effects client-only and after hydration.

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
4. Visual comparison confirms the existing site design is unchanged.
5. Product listing exposes the full active catalog and real database categories.
6. Valid product pages return 200; missing products return 404.
7. Preview headers and metadata block indexing.
8. Focused CI, Playwright live audit, and Lighthouse budgets pass.
9. Structured data is validated against the visible page content.
10. The PR remains Draft until owner review.

## Current blocker

Vercel has rejected Preview builds because the account reached a build rate limit. This is an infrastructure/account limitation, not evidence that the live Preview works. The live Playwright and Lighthouse workflow must be run as soon as a Preview URL is available.
