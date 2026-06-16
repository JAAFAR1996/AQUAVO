# AQUAVO — Premium Visual Direction & Brand Experience Plan

**Author:** Visual Direction & Brand Experience Lead · **Date:** 2026-06-16
**Status:** Direction proposal. No source modified. Builds on `reports/03_uiux_and_research.md` and `reports/07_premium_direction_proposal.md`.
**Mandate:** Premium, calm, aquarium-focused — grounded in the *existing* dark-ocean brand. No rebrand, no new color system, no heavy animation, no fake effects, no AI-luxury clichés (gold gradients, glassy bloom, particle fields, "elevate your experience" hero copy).

---

## North star — "The calm aquarium house"
A premium aquarium store should feel like standing in front of a *well-lit, still tank in a quiet room*: deep dark water, one warm light source, clean glass, nothing darting around. Today AQUAVO has the right palette but fights itself with perpetual motion (`fish-swim`, `float`, `slow-zoom`, `pulse-glow`), six competing navbar "styles," neon glows, and oversized 9xl headings. The redirection is **subtraction, not addition**: remove the noise so the products and the dark water do the work.

Three governing principles, each a filter for every decision below:
1. **Stillness reads as luxury.** Motion only on intent (hover, entrance, add-to-cart). Zero infinite loops on commerce surfaces.
2. **One light source per view.** A single warm-amber/cyan focal point; everything else recedes. No two glows competing.
3. **Honest restraint.** Real stock, real reviews-or-nothing, no neon urgency. Calm = trustworthy in a COD market.

---

## 1. Color & contrast hierarchy

**Keep the tokens; fix how they're spent.** The palette (`#0a1628` bg, `#199bb8` cyan primary, `#ff7b5a` coral accent, warm amber lighting) is correct and disciplined in `client/src/index.css`. The problem is *distribution*: cyan and coral both appear as glows, fills, borders, and text simultaneously, so nothing leads.

Proposed spend ratio (the "60/30/10/1" of AQUAVO):
- **~60% deep ocean** (`--background`, `--card`) — the water. Let it dominate.
- **~30% foreground + muted** — text, structure, calm grey-blue surfaces.
- **~10% cyan (`--primary`)** — interactive affordances ONLY (links, primary CTA, focus ring). Stop using cyan for decorative glow.
- **~1% coral (`--accent`)** — reserved for *one* job: price/discount/sale. Coral becomes "the money color." When coral means only one thing, the brain learns it instantly.

Concrete moves:
- **Demote neon glow.** `underwater-glow`, `text-shadow-glow`, `pulse-glow-cta` create the cheap "AI luxury" sheen. Replace decorative glow with *contrast and spacing*. Keep at most one soft focal glow behind the hero product. — `index.css:394-400, 504-507`
- **Borders calmer.** `--border` at `0.08` alpha is good; the card uses `hover:border-primary/50` which flips a hard cyan edge on hover — drop to `/25` for a whisper, not a highlight. — `product-card.tsx:77`
- **Coral discipline.** Audit every coral usage; if it's not price/sale, recolor to foreground or cyan.
- **Light theme parity.** `html.light` tokens exist and are sane — verify coral-as-money holds there too.

Rationale: a single accent meaning is the cheapest, most durable premium signal. · Effort: M · Risk: low (token-spend discipline, not token change). · **SAFE**

---

## 2. Type scale

Current heading scale is the loudest anti-luxury signal in the system: `h1 { text-5xl md:text-7xl lg:text-9xl }` with `font-weight: 800` and `letter-spacing: -0.02em` (`index.css:296-299, 283-294`). `lg:text-9xl` (~128px) extra-bold is a "Gen Z poster," not a calm store — and in Arabic (Changa), 800 weight at that size crowds the counters and reads heavy.

Proposed restrained scale (Changa headings / Cairo body):
- `h1`: `text-3xl md:text-4xl lg:text-5xl`, weight **700**, `letter-spacing: -0.01em`. Big enough to lead, calm enough to trust.
- `h2`: `text-2xl md:text-3xl`, weight 700.
- `h3`: `text-xl md:text-2xl`, weight 600.
- Body: keep Cairo, 16px base (already enforced for inputs — good for iOS). Introduce a deliberate **measure** (max ~65ch) on PDP description blocks so long Arabic paragraphs don't run edge-to-edge.
- Establish **two** type roles only: "display" (Changa, headings) and "text" (Cairo, everything). Today the line between them is informal.

Rationale: quiet luxury = refined type, not oversized type. Smaller, lighter, well-spaced headings instantly read more expensive. · Effort: M (touches global `h1`, audit per-page overrides) · Risk: medium (visible everywhere; needs a screenshot pass). · **STRATEGIC**

