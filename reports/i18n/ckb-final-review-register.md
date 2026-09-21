# Central Kurdish (Sorani) final review register — 2026-09-20

**Verdict: CKB is NOT releasable. EN is close but has one shared blocker.**

This was a model-assisted editorial review — four independent reviewers over the
complete 311-warning evidence set, consolidated here. **No native human speaker
has reviewed any of it.** Nothing below is marked human-reviewed and no row was
flipped to reviewed status.

---

## 1. Why CKB does not ship

The 311 validator warnings were treated as the work list in earlier passes. They
are not the defect count — they are a **lower bound**, and a loose one. The
validator only fires when the *Arabic source* contains a glossary trigger, so any
bad Sorani whose source did not trigger is invisible to it. Measured directly
against the ckb corpus:

| token | meaning actually shipped | warnings | real occurrences |
|---|---|---|---|
| `ئاوی سازگار` | "compatible water" (for *freshwater*) | 32 | **49** |
| `پلەپێو` | "thermometer" (used for *temperature*) | — | 52 |
| `کەمکردنەوە` | "reduction" (used for *discount*) | 14 | 116 |
| `زاوزێکار` | "breeding" (used for *livebearer*) | 7 | 19 |
| `قەزەم` | transliterated Arabic قزم, not a Sorani word | — | 17 |
| `سەبارە` | not a Sorani word for decor | 12 | 13 |
| `خورشت` | Persian for a stew (used for *itching*) | — | 9 |

### Safety-critical defects (P0)

These alone are disqualifying. Each was found by a reviewer reading the actual string.

1. **Reversed instruction.** `guides-heater-choice.s52` — Arabic says place the
   heater **near** the water flow; the Sorani says `بەدوور لە` — *away from* it.
2. **Altered safety warning.** `s63` invents an "independent thermostat" that the
   Arabic does not mention, in a warning about runaway heating.
3. **Weakened safety warning.** `s55` renders "sudden" (المفاجئ) as `ناچاری`
   ("compulsory") in a temperature-spike warning.
4. **Quarantine meaning destroyed.** `tools:fish-health-diagnosis.s100` renders
   "بروتوكول الحجر الصحي" as `پروتوکۆلی قەفەی سەروو` — "the upper cage protocol".
5. **Quarantine dropped from a `safetyWarnings` field.** `products/ykl-018` turns
   "not a substitute for a separate quarantine tank" into "…a separate *health*
   tank", losing the disease-isolation meaning entirely.
6. **Device confusion, systematic.** `پلەپێو` (thermometer) is used for
   *temperature* in at least 6 UI strings — the exact heater/thermometer
   distinction the release standard names.

### Commerce-truth defects (P1)

- `products/aquavo-driftwood-dw-02` — the Sorani invents a **3D preview** claim the
  Arabic does not make.
- `products/c4-1103#name` — the Sorani injects the brand **YEE**, absent from the
  Arabic name.
- `account:profile.s17` — loyalty points labelled `خاڵەکانی سووکاری` ("lightness").

### Basic-quality defects (P1)

- **`ماس` is yoghurt**, not fish. Shipped in 5 UI strings including both AI chat-bot
  greetings and the onboarding tour — among the most-seen strings in the product.
- **`خال`** (maternal uncle / facial mole) shipped where **`خاڵ`** (point) is meant.
- Persian vocabulary: `سنگ`, `یخچال`, `گرما`, `خورشت`, `فروشگا`, `لتر`.
- Untranslated Arabic loans: `نقطە`, `مەهمیە`, `شەبەکە`, `حساس`, `وەسڵ`.
- Unparsable MT: `حەوزە گەرمیدا گەیشتە پێویست ناکات`; `سەهۆڵی سڕینەوە`
  ("ice of erasing") for "easy to clean"; `لە هەواڵی سەرما` ("in the news of cold")
  for "in winter"; `پەیوەندیکردنی کەوز` ("making contact with algae") for algae control.
- **`livebearers` vs egg-layers collapses**: `زاوزێکار` means "breeding", which is
  equally true of egg-layers, so the articles built on that contrast become incoherent.
- Zero-emoji rule violated: `tools:ai-chat-bot.s9`/`s10` ship 🦐 — **in the Arabic
  source too**, so this is an AR defect as well.

### Coverage

~83 of 118 articles have still had no prose-level review in any pass. Every string a
reviewer examined closely this session contained defects *beyond* the flagged term,
so the untouched remainder should be assumed to be in the same condition.

---

## 2. What was applied (`TOOLS/i18n/apply-ckb-corrections.mjs`)

Deliberately only the subset that is wrong in **100% of contexts** and that no
reviewer disputed. 57 token replacements + 8 glossary trigger narrowings.

