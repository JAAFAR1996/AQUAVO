# Discovery Cycle 11 — dossier

Corpus at start: **106 published**, orphans **0**, all guards **0**.
Cycle 11 adds **5 NEW** and **3 DEEPEN** → 111 published.

---

## 1. Where the corpus stood

Cycles 9 and 10 are applied and certified in production. Measured, not projected:

| metric | after Cycle 9 | after Cycle 10 |
|---|---|---|
| articles | 103 | 106 |
| orphans | 1 | **0** |
| zero-outbound | 47 | 45 |
| edges | 349 | 392 |
| script / editorial / business truth | 0 | 0 |
| dead / self links | 0 / 0 | 0 / 0 |

Cycle 10 needed a follow-up (`migration-links10.sql`) because its article
migration asserted an inbound link for the article it *renamed* but not for the
three it *inserted*, leaving `dwarf-cichlids-guide` as an orphan. Cycle 11
carries that assertion **inside** the article migration, and adds a pre-apply
graph projection (`project-graph.mjs`) so the check runs before the write, not
after.

---

## 2. Discovery

Fresh scientific-domain sweep over all 106 live articles, beyond the carried
queue. Two Arabic substring traps were caught and discarded during scanning, in
addition to the two found in Cycle 10:

- `قط` matches inside `انقطاع` (power outage) — inflated "catfish" to 84
  articles; the true count is 1.
- `رام` matches inside unrelated words, `بيض` matches `أبيض` (white).

Confirmed **zero coverage**, high consequence:

| gap | evidence | consequence |
|---|---|---|
| velvet, flukes, anchor worm, fish lice | all 0 matches | corpus owns ich, fin rot, fungus/columnaris, dropsy — and nothing else; these are routinely misread as ich |
| internal worms | 0 matches | wasting is attributed to "bad luck" |
| how to medicate, hospital tank | 0 matches | four existing articles say "don't medicate blindly" and none says how |
| flow / current | 26 articles mention it, **0 own it** | largest unowned parameter remaining |
| tank weight / stand / placement | 0 matches | the only gap whose failure mode is property damage, not fish loss |

---

## 3. Intent and cannibalisation review

Done **before** drafting, because the naive answer here is one page per pathogen.

**Does velvet deserve standalone? No — GROUP.**
The reader's actual question is *"something is on my fish — which is it?"*, not
*"tell me about Piscinoodinium"*. Four separate pathogen pages would compete
with each other and with `common-fish-diseases-white-spot` for the same query.
The corpus already uses the differentiation pattern successfully
(`fish-fungus-vs-columnaris`), so the same shape applies here.

**External parasites: one hub.** `external-fish-parasites` covers velvet,
gill/skin flukes, anchor worm and fish lice, and explicitly **defers white spots
to the ich article** rather than restating them. That keeps the hub from
cannibalising a page that already ranks for the most common case.

**Do internal worms deserve standalone? Yes — NEW.**
Genuinely different intent and different signals: nothing visible on the body;
the reader is looking at a thin fish and odd faeces, not at spots. Sitting it
inside the external hub would bury it under a question its reader is not asking.

**Hospital tank + how to medicate: one canonical, not two.**
You medicate *in* a hospital tank. Split, each page would spend half its length
restating the other. One page owns the whole "I need to treat a fish" intent.

**Kept from the previous reclassification, re-verified against the corpus:**

| topic | decision | evidence |
|---|---|---|
| photoperiod | **ALREADY COVERED** | `aquarium-planted-led-lighting-guide` has a dedicated `المدة قبل الشدة` section, an hours table and the 6–8h guidance. A page would directly cannibalise it. |
| shrimp husbandry | **owner exists** | `aquarium-shrimp-snails-guide` covers copper, water, filter intake, food, hiding and tankmates across six sections. No page needed. |
| stocking order | **DEEPEN** | belongs to `first-aquarium-setup-guide`, which owns the ordering intent. |
| water-test frequency | **DEEPEN** | belongs to `aquarium-test-kit-guide`, which owns reading the numbers. |
| auto-feeder | **DEEPEN, deferred** | `aquarium-care-while-traveling` owns it; low value, queued for Cycle 12. |

