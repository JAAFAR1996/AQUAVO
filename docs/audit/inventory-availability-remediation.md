# F-6 — Inventory Availability Invariant: Remediation

Agent: **InventoryAvailabilityInvariantAgent**
Scope owned: inventory availability, checkout stock validation, and their tests.
Date: 2026-07-24. Branch: `feat/accounting-canonical-fulfillment`.

Safety: no writes to production. Read-only diagnosis and repair validation were
run **only** against `NEON_VERIFY_DATABASE_URL` (branch `br-round-dust-a4t0kt58`,
migrated + test-contaminated). No connection strings are reproduced here.

---

## 1. Summary

`products.stock` (the storefront availability source) and the production
**enforce-mode canonical inventory ledger** (`inventory_movements` →
`inventory_canonical_balances`) can disagree. When they do, a customer sees a
product as in stock, adds it to the cart, and at checkout the DB trigger
`prevent_negative_inventory_balance` RAISES `insufficient canonical inventory
balance …`. That raw Postgres error was **not recognised** by the order route's
error mapper, so it escaped as **HTTP 500** with an English message.

Fix, entirely within owned surface:

1. `server/storage/order-storage.ts` — detect the ledger rejection and translate
   it into the canonical Arabic availability error (`STOCK_ERROR_INSUFFICIENT`);
   the transaction has already rolled back, so no order and no oversell.
