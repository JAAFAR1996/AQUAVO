# Category listings as real search documents — design

Date: 2026-09-22 · Branch: `seo/ai-answer-layer` · Status: approved in chat ("صحح كل شيء"), implementing

## What Search Console showed (baseline, 90 days to 2026-09-19)

- 242 clicks, 8,156 impressions, average position 6.4. Of 43 target
  keywords, only `aquavo` (2.6) and `فلتر حوض سمك` (11, two impressions) had
  any impression. Guides took 60% of impressions; category listings ~0.
- URL Inspection on the eleven `/products?category=…` listings: 6 indexed;
  **3 folded into `/products` as duplicates** (تربة وديكور, معالجة المياه,
  الفحص والمراقبة); 1 discovered, never indexed (التهوية والأكسجين); the
  `+`-encoded variant guides link to is crawled and not indexed.

## Root causes, verified on the live site

1. **Two canonicals for one URL.** The crawler path (`api/ssr-preview`) serves
   a category title and `canonical=/products?category=…`; the browser path
   (`api/ssr-meta`) serves the generic `/products` title and
   `canonical=/products`. Google resolved the conflict by dropping listings.
2. **Three URL spellings.** Canonical `%20`, the guides' `+` (from
   `URLSearchParams.toString()`), and the `/products` browser page's ItemList
   using English aliases (`?category=heaters`, plus `starter-kits`, which is
   not a category at all).
3. **Catalogue vocabulary in title and H1** ("منتجات التحكم بالحرارة") where
   buyers search "سخان حوض سمك". The SPA also shows one generic H1 on every
   category.
4. **Thin unique content** relative to the shared listing shell: two
   paragraphs and four bullets per category.

## Design

### One canonical, everywhere
- `api/ssr-meta.ts`: `/products?category=<canonical>` resolves to the
  category's own title, description, canonical URL and JSON-LD
  (BreadcrumbList + FAQPage). Same values as the crawler path.
- Both handlers 308 to the canonical spelling when the request's `category`
  is an alias or is not the `encodeURIComponent` form (covers `+`).
- `api/_canonical-guides.ts` `normalizeHref` emits `categoryProductsPath()`.
- The `/products` ItemList lists the eleven real categories at their canonical URLs.

### Buyer vocabulary and visible questions (`shared/category-search.ts`)
Per category: `heading` (H1), `title`, and three Q&As. Rendered by the
crawler shell (`ProductsPage`) and the SPA (`products.tsx` H1,
`CategoryIntro` FAQ) from the one module; FAQPage JSON-LD on both paths.
Content rules as in `shared/category-content.ts`: no product, price, spec or
test claim. Where a number matters the answer points to the guide.

### Guides link to products (`shared/guide-links.ts` → `GUIDE_PRIMARY_CATEGORY`)
Guides take 60% of impressions and ended at a category link. Each guide now
shows up to three in-stock products of one hand-curated category: on the
server-rendered document (`renderGuideHtml` gets `products`, loaded by both
handlers; a database failure leaves the guide intact) and on the React
guides (`GuideRelatedProducts` mounted on all 21 `/guides/*` routes). Guides
with no natural category show nothing.

## Testing
- `server/__tests__/category-search-presentation.test.ts`: coverage,
  uniqueness, length bounds, no price/wattage/brand.
- Crawler shell test: H1 is the heading, FAQ block present.
- `ssr-meta` unit: category request yields category canonical and title;
  alias and `+` requests 308 to canonical.
- Guides: normalised hrefs contain `%20`, never `+`.
- After deploy: URL Inspection on the four failing listings; re-run
  `gsc-baseline` after 28 days.

## Out of scope
Changing the URL scheme (`/products?category=` stays: six listings are
already indexed on it and 104 references would move); English/Sorani copy.
