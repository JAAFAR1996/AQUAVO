# Legacy Accounting Inventory — AQUAVO

**Agent 1 deliverable · read-only audit · generated 2026-07-21**

Canonical engine = `server/routes/accounting.ts` (mounted `/api/admin/accounting`).
Canonical helpers = `shared/order-financials.ts` (status sets, `orderCollectedAmount`, `toMoney`, `roundCollected`, `ROUNDING_STEP=250`).
Canonical types = `shared/accounting.ts`.

Goal of this map: identify every place a money metric (revenue / profit / COGS / margin / AOV / expenses / COD / invoice total) is computed **independently** of the canonical engine, so the coordinator can consolidate and delete the rest.

---

## 1. The canonical engine (target — keep & extend)

`server/routes/accounting.ts` (3198 lines). Core internal functions (all the "single source of truth"):

| Function | Lines | Purpose |
|---|---|---|
| `orderCollectedAmount` (imported) | shared/order-financials.ts:82 | collected = roundedTotal ?? round(total/250)*250 |
| `lineCostSnapshot` | 71-83 | immutable per-line cost snapshot (preferred over resolver) |
| `buildCostResolver` | 294-385 | effective-dated cost + approved manual overrides |
| `calcOrderProfit` | 577-645 | per-order revenue/COGS/packaging/netProfit/margin |
| `getRealizedOrdersForPeriod` | 564-575 | delivered-only + `financiallyCounted` override |
| `computePeriodFinancials` | 665-706 | period revenue/cogs/expenses/returns/finalNetProfit (single source for close + reconcile) |
| `buildLedger` | 780-881 | double-entry trial balance + income statement + integrity check vs `computePeriodFinancials` |
| `buildWhatsappInvoiceBreakdown` | 423-560 | WhatsApp/manual-invoice revenue & profit |

Endpoints (all `requireAdmin`): `/summary`, `/products`, `/orders`, `/cod-summary`, `/cod-details`, `/product-sales-drill/:productId`, `/return-metrics`, `/returned-orders`, `/settlements` (GET/POST), `/costs/:productId`, `/cost-history/:productId` (GET/POST), `/cost-history-audit`, `/coupons`, `/orders/:orderId/box-cost`, `/audit-trail`, `/report-timeseries`, `/periods` (+close/reopen), `/ledger`, `/inventory`, `/return-events` (CRUD+status), `/report`, `/whatsapp-invoices`, `/whatsapp-source-review`, `/manual-adjustments`, `/review-flags`.

**Supporting services (migrate-with-canonical — keep, they are the audit/override backbone):**
- `server/services/accountingAuditTrail.ts` — `recordFinancialChange`, `listFinancialAuditTrail`, `actorFromRequest`. Consumers: accounting.ts, expenses.ts.
- `server/services/accountingManualOverrides.ts` — `createAdjustment/approve/reject/listAdjustments/listReviewFlags/updateReviewFlagStatus`. Consumers: accounting.ts.
- `server/services/financeAuditStorage.ts` — persists finance-audit runs. Consumer: groqFinanceAudit + finance-audit.ts.

---

## 2. Inventory table

