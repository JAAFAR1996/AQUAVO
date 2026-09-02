# Corpus-wide claims audit — batch 1

**Status: drafted 2026-09-02, verified against live production. Not yet applied.**
**Depends on `docs/audit/neon-tetra-editorial/migration.sql`.**

## Why this pass exists

The neon-tetra correction proved that script contamination and false claims are
two different defect classes. The script guard catches corrupted glyphs. It
cannot see a grammatically perfect Arabic sentence that asserts a business fact
nobody can verify — and the generator produced those in bulk, mostly in an
appended "AQUAVO services" block.

Scanned all 80 published articles for the ten defect classes in the brief.
**35 corrections across 22 articles.** Ground truth was read live, not recalled:

| Source | What it settles |
| --- | --- |
| `/api/products` — 112 products, 11 categories | what AQUAVO actually sells |
| `GOVERNORATES` in `checkout/types.ts` | exactly 18 governorates |
| `client/src/lib/constants/shipping.ts` | flat 5,000 IQD, 24 hours, all Iraq |
| `return-policy.tsx`, `terms.tsx`, `why-aquavo.tsx` | what the warranty really is |

## Findings by class

### Invented inventory — AQUAVO sells live animals or plants (REMOVE, 4 articles)
The catalogue contains **no live animals and no live plants**. Yet:
`saltwater-vs-freshwater-aquarium-beginners` named AQUAVO as a supplier of
marine fish *with a one-year guarantee*; `how-to-get-rid-of-green-algae` listed
corydoras, otocinclus and nerite snails as "available at AQUAVO";
`turtles-with-aquarium-fish` claimed a turtle terrarium and "all supplies";
`real-vs-fake-plants-iraq` sent readers to a "النباتات المائية" section that
does not exist. In every case the husbandry advice is sound and is kept; only
the availability claim is removed.

### Invented physical branches (REMOVE, 1 article)
`calculate-aquarium-capacity-liters` invited readers to "visit one of its
branches in Iraq". Nothing in the codebase or the policy pages describes a
physical location; checkout is delivery-only.

### Invented products (REMOVE, 4 articles)
A smart lighting controller (the الإضاءة category holds exactly one product, a
3.5 W LED bar), a sterilising solution, backup pumps, cooling systems, and a CO2
system — **zero matches each** across all 11 categories.

### Unsupported warranties (REMOVE, 7 articles)
Claims ranged from "guarantees" to "a health guarantee on all our products" to
"warranties of up to 5 years". `return-policy.tsx` caps this at a **six-month
limited warranty that applies only where a product page names it**, and
`why-aquavo.tsx` states outright that no document or warranty is generalised
across the store. The store's own policy is the strongest possible source
against these, and it is unambiguous.

### Unsupported "first / biggest in Iraq" (REMOVE, 4 articles)
"The first professional aquarium store in Iraq", "the first and principal
supplier of aquatic products in Iraq", "the first supplier of aquarium
supplies". No source exists for any of them.

### Unsupported imported-product claims (REMOVE, 4 articles)
"Imported from the best factories in the world", "imported from all over the
world". Brands are real; the sourcing narrative is undocumented, so it is
dropped rather than defended.

### Dangerous care advice (REMOVE, 1 article)
`driftwood-preparation-yellow-water-fix` told readers to treat yellow water
"with chemicals such as **chlorine** or zeolite". Adding chlorine to a stocked
aquarium is a fish-health hazard and contradicts every other article in the
corpus, all of which treat chlorine as the thing to remove. Replaced with
activated carbon plus water changes — the real remedy, and stocked.

### A claim a store cannot make (REMOVE, 1 article)
`tetra-food-vs-budget-brands-comparison` asserted that AQUAVO "guarantees the
quality of the tap water" used in the reader's tank.

### Foreign-language fragments the script guard cannot see (CORRECT, 10 articles)

**This is a real gap in `shared/script-purity.ts`, found by this audit.** All
three rules miss a standalone foreign word that is neither welded to an Arabic
letter nor written in Latin Extended:

