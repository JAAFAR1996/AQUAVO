# One-Accounting-System Consolidation Plan

Derived from `docs/audit/legacy-accounting-inventory.md`. Target: every financial number in the app comes from ONE importable engine. To be refined by the Canonical Architect (research-informed) before implementation.

## Target state
- **ONE engine:** `server/services/accounting-engine.ts` (NEW) — extracted from the current route-local functions in `server/routes/accounting.ts` (`calcOrderProfit`, `computePeriodFinancials`, `buildCostResolver`, `lineCostSnapshot`, `getRealizedOrdersForPeriod`, `buildLedger`, WhatsApp invoice breakdown). Pure move; `accounting.ts` route becomes a thin caller.
- **ONE helpers module:** `shared/order-financials.ts` (status sets, `orderCollectedAmount`, `roundCollected`, `toMoney`) — already exists.
- **ONE API layer:** `/api/admin/accounting/*` (routes/accounting.ts). All other financial endpoints delegate to the engine.
- **ONE admin area:** the `finance-*` / accounting-panel pages (render-only, no client math).

## Divergent revenue definitions found (must collapse to A)
- **A (canonical):** delivered-only, `collected − shipping`. Keep.
- **B:** ALL-statuses raw `orders.total` — `ai-dashboard.ts`. **WRONG (3 axes).** Replace.
- **C:** delivered+confirmed, roundedTotal — the 3 MCP tool sets. **DIVERGES (includes confirmed).** Align/delete.
- **D:** line `price*qty` — analytics/admin/mcp top-products. Migrate to engine.
- **E:** pricing margin (price-vs-cost) — pricing/simulation. **Non-P&L, retain.**

## Consumer redirect / removal list (Phase 5 cutover → Phase 6 delete)
| Component | file:line | Action | Consumer to keep working |
|---|---|---|---|
| `services/groqFinanceAudit.ts` | 140-336 | **Replace** private P&L with engine call | finance-audit.tsx |
| `services/ai-dashboard.ts` | 42,227,234,315,380 | **Replace** SUM(total) with engine | ai-advanced.ts (daily/quick/forecast) |
| `routes/admin.ts` GET /orders | 132-161 | **Replace** inline profit with engine `calcOrderProfit` | orders-management.tsx |
| `routes/analytics.ts` | 17-20,188-250 | **Migrate** realized-revenue + top-products to engine | analytics-dashboard.tsx |
| `routes/mcp.ts` finance tools | — | **Align** to engine | MCP clients |
| `server/aquavo-mcp.ts`, `aquavo-mcp-http.ts` | — | **Delete** (duplicate MCP tool sets) — after confirming no separate consumer | — |
| `client/manual-invoice-creator.tsx` | 115-117 | **Server-compute** total (drop client rounding) | admin invoice UI |
| `routes/expenses.ts` | 111-118 | Dedupe expense read-agg into engine | expenses UI |

## Retain (non-financial or feeds canonical)
accountingAuditTrail.ts, accountingManualOverrides.ts, financeAuditStorage.ts, order-storage.ts cost-snapshot (feeds engine), invoice-storage/admin-invoices pass-through, pricing-engine/competitive-pricer/simulation (margin ≠ P&L), client finance-* dashboards (render-only).

## Safe sequence (no deletion before proof)
1. Extract engine (mechanical, tested) — `accounting.ts` imports it; behavior identical.
2. Redirect each consumer to the engine, one file at a time, tests after each.
3. Build missing modules per architecture (expenses/purchases/imports/inventory/COD/commissions/ledger/tax-readiness) into the engine + schema (additive migrations).
4. Shadow comparison (gated: writable Neon).
5. Cutover admin APIs/pages.
6. **Delete** duplicates only after browser + shadow + accounting verification pass.
7. `docs/audit/single-accounting-system-proof.md`.

## Owner-policy gates (do not choose silently)
Inventory valuation method · landed-cost allocation · delivery-revenue treatment · affiliate commission timing · ad-cost attribution · overhead allocation · VAT/tax status · period-locking · historical cost-backfill · any destructive correction.
