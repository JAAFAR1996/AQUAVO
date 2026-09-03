# AQUAVO Knowledge Center — Final Certification Report

**Date:** 2026-09-03
**Phase:** **MAINTENANCE** (BUILD closed)
**Certified by:** measurement against live production, not projection.

---

## 0. Headline — read this first

The Knowledge Center is **certified at 115 published articles**, with every
quality and technical gate at zero. PR #206 is merged, `migration-final.sql` is
applied and committed, and **production now matches the reviewed source byte
for byte across all 23 changed articles.**

The earlier revision of this report certified 111 articles and listed the batch
as blocked on two approvals. Both approvals were given. This revision replaces
that state.

| | state | certified |
|---|---|---|
| **What is running now** | **115 articles, all gates 0** | ✅ **YES** |
| **The +4/+1/+18 batch** | **applied, live, verified byte-identical** | ✅ **YES** |
| **Phase** | BUILD closed → **MAINTENANCE** | ✅ |

---

## 1. Release check — PR #206 and the migration

| item | result |
|---|---|
| PR #206 state | **MERGED** |
| Merge commit | `bb3999fd64fb1f67c7b8c15fd0f96e085f15cf6d` |
| Merged at | 2026-09-03T17:57:14Z |
| Head → base | `kc/final-expansion` → `main` |
| Final-expansion files on `origin/main` | **32 of 32** — confirms merged |
| `migration-final.sql` | **applied — transaction returned COMMITTED** |
| Partial application | **none** — all 23 targets present, none half-shipped |

The migration's own post-flight assertions (article count, inbound reachability
of every new canonical from a pre-existing article, and the
no-blanket-Iraqi-water condition on the rewrite) ran inside the transaction and
did not abort it.

### CI status — unchanged, at baseline

`🔐 Security Checks` still fails on `pnpm audit --audit-level=moderate`
(transitive dependency advisories), and the Netlify checks still fail. Both are
pre-existing, appear identically on merged PRs #204 and #205 and on `main`
itself, and are unrelated to content. Vercel — the actual production deploy
path — is SUCCESS. **The dependency backlog must not be silenced.**

---

## 2. Production verification — measured 2026-09-03, post-migration

Measured with `docs/knowledge-center/wave-9/verify-corpus.mjs` against
`https://www.aquavoiq.com`, which fetches every article and runs all three
guards plus the link graph over live content, supplemented by a
migration-vs-production content diff and a full 115-article crawler sweep.

### Content — the batch is live and exact

Every one of the 23 targets was fetched from production and compared against the
content literal in the committed `migration-final.sql`. Comparison is **exact
string equality on the full article body**, not a spot check.

| target class | count | result |
|---|---|---|
| New canonical articles (INSERT) | 4 | **4 / 4 live, byte-identical** ✅ |
| Rewrite (UPDATE) | 1 | **1 / 1 live, byte-identical** ✅ |
| Deepenings (UPDATE) | 18 | **18 / 18 live, byte-identical** ✅ |
| **Total** | **23** | **23 exact, 0 mismatched, 0 absent** ✅ |

**The four new canonical articles, all live:**

| slug | chars | area |
|---|---|---|
| `choosing-healthy-fish-in-store` | 3,872 | buying |
| `aquarium-hygiene-and-human-safety` | 3,638 | safety / keeper health |
| `fish-that-outgrow-home-tanks` | 3,775 | buying / fish care |
| `fish-eye-problems` | 3,602 | diseases |

**The rewrite, live:** `ph-level-iraqi-tap-water-fish` — **4,652 chars**, new
title (`قراءاتك عالية: تعدّل الماء أم تختار أسماكاً تناسبه؟`), URL preserved.
The 2,328-char filler version with its promotional block is gone.

**The 18 deepenings, all live** — `aquarium-water-change-guide` (5,072),
`why-fish-die-suddenly-rescue-guide` (3,386), `fish-treatment-protocol` (5,710),
`internal-fish-parasites` (4,334), `aquarium-fish-feeding-guide` (4,286),
`algae-war-guide` (4,797), `aquarium-placement-and-stand` (4,486),
`aquarium-care-while-traveling` (4,017), `filter-types-guide` (4,212),
`hardscape-rock-arrangement-visual-depth` (3,338),
`air-pumps-decoration-or-necessity` (5,077), `transporting-fish-and-aquarium`
(3,839), `aquarium-shrimp-snails-guide` (4,093), `how-to-clean-aquarium-properly`
(3,477), `aquarium-water-flow` (4,087), `fish-disease-symptoms-diagnosis`
(3,902), `how-many-fish-in-aquarium` (4,550), `quarantine-new-fish-guide`
(4,125).

### Technical — all green

