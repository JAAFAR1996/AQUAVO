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
| NeonForensics (Agent 4) | Live production read-only DB audit | ✅ done | docs/audit/neon-forensics.md | 12-order relational gap: **root cause identified 2026-07-23** (`orders.source='website'`); **coverage gap remains unrepaired** — repair pending child-branch backfill verification and owner approval; financially_counted unused |
| NeonPhase0 (lead) | Neon child-branch verification, Phase 0 read-only | ⛔ blocked (MCP read-only) | docs/audit/neon-child-branch-baseline.md, neon-verification-final.md | needs Neon OAuth re-consent with write scope |
| BrowserBaseline (Agent 1) | Live admin browser baseline | ⛔ blocked | docs/audit/browser-baseline.md | needs admin URL + credentials from owner |

## Cross-agent CONVERGENT findings (multiple independent agents agree)
1. **No COGS cost snapshot at sale** — RepoForensics #3 + CommerceFlow #5 + SchemaMap gap 1. Historical profit silently recomputed at current cost. → Stage B fix (immutable snapshot) + Stage C (landed cost per research).
2. **Two revenue definitions / analytics has NO status filter** — RepoForensics #1. Cancelled/pending counted as revenue. → Stage B canonical source.
3. **Two line-item stores (orders.items JSONB vs order_items_relational), no backfill** — RepoForensics #2 + SchemaMap + CommerceFlow #6. → Stage B reconciliation. **UPDATED 2026-07-23 (read-only reconciliation, `neon-child-branch-baseline.md` §6):** the two stores **agree exactly** where both exist — 97/97 comparison groups match on line count, quantity and price; 0 orphans. This is a **coverage gap, not a divergence defect**. Coverage is 25/37 orders; the 12 misses are all `source='website'` in a contiguous 2026-05-12→2026-06-17 window (storefront path stopped writing relational lines; fixed ~2026-06-22; admin/WhatsApp path 19/19 covered). The backfill has **never run and currently cannot** — it writes 6 cost-snapshot columns absent from the live 7-column table, and 0/100 rows carry its `backfilled` marker; prerequisite `add_order_item_cost_snapshot.sql` is unapplied.
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
- **Structural corrections (round 3) ✅ DONE & TESTED (258).** cost-component boundary (`shared/cost-components.ts` — product COGS vs AQUAVO fulfillment disjoint, no double count, +test); MULTI-event model (`order_fulfillment_events`, unique idempotency key only — many reshipments/returns allowed); resolver sums ALL confirmed non-reversed events with per-type breakdown (original/reshipment/return/replacement/adjustment/reversed/total); `workflow_state` separate from `cost_status`; immutable `packaging_inventory_movements` ledger (unique idem key → no double stock deduct); deduplicated purchasing (catalog=identity+standard-cost ref, purchases=batches). Migration rewritten + PGlite-proven (7 tests: multi-event allowed, dup-idem blocked, movement-double-deduct blocked).
- **Backend confirmation service ✅ (core) DONE & TESTED (pure logic, 8).** `server/services/fulfillment-service.ts`: `freezeLine`/`summarizeLines`/`computeVariance`/`fulfillmentIdempotencyKey` (NULL-not-0, verified-zero=0, variance null-propagating); transactional `confirmFulfillment` (idempotent — retry returns existing event, no double cost/stock) + `reverseFulfillmentEvent` (reversing movements, original immutable). **266 tests pass.**
- **Domain enforcement + REAL transactional tests ✅ (items 1,2,3,4,8):** service is DB-INJECTABLE; `fulfillment-service-integration.test.ts` runs the actual service over real Postgres (Drizzle+PGlite) — confirm creates event+lines+usage movements; idempotent retry (no double cost/stock); **one active original enforced** (partial unique index + service check); two reshipments allowed; **insufficient-stock rolls back with NO partial rows**; reverse posts reversing movements + marks original reversed; **immutability triggers block direct UPDATE/DELETE** on lines/movements + freeze confirmed event financials. Sequence unique `(order_id, sequence_number)` + safe assignment. Movement-direction CHECK. Migration + rollback updated (triggers/functions/indexes). 273 tests pass.
- **Committed:** `ff90377` engine, `a6624fc` security, `847f7a1` docs, `eee8837` service (branch `feat/accounting-canonical-fulfillment`).
- **Still TODO (non-gated):** profile family/versioning (item 5), draft/suggestion state separate from confirmed (item 6), manual quick-entry named lines (item 7), catalog current-cost↔approved-purchase sync (item 9), backend admin APIs (item 10), admin UX (item 11 — frontend delegate), finish remaining consolidation redirects (item 12: groqFinanceAudit, analytics top-products, mcp). Then writable-Neon gate for final compatibility/shadow.
- **Remaining (next waves):** catalog/profile CRUD + suggestion + per-order total-cost API (item 9) + confirm route (item 10 manual mode) — engine `computeOrderProfitability` ready; **admin UX** (item 11 — frontend, delegate); DB-integration test of `confirmFulfillment` on a **Neon branch** (item 12 — PGlite proved the constraints; service orchestration needs the branch); independent verifier.

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

