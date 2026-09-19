# AQUAVO translation coverage report

Generated 2026-09-19T00:15:57.694Z against https://www.aquavoiq.com.

## 1. UI string bundles (client/src/locales)

| Locale | Keys | Missing | Arabic leaks |
|---|---|---|---|
| ar | 5508 | 0 (source) | n/a |
| en | 5508 | 4827 | 0 |
| ckb | 5508 | 4827 | 0 |

Missing in en: account:profile-loyalty.s1, account:profile-loyalty.s2, account:profile-loyalty.s3, account:profile-loyalty.s4, account:profile-loyalty.s5, account:profile-loyalty.s6, account:profile-loyalty.s7, account:profile-loyalty.s8, account:profile-loyalty.s9, account:profile-loyalty.s10, account:profile-loyalty.s11, account:profile-loyalty.s12, account:profile-loyalty.s13, account:profile-loyalty.s14, account:profile-loyalty.s15, account:profile-loyalty.s16, account:profile-loyalty.s17, account:profile-loyalty.s18, account:profile-loyalty.s19, account:profile-loyalty.s20, account:profile-loyalty.s21, account:profile-loyalty.s22, account:profile-loyalty.s23, account:profile-loyalty.s24, account:profile-loyalty.s25, account:profile-loyalty.s26, account:profile-loyalty.s27, account:profile-loyalty.s28, account:profile-loyalty.s29, account:profile-loyalty.s30, account:profile-loyalty.s31, account:profile-loyalty.s32, account:profile-loyalty.s33, account:profile-loyalty.s34, account:profile-loyalty.s35, account:profile-loyalty.s36, account:profile-loyalty.s37, account:profile-loyalty.s38, account:profile-loyalty.s39, account:profile-loyalty.s40, account:profile-loyalty.s41, account:profile-loyalty.s42, account:profile-loyalty.s43, account:profile-loyalty.s44, account:profile-loyalty.s45, account:profile-loyalty.s46, account:profile-loyalty.s47, account:profile-loyalty.s48, account:profile-loyalty.s49, account:profile-loyalty.s50 …

Missing in ckb: account:profile-loyalty.s1, account:profile-loyalty.s2, account:profile-loyalty.s3, account:profile-loyalty.s4, account:profile-loyalty.s5, account:profile-loyalty.s6, account:profile-loyalty.s7, account:profile-loyalty.s8, account:profile-loyalty.s9, account:profile-loyalty.s10, account:profile-loyalty.s11, account:profile-loyalty.s12, account:profile-loyalty.s13, account:profile-loyalty.s14, account:profile-loyalty.s15, account:profile-loyalty.s16, account:profile-loyalty.s17, account:profile-loyalty.s18, account:profile-loyalty.s19, account:profile-loyalty.s20, account:profile-loyalty.s21, account:profile-loyalty.s22, account:profile-loyalty.s23, account:profile-loyalty.s24, account:profile-loyalty.s25, account:profile-loyalty.s26, account:profile-loyalty.s27, account:profile-loyalty.s28, account:profile-loyalty.s29, account:profile-loyalty.s30, account:profile-loyalty.s31, account:profile-loyalty.s32, account:profile-loyalty.s33, account:profile-loyalty.s34, account:profile-loyalty.s35, account:profile-loyalty.s36, account:profile-loyalty.s37, account:profile-loyalty.s38, account:profile-loyalty.s39, account:profile-loyalty.s40, account:profile-loyalty.s41, account:profile-loyalty.s42, account:profile-loyalty.s43, account:profile-loyalty.s44, account:profile-loyalty.s45, account:profile-loyalty.s46, account:profile-loyalty.s47, account:profile-loyalty.s48, account:profile-loyalty.s49, account:profile-loyalty.s50 …

## 2. Static SEO metadata (indexable paths)

| Locale | Covered |
|---|---|
| ar | 23/23 |
| en | 23/23 |
| ckb | 23/23 |

## 3. Business content (live catalogue vs generated translations)

| Entity | ar | en | ckb |
|---|---|---|---|
| products | 107/107 | 48/107 (44.9%) | 0/107 (0.0%) |
| blog_posts | 117/117 | 0/117 (0.0%) | 0/117 (0.0%) |
| blog_categories | 8/8 | 0/8 (0.0%) | 0/8 (0.0%) |
| categories | 11/11 | 11/11 (100.0%) | 11/11 (100.0%) |

Translation records live in data/i18n/translations/<locale>/*.json until TOOLS/i18n/seed-translations.mjs loads them into content_translations (requires the migration).

## 4. Hard-coded Arabic in customer-facing client code

- A) Localized source bundles: client/src/locales/ar/*.json (15 namespaces) — by design.
- B) Intentional Arabic data/content files: 5
  - client/src/components/journey/fish-species-data.ts
  - client/src/data/blog-articles.ts
  - client/src/data/breeding-data.ts
  - client/src/lib/aquascape-data.ts
  - client/src/lib/site-search.ts
- C) Comments only: 37 files
- D) Customer-facing Arabic still hard-coded: 34 files, 253 lines
  - client/src/components/products/category-scroll-bar.tsx (42)
  - client/src/lib/accountant-pdf-v2.ts (24)
  - client/src/lib/variant-dimensions.ts (24)
  - client/src/components/products/category-cards.tsx (20)
  - client/src/components/products/product-variant-selector.tsx (20)
  - client/src/components/cart/checkout/types.ts (18)
  - client/src/components/products/product-specifications-table.tsx (14)
  - client/src/components/home/home-hero.tsx (9)
  - client/src/components/products/multi-dimension-variant-selector.tsx (8)
  - client/src/pages/guides-decor-stones.tsx (8)
  - client/src/pages/product-details.tsx (8)
  - client/src/pages/fish-health-diagnosis.tsx (7)
  - client/src/hooks/use-navbar-preferences.tsx (6)
  - client/src/pages/fish-patients.tsx (6)
  - client/src/components/journey/utils.ts (5)
  - client/src/components/motion/displacement-runtime.tsx (4)
  - client/src/components/products/product-image-gallery.tsx (4)
  - client/src/components/cart/invoice-dialog.tsx (3)
  - client/src/components/notifications/notification-bell.tsx (3)
  - client/src/pages/cultural-twin.tsx (3)
  - client/src/components/home/aquascape-styles.tsx (2)
  - client/src/pages/blog.tsx (2)
  - client/src/pages/temperature-guide.tsx (2)
  - client/src/components/cart/checkout/loyalty-section.tsx (1)
  - client/src/components/chat/ai-chat-bot.tsx (1)
  - client/src/components/gallery/masonry-gallery-grid.tsx (1)
  - client/src/components/journey/fish-selection.tsx (1)
  - client/src/components/products/embedded-variant-selector.tsx (1)
  - client/src/hooks/use-toast.ts (1)
  - client/src/pages/about.tsx (1)
  - client/src/pages/guides-new-aquarium-setup.tsx (1)
  - client/src/pages/journey.tsx (1)
  - client/src/test-utils.tsx (1)
  - client/src/types/index.ts (1)
