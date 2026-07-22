# Inline Financial Arithmetic — Repository Removal Map

**Generated:** 2026-07-22 · **Branch:** `feat/accounting-canonical-fulfillment`
**Scope:** every site in `server/**` and `shared/**` that computes money, filters by
order status, or rounds a monetary value inline, rather than calling the canonical
engine.

## Canonical replacements

| Concern | Canonical API | Module |
|---|---|---|
| "Amount the customer paid" | `orderCollectedAmount(order)` | `shared/order-financials.ts` |
| IQD rounding | `roundCollected(v)`, `ROUNDING_STEP` | `shared/order-financials.ts` |
| Money coercion (0 is a valid default) | `toMoney(v)` | `shared/order-financials.ts` |
| **Cost evidence** (unknown ≠ 0) | `toMoneyOrNull(v)` | `shared/order-financials.ts` |
| Realized-revenue status | `REALIZED_STATUSES`, `isRealizedStatus(s)` | `shared/order-financials.ts` |
| Cancelled / in-flight status | `CANCELLED_STATUSES`, `IN_PROGRESS_STATUSES` | `shared/order-financials.ts` |
| Realized orders in a window | `getRealizedOrdersForPeriod(db, start, end)` | `server/services/accounting-engine.ts` |
| Per-order revenue / COGS / profit | `calcOrderProfit(order, costs, fulfillment?)` | `server/services/accounting-engine.ts` |
| Per-order cost breakdown | `computeOrderCostBreakdown` / `buildOrderCostBreakdown` | `server/services/accounting-engine.ts` |
| Period P&L | `computePeriodFinancials(db, start, end)` | `server/services/accounting-engine.ts` |
| Double-entry ledger | `buildLedger(db, start, end)` | `server/services/accounting-engine.ts` |
| Line quantity (default 1) | `lineQuantity(item)` | `server/services/accounting-engine.ts` |
| Order line subtotal | `orderSubtotal(items)` | `server/services/accounting-engine.ts` |
| Return-event split | `eventSalesReturnDeduction` / `eventActualReturnLoss` | `server/services/accounting-engine.ts` |

## Non-negotiable semantics

1. **NULL means UNKNOWN and is never coerced to 0.** Cost evidence goes through
   `toMoneyOrNull`; a derived total containing an unknown component is `null` and
   its status is `incomplete`.
2. **Order status filtering** uses `REALIZED_STATUSES` / `isRealizedStatus`, never a
   string literal. `'confirmed'` is *not* realized revenue.
3. **Collected amount** uses `orderCollectedAmount` (it prefers the persisted
   `roundedTotal`), never `parseFloat(order.total)`.

## Counts

| | Sites |
|---|---|
| **Redirected in this pass** | **21** |
| Redirected in the integrator follow-up pass | 6 |
| Already canonical (engine / primitives / prior pass) | 5 |
| Pending — accounting engine internals (by design) | 20 |
| Pending — `server/routes/accounting.ts` (legacy route, gated deletion) | 30 |
| Pending — non-accounting arithmetic (catalog price, scoring, display, counts) | 83 |
| **Total catalogued** | **165** |

---

## A. Redirected in this pass

### `server/services/groqFinanceAudit.ts`

