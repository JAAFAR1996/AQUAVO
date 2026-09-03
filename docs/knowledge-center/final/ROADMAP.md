# Final Expansion Phase — complete content roadmap

Replaces the wave-by-wave model. One discovery pass over the whole freshwater
domain, one roadmap, one execution batch, one PR.

**Corpus at start:** 111 published, orphans 0, all guards 0, 456 edges.

---

## 1. Method

A domain map of **166 concepts** across the 15 required areas — fish care,
diseases, parasites, water chemistry, filtration, equipment, plants,
shrimp/snails, breeding, feeding, emergencies, buying decisions, safety,
aquascaping, maintenance — was matched against the full text of all 111 live
articles (`domain-map.mjs`).

| status | count | meaning |
|---|---|---|
| OWNED | 100 | an article's **title** carries the concept |
| MENTION | 34 | appears in bodies, no article owns it |
| ABSENT | 32 | appears nowhere |

MENTION and ABSENT were then hand-verified one by one, because the scan is a
starting point, not a verdict.

### Arabic matching hazard

Short roots match inside unrelated words and produce phantom gaps or phantom
coverage. Confirmed cases across this project: `قط` inside `انقطاع` (outage)
inflated "catfish" to 84 articles when the true count is 1; `بيض` matches
`أبيض` (white); `رام` matches inside ordinary words. Every pattern in the map is
multi-character, and **every surprising result was re-checked by hand.**

That re-check overturned four of the scan's own results:

| concept | scan said | truth | why |
|---|---|---|---|
| winter heating | MENTION (gap) | **OWNED** | `aquarium-heater-winter-iraq` exists; my pattern missed its title wording |
| mouth fungus | ABSENT | **ALREADY COVERED** | it *is* columnaris, owned by `fish-fungus-vs-columnaris`, which discusses the mouth |
| shrimp moulting / colony | ABSENT | **partially covered** | the shrimp article does discuss انسلاخ, تفريخ and الصغار — demoted from NEW to DEEPEN |
| eye problems | ABSENT | **ABSENT, confirmed** | the diagnosis hub contains **zero** mentions of eyes — the gap is real |

---

## 2. NEW CANONICAL — 4

| # | slug | area | reason | cannibalisation risk | priority |
|---|---|---|---|---|---|
| 1 | `choosing-healthy-fish-in-store` | buying | Prevention starts **before** quarantine. `quarantine-new-fish-guide` owns *after purchase*, `acclimating-new-fish` owns the bag transfer, `avoid-fake-fish-stores-instagram-scams` owns *which seller*. Nothing owns *look at this fish and decide*. | **Low.** Adjacent owners exist but none covers in-store assessment. Article will link out to all three rather than restate them. | **P1** |
| 2 | `aquarium-hygiene-and-human-safety` | safety | `fish TB` / zoonosis: **0 mentions in 111 articles.** The corpus repeatedly instructs readers to put hands in tank water and never mentions covering cuts or washing after. *Mycobacterium marinum* transmits through skin breaks. The only gap whose consequence lands on the **keeper**. | **None.** No article touches human health. | **P1** |
| 3 | `fish-that-outgrow-home-tanks` | buying / fish care | `pangasius`, `shark-type sold small`, `fish lifespan`, `culling/rehoming` are all 0. Real intent is *"fish sold small that become unsuitable"* — a purchase-time decision. Absorbs lifespan-as-commitment and rehoming. | **Medium** vs `how-many-fish-in-aquarium`. Mitigated: that article owns *numbers*; this owns *adult size at point of sale*, and links to it for stocking maths. | **P2** |
| 4 | `fish-eye-problems` | diseases | popeye and cloudy eye both 0, and the diagnosis hub was verified to contain **zero** eye mentions. Clear differential worth owning: one eye → injury/local; both eyes → systemic or water quality. | **Low** vs the diagnosis hub, which is a symptom→cause index, not a per-system article. | **P2** |

---

## 3. REWRITE — 1

