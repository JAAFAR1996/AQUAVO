# Final Accounting & Inventory Verification — Independent (Phase B)

**Verifier:** IndependentAccountingInventoryVerifier
**Date:** 2026-07-24
**Method:** Re-derived every claim from code + read-only SQL against the **verify branch**
(`NEON_VERIFY_DATABASE_URL`, endpoint `ep-rapid-breeze-a46glg7f` — confirmed NOT production
`ep-quiet-moon`). No write, DDL, branch op, or connection string was emitted. Where a claim
could be reproduced with SQL or by executing the real engine, it was; I did not trust the
Phase A reports.

**Branch state note:** the verify branch is contaminated with synthetic `SHADOW-*` / `CONCTEST`
rows (documented in `neon-shadow-comparison.md`) and carries `opening_balance` seeding movements.
I filtered these out where they would distort results and say so per item.

---

## Verdict summary

| Item | Claim | Verdict |
|---|---|---|
| F-1/F-2 | ONE canonical cost-snapshot path, identical semantics | **CONFIRMED** (one latent caveat) |
| F-3/F-5 | Cost-status lattice honoured; `unknown` never reads as 0 | **CONFIRMED** |
| F-3 | Engine treats relational store as authoritative on reconcile | **CONFIRMED** |
| F-6 | Advertised in-stock SKU genuinely unfulfillable (27/129) | **REFUTED** at authoritative grain |
| — | Canonical balance never negative | **CONFIRMED** |
| — | Checkout row-locking (`FOR UPDATE`) holds | **CONFIRMED** |
| F-4 | Idempotency incl. PIM per-line identity | **CONFIRMED** |
| — | Contribution profit null-propagates when inputs unknown | **CONFIRMED** |
| — | Returns / reversals handled (verified-only, reversed excluded) | **CONFIRMED** |
| — | Legacy↔canonical delta fully attributed, no residue | **CONFIRMED** (own recon); Phase A's exact 16,803 **INCONCLUSIVE** |

---

## F-1 / F-2 — Single canonical snapshot path — CONFIRMED

**Method.** Read both order-creation paths and the shared builder; checked captured data.

- `server/services/product-cost-snapshot.ts` is THE builder. `lockProductRowForUpdate()`
  issues one `SELECT id,name,price,stock,variants,has_variants,cost_price,packaging_cost,
  insert_cost … FOR UPDATE` — the three cost columns and the row lock are both present
  (this was the F-1 hole).
- `server/storage/order-storage.ts` (storefront `createOrderSecure`, line 247/313) and
  `server/storage/invoice-storage.ts` (admin/WhatsApp `createOrderFromInvoice`, line 246/255)
  **both** call `lockProductRowForUpdate` + `buildProductCostSnapshot` **inside the same
  transaction** that deducts stock, and write the identical snapshot to BOTH stores via
  `toJsonbCostFields` / `toRelationalCostFields`.
- **Data confirmation:** `order_items_relational` holds 25 rows `exact / product_current`
  with a non-null unit cost — snapshots are being captured. Backfilled/legacy lines stay
  `unknown` (see F-3). Semantics identical across both writers.

**Latent caveat (my disagreement / new).** `buildProductCostSnapshot` decides `unknown`
purely on `cost_price === null`. It does **not** consult the product `*_resolution` columns.
So a product whose `cost_price = 0` because of the `numeric DEFAULT '0'` (the still-open
"ambiguous zero" issue) would be frozen as `costStatus:"exact"` with cost 0 at sale time —
the exact overloading F-5 is meant to prevent, but at the *write* path rather than the read
path. Today this is inert: **0 live products have `cost_price = 0` with `resolution='known'`**
(SQL below), so nothing is currently mis-frozen. Flagging it as latent, not active.

---

## F-3 / F-5 — Status lattice honoured; `unknown` never 0 — CONFIRMED

**Method.** SQL over products + relational lines, plus executing the real engine.

- **Products (F-5):** live products (deleted_at IS NULL, n=114) resolution =
  `known 113`, `unresolved 1`, `verified_zero 0`. **0 products** have `cost_price=0` marked
  `known` — no invented zeros. (Phase A reported `30 unresolved`; the branch now shows `1`.
  This is branch drift in the data, not a semantics defect — the *rule* holds.)
- **Relational cost status:** `exact 25` (cost known), `unknown/none 83` (all NULL cost),
  `''/NULL 111` (legacy rows, no snapshot). **Zero rows** carry a fabricated `0` under an
  `unknown`/`estimated` status.
- **Backfilled lines specifically** (73 rows, `metadata.backfill.batch_id` present): **all 73
  are `cost_snapshot_status='unknown'` with `unit_cost_price IS NULL`** — never 0, never
  today's cost. The NULL-not-zero rule is intact at source.
