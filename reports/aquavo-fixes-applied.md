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

## 2026-07-11 — Phase 5A shop cards and recovery

- Rebuilt the repeated product-card interaction so its product link no longer contains compare, wishlist, quick-view or cart buttons.
- Changed product imagery from crop-prone cover rendering to a dimensioned, contained product view with a safe v2 fallback.
- Preserved truthful variant pricing, sold-out, coming-soon and option-selection behavior.
- Removed card sheen/reveal motion, pulse feedback, A/B button wording and the flying-to-cart animation from the store card path.
- Reduced the generated product-card chunk from approximately 15.54 kB to 9.65 kB before gzip in comparable production builds.
- Replaced the blanket store-heading authenticity claim with a benefit-first product-selection message.
- Added an accessible label to the sort control and removed the non-functional grid/comparison tabs.
- Made loading independent from the secondary attribute request, limited product retries, and added one mutually exclusive Iraqi error state with a retry action.
- Kept filter/display state and product-detail scroll restoration behavior intact.

Verification:

- Products and product-card Vitest: 2 files, 13/13 tests passed.
- TypeScript client check: passed.
- Production build: passed; existing large vendor/model chunks remain tracked for Phase 10.
- Chromium global/shop regression: 6/6 tests passed.
- Shop recovery verified at 360×800 and 768×1024 with no document overflow.
- Mobile recovery screenshot inspected after final render; header, H1, filter/sort controls, error explanation and retry action remain usable.

Category URL follow-up:

- Read the public, unauthenticated production `GET /api/products/attributes` endpoint on 2026-07-11 to avoid inventing category values; no customer/private data or production write was involved.
- Added one shared category-link source for the homepage and global search.
- Replaced non-existent/mismatched links such as `Heaters`, `Lighting`, `Food` and `Water Treatment` with exact returned categories including `التحكم بالحرارة`, `الإضاءة`, `طعام الأسماك` and `معالجة المياه`.
- Added a contract test locking the seven shared category values to the verified public response.

## 2026-07-11 — Phase 6A product proof and YEE document

- Visually inspected the repository's YEE certificate image; the document names Weifang Yipin Pet Products Co., Ltd., `AQUAVO, Iraq`, the date January 14, 2026, and states the supplied YEE products are original.
- Rebuilt the proof page in the AQUAVO v2 system with global navigation/footer and no entrance, tilt, hologram or hover-lift effects.
- Added an accessible image viewer with zoom in, zoom out, reset, focusable scrolling and Escape close behavior.
- Kept direct access to the repository PDF and a clear return to the store.
- Scoped every authenticity statement to the YEE document and explicitly stated that it is not an AQUAVO warranty or proof for other brands.
- Removed the invented verification ID, fake remote-image fallback and nested anchor markup.
- Removed generic non-YEE product claims such as `ضمان الجودة` and `منتج أصلي 100%` from product details.
- Replaced the non-functional out-of-stock notification action with a truthful disabled status.
- Left AQUAVO warranty eligibility disabled; the exact eligible electrical product ID/SKU list is still owner data required before implementation.

Preserved document SHA-256 values:

- `yee-certificate.jpg`: `667D090A5FF452765A4E0F0DCC4AFAAD6F32532516ECD70CBF72367231C1210D`
- `yee-certificate.pdf`: `92A8BD7BC0CD09975F30C50528667AEB54A0827BF6D4FF72C923F3DFF65F31EB`

Verification:

- Product-detail and certificate Vitest: 2 files, 10/10 tests passed.
- TypeScript client check: passed.
- Chromium foundation/shop/certificate regression: 7/7 tests passed.
- Certificate desktop 1440×900 and mobile 390×844 screenshots inspected.
- Keyboard viewer path verified: open, zoom to 125%, Escape close; store-back and PDF targets verified.

## 2026-07-12 — Phase 7 cart and checkout equalization

- Removed the split checkout behavior where desktop opened a separate dialog/invoice implementation while mobile used `/checkout`.
- All cart checkout actions now close the drawer and enter the same tested checkout route.
- Preserved cart quantity/remove controls and changed cart product media to stable, dimensioned contained images with a v2 fallback.
- Added a server-total resolver that prefers authenticated loyalty `roundedTotal`, then order `roundedTotal`, then raw `total`, with the visible total as the final fallback.
- Applied that authoritative amount to purchase analytics and the guest order stash instead of reporting the product subtotal as revenue.
- Kept the order request price-free so the server remains the authority for product/variant price, stock, coupon, shipping and rounding.
- Removed emoji, hard account-upsell language and the blanket authenticity claim from checkout.
- Simplified pre-confirmation loyalty text so it does not invent a points award that may differ by membership tier.
- Added programmatic error relationships for name, phone, governorate and address; the informational guest note no longer announces itself as an error alert.
- Added missing accessible descriptions to the mobile menu and cart sheets.

Verification:

- Checkout, total resolver and navigation Vitest: 3 files, 13/13 tests passed after the final success-path addition.
- Valid-data review stage verified: delivery details render, terms checkbox gates the final action and no request is made before confirmation.
- Closed-circuit success used a mocked `201`-style response and verified redirect/stash behavior without a real order.
- Chromium foundation/shop/certificate/checkout regression: 8/8 tests passed.
- Browser checkout validation used a local guest cart and proved zero `POST /api/orders` calls for invalid data.
- Mobile checkout had no document overflow at 390×844.
