# AQUAVO Knowledge Center — Maintenance Cleanup Report

**Date:** 2026-09-03
**Phase:** MAINTENANCE (BUILD closed)
**Scope:** the four defects recorded in `FINAL_KNOWLEDGE_CENTER_REPORT.md` §5 — nothing else.
**Migration status:** **written, gated, dry-run passed — NOT APPLIED.**

---

## 0. Summary

| | |
|---|---|
| Articles touched | **4** (all pre-existing; no new articles) |
| New articles | **0** |
| Deleted articles | **0** |
| Slug / URL changes | **0** |
| Title changes | **1** (unavoidable — see §2.2) |
| Published count | **115 before → 115 after** (asserted twice inside the transaction) |
| New numbers or statistics introduced | **0** |
| Guarantee wording introduced | **0** |
| Commercial claims introduced | **0** |
| Net length change | **+361 chars** — every article got longer, none shorter |

Deliverables in `docs/knowledge-center/cleanup/`:

| file | purpose |
|---|---|
| `build-cleanup.mjs` | the only source of truth; emits the HTML and both SQL files |
| `before/*.html`, `before/*.json` | production bytes captured 2026-09-03 before any edit — the rollback source |
| `_c-*.html` | the gated corrected bodies (generated — do not hand-edit) |
| `migration-cleanup.sql` | the migration (generated) |
| `rollback-cleanup.sql` | exact byte-for-byte revert (generated) |
| `project-cleanup.mjs` | projects the whole 115-article corpus post-cleanup and re-runs every gate |
| `dryrun-cleanup.mjs` | executes the migration against Neon with COMMIT swapped for ROLLBACK |
| `CLEANUP_REPORT.md` | this file |

Every edit is an explicit find/replace pair that the build asserts matches
**exactly once**. Zero matches or two matches aborts the build — silent partial
application cannot happen.

---

## 1. What was in scope

Read from `FINAL_KNOWLEDGE_CENTER_REPORT.md` §3 and §5:

| # | article | defect class |
|---|---|---|
| a | `how-to-choose-aquarium-tank` | invented `90%` figure **+** unsupported Iraq-specific claim |
| b | `top-5-mistakes` | invented `90%` prevalence statistic |
| c | `betta-compatible-tank-mates` | promotional guarantee of an outcome |
| d | `ornamental-fish-import-middle-east-origins` | unclosed `<p>` tags — markup only |

Nothing else was touched. No new content, no topic discovery, no domain map.

---

## 2. Every change, before and after

### 2.1 `how-to-choose-aquarium-tank` — content

**Reason:** one sentence carried two separate violations — a fabricated `90%`
efficacy figure, and a regional generalisation (`الصيف العراقي الحار`) of the
kind the corpus banned in Cycle 11. No source establishes 90%, and the corpus
rule is that framing stays mechanism-based rather than region-based.

**Before**

```html
<li><strong>الغطاء (Lid):</strong> يقلل بنسبة 90% من تبخر المياه في الصيف العراقي الحار ويمنع قفز الأسماك خارج الحوض.</li>
```

**After**

```html
<li><strong>الغطاء (Lid):</strong> يبطّئ تبخّر الماء، فيثبّت مستوى الحوض ويقلّل الحاجة للإضافة المتكرّرة. وهذا يهم أكثر مما يبدو: الماء وحده هو الذي يتبخّر، أما الأملاح والمعادن فتبقى، فكل تبخّر غير معوَّض يرفع تركيزها تدريجياً. ويمنع الغطاء كذلك قفز الأسماك خارج الحوض.</li>
```

**What changed and why it is better:** the number is gone and no replacement
number was invented. The claim is now the underlying principle — a lid slows
evaporation, and evaporation removes water while leaving minerals behind, so
uncompensated loss concentrates them. That is a mechanism a reader can verify
against their own hardness readings, and it connects to
`gh-kh-water-hardness-guide` conceptually without asserting a figure. The Iraq
generalisation is removed; the article's separate, factual mention of power
outages is untouched (it was never flagged).

Length 1,778 → 1,931 chars.

### 2.2 `top-5-mistakes` — title **and** content

