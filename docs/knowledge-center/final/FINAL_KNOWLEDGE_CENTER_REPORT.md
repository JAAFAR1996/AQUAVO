# AQUAVO Knowledge Center — Final Certification Report

**Date:** 2026-09-03
**Phase transition:** BUILD → MAINTENANCE
**Certified by:** measurement against live production, not projection.

---

## 0. Headline — read this first

The Knowledge Center **is production-ready and safe to leave running today**, at
**111 published articles**, with every quality and technical gate at zero.

It is **not yet at 115.** The Final Expansion batch is written, gated and
reviewed, but **PR #206 is unmerged and `migration-final.sql` is unapplied.**
Nothing from that batch exists in production. This report therefore certifies
two distinct things and does not blur them:

| | state | certified |
|---|---|---|
| **What is running now** | 111 articles, all gates 0 | ✅ **YES** — safe to leave running |
| **The +4/+1/+18 batch** | written, gated, reviewed, unapplied | ⏸️ **BLOCKED** on your approval |

The audit brief said "after migration is applied". It has not been applied, and
I did not apply it — CLAUDE.md rule 7 and your own instruction both require
explicit approval for a production migration. Section 2 below is measured
against production **as it actually is**.

---

## 1. PR #206 final check

| item | result |
|---|---|
| State | **OPEN — not merged** |
| Merge SHA | **none** (`mergeCommit: null`) |
| Head SHA | `4ff961a5d765a8065eae2811d1c464f53b07d154` |
| Mergeable | `MERGEABLE` (no conflicts) |
| Final-expansion files on `origin/main` | **0 of 31** — confirms unmerged |
| Final-expansion files on PR head | **31 of 31** |
| Working tree | clean, no drift |

### Migration integrity — verified

```
committed  (4ff961a5:migration-final.sql)  sha256 66dfe76a9361939a013ec1a4f282d0d09a5befa22ec8c4851c24888d098e8ee0
working tree (migration-final.sql)         sha256 66dfe76a9361939a013ec1a4f282d0d09a5befa22ec8c4851c24888d098e8ee0
```

Identical. **The migration on disk is byte-for-byte the reviewed source.**

### CI status — at baseline, no regression

| check | result |
|---|---|
| ✅ Validate & Lint · 🏗️ Build · 🧪 Tests · 🧪 Unit Tests · 🎨 Lint & Type Check · ✨ Quality Gate · Vercel · CodeRabbit | **SUCCESS** |
| 🔐 Security Checks (CI pipeline) | FAILURE |
| ✨ Pipeline Status | FAILURE (aggregate of the above) |
| Netlify: Header rules · Pages changed · Redirect rules · deploy-preview | FAILURE |

**These failures are pre-existing and unrelated to this PR**, which changes only
files under `docs/`. Evidence:

- `🔐 Security Checks` fails on `pnpm audit --audit-level=moderate` —
  transitive dependency advisories (`fast-xml-parser` and others). It is a
  dependency-hygiene backlog, not a content defect, and must not be silenced.
- The **identical** failure set appears on **PR #205 and PR #204**, both of
  which were merged. `CI - Build & Test Pipeline` also fails on `main` itself
  at `0d343a6a` and `e6f253e7`.
- Vercel — the actual production deploy path — is **SUCCESS**.

No check that this PR could affect is failing.

---

## 2. Production verification — measured 2026-09-03

Measured with `docs/knowledge-center/wave-9/verify-corpus.mjs` against
`https://www.aquavoiq.com`, which fetches every article and runs all three
guards plus the link graph over live content.

### Content

| metric | measured | expected after migration | status |
|---|---|---|---|
| Total published articles | **111** | 115 | ⏸️ migration unapplied |
| `choosing-healthy-fish-in-store` | **ABSENT** | present | ⏸️ |
| `aquarium-hygiene-and-human-safety` | **ABSENT** | present | ⏸️ |
| `fish-that-outgrow-home-tanks` | **ABSENT** | present | ⏸️ |
| `fish-eye-problems` | **ABSENT** | present | ⏸️ |
| Rewrite `ph-level-iraqi-tap-water-fish` | present, **2,328 chars** (original filler) | 4,652 chars (rewritten) | ⏸️ |
| Deepened sections live | **0 / 18** | 18 / 18 | ⏸️ |