| slug | current state | becomes | reason | priority |
|---|---|---|---|---|
| `ph-level-iraqi-tap-water-fish` | 2,328 chars. Filler shape: "مقدمة" / "نصيحة ذهبية من AQUAVO" / "استنتاج", with a promotional block. | The **measured-water decision**: adjust your water or choose fish that suit it; stability vs chasing a target number; hard-water species selection; hard-water plants; when RO mixing / remineralisation is genuinely relevant. | `gh-kh-water-hardness-guide` already owns what the numbers *mean* and already says "لا تطارد الأرقام", so a new page would cannibalise it. The **decision** and **species selection** are unowned. Rewriting keeps the URL and removes a filler article, as Cycle 9 did with the livebearer page. | **P1** |

### Framing constraint — mandatory

No blanket claim that Iraqi tap water is hard or alkaline. Corpus audited:
**0 such claims exist today** and none may be introduced. Framing is strictly
measured-water — *"إذا طلعت قراءاتك…"* — with instructions on determining it by
pH/GH/KH testing. `gh-kh-water-hardness-guide` already models this correctly
with a section titled *ما نعرفه وما لا نعرفه عن ماء العراق*.

---

## 4. DEEPEN — 18

All verified against the owning article, not assumed.

| # | owner | section to add | evidence | priority |
|---|---|---|---|---|
| 1 | `aquarium-water-change-guide` | high nitrate despite regular changes — source water, stocking, feeding, why chemical removers are usually the wrong lever | `nitrate reduction` 0; owner already answers "ليش نغيّر الماء" | P1 |
| 2 | `why-fish-die-suddenly-rescue-guide` | what to actually do when a fish dies — remove promptly, investigate before medicating, check the others | verified 0 for ماتت / الميتة / أخرج / إزالة | P1 |
| 3 | `fish-treatment-protocol` | water changes during a treatment course | `water change during illness` 0 | P1 |
| 4 | `internal-fish-parasites` | hole-in-head / hexamita — the pitted-head presentation | 0; affects discus, oscar, cichlids the corpus already covers | P2 |
| 5 | `aquarium-fish-feeding-guide` | live food risk and frozen food handling | `frozen food` 0; `live food` mentioned only inside the parasites article | P2 |
| 6 | `algae-war-guide` | hair / thread algae as its own type | `خيطية` appears 2× but no type entry owns it | P2 |
| 7 | `aquarium-placement-and-stand` | leak and silicone-failure early signs | no owner; `how-to-choose-aquarium-tank` mentions تسريب twice in passing | P2 |
| 8 | `aquarium-care-while-traveling` | auto feeders — when they help, when they flood the tank | verified 0 | P2 |
| 9 | `filter-types-guide` | UV sterilisers — do you actually need one | 0 anywhere in the corpus | P3 |
| 10 | `hardscape-rock-arrangement-visual-depth` | composition rules — thirds, focal point | verified 0 for الأثلاث / الذهبية / التركيز | P3 |
| 11 | `air-pumps-decoration-or-necessity` | pump noise and vibration | 0 | P3 |
| 12 | `transporting-fish-and-aquarium` | teardown and restart of an established tank | 0 | P3 |
| 13 | `aquarium-shrimp-snails-guide` | colony building depth — what actually limits population | partially covered; demoted from NEW after verification | P3 |
| 14 | `aquarium-water-flow` | surface film — cause and fix | only its own passing mention | P3 |
| 15 | `how-to-clean-aquarium-properly` | keeper hygiene during cleaning — cover cuts, wash after, never siphon by mouth | **added during execution**, not in the original roadmap: cleaning is the task with the most hand-in-water contact, so it is the right home for the precaution, and it gives NEW #2 a second meaningful inbound link | P1 |

---


### Inbound wiring — 3 more, added during execution

The first projected graph passed every gate and was still wrong. Only
`aquarium-hygiene-and-human-safety` had an inbound link from the existing 111;
the other three new canonicals linked to each other and to nothing else — an
**island** the established corpus could not reach. `project-graph.mjs` scored
that as OK, because it asked whether an inbound link exists, not where it comes
from. The check now distinguishes the two, and fails on ISLAND as well as
ORPHAN. Verified by replaying this batch without the wiring below: 3 ISLAND,
exit 1.