---

## 3. Spacing rhythm

Adopt a strict **8px base grid** and a small named scale so vertical rhythm stops being ad-hoc. The codebase already has `mobile-padding`/`mobile-gap` utilities (`index.css:631-637`) — extend that instinct into a section rhythm:
- **Section vertical padding:** standardize home/PDP sections to `py-16 md:py-24` (calm breathing room between blocks — currently sections butt together, see `audit-01`).
- **Card internal rhythm:** consistent `p-4 sm:p-6`, with image → title → price → CTA spaced on the same 8px multiples.
- **PDP left column:** more whitespace between price, stock, delivery box, and description (`cro-03` is dense top-left). Generous space around the price is itself a premium cue.
- **Container max-width:** confirm a single content max-width and consistent gutter; the homepage hero+sidebar layout (`audit-01`) looks boxed/template-like partly from uneven gutters.

Rationale: rhythm and whitespace are the highest ROI premium lever — costs nothing in performance, reads as "designed." · Effort: M · Risk: low. · **SAFE**

---

## 4. Premium card treatment

Current card (`product-card.tsx:77`) stacks: `rounded-[2rem]` + `backdrop-blur-xl` + `bg-card/50` + cyan glow shadow + `hover:-translate-y-2` + `duration-500`. That's four premium tricks at once — the result reads busy, and `backdrop-blur-xl` is an INP/paint cost on grids.

Proposed calm card:
- **Radius:** `rounded-2xl` (16px), not `2rem` (32px). Slightly tighter corners read more product-catalog, less bubble. (`--radius: 1.5rem` global is also very round — consider `1rem`.)
- **Surface:** solid `bg-card` (drop the `/50` + `backdrop-blur-xl` on grid cards; reserve glass for overlays/sheets only). Faster, cleaner.
- **Border:** 1px `border-border`; on hover, `border-primary/25` + a *subtle* shadow lift — no cyan neon.
- **Motion:** `hover:-translate-y-1` (not `-2`) at `duration-300`. Smaller, quicker, calmer.
- **Image:** consistent `aspect-square`, `object-contain` on a faint neutral plinth so every product sits on the "same shelf" — the strongest catalog-premium cue. Keep the existing `cardImage()` WebP + fade-in.
- **Badges:** cap at **one** badge per card (priority: sale > new > low-stock). The stacked badge column (`product-card.tsx:79-90`) clutters the corner.

Rationale: a uniform, quiet "product on a shelf" card is what premium catalogs (and calm aquarium shops) actually look like. · Effort: M · Risk: low–medium (grid is high-traffic; A/B the hover). · **SAFE**

---

## 5. Calm motion language

This is the biggest single lever toward "premium + calm." The system currently ships **six infinite loops** (`index.css:50-57`, `tailwind.config.ts:52-61`): `wave`, `float`, `pulse-glow`, `rise`, `fish-swim`, `slow-zoom` — plus six swappable navbar styles with bounce/scale/glow (`index.css:847-971`).

Motion charter:
- **Ban infinite loops on commerce surfaces** (home, products, PDP, cart, checkout). Retire `fish-swim`, `float`, `slow-zoom`, `pulse-glow`, `pulse-glow-cta`, `wave` from those pages. — `index.css:50-57`, `tailwind.config.ts:52-61`
- **Allowed motion = three primitives only:**
  1. *Entrance:* `luxury-fade` (one-shot, 600–800ms, fade+8px rise) on section reveal.
  2. *Interaction:* `hover-scale 1.02` / `card-hover-lift` / `micro-bounce` on tap (already defined, `index.css:443-469`).
  3. *Confirmation:* the add-to-cart `CartPulse` — a single, short acknowledgement.
- **Durations:** standardize to 200ms (interaction) / 300ms (hover) / 600ms (entrance). One easing: `cubic-bezier(0.4,0,0.2,1)`.
- **Collapse the six navbars to one.** Ship only `navbar-ai-personalized` (the calm default); delete the glassmorphism/micro-interactions/device-adaptive/immersive variants and their `!important` walls (`index.css:856-971`). The "theme switcher" novelty is the opposite of premium consistency.
- **Honor `prefers-reduced-motion`** — CSS already does globally (`index.css:601-611, 794-803`); extend the same guard to any framer-motion usage.

Rationale: stillness IS the premium signal here; perpetual motion is the single clearest "template/AI" tell and an INP tax. · Effort: M–L (audit usages) · Risk: medium (removing the navbar switcher is a visible product decision — get sign-off). · **STRATEGIC** (motion ban: SAFE; navbar collapse: STRATEGIC)

---

## 6. Imagery direction

