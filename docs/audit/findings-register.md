# Agent Findings Register — AQUAVO Financial Audit

Coordinator: lead session. Waves per Mandatory Multi-Agent Protocol. Updated live.

## Wave 1 — Discovery
| Agent | Scope | Status | Evidence file | Unresolved |
|---|---|---|---|---|
| RepoForensics (Agent 3) | Financial calc tracing UI→API→formula→DB | ✅ done | docs/audit/repo-forensics.md | magnitude of analytics-vs-accounting revenue gap (needs Neon) |
| CommerceFlow (Agent 3/5) | Cart→checkout→order→invoice money flow | ✅ done | docs/audit/commerce-flow.md | does live order_items_relational match JSONB? (needs Neon) |
| SchemaMap (Agent 4/5) | Code-side schema + migrations + gaps | ✅ done | docs/audit/schema-map.md | code-vs-live-DB drift extent (needs Neon) |
| SecurityAudit (Agent 8) | Admin/financial authz + secrets | ✅ done | docs/security/admin-financial-security.md | secret rotation UNVERIFIED (owner must confirm) |
| ExternalResearch (Agent 2/6) | Accounting best-practice + Iraqi tax | ✅ done | docs/research/accounting-bestpractice.md, docs/research/iraq-tax-compliance.md | 8 questions need Iraqi accountant (VAT status top priority) |
| NeonForensics (Agent 4) | Live production read-only DB audit | ✅ done | docs/audit/neon-forensics.md | 12-order relational gap, financially_counted unused |
| BrowserBaseline (Agent 1) | Live admin browser baseline | ⛔ blocked | docs/audit/browser-baseline.md | needs admin URL + credentials from owner |

## Cross-agent CONVERGENT findings (multiple independent agents agree)
1. **No COGS cost snapshot at sale** — RepoForensics #3 + CommerceFlow #5 + SchemaMap gap 1. Historical profit silently recomputed at current cost. → Stage B fix (immutable snapshot) + Stage C (landed cost per research).
2. **Two revenue definitions / analytics has NO status filter** — RepoForensics #1. Cancelled/pending counted as revenue. → Stage B canonical source.
3. **Two line-item stores (orders.items JSONB vs order_items_relational), no backfill** — RepoForensics #2 + SchemaMap + CommerceFlow #6. → Stage B reconciliation.
4. **Duplicate analytics router mount** (routes.ts:78-79) — RepoForensics #8. → Stage B safe fix.
5. **Float money + inconsistent rounding (ceil vs round)** — RepoForensics #4 + research (use integer whole-dinar). → Stage B/C.

