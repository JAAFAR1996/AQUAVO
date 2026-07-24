# Application shadow verification + accounting comparison — Neon verification branch

**Agent:** ApplicationShadowAgent
**Date:** 2026-07-23
**Target:** local app on `http://localhost:5055`, `DATABASE_URL` pinned to the Neon
**verification** branch `br-round-dust-a4t0kt58` (endpoint `ep-rapid-breeze-…`, db `neondb`).
Production (`br-patient-mouse-a4d4cgr4`) and the rollback branch were never written to.
All synthetic data created here is prefixed `SHADOW-`. `CONCTEST-` rows belonging to
ConcurrencyServiceAgent were never modified or deleted.

**Status:** Part 1 executed. Part 3 executed. Part 2 (Playwright) partial — see
`docs/audit/neon-playwright-verification.md`.

---

## 0. `/ready`

```
GET http://localhost:5055/ready  →  HTTP 200
{"status":"ready","orderCreationEnabled":true,"missingColumns":[],
 "detail":"Schema satisfies this application version.",
 "checkedAt":"2026-07-23T08:20:20.728Z"}
```

**A prior 503 was a false alarm caused by the app connecting to the wrong database.**
`server/env.ts` calls `dotenv.config({ override: true })`, so the committed `.env` beats an
inherited `DATABASE_URL`; and `tsx` re-execs a child, so a parent-only `--require` preload
is not inherited. The app therefore silently used the endpoint in `.env` and reported the
seven cost-snapshot columns as missing, while `psql` on the verification branch showed all
15 present. Only `/ready` and `/health` (read-only) were issued before this was caught; the
process was killed at once. Full detail and the corrected launch command are in the
Playwright report §1 (**FINDING P-1**).

---

## Part 1 — capability verification

Method: public surfaces exercised over **real HTTP**; admin-gated surfaces exercised at the
**service layer** (the same canonical services the route handlers delegate to), because no
admin credential was available and the coordinator's instruction was to state that gap
rather than manufacture a session. HTTP auth enforcement on those routes was verified
separately. Script: `scratch/_shadow_part1.mts`.

| # | Capability | Result | Evidence |
|---|---|---|---|
| 1 | `/ready` returns 200 | **PASS** | body above |
| 2 | Website order creation → **both** stores | **PASS** | `POST /api/orders` → HTTP 201; `orders.items` = 2 lines **and** `order_items_relational` = 2 rows, one transaction |
| 3 | Admin / WhatsApp order → **both** stores | **PASS** | `source=whatsapp`; `orders.items` = 1 line **and** `order_items_relational` = 1 row |
| 4 | WhatsApp path writes a cost snapshot | **FAIL** | all snapshot columns NULL — see **F-2** |
| 5 | Storefront line carries a usable cost snapshot | **FAIL** | snapshot written as `unknown`/NULL — see **F-1** |
| 6 | Preparation drafts + lines | **PASS** | draft `state=suggested`, 2 suggested + 1 catalog + 1 manual = 4 lines |
| 7 | Packaging profiles | **PASS** | family v1 created; `expectedCost.total = 750` (750×1 + 0×2) |
| 8 | Packaging suggestions | **PASS** | `reason: "تطابق التصنيف: box"`, returns family/profile/version/items |
| 9 | Manual cost lines | **PASS** | manual line (category `wrap`, qty 3 @ 100) accepted and costed |
| 10 | Original shipment | **PASS** | event confirmed from draft, `actual=2050 expected=2050 variance=0 status=exact` |
| 11 | Reshipment | **PASS** | `seq=2 actual=750 status=exact` |
| 12 | Returns | **PASS** | `order_return_events` row `status=verified refund=10550 cogsLoss=4205 restocked=false` |
| 13 | Return handling (fulfillment side) | **PASS** | `actual=500 status=exact` |
| 14 | Reversals | **PASS** | reversal event created, `reversedMovements=1`; reversed event excluded from totals, retained as `reversedFulfillmentCost=750` |
| 15 | Event history | **PASS** | 4 events: `original/confirmed/seq1/2050`, `reshipment/reversed/seq2/750`, `return_handling/confirmed/seq3/500`, `adjustment/confirmed/seq4/null` |
| 16 | Expected vs actual cost | **PASS** | expected 2050 / actual 2050 / variance 0 recorded on the event |
| 17 | Contribution profit | **PASS** | breakdown returns `collected=12000 revenue=7000 fulfillment=2550 original=2050 returnHandling=500 courier=5000 contributionProfit=null dataStatus=incomplete` — correctly null because product COGS is unknown |
| 18 | Incomplete / unknown costing — never silently 0 | **PASS** | 73 backfilled NULL-cost lines confirmed present; no order reports `productCogs = 0`; none reports `dataStatus = "exact"` |
| 18b | …surfaced as *unknown* specifically | **PARTIAL** | 5/5 sampled orders report `productCostStatus="estimated"`, not `"unknown"` — see **F-3** |
| 19 | Verified-zero distinguishable from unknown | **PASS** | material costs: known `750`, verified-zero `0`, unknown `null` — the zero is preserved as 0 and the unknown stays null |
| 19b | Verified zero must be justified | **PASS** | guard fires: `COST_REASON_REQUIRED` |
| 19c | Unknown material poisons an expected cost | **PASS** | `expectedCost.total = null`, `missingCostMaterials:["SHADOW-mat-unknown"]` — not 0 |
| 19d | Verified-zero on a product line | **PASS** | legacy line: `unitCostPrice=3700, unitPackagingCost=0, unitInsertCost=0` — real zeros kept as 0 next to all-null unknown lines |
| 20 | Admin HTTP surfaces reject anonymous callers | **PASS** | 401 on all six probed admin endpoints |
| 21 | Independent fulfillment integrity verifier | **PASS** | `ok=true` |
| 22 | Same material on two lines of one event | **FAIL** | `23505 pim_idempotency_uidx` — see **F-4** |

