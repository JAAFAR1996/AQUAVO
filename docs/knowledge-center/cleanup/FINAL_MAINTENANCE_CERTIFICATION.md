# AQUAVO Knowledge Center — Final Maintenance Certification

**Status: MAINTENANCE COMPLETE**

**Date:** 2026-09-03
**Migration ID:** `kc-cleanup-20260903`
**Certified by:** measurement against live production after the migration committed.

---

## 1. Application

| | |
|---|---|
| Applied at | **2026-09-03 19:22:30 UTC → 19:22:33 UTC** (3 s) |
| Migration file | `docs/knowledge-center/cleanup/migration-cleanup.sql` |
| SHA-256 | `039c9ed5c5cb46af7ce42642780525ad582d7489a18de140e4fa942489c76080` |
| Runner | `docs/knowledge-center/wave-9/apply-migration.mjs --commit` (single transaction) |
| Target | Neon production, `ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech` |
| Result | **COMMITTED** — every post-flight assertion passed |
| Rollback | `rollback-cleanup.sql` — restores the exact captured pre-state bytes |

### Pre-application verification — all three gates passed

| check | result |
|---|---|
| Migration hash: working tree vs commit `aa18846a` | **identical** ✅ |
| Migration hash: fresh rebuild from `build-cleanup.mjs` | **identical** — build is deterministic ✅ |
| Working tree | clean, no drift ✅ |
| Production article count | **115** ✅ |
| The 4 target articles vs the snapshots the dry run tested | **4 / 4 byte-identical, titles identical — zero drift** ✅ |

Production was confirmed to be *exactly* the state the dry run exercised before
a single byte was written. The migration's own pre-flight assertions re-checked
the same conditions server-side inside the transaction.

---

## 2. Article count — before and after

| | count |
|---|---|
| Published articles **before** | **115** |
| Published articles **after** | **115** |
| Inserted | 0 |
| Deleted | 0 |
| Unpublished / republished | 0 |

Asserted twice inside the transaction (pre-flight and post-flight), and
re-measured against the live API after commit. The migration performs `UPDATE`
only.

Category distribution is unchanged — 11 distinct labels, identical counts
(`أنواع الأسماك` 24, `مشاكل وحلول` 22, `للمبتدئين` 16, `المعدات` 14,
`ديكور وأحواض` 12, `علوم الأحواض` 11, `أدلة التسوق` 6, `نباتات مائية` 4,
`مقالات متنوعة` 4, `تربة وديكور` 1, `علم الأحواض` 1). No article moved category.

---

## 3. Files modified

### In production (`blog_posts`) — 4 rows

| slug | field(s) | before | after | verified |
|---|---|---|---|---|
| `how-to-choose-aquarium-tank` | `content` | 1,778 | 1,931 | byte-identical to gated source ✅ |
| `top-5-mistakes` | `content`, `title` | 1,858 | 1,967 | byte-identical to gated source ✅ |
| `betta-compatible-tank-mates` | `content` | 2,270 | 2,381 | byte-identical to gated source ✅ |
| `ornamental-fish-import-middle-east-origins` | `content` | 1,736 | 1,744 | byte-identical to gated source ✅ |

**No slug changed. No URL changed.** Net length **+361 characters** — every
article grew; none was shortened.

Live content was fetched back after commit and compared by exact string
equality against `_c-*.html`: **4 / 4 identical**. A count proves rows were
touched; this proves the right bytes landed.

### In the repository

| file | role |
|---|---|
| `docs/knowledge-center/cleanup/build-cleanup.mjs` | sole source of truth; emits the HTML and both SQL files |
| `docs/knowledge-center/cleanup/before/*.html`, `*.json` | production bytes captured pre-cleanup — the rollback source |
| `docs/knowledge-center/cleanup/_c-*.html` | the gated corrected bodies (generated) |
| `docs/knowledge-center/cleanup/migration-cleanup.sql` | the applied migration (generated) |
| `docs/knowledge-center/cleanup/rollback-cleanup.sql` | byte-exact revert (generated) |
| `docs/knowledge-center/cleanup/project-cleanup.mjs` | full-corpus pre-application projection |
| `docs/knowledge-center/cleanup/dryrun-cleanup.mjs` | COMMIT→ROLLBACK dry run |
| `docs/knowledge-center/cleanup/CLEANUP_REPORT.md` | before/after and rationale for every change |
| `docs/knowledge-center/cleanup/FINAL_MAINTENANCE_CERTIFICATION.md` | this file |
| `docs/knowledge-center/final/FINAL_KNOWLEDGE_CENTER_REPORT.md` | §5 updated — the recorded defects are now cleared |

