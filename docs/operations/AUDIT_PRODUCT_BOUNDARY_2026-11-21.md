# G01 — Public product boundary inventory

Review date: 2026-11-21. Review branch: `fix/audit-repairs-20261121`.
Baseline: `7c82e27b846f0aa2081ab28657013f11c97bf33c`.

## Result and scope

This is a source inventory of the product reads used by the running storefront,
customer APIs, recommendations, AI tools, rendering, sitemaps and delivery jobs.
The review enumerated ORM `.from(products)` and `.from(schema.products)`, relational
`.query.products`, the `productTable` alias, raw `FROM/JOIN products` and
`public.products`, joins from other tables, storage delegates, cached identifiers,
and downstream consumers. A matching line alone was not considered a public leak:
the review followed its caller and authorization boundary.

Fresh catalogue selection uses **visible and not deleted** as a separate boundary
from stock, price and availability. The review does not promise that an already
downloaded page, a past order, or an already delivered notification can be recalled.
The cache and historical limits below remain explicit.

The last sweep also found four ancillary omissions: new replenishment messages,
the separate active-predictions endpoint, public reviews, and product discounts.
Their narrow corrections use the same current-product boundary. They do not change
discount values, dates or activity, nor the existing treatment of incoming items.

No production data, external provider, message delivery, deployment or merge was
used for this inventory or its isolated regression tests. Production application
still requires the founder's approval.

## Contract

| Boundary | Implementation | Meaning |
|---|---|---|
| Current public identity | `shared/public-product.ts` — `isPublicStorefrontProduct` | Rejects explicitly hidden or deleted rows, including supported camel/snake property spellings. Does not reclassify zero-price, out-of-stock, pending or coming-soon items. |
| Database selection | `products.isStorefrontVisible = true` and `products.deletedAt IS NULL`, or the equivalent SQL | Applied before public limits/projections where rows are selected directly. Partial projections without visibility fields must retain this SQL guard. |
| Public product payload | `toPublicProduct` / `toPublicProducts` | Explicit product and variant field lists remove internal costs and bookkeeping fields. A future top-level column is not automatically published. |
| Specifications | `toPublicSpecifications` | Recursively removes known private English/Arabic/camel-case keys and restricts reserved `__` keys, while retaining technical specifications and established presentation metadata. This is **not** an allowlist of every merchant-authored technical label; see the remaining limit below. |
| Authorized history | `toPublicOrderItem`, `getArchivedOrderProductMetadataByIds`, `toInvoiceProductDisplay` | Keeps an authorized customer's own order and an administrator's invoice usable after a catalogue identity is hidden/archived. This is not a new public product lookup. |

## Public and customer-facing source inventory

Paths in this document are relative to the repository root. Function names are
included so evidence remains useful if later edits move line numbers.