| Fragment | Language | Article |
| --- | --- | --- |
| `trung tâm` ×2 | Vietnamese | `hardscape-rock-arrangement-visual-depth` |
| `yüksek` | Turkish | `flowerhorn-breeding-nuchal-hump-secrets` |
| `phân` | Vietnamese | `ornamental-fish-import-middle-east-origins` |
| `hoàn` | Vietnamese | `driftwood-preparation-yellow-water-fix` |
| `também` | Portuguese | `diy-3d-aquarium-background` |
| `votre` | French | `amazon-sword-plant-care-propagation` |
| `guarantein salud` | Spanish + malformed | `corydoras-types-best-cleaner-fish` |
| `faktor` | — | `why-fish-die-suddenly-rescue-guide` |
| `require` + `إلىخبرة` | English | `black-beard-algae-removal-steps` |
| `warranties` | English | `hardscape-rock-arrangement-visual-depth` |

`FOREIGN_DIACRITIC` starts at `Ā` (U+0100) so that `Söchting` passes, which is
why `tâm`, `yüksek`, `hoàn`, `também` and `phân` all slip through — their
diacritics are Latin-1. Every meaning here is recoverable from context and is
restored, not guessed; each rationale is in `ledger.mjs`.

Also fixed: `هواة صيدلة الأسماك` ("fish *pharmacy* hobbyists", 6 occurrences in
one article) → `هواة تربية الأسماك`, the phrasing the rest of the corpus uses.

## VERIFIED — checked and deliberately kept

- **"18 محافظة"** — exactly 18 entries in `GOVERNORATES`. True everywhere it appears.
- **"توصيل سريع" / "خدمة توصيل"** — flat 5,000 IQD within 24 hours across Iraq.
- **Catappa leaves, gravel siphon, methylene blue, white-spot treatment,
  dechlorinator, beneficial bacteria, test kits, heaters, air pumps, filters** —
  all named as available, and all genuinely stocked.
- **"مجموعة واسعة"** — 112 products across 11 categories supports it.
- **24/7 technical support** — a documented business fact, kept.
- **The three medicine-safety passages** — they *caution against* human medicines
  and unlabelled dosing. Correct advice, kept verbatim.
- **`basking area`, `Catappa leaves`, `Sunrise to Sunset fade`** — English used
  as the corpus legitimately uses it: a parenthetical gloss or a product name.

## RESEARCH BLOCKED

- **`best-aquarium-store-iraq-2026` — "لماذا AQUAVO هو الخيار الأول في العراق؟"**
  This is the store's own positioning page and the editorial guard already
  allowlists it as a comparison article. Whether to keep that framing is the
  owner's commercial decision, not a factual error I should silently rewrite.
  **Flagged for the owner, not changed.**
- **"منيو أكوافو" for flake food** — AQUAVO stocks 13 fish foods but no flake
  product. Removed as an availability claim rather than asserting the negative.

## Migration discipline

Pre-flight asserts 80 published posts, that the neon-tetra migration has run,
and that all 35 targets are present at their expected occurrence counts; an
in-transaction snapshot; post-flight asserts every banned claim is gone
corpus-wide, that exactly 22 rows changed, and that only `content` moved.

`build.mjs` verifies each target against live production, applies the whole set
in memory, and refuses to emit unless every banned claim is gone. It emits pure
LF — a CRLF that crept in from an editor silently broke every multi-line target
during drafting, and the pre-flight caught it rather than the migration
half-applying.

## Follow-up this audit earns

1. **Extend `shared/script-purity.ts`** to a lexical check: a Latin token that is
   neither an allowlisted technical term nor a capitalised proper noun does not
   belong in an Arabic body. The current rules are character-class based and
   structurally cannot see this class.
2. **Add a claims guard** to the generator. Every defect here was a business fact
   asserted without a source; a guard that rejects superlatives, warranty
   language, branch references and availability claims for products absent from
   the live catalogue would have blocked all 25 of them at write time.
