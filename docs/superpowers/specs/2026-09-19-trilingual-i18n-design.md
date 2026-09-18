# AQUAVO trilingual (ar / en / ckb) design

Date: 2026-09-19. Branch: `feat/i18n-trilingual` (worktree `wt-i18n`, from `origin/main` 1098b34a).

## 1. Stack discovered (Phase 0)

| Concern | Finding |
|---|---|
| Frontend | React 19, Vite 8, `wouter` 3.9 (client-side routing, no locale awareness), TanStack Query 5, Tailwind 4.1, Radix UI |
| Rendering | CSR SPA. Crawlers/browsers both hit `api/ssr-meta.ts` (Vercel rewrite catch-all) which injects `<title>`/meta/JSON-LD/OG and a semantic `#seo-root` shell into `dist/public/index.html`; 22 guides are fully server-rendered for crawlers from `api/_guides-content.ts` (structured `GuidePage` registry) |
| Backend | Express 4 mounted as one Vercel function (`api/index.ts` → `server/routes.ts`); Node 22 (full ICU, `ckb-IQ` supported) |
| DB / ORM | Neon Postgres, Drizzle 0.39, schema `shared/schema.ts` (hand-written SQL migrations, `db:push` forbidden) |
| Sessions | express-session; no cookie-parser; no `Accept-Language` handling anywhere |
| Caching | `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` on every SSR HTML response (CDN cached per URL) |
| SEO | `shared/seo-contract.ts` (base URL, indexable paths, 11 Arabic category names, `canonicalUrlFor`), sitemaps in `api/sitemap-*.ts`, robots in `api/robots.ts`. No hreflang anywhere. `<html lang="ar" dir="rtl">` hard-coded in `client/index.html` |
| Existing i18n | `client/src/messages/{ar,en}.json` exist but have **zero consumers** (dead). An unused generic `translations` EAV table exists in the schema (never written to) |
| Arabic footprint | 221 customer-facing client files / ~6,955 Arabic lines; 179 server/api/shared files; static guides (22 pages), `client/src/data/blog-articles.ts`, `api/_guides-content*.ts`, `api/_seo-content.ts` |
| Dynamic content | products: 107 live (Arabic `name`, `description`, `category`, `subcategory`, jsonb `specifications` with Arabic keys and arrays `benefits`, `usageInstructions`, `safetyWarnings`, `__cardBenefit`); blog_posts: 117 (115 latin slugs, 2 Arabic slugs); categories table + hard-coded `AQUAVO_PRODUCT_CATEGORIES` (Arabic strings are the canonical category identity, used in URLs `/products?category=<arabic>`); blog_categories (Arabic names + Arabic slugs) |
| Search | `server/storage/product-storage.ts` ILIKE over name/description/brand with an Arabic synonym expander; client `site-search.ts` for pages |
| Formatting | `formatNumber` uses `toLocaleString('en-US')` (Latin digits) and `formatPrice` appends `د.ع` |
| Fonts | Cairo (Arabic/Latin) + Inter + Changa from Google Fonts. Cairo's Google Fonts build covers the Arabic block incl. Kurdish letters (پ چ ژ ڤ گ ک ڵ ڕ ۆ ێ ە ئ) — verified glyph-by-glyph in `scripts/i18n/check-font-coverage.mjs` |
| Cron | `/api/cron/weekly-blog` generates new Arabic blog posts automatically |

## 2. Research (Phase 2) and decisions

