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

---

# Pass 4 — deterministic review and QA (2026-09-20)

From commit `11c08b78`. No provider was available, so every correction below is verified
against the Arabic source or against a measurement, never against a model's opinion.
Production was not written. No row was marked `reviewed`. No locale was released.

## The "dropped block" was not a dropped block

`real-vs-fake-plants-iraq` was registered as "Kurdish has 27 blocks against the Arabic 28,
everything after block 11 is shifted". The paragraph is present and correctly translated.
Its opening tag had lost its `>`:

```
<pنەک سازش، بەڵکو بڕیارێک. چەند حاڵەتێک هەیە...</p>
```

A browser parses `<pنەک` as an unknown element and swallows the rest as attributes, so the
paragraph never renders. The validator counts headings, list items, tables and images —
not paragraphs — which is why it passed. Fixed by restoring the `>`; no translated word
changed.

A sweep for the same class across both corpora found exactly one more:
`small-schooling-fish-selection` (ckb) had a table row whose `<tr>` was missing, leaving
`<tr>` 8 open / 9 closed. Also fixed. Both corpora are now structurally clean, and all
three locales of the plants article align at 45 units.

## Kurdish translated a URL

`دليل-شامل-عن-الفلترة-والتنقية...` (ckb) had rewritten the Arabic letters **inside the
href**: `ي`→`ی` and `ك`→`ک`, giving `/الفلترة-والتنقیة/الفلتر-المیکانیکی`. Both internal
links were dead. The English kept the href and translated only the link text, which is
correct. Restored; hrefs are now byte-identical to the source.

## Every product reviewed, both locales

The per-slug record of which products pass 2 reached was never persisted, so the exact
"14 EN / 2 CKB" could not be recovered. Instead all 107 products were reviewed in both
locales with checks the validator does not make: array-length parity across
`benefits` / `usageInstructions` / `safetyWarnings`, model codes surviving into the target
name, blank array entries, and numbers present in the target but nowhere in the Arabic
record.

**Result: 0 findings in either locale.** No dropped bullet, no lost model code, no invented
figure. The register's "invented `fits substrates up to 52×26 mm`" on `houyi-planting-ring`
does not reproduce — that product now carries no number absent from its Arabic record.

The one real defect class found was subcategory inconsistency: one Arabic subcategory
rendered several different ways, which splits the storefront's facet filters.

- **English — fixed.** 17 labels across 9 Arabic subcategories normalised, including the
  register's own example (`إكسسوارات` → "Accessories" ×9 vs "Decor" ×1). Two are editorial
  calls worth a second opinion: "Mounting Clamps" (neither existing form was accurate —
  مشبك is a clamp, not a bracket) and "Fish Nets" (aquarium nets, not angling nets).
- **Kurdish — not touched,** as instructed. Choosing between `تۆڕی ماسیگرتن` and
  `تۆڕەکانی ڕاوکردن` is native-language judgement. Ten Arabic subcategories are affected.

## Every article reviewed, both locales

All 117 articles in both locales were checked for link-target drift, link-count parity,
dead internal `/blog/<slug>` targets, paragraph-count parity and malformed tags.
After the two structural fixes and the href fix, **0 findings remain**.

This is deterministic coverage of 117/117, not a model reading 117 articles. The prose
quality of the 82 articles outside the high-risk set still has had no linguistic review in
either locale.

## Browser QA

Against a local server on mock storage (no production data touched).

| | result |
|---|---|
| Playwright i18n suite | **84 passed, 0 failed, 2 skipped** |
| pages × locales × viewports | 11 × 3 × 2 = **66 screenshots** in `e2e-artifacts/i18n/` |
| covered | home, products, category, product, blog, guide, login, register, order-tracking, checkout, 404 |
| also asserted | `lang`/`dir` per locale, language selector lists all three, equivalent-page switching, direct URL access, cookie persistence, cart survives a language switch |

The 2 skips are the catalogue-backed BiDi check in `i18n-locales.spec.ts`, which skips
whenever the server has no products. That check is now superseded by the dedicated suite
below, which needs no database.

**Not covered by this run:** cart, invoice, account and orders pages need a seeded
catalogue and a signed-in session; the mock-storage server serves neither. Those four
surfaces remain unverified in a browser.

## BiDi stress test

New suite `e2e/i18n-bidi.spec.ts`. It takes the real strings off disk — 1004 mixed-direction
ckb strings and 917 ar — renders them at the locale's own direction and measures what the
bidi algorithm produced, rather than asserting on a heuristic.

**Arabic is included as a control.** It is the source language and already in production,
so any pattern it also shows is inherent RTL rendering rather than something the
translation introduced.

One real defect, confirmed by reading back the visual character order:

```
logical: متوسط (50-150 لتر)
visual : )رتل 150-50( طسوتم        the shopper reads 150-50
logical: تغذية 4-6 مرات يومياً
visual : اًيموي تارم 6-4 ةيذغت      the shopper reads 6-4
```