---

## 4. What ships

**5 NEW**

| slug | intent it owns |
|---|---|
| `external-fish-parasites` | which external parasite is this, and it is not automatically ich |
| `internal-fish-parasites` | my fish eats and still wastes away |
| `fish-treatment-protocol` | I need to treat a fish — how, without making it worse |
| `aquarium-water-flow` | current as a parameter in its own right |
| `aquarium-placement-and-stand` | where the tank goes and what holds it |

**3 DEEPEN**

| slug | section added |
|---|---|
| `first-aquarium-setup-guide` | stocking order after cycling — batches, hardiest first, aggressive last |
| `aquarium-test-kit-guide` | how often to actually test, by tank state rather than by calendar |
| `air-pumps-decoration-or-necessity` | flow as the wider parameter — also supplies the inbound link `aquarium-water-flow` would otherwise lack |

The dossier and the migration both say **three** deepenings. An earlier revision
of this file said two while the migration had three; that mismatch is exactly
what made the Cycle 8 report disagree with its own table, so it was corrected
before this PR opened.

---

## 5. Scientific safety review

Run against the drafts before the migration was finalised. **Four real defects
were found in my own drafts and fixed** — recorded here rather than quietly
patched.

### External parasite hub

| requirement | status |
|---|---|
| one visible sign must not equal one parasite | **was a defect — fixed.** The table is now explicitly labelled *ترجيح لا تشخيص*, with a block stating that flashing alone is caused by poor water with no parasite present, breathing difficulty by ammonia or low oxygen, and that two infections can coexist or a secondary bacterial infection can sit on top of a parasite. |
| distinguish ich from velvet / flukes / anchor worm / lice | met — comparison table plus a dedicated velvet section; white spots deferred to the ich article. |
| no universal medication dose | met — no dose or compound named anywhere. |
| account for shrimp / snails | met. |
| account for **scaleless fish** | **was missing — fixed.** Loaches, corydoras and small catfish now named, with the point that their presence changes the product and dose choice rather than merely ruling treatment out. |

### Internal parasites

| requirement | status |
|---|---|
| white/stringy faeces alone is NOT diagnostic | met — a full section says so, and states the key signal is the *combination* of normal eating + falling weight + abnormal faeces over weeks, not days. |
| non-parasitic differentials | met — a fish that has not eaten, poor or newly changed food, deteriorating water. |
| no automatic dewormer from one symptom | met — no dose, no compound, and the article states the treatment window narrows as the fish stops eating rather than urging immediate medication. |

### Medication / hospital tank

| requirement | status |
|---|---|
| no invented dosing | met — no dose or compound named. |
| product/veterinary directions outrank generic advice | **strengthened.** Now stated in the opening block, not only at the end, and says explicitly that this includes the advice in the article itself. |
| distinguish quarantine from treatment use | **was a defect — fixed.** The draft had said the hospital tank *is* the quarantine tank ("نفس التجهيز يخدم الغرضين"), which conflates them. Now: same equipment, different purpose — quarantine is *observation* of a healthy-looking new fish with no default medication; treatment is *intervention* on a fish showing a condition. It adds that medicating every new arrival is not quarantine, it is exposure without cause. |
| do not imply carbon must always be removed | **was a defect — fixed.** The draft stated removal as a flat rule. Now: many product leaflets ask for removal and that is why it matters, but it is *not* a universal rule — read the leaflet and do not assume. |
| warn against mixing without supported compatibility | **strengthened.** Now: do not combine two products unless one leaflet states compatibility explicitly, and the absence of a warning is not permission. |

### Tank stand / weight

