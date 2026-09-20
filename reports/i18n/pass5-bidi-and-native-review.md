# Pass 5 — RTL numeric ranges, the native-review package, and what still blocks release

Date: 2026-09-20 · Branch: `feat/i18n-trilingual` · Parent: `3f57c40d`

Nothing was merged, deployed, marked reviewed, or written to production.

---

## 1. The RTL numeric-range defect, and the fix

### What was wrong

`تغذية 4-6 مرات` renders with its two numbers swapped: a reader sees `6-4`. Same for
`متوسط (50-150 لتر)` → `150-50`. Pass 4 measured it in Chromium and recorded it as a
pre-existing storefront bug affecting Arabic (54 occurrences) as much as Kurdish (49).

### Why

Not a font, not a translation, and not something a string edit can fix. It is the Unicode
Bidirectional Algorithm applied exactly as specified:

| rule | effect here |
|---|---|
| W2 | an EUROPEAN NUMBER preceded by an ARABIC LETTER becomes an ARABIC NUMBER — so `4` and `6` are AN |
| W4 | only promotes a separator sitting between two **European** numbers, so after W2 it no longer applies and the `-` stays a separator |
| W6 | leaves that separator as a neutral |
| N1 | resolves a neutral between two numbers to R, because numbers count as R for neighbouring neutrals |

The two digit groups end up one embedding level above the hyphen: two left-to-right islands
laid out right-to-left relative to each other. The same string renders correctly in an LTR
paragraph, which is why English never showed it.

Measured, not assumed — in `dir="rtl"` at 32px, per-character `x`:

```
تغذية 4-6 مرات      4 @1197   - @1186   6 @1170     → 6 is leftmost: reads "6-4"
تغذية 46 مرات        4 @1181             6 @1197     → correct, no separator to resolve
```

### The fix

Isolate the range while rendering, so the algorithm resolves it with no Arabic letter in
scope. Two spellings of one idea, both standards-based, chosen by what the surface can carry:

| surface | mechanism | why |
|---|---|---|
| HTML we render (article prose, printed invoice) | `<bdi dir="ltr">50-150</bdi>` | markup is available, so use markup |
| plain strings (every `t()` value, product names, spec values, cart lines) | U+2066 LRI … U+2069 PDI | no markup possible in a text node, an `alt`, or a `title` |

The character form is the **isolate** pair, not the deprecated embedding and not the
override (U+202A..U+202E). An isolate cannot change the direction of anything outside it
and cannot leak past its paragraph. It is added on the way to the screen and never stored:
`e2e/i18n-bidi.spec.ts` still asserts that the corpus on disk carries no bidi control at all,
and `test/i18n/bidi-render.test.ts` asserts that stripping the controls returns the stored
string byte for byte.

Text destined for a machine strips them again at its own boundary — `document.title`, every
`<meta content>` and every JSON-LD value in `components/seo/meta-tags.tsx`. Search was
already immune: `normalizeSearchText` maps anything outside `[0-9a-z؀-ۿ…]` to a
space, so `⁦50-150⁩` and `50-150` normalise identically. That is now pinned by a test rather
than left to luck.

### Where it is applied

| file | what |
|---|---|
| `shared/i18n/bidi.ts` | the transform, both forms, with the UBA derivation in the header |
| `client/src/i18n/index.ts` | i18next post-processor — reaches every `t()` call site without touching one of them |
| `client/src/pages/blog-post.tsx` | article prose, after sanitising |
| `client/src/components/products/product-card.tsx` | product name and the supporting line |
| `client/src/components/products/product-specifications-table.tsx` | spec values (labels left alone — `getIcon` matches on them) |
| `client/src/pages/product-details.tsx` | name, breadcrumb, description, benefits, usage steps, safety warnings |
| `client/src/components/cart/checkout/order-summary.tsx`, `confirmation-view.tsx` | cart and checkout line names |
| `client/src/components/cart/invoice-dialog.tsx` | the printed invoice, as `<bdi>` since it is built as HTML |
| `client/src/pages/order-confirmation.tsx` | order line names |
| `client/src/components/seo/meta-tags.tsx` | the boundary that strips the controls back out |

A post-processor was chosen over editing call sites because the affected copy is spread
across 22 hand-written guide pages, 10 calculators, the loyalty page and order tracking —
roughly 3,000 `t()` calls. Editing them would have been a large diff with a high chance of
missing one; the post-processor cannot miss one.

### Verification

- `shared/i18n/__tests__/bidi.test.ts` — 19 tests: what is wrapped, what is never touched
  (hrefs, `title` attributes, `<code>`/`<pre>`, English text, lone numbers, dates, phone
  numbers), idempotency, and that only isolates are ever emitted.
- `client/src/components/__tests__/bidi-numeric-ranges.test.tsx` — 5 tests: the product
  card, the specifications table and the checkout summary actually route their text through
  the fix, with fixtures because the local server has no catalogue.
- `test/i18n/bidi-render.test.ts` — 12 tests over the shipped `ar` and `ckb` bundles and the
  translated product/article stores: lossless round-trip, balanced isolates, no controls on
  disk, search unaffected.
