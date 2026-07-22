# AQUAVO Canonical Accounting Model

**Status:** THE financial contract. Every backend route, MCP tool, scheduled job, and admin/analytics screen must bind to the formulas, event rules, snapshot shape, and engine API defined here. No component computes its own money math. Where this document and code disagree, this document wins and the code is the bug.

> **⚠️ OWNER CORRECTION (supersedes any "default to 0" in this document):** Missing or historically unavailable financial evidence MUST be `NULL` / `unknown` / `incomplete` / `estimated` (with explicit source + confidence) — **never silently `0`**. A stored `0` means a VERIFIED zero. This is enforced in migrations, schema, the engine, and tests. The reconciliation note that "new cost fields default to 0 until data exists" is amended: they default to **NULL/unknown**, and the engine treats NULL/estimated cost as *incomplete* (order flagged), never as full profit. Cost snapshot columns carry `status/source/confidence/version/capturedAt`.

**Author:** Agent 3 (Canonical Accounting Architect) · 2026-07-21
**Sources obeyed:** `docs/research/accounting-system-research.md`, `iraq-tax-readiness.md`, `admin-finance-best-practices.md`. **Reconciled against:** `docs/audit/STAGE-A-consolidated.md`, `docs/accounting/consolidation-plan.md`, `STAGE-B-runbook.md`, `docs/audit/legacy-accounting-inventory.md`, `schema-map.md`, and live code (`server/routes/accounting.ts`, `shared/accounting.ts`, `shared/order-financials.ts`, `shared/schema.ts`).

**Reuse-first mandate:** This design REUSES the existing canonical engine functions (`calcOrderProfit`, `computePeriodFinancials`, `buildCostResolver`, `lineCostSnapshot`, `getRealizedOrdersForPeriod`, `buildLedger`) and helpers (`shared/order-financials.ts`). It EXTENDS them; it does not reinvent them. New tables are additive only. The consolidation plan's engine extraction (route-local functions → `server/services/accounting-engine.ts`) is assumed.

---

## 0. Foundational conventions (bind everything to these)

### 0.1 Money representation

| Concept | Storage | Rationale |
|---|---|---|
| **IQD amounts** | **integer whole dinars** (`bigint`/`integer`), field carries `currency='IQD'` implicitly | Research A7: floats can't hold decimal money; the fils minor unit is **obsolete** — IQD transacts in whole dinars. |
| **USD amounts** (supplier invoices, freight, duty) | **integer cents** (`bigint`), explicit `currency='USD'` tag | Research A7: USD has a live minor unit. |
| **FX rates, ratios, allocation weights** | **`DECIMAL(18,6)`** fixed-point, never float | Research A8. |
| **Percentages / margins** in API output | integer percent (rounded) OR `DECIMAL` — decided per field below | Matches current engine which returns integer `margin`. |

**Migration reality (do not silently break):** existing money columns are Postgres `numeric` **with no precision/scale**, returned by Neon as **strings**. The canonical rule during this early stage (37 orders): **read every stored money value through `toMoney()`** (`shared/order-financials.ts:52`) which coerces string→number and guards NaN→0. New money columns are created as `numeric` (whole-dinar values) or `bigint`; the money-type hardening to strict integers is a **separate additive migration**, not a blocker. **Never** reintroduce JS float math on money — all arithmetic goes through the engine's integer/`toMoney` path and results are `Math.round`ed at the boundary (as the engine already does).

### 0.2 The ONE line-item source