Totals: **25 PASS, 3 FAIL, 2 PARTIAL.**

The website-order-creation test is marked PASS on first execution (HTTP 201, order
`bb901fc7-…`). Later re-runs returned HTTP 429 (`retryAfter: 3600`) from the storefront
rate limiter and reused the already-created order rather than fabricating one.

### Findings

**F-1 — New storefront orders record an UNKNOWN cost snapshot for every line. (HIGH)**

`OrderStorage.lockProductForUpdate()` (`server/storage/order-storage.ts:53`) selects only:

```sql
SELECT id, name, price, stock, variants, has_variants AS "hasVariants" FROM products …
```

but `createOrderSecure()` then builds the immutable cost snapshot from that same row:

```ts
const hasCost = (product as any).costPrice != null;   // always undefined ⇒ false
const costStatus: "exact" | "unknown" = hasCost ? "exact" : "unknown";
```

`costPrice`, `packagingCost` and `insertCost` are never selected, so `hasCost` is always
false. Observed on a freshly created order whose products both have a real
`cost_price` in the database:

```
rel cost snapshots=[{"p":"houyi-chubby-thermometer","c":null,"s":"unknown"},
                    {"p":"houyi-acrylic-tool-rack","c":null,"s":"unknown"}]
```

This is not cosmetic. `lineCostSnapshot()` treats an explicit `costStatus:"unknown"`
snapshot as authoritative and deliberately does **not** fall back to the cost resolver:

> *"A frozen snapshot that recorded UNKNOWN cost must NOT be silently replaced by today's
> product cost"*

So every order created by the current storefront code is **permanently uncostable** —
`productCogs`, `contributionProfit` and `exactNetProfit` are null forever, and no later
cost entry can repair it. The engine is behaving correctly; the writer is feeding it
nulls. Fix: add `cost_price, packaging_cost, insert_cost` to the `SELECT … FOR UPDATE`.

**F-2 — The WhatsApp/manual-invoice order path writes no cost snapshot at all. (HIGH)**

