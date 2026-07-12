# AQUAVO SEO and Structured Data Results

Date: 2026-07-12

## Fixes completed

- Removed six sitemap entries that had no matching React route.
- Kept search and transactional/account pages out of the sitemap.
- Default canonical URLs now remove query strings and fragments, preventing category/filter/search parameters from becoming competing canonicals.
- Open Graph URL now matches the resolved canonical.
- Replaced the global blanket “original equipment” title/description with scoped AQUAVO equipment positioning.
- Added truthful Organization and WebSite JSON-LD components to the homepage source.
- Corrected WebSite schema from “largest store” to verified Iraqi brand/store wording.
- Rewrote `llms.txt` and `llms-full.txt` to remove unverified founding date, first-in-market status, product ranges/specifications, blanket originality and the retired 48-hour replacement claim.
- Replaced the public investor route with a noindex owner-data-required state; marked the historical standalone deck noindex with a visible unverified-data warning.

## Verification

- SEO contract: sitemap paths map to static React routes; retired AI claims are absent; homepage schema components are present.
- Canonical unit test proves `/products?category=filters#results` resolves to `/products` for canonical and OG URL.
- Core browser routes: one H1, current v2 title format and no mobile overflow.

## Structured-data limitation

The Vite frontend-only development server did not retain rendered JSON-LD scripts in the final DOM, so no claim is made that Google Rich Results validation passed. Source contracts and existing FAQ rendering paths were checked; production-rendered validation must be repeated against a deploy preview or the production SSR response before release.

Status: code-level SEO contract passes; external indexation, Search Console and Rich Results status were not available.