**Reason:** the fabricated `90%` statistic appeared in the title *and* the
opening paragraph. **A title change was unavoidable** — the unsupported number
is inside the title string itself, so it cannot be removed without rewriting
the title. The emoji went with it: CLAUDE.md sets a zero-emoji rule for all
AQUAVO content, and the title had to be rewritten regardless.

**Title — before**

```
5 أخطاء يرتكبها 90% من المبتدئين (تقتل أسماكهم) ⚠️
```

**Title — after**

```
5 أخطاء شائعة عند البداية تكلّف المبتدئ أسماكه الأولى
```

The slug, and therefore the URL, is unchanged: `/blog/top-5-mistakes`.

**Content — before**

```html
<p>90% من المبتدئين يفقدون أسماكهم الأولى خلال الشهر الأول. ليس لأن الأسماك ضعيفة، بل لأن هناك أخطاء شائعة يرتكبها الجميع بدون وعي. تعرف عليها الآن قبل أن تخسر أسماكك!</p>
```

**Content — after**

```html
<p>خسارة الأسماك الأولى نادراً ما تكون بسبب ضعف السمكة نفسها. الأشيع أن الحوض لم يكن جاهزاً لاستقبالها بعد: ماء لم يُدوَّر، أو حمل أكبر من قدرة الفلتر، أو روتين عناية لم يبدأ. الأخطاء الخمسة أدناه هي الأكثر تكراراً في البداية، وكلها قابلة للتفادي قبل شراء أول سمكة — لا بعدها.</p>
```

**What changed and why it is better:** the prevalence statistic becomes a
qualitative statement of principle, exactly as the cleanup brief requires — the
claim is now about *cause* (the tank was not ready), not about *how many
people*. It also gains editorial value the original lacked: it names the three
mechanisms the article then covers, so the opening previews the body instead of
alarming the reader. The fake-urgency close (`تعرف عليها الآن قبل أن تخسر
أسماكك!`) is gone, per the no-manufactured-urgency rule.

Length 1,858 → 1,967 chars. The five mistakes themselves are untouched.

### 2.3 `betta-compatible-tank-mates` — content

**Reason:** the closing paragraph guaranteed an outcome and attached it to the
brand — the exact filler shape the `ph-level` rewrite was created to remove.

**Before**

```html
<p>اختيار الزملاء المناسبين لأسماك الفايتر (بيتا) يعتبر تحديًا، ولكن يمكن أن يكون تجربة ممتعة ومثمرة. يجب أن تأخذ في الاعتبار المتطلبات والطبيعة لأسماك الفايتر (بيتا)، وكذلك الظروف البيئية في العراق. في AQUAVO، نوفر لك الخبرة والجودة والموثوقية، لضمان تجربة ممتعة ومثمرة في تربية الأسماك الزينة.</p>
```

**After**

```html
<p>اختيار رفقاء الحوض لسمكة الفايتر (بيتا) قرار يعتمد على حجم الحوض ودرجة الحرارة وطباع السمكة نفسها، لا على ما هو متاح وقت الشراء. وبعد أي إضافة، راقب الحوض في الأيام الأولى: مطاردة متكرّرة أو زعانف ممزّقة إشارة إلى أن التركيبة لا تنجح، لا إلى أنها تحتاج وقتاً أطول. وابقَ مستعداً لفصل السمكة عند الحاجة — بعض أفراد الفايتر لا يقبلون رفقة مهما كان الاختيار موفقاً، وهذا سلوك فردي لا يُصلَح بتغيير الرفقاء.</p>
```

**What changed and why it is better:** the brand guarantee is replaced with the
honest limit. The original implied that following the article produces a good
outcome; the replacement tells the reader what to watch for, how to read it
(repeated chasing and torn fins mean the combination is failing, not settling
in), and states plainly that some individual bettas refuse company no matter
how well the tank mates were chosen. No word of guarantee, no mention of what
AQUAVO supplies. The article is no shorter.

Length 2,270 → 2,381 chars.

### 2.4 `ornamental-fish-import-middle-east-origins` — markup only