`InvoiceStorage.createOrderFromInvoice()` (`server/storage/invoice-storage.ts:208`) inserts
`order_items_relational` rows with only `orderId/productId/quantity/priceAtPurchase/
totalPrice/metadata`, and builds `orders.items` JSONB without any `costPrice`/`costStatus`
key. Observed: `relational cost_snapshot_status=[null]`, `JSONB line has
costStatus=ABSENT`. Unlike F-1 this one is *recoverable* — with no snapshot key present,
`lineCostSnapshot()` returns null and the engine falls back to the effective-dated
resolver — but it means WhatsApp orders are costed from mutable current/historic cost, so a
later cost edit silently rewrites their reported profit. The two order-creation paths
disagree about a core accounting invariant.

**F-3 — Backfilled NULL costs surface as `estimated`, not `unknown`. (MEDIUM — nuance)**

The 73 backfilled `order_items_relational` lines are confirmed still NULL-cost /
`cost_snapshot_status='unknown'`. But **the accounting engine never reads
`order_items_relational`** — `getOrderItems()` reads `orders.items` JSONB. For those legacy
orders the JSONB lines carry no snapshot key, so the engine falls back to
`costs.getEffective()` and labels the result `"estimated"`.

Against the stated requirement: **never silently zero — satisfied** (no order reports
`productCogs = 0`); **never presented as exact — satisfied** (`exactCogs`/`exactNetProfit`
are null; `dataStatus` is `incomplete`/`estimated`). But they do not surface as *unknown*
either. One sampled order (`39c94727-…`) reached `dataStatus="estimated"` with a non-null
`contributionProfit` of 4844, i.e. a spendable-looking profit derived from today's product
cost rather than the cost at sale. Worth an explicit decision: is "estimated from current
cost" acceptable for a line whose relational row says the cost is unknown?

**F-4 — An event cannot carry the same material on two lines. (MEDIUM)**

`confirmFulfillment()` writes one stock movement per line with
`idempotencyKey = use:${eventId}:${l.materialId}` — no per-line component. A legitimate
event (profile suggests 1 box, operator adds 2 more of the same box) violates
`pim_idempotency_uidx` and the whole confirmation fails with an opaque
`23505`. Reproduced deterministically. Fix: include the line id/index in the key.

**F-5 — `products` cannot express an unknown cost. (MEDIUM, data modelling)**

All 143 products have a non-NULL `cost_price`; 30 of them are exactly `0`, and **all 143**
have `packaging_cost = 0` and `insert_cost = 0`. The engine's carefully-built
NULL-means-unknown contract cannot be honoured by data that has no NULLs: a genuinely
unknown packaging cost is indistinguishable from a verified-zero one at the product level.
The material-cost subsystem gets this right (verified zero requires a justification note,
unknown stays NULL); the product catalogue does not.

**F-6 — `storage.createOrder()` correctly fails closed.** (positive)
The deprecated non-transactional writer throws rather than reintroducing the
relational-coverage gap. Verified by reading; not exercised.

---

## Part 3 — accounting shadow comparison: canonical vs legacy

### What "legacy" means here (important)

**The legacy per-order profit path is no longer live code.** The consolidation already
re-pointed `routes/admin.ts`, `services/ai-dashboard.ts`, `services/groqFinanceAudit.ts` and
`routes/mcp.ts` at the canonical engine; the old helpers survive only as dead code awaiting
gated deletion, e.g. in `groqFinanceAudit.ts`:

```ts
/** @deprecated Superseded by shared/order-financials.orderCollectedAmount.
 *  Kept for the gated deletion phase; no live caller. */
function collectedAmount(...) { … }
void collectedAmount;
```

So a *runtime* A/B of two live engines is not possible — there is only one. The legacy
column below is therefore a **faithful reimplementation** of the documented pre-consolidation
formula (`docs/audit/legacy-accounting-inventory.md`, "admin GET /orders profit",
`routes/admin.ts:132-161`):

```
revenue = SUM(priceAtPurchase × qty)          # gross subtotal
cogs    = SUM(products.cost_price × qty)      # CURRENT cost, unknown → 0
profit  = revenue − cogs                      # all statuses
# ignores shipping, box cost, coupons, cashback, and ALL fulfillment cost
```