## Neon Phase 0 — corrections & new findings (2026-07-23)
- **RETRACTED (self-correction):** an interim Phase 0 report claimed `order_items` was absent and that all 37 orders were JSONB-only with "no relational side." **Wrong** — caused by an exact-name filter (`table_name='order_items'`) that cannot match `order_items_relational`. `neon-forensics.md` (2026-07-21) was correct; counts are identical two days apart (100 rows / 25 orders). No production data changed. Retained in place, not silently replaced (`neon-verification-final.md` §5).
- **ROOT CAUSE IDENTIFIED (gap NOT repaired) — 12-order relational gap:** `orders.source` discriminates cleanly. `whatsapp` 19/19 covered; `website` 6/18, with all 12 misses in a contiguous 2026-05-12→2026-06-17 window. Storefront checkout stopped writing relational lines in that window; fixed ~2026-06-22.
- **NEW — backfill is inoperable:** `backfill_orderitems_from_jsonb.sql` targets 6 cost-snapshot columns that don't exist on the live table; would abort. 0/100 rows carry its `backfilled` marker → never run. **Blocks repair of the 12-order gap.** Prerequisite `add_order_item_cost_snapshot.sql` is unapplied and is NOT in the authorized 2-migration set — owner decision needed.
- **NEW (security) — MCP runs as `neondb_owner`:** read-only is enforced at the MCP layer only, not by DB privileges. Granting write scope grants owner-level production write. → H3 in `neon-verification-final.md` §7b.
- **NEW (security) — production branch `protected: false`, `allowed_ips: []`.** → H1/H2. H1 is a single toggle and removes the main hazard of holding write scope.
- **Migration integrity ✅** — `add_fulfillment_costing.sql` (`ea34a32f…9901d1`) and `add_fulfillment_hardening.sql` (`5a7f4363…547f47`) recomputed full SHA-256, exact match vs `neon-migration-review.md`. Rollback file hashes recorded.
- **BLOCKED:** Neon MCP is read-only; `create_branch`, write `run_sql`/`run_sql_transaction`, `get_connection_string` unavailable. Needs Neon **OAuth re-consent with full access** (preferred over hand-editing the `readonly` URL param). No branch created; no write issued anywhere.

