# AQUAVO Website v2 Master Checklist

Date started: 2026-07-11  
Approved branch: `codex/aquavo-website-v2-20260711`  
Starting commit: `67ff987fcff9ef8c506d6312509652501fcc08fd`

Allowed status values:

- `COMPLETED`
- `IN PROGRESS`
- `BLOCKED — OWNER DATA REQUIRED`
- `REJECTED — TECHNICAL JUSTIFICATION`
- `NOT APPLICABLE — EVIDENCE REQUIRED`

## Phase 1 — Safety, baseline, P0/P1 foundation

- COMPLETED — Dedicated branch and external worktree created; dirty `main` files remain untouched.
- COMPLETED — Dependency installation from the locked pnpm graph.
- COMPLETED — Live desktop, tablet, and mobile baseline evidence preserved outside the repository.
- COMPLETED — Baseline TypeScript failure reproduced at `products.tsx:364`.
- COMPLETED — Product schema image mapping fixed (`images`, `image`, `thumbnail`).
- COMPLETED — Duplicate visible SSR shells removed from both Vercel and Express rendering paths.
- COMPLETED — Timed loading overlay removed from `client/index.html`.
- COMPLETED — Wrong phone number corrected in email and content-generation sources.
- COMPLETED — Regression tests added for the document shell and Express SSR HTML.
- COMPLETED — TypeScript client check passes.
- COMPLETED — Shared route truth source and real HTTP 404 handling in Vercel and Express paths.
- COMPLETED — `/deals` registered; `/tank-builder` temporarily serves the existing setup wizard until its dedicated phase.
- IN PROGRESS — Baseline documentation and first coherent commit.

## Phase 2 — AQUAVO v2 identity foundation

- COMPLETED — Replaced legacy primary/deep/coral system with v2: `#0B93A6`, `#0B64A6`, `#0B1E28`, `#F6F4EF`.
- COMPLETED — Cairo for Arabic body/interface, Inter for English/interface, Changa restricted to the display token for later 40px+ use.
- COMPLETED — Replaced public logo, icon, favicon, manifest, OG, structured-data and email-template references with approved v2 sources.
- COMPLETED — Removed active Poppins, Outfit, `#199BB8`, coral and old dark-brand dependencies from source outside archived brand documentation.
- COMPLETED — Dark Authority is the first-visit default; saved light/system preferences remain respected.
- COMPLETED — Browser checks pass at desktop, tablet and mobile with no horizontal overflow in the tested foundation state.
- COMPLETED — Primary/FlowLine usage follows documented contrast limits; full accessibility audit remains in Phase 10.

## Phase 3 — Global trust and navigation

- COMPLETED — One focused semantic desktop/mobile navigation model.
- COMPLETED — Removed nested interactive elements and duplicate navigation tab stops.
- COMPLETED — Valve-Gate mobile menu uses the accessible Sheet focus/keyboard model.
- COMPLETED — Rebuilt footer with legal operator `محل المنبع / AL NABEA SHOP`.
- COMPLETED — Shows verified support, COD, delivery time, delivery fee and contact details consistently.
- COMPLETED — Newsletter field has a programmatic label; unsupported payment implications removed.
- COMPLETED — Removed the fabricated founder story and unsupported blanket trust/direct-import/tested-by-us claims from the global footer.
- COMPLETED — Standalone server-rendered guide links use document navigation instead of falling into the client 404 route.

## Phase 4 — Homepage

- COMPLETED — Controlled Waterline Hero with stable in-flow content at desktop, tablet and mobile.
- COMPLETED — Clear Iraqi/Baghdadi premium value proposition with one visible H1.
- COMPLETED — Proof-first trust strip limited to verified delivery, COD, fee and support facts.
- COMPLETED — API-independent category discovery plus optional real-data store picks.
- COMPLETED — Practical education section and calm consultation CTA.
- COMPLETED — Removed hero video, continuous pulse/glow, bubbles and generic entrance effects.
- COMPLETED — Removed nested interactive controls from the homepage.
- COMPLETED — Browser regression proves no horizontal overflow at 1440, 768 and 390 widths.

## Phase 5 — Shop, categories, search and cards

