# Research dossier — keeping fish without a conventional filter

**Target URL:** `/blog/fish-that-live-without-filter` (existing canonical, rewrite)
**Wave 1 item:** Phase 3 remediation — audit the premise, not just the sentences.
**Registry check:** PASS — canonical row exists (`d933520e`), 1,821 chars, published.
**Decision: REWRITE.** Reasoning at the bottom.

## Why the current page fails

The live page is not merely thin, it is dangerous. It names **goldfish and neon
tetra** as the fish best able to live "without a filter or oxygen". Those are
close to the two worst possible answers, and a beginner in Baghdad acting on
this during a power cut would lose the tank.

It also conflates three separate things that the rewrite has to pull apart:

| The page says | Actually |
| --- | --- |
| "بدون فلتر" | no *device*. Biological filtration is bacteria on surfaces and continues regardless. |
| "بدون أوكسجين" | no *pump*. Gas exchange still happens at the water surface. |
| implied | no maintenance. An unfiltered tank needs **more** water changes, not fewer. |

## Claims ledger

Format: CLAIM · SOURCE · TYPE · CONFIDENCE · LIMITATION

1. **Neon tetra require a mature, fully cycled tank with ammonia and nitrite at
   zero, and are harmed by even short-term spikes.**
   · Fishlore species profile; The Aquarium Wiki; infishtank water-parameter guide
   · specialist reference · HIGH
   · Directly contradicts the live page. Multiple independent specialist sources
   agree; none dissent.

2. **Neon tetra need stable pH and hardness — soft, slightly acidic water,
   roughly pH 6.0–7.5 and 1–10 dGH — and react badly to swings.**
   · Fishlore; The Aquarium Wiki · specialist reference · HIGH
   · Ranges vary a little between sources; publish as a range, not a setpoint.

3. **Goldfish excrete markedly more waste than other fish of similar size and
   need strong filtration and volume, not less.**
   · Tropical Fish Hobbyist, "Goldfish Myths Debunked"; Aquarium Science 1.2
   · specialist reference · HIGH
   · The widely repeated "ten times" multiple is not independently verified
   here. **Publish as "much more", never as a number.**

4. **The bowl/no-filter goldfish tradition worked only because the water was
   changed every single day.**
   · Aquarium Science 1.2 (falsehoods and myths) · specialist reference · MEDIUM
   · Historical framing, not a controlled study. Publish as the trade-off it is:
   the filter's work does not vanish, it moves onto the keeper.

5. **Anabantoids (Betta splendens, gouramis) have a labyrinth organ — a
   vascularised suprabranchial structure — and breathe atmospheric air.**
   · Tate et al. 2017, *Journal of Fish Biology* (PMID 28868750); *Journal of
   Morphology* 10.1002/jmor.20931 · peer-reviewed · HIGH
   · Uncontested.

6. **That adaptation lets them persist in hypoxic and polluted water.**
   · Tate et al. 2017; Practical Fishkeeping anabantoid guide · peer-reviewed +
   specialist · HIGH
   · "Persist" is the right word. It is tolerance of low oxygen, **not**
   tolerance of ammonia. This distinction is the spine of the rewrite.

7. **Betta splendens is a facultative air-breather; the blue gourami
   (Trichopodus trichopterus) is an obligate air-breather.**
   · *Journal of Morphology* 10.1002/jmor.20931 · peer-reviewed · HIGH
   · Obligate means it must reach the surface. Relevant to covered tanks.

8. **Biological filtration is a bacterial process on surfaces, not a property of
   the device.**
   · Carried over from `dossier-nitrogen-cycle.md`, claims 1–3 · HIGH
   · Already published on the hub, so the two pages agree by construction.

9. **Gas exchange occurs at the air/water interface; surface agitation is what
   drives it.**
   · Standard aquarium physiology; consistent across the sources above
   · specialist reference · HIGH
   · Uncontested.

## RESEARCH BLOCKED

- **A safe stocking density for an unfiltered tank, in litres per fish.** No
  source offers a defensible general number; it depends on volume, planting,
  temperature, feeding rate and species. The article therefore gives the
  *measurement* — test ammonia and nitrite, and let the readings decide — rather
  than inventing a ratio. This is the same handling the nitrogen-cycle hub uses
  for the safe-ammonia question.
- **Whether any commonly kept ornamental species tolerates zero water movement
  indefinitely in Iraqi summer temperatures.** Warm water holds less oxygen, and
  no source addresses this combination directly. The article states the
  mechanism and does not promise an outcome.

## Decision: REWRITE, not MERGE and not UNPUBLISH

- **Not UNPUBLISH.** The search intent is real and specifically Iraqi: frequent
  power cuts make "what happens to my tank when the filter stops" an urgent
  question. Deleting the page abandons a reader who will then find a worse
  answer. The premise can be served truthfully — the honest answer is more
  useful than the myth, not less.
- **Not MERGE.** `power-outage-emergency-aquarium-tools` covers the *emergency*;
  `betta-fish-bowl-truth-iraq` covers one species in one container. Neither
  answers "can a tank run without a filter at all, and on what terms". No
  cannibalisation: the rewrite targets a distinct intent and links to both.
- **REWRITE**, keeping the URL and the search intent, replacing the answer.

## Internal link graph

Out: `/blog/nitrogen-cycle-simple-arabic-explained` (the biological-filtration
claim), `/blog/power-outage-emergency-aquarium-tools` (the power-cut case),
`/blog/betta-fish-bowl-truth-iraq` (the species this article now recommends),
`/blog/ammonia-spike-emergency-treatment` (what to do when the readings rise),
`/calculators` (volume and stocking).

## Guard compliance

Must pass `script-purity` (including the new FOREIGN_LEXICAL rule — Latin terms
are capitalised binomials or parenthetical glosses), `business-truth` (test kits
are the only product named, and they are genuinely stocked; no warranty, ranking
or sourcing claim), and `editorial-guard` (no external seller).
