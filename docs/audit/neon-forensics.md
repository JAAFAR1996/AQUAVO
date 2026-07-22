# AQUAVO — Neon Database Forensic Audit

**Auditor:** Agent 4 (read-only forensic pass — SELECT / introspection only, no writes)
**Date:** 2026-07-21
**Connection target:** Neon project `fishweb` (id `shiny-tree-43710630`), org `Eng` (`org-sweet-glitter-04175211`), region `aws-us-east-1`, Postgres 17. Single database, default branch. *(No secrets or connection strings recorded.)*

All customer PII is redacted throughout; order ids are shown only as `md5(id)[0:8]` hashes and all figures are aggregates.

---

## 1. Method & scope

Read-only introspection of all 150+ tables in `public`, then targeted reconciliation SQL against the financial/order surface: `orders`, `order_items_relational`, `products`, `manual_invoices`, `product_cost_history`, the three audit tables, and the accounting scaffold tables. Every finding below carries the exact SQL used.

---

## 2. Schema inventory (financial / order surface)

| Table | Rows | Purpose | Notes |
|---|---:|---|---|
| `orders` | 37 | Customer orders | Line items live in `items` JSONB (NOT NULL). No cost columns. |
| `order_items_relational` | 100 | Relational order lines | FK to orders + products. `price_at_purchase`, `total_price` — **no cost snapshot**. Only 25 distinct orders covered. |
| `orders_backup_cod_20260625` | 28 | Ad-hoc backup snapshot | Orphan backup table left in prod. |
| `products` | 143 (114 active) | Catalog | `cost_price`, `packaging_cost`, `insert_cost` nullable DEFAULT 0. |
| `product_cost_history` | 45 | Cost-change history | Real effective-dated cost snapshots exist here (`effective_from`). |
| `manual_invoices` | 22 (all `confirmed`) | WhatsApp/manual invoices | `items` JSONB, no cost. Links to `orders` via nullable `order_id`. |
| `expenses` | 0 | Expense ledger | **Empty — unused.** |
| `payments` | 0 | Payments | **Empty — unused.** |
| `cost_ledger` | 1 | Cost ledger | Effectively empty. |
| `cash_flow` | 0 | Cash flow | Empty. |
| `supplier_payments` | 0 | Supplier payments | Empty. |
| `company_orders` | 0 | B2B orders | Empty. |
| `auto_orders` | 0 | Auto reorders | Empty. |
| `shipping_settlements` | 3 | Carrier settlements | Sparse. |
| `return_requests` / `damage_claims` / `order_return_events` | 0 | Returns/refunds | Empty — no refund data. |
| `accounting_audit_trail` | 5 | Field-level accounting audit | Append-only by shape (insert-only columns). |
| `accounting_manual_adjustments` | 3 | Manual GL adjustments | Sparse. |
| `accounting_period_closes` | 0 | Period closes | Empty — no periods ever closed. |
| `accounting_review_flags` | 0 | Review flags | Empty. |
| `audit_log` | 0 | Audit (singular) | **Empty duplicate table.** |
| `audit_logs` | 1092 | Audit (plural) | Active audit log, 2025-12-13 → 2026-07-21. |

**No `exchange_rates`, `chart_of_accounts`, `journal`, `ledger`, `accounting_periods`, or `affiliates` tables exist.** Currency is single-value `IQD` across the whole catalog (no mixed-currency data, no FX infrastructure).

### Cost model — proven from schema
There is **no per-line cost snapshot anywhere.** `order_items_relational` stores `price_at_purchase` + `total_price` but no cost column; `orders.items` JSONB keys are `productId, productName, quantity, priceAtPurchase, lineTotal, variantId, variantLabel` — no cost key. Therefore **COGS/profit for any historical order must be reconstructed live** from `products.cost_price` (current value) or by joining `product_cost_history` as-of the order date. Margin on past orders is not frozen and will drift whenever a product's cost is edited.

---

## 3. Findings (severity-ranked)

### 🔴 HIGH-1 — `order_items_relational` covers only 25 of 37 orders; 12 website orders have zero relational lines
The relational line table was backfilled for **all 19 WhatsApp orders but only 6 of 18 website orders**. 12 website orders (539,397 IQD of revenue) exist only as `orders.items` JSONB with no relational rows. Any analytics/top-selling/per-product-profit query that reads `order_items_relational` **silently omits these 12 orders (~32% of all orders).**

```sql
SELECT source, count(*) n,
 count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM order_items_relational r WHERE r.order_id=orders.id)) no_rel_lines,
 sum(total) FILTER (WHERE NOT EXISTS (SELECT 1 FROM order_items_relational r WHERE r.order_id=orders.id)) rev_missing
FROM orders GROUP BY source;
-- website: 18 orders, 12 with no relational lines, 539,397 IQD missing from relational
-- whatsapp: 19 orders, 0 missing
```

### 🔴 HIGH-2 — No cost snapshot on order lines → historical profit is non-reproducible
Proven in §2. Cost is a live lookup. `product_cost_history` (45 rows, effective-dated) exists and *could* anchor as-of cost, but no order line references it. Recompute any past-period margin and it changes as costs are edited.

### 🟠 MED-1 — `financially_counted` is NULL on all 37 orders; accounting counting flag entirely unused
Despite 26 delivered+paid orders with `cod_received = true`, **not a single order is flagged `financially_counted`.** The revenue-recognition gate the app schema anticipates is completely unpopulated.

