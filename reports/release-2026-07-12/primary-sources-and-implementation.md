# Primary sources and implementation implications

Verified 2026-07-12. Primary documentation was preferred over agency guidance.

| Source | Implementation implication |
|---|---|
| Google Search Central, [Product structured data](https://developers.google.com/search/docs/appearance/structured-data/product) and [Merchant listings](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing) | Product/Offer data must match the visible product and live price/availability; no invented ratings, identifiers, or sale windows. |
| Google Search Central, [General structured-data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) | Markup must describe visible content and must not mislead or hide claims. |
| Google Search Central, [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features) | Google AI search needs no special AI markup; normal crawlability, snippets, and useful factual content remain the foundation. |
| Google Search Central, [Generative AI content guidance](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content) | No scaled filler or doorway content; accuracy, quality, and user value remain required. |
| Google, [Content Security Policy for Google tags](https://developers.google.com/tag-platform/security/guides/csp) | Keep CSP restrictive and allow only the collection endpoints used. The observed GA4 request required `https://www.google.com` in `connect-src`; wildcard Google access was not added. |
| Google, [GA4 ecommerce events](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce) | Implement the full visible journey: list/select/view, cart additions/removals/view, begin checkout, shipping info, and purchase after server confirmation. `transaction_id` and client guards prevent analytics duplicates. |
| Schema.org, [MerchantReturnPolicy](https://schema.org/MerchantReturnPolicy) | Return markup is only valid when it mirrors the published policy; no generic warranty or return promise may be inferred. |
| Bing, [Webmaster Guidelines](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a), [Sitemaps](https://www.bing.com/webmasters/help/sitemaps-3b5cf6ed), and [IndexNow](https://www.indexnow.org/documentation) | Publish canonical successful URLs, avoid index bloat, and keep sitemap dates factual. IndexNow is optional and is not a substitute for crawlable content. |
| W3C, [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Keyboard access, focus visibility, labels, target size, reduced motion, and non-pointer alternatives are release gates. Automated Axe results alone are not a conformance claim. |
| web.dev, [Core Web Vitals](https://web.dev/articles/vitals) | Representative target thresholds are LCP <= 2.5 s, CLS <= 0.1, and INP <= 200 ms at the 75th percentile. Lab data is not field data. |
| model-viewer, [official docs](https://modelviewer.dev/docs/) | `camera-controls` enables interaction; `touch-action="pan-y"` preserves vertical page scrolling while horizontal gesture input rotates the model. |
| Vercel, [CLI deployments](https://vercel.com/docs/cli/deploy) and [rollbacks](https://vercel.com/docs/rollbacks) | Preview and Production are separate operations; record the prior deployment before cutover and never use Preview aliases as production canonicals. |
| Gao et al., [GEO: Generative Engine Optimization](https://arxiv.org/abs/2311.09735) | GEO is treated as clear, attributable, extractable factual content—not guaranteed placement or hidden machine-only copy. |

Meta's official developer pages returned HTTP 429 during this verification window. Existing Pixel/CAPI deduplication was therefore validated from executable behavior and source contracts; the Graph API version was not changed by guesswork. This limitation must be cleared in Meta Events Manager/test mode before a perfect analytics score is claimed.