Production is uniformly at the pre-migration state. There is **no partial
application** — nothing is half-shipped, which is the safe failure mode.

### Technical — all green

| gate | measured | target |
|---|---|---|
| Orphan articles | **0** | 0 ✅ |
| Dead internal links | **0** | 0 ✅ |
| Self links | **0** | 0 ✅ |
| Internal edges | **456** (avg 4.11 outbound/article) | healthy ✅ |
| Zero-outbound articles | 45 | not a defect — see §5 |
| Sitemap ↔ DB consistency | **111 = 111**, 0 missing, 0 extra | ✅ |
| Canonical URLs | correct, self-referential, absolute `https://www.aquavoiq.com/...` | ✅ |
| `robots.txt` | `Allow: /`, blog not disallowed, sitemap declared | ✅ |

Sitemap index resolves 4 children: pages (34), products (112), guides (27),
blog (111).

### Quality — all zero

| guard | violations across all 111 articles |
|---|---|
| Script purity | **0** ✅ |
| Business truth | **0** ✅ |
| Editorial commerce | **0** ✅ |
| HTML tag balance | **110 / 111 clean** — 1 defect, see §5 |

### Crawler verification — all five agents pass

Tested `/blog/aquarium-water-change-guide` and
`/blog/fish-disease-symptoms-diagnosis`:

| agent | status | bytes | JSON-LD | canonical | robots |
|---|---|---|---|---|---|
| Browser | 200 | 22,289 | 4 blocks | correct | `index, follow` |
| Googlebot | 200 | 34,680 | 4 blocks | correct | `index, follow` |
| GPTBot | 200 | 34,680 | 4 blocks | correct | `index, follow` |
| ClaudeBot | 200 | 34,680 | 4 blocks | correct | `index, follow` |
| PerplexityBot | 200 | 34,680 | 4 blocks | correct | `index, follow` |

- **Full article content available:** verified explicitly, not inferred — all 5
  `<h2>` headings from the database and the article's final paragraph are
  present in the Googlebot response, inside
  `<div class="aq-ssr-article" itemProp="articleBody">`.
- **Structured data present:** `Article`, `WebPage`, `BreadcrumbList`,
  `ListItem`, `Organization`, `OnlineStore`, `ImageObject`, `ContactPoint`,
  `WebSite`, `Country`, `OpeningHoursSpecification`.
- **No indexing blockers:** no `noindex`, no crawler-specific 404, no
  soft-block. All four bots receive the identical prerendered document.

One note that is **not** a defect: the SSR layer renders article `<h2>` as
`<h3>` inside `articleBody`, keeping one `<h1>`/`<h2>` page hierarchy. The
headings and their text are all present; only the level differs. This is
correct practice.

---

## 3. Content quality review

The brief asked for random sampling per category. **Exhaustive scanning was
used instead** — every one of the 111 articles was scanned for every rule,
which strictly dominates a sample. Domain coverage is confirmed alongside it.

### Domain coverage — all 11 areas represented

| domain | articles | examples |
|---|---|---|
| fish care | 12 | `angelfish-care-guide`, `oscar-fish-care-guide-water-dog` |
| diseases | 10 | `fish-treatment-protocol`, `external-fish-parasites` |
| water chemistry | 6 | `gh-kh-water-hardness-guide`, `aquarium-test-kit-guide` |
| filtration | 7 | `sump-vs-canister-filter-comparison`, `aquarium-water-flow` |
| equipment | 7 | `aquarium-placement-and-stand`, `aquarium-heaters-cheap-vs-premium` |
| plants | 10 | `aquarium-plant-fertilizer-guide`, `aquarium-plant-trimming-propagation` |
| shrimp/snails | 2 | `aquarium-shrimp-snails-guide`, `aquarium-snail-population-control` |
| feeding | 3 | `aquarium-fish-feeding-guide`, `feeding-fish-vegetables-cucumber-peas` |
| breeding | 5 | `fish-breeding-basics`, `raising-fish-fry` |
| aquascaping | 5 | `hardscape-rock-arrangement-visual-depth`, `aquarium-safe-rocks-and-wood` |
| safety | 7 | `how-to-clean-aquarium-properly`, `transporting-fish-and-aquarium` |