| Line (pre-change) | Expression | Canonical replacement | Status |
|---|---|---|---|
| 135–138 | `function toNum(v) { const n = Number(v); … }` | `toMoney` (aliased as `toNum`) | Redirected |
| 140–143 | `collectedAmount()` — local `roundedTotal ?? round(total/250)*250` | `orderCollectedAmount` | Redirected; legacy fn kept, `@deprecated`, no live caller |
| 145–147 | `netAmount()` — `collectedAmount − shippingCost` | `calcOrderProfit().revenue` via `computePeriodFinancials().revenue` | Redirected; legacy fn kept, `@deprecated`, no live caller |
| 174–179 | `allOrders.filter(o => … o.status === "delivered")` | `getRealizedOrdersForPeriod` | Redirected |
| 180 | `reduce(collectedAmount)` → `grossRevenue` | `reduce(orderCollectedAmount)` | Redirected |
| 181–182 | `reduce(netAmount)` → `deliveredNetTotal` / `netRevenue` | `computePeriodFinancials().revenue` | Redirected |
| 189–193 | `reduce(toNum(e.refundAmount))` → `approvedReturnDeductions` | `eventSalesReturnDeduction` | Redirected (still restricted to realized orders — COD settlement semantics) |
| 199–208 | local `evtSalesReturnDeduction` / `evtActualReturnLoss` | `eventSalesReturnDeduction` / `eventActualReturnLoss` via `computePeriodFinancials` | Redirected; local fns deleted (they were exact duplicates of the engine's) |
| 236–254 | inline COGS loop over a current-cost map + `+= toNum(order.boxCost)` | `buildCostResolver` + `calcOrderProfit`; totals from `computePeriodFinancials().cogs + .packaging` | Redirected |
| 260–264 | `grossProfit = netRevenue − totalCogs`; `expensesTotal` reduce; `finalNetProfit` | `computePeriodFinancials().expensesTotal` / `.finalNetProfit` | Redirected |
| 273 | `costPrice = toNum(p.costPrice)` (inventory valuation) | `toMoneyOrNull` — unknown cost excluded, not read as 0 | Redirected |
| 381 | invariant #4 tolerance `< 1` | `<= ROUNDING_DRIFT_TOLERANCE` (=4) | Adjusted, then CORRECTED — see note |

**Tolerance correction (integrator pass).** The first pass widened invariant #4 from
`< 1` to `<= 1`. That was the right direction but under-derived and still false-fails:
`finalNetProfit` is ONE rounding of the exact expression, while the invariant re-derives
the same quantity from SIX independently-rounded figures, so a legitimate divergence of up
to 6 × 0.5 + 0.5 = 3.5 dinars is possible with no defect present. Replaced with a named
`ROUNDING_DRIFT_TOLERANCE = 4` — the smallest integer that cannot false-fail — with the
derivation at the constant and pinned by `consolidation-rounding-tolerance.test.ts`.

**Behavioural change:** `salesReturnDeduction` / `actualReturnLoss` now count every
verified return event in the window (the engine's rule) rather than only those linked
to a delivered order. This is intentional — the AI auditor must see the same figures as
the accounting page.

### `server/routes/analytics.ts`

| Line | Expression | Canonical replacement | Status |
|---|---|---|---|
| 21–24 | `REALIZED` array | `REALIZED_STATUSES` + new `REALIZED_SQL` parenthesised SQL list | Redirected |
| 191 | `CASE WHEN status IN ('delivered')` in the daily-sales SQL | `IN ${REALIZED_SQL}` | Redirected |
| 399 | `recentOrders.filter(o => o.status === 'delivered')` | `isRealizedStatus(o.status)` | Redirected |
| 17–20 | `realizedRevenueExpr` raw SQL | Kept — mirrors `orderCollectedAmount` in SQL; documented, aggregate cannot call JS | Already canonical (prior pass) |

### `server/services/ai-dashboard.ts`

| Line | Expression | Canonical replacement | Status |
|---|---|---|---|
| 365 | `COALESCE(SUM(CAST(orders.total AS NUMERIC)),0)` (all statuses, raw total, no shipping deduction) | `computePeriodFinancials(db, today, todayEnd).revenue` | Redirected |
| 403 | `parseFloat(revenueResult[0]?.total ?? "0")` | `todayFinancials.revenue` | Redirected |
| 48, 232–236, 304 | daily / trend / weekly revenue | `computePeriodFinancials` | Already canonical (prior pass) |

### `server/services/predictive-analytics.ts`

| Line | Expression | Canonical replacement | Status |
|---|---|---|---|
| 51 | `sum + parseFloat(order.totalAmount \|\| "0")` → AOV | `sum + orderCollectedAmount(order)` (select now includes `roundedTotal`) | Redirected |

### `server/services/ai-tools.ts`

| Line | Expression | Canonical replacement | Status |
|---|---|---|---|
| 373 (`getCustomerHistory`) | raw `orders.total` handed to the AI as the order amount | added `collectedAmount: orderCollectedAmount(o)` alongside; `roundedTotal` selected | Redirected |
| 266 | `map(v => parseFloat(v.price)).filter(!isNaN)` | `toMoney` | Redirected |
| 283 | `parseFloat(p.price) > 0 ? parseInt(p.price)…` | `toMoney` + `Math.round` | Redirected |
| 289 | `parseFloat(originalPrice) > parseFloat(price)` | `toMoney` both sides | Redirected |
| 626, 628 | discount % from `parseFloat` | `toMoney`; guard is now `toMoney(originalPrice) > 0` (no divide-by-zero) | Redirected |
| 677 | deals discount % from `parseFloat` | `toMoney` | Redirected |

### `server/routes/mcp.ts` (live MCP server, mounted at `/api/mcp`)

| Tool | Expression | Canonical replacement | Status |
|---|---|---|---|
| `get_orders_summary` | `SUM/AVG(rounded_total) WHERE status IN ('delivered','confirmed')` | `computePeriodFinancials` over the requested window; AOV = `revenue / deliveredOrders` | Redirected |
| `get_dashboard_stats` | `SUM/AVG(rounded_total) … IN ('delivered','confirmed')` | `computePeriodFinancials` | Redirected |
| `get_revenue_breakdown` | 5 SQL money aggregates over `('delivered','confirmed')` | `computePeriodFinancials` + `getRealizedOrdersForPeriod`; now also exposes `cogs`, `gross_profit`, `final_net_profit`, `exact_cogs`/`exact_final_net_profit` (**null when unknown**), `cost_status` | Redirected |
| `get_top_products` | `status IN ('delivered','confirmed')`, `Number(quantity) \|\| 1`, `Number(priceAtPurchase) \|\| 0` | `getRealizedOrdersForPeriod`, `lineQuantity`, `toMoney` | Redirected |

`by_status.total` (the per-status `SUM(rounded_total)`) is deliberately kept: it is an
operational status report, not a revenue figure, and the `overall` block beside it now
carries `revenue_basis: "realized_collected_minus_shipping"`.

### `server/aquavo-mcp.ts` and `server/aquavo-mcp-http.ts` (standalone MCP entry points)

Same four tools, same redirects as `server/routes/mcp.ts`. Both files now hold an
`accountingDb` handle typed as the engine's `Db`. Not mounted by the Express app
(`npm run mcp` / `npm run mcp:http`), but they are user-facing finance surfaces and had
identical divergent SQL.

---

## B. Already canonical (no action)

| File | Line | Note |
|---|---|---|
| `shared/order-financials.ts` | 14 | `REALIZED_STATUSES` — the definition itself |
| `server/routes/analytics.ts` | 17–20 | `realizedRevenueExpr` — SQL mirror of `orderCollectedAmount`, documented |
| `server/services/ai-dashboard.ts` | 48, 232–236, 304 | already on `computePeriodFinancials` |
| `server/routes/expenses.ts` | 33, 226–227, 274 | `toNumber` is the file's local alias for the canonical coercion |
| `server/storage/order-storage.ts` | 267 | cost snapshot writer — deliberately `null` when cost absent |

---

## C. Pending — accounting engine internals (20 sites)

`server/services/accounting-engine.ts` lines 62–99, 343–361, 406–415, 417–449, 742–853,
892–940, 1191–1297.

**Why pending:** these *are* the canonical implementations. `toNumber` inside the engine
is the imported `toMoney`. Nothing to redirect. Listed for completeness so a future grep
of the same patterns does not re-flag them.

---

## D. Pending — `server/routes/accounting.ts` (30 sites)

31 matches across lines 151–2117 (`o.status === "delivered"` ×5, `toNumber(...)` on
amounts ×20, `revenue − cogs` ×3, `b.revenue - a.revenue` sort ×1, drift `live.revenue −
frozenRev` ×1).

**Why pending:**
1. This file is the *origin* the engine was extracted from — the engine was lifted
   verbatim from it, so the formulas are identical by construction, not divergent.
2. It is explicitly scheduled for the **gated deletion phase**; rewriting it now would
   conflict with that plan and with the concurrent fulfillment work.
3. Its `toNumber` is already the canonical coercion; the residual `=== "delivered"`
   literals (lines 151, 490, 705, 754, 785) are the real remaining debt and should be
   swapped for `isRealizedStatus` when the file is next opened.

**Recommended next action:** replace the 5 `"delivered"` literals with `isRealizedStatus`
and route the remaining aggregates through `computePeriodFinancials`, then delete the
superseded blocks under the deletion gate.

---

## E. Pending — non-accounting arithmetic (89 sites)

None of these produce a revenue, COGS, margin, or P&L figure. They are catalog pricing,
recommendation scoring, display formatting, or plain row counts. Redirecting them to the
accounting engine would be wrong (the engine models *realized* money, not list prices).
The only improvement available is swapping `parseFloat` for `toMoney` for NaN safety.

| File | Lines | Category | Why pending |
|---|---|---|---|
| `server/services/competitive-pricer.ts` | 36, 83, 104, 113, 266, 274–278 | Catalog price + competitor comparison; `price * 0.7` is a cost *estimate heuristic*, not accounting cost | Not accounting money. **Note:** line 266 `estimatedCost = price * 0.7` fabricates a cost — it must never reach the ledger. It does not today. |
| `server/services/pricing-engine.ts` | 54, 57, 172, 205, 213, 317, 329, 398 | Dynamic-pricing suggestions on `products.price` | Catalog price, not realized revenue |
| `server/services/recommendation-engine.ts` | 213, 228, 273–274, 387 | Interaction scoring weights and price-band filters | Scoring, not money |
| `server/services/aquarium-advisor.ts` | 241, 244, 275, 278, 298, 301 | Build-cost estimate shown to the customer | Catalog price total; `toMoney` would be safer |
| `server/services/gemini-ai.ts` | 844–847, 858 | Chat product-card discount display | Display only |
| `server/utils/email.ts` | 214, 287–288 | Email template discount + price rendering | Display only |
| `server/services/data-seeder.ts` | 235, 243–245, 349 | Synthetic price-history seeding | Test/seed data |
| `server/services/fraud-detector.ts` | 111, 155 | Order-total and item-price thresholds | Risk heuristics; should use `orderCollectedAmount` for line 111 — **worth a follow-up** |
| `server/services/returns-handler.ts` | 178 | Product price for a return estimate | Should use `toMoney`; the authoritative loss figure comes from the engine |
| `server/services/embedding-generator.ts` | 42 | Price bucketed into embedding text | Not money output |
| `server/services/auto-order-processor.ts` | 151 | `price * quantity` for a generated order total | Order creation, not reporting |
| `server/services/inventory-optimizer.ts` | 63, `ai-monitor.ts` 163 | `Number(count)` on row counts | Not money |
| `server/routes/admin.ts` | 147, 150 | Cost-snapshot construction at status change | Feeds the engine's line snapshots; already null-aware |
| `server/routes/admin.ts` | 241, 571 | `status === "delivered"` literals | **Real debt** — should use `isRealizedStatus`; owned by another workstream |
| `server/routes/admin.ts` | 245, 570, 760 | `parseFloat(order.total)` / `Number(o.total)` for loyalty + customer `totalSpent` | **Real debt** — should use `orderCollectedAmount` |
| `server/routes/admin.ts` | 1329–1330 | Catalog price comparison | Not accounting |
| `server/routes/ai.ts` | 180, 190 | `parseFloat(order.total)`, `status === 'delivered'` in chat context | **Real debt** — same two canonical swaps |
| `server/routes/orders.ts` | 263, 348, 396 | Line total, `roundedTotal` echo, `status === "delivered"` | 396 should use `isRealizedStatus`; 263 should use `lineQuantity` |
| `server/services/order-notifications.ts` | 100 | Line total in a notification | Should use `lineQuantity` + `toMoney` |
| `server/storage/badge-engine.ts` | 173 · `server/storage/winback-engine.ts` | 80 | `status = 'delivered'` in raw SQL | Gamification/marketing eligibility, not revenue; still worth binding to `REALIZED_STATUSES` |
| `server/storage/product-storage.ts` | 504–506 | `inArray(status, ['delivered','confirmed','processing','shipped'])` for best-sellers | Deliberately broader than realized (popularity, not revenue) — documented in-file |
| `server/storage/product-storage.ts` | 173–174, 547, 555 · `server/storage/index.ts` 256–332 · `server/routes/products.ts` 265, 276 · `server/routes/cart.ts` 66 | `parseFloat(price) > 0` availability guards | Catalog filters, not money |
| `server/routes/pricing.ts` | 50, 145 · `server/routes/invoice.ts` 26, 29 · `server/routes/admin-invoices.ts` 76 | Price/invoice echo and formatting | Display; invoice totals come from the invoice row |
| `server/routes/simulation.ts` | 302–303, 310, 348–349 | What-if simulator (`cost * 0.2` default, weighted score) | Explicitly hypothetical; must never be persisted as accounting evidence |
| `server/routes/notifications.ts` | 440 · `server/storage/user-storage.ts` 60 | `Number(count)` pagination totals | Not money |

### Highest-value follow-ups from section E — NOW DONE (integrator pass)

These were flagged as outside the consolidation pass's file ownership and have since
been completed. Each is covered by `server/__tests__/consolidation-followup-swaps.test.ts`,
which states the legacy formula and the canonical one side by side.

| # | Site | Was | Now | What was actually wrong |
|---|---|---|---|---|
| 1 | `server/routes/admin.ts` (customer `totalSpent`) | `Number(o.total)` over ALL statuses | `orderCollectedAmount` over `isRealizedStatus` | A customer's "total spent" included **cancelled and pending** orders and used the pre-rounding total |
| 2 | `server/routes/admin.ts` (loyalty accrual) | `parseFloat(String(order.total))` | `orderCollectedAmount(order)` | Points accrued on the raw total, not what the customer paid |
| 3 | `server/routes/ai.ts` (chatbot revenue) | `parseFloat(order.total)` over EVERY order in the window | `orderCollectedAmount` gated on `isRealizedStatus` | The chatbot quoted revenue including cancelled orders — in the test scenario, **3× the real figure** |
| 4 | `server/services/fraud-detector.ts` | `parseFloat(order.total)` | `orderCollectedAmount(order)` | An order whose collected amount crossed the 500,000 threshold was **not flagged** because the raw total sat just under it |
| 5 | `server/storage/badge-engine.ts`, `server/storage/winback-engine.ts` | raw SQL `status = 'delivered'` | `IN ${REALIZED_STATUS_SQL}` | Local literals that could drift from accounting |

**New shared export:** `REALIZED_STATUS_SQL` in `server/services/accounting-engine.ts` —
the canonical realized-status set as a SQL `IN (...)` list. Aggregate queries cannot call
`isRealizedStatus`, so each previously carried its own literal. `analytics.ts` now uses
this shared definition instead of building its own copy, so the three call sites cannot
diverge.

**Deliberately NOT changed:** `server/routes/orders.ts` 396. The map originally listed it
as needing `isRealizedStatus`, but on inspection it is a delivery-DATE estimator branching
`"delivered"` vs `"shipped"` vs other — a shipping-status display branch, not a revenue
filter. Binding it to `REALIZED_STATUSES` would silently break the estimate if that set
ever widened to include a non-terminal status. Left as a literal, intentionally.

---

## Tests

- `server/__tests__/consolidation-engine-agreement.test.ts` — Drizzle + PGlite. Proves the
  redirected consumers' arithmetic reproduces the engine over a real database, that
  `confirmed`/`cancelled` orders are excluded, and that an unknown cost yields
  `null` (not `0`) at both order and period level.
- `server/__tests__/consolidation-consumer-primitives.test.ts` — pure. Proves each
  canonical primitive disagrees with the legacy inline formula it replaced, in the
  direction of the correct answer.
