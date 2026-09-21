# content_translations: re-seed of corrected translations (2026-09-20)

Approved scope: replace stale `machine` rows for en and ckb with the copy that
passed quality review pass 1. Branch `production` of Neon project `fishweb`,
from repository commit b327820e.

## Pre-checks

- Fresh validator (source re-fetched): **0 errors, 237 warnings**, all of class B
  (a competing Sorani form that is also natural), documented in
  `reports/i18n/quality-review-pass1.md` and `glossary-review.md`.
- Coverage unchanged: UI en 5452/5452 and ckb 5452/5452; products 107/107,
  posts 117/117, categories 8/8 in both locales, all field-complete and valid.
- Every entry's `source_hash` was recomputed from the live Arabic rows: **0 outdated**,
  so nothing had to be withheld.
- Rows before: 464, of which 0 reviewed.

## Plan and result

| store | insert | change | identical | reviewed (protected) | outdated | skipped |
|---|---|---|---|---|---|---|
| en/products | 0 | 3 | 104 | 0 | 0 | 0 |
| en/blog_posts | 0 | 2 | 115 | 0 | 0 | 0 |
| en/blog_categories | 0 | 0 | 8 | 0 | 0 | 0 |
| ckb/products | 0 | 0 | 107 | 0 | 0 | 0 |
| ckb/blog_posts | 0 | 3 | 114 | 0 | 0 | 0 |
| ckb/blog_categories | 0 | 0 | 8 | 0 | 0 | 0 |

**8 rows written**, one transaction per store. Rows changed:

- en/products: `general-air-stone`, `general-sponge-filter-xy180`, `yyh-039`
- en/blog_posts: `common-fish-diseases-white-spot`, `nitrogen-cycle-simple-arabic-explained`
- ckb/blog_posts: `algae-war-guide`, `common-fish-diseases-white-spot`, `aquarium-care-while-traveling`

456 rows were byte-identical after canonical comparison and were not rewritten.
The count was cross-checked against `git diff d522163f..HEAD` on the translation
stores and matches exactly.

### Why ckb/products shows no change

Most Kurdish class A corrections (currency mark, litre, heater, bacteria, ammonia,
chlorine, warranty, the Persian and Arabic loanwords, reproduction vs development)
were in the **UI bundles** under `client/src/locales/ckb/`, which ship with the
application build and are not database rows. The Kurdish product rows had already
been normalised before the original seed, so they were already correct in production.
Those UI corrections reach customers with the next deployment, which is not part of
this approval.

## Post-write verification

| type | rows | machine | reviewed | orphan | incomplete | hash mismatch | unpublished |
|---|---|---|---|---|---|---|---|
| en/product | 107 | 107 | 0 | 0 | 0 | 0 | 0 |
| en/blog_post | 117 | 117 | 0 | 0 | 0 | 0 | 0 |
| en/blog_category | 8 | 8 | 0 | 0 | 0 | 0 | 0 |
| ckb/product | 107 | 107 | 0 | 0 | 0 | 0 | 0 |
| ckb/blog_post | 117 | 117 | 0 | 0 | 0 | 0 | 0 |
| ckb/blog_category | 8 | 8 | 0 | 0 | 0 | 0 | 0 |

Total 464 rows, 464 machine, 0 reviewed, 0 outdated. Exactly 8 rows carry a new
`updated_at`. No row was reviewed before this operation, so none could be overwritten.

### The corrections were confirmed present in production, by query

All twelve checks returned zero remaining problems: no English name starts with the
invented "General"; `yyh-039` names the dechlorinator; the English article title no
longer says "in Arabic"; the English white-spot article says nitrate; the Kurdish
algae guide contains nitrate and no nitrite; the Kurdish travel guide says "lowest
nitrate"; and no Kurdish row still contains `IQD`, the litre misspellings, the heater
loanword, the ammonia misspelling, the dechlorinator loanword or the bacteria misspellings.

## Arabic source untouched

| | before | after |
|---|---|---|
| products | 114 | 114 |
| blog_posts | 127 | 127 |
| orders | 82 | 82 |
| users | 23 | 23 |
| products fingerprint (id, name, description) | 18ff6327f4e2d392fcba185aa4a46b8b | identical |
| blog fingerprint (id, title, content) | 9c46dfb2b2744287246d1a172d8b921e | identical |
| commerce fingerprint (id, price, stock) | 5467ae799c69040c360e09ea31716898 | identical |

## Gates

Client typecheck 0 errors, api typecheck 0 errors, i18n and migration tests 45/45,
validator 0 errors / 237 warnings.

## Not done

No merge, no deploy, `ready` still false for both locales, en and ckb still hidden
from the public language selector, hreflang and sitemaps still Arabic only, no Vercel
change, no new migration, nothing marked reviewed.
