# Discovery Cycle 9 — dossier

Corpus at start: **100 published**. Cycle 9 adds 3, rewrites 3, and repairs the
internal link graph across 19 more.

---

## 1. Cycle 8 count — resolved: it was **6**, not 5

The Cycle 8 report said six and its table showed five. The report was right.

Verified two ways:

- `docs/knowledge-center/wave-8/migration-wave8.sql` contains exactly six
  `INSERT`s: `fish-bloating-swim-bladder-dropsy`, `aquarium-fish-aggression`,
  `aquarium-snail-population-control`, `nitrite-spike-aquarium`,
  `transporting-fish-and-aquarium`, `aquarium-plant-trimming-propagation`.
- All six resolve on the live corpus (`/api/blog/posts`), and the live count is
  exactly 100.

**Why the table said five.** `build-wave8.mjs` was copied from Wave 2 and its
prose was never updated: the file header, the migration header comment and the
rollback comment all still say *"Wave 2"*, *"four Topic Registry gaps"* and
*"the four new articles"*. The generated table inherited a stale hand-written
count. The article data itself was always correct — this is a documentation
defect, not a publishing one.

**Also found:** `kc/wave-8` was never merged. `origin/main`'s tip is PR #200,
which is **Cycle 7**. Cycle 8's six articles are live in Neon but its drafts and
migrations exist only on the unmerged `kc/wave-8` branch. Cycle 9 branches from
`kc/wave-8` to keep the content lineage intact; both need merging together.

---

## 2. Targeted scientific review — dropsy / buoyancy

Reviewed the live text of `fish-bloating-swim-bladder-dropsy` against the three
points raised. Two held up, one did not.

### 2a. Buoyancy treated as an automatic swim-bladder diagnosis — **CONFIRMED, corrected**

The published article stated, in a pull quote:

> جسم أملس مع مشكلة طفو = كيس سباحة

That is an automatic diagnosis from a single sign. The table reinforced it by
making "اضطراب كيس السباحة" the only alternative to dropsy.

Corrected:

- The table column is reframed from *"اضطراب كيس السباحة"* to *"مشكلة طفو أو
  اتزان"*, and its nature row now reads *"عرَض له أسباب متعددة — لا تشخيص بحد ذاته"*.
- The pull quote now concludes only what the sign supports: a smooth body means
  the case **is not dropsy**, not that the cause is known.
- A differential list was added: gut fill / swallowed air, water quality,
  internal infection, pressure from an enlarged organ or mass, congenital
  deformity or injury, and an early systemic condition that may later pinecone.
- Water testing moved **ahead of** fasting in the ordered steps.

### 2b. Pineconing as a strong sign of systemic fluid accumulation — **already correct, tightened**

The published article was right here: it described dropsy as a *symptom*, not a
disease, framed it as fluid accumulation in the tissues, and stated the poor
prognosis plainly. Retained. Wording tightened to name it explicitly as systemic
fluid accumulation in the tissues and body cavity, with underlying causes
(internal bacterial infection, organ failure) kept as causes rather than
conflated with the sign. A line was added stating that pineconing is a strong
indicator the condition is systemic rather than local or digestive.

### 2c. The two-day fast — **claim not supportable as written, de-generalised**

The published text said:

> صيام يومين إلى ثلاثة. السمكة البالغة السليمة تتحمله بسهولة، **وكثيراً ما يحل المشكلة وحده.**

Two problems:

1. **The efficacy claim.** "Often solves it on its own" is a hobby claim with no
   evidence base we can cite. Fasting is widely *recommended*; no source
   establishes a resolution rate. Rewritten as a common mitigating step that
   *may* help **if** the cause is digestive, explicitly not a guaranteed
   treatment.
2. **The generalisation.** The original scoped to "healthy adult", which was a
   reasonable hedge, but never named the exceptions. Now stated explicitly:
   not for fry and juveniles (continuous demand, minimal reserves), not for
   small fast-metabolism species, and not for a fish already off its food —
   because if it is not eating, the problem is not gut fill and fasting adds
   nothing.

No antibiotic dose is published, consistent with the corpus's existing position.

---

## 3. Species coverage — decisions

**Evidence first.** All six requested species were scanned across the full text
of all 100 live articles, using Arabic spelling variants (the corpus writes
*رازبورا* with ز, not *راسبورا* — a first-pass regex missed it):

