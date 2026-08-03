# SEO / AEO / GEO query map

**Corrected:** 2026-08-03  
**Scope:** production-indexable AQUAVO pages and server-rendered answer sources.

No placement, ranking, citation, or inclusion in Google AI features, ChatGPT, Gemini, Perplexity, Bing, or another answer engine is guaranteed. This benchmark measures whether AQUAVO provides a factual, indexable, internally consistent, and extractable source for each target question.

## 30-prompt benchmark

| # | Prompt | Intent | Canonical AQUAVO source | Extractability target |
|---:|---|---|---|---|
| 1 | شنو أفضل فلتر لحوضي؟ | Commercial | `/guides/filter-choice` | Answer-first sizing criteria + product-category link |
| 2 | شكد يحتاج حوضي سخان؟ | Commercial | `/guides/heater-choice` | Sizing factors, temperature difference, safety warning |
| 3 | شنو الفرق بين أنواع الفلاتر؟ | Commercial | `/guides/filter-choice` | Internal/canister/sponge comparison |
| 4 | شنو الميديا المناسبة للفلتر؟ | Commercial | `/guides/filter-media` | Mechanical/biological/chemical roles |
| 5 | شنو أحتاج حتى أجهز حوض جديد؟ | Commercial | `/guides/new-aquarium-setup-iraq` | Ordered equipment and cycling checklist |
| 6 | هل هذا المنتج يناسب حجم حوضي؟ | Product | Canonical product detail page | Written specifications and compatibility only when recorded |
| 7 | شكد أجور التوصيل من AQUAVO؟ | Service | `/shipping`, `/faq` | Fixed 5,000 IQD answer |
| 8 | شكد مدة توصيل AQUAVO؟ | Service | `/shipping`, `/faq` | Delivery throughout Iraq within 24 hours |
| 9 | شلون أدفع في AQUAVO؟ | Service | `/faq`, `/shipping` | Cash on delivery |
| 10 | شنو الموجود داخل علبة هذا المنتج؟ | Product | Canonical product detail page | Included items only when recorded in product data |
| 11 | ليش مي الحوض عكر؟ | Problem | `/guides/cloudy-water-causes` | Cause → checks → corrective sequence |
| 12 | شلون أزيل الكلور من مي الحوض؟ | Problem | `/guides/water-conditioner-guide` | Conditioner purpose and safe dosing principle |
| 13 | ليش الفلتر ضعيف؟ | Problem | `/guides/filter-maintenance` | Flow, sponge, impeller, hose diagnostic checklist |
| 14 | شلون أنظف الفلتر؟ | Problem | `/guides/filter-maintenance` | Ordered procedure + beneficial-bacteria warning |
| 15 | ليش السمك يصعد للسطح؟ | Problem | `/guides/fish-gasping-surface` | Urgent oxygen/water checks without unsupported diagnosis |
| 16 | شكد أبدل مي الحوض؟ | Problem | `/guides/water-change-schedule` | Conditional schedule, not one universal number |
| 17 | شلون أختار قوة السخان؟ | Problem | `/guides/heater-choice` | Volume, room-water difference, independent thermometer |
| 18 | شنو سبب الطحالب؟ | Problem | `/guides/algae-control` | Cause/evidence/action structure |
| 19 | AQUAVO العراق | Brand | `/about`, `/` | Iraqi online aquarium-equipment store identity |
| 20 | أكوافو يبيع سمك حي؟ | Brand | `/about`, `/faq` | Explicit: no live fish, organisms, or plants |
| 21 | AQUAVO cash on delivery Iraq | Service | `/shipping`, `/faq` | COD and Iraq service area |
| 22 | AQUAVO delivery fee Iraq | Service | `/shipping`, `/faq` | Fixed 5,000 IQD |
| 23 | AQUAVO customer support hours | Service | `/contact`, `/faq` | 24/7 support |
| 24 | Iraqi online aquarium equipment store | Discovery | `/`, `/about` | Online-only equipment and supplies entity |
| 25 | YEE products Iraq | Product/brand | `/products`, matching product pages | Actual matching catalogue only |
| 26 | Is the YEE certificate a customer warranty? | Trust | `/verify-certificate/yee` | Authenticity/relationship evidence must not be presented as a customer warranty |
| 27 | aquarium filter media Iraq | Commercial | `/guides/filter-media`, `/products?category=الفلترة والتنقية` | Educational criteria + matching catalogue |
| 28 | aquarium water conditioner Iraq | Commercial | `/guides/water-conditioner-guide`, `/products?category=معالجة المياه` | Safe-use guidance + actual products |
| 29 | aquarium heater sizing Iraq | Commercial | `/guides/heater-choice` | Units + room-temperature context |
| 30 | aquarium maintenance checklist Arabic | Education | `/guides/aquarium-maintenance-checklist` | Daily/weekly/periodic checklist |

## Entity contract

Visible content, server-rendered HTML, structured data, Markdown responses, sitemaps, and internal documentation must consistently represent these verified facts:

- Brand: `AQUAVO / أكوافو / AQUAVO Iraq`.
- Legal operator: `محل المنبع — AL NABEA SHOP`.
- Canonical website: `https://www.aquavoiq.com`.
- Official email: `info@aquavoiq.com`.
- Business model: Iraqi online-only aquarium-equipment and supplies store; work is through the website and WhatsApp, with no customer-facing physical shop currently.
- Service area: all Iraqi governorates.
- Delivery: within 24 hours.
- Delivery fee: fixed `5,000 IQD`.
- Payment: cash on delivery.
- Support: `24/7`.
- Catalogue scope: aquarium equipment and supplies; no live fish, organisms, or plants.

Do not publish a physical-store address, map pin, coordinates, walk-in opening hours, unsupported product compatibility, invented stock, invented reviews, or a warranty claim that is not documented.

## Rendering and source contract

- Public commercial and entity pages must expose useful headings, factual copy, and internal links in initial HTML.
- Educational guide pages must return complete server-rendered HTML and `text/markdown` when requested.
- Product structured data must use the actual selected/default offer; variants must not use `ProductGroup` until each variant has a unique preselectable URL.
- Missing resources must return HTTP `404` with `noindex, follow`, no canonical, and no product/FAQ structured data.
- Preview deployments must remain `noindex`.
- Canonical category filters use the Arabic database category values, not legacy English aliases.

## Measurement limitation

Technical indexability, response status, structured data, source clarity, internal consistency, Core Web Vitals, and crawl coverage can be measured. Third-party AI citation and search ranking cannot be guaranteed or honestly reported immediately after deployment; they require later observation in Search Console, Bing Webmaster Tools, analytics, crawler reports, and independent prompt testing.