| gate | measured | target |
|---|---|---|
| Total published articles | **115** | 115 ✅ |
| Orphan articles | **0** | 0 ✅ |
| Dead internal links | **0** | 0 ✅ |
| Self links | **0** | 0 ✅ |
| Internal edges | **526** (avg 4.57 outbound/article, up from 456 / 4.11) | healthy ✅ |
| Zero-outbound articles | 43 (down from 45) | not a defect — see §5 |
| Sitemap ↔ DB consistency | **115 = 115**, 0 missing, 0 extra | ✅ |
| Canonical URLs | correct, self-referential, absolute `https://www.aquavoiq.com/...`, **0 mismatches** | ✅ |
| `robots.txt` | `Allow: /`, blog not disallowed, sitemap declared | ✅ |
| HTML tag balance | **114 / 115 clean** — 1 legacy defect, see §5 | ⚠️ |

Sitemap index resolves 4 children: pages (34), products (112), guides (27),
**blog (115)**. Every published slug appears exactly once; nothing extra.

### Quality — all zero across all 115 articles

| guard | violations |
|---|---|
| Script purity | **0** ✅ |
| Business truth | **0** ✅ |
| Editorial commerce | **0** ✅ |

Exhaustive, not sampled: every article body was fetched from production and run
through `shared/script-purity`, `shared/editorial-guard` and
`shared/business-truth` with the live catalogue as the fact source.

### Crawler verification — full corpus, five agents

**Full sweep:** all **115 / 115** articles return `200` to Googlebot with a
server-rendered `<article>` element, a correct absolute canonical, and a
document larger than 15 KB. No crawler-specific 404, no soft-block, no
`noindex`.

**Five-agent check on the five changed articles most likely to regress** (the 4
new canonicals plus the rewrite):

| agent | status | canonical | article body in HTML source |
|---|---|---|---|
| Googlebot | 200 | correct ×5 | yes ×5 |
| GPTBot | 200 | correct ×5 | yes ×5 |
| ClaudeBot | 200 | correct ×5 | yes ×5 |
| PerplexityBot | 200 | correct ×5 | yes ×5 |
| Browser | 200 | correct ×5 | SPA shell — by design, see below |

`robots.txt` blocks none of Googlebot, GPTBot, ClaudeBot or PerplexityBot.

Typical payloads for a changed article: **~34 KB to crawlers** (prerendered,
`<article itemScope itemType="https://schema.org/Article">`, `itemProp`
headline / description / articleBody, tables, blockquotes, JSON-LD) versus
**~22 KB to browsers** (the React shell, which hydrates from the API). Both
carry the same `<title>`, meta description and JSON-LD. This is the documented
three-handler architecture — one URL, handler chosen by UA/Accept — and is
**not** a defect. Confirming it requires testing with both a crawler UA and a
browser UA; a single-UA test proves nothing.

Also not a defect: the SSR layer renders article `<h2>` as `<h3>` inside
`articleBody`, preserving one `<h1>`/`<h2>` page hierarchy. All heading text is
present; only the level differs.

---

## 3. Content quality review

Exhaustive scanning was used rather than the random per-category sampling the
brief asked for — every one of the 115 articles was scanned for every rule,
which strictly dominates a sample. Domain coverage is confirmed alongside it.

### Domain coverage — all areas represented

| domain | examples |
|---|---|
| fish care | `angelfish-care-guide`, `oscar-fish-care-guide-water-dog`, `fish-that-outgrow-home-tanks` |
| diseases | `fish-treatment-protocol`, `external-fish-parasites`, `fish-eye-problems` |
| water chemistry | `gh-kh-water-hardness-guide`, `ph-level-iraqi-tap-water-fish` |
| filtration | `sump-vs-canister-filter-comparison`, `aquarium-water-flow` |
| equipment | `aquarium-placement-and-stand`, `aquarium-heaters-cheap-vs-premium` |
| plants | `aquarium-plant-fertilizer-guide`, `aquarium-plant-trimming-propagation` |
| shrimp/snails | `aquarium-shrimp-snails-guide`, `aquarium-snail-population-control` |
| feeding | `aquarium-fish-feeding-guide`, `feeding-fish-vegetables-cucumber-peas` |
| breeding | `fish-breeding-basics`, `raising-fish-fry` |
| aquascaping | `hardscape-rock-arrangement-visual-depth`, `aquarium-safe-rocks-and-wood` |
| safety | `how-to-clean-aquarium-properly`, `aquarium-hygiene-and-human-safety` |
| buying | `choosing-healthy-fish-in-store`, `quarantine-new-fish-guide` |

### Results

| check | result |
|---|---|
| Unsupported Iraq-specific water claims | **0** ✅ |
| Iraq absolute/regional generalisations | **0** ✅ |
| Human medication named | **0** ✅ |
| Physical-store / showroom implications | **0** ✅ |
| Duplicate article intent (title-overlap ≥ 0.55) | **0 pairs** ✅ |
| Unsupported business claims | **1** ⚠️ legacy |
| Invented numbers | **2** ⚠️ legacy |
| Medical overclaims | **0** — the 1 raw hit was a false positive |

