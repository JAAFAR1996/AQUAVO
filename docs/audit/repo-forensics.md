# Financial Calculation Forensics (Agent: RepoForensics)

READ-ONLY. **Headline: TWO parallel financial-truth systems that disagree.** One well-engineered (`accounting.ts`), one naive/wrong (`analytics.ts`).

## Dependency map
| Metric | UI | API mount | Service/formula (file:line) | DB source |
|---|---|---|---|---|
| Finance revenue/profit/COGS/margin | admin/accounting-panel.tsx + finance-*.tsx | routes.ts:162 `/api/admin/accounting` | accounting.ts:562 `calcOrderProfit`, :644 `computePeriodFinancials`, :862 `/summary` | orders.items JSONB + productCostHistory + expenses + orderReturnEvents |
| Cost/COGS snapshot | (same) | (same) | accounting.ts:279 `buildCostResolver`, :356 `getEffective` (effective-dated) | product_cost_history.effectiveFrom |
| Double-entry ledger | finance-ledger.tsx | `/api/admin/accounting/ledger` | accounting.ts:759 `buildLedger` (net income === finalNetProfit) | derived |
| COD reconciliation | finance-overview.tsx | accounting.ts:1238 `/cod-summary` | collected − shippingCost, delivered only | orders + shipping_settlements + orderReturnEvents |
| Admin "Analytics" revenue/AOV/topProducts | admin/analytics-dashboard.tsx | routes.ts:78-79 (mounted TWICE) | analytics.ts:84-93 `sum(orders.total)` — NO status filter | orders.total (all statuses) + order_items_relational |
| AI dashboard/predictive/inventory/fraud/returns | various | — | services read `from(orderItems)` | order_items_relational |
| Checkout total/rounding/delivery | checkout-dialog.tsx | orders.ts | order-storage.ts:317-320 (ceil to 250), :276 fee | orders.total/roundedTotal/shippingCost |

## Severity-ranked findings
1. **CRITICAL — Two revenue definitions.** Accounting revenue = `collected − shipping`, delivered-only (accounting.ts:595,:183-184). Analytics revenue = `sum(orders.total)` with only createdAt filter, **NO status filter** (analytics.ts:84-93,:292) → cancelled/rejected/pending counted as revenue, shipping included. Dashboards always disagree.
2. **HIGH — Two line-item stores, no backfill.** orders.items JSONB = accounting source (accounting.ts:238); order_items_relational = analytics + 6 services. Relational dual-write added recently (order-storage.ts:344-360, guarded), so historical orders exist only in JSONB → analytics top-selling/forecasts undercount all history.
3. **HIGH — No cost snapshot on order line.** order_items_relational has priceAtPurchase but no cost (schema.ts:415-426). COGS via `getEffective(productId, createdAt)`; if no history row precedes order date, falls back to **current** product cost (accounting.ts:364-366) → historical profit recomputed at today's cost, no warning.
4. **MEDIUM — Float money + inconsistent rounding.** numeric→string→Number/parseFloat everywhere. Checkout `Math.ceil` to 250 (order-storage.ts:319) vs accounting fallback `Math.round` (accounting.ts:139).
5. **MEDIUM — Third revenue formula (WhatsApp invoices).** `invRevenue = subtotal − discount` (accounting.ts:482) vs website `collected − shipping`.
6. **MEDIUM — Period attribution by createdAt, realization by status.** Order created month A, delivered month B → booked in A. No deliveredAt timestamp (accounting.ts:549-560).
7. **LOW-MED — Silent zero defaults mask missing data.** toNumber→0 (accounting.ts:130-133); WhatsApp `invProfit = costsComplete ? ... : 0` (:483) → missing cost yields profit 0, not error.
8. **LOW — Duplicate analytics mount** at `/api/admin/analytics` and `/api/analytics` (routes.ts:78-79) → double setInterval sweeper; in-memory presence Map won't survive serverless.

## Clean / preserve
`accounting.ts` is the strongest code in the repo: single-source `computePeriodFinancials` (:644) drives both period-close snapshot and reconciliation recompute, with double-entry integrity proof (`ledgerNetIncome === finalNetProfit`, :849-851). Effective-dated cost model. Return split (revenue reversal vs operational loss, restock-aware, :162-181). `financiallyCounted` override.

## Recommendations
- SAFE: fix analytics revenue to filter delivered + use collected−shipping, or delete analytics revenue path and consume `/api/admin/accounting/summary` (ONE source). Mount analytics router once.
- STRATEGIC: add cost snapshot cols to order_items_relational + backfill JSONB; introduce `deliveredAt` and attribute realized revenue by delivery date. No db:push — additive SQL surgically.