| Source family | Source and consumers | Current guard / classification |
|---|---|---|
| Catalogue, filters and pagination | `server/storage/product-storage.ts`: `queryProducts`, `getProductsPage`, `getProductAttributes`; `server/routes/products.ts`: list, categories, attributes, fit | Every public list caller sets `storefrontOnly: true`; attributes explicitly filter both fields. List/compare payloads pass through public DTOs. Internal storage getters remain usable by authorized backoffice callers. |
| Detail, comparison, variants and view | `server/routes/products.ts`: `/by-ids`, `/:idOrSlug`, `/:idOrSlug/variants`, `/:productId/view` | Detail/view check the current row. Comparison uses `toPublicProducts` after a bounded ID lookup. Variant-family queries are public-only. A hidden identity has the missing-product response. |
| Best sellers and trending | `server/storage/product-storage.ts`: `getTopSellingProducts`; `server/storage/index.ts`: `getTrendingProducts`; `server/services/analytics-tracker.ts` | Analytics may produce historical IDs, but the fresh product read/selection filters visibility and deletion. The 30-minute high-sales cache contains IDs, not public product snapshots, and is followed by a guarded live read. |
| Similar, co-purchase and cart suggestions | `server/storage/index.ts`: `getSimilarProducts`, `getFrequentlyBoughtTogether`; `server/services/recommendation-engine.ts`; `server/routes/products.ts` | A hidden similar-product source is rejected. Candidate products and final recommendation IDs are filtered against current public products. Aggregated co-purchase IDs cannot bypass the final public DTO/read. |
| Personalized ordering and search | `server/services/recommendation-engine.ts`: `getPersonalizedRecommendations`; `server/routes/products.ts`: personalized, personalized-order, smart-search; `server/services/embedding-generator.ts` | Personalized IDs are live-filtered before return. Semantic search returns IDs/similarity; callers resolve and filter live catalogue rows before sending product content. Embedding metadata is not returned by the public search route. |
| Repurchase needs | `server/routes/products.ts`: `/predicted-needs`; `server/routes/ai-advanced.ts`: `/predictions/:userId`; `server/services/predictive-analytics.ts` | The storefront already re-resolves saved/live predictions against public products. The separate active-predictions endpoint also checks current visibility. Historical purchase analysis remains an internal/owner-scoped source, not a public catalogue. |
| Cart and favourites | `server/storage/order-storage.ts`: `getCartItems`, `getFavorites`, `addToCart`, `updateCartItem`; `server/routes/cart.ts`, `server/routes/favorites.ts` | Cart/favourites responses omit hidden/deleted products and use public DTOs. Cart preflight, add/update and checkout enforce the same boundary. Favourite POST checks before writing. Removal of an old favourite remains possible. Hidden historical cart/favourite records are not blanket-deleted. |
| Checkout | `server/storage/order-storage.ts`: secure COD creation and online-order preparation; `server/routes/orders.ts`, `server/routes/wayl.ts` | Current product visibility is checked before commerce writes. Authorized retrieval of an already placed order is a separate historical boundary. |
| Discounts and reviews | `server/routes/products.ts`: `/:productId/discounts`; `server/routes/reviews.ts`: public read/create | Current product is checked before ancillary reads or review creation. Hidden/deleted/missing products are not exposed through their review/discount endpoints. Discount fields and established price calculations are unchanged. |
| Server HTML, metadata, JSON-LD and Markdown | `api/product-ssr.ts`; `api/ssr-meta.ts`: product metadata and collection SQL; `api/_ssr-preview-source.ts`: product/collection/deal queries and home/blog/guide related products | Every direct catalogue read has visibility and deletion predicates. Product/specification DTO reduction protects embedded data. `server/ssr-meta.ts` is static metadata code, not another live product query. See cache windows for non-product pages below. |
| Product/category sitemap reads | `api/sitemap-products.ts`, `api/sitemap-pages.ts`; `server/routes/system.ts`: legacy sitemap and `productTable` query | Dynamic product URLs and product-derived categories use visible, undeleted rows. `api/sitemap-blog.ts` reads published blog content, not a separate product catalogue. Static recovery sitemap is documented below. |
| Agent catalogue and A2A | `server/routes/agent-auth.ts`, `server/routes/a2a.ts` | Both use `storefrontOnly: true` plus `toPublicProducts`. Public discovery manifests describe interfaces; they do not bypass the product API. Administrative MCP is a separate permission boundary below. |
| Sales chat and journey | `server/routes/ai.ts`; `server/services/ai-tools.ts`; `server/services/gemini-ai.ts` | Customer catalogue counts, journey input/output, search, details, category/recommended/upsell selections and direct AI cart writes check current visibility/deletion. Admin-only sales context remains privileged. Coming-soon chat/pricing policy was not redesigned. |
| Visual AI | `server/services/visual-ai.ts`: current recommendations, `getAnalysisById`; corresponding `ai-advanced` routes | New matching queries filter before limits and map public DTOs. Opening an old analysis re-resolves its recommended IDs and returns only current public product cards. The owner's history list retains the original analysis record/IDs; it is not a new live product payload. |
| Aquarium advisor | `server/services/aquarium-advisor.ts`: `findMatchingProduct`, `generateShoppingList` | Every current catalogue match is guarded before attaching a product ID/price. User/model-authored design item names are not treated as evidence that a private catalogue product is for sale. |
| Fresh push candidates | `server/services/smart-notifications.ts`: `gatherNewProductCandidates`, `gatherReplenishmentCandidates` | Both current product selections filter hidden/deleted rows before limits and before AI content generation. Historical order/category joins used only to choose interested recipients do not emit the old purchased products. No delivery job was run during verification. |
| WhatsApp repurchase selections | `server/services/whatsapp-lifecycle.ts`: `loadRepurchaseProducts`, eligibility filter before `buildRepurchaseProductSummary` | The `available` condition includes visibility/deletion and is applied before creating the outgoing product summary. Past delivery/order records remain history. Marketing consent behaviour is unchanged. |
| Public bundles | `server/services/growth-operating-system.ts`: `getBundles(true)`; `server/routes/growth-operating-system.ts` | The product join filters hidden/deleted identities. Public results omit estimated costs and margin fields. Bundle price/coming-soon policy was not changed. Cache staleness remains documented below. |