---

## 4. The four fixes

### 4.1 `how-to-choose-aquarium-tank` — fabricated figure + regional generalisation

**Before:** «الغطاء (Lid): يقلل بنسبة **90%** من تبخر المياه في **الصيف العراقي الحار** ويمنع قفز الأسماك خارج الحوض.»

**After:** «الغطاء (Lid): يبطّئ تبخّر الماء، فيثبّت مستوى الحوض ويقلّل الحاجة للإضافة المتكرّرة. وهذا يهم أكثر مما يبدو: الماء وحده هو الذي يتبخّر، أما الأملاح والمعادن فتبقى، فكل تبخّر غير معوَّض يرفع تركيزها تدريجياً. ويمنع الغطاء كذلك قفز الأسماك خارج الحوض.»

Two violations in one sentence: no source establishes 90%, and the corpus bans
regional generalisations. The number is gone and **no replacement number was
invented** — the claim is now the mechanism, which a reader can check against
their own hardness readings.

### 4.2 `top-5-mistakes` — fabricated prevalence statistic, in the title

**Title before:** «5 أخطاء يرتكبها **90%** من المبتدئين (تقتل أسماكهم) ⚠️»
**Title after:** «5 أخطاء شائعة عند البداية تكلّف المبتدئ أسماكه الأولى»

**Body before:** «**90%** من المبتدئين يفقدون أسماكهم الأولى خلال الشهر الأول… تعرف عليها الآن قبل أن تخسر أسماكك!»

**Body after:** «خسارة الأسماك الأولى نادراً ما تكون بسبب ضعف السمكة نفسها. الأشيع أن الحوض لم يكن جاهزاً لاستقبالها بعد: ماء لم يُدوَّر، أو حمل أكبر من قدرة الفلتر، أو روتين عناية لم يبدأ…»

The title change was **unavoidable** — the unsupported number lived inside the
title string. The emoji went with it (zero-emoji house rule). The claim is now
about *cause*, not prevalence, and previews the three mechanisms the article
covers. Manufactured urgency removed. **Slug and URL unchanged.**

### 4.3 `betta-compatible-tank-mates` — outcome guarantee

**Before:** «…في AQUAVO، نوفر لك الخبرة والجودة والموثوقية، **لضمان** تجربة ممتعة ومثمرة في تربية الأسماك الزينة.»

**After:** «اختيار رفقاء الحوض لسمكة الفايتر (بيتا) قرار يعتمد على حجم الحوض ودرجة الحرارة وطباع السمكة نفسها… وابقَ مستعداً لفصل السمكة عند الحاجة — بعض أفراد الفايتر لا يقبلون رفقة مهما كان الاختيار موفقاً، وهذا سلوك فردي لا يُصلَح بتغيير الرفقاء.»

The brand guarantee is replaced by the honest limit: what to watch for, how to
read it, and the fact that some individual bettas refuse company regardless.

### 4.4 `ornamental-fish-import-middle-east-origins` — markup only

Two `<p>` elements were opened before a list and never closed (4 open / 2
close). Two `</p>` tags added — **eight characters of markup, zero prose.**
This was the corpus's only tag-balance failure.

---

## 5. Post-application test results — measured against production

All measurements taken after the transaction committed.

### 5.1 `verify-corpus.mjs` — the full live corpus

| gate | measured | target | result |
|---|---|---|---|
| Articles | **115** | 115 | **PASS** |
| Script purity | **0** | 0 | **PASS** |
| Editorial guard | **0** | 0 | **PASS** |
| Business truth | **0** | 0 | **PASS** |
| Dead links | **0** | 0 | **PASS** |
| Self links | **0** | 0 | **PASS** |
| Orphan detection | **0** | 0 | **PASS** |
| Internal edges | 526 (avg 4.57 out) | unchanged | ✅ |
| Zero-outbound | 43 | unchanged | informational |

