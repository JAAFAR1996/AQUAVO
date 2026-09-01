# Language contamination cleanup — `blog-language-contamination-20260901`

**Status: APPLIED to Neon production on 2026-09-01. Real `COMMIT`, verified.**

## What was wrong

The blog generator emitted tokens from other languages mid-sentence and persisted
them. A scan of all 80 published articles found **30 contaminated (37.5%)**:

| Source | Examples |
| --- | --- |
| Chinese | `عملية复杂ة`, `然而،`, `设备`, `理解` |
| Russian | `которые`, `выбор`, `здоров`, `должна` |
| Devanagari | `जहما` |
| Vietnamese | `khảية`, `dịch vụ`, `một`, `bằng`, `bất` |
| French | `besoinها` |
| Spliced English | `تutilize`, `حobbyists`, `يcovers`, `لallow`, `بbehind` |

A broken glyph mid-sentence is the clearest machine-generated signal a reader or
an AI crawler can see, and the same text is served to browsers, Googlebot,
GPTBot, ClaudeBot and PerplexityBot alike.

## What was done

**70 corrections across 36 articles.** Only `blog_posts.content` was written —
titles and excerpts were already clean and are untouched. No article was
rewritten: every edit is the minimum change that removes the foreign fragment
and leaves a grammatical Arabic sentence, with the intended meaning reconstructed
from the surrounding sentence.

`ledger.mjs` is the correction ledger — slug, exact fragment, replacement,
rationale and confidence for every entry. It is also the generator: it verifies
each target still exists in production at its expected count, applies the whole
set in memory to prove zero residue, and only then emits `migration.sql`.

Discipline built into `migration.sql`:

- pre-flight aborts unless exactly 80 posts are published
- `blog_posts_content_backup_lang_20260901` snapshot inside the same transaction
- one transaction, `ON_ERROR_STOP=1`
- post-flight guard aborts if any stray CJK/Cyrillic/Devanagari survives in a
  published body, naming the offending slugs

## Verified after commit

- backup table: 82 rows; content changed on exactly 36 rows
- `title`, `excerpt`, `is_published` changed on **0** rows
- stray CJK glyphs **0**, stray Cyrillic words **0** across all 80 live articles
- editorial commerce audit still **0 violations**
- corrected pages serve clean to browser, Googlebot, GPTBot, ClaudeBot and
  PerplexityBot (the browser path is CSR and takes the body from the API, which
  was verified clean directly)

## RESEARCH BLOCKED — deliberately not fixed

Two fragments whose intended meaning cannot be recovered from context. Both are
Latin-script, so the post-flight guard still passes. They need a human decision.

| Article | Fragment | Why |
| --- | --- | --- |
| `american-vs-african-cichlids-differences` | `bằngرارها` | Vietnamese `bằng` displaced an unknown prefix. The surviving `رارها` fits several words (`باستمرارها` / `بإصرارها` / `باحمرارها`) and the sentence is about behaviour, not colour, so no reading is safely inferable. |
| `neon-tetra-color-care-guide` | `ط Ard` | Two fragments with a space. Could be a product type or a verb; the list item gives no further signal. |

## Rollback

`rollback.sql` restores `content` verbatim from the snapshot. It touches only
`content`, which is the only column the migration wrote, so it is fully
reversible.

## Prevention

`shared/script-purity.ts` now rejects this class at generation time via
`validateGeneratedBlogData`, and `SCRIPT_PURITY_RULE` states the same rule in the
prompt. It blocks foreign scripts and Latin fused onto an Arabic letter, while
allowing the technical English the corpus legitimately uses — `pH`, `CO2`, `RO`,
`LED`, brand names, scientific binomials and units. Regression tests covering ten
true positives (all real production fragments) and ten false positives are in
`server/__tests__/script-purity.test.ts`.
