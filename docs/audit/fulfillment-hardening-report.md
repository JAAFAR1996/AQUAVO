# Fulfillment hardening — what changed and how it is proved

Status: **local work complete; nothing applied to Neon or production.**
Branch: `feat/accounting-canonical-fulfillment`.

This document records the corrections made to the accepted transactional
foundation, the evidence for each, and what remains before writable Neon is
requested.

---

## 1. Event sequencing is now genuine ALLOCATION

**The problem with the previous design.** `MAX(sequence_number) + 1` plus a unique
index is *collision detection*, not safe allocation. Two concurrent requests for
the same order read the same `MAX`, compute the same number, and one of them is
rejected by the unique index — even though it is a legitimately different request,
not a duplicate. That is a correctness bug, not a race that "retries away": the
caller sees a spurious conflict for work that should have succeeded.

**What replaces it.**

| Mechanism | Purpose |
|---|---|
| `pg_advisory_xact_lock(hashtext(order_id))` | Serializes the per-order critical section (one-active-original check + stock guard). Transaction-scoped, so it is released on COMMIT/ROLLBACK. Keyed on the order — unrelated orders never contend. |
| `order_fulfillment_sequences` counter row | The number itself is *allocated* by a single atomic `INSERT … ON CONFLICT (order_id) DO UPDATE SET next_sequence = next_sequence + 1 RETURNING next_sequence - 1`. That statement takes a ROW lock on exactly one order's counter. |
| `withBoundedRetry` (max 3) | Retries **only** SQLSTATE `40001` (serialization failure), `40P01` (deadlock) and `23505` (unique violation). Business errors — insufficient stock, already reversed, draft consumed — are never retried. |
| Unique `(order_id, sequence_number)` | Retained as a **backstop against out-of-band writes**. It is explicitly *not* the allocator. |

**Guarantees delivered.** Distinct concurrent requests both succeed with different
numbers; duplicate idempotency requests return the existing event; no global lock
across unrelated orders; deterministic chronology; bounded retry only for genuine
conflicts.

**Tests** — `server/__tests__/fulfillment-concurrency.test.ts` (7):
two different reshipments for the same order both succeed with distinct sequences;
three duplicate requests with the same idempotency key collapse to one event with
stock deducted once; two different orders in flight together both succeed; one
order's traffic does not advance another's counter; chronology is ordered and
unique; a business error is not retried.

**Honest limitation.** PGlite is a single-connection Postgres and serializes
statements, so these tests prove the *allocation semantics* (distinct numbers, no
false duplicate-rejection, correct idempotent collapse) but cannot reproduce a true
parallel race. The property that makes the semantics hold under a real
multi-connection Postgres is that allocation is a single atomic statement holding a
row lock, which the tests also pin directly. A real-concurrency test belongs in the
Neon child-branch phase.

---

## 2. Strong database typing restored

`type Db = any` is gone. `server/services/fulfillment-db.ts` defines:

- `FulfillmentDb` = `PgDatabase<PgQueryResultHKT, typeof schema, ExtractTablesWithRelations<...>>`
- `FulfillmentTx` = the transaction handle
- `FulfillmentExecutor` = either, so services accept both
- Concrete row aliases for events, lines, movements, materials, purchases, cost
  records, profile families/versions/items, drafts and draft lines.

Both drivers satisfy the one contract — production `NeonDatabase<typeof schema>`
and test `PgliteDatabase<typeof schema>`.

**Type tests** — `server/services/fulfillment-types.test-d.ts` asserts, at compile
time, that the contract is not `any` (via `0 extends 1 & T`), that both drivers
extend it, that every domain row type is concrete, that money fields are nullable
(NULL = unknown), that API payload types are not `any`, and that the event-type
union is closed.

**Strict checking.** The repo's `tsconfig.server.json` sets `"noCheck": true`, so
these files were previously never verified. Two new gates:

- `npm run check:accounting` — strict over the money-critical services (clean).
- `npm run check:accounting:routes` — strict over the route layer; reports the full
  diagnostic set but fails only on errors in owned files, because `requireAdmin`
  transitively pulls in legacy modules with 53 pre-existing strict errors
  (`analytics-tracker`, `embedding-generator`, `recommendation-engine`,
  `storage/index`, `storage/user-storage`). Those are listed on every run rather
  than suppressed.

---

## 3. Reversal integrity

A reversal is now provably the exact opposite of what it references. Enforced in
the database (so it holds even if a future caller bypasses the service) **and** in
the service (so callers get domain errors, not raw constraint violations).

| Rule | Enforcement |
|---|---|
| Exact negated quantity | `pim_guard_reversal` trigger: `NEW.quantity` must equal `-orig.quantity` |
| One ACTIVE reversal per target event | partial unique index on `reversal_of_event_id WHERE workflow_state <> 'reversed'` — a reversal that has itself been reversed frees the slot for an explicit new event |
| One reversal per movement, ever | partial unique index on `reversal_of_movement_id` |
| No self-reversal | CHECK `reversal_of_event_id <> id` (events and movements) |
| No cycles | `ofe_guard_reversal` walks the chain with a depth-bounded recursive CTE |
| No cross-linking | trigger rejects a different material or a different order |
| A `reversal` movement must cite its referent | CHECK `(movement_type='reversal') = (reversal_of_movement_id IS NOT NULL)` |
| Reversal-of-a-reversal refused | trigger — post an explicit correction instead |
| Idempotent | deterministic idempotency key `reverse:<eventId>`; repeat returns the existing reversal |
| Originals immutable | pre-existing `ofl_immutable` / `pim_immutable` / `ofe_guard` triggers; only `workflow_state` may move |