Both columns are computed over **identical order rows** in one pass
(`scratch/_shadow_compare.mts`).

### Scope

34 real orders. **3 real orders are excluded as contaminated** —
`238e7d76-…`, `39c94727-…`, `c5ea24fb-…` carry permanent `CONCTEST` synthetic fulfillment
rows left by ConcurrencyServiceAgent (immutability guards prevent their removal by design).
They are reported separately below. My own `SHADOW-` orders are excluded from both columns.

### Totals (34 clean orders, IQD)

| Field | Canonical | Legacy | Δ | Cause |
|---|---|---|---|---|
| Collected amount | 1,688,750 | 1,541,715 | +147,035 | legacy has no notion of *collected*; it reports the gross subtotal. Canonical = `roundedTotal` (COD rounded up to 250) which **includes shipping**. |
| Delivered revenue | 1,539,750 | 1,541,715 | −1,965 | canonical = collected − shipping, then +rounding gains; legacy = raw subtotal, ignoring both the 250-rounding and coupons |
| Shipping | 149,000 | 0 | +149,000 | legacy never subtracted courier cost |
| Discounts | 5,000 | 0 | +5,000 | legacy ignored coupons entirely |
| Cashback | 0 | 0 | 0 | **no order on this branch used cashback — dimension untested, not verified** |
| Payment fees | 0 | 0 | 0 | COD-only business, no gateway; canonical returns 0 only because 0 was passed explicitly (it returns `null` otherwise) |
| Product COGS | 564,076 | 557,338 | +6,738 | effective-dated cost history vs today's cost — 2 orders differ, 3,369 each |
| Supplier packaging | 2,500 | — | +2,500 | legacy had no such component |
| Box cost | 5,600 | 0 | +5,600 | legacy ignored per-order packaging |
| Fulfillment cost | **null** (0 known) | 0 | — | **structural**: legacy asserts *zero*; canonical asserts *unknown* |
| Contribution profit | **null** | 984,377 | — | see below |
| Margin | **null** | per-order 44–87% | — | same cause |
| Costing status | `incomplete` ×34 | *(none)* | — | legacy had no completeness concept |

Canonical `netProfit` (revenue − COGS − box cost, the closest comparable scalar) =
**967,574**. Legacy profit = **984,377**. The 16,803 gap reconciles **exactly**:

```
  revenue difference      −1,965   (legacy ignores coupon 5,000, canonical gains ~3,035 rounding)
+ COGS difference         +9,238   (6,738 cost-history vs current  +  2,500 supplier packaging)
+ box cost                +5,600   (legacy ignores it entirely)
= 16,803  ✓   984,377 − 967,574 = 16,803
```

No unexplained residue.

### Every difference, attributed

1. **Collected (+147,035).** Legacy had no collected/COD concept. Canonical uses
   `orderCollectedAmount()` = `roundedTotal ?? round(total/250)*250`, which includes the
   courier fee the customer hands over. Not an error in either engine — different
   quantities with the same name.
2. **Revenue (−1,965).** Two opposing effects: the Iraqi 250-denomination round-**up**
   raises canonical revenue on most orders, while legacy ignoring a 5,000 coupon on
   `FH-260604-0003` raises legacy revenue by 4,795 on that one order (canonical 23,750 vs
   legacy 28,545). Net: legacy 1,965 higher.
3. **Shipping (+149,000).** Legacy treated the gross subtotal as revenue and never
   subtracted the 5,000 IQD courier fee. This is the single largest per-order distortion:
   on a 15,000 IQD order it overstates margin by a third.
4. **Discounts (+5,000).** One order carries `discount_total = 5,000`. Legacy ignored it.
5. **Cashback (0 vs 0).** No order used cashback or points on this branch
   (`cashback_used` and `points_discount` are zero for all 34). **The two engines agree
   only vacuously — this field was not actually exercised.** Stated as a gap, not a pass.
6. **Payment fees (0 vs 0).** COD only. Note the canonical default is `null` (unknown), not
   0; the 0 here is because I passed `paymentFees: 0` explicitly. A caller that omits it
   gets `null`, which correctly poisons the contribution total.
