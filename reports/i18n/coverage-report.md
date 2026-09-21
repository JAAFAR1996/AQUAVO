# AQUAVO translation coverage report

Generated 2026-09-19T13:38:21.131Z against https://www.aquavoiq.com.

## 1. UI string bundles (client/src/locales)

| Locale | Keys | Missing | Arabic leaks |
|---|---|---|---|
| ar | 5452 | 0 (source) | n/a |
| en | 5452 | 0 | 0 |
| ckb | 5452 | 0 | 0 |

## 2. Static SEO metadata (indexable paths)

| Locale | Covered |
|---|---|
| ar | 23/23 |
| en | 23/23 |
| ckb | 23/23 |

## 3. Business content (live catalogue vs generated translations)

| Entity | ar | en | ckb |
|---|---|---|---|
| products | 107/107 | 107/107 (100.0%) | 107/107 (100.0%) |
| blog_posts | 117/117 | 117/117 (100.0%) | 117/117 (100.0%) |
| blog_categories | 8/8 | 8/8 (100.0%) | 8/8 (100.0%) |
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
- D) Customer-facing Arabic still hard-coded: 22 files, 124 lines
  - client/src/components/products/category-cards.tsx (20)
  - client/src/pages/temperature-guide.tsx (15)
  - client/src/components/products/product-specifications-table.tsx (14)
  - client/src/components/seo/meta-tags.tsx (9)
  - client/src/components/products/multi-dimension-variant-selector.tsx (8)
  - client/src/components/products/product-variant-selector.tsx (8)
  - client/src/pages/product-details.tsx (8)
  - client/src/pages/fish-health-diagnosis.tsx (7)
  - client/src/hooks/use-navbar-preferences.tsx (6)
  - client/src/components/journey/utils.ts (5)
  - client/src/pages/fish-patients.tsx (5)
  - client/src/components/cart/invoice-dialog.tsx (3)
  - client/src/components/products/product-image-gallery.tsx (3)
  - client/src/pages/cultural-twin.tsx (3)
  - client/src/components/home/aquascape-styles.tsx (2)
  - client/src/components/notifications/notification-bell.tsx (2)
  - client/src/components/cart/checkout/loyalty-section.tsx (1)
  - client/src/components/chat/ai-chat-bot.tsx (1)
  - client/src/components/products/embedded-variant-selector.tsx (1)
  - client/src/hooks/use-toast.ts (1)
  - client/src/test-utils.tsx (1)
  - client/src/types/index.ts (1)

## 5. Release eligibility (option A gate, shared/i18n/release.ts)

| Locale | Eligible | Blocking reasons |
|---|---|---|
| en | yes | — |
| ckb | yes | — |

Eligibility never flips the release flag; a person sets `ready: true` in shared/i18n/release.ts in a reviewed commit. Review status (machine → reviewed) is a separate, human step in the admin editor.