2. `server/routes/orders.ts` — map every stock/availability rejection to
   **HTTP 409 `OUT_OF_STOCK`** (matching the cart route's existing convention),
   never a 500. Genuine validation faults stay 400.
3. A read-only **reconciliation report** and a controlled, idempotent **repair
   script** (opening movements, never a blind overwrite) — neither run on prod.
4. Tests reconstructing the live ledger on PGlite + storage/route-level tests.

---

## 2. Writer inventory (who writes availability state) — file:line

`inventory_canonical_balances` is a **VIEW** (`SELECT … sum(quantity_delta) …
GROUP BY product_id, variant_id, location_id`) — it has no writer; it is derived
from `inventory_movements`. There is **no reservation table** in this system.

| # | Target | Writer (file:line) | Path | Notes |
|---|--------|--------------------|------|-------|
| 1 | `products.stock` (base) | `server/storage/order-storage.ts:300` | app | storefront order decrement (non-variant) |
| 2 | `products.variants[].stock` + base | `server/storage/order-storage.ts:275,286` | app | storefront order decrement (variant) |
| 3 | `order_items_relational` INSERT | `server/storage/order-storage.ts:378` | app | **fires the ledger trigger chain** |
| 4 | `products.stock` | `server/storage/invoice-storage.ts:319` | app | admin/WhatsApp manual invoice (`GREATEST(stock-qty,0)`) |
| 5 | `products.stock` | `server/routes/admin.ts:398` | app | restore on order cancellation (`stock + qty`) |
| 6 | `products.stock` | `server/routes/admin.ts:441` / `product-storage.updateProduct` | app | admin product edit / restock |
| 7 | `products.stock` | `server/mcp/index.ts:135` | app | MCP stock adjustment |
| 8 | `products.stock` | `server/services/auto-order-processor.ts:201` | app | auto-reorder decrement |
| 9 | `products.stock` | `server/services/data-seeder.ts:260` | app | seed |
| 10 | `inventory_movements` INSERT (sale) | trigger `record_order_item_inventory_sale()` | **DB trigger, prod-only** | gated by `settings.inventory_ledger_mode='enforce'`; not in any repo migration |
| 11 | `products.stock` / `products.variants[].stock` | trigger `project_inventory_movement_to_product_stock()` | **DB trigger, prod-only** | overwrites stock with `SUM(inventory_movements.quantity_delta)` at MAIN |
| 12 | `inventory_movements` (opening/reconciliation) | owner batch, `created_by='owner:جعفر'` | **manual, out-of-band** | 185 rows on prod, `owner_approved_storefront_opening` / `inventory_reconciliation` |
| 13 | `inventory_movements` (opening, repair) | `migrations/inventory_availability_repair.sql` | **new, not run on prod** | opening deltas for genuinely divergent SKUs |

Provenance of #10/#11 (and the guard `prevent_negative_inventory_balance`) is
fully established in `docs/audit/orderitem-trigger-forensics.md`: they exist live
in production but in **no committed migration** — production was changed outside
version control.

---

## 3. Documented source of truth for storefront availability

**`products.stock` (and per-variant `products.variants[].stock`) is the ONE
storefront-availability source of truth.** Every read path already uses it:
product listing/detail, cart add (`order-storage.ts:604-611`, returns 409 via
`cart.ts:93`), and the transactional checkout lock (`order-storage.ts:222-301`,
which `SELECT … FOR UPDATE` locks the product row before validating/decrementing,
preventing oversell).

The **canonical ledger** (`inventory_movements` → `inventory_canonical_balances`)
is a **second, DB-enforced backstop** that must never *contradict* the storefront
source for an advertised SKU. It checks availability at the exact granularity the
sale is written:

* non-variant line → `variant_id IS NULL` (base pool) at location `MAIN`
* variant line → `variant_id = <ordered variant>` at location `MAIN`

Remediation keeps `products.stock` authoritative for advertising and locking, and
makes the ledger *agree* with it for divergent SKUs (via reconciling opening
movements), rather than letting the ledger silently reject advertised sales.

---

## 4. Root cause (with evidence)

**Two distinct phenomena; both proven on the verify branch.**

### 4a. Genuine divergence (the real HTTP 500) — F-6
The owner's one-time opening/reconciliation batch created positive
`inventory_movements` for **some** products/variants but not all, while
`products.stock` advertises many as available. For a SKU with `products.stock>0`
but canonical balance ≤ 0 at the checkout granularity, the first sale movement
(`-qty`) drives the running balance negative and
`prevent_negative_inventory_balance` RAISES `insufficient canonical inventory
balance …`, aborting the order. The forensics doc records prod state: 185
movements, **all** opening/reconciliation, **zero** `order_line`; `enforce` mode
live. Coordinator measured **27 of 129** advertised-in-stock products with summed
canonical ≤ 0.

### 4b. Reporting false-positive (the 29/102 number) — a query blind spot
The count the agent-through-API path (and e2e certification **D13b**) reports uses
`NOT EXISTS (… b.variant_id IS NULL AND b.canonical_stock > 0)`. That inspects
**only the base pool**. For a **variant** product, stock and sales live at
`variant_id = <variant>`, so the base `variant_id IS NULL` balance is structurally
0/absent even when every variant is perfectly healthy. That query therefore
**over-reports** divergence for variant products.

Measured live on the verify branch (read-only):

```
D13b (base-only) query      : advertised_in_stock=102  divergent=29
Breakdown of those 29       : has_variants=true  count=29  (ALL variant products)
                              base canonical for all 29 = 0
Their in-stock variant SKUs : variant_lines=110  with_positive_canon=110
                              with_zero_or_neg_canon=0
Authoritative per-SKU report: advertised_skus=183  unorderable_skus=0
```

So on the verify branch, **all 29 "divergent" products are false positives** — at
the granularity checkout actually hits, every one of their 110 in-stock variant
SKUs has a positive canonical balance and is orderable. The genuine unorderable
count there is **0**.

**Conclusion:** the F-6 500 is real (4a), but the headline divergence *count* is
inflated by a base-only query that cannot see variant balances (4b). Any repair
that trusted the D13b list would open phantom base-pool stock for healthy variant
products — which is exactly why the shipped report and repair operate **per-SKU**.

> Defect reported to coordinator (Agent 4 owns `e2e/certification.spec.ts`): D13b's
> availability query must be per-SKU (`variant_id IS NOT DISTINCT FROM`) or it will
> keep reporting variant products as unorderable when they are fine.

---

## 5. Exact current divergence count

* **Production (coordinator-measured, authoritative for prod):** 27 of 129
  advertised-in-stock products have summed canonical ≤ 0.
* **Verify branch, D13b base-only query:** 29 of 102 — **all false positives**
  (variant products; see §4b).
* **Verify branch, authoritative per-SKU report (this remediation):** **0**
  genuinely unorderable SKUs of 183 advertised.

I did not (and must not) query production, so the prod per-SKU genuine count is
not re-measured here; run `migrations/inventory_availability_reconciliation_report.sql`
REPORT A against prod (read-only) to obtain it. Its structure is validated against
the live ledger schema on the verify branch.

---

## 6. Before / after checkout behaviour

| Scenario | Before | After |
|----------|--------|-------|
| Advertised + canonical positive | 201 order created | 201 order created (unchanged) |
| Advertised but canonical ≤ 0 (F-6 race) | **HTTP 500**, raw `insufficient canonical inventory balance` leaked | **HTTP 409** `{message: "الكمية المطلوبة غير متوفرة حالياً", code: "OUT_OF_STOCK"}` |
| Lock-time insufficient stock | HTTP 400 | **HTTP 409** `OUT_OF_STOCK` (unified with cart) |
| Balance changes between cart and checkout | HTTP 500 | HTTP 409 controlled |
| Not found / invalid variant / bad payload | HTTP 400 | HTTP 400 (unchanged) |

No oversell in any case: checkout still `SELECT … FOR UPDATE` locks the product
row, and the DB guard remains an independent backstop; on rejection the whole
transaction rolls back (no order row, no movement).

Code:
* `server/storage/order-storage.ts` — `isCanonicalInventoryBalanceError()` +
  catch-clause translation to `STOCK_ERROR_INSUFFICIENT`.
* `server/routes/orders.ts` — stock/availability → 409 `OUT_OF_STOCK`; validation → 400.

---

## 7. Reconciliation report + repair

### Report (read-only) — `migrations/inventory_availability_reconciliation_report.sql`
SHA-256: `222fa9190f9e3d7ae5b8ff77563798ff51aae5d0cc06ed9c8d7d0423f951e9e1`

* **REPORT A (authoritative):** per-SKU list — every advertised SKU (base or
  in-stock variant) whose canonical balance at the checkout granularity is ≤ 0.
  This is the definitive divergent list and the exact set that would 409.
* **REPORT B:** counts (advertised_skus / unorderable_skus / unorderable_products).
* **REPORT C:** reproduces e2e D13b base-only query for comparison; its gap vs A
  is the variant false-positive set.

Validated on verify branch: runs clean; REPORT A = 0 rows, REPORT C = 29 rows.

### Repair (NOT run on prod) — `migrations/inventory_availability_repair.sql`
SHA-256: `b75d278fd6c7040ff7bea327e21dccf60749f70d076dc277fe48ff8022f9fb92`

For each genuinely divergent SKU it appends ONE `opening_balance` movement with
`quantity_delta = advertised_stock − current_canonical_balance` (always > 0 here),
raising canonical to exactly the physically-counted `products.stock`. It:

* is **not a blind overwrite** — it appends an auditable movement (same mechanism
  as the owner's opening batch), never `UPDATE`s the view or copies stock over the
  ledger wholesale;
* **only opens SKUs already advertised as physically in stock** (`stock>0`), so
  zero/negative-stock SKUs never become available;
* keeps **variant stock correct** — per-variant deltas at `variant_id`;
* cannot trip `prevent_negative_inventory_balance` (delta > 0);
* is **idempotent** (`idempotency_key = availability-reconciliation:<product>:<variant|base>`,
  `ON CONFLICT DO NOTHING`);
* is wrapped `BEGIN … ROLLBACK` with a post-repair verification SELECT, so a naive
  full-file run changes nothing — the operator must review then swap `ROLLBACK`
  for `COMMIT`.

Validated on verify branch: `INSERT 0 0`, post-check 0 rows, ROLLBACK (no-op, as
expected since verify has 0 genuine divergence).

---

## 8. Tests (written and run)

New file `server/__tests__/inventory-availability.test.ts` (PGlite, faithful
reconstruction of the live enforce-mode ledger DDL from the forensics doc) +
additions to `server/__tests__/orders-api.test.ts`.

| Required case | Test | Result |
|---------------|------|--------|
| advertised + canonical positive → purchasable | "advertised + canonical positive -> a sale succeeds…" | pass |
| advertised + canonical zero → rejected before payment | "advertised + canonical zero -> the sale is REJECTED…" | pass |
| balance changes cart→checkout → 409 not 500 | orders-api "translates the ledger rejection into the clean Arabic stock error (mapped to 409)…" | pass |
| concurrent final-unit → one succeeds, one controlled fail | "never goes negative: selling the final unit succeeds, the next unit is rejected" | pass |
| no negative stock | same as above (asserts canonical == 0, never < 0) | pass |
| variants use own canonical balance | "variants draw down their OWN balance, not a sibling's" | pass |
| admin stock adjustment updates storefront source of truth | "an opening/adjustment movement projects onto products.stock…" | pass |
| reconciliation identifies all divergent products | "REPORT A identifies exactly the genuinely divergent SKUs…" + "the legacy D13b…FALSELY flags…" | pass |
| no unrelated inventory movement created | "the shipped repair opens the divergent SKUs…and creates NO unrelated movements" (asserts exactly +2, idempotent) | pass |
| detector unit | orders-api "isCanonicalInventoryBalanceError detects…direct and wrapped in cause" | pass |

Full-suite run after changes:

```
Test Files  114 passed (114)
     Tests  1559 passed (1559)
```

(Baseline was 112 files / 1538 / 0 failed; the delta is the new file plus the
added cases. 0 failures.)

---

## 9. Open items / handed to other owners

* **e2e/certification.spec.ts D13b (Agent 4):** its availability query is
  base-only and reports variant products as unorderable when they are fine.
  Recommend replacing with the per-SKU logic of REPORT A. Reported, not edited
  (outside my ownership).
* **Production application of the repair:** not performed (prod is off-limits).
  Run REPORT A read-only on prod to get the genuine per-SKU list, then apply the
  repair inside a transaction with the built-in post-check. The out-of-band
  triggers `record_order_item_inventory_sale` / `project_inventory_movement_to_product_stock`
  should still be captured into a committed migration for provenance (tracked in
  `orderitem-trigger-forensics.md`; DDL authorship is not in my ownership).
* **Long-term:** the dual stock-writer situation (app path decrements
  `products.stock` directly **and** the trigger recomputes it from the ledger)
  remains two mechanisms writing one column. This remediation makes them
  *agree for advertised SKUs* and stops the 500, but a single-writer design
  (ledger-derived stock only) is the durable fix and is larger than F-6.