Order lines are read from **`orders.items` JSONB** (`OrderLineItem[]`), NOT `order_items_relational`. Stage A proved the relational table misses **12 of 37 orders**. `order_items_relational` is a **mirror** kept in sync for future SQL joins, never the primary read path for financials. Any query that reads relational-only for money is WRONG (this is Stage A defect #2 / #5).

### 0.3 The ONE collected-amount definition

`orderCollectedAmount(order)` = `order.roundedTotal ?? round(order.total / 250) * 250` (`shared/order-financials.ts:82`). This is the real cash the courier collects. COD receivable, revenue, and COD notifications all derive from it. Reading raw `order.total` for cash is the cashback-overcharge bug (Stage A defect #3).

### 0.4 Status sets (the ONE realized definition)

From `shared/order-financials.ts` — **canonical, do not fork**:
- `REALIZED_STATUSES = ['delivered']` — the only revenue-recognizing status.
- `CANCELLED_STATUSES = ['cancelled','rejected','rejected_returned','rejected_carrier','returned']` — never count.
- `IN_PROGRESS_STATUSES = ['pending','confirmed','processing','shipped']` — in flight, not realized.
- **Override:** `orders.financiallyCounted` (nullable): `true`=force include, `false`=force exclude, `null`=auto (use status). Same field on `manual_invoices`.

Divergences to kill (per legacy inventory): `('delivered','confirmed')` in MCP tools (Definition C), `SUM(orders.total)` all-status in `ai-dashboard.ts` (Definition B), current-cost per-order profit in `admin.ts` (Definition D). All collapse to this section.

### 0.5 Sign convention

All engine figures are reported as **positive magnitudes in their natural direction**; the P&L waterfall subtracts costs. Debit/credit signs live ONLY in the ledger layer (§ 2.6). Every formula below states its sign explicitly.

---

## 1. Exact formulas (deterministic)

Notation: a line `L` in `order.items` has `qty = max(toMoney(L.quantity),1)` (engine `lineQuantity`), `price = toMoney(L.priceAtPurchase)`. Money reads are `toMoney(...)`. All sums are per-order unless a period is named. "Frozen" = read from the immutable snapshot (§3), else effective-dated resolver fallback.

### 1.1 Revenue-side

| Metric | Formula | Inputs (exact columns) | Sign | Recognition |
|---|---|---|---|---|
| **Gross Merchandise Value (GMV)** | `Σ price × qty` over items | `orders.items[].priceAtPurchase`, `.quantity` | + | order-create (informational; not revenue) |
| **Item discount** | `Σ (L.unitListPrice − L.priceAtPurchase) × qty` when a list price exists, else 0 | line price vs product list — **currently not line-captured**; treat as 0 until captured | − | order-create |
| **Order discount** | `couponDiscount + loyaltyDiscount` | `orders.discountTotal` (coupon), `orders.pointsDiscount` (loyalty) | − | order-create; **informational only** — already baked into `total`/`roundedTotal` |
| **Net merchandise sales** | `collected − delivery − shipping_income_if_split` | see below | + | **delivered** |
| **Delivery charged to customer** | flat **5,000 IQD** (policy) captured in `orders.shippingCost` | `orders.shippingCost` | + (income) or pass-through — **owner policy §6** | delivered |
| **Collected cash** | `orderCollectedAmount(order)` | `orders.roundedTotal ?? round(total/250)*250` | + | delivered (courier collects) |
| **COD receivable** | `Σ_delivered (collected − shipping)` − settlements − approved refunds | see §1.4 | + (asset) | delivered → until courier remits |
| **Net Revenue (canonical)** | `collected − shipping` per realized order | `orderCollectedAmount(order) − toMoney(order.shippingCost)` | + | **delivered only** |

> **Canonical revenue = `orderCollectedAmount(order) − toMoney(order.shippingCost)`, summed over realized orders.** This is exactly `calcOrderProfit().revenue` (`accounting.ts:615`). Coupons/points are already inside `collected`; `couponDiscount`/`loyaltyDiscount` are surfaced for display, never re-subtracted (double-count guard — engine comment lines 619, 924).

### 1.2 Cost-side (per realized order)

| Metric | Formula | Inputs | Sign | Recognition |
|---|---|---|---|---|
| **Product cost (landed COGS)** | `Σ frozen(L).costPrice × qty` | `orders.items[].costPrice` (frozen) → else `buildCostResolver.getEffective(productId, order.createdAt).costPrice` | − | delivered |
| **Packaging (per-unit)** | `Σ frozen(L).packagingCost × qty` | `.packagingCost` frozen → effective | − | delivered |
| **Inserts (per-unit)** | `Σ frozen(L).insertCost × qty` | `.insertCost` frozen → effective | − | delivered |
| **Box cost (per-order)** | `toMoney(order.boxCost)` | `orders.boxCost` | − | delivered |
| **LANDED cost (definition)** | supplier unit price **+ allocated inbound freight + allocated import duty + allocated other directly-attributable inbound cost − supplier trade discount**, all converted to IQD at **purchase/receipt-date FX** | future `purchases`/`import_shipments` (§4.3) → freezes into `products.costPrice` / cost history / line snapshot | − | **at goods receipt** (frozen), consumed as COGS at delivery |
| **Delivery expense (actual outbound)** | actual courier cost for the parcel; if unknown, the 5,000 IQD charged | `orders.shippingCost` (proxy) or courier settlement fee row | − | delivered (matching) |
| **Payment / courier fee** | courier COD-collection fee, per settlement | `shipping_settlements` fee (extend §4.6) | − | on settlement, accrued to sale period |
| **Affiliate / influencer commission** | per-sale commission on the influenced order | future `commissions` accrual (§4) | − | **accrued at sale (delivered)**, settled when paid (Research E2) |

**LANDED cost per IAS 2 (A1) + IAS 21 (A6):** `landed_unit_cost_IQD = (supplier_unit_price_USD + allocated_freight_USD + allocated_duty_USD) × fx_rate_on_receipt_date`, with freight+duty allocated across SKUs by **value ratio** `line_value / shipment_value` (A5, owner policy §6). This value is **frozen at receipt** into the product's current cost + cost-history, and thence into the order-line snapshot at sale. A later restock at a different price/FX **never** retro-changes a delivered order's COGS (B2). USD payables outstanding at close are retranslated at closing rate → **FX gain/loss to P&L**, never a change to inventory cost (A6).

### 1.3 Profit tiers (the P&L waterfall — deterministic)

Per realized order, then summed for a period:

```
GROSS PROFIT        = NetRevenue − ProductCost(landedCOGS)
GROSS MARGIN        = GrossProfit / NetRevenue                      (0 if NetRevenue ≤ 0)

CONTRIBUTION PROFIT = GrossProfit
                      − Packaging − Inserts − BoxCost               (fulfillment)
                      − DeliveryExpense                             (outbound, if tracked separately from shipping income)
                      − Courier/COD fee
                      − AffiliateCommission
                      − ExpectedReturnLoss (period-level estimate)
CONTRIBUTION MARGIN = ContributionProfit / NetRevenue              (0 if NetRevenue ≤ 0)

ALLOCATED OPERATING PROFIT (period)
                    = Σ ContributionProfit
                      − OperatingExpenses (period `expenses` rows)
                      − VerifiedActualReturnLoss (period)
                      − SalesReturnDeduction (period, revenue reversal)
TAXABLE-PROFIT BASE (prep only)
                    = AllocatedOperatingProfit
                      ± FX gain/loss on USD payables
                      − any non-P&L statutory adjustments (accountant)
```

**Reconciliation with the CURRENT engine (must stay green):** the current `calcOrderProfit` bundles `ProductCost + Packaging + Inserts` into a single `cogs` and computes `netProfit = revenue − cogs − boxCost`. That equals this model's **ContributionProfit before courier fee / commission / delivery-expense / expected-return-loss** (those are new, additive, and default 0 until their data exists). So today: `engine.netProfit == ContributionProfit` and `engine.grossProfit (revenue − cogs)` currently **understates** true gross profit because it treats packaging+inserts as COGS.

> **Owner-policy decision (§6-B): does per-unit packaging/inserts belong in COGS or in fulfillment?** IAS 2.16 (A3) says packaging needed to bring goods to sellable condition = inventory cost (COGS); outbound/selling packaging = selling cost. **Recommendation:** keep `costPrice` = pure landed COGS; reclassify `packagingCost`+`insertCost`+`boxCost` as **fulfillment (contribution) costs**, so Gross Margin reflects IAS 2 and Contribution Margin reflects true per-order economics (Research B1). This changes the gross/contribution split, **not** final net profit. Until signed off, the engine keeps current bundling and exposes BOTH via distinct fields (`landedCogs`, `packaging`, `inserts`, `boxCost`) so the UI can show either — no number is lost.

### 1.4 COD & receivables

| Metric | Formula | Inputs | Sign |
|---|---|---|---|
| **Expected COD (delivered)** | `Σ_delivered (orderCollectedAmount − shippingCost)` | orders | + asset |
| **COD in transit** | same formula over `status='shipped'` | orders | + (contingent) |
| **COD received** | `Σ shipping_settlements.amount` | `shipping_settlements.amount` | − receivable |
| **Approved return deductions** | `Σ refundAmount` of `verified` return events on delivered orders | `order_return_events.refundAmount` (status=verified) | − receivable |
| **COD outstanding (pending)** | `max(0, ExpectedCOD − Received − ApprovedReturnDeductions)` | above | + asset |
| **COD shortage/variance** | `ExpectedCOD_for_settled_orders − settlement.amount_net_of_fee` | settlement vs covered orders | ± (loss if short) |

This is exactly `/cod-summary` today; the **shortage/variance** row is the additive improvement (Research B4 — persist the delta as first-class).

### 1.5 Returns / refunds (the split model — already in engine)

Per verified return event `e`:
- **Sales return deduction (revenue reversal)** = `toMoney(e.refundAmount)`. Reduces COD receivable AND net revenue. Sign −.
- **Actual return loss (operational, unrecoverable)** = `deliveryCostLoss + returnShippingCost + packagingLoss + productWriteOffAmount + (restocked===false ? cogsLoss : 0)`. Sign −. **Restocked items recover COGS to inventory → not a loss** (engine `eventActualReturnLoss`, lines 195-203).
- Only `status='verified'` events count. `recorded`/`disputed` are excluded.

### 1.6 Tax-readiness prep (NO tax computed)

- **CIT base** = TAXABLE-PROFIT BASE (§1.3). Iraqi CIT is **flat 15%** of net trading profit (Research T1) — **the engine PREPARES the base only; it never computes tax owed** (that is accountant + §6 territory; deemed-basis risk per T2).
- **No VAT / no sales-tax line** on aquarium equipment (T3, U1) — the engine and checkout add **no tax line**. Flagged owner-decision §6.
- Store tax rules as data (§4.9) with `rule + source + effective_date + verification_date + accountant_approval_status` — never hardcode 15% as fact-in-code.

---

## 2. Event recognition timeline

AQUAVO is COD; cash and delivery coincide, but the accounting events are distinct. **Critical gap: there is no `deliveredAt` timestamp today** — realized-period bucketing keys off `orders.createdAt` (`getRealizedOrdersForPeriod`). This mis-buckets orders delivered in a different month than created. **FLAGGED: add `orders.deliveredAt timestamp` (§4.1); until then, `createdAt` is the documented, known-imperfect proxy.**

| Event | When | What is recognized |
|---|---|---|
| **Order create** | checkout / manual invoice confirm | Line snapshot frozen (§3): `costPrice/packagingCost/insertCost` per line + `capturedAt/source/status/version`. Collected amount fixed (`roundedTotal`). GMV/discount informational. **No revenue, no COGS.** Stock decremented → inventory movement `sale_reservation` (§4.5). |
| **Shipped** | status→`shipped` | COD moves to **in-transit** (contingent receivable). No P&L. |
| **Delivered** | status→`delivered` (record `deliveredAt`) | **Revenue recognized** (`collected − shipping`). **COGS recognized** at frozen landed cost. **COD receivable** booked against the courier. Commission accrued. Box/packaging fulfillment cost recognized. |
| **COD settled** | courier remits (`shipping_settlements` row) | Receivable reduced by cash received; **courier fee** expensed; **shortage/variance** booked if short. |
| **Refused (COD, no cash)** | return event, order→`rejected*`/`returned`, no payment collected | **Reverse / never-recognize the sale**; **restock at frozen cost** (`Dr Inventory / Cr COGS`); no cash moves; no refund liability (Research R2, AQUAVO nuance). Inventory movement `return_restock`. |
| **Post-payment return** | return event after cash collected | **Refund liability** until cash returned; **return asset** for recovered goods at frozen carrying cost less recovery cost; goods' cost **excluded from COGS** (IFRS 15, R1/R2). `refundAmount` → sales return deduction; `cogsLoss` only if not restocked. |
| **Period close** | month-end (`accounting_period_closes`) | Reconcile COD control per courier; **re-estimate refund liability / return asset**; **retranslate USD payables at closing FX** (FX gain/loss to P&L); post closing entries; **lock period** (immutable); snapshot frozen figures (Research D2/D3). |

**Refusal vs return is decided by whether cash was collected**, mapped from the return event `type`: `rejected_delivery`/`failed_delivery`/`cancelled_*`/`lost_package` = refusal path (no cash); `customer_return`/`damaged_return`/`partial_return` = post-payment path (cash collected → refund liability). This mapping is owner-confirmable (§6).

---

## 3. Immutable snapshot design + completeness states

### 3.1 Extended per-line cost snapshot

Today `OrderLineItem` (`schema.ts:19`) and `order_items_relational` carry `costPrice/packagingCost/insertCost` frozen at sale (Stage B). **EXTEND** the JSONB line shape (additive, optional fields — old orders keep working):

```ts
interface OrderLineCostSnapshot {
  // existing (keep)
  costPrice?: number;        // frozen landed COGS per unit (IQD)
  packagingCost?: number;    // frozen per-unit packaging
  insertCost?: number;       // frozen per-unit inserts
  // NEW (additive, optional)
  costStatus?: "exact" | "estimated" | "pending" | "incomplete";
  costSource?: "line_snapshot" | "cost_history" | "current_product" | "manual_override" | "backfill";
  costConfidence?: number;   // 0.0–1.0; 1.0 = frozen exact landed cost
  costVersion?: number;      // snapshot schema version (start 1)
  capturedAt?: string;       // ISO; when the snapshot was frozen
}
```

Mirror the same four money+meta into `order_items_relational` (columns already exist for money; add `cost_status/cost_source/cost_confidence/cost_version/captured_at` — additive). `costVersion` lets a future landed-cost model re-snapshot without ambiguity.

### 3.2 Completeness states (per metric, per order, per period)

Every financial output carries a **completeness state**, never a silent zero:

| State | Meaning | Rule |
|---|---|---|
| **`exact`** | Frozen landed cost present for all lines | `costStatus='exact'` on every line; `costConfidence=1` |
| **`estimated`** | Cost derived from history/current product, not frozen at sale | any line falls back to resolver (`estimatedCostLines > 0`) |
| **`pending`** | Cost genuinely unknown/awaited (e.g. import not yet landed-costed) | line `costStatus='pending'` |
| **`incomplete`** | Missing product or missing cost that cannot be estimated | `missingProductLines>0` OR cost NULL and no fallback |

**IRON RULE (Research/Stage A): a missing historical cost stays `NULL`/`estimated`, NEVER silently `0`.** A 0 cost is only valid when the product's real landed cost is genuinely 0. The engine already tracks `estimatedCostLines`, `missingCostLines`, `missingProductLines`, `costsComplete` — this formalizes them into the 4-state enum surfaced on every card (Research K3: each KPI shows its completeness flag). Order state = worst state across its lines; period state = worst state across its orders (with counts).

---

## 4. Data model (REUSE / EXTEND / NEW)

Money columns: IQD = integer whole dinars (or existing `numeric` read via `toMoney` during transition); USD = integer cents; FX = `DECIMAL(18,6)`; every money row that can be non-IQD carries a `currency` tag.

### 4.1 Orders — **EXTEND**
Add `deliveredAt timestamp` (null until delivered) — the missing event timestamp (§2). Keep everything else. Realized-period bucketing migrates from `createdAt` → `coalesce(deliveredAt, createdAt)`.

### 4.2 Order line snapshot — **EXTEND** (`orders.items` JSONB + `order_items_relational`)
Add the `costStatus/costSource/costConfidence/costVersion/capturedAt` fields (§3.1). Additive, optional.

### 4.3 Purchases + imports + suppliers — **NEW**
The single biggest schema gap (no landed cost, no payables, no source doc).

- **`suppliers`**: `id, name, country, defaultCurrency, contact, createdAt`.
- **`purchases`** (a PO / supplier invoice): `id, supplierId→suppliers, invoiceNo, currency, subtotalMinor, freightMinor, dutyMinor, otherInboundMinor, discountMinor, fxRate DECIMAL(18,6), fxRateDate, status(draft|received|invoiced|paid), receivedAt, createdBy, createdAt`. Money in supplier currency minor units.
- **`purchase_items`**: `id, purchaseId→purchases, productId→products, qty, unitPriceMinor, allocatedFreightMinor, allocatedDutyMinor, landedUnitCostIQD (integer, computed & frozen at receipt), allocationBasis('value'|'weight'|'qty')`. `landedUnitCostIQD` is the value that feeds `products.costPrice` + `product_cost_history` at receipt.
- **`supplier_payables`** (AP): `id, supplierId, purchaseId, currency, amountMinor, amountIQDAtBooking, fxRateAtBooking, settledAt, status`. Outstanding USD payables retranslated at close (§2, A6).

### 4.4 Expenses — **REUSE** (`expenses`, `schema.ts:208`)
Already present and usable: `category, amount, expenseDate, isRecurring, recurringPeriod, deletedAt(soft-delete)`. Keep as the operating-expense entry surface. Add category values as needed (`courier_fee`, `commission`, `ad_spend`, `fx_loss`, `cod_shortage`) — text column, no migration. Feeds `computePeriodFinancials` expense block.

### 4.5 Inventory movements — **NEW**
- **`inventory_movements`**: `id, productId→products, type('purchase_receipt'|'sale'|'return_restock'|'write_off'|'adjustment'), qtyDelta (signed int), unitCostIQD (frozen), refType('purchase'|'order'|'return_event'|'manual'), refId, movedAt, createdBy, note`. Gives an auditable stock + valuation trail (weighted-avg cost basis, IAS 2). Stock integer on `products` becomes a **derived/reconciled** value, not the source of truth.

### 4.6 COD / courier settlements — **EXTEND** (`shipping_settlements`, `schema.ts:183`)
Reuse `carrier, amount, coveredOrderIds JSONB`. Add: `feeMinor` (courier COD fee), `expectedAmount` (Σ covered orders' net), `varianceMinor` (expected − received − fee → shortage/loss), `settledAt`, `reconciledAt`, `status('pending'|'reconciled'|'disputed')`. Turns the thin settlement row into a real per-courier reconciliation (Research B3/B4).

### 4.7 Double-entry journal + chart of accounts — **DERIVE now, persist later (recommended path)**
`buildLedger` (`accounting.ts:780`) currently **derives** a balanced trial balance + income statement on read from orders/expenses/returns, with an **integrity proof** that ledger net income == `computePeriodFinancials().finalNetProfit`. **Recommendation: keep DERIVE-ON-READ for open periods; PERSIST an immutable journal only at period close.**
- **Justification:** with 37 orders the derived ledger is cheap, always consistent with source, and self-proving. Persisting live journal rows now would create a second source of truth to keep in sync (drift risk) with no benefit. At **close**, freeze the journal into **NEW `journal_entries` / `journal_lines`** tables (append-only) alongside `accounting_period_closes`, so the locked period has immutable double-entry records for the 5-year retention/audit requirement (T6). Chart of accounts: promote the in-code `CHART_OF_ACCOUNTS` (`accounting.ts:750`) into a **NEW `chart_of_accounts`** seed table mapped to the **Iraqi Unified Accounting System** codes (T7) — data, not code, so the accountant can remap without a deploy.

### 4.8 Accounting periods — **REUSE** (`accounting_period_closes`, `schema.ts:2778`)
Already frozen month snapshots with reopen trail. Keep. Locking policy = §6. Add `journalEntryId` link once §4.7 persistence lands.

### 4.9 Reconciliation queue — **NEW** (or REUSE `accounting_review_flags`)
`accounting_review_flags` (`schema.ts:2715`) already models system-detected anomalies (category/severity/status/detected/suggested). **REUSE it as the reconciliation queue** — add categories `cod_variance`, `payable_fx`, `snapshot_missing`. No new table needed unless volume demands.

### 4.10 Reversals — **REUSE** (`accounting_manual_adjustments` + audit trail)
`accounting_manual_adjustments` (approval-gated overrides) + `accounting_audit_trail` (append-only before→after, `schema.ts:2748`) already give reversal semantics: corrections are new rows, posted history never edited in place (Research D3/IM1). Keep. Once §4.7 journal persists, a reversal is a new balanced journal entry referencing the original.

### 4.11 Tax-readiness — **NEW**
- **`tax_rules`**: `id, ruleKey('CIT_RATE'|'VAT_STATUS'|'IMPORT_DUTY'|'RETENTION_YEARS'|...), valueJson, source (URL/citation), effectiveDate, verificationDate, accountantApprovalStatus('unverified'|'accountant_confirmed'|'rejected'), approvedBy, note`. Encodes T1/T3/T6 as **data with provenance**, never hardcoded. The 15% CIT and no-VAT stance live here as `unverified` until an Iraqi محاسب قانوني flips them to `accountant_confirmed`.

### 4.12 FX / exchange rates — **NEW**
- **`exchange_rates`**: `id, baseCurrency, quoteCurrency, rate DECIMAL(18,6), rateDate, source, createdAt`. Powers USD→IQD conversion at purchase/receipt date (A6) and closing-rate retranslation of payables. Every USD purchase stores its own `fxRate`/`fxRateDate` (§4.3) so historical conversion is reproducible even if this table changes.

---

## 5. Engine public API contract

**Module:** `server/services/accounting-engine.ts` (extracted from `accounting.ts` per consolidation plan). This is the ONLY module that computes money. Routes, MCP tools, jobs, and (via those routes) the frontend bind to these signatures. No consumer re-implements any formula above.

```ts
// ── Shared types (re-exported from shared/accounting.ts + shared/order-financials.ts) ──
type Money = number;                 // whole IQD (via toMoney); integer at rest
type CompletenessState = "exact" | "estimated" | "pending" | "incomplete";
interface PeriodRange { start: Date; end: Date; }
type PeriodKind = "day" | "week" | "month" | "year" | "custom";

// ── Cost resolution (REUSE) ──
function buildCostResolver(db: Db, productIds: Set<string>): Promise<CostResolver>;
function lineCostSnapshot(item: OrderLineItem): ProductCost | null;   // frozen-first

// ── Per-order (REUSE calcOrderProfit; EXTEND return shape with completeness + tiers) ──
function calcOrderProfit(order: OrderRow, costs: CostResolver): OrderProfit;
//   OrderProfit gains: landedCogs, packaging, inserts, boxCost (unbundled),
//   grossProfit, grossMargin, contributionProfit, contributionMargin,
//   completeness: CompletenessState, estimatedCostLines, missingCostLines, missingProductLines

// ── Realized-order selection (REUSE — the ONE status filter) ──
function getRealizedOrdersForPeriod(db: Db, range: PeriodRange): Promise<OrderRow[]>;

// ── Period P&L (REUSE — single source for close AND reconcile) ──
function computePeriodFinancials(db: Db, range: PeriodRange): Promise<PeriodFinancials>;
//   PeriodFinancials gains: contributionProfit, contributionMargin,
//   commissionsTotal, courierFeesTotal, fxGainLoss, completeness + counts,
//   taxableProfitBase (prep only, no tax computed)

// ── Period summary for dashboards (REUSE /summary logic) ──
function computePeriodSummary(db: Db, range: PeriodRange): Promise<AccountingSummary>;

// ── Product profitability (REUSE /products logic) ──
function computeProductProfitability(db: Db, range: PeriodRange): Promise<AccountingProductProfitFull[]>;

// ── COD / receivables (REUSE /cod-summary + /cod-details; ADD variance) ──
function computeCodSummary(db: Db): Promise<AccountingCodSummary>;      // + variance field
function computeCodDetails(db: Db, range: PeriodRange): Promise<AccountingCodDetails>;
function reconcileSettlement(db: Db, settlementId: string): Promise<CodReconciliationResult>; // NEW

// ── Expenses rollup (REUSE — dedupe expenses.ts read-agg into here) ──
function computeExpensesRollup(db: Db, range: PeriodRange): Promise<ExpensesRollup>;

// ── Returns (REUSE the split model) ──
function computeReturnImpact(db: Db, range: PeriodRange): Promise<ReturnImpact>;
//   { salesReturnDeduction, actualReturnLoss, sellableReturnedCount, nonSellableReturnedCount }

// ── Double-entry ledger (REUSE buildLedger — derive-on-read + integrity proof) ──
function buildLedger(db: Db, range: PeriodRange): Promise<LedgerResult>; // ledgerNetIncome === finalNetProfit

// ── Full report + inventory + WhatsApp (REUSE /report, /inventory, /whatsapp-invoices) ──
function buildFinanceReport(db: Db, range: PeriodRange): Promise<AccountingReport>;
function computeInventoryValuation(db: Db): Promise<AccountingInventory>;
function buildWhatsappInvoiceBreakdown(db: Db, range: PeriodRange, costs: CostResolver): Promise<WhatsappInvoiceDrilldown>;

// ── Period close (REUSE computePeriodFinancials → freeze) ──
function closePeriod(db: Db, periodKey: string, actor: Actor): Promise<AccountingPeriodClose>;
function reconcilePeriod(db: Db, periodKey: string): Promise<PeriodDriftReport>; // frozen vs recomputed

// ── Landed cost (NEW — feeds the snapshot) ──
function computeLandedUnitCosts(purchaseId: string): Promise<PurchaseItemLandedCost[]>; // value-ratio alloc, FX at receipt

// ── Tax-readiness prep (NEW — base only, NEVER computes tax owed) ──
function computeTaxableProfitBase(db: Db, fiscalYear: number): Promise<TaxReadinessPacket>;
```

**Binding rules:**
1. `routes/accounting.ts` becomes a thin caller of these.
2. `analytics.ts`, `ai-dashboard.ts`, `admin.ts` GET /orders, `mcp.ts`, `groqFinanceAudit.ts` **replace** their private math with these calls (consolidation plan Phase 5).
3. Duplicate MCP servers (`aquavo-mcp.ts`, `aquavo-mcp-http.ts`) **delete** finance tools; align to `mcp.ts` → engine.
4. `manual-invoice-creator.tsx` stops client-rounding; server computes total via engine.
5. Frontend finance components stay **render-only** — they consume engine output through routes and do zero math (Research K2: every number traceable, none client-computed).

---

## 6. Owner-policy decisions (DO NOT choose silently)

Each: options · recommendation · financial impact · reversibility. **The engine ships each as a config/`tax_rules` value defaulting to the recommendation but flagged `unverified` until the owner/accountant confirms.**

| # | Decision | Options | Recommendation | Financial impact | Reversibility |
|---|---|---|---|---|---|
| **A** | **Inventory valuation method** | Weighted-avg · FIFO · (LIFO prohibited) | **Weighted-average** (IAS 2 A2 — simplest for a restocking trader with varying USD prices) | Sets COGS per unit → directly moves gross profit and inventory value | **Hard** to reverse once periods close on a basis; choose before backfill. Low risk now (37 orders). |
| **B** | **Packaging/inserts/box classification** | In COGS · In fulfillment (contribution) | **Fulfillment** (IAS 2.16 A3) — keep COGS pure landed cost | Shifts the gross/contribution boundary; **final net unchanged**. Current engine bundles into COGS | Fully reversible (engine exposes both; UI flag) |
| **C** | **Landed-cost allocation basis** | Value ratio · Weight ratio · Qty | **Value ratio** (A5 — easiest to automate; no weights captured) | Distributes freight+duty across SKUs → per-SKU COGS | Reversible per purchase until its orders close |
| **D** | **Delivery-revenue treatment** | Shipping income (gross) · Pass-through cost offset | **Shipping income** account + outbound-shipping expense (transparent) | 5,000 IQD/order in/out; net effect small but changes revenue optics | Reversible (presentation) |
| **E** | **Affiliate/influencer commission timing** | Accrue at sale · Expense when paid | **Accrue at sale/delivered** (matching E1/E2) | Moves commission into the sale's period; affects contribution margin timing | Reversible via accrual reclass |
| **F** | **Ad-spend / advertising attribution** | Period opex (unallocated) · Allocated per order/product | **Period operating expense** (below contribution) — do not fake per-order attribution | Affects operating profit, not contribution margin | Reversible |
| **G** | **Overhead allocation** | None (period opex) · Allocate to products | **None** — keep overhead as period opex (SME simplicity, IAS 2.16 excludes admin from inventory) | Product margins stay clean; overhead hits operating line | Reversible |
| **H** | **VAT / sales-tax status** | No tax line · Add tax | **No VAT / no sales-tax line** on aquarium equipment (T3, U1, U2) — **needs محاسب قانوني sign-off** | Directly sets checkout price and invoice totals — highest-impact assumption | Reversible in code, but mispricing is customer-facing |
| **I** | **Period-locking policy** | Lock on close (immutable) · Soft-close editable | **Hard lock on close**; corrections only via reversing entries (D3/IM1); reopen requires reason (already modeled) | Guarantees immutable books for 5-yr retention (T6) | Reopen path exists (audited) |
| **J** | **Historical cost-backfill method** | Leave NULL/estimated · Backfill from current cost · Backfill from history | **Leave NULL → `estimated`** for pre-snapshot orders; backfill only from `product_cost_history` where a dated cost exists; **never fabricate 0** | Determines whether ~pre-snapshot orders show `exact` vs `estimated` COGS | Reversible (re-run backfill); low risk (99.1% cost complete, 37 orders) |
| **K** | **Realized-period timestamp** | `createdAt` (today) · new `deliveredAt` | **Add `deliveredAt`**; bucket realized revenue by delivery date | Moves orders delivered in a different month than created into the correct period | Reversible; needs the new column |
| **L** | **Ledger persistence** | Derive-on-read · Persist live · Persist at close | **Derive open periods; persist journal at close** (§4.7) | No effect on numbers; affects auditability/immutability | Reversible before close persistence ships |

**Accountant-gated (cannot be an owner-only choice):** H (VAT/sales-tax scope), A (valuation formula sign-off), import/customs duty rate for landed cost (U5), deemed-profit ratio (U3/T2), IUAS chart-of-accounts mapping (T7), record-retention years (U4), deductibility of return/shipping losses. Engine stores each in `tax_rules` as `unverified` until confirmed.

---

## Summary

**Canonical revenue** = `orderCollectedAmount − shippingCost` over `delivered` orders (with `financiallyCounted` override) — the exact current `calcOrderProfit`. **COGS** = frozen landed cost per line (snapshot-first, effective-dated fallback, never silent 0). **Profit tiers**: Gross (rev − landed COGS) → Contribution (− fulfillment/courier/commission/expected-return) → Operating (− opex − verified returns) → Taxable base (prep only, 15% CIT base, no tax computed, no VAT line). **Events**: recognize at delivered (not create), reconcile at COD-settle, split refusal (reverse+restock) vs post-payment return (refund liability + return asset), freeze at close. **Snapshot** extends the existing per-line cost with `status/source/confidence/version/capturedAt`; four completeness states (`exact|estimated|pending|incomplete`) surface on every metric. **Data model** reuses the whole existing accounting scaffold (orders, expenses, settlements, return-events, adjustments, audit-trail, period-closes, review-flags), EXTENDS orders (`deliveredAt`) + line snapshot + settlements, and adds only what is genuinely absent (purchases/suppliers/imports, inventory movements, chart-of-accounts, exchange_rates, tax_rules, and a persisted-at-close journal). **One engine** (`server/services/accounting-engine.ts`) owns all math; everything else binds to it. **Twelve owner-policy decisions** (A–L) are flagged, defaulted to the recommendation, and held `unverified` until owner/accountant sign-off.

**File:** `docs/accounting/canonical-model.md`
