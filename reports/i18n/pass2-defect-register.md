# Quality review pass 2 — defect register (2026-09-20)

Branch `feat/i18n-trilingual`, from commit b327820e. Production was **not** written
during this pass. No row was marked `reviewed`. No locale was released.

## Review method, stated honestly

| method | what it means | used for |
|---|---|---|
| A. automated | scripted checks against the Arabic source (validator, content audit) | everything |
| B. model-assisted linguistic review | an AI model read the Arabic and the translation side by side, block by block | the article, product and UI reviews below |
| C. native human review | a fluent Sorani or English speaker read the copy | **none of it** |

Nothing in this corpus has had native human review. Every "clean" verdict below is a
model's judgement, and the defect density found in pass 2 shows that a model reading
carefully still finds errors that a model writing carefully produced. Treat "clean"
as "no defect found by a second model", not as "correct".

## Coverage

| set | reviewed | clean | with defects | defects |
|---|---|---|---|---|
| Kurdish high-risk articles | 35 / 35 | 11 | 24 | 58 |
| English high-risk articles | 35 / 35 | 23 | 12 | 14 |
| English products | 93 / 107 | 51 | 42 | 47 |
| Kurdish products | 105 / 107 | ~45 | ~60 | 73 |
| UI namespaces, en + ckb | cart, checkout, orders, errors and all policy pages 100%; common, nav, search 100%; products, product, account, home sampled | | | 99 |
| All product names, both locales | 214 / 214 | | | 12 |

High-risk was defined as an article scoring >= 24 on a weighted count of nitrogen-cycle,
disease and treatment, water-conditioning, temperature, water-parameter, toxicity and
dosing terms in the Arabic source. That set is 35 articles; 83 of 117 score >= 12.

## Severity summary

| severity | found | fixed in this pass | open |
|---|---|---|---|
| SAFETY (advice reversed, warning gutted) | 14 | 6 | 8 |
| CHEMISTRY (wrong compound) | 1 | 1 | 0 |
| FACTUAL (number, duration, identity) | 6 | 4 | 2 |
| IDENTITY (name loses what distinguishes it) | 14 | 6 | 8 |
| TECHNICAL (spec wrong or invented) | 28 | 8 | 20 |
| INVENTED / overclaim | 14 | 2 | 12 |
| MEANING | 70 | 13 | 57 |
| LANGUAGE / quality | 114 | 12 | 102 |
| POLICY (a business or legal promise changed) | 10 | 8 | 2 |
| COHERENCE (one concept, several names across the flow) | 20 | 6 | 14 |
| **total** | **291** | **66** | **225** |

## The most serious findings

1. **Kurdish, ammonia emergency, filter rinsing — fixed.** The Arabic says *do not rinse
   filter media in tap water*. The Kurdish said *do not rinse it in tank water*, which
   forbids the correct practice and implies tap water is acceptable. The same reversal
   appeared again in the causes list, and the link to the tap-water treatment article was
   relabelled as tank-water preparation. A reader following the Kurdish during an ammonia
   spike would have destroyed the biofilter mid-crisis.
2. **Kurdish, RO vs tap water — fixed.** "Tap water is highly chlorinated" became "the
   aquarium water is highly chlorinated", in the article whose whole subject is that comparison.
3. **Kurdish, cloudy water — fixed.** Green water was attributed to high *nitrite*; the
   Arabic and the rest of the same article say *nitrate*.
4. **Kurdish, oxygen advice — fixed.** "An open, non-stagnant surface" became "an open,
   non-moving surface", reversing the article's central point that surface movement is what matters.
5. **English, dutch sand — fixed.** The Arabic warns against assuming the sand does *or does
   not* change water chemistry without testing. Half the warning had been dropped.
6. **English, fungus vs columnaris — fixed.** "White fuzz" had become "white slime", which
   destroys the one visual distinction the page exists to teach.

## Open defects by area

### Kurdish articles (47 open)