**Reason:** two `<p>` elements were opened before a list and never closed
(4 open / 2 close). Browsers auto-close them so rendering was unaffected, but
the markup was invalid and the article was the corpus's only tag-balance
failure.

**Before**

```html
<p>تأتي أسماك الزينة إلى الشرق الأوسط من مختلف الدول، ولكن يمكن تقسيمها إلى ثلاث فئات رئيسية:
<ul>
```

```html
<p>يواجه استيراد الأسماك الزينة إلى الشرق الأوسط عدة تحديات، بما في ذلك:
<ol>
```

**After**

```html
<p>تأتي أسماك الزينة إلى الشرق الأوسط من مختلف الدول، ولكن يمكن تقسيمها إلى ثلاث فئات رئيسية:</p>
<ul>
```

```html
<p>يواجه استيراد الأسماك الزينة إلى الشرق الأوسط عدة تحديات، بما في ذلك:</p>
<ol>
```

**Not one character of prose changed.** The only difference is eight characters
of markup: two `</p>` tags. Length 1,736 → 1,744 chars (+8, exactly the two
closing tags).

---

## 3. Test results

### 3.1 Per-draft gate — `scripts/gate-draft.ts`

Each corrected body was run through the same guards that gate every generator
output, against the live catalogue.

| file | script purity | editorial | business truth | dead links | unbalanced tags | exit |
|---|---|---|---|---|---|---|
| `_c-how-to-choose-aquarium-tank.html` | 0 | 0 | 0 | 0 | 0 | **0** |
| `_c-top-5-mistakes.html` | 0 | 0 | 0 | 0 | 0 | **0** |
| `_c-betta-compatible-tank-mates.html` | 0 | 0 | 0 | 0 | 0 | **0** |
| `_c-ornamental-fish-import-middle-east-origins.html` | 0 | 0 | 0 | 0 | 0 | **0** |

`how-to-choose-aquarium-tank` keeps its 3 internal links, all resolving. The
other three articles had no internal links before and have none after — the
cleanup adds and removes no links, so the graph is untouched by construction.

### 3.2 Full-corpus projection — `project-cleanup.mjs`

The live 115-article corpus was fetched, the four corrected bodies substituted,
and every gate re-run over the result. This measures the post-migration state
**before** the migration is applied.

| check | measured | expected | result |
|---|---|---|---|
| Articles | 115 | 115 | **PASS** |
| Script purity | 0 | 0 | **PASS** |
| Editorial guard | 0 | 0 | **PASS** |
| Business truth | 0 | 0 | **PASS** |
| Dead links | 0 | 0 | **PASS** |
| Self links | 0 | 0 | **PASS** |
| Orphan detection | 0 | 0 | **PASS** |
| HTML tag balance | 0 malformed | 0 | **PASS** |
| Internal edges | 526 (avg 4.57) | unchanged | informational |
| Zero-outbound | 43 | unchanged | informational |

**Tag balance improves from 114/115 to 115/115.** Every other gate was already
at zero and stays at zero.

### 3.3 Sitemap and canonical consistency — measured live

The cleanup changes no slug, no publish state and no article count, so neither
can move; both were re-measured anyway.

| check | measured | result |
|---|---|---|
| Sitemap index children | 4 — pages 34, products 112, guides 27, **blog 115** | ✅ |
| Blog URLs in sitemap vs published in DB | **115 = 115**, 0 missing, 0 extra | ✅ |
| Canonical mismatches across the corpus | **0** | ✅ |
| Canonical on the 4 cleanup targets (browser + Googlebot) | 200, self-referential, absolute — **0 mismatches** | ✅ |
| `robots.txt` | `Allow: /`, blog not disallowed, sitemap declared | ✅ |
| Googlebot / GPTBot / ClaudeBot / PerplexityBot | none blocked | ✅ |

### 3.4 Migration dry run — `dryrun-cleanup.mjs`

The migration was sent to Neon with its single `COMMIT` replaced by `ROLLBACK`,
so the server really executed every precondition, every `UPDATE` and every
post-flight assertion, then discarded the transaction.

