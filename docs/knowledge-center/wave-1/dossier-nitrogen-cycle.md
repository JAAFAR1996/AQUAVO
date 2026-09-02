# Research dossier — the nitrogen cycle (cluster hub)

**Target URL:** `/blog/nitrogen-cycle-simple-arabic-explained` (existing canonical, rewrite)
**Wave 1 item:** Deepen #1 — cluster hub. Absorbs `nitrogen-cycle-simple` (merge, separate step).
**Registry check:** PASS — canonical row exists; this is an explicit rewrite of the survivor, not a new URL.

## Why the current page fails

Live at 326 words. Its central claim is wrong: it states the cycle has "three stages" and that
**bacteria convert waste into ammonia**. Ammonia is excreted directly across fish gills and released
by decomposition; nitrifying bacteria *consume* ammonia, they do not produce it. The page also
carries no readings, no timeline, no failure modes, and a sales section. Nothing on the page tells a
reader what their test kit result means or what to do about it.

## Claims ledger

Format: CLAIM · SOURCE · TYPE · CONFIDENCE · LIMITATION

1. **Nitrification is two oxidation steps: ammonia → nitrite → nitrate.**
   · LiveAquaria water-quality reference; Aquarium Science 2.10 · specialist reference · HIGH
   · Standard, uncontested.

2. **Ammonia oxidisers (classically *Nitrosomonas*) perform step one; nitrite oxidisers (*Nitrospira*) perform step two.**
   · LiveAquaria; Aquarium Science · specialist reference · HIGH
   · *Nitrobacter* is the name most older Arabic articles use for step two; freshwater aquaria are
   dominated by *Nitrospira*, not *Nitrobacter*.

3. **Complete ammonia oxidisers ("comammox" *Nitrospira*) dominate most freshwater aquarium biofilters and oxidise ammonia all the way to nitrate in one organism.**
   · Two peer-reviewed papers, PMC11267875 and PMC12704419 · peer-reviewed · HIGH
   · Recent finding. State as "modern research shows", not as settled textbook fact. Do not let it
   displace the two-step model the reader's test kit is built around.

4. **Ammonia exists as NH₃ (toxic) and NH₄⁺ (far less toxic); the NH₃ fraction rises with pH and temperature, and one pH unit changes NH₃ roughly ten-fold.**
   · EPA 440/5-85-001 (1985) via The Krib; ANZ water quality guidelines · government/primary · HIGH
   · The ten-fold figure is approximate and pH-range dependent.

5. **Percent un-ionised ammonia at 25 °C — pH 6.5: 0.18%, pH 7.0: 0.57%, pH 7.5: 1.77%, pH 8.0: 5.38%, pH 8.5: 15.3%. At 28 °C — 0.22 / 0.70 / 2.17 / 6.56 / 18.2%.**
   · EPA 440/5-85-001 table, reproduced by The Krib · government/primary · HIGH
   · Freshwater, low ionic strength. Publish as orders of magnitude, not as a lab instrument.

6. **Un-ionised ammonia is roughly 100× more toxic to fish than the ionised form.**
   · ANZ guidelines; Responsible Seafood Advocate · government + specialist · MEDIUM
   · "Roughly" is doing real work; species vary. Frame as an order of magnitude.

7. **Nitrite crosses the gill and oxidises haemoglobin to methaemoglobin, which cannot carry oxygen — "brown blood disease".**
   · Texas A&M AgriLife Extension PDF; Responsible Seafood Advocate · extension/specialist · HIGH
   · Mechanism is uncontested.

8. **Chloride competes with nitrite at the same gill uptake sites, so chloride in the water is protective.**
   · Texas A&M Extension; Responsible Seafood Advocate · extension/specialist · HIGH
   · Ratios (3:1 up to 10:1 Cl⁻:NO₂⁻) come from channel catfish aquaculture. **Do not publish a
   dosing ratio for ornamental fish** — different species, different scale. State the mechanism and
   that a water change is the reliable home action. No invented dosages.