## Non-public reads deliberately retained

These reads are not evidence of a missing storefront guard. Applying a blanket
filter to all of them would break private invoices, accounting or order history.

| Source group | Files / paths | Why visibility is not a blanket filter |
|---|---|---|
| Administration and authoring | `server/routes/admin.ts`, `admin-translations.ts`, `metadata.ts`; `server/storage/security-storage.ts` via `routes/security.ts` | Protected by `requireAdmin`; hidden identities and backup metadata are needed by the owner. |
| Private invoice/order metadata | `server/storage/invoice-storage.ts`; `routes/admin-invoices.ts`; `services/order-item-images.ts`; authorized `routes/orders.ts` enrichment | Admin invoice picker uses `toInvoiceProductDisplay`. Image/archived metadata comes from IDs in an already authorized order, not arbitrary public lookup. Customer order output still uses an explicit safe DTO. |
| Finance, packaging and admin analytics | `routes/accounting.ts`, `accounting-v2.ts`, `accounting-packaging-canonical.ts`, `packaging-admin.ts`, `packaging-smart-plan.ts`, `admin-orders-v2.ts`, `admin-analytics-accurate.ts`, privileged `routes/analytics.ts` reads | `requireAdmin` / `requireAccountingAdmin` protect these routes. Their joins serve reconciliations and historical fulfilment. |
| Financial/inventory services | `services/product-cost-snapshot.ts`, `inventory-adjustment-service.ts`, `accounting-engine.ts`, `financial-truth.ts`, `dashboard-truth.ts`, `business-intelligence.ts`, private reads in `growth-operating-system.ts`, `groqFinanceAudit.ts`, `inventory-optimizer.ts`, `pricing-engine.ts`, `competitive-pricer.ts`, `ai-dashboard.ts` | Called through backoffice/accounting/cron workflows. Excluding hidden stock/costs would distort operational records. The public bundle projection is separately covered above. |
| Administrative pricing and preparation | `routes/pricing.ts`, `pricing-safety.ts`, `pricing-truth-override.ts`; `services/production-test-orders.ts` | Privileged tooling and isolated test-order preparation. No public route receives these raw product rows. |
| Editorial drafts | `services/content-generator.ts`, `auto-blog-generator.ts`; admin content routes | Content generation is privileged. Auto blog generation persists `isPublished: false`. Existing approved editorial text is not automatically rewritten when a product is hidden. |
| Explicit admin broadcast | `routes/newsletter.ts`: `broadcastDiscountForProduct` and `/broadcast-discount` | The product lookup is reached by an administrator-triggered send. This review did not send anything or change that explicit editorial choice. |
| Owner history and profiling | `services/returns-handler.ts`, `predictive-analytics.ts`, `customer-profiler.ts`; `ai-tools.ts`: customer-history helper | Own order/return history is preserved. `gemini-ai` takes only `profile.profile`, not `getFullProfile().recentViews`. The current customer-history consumer uses the favourite count, not raw hidden favourite names. Re-review if those raw helper results become public output. |
| Embedding/seed maintenance | `services/embedding-generator.ts`, `data-seeder.ts`, `server/data/driftwood-products.ts`, storage seed helper, `shared/products.ts` | Internal maintenance/seed data. No storefront import of the static seed catalogue was found. Public semantic callers live-filter IDs before product payloads. |
| Administrative MCP | `server/routes/mcp.ts`, `server/aquavo-mcp-http.ts`, `server/aquavo-mcp.ts`, legacy `server/mcp/index.ts` | The mounted MCP route uses its token/scope checks; standalone HTTP requires its MCP bearer token; the remaining tools use stdio. These are not the public agent-catalogue API. The legacy stdio module is not mounted by the web router. |

## Cache, history and remaining limits

