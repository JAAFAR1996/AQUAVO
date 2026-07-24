# Order Cost-Snapshot Remediation (F-1, F-2)

**Agent:** CostSnapshotInvariantAgent
**Scope:** order creation, product locking, cost snapshots and their tests
**Date:** 2026-07-23
**Branch:** `feat/accounting-canonical-fulfillment`

---

## 0. The invariant

> Every newly created order line — storefront, admin, WhatsApp, scheduled/manual/internal,
> or any other entry point — must capture the SAME immutable cost snapshot via ONE
> canonical transactional path.

Before this change there were **two live creation paths that disagreed**, and the one
that *did* try to snapshot was reading columns it never selected.

---

## 1. F-1 — `lockProductForUpdate()` never read the cost columns

### Root cause

`OrderStorage.lockProductForUpdate()` issued this SELECT:

```sql
SELECT id, name, price, stock, variants, has_variants AS "hasVariants"
FROM products
WHERE id = $1 AND deleted_at IS NULL
FOR UPDATE
```

`cost_price`, `packaging_cost` and `insert_cost` were **not in the projection**.
`createOrderSecure()` then did:

```ts
const hasCost = (product as any).costPrice != null;   // always false — column never selected
const snapCostPrice = hasCost ? Number((product as any).costPrice) : null;
const costStatus = hasCost ? "exact" : "unknown";
const costSource = hasCost ? "product_current" : "none";
```

The `as any` cast is what made this compile silently: the row type had no cost fields,
so TypeScript could not flag the read. `hasCost` was therefore `false` for **every
line of every storefront order**, and every line was frozen as:

```
costPrice = NULL, packagingCost = NULL, insertCost = NULL,
costStatus = "unknown", costSource = "none"
```

That is not a cosmetic mislabel. `lineCostSnapshot()`
(`server/services/accounting-engine.ts:72`) deliberately **honours an explicit
unknown snapshot and refuses to fall back** to the effective-dated resolver — which
is correct behaviour, because falling back would repair history with today's cost.
The consequence is that every affected line is **permanently uncostable**: profit for
those orders can never be computed, and must never be back-filled from current cost.

### Fix

A single canonical locking read now lives in
`server/services/product-cost-snapshot.ts` (`lockProductRowForUpdate`) and carries
the cost columns:

```sql
SELECT id, name, price, stock, variants, has_variants AS "hasVariants",
       cost_price       AS "costPrice",
       packaging_cost   AS "packagingCost",
       insert_cost      AS "insertCost"
FROM products
WHERE id = $1 AND deleted_at IS NULL
FOR UPDATE
```

`OrderStorage.lockProductForUpdate()` is now a thin delegate, and the hand-rolled
snapshot block is replaced by the canonical builder:

```ts
const snapshot = buildProductCostSnapshot(product, snapshotAt);
lineSnapshots.push(snapshot);
orderItemsData.push({ …, ...toJsonbCostFields(snapshot) });
…
await tx.insert(orderItems).values(orderItemsData.map((line, idx) => ({
  …, ...toRelationalCostFields(lineSnapshots[idx]),
})));
```

Because the relational row is projected from **the same snapshot object** that
produced the JSONB line, the two stores cannot drift.

### Not done (deliberately)

No historical order was touched. Lines already frozen as `unknown` stay `unknown`.
Repairing them from today's `products.cost_price` would fabricate profit; any repair
must come from `product_cost_history` via a separate reviewed job marked
`cost_snapshot_status = 'estimated'`.

---

## 2. F-2 — the admin / WhatsApp path wrote no snapshot at all

### Root cause

`InvoiceStorage.createOrderFromInvoice()`
(`server/storage/invoice-storage.ts`) built its order and lines straight from the
invoice document:

```ts
items: (invoice.items as any[]).map((i) => ({
  productId: i.productId, productName: i.name, quantity: i.quantity,
  priceAtPurchase: i.unitPrice, variantLabel: …, variantId: …,
}))                                        // ← no cost fields at all
…
await tx.insert(orderItems).values({
  id: randomUUID(), orderId, productId: item.productId,
  quantity: item.quantity,
  priceAtPurchase: String(item.unitPrice),
  totalPrice: String(item.unitPrice * item.quantity),
  metadata: { … },                          // ← no cost snapshot columns either
});
```

