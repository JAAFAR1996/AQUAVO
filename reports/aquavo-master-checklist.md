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

- PENDING — Controlled Waterline Hero.
- PENDING — Clear Iraqi/Baghdadi premium value proposition.
- PENDING — Proof-first trust strip.
- PENDING — Category/product discovery with one idea per section.
- PENDING — Practical education section and calm consultation CTA.
- PENDING — Remove continuous pulse, glow, bubbles, mascot and generic entrance effects.

## Phase 5 — Shop, categories, search and cards

- PENDING — Eliminate viewport overflow at 360, 768 and 1024 widths.
- PENDING — Mobile filter/sort flow with state persistence and accessible controls.
- PENDING — Product cards with image stability, stock truth and benefit-first hierarchy.
- PENDING — Empty/error/loading states and Bypass Recovery.
- PENDING — Search and category URL consistency.
- COMPLETED — Deals route registered and focused page tests pass; v2 visual treatment remains in this phase.

## Phase 6 — Product detail, proof, certificate and warranty

- PENDING — Product media gallery and Specimen Gallery interaction.
- PENDING — Product facts only; no invented specs or claims.
- PENDING — Preserve the real YEE certificate document.
- PENDING — Verify YEE certificate open, keyboard access, zoom, close and back on desktop/mobile.
- PENDING — Keep YEE certificate separate from AQUAVO customer warranty.
- PENDING — Warranty eligibility disabled by default.
- BLOCKED — OWNER DATA REQUIRED — Explicit list of electrical product IDs eligible for the proposed six-month limited warranty.
- PENDING — Eligible-item warranty starts on confirmed delivery date.
- PENDING — First seven calendar days: replacement after inspection confirms manufacturing defect.
- PENDING — Day 8 through month 6: repair, replacement, then refund/customer-approved alternative if impossible.
- PENDING — Non-warranty items retain delivery, damage, missing-item and conformity policies.

## Phase 7 — Cart and checkout

- PENDING — Circulation Loop Cart.
- PENDING — Checkout Equalization and clear order totals.
- PENDING — COD-only messaging.
- PENDING — 5,000 IQD delivery fee and 24-hour Iraq-wide delivery truth.
- PENDING — Input labels, validation, keyboard flow and error recovery.
- PENDING — Closed Circuit Success without placing a real order.

## Phase 8 — Content, calculators, policies and company pages

- PENDING — Guides index and internal linking within React-owned pages.
- PENDING — Calculators and aquarium setup tools.
- PENDING — Tank-builder route decision and implementation.
- PENDING — About, Why AQUAVO, Contact and FAQ truth alignment.
- PENDING — Shipping, returns, privacy and terms consistency.
- PENDING — Support shown as 24/7 without restrictive hours.
- PENDING — Remove live-fish/plants commerce implications.

## Phase 9 — Minimal Precision motion

- PENDING — FlowLine.
- PENDING — Proof Window Lift.
- PENDING — Trust Seal.
- PENDING — Filter Chamber.
- PENDING — Filtration Path.
- PENDING — Infinity Load.
- PENDING — Specification Channel.
- PENDING — Stability Gauge.
- PENDING — Evidence Anchor.
- PENDING — `prefers-reduced-motion` equivalence.
- REJECTED — TECHNICAL JUSTIFICATION — GSAP, Three.js, WebGL, video backgrounds, parallax, animated fish/bubbles/mascot, pulsing buttons and flying-to-cart effects conflict with approved direction, accessibility and performance goals.

## Phase 10 — Accessibility, RTL, SEO and performance

- PENDING — One visible H1 per routed page.
- PENDING — Semantic landmarks, labels, keyboard focus and skip link.
- PENDING — RTL layout and mixed-direction data review.
- PENDING — Automated axe/Playwright checks plus manual keyboard checks.
- PENDING — Canonical, OG, manifest and JSON-LD v2 identity.
- PENDING — Route/sitemap/canonical parity and true 404 HTTP status.
- PENDING — Responsive image dimensions and stable skeletons.
- PENDING — Fresh CLS/LCP/performance evidence.

## Phase 11 — Extended production identity assets

- PENDING — Create `16_Extended_Production_Assets_v2` outside the repository under the approved identity root.
- PENDING — Preserve the archive and build source-to-destination mapping.
- PENDING — Letterhead, quotation, contract and report.
- PENDING — Two business cards, task memo, receipt and payment vouchers.
- PENDING — A5, A4 and A3 envelopes; folder; legal stamp; badge; calendar; file labels.
- PENDING — Facebook and LinkedIn covers; Story template; presentation; email signature; WhatsApp stickers.
- PENDING — Editable sources plus PDF/PNG/WebP/print exports where applicable.
- PENDING — Checksums and visual verification.

## Phases 12–14 — Verification and handoff

- PENDING — Full local browser regression across desktop, tablet and mobile.
- PENDING — Independent review by a separate agent/reviewer.
- PENDING — Fix all accepted independent-review findings.
- PENDING — Production readiness report.
- PENDING — No deployment, push, production-data mutation, real order, message or DNS change.
