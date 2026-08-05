# AQUAVO website brand source

## Canonical identity

The AQUAVO website uses **AQUAVO Visual Identity v2** as its only approved visual source.

Confirmed foundations:

- Primary teal: `#0B93A6`
- FlowLine blue: `#0B64A6`
- Deep hull: `#0B1E28`
- Light mode is the default; dark mode remains supported
- Arabic UI/body: Cairo
- Hero-scale Arabic display headings: Changa
- Latin text and numerals: Inter
- Arabic-first RTL interface

Use the transparent v2 SVG/PNG logo assets in this folder. Do not reconstruct or trace the logo from old raster files.

Small or normal-weight teal text on a light background must use `#075F6B`, not
`#0B93A6` — the primary teal is 3.33:1 on `#F6F4EF` and fails WCAG AA below
18pt/14pt-bold. Clean Proof `#F6F4EF` is the default page background; `#FFFFFF`
is a card surface only. Shared radius is 8px.

`#0B64A6` is the **FlowLine product family** colour and Category Bands only. It
must never stand in for the global primary.

## Retired material

The cyan `#199bb8` / coral `#ff7b5a` / amber `#ffd700` palette, the
`#010611`/`#0a1628` backgrounds, the `#22c55e` success colour, the dark-only rule,
and the glassmorphism and glow treatments are all **retired and prohibited**. They
came from an unapproved parallel system and must not be used for the storefront,
design-system generation, or future UI work. Note `#0a1628` is not `#0B1E28`.

`AQUAVO_BRAND_GUIDELINES.md` previously carried that retired palette as if it
were authoritative. It was **rewritten on 2026-08-05** to the v2 system and is now
safe to read — the file is publicly served, so leaving the old guidance in place
meant anyone reading it would rebuild the rejected system. Older cyan
logo-package notes remain legacy material.

There is no approved success/green colour. Never invent one; express stock and
confirmation states with neutral text, or the warning token for low stock.

When legacy code or documentation conflicts with v2, v2 is authoritative. Record
the conflict instead of silently copying the legacy rule.

## Storefront principles

- One teal primary accent; FlowLine blue is structural/secondary
- Warm light surface by default, with a fully supported dark option
- Thin hairlines and restrained elevation
- No decorative glassmorphism, glow, continuous loops or generic AI gradients
- Iraqi Arabic, RTL-first, with no emoji in customer-facing interface copy