9. **Nitrification slows sharply as pH falls and effectively stalls near pH 6.0; KH below about 3 dKH (~50 ppm) makes a pH crash likely during cycling.**
   · Wikipedia "Fishless cycling"; The Puffer Forum library · admissible / signal · MEDIUM
   · The pH 6.0 stall figure is widely repeated in specialist sources but was not traced to a primary
   study within this dossier. Publish as "slows sharply and can stall", not as a hard cutoff.

10. **Nitrite above roughly 5 mg/L begins to inhibit the nitrite-oxidising bacteria, stalling the cycle.**
    · DrTim's Aquatics (Dr Tim Hovanec, the microbiologist behind the commercial nitrifier products)
    · specialist reference · MEDIUM · Vendor-affiliated; the author is a domain authority but the
    figure is not independently verified here. Frame as "can stall" with the corrective action.

11. **A fishless cycle typically shows nitrite appearing around days 14–20, with the full cycle commonly taking six weeks or more.**
    · DrTim's Aquatics · specialist reference · MEDIUM
    · Highly variable with temperature, seeding and dosing. Publish as a range with the caveat.

## RESEARCH BLOCKED

- **A safe total-ammonia number for ornamental freshwater fish in mg/L.** Every usable threshold is
  expressed as un-ionised NH₃ and is species- and duration-dependent; the aquaculture numbers are for
  food fish at production densities. The article gives the reader the pH/temperature relationship and
  the action (water change), not a "safe below X" number.
- **Iraqi municipal water: chloramine vs free chlorine.** The corpus repeatedly asserts Iraqi tap
  water is chlorinated, but no source establishing which disinfectant Baghdad uses was found. This
  matters — a dechlorinator that neutralises chlorine leaves the ammonia half of chloramine behind.
  The article states the conditional ("if your supply uses chloramine…") and does not assert which.

## Correction — 2026-09-02: an Iraq-wide water claim that no ledger entry supported

The first draft of the hub wrote that the ammonia/pH interaction matters
"especially for Iraqi tap water, which usually tends alkaline". **No claim in
this dossier supports that**, and none can: the only Iraqi-water entry here is a
RESEARCH BLOCKED note about chloramine. The sentence generalised the water
chemistry of an entire country from nothing.

It is replaced with conditional wording keyed to what the reader can actually
measure — if your pH is 7.5 or above treat any ammonia reading as more dangerous
than it looks, if it is 6.8 or below the same number is far less dangerous — plus
an explicit statement that pH cannot be inferred from location and must be
tested. Both thresholds come straight from claim 5's EPA table (0.18% un-ionised
at pH 6.5 versus 1.77% at pH 7.5 and 5.38% at pH 8.0), so the rewrite adds no
new claim; it removes one and grounds the rest in the existing ledger.

The migration now carries a post-flight guard that aborts if the phrase returns.

## Health-and-safety handling

Ammonia and nitrite poisoning are health content. Observable signs, causes, first actions and
treatment stay separate on the page. No definitive diagnosis from nonspecific symptoms, and no
dosages of any kind.

## Sources

- https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11267875/
- https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12704419/
- https://www.thekrib.com/Chemistry/ammonia-toxicity.html (EPA 440/5-85-001 table)
- https://www.waterquality.gov.au/anz-guidelines/guideline-values/default/water-quality-toxicants/toxicants/ammonia-2000
- https://extension.rwfm.tamu.edu/wp-content/uploads/sites/8/2013/09/Nitrite-Poisoning-or-Brown-Blood-Disease-A-Preventable-Problem.pdf
- https://www.globalseafood.org/advocate/nitrite-toxicity-affected-by-species-susceptibility-environmental-conditions/
- https://www.drtimsaquatics.com/resources/fishless-cycling/
- https://aquariumscience.org/2-10-nitrogen-cycle/
- https://www.liveaquaria.com/blogs/water-quality/ammonia-the-nitrogen-cycle-keep-your-aquarium-healthy
