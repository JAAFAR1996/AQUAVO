# Catalogue organization — 2026-10-22

Owner: جعفر. Status: prepared, production application and publishing blocked pending explicit approval.

Goal: organize all 212 published products by shopping purpose, independent of supplier. The reviewed mapping changes classification for 148 products, including 19 main-category moves. It preserves 64 classifications. Existing 11 canonical category identities remain intact.

The UI adds type selection inside a single selected category. It distinguishes full filters, filter media, filter wool/foam, replacement parts, pipes/hoses, fittings and inlet guards. Food retains its existing species-oriented guide. Facet state is carried in the URL and stale facet values are ignored. Sellable-first ordering remains intact.

Data scope: only products.category, products.category_id and products.subcategory. No price, stock, variants, images, names, descriptions or product slugs change. The mapping covers all 212 products and retains before/after values. Botanical leaves and pods are grouped together in substrate/decor; this classification makes no medical claim.

Validation: 3 focused facet tests passed; Vite build passed. Read-only migration preflight validated all 148 original classifications and target category links. Production application was rejected by automatic approval review and the subsequent read-only preflight confirmed the original classifications remain. Do not retry production application without the user's explicit approval.

With approval and a verified production DATABASE_URL supplied outside the repository:

```sh
NODE_USE_ENV_PROXY=1 node --import tsx TOOLS/catalog/organize-20261022.ts check
NODE_USE_ENV_PROXY=1 node --import tsx TOOLS/catalog/organize-20261022.ts apply
```

Optionally set CATALOG_RECEIPT_PATH to a private output path for the receipt. The script checks current classification before writing, guards updates against concurrent edits and verifies the result. A conflicting partial batch is restored when possible and reported. Do not overwrite a subsequent concurrent edit.

Rollback, after checking the current state and with authorization:

```sh
NODE_USE_ENV_PROXY=1 node --import tsx TOOLS/catalog/organize-20261022.ts rollback
```

Next: explicit user approval for the 148-product classification update and UI publication, then repeat preflight, apply, publish and verify public category results. Deployment must preserve unrelated concurrent work.
