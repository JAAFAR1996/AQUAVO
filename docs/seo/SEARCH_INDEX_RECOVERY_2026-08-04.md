# AQUAVO search index recovery — 2026-08-04

## Search observations

Public search results still showed two historical artifacts after the semantic SSR deployment:

1. The official product page `/products/houyi-stainless-shunt` had a cached snippet containing the former client error message even though the live page now returns complete server-rendered product content.
2. The old host `fist-live.vercel.app` appeared for `/guides/aquarium-decor-stones-guide` instead of the canonical AQUAVO host.

The old `fist-live.vercel.app` host is not present in the connected Vercel team and no connected GitHub repository owns it. Its server-side redirect therefore cannot be changed from the currently connected AQUAVO project.

## Implemented recovery controls

- Production HTML requests on every non-canonical host are redirected with HTTP 308 to `https://www.aquavoiq.com`, preserving path and query parameters.
- Redirect responses include `X-Robots-Tag: noindex, follow`.
- Canonical production HTML responses publish a release `Last-Modified` header.
- The product sitemap uses the newer of the database product update date and the semantic SSR release date. This truthfully marks every product page as changed when the initial HTML implementation changed.
- Product pages now publish a canonical `WebPage` entity connected to the `Product`, including `dateModified`.
- A focused `sitemap-recovery.xml` advertises the homepage, the stale product result, the official replacement guide, and key service pages.
- The sitemap index advertises the recovery sitemap first.

## External action still required for fastest Google replacement

The code and crawl signals can invite a recrawl but cannot force Google to update a cached result immediately. For the fastest replacement, use Google Search Console URL Inspection on:

- `https://www.aquavoiq.com/`
- `https://www.aquavoiq.com/products/houyi-stainless-shunt`
- `https://www.aquavoiq.com/guides/aquarium-decor-stones-guide`

Submit `https://www.aquavoiq.com/sitemap.xml` again after the production deployment is live.

If access to the Vercel account that owns `fist-live.vercel.app` is recovered, configure that project to return a permanent 308 redirect from every path to the same path on `https://www.aquavoiq.com`.