- COMPLETED — Shop route has no document overflow at tested 360 and 768 widths; 1024 remains in the full browser matrix.
- IN PROGRESS — Mobile filter/sort flow retains filter and display state; final interaction audit remains.
- COMPLETED — Product cards use stable contained images, explicit stock/price states and a simpler information hierarchy.
- COMPLETED — Product link and card actions are separate semantic controls with no nested interaction.
- COMPLETED — Product-card pulse, fly-to-cart and generic reveal motion removed.
- COMPLETED — Loading, empty and API-error states are mutually exclusive; the error state has a direct retry action.
- IN PROGRESS — Homepage and global-search category URLs now share exact public API values; the legacy standalone `/search` page remains for the content-route phase.
- COMPLETED — Deals route registered and focused page tests pass; v2 visual treatment remains in this phase.

## Phase 6 — Product detail, proof, certificate and warranty

- IN PROGRESS — Existing product media gallery remains; final Specimen Gallery visual audit is pending against real product data.
- COMPLETED — Removed generic `100% original`, `quality guaranteed` and non-functional stock-notification claims from non-YEE product UI.
- COMPLETED — Preserved and visually inspected the real YEE JPG/PDF certificate documents.
- COMPLETED — YEE certificate supports open, keyboard focus, zoom in/out/reset, Escape close and store-back action on desktop/mobile.
- COMPLETED — YEE proof is explicitly scoped to YEE products supplied to AQUAVO Iraq and separated from AQUAVO customer warranty.
- COMPLETED — Removed the invented `YEE-AQ-2026-VERIFIED` identifier and remote image fallback.
- COMPLETED — AQUAVO warranty eligibility remains disabled by default; no product was marked eligible.
- BLOCKED — OWNER DATA REQUIRED — Explicit list of electrical product IDs eligible for the proposed six-month limited warranty.
- BLOCKED — OWNER DATA REQUIRED — Exact eligible product IDs/SKUs; eligibility remains disabled by default.
- COMPLETED — Eligible-item policy starts on confirmed delivery date once an approved SKU is enabled.
- COMPLETED — First seven calendar days policy: replacement after inspection confirms manufacturing defect.
- COMPLETED — Day 8 through month 6 policy: repair, replacement, then refund/customer-approved alternative if impossible.
- COMPLETED — Non-warranty items retain delivery, damage, missing-item and conformity policies.

## Phase 7 — Cart and checkout

- COMPLETED — One cart drawer leads desktop and mobile into the same `/checkout` route; the duplicate desktop checkout/invoice branch was removed from navigation.
- COMPLETED — Checkout Equalization prefers the server-authoritative rounded amount for analytics, local order stash and confirmation fallback.
- COMPLETED — COD-only messaging is visible at information, summary and confirmation stages.
- COMPLETED — 5,000 IQD delivery fee and 24-hour Iraq-wide delivery truth are sourced from shared constants.
- COMPLETED — Input labels, `aria-invalid`, linked error descriptions, governorate keyboard/listbox flow and terms gating are covered.
- COMPLETED — Removed checkout emoji, aggressive account upsell and blanket authenticity copy.
- COMPLETED — Closed Circuit Success verified with a mocked server response; no real order or production mutation occurred.
- COMPLETED — Browser invalid-data path proves no `POST /api/orders` request occurs before validation passes.

## Phase 8 — Content, calculators, policies and company pages

- PENDING — Guides index and internal linking within React-owned pages.
- COMPLETE — Calculators and aquarium setup tools reviewed; outputs framed as estimates and user-facing emoji removed from water status.
- COMPLETE — `/tank-builder` intentionally resolves to the existing guided `/journey` setup flow; removed the invalid `/3d-tank-builder` promise from search.
- COMPLETE — About, Why AQUAVO, Contact and FAQ truth alignment.
- COMPLETE — Shipping, returns, privacy and terms consistency aligned with current implementation and approved business facts.
- COMPLETE — Support shown as 24/7 without restrictive hours.
- COMPLETE — Removed live-fish/plants commerce implications from core trust, search and AI sales guidance; educational fish-care content remains clearly non-commerce.

## Phase 9 — Minimal Precision motion