Systematic vocabulary errors, each appearing across several articles. These need a
decision from a native speaker before they are changed, because the corpus itself is
inconsistent and I cannot verify Sorani usage:

| concept | wrong renderings found | appears in |
|---|---|---|
| gills (خياشيم) | گەروو (throat), پەراسوو (ribs), گەڵوو (throat), گونجاو (suitable) | 6 articles; گەڵۆف is used correctly in one |
| dose (جرعة) | ژەم (meal) | 2 articles, both in dosing rules |
| shell (صدفة) | قەفەس (cage) | 3 blocks of the shrimp and snail guide |
| bloating (انتفاخ) | قەڵەو (obese) | 2 articles including a title |
| evaporation (التبخر) | هەڵمژین (absorption) | 2 articles |
| possible (ممكن) | گونجاو (suitable) | 3 blocks, turning physical ceilings into recommendations |
| tap water (ماء الحنفية) | ئاوی شیر (milk water) 49x, ئاوی تەندور (tandoor water) | corpus-wide |
| snail (حلزون) | هەنگوێن (honey) | 2 blocks |
| infection (عدوى) | هەوکردن (inflammation) | 2 articles |
| localized (موضعي) | ناوچەیی (regional), ناوخۆیی (internal) | 2 articles |
| labyrinth organ | ئەندامی تێکەڵاو (mixed organ) | 1 article |
| stage (طور) | تۆر (net) | 1 article, in the treatment-course rationale |
| dropsy (الاستسقاء) | ئیستیسقا (transliterated, opaque) | 5 blocks |
| fertilizing (تسميد) | گژوگیاکردن (weeding) | 3 blocks |
| hobby (هواية) | خولیای ماسیگرتن (angling) | 1 block |

Also open: one dropped source block in `real-vs-fake-plants-iraq` (Kurdish has 27 blocks
against the Arabic 28, and everything after block 11 is shifted), and Arabic words left
untranslated (حراشف, حاسبات, الإسالة, تدریجی, قاعیدی, الولودة).

### English articles (6 open)

`first-aquarium-setup-guide` headings flatten "order" to "setup", losing the thesis;
`quarantine-new-fish-guide` drops "within days" from the latency statement;
`how-to-treat-tap-water-for-fish-iraq` block 26 points "there" at the wrong article;
`fish-that-live-without-filter` block 17 reads as machine English;
`common-fish-diseases-white-spot` block 11 has a confusing second clause;
`molly-platy-breeding-save-fry` block 29 is ungrammatical.

### English products (33 open)

Seven identity problems where the name no longer says what the product is
(`c4-1008`, `ysl-506`, `yan-915`, `mshbk-tthbyt-khrtwm-ala-alhwd` and others), twelve
"helps X" hedges hardened into absolute claims, and subcategory words that are wrong or
inconsistent (a skimmer filed as "Surface Scrapers", the same Arabic subcategory rendered
"Decor" on one product and "Accessories" everywhere else). `houyi-planting-ring` still
carries an invented "fits substrates up to 52×26 mm".

## A source-side issue, not a translation defect

`activated-carbon-aquarium-when-to-use` contradicts itself **in the Arabic**: several
blocks say activated carbon absorbs ammonia and nitrite and should be added when those
are high, and a later block correctly says it does not treat ammonia. Both translations
reproduce the contradiction faithfully. This needs an editorial fix in the Arabic first,
after which all three locales change together. The same article contains a Persian word
in the Arabic source.

## What would make this releasable

1. A native Sorani speaker settles the vocabulary table above, and those decisions go
   into `shared/i18n/glossary.json`.
2. The affected Kurdish articles are retranslated against the corrected glossary, or
   corrected by hand, and re-reviewed.
3. The open English product claims are brought back to what the Arabic supports.
4. The Arabic contradiction in the activated-carbon article is resolved at source.
5. Only then does anything move from `machine` to `reviewed`, and only for what a person
   actually read.

## Added after the last two reviewers reported

### Kurdish UI is the weakest area in the whole project