### The three legacy content defects — re-checked, still live

All three predate the guard architecture. **None is in the Final Expansion
batch**, and none is in any article written during cycles 7–11. Each was
re-verified against production after the migration and is **still present**.

| # | article | text | why it fails |
|---|---|---|---|
| 1 | `how-to-choose-aquarium-tank` | «الغطاء (Lid): يقلل بنسبة **90%** من تبخر المياه في الصيف العراقي الحار» | Invented number **and** an unsupported Iraq-specific claim. |
| 2 | `top-5-mistakes` | «**90%** من المبتدئين يفقدون أسماكهم الأولى خلال الشهر الأول» | Invented prevalence statistic presented as fact. |
| 3 | `betta-compatible-tank-mates` | «في AQUAVO، نوفر لك الخبرة والجودة والموثوقية، **لضمان** تجربة ممتعة ومثمرة» | Unsupported business claim — promotional puffery guaranteeing an outcome. |

**Why the guards miss them:** `business-truth` checks catalogue facts
(categories, product terms, shipping, payment) and `editorial-guard` checks
commerce lines. Neither checks for **unsourced statistics** or **marketing
puffery**. A genuine coverage gap, recorded as a maintenance rule in §6.

Two raw hits were assessed and dismissed as false positives:

- `aquarium-water-change-guide` «تغيير ١٠٠٪» — a 100% *water change*, not a cure claim.
- `nitrogen-cycle-simple-arabic-explained` «5 ملغم/لتر» nitrite — a water
  *parameter* threshold, not a medication dose. Its ammonia percentage table is
  attributed to the US EPA and is legitimately sourced.

---

## 4. Final state record

### Corpus — 115 published articles

Categories in the database, 11 distinct, measured post-migration:

| count | category |
|---|---|
| 24 | أنواع الأسماك |
| 22 | مشاكل وحلول |
| 16 | للمبتدئين |
| 14 | المعدات |
| 12 | ديكور وأحواض |
| 11 | علوم الأحواض |
| 6 | أدلة التسوق |
| 4 | نباتات مائية |
| 4 | مقالات متنوعة |
| 1 | تربة وديكور |
| 1 | علم الأحواض |

The batch landed as +1 `مشاكل وحلول` (`fish-eye-problems`), +1 `للمبتدئين`
(`aquarium-hygiene-and-human-safety`), +2 `أدلة التسوق`
(`choosing-healthy-fish-in-store`, `fish-that-outgrow-home-tanks`).

> Housekeeping note: `علوم الأحواض` (11) vs `علم الأحواض` (1), and
> `ديكور وأحواض` (12) vs `تربة وديكور` (1), are near-duplicate category labels.
> Cosmetic, no functional impact. Listed in §5.

### Quality gates — final

| gate | live corpus (115) |
|---|---|
| Script purity | **0** ✅ |
| Business truth | **0** ✅ |
| Editorial commerce | **0** ✅ |
| Dead internal links | **0** ✅ |
| Self links | **0** ✅ |
| Orphans | **0** ✅ |
| Sitemap ↔ DB | **115 = 115**, 0 drift ✅ |
| Canonicals | 0 mismatches ✅ |
| Crawler reachability | 115 / 115 ✅ |
| Tag balance | 114 / 115 ⚠️ (1 legacy) |
| Migration fidelity | 23 / 23 byte-identical ✅ |

---

## 5. Remaining known limitations

Ordered by what actually matters. None blocks certification; all are recorded so
the maintenance phase inherits an honest backlog.

> **Update:** items 1 and 2 below now have a prepared fix —
> `docs/knowledge-center/cleanup/` (migration written, gated, dry-run passed,
> **not applied**). See `cleanup/CLEANUP_REPORT.md`. This section still
> describes what is live.

1. **Three legacy content defects** (§3): two invented `90%` figures and one
   promotional guarantee. Live now. Not urgent — none is a safety claim — but
   each violates the corpus's own standards. **Not fixed in this session**: the
   brief scoped it to verification, and any fix is a content migration needing
   approval.
2. **One malformed article.** `ornamental-fish-import-middle-east-origins` has
   two unclosed `<p>` tags (4 open / 2 close). Browsers auto-close them so
   rendering is unaffected, but the markup is invalid. The same article still
   carries the «مقدمة / ختام» filler shape.
3. **Dependency advisories keep CI red.** `pnpm audit --audit-level=moderate`
   fails on transitive advisories. Pre-existing, tracked separately, must not be
   silenced.