Each of the three closes a gap verified in its own owner first, so none is a
link stub.

| # | owner | section to add | evidence | wires in |
|---|---|---|---|---|
| 16 | `fish-disease-symptoms-diagnosis` | the eye as a symptom, and the one-eye vs both-eyes split that directs the search | the symptom table has **no eye row** — the same zero-mention finding that justified NEW #4 | `fish-eye-problems` |
| 17 | `how-many-fish-in-aquarium` | where the stocking maths breaks: it assumes you know the adult size, and the shop sells juveniles | its own factor #1 is "adult size, not purchase size" and links only to the goldfish article | `fish-that-outgrow-home-tanks` |
| 18 | `quarantine-new-fish-guide` | quarantine does not repair a bad purchase — assessment happens before the bag | it already says the need starts before the shop and links to origins and fake sellers; in-store assessment was the missing third piece | `choosing-healthy-fish-in-store` |

## 5. ALREADY COVERED — verified, not gaps

winter heating (`aquarium-heater-winter-iraq`) · mouth fungus (= columnaris) ·
temperature shock (heaters article: صدمة ×2, تذبذب ×2) · new plant melt
(plant-problems article: ذوبان ×3, and its title carries it) · ammonia burn
(ammonia article already has حرق, الخياشيم, احمرار) · velvet, flukes, anchor
worm, fish lice (inside the new external hub by design) · cardinal tetra,
rasbora, rainbowfish, danio (inside the selection article by design) ·
photoperiod (lighting article) · shrimp basics · egg-layer strategies · fry
first foods · sponge filters · beneficial bacteria products · copper danger ·
scaleless medication caution.

## 6. NOT WORTH STANDALONE

| topic | why |
|---|---|
| killifish | taxonomic gap only — specialist pursuit, negligible local availability; would be filler |
| fish lifespan | as a page it is a number table; the useful *commitment* angle folds into NEW #3 |
| running cost / electricity | answerable only with tariff and wattage figures that vary and would have to be invented — straight into the no-unsupported-numbers rule |
| tumors / lumps | little actionable guidance exists; would raise alarm without offering a step |
| gas bubble disease | rare in home freshwater tanks |
| children and the tank | a line in the placement article at most |
| green water bloom | `algae-war-guide` carries it adequately |

## 7. RESEARCH BLOCKED

Search Console and customer-support data — unchanged, and still not blocking
production. Every decision above rests on corpus evidence and public domain
knowledge instead.

---

## 8. Execution plan

Twenty-three content targets: 4 new, 1 rewrite, 18 deepenings. Single batch, single
migration, single PR.

**Gates required before publish** — all must hold:

- script purity 0 · business truth 0 · editorial 0
- dead links 0 · self links 0 · balanced HTML
- orphans 0, and **every new canonical carries an inbound link from an
  article that already existed** — not merely from another article in this batch —
  projected from the emitted SQL before the write (`project-graph.mjs`)
- scientific safety review, recorded defect-by-defect

**Safety constraints carried forward from Cycle 11**, which are now house rules:

- no dose or compound named in any health article
- product leaflet and veterinary direction outrank the corpus's own advice
- one sign never equals one diagnosis; differentials stated
- quarantine ≠ treatment; no default medication for new arrivals
- no structural, load-bearing or building-safety guarantees
- no unsupported blanket claims about Iraqi water

**New safety constraint for this batch** (NEW #2): human-health content must
describe hygiene precautions and when to see a doctor, and must not diagnose
human illness or name human medication.

## 9. Saturation

Not reached, and this roadmap is the evidence: a complete 166-concept pass still
yields **4 new canonicals and 1 rewrite**. Saturation will be claimed only when
a full domain pass produces no meaningful independent canonical intent — after
this batch ships and is re-run against the resulting corpus.
