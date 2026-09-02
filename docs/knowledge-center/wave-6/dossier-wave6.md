# Research dossier — Wave 6

## The registry needed a new method, so it got one

Wave 5 recorded that mention counts had collapsed: the best genuine gap scored 5,
against 21 two waves earlier. Mining "topics the corpus mentions without owning"
was exhausted, and continuing would have produced filler.

Wave 6 therefore ranks by **structural coverage** instead — asking what a
complete Arabic aquarium knowledge base needs that this one lacks, rather than
what its own articles happen to mention. Two things fell out immediately that
mention-mining could never have found.

## Finding 1 — species coverage holes

Of 24 commonly kept species checked against article titles, these had no page:
angelfish, gourami, swordtail, cardinal tetra, danio, rasbora, barb, otocinclus,
loach.

- **Angelfish and gourami accepted.** Both are among the most commonly kept
  species anywhere, both are entirely absent, and gourami was already referenced
  as a labyrinth fish in two published articles without a page to point at.
- **Danio, platy, molly, swordtail rejected** — `5-hardy-fish-for-beginners`
  already covers them by name. A "small schooling species" article would have
  cannibalised it.
- **Cardinal, rasbora, barb, otocinclus, loach deferred** — real but lower
  intent, and better served later as a group if at all.

One false negative worth noting: the scan reported goldfish as having no page.
It does — `goldfish-5-deadly-mistakes-beginners` — and the regex missed it
because the title writes "الجولدفش" without a space. **Third consecutive wave in
which the automated scan was wrong about something**, and third time reading the
corpus caught it.

## Finding 2 — the weakest strategic hub

Ranking articles by inbound links against word count exposed
`ammonia-spike-emergency-treatment`: **10 inbound links, 293 words**. The second
most-linked article in the corpus and one of the thinnest.

Reading it showed worse than thin. It was circular — "ammonia can cause
deterioration in water quality… death of fish" — and contained **no emergency
protocol at all**: no ordered steps, no first action, no mention of not cleaning
the filter. Ten articles, most of them written this session, send a reader there
mid-emergency.

This is the "strategically required" exception to not rewriting legacy thin
pages. Deepened from 2,044 to 3,912 characters with an ordered action table.

## Claims ledger — ammonia emergency

Format: CLAIM · SOURCE · TYPE · CONFIDENCE · LIMITATION

1. **Immediate response is a water change with dechlorinated,
   temperature-matched water; dilution is the only fast way to lower
   concentration.** · Fishkeeping.co.uk emergency guide; Aquarium Science 5.2.3
   · specialist reference · HIGH
2. **A conditioner that binds ammonia converts it to a less harmful form
   temporarily, buying time for the bacteria.** · Same sources · MEDIUM-HIGH
   · Framed as temporary, because it is.
3. **Do not clean or replace filter media during a spike — that removes the
   bacteria that resolve it.** · Aquarium Co-Op; Fishkeeping.co.uk · HIGH
   · The single most important "do not" and it was absent from the old page.
4. **Reduce or stop feeding.** · Same · HIGH · Fastest way to stop new ammonia.
5. **Toxicity depends on pH and temperature, so the same reading is more
   dangerous in a warm alkaline tank.** · EPA 440/5-85-001 via
   `dossier-nitrogen-cycle.md` claims 4-5 · HIGH
   · The article explicitly warns against chasing pH downward to reduce
   toxicity, since pH swings harm an already-stressed fish.
6. **A cycling tank is a different case: keep concentration survivable without
   large repeated changes that stall the cycle.** · Aquarium Co-Op · MEDIUM-HIGH

**RESEARCH BLOCKED:** a numeric target to change water down to. Published
figures vary and depend on pH, temperature and species. The article gives the
ordered protocol and the retest instruction instead.

## Claims ledger — angelfish

7. **Angelfish are cichlids and become territorial at maturity, particularly
   when pairing.** · Standard species references · HIGH
8. **Adults reach roughly 15 cm long and up to 20 cm tall including fins, so
   tank *height* matters more than for most species.** · Same · MEDIUM-HIGH
   · Published as approximate. This is the article's central practical point and
   applies to almost no other commonly kept fish.
9. **Adult angelfish will eat fish small enough to fit in the mouth, which makes
   the classic angelfish-plus-neon-tetra pairing a poor one.** · Same · HIGH
10. **Long fins are vulnerable to nipping and to fin rot after damage in poor
    water.** · Consistent with the fin-rot and columnaris articles · HIGH

**RESEARCH BLOCKED:** a definitive compatibility list. Behaviour varies by
individual, by maturity and by tank size. The article gives the principle —
plan for the territorial adult, not the peaceful juvenile — and declines the list.

## Claims ledger — gourami

11. **Gouramis are anabantoids with a labyrinth organ and breathe atmospheric
    air; surfacing is normal behaviour, not distress.**
    · *Journal of Fish Biology* (Tate et al. 2017) and *Journal of Morphology*
    10.1002/jmor.20931, carried from `dossier-no-filter-aquarium.md` claims 5-7
    · peer-reviewed · HIGH
12. **Some gouramis are obligate air-breathers and must reach the surface, so a
    fully sealed lid is dangerous.** · Same · HIGH
    · Ties directly to the Wave 5 jumping article, which argues for covering
    gaps rather than sealing.
13. **Air-breathing confers tolerance of low dissolved oxygen — not tolerance of
    ammonia.** · Same · HIGH
    · Stated explicitly, because the inference is easy and wrong.
14. **A calm surface matters more for gouramis than for most fish, since they
    surface to breathe.** · Specialist keeping references · MEDIUM

**RESEARCH BLOCKED:** how much power-outage tolerance the labyrinth organ
actually buys. It is a margin, not immunity, and no source quantifies it for
home aquaria. Published as a margin with the filter still described as necessary.

## Internal link plan

Ammonia (9 links) is now a genuine emergency hub: feeding, tap water, outage,
stocking, nitrogen cycle, summer heat, diagnosis, test kits, water change.
Angelfish (8) and gourami (9) both point into the tank-choice, filter, oxygen,
stocking and disease clusters — and gourami closes the loop with the jumping and
no-filter articles that had been referencing labyrinth breathing with nowhere to
send the reader.
