# Research dossier — protecting an aquarium in Iraqi summer heat

**Target URL:** `/blog/protect-fish-iraqi-summer-50-degrees` (existing canonical, rewrite)
**Wave 1 item:** merge three-way + deepen. **Decision: REWRITE the survivor, MERGE the other two.**

## Registry / cannibalisation check

Three published articles competed for the same query — the worst duplication in
the corpus:

| Slug | Words | Verdict |
| --- | --- | --- |
| `protect-fish-iraqi-summer-50-degrees` | 365 | **KEEP as canonical.** Strongest slug: local, and "50 degrees" is the query Iraqi readers actually type. Content is vacuous and is replaced entirely. |
| `iraqi-summer-aquarium-cooling` | 227 | MERGE. Has the only real content of the three — five concrete methods with costs and an emergency table — which is absorbed. Emoji in title. |
| `كيف-تحافظ-على-أجواء-مريحة-...-1788055556978` | 571 | MERGE. Generic, and the slug is a machine-generated timestamp, which is unusable as a URL. |

The surviving content is drawn mostly from the *second* article and the sources
below; the surviving *slug* is from the first. Keeping the better URL and the
better content required separating those two decisions.

## Why the old page failed

`protect-fish-iraqi-summer-50-degrees` was circular — "heat can affect water
quality… heat can affect fish health" restated four times — and it recommended
"مكيفات خاصة بالأسماك" and cooling fans, neither of which exists in the
catalogue. It never explained *why* heat kills, which is the one thing that lets
a reader act correctly under pressure.

## Claims ledger

Format: CLAIM · SOURCE · TYPE · CONFIDENCE · LIMITATION

1. **Warm water holds less dissolved oxygen: a fully aerated tank holds at most
   ~7.0 mg/L at 35 °C against ~9.1 mg/L at 20 °C — roughly a 23% lower ceiling.**
   · AquaCalc heat-stress reference · specialist reference · HIGH
   · Saturation values are standard physical chemistry. Publish as "about", and
   as a ceiling rather than a measured tank value.

2. **Fish metabolic rate roughly doubles per 10 °C rise, so a fish at 32 °C
   consumes roughly 40–75% more oxygen than at 24 °C.**
   · AquaCalc; Lone Star tropical-metabolism reference · specialist · MEDIUM-HIGH
   · The Q10≈2 rule is textbook; the 40–75% band is a modelled range. Publish as
   a range, never as a single figure.

3. **The two effects compound — supply falls while demand rises — so fish can
   hit critical oxygen even in a well-aerated tank. ("oxygen squeeze")**
   · AquaCalc · specialist reference · HIGH
   · This is the mechanism the whole article is built on, and the thing the old
   page never said.

4. **Critical oxygen thresholds for tropical freshwater species sit around
   2–4 mg/L; surface gasping typically appears at 5 mg/L or below.**
   · AquaCalc, summarising species research · specialist reference · MEDIUM
   · Species-, size- and acclimation-dependent. Publish the *behaviour* (gasping
   at the surface) as the reader's signal, not the number — a home keeper cannot
   measure dissolved oxygen.

5. **Most tropical ornamental fish are kept at roughly 24–28 °C, and sustained
   temperatures above about 32 °C are dangerous.**
   · Tropical Fish Hobbyist temperature control; RateMyFishTank temperature guide
   · specialist reference · HIGH
   · Species vary; discus and some others differ. Publish as a general range.

6. **The simplest effective cooling is a fan blown across the water surface,
   with the hood replaced by screening — evaporative cooling.**
   · Tropical Fish Hobbyist; Aqueon summer-cooling guide · specialist · HIGH
   · Requires topping the tank up as water evaporates, and evaporation
   concentrates whatever is dissolved. Both caveats must be published.

7. **Sudden cooling is itself a stressor; cool gradually.**
   · Charterhouse Aquatics high-temperature guide · specialist · HIGH
   · Directly limits the frozen-bottle method, which the merged article carried
   without a strong enough warning.

## RESEARCH BLOCKED

- **How many degrees a specific fan lowers a specific tank.** The merged article
  claimed "3–5 degrees". That depends on airflow, humidity, surface area and
  room temperature; Iraqi summer humidity varies enormously between Baghdad and
  Basra, and evaporative cooling is weakest exactly where humidity is highest.
  The rewrite states the mechanism and the dependency instead of a number.
- **A safe maximum temperature for the Iraqi ornamental mix specifically.** No
  source addresses that combination. The article gives the general range and the
  behavioural warning signs.

## Business-truth check

AQUAVO stocks **no chillers, no cooling fans and no air conditioning** — the old
page implied all three. It does stock air pumps (13 SKUs) and thermometers
(6 SKUs), which are exactly what this article legitimately needs. Fans and
chillers are described generically, with no supply claim.

## Internal link graph

Out: `/blog/nitrogen-cycle-simple-arabic-explained` (warm water accelerates the
cycle and raises the toxic NH3 fraction), `/blog/fish-that-live-without-filter`
(the oxygen mechanism), `/blog/power-outage-emergency-aquarium-tools` (heat plus
a power cut is the compound Iraqi risk), `/blog/cloudy-water-fix` (blooms consume
oxygen and are worse in heat), `/calculators`.
