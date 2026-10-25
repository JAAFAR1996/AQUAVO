# Disposable review-only hosting harness

DO NOT MERGE this directory, netlify.toml, or the gitlink cleanup into main.
The production-candidate application remains preserved at commit 7e920668ebdfd799455fb794fcedfe86ec5906a7.

Only Netlify `deploy-preview` context can execute this static build. No backend, production API proxy, credentials, customer/order data or account configuration is included. The catalogue fixture allowlists fields from the existing public storefront GET responses captured on 2026-10-24 at 20:34 UTC. Prices and stock are historical, not live. All fetch writes, XHR API access, beacon, form submissions, login, checkout and order routes are disabled. CSP blocks remote scripts and connections. Product photos remain original public catalogue images; the homepage AI image is explicitly illustrative.

The eight pre-existing orphan gitlink index entries prevented provider checkout. Their exact names and commit hashes are preserved in orphan-gitlinks-backup.txt. No source files within those repositories were removed. Restore them with `git update-index --add --cacheinfo 160000,<hash>,<path>` when preparing any clean production candidate.