7. **Product COGS (+6,738).** Identical on 32 of 34 orders. Two orders differ by exactly
   3,369 each (`FH-260604-0001`: 11,805 vs 8,436; `FH-260610-EB5D99EE`: 37,602 vs 34,233).
   Cause: canonical resolves cost through `productCostHistory` effective-dated at the order
   date (120 history rows exist); legacy used today's `products.cost_price`. Same product,
   whose cost changed after those two sales. Canonical is right; legacy retroactively
   rewrote history.
8. **"Legacy treats unknown cost as 0" — measured at ZERO effect on this dataset.**
   `l_linesUnknownCoercedToZero = 0`, because no product has a NULL `cost_price`. The
   classic legacy sin is real in the code but does not materialise here. Reported honestly
   rather than claimed. Its latent form is **F-5**: some products carry `cost_price = 0`
   and every product carries `packaging_cost = insert_cost = 0`, which may be unknowns
   already encoded as zeros — in which case *both* engines are understating COGS and
   neither can tell. (Branch counts of "30" / "143" here are verification-branch figures
   taken without `deleted_at IS NULL`. Production, 2026-07-24: **114 active products,
   1 with `cost_price = 0` (out of stock), 114/114 with zero packaging+insert.** See
   `docs/audit/live-product-cost-reconciliation.md`.)
9. **Fulfillment cost (null vs 0) — the structural difference.** None of the 34 clean
   orders has a confirmed fulfillment event, so canonical reports `null` = *unknown*, while
   legacy has no such component and implicitly asserts *zero*. This is exactly the
   NULL-not-zero rule doing its job.
10. **Contribution profit (null vs 984,377) — the headline.** Because fulfillment cost is
    unknown, `buildOrderCostBreakdown()` propagates null through `totalKnownDirectCost` and
    `contributionProfit` for **all 34** orders. Legacy confidently reports 984,377 IQD of
    profit. The canonical engine's answer is "we do not know", and on this data that is the
    correct answer: no order has its fulfillment cost recorded. Anyone reading the legacy
    number is reading revenue-minus-COGS mislabelled as profit.
11. **Margin (null vs 44–87%).** Follows directly from 10.
12. **Costing status (`incomplete` ×34 vs nothing).** `c_exactNetProfit` is non-null for
    **0 of 34** orders — the engine refuses to present any of this data as exact. Legacy had
    no way to express that, so every legacy figure looked equally authoritative.

### Per-order table (34 clean orders)

Format `canonical / legacy`. Customer names, phones and addresses are deliberately omitted.