| species | articles mentioning | nature of coverage |
|---|---|---|
| cardinal tetra | 2 | bare name in a tank-mate list |
| rasbora | 2 | bare name in a table row |
| barb | 1 | one clause warning about fin-nipping |
| otocinclus | 2 | one bullet, one clause |
| loach | 1 | one clause in a contested-evidence box |
| swordtail | 2 | one list entry, one compatibility line |

No care or selection content exists for any of them. But that does not make six
articles the answer.

| species | decision | reasoning |
|---|---|---|
| cardinal tetra | **GROUP** | A standalone care page competes directly with `neon-tetra-color-care-guide`. The genuinely unowned intent is *which* small schooling fish to buy, and the neon-vs-cardinal distinction belongs inside it. |
| rasbora | **GROUP** | Same role, same care axes, same queries as the tetras. A separate page would be a thin duplicate competing with the same article. |
| barbs | **NEW** | Owns a distinct, high-consequence failure mode nothing else covers: fin-nipping as a *group-size effect*, so the fix is counter-intuitive (a larger shoal, not a smaller one). Already referenced without ownership by the angelfish article. |
| otocinclus | **DEEPEN** (not standalone) | Already named in two articles, so a new page would cannibalise. But the existing text is actively harmful — see below. Fixed in place. |
| loaches | **NEW** | Two distinct consequences nothing owns: sold at a fraction of adult size with a multi-year commitment, and scaleless, which changes the medication protocol for the entire tank. Ties into the contested-salt article and the new snail article. |
| swordtail | **NOT WORTH STANDALONE** | Mechanically identical to the other livebearers, and already covered adequately in two articles. `molly-platy-breeding-save-fry` is widened to own the family instead. |

### The otocinclus correction

The published `best-aquarium-cleaner-fish-pleco-corydoras` called otocinclus a
*"فريق طوارئ مبدع"* — a brilliant emergency crew. That advice kills them.
Otocinclus graze a fine biofilm that a new tank, or a tank just scrubbed to fix
an algae outbreak, does not have. The people most likely to act on "emergency
crew" are exactly the people whose tank cannot feed them.

Corrected to state that otos go into a **mature** tank, need supplemental
feeding once the algae is gone, ship poorly and arrive stressed, and need a
group. The trailing store line was also removed: it invited readers to browse
fish species at AQUAVO, which sells **no live animals**, and carried an
unverifiable *"المتجر الأكبر"* superlative. Neither the business-truth guard nor
the editorial guard flags either problem — see Open items.

### The livebearer rewrite

`molly-platy-breeding-save-fry` was the weakest article in the corpus: 2,317
characters, an empty "مقدمة", three separate promotional AQUAVO blocks, an
unverifiable 18-governorate delivery claim, and advice as vague as *"provide a
suitable environment"*. Rewritten to own the livebearer family, leading with the
fact that actually changes reader behaviour — a female stores what she needs and
delivers successive broods from a single mating, so the challenge is managing
numbers, not producing fry — plus the sex-ratio rule and swordtail's specifics.

---

## 4. Internal link graph

Measured, not assumed. The reported figure was exact: **52 of 100 articles had
zero inbound links.**

The structural cause was not visible from the orphan count alone: **56 articles
had zero *outbound* links**, and 41 articles were fully isolated in both
directions. The entire graph was being carried by the ~44 newer KC articles
pointing into a handful of hubs. The legacy half was inert.

Repair, in two parts, in one cycle:

1. The three new and three rewritten articles cite orphans wherever genuinely
   relevant. This alone takes 52 → 44.
2. `migration-links9.sql` appends **one contextual closing paragraph** to each of
   19 source articles, covering 43 targets. Not a generic "related articles"
   block: each paragraph is written for its own article's subject and links only
   what genuinely follows from it.

| metric | before | after |
|---|---|---|
| articles | 100 | 103 |
| orphans (0 inbound) | 52 | **1** |
| zero-outbound | 56 | 47 |
| edges | 241 | 349 |
| avg outbound | 2.41 | 3.39 |
| dead links | 0 | 0 |
| self links | 0 | 0 |