## Storefront dual-write regression — CODE-VERIFIED (2026-07-23)
- **Correcting commit found:** `f1b85d4` (2026-06-19) `fix(orders): persist line items into order_items_relational on every order` — `server/storage/order-storage.ts` → `createOrderSecure()` block 6b, +18 lines. Commit body independently states "only ~half of orders had relational rows", matching the measured 25/37. **No longer a data-derived hypothesis — data and code agree.**
- **Shipped with NO test.** Regression guard added: `server/__tests__/order-creation-dual-write.test.ts` (9 tests) — both live paths must write both stores via `tx`.
- **NEW LATENT HAZARD — `order-storage.ts` `createOrder()`:** bare `db.insert(orders)`, no transaction, **no relational write** — the identical bug, still present. Unrouted today (routes use `createOrderSecure`), but on the storage interface. Guarded by the new test.
- **NEW — `auto-order-processor.ts` is dead and broken:** inserts `totalAmount`/`priceAtTime`/`shippingMethod` (none exist in schema), writes no `orders.items`, uses `db.insert` outside any transaction. Processing loop unreferenced → dead code, not a live defect. Must be fixed before any revival.
- **NEW DEPLOYMENT HAZARD:** current branch `createOrderSecure` writes `unit_cost_price` + 5 sibling columns (added `ff90377`, 2026-07-22) that **production does not have**. Deploying this branch before `add_order_item_cost_snapshot.sql` breaks ALL order creation. Order: **migrate #1 → then deploy.**

