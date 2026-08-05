# AQUAVO — Brand Implementation Guidance

**Status:** active · aligned to **AQUAVO Master Identity System v2**
**Corrected:** 2026-08-05

> **This file is implementation guidance, not the source of truth.**
> The authority is the **AQUAVO Master Identity System v2** archive
> (`AQUAVO_Final_Master_Identity_System_v2.zip`). Owner overrides and approved
> commercial claims live in the repository's `CLAUDE.md`. If this file disagrees
> with either, **they win** — then correct this file.
>
> **What changed and why.** Earlier versions of this document described a
> different colour system: `#199bb8` cyan as "the primary identity colour",
> coral `#ff7b5a`, amber gold `#ffd700`, `#010611`/`#0a1628` backgrounds, a
> `#22c55e` success colour, cyan gradients, and a "dark brand — never use white
> as a background" rule. **That system was never approved** and is archived.
> Because this file is served publicly it was actively instructing readers to
> rebuild the rejected palette, so its guidance has been replaced. Do not restore
> the old values from memory, from an old branch, or from a cached copy.

---

## 1. Colour

Exactly these tokens. Nothing else.

| Token | Hex | Use |
|---|---|---|
| **Primary teal** | `#0B93A6` | Global primary. CTA fills, large or bold headings, icons, borders, brand marks, decorative accents. |
| **Primary dark** | `#075F6B` | **Small or normal-weight teal text on light backgrounds.** See §2. |
| **Clean Proof background** | `#F6F4EF` | Default page background for every transactional surface. |
| **Dark Authority background** | `#0B1E28` | Brand-voice, social and educational content (including guide pages). Never invoices, packaging, or legally-weighted documents. |
| **White** | `#FFFFFF` | Card and Proof Window surfaces **only** — never a full page background. |
| Text | `#232323` | Primary text on light. |
| Text muted | `#6B6B6B` | Secondary text on light. |
| Text on dark | `#FFFFFF` | Text on Dark Authority. |
| Border | `#DDD8CE` | Structure and dividers. |
| Warning | `#C97A2E` | Real warnings and low stock. Never decorative or promotional. 18pt+/bold or icon only. |
| Substrate family | `#C9AE8C` | Substrate products (stones, sand). **Icon/accent only — never text.** |
| FlowLine family | `#0B64A6` | **FlowLine products only** (air tubes, air stones, check valves) and Category Bands. See §3. |

### Prohibited — archived, never adopted

`#199BB8` (cyan) · `#FF7B5A` (coral) · `#FFD700` (amber/gold) · `#0A1628` · `#010611`

These came from an unapproved parallel exploration. They were never checked
against the owner-approved brief, they introduce colours with no documented
rationale, and they conflict with the real locked primary. Note that `#0a1628`
is **not** `#0B1E28` — the approved dark background is `#0B1E28`.

Also retired with that system: dark-only layouts, glassmorphism, glow treatments,
and gradient accents.

### There is no success colour

No approved green / success / in-stock colour exists, and none may be invented.
Do not add `--aqv-success`. Do not use Tailwind `green-*` or `emerald-*`. There
is no approved red either — use the warning token.

| State | Use |
|---|---|
| Available / in stock | `#232323` or `#6B6B6B`, as **text** |
| Low stock | `#C97A2E` (18pt+/bold, or icon) |
| Out of stock | explicit text **plus** a disabled control — never colour alone |
| Order confirmed | `#0B93A6`, or neutral text |

---

## 2. Contrast rules

- `#0B93A6` on `#F6F4EF` is **3.33:1** — it **fails WCAG AA for normal body
  text**. Permitted for large text (18pt+, or 14pt+ bold), icons, borders, fills.
- For **small or normal-weight teal text on light**, use `#075F6B` (7.0:1).
- `#0B93A6` on `#0B1E28` passes at 4.66:1 at any size.
- `#C9AE8C` is 1.93:1 on light — never text, at any size.
- `#0B64A6` is safe as text on light (5.64:1) but fails on dark (2.75:1).
- Re-verify any new pairing; the ratios above cover only the listed combinations.

---

## 3. FlowLine is a product family, not the brand

`#0B64A6` identifies the **FlowLine** product family, and Category Bands. Each
family owns one colour and **no family ever borrows another's**.

**`#0B64A6` must never replace the global primary `#0B93A6`** — not as
`--primary`, not as `--ring`, not as a site-wide accent. Using FlowLine as the
light-theme primary makes the brand colour change by theme and brands the whole
store as a single product family. That bug shipped once; do not repeat it.

---

## 4. Typography

