# Human browser SSR routing fix — 2026-08-04

Production routing now sends normal browser navigation to `api/ssr-meta`, which returns the client application shell without `#seo-root`.

Semantic preview rendering remains available for recognized search/AI crawlers and requests that explicitly accept `text/markdown`.

This removes the visible semantic-shell flash for shoppers while preserving crawlable/AEO output for bots and agents.
