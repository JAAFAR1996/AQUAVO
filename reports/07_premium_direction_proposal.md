# AQUAVO — Premium Visual & UX Direction (PROPOSAL — needs approval)

**Status:** Strategic direction for review. **No major redesign has been applied.**
Builds on `reports/03_uiux_and_research.md` (2026 research, sources cited there).

## North star
AQUAVO should feel like a **calm, expert aquarium house** — premium and trustworthy,
not a flashy template. Every screen earns trust through honesty (real stock, real
reviews, COD clarity), restraint (calm motion, generous space), and focus (one clear
action per screen). Iraqi-friendly: Baghdadi voice, IQD, COD-first, zero emoji.

## Where AQUAVO stands vs global standards
- **Already strong:** disciplined dark-ocean tokens, honest COD/shipping/24-7 copy, no fake urgency, secure checkout, mature Meta tracking, good perf foundations.
- **Gaps to "global level":** mobile PDP CTA scrolls away; overloaded navbar; no authentic social proof; 3D media heavy; some emoji in transactional copy (🛒/🚚/🎁/💰 in order-confirmation) that contradicts the zero-emoji brand rule.

## Proposed direction (each item is opt-in, approve individually)

### D1 — Mobile-first PDP with sticky buy bar  *(highest conversion lever)*
Persistent bottom bar on mobile: price + variant + "أضف للسلة". Calm, no animation.
Pattern from Baymard/Mobiloud mobile commerce research.

### D2 — Navbar simplification
Collapse ~10 items into 4–5 primary links + a labeled **"أدوات"** menu
(calculators, fish-doctor, encyclopedia, journey). Reduces cognitive load, reads premium.

### D3 — Authentic social proof pipeline
Post-delivery review request → verified reviews → surface real ratings.
**Never fabricate.** Until real data exists, keep ratings hidden (already done on cards now).

### D4 — Calm motion system
Standardize on subtle, short, one-shot entrances; reserve looping motion for non-commerce
surfaces. Honor `prefers-reduced-motion` (CSS already global; extend to framer-motion).

### D5 — Zero-emoji transactional copy
Remove decorative emoji from order-confirmation and similar transactional UI
(🛒 منتجات, 🚚 التوصيل, 🎁 الخصم, 💰 الدفع, 🎉 tier upgrade) — replace with the existing
lucide icon set for a consistent premium look. *(Safe, but touches visible copy — listed here for your sign-off rather than applied silently.)*

### D6 — Premium PDP media
Compress GLB models (D-tier perf issue today), lazy-load the 3D viewer behind a tap,
lead with a clean hero image. Calmer first paint, far less data on mobile.

### D7 — Typographic & spacing rhythm pass
Tighten vertical rhythm, increase whitespace on PDP/checkout, one accent color per view.
Low-risk polish that reads as "agency-grade" without a rebuild.

## Explicitly NOT proposed
- No wholesale rebrand, no new color system, no framework change, no animated hero video,
  no fake counters/urgency, no live-fish/plant imagery (brand rule).

## Suggested sequencing
1. D5 (emoji cleanup) + D1 (sticky buy bar) — fastest trust+conversion gains.
2. D6 (3D/media) — biggest perf win.
3. D3 (reviews) — compounding trust over time.
4. D2, D4, D7 — polish.