- COMPLETED — Controlled Waterline Hero / Page FlowLine: one 520 ms CSS line establishes reading direction without delaying content.
- COMPLETED — Proof Window Lift: one 360 ms, 6 px proof reveal on the hero and verified certificate document.
- COMPLETED — Trust Seal Entrance: opacity-only 260 ms entrance on the four verified service facts.
- COMPLETED — Valve-Gate Menu: retained the accessible directional Radix sheet transition; no second custom animation layer.
- COMPLETED — Filter Chamber: a static FlowLine rail groups filter/sort controls without layout movement.
- COMPLETED — Specimen Gallery: retained the immediate, contained product/document gallery and existing keyboard controls; no cross-page shared-element dependency.
- REJECTED — TECHNICAL JUSTIFICATION — Circulation Loop Cart / product-fly animation would add distraction and spatial ambiguity; immediate count/total feedback and the unified checkout route are safer.
- COMPLETED — Checkout Equalization: state and validation feedback remain immediate, with no animation gating purchase controls.
- REJECTED — TECHNICAL JUSTIFICATION — Filtration Path Diagram needs a verified technical process and product-specific content; a decorative diagram would fabricate meaning.
- COMPLETED — Infinity Load Mark: existing dimension-stable skeleton/loading states retained; no endless decorative loop added.
- COMPLETED — Bypass Recovery: single mutually exclusive recovery state with retry remains the low-motion fallback.
- COMPLETED — Closed Circuit Success: existing order-success state is reached only after confirmed response; no real order was placed during verification.
- COMPLETED — Specification Channel: stable specification hierarchy retained; animation rejected because it would delay product facts.
- REJECTED — TECHNICAL JUSTIFICATION — Stability Gauge would imply measured product or tank stability data the store does not have.
- COMPLETED — Evidence Anchor: high-contrast focus-visible anchor added to the certificate proof interaction.
- COMPLETED — `prefers-reduced-motion` equivalence disables every new animation while preserving the FlowLine and all information.
- REJECTED — TECHNICAL JUSTIFICATION — GSAP, Three.js, WebGL, video backgrounds, parallax, animated fish/bubbles/mascot, pulsing buttons and flying-to-cart effects conflict with approved direction, accessibility and performance goals.

## Phase 10 — Accessibility, RTL, SEO and performance

- COMPLETED — One visible H1 across 90 route/viewport checks on 15 representative public routes and six required widths.
- COMPLETED — Semantic landmarks, labels, keyboard focus and skip link verified on core flows; v2 Playwright foundation passes.
- COMPLETED — RTL and mixed-direction layout verified on the 15-route six-viewport matrix with zero final horizontal overflow.
- COMPLETED — Automated axe 4.12.1 browser checks on seven core routes plus certificate keyboard and reduced-motion checks; automated coverage does not replace manual review.
- COMPLETED — Canonical strips query/hash, OG URL follows canonical, manifest and homepage Organization/WebSite JSON-LD use v2 truthful identity.
- COMPLETED — Removed six sitemap URLs without matching routes; true HTTP 404 was completed in Phase 1.
- COMPLETED — Core commerce images have dimensions/contained behavior and store skeletons remain dimension-stable.
- COMPLETED — Fresh local Chromium CLS/LCP evidence recorded with explicit non-production limitations; no Lighthouse score invented.

## Phase 11 — Extended production identity assets

- COMPLETED — Created `16_Extended_Production_Assets_v2` outside the repository under the approved identity root.
- COMPLETED — Preserved the archive and created a 23-row source-to-destination migration manifest.
- COMPLETED — Letterhead, quotation, work-contract template and report template.
- COMPLETED — Two business cards, task memo, receipt and payment vouchers.
- COMPLETED — A5, A4 and A3 envelopes; folder; legal-stamp template; badge; calendar; file labels.
- COMPLETED — Facebook and LinkedIn covers; Story template; presentation HTML master; email signature; WhatsApp stickers.
- COMPLETED — 23 editable HTML masters plus 23 PDF, 23 PNG and 23 WebP exports.
- COMPLETED — 149 SHA-256 records, zero render resource failures, corrected crop pass, contact-sheet review and representative full-size inspection.

## Phases 12–14 — Verification and handoff

- COMPLETED — Local browser regression: 90 route/viewport checks plus 8/8 v2 Chromium tests and 12 inspected homepage/store screenshots.
- PENDING — Independent review by a separate agent/reviewer.
- PENDING — Fix all accepted independent-review findings.
- PENDING — Production readiness report.
- COMPLETED — No deployment, push, production-data mutation, real order, message or DNS change.