**Hyphenated numeric ranges render with their two numbers swapped in RTL.** It affects
Arabic (54 occurrences) slightly more than Kurdish (49), so it is a pre-existing storefront
bug, not an i18n regression. The fix belongs in the rendering layer — wrap the range in
`<bdi>` or `unicode-bidi: isolate` — and never in the translated strings, because the
validator correctly rejects explicit bidi control characters in content.

**This needs a product decision, because fixing it changes Arabic production rendering.**

The suite's gate is therefore parity with Arabic, not zero findings: ckb must show no
pattern ar does not. That currently passes. Zero explicit bidi control characters in either
locale.

## Search quality — a real defect, found and fixed

`normalizeSearchText` folds Arabic orthographic variants, but its rules predate the Sorani
catalogue. Sorani writes **ی (U+06CC)** and **ک (U+06A9)**; Arabic writes **ي (U+064A)** and
**ك (U+0643)**. Neither pair was unified.

Measured against the real catalogue: **91 of 107 Kurdish product names — 85% — could not be
found at all from an Arabic keyboard**, which is the common input method in Iraq. Typing
`فلتەري ئيسفەنجي` returned nothing for `فلتەری ئیسفەنجی`.

Fixed by folding ی→ي and ک→ك in the normaliser only. It never touches displayed text.

| | before | after |
|---|---|---|
| ckb findable from own name | 107/107 | 107/107 |
| ckb findable from Arabic keyboard | **16/107** | **107/107** |
| en findable from own name | 107/107 | 107/107 |

Pinned by `test/i18n/search-quality.test.ts` (9 tests), which runs against the real product
names, not fixtures. One known-harmless rule is left alone and documented: `ئ`→`ي` mangles
the Sorani index but is applied to query and index alike, so matching is unaffected.

## Gate results

| gate | pass 3 | pass 4 |
|---|---|---|
| validator errors | 0 | **0** |
| validator warnings | 311 | **311** |
| content audit findings | 34 | **34** |
| client typecheck | 0 | **0** |
| api typecheck | 0 | **0** |
| vitest (i18n + cart + lib) | — | **297 passed, 1 failed** |
| Playwright i18n | — | **84 passed, 2 skipped** |
| product review coverage | 93 en / 105 ckb | **107/107 both, deterministic** |
| article review coverage | 35/117 high-risk | **117/117 deterministic**, 35/117 linguistic |

The single vitest failure is `whatsapp-coverage.test.ts` › "the surfaces the audit named are
all present and wired" (`order-confirmation`). It is **pre-existing**: it fails identically at
`11c08b78` with this pass's changes stashed. Unrelated to i18n and left alone.

Warnings stayed at 311 because nothing in this pass touched Kurdish vocabulary — instruction
9 explicitly reserved those 86 for native judgement.

## Genuinely needs a native Sorani speaker

1. The systematic vocabulary table from pass 2 (gills, dose, shell, bloating, evaporation,
   tap water ×49, snail, infection, localized, labyrinth organ, stage, dropsy, fertilizing,
   hobby).
2. The 86 glossary-consistency blocks surfaced in pass 3 (freshwater 32, discount 14,
   point 8, livebearers 7, terms-and-conditions 6, loyalty 6, track-order 4, …).
3. The 20 glossary terms added in pass 3, all still flagged `needsNativeReview: true`,
   including the four this pass leaned on: کرێ (fee), داشکاندن (discount), خاڵ (point),
   باڵانس (balance).
4. The 10 Kurdish subcategory labels left inconsistent on purpose.
5. Prose quality of all 117 Kurdish articles — the 35 high-risk set had model review only,
   the other 82 have had none.
6. The four sections retranslated in pass 3. They are one model's Sorani replacing a weaker
   model's Sorani; no human has read them.

## Genuinely needs an LLM provider

1. Re-running `translate-content.ts` / `translate-ui.ts` for any bulk regeneration.
2. Model-assisted linguistic review of the 82 articles outside the high-risk set, in both
   locales.
3. Regenerating the Kurdish articles against a corrected glossary once a native speaker has
   settled the vocabulary table — the register's release condition #2.
4. Re-translating the five Arabic words still embedded in the Kurdish corpus
   (حراشف, حاسبات, الإسالة, تدریجی, قاعیدی).

Both are hard blockers; neither is a matter of effort.

## Needs a decision, not a translator

1. **The BiDi numeric-range swap.** Real, measured, affects Arabic production. Fixing it
   means changing storefront rendering for all three locales.
2. **`activated-carbon-aquarium-when-to-use`** — still flagged only, translations untouched
   as instructed. The Arabic contradicts itself and must be corrected at source first.
3. **Cart / invoice / account / orders browser QA** — needs a seeded catalogue and a session.

## Readiness — unchanged

| | EN | CKB |
|---|---|---|
| Technical | yes | yes |
| Automated QA | yes | yes |
| Linguistic review | no | no |
| Native human review | **no** | **no** |
| Release ready | **no** | **no** |

Zero rows are marked `reviewed`.