**The one remaining orphan** is
`دليل-شامل-لتربة-وديكور-الأحواض-اختيار-الأسطح-المثا-1787451489298`, excluded
deliberately. Its slug is raw Arabic, and the corpus-wide dead-link post-flight
compares the `href` capture against `blog_posts.slug` **without URL decoding**.
A percent-encoded href would be read as a dead link and abort the migration; a
raw-Arabic href would pass SQL but is re-encoded by the browser on navigation.
It needs a slug normalisation plus a redirect first — queued for Cycle 10.

---

## 5. Defect found outside the content plan

`client/src/pages/blog.tsx` mapped only six icon names (`Fish`, `AlertTriangle`,
`Heart`, `Filter`, `Droplets`, `Leaf`) while the corpus uses **23**. The lookup
was `iconMap[post.iconName || 'Fish']`, so the fallback only covered an *empty*
name, not an *unknown* one — every article with an unmapped icon rendered a
blank slot. `Sparkles` alone, already imported but never added to the map,
accounts for **53 of 100 articles**.

Fixed: all 23 names mapped, plus `Waves` for the new loach article, and the
lookup replaced with `iconFor()` which falls back on unknown names. Typecheck
clean.

---

## 6. Saturation status — **not reached**

Cycle 9 found three genuinely unowned canonical topics and two live factual
errors, so the corpus is not saturated. Two consecutive cycles must come back
with no canonical gap before that claim can be made.

Queued for Cycle 10, in priority order:

1. **Slug normalisation** for the Arabic-slug article + redirect, then link it.
2. **Danio** — 5 articles mention it, none owns it; likely GROUP into the new
   selection article rather than standalone. Needs a cannibalisation check.
3. **Rainbowfish, killifish, rams / apistogramma** — not scanned this cycle.
4. **Breeding as a parameter** — egg-layers vs livebearers; the corpus covers
   only livebearer and flowerhorn breeding.
5. **Fry grow-out and culling decisions** — referenced by the new livebearer
   article, owned by nothing.
6. **The 47 remaining zero-outbound legacy articles** — inbound is fixed; the
   outbound half of the graph is still thin.

Still RESEARCH BLOCKED, and still not blocking production: Search Console and
customer-support data.

---

## 7. Gate results

All six drafts, via `scripts/gate-draft.ts`:

| draft | chars | tables | links | script | editorial | business | dead | unbalanced |
|---|---|---|---|---|---|---|---|---|
| schooling-selection | 4218 | 2 | 16 | 0 | 0 | 0 | 0 | 0 |
| barbs | 3681 | 1 | 15 | 0 | 0 | 0 | 0 | 0 |
| loaches | 3633 | 1 | 11 | 0 | 0 | 0 | 0 | 0 |
| bloat-corrected | 4902 | 1 | 10 | 0 | 0 | 0 | 0 | 0 |
| cleaner-corrected | 2816 | 1 | 8 | 0 | 0 | 0 | 0 | 0 |
| livebearers | 3878 | 1 | 13 | 0 | 0 | 0 | 0 | 0 |

---

## 8. Open items for the guards

Three gaps this cycle exposed. None blocks Cycle 9; all are real.

1. **`gate-draft.ts` tag-balance regex is broken for attributed tags.** The
   pattern is built as `` new RegExp(`<${tag}(?:\s[^>]*)?>`) `` inside a
   template literal, so `\s` collapses to a literal `s` before `RegExp` sees it.
   The open-tag count therefore misses every tag that carries attributes. It has
   never fired because all wave drafts use bare tags — but it reports a false
   "unbalanced" on any legacy article, which is how it surfaced here.
2. **The business-truth guard does not catch "browse fish at AQUAVO".** The
   store sells no live animals; the guard checks product terms and categories
   and had nothing to match against.
3. **No guard catches unverifiable superlatives** such as *"المتجر الأكبر"*.

---

## 9. Apply order

```
1. migration-wave9.sql     (3 inserts, 3 rewrites)    rollback-wave9.sql
2. migration-links9.sql    (19 link-only appends)     rollback-links9.sql
```

`migration-links9.sql` **depends on** `migration-wave9.sql`: it links to the
three slugs that migration creates, and its own post-flight would fail without
them.

Rollback is the reverse order: `rollback-links9.sql`, then `rollback-wave9.sql`.
Both migrations snapshot the full table before writing
(`blog_posts_backup_wave9_20260903`, `blog_posts_backup_links9_20260903`).

Both carry preconditions asserting the exact current `length(content)` of every
row they touch, so either aborts rather than overwriting if the corpus changed
since drafting.