| # | order | status | src | collected C / L | revenue C / L | ship C/L | disc C/L | prod COGS C / L | fulfil C/L | contrib C / L | margin C/L | C status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | FH-260628-FF006928 | delivered | website | 75750 / 70599 | 70750 / 70599 | 5000 / 0 | 0 / 0 | 32792 / 32792 | null / 0 | null / 37807 | null / 54 | incomplete |
| 2 | FH-260524-101D54F9 | delivered | whatsapp | 183500 / 183440 | 183500 / 183440 | 0 / 0 | 0 / 0 | 53476 / 53476 | null / 0 | null / 129964 | null / 71 | incomplete |
| 3 | FH-260617-372E99FE | delivered | whatsapp | 70750 / 65710 | 65750 / 65710 | 5000 / 0 | 0 / 0 | 9704 / 9704 | null / 0 | null / 56006 | null / 85 | incomplete |
| 4 | FH-260607-33636358 | delivered | whatsapp | 36000 / 30948 | 31000 / 30948 | 5000 / 0 | 0 / 0 | 11010 / 11010 | null / 0 | null / 19938 | null / 64 | incomplete |
| 5 | FH-260522-67779798 | delivered | whatsapp | 15000 / 9976 | 10000 / 9976 | 5000 / 0 | 0 / 0 | 5477 / 5477 | null / 0 | null / 4499 | null / 45 | incomplete |
| 6 | FH-260703-4AA92DCF | delivered | whatsapp | 58000 / 57994 | 58000 / 57994 | 0 / 0 | 0 / 0 | 12025 / 12025 | null / 0 | null / 45969 | null / 79 | incomplete |
| 7 | FH-260704-DDAF703F | delivered | whatsapp | 33750 / 28694 | 28750 / 28694 | 5000 / 0 | 0 / 0 | 16056 / 16056 | null / 0 | null / 12638 | null / 44 | incomplete |
| 8 | FH-260514-2B02D096 | delivered | whatsapp | 27000 / 21900 | 22000 / 21900 | 5000 / 0 | 0 / 0 | 10390 / 10390 | null / 0 | null / 11510 | null / 53 | incomplete |
| 9 | FH-260530-7FB975F3 | delivered | whatsapp | 35750 / 30694 | 30750 / 30694 | 5000 / 0 | 0 / 0 | 12919 / 12919 | null / 0 | null / 17775 | null / 58 | incomplete |
| 10 | FH-260706-1BE90388 | delivered | whatsapp | 37000 / 31940 | 32000 / 31940 | 5000 / 0 | 0 / 0 | 14789 / 14789 | null / 0 | null / 17151 | null / 54 | incomplete |
| 11 | FH-260718-8DDA16FC | delivered | website | 44000 / 39000 | 39000 / 39000 | 5000 / 0 | 0 / 0 | 17353 / 17353 | null / 0 | null / 21647 | null / 56 | incomplete |
| 12 | FH-260703-926F014F | delivered | whatsapp | 82000 / 76940 | 77000 / 76940 | 5000 / 0 | 0 / 0 | 26657 / 26657 | null / 0 | null / 50283 | null / 65 | incomplete |
| 13 | FH-260605-A1DE3DF6 | delivered | whatsapp | 76250 / 76074 | 76250 / 76074 | 0 / 0 | 0 / 0 | 24997 / 24997 | null / 0 | null / 51077 | null / 67 | incomplete |
| 14 | FH-260525-DEEDD086 | delivered | whatsapp | 20000 / 15000 | 15000 / 15000 | 5000 / 0 | 0 / 0 | 7184 / 7184 | null / 0 | null / 7816 | null / 52 | incomplete |
| 15 | FH-260612-6832B7B8 | delivered | whatsapp | 15250 / 10250 | 10250 / 10250 | 5000 / 0 | 0 / 0 | 3162 / 3162 | null / 0 | null / 7088 | null / 69 | incomplete |
| 16 | FH-260721-00FFC198 | rejected | website | 85750 / 80572 | 80750 / 80572 | 5000 / 0 | 0 / 0 | 29786 / 29786 | null / 0 | null / 50786 | null / 63 | incomplete |
| 17 | FH-260623-ED40CF1C | delivered | whatsapp | 43500 / 43335 | 43500 / 43335 | 0 / 0 | 0 / 0 | 13494 / 13494 | null / 0 | null / 29841 | null / 69 | incomplete |
| 18 | FH-260528-78330705 | delivered | whatsapp | 42750 / 37537 | 37750 / 37537 | 5000 / 0 | 0 / 0 | 20143 / 20143 | null / 0 | null / 17394 | null / 46 | incomplete |
| 19 | FH-260531-54BFA4BC | delivered | whatsapp | 85500 / 80316 | 80500 / 80316 | 5000 / 0 | 0 / 0 | 45190 / 45190 | null / 0 | null / 35126 | null / 44 | incomplete |
| 20 | FH-260628-B7A8F193 | delivered | whatsapp | 26500 / 21450 | 21500 / 21450 | 5000 / 0 | 0 / 0 | 10043 / 10043 | null / 0 | null / 11407 | null / 53 | incomplete |
| 21 | FH-260622-F0A2351A | delivered | website | 23000 / 18000 | 18000 / 18000 | 5000 / 0 | 0 / 0 | 7684 / 7684 | null / 0 | null / 10316 | null / 57 | incomplete |
| 22 | FH-260719-07218344 | delivered | website | 37500 / 32349 | 32500 / 32349 | 5000 / 0 | 0 / 0 | 14742 / 14742 | null / 0 | null / 17607 | null / 54 | incomplete |
| 23 | FH-260703-7C9010CE | delivered | whatsapp | 15500 / 11500 | 11500 / 11500 | 4000 / 0 | 0 / 0 | 1531 / 1531 | null / 0 | null / 9969 | null / 87 | incomplete |
| 24 | FH-260616-BCDB60D3 | delivered | website | 81750 / 76598 | 76750 / 76598 | 5000 / 0 | 0 / 0 | 17868 / 17868 | null / 0 | null / 58730 | null / 77 | incomplete |
| 25 | FH-260604-0003 | delivered | website | 28750 / 28545 | **23750 / 28545** | 5000 / 0 | **5000 / 0** | 9854 / 9854 | null / 0 | null / 18691 | null / 65 | incomplete |
| 26 | FH-260617-95086742 | delivered | website | 82250 / 77250 | 77250 / 77250 | 5000 / 0 | 0 / 0 | 25063 / 25063 | null / 0 | null / 52187 | null / 68 | incomplete |
| 27 | FH-260606-0001 | delivered | website | 38000 / 32995 | 33000 / 32995 | 5000 / 0 | 0 / 0 | 11565 / 11565 | null / 0 | null / 21430 | null / 65 | incomplete |
| 28 | FH-260605-0002 | delivered | website | 27750 / 22535 | 22750 / 22535 | 5000 / 0 | 0 / 0 | 8276 / 8276 | null / 0 | null / 14259 | null / 63 | incomplete |
| 29 | FH-260609-CAE354BB | delivered | website | 57000 / 51792 | 52000 / 51792 | 5000 / 0 | 0 / 0 | 20941 / 20941 | null / 0 | null / 30851 | null / 60 | incomplete |
| 30 | FH-260615-EEDBDFC4 | delivered | website | 33250 / 28098 | 28250 / 28098 | 5000 / 0 | 0 / 0 | 12538 / 12538 | null / 0 | null / 15560 | null / 55 | incomplete |
| 31 | FH-260604-0001 | delivered | website | 31750 / 26649 | 26750 / 26649 | 5000 / 0 | 0 / 0 | **11805 / 8436** | null / 0 | null / 18213 | null / 68 | incomplete |
| 32 | FH-260610-EB5D99EE | delivered | website | 102500 / 97387 | 97500 / 97387 | 5000 / 0 | 0 / 0 | **37602 / 34233** | null / 0 | null / 63154 | null / 65 | incomplete |
| 33 | FH-260604-0004 | delivered | website | 12750 / 7650 | 7750 / 7650 | 5000 / 0 | 0 / 0 | 1747 / 1747 | null / 0 | null / 5903 | null / 77 | incomplete |
| 34 | FH-260604-0002 | delivered | website | 23000 / 17998 | 18000 / 17998 | 5000 / 0 | 0 / 0 | 6213 / 6213 | null / 0 | null / 11785 | null / 65 | incomplete |

