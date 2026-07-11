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

## 2026-07-11 — Phase 2 identity foundation

- Imported the owner-approved v2 horizontal, icon and favicon artwork without altering its geometry or colors.
- Added the locked v2 tokens: Primary `#0B93A6`, FlowLine `#0B64A6`, Dark Authority `#0B1E28`, Clean Proof `#F6F4EF` and documented support tokens.
- Replaced active legacy cyan, coral, deep-ocean and abyss values across customer and admin code.
- Removed active Outfit/Poppins use; Cairo is the Arabic/interface default and Inter is the English/interface font.
- Kept Changa available only as an explicit display token; routine headings now use Cairo.
- Updated header/footer, product fallbacks, invoices, search, blog, SSR, OG, JSON-LD, emails, PWA manifest, offline page and guide pages to v2 assets.
- Corrected the first-visit theme to Dark Authority while retaining saved user preferences.
- Changed the JSON-LD placeholder to an inert HTML comment so it never becomes visible text in local Vite rendering; both SSR paths replace the full comment safely.

Imported web asset SHA-256 values:

- `aquavo-v2-horizontal.svg`: `6428E2C6563B5F5F947E6E5FE26550B33E404E9C9EDC375C072E0AADD42E6B54`
- `aquavo-v2-horizontal.png`: `0034070DB8C7ACD99B4A551FEEA228A949A43C2442102C8BF41A5DA2C4ABFF74`
- `aquavo-v2-icon.svg`: `255A6371A816ED0F0ACF352F5C4D0489F6595EEDD2F0A8C00FFDF75159332651`
- `aquavo-v2-icon.png`: `DFCBE11A2D5332F1F66AF80F6E986FE55594A02C2BB909460EE27558EDDBEA10`
- `aquavo-v2-favicon.png`: `3C1C2ECC690F6A778A535EC7ECE45237A465A78BC016A01D2C1A86A54C5DE879`

Verification:

- Focused Vitest: 4 files, 20 tests passed.
- Chromium foundation regression: 3/3 viewports passed.
- TypeScript client check: passed.
- Production build: passed.
- Active legacy identity reference scan: zero matches for the retired tokens/fonts/logo paths (archived documentation excluded).

## 2026-07-11 — Phase 3 navigation and global trust

- Replaced the multi-style navigation with one stable dark v2 header for desktop, tablet and mobile.
- Reduced the primary navigation to the store, product-selection helper, AQUAVO guides, order tracking and company page.
- Preserved search, account, wishlist, cart drawer, checkout handoff and invoice behavior.
- Removed nested links/buttons; desktop and mobile keyboard paths now use one interactive element per action.
- Added the Valve-Gate mobile menu with service facts and theme control inside the panel.
- Rebuilt the footer around verified facts only: 24-hour Iraq-wide delivery, 5,000 IQD fee, COD, 24/7 support, contact details and checked/packed handling.
- Added the legal relationship: `AQUAVO / محل المنبع / AL NABEA SHOP`.
- Removed Qi Card/Zain Cash implications, the unsupported founder story, blanket authenticity percentages, direct-import and personal-testing claims from the global footer.
- Kept the YEE document as a separate proof link from policies and the future AQUAVO warranty.
- Added an accessible label and status/error messaging to the newsletter form.
- Corrected standalone `/guides` navigation to perform a full document request instead of Wouter client interception.

Verification:

- Navbar/footer Vitest: 2 files, 11 tests passed.
- Combined identity/global focused Vitest: 3 files, 14 tests passed.
- Chromium desktop/tablet/mobile plus footer trust regression: 4/4 tests passed.
- TypeScript client check: passed.
- Production build: passed.
- `git diff --check`: passed.

## 2026-07-11 — Phase 4 homepage

- Replaced the fragile absolute-positioned bento hero with the approved Controlled Waterline direction and normal document flow.
- Added one visible, benefit-first H1 in natural Iraqi copy: equipment arranged around the aquarium's needs.
- Replaced hard-selling and blanket authenticity language with calm product discovery and tank-selection actions.
- Removed the delayed hero video, random bubbles, pulsing badge, glow loops and generic entrance motion.
- Added a verified service strip for Iraq-wide 24-hour delivery, COD, 5,000 IQD delivery fee and 24/7 support.
- Added stable category discovery that remains useful when the local/API product request is unavailable.
- Kept real store picks optional: the section renders only when actual product data is returned and never leaves an empty panel.
- Added an education-first guide section and a consultative contact action.
- Removed nested links/buttons and preserved visible keyboard focus treatment.
- Replaced the old unsupported `100% original`, direct-import and universal-testing homepage claims.

Verification:

- Homepage Vitest contract: 9/9 tests passed.
- TypeScript client check: passed.
- Production build: passed; existing bundle-size warnings remain tracked for the performance phase.
- Chromium desktop/tablet/mobile plus footer regression: 4/4 tests passed.
- Browser widths verified: 1440×900, 768×1024 and 390×844 with no horizontal overflow.
- Desktop and mobile screenshots inspected: H1, hero image, CTA stack and proof strip remain visible without clipping.
- `git diff --check`: passed.