- `e2e/i18n-bidi.spec.ts` — in Chromium, desktop and mobile:
  - the un-isolated string still renders swapped (the defect is pinned, not assumed);
  - the isolate characters put it back in order;
  - `<bdi dir="ltr">` puts it back in order;
  - **every** string in the `ar` and `ckb` corpora that carries a range is rendered and
    measured first-character against last-character — **0 reversed in both locales**.
- Live pages, Arabic and Sorani, desktop: `/guides/water-change-schedule` and
  `/guides/feeding-table` in both locales — every range on the page measured in order, and
  the isolates present in the DOM, confirming the post-processor runs in the real app.

Arabic production benefits from the same fix, which is the point: the defect was always
Arabic's too.

---

## 2. The five Arabic words reported in the Kurdish content

Each was re-checked against the current corpus rather than trusted from the register.

| word | verdict | evidence |
|---|---|---|
| `حاسبات` | **genuine, and fixed** | it was the label of a link to `/calculators`. The Kurdish UI already calls that page `ژمێرەرەکانی حەوزی ماسی` (`tools:calculators.s1`), so the site's own term applies — no translation judgement needed. One character-for-character replacement, reported in full below. |
| `الإسالة` | **false positive** | the word is in the **Arabic source** of `guides:guides-water-test-guide.s16` (`ماء الإسالة` = tap water). The Kurdish correctly reads `ئاوی لولە`. Nothing to fix. |
| `الولودة` | **not present** | no occurrence anywhere in the current Kurdish corpus. |
| `تدريجي` (as `تدریج` / `تدریجی`) | **genuine, left for native review** | 6 occurrences: `guides:guides-new-aquarium-setup.s91` and `.s105`, and posts `nitrogen-cycle-simple-arabic-explained` (×2), `cloudy-water-fix`, `aquarium-safe-rocks-and-wood`. The corpus already renders this one concept **eight** different ways (`وردە وردە`, `بە شێوەیەکی پۆل پۆل`, `بە هەنگاو`, `بەش بەش`, `قۆناغ بە قۆناغ`, `هەنگاوەیی`, `بە قۆناغ`, and the raw Arabic). Which one wins is a glossary decision, not a lookup. |
| `قاعدي` (as `قاعیدی`) | **possibly a legitimate loan, left for native review** | 2 occurrences, in `ammonia-spike-emergency-treatment` and `aquarium-safe-rocks-and-wood`. Kurdish chemistry writing uses both the Arabic loan and native forms. |
| `حراشف` | **genuine, left for native review** | 1 occurrence in `fish-eye-problems`. It is the only rendering of "scales" anywhere in the Kurdish corpus, so there is no internal precedent to copy and no way to pick a term without a native reader. |

### The one content change in this pass — exact diff

```diff
--- a/data/i18n/translations/ckb/blog_posts.json
+++ b/data/i18n/translations/ckb/blog_posts.json
@@ post how-to-treat-tap-water-for-fish-iraq (ckb)
-<a href=\"/calculators\">حاسبات</a>
+<a href=\"/calculators\">ژمێرەرەکان</a>
```

One occurrence. The `href` is unchanged. This is **local only** — production still holds the
previous value, and no re-seed was run.

---

## 3. Native-review package

`reports/i18n/native-review-package.md`, generated by `TOOLS/i18n/native-review-package.ts`.

It is a decision sheet, not a string dump: 4 UI sections to read in full, 3 word choices,
33 competing renderings, 20 glossary confirmations and 10 split subcategories — each with the
Arabic source, the Sorani currently shipped, the alternative, a real context, the frequency,
and a recommendation derived from what the corpus already does.

One thing worth noting about how it is built: it uses a **stricter** Arabic term matcher than
the validator. The validator allows any clitic in front of a glossary term and any suffix
behind it, which is right for a warning but produced hundreds of phantom decisions here —
it read `فلتر` ("filter") as ف + لتر ("litre"), `السمة` ("theme") as ال + سم ("cm") and
`دفعة` ("in one go") as `دفع` ("payment"). In the package, a short term must be a whole word
and only a term of four characters or more may carry affixes. The validator was left alone,
so its 311 warnings are still comparable with the previous checkpoint.

No term in that file was picked by a model. That is the point of the file.

---

## 4. Provider status — re-checked, still blocked

- `GOOGLE_AI_API_KEY` is present and the key itself is valid: `gemini-2.0-flash` returns
  **404 — model retired, use `gemini-3.6-flash`**, which is an authentication success.
- `gemini-3.6-flash` returns **402 — "Your prepayment credits are depleted."**
- `GROQ_API_KEY` is absent, as before.

So bulk and model-assisted translation remain unavailable. Everything in this pass is
verified against the Arabic source, against the project's own glossary, or against a
measurement in a browser.

---

## 5. Real-data browser QA — still blocked, and on what exactly