| Face | Role |
|---|---|
| **Cairo** | Arabic body, headings, labels and all interface text. The default. |
| **Changa** | Display and campaign headings **only**, at 40px and above. Never body, labels or invoices. More than one Changa headline in one asset is already overuse. |
| **Inter** | English, Latin, technical and numeric content — specs, captions, buttons. |

- Arabic body line-height **1.8** — the cursive script needs the vertical room.
- **Never** letter-space or justify-stretch Arabic; it breaks contextual
  letterform connections. Ragged on the visually-left edge in RTL.
- Arabic is always larger and visually dominant over adjacent English on any
  consumer-facing surface.
- Do not add a fourth family. An earlier build loaded **Outfit**; it was removed
  and its absence is enforced by a test.

Scale: 11 · 13 · 16 · 20 · 28 · 40 · 56 px. 11px is the smallest size permitted
anywhere in the system.

---

## 5. Shape, elevation, spacing

- **Shared radius: 8px** — canonical, including the Proof Window and product
  diagrams.
- **Proof Window elevation:** `0 16px 44px rgba(10, 22, 40, 0.10)` — the only
  approved shadow. Prefer hairline borders over shadows elsewhere.
- **Spacing base unit: 8px.** Every margin, gap and padding a multiple of it.
- Do not nest cards inside cards without a structural reason — one radius level
  per composition.

---

## 6. Motion

The only approved motion device is the logo's infinity loop drawing itself in a
single continuous stroke, **600–800ms, ease-in-out**, for loading/intro states.

**Prohibited:** bounce, spring physics, overshoot easing (any cubic-bezier
control point above 1), particle effects, continuous decorative loops, and
water/caustic animation. The Precision Waterline is the **only** approved literal
water reference outside the logo — do not add wave graphics elsewhere.

Otherwise permitted: opacity, and small linear or ease-out translation. All
motion must respect `prefers-reduced-motion`.

---

## 7. Visual DNA components

- **Clean Proof** — the light transactional register.
- **Dark Authority** — the dark brand-voice register.
- **Product Proof Window** — bordered, elevated frame around the product visual.
- **Precision Waterline** — 2px teal section divider with a small dashed accent.
- **Category Bands** — 8px family-colour bar.
- **Aquarium Clarity Principle** — water that is actually clean has nothing
  floating in it. Any layout with unnecessary decoration, competing focal points
  or clutter fails this test by its own logic.

---

## 8. Voice

- Iraqi Baghdadi Arabic, RTL-first. Confident expert, not a salesman.
- **No emoji** in customer-facing interface copy.
- State real function plainly; no borrowed premium, no invented urgency.

---

## 9. Claims and names

Publish only claims approved in `CLAUDE.md` ("Owner-approved commercial claims")
or `02_Legal_Brand_Usage` in the v2 archive. Current approved set:

- التوصيل خلال 24 ساعة إلى جميع المحافظات العراقية
- الدعم متوفر 24/7
- الرد خلال 24 ساعة إذا وصل المنتج تالف
- الدفع عند الاستلام
- مختار ومفحوص ومعبأ بواسطة AQUAVO

**Never** claim manufacturing, certification, laboratory testing, "safe for all
fish", "100% natural", "chemical-free", the ® symbol, or any live-organism
association — AQUAVO does not sell live fish or plants. A badge graphic implying
certification is as much a false claim as the equivalent text. Cash on delivery
is the only payment method; never imply cards or gateways.

Names: **AQUAVO** is the consumer brand. **محل المنبع / AL NABEA SHOP** is the
legal entity and leads on invoices, receipts and the footer legal line. The
spelling "Al-Manbaa Store" does not exist.

Official contact: `INFO@AQUAVOIQ.COM` · `07747880673` · `aquavoiq.com` · `aquavo_iq`

---

## 10. Logo

Use the transparent v2 SVG/PNG assets in this folder. The website header uses the
horizontal lockup. Never reconstruct or trace the wordmark from old raster files,
never recolour outside the approved one-colour variants, never stretch, and never
use the full lockup below 120px wide — switch to the icon-only version instead.

---

## 11. Where to look

| Need | Source |
|---|---|
| Colour, type, Visual DNA tokens | v2 archive `04_`, `05_`, `06_` |
| Logo versions, clear space, minimums | v2 archive `03_Logo_System` |
| Names, approved and banned claims | v2 archive `02_Legal_Brand_Usage` |
| E-commerce rules, hero order, badges | v2 archive `11_Ecommerce_System` |
| Owner overrides and decisions | repository `CLAUDE.md` |
| Live token implementation | `client/src/styles/identity/*.css` |