- **Engine behaviour (executed, not read):** over 36 realized clean orders the canonical
  engine returns COGS 435,118 vs a legacy current-cost substitution of 595,790 — i.e. the
  engine **excludes** the ~160k of unknown lines instead of coercing them to a number. All
  36 orders come back `costStatus:"incomplete"`, `exactCogs=null`, `exactNetProfit=null`.
  `unknown`, `estimated`, `incomplete`, `verified_zero`, `exact` are kept distinct in code
  (`resolveCostComponent`, `worstStatus`, `calcOrderProfit`) and never collapse.

**F-3 relational authoritative:** `reconcileOrderLines()` makes `order_items_relational` the
cost source of truth whenever its rows reconcile with the JSONB multiset (same productId →
qty); on disagreement it degrades the order to `incomplete` with `sourceReconciled=false`
rather than merging. A relational row asserting `unknown` therefore **stays** `unknown` and
the effective-dated resolver is not consulted — so the 73 backfilled NULLs surface as
`unknown`, not `estimated`. CONFIRMED in code and consistent with the executed result above.

---

## F-6 — Advertised in-stock SKU unfulfillable — REFUTED (grain artifact)

This is my principal disagreement with Phase A.

**Enforcement reality (re-derived).** Checkout does not read `inventory_canonical_balances`
directly; the AFTER-INSERT trigger `record_order_item_inventory_sale` on
`order_items_relational` writes a `sale` movement, and `prevent_negative_inventory_balance`
(BEFORE INSERT on `inventory_movements`) aborts if, at grain
**`(product_id, variant_id [NULL-distinct], location_id=MAIN)`**, `SUM(quantity_delta) + delta < 0`.
Ledger mode = `enforce`; one MAIN location. `inventory_canonical_balances` mirrors
`SUM(movements)` **exactly (0 mismatches)**, so it is a faithful proxy for the guard.

**The authoritative grain is per-SKU = (product, variant, MAIN).** Base products
(`has_variants=false`) hold stock in `products.stock` → SKU variant_id = NULL. Variant
products hold stock **per variant** in the `variants` JSONB → each SKU is a specific
variant_id. Re-derived at that grain:

| Grain | Advertised in-stock SKUs | Unfulfillable (canonical ≤ 0) |
|---|---|---|
| Base products | 73 | **0** |
| Variant SKUs (expanded) | 110 | **0** |

**Zero** advertised, in-stock, orderable SKUs are unfulfillable on this branch.

**Where 27/129 and 29/102 came from — the wrong-grain trap.** Measuring balance at
*base grain only* (`variant_id IS NULL`) for **every** advertised product returns 29 of 102
with balance ≤ 0 — and **all 29 are variant products**, whose stock legitimately lives at the
variant grain (their base-grain balance is 0 by construction). Reproduced exactly:

```
advertised_products=102  base_grain_le0=29  of_which_variant_products=29
```

This is precisely the over-report the mandate warned about (a `variant_id IS NULL` count over
a variant-grained inventory). The Phase A `GET /api/products` figure (29/102) and the
coordinator's 27/129 are the same artifact at different denominators. **REFUTED as a live
unfulfillability defect.**

**Honest caveat.** The branch carries `opening_balance` seeding movements
(`owner_approved_storefront_opening` +1177, `inventory_reconciliation` +712) — i.e. an
availability repair was applied here. I cannot query production (read-only boundary), so I
cannot certify production carries the same variant-grain coverage. But the *reported magnitude
is a grain error regardless of branch*: those 29 products are not unfulfillable at the grain
the guard actually enforces. If a residual concern exists on production it must be re-measured
at SKU grain, not product/base grain.

---

## Canonical balance never negative — CONFIRMED

`inventory_canonical_balances`: 185 rows, **0 negative**, `min(canonical_stock)=0`. The
BEFORE-INSERT guard is live (`enforce`) and takes a per-SKU advisory lock before summing,
so concurrent sales cannot race past zero.

## Checkout locking (FOR UPDATE) — CONFIRMED

`lockProductRowForUpdate` ends in `FOR UPDATE`; both live creation paths call it before
stock validation/deduction inside the transaction. Product-row contention is serialized;
the canonical-balance guard adds a second, ledger-level advisory lock keyed on the SKU.

## Idempotency incl. PIM per-line identity (F-4) — CONFIRMED

- **Order-sale movements:** 46 `sale` rows, **46 distinct idempotency keys** (`order_item:<id>`,
  `ON CONFLICT DO NOTHING`) → no double deduction.
