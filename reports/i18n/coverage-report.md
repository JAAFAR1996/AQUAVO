# AQUAVO translation coverage report

Generated 2026-09-18T23:37:56.279Z against https://www.aquavoiq.com.

## 1. UI string bundles (client/src/locales)

| Locale | Keys | Missing | Arabic leaks |
|---|---|---|---|
| ar | 649 | 0 (source) | n/a |
| en | 649 | 0 | 0 |
| ckb | 649 | 0 | 0 |

## 2. Static SEO metadata (indexable paths)

| Locale | Covered |
|---|---|
| ar | 23/23 |
| en | 23/23 |
| ckb | 23/23 |

## 3. Business content (live catalogue vs generated translations)

| Entity | ar | en | ckb |
|---|---|---|---|
| products | 107/107 | 47/107 (43.9%) | 0/107 (0.0%) |
| blog_posts | 117/117 | 0/117 (0.0%) | 0/117 (0.0%) |
| blog_categories | 8/8 | 0/8 (0.0%) | 0/8 (0.0%) |
| categories | 11/11 | 11/11 (100.0%) | 11/11 (100.0%) |

Translation records live in data/i18n/translations/<locale>/*.json until TOOLS/i18n/seed-translations.mjs loads them into content_translations (requires the migration).

## 4. Hard-coded Arabic in customer-facing client code

- A) Localized source bundles: client/src/locales/ar/*.json (14 namespaces) — by design.
- B) Intentional Arabic data/content files: 0
- C) Comments only: 0 files
- D) Customer-facing Arabic still hard-coded: 0 files, 0 lines