```sql
SELECT status, payment_status, count(*) n,
 count(*) FILTER (WHERE financially_counted IS TRUE) fin_counted,
 count(*) FILTER (WHERE cod_received IS TRUE) cod_received
FROM orders GROUP BY status, payment_status;
-- delivered/paid: 26, fin_counted 0, cod_received 26
-- delivered/pending: 10, fin_counted 0, cod_received 0
-- shipped/pending: 1, fin_counted 0, cod_received 0
```

### 🟠 MED-2 — 10 orders are `delivered` but `payment_status = pending` / COD not received (453,198 IQD)
Delivered-but-unpaid orders create revenue-recognition ambiguity: goods are gone, cash unconfirmed, and none are financially counted. No `cancelled`/`refunded` status exists in the data, so there is no offsetting mechanism recorded.

### 🟠 MED-3 — `rounded_total` populated only on website orders → any report summing it undercounts by ~2×
All WhatsApp orders have `rounded_total = NULL`; only website orders populate it. A naive `sum(rounded_total)` returns 563,750 vs `sum(total)` 1,293,567 for the delivered/paid cohort — a silent >2× undercount driven purely by NULLs, not real value.

### 🟡 LOW-1 — JSONB line schema inconsistent: `lineTotal` missing on 105 lines
`priceAtPurchase` is present on **every** line (revenue reconstructs cleanly — see §4), but `lineTotal` is absent on all 19 WhatsApp orders and 8 website orders (105 lines total). Code relying on `lineTotal` instead of `priceAtPurchase*quantity` will read 0.

```sql
-- website: 31 lines missing lineTotal; whatsapp: 74 lines missing lineTotal; priceAtPurchase missing: 0
```

### 🟡 LOW-2 — 17 of 37 orders (46%) have NULL `order_number` — all WhatsApp-sourced
Not duplicates (0 duplicate order numbers, 0 duplicate `invoice_no`), but WhatsApp orders lack the human-facing FH-… identifier, complicating cross-referencing with `manual_invoices`.

### 🟡 LOW-3 — Redundant / orphan tables in production
`audit_log` (0 rows) duplicates `audit_logs` (1092 rows). `orders_backup_cod_20260625` (28 rows) is a leftover manual backup. Accounting scaffold (`expenses`, `payments`, `cash_flow`, `company_orders`, `auto_orders`, `supplier_payments`, `return_requests`, `damage_claims`, `accounting_period_closes`) is entirely empty — schema built ahead of use.

### 🟢 CLEAN — Integrity checks that PASSED
- 0 negative order totals; 0 non-positive quantities; 0 non-positive line prices; 0 active products with price ≤ 0.
- 0 rows where `total_price <> price_at_purchase * quantity` in `order_items_relational`.
- 0 orphan order lines (every `order_id`/`product_id` FK resolves); 0 orders with a missing user.
- 0 duplicate `order_number`; 0 duplicate `invoice_no`.
- Active-catalog cost coverage is strong: only **1 of 114 active products (0.9%)** has cost 0/NULL (30/143 total, but 29 of those are soft-deleted).

```sql
SELECT count(*) FILTER (WHERE (cost_price IS NULL OR cost_price=0) AND deleted_at IS NULL) active_missing,
       count(*) FILTER (WHERE deleted_at IS NULL) active_total FROM products;
-- 1 / 114  (0.9%)
```

---

## 4. Revenue reconciliation

Reconstructing each order as `Σ(priceAtPurchase × quantity) + shipping_cost − discount_total` vs stored `total`:

```sql
WITH recon AS (
 SELECT o.source, o.total, o.shipping_cost, COALESCE(o.discount_total,0) disc,
   (SELECT COALESCE(sum((li->>'priceAtPurchase')::numeric*COALESCE((li->>'quantity')::numeric,1)),0)
      FROM jsonb_array_elements(o.items) li) line_sum
 FROM orders o)
SELECT source, count(*) n,
 count(*) FILTER (WHERE abs(total-(line_sum+shipping_cost-disc))<=1) ok,
 round(sum(abs(total-(line_sum+shipping_cost-disc))),2) abs_variance
FROM recon GROUP BY source;
```

| Source | Orders | Reconcile OK | Abs variance |
|---|---:|---:|---:|
| website | 18 | **18 (100%)** | 0 IQD |
| whatsapp | 19 | 2 | 11,836 IQD total (~700 IQD/order) |

Website orders reconcile exactly. WhatsApp orders carry a small aggregate variance (~700 IQD/order) consistent with manual price rounding/adjustment at invoice time — immaterial in absolute terms but it means WhatsApp line detail is not a byte-exact source for `total`.

---

## 5. Headline reconciliation numbers

- **Active-catalog cost-missing: 0.9%** (1/114) — profit inputs are essentially complete for live products.
- **JSONB-vs-relational mismatch: 12 orders / 539,397 IQD** (32% of orders) present in `orders.items` but absent from `order_items_relational` — all website-sourced.
- **Order status split:** delivered/paid 26, delivered/pending 10, shipped/pending 1. No cancelled/refunded. `financially_counted` = 0 across all 37.
- **No per-line cost snapshot** anywhere → historical margin is non-reproducible.
- **Single currency (IQD), no FX tables.** No duplicate order/invoice numbers. Empty accounting ledgers (`expenses`, `payments`, period closes all 0).
