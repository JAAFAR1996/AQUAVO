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

## Pass 2 — the residue this pass missed

**See `pass-2/`. Status: drafted 2026-09-02, verified against production.**

The post-flight guard above tests `[一-鿿぀-ヿЀ-ӿऀ-ॿ]`. That is Han, Kana,
Cyrillic and Devanagari — and nothing else. **Hangul, Thai, Hebrew and
Latin-Extended fall outside it**, so this pass certified a corpus that was still
contaminated, and "0 stray glyphs across all 80 articles" above was true only of
the scripts it looked for.

Re-scanning with the real guard from `shared/script-purity.ts` — which is the
authority, and which had always covered these — found **8 corrections across 5
articles** still live:

| Article | Fragment | Script |
| --- | --- | --- |
| `common-fish-diseases-white-spot` | `לעلاجه` → `لعلاجه` | Hebrew |
| `american-vs-african-cichlids-differences` | `لتربية 성공ية` → `لتربية ناجحة` | Hangul |
| `ph-level-iraqi-tap-water-fish` | `للคลور` → `للكلور` | Thai |
| `algae-war-guide` | `وCO2` → `و CO2` | guard false positive, see below |
| `neon-tetra-color-care-guide` | `<p>"…"</p>` wrapper | structural |

The Hangul one is the same phrase pass 1 repaired in its Han spelling
(`لتربية成功ية`) — it fixed one spelling of one phrase and missed the other.

## RESEARCH BLOCKED — now resolved by removal

Both fragments were re-examined in pass 2 with the full paragraph and article
intent. Neither meaning is recoverable, and neither was guessed at. Rather than
leave visible corruption on a published page, the corrupted fragment is removed
and the sentence closes cleanly. Nothing is invented, and neither sentence is
load-bearing, so neither article needed unpublishing.

| Article | Fragment | Decision |
| --- | --- | --- |
| `american-vs-african-cichlids-differences` | `bằngرارها` | Vietnamese `bằng` displaced an unknown prefix; the surviving `رارها` fits `باستمرارها` / `بإصرارها` / `باحمرارها` / `بفرارها` and the bullet is about behaviour, so no reading is safely inferable. **Removed**: `التي تمتاز bằngرارها وعدوانيتها` → `التي تمتاز بعدوانيتها`, keeping only the trait that survived intact. |
| `neon-tetra-color-care-guide` | `ط Ard` | Two fragments with a space in a list of water-quality equipment; could be a product type, a brand or a verb. **Removed**: `استخدام ط Ard معقم المياه` → `استخدام معقم المياه`, which is the advice the sentence already carried. |

## `وCO2` — a guard false positive, fixed in the content

`وCO2` is correct Arabic: the conjunction `و` proclitic on a Latin technical
term. `SPLICED_LATIN` rejects it anyway. That is deliberate and stays: `ب` and
`ل` are proclitics too, and `بbehind` / `لallow` are exactly how the real
corruption arrived, so exempting proclitics would readmit them. The guard fails
closed — a false positive costs a regeneration, a false negative ships
corruption. The one live instance is spaced instead, and the trade-off is pinned
by tests so it is not silently "fixed" later.

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
`server/__tests__/script-purity.test.ts`, plus the four pass-2 fragments and the
`وCO2` trade-off — 30 tests in all.

The lesson from pass 2 is that the migration's post-flight guard must be the
same rule as the code guard, or it certifies what it did not check. `pass-2/`
generates its post-flight from the ledger and covers every script
`findScriptViolations` rejects.
