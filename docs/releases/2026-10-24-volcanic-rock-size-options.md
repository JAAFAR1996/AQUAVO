# AQUAVO volcanic stone sizes — production release verification

Date: 2026-10-24
Scope: product detail presentation for existing red and black volcanic stones, plus security dependency updates required by protected GitHub branch checks.

## Expected customer behavior

- Both existing product slugs stay unchanged.
- Show four labelled size choices in ascending order: 1–2 cm (small), 3–5 cm (medium), 5–8 cm (large), 10–30 cm (extra large).
- Only the existing 3–5 cm catalog item is purchasable when stocked. Other sizes are coming soon, and cannot be added to cart.
- The photo note specifies existing product photos correspond to 3–5 cm stones.
- Current unit price is per kg. Size in cm refers to dimensions of stones, not purchase quantity.
- Locale spec-key matching supports Arabic, English and Sorani translations.

## Non-negotiable invariants

- Do not create additional simple product records, migrate stock identities, or edit the orders table.
- Do not change quantity, prices, costs, inventory movements or return paths.
- Existing historical returns rely on base-product inventory identity; keep has_variants=false.
- No launch if mandatory security, compile, build or test checks fail.

## How to verify

1. Review the exact GitHub pull-request head and require green protected `✨ Pipeline Status`.
2. Verify production deployment from the resulting main merge SHA is READY.
3. Open `/products/houyi-volcanic-stone-red` and `/products/houyi-volcanic-stone-black`.
4. Confirm the four options, three upcoming-only states, and true 3–5 cm availability.
5. Read back production `products` and verify canonical inventory, prices and has_variants are unchanged.
6. If a runtime regression is confirmed, restore the prior READY production build via the authorized Vercel rollback workflow; do not alter product data.

This is an audit record, not a migration script.