| Component | file:line | type | computes financials? | classification | consumers | notes |
|---|---|---|---|---|---|---|
| Canonical accounting router | routes/accounting.ts (whole) | route+calc | YES (canonical) | **retain-canonical** | client finance-* components, admin-dashboard | target engine |
| order-financials helpers | shared/order-financials.ts | helper | YES (canonical defs) | **retain-canonical** | accounting.ts, analytics.ts, orders.ts, invoice.ts | REALIZED=`['delivered']` only |
| accounting types | shared/accounting.ts | types/zod | schema only | **retain-canonical** | client + server | |
| **analytics — realized revenue SQL** | routes/analytics.ts:17-20 | route/SQL | YES | **migrate-into-canonical** | GET `/api/analytics`,`/api/admin/analytics` → analytics-dashboard.tsx, admin-dashboard.tsx | `realizedRevenueExpr` = SUM(collected − shipping) delivered-only. Correct definition but reimplemented in SQL, not via accounting.ts |
| analytics — daily revenue SQL | routes/analytics.ts:188-200 | route/SQL | YES | migrate-into-canonical | same | duplicates realized formula inline in CASE WHEN |
| analytics — top-products revenue | routes/analytics.ts:228-250 | route/SQL | YES | migrate-into-canonical | same | `SUM(priceAtPurchase*quantity)` from **order_items relational** table; comment admits ~12 orders exist only in orders.items JSONB and are missed |
| analytics — AOV | routes/analytics.ts:184 | route | YES | migrate-into-canonical | same | currentRevenue / realizedOrders |
| **ai-dashboard revenue** | services/ai-dashboard.ts:42,227,234,315,380 | service/SQL | YES (DIVERGENT) | **replace** | ai-advanced.ts:1169/1190/1211 (getDailySummary/QuickStats/WeeklyForecast) → AI daily-summary/forecast endpoints | `SUM(orders.total)` across **ALL statuses**, raw `total` (not collected), no shipping subtraction. Wrong on 3 axes |
| **groqFinanceAudit snapshot** | services/groqFinanceAudit.ts:140-336 | service | YES (FULL P&L DUP) | **replace (call computePeriodFinancials/all-time)** | routes/finance-audit.ts → client finance-audit.tsx; also scheduled? | Reimplements grossRevenue/netRevenue/COGS/grossProfit/expenses/returns-split/finalNetProfit/inventory with private `toNum`,`collectedAmount`,`netAmount`,`evtSalesReturnDeduction`,`evtActualReturnLoss`. Header comment: "mirror accounting.ts — no import to avoid coupling". Biggest duplicate. scope=all_time |
| groqFinanceAudit invariant checks | services/groqFinanceAudit.ts:340-447 | service | verifies (no compute) | retain-non-financial | finance-audit.ts | keep as guardrails but point at canonical snapshot |
| **admin GET /orders profit** | routes/admin.ts:132-161 | route | YES (DIVERGENT) | **replace** | `/api/admin/orders` → client orders-management.tsx (profit column) | per-order `profit = SUM(price*qty) − SUM(currentCostPrice*qty)`; ALL statuses, current cost (not snapshot), ignores shipping/box/coupons |
| **mcp get_revenue_breakdown** | routes/mcp.ts:1064-1075 | MCP tool/SQL | YES (DIVERGENT) | **migrate-into-canonical** | AI assistant MCP tools | status IN (`'delivered','confirmed'`) — includes confirmed, diverges from canonical delivered-only |
| mcp get_dashboard_snapshot | routes/mcp.ts:992-997,1051-1061 | MCP tool/SQL | YES | migrate-into-canonical | MCP tools | SUM(roundedTotal); revenue for delivered+confirmed |
| mcp get_product_sales | routes/mcp.ts:1087-1094 | MCP tool | YES | migrate-into-canonical | MCP tools | revenue = priceAtPurchase*quantity from orders.items |
| mcp get_expenses_summary | routes/mcp.ts:1138-1140 | MCP tool/SQL | YES | migrate-into-canonical | MCP tools | SUM(expenses.amount) |
| **aquavo-mcp.ts (stdio) finance tools** | aquavo-mcp.ts:603-615,759-769,826-882,997 | MCP tool/SQL | YES (DUP of mcp.ts) | **delete (consolidate)** | standalone MCP server process | same `('delivered','confirmed')` divergence; get_dashboard_snapshot/get_revenue_breakdown/get_product_sales/get_expenses_summary |
| **aquavo-mcp-http.ts finance tools** | aquavo-mcp-http.ts:318-319,346-352,355-375,410 | MCP tool/SQL | YES (DUP of mcp.ts) | **delete (consolidate)** | standalone HTTP MCP server | third copy of the same finance SQL |
| expenses list aggregation | routes/expenses.ts:111-127 | route | YES (expenses only) | retain-non-financial | `/api/admin/expenses` → finance-expenses.tsx | `totalExpenses`/`byCategory` reduce; duplicates accounting `/report` expense block but is the CRUD surface. Keep entry, dedupe the read |
| expenses CRUD | routes/expenses.ts (whole) | route | data entry | retain-non-financial | finance-expenses.tsx | writes `expenses` table consumed by canonical |
| order cost snapshot writer | storage/order-storage.ts:264-364 | storage | freezes costPrice per line | **retain-canonical** (feeds calcOrderProfit) | order creation | writes immutable `costPrice`/`unitCostPrice` snapshot — the source calcOrderProfit prefers |
| order create total | routes/orders.ts:262-269 | route | uses orderCollectedAmount | retain-non-financial | checkout | already delegates to canonical helper |
| invoice storage totals | storage/invoice-storage.ts:82-113,283 | storage | stores subtotal/discount/total | retain-non-financial | admin-invoices.ts | pass-through persistence |
| invoice → order sync | storage/invoice-storage.ts:218-251 | storage | copies discount/total to order | uncertain-needs-coordinator | invoice confirm flow | carries `discountTotal`, line `priceAtPurchase` onto order → later read by accounting |
| **client manual-invoice total** | client/.../admin/manual-invoice-creator.tsx:115-117 | client | YES | replace (server-compute) | POST /api/admin/invoices | `total = ceil((subtotal−discount+delivery)/250)*250` — duplicates `roundCollected()` on the client |
| client cart total | client/.../contexts/cart-context.tsx:651-652 | client | YES (cart display) | retain-non-financial | cart UI | `SUM(price*quantity)` display total; legit checkout math |
| client finance dashboards | client/.../admin/finance-overview.tsx, analytics-dashboard.tsx, finance-report.tsx, finance-ledger.tsx, accounting-panel.tsx | client | NO (render only) | retain-non-financial | consume canonical endpoints | render `summary.totalRevenue/netProfit/margin` verbatim — no independent math |
| simulation profitMargin | routes/simulation.ts:313-385 | route | pricing margin (price−cost)/price | retain-non-financial | pricing simulator | product-price margin, not order accounting |
| pricing-engine / competitive-pricer | services/pricing-engine.ts, competitive-pricer.ts | service | price-vs-cost margin | retain-non-financial | pricing routes | price setting, not realized P&L |

