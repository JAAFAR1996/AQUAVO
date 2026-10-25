# Product discovery UI

Based on `743b1742a3f3f02ba27d5bd529b6f9a0ad51b29f`.

## Behavior

- Product information uses existing Radix primitives: all sections expand on desktop; benefits/specifications start open on mobile, and supplied safety warnings also keep usage open. Desktop links navigate to real section anchors. Actual catalogue benefits replace generic promotional cards. Unreviewed products do not display a misleading zero-star specification.
- Filters initially expose eight brands, keep selected brands visible, and never hide just one remaining brand. Cancelling discards the draft. The preview reuses the listing's server query and client filters, including stock/variants and food filters. A 200 ms debounce and response cleanup prevent stale counts. Preview failure leaves Apply available with no invented count. Per-brand counts from the previously applied subset were removed because they were misleading during draft changes.
- The existing image nodes render immediately. Multi-image products progressively load the existing Embla dependency for RTL/LTR touch navigation. Single-image products do not request it. Buttons, thumbnails and zoom work if the optional enhancement cannot load. Reduced motion disables carousel interpolation. Variant changes reset the gallery; failed original images stop retrying. No autoplay.
- Arabic, English and Kurdish labels are supplied. Keyboard focus, dialog labels, native button activation and visible contrast are covered.

No product records, prices, stock, variant identities, checkout logic, schema, original image files, dependencies or lockfile were changed. No paid component source was copied. Product imagery remains the existing catalogue imagery; this change does not invent feature-to-photo mappings.

## Verification

- Production client/server build passed using `NODE_ENV=production node --import tsx script/build.ts`.
- Client TypeScript and the existing strict server/migration gates passed.
- Broad storefront suite: 154 files / 1,330 tests passed with `TZ=UTC`.
- Final focused regression suite: 7 files / 75 tests passed, including draft cancellation, out-of-order responses, preview failure, zero results, gallery fallback, variant metadata/cart behavior and listing restoration.
- Production-build browser runner: `node scripts/verify-product-discovery-ux.mjs`. Six scenarios cover Arabic mobile/desktop, English mobile, Kurdish tablet, single-photo products and a blocked optional swipe chunk. These use loopback-only synthetic fixtures and block external requests. Screenshots were inspected; no live orders or inventory operations were performed. This runner is included in the existing CI build job after Chromium installation.
- The full repository run was attempted but is not certified locally: a spawned `tsx` test cannot open its IPC socket in this execution environment, and one worker exited. Missing sparse-checkout fixtures were restored and their suites rerun. This limitation also affects the unmodified baseline subprocess test.
- GitHub CI subsequently passed the complete suite on `74fad3dcf5d33957eb3fe5d1130a0410fe6b81d2`: 417 files / 4,515 tests passed, with one file / seven tests skipped. Production build, all six browser scenarios, lint/types, security, SEO preview and both locale SEO/SSR checks also passed.
- Final visual review corrected lightbox button contrast in the light theme, including hover. The follow-up was rebuilt and passed all 16 gallery unit tests and six browser scenarios; the browser gate now checks the close button's rendered color before and after hover. Check the latest commit's CI before merge.
- The i18n translation validator still emits the same structured findings as baseline PR #338, and Netlify deploy preview fails on both PRs. Neither existing check was bypassed.

## Loading cost

Gzip measurements from fresh production builds, baseline → candidate:

| Artifact | Baseline | Candidate |
| --- | ---: | ---: |
| Public entry JS | 6.59 KiB | 6.59 KiB |
| Product route JS | 26.82 KiB | approximately 27.6 KiB |
| Optional multi-image enhancement | part of other routes | 7.57 KiB, loaded only for multi-image galleries |
| Public CSS | 54.13 KiB | approximately 54.3 KiB |

These are artifact sizes, not measured production LCP or conversion improvements. The existing budget script is already above its CSS 50 KiB / product-route 25 KiB limits on unmodified main. Its thresholds were not changed to hide that baseline issue.

## Release

Review the isolated branch and its CI result before merging. Production publication and field/mobile-device verification are separate from this local implementation. Keep the existing product price/stock refresh and server purchase validation authoritative.