Bold cells are the only per-order deviations beyond the systematic shipping/rounding gap:
row 25 (coupon), rows 31–32 (cost-history vs current cost).

### Contaminated orders — reported, not deleted

These three carry `CONCTEST` fulfillment events from another agent. Because they *do* have
fulfillment costs, they are the only orders where canonical can produce a contribution
profit — which makes them useful as an illustration and unusable as clean data.

| order | status | collected C / L | revenue C / L | prod COGS C / L | fulfil C/L | contrib C / L | margin C/L | C status |
|---|---|---|---|---|---|---|---|---|
| FH-260514-9E186334 | delivered | 46500 / 41284 | 41500 / 41284 | 22953 / 21985 | 500 / 0 | 13047 / 19299 | 31 / 47 | estimated |
| FW-260424-0001 | delivered | 76920 / 75705 | 71920 / 75705 | 39347 / 39347 | 2750 / 0 | 24823 / 36358 | 35 / 48 | estimated |
| FH-260512-0001 | delivered | 22000 / 16900 | 17000 / 16900 | 6906 / 6906 | 250 / 0 | 4844 / 9994 | 28 / 59 | estimated |

The pattern is the whole argument for the consolidation: legacy reports 47/48/59% margins;
canonical, once shipping, box cost and *actual* fulfillment materials are included, reports
31/35/28%. Legacy overstates margin by 16–31 percentage points on the only orders where a
full comparison is possible.