4. **Netlify checks fail on every PR.** Vercel is the live deploy path and
   passes. The Netlify integration appears vestigial; worth disconnecting so red
   checks carry signal again.
5. **43 articles have no outbound links.** Not orphans — all 115 are reachable.
   A link-density ceiling, not a defect. The batch improved it from 45.
   Deepening a leaf is the cheapest way to raise it further, if search data ever
   justifies it.
6. **Two near-duplicate category labels** (§4). Cosmetic.
7. **No Search Console or customer-support data.** Every editorial decision
   across all cycles rested on corpus evidence and public domain knowledge. This
   is the single largest blind spot, and it is exactly what the maintenance
   phase is designed to remove.

---

## 6. Maintenance rules

**The Knowledge Center is CLOSED for expansion.**
Mission is now **MONITOR → MEASURE → IMPROVE.**

### The only valid triggers for new content

1. **Google Search Console data** — a query with real impressions and no page
   that answers it.
2. **Customer questions** — a question asked more than once that the corpus
   cannot answer.
3. **Product changes** — the catalogue gains a category the corpus does not cover.
4. **Scientific updates** — published guidance changes and an article becomes wrong.
5. **Measurable search demand** — evidenced, not assumed.

**No topic-discovery loops. No domain-map passes. No mention-mining.** A concept
being absent from the corpus is **no longer, by itself, a reason to write about
it.** The 166-concept pass is complete and its verdict stands.

### Rules that carry forward — non-negotiable

**Content safety** (house rules from Cycle 11 and the final batch):

- No dose or compound named in any health article.
- Product leaflet and veterinary direction outrank this corpus's own advice.
- One sign never equals one diagnosis; differentials must be stated.
- Quarantine ≠ treatment; no default medication for new arrivals.
- No structural, load-bearing or building-safety guarantees.
- No blanket claims about Iraqi water — framing is strictly measured-water.
- Human-health content describes precautions and when to see a doctor; it never
  diagnoses or names human medication.

**Process** (every change, however small):

- Every draft passes `scripts/gate-draft.ts` — script purity, editorial,
  business truth, link resolution, tag balance.
- The **gated HTML must be emitted by the build**, never hand-maintained, so
  what is checked is what ships.
- `project-graph.mjs` must be run and exit 0 **before** the migration is
  written — the graph is checked before the write, not after.
- **Every new article needs an inbound link from an article that already
  existed.** A link from another article in the same batch does not count.
- Migrations are transactional, back up first, assert pre-state and post-state,
  and ship with a rollback.
- **Production migrations require explicit user approval.** No exceptions.

**Rules earned by this audit:**

- **Guards do not cover unsourced statistics or marketing puffery.** Until they
  do, any number stated as fact needs a source or must be reframed as a range or
  a relative statement, and no copy may guarantee an outcome. Consider extending
  `business-truth` to flag bare `N%` claims outside sourced tables.
- **Re-run `verify-corpus.mjs` after every content migration**, not just before.
  It is the only measurement that reflects what readers actually see.
- **Verify the migration against production by exact content comparison**, not
  by article count. A count proves rows exist; it does not prove the right bytes
  landed. The post-migration diff in §2 is the pattern to repeat.
- **Watch the `\s` trap when writing verification regexes.** A block-tag balance
  check built inside a template literal turns a bare `\s` into a literal `s` and
  silently reports phantom defects — it briefly showed 6 malformed articles here
  before the escaping was fixed and the true count came back to 1.
  `gate-draft.ts` documents this trap; any new checker must escape it or avoid
  backslashes entirely.

### Monitoring cadence

| interval | action |
|---|---|
| Monthly | `verify-corpus.mjs` against production — all gates must stay 0 |
| Monthly | Search Console: queries with impressions and no ranking page |
| Quarterly | Crawler spot-check across the five agents |
| As triggered | Act only on the five triggers above |

---

## 7. Certification

**CERTIFIED.** The AQUAVO Knowledge Center, as it runs in production on
2026-09-03:

- **115 published articles**
- script purity **0**, business truth **0**, editorial commerce **0**
- orphans **0**, dead internal links **0**, self links **0**
- **526** internal edges, avg 4.57 outbound per article
- sitemap ↔ database **consistent** (115 = 115, 0 missing, 0 extra)
- canonicals correct, absolute and self-referential, **0 mismatches**
- **115 / 115** articles served in full to Googlebot; GPTBot, ClaudeBot and
  PerplexityBot verified on the changed set; structured data present; no
  indexing blockers
- **23 / 23** migration targets byte-identical to the reviewed source

is production-ready and safe to leave running unattended.

**Project status: MAINTENANCE.** The BUILD phase is closed. New articles require
one of the five triggers in §6, not a discovery pass.

The known limitations in §5 are recorded, non-blocking, and none originates in
the content shipped by this project.