## Migration set expanded to FOUR operations — locally verified, NOT run on Neon (2026-07-23)
- Forward: `add_order_item_cost_snapshot.sql` (`e507bce4…b3b0ed`) → **rewritten** `backfill_orderitems_from_jsonb.sql` (`7586b078…14bf1e`) → `add_fulfillment_costing.sql` (`ea34a32f…9901d1`) → `add_fulfillment_hardening.sql` (`5a7f4363…547f47`).
- Rollback (exact reverse, backfill-batch rollback BEFORE dropping snapshot columns): hardening → costing → backfill-batch → snapshot.
- **Old backfill REJECTED and rewritten** — it (a) INSERTed 6 nonexistent columns so it aborted instantly and had never run, (b) skipped an entire order if it had ANY relational row so partial orders could never be completed, (c) used a global `metadata.backfilled=true` rollback selector that would reverse every batch ever run. New version: hard prerequisite guard, line-by-line reconciliation via `(order,product,qty,price,dup_rank)`, deterministic fingerprint, `orderitem_backfill_batches` audit table, batch-scoped rollback, transactional, cost always NULL/unknown (never 0, never today's cost).
- **Local evidence:** `server/__tests__/orderitem-backfill-migration.test.ts` — 20 tests on a PGlite fixture reproducing the exact live topology (37/173/100/25/12, repeated product lines, 7-column pre-migration shape) + an **independent TS reconciler** that reuses no migration SQL. Full suite **432/432 pass**.
- **Production unchanged:** 12-order coverage gap **remains unrepaired**; snapshot migration **not applied**; no Neon branch created; no write issued.

## Blocker corrections before OAuth request (2026-07-23, rev. 3) — commits 565bc0c · cc8a0e7 · d2a3973 · 4b7bfc6
- **Transaction ownership standardized** — the backfill files managed their own BEGIN/COMMIT, which under an executor that also wraps the file would nest (PostgreSQL has no true nested transactions: an inner COMMIT ends the OUTER transaction, so later statements run unprotected and rollback evidence lies). All transaction control removed from all 9 reviewed files; executor owns the transaction; parameters passed via `SET LOCAL`. Static guard: `migration-transaction-contract.test.ts` (11 tests, with negative + false-positive controls; dollar-quoted PL/pgSQL bodies stripped so `DO $$ BEGIN..END $$` isn't a false hit).
- **NO FABRICATED COMMERCIAL EVIDENCE** — old backfill defaulted missing quantity→1 and missing price→**0**, i.e. it would have invented zero-price sales. Now a line is insertable only when product resolves, quantity is a positive integer, price is present and non-negative, and any supplied total equals qty×price. 8 reason codes (`missing_product_id`, `missing_product`, `invalid_quantity`, `missing_price`, `invalid_price`, `invalid_total`, `total_mismatch`, `malformed_jsonb_line`). **Fails closed**; owner override still never inserts bad lines and records `reconciliation_complete=false`.
- **Canonical line identity now includes variant** — `(order, product, variant_key, qty, price, total, occurrence)`; `variant_key` = variantId → lower(trim(variantLabel)) → `~none~`. Duplicate groups where JSONB holds multiple variants and an existing row has no variant metadata are classified **AMBIGUOUS** and skipped, never silently paired. Report surfaces exact matches / missing / surplus / ambiguous / metadata disagreements.
- **Rollback requires an EXPLICIT batch uuid** — implicit "latest" removed (it can change between preview and execution). Validates existence, completion, not-already-rolled-back, selected-count == recorded-count, and no app-created row selected; re-verifies deleted count in-transaction and aborts on mismatch.
- **Control-table rollback contract resolved** — MODE A (child branch) drops `orderitem_backfill_batches` for a true full object-set rollback, only when no un-rolled-back batch remains; MODE B (default, production) retains it as audit trail and is documented as "complete except for the retained audit table". Both tested.
- **Unsafe order paths DISABLED, not just unrouted** — `storage.createOrder()` now throws (was a bare non-transactional insert with no relational write, the exact 12-order-gap shape) and is `@deprecated` on the interface; `AutoOrderProcessor.processScheduledOrders()` is QUARANTINED behind a hard throw (referenced nonexistent columns, wrote no `orders.items`, non-transactional). Repo-wide guards assert nothing routes or schedules either.
- **Deployment compatibility guard added** — `server/services/schema-readiness.ts` + `GET /ready` (503 naming missing columns) + order-route guard (503 `SCHEMA_NOT_READY`). Prevents the new app accepting traffic before migration #1 and failing one real customer order at a time. Full deployment matrix in `pre-neon-readiness.md`.
- **Pre-existing typecheck error FIXED** — `products.tsx` used `p.imageUrls` (nonexistent; field is `images`), from `81024b5`. It silently emitted `image: undefined` on every products-page JSON-LD ItemList entry — a real SEO defect. `npm run check` now clean.
- **COMPLETE local verification (reported separately, not as one number):** server **490** · client **688** · **total 1,178 passed / 0 failed** (103 files) · repo typecheck **clean** · accounting + route typechecks clean · production build green · credential scan clean. **NOT RUN (branch-gated by design):** `verify:fulfillment` (correctly refuses without `DATABASE_URL`) and Playwright fulfillment workflow (needs live app).
- **Committed hashes frozen** (working tree == committed blobs, all 9 verified): snapshot `e507bce4…b3b0ed` · backfill `8225c602…5a0f62` · costing `ea34a32f…9901d1` · hardening `5a7f4363…547f47` · report `874f5d8e…5f0c25` · rollbacks `8a7d9734…c510b4`, `80fb2b54…f291296`, `23503c3e…83cf7dd1`, `8811d78c…15dd1ae4`.
- **Production still untouched:** 12-order coverage gap **remains unrepaired**; snapshot migration **not applied**; no Neon branch created; no write issued; no production setting changed.

## Multi-agent verification run — 2026-07-23 rev. 4 — **FAIL / BLOCKED**
- **BLOCKING DEFECT (new, highest severity): production triggers on `order_items_relational` break operation #2.** Discovered by the coordinator while re-validating an agent's baseline. Three triggers now exist on that table that did NOT exist when the backfill was designed and PGlite-tested.
  - **Rollback is IMPOSSIBLE:** `order_items_guard_order_detach` (BEFORE DELETE) raises for any audited order. **12 of 12 gap orders are not hard-deletable → 0 backfilled rows could ever be deleted.** The "batch-specific, fully reversible" property reported as verified does NOT hold on production; operation #2 would be a one-way door.
  - **Inventory side effects:** `order_items_record_inventory_sale` (AFTER INSERT) is LIVE (`settings.inventory_ledger_mode='enforce'`, MAIN location configured). The 73 backfilled rows would write 73 `sale` movements across 44 products / 187 units, while the 100 pre-existing rows have **0** such movements → internally inconsistent ledger. **7 products would go negative** and a negative-balance guard is active → the transaction most likely hard-aborts.
  - **Root cause of the miss:** the PGlite fixture reproduced production's table shape and data but **not its triggers**. Local verification was necessary and NOT sufficient — concrete justification for the child-branch gate.
  - Migration files deliberately **NOT modified** (per conflict-prevention rule); the fix changes inventory semantics and is an owner decision.
- **PRODUCTION SCHEMA IS DRIFTING MID-VERIFICATION** (concurrent workstream): between 02:49 and 07:00 today, constraints 528→529, user triggers 29→32, functions 178→181; tables and fingerprint `88b839d9…` unchanged. Any baseline must be re-taken immediately before execution.
- **`BRANCH_ENV_MISSING`** — coordinator-confirmed: `NEON_VERIFY_DATABASE_URL` / `NEON_ROLLBACK_DATABASE_URL` absent from environment and all 5 `.env*` files; and of 19 branches in `shiny-tree-43710630`, **neither planned child branch exists**. Agents 3–6 were therefore NOT launched — they had no database target, and launching them would have produced evidence-free reports.
- **Test totals reconciled (Agent 1, coordinator-verified arithmetic):** broadest command `npx vitest run` = **105 files / 1386 tests**. The old 1299 and recent 1178 both had scope errors: 1178 omitted `test/` + `scripts/` (208 tests) by path-scoping to server+client; 1299 predated 87 new tests added in `565bc0c`/`cc8a0e7`/`d2a3973`. **1299 + 87 − 208 = 1178** exactly. Authoritative figure is **1386**.
- **NEW (config bug, unrelated to the gap):** `shared/__tests__/schema.test.ts` (31 tests, tracked since the initial commit) is discovered by **no** vitest command — `vitest.config.ts` has no `shared/**` include glob. Real coverage hole.
- **Agent claim CORRECTED by coordinator (do not propagate):** Agent 1 reported "195 tracked files contain a live-looking Neon connection string with a real password segment." **False.** All 195 are the already-redacted placeholder `neondb_owner:REDACTED_ROTATE_ME@` (18-char literal); the one remaining hit is `postgresql://user:password@` in `docs/START_HERE.md`. Zero `npg_`, `AKIA…`, or `sk-…` secrets are tracked. No live credential is committed.
- **Agent claim CORRECTED by coordinator:** Agent 2's baseline reported 1761 constraints / 50 triggers / 180 functions. Coordinator re-query gives **529 public constraints (643 all schemas), 32 public user triggers (620 incl. internal), 181 functions** — the agent's figures reproduce under no scoping I can construct. Use the coordinator numbers.
- **Production untouched:** no write, no DDL, no branch created, no setting changed; 12-order gap still unrepaired; all 9 migration files still match committed blobs; no secret printed, logged or committed.

## Rev. 5 — trigger-safety remediation, four independent agents (2026-07-23) — **PASS for child branches**
- **GOVERNANCE FINDING (new, high): production is being changed outside version control.** Ten trigger/function objects on `order_items_relational` / `inventory_movements` appear in NO committed migration; `git log -S` finds zero occurrences for six of them in the entire tracked history. This is the direct root cause of the near-miss and will keep producing them until the process changes.
- **Fatal defects from rev. 4 are now addressed** by `migrations/add_orderitem_backfill_trigger_safety.sql` (`ee96e878…c7cb89`) + rollback (`7a969e6f…3e003a`): `CREATE OR REPLACE` of both live functions preserving original behaviour, plus two six-condition exceptions. Inventory suppression needs session GUC + row batch id + exact match + batch row exists + approved source/migration + `finished_at IS NULL` (this transaction only). Delete authorization additionally needs a separate `backfill_rollback_authorized` GUC + backfill metadata key + batch complete-and-not-rolled-back. **No `DISABLE TRIGGER`, no `session_replication_role`, no role-wide or permanent bypass, no "latest batch", metadata never trusted alone.** Application rows are unreachable by construction. Suppressions logged to a dedicated audit table the rollback drops; rollback restores both functions to hash-identical originals. 22 tests cover all 10 required proofs.
- **Backfill contract changed:** the executor now mints the batch UUID and supplies it via `SET LOCAL aquavo.backfill_batch_id` BEFORE the file runs — the trigger must see the GUC before the INSERT fires it, which internal `gen_random_uuid()` made impossible. Migration refuses a reused id and fails closed if the GUC is absent. Rollback additionally requires `SET LOCAL aquavo.backfill_rollback_authorized='on'`.
- **Sequence is now FIVE forward operations:** cost-snapshot → **trigger-safety** → backfill → fulfillment-costing → fulfillment-hardening. **Reverse rollback (six steps):** hardening → costing → **backfill-batch → trigger-safety** → snapshot → optional audit-table cleanup. Backfill rollback MUST precede trigger-safety rollback — the exception is what authorizes deleting those audited-order rows; remove it first and every backfilled row becomes permanently undeletable.
- **Test discovery bug fixed:** `vitest.config.ts` had no `shared/**` glob, so `shared/__tests__/schema.test.ts` (31 tests, tracked since the initial commit) ran nowhere. Authoritative total now **107 files / 1446 tests, all passing** (1417 + 22 + 5 + 2, reconciles exactly). Repo typecheck clean, accounting typechecks clean, build green.
- **Flakiness fixed honestly:** PGlite first-instantiation exceeded the 30 s global timeout under full parallel load (33–43 s observed); timeouts raised in the two backfill suites. A separate occasional client page-test timing flake remains unaddressed.
- **Prior agent claim corrected again:** credential scan re-verified — 0 LIVE secrets. 196 hits are the redacted literal `REDACTED_ROTATE_ME`; 17 are generic template strings in docs/`.env.example`.
- **STILL UNPROVEN (requires the child branch):** the trigger-safety design has only ever run against a PGlite reconstruction — **never against real production triggers**. Also unproven: real multi-connection concurrency, services against a branch, Playwright, accounting shadow comparison.
- **Production untouched:** no write, no DDL, no branch created, no setting changed; 12-order gap still unrepaired; `production` still `protected: false`.

---

## Wave 6 — Neon child-branch execution (2026-07-23, coordinator-verified)

Gate 0 passed (`BRANCH_IDENTITY_PASS`); four independent agents executed; every result
independently re-verified by the coordinator against the live branches. Decision and full
evidence: `docs/audit/neon-verification-final.md` §12.

| Agent | Scope | Status | Evidence file |
|---|---|---|---|
| Coordinator | Gate 0 branch identity + migration hashes | ✅ PASS | docs/audit/neon-child-branches-identity.md |
| VerifyMigrationAgent | 5 operations, trigger safety, backfill | ✅ PASS | docs/audit/neon-migration-execution.md, neon-backfill-verification.md |
| ConcurrencyServiceAgent | 11 concurrency/race tests | ✅ 11/11 PASS | docs/audit/neon-concurrency-verification.md |
| ApplicationShadowAgent | App on branch + accounting shadow | ⚠️ 25 PASS / 3 FAIL / 2 PARTIAL | docs/audit/neon-shadow-comparison.md |
| ApplicationShadowAgent | Playwright certification | ❌ **NOT CERTIFIED** | docs/audit/neon-playwright-verification.md |
| RollbackBranchAgent | Rollback + reapply | ✅ PASS | docs/audit/neon-rollback-verification.md |

**Resolves the long-standing convergent finding #3** (two line-item stores, no backfill):
the coverage gap is now proven repairable. 73 deterministic missing lines were backfilled
with **zero inventory movements created** (185 -> 185), stock checksum unchanged, all
backfilled costs **NULL, never zero**, and the whole operation proven reversible to an
exact schema fingerprint match.

### New findings to action

| ID | Sev | Finding | Consequence |
|---|---|---|---|
| **N-2** | **HIGH** | `server/env.ts` calls `dotenv.config({override:true})`; the committed `.env` beats an inherited `DATABASE_URL`, and `tsx` re-execs so a parent-only preload is not inherited. | Environment-based branch targeting **silently fails to production**. Caused a real near-miss this session (read-only probes only; no write reached production). Fix before further branch-targeted testing. |
| **F-1** | **HIGH** | `lockProductForUpdate()` never SELECTs `cost_price`/`packaging_cost`/`insert_cost`, so `createOrderSecure` freezes `costStatus:"unknown"`; `lineCostSnapshot()` honours an explicit unknown and will not fall back. | **Every new storefront order line is permanently uncostable.** |
| **F-2** | **HIGH** | The admin/WhatsApp order path writes no cost snapshot at all. | The two order-creation paths disagree on a core invariant. |
| **F-3** | MED | The accounting engine reads `orders.items` JSONB, never `order_items_relational`. | The 73 backfilled NULL costs surface as **`estimated`** (today's cost substituted), not `unknown`. Never zero, never exact — but the unknown signal is lost. |
| **F-4** | MED | `pim_idempotency_uidx` lacks a per-line component. | The same material on two lines of one event fails to insert. |
| **F-5** | MED | No product can express an unknown cost: 0 NULLs, but 30 zero `cost_price` and 143 zero packaging/insert. | Zero is overloaded to mean "unknown", defeating the NULL-not-zero rule at source. |
| **N-1** | MED | Backfill re-run aborts on the ambiguity gate instead of exiting cleanly (independently reproduced on a second branch; zero rows written). | Safe direction, but the operator must **not** reflexively set the override GUC. Runbook item. |

### Accounting shadow comparison — reconciles exactly

Over 34 clean orders: legacy 984,377 − canonical 967,574 = **16,803**, fully attributed to
1,965 revenue + 9,238 COGS + 5,600 box cost. **No unexplained residue.** The material
difference is behavioural: canonical returns `contributionProfit = null` for all 34 orders
(fulfillment cost unknown) where legacy reports a confident number. On the only three
orders with real fulfillment data, legacy **overstates margin by 16–31 points**.

Honest negative: the expected "legacy treats unknown as 0" effect measured **zero** here,
because no product currently has a NULL cost (see F-5). Reported as latent, not claimed.

### Branch disposition

Neither child branch may be promoted. Both carry synthetic rows that `ofl_immutable`,
`pim_immutable`, `ofe_guard_confirmed` and `order_is_hard_deletable` correctly refuse to
delete — 15 events / 14 lines / 16 packaging movements on 3 pre-existing orders (100%
`CONCTEST`-tagged) and 16 `SHADOW-*` orders. No guard was forced. The protected accounting
canon (100 original + 73 backfilled lines) was verified intact.

---

## Wave 7 — Remediation cycle (2026-07-23, coordinator-verified)

Four independent agents with disjoint file ownership. No agent edited another's files;
no conflicts required central resolution. Every claim below was independently re-verified
by the coordinator.

### Closed this cycle

| ID | Was | Now | Coordinator's independent proof |
|---|---|---|---|
| **N-2** | HIGH — `.env` silently overrode an explicit `DATABASE_URL`, sending the app to production | **CLOSED** | Ran a real `tsx` child with a `.env` pointing at the production endpoint and an inherited `DATABASE_URL` pointing at the child branch. Resolved to `ep-rapid-breeze-a46glg7f` (child), while non-DB keys still honoured `.env`. New canonical resolver `server/db-target.ts`. |
| **F-1** | HIGH — storefront lines permanently uncostable | **CLOSED** | `lockProductForUpdate()` never SELECTed the three cost columns, so `costStatus` froze at `unknown`. Now one canonical `lockProductRowForUpdate()` + `buildProductCostSnapshot()`; verified both cost columns and `FOR UPDATE` present. |
| **F-2** | HIGH — admin/WhatsApp wrote no snapshot at all | **CLOSED** | `createOrderFromInvoice()` now locks each product through the same canonical builder inside the existing transaction. Verified both `order-storage.ts` and `invoice-storage.ts` import and use the identical builder. |
| **F-3** | MED — engine read JSONB only, so backfilled NULLs surfaced as `estimated` | **CLOSED** | Relational store is now authoritative when it reconciles with JSONB; disagreement degrades to `incomplete`, never merges. Canonical product COGS falls by exactly 163,640 IQD — the substituted cost that was never evidence. |
| **F-4** | MED — PIM idempotency key lacked per-line identity | **CLOSED** | Collision reproduced on real PostgreSQL. Fix adds `line_id` + partial `pim_line_uidx`; `pim_idempotency_uidx` untouched in both directions, so duplicate protection is unchanged and the new index is strictly stronger. Both indexes verified present on the branch. |
| **F-5** | MED — products could not express unknown cost separately from verified zero | **CLOSED** | `*_resolution` columns added. Verified on real data: **113 `known`, 30 `unresolved`, 0 invented `verified_zero`** — every ambiguous zero stayed explicitly unresolved, exactly as required. |

### Newly found — all OPEN, none owned by this cycle's agents

| ID | Sev | Finding | Evidence |
|---|---|---|---|
| **F-6** | **HIGH** | `products.stock` and `inventory_canonical_balances` diverge, so products advertised as in stock fail checkout with HTTP 500 `insufficient canonical inventory balance`. **Live revenue defect.** | Coordinator-verified at DB level: **27 of 129** advertised-in-stock products have canonical balance ≤ 0. Agent 4 measured 29/102 through `GET /api/products`; denominators differ because the API applies its own product filter. Both confirm the defect. |
| **F-7** | **HIGH** | On a 393 px viewport the admin **الطلبات** tab cannot be activated — 45 s of clicks, `المنتجات` stays selected; instant on desktop. Admins on phones cannot reach orders or fulfillment. | Playwright, Pixel 5 project; screenshot shows the tab rendered and unobstructed. |
| **F-8** | **HIGH** | `blocked_ips.expires_at` is read back with a +03:00 skew, so expired IP blocks never lift — a 5-minute lockout becomes **permanent**. | A row expiring `09:54Z` was served as `expiresAt: 12:54Z`; it produced a real 429 that broke a test run. |
| **F-9** | MED | `e2e/fulfillment-admin.spec.ts` drives `/admin/orders/:id`, **a route that does not exist** — that UI test could never have passed. | Route absent; spec left untouched for the owner. |
| **RC-1** | MED | `server/vite.ts` sets `customLogger.error = msg => { …; process.exit(1) }`, so **any** Vite-level error kills the whole Express process. Root cause of every prior Playwright collapse. **Owned by no one** — it sat outside every agent's declared ownership, which is why it survived this long. | Captured verbatim: `WebSocket server error: Port 24678 is already in use` → `SERVER PROCESS EXITED code=1`. Neutralised externally for E2E; the durable fix is removing the `process.exit(1)`. |
| **T-1** | LOW | `server/storage/invoice-storage.ts:270` has a pre-existing type error (`shippingAddress` string vs object). **Not a regression** — byte-identical to `HEAD` (md5 match); surfaced only because `server/` was typechecked for the first time, since `tsconfig.json` excludes `server/**`. | Coordinator diff vs `HEAD`. |

### Deployment ordering — mandatory

`migrations/add_product_cost_resolution.sql` and `migrations/add_pim_line_identity.sql`
**must be applied before** the accounting/product code is deployed, because Drizzle emits
explicit column lists and will fail against the old schema. Both were applied to the
verification branch by the coordinator (exit 0) and are additive and reversible.

### Still open from earlier waves

- Operator's local `.env` still defaults to production. The invariant is fixed — an explicit
  variable always wins — but with nothing inherited, `.env` decides. Operator's file to change.
- ~176 ad-hoc scripts read `DATABASE_URL` raw with no classification; several are destructive.
- `numeric DEFAULT '0'` on product cost columns still mints new ambiguous zeros.
- Both existing child branches remain **test-contaminated and unpromotable**.