Imagery is where "aquarium-focused premium" is won or lost. Brand rule: **no live fish, no plants** in product/marketing imagery (CLAUDE.md). Lean into that constraint as a style.

Direction:
- **One light, warm amber (2700–3200K), from one side.** Every product shot lit like a single tank light — warm key, deep ocean shadow falloff. This is already the documented brand lighting; enforce it as a *shooting/processing rule*, not a CSS glow.
- **Consistent "shelf":** products on a neutral dark plinth or against soft graded `#0a1628→#010611`. Uniform background across the catalog is the #1 cue that separates a real brand from a marketplace of mismatched supplier photos.
- **Hero = still, cinematic, real glass.** A calm aquascape *tank* (hardscape/driftwood/equipment — no fish) shot still, not zooming (`slow-zoom` must go). The hero in `audit-01` is fine content but the headline collides with the busy mid-tone center (see §8).
- **Film grain 5–8%** (per brand) added in *post*, not as a CSS overlay — keeps it premium and cheap to render.
- **Mobile:** serve correctly-sized WebP/AVIF; the gallery already does `detailImage()`/`lightboxImage()`. Lead PDP with a clean hero image; gate the 3D/GLB viewer behind a tap (perf — see report 04).

Rationale: a coherent, single-light, fish-free imagery system turns the brand constraint into a recognizable premium aesthetic. · Effort: L (content/process discipline, ongoing) · Risk: low (no code risk; production discipline). · **STRATEGIC**

---

## 7. The "first 5 seconds" homepage story

What a first-time Iraqi shopper must absorb above the fold, in order, in ~5 seconds:
1. **"This is a real, premium Iraqi aquarium-equipment store."** — one still hero (warm-lit tank/equipment), one calm headline at the *new* restrained scale, with a dark scrim + safe zone so the cyan/coral words stay legible (today they collide with the photo — report 03 R6).
2. **"I'm safe buying here."** — the honest trust strip (`منتجات أصلية · توصيل 24 ساعة · الدفع عند الاستلام · دعم 24/7`) — keep it, but quieter: icon + label, no glow, single row.
3. **"Here's what to buy."** — immediately into a clean product grid (the calm card from §4). Get to products fast; don't bury them under hero novelty.

Fixes to the current above-fold (`audit-01`):
- The boxed hero-beside-sidebar layout reads template-y. Give the hero **full content-width** with the headline in a left/right safe zone over a scrim; move the secondary product rail *below* the fold.
- **One CTA**: a single primary "تسوّق الآن / شوف المنتجات" in cyan. No competing buttons above the fold.
- Kill any `slow-zoom`/parallax on the hero image — still and confident.
- Drop the homepage decorative `fish-swim`/`float` layers entirely.

Rationale: clarity + stillness + one action in the first 5s is the entire premium-and-converts thesis, applied to the most-seen screen. · Effort: M · Risk: medium (homepage is highest-traffic; ship behind a screenshot review). · **STRATEGIC**

---

## Cross-cutting: explicitly NOT proposed
No rebrand, no new palette, no font swap, no animated/video hero, no gold/glass "luxury" clichés, no particle fields, no fake counters/urgency, no live-fish or plant imagery, no framework change.

---

## TOP 8 STRONGEST IDEAS (ranked)

1. **Calm motion charter — kill the six infinite loops on commerce surfaces** (§5). The single biggest "template → premium" jump, and an INP win. — *STRATEGIC (motion ban is SAFE; do first)* · `index.css:50-57`, `tailwind.config.ts:52-61`
2. **Restrained type scale — h1 from `lg:text-9xl/800` to `lg:text-5xl/700`** (§2). Loudest anti-luxury signal; fixing it instantly reads more expensive. — *STRATEGIC* · `index.css:296-299`
3. **Color spend discipline — coral = money only, cyan = interaction only, retire decorative glow** (§1). Durable premium signal at near-zero cost. — *SAFE* · `index.css:394-400, 504-507`
4. **Premium card pass — solid surface, tighter radius, one badge, quiet hover** (§4). High-traffic grid; calm uniform "shelf." — *SAFE*
5. **First-5-seconds homepage — full-width still hero + scrim/safe-zone + one CTA + grid fast** (§7). Highest-traffic screen carries the whole thesis. — *STRATEGIC*
6. **Collapse six navbars into one calm default; delete the `!important` style walls** (§5). Removes the clearest novelty/template tell. — *STRATEGIC* · `index.css:847-971`
7. **8px spacing rhythm + section `py-16/24` + roomier PDP left column** (§3). Whitespace is the cheapest luxury. — *SAFE*
8. **Single-light, fish-free, uniform-background imagery system** (§6). Turns the brand constraint into a recognizable premium look. — *STRATEGIC*
