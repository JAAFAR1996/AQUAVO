# Stage A — Consolidated Discovery Report

Scale reality (from live Neon `fishweb`, PG17, IQD-only): **37 orders total** (18 website, 19 WhatsApp), 114 active products. This is an early-stage store — which makes the critical fixes and any snapshot backfill **low-risk and tractable**.

## Quantified production truth (NeonForensics)
- **Cost completeness (active catalog): 99.1%** — only 1 of 114 active products has no cost. (30/143 total have cost 0, but 29 are soft-deleted.) → Profit inputs are essentially complete for live products.
- **JSONB vs relational gap: 12 orders / 539,397 IQD** exist ONLY in `orders.items` JSONB with zero `order_items_relational` rows (all 19 WhatsApp backfilled, but only 6/18 website). Any query on the relational table silently drops ~32% of orders.
- **Status breakdown:** 26 delivered/paid, 10 delivered/pending (453,198 IQD unpaid), 1 shipped/pending. **NO cancelled/refunded orders exist.**
- **`financially_counted` is NULL/false on ALL 37 orders** — including the 26 delivered+paid+cod_received. If any report requires it true, it counts nothing.
- **`rounded_total` NULL on all 19 WhatsApp orders** → any `sum(rounded_total)` undercounts ~2×.
- **Reconciliation:** website orders reconcile 18/18 exactly (Σ price×qty + shipping − discount = total); WhatsApp off by 11,836 IQD total (~700/order, manual rounding). 0 negative totals, 0 nonpos qty/price, 0 orphan FKs, 0 duplicate order/invoice numbers.
- **Absent:** exchange_rates, chart_of_accounts, journal, purchases/suppliers, inventory-movement. Empty accounting scaffold tables exist (expenses/payments/cash_flow/company_orders/supplier_payments/period_closes all 0 rows).

## The core defect: two disagreeing financial systems
- **`accounting.ts` (canonical, well-built):** delivered-only, revenue = collected − shipping, effective-dated COGS, double-entry integrity proof, return-aware. Reads `orders.items` JSONB.
- **`analytics.ts` (naive, wrong):** revenue = `sum(orders.total)`, **no status filter** (counts pending as revenue, includes shipping), reads `order_items_relational` (missing 12 orders). Router **mounted twice** (routes.ts:78-79).

## Critical-correctness defects → Stage B
| # | Defect | Severity | Confirmed by | Fix class |
|---|---|---|---|---|
| 1 | No COGS snapshot at sale → historical profit recomputed at current cost | HIGH | Repo #3, Commerce #5, Schema gap1, Neon | Additive: snapshot on new orders + estimated flag on historical |
| 2 | Analytics revenue has no status filter / different store | CRITICAL | Repo #1, Neon | Canonical source |
| 3 | Cashback not subtracted from orders.total → **COD overcharge** | HIGH | Commerce #1 | Safe fix (read roundedTotal) |
| 4 | Manual invoice totals client-trusted + raw-SQL injection in invoice→order | HIGH | Commerce #3/#4 | Safe fix (recompute + parameterize + tx) |
| 5 | 12-order JSONB↔relational gap | HIGH | Repo #2, Neon | Reconciliation backfill + consistent dual-write |
| 6 | Duplicate analytics mount | LOW | Repo #8 | Safe fix |
| 7 | Float money + inconsistent rounding (ceil vs round); rounded_total NULL on WhatsApp | MED | Repo #4, Neon | Canonical rounding helper |
| 8 | financially_counted unused on all delivered/paid orders | MED | Neon | Verify accounting treats status=delivered correctly (override optional) |

## Security (owner action, outside code)
- **CRITICAL:** 10 real prod secrets in git HISTORY; rotation UNVERIFIED. Rotate now regardless of build. Working tree is clean → commit is safe.
- MEDIUM: `git rm --cached -r scripts/ scratch/` (373 tracked dev scripts leak DB host/user).

## Research anchors (Stage C)
- Cost = **landed cost** frozen at sale (IAS 2 + IAS 21); weighted-avg or FIFO (LIFO prohibited).
- Report **contribution margin per order** (deduct shipping, COD fee, discount, expected return loss).
- COD = **receivable-by-courier** with states + weekly settlement reconciliation.
- Money = integers; **IQD as WHOLE DINARS** (fils obsolete), USD cents, FX decimal.
- Iraq: CIT flat **15%** net profit (PwC, 2026-06-24); return due 31 May; Iraqi Unified Accounting System. **No VAT** on aquarium equipment → do NOT add a tax line to checkout. (Needs accountant sign-off — MEDIUM-HIGH confidence.)

## Blocked
- **Browser baseline (Agent 1):** awaiting admin URL + credentials.