An arbitrary `movement_type='reversal'` with any signed quantity is **not**
representable.

**Tests** — `server/__tests__/fulfillment-reversal-integrity.test.ts` (13).

---

## 4. Draft separation

Drafts live in their own mutable tables (`fulfillment_preparation_drafts`,
`fulfillment_preparation_draft_lines`). They are **never** written into the
immutable confirmed-lines table, and nothing outside the draft service and the
admin screen reads them — so a draft has zero effect on order profit, fulfillment
totals, packaging stock and financial reports.

Workflow: `suggested → editing → awaiting_confirmation → CONFIRMED`. Confirmation
converts one draft into exactly one immutable event inside a single transaction,
marks it `consumed`, and locks the cited profile version.

After conversion: repeated confirmation returns the same event (two independent
idempotency layers — the draft's `confirmed_event_id` and the event's idempotency
key derived from the draft id); edits are rejected by both the service and the
`fpd_consumed_guard` / `fpdl_consumed_guard` triggers; stock is deducted once
(`ofe_draft_uidx` makes a second event from the same draft impossible).

---

## 5. Profile family / versioning

`packaging_profile_families` holds identity; each `packaging_profiles` row is a
**version** with `version`, `previous_version_id`, `superseded_by_id`,
`effective_date`, `active`, `creation_reason`, and unique `(profile_family_id, version)`.

A version used by a confirmed event is `locked`; `pp_guard_locked` and
`ppi_guard_locked` then refuse any change to its costing definition or its items.
Editing therefore *always* creates a new version.

A confirmed event stores the family, the exact version, and frozen material names,
quantities and unit costs on its own immutable lines.

**Proof that history never changes**: the test snapshots an order's full event
history, then creates a new profile version *and* approves a new material cost
(1700 → 9999), and asserts the re-read history is **byte-identical**.

---

## 6. Approved material-cost records

`material_cost_records` is the source of truth: `cost_basis`
(`purchase_batch` | `verified_manual_standard`), `purchase_id`, `unit_cost`,
`approval_status`, `approved_by`, `approved_at`, `effective_date`, `reason`,
`evidence_url`, `superseded_by_id`, `superseded_at`.

`fulfillment_materials.current_unit_cost` / `current_cost_purchase_id` /
`current_cost_record_id` are a **mirror**. `fmat_guard_cost_consistency` rejects
any state where they disagree with the cited approved record — so
`current_unit_cost` and `current_cost_purchase_id` can no longer contradict each
other. Approving supersedes the previous record (which survives, immutable, as
evidence): cost changes create history, they never overwrite it.
`mcr_guard_approved` refuses edits and deletes of approved/superseded records.

- Verified **zero** cost: allowed, but only via an approved record with a stated
  reason (`mcr_zero_cost_chk` + a service check).
- **Unknown** cost: `unit_cost` stays `NULL` and `getApprovedCost` reports
  `status: "unknown"`. Never coerced to 0.

---

## 7. Backend APIs

`server/routes/fulfillment-admin.ts`, mounted at `/api/admin/fulfillment`. Covers
materials (catalog, creation, descriptive updates, deactivation, purchases, cost
approval/history, stock balance and movements), profile families and versions
(list, create, new version, activate/deactivate, expected cost, historical usage),
draft preparation (suggestion, create/load, edit quantities, add/remove catalog
lines, named manual lines, server-side expected cost, missing costs),
confirmation/events (original, reshipment, replacement, return handling,
adjustment, reversal, full history) and profitability.

**All calculations come from canonical services.** The handlers contain no
financial arithmetic; that is stated at the top of the file and holds throughout.
Cost fields are structurally unreachable from the descriptive-update route.

Cross-cutting: `requireAdmin` on every route, Zod on every body and param,
idempotency keys on every mutation, an audit-trail entry per financial write,
per-route rate limits (60 writes/min, 300 reads/min), and PII-safe logging —
identifiers and amounts only, never customer names, phones or addresses.

The canonical breakdown lives in the **engine** (`buildOrderCostBreakdown` /
`computeOrderCostBreakdown`) and returns: collected amount, revenue, product COGS,
supplier packaging, AQUAVO fulfillment, original shipment, reshipments, return
handling, replacement, courier, commissions, payment fees, other direct costs,
total known direct cost, contribution profit and margin, unallocated amounts and
`dataStatus` (exact / estimated / incomplete / unknown). Any unknown component
makes the total NULL rather than under-reporting.

### Two engine defects the new tests exposed

