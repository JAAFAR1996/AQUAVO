# Schema & Migrations Map — Code Side (Agent: SchemaMap)

READ-ONLY. Schema lives in `shared/schema.ts` (NOT `server/db` — that dir is empty). Zod contracts in `shared/accounting.ts`.

## Money representation
Almost all money = `numeric()` with NO precision/scale (arbitrary precision, returned as STRING by Neon → BigInt/Decimal sanitize gotcha). Only `manual_invoices` uses typed `numeric(12,2)`. Loyalty/cashback/totalSpent are `integer` (whole IQD). Currency default "IQD" everywhere; no FX.

## Money / order tables (shared/schema.ts)
- **products** (:74) — price/originalPrice numeric; currency default IQD. Cost cols present: `costPrice`, `packagingCost`, `insertCost` (:100-102, default 0) — **current/mutable cost only**.
- **orders** (:130) — total, roundedTotal, shippingCost, discountTotal, pointsDiscount numeric; boxCost (:162); codReceived bool (:161); source (:164); `financiallyCounted` nullable override (:166). Line items in `items` JSONB `$type<OrderLineItem[]>` (:147).
- **OrderLineItem** (:19-27): productId, quantity, variantId, priceAtPurchase, lineTotal. **NO cost/COGS field — COGS not snapshotted at sale.**
- **order_items** (:415) — mapped to physical table `order_items_relational` (NOT `order_items`). Has priceAtPurchase + totalPrice but **NO cost column**. Largely unused (lines read from orders.items JSONB in practice).
- **product_cost_history** (:186) — costPrice/packagingCost/insertCost + effectiveFrom + changedBy. Only time-versioned cost source; COGS reconstructed by joining sale date → effectiveFrom. Fragile.
- **expenses** (:201) — category, amount, expenseDate, isRecurring, soft-delete. Present & usable.
- **shipping_settlements** (:176) — carrier, amount, coveredOrderIds JSONB → COD reconciliation primitive.
- **payments** (:428) — 1:1 w/ order, amount, method, status. Thinly used (COD-only).
- **manual_invoices** (:2514) — numeric(12,2); status draft→confirmed; orderId link; financiallyCounted override.
- **order_return_events** (:2581) — refundAmount, deliveryCostLoss, returnShippingCost, packagingLoss, productWriteOffAmount, **cogsLoss**; affectedItems JSONB **carries cogsAtTime per item** (only place a cost snapshot is captured — for returns, not sales).
- **Accounting infra** (added via loose SQL, not drizzle): accounting_manual_adjustments (:2674), accounting_review_flags (:2703), accounting_audit_trail (:2736, append-only), accounting_period_closes (:2766, frozen month snapshots), finance_audit_runs (:2623) + finance_audit_findings (:2642).

## Migrations & drift (migrations/)
Drizzle journal (`migrations/meta/_journal.json`) tracks ONLY 0000–0006. Many hand-written SQL files applied directly in Neon Console (drift): run-cost-columns, run-finance-audit-tables, run-product-costs, 001–007 loyalty/reels, etc. Duplicate `0003_*` filename collision. `drizzle.config.ts` tablesFilter whitelist is STALE (express_sessions vs sessions, store_audit_logs vs audit_logs) and INCOMPLETE (omits manual_invoices, order_return_events, finance_audit_*, loyalty_*). **This is why `db:push` is DANGEROUS — do not run it.**
`migrations/archive_orphan_backup_tables.sql` (uncommitted) renames orphans `orders_backup_cod_20260625` and `audit_log`; gated "do not apply to production without approval".

## Presence check
- order_items table: PARTIAL — only `order_items_relational`; canonical lines in orders.items JSONB.
- Cost snapshot at sale: **ABSENT**.
- Expenses: PRESENT. Purchase/import/supplier: **ABSENT**. Inventory movement ledger: **ABSENT**.
- Double-entry ledger / chart of accounts: **ABSENT** (derived-on-read only).
- Refund records: PRESENT via order_return_events. Exchange-rate/multi-currency: **ABSENT**. Accounting-period: PRESENT.

## Gap list (accounting requires, schema lacks)
1. **COGS snapshot at sale (highest risk)** — profit recomputed retroactively from product_cost_history↔sale-date joins; gaps silently shift historical margins. Books not reproducible.
2. No purchase/supplier/import table — no landed cost, no payables, no source document.
3. No inventory movement ledger — stock is a mutable integer; no shrinkage/valuation trail.
4. No double-entry ledger / chart of accounts — no trial balance, no independent cross-foot.
5. COD reconciliation thin — codReceived bool + untyped coveredOrderIds JSONB; no per-order collected-vs-expected rows.
6. No multi-currency / exchange_rates — breaks if suppliers invoiced in USD.
7. Money-type inconsistency — bare numeric vs numeric(12,2) vs integer IQD; implicit rounding rules split across code.
8. Refunds not a first-class ledger — order_return_events mixes logistics + financial impact, gated by app-code status filtering not constraints.