The reviewer who read `cart`, `checkout`, `orders`, `errors` and every policy page in
full concluded that `pages:terms`, `pages:shipping`, `account:profile-loyalty` and
`orders:invoice-view` "read as unedited machine output and should be retranslated
rather than patched". Examples, all fixed or registered:

- the Diamond loyalty tier was named **ماسی**, which means *fish*
- loyalty itself was named **سووکاری**, which means *frivolity or contempt*
- the survey call to action said **پرسە**, which is a *funeral ceremony*
- the customer's credit was labelled **قەرز**, which means *debt*
- "Refunded" read as *picked up the money*
- the replacement window said *within the first three days 7 days*
- *force majeure* became *boring circumstances*; *competent courts* became *independent courts*
- the Kurdish printed invoice still declares `<html lang="ar" dir="rtl">`

### English had fewer but still customer-facing defects

- notification timestamps: hours were labelled *sec* and days were labelled *yr*
- an invoice line promised *you will receive a refund* where the Arabic is counterfactual
- the legal entity was invented twice, spelled two different ways, when the Arabic
  gives the trade name as AL NABEA SHOP
- the contact page was titled *Contact them*

### Corpus-wide Kurdish consistency clusters still open

One Arabic concept rendered several ways: glue (4 words), porous (2), filtration (2),
clamp (3), suction cup (4), tweezers (3), powder in fish food (3), quarantine (3),
subtotal (4), discount (4), loyalty (4), track your order (5), terms and conditions (3),
phone number (2), quantity (2), encyclopedia (4). A shopper moving from the product card
to the cart to the invoice sees a different word for the same thing at each step.

---

# Pass 3 — correction pass (2026-09-20)

Branch `feat/i18n-trilingual`, from commit d7c7372e. Production was **not** written during
this pass. No row was marked `reviewed`. No locale was released. All edits are local files.

## Blocker found first: no translation provider is available

`GOOGLE_AI_API_KEY` is present but both `gemini-2.5-flash` and `gemini-2.5-flash-lite`
return **HTTP 402 "prepayment credits are depleted"**. `GROQ_API_KEY` is **absent** from
the environment entirely. Both providers in `TOOLS/i18n/_llm.ts` are therefore unusable,
so `translate-ui.ts` / `translate-content.ts` cannot run at all.

The four Kurdish sections were consequently retranslated **by the assistant directly**,
not by the pipeline. That is still method B (model-assisted), not method C (native human).

## Method, restated

Unchanged from pass 2. Nothing in this pass had native human review. The Sorani written
here is a model's Sorani; it replaces a weaker model's Sorani. It is not verified.

## What was corrected

### 1. The four Kurdish sections, retranslated rather than patched

`pages:terms` (65), `pages:shipping` (19), `account:profile-loyalty` (92),
`orders:invoice-view` (41) — 217 keys read against the Arabic, **150 rewritten**, 67 kept.
Applied through a guard that aborts on any `{{placeholder}}` or digit-run mismatch with
the Arabic source.

Several defects pass 2 recorded as *fixed* were found **still live** in the bundles:

| where | was | meant |
|---|---|---|
| `profile-loyalty.s40` | پرسە — a *funeral ceremony* | ڕاپرسی — survey |
| `profile-loyalty.s25` | قەرزی ماوە — *remaining debt* | باڵانسی ماوە — remaining balance |
| `profile-loyalty.s26` | قەرزی سارد — *cold debt* | باڵانسە بەستووەکان — frozen balances |
| `terms.s18` | بارودۆخی بێزار — *boring circumstances* | بارودۆخی ناچاری — force majeure |
| `terms.s56` | دادگای سەربەخۆیی — *independent courts* | دادگا تایبەتمەندەکان — competent courts |
| `terms.s61` | هەڕەشە — a *threat* | پرسیار — an inquiry |

Newly found in the same sections, not previously registered:

- `shipping.s4` read **تکایە جێگیرکردنی گەیاندن** — "please fixing of delivery". The word
  for *fee* was absent from `shipping.s4`, `s10`, `s13` and `s19`; أجرة had been read as
  "fixed" and the fee itself dropped. This is the flat 5,000 IQD delivery-fee copy.
- `invoice-view.s19` / `s38` rendered **الخصم** (discount) as **دابەش**, which means
  *division*. A money line on the invoice.
- `invoice-view.s18` rendered **المجموع الفرعي** (subtotal) as **کۆی سەربەخۆ**,
  "independent total".
- `invoice-view.s33` reproduced the counterfactual bug already registered for English:
  the Arabic is *had you registered, you would have got back*; the Kurdish promised a
  future refund. Now counterfactual in both.
- `invoice-view.s11` / `s41` used **فروشگا**, a Persian spelling, for *shop*.
- `profile-loyalty` used **نقطە** and **خاڵ** for *point* in the same panel, and
  **وفاداری** / **لۆیالتی** for *loyalty*. `s17` rendered *challenge* as **هەژمار**
  (account), `s14` *reward* as **خەریکی** (busy), `s49` *saltwater* as **ئاوی خەڵە**,
  `s58` *tank age* as **تەواوی حەوز** ("completeness of tank").

### 2. A defect class the register did not cover: untranslated Arabic in code

`client/src/components/cart/invoice-dialog.tsx` passed six Arabic string literals straight
into the printed invoice and the WhatsApp share text, bypassing i18n entirely. The English
and Kurdish invoices printed Arabic for *loyalty points*, *credit added*, *paid online*,
*pay in cash*, *points* and *link*. Added as `orders:invoice-dialog.s62..s67` in all three
bundles and wired through `t()`. The Arabic values are the previous literals verbatim, so
the Arabic invoice is unchanged.

The Kurdish printed invoice also still declared `<html lang="ar" dir="rtl">`; it now
declares `lang="ckb"`.

A sweep of the rest of `client/src` for hardcoded Arabic found 637 literals in
customer-facing files, but sampling showed these are correct by design — Arabic source
constants fed to localized props (`home-hero`), and canonical category keys used for
matching (`category-scroll-bar`). Only `invoice-dialog` was leaking to users.

### 3. The twelve hardened English claims

The register's "twelve 'helps X' hedges hardened into absolute claims" were located
exactly: 36 Arabic product benefits carry a hedge (يساعد على / يمكن أن), and 12 English
renderings dropped it. All 12 restored, each guarded on its expected prior value:

`houyi-net-bag` *Prevents* → *Helps prevent*; `houyi-check-valve` *Prevents water from
flowing back* → *Helps prevent*; `houyi-gauze-isolation-net` *Protects fry* → *Helps
protect fry*; `houyi-tracheal-suction` *Secures* / *Organizes* → *Helps secure* / *Helps
organize*; `houyi-air-distributor` *Enables* → *Helps run*; `houyi-stainless-shunt`
*Distributes* → *Helps distribute*; `houyi-medium-cotton` *Creates* → *Helps create*;
`houyi-acrylic-tool-rack` *Keeps* → *Helps keep*; `houyi-koi-fish-net` *keeps the fish
inside* → *helps keep*; `houyi-dutch-sand` *Visually integrates* → *Can be visually
combined*; `houyi-terminalia-leaves` *Provides* → *Can add*.

Note the content auditor's `claims/en` count does **not** move on this fix: it keyword-
matches "prevent/treat/cure/guaranteed", and "Helps prevent" still contains "prevent".

### 4. One Arabic word left in the Kurdish corpus

`ph-level-iraqi-tap-water-fish` carried **الولودة** / **ولودة** (livebearers) untranslated
in two places; now **زیندووزاکان** / **ماسییە زیندووزاکان**. The remaining five words the
register lists (حراشف, حاسبات, الإسالة, تدریجی, قاعیدی) were not reached this pass.

### 5. Glossary: twenty commerce terms recorded

