# Discovery Cycle 10 — dossier

Corpus at start: **103 published**, orphans **1**, all guards **0**.
Cycle 10 adds 3, deepens 1, and normalises the last raw-Arabic slug.

---

## 1. Cycle 9 certification (carried forward)

Both Cycle 9 migrations are applied and verified against production:

| check | result |
|---|---|
| published | 103 |
| script purity / editorial / business truth | 0 / 0 / 0 |
| dead links / self links | 0 / 0 |
| orphans | 52 → **1** |
| edges | 241 → **349** (avg out 2.41 → 3.39) |

All six changed articles return 200 to browser, Googlebot, GPTBot, ClaudeBot and
PerplexityBot, and the crawler-served HTML was checked for the corrected
substance — not just for a 200 and a plausible byte count.

Two things worth recording about the apply itself:

- The **first attempt rolled back** on `only 4 of 6 articles carry their
  structure`. That was not drift. Every exact-length precondition passed, so the
  transaction reached post-flight before aborting and nothing committed. The
  assertion was wrong: it demanded `author = 'AQUAVO Editorial Team'` across all
  six slugs, but the migration only sets a byline on the three it INSERTs, and
  two rewrite targets are legacy articles bylined `AQUAVO Team`. Fixed by scoping
  the byline assertion to the inserts. The two legacy bylines were left alone —
  rewriting an article's text is a content correction; changing its published
  byline is a separate editorial decision.
- The **link migration was attempted before the article migration** and aborted
  with `3 internal links point at unpublished articles` — the documented
  dependency, working. Nothing committed. Order is `wave9` then `links9`.

---

## 2. Coverage decisions

Scanned across the full text of all 103 live articles. A first pass was
discarded as unreliable: `رام` matches inside unrelated Arabic words and `بيض`
matches `أبيض` (white), which produced false hits in 16 and 31 articles
respectively. The figures below use species-specific terms.

| topic | live coverage | decision | reasoning |
|---|---|---|---|
| danio | 5 articles (6× in `5-hardy-fish-for-beginners`) | **ALREADY COVERED** | Also holds its own row in the Cycle 9 selection table. A page would compete with both. |
| ram cichlid | **0** (`راميريزي`, `أبيستوغراما`, `بلو رام` all absent) | **NEW** | The corpus owns oscar, discus, angelfish, flowerhorn and African cichlids, and no dwarf cichlid at all. |
| rainbowfish | **0** | **GROUP** | Same intent as `small-schooling-fish-selection` — which schooling fish to buy — different size class. A page would cannibalise it. |
| killifish | **0** | **NOT WORTH STANDALONE** | The gap is taxonomic, not practical: annual species, diapause eggs and peat spawning are a specialist pursuit with no meaningful local availability. Publishing it would be filler. |
| egg-laying breeding | **0** (`يضع البيض`, `بياضة`, `حاضنة الفم` absent) | **NEW** | Breeding is mentioned in 18 articles and owned only for livebearers and snails. |
| fry / grow-out | **0** (`زريعة`, `ارتيميا`, `إنفوزوريا` absent) | **NEW** | The Cycle 9 livebearer rewrite points at fry rearing as a next step; nothing owned it. |

Net: **3 NEW, 1 GROUP, 1 ALREADY COVERED, 1 NOT WORTH STANDALONE** — not one
article per species.

### What each new article leads with

- **dwarf-cichlids-guide** — leads with the failure that actually happens: a blue
  ram sold to a beginner for an immature tank, with a warmth requirement that
  conflicts with the rest of a community tank. Names the hardier alternative
  (bolivian ram, kribensis) rather than just warning. Also covers the point that
  breaks the "peaceful community fish" label: a pair that spawns becomes
  territorial.
- **fish-breeding-basics** — framed as a decision, not a technique, because the
  outcome that bites is population management. Splits egg-layers into the four
  strategies that change the preparation entirely (scatterers, substrate
  spawners, mouthbrooders, bubble-nesters) and notes the case people misread:
  a stable, well-fed tank that has not spawned usually lacks a compatible pair,
  not "stimulation".
- **raising-fry** — leads with mouth size, because most fry losses are fry
  starving surrounded by food they cannot physically eat. States plainly that
  stunting from crowding or bad water is permanent and not recoverable, and ends
  on the honest question of where the fry actually go.

---

## 3. The last orphan: slug normalisation

