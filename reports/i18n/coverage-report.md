# AQUAVO translation coverage report

Generated 2026-09-19T03:49:33.537Z against https://www.aquavoiq.com.

## 1. UI string bundles (client/src/locales)

| Locale | Keys | Missing | Arabic leaks |
|---|---|---|---|
| ar | 5421 | 0 (source) | n/a |
| en | 5421 | 1469 | 0 |
| ckb | 5421 | 4311 | 2 |

Missing in en: guides:guides-essential-tools.s41, guides:guides-essential-tools.s42, guides:guides-essential-tools.s43, guides:guides-essential-tools.s44, guides:guides-essential-tools.s45, guides:guides-essential-tools.s46, guides:guides-essential-tools.s47, guides:guides-essential-tools.s48, guides:guides-essential-tools.s49, guides:guides-essential-tools.s50, guides:guides-essential-tools.s51, guides:guides-essential-tools.s52, guides:guides-essential-tools.s53, guides:guides-essential-tools.s54, guides:guides-essential-tools.s55, guides:guides-essential-tools.s56, guides:guides-essential-tools.s57, guides:guides-essential-tools.s58, guides:guides-essential-tools.s59, guides:guides-essential-tools.s60, guides:guides-essential-tools.s61, guides:guides-essential-tools.s62, guides:guides-essential-tools.s63, guides:guides-essential-tools.s64, guides:guides-essential-tools.s65, guides:guides-essential-tools.s66, guides:guides-essential-tools.s67, guides:guides-essential-tools.s68, guides:guides-essential-tools.s69, guides:guides-essential-tools.s70, guides:guides-essential-tools.s71, guides:guides-essential-tools.s72, guides:guides-essential-tools.s73, guides:guides-essential-tools.s74, guides:guides-essential-tools.s75, guides:guides-essential-tools.s76, guides:guides-essential-tools.s77, guides:guides-essential-tools.s78, guides:guides-essential-tools.s79, guides:guides-essential-tools.s80, guides:guides-essential-tools.s121, guides:guides-essential-tools.s122, guides:guides-essential-tools.s123, guides:guides-essential-tools.s124, guides:guides-essential-tools.s125, guides:guides-essential-tools.s126, guides:guides-essential-tools.s127, guides:guides-essential-tools.s128, guides:guides-essential-tools.s129, guides:guides-essential-tools.s130 …

Missing in ckb: account:profile-loyalty.s1, account:profile-loyalty.s2, account:profile-loyalty.s3, account:profile-loyalty.s4, account:profile-loyalty.s5, account:profile-loyalty.s6, account:profile-loyalty.s7, account:profile-loyalty.s8, account:profile-loyalty.s9, account:profile-loyalty.s10, account:profile-loyalty.s11, account:profile-loyalty.s12, account:profile-loyalty.s13, account:profile-loyalty.s14, account:profile-loyalty.s15, account:profile-loyalty.s16, account:profile-loyalty.s17, account:profile-loyalty.s18, account:profile-loyalty.s19, account:profile-loyalty.s20, account:profile-loyalty.s21, account:profile-loyalty.s22, account:profile-loyalty.s23, account:profile-loyalty.s24, account:profile-loyalty.s25, account:profile-loyalty.s26, account:profile-loyalty.s27, account:profile-loyalty.s28, account:profile-loyalty.s29, account:profile-loyalty.s30, account:profile-loyalty.s31, account:profile-loyalty.s32, account:profile-loyalty.s33, account:profile-loyalty.s34, account:profile-loyalty.s35, account:profile-loyalty.s36, account:profile-loyalty.s37, account:profile-loyalty.s38, account:profile-loyalty.s39, account:profile-loyalty.s40, account:profile-loyalty.s41, account:profile-loyalty.s42, account:profile-loyalty.s43, account:profile-loyalty.s44, account:profile-loyalty.s45, account:profile-loyalty.s46, account:profile-loyalty.s47, account:profile-loyalty.s48, account:profile-loyalty.s49, account:profile-loyalty.s50 …

Arabic leaks in ckb: account:register.s23, account:profile.s6

## 2. Static SEO metadata (indexable paths)

| Locale | Covered |
|---|---|
| ar | 23/23 |
| en | 23/23 |
| ckb | 23/23 |

## 3. Business content (live catalogue vs generated translations)

| Entity | ar | en | ckb |
|---|---|---|---|
| products | 107/107 | 50/107 (46.7%) | 0/107 (0.0%) |
| blog_posts | 117/117 | 0/117 (0.0%) | 0/117 (0.0%) |
| blog_categories | 8/8 | 0/8 (0.0%) | 0/8 (0.0%) |
| categories | 11/11 | 11/11 (100.0%) | 11/11 (100.0%) |

Translation records live in data/i18n/translations/<locale>/*.json until TOOLS/i18n/seed-translations.mjs loads them into content_translations (requires the migration).

## 4. Hard-coded Arabic in customer-facing client code

- A) Localized source bundles: client/src/locales/ar/*.json (15 namespaces) — by design.
- B) Intentional Arabic data/content files: 10
  - client/src/components/cart/checkout/types.ts
  - client/src/components/home/home-hero.tsx
  - client/src/components/journey/fish-species-data.ts
  - client/src/components/products/category-scroll-bar.tsx
  - client/src/data/blog-articles.ts
  - client/src/data/breeding-data.ts
  - client/src/lib/accountant-pdf-v2.ts
  - client/src/lib/aquascape-data.ts
  - client/src/lib/site-search.ts
  - client/src/lib/variant-dimensions.ts
- C) Comments only: 37 files
- D) Customer-facing Arabic still hard-coded: 30 files, 157 lines
  - client/src/components/products/category-cards.tsx (20)
  - client/src/components/products/product-variant-selector.tsx (20)
  - client/src/components/products/product-specifications-table.tsx (14)
  - client/src/pages/temperature-guide.tsx (14)
  - client/src/components/seo/meta-tags.tsx (9)
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
