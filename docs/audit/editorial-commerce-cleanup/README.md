# Editorial commerce cleanup — `blog-editorial-commerce-20260901`

An article was found telling readers, in AQUAVO's own editorial voice:

> نصيحة ذهبية من AQUAVO: … ولذلك ننصح بزيارة **سوق الغزل** في بغداد لشراء أفضل
> أنواع الأسماك والنباتات

AQUAVO sending its own readers to a competing Baghdad market to buy the things
AQUAVO exists to sell. The corpus audit that followed found it was not isolated.

**Status: prepared, verified, NOT executed.** The Neon MCP available to this
session is read-only and `.env` is permission-guarded, so the article bodies —
which live in `blog_posts.content` — could not be written. Everything the
repository itself ships (the guard, the generator, the tests, the one repo-side
content fix) is applied and merged.

| | |
|---|---|
| Migration ID | `blog-editorial-commerce-20260901` |
| Articles scanned | 82 |
| Articles corrected | 43 (75 edits) |
| Articles withdrawn | 1 |
| Violations before | 68 |
| Violations after (verified) | **0** |

## What was found

Scanned with `shared/editorial-guard.ts` — the same module the generator now
enforces, so the audit and the gate cannot disagree.

| Rule | Before | After |
|---|---|---|
| `NAMED_EXTERNAL_MARKETPLACE` | 24 | 0 |
| `FALSE_AVAILABILITY` | 23 | 0 |
| `EXTERNAL_COMMERCIAL_REFERRAL` | 16 | 0 |
| `FALSE_PHYSICAL_PRESENCE` | 5 | 0 |
| `EXTERNAL_COMMERCIAL_LINK` | 0 | 0 |

**Outbound links: there were none to remove.** All 81 article bodies contained
exactly two links, both internal (`/substrate`, `/decor`). Every violation was
prose. The Instagram links in `client/src/pages/guides-*.tsx` all point at
AQUAVO's own account and are not referrals.

## The three failures

**1 — Referrals to competing markets (16 articles).** سوق الغزل appears as a
place to go and buy rocks, fish, plants, background materials, medicines and
pond supplies; سوق الشورجة and "بائعين محليين" appear once each.

**2 — Invented availability (23 claims).** Verified against the live catalogue
(112 products, 11 categories): AQUAVO carries **no live fish, no live plants, no
artificial plants and no CO2 systems**. Articles claimed all four, plus a
lighting guide that named Twinstar and Hygger WRGB units when the catalogue
holds one 3.5 W LED.

**3 — A shop that does not exist (5 claims).** "زورونا في سوق الغزل",
"زيارة متجرنا في … سوق الغزل", and "فرع متوفر في 18 محافظة". AQUAVO is
online-only; `server/__tests__/about-crawler.test.ts` already pins that the
/about page says so.

## How each was corrected

39 deletions, 36 rewrites. The rule applied throughout: **promotional filler
carrying no teaching value is deleted, not replaced with different promotion.**
Turning a competitor referral into an AQUAVO advertisement would trade one
problem for another, and the brief asked not to. A sentence was only rewritten
where it carried something a reader actually needs.

Representative examples:

| Article | Before | After |
|---|---|---|
| `iwagumi-aquascape-step-by-step` | *ننصح بزيارة سوق الغزل في بغداد لشراء أفضل أنواع الأسماك والنباتات* | *قبل اختيار الصخور والنباتات، افحص ماءك: بعض الصخور الجيرية ترفع العسر والقلوية تدريجياً…* |
| `hardscape-rock-arrangement` | *في سوق الغزل، يمكن العثور على أنواع مختلفة من الصخور… التأكد من جودة الصخور قبل شرائها* | *ضع بضع قطرات من الخل عليها، فإذا تفاعلت وأطلقت فقاعات فهي جيرية وسترفع العسر…* |
| `arowana-fish-care-guide-prices` | *يمكن شراء سمكة الأروانا من سوق الغزل أو من متجر AQUAVO…* | *الأروانا تحتاج حوضاً طويلاً وغطاءً محكماً لأنها قافزة قوية، وهذان أهم من سعر السمكة* |
| `co2-system-planted-aquarium-guide` | *…يمكنك الحصول على نظام ثاني أكسيد الكربون من متجر AQUAVO* | clause deleted; the sizing advice around it kept |
| `ro-water-vs-tap-water-aquarium` | *زورونا في سوق الغزل أو عبر موقعنا* | paragraph deleted; replaced upstream with what RO water actually needs (remineralisation) |
| `aquarium-heater-winter-iraq` | *زيارة متجرهم في سوق الغزل* | *القاعدة العملية لاختيار قدرة السخان هي نحو 1 واط لكل لتر…* |

### One article withdrawn

`ghazal-market-baghdad-fish-buying-tips` is, in its entirety, a guide to buying
at a competing market — its title, excerpt, headings and conclusion. There is no
sentence surgery that leaves an article behind, so the migration sets
`is_published = FALSE` rather than rewriting it. The row is kept so the decision
is reversible, and `how-to-choose-aquarium-tank` covers the same reader intent.

## Iraq-specific claims

17 Iraq claims were reviewed; **8 were unsupported water-chemistry
generalisations** and are corrected. The rest describe summer heat and power
cuts, which are documented and geographically ordinary, and are left alone.

The corrected claims all asserted a single water profile for the whole country —
*"المياه المالحة أو العسر"*, *"المياه الكلورينة الثقيلة"*, *"تتميز المياه بالكلور
العالي"* — with no source. Supply differs between Baghdad, Basra and the north,
so each now points the reader at their own tank instead:

> واختر الأسماك بناءً على قياس ماء حوضك فعلياً (pH والعسر الكلي GH)، لأن خصائص
> الماء تختلف بين المدن ومصادر التجهيز.

That is both defensible without a citation and better advice than the claim it
replaces.

## Verification before writing

The corrections were applied to an in-memory copy of the live corpus and
re-scanned with the same guard:

```
npx tsx scripts/verify-corrected-corpus.ts corrected.json
scanned (excluding unpublished): 80
violations remaining           : 0
```

Every one of the 75 replacements was also confirmed to match its target
**exactly once** in the live HTML, so no statement can hit the wrong text or
silently miss.

## Safety

- Each edit is a `replace()` of an exact substring, keyed to the row's primary
  key. A statement whose target has since changed replaces nothing rather than
  corrupting text.
- The snapshot (`blog_posts_content_backup_20260901`) is taken **inside the same
  transaction** as the edits.
- A post-flight check re-counts marketplace names in published articles and
  aborts the transaction if any survive.
- `rollback.sql` restores title, excerpt, content and `is_published` from the
  snapshot and verifies every row matches.

## Running it

```
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/audit/editorial-commerce-cleanup/migration.sql
```

Then re-run the audit against production, which should print zero:

```
npx tsx scripts/audit-editorial-commerce.ts
```

## Prevention (already merged)

- `shared/editorial-guard.ts` detects **intent** — a purchase or visit action
  standing next to an external commercial destination — rather than a list of
  shop names, which the next market anyone names would defeat.
- `auto-blog-generator.ts` runs the guard inside `validateGeneratedBlogData`, so
  a violating article throws `BLOG_CONTENT_EDITORIAL_VIOLATION` **before** it can
  be persisted. The prompt states the same rule, from the same constant.
- `gemini-ai.ts` carries the rule in both chat system prompts.
- `server/__tests__/editorial-commerce-guard.test.ts` holds all of it, and
  scans the repo-backed educational content on every run.
