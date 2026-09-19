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
| Kurdish products | in progress | | | |
| UI namespaces (en + ckb) | in progress | | | |
| All product names, both locales | 214 / 214 | | | 12 |

High-risk was defined as an article scoring >= 24 on a weighted count of nitrogen-cycle,
disease and treatment, water-conditioning, temperature, water-parameter, toxicity and
dosing terms in the Arabic source. That set is 35 articles; 83 of 117 score >= 12.

## Severity summary

| severity | found | fixed in this pass | open |
|---|---|---|---|
| SAFETY (advice reversed, warning gutted) | 6 | 5 | 1 |
| CHEMISTRY (wrong compound) | 1 | 1 | 0 |
| FACTUAL (number, duration, identity) | 3 | 2 | 1 |
| IDENTITY (product name loses what distinguishes it) | 7 | 4 | 3 |
| TECHNICAL (spec wrong or invented) | 12 | 6 | 6 |
| INVENTED / overclaim | 13 | 1 | 12 |
| MEANING | 32 | 8 | 24 |
| LANGUAGE / quality | 45 | 18 | 27 |
| **total** | **119** | **45** | **74** |

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