1. A reversal counter-entry carries no cost lines of its own, so it was counted as
   an event with an unknown cost — making the whole order's fulfillment total read
   as UNKNOWN even when every remaining event was fully known. Reversals are now
   excluded from the count, since their financial effect is already achieved by
   excluding the event they reverse.
2. A manual cost override with a `NULL` `costPrice` set `costsComplete = true` —
   an unknown cost reading as a complete zero. Now guarded with a null check.

---

## 8. Manual quick-entry

Named lines with category (صندوق، ستكرات، كارت، تيب، تغليف، تكلفة إضافية),
description, quantity, unit, unit cost, **server-calculated** total, cost status
and note. Frozen onto the immutable line at confirmation.

A single unexplained lump-sum "packaging cost" is not representable — there is no
field for it. Every manual line is itemized and auditable.

---

## 9. Admin UX

`client/src/components/admin/fulfillment/`, mounted inside each order with a
three-line edit to `orders-management.tsx`. Built by an agent with **no ownership
over accounting formulas**: no component calculates revenue, COGS, profit or any
total — every number is rendered verbatim from the API and the client only formats
it. Verified by grep for arithmetic operators on money across all of its files.

Sections: تجهيز الطلب · البروفايل المقترح · سبب الاقتراح · مواد التغليف ·
الإدخال اليدوي السريع · التكلفة المتوقعة · التكلفة الفعلية · فرق التكلفة ·
حالة البيانات · تاريخ التجهيز وإعادة الإرسال · إجمالي تكلفة الطلب · الربح المباشر.

The suggested profile arrives pre-filled with its reason, so confirming common
packaging is one button press; quick-add chips cover the owner's real categories.
NULL renders as "غير معروف", never 0, and when the expected cost is unknown the
partial known subtotal is shown explicitly labelled as partial. Arabic RTL, light
and dark, mobile and desktop, loading/error/empty states, confirmation warnings,
event history, and drill-down from every total. Zero emoji. 15 component tests.

## 10. Accounting consolidation (in parallel)

Continued under separate file ownership; **no legacy implementation deleted** —
superseded local functions are kept and marked `@deprecated` with no live caller,
because deletion is a separately gated phase.

21 sites redirected across `groqFinanceAudit.ts`, `analytics.ts`, `ai-dashboard.ts`,
`predictive-analytics.ts`, `ai-tools.ts` and all three MCP finance surfaces.
The notable finds: `ai-dashboard` was reporting today's revenue as
`SUM(orders.total)` across **all** statuses with no shipping deduction, and the MCP
finance tools were aggregating `rounded_total` over `('delivered','confirmed')` —
i.e. counting unconfirmed orders as realized revenue. Both now go through
`computePeriodFinancials`.

`docs/audit/inline-financial-arithmetic-removal-map.md` catalogues all 165 sites
repository-wide (21 redirected, 5 already canonical, 20 engine internals, 30 in the
legacy accounting route awaiting the deletion gate, 89 non-accounting), each with
file, line, expression, canonical replacement and the reason for any deferral.

## 11. Independent verification

`server/services/fulfillment-verifier.ts` re-derives **29 invariants from raw SQL**
and deliberately does not reuse the confirmation/draft/cost services, so a bug in
those cannot hide by also being present in the checker. Strictly read-only.

Exposed at `GET /api/admin/fulfillment/verify` (200 pass / 409 violation) and as a
CLI: `DATABASE_URL=… npm run verify:fulfillment`.

`server/__tests__/fulfillment-verifier.test.ts` (12) proves both directions: a
services-only database passes everything, **and** each check catches its violation
when the corruption is injected directly via SQL. A checker that never fails proves
nothing.

---

## Verification status

| Gate | Result |
|---|---|
| `npx vitest run server/__tests__/` | 383 passed (29 files) |
| `npx vitest run client/src/components/admin/fulfillment` | 15 passed |
| `npm run check:accounting` | clean |
| `npm run check:accounting:routes` | no errors in owned files (53 pre-existing legacy errors listed) |
| `npx tsc --noEmit -p tsconfig.json` | clean apart from the one pre-existing `products.tsx(364,16)` error |
| `npx playwright test e2e/fulfillment-admin.spec.ts --list` | 15 tests discovered |

The Playwright spec **writes accounting rows**, so it refuses a production URL and
skips loudly unless `E2E_FULFILLMENT_WRITABLE=true` points it at a local writable
database. It does not silently pass.

---

## Not done, and why

- **Nothing applied to Neon or production.** Both migrations
  (`add_fulfillment_costing.sql`, `add_fulfillment_hardening.sql`) and their
  rollbacks exist and are exercised against a real Postgres in tests, but have not
  been run anywhere outside those tests.
- **Legacy accounting implementations are still present.** Consumers are being
  redirected to the canonical engine; deletion is a separately gated phase.
- **A true multi-connection concurrency test** requires a real Postgres; it belongs
  to the Neon child-branch phase, not to PGlite.

## Before requesting writable Neon

An isolated **child branch** only — never production. Then: apply both migrations,
run the independent verifier against the branch, run a real-concurrency test with
multiple connections, reconcile existing orders, and shadow-compare the canonical
breakdown against the legacy figures before any consumer is cut over.
