# AQUAVO — CKB terminology resolution record — 2026-09-21

This file supersedes the earlier 18-item release-blocking native-review checklist.

The decisions below were resolved by source-backed research, corpus/context review, and
explicit descriptive wording where a compact Sorani term could not be safely attested.
**This is not a claim of native-human review.** No model-authored text is marked as
human-reviewed.

| ID | concept | release wording / decision | basis |
|---|---|---|---|
| D01 | aquarium heater | `گەرمکەر` (allow `گەرمکەرەوە` in prose) | established corpus usage + Kurdish technical usage |
| D02 | thermostat | `تەرموستات` | standardized transparent technical loan |
| D03 | aeration | `هەواگۆڕکێ`; use explicit oxygen wording where the sentence requires it | Kurdish technical/government usage; context distinguishes it from filtration |
| D04 | mechanical / biological filtration | `پاڵاوتنی میکانیکی` / `پاڵاوتنی بایۆلۆجی` | meaning-preserving technical pair |
| D05 | chloramine | `کلۆرامین`, distinct from `کلۆر` | chemical identity preserved |
| D06 | dechlorinator | `لابەری کلۆر`; broader water conditioner remains `ئامادەکەری ئاو` | keeps two different product concepts separate |
| D07 | beneficial bacteria | `بەکتریای سوودبەخش` | attested Sorani usage |
| D08 | aquarium cycling | `سووڕی نایترۆجین` when the nitrogen cycle is meant; descriptive biological-cycle wording where source is broader | chemistry meaning preserved |
| D09 | algae | `قەوزە` | dictionary/Wikipedia-backed; 187 corpus occurrences standardized |
| D10 | livebearers | descriptive `ماسییەکان کە بێچووی زیندوو لەدایک دەکەن`; compact UI `ماسیی زیندوولەدایکبوو` | avoids inventing an unattested one-word label |
| D11 | dose / dosing | `ژەمی دەرمان` for a medication dose; `بڕی دەرمان` where the sentence emphasizes quantity | `ژەمی دەرمان` is attested in current Sorani medical reporting |
| D12 | fish gills | `ڕیشوو` | throat/rib mistranslations removed contextually |
| D13 | loyalty tier | `ئاست`; upgrade `بەرزکردنەوەی ئاست` | clear commerce wording, separated from ranking sense |
| D14 | customer/store credit | `باڵانس` / `باڵانسی کڕیار` | avoids `قەرز`, which reverses who owes whom |
| D15 | force majeure | customer-facing legal copy uses `دۆخێک کە لە دەرەوەی توانا و دەسەڵاتی لایەنەکان بێت` | explicit legal meaning preferred over an obscure compact label |
| D16 | discount | `داشکاندن` | active Kurdish commerce usage; commerce UI standardized |
| D17 | invoice | `پسووڵە` | KRG/business usage; `فاکتۆر` removed from invoice UI |
| D18 | temperature / thermometer | quantity `پلەی گەرمی`; instrument `گەرمیپێو` | dictionary/Wikipedia-backed semantic separation |

## Additional corrections completed after the original checklist

The later pass also removed or corrected high-confidence mistranslations including:
tap water rendered as “milk water”, snail as “honey”, itching as “stew”, dwarf/stunting
uses of `قەزەم`, untranslated Arabic `تدریج` / `حراشف` / `قاعیدی`, shell as
“cage”, labyrinth organ as “mixed organ”, treatment stage as “net”, fertilizing as
weeding, hobby as angling, and several evaporation/absorption collisions.

The temperature guide was reread against the Arabic source and rewritten where the
Sorani had unsafe or garbled meaning. Legal/invoice/account/tool surfaces received a
second contextual pass as well.

## Release rule

This record closes the **terminology** blocker. It does not by itself release CKB.
Before `ckb.ready=true`, the current branch still has to pass the validator, typechecks,
tests/build, link/HTML/commerce checks, browser smoke/RTL QA, and the current repository
translation set must be synced to Production. No row should be labelled human-reviewed
unless a real native reviewer actually reviewed it.
