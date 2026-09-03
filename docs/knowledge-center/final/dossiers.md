# Research dossiers — the 4 NEW canonical articles

Written before drafting. Each records the intent, the ownership case, the
cannibalisation check against named live articles, the reference basis, the
safety boundary, and the claims that must not appear.

A note on sources. This project has no Search Console and no support-desk data
(RESEARCH BLOCKED), and the drafting environment has no web access, so nothing
below cites a URL it did not open. What each dossier lists instead is the
**reference basis**: the settled, non-contested body of aquarium and veterinary
knowledge a claim rests on, plus an explicit note wherever the evidence is
contested or thin. Where the evidence is thin, the article says so rather than
picking a side — the pattern the corpus already uses in `aquarium-salt-guide`
("نقطة خلافية نعرضها كما هي") and `fish-fungus-vs-columnaris` ("حدود ما نستطيع
قوله").

---

## Dossier 1 — `choosing-healthy-fish-in-store`

### Search / user intent
Pre-purchase assessment. The reader is standing at a shop tank, or about to
order, and wants to know which fish to avoid. Question forms: "كيف أعرف السمكة
سليمة قبل الشراء", "علامات السمكة المريضة بالمتجر", "شنو أتجنب عند شراء سمك".
Transactional-adjacent but informational: the decision is *this fish or not*.

### Why standalone
Prevention runs earlier than every article the corpus currently has. The
existing chain starts *after* money changes hands. Owning the step before that
is what closes the loop, and it is the cheapest intervention in the whole
corpus: a fish not bought cannot infect a tank.

### Cannibalisation check
| live article | owns | overlap | resolution |
|---|---|---|---|
| `quarantine-new-fish-guide` | isolating and observing **after** purchase | none — sequential, not competing | link forward to it as the required next step |
| `acclimating-new-fish` | the bag→tank transfer | none | link forward |
| `avoid-fake-fish-stores-instagram-scams` | which **seller** to trust (online fraud) | low — seller vs specimen | link sideways; do not restate fraud advice |
| `fish-disease-symptoms-diagnosis` | symptom→cause for **your** fish | moderate: both read symptoms | resolved by context — the shop article judges a fish you do not own, in a system you cannot test, with no history. Different decision (walk away vs treat). |
| `external-fish-parasites` | identifying parasites | moderate | the shop article names only what is visible at a glance and links out for identification |

**Verdict: low risk.** No live article covers in-store assessment.

### Reference basis
Standard, uncontested pre-purchase indicators used across ornamental fish
husbandry and veterinary triage: clamped fins; flashing/rubbing; rapid or
laboured opercular movement; sunken or hollow abdomen; white stringy faeces;
skin lesions, ulcers or reddening; spinal curvature; cloudy or protruding eyes;
lethargy or hanging at the surface. The **system-level** point — that a shop's
tanks commonly share one filtration loop, so a sick fish in a neighbouring tank
is relevant to the one you are buying — is a plumbing fact about shop systems,
stated conditionally because not every shop is centrally plumbed.

Behavioural indicator: asking to see the fish eat. Widely used, low-tech, and a
genuine signal — a fish that refuses food in the shop rarely improves after the
stress of transport.

### Safety boundaries
- Assessing a fish, not diagnosing it. Visible signs indicate risk, not a named
  disease.
- Absence of visible signs is **not** a clean bill of health — this is precisely
  why quarantine exists, and the article must say so or it will be read as a
  replacement for quarantine.
- No advice that creates a dispute with a seller; the recommendation is to
  decline a purchase, not to make accusations.

### Claims that must NOT be made
- That any checklist reliably detects infection. Latent infection is invisible.
- That a fish from a "good shop" does not need quarantine.
- That any named shop, chain or seller is good or bad.
- That AQUAVO sells fish, or any implication of it (business-truth rule).
- Any quarantine duration presented as sufficient to guarantee health.

---

## Dossier 2 — `aquarium-hygiene-and-human-safety`

### Search / user intent
Keeper-directed safety. Two entry points: someone who has developed a persistent
skin lesion on a hand or forearm and is searching for a cause, and someone
asking whether aquarium water is dangerous — often a parent. Question forms:
"هل ماء الحوض يضر الإنسان", "التهاب بيدي بعد الحوض", "غسل اليدين بعد الحوض".

### Why standalone
**Zero coverage across 111 articles**, and the corpus actively creates the
exposure: it repeatedly instructs readers to put their hands in tank water — to
siphon, to plant, to catch fish, to clean glass — and never once mentions
covering broken skin or washing afterwards. This is the only gap identified in
the entire domain map whose consequence lands on the **keeper** rather than the
fish. It cannot be a section inside a fish-care article because its reader is
not asking about a fish.

### Cannibalisation check
| live article | owns | overlap | resolution |
|---|---|---|---|
| `human-medicine-dangers-for-fish` | human drugs harming **fish** | none — exact inverse direction | link, and note the inversion explicitly |
| `aquarium-electrical-safety` | electrical risk to the keeper | none — different hazard, same audience | link as the sibling safety article |
| `how-to-clean-aquarium-properly` | cleaning method | low | link; hygiene is a precaution around the same task |

**Verdict: no risk.** Nothing in the corpus addresses human health.

### Reference basis
*Mycobacterium marinum* is a recognised cause of cutaneous infection acquired
from aquarium water, commonly described in medical literature as "fish tank
granuloma" or "swimming pool granuloma". Entry is through broken skin. The
clinically important features for a lay article: it is **uncommon**, it presents
as a slow-developing nodule or ulcer typically on the hand or forearm, and it is
notable for being **slow to respond to ordinary treatment**, which is why the
exposure history matters to a doctor. Standard precautions are equally settled:
cover cuts, use waterproof gloves when skin is broken, wash after contact,
do not siphon by mouth.

Other recognised aquarium-associated exposures exist (for example enteric
bacteria from water contact), and the article treats them together under
ordinary hygiene rather than enumerating pathogens it cannot verify.

### Safety boundaries
- **Precaution and referral only.** The article describes hygiene and says when
  to see a doctor. It does not diagnose.
- Proportionality matters in both directions: understating leaves a real
  infection unattributed; overstating frightens people away from a safe hobby.
  The honest framing is *uncommon, avoidable, and worth mentioning to a doctor
  if it happens*.
- The mouth-siphoning warning is included because the practice is common and the
  advice is unambiguous.

### Claims that must NOT be made
- No diagnosis of any human condition, and no claim that a described lesion *is*
  a given infection.
- **No human medication named, no dose, no antibiotic** — including the fact that
  the condition is often described as antibiotic-resistant, which must be phrased
  as "slow to respond to usual treatment, so tell your doctor about the tank"
  rather than as treatment guidance.
- No prevalence, incidence or risk percentage — no figure this project can source.
- No claim that aquariums are dangerous to children, nor that they are safe;
  the article gives the precaution and stops.
- No immunocompromise advice beyond "if you have a condition affecting immunity,
  ask your doctor" — this project cannot responsibly go further.

---

## Dossier 3 — `fish-that-outgrow-home-tanks`

### Search / user intent
Two readers, one article. Pre-purchase: "هل تكبر هذي السمكة", "شنو حجمها لمّا
تكبر". Post-purchase, which is the more painful case: "سمكتي كبرت وما تسع
الحوض", "وين أخلي سمكة كبيرة". The article must serve both, because the second
reader is the first reader who did not find the page in time.

### Why standalone
`pangasius`, `shark-type sold small`, `fish lifespan` and `culling/rehoming`
all return **0**. The corpus warns about individual species inside their own
articles, but the *pattern* — sold at a fraction of adult size, in a shop tank
that conceals it — has no owner. And the exit question, what to do once it has
happened, is unowned anywhere.

### Cannibalisation check
| live article | owns | overlap | resolution |
|---|---|---|---|
| `how-many-fish-in-aquarium` | stocking **numbers** and bioload | **medium — the real risk** | resolved by axis: that article answers *how many*, this answers *how big does this one get, and should I buy it at all*. This one links there for the maths and does not restate the five factors. |
| `aquarium-loaches-guide` | clown loach adult size | small, deliberate | already makes this point for one species; this article generalises and links back |
| `oscar`, `arowana`, `koi` articles | per-species care | low | named as examples with links, not re-described |
| `raising-fish-fry` | where surplus fry go | low | rehoming advice is shared; this article owns the adult case, links to fry for the juvenile case |

**Verdict: medium risk, mitigated by axis separation.** The mitigation must be
visible in the draft: no restatement of stocking arithmetic.

### Reference basis
Well-documented adult sizes for commonly mis-sold species: iridescent shark /
pangasius (a large riverine catfish, routinely sold at a few centimetres),
common pleco, red-tail catfish, oscar, arowana, clown loach, koi. Exact maxima
vary by source and by conditions, so the article uses **relative** framing —
"many times its purchase size", "outgrows an ordinary home tank" — rather than
publishing centimetre figures it cannot verify per species.

The "grows to the size of its tank" belief is false as commonly understood:
stunting is a pathological outcome, not a benign adaptation, and it is already
stated as permanent in `raising-fish-fry`. This article reuses that position and
links rather than re-arguing it.

### Safety boundaries
- Rehoming advice must be realistic and must not encourage release into the
  wild, which is an ecological harm and in many places unlawful.
- The article must not moralise at a reader who already made the mistake; it
  gives options.

### Claims that must NOT be made
- No published maximum-size figures per species — relative framing only.
- No claim that a fish "grows to the size of its tank".
- No claim that AQUAVO buys back, takes in, or rehomes fish.
- No naming of shops that mis-sell.
- No legal claim about what is permitted in any jurisdiction.

---

## Dossier 4 — `fish-eye-problems`

### Search / user intent
A single, visually obvious symptom the reader can name without knowing anything
else: "عين سمكتي منتفخة", "عين بيضاء غائمة", "جحوظ العين". High-certainty query,
low-certainty cause.

### Why standalone
popeye and cloudy eye are both **0**, and the diagnosis hub was verified to
contain **zero** mentions of eyes — so the corpus's own symptom index cannot
answer its own reader here. The eye is worth owning because it carries an
unusually clean differential that a keeper can apply unaided.

### Cannibalisation check
| live article | owns | overlap | resolution |
|---|---|---|---|
| `fish-disease-symptoms-diagnosis` | symptom→cause index | **none in fact** — zero eye mentions, verified | this article becomes the eye branch the hub lacks; the hub should link to it |
| `fish-bloating-swim-bladder-dropsy` | systemic fluid accumulation | moderate — bilateral popeye can accompany systemic disease | handled by explicit cross-reference: both eyes + pineconing → read the dropsy article |
| `fish-fungus-vs-columnaris` | white patches | low — cloudy eye can be confused with surface fungus | one differentiating line plus a link |
| `fish-treatment-protocol` | how to treat | none — that owns method | link for the protocol; publish no dose here |

**Verdict: low risk**, and it repairs a hole in the hub.

### Reference basis
The differential is well established and genuinely useful to a layperson:

- **One eye affected** → most often local: physical injury, a knock against
  décor, aggression, or a localised infection following it.
- **Both eyes affected** → points away from injury and toward a systemic cause
  or water quality. Bilateral exophthalmia is commonly associated with systemic
  bacterial infection and with poor water conditions.
- **Cloudy cornea** is frequently associated with water quality and with
  physical or chemical irritation, and can accompany other conditions.

Exophthalmia is a **sign**, not a disease — the same framing already applied to
buoyancy and dropsy in the corrected `fish-bloating-swim-bladder-dropsy`. The
prognosis point that matters practically: an eye lost or badly damaged may not
recover, but a one-eyed fish can live normally, which is worth telling a keeper
deciding whether to intervene drastically.

### Safety boundaries
- Sign, not diagnosis. Same discipline as the parasite hub: one visible sign
  does not equal one cause.
- Water testing precedes treatment, consistent with the whole corpus.
- No dose, no compound.

### Claims that must NOT be made
- No named antibiotic or dose.
- No claim that popeye is always bacterial, or always fatal, or always curable.
- No Epsom-salt protocol with a concentration — the practice is widely repeated
  in hobby sources but the evidence is thin and doses vary; if mentioned at all
  it must be flagged as contested and undosed, consistent with how
  `aquarium-salt-guide` handles the scaleless-fish dispute.
- No claim that a cloudy eye reliably indicates any single condition.