The link graph is byte-for-byte unchanged: the cleanup added and removed no
links.

### 5.2 HTML tag balance — the defect is gone

| | before | after |
|---|---|---|
| Clean articles | 114 / 115 | **115 / 115** ✅ |
| Malformed | `ornamental-fish-import-middle-east-origins` (`p 4/2`) | **none** |

### 5.3 Unsupported claims — re-checked in production

| article | claim | status |
|---|---|---|
| `how-to-choose-aquarium-tank` | invented `90%` + Iraq generalisation | **CLEAR** ✅ |
| `top-5-mistakes` | invented `90%` prevalence | **CLEAR** ✅ |
| `betta-compatible-tank-mates` | outcome guarantee (`لضمان`/`نضمن`/`مضمون`) | **CLEAR** ✅ |

Zero occurrences of `90` remain in either article's body or title. (One `90`
appears in the served HTML of the tank article inside a Cloudinary asset URL
version string, `v1773199290` — not article text. The `articleBody` element
contains **0** occurrences.)

### 5.4 Sitemap consistency

| check | measured | result |
|---|---|---|
| Sitemap index children | 4 — pages 34, products 112, guides 27, **blog 115** | ✅ |
| Blog URLs in sitemap vs published in DB | **115 = 115** | ✅ |
| Missing from sitemap | **0** | ✅ |
| Extra in sitemap | **0** | ✅ |

### 5.5 Canonical consistency and crawler visibility

The four corrected articles, across five agents:

| agent | status | canonical | article body served |
|---|---|---|---|
| Browser | 200 ×4 | correct ×4 | ✅ |
| Googlebot | 200 ×4 | correct ×4 | ✅ |
| GPTBot | 200 ×4 | correct ×4 | ✅ |
| ClaudeBot | 200 ×4 | correct ×4 | ✅ |
| PerplexityBot | 200 ×4 | correct ×4 | ✅ |

**Canonical/serving failures: 0.** Canonicals are absolute and self-referential.
`robots.txt`: `Allow: /`, blog not disallowed, sitemap declared, and none of
Googlebot, GPTBot, ClaudeBot or PerplexityBot blocked.

### 5.6 Migration fidelity

| target | result |
|---|---|
| Live content vs gated `_c-*.html`, exact string equality | **4 / 4 identical** ✅ |
| `top-5-mistakes` live title | matches the intended new title ✅ |

---

## 6. Certification

The AQUAVO Knowledge Center, measured against live production after
`kc-cleanup-20260903` committed at **2026-09-03 19:22:33 UTC**:

| requirement | measured | status |
|---|---|---|
| **115 articles** | **115** | ✅ |
| **0 unsupported claims** | **0** | ✅ |
| **0 editorial defects** | **0** | ✅ |
| **0 HTML defects** | **0** (115 / 115 balanced) | ✅ |
| **0 orphan articles** | **0** | ✅ |
| Script purity | 0 | ✅ |
| Business truth | 0 | ✅ |
| Dead links / self links | 0 / 0 | ✅ |
| Sitemap ↔ database | 115 = 115, 0 drift | ✅ |
| Canonical consistency | 0 mismatches | ✅ |
| Crawler visibility | 4 / 4 articles × 5 agents | ✅ |

**AQUAVO Knowledge Center = MAINTENANCE COMPLETE.**

Every defect recorded in the final certification report is closed. No content
was expanded, no article was added, no topic was discovered, and no roadmap was
generated.

---

## 7. Standing state

**The corpus is closed for expansion.** Operating mode remains
**MONITOR → MEASURE → IMPROVE**. New content requires one of the five triggers
in `FINAL_KNOWLEDGE_CENTER_REPORT.md` §6 — Search Console data, repeated
customer questions, catalogue changes, scientific updates, or evidenced search
demand. A concept being absent is not, by itself, a reason to write.

Remaining non-defects, unchanged and non-blocking: 43 articles with no outbound
links (a density ceiling, not a defect — all 115 are reachable); two
near-duplicate category labels (cosmetic); legacy filler shapes in two articles;
and the pre-existing dependency-advisory and Netlify CI failures, which are
tracked separately and must not be silenced.

Monthly: re-run `verify-corpus.mjs` against production; every gate must stay 0.