---

## 3. Duplicate revenue / profit formulas (the core finding)

Every place a money metric is computed **independently of `accounting.ts`**, grouped by the revenue *definition* used. **5 divergent revenue definitions coexist:**

**Definition A — delivered-only, collected − shipping (CANONICAL):**
- `shared/order-financials.ts` `orderCollectedAmount` + `calcOrderProfit`/`computePeriodFinancials` — canonical
- `routes/analytics.ts:17-20` `realizedRevenueExpr` (SQL reimplementation, correct)
- `routes/analytics.ts:188-200` daily revenue (SQL reimplementation, correct)
- `services/groqFinanceAudit.ts:140-182` `collectedAmount`/`netAmount` (all-time reimplementation, correct definition but private copy)

**Definition B — ALL statuses, raw `orders.total` (WRONG):**
- `services/ai-dashboard.ts:42,227,234,315,380` `SUM(CAST(orders.total AS NUMERIC))` — counts cancelled/pending, raw total, no shipping

**Definition C — `('delivered','confirmed')`, roundedTotal (DIVERGENT — includes confirmed):**
- `routes/mcp.ts:997,1071,1053`
- `server/aquavo-mcp.ts:613,762,836`
- `server/aquavo-mcp-http.ts:319,346,359`

**Definition D — line revenue `SUM(priceAtPurchase * quantity)`:**
- `routes/analytics.ts:233` (from order_items relational table — misses JSONB-only orders)
- `routes/admin.ts:157-160` (from orders.items JSONB, all statuses)
- `routes/mcp.ts:1094`, `aquavo-mcp.ts:881`, `aquavo-mcp-http.ts:375` (per-product)

**Independent profit / COGS formulas (outside accounting.ts):**
- `services/groqFinanceAudit.ts:237-264` — full COGS + grossProfit + finalNetProfit + return-loss split (complete P&L duplicate)
- `routes/admin.ts:148,160` — `profit = revenue − SUM(currentCostPrice*qty)` (current cost, all statuses)
- `routes/simulation.ts:313` / pricing services — price-vs-cost margin (pricing domain, not P&L)

**Independent expense aggregation:**
- `routes/expenses.ts:111-118`, `routes/mcp.ts:1138`, `aquavo-mcp.ts:997`, `aquavo-mcp-http.ts:410` (vs accounting.ts `/report` expense block)

**Client-side money math that should be server-owned:**
- `manual-invoice-creator.tsx:115-117` — invoice total with 250-rounding (dup of `roundCollected`)
- `cart-context.tsx:651-652` — cart display total (acceptable)

### Count
**~19 independent money-metric computation sites across 8 files** (4 canonical-aligned reimplementations, 15 divergent/duplicate). Distilled to **5 divergent revenue definitions** + **2 full/partial independent P&L engines** (`groqFinanceAudit.ts`, `admin.ts` GET /orders) + **3 duplicate MCP finance tool sets** (`mcp.ts`, `aquavo-mcp.ts`, `aquavo-mcp-http.ts`).

---

## 4. Recommended consolidation order (for coordinator)

1. **replace** `services/ai-dashboard.ts` revenue (Definition B, flatly wrong) → call `computePeriodFinancials`.
2. **replace** `services/groqFinanceAudit.ts` `buildFinanceSnapshot` internals → import canonical helpers / an all-time `computePeriodFinancials`; keep invariant checks.
3. **replace** `routes/admin.ts` GET /orders profit → reuse `calcOrderProfit`.
4. **delete/consolidate** `aquavo-mcp.ts` + `aquavo-mcp-http.ts` finance tools (duplicate `mcp.ts`); align `mcp.ts` realized filter to `['delivered']` and route through canonical.
5. **migrate** `analytics.ts` revenue/top-products SQL onto canonical status set + JSONB-inclusive source.
6. **replace** client `manual-invoice-creator.tsx` total with server-computed value.
7. **retain** expenses/invoice storage/order-storage snapshot/pricing/simulation (non-P&L or data-entry).

### DB financial tables (shared/schema.ts — verify with SchemaMap agent)
`orders` (total, roundedTotal, shippingCost, boxCost, discountTotal, pointsDiscount, couponId, status, source, codReceived, financiallyCounted, items JSONB), `products` (price, costPrice, packagingCost, insertCost, stock), `productCostHistory`, `orderReturnEvents`, `shippingSettlements`, `expenses`, `manualInvoices`, `accountingManualAdjustments`, `accountingPeriodCloses`. **Note (existing memory): `order_items` relational table is largely absent — analytics.ts top-products reads it and misses JSONB-only orders.**

### Financial tests
- `server/__tests__/order-financials.test.ts` — canonical status/collected/rounding helpers
- `server/__tests__/cost-snapshot.test.ts` — immutable cost snapshot behavior
- `server/__tests__/orders-api.test.ts` — order totals