Release condition #1 asks for the disputed vocabulary to be settled in
`shared/i18n/glossary.json`. Twenty terms were added, each carrying
`needsNativeReview: true`, covering the clusters the register named: point, loyalty,
loyalty-point, discount, subtotal, grand-total, fee, delivery-fee, balance, track-order,
invoice, terms-and-conditions, survey, reward, upgrade-tier, freshwater, saltwater,
force-majeure, competent-courts, livebearers.

**These are a model's choices, not a native speaker's.** They are recorded in one place
precisely so a reviewer can overturn any of them with a single edit.

## Gate results

| gate | before | after |
|---|---|---|
| validator errors | 0 | **0** |
| validator warnings | 234 | **311** |
| content audit findings | 36 | **34** |
| client typecheck | 0 | **0** |
| api typecheck | 0 | **0** |
| i18n + cart vitest | — | **48 passed** |

### Why warnings went up, honestly

Warnings fell 234 → 225 on the retranslation. They then rose to 311 because the 20 new
glossary terms made the validator stricter: 86 previously-invisible inconsistencies became
countable. Nothing regressed — errors stayed at 0 throughout. The instrument changed, not
the corpus quality.

The 86 are a concrete worklist:

| concept | blocks disagreeing | agreed Sorani |
|---|---|---|
| freshwater (مياه عذبة) | 32 | ئاوی شیرین |
| discount (الخصم) | 14 | داشکاندن |
| point (نقطة) | 8 | خاڵ |
| livebearers | 7 | زیندووزاکان |
| terms and conditions | 6 | مەرج و ڕێساکان |
| loyalty (الولاء) | 6 | وفاداری |
| track your order | 4 | بەدواداچوونی داواکاری |
| subtotal, invoice | 2 each | کۆی لاوەکی / فاکتۆر |
| loyalty-point, fee, grand-total, reward, upgrade-tier | 1 each | — |

## What the 34 remaining audit findings are

Checked, not assumed:

- **`claims/en` 17** — keyword false positives. The matcher does not read polarity or
  sense: it flags *"Allow the silicone to fully **cure**"* (chemical), *"does not
  **prevent** disease transmission"* (a negative disclaimer), *"Do not treat the 0.1°C
  reading as a **guaranteed** accuracy"* (a disclaimer), and *"the amount of water you
  wish to **treat**"* (water treatment).
- **`numbers/en` 13 and `numbers/ckb` 4** — verified two by hand against the Arabic:
  `nitrogen-cycle` "between day 14 and 20" is correct, the Arabic spells the numerals out
  (الرابع عشر والعشرين); `arowana` 50000/200000 is correct, the Arabic says 50 ألف / 200
  ألف. The rest are numbers inside translated cross-link titles ("50°C", "3D", "5 Hardy
  Fish"). No invented figure was found.

## Still open, and not attempted this pass

1. The Kurdish systematic vocabulary table (gills, dose, shell, bloating, evaporation,
   tap water ×49, snail, infection, localized, labyrinth organ, stage, dropsy,
   fertilizing, hobby). Unchanged — these need a native speaker, not another model.
2. The dropped source block in `real-vs-fake-plants-iraq` (27 Kurdish vs 28 Arabic).
3. The remaining product reviews: CKB 2, EN 14.
4. Article review beyond the 35 high-risk set (83 of 117 score >= 12).
5. The 86 newly-countable consistency blocks above.
6. `activated-carbon-aquarium-when-to-use` — **still an Arabic source contradiction**.
   Not touched, as instructed. Needs an editorial decision in the Arabic first.
7. Browser QA, screenshots, BiDi stress test, search-quality test, UI review manifest.

## Readiness — unchanged

| | EN | CKB |
|---|---|---|
| Technical | yes | yes |
| Automated QA | yes | yes |
| Linguistic review | no | no |
| Native human review | **no** | **no** |
| Release ready | **no** | **no** |

Zero rows are marked `reviewed`. Kurdish remains unfit to release. English is closer but
has had no native review either.
