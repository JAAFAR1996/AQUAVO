# content_translations: English seed into production (2026-09-19 16:24 UTC+3)

Approved scope: English rows only, field-complete, validator-clean, current source hash, public/published entities. Branch `production` of Neon project `fishweb`.

## Pre-checks
- Dry run: 232 entries = 182 inserts (57 products, 117 posts, 8 categories) + 50 updates (products seeded earlier). 0 reviewed rows to skip.
- Source hashes against the live Arabic rows: 0 stale. Field completeness: 0 incomplete. Unpublished/hidden: 0.
- Validator (fresh source fetch): 0 errors for en/products, en/blog_posts, en/blog_categories.
- A regression was caught first: a stale `run-until-done.sh` loop had overwritten `data/i18n/translations/en/products.json` (107 -> 76 entries). The validated version from commit 57aa06ee was restored and re-verified before seeding (commit ea941fdb).
- Counts before: 50 rows (en/product, machine).

## Seed
`node --env-file=.env TOOLS/i18n/seed-translations.mjs --locale=en`, one transaction per file: products 107, blog_posts 117, blog_categories 8. Upsert skips rows with status reviewed (none existed). Status written: machine for every row.

## Post-verification (TOOLS/i18n/verify-seed.ts, reads production directly)

| type | rows | machine | reviewed | orphan | incomplete | hash mismatch | unpublished |
|---|---|---|---|---|---|---|---|
| en/product | 107 | 107 | 0 | 0 | 0 | 0 | 0 |
| en/blog_post | 117 | 117 | 0 | 0 | 0 | 0 | 0 |
| en/blog_category | 8 | 8 | 0 | 0 | 0 | 0 | 0 |

Total rows: 232. Kurdish rows: 0 (not seeded, per scope).
Arabic unchanged: products 114, blog_posts 127, users 23; products fingerprint 18ff6327f4e2d392fcba185aa4a46b8b, blog fingerprint 9c46dfb2b2744287246d1a172d8b921e (identical to the pre-migration snapshot). Orders 82 (one new customer order since the morning snapshot of 81; not touched by this work).

Not done: no merge, no deploy, no selector change, `ready` flags untouched, no Vercel change.