- **UI strings: i18next + react-i18next** (resolve-at-runtime, JSON namespaces, per-locale lazy `import()` so a visitor downloads only their locale; typed keys via `declare module "i18next"` resource augmentation from the Arabic source JSON). Chosen over Paraglide/Lingui because this codebase has thousands of existing strings across 200+ files and needs an incremental key-based migration and plural/interpolation without a compiler step; i18next remains the most widely maintained option ([Tolgee 2026 comparison](https://tolgee.io/blog/react-i18n-libraries-comparison), [Paraglide vs react-i18next](https://github.com/opral/paraglide-js/blob/main/docs/paraglide-vs-react-i18next.md)).
- **BCP 47**: `ar`, `en`, `ckb` as URL/`lang` tags; formatting locales `ar-IQ`, `en-US`, `ckb-IQ`. `ckb` is in CLDR/ICU ([ICU ckb-IQ](https://www.localeplanet.com/icu/ckb-IQ/index.html)); Node 22 resolves `ckb-IQ` natively (dates render in Kurdish). Numbers: force Latin digits (`-u-nu-latn`) in all locales so prices keep their current appearance.
- **URLs**: Arabic stays at the existing root URLs (no change, zero redirects, indexed URLs preserved). English at `/en/...`, Kurdish at `/ckb/...`, same slugs. `x-default` → Arabic root. Reciprocal `hreflang` on every indexable page + `xhtml:link` in sitemaps, per [Google localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions). No IP/Accept-Language redirects; explicit cookie choice is honoured client-side only.
- **OG locale**: Facebook only publishes ar_AR, en_US and ku_TR (Kurmanji). Kurdish Sorani has no accepted value, so ckb pages emit no og:locale of their own and only og:locale:alternate for ar_AR/en_US; ar/en pages emit their own og:locale plus alternates.
- **Direction**: `dir` attribute on `<html>` (semantic), Tailwind logical utilities (`ms-/me-/ps-/pe-/start-/end-`, `rtl:`/`ltr:` variants where needed).

## 3. Locale core (single source of truth)

`shared/i18n/locales.ts`:

```ts
export const LOCALES = { ar: {code:"ar", nativeName:"العربية", dir:"rtl", bcp47:"ar-IQ", intl:"ar-IQ-u-nu-latn", ogLocale:"ar_AR", urlPrefix:""},
                         en: {..., urlPrefix:"/en"}, ckb: {code:"ckb", nativeName:"کوردی", dir:"rtl", bcp47:"ckb-IQ", intl:"ckb-IQ-u-nu-latn", urlPrefix:"/ckb"} }
DEFAULT_LOCALE = "ar"; SUPPORTED_LOCALES = ["ar","en","ckb"]
splitLocaleFromPath(path) → { locale, path }; localizePath(path, locale); alternatesFor(path) → {ar,en,ckb,xDefault}
```

Consumed by client, Express, ssr-meta, sitemaps, tests. No other language arrays anywhere.

## 4. Routing

- Client: `App` reads locale from `window.location.pathname`; renders `<Router base={prefix}>` from wouter so every existing `<Link href="/x">` and `setLocation("/x")` becomes locale-relative automatically. Hard `window.location`/`history.replaceState` call sites are patched to use `localizePath`.
- Switching locale = `localizePath(currentPath + search, target)` via `history.pushState` (no reload, React state/cart/query cache preserved) + cookie `aq_locale` (1 year, `SameSite=Lax`, `Secure`) + `users.preferences.locale` for signed-in users.
- Vercel: the existing catch-all rewrite already forwards `/en/*` and `/ckb/*` to `ssr-meta`; `ssr-meta` strips the prefix, resolves metadata for the logical path, sets `<html lang dir>`, injects hreflang/canonical/`og:locale`.
- Express API: `server/middleware/locale.ts` sets `req.locale` from `?locale=` → `X-Locale` header → `aq_locale` cookie → default `ar`. The client always sends `X-Locale`. Every JSON response that carries localized content sets `Content-Language` and `Vary: X-Locale`.

## 5. Database

New table `content_translations` (additive, reversible):

```
id text pk, entity_type text ('product'|'blog_post'|'category'|'blog_category'|'guide'),
entity_id text, locale text ('en'|'ckb'), data jsonb, status text ('machine'|'reviewed'),
source_hash text, created_at, updated_at, unique(entity_type, entity_id, locale)
```

- Arabic rows remain the source of truth in their existing tables (never modified).
- `data` holds only linguistic fields: product → `{name, description, subcategory, seoTitle, seoDescription, specifications:{benefits[], usageInstructions[], safetyWarnings[], __cardBenefit, <labelled specs>}}`; blog_post → `{title, excerpt, content, seoTitle, seoDescription}`; category → `{displayName, description}`.
- `source_hash` = sha1 of the Arabic source fields; `status` becomes `outdated` (computed) when the hash no longer matches → admin indicator.
- Shared stock/price/SKU/images untouched. Same slug across locales.
- Migration `migrations/add_content_translations.sql` + `_rollback.sql`.

## 6. API localization

`server/services/content-localizer.ts`: `localizeProducts(rows, locale)`, `localizeBlogPost`, `localizeCategoryName`. Product/blog routes apply it before responding; response keeps the same shape plus `contentLocale` (actual locale served) and `translationMissing: true` when it fell back to Arabic. Search: ILIKE also matches `content_translations.data->>'name'` for the request locale (Arabic synonyms preserved).

## 7. Admin

`client/src/components/admin/translation-editor.tsx`: tabs العربية / English / کوردی per product, article, category; shows status chips (complete / missing / outdated / machine); PATCH `/api/admin/translations/:type/:id/:locale`. Coverage endpoint `/api/admin/translations/coverage`.

## 8. Content migration

`scripts/i18n/translate-content.ts`: reads Arabic source rows, translates to `en` and `ckb` with Claude (glossary of aquarium terms, never translates SKUs/model codes/brand names, keeps numbers), writes `content_translations` with `status='machine'`. Idempotent (skips rows whose `source_hash` matches). Same script serves future products/articles (cron `weekly-blog` will produce `translationMissing` posts until run).

## 9. UI string migration

`client/src/locales/{ar,en,ckb}/<namespace>.json`; namespaces: `common`, `nav`, `home`, `products`, `product`, `cart`, `checkout`, `account`, `orders`, `search`, `errors`, `pages`, `seo`. Static long-form pages (about, faq, shipping, terms, privacy, return-policy, contact) move to per-locale content modules. Guides for `en`/`ckb` render from translated `GuidePage` data through a shared article renderer (crawler and browser share it); Arabic keeps its bespoke pages.

## 10. SEO

Per page: localized title/description (static `PAGE_META` gets `en`/`ckb` variants), self-canonical per locale, `<link rel="alternate" hreflang>` × 4 (ar, en, ckb, x-default), `og:locale` + alternates, localized JSON-LD text fields (shared facts unchanged). Sitemaps: every indexable URL listed 3× with `xhtml:link` alternates. Robots unchanged (prefixes not blocked).

## 11. Caching

SSR HTML is cached per URL and the locale is in the URL, so no `Vary` on cookies is needed. API JSON is not CDN-cached; responses set `Vary: X-Locale, Cookie`.

## 12. Testing / audit

- vitest: locale utils, path mapping, hreflang generation, localizer fallback, coverage report.
- playwright: home/product/category/blog/search/cart/checkout in 3 locales, selector on mobile + desktop, direct URL, refresh persistence, `lang`/`dir`, hreflang/canonical, 404.
- `scripts/i18n/audit.ts`: missing keys per locale, Arabic script inside en/ckb JSON, DB coverage counts, hard-coded Arabic in customer-facing components (allow-list for intentional Arabic).

## 13. Out of scope / risks

- Images with baked-in Arabic text are inventoried and reported, not regenerated.
- Third-party payment/delivery API payloads untouched.
- Machine translations are marked `machine`; human review is the owner's follow-up in the admin.