`دليل-شامل-لتربة-وديكور-الأحواض-اختيار-الأسطح-المثا-1787451489298` was the only
orphan left after Cycle 9, and it was excluded there on purpose.

The reason is structural, not editorial. The corpus-wide dead-link post-flight
compares the `href` capture against `blog_posts.slug` **without URL decoding**:

- a percent-encoded href reads as a dead link and aborts the migration
- a raw-Arabic href passes SQL, but the browser re-encodes it on navigation

So the article could not be linked safely in either form. Cycle 10 removes the
class of problem instead of working around it:

1. slug → `aquarium-substrate-and-decor-guide`
2. `vercel.json` gains a **301** from the old percent-encoded path, matching the
   redirect that already exists for a previously renamed Arabic slug (that one
   needed two fixes, #193 and #194, to get the encoding right — this follows the
   working shape exactly, single-encoded)
3. one contextual link from `aquarium-safe-rocks-and-wood`, whose subject
   (is this rock or wood safe) leads naturally into substrate and decor choice

The migration asserts all three: the new slug exists, the old one does not, and
the renamed article has at least one inbound link.

**Deploy ordering matters.** The `vercel.json` redirect must be live with or
before the migration, or the old URL 404s in the gap. Rollback restores the old
slug, so the redirect must be reverted with it.

---

## 4. Guard fix shipped alongside (PR #202)

Cycle 9 found a business-truth blind spot; it turned out to be three gaps, not
one. All are closed and covered by regression tests:

1. `LIVE_STOCK` required an explicit `حية`, so `فصائل` registered as nothing.
2. `AQUAVO_SUPPLIES` listed supply verbs only, so `تصفح ... عبر المتجر` — a
   shopping directive with no supply verb — matched nothing.
3. `RANKING` had adjective-first forms (`أكبر متجر`) but not the definite
   noun-first form Arabic uses just as naturally (`المتجر الأكبر`).

Guarding against over-broadening was the harder half. `PRODUCT_CONTEXT`
deliberately excludes `حوض`/`أحواض`: including them switched the rule off almost
everywhere, because the tank is the subject of nearly every sentence in the
corpus. That was caught by a test case ending in `حوضك`.

Verified in both directions: 62 unit tests pass, including ten ACCEPT cases; and
a sweep over the whole live corpus flags **0 of 103** (it flagged exactly 1
before the Cycle 9 content correction).

---

## 5. Saturation status — **not reached**

Cycle 10 found three genuinely unowned canonical topics. Two consecutive cycles
must return no canonical gap before saturation can be claimed. This is cycle one
of that count only if Cycle 11 also comes back empty, which it is not expected
to.

Queued for Cycle 11:

1. **Domain-map sweep of the remaining husbandry parameters** — water flow /
   current as a parameter, photoperiod beyond planted lighting, and stocking
   order (which fish go in first) are each referenced without ownership.
2. **Shrimp as a keeper's subject** rather than as a cleanup crew — the corpus
   has `aquarium-shrimp-snails-guide`, which is about copper and compatibility.
3. **Catfish beyond pleco and corydoras** — needs a scan before any decision.
4. **The 47 zero-outbound articles.** Inbound is solved; outbound is not. To be
   improved only where a contextual link is genuinely useful, never as padding.
5. Re-check **rainbowfish** after the deepening beds in — if the section attracts
   its own demand it may later justify separation, but not on speculation.

Still RESEARCH BLOCKED and still not blocking production: Search Console and
customer-support data.

---

## 6. Gate results

| draft | chars | tables | links | script | editorial | business | dead | unbalanced |
|---|---|---|---|---|---|---|---|---|
| dwarf-cichlids | 4006 | 1 | 12 | 0 | 0 | 0 | 0 | 0 |
| breeding-basics | 3659 | 1 | 14 | 0 | 0 | 0 | 0 | 0 |
| fry-rearing | 3651 | 1 | 13 | 0 | 0 | 0 | 0 | 0 |
| schooling-selection-deepened | 5224 | 2 | 18 | 0 | 0 | 0 | 0 | 0 |

---

## 7. Apply order

```
1. deploy vercel.json (the 301)      — with or before the migration
2. migration-wave10.sql               rollback-wave10.sql
```

Rollback restores the old Arabic slug, so revert the redirect in the same step.
The migration snapshots the full table first
(`blog_posts_backup_wave10_20260903`) and asserts the exact current
`length(content)` of every row it touches, so it aborts rather than overwriting
if the corpus moved since drafting.