---

## Cleanup — executed, with a large disclosed residue

Run: `MODE=all node …/tsx scratch/_shadow_cleanup.mts`. Final proof:

```
  orders RETAINED (immutable by order_is_hard_deletable): 16
  orders deletable: 0
  manual_invoices: 11            ← deleted
  materials: clear current cost pointer: 4
  materials retained but DEACTIVATED (immutable cost evidence): 4
=== CLEANUP PROOF ===
{ "shadow_orders": "16", "shadow_materials": "4", "shadow_families": "1",
  "shadow_invoices": "0",
  "oir_total": "194", "oir_backfilled_unknown": "83",
  "orders_total": "53", "conctest_materials_untouched": "1" }
```

**Deleted:** 11 `SHADOW-` manual invoices, 4 packaging profile families, 4 profile
versions, 8 profile items, 4 `order_return_events`, 4 `fulfillment_adjustments`,
unconsumed preparation drafts and their lines. `current_cost_record_id` /
`current_unit_cost` cleared on all 4 `SHADOW-mat-*` materials and all 4 deactivated.

**NOT deletable — five independent immutability controls, no bypass in any of them.**
I hit each one in turn and did not force past any:

| Guard | Message | Blocks |
|---|---|---|
| `order_is_hard_deletable()` | *order … is audited and its dependent records cannot be removed* | **all 16 SHADOW orders** — the predicate requires *no* `inventory_movements`; any order that consumed stock is permanent |
| `reject_inventory_movement_mutation` | *inventory movements are immutable; create a reversal movement instead* | the stock-consumption ledger rows |
| `ofl_immutable` / `pim_immutable` | *immutable fulfillment record: use an adjustment/reversal event instead* | `order_fulfillment_lines`, `packaging_inventory_movements` |
| `mcr_guard_approved` | *approved cost records are evidence and cannot be deleted* | approved/superseded `SHADOW-mat-*` cost records → and hence the 4 materials |
| `fpdl_guard_consumed` / `ppi_guard_locked` | *draft lines are frozen after confirmation* / *profile version is locked by a confirmed event* | 1 confirmed draft, 1 locked profile family+version |

**Residue left on the verification branch:** 16 `SHADOW-` orders (customer names
`SHADOW-Customer` / `SHADOW-WA-Customer`), their 21 `order_items_relational` lines, their
`inventory_movements`, the fulfillment events/lines/packaging movements on one of them,
4 deactivated `SHADOW-mat-*` materials with their approved cost records, and 1 locked
`SHADOW-std-*` profile family. This is the same class of permanent residue the coordinator
already accepted for `CONCTEST` rows, and for the same reason: the accounting system is
deliberately built so that anything which touched the immutable ledger can never be erased.

**Stock note:** 3 units of `houyi-chubby-thermometer` and 8 of
`houyi-tracheal-suction-cup` were consumed by the synthetic orders. I did **not** restore
`products.stock`, because the canonical balance is derived from the immutable
`inventory_movements` ledger — bumping the mirror alone would desync it. The sanctioned fix
is a compensating reversal movement, which I left to the branch owner.

**Integrity of the protected rows — verified:** `oir_total = 194`, of which 21 are mine, so
**100 original + 73 backfilled = 173 remain exactly intact.** `conctest_materials_untouched
= 1`; no `CONCTEST-` row was modified or deleted.

`oir_backfilled_unknown` reads 83 rather than 73 because 10 of my own storefront lines were
also written with NULL cost / `unknown` status — that is **F-1** reproducing itself, not
contamination of the original 73. Filtering out `SHADOW-` orders returns exactly 73
(verified in Part 1, capability #18).

## Scripts

`scratch/_shadow_part1.mts`, `scratch/_shadow_compare.mts`, `scratch/_shadow_cleanup.mts`.
These are working scratch files, not committed test assets.