- **Fulfillment events:** 90 rows, **90 distinct idempotency keys** → no duplicate confirmation.
- **F-4 indexes both present:** `pim_idempotency_uidx` (unchanged) AND the new
  `pim_line_uidx ON (line_id) WHERE line_id IS NOT NULL`. Functionally: 124 packaging
  movements, 28 with `line_id`, **28 distinct** — same material on multiple lines of one
  event now inserts (the collision F-4 described is gone) while whole-event idempotency is
  unchanged. The new index is strictly stronger, not a weakening.

## Contribution profit — CONFIRMED

`calcOrderProfit` layers profit with NULL propagation: `grossMerchandiseProfit` is null unless
`costStatus ∈ {exact, verified_zero}`; `contributionProfit`/`contributionMargin` are null
unless product COGS is exact **and** fulfillment is exact; ads/overhead are never allocated.
Executed result: **all 36 clean realized orders return `contributionProfit = null`** (fulfillment
cost unknown for all) — the engine refuses a confident contribution figure exactly as claimed.

## Returns & reversals — CONFIRMED

- `computePeriodFinancials` counts only `status='verified'` return events (branch: 3 recorded
  / 1 verified → only the 1 verified would deduct). `eventSalesReturnDeduction` (revenue
  reversal) and `eventActualReturnLoss` (operational loss; `cogsLoss` only when
  `restocked !== true`) are kept separate — a restocked return is not double-counted as P&L loss.
- `buildFulfillmentResolver` excludes reversed events and skips the reversal counter-entry
  itself (`reversalOfEventId → continue`), so a reversal nets to zero without making the order
  read `unknown`. Branch data exercises this: 33 confirmed `adjustment` reversal entries + 28
  reversed originals + 5 reversed reshipments; the resolver correctly drops both sides.

---

## Legacy ↔ canonical reconciliation (independently computed)

I executed the **real** `accounting-engine.ts` against the branch over the **36 realized,
non-synthetic** orders, and computed a legacy baseline (raw `orders.total` revenue; current
product cost × qty with missing→0; `orders.boxCost`). All figures IQD:

| Term | Legacy | Canonical | Δ (legacy − canonical) |
|---|---:|---:|---:|
| Revenue | 1,745,247 | 1,589,420 | **+155,827** |
| Product COGS | 595,790 | 435,118 | **+160,672** |
| Box cost | 6,880 | 6,880 | 0 |
| **Net** | **1,142,577** | **1,147,422** | **−4,845** |

**Attribution (identity check):**
`Δnet = Δrev − Δcogs − Δbox = 155,827 − 160,672 − 0 = −4,845` ✓ — **balances exactly, zero
unexplained residue.**

- The **+155,827 revenue** term = legacy counting raw `total` (incl. shipping + Iraqi
  rounding cashback) vs canonical `collected − shipping`.
- The **+160,672 COGS** term = legacy fabricating a current-cost number for the unknown /
  backfilled lines that canonical correctly excludes (same direction and ~same magnitude as
  the Phase A "163,640 substituted cost that was never evidence").
- Because the revenue overstatement (155,827) is *smaller* than the COGS overstatement
  (160,672), legacy net is actually **lower** by 4,845 — a reminder that "legacy overstates
  profit" is not universally true; it overstates both sides and the sign of the net depends
  on the mix.

**On Phase A's exact figure (984,377 − 967,574 = 16,803 over 34 orders): INCONCLUSIVE / not
reproduced.** My clean filter kept 36 orders (theirs 34), my legacy definition differs from
their specific legacy engine, and their number was scoped to a period window. I did not try to
back-fit their constants. What I *can* independently confirm is the **structural** core of
their claim: legacy overstates both revenue and COGS; canonical returns `contributionProfit =
null` for every order (I measured 36/36); and the delta attributes with no residue. The
"legacy treats unknown as 0" effect they measured as ~0 is consistent with F-5 (no product
currently carries a NULL cost_price — zeros are the ambiguous kind).

---

## Blockers / caveats

1. **Production not inspectable** (read-only boundary). All results are from the verify branch,
   which has synthetic contamination and `opening_balance` seeding. F-6's refutation is a
   grain-logic result that holds on any branch; but production's *variant-grain coverage*
   itself was not verifiable from here.
2. **F-1 write-path latent gap** (my new finding): `buildProductCostSnapshot` ignores the
   `*_resolution` columns, so a future `cost_price=0` ambiguous product would freeze `exact 0`.
   Inert today (0 such products) but it re-opens F-5 at the write path if a default-zero
   product is ever sold before its cost is resolved.
3. Exact Phase A shadow constants (16,803) unreproduced by design — reported as INCONCLUSIVE,
   with an independent reconciliation supplied in its place.