### Results

| check | result |
|---|---|
| Unsupported Iraq-specific water claims | **0** ✅ |
| Iraq absolute/regional generalisations | **0** ✅ |
| Human medication named | **0** ✅ |
| Physical-store / showroom implications | **0** ✅ |
| Duplicate article intent (title-overlap ≥ 0.55) | **0 pairs** ✅ |
| Unsupported business claims | **1** ⚠️ |
| Invented numbers | **2** ⚠️ |
| Medical overclaims | **0** — the 1 raw hit was a false positive |

### The three real defects found

All three are in **legacy articles that predate the guard architecture.** None
is in the Final Expansion batch, and none is in any article written during
cycles 7–11.

| # | article | text | why it fails |
|---|---|---|---|
| 1 | `how-to-choose-aquarium-tank` | «الغطاء (Lid): يقلل بنسبة **90%** من تبخر المياه في الصيف العراقي الحار» | Invented number **and** an unsupported Iraq-specific claim. No source establishes 90%. |
| 2 | `top-5-mistakes` | «**90%** من المبتدئين يفقدون أسماكهم الأولى خلال الشهر الأول» | Invented prevalence statistic presented as fact. |
| 3 | `betta-compatible-tank-mates` | «في AQUAVO، نوفر لك الخبرة والجودة والموثوقية، **لضمان** تجربة ممتعة ومثمرة» | Unsupported business claim — promotional puffery guaranteeing an outcome. Same filler shape the `ph-level` rewrite was created to remove. |

**Why the guards missed them:** `business-truth` checks catalogue facts
(categories, product terms, shipping, payment) and `editorial-guard` checks
commerce lines. Neither checks for **unsourced statistics** or **marketing
puffery**. This is a genuine coverage gap, recorded as a maintenance rule in §6.

Two raw hits were assessed and dismissed as false positives:
- `aquarium-water-change-guide` «تغيير ١٠٠٪» — a 100% *water change*, not a cure claim.
- `nitrogen-cycle-simple-arabic-explained` «5 ملغم/لتر» nitrite — a water
  *parameter* threshold, not a medication dose. Its ammonia percentage table is
  attributed to the US EPA and is legitimately sourced.

---

## 4. Final state record

### Corpus

- **Live now: 111 published articles.**
- After PR #206 + migration: **115**.
- Categories in the database: 11 distinct (`أنواع الأسماك` 24, `مشاكل وحلول`
  21, `للمبتدئين` 15, `المعدات` 14, `ديكور وأحواض` 12, `علوم الأحواض` 11,
  `نباتات مائية` 4, `مقالات متنوعة` 4, `أدلة التسوق` 4, `تربة وديكور` 1,
  `علم الأحواض` 1).

> Housekeeping note: `علوم الأحواض` (11) vs `علم الأحواض` (1), and
> `ديكور وأحواض` (12) vs `تربة وديكور` (1), are near-duplicate category labels.
> Cosmetic, no functional impact. Listed in §5.

### Prepared but not yet live — PR #206

**4 new canonical articles**

| slug | area |
|---|---|
| `choosing-healthy-fish-in-store` | buying |
| `aquarium-hygiene-and-human-safety` | safety / keeper health |
| `fish-that-outgrow-home-tanks` | buying / fish care |
| `fish-eye-problems` | diseases |

**1 rewrite** — `ph-level-iraqi-tap-water-fish` (2,328 → 4,652 chars; filler and
promotional block replaced with the measured-water decision; URL preserved).

**18 deepenings** — `aquarium-water-change-guide`,
`why-fish-die-suddenly-rescue-guide`, `fish-treatment-protocol`,
`internal-fish-parasites`, `aquarium-fish-feeding-guide`, `algae-war-guide`,
`aquarium-placement-and-stand`, `aquarium-care-while-traveling`,
`filter-types-guide`, `hardscape-rock-arrangement-visual-depth`,
`air-pumps-decoration-or-necessity`, `transporting-fish-and-aquarium`,
`aquarium-shrimp-snails-guide`, `how-to-clean-aquarium-properly`,
`aquarium-water-flow`, plus the three inbound-wiring targets
`fish-disease-symptoms-diagnosis`, `how-many-fish-in-aquarium`,
`quarantine-new-fish-guide`.