| Item | Observed behaviour | Remaining action / decision |
|---|---|---|
| Product API and product HTML | Product list/detail/compare and discounts use `no-store`; product paths in both SSR implementations are private/no-store. A cached not-found response may live 60 seconds but contains no product data. | Fresh responses honour current visibility. This does not erase a response already held by a browser. |
| Non-product SSR and sitemaps | Home/deals/blog/guide HTML can contain related product cards. Existing headers allow bounded caching: semantic non-product pages use 300 seconds plus 3600 seconds stale; guide and other legacy SSR/sitemap paths can use 3600 seconds plus 86400 seconds stale. | A product hidden after generation may remain in an existing cached page until revalidation. Immediate removal requires a separate targeted invalidation/cache-policy decision. The review did not purge production caches. |
| Bundles cache | `/api/growth/bundles` uses `max-age=60, stale-while-revalidate=300`. | Fresh queries are guarded; already cached responses can lag the visibility change. |
| Browser memory | React Query defaults to five minutes stale time; mounted lists/chat product cards can outlive a visibility change. | New authoritative product/cart/checkout requests still enforce the boundary. No live invalidation channel is implemented by this work. |
| Service workers | Active registrations use `client/public/sw-push.js`, which has no catalogue fetch cache. `client/public/sw.ts` contains an old network-first cache implementation but is not registered by the current application. | Do not register the legacy worker without a separate cache-boundary review. |
| Historical content | Own analysis IDs, past notification text, chat text and already delivered messages can mention products that were public at the time. Chat history passes text, not stored product objects; new tools/cart actions resolve live data. | Retained intentionally. Do not delete customer order/invoice history to enforce a current catalogue choice. |
| Static public material | `client/public/sitemap-recovery.xml` retains the hardcoded `houyi-stainless-shunt` URL and is not listed by the active index. Static product photographs, old editorial links and cached external search results are not subject to a database visibility predicate. `llms.txt` / `llms-full.txt` point to the current catalogue rather than embed a product inventory. | No claim of asset secrecy or immediate search-index removal. If that specific legacy URL/product or an image must be withdrawn, review and remove/invalidate the specific publication with approval. |
| Merchant freeform specifications | Named private keys are removed recursively, but unknown innocently labelled values cannot reliably be classified as financial/private without an agreed merchant schema. | Keep the technical-field classification limit open; do not describe the entire freeform specification object as a strict allowlist. |
| Quarantined auto-order setup | `services/auto-order-processor.ts:create` still accepts a current ID without a visibility filter through authenticated `/api/ai-advanced/auto-orders`. It returns a subscription ID/date, not product content. `processScheduledOrders` is quarantined and always throws; this is not a working checkout bypass. | Deferred setup validation item. Add the visibility guard before re-enabling the processor; actual orders must use `createOrderSecure`. Do not hide historical subscription rows by default. |

## Verification and preserved decisions

The inventory is based on source review, not a production penetration test. Focused
tests use synthetic records, isolated PostgreSQL-compatible PGlite databases or
mocked storage, and mocked AI/message providers.

Latest storefront ancillary run:

```sh
./node_modules/.bin/vitest run \
  server/__tests__/public-product-api-http.test.ts \
  server/__tests__/storefront-recommendation-boundaries.test.ts \
  --maxWorkers=1
```

Result: **2 files / 58 tests passed**. New cases prove missing/hidden/deleted
discount requests return 404 before reading discounts, discount payloads remain
unchanged, and replenishment selects only visible undeleted products before any
content generation. The visible incoming fixture remains included exactly as its
existing selection policy permits. Neither push delivery nor an AI provider is
called by these tests.

The integrated defensive run passed **4 files / 49 tests**:
`defensive-data-boundaries.test.ts`, `defensive-public-routes.test.ts`,
`public-review-boundary.test.ts`, and `return-request-evidence-http.test.ts`.
Its new cases cover the separate active-predictions endpoint and review read/create
guards, including ownership, explicit output projection and visible incoming
products. The final defensive server type gate passed. These results are separate
from the full branch suite and build.

Related boundary suites include `public-product-boundary.test.ts`,
`storefront-catalogue-query.test.ts`, `defensive-data-boundaries.test.ts`, and
`cart-stock.test.ts`. Their evidence belongs to the combined branch validation;
this document does not substitute a narrow pass for the full test/build/CI result.

Protected decisions remain unchanged: actual prices and upward rounding, required
terms linked to WhatsApp marketing consent, and the established pricing/status/
presentation/purchasability policy for pending or coming-soon products and bundles.

| Work | Status | Next step | Decision owner |
|---|---|---|---|
| Source inventory and public-boundary corrections | Completed in review branch | Review the diff and combined CI evidence | Engineering reviewer |
| Regression verification | Focused local tests completed; combined validation tracked separately | Final branch test/build/CI gates | Engineering reviewer |
| Cache/publication limits and deferred setup validation | Documented, not claimed resolved | Targeted decision if immediate withdrawal is required | Founder / engineering |
| Production release and migration application | Not performed | Explicit approval after reviewing concrete changes and rollback plan | Founder |