| fix | count | rationale |
|---|---|---|
| `ئاوی سازگار` → `ئاوی شیرین` | 49 | سازگار = compatible/acclimatised; never "fresh". Two reviewers, independently. |
| `سنگی کەلسی` → `بەردی کلسی` | 1 | سنگ is Persian; Sorani is بەرد. |
| `گرما` → `گەرما` | 2 | Persian orthography. |
| `فروشگا` → `فرۆشگا` | 1 | Persian orthography. |
| `شەبەکە` → `تۆڕ` | 1 | Arabic loan شبكة. |
| `مەهمیەتی` → `گرنگی` | 1 | Arabic loan أهمية. |
| `نقطەکانی`/`نقطە یان` → `خاڵ…` | 2 | Arabic loan نقطة. |

**Validator rules narrowed** — these are proven false positives, not suppression:

| term | was | now | proof |
|---|---|---|---|
| `warranty` | `ضمان` | `فترة الضمان`, `ضمان المنتج`, `الضمان` | All 9 hits are the masdar "ensuring" (`ضمان جودة المياه`). Forcing `گەرەنتی` would **manufacture a legal warranty claim** in editorial text. |
| `stone` | `حجر` | `أحجار`, `صخور`, `حجر هواء`, `حجر زينة` | `حجر` matched `الحجر الصحي` = quarantine. |
| `login` | `دخول` | `تسجيل الدخول`, … | `دخول` matched `أنابيب دخول وخروج الفلتر` = inlet pipes. |
| `in-stock` | `متوفر` | `متوفر في المخزن`, `متوفر الآن` | Fired on the negative `غير متوفر`. |
| `betta` | `بيتا` | `سمكة بيتا`, … | Substring-matched `بيتاً` ("a house"). |
| `cart` | `سلة` | `السلة`, … | Matched `كرة سلة` = basketball. |
| `installation` | `تركيب` | `التركيب والتشغيل`, … | Matched `التركيب المعدني` = mineral composition. |
| `decor` | `زينة` | `ديكور`, `الديكور` | `أحواض الزينة` means *aquarium*, not decor goods. |

Result: **311 → 229 warnings, 0 errors.** Tests 43/43, client tsc 0, api tsc 0.

### Deliberately NOT applied

Roughly 80 further corrections were proposed and are **not** applied, because they
need sentence-level judgement or a reviewer marked them uncertain. Applying
model-authored Sorani prose at that scale would manufacture confidence nobody has —
which is precisely how the present corpus was produced. They are listed in the
reviewer reports and must go to a native speaker.

Open items explicitly flagged uncertain include: `loyalty` (`دڵسۆزی` vs `وفاداری`),
`invoice` (`فاکتۆر` vs `پسووڵە`), `livebearers` canonical form, the Sorani for fish
gills, "oasis", "fridge", "test strips", `cm` vs `سم` house style, and medication
dosing wording.

---

## 3. Shared blocker: 11 dead internal links (affects ar, en AND ckb)

Found by a new link-integrity gate. Good news first: **0 invented links and 0
corrupted URLs** in either translation — EN and CKB reproduce the Arabic hrefs
faithfully. The problem is the Arabic source.

Three auto-generated Arabic articles, all still published, carry 11 links that
resolve to no route in `client/src/App.tsx`:

| article | dead hrefs |
|---|---|
| `auto-1789265156493` (a *second* summer-heat guide) | `/temperature-control`, `/filtration`, `/water-treatment`, `/substrate`, `/decor`, `/ventilation`, `/monitoring` |
| `auto-1788660363857` (filtration guide) | `/الفلترة-والتنقية/الفلتر-الميكانيكي`, `/الفلترة-والتنقية/الفلتر-البيولوجي` |
| `auto-1787451489298` (substrate & decor guide) | `/substrate`, `/decor` |

This is the same auto-generator family as `auto-1789869961312`, unpublished earlier
today for the same class of defect. Real targets exist:
`/products?category=<arabic name>` and `/guides/*`.

Because Arabic is the source of record, this must be fixed in Arabic first — it is a
production content edit needing its own approval, exactly like the last one.

---

## 4. Release decision

| locale | gate status | decision |
|---|---|---|
| **ar** | source of record | stable, but owns the 11 dead links and the 🦐 emoji |
| **en** | validator 0 errors · client tsc 0 · api tsc 0 · 43/43 tests · audit findings all false positives · links faithful | **HOLD** on the dead links + real-data QA |
| **ckb** | same deterministic gates pass | **DO NOT RELEASE** — P0 safety defects |

`ready=false` remains correct for both locales. No production write, no merge, no
deploy was performed.

### Remaining EN blockers (small)
1. Fix the 11 dead links in the Arabic source (production content edit, needs approval).
2. Real-data browser QA on the Neon verify branch `br-green-lake-a4j5pmgk` (ready).
3. Production translation sync with a reviewed diff, then the `ready` flip.

### Remaining CKB blockers (large)
1. Everything in EN's list, plus:
2. Native Sorani review of the ~80 held corrections and the ~20 uncertain items.
3. Prose review of ~83 of 118 articles never linguistically reviewed.
4. Re-translation of the P0 safety strings by, or verified by, a native speaker.

A native Sorani reviewer is not an optional polish step here. The defect classes
found — a yoghurt/fish confusion in the chat bot, a reversed heater instruction, a
quarantine warning that lost its meaning — are exactly what a model-only pipeline
produces and what only a speaker reliably catches.