```
target host      : ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech
mode             : DRY RUN — COMMIT replaced with ROLLBACK, nothing persists
updates          : 4
assertions       : 11
published before : 115
server accepted the full statement stream; all assertions passed
published after  : 115
rollback proof   : original title still present = YES (nothing persisted)
DRY RUN PASSED. Migration is valid and nothing was written.
```

Production was then re-queried through the public API: still 115 articles,
`top-5-mistakes` still carries its original title, `betta-compatible-tank-mates`
still carries the guarantee. **Nothing was applied.**

### 3.5 Assertions built into the migration

| stage | assertion |
|---|---|
| pre-flight | exactly 115 published articles |
| pre-flight | each of the 5 defect texts is present exactly once, in the expected article |
| pre-flight | `top-5-mistakes` still has the expected original title |
| post-flight | still exactly 115 published articles |
| post-flight | no `90` survives in the title or body of either `90%` article |
| post-flight | no `لضمان` / `نضمن` / `مضمون` survives in the betta article |
| post-flight | the import article's `<p>` tags balance |

Any failure raises inside the transaction and aborts it. There is no partial
application path.

---

## 4. Article count — confirmed unchanged

**115 before, 115 after.** This is not an assumption:

- the migration performs **only `UPDATE`** — no `INSERT`, no `DELETE`, no
  change to `is_published`;
- the count is asserted **before** the updates and **again after** them, inside
  the same transaction;
- the dry run reported `published before : 115` / `published after : 115`;
- the projection over the patched corpus counted 115;
- production re-queried after the dry run still reports 115.

---

## 5. Rollback

`rollback-cleanup.sql` restores all four articles — and the one changed title —
to the **exact bytes production served on 2026-09-03**, taken literally from
`before/*.html` rather than re-derived. This closes the rollback-fidelity gap
noted on earlier migrations: a revert here is byte-exact, not approximate. It
asserts the 115 count after restoring, and is transactional.

---

## 6. Observed but deliberately NOT changed

Recorded so the next maintainer knows these were seen and consciously left
alone. Acting on any of them would be scope expansion, which the brief forbids.

1. **`betta-compatible-tank-mates` keeps its «مقدمة / استنتاج» filler shape**
   and the sentence about Iraqi summer temperatures reaching 50°C. Only the
   flagged promotional guarantee was in scope. The temperature line passed the
   Iraq-generalisation audit at 0 violations; it is a claim about air
   temperature, not about water or the corpus's own advice.
2. **`betta-compatible-tank-mates` has typographic and grammatical roughness**
   (`أسماك البلاستي` for البلاتي, `من الأفضل الزملاء`). Legacy copy quality, not
   a recorded defect.
3. **`ornamental-fish-import-middle-east-origins` keeps its «مقدمة / ختام»
   filler shape.** Only the markup defect was in scope.
4. **43 articles still have zero outbound links.** A link-density ceiling, not
   a defect; all 115 remain reachable.
5. **Two near-duplicate category labels** (`علوم الأحواض`/`علم الأحواض`,
   `ديكور وأحواض`/`تربة وديكور`). Cosmetic.
6. **CI remains red on dependency advisories and Netlify.** Pre-existing,
   tracked separately, must not be silenced.

---

## 7. Status

| target | state |
|---|---|
| 115 articles | ✅ **115**, unchanged |
| 0 editorial issues | ✅ **0** |
| 0 unsupported claims | ✅ **0** — all three legacy defects removed |
| 0 HTML defects | ✅ **0** — tag balance 115/115 |
| Migration applied | ⏸️ **NO — awaiting approval** |

Every gate passes in projection and the migration's dry run passed against the
real database. **The migration has not been applied**, per the standing rule
that production migrations require explicit approval.

**To apply:**

```
node docs/knowledge-center/wave-9/apply-migration.mjs docs/knowledge-center/cleanup/migration-cleanup.sql --commit
```

**Then, mandatorily, re-measure against production:**

```
npx tsx docs/knowledge-center/wave-9/verify-corpus.mjs
```

`AQUAVO Knowledge Center = MAINTENANCE COMPLETE` can be declared once that
post-migration run reports 115 articles with every gate at zero — measured, not
projected. Until the migration is applied, the three content defects and the one
markup defect are still live.
