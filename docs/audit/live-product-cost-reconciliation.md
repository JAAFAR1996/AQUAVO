# Live product-cost reconciliation — where the "27 orderable zero-cost products" came from

**Date:** 2026-07-24
**Scope:** the F-10 magnitude claim only. No new audit, no new findings.
**Production:** project `shiny-tree-43710630`, branch `br-patient-mouse-a4d4cgr4`
**Access used by this document:** none. Every production number below is the
owner's direct read-only audit, restated here as the authoritative baseline. No
write, deployment, promotion, reset or branch operation was performed.

---

## 1. The false claim, withdrawn

The Phase B F-10 entry asserted:

> **30** products are `cost_price = 0 / unresolved`, **27 orderable now** (`stock > 0`).

**Both numbers are false for production.** They are withdrawn from the findings
register, from `accounting-semantics-remediation.md`, from
`neon-migration-review.md`, from the header of
`migrations/add_product_cost_resolution.sql` and from the PGlite fixture in
`server/__tests__/product-cost-resolution-migration.test.ts`.

## 2. Corrected production numbers (verified read-only, 2026-07-24)

| Classification | Count |
|---|---|
| Total products | **114** |
| Active products (`deleted_at IS NULL`) | **114** |
| Soft-deleted products | **0** |
| Active, `cost_price > 0` (known) | **113** |
| Active, `cost_price = 0` | **1** |
| Active, `cost_price IS NULL` | **0** |
| Active **in stock** with `cost_price = 0` | **0** |
| Deleted zero-cost products remaining | **0** |
| Active with `packaging_cost = 0` | **114** |
| Active with `insert_cost = 0` | **114** |

The single active zero-cost product:

| Field | Value |
|---|---|
| id | `houyi-mountain-wood` |
| name | خشب الجبل الطبيعي |
| selling price | 5,000 |
| stock | **0** |
| variants | none |

Production has **no** `cost_price_resolution`-style columns deployed, and still
defines `cost_price DEFAULT 0`, `packaging_cost DEFAULT 0`,
`insert_cost DEFAULT 0`.

## 3. Exact origin of the false count

Two independent mistakes compounded, and each is individually sufficient to
produce a wrong answer.

**(a) The wrong database.** The count was taken on the *verification branch*, not
on production. That branch still held **29 soft-deleted products** with
`deleted_at IS NOT NULL` and `cost_price = 0`. Production has since permanently
deleted exactly those 29 rows (backup branch
`production-backup-before-hard-delete-soft-products-20260724` /
`br-summer-dawn-a45g2zi5`), after independent checks proved each carried zero
JSONB order-line, relational order-item, inventory-movement, goods-receipt,
purchase-order and supplier-product references. Only non-financial supporting
rows existed (interactions, views, embeddings, variant reconciliation records),
removed in the same transaction.

**(b) The wrong grain.** The query asked *"how many products have
`cost_price = 0`?"* with **no `deleted_at IS NULL` predicate**. Soft-deleted rows
are not products for any availability or costing question:

```
29 soft-deleted zero-cost  +  1 active zero-cost  =  30      ← the false "30"
```

**(c) Stale stock read as availability.** "Orderable" was then derived by
filtering that same unfiltered set on `stock > 0`. `products.stock` is *not
cleared when a product is soft-deleted*, so deleted rows retain whatever stock
they had at deletion time. 27 of the 29 deleted rows carried a positive stale
stock — that is the "27". It never described anything a customer could buy:
`lockProductRowForUpdate` has always carried `AND deleted_at IS NULL`, so a
soft-deleted product could never be locked, let alone ordered.

Applying the correct grain to production today:

```sql
-- live/orderable grain — the ONLY correct form for an availability question
SELECT count(*) FROM products
 WHERE deleted_at IS NULL AND cost_price::numeric = 0 AND stock > 0;   -- → 0
```

The mistake is now pinned by an executable test rather than prose —
`server/__tests__/product-cost-resolution-migration.test.ts`, test
*"REPRODUCES THE FALSE COUNT: dropping `deleted_at IS NULL` inflates it"* — which
asserts both the correct answer and the two wrong ones on the same fixture.

## 4. Current live exposure

**None.** The generic code defect was real, but no production product could have
been ordered through it:

- 113 of 114 active products carry a positive, known cost;
- the one ambiguous `cost_price = 0` belongs to an out-of-stock product;
- an out-of-stock product cannot create an order (regression-tested);
- a soft-deleted product can never be locked, so it can never be ordered
  (regression-tested).

No historical order has a fabricated `exact 0` COGS attributable to F-10.

## 5. Latent risk that remains (F-10b)

The defect is **forward-looking**, not historical. While production still carries
`cost_price numeric DEFAULT '0'`, the *next* product created without a cost is
born holding a zero indistinguishable from a deliberate one. The application
layer now writes `NULL` + `unresolved` explicitly, so the remaining exposure is
confined to writers that bypass `ProductStorage` — a direct SQL import, a psql
session, a future service. `migrations/drop_product_cost_zero_defaults.sql`
closes it at the database. **It has not been applied to production.**

## 6. Packaging and insert costs (F-10c)

All 114 active products have `packaging_cost = 0` and `insert_cost = 0`. Under
the corrected rule these resolve to **UNKNOWN**, not to a cost of zero, so every
line snapshots `incomplete` rather than `exact`. That is deliberate and is *not*
remediated in code: promoting them to `verified_zero` requires owner evidence,
and inventing a packaging cost would be strictly worse than honestly reporting
`incomplete`. The monetary COGS total is unchanged either way — an unresolved
zero contributed exactly 0 before and contributes nothing now; only the honesty
of the status changes.

## 7. What changed in code

| Change | File |
|---|---|
| Lock reads the three `*_resolution` columns, tolerant of the migration being absent | `server/services/product-cost-snapshot.ts` |
| `resolveSnapshotComponent` — same decision table as `resolveCostComponent` | `server/services/product-cost-snapshot.ts` |
| Unresolved 0 → `unknown`/NULL; verified 0 → `verified_zero`/exact 0 | `server/services/product-cost-snapshot.ts` |
| `normalizeProductCostWrite` — no product write can create a bare ambiguous zero | `server/services/product-cost-snapshot.ts`, `server/storage/product-storage.ts` |
| JSONB read path honours `verified_zero`; a plain `exact 0` falls back | `server/services/accounting-engine.ts` |
| `costStatus` vocabulary gains `verified_zero`; product cost columns lose their `.default("0")` | `shared/schema.ts` |
| Forward + rollback migration for the DDL defaults | `migrations/drop_product_cost_zero_defaults{,_rollback}.sql` |

Storefront (`OrderStorage.createOrderSecure`) and admin/WhatsApp
(`InvoiceStorage.createOrderFromInvoice`) both route through the same two
canonical functions; a parity test drives five distinct cost shapes through both
paths and asserts the snapshots are identical field-for-field.
