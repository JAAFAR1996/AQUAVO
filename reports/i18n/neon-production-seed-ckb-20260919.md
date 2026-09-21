# content_translations: Kurdish (ckb) seed into production (2026-09-19, ~16:50 UTC+3)

Approved scope: ckb rows only, public products, published posts, active blog categories; status machine; no reviewed row overwritten; Arabic untouched.

## Pre-checks
- Fresh validator (source re-fetched): 0 errors, 1101 warnings. ckb products 107/107, posts 117/117, categories 8/8 complete and valid. UI keys en 5452/5452, ckb 5452/5452.
- Dry run: 232 entries = 232 inserts (107 + 117 + 8), 0 updates, 0 reviewed rows to skip.
- Production hash check (TOOLS/i18n/verify-seed.ts): 0 stale hashes, 0 incomplete, 0 unpublished.
- Rows before: 232 (all en).

## Seed
`node --env-file=.env TOOLS/i18n/seed-translations.mjs --locale=ckb`, one transaction per file. 232 rows written, status machine.

## Post-verification

| type | rows | machine | reviewed | orphan | incomplete | hash mismatch | unpublished |
|---|---|---|---|---|---|---|---|
| ckb/product | 107 | 107 | 0 | 0 | 0 | 0 | 0 |
| ckb/blog_post | 117 | 117 | 0 | 0 | 0 | 0 | 0 |
| ckb/blog_category | 8 | 8 | 0 | 0 | 0 | 0 | 0 |
| en/product | 107 | 107 | 0 | 0 | 0 | 0 | 0 |
| en/blog_post | 117 | 117 | 0 | 0 | 0 | 0 | 0 |
| en/blog_category | 8 | 8 | 0 | 0 | 0 | 0 | 0 |

Total 464 rows; reviewed 0; outdated 0. Arabic: products 114, blog_posts 127, users 23, orders 82; fingerprints unchanged (18ff6327f4e2d392fcba185aa4a46b8b / 9c46dfb2b2744287246d1a172d8b921e). Validator after seed: 0 errors. Typecheck: 0 errors (client, api).

## Warning inventory (not errors; kept for the review plan)

| type | count |
|---|---|
| ui/ckb/glossary | 517 |
| content/ckb/glossary | 487 |
| content/en/punctuation | 51 |
| content/ckb/punctuation | 42 |
| ui/ckb/latin-heavy | 1 |
| ui/ckb/small-number | 1 |
| ui/ckb/source-copy | 1 |
| ui/en/small-number | 1 |
| total | 1101 |

Release flags remain false; selector, hreflang and sitemaps still Arabic-only. No merge, no deploy, no Vercel change.