| requirement | status |
|---|---|
| simple mass estimates are fine | met — roughly 1 kg per litre, plus glass and substrate. |
| **no building/floor load-bearing guarantees** | **was missing — fixed.** A limits block now says estimating tank mass is simple arithmetic, but whether a *particular location* can carry that load is a structural question depending on the building, that it cannot be answered from an article, and that a floor looking solid is not evidence of safety. |
| structural questions must defer appropriately | met — large tanks, upper floors and wooden floors are directed to a building specialist who inspects the site. |

One markup defect was also caught and fixed: the structural block initially left
an empty `<ol></ol>` pair — balanced, so the tag check passed, but wrong.

---

## 6. Gate results

All eight changed content targets, via `scripts/gate-draft.ts`:

| target | kind | chars | script | editorial | business | dead | unbalanced |
|---|---|---|---|---|---|---|---|
| external-parasites | NEW | 4857 | 0 | 0 | 0 | 0 | 0 |
| internal-parasites | NEW | 3592 | 0 | 0 | 0 | 0 | 0 |
| treatment-protocol | NEW | 4981 | 0 | 0 | 0 | 0 | 0 |
| water-flow | NEW | 3436 | 0 | 0 | 0 | 0 | 0 |
| tank-placement | NEW | 3716 | 0 | 0 | 0 | 0 | 0 |
| first-aquarium-setup-guide | DEEPEN | 3827 → 5115 | 0 | 0 | 0 | 0 | 0 |
| air-pumps-decoration-or-necessity | DEEPEN | 3982 → 4432 | 0 | 0 | 0 | 0 | 0 |
| aquarium-test-kit-guide | DEEPEN | 3689 → 4443 | 0 | 0 | 0 | 0 | 0 |

### Projected post-migration graph

Measured by `project-graph.mjs`, which replays the emitted SQL against the live
corpus rather than re-deriving from the drafts:

```
articles   : 106 -> 111
dead links : 0
self links : 0
orphans    : 0
edges      : 456

external-fish-parasites       <- internal-fish-parasites, fish-treatment-protocol
internal-fish-parasites       <- external-fish-parasites, fish-treatment-protocol
fish-treatment-protocol       <- external-fish-parasites, internal-fish-parasites
aquarium-water-flow           <- air-pumps-decoration-or-necessity
aquarium-placement-and-stand  <- first-aquarium-setup-guide
```

Every new canonical has at least one inbound link from a topically adjacent
article, and no new orphan is created.

---

## 7. Apply

```
node docs/knowledge-center/wave-9/apply-migration.mjs \
     docs/knowledge-center/wave-11/migration-wave11.sql --commit
```

No deploy ordering constraint: this cycle is DB-backed content only, with no
runtime or config change. Rollback is `rollback-wave11.sql`. The migration
snapshots the full table first (`blog_posts_backup_wave11_20260903`) and asserts
the exact current `length(content)` of every row it touches, so it aborts rather
than overwriting if the corpus moved since drafting.

---

## 8. Saturation — not reached

Cycle 11 found five genuinely unowned canonical topics, three of them safety
critical. That is not the profile of a saturated corpus.

Queued for Cycle 12:

1. **Catfish beyond pleco and corydoras** — 1 mention corpus-wide. The
   iridescent shark / pangasius mis-sale (sold small, reaches a metre) is the
   angle worth checking against `how-many-fish-in-aquarium`.
2. **Fish lifespan and commitment** — 0 coverage; likely GROUP rather than a page.
3. **Hardness and pH adjustment** — 1 mention; the corpus explains the numbers
   but not whether to change them, and the honest answer is usually "don't".
4. **Auto-feeder** — DEEPEN on `aquarium-care-while-traveling`.
5. **The 45 zero-outbound articles** — inbound is solved corpus-wide; outbound is
   not. Contextual links only, never padding.
6. **Aquascaping composition rules** — 2 mentions, no owner; assess against
   `hardscape-rock-arrangement-visual-depth` and `iwagumi` for cannibalisation.

Still RESEARCH BLOCKED, still not blocking production: Search Console and
customer-support data.
