# AQUAVO — Motion & Micro-interaction Research (2026)

**Starting position:** AQUAVO already has a real, working motion foundation — this is not a greenfield decision. `client/src/lib/motion.ts` defines a tuned "Snappy Modern" vocabulary (springs, `fadeUp`/`fadeIn`/`scaleIn`/`staggerContainer` variants, tap/hover presets), and `framer-motion` (already a dependency, `^12.23.24`) is used across 35 files: hero (`minimal-hero.tsx`), page transitions (`page-transition.tsx`), product comparison, order confirmation, journey flow, chat, wishlist heart animation, product exploded-view, etc. The job here is **not** "introduce motion to a static site" — it's "close the one real gap (reduced-motion gating) and avoid adding anything that competes with an already-decent system."

**Explicitly rejected before evaluating anything else**, per the mission's own guardrails and confirmed correct by what's already live: heavy parallax, WebGL/Three.js, custom cursors, floating-bubble background loops, background video, scroll-hijacking, animating every section, loading intros, or anything that would delay access to product/price. None of these exist on the live site today and none are being proposed.

## Candidate motion patterns, evaluated

| Pattern | User purpose | Business purpose | Verdict |
|---|---|---|---|
| **App-wide `prefers-reduced-motion` gate for framer-motion** | Respect vestibular-disorder / motion-sensitivity users system-wide, not just on the one page that currently checks manually | Accessibility compliance (WCAG 2.2 AA 2.3.3), avoids a "half-accessible" motion system | **ACCEPT — evidence-backed usability. Implemented this pass.** |
| Product-card hover/press feedback (`hover.lift`, `tap.scale` from `motion.ts`) | Confirms a card is interactive before commit | Micro-trust signal, standard e-commerce pattern | Already exists in the codebase's design intent (tokens defined); verify consistent adoption — **not re-built**, out of scope to touch every card component this pass without a full regression sweep |
| Add-to-cart confirmation (fly-to-cart, button state flip) | Confirms the action succeeded without a jarring page reload | Reduces repeat-clicks / cart-count confusion | Already implemented (`lib/fly-to-cart.ts`, PDP `isAddedToCart` green-flip state per `AQUAVO_CONVERSION_FLOW_AUDIT.md` §2.1) — **keep, no change needed** |
| Cart-count transition | Small numeric badge bump | Same as above | Not inspected this pass; low risk either way, not touched |
| Skeleton/loading states on PDP | Communicate "content is coming" instead of a blank viewport | **Directly answers P1-3** (the ~2s blank PDP paint found this session) — a skeleton doesn't fix the underlying paint delay, but it changes "looks broken" into "looks like it's loading," which is a real perceived-performance win at near-zero cost | **ACCEPT in principle — flagged for Phase D, deferred implementation** (needs to be built against the actual PDP data-fetch waterfall, which needs a trace first; recommended as the immediate next step after this mission) |
| View Transition API for PDP↔listing navigation | Smoother perceived nav | Modern browser feature, native, zero bundle cost | Interesting for 2026 but Safari/Firefox support is still partial; would need a feature-detected fallback. **REJECT for this pass** — not enough certainty of payoff vs. risk to justify inside a mission focused on fixing what's broken (CSP, paint delay) over adding new surface area |
| Ambient hero "water" effect (subtle caustic/ripple) | Reinforces brand (aquarium) | Differentiation | The current hero already uses a real product photo (glass tank with driftwood/plants) rather than an abstract effect — this reads as more premium and honest than a CSS ripple overlay would. **REJECT** — would be decorative motion competing with the actual product photography, against the mission's own "reject decoration that competes with products" rule |
| Scroll-hijacking / pinned sections | — | — | **REJECT** — explicitly prohibited, and nothing in the live site does this today (confirms the store hasn't drifted toward it) |
| Constant floating bubbles | Ambient aquarium theming | — | A `bubbles-overlay.tsx` component exists and already checks `prefers-reduced-motion` (found in the codebase); not inspected for where it's mounted or how persistent it is. **Not touched this pass** — flagged only because "constant floating bubbles" is the mission's own named anti-pattern, worth a follow-up check that its usage is tasteful/occasional, not omnipresent |

## Motion tokens (already defined, restated here for the record)

From `client/src/lib/motion.ts` — this is the system of record; no new token file was created.

| Token | Value | Use |
|---|---|---|
| `springSnappy` | stiffness 500, damping 30, mass 0.8 | buttons, toggles |
| `springSoft` | stiffness 320, damping 34 | sheets, cards entering |
| `easeSnappy` | `[0.2, 0.8, 0.2, 1]` | CSS/tween fallback |
| `revealDuration` | 0.42s | standard reveal tween |
| `fadeUp` / `fadeIn` / `scaleIn` | variants | entrance animations |
| `staggerContainer` (0.06s stagger, 0.02s delay) | variant | choreographed list/grid reveals |
| `tap.scale` (0.97) / `tap.scaleStrong` (0.94) | interaction preset | press feedback |
| `hover.lift` (y: -4, springSnappy) | interaction preset | card hover |

All of the above already animate `transform`/`opacity` only (framer-motion's `y`, `scale`, `opacity`) — no layout-triggering properties. No changes needed to the token values themselves.

## Reduced-motion behavior (this pass)

- **Before:** CSS animations correctly no-op under `prefers-reduced-motion: reduce` (verified: 7 gated `@media` blocks in `index.css`). framer-motion animations did not — they'd run at full speed/distance for a user who has told their OS they don't want motion, unless a component manually checked `matchMedia` (only `home.tsx` did, for one effect).
- **After:** `<MotionConfig reducedMotion="user">` wraps `AppShell`'s render tree in `App.tsx`. This makes framer-motion cross-fade instead of animating transform/scale for every `motion.*` element site-wide whenever the user's OS reduced-motion flag is set — framer-motion's built-in behavior for this mode, not a custom implementation. No visual change for users without the OS flag set. Verified this doesn't touch CSS-only animations (already correctly gated) or break existing manual `matchMedia` checks (they still run standalone).

## Sources consulted

Given the scope of this pass (verification + one targeted fix, not a full trend survey), research leaned on the mission's own cited authorities' well-established, stable guidance rather than a fresh 15-source trawl for topics that didn't change the outcome:
- **WCAG 2.2** SC 2.3.3 (Animation from Interactions) — the basis for the reduced-motion decision.
- **web.dev / Chrome DevRel** guidance on animating `transform`/`opacity` only — confirms the existing `motion.ts` tokens already follow best practice, no change needed there.
- **Framer Motion's own docs** on `MotionConfig` / `reducedMotion="user"` — the mechanism used for the fix.

No new animation libraries were evaluated for addition — the codebase already standardized on framer-motion, and introducing a second animation library (GSAP, anime.js, etc.) would violate the mission's own "don't add a dependency merely because it's popular" rule when the existing one is adequate and already integrated.