It never read the product row at all, so it also never took a `FOR UPDATE` lock
before its `GREATEST(stock - qty, 0)` deduction. Both line stores ended up with
`NULL` cost columns and `NULL` `cost_snapshot_status` — which reads as "legacy row,
fall back to the resolver", i.e. the *opposite* semantics from F-1's lines, from the
same era. The two creation paths disagreed on a core invariant.

### Fix

The path now locks each product row inside the existing transaction and builds the
snapshot with the same canonical builder:

```ts
for (const item of invoiceLines) {
  const locked = await lockProductRowForUpdate(tx as any, item.productId);
  if (!locked) throw Object.assign(new Error(`المنتج غير موجود ضمن الفاتورة (…)`), { status: 400 });
  lines.push({ raw: item, snapshot: buildProductCostSnapshot(locked, snapshotAt) });
}
…
items: lines.map(({ raw, snapshot }) => ({ …, ...toJsonbCostFields(snapshot) })),
…
await tx.insert(orderItems).values({ …, ...toRelationalCostFields(snapshot), metadata: { … } });
```

Additional hardening on this path:

* **Fails closed** when an invoice line references a missing/soft-deleted product,
  instead of creating an uncostable order line.
* **Takes the same row lock** as the storefront, so an invoice confirmation and a
  storefront checkout for the same product now serialize.
* **Same deployment guard** (`assertOrderCreationReady`) as the storefront, since
  this path now also writes the cost-snapshot columns. Previously only
  `POST /api/orders` was guarded — a confirmed invoice on an unmigrated database
  would have failed per-invoice.
* `lineTotal` is now written into the JSONB line, matching the storefront shape.

---

## 3. The canonical builder — contract

`server/services/product-cost-snapshot.ts`

| Export | Contract |
|---|---|
| `lockProductRowForUpdate(tx, productId)` | THE locking read. Requires an open transaction. Returns `LockedProductRow \| undefined`. Always projects `cost_price` / `packaging_cost` / `insert_cost`. |
| `parseCostValue(raw)` | `null`/`undefined`/`""`/non-finite → `null`. `"0"`/`0` → `0`. Never converts absence into zero. |
| `buildProductCostSnapshot(row, now?)` | THE builder. Pure. Accepts camelCase *and* snake_case rows so a raw-SQL caller cannot reintroduce F-1. |
| `toJsonbCostFields(snap)` | Projection for the `orders.items` JSONB line. |
| `toRelationalCostFields(snap)` | Projection for `order_items_relational`, incl. `costSnapshotConfidence` / `Version` / `At`. |
| `COST_SNAPSHOT_VERSION` | `1`. |

### Decision table

| `cost_price` | `packaging_cost` / `insert_cost` | status | source | confidence | stored cost values |
|---|---|---|---|---|---|
| a number (incl. `0`) | both present | `exact` | `product_current` | `high` | as read (`0` stays `0`) |
| a number (incl. `0`) | either absent | `incomplete` | `product_current` | `medium` | cost as read, missing ones `NULL` |
| absent / NULL / `""` | anything | `unknown` | `none` | `NULL` | all three `NULL` |

The builder is **only** ever called while a new line is being created, inside the
transaction that locked the product. It has no code path that reads a product for an
order that already exists — repairing history is structurally impossible here.

### Verified zero vs unknown

These are two different facts and the code keeps them apart at every layer:

| | verified zero | unknown |
|---|---|---|
| meaning | the product genuinely costs 0 | no cost was ever recorded |
| JSONB `costPrice` | `0` | `null` |
| relational `unit_cost_price` | `"0"` | `NULL` |
| `cost_snapshot_status` | `exact` / `incomplete` | `unknown` |
| `cost_snapshot_source` | `product_current` | `none` |
| `cost_snapshot_confidence` | `high` / `medium` | `NULL` |
| accounting engine | may compute profit | must refuse and flag the order |

---

## 4. Repository-wide order-path classification

Every path in the repository that can write an `orders` row or an
`order_items_relational` row:

| # | Path | Entry point → implementation | Class |
|---|---|---|---|
| 1 | Storefront checkout | `server/routes/orders.ts:78` → `:139` → `server/storage/order-storage.ts:199` (`createOrderSecure`) | **canonical secure path** — locks, snapshots, both stores, one transaction |
| 2 | Admin / WhatsApp invoice confirmation | `server/routes/invoice.ts:44` → `server/storage/invoice-storage.ts:161` → `:217` (`createOrderFromInvoice`) | **canonical secure path** (after F-2 fix) — same builder, same lock, one transaction |
| 3 | Legacy `storage.createOrder()` | `server/storage/order-storage.ts:122` (interface: `server/storage/index.ts:33`) | **quarantined hard-fail** — throws; body deleted, not merely unrouted |
| 4 | `AutoOrderProcessor.processScheduledOrders()` | `server/services/auto-order-processor.ts:109` | **quarantined hard-fail** — throws before any write; unreachable body retained as evidence |
| 5 | Admin invoice CRUD (`create` / `update` / `send` / `cancel` / `reject`) | `server/routes/admin-invoices.ts:64`, `server/storage/invoice-storage.ts:60–205` | **intentionally read-only wrt orders** — writes `manual_invoices` only; the order is created exclusively at `confirm` (#2) |
| 6 | Fulfillment admin (`/orders/:orderId/draft`, `/events`, `/profitability`, `/suggestion`) | `server/routes/fulfillment-admin.ts:455,464,597,682` | **intentionally read-only wrt order lines** — operates on pre-existing orders; creates fulfillment events/lines only |
| 7 | Auto-order subscription create | `server/routes/ai-advanced.ts:902` | **intentionally read-only wrt orders** — writes `auto_orders` schedule rows; the processor that would materialize them is #4 (quarantined) |
| 8 | `migrations/backfill_orderitems_from_jsonb.sql` | migration | **not a live creation path** — historical backfill from existing JSONB, explicitly forbidden from using current product cost. Owned by Agent 3. |
| 9 | Raw `INSERT INTO orders` / `order_items_relational` in `server/__tests__/**` | test fixtures | **not a live creation path** — PGlite fixtures |

**Counts:** 2 canonical secure · 3 intentionally read-only · 2 quarantined hard-fail ·
2 non-live (migration, fixtures) · **0 defects remaining**.

No live creation path bypasses the invariant.

---

## 5. Tests

New file: `server/__tests__/order-cost-snapshot-invariant.test.ts` (25 tests).
Modified: `server/__tests__/order-creation-dual-write.test.ts` — structural assertions
retargeted at the canonical builder, plus a new guard that the canonical SELECT
carries every cost column and that `order-storage.ts` keeps no second divergent SELECT.

| Required case | Test |
|---|---|
| storefront known cost | `storefront KNOWN cost is frozen onto both stores` |
| storefront verified zero | `storefront VERIFIED ZERO is stored as 0, not NULL and not unknown` |
| storefront unknown cost | `storefront UNKNOWN cost is stored as NULL/unknown, never 0` |
| WhatsApp known cost | `F-2 REGRESSION: WhatsApp KNOWN cost now writes a snapshot to BOTH stores` |
| WhatsApp verified zero | `WhatsApp VERIFIED ZERO stays 0` |
| WhatsApp unknown cost | `WhatsApp UNKNOWN cost stays NULL/unknown` |
| admin creation | `WhatsApp locks each product FOR UPDATE with the cost columns` + `WhatsApp JSONB and relational agree` (the admin surface creates orders only through invoice confirmation — path #2/#5) |
| transaction rollback on line failure | `rolls back the WHOLE order when a relational line insert fails` |
| inventory deduction exactly once | `deducts inventory exactly once per line`, `WhatsApp deducts inventory exactly once per line` |
| JSONB/relational agreement | `JSONB and relational stores AGREE line-for-line` |
| concurrent creation | `concurrent creations each take their own row lock and snapshot independently` |
| unsafe legacy path still fails closed | `storage.createOrder() throws instead of writing a snapshot-less order`, `AutoOrderProcessor.processScheduledOrders() stays quarantined` |

Plus builder-level semantics: `parseCostValue` zero/absent table, exact/incomplete/unknown
classification, snake_case tolerance, JSONB↔relational projection agreement, F-1
regression guard on the emitted SQL, and fail-closed on a missing product.

### Real output

```
$ npx vitest run server/__tests__/order-cost-snapshot-invariant.test.ts

 ✓ server/__tests__/order-cost-snapshot-invariant.test.ts (25 tests) 615ms

 Test Files  1 passed (1)
      Tests  25 passed (25)
```

```
$ npx vitest run server/__tests__/order-cost-snapshot-invariant.test.ts \
                 server/__tests__/order-creation-dual-write.test.ts \
                 server/__tests__/orders-api.test.ts \
                 server/__tests__/schema-readiness.test.ts

 Test Files  4 passed (4)
      Tests  84 passed (84)
```

### Full suite

```
 Test Files  7 failed | 102 passed (109)
      Tests  48 failed | 1438 passed | 12 skipped (1498)
```

Baseline was 107 files / 1446 tests / 0 failed. **None of the 48 failures are in my
ownership or caused by my change** — verified two ways:

1. No failing file imports `order-storage`, `invoice-storage`,
   `product-cost-snapshot` or `schema-readiness`.
2. The failures cluster on files another agent is concurrently editing
   (`git status` shows `M server/services/accounting-engine.ts`,
   `M server/services/fulfillment-service.ts`, `M shared/schema.ts`, and new
   untracked `migrations/add_product_cost_resolution.sql` /
   `add_pim_line_identity.sql`). The failure messages match that work in flight:
   `column "cost_price_resolution" does not exist`,
   `column "line_id" of relation "packaging_inventory_movements" does not exist`,
   and `expected 'unknown' to be 'incomplete'` in `nullable-cost.test.ts`
   (an `accounting-engine` semantics test).

Failing files: `consolidation-engine-agreement`, `fulfillment-admin-api`,
`fulfillment-concurrency`, `fulfillment-drafts-profiles-costs`, `fulfillment-engine`,
`fulfillment-reversal-integrity`, `fulfillment-service-integration`,
`fulfillment-verifier`, `nullable-cost` — all Agent 3's surface.

---

## 6. Not closed

1. **Zero is still overloaded at the product layer (Agent 3, not fixed here).**
   `shared/schema.ts:110-112` declares `costPrice/packagingCost/insertCost` as
   `numeric(...).default("0")`. So **no product can currently express an unknown
   cost**, and a genuinely un-costed product would be snapshotted as a verified zero.
   The snapshot layer is now correct and ready; the *input* is not.

   > **UPDATED 2026-07-24 — fixed, and the magnitude was wrong.** The "30 zero
   > `cost_price` / 143 zero packaging-insert" figures came from the verification
   > branch counted **without `deleted_at IS NULL`**; 29 of the 30 were soft-deleted.
   > Production: **114 active products, 113 positive-cost, 1 zero-cost (out of
   > stock), 0 active in-stock zero-cost, 114/114 zero packaging+insert.** The
   > builder now resolves an unresolved zero to `unknown` (F-10), the product write
   > path can no longer create a bare ambiguous zero, and
   > `migrations/drop_product_cost_zero_defaults.sql` removes the `DEFAULT '0'`
   > itself. See `docs/audit/live-product-cost-reconciliation.md`.
   This needs a product-cost representation change (nullable columns, or an explicit
   `cost_price_resolution`) plus a reviewed reclassification of the existing zeros.
   The `unknown` path is fully implemented and tested and will start producing
   correct results the moment products can express NULL.

2. **Historical uncostable lines are untouched.** Every storefront line created
   between the introduction of the snapshot columns and this fix carries
   `costStatus:"unknown"`; every WhatsApp line from that era carries all-NULL
   snapshot columns (which the engine reads as "legacy, use the resolver"). Neither
   was repaired — repairing from current cost is forbidden. A separate
   `product_cost_history`-driven job marked `estimated` is required, and is out of
   this agent's scope.

3. **`schema-readiness` now requires 8 columns, not 7.** I added
   `cost_snapshot_confidence` to `REQUIRED_ORDER_ITEM_COLUMNS` because both creation
   paths now write it. `migrations/add_order_item_cost_snapshot.sql` already adds it,
   so no new migration is needed — but the readiness gate will now correctly refuse
   traffic on a database where that migration is only partially applied.

4. **No live-database verification was performed.** All work is unit/integration with
   mocks, per the safety boundary. The fix has not been exercised against
   `NEON_VERIFY_DATABASE_URL` or any Neon branch.

---

## 7. Files changed

| File | Change |
|---|---|
| `server/services/product-cost-snapshot.ts` | **new** — canonical builder, canonical locking SELECT, both projections |
| `server/storage/order-storage.ts` | F-1 fix: delegate to canonical lock; build snapshot with canonical builder; project both stores from the same snapshot object |
| `server/storage/invoice-storage.ts` | F-2 fix: lock products, build canonical snapshot, write both stores, fail closed on missing product, add readiness guard |
| `server/services/schema-readiness.ts` | require `cost_snapshot_confidence` |
| `server/__tests__/order-cost-snapshot-invariant.test.ts` | **new** — 25 tests |
| `server/__tests__/order-creation-dual-write.test.ts` | structural guards retargeted at the canonical builder |
