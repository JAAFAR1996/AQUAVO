# SEO production retry — 2026-08-04

This documentation-only commit retriggers the Git-integrated Vercel production deployment after the previous deployment-rate window cleared.

Expected production contracts after deployment:
- semantic SSR v3 on public SEO routes;
- full guide content in the initial HTML;
- missing product and unknown routes return HTTP 404 with `X-Robots-Tag: noindex, follow`;
- no canonical or structured data on missing routes;
- legacy guide aliases redirect to canonical guide paths.
