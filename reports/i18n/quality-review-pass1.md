# Translation quality review, pass 1 (2026-09-20)

Branch `feat/i18n-trilingual`, from commit d522163f. Nothing was marked `reviewed`;
every production row is still `machine`. No merge, no deploy, release flags untouched.

## Warning classification (starting inventory: 1101)

| class | meaning | count | what was done |
|---|---|---|---|
| A | genuine translation defect | 84 | corrected in the data (list below) |
| B | valid alternative wording | 182 | accepted: the alternative was added to the glossary or left as a reported variant |
| C | false positive of the validator or the glossary | 761 | the checker or the glossary entry was corrected, not the copy |
| D | technical / proper-name exception | 2 | documented and exempted in the checker |
| E | style improvement only | 3 | applied (product naming, article title) |

Warnings after the pass: **237**, all of class B (a real competing Sorani form
that is also natural). Errors: **0**.

## A. Genuine defects corrected

| defect | count | note |
|---|---|---|
| nitrate translated as nitrite | 4 | 2 Kurdish articles, 1 Kurdish guide string, 1 English article. Different compound, different toxicity. |
| currency mark: `IQD` in Kurdish strings | 21 | the app renders `د.ع` for Kurdish, so a page showed two currency marks |
| litre spelled لیتڕ / لیتەر | 18 | normalised to لیتر |
| heater written as the English loanword هێتر / هیتر | 7 | normalised to گەرمکەر |
| "development" where the Arabic says reproduction | 6 | breeding calculator only |
| bacteria spelled بکتریا / باکتریا | 6 | normalised to بەکتریا |
| ammonia misspelled ئەموڤیا | 4 | normalised to ئەمۆنیا |
| Persian دارو for medicine | 3 | replaced with Sorani دەرمان |
| بچوک | 3 | normalised to بچووک |
| Arabic loanword مزیلەری for dechlorinator | 2 | replaced with لابەری |
| chlorine spelled کڵۆر | 2 | normalised to کلۆر |
| warranty spelled گارانتی | 2 | normalised to گەرەنتی |
| net spelled تور | 2 | normalised to تۆڕ (guarded against فاکتور) |
| product name dropped "dechlorinator" | 1 | yyh-039 |
| invented brand prefix "General" | 2 | the Arabic names carry no brand |
| "A Simple Explanation in Arabic" on an English page | 1 | describes the source, not the article |

A new **chem-term** validator check now fails the build when a water-chemistry
compound named in the source is not named in the translation, so the
nitrate/nitrite class cannot recur silently.

## C. Validator and glossary corrections (no copy was changed)

- Arabic word boundary: the term matcher allowed any single letter before a term, so
  `سم` (cm) matched inside `اسم` (name), `تسجيل` (register) inside `تسجيل الدخول`
  (sign in), and `لتر` (litre) inside `فلتر` (filter). Only the article and its
  combined forms may now precede a term.
- Punctuation: 93 warnings were created by the checker itself. Stripping
  `<strong>x</strong>.` to compare text left `x .`, which then looked like a space
  before a comma. The strip now closes that space. All 93 disappeared.
- `latin-heavy` compared absolute Latin density, flagging a diagnostic string that is
  Latin in the source too. It now compares against the source.
- `small-number` flagged "4" rendered as "four" / "چوار". Spelled-out numbers are accepted.
- Governorate names are identical in Arabic and Sorani by design and no longer count as untranslated.
- The chlorine pattern demanded the exact word, so "dechlorinator" looked like a
  dropped term; it now matches the stem and excludes "chloride".
- Glossary modelling: `الدفع` (payment) had been filed under checkout, and
  `فيتامينات` (vitamins) under supplements. Both are now their own concepts.
  Over-specific preferred terms (`خۆراکی ماسی`, `کیتی پشکنینی ئاو`, `خوێی حەوز`,
  `خاوێنکەرەوەی شووشە`) were shortened to the form shoppers use, with the long form kept.

## B. Accepted alternatives

Where two forms are both natural Sorani, both are now accepted rather than forced into
one: `دیکۆر` / `ڕازاندنەوە`, `گەرمکەر` / `گەرمکەرەوە`, `سروشتی` / `ئاسایی`,
`پلەی گەرمی` / `گەرما`, `ڕەقی ئاو` / `تفتێتی`, `مامناوەند` / `ناوەند`,
`لابەری کلۆر` / `سڕاوەی کلۆر`, and others recorded in `shared/i18n/glossary.json`.

The remaining 237 warnings are of this kind. They are reported, not suppressed:
`reports/i18n/glossary-review.md` lists every concept with its competing forms,
frequencies and samples, so a native reviewer can settle each one.

## English linguistic review (sample)

Products sampled across filters, tools, water treatment and food; articles sampled
across chemistry and seasonal care. The copy reads as professional ecommerce English,
Iraqi idiom is rephrased rather than calqued, technical values, brands and model codes
survive, and SEO titles stay within length. Three defects were found and fixed (above).

## Open item

Production rows were seeded before this pass, so the 464 rows in
`content_translations` still contain the defects corrected here, including the
nitrate/nitrite errors. Re-seeding is a production write and is not covered by the
earlier approval.