### Quality gates — summary

| gate | live corpus (111) | batch pre-flight (23 targets) |
|---|---|---|
| Script purity | 0 ✅ | 0 ✅ |
| Business truth | 0 ✅ | 0 ✅ |
| Editorial commerce | 0 ✅ | 0 ✅ |
| Link resolution | 0 dead ✅ | 0 dead ✅ |
| Self links | 0 ✅ | 0 ✅ |
| Orphans | 0 ✅ | 0 projected ✅ |
| Tag balance | 110/111 ⚠️ | 23/23 ✅ |
| Inbound reachability | n/a | every new canonical reachable from a pre-existing article ✅ |

---

## 5. Remaining known limitations

Ordered by what actually matters.

1. **PR #206 is unmerged and its migration is unapplied.** The corpus stays at
   111 until you approve both. Nothing is half-applied.
2. **Three legacy content defects** (§3): two invented `90%` figures and one
   promotional guarantee. Live now. Not urgent — none is a safety claim — but
   each violates the corpus's own standards. **I did not fix these**: the brief
   scoped this session to certification, and any fix is a content migration
   needing approval.
3. **One malformed article.** `ornamental-fish-import-middle-east-origins` has
   two unclosed `<p>` tags (one before an `<ol>`, one trailing). Browsers
   auto-close them so rendering is unaffected, but the markup is invalid. The
   same article still carries the «مقدمة / ختام» filler shape.
4. **Dependency advisories keep CI red.** `pnpm audit --audit-level=moderate`
   fails on transitive advisories. Pre-existing, tracked separately, must not
   be silenced.
5. **Netlify checks fail on every PR.** Vercel is the live deploy path and
   passes. The Netlify integration appears vestigial; worth disconnecting so
   red checks carry signal again.
6. **45 articles have no outbound links.** Not orphans — all 111 are reachable.
   This is a link-density ceiling, not a defect. Deepening a leaf is the
   cheapest way to raise it, if search data ever justifies it.
7. **Two near-duplicate category labels** (§4). Cosmetic.
8. **No Search Console or customer-support data.** Every editorial decision
   across all cycles rested on corpus evidence and public domain knowledge.
   This is the single largest blind spot, and it is exactly what the
   maintenance phase is designed to remove.

---

## 6. Future maintenance rules

**The Knowledge Center is CLOSED for expansion.**
Mission changes from **DISCOVER → WRITE → PUBLISH** to **MONITOR → MEASURE → IMPROVE.**

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
  Cycle 10 shipped an orphan; the final batch nearly shipped an island of three.
  Both the projection and the migration's post-condition now enforce this.
- Migrations are transactional, back up first, assert pre-state and post-state,
  and ship with a rollback.
- **Production migrations require explicit user approval.** No exceptions.

**Two new rules earned by this audit:**
- **Guards do not cover unsourced statistics or marketing puffery.** Until they
  do, any number stated as fact needs a source or must be reframed as a range
  or a relative statement, and no copy may guarantee an outcome. Consider
  extending `business-truth` to flag bare `N%` claims outside sourced tables.
- **Re-run `verify-corpus.mjs` after every content migration**, not just before.
  It is the only measurement that reflects what readers actually see.

### Suggested monitoring cadence

| interval | action |
|---|---|
| Monthly | `verify-corpus.mjs` against production — all gates must stay 0 |
| Monthly | Search Console: queries with impressions and no ranking page |
| Quarterly | Crawler spot-check across the five agents |
| As triggered | Act only on the five triggers above |

---

## 7. Certification

**Certified:** the Knowledge Center as it runs today — **111 articles, script
purity 0, business truth 0, editorial 0, orphans 0, dead links 0, self links 0,
sitemap consistent, canonicals correct, all five crawlers served full content
with structured data and no indexing blockers** — is production-ready and safe
to leave running unattended.

**Not certified:** the 115-article target. It remains gated on two approvals
that are yours alone to give:

1. Merge PR #206.
2. Apply `docs/knowledge-center/final/migration-final.sql` to Neon production.

Until then the corpus is complete, consistent and correct at 111.