## NEW single-source findings to action
- **Cashback not subtracted from orders.total → COD overcharge** (CommerceFlow #1, HIGH). → Stage B safe fix.
- **Manual invoice totals client-trusted + raw SQL injection sink** (CommerceFlow #3/#4, HIGH). → Stage B safe fix.
- **CRITICAL secrets in git history, rotation unverified** (SecurityAudit). → Owner action (rotate), not a code fix; surfaced.

## Research anchors (Stage C policy design)
- Cost = landed cost frozen at sale (IAS 2 + IAS 21); weighted-avg or FIFO (LIFO prohibited).
- Report contribution margin per order (deduct shipping, COD fee, discount, expected return loss).
- Model COD as receivable-by-courier with states + weekly settlement reconciliation.
- Money = integers; **IQD stored as WHOLE DINARS** (fils obsolete), USD as cents, FX rate decimal.
- Iraq: CIT flat **15%** net profit (PwC, reviewed 2026-06-24); tax year calendar; return due 31 May; books must follow Iraqi Unified Accounting System. **No VAT** in Iraq; aquarium equipment not in sales-tax categories → do NOT add VAT line to checkout. (VAT-exempt assumption = MEDIUM-HIGH confidence, needs accountant sign-off.)

## Stage B — Implementation progress
- **Increment 1 — canonical financial source + status handling ✅ DONE & TESTED.**
  - New `shared/order-financials.ts` (single source: REALIZED/CANCELLED/IN_PROGRESS status sets, `toMoney`, `orderCollectedAmount`, `roundCollected`).
  - `accounting.ts` refactored to import them (pure, no behavior change).
  - `analytics.ts` revenue fixed: was `sum(orders.total)` across ALL statuses → now **delivered-only, collected − shipping** (headline, previous-period, daily chart, top-products all consistent); AOV denominator = realized orders.
  - `server/__tests__/order-financials.test.ts` — 11 unit tests, green. Full run 45/45 pass.
- **Increment 2 — COD collected-amount fix ✅ DONE & TESTED.** `orders.ts` COD/Telegram notification now sends `orderCollectedAmount()` (post-cashback, rounded payable) instead of raw `orders.total`. Fixes cashback COD-overcharge (Commerce #1) AND the total-vs-roundedTotal ambiguity (#2) for ALL orders. 36 orders-api tests pass.
- **Increment 3 — invoice→order conversion hardened ✅ DONE & TESTED.** `invoice-storage.ts createOrderFromInvoice`: (a) removed raw-SQL injection sink (parameterized Drizzle stock update), (b) wrapped order+items+stock in ONE transaction, (c) carry `discountTotal` onto the converted order (was silently dropped). 224/224 server tests pass.
- **Increment 4 — immutable cost snapshots ✅ CODE DONE & TESTED (migration NOT applied).**
  - `shared/schema.ts`: `OrderLineItem` gains optional `costPrice/packagingCost/insertCost`; `order_items_relational` gains additive `unit_cost_price/unit_packaging_cost/unit_insert_cost` (numeric default 0).
  - `order-storage.ts`: freezes the product's current cost onto every new order line (JSONB + relational) at sale time.
  - `accounting.ts`: `lineCostSnapshot()` — prefers the frozen snapshot; only falls back to effective-dated history for older orders; new `estimatedCostLines` counter surfaces historical uncertainty per order. Editing product cost later can no longer rewrite a completed order's profit.
  - Migration `migrations/add_order_item_cost_snapshot.sql` (+ `_rollback.sql`) — additive, idempotent. Read-only introspection CONFIRMED the 3 columns don't exist yet (safe). **NOT applied** — Neon MCP is read-only; cannot create/test a Neon branch or apply. Needs owner to apply, or full-access Neon to branch-test.
  - Tests: `cost-snapshot.test.ts` (4) + updated `orders-api.test.ts` (base line proves 6000/300/200 capture; variant proves 0). **228/228 server tests pass.**
- **BLOCKER: Neon MCP is read-only** — the "test migration on a Neon branch" plan is not executable from here (no branch-create/DDL). Migration authored + statically validated only.

- **Finding #8 (duplicate analytics mount) — DID NOT SURVIVE VERIFICATION.** Client calls BOTH `/api/admin/analytics/*` (dashboard) and `/api/analytics/*` (public presence/tracking). Both mounts required. `setInterval` is module-level (runs once). No change made. `routes.ts` untouched.

## Safety corrections (owner-mandated round 2) — ALL DONE
- **Item 1 — nullable costs ✅** `ProductCost.costPrice/packagingCost/insertCost: number|null`; `toMoneyOrNull` (no `||0`); unknown line excluded from COGS (never fabricated); `OrderProfit.exactCogs/exactNetProfit` = null unless `costStatus==='exact'`; per-line `unitCost*` nullable + `costStatus`; `PeriodFinancials.costComplete/exactFinalNetProfit`. New `nullable-cost.test.ts` (6) proves null stays null, 0 stays 0, unknown→no exact profit, no apparent-zero line, JSON preserves distinction.
- **Item 2 — idempotent migration ✅** DO-block guards on all named CHECKs (pg_constraint lookup) + allowed-value CHECKs (status/source/confidence/version), all NOT VALID (no history rewrite). Proven with real Postgres via PGlite: `migration-idempotency.test.ts` (5) — apply/re-apply/rollback/re-apply + constraint enforcement.
- **Item 3 — credential hardening ✅** `e2e/support/test-credentials.ts` (env-only, no fallback, refuses prod URL without `ADMIN_AUDIT_READ_ONLY=true`); `admin.spec.ts` + `contexts.spec.ts` wired to it; primary docs scrubbed (README/PRODUCT_SPEC/TESTSPRITE/QA-prompt). `e2e-credentials-guard.test.ts` (5).
- **Item 4 — transparent audit script ✅** `scripts/audit-admin-readonly.mjs` (env-only creds, requires flag, domain whitelist, OUT-outside-repo, login-only submit, tab-only clicks, PII redaction, clears cookies, never prints secrets). Guards verified. Command doc: `docs/audit/read-only-admin-audit.md`. Replaces the scratch script.
- **Suite: 244 tests pass (17 files).** Added PGlite devDependency for real migration testing.

## Per-order fulfillment-cost module (new)
- **Research:** `FulfillmentResearch` agent running → `docs/research/per-order-fulfillment-costing.md`.
- **DB layer ✅ DONE & TESTED.** 7 additive tables: `fulfillment_materials` (catalog, auto unit-cost), `packaging_profiles` + `packaging_profile_items`, `order_fulfillment_snapshots` (immutable header, unique idempotency key + unique (order,event) → no duplicate confirmation), `order_fulfillment_lines` (immutable snapshot lines), `packaging_purchases` (batch/inventory, no valuation policy activated), `fulfillment_adjustments` (auditable corrections/reversals). All money NULLABLE (NULL=unknown, never 0); guarded CHECK constraints (status/event/non-negative), NOT VALID. Migration `add_fulfillment_costing.sql` (+rollback), mirrored in `shared/schema.ts` (Drizzle + types). Proven with PGlite: `fulfillment-migration.test.ts` (6) — create/idempotent-reapply/NULL-cost/duplicate-confirmation-blocked/constraints/rollback+reapply.
- **Research ✅** (`per-order-fulfillment-costing.md`) — validates the model as lightweight standard costing + historical-cost snapshot; NULL-not-0 = #1 fix; keep packaging separate but retrievable (accountant may reclassify primary packaging into COGS); make suggested profile 1-tap ~95%; variance capture opt-in for exceptions.
- **Engine integration ✅ DONE & TESTED.** `buildFulfillmentResolver(db, orderIds)` (reads IMMUTABLE `order_fulfillment_lines`; unknown line → order fulfillment NULL, never 0); `calcOrderProfit(order, costs, fulfillment?)` adds `fulfillmentCost/fulfillmentStatus` (SEPARATE from product COGS) + layered NULL-propagating `grossMerchandiseProfit/contributionProfit/contributionMargin` (ads/overhead NEVER allocated); `computeOrderProfitability(db, order)` convenience. Admin GET /orders wired to pass the fulfillment resolver. `fulfillment-engine.test.ts` (5): exact→contribution exact; no snapshot→contribution NULL; incomplete→NULL; unknown product cost→NULL; JSON preserves null-vs-number. **255 tests pass.**
- **Next waves (non-overlapping ownership):** backend service+APIs (catalog CRUD, profile CRUD, order fulfillment CONFIRMATION with idempotency + stock-deduct-once, variance, reporting, purchases), admin UX (catalog / profiles / fast confirmation screen / profitability drill-down, light+dark, Arabic labels), independent verifier + remaining scenario tests (auto-suggest, manual adjustment, stock double-deduction, returns/reshipment events, variance report).

## Consolidation (one-system) progress
- **Engine extracted ✅** — `server/services/accounting-engine.ts` (the ONLY money-computing module); `accounting.ts` 3197→2417 (router only, imports engine). 228 tests pass (independently verified).
- **NULL-not-zero correction ✅ (owner-mandated)** — missing cost = NULL/`unknown`/`estimated` with source+confidence, never 0. Applied to engine (`costKnown`, `costStatus`, honors frozen unknown), `order-storage.ts` (stores NULL + status), `shared/schema.ts` (nullable cols + `cost_snapshot_status/source/confidence/version/at`), migration + backfill + rollback, tests, `canonical-model.md` + `owner-decisions.md`. 228 tests pass.
- **Research (3 docs) ✅**, **Legacy inventory ✅** (`legacy-accounting-inventory.md` — 5 divergent revenue defs, 2 dup P&L engines, 3 dup MCP tool sets), **Canonical model ✅** (`canonical-model.md`, engine API + 12 decisions), **consolidation-plan.md ✅**.
- **Browser baseline ✅** (`live-admin-browser-baseline.md`) — Playwright/Chromium working; admin properly auth-gated (client redirect + server 401 on all admin/finance APIs). Authenticated audit BLOCKED (no prod creds). **SECURITY:** repo has default seed cred `admin@fishweb.com/admin123` (e2e/admin.spec.ts) — owner must confirm it does NOT authenticate on prod (critical default-cred vuln if it does).
- **Decision package ✅** (`owner-decision-package.md`) — A–L, 12 fields each, IQD examples; soonest = A,J,K,I,H(accountant); can-wait = C,D,E,F,G; safe = B,L.
- **Redirect wave 1 ✅ DONE & TESTED (228 pass):** `ai-dashboard.ts` (daily/quick/weekly revenue → `computePeriodFinancials`, realized delivered-only) + `admin.ts` GET /orders (per-order profit → `calcOrderProfit`; adds `costStatus/costsComplete/estimatedCostLines`; cost shown NULL when unknown). No inline money formula remains in either. (`RedirectWave1` agent died on a usage limit after ai-dashboard; coordinator completed admin.ts.)
- **Security hardening ✅:** default plaintext admin passwords scrubbed from `start.sh` + `start-windows.ps1`.
- **Remaining redirects (coordinator, next):** `groqFinanceAudit.ts` (dup P&L), `analytics.ts` top-products, `mcp.ts` (align) + 2 `aquavo-mcp*.ts` (delete — gated).
- **Browser authenticated audit BLOCKED by permission classifier** (auto-mode denied automated prod login) — needs owner to run the prepared read-only script via `! <cmd>` or grant a Bash rule. Not bypassing (safety control).
- **Next:** redirect divergent consumers → engine (ai-dashboard, admin GET/orders, groqFinanceAudit, analytics top-products, mcp). Deletion gated behind writable-Neon shadow + browser regression.

## Owner decisions pending (Stage C gate)
Inventory valuation method · historical cost-backfill method · landed-cost allocation · delivery-revenue treatment · affiliate commission timing · ad-cost attribution · overhead allocation · tax rates/treatment · period-locking policy · destructive corrections · VAT-status confirmation.
