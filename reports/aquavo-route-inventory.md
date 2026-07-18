# AQUAVO Route Inventory

Baseline date: 2026-07-11

## Counts

- Client route declarations: 81
- Sitemap URLs: 52
- Two sitemap URLs were confirmed as client 404s: `/deals`, `/tank-builder`
- Client catch-all exists, but the Vercel SSR shell currently returns HTTP 200 for unknown non-asset paths.

## Route groups

- Commerce: `/products`, `/products/:slug`, `/cart`, `/checkout`, `/wishlist`, `/compare`, `/search`, `/deals`
- Trust/company: `/about`, `/about-aquavo`, `/why-aquavo`, `/contact`, `/faq`, `/shipping`, `/return-policy`, `/privacy-policy`, `/terms`, `/verify-certificate/:id`
- Education/tools: `/guides/*`, `/beginner-guide`, `/calculators`, `/aquarium-wizard`, `/tank-builder`, `/temperature-guide`
- Account/order: `/login`, `/register`, `/profile`, `/forgot-password`, `/order-tracking`, `/order-confirmation/:id`, `/invoice/:token`
- Internal/admin: `/admin/*`
- Legacy/community features: fish encyclopedia, fish health, compatibility, gallery, journey and cultural-twin routes.

## Required route decisions

| Route | Baseline | Approved action |
|---|---|---|
| `/deals` | Component existed but was not registered | Registered in Phase 1; v2 restyle remains |
| `/tank-builder` | Referenced by SEO/sitemap; no page component existed | Temporarily mapped to the setup wizard; dedicated implementation remains |
| unknown route | Client NotFound inside HTTP 200 | Corrected: Vercel and Express return the shell with HTTP 404 |
| `/verify-certificate/yee` | Existing route and certificate claim | Preserve real document and verify complete interaction |
| `/cart` | Redirects to query-driven drawer | Reassess during cart phase; keep functional until replacement is verified |

## Source-of-truth requirement

A single route manifest will drive server status decisions, sitemap generation/validation and route parity tests. Dynamic patterns must include product slugs, guide paths, order confirmation, certificate, blog, invoice and admin routes without making arbitrary unknown URLs valid.

Official implementation references checked on 2026-07-11:

- Wouter v3 documents a pathless final `Route` inside `Switch` as the default route: https://github.com/molefrog/wouter
- Vercel documents SPA rewrites and custom 404 handling: https://vercel.com/docs/frameworks/frontend/vite and https://vercel.com/kb/guide/custom-404-page