The local server falls back to "mock storage", which is not a fixture catalogue: with no
`DATABASE_URL` the API answers `Database service unavailable`, so `/api/products` and
`/api/blog` return nothing. Populated cart, printed invoice with real order data, signed-in
account and order list therefore cannot be exercised in a browser locally.

The project already has the right mechanism and it does not need inventing: `playwright.config.ts`
boots the app through `e2e/support/global-setup.mjs`, which refuses production endpoints,
seeds synthetic accounts and proves at runtime that the server is on a **Neon verify child
branch**. That branch also already exists — `i18n-content-translations-verify-20260919`
(`br-green-lake-a4j5pmgk`), state `ready`.

What is missing is only the credential: `NEON_VERIFY_DATABASE_URL`. It was deliberately not
fetched. AQUAVO's own rule is that database credentials are never printed, stored or committed,
and pulling a connection string into an agent transcript is exactly that. To unblock, set it
in the shell and re-run — no code change is needed.

What was done instead, so the gap is smaller rather than merely reported: the component path
is now covered with fixtures (`client/src/components/__tests__/bidi-numeric-ranges.test.tsx`),
which pins that the product card, the specifications table and the checkout summary really do
render through the fix. That closes the wiring risk; what remains uncovered is integration
with real catalogue and order rows.

---

## 6. Article quality — unchanged and not overstated

All 118 Arabic articles are verified structurally and factually against the source in both
locales. **Linguistic prose review has reached roughly 35 of them, and all of it was
model-assisted.** The other 83 are not reviewed for how they read. No run should claim
otherwise, and model-assisted review is not native human review.

`activated-carbon-aquarium-when-to-use` is untouched: the Arabic source contradicts itself
about ammonia, the translations follow the Arabic faithfully, and the Arabic needs an
editorial decision before either translation should move.

---

## 7. Release blockers

1. **No native review of Sorani has happened.** 4 UI sections, 3 word choices, 33 competing
   renderings, 20 glossary terms, 10 subcategories — `native-review-package.md`.
2. **Sorani prose quality is unreviewed for ~83 of 118 articles**, and no provider is
   available to even re-check them model-assisted.
3. **A newly published Arabic article has no EN or CKB translation** —
   `كيف-تتعامل-مع-حرارة-الصيف-في-أحواض-السمك-دليل-شامل-1789869961312`. This appeared in
   production after the pass-4 checkpoint and is why the validator now reports 2 errors
   instead of 0. It needs a provider.
4. **Real-data browser QA is not done** — needs `NEON_VERIFY_DATABASE_URL`.
5. **The Arabic editorial contradiction** in `activated-carbon-aquarium-when-to-use` is open.
6. **Production still holds the machine translations**, including the `حاسبات` link label
   fixed here. Any re-seed must be reported as a diff first.

`ready=false` stands for both `en` and `ckb`. Nothing was merged, nothing was deployed, no row
was marked reviewed.

---

## 8. Gates

| gate | result | branch-introduced failures |
|---|---|---|
| i18n validator | **2 errors** / 311 warnings | **0** — both errors are the newly published Arabic article having no EN/CKB row (see blocker 3). Warnings unchanged from pass 4. |
| content audit | 34 findings (high 34) | 0 — identical to pass 4 |
| client `tsc --noEmit` | 0 errors | 0 |
| api `tsc -p api/tsconfig.json` | 0 errors | 0 |
| vitest (full suite) | 3,539 passed / 37 failed / 7 skipped of 3,583 | **0** |
| Playwright i18n, desktop + mobile | **92 passed / 2 skipped**, 0 failed (was 84/2) | 0 |
| search quality | passing (107/107 Kurdish names reachable from an Arabic keyboard) | 0 |
| BiDi corpus sweep in Chromium | **0 reversed numeric ranges** in `ar` and in `ckb` | 0 |

### How the 37 vitest failures were classified

They are **all pre-existing**. The pass-4 note of "297 passed / 1 failure" was a subset run,
not the whole suite, which is why the number looks new. Verified rather than assumed: the 19
failing files were re-run with every change of this pass stashed, at `3f57c40d`, and produced
**exactly the same 19 files and 37 failures**.

They fall into three groups, none related to this work:

- **16 server/SSR/crawler files** — `ssr-*`, `*-crawler`, `guides-spa-shell`,
  `seo-footer-orphan-links`, `order-notification-flow`, `wayl-payment-flow`,
  `orders-client-ip-schema-contract`.
- **`product-card.test.tsx`** — asserts an `object-contain` class and an Arabic accessible
  name on the compare control, neither of which the current card renders. The card's name
  text, which this pass touched, is asserted green by the new
  `bidi-numeric-ranges.test.tsx`.
- **`orders-return-events-runtime.test.tsx`** — an incomplete `lucide-react` mock (`XCircle`
  is not exported from it).
- **`whatsapp-coverage.test.ts`** — the failure pass 4 already recorded (`order-confirmation`
  reported as no longer wired). Re-checked specifically, since this pass edits that file: it
  fails identically with that edit alone stashed.

### Skips

2 Playwright skips and 7 vitest skips are environment-dependent: they are the checks that
need a catalogue, and the local server runs without a database.
