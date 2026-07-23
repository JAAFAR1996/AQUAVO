# Accounting Semantics Remediation — F-3 / F-4 / F-5

**Agent:** AccountingSemanticsAgent
**Branch:** `feat/accounting-canonical-fulfillment`
**Date:** 2026-07-23
**Scope owned:** accounting semantics, product-cost representation, the PIM idempotency
migration, and the related tests.

| Finding | Verdict | One-line summary |
|---|---|---|
| **F-3** | **CLOSED** | Engine now applies a deterministic source-of-truth policy; the 73 historically backfilled lines surface as `unknown`, not `estimated`. |
| **F-4** | **CLOSED** | Collision reproduced on a real Postgres engine; fixed with a per-line identity column + a *stronger* uniqueness guarantee. |
| **F-5** | **CLOSED** | Products can now say "unknown" separately from "verified zero"; every ambiguous existing zero is left **explicitly unresolved**. |

Evidence was gathered **read-only** against `NEON_VERIFY_DATABASE_URL`
(endpoint `ep-rapid-breeze-a46glg7f`, i.e. **not** the production endpoint
`ep-quiet-moon-a4h7tdze`). No write of any kind was issued to any Neon branch.
No migration was applied to Neon. Every functional proof below runs offline on
PGlite (real PostgreSQL 17 engine) inside the test suite.

---

## 1. The status lattice (the shared vocabulary)

Defined in `server/services/accounting-engine.ts`:

```
exact          every component came from an immutable snapshot frozen at sale time
verified_zero  the cost is genuinely 0 and a human confirmed it (with a recorded note)
estimated      no frozen snapshot — substituted from the catalog / effective-dated
               history. REQUIRES an explicit source (product_current|cost_history|manual)
incomplete     SOME components known, some unknown → partial, never exact
unknown        no cost evidence at all
```

Degradation order (worst wins when rolling lines up):
`unknown > incomplete > estimated > verified_zero ≈ exact`
(implemented as `worstStatus()` over `STATUS_RANK`).

**Invariant enforced everywhere:** `unknown` is never rendered as `0`. A component
with no evidence is excluded from the sum and counted, never coerced.

**Deliberate asymmetry — order level vs line level.** The full five-value lattice is
reported *per line* (`OrderProfit.items[].costStatus`). The *order-level*
`costStatus` keeps the pre-existing, published vocabulary
`{exact, verified_zero, estimated, incomplete}`: an order containing unknown lines
reports `incomplete`, because MCP tools, dashboards and the period-close snapshot
already branch on exactly that value. The finer signal is not lost — it is exposed
as `unknownCostLines`, `incompleteCostLines`, `verifiedZeroLines`. Widening the
order-level enum would have been a silent contract break for consumers I do not own.

---

## 2. F-3 — the canonical engine ignored `order_items_relational`

### Root cause

`calcOrderProfit()` read line cost evidence **only** from the `orders.items` JSONB
blob (`getOrderItems()`). When a JSONB line carried no snapshot, the engine fell
through to `costs.getEffective(productId, createdAt)` — the effective-dated
resolver — which substitutes today's catalog cost (or the newest cost-history row)
and labels it `estimated`.

The 73 historically backfilled lines carry their truth **only** in the relational
store: `unit_cost_price = NULL`, `cost_snapshot_status = 'unknown'`. Because that
store was never read, those lines received a *fabricated* cost and were presented
as `estimated`. Never zero, never exact — but the *unknown* signal was destroyed,
which is the difference between "we costed this approximately" and "we have no idea
what this cost".

### Source-of-truth policy (deterministic, no guessing)

Implemented as the pure function `reconcileOrderLines()` plus the batch loader
`buildRelationalLineResolver()`:

1. `orders.items` remains the **revenue** basis (what the customer was charged). It
   is never overridden.
2. `order_items_relational` is the **cost-snapshot source of truth** whenever rows
   exist for the order **and** they reconcile with the JSONB lines — same multiset of
   `productId → total quantity`, same line count, and no JSONB line lacking a
   `productId`.
3. Reconciled → the relational cost snapshot **replaces** the JSONB cost fields
   *wholesale* (never a field-by-field mix of two stores), matched positionally
   within each `productId` (nth JSONB occurrence ↔ nth row). A relational row that
   says `unknown` therefore **stays** `unknown`, and the resolver is not consulted.
4. **Not reconciled** → nothing is merged. Merging mismatched stores would fabricate
   an attribution. The JSONB lines are used as-is and the order is degraded to at
   least `incomplete`, with `sourceReconciled = false` so the residue is visible
   rather than silent.
5. No relational rows at all → unchanged legacy behaviour.
6. A relational row that **asserts nothing** (NULL status *and* all three cost
   components NULL) is treated as an *absence of information*, not as evidence of
   "unknown", so a legitimate JSONB snapshot is never demoted by an empty dual-write
   row.

New `OrderProfit` fields: `costSourceOfTruth` (`relational` | `jsonb`),
`sourceReconciled`, `unknownCostLines`, `incompleteCostLines`, `verifiedZeroLines`.

Wired into every engine entry point: `computeOrderProfitability`,
`computePeriodFinancials`, `buildLedger`, `computeOrderCostBreakdown`.
`calcOrderProfit`'s new 4th parameter is optional, so every external caller keeps
working unchanged (JSONB-only) until it opts in.

### Live measurement (read-only, verification branch)

| Metric | Value |
|---|---|
| Realized orders (`financially_counted` / `delivered`) | 36 |
| Realized orders with relational rows | 36 |
| Relational lines on realized orders | 163 |
| Lines asserting `cost_snapshot_status = 'unknown'` | **73** |
| Lines asserting nothing (NULL status, NULL cost) | 90 |
| Orders where JSONB and relational **do not** reconcile | **0** |
| Unknown lines that land on reconciled orders | **73 (all of them)** |
| Substituted COGS those lines were contributing | **163,640 IQD** |
| Same, excluding the 3 CONCTEST-contaminated orders and `SHADOW-` orders (33 orders) | **156,734 IQD** |

All 194 relational rows on this branch have `unit_cost_price IS NULL`; 83 carry
`cost_snapshot_status='unknown'` / `cost_snapshot_source='none'` and 111 carry NULL
status. Product catalog on the same branch: 143 products, **0** NULL `cost_price`,
30 with `cost_price = 0`, 143 with `packaging_cost = 0`, 143 with `insert_cost = 0`.

### Effect on the shadow reconciliation

The prior comparison (34 clean orders) was:

```
legacy 984,377 − canonical 967,574 = 16,803
                = 1,965 revenue + 9,238 COGS + 5,600 box cost      (fully attributed)
```

**What moves, and exactly why.** Only one term moves: canonical **product COGS**
falls by the substituted cost of the now-`unknown` lines — **163,640 IQD** over the
36 realized orders on the verification branch (**156,734 IQD** over the 33-order
clean subset comparable to the original run). Revenue, shipping, discounts, box cost,
supplier packaging and fulfillment cost are untouched by this change; the engine
does not read line cost evidence for any of them. The residue therefore stays fully
attributed, with one new, named term:

```
Δ(canonical COGS) = −Σ(quantity × substituted unit cost) over relational lines
                     whose snapshot says 'unknown', on reconciled orders
                   = −163,640 IQD   (36 realized orders, verification branch)
                   = −156,734 IQD   (33 clean orders)
```

This is **not** a regression: it is the removal of a number the engine had invented.
Those 34 orders were already reported `incomplete ×34` with a null contribution
profit, so no figure that was ever labelled *exact* changes value. The unit test
*"the delta equals EXACTLY the substituted cost of the now-unknown lines"* asserts
this property directly, and additionally asserts that revenue, shipping, box cost
and discounts are byte-identical between the two modes.

---

## 3. F-4 — `pim_idempotency_uidx` collision proof

### Empirical proof of the defect

`server/__tests__/pim-line-identity-migration.test.ts` builds the **verbatim**
`packaging_inventory_movements` definition from `migrations/add_fulfillment_costing.sql §6`
(plus `pim_idempotency_uidx`) on a real PostgreSQL engine (PGlite 0.5.4 / PG 17), then
inserts one event `ev-1` with **two legitimate lines** `line-a` (qty 2) and `line-b`
(qty 3) carrying the **same** material `mat-box`.

Under the old key format `use:<event_id>:<material_id>`:

```
INSERT … idempotency_key='use:ev-1:mat-box'   → OK   (line-a, −2)
INSERT … idempotency_key='use:ev-1:mat-box'   → ERROR 23505, pim_idempotency_uidx
count(*) = 1        -- line-b's stock was NEVER deducted
```

The key is generated in `server/services/fulfillment-service.ts` inside the
confirmation transaction, so the 23505 aborts the **entire** confirmation. **The
defect is real**: legitimate multiple movements collide.

Test name: *"PROOF OF DEFECT: two legitimate lines of one event COLLIDE under the old key"* — asserts the 23505 and the lost deduction.

### The fix — per-line identity, without weakening duplicate protection

`migrations/add_pim_line_identity.sql`:

* adds nullable `line_id text REFERENCES order_fulfillment_lines(id)` (constraint `pim_line_fk`);
* **leaves `pim_idempotency_uidx` completely untouched** in both directions, so
  request-level de-duplication is byte-identical before, during and after;
* adds `pim_line_uidx UNIQUE (line_id) WHERE line_id IS NOT NULL` — a **strictly
  stronger** guarantee: at most one stock movement may ever exist per fulfillment
  line. Previously *nothing* at the database level prevented two movements for one
  line under two different keys;
* adds `pim_event_idx` on `event_id`;
* **no backfill.** Existing rows keep `line_id = NULL`. The old key identified only a
  material, and the ambiguous case is precisely the one where several lines share a
  material — inferring the line would be guessing. Historical rows stay explicitly
  unattributed; the partial index exempts them.

`server/services/fulfillment-service.ts` mints the line id **before** inserting the
line and keys the movement `use:<eventId>:<lineId>`, recording `lineId` on the
movement. Duplicate requests still short-circuit earlier, on the event's own
`ofe_idempotency_uidx` (`findByIdempotencyKey`), which is unchanged.

### Verified properties (all passing)

| Property | Test |
|---|---|
| Two legitimate lines of one event collide under the OLD key | PROOF OF DEFECT |
| Migration applies and is idempotent | ✓ |
| **Multiple legitimate lines do not collide** — both deducted, sum −5 | ✓ |
| **Duplicate requests remain blocked** — same key still 23505 | ✓ |
| A second movement for the SAME LINE is now impossible (even under a different key) | ✓ (new, stronger) |
| Purchases / reversals unaffected — many NULL `line_id` allowed | ✓ |
| `line_id` must reference a real line (FK) | ✓ |
| Rollback restores the exact pre-migration shape; `pim_idempotency_uidx` survives; duplicate protection still works | ✓ |
| Migration fails CLOSED when base tables are absent | ✓ |
| No top-level BEGIN/COMMIT in either file | ✓ |

---

## 4. F-5 — products cannot express "unknown" separately from "verified zero"

### Root cause

`products.cost_price / packaging_cost / insert_cost` are declared
`numeric DEFAULT '0'` (`shared/schema.ts`). A product created without cost
information is **born holding a zero** that is indistinguishable from a deliberately
entered zero. Measured live (read-only): **0** NULL costs, **30** products with
`cost_price = 0`, **143 of 143** with `packaging_cost = 0` **and** `insert_cost = 0`.
Zero is overloaded to mean "unknown", defeating the NULL-not-zero rule at its source.

### Schema representation

`migrations/add_product_cost_resolution.sql` adds, **additively and nullably**:

| column | meaning |
|---|---|
| `cost_price_resolution` | `known` (value > 0, real evidence) / `verified_zero` (value = 0, human-confirmed) / `unresolved` (UNKNOWN) |
| `packaging_cost_resolution` | as above |
| `insert_cost_resolution` | as above |
| `cost_resolution_note` | why — **mandatory** for any `verified_zero` |
| `cost_resolution_by`, `cost_resolution_at` | who / when |

Two `NOT VALID` CHECK constraints (enforced for all future writes, never able to fail
on legacy rows):
* `products_cost_resolution_chk` — vocabulary guard;
* `products_verified_zero_evidence_chk` — a `verified_zero` claim without a
  `cost_resolution_note` is rejected. A verified zero must carry evidence.

Plus `products_cost_unresolved_idx`, a partial index so an operator can find and work
through the unresolved backlog.

The numeric columns are **not** modified and the `DEFAULT '0'` is **not** dropped
(dropping it would change insert behaviour for a table owned by another workstream —
recorded as an open item below).

### Migration / backfill classification — no guessing

```
cost > 0    → 'known'        (a positive number is evidence of itself)
cost IS NULL→ 'unresolved'   (already explicitly unknown)
cost = 0    → 'unresolved'   ← AMBIGUOUS. Deliberately NOT promoted to
                               'verified_zero'. Only a human, recording a note,
                               may ever do that.
```

The migration ends with a **fail-closed** `DO` block that aborts if the backfill
produced even one `verified_zero`, or left any component unclassified. Stored zeros
themselves are never rewritten, so the migration is fully reversible.

### Accounting behaviour

```ts
resolveCostComponent(value, resolution):
  value == null                          → null   (unknown)
  value  >  0                            → value
  value === 0 && resolution==='verified_zero' → 0  (a real, exact zero)
  value === 0 otherwise                  → null   (UNKNOWN — never a silent 0)
```

Applied in `productCostFromProduct` (with the resolution columns) and
`productCostFromHistory` (`product_cost_history` has no resolution columns, so every
zero there is ambiguous by construction and resolves to UNKNOWN — never guessed).
A product whose three components are all verified zeros reports `costStatus:
"verified_zero"`, which is exact evidence and does **not** block an exact profit.

**Line arithmetic — acquisition cost gates the line.** If `costPrice` itself is
unknown the line contributes **nothing** to COGS (as before). If `costPrice` is
known, the line contributes it plus whichever ancillary components are known, and is
flagged `incomplete`. This reproduces the previous arithmetic **exactly** whenever
the newly-unknown components are the ambiguous zeros F-5 is about — they contributed
`0` under the old all-or-nothing rule and contribute nothing now. **F-5 therefore
causes zero monetary drift**; only the honesty of the status changes (many orders move
from `exact`/`estimated` to `incomplete`, and their `exactCogs` / `exactNetProfit`
become `null` instead of a confident number resting on a fabricated zero).

### UI / API behaviour

* `OrderProfit` gains `verifiedZeroLines`, `incompleteCostLines`, `unknownCostLines`;
  `items[].costStatus` can now be `verified_zero`.
* `items[].unitCostPrice / unitPackagingCost / unitInsertCost` return `null` for an
  unresolved zero, so no consumer can mistake it for a genuine zero-cost line — the
  existing "غير معروف, never 0 د.ع" rendering path already handles `null`.
* No API contract is broken: every addition is additive.

### Compatibility policy for existing records

* **Additive only.** Every new column is nullable; old code running against the new
  schema is unaffected because it never reads them.
* **The new code is correct before the migration is applied.** A missing/NULL
  resolution is read as `unresolved`, i.e. the conservative reading. Applying the
  migration is not a prerequisite for the fix — it is what makes it *possible* for an
  operator ever to say `verified_zero`.
* **Nothing is reinterpreted.** All 30 ambiguous `cost_price = 0` products and all
  143 zero packaging/insert values remain explicitly `unresolved` until a human
  supplies evidence. They are neither promoted to a real zero nor rewritten to NULL.
* **Rollback is lossless for business data**: it drops only the added columns,
  constraints and index. Any recorded `verified_zero` classification is discarded —
  evidence is lost, never invented, which is the correct direction of failure.

> ⚠️ **DEPLOYMENT ORDER IS MANDATORY.** `shared/schema.ts` now declares
> `products.cost_price_resolution…` and `packaging_inventory_movements.line_id`.
> Drizzle emits an explicit column list, so **both migrations must be applied to a
> database BEFORE this code is deployed against it.** Migration first, code second;
> rollback in the reverse order (code first, then rollback SQL).

---

## 5. Migrations and rollbacks

| File | SHA-256 |
|---|---|
| `migrations/add_pim_line_identity.sql` | `0b60607b46d17a7f8c34a873f63b2f64b4541b9586a364301ff3124a020dbd03` |
| `migrations/add_pim_line_identity_rollback.sql` | `c105afb2b0ef55774544380e848eb877374e3d2dd5141ab9237bd3d442b82ec2` |
| `migrations/add_product_cost_resolution.sql` | `98b2878afcf9d7600029cd8b08247e5f277178deef7db12063d15b661140b4ee` |
| `migrations/add_product_cost_resolution_rollback.sql` | `4e3fdaa8f87e44f6b1900ef7f1ba6ed93660ad643d653740aba4b31393176708` |

Both follow the repo convention established by `add_fulfillment_costing.sql` and
`add_orderitem_backfill_trigger_safety.sql`: **no top-level `BEGIN`/`COMMIT`** (the
executor owns the transaction and submits the whole file inside one), idempotent
(`IF NOT EXISTS` / `pg_constraint` guards), fail-closed preflight guards, additive and
reversible. `npm run db:push` was **not** run and must never be.

Recommended application order (each inside its own `BEGIN … COMMIT`):
1. `add_pim_line_identity.sql`
2. `add_product_cost_resolution.sql`

Rollback order is the exact reverse.

---

## 6. Tests — written and actually run

New files:

* `server/__tests__/accounting-semantics.test.ts` — 20 tests (F-3 + F-5 semantics, pure engine)
* `server/__tests__/pim-line-identity-migration.test.ts` — 10 tests (F-4, real Postgres)
* `server/__tests__/product-cost-resolution-migration.test.ts` — 10 tests (F-5 migration, real Postgres)

Required-test coverage map:

| Required test | Where |
|---|---|
| historical unknown stays unknown | `accounting-semantics` → *"HISTORICAL UNKNOWN STAYS UNKNOWN — today's cost is NOT substituted"* |
| verified zero stays exact zero | `accounting-semantics` → *"verified zero does not degrade the order and keeps exact figures"*, *"a VERIFIED zero stays an exact numeric 0"* |
| estimated status requires explicit evidence/source | `accounting-semantics` → *"ESTIMATED REQUIRES AN EXPLICIT SOURCE — never emitted without one"* |
| multiple legitimate lines do not collide | `pim-line-identity-migration` → *"FIXED: MULTIPLE LEGITIMATE LINES DO NOT COLLIDE"* |
| duplicate requests remain blocked | `pim-line-identity-migration` → *"DUPLICATE REQUESTS REMAIN BLOCKED"* (+ *"STRICTLY STRONGER…"*, + survives rollback) |
| products can express unknown cost | `accounting-semantics` → *"a product whose zeros are unresolved yields UNKNOWN cost, not zero cost"*; `product-cost-resolution-migration` → *"DOES NOT SILENTLY REINTERPRET EXISTING ZEROS"* |
| accounting never converts unknown to zero | `accounting-semantics` → *"ACCOUNTING NEVER CONVERTS UNKNOWN TO ZERO — a mixed order keeps the known part only"*, *"an UNRESOLVED zero … yields no exact figure at all"* |
| legacy/canonical comparison has no unexplained residue | `accounting-semantics` → *"the delta equals EXACTLY the substituted cost of the now-unknown lines"*, *"neither engine ever presented the substituted figure as EXACT"* |

Real output of the three new files:

```
 ✓ server/__tests__/accounting-semantics.test.ts (20 tests) 113ms
 ✓ server/__tests__/pim-line-identity-migration.test.ts (10 tests) 53432ms
 ✓ server/__tests__/product-cost-resolution-migration.test.ts (10 tests) 51590ms
```

Full suite, after all changes:

```
 Test Files  112 passed (112)
      Tests  1538 passed (1538)
   Duration  211.78s
```

(0 failed, 0 skipped. The stated baseline was 107 files / 1446 tests / 0 failed; the
increase includes this workstream's 3 files / 40 tests, other concurrent agents'
files, and 12 previously-skipped `fulfillment-verifier` tests that now execute.)

TypeScript: `npx tsc --noEmit -p tsconfig.json` → clean;
`accounting-engine.ts` typechecked directly under `--strict` → clean.

### Fixture changes made to keep the suite green

These are schema-shape updates to existing PGlite fixtures, not assertion changes:

* `consolidation-engine-agreement.test.ts` — added the F-5 resolution columns to the
  `products` DDL and added an `order_items_relational` table (the engine now reads it).
* `fulfillment-{service-integration,concurrency,drafts-profiles-costs,reversal-integrity,admin-api,verifier}.test.ts`
  — now also apply `migrations/add_pim_line_identity.sql` after the hardening migration.
* `fulfillment-admin-api.test.ts` — added the resolution columns and
  `order_items_relational` to its fixture.
* `shared/products.ts` — the three static seed products declare
  `*_resolution: "unresolved"` (a static seed asserts no cost evidence).

No existing assertion was weakened or deleted.

---

## 7. Left open / handed off

1. **`numeric DEFAULT '0'` on `products.cost_price / packaging_cost / insert_cost`
   is still in place.** This is the root generator of new ambiguous zeros: every
   product created from now on is born `unresolved`. Dropping the default (or making
   the columns NULL-by-default) changes insert behaviour for a table owned by the
   product/PIM workstream and would need their admin/API write paths updated in the
   same change. **Recommendation:** a follow-up migration
   `ALTER TABLE products ALTER COLUMN cost_price DROP DEFAULT` (×3) plus an admin-UI
   change that forces the operator to pick `known` / `verified_zero` / `unresolved`
   when saving a cost. Not done here — outside my ownership and not safe to do
   unilaterally.
2. **Frozen JSONB snapshots with `costStatus:'exact'` and a cost of `0`** are still
   trusted verbatim. Such a snapshot may have inherited the F-5 ambiguity from the
   catalog at sale time. I did **not** reinterpret them — that would be guessing about
   immutable historical evidence. If the order-creation workstream (Agent 2) can
   confirm the snapshot writer never wrote an unresolved zero as `exact`, this can be
   closed; otherwise a one-off classification pass over historical snapshots is needed.
3. **`product_cost_history` has no resolution columns.** Its zeros resolve to UNKNOWN,
   which is conservative and correct but means a genuinely-zero historical cost cannot
   be expressed. Extending the same three-column pattern there is straightforward if
   the need arises.
4. **Neither migration has been applied to any Neon branch.** Verification was
   read-only. The deployment-order constraint in §4 must be honoured by whoever
   applies them.
5. **The 90 relational rows asserting nothing** (NULL status, NULL costs) on realized
   orders are inert under the new policy (rule 6). They are presumably dual-write rows
   whose snapshot fields were never populated. Worth confirming with the order-creation
   workstream that this is intended rather than a dual-write gap.
6. **`server/env.ts` / dotenv override** — noted as a real hazard (a committed `.env`
   carrying the production `DATABASE_URL` can beat an inherited value). Owned by
   Agent 1; I avoided it entirely by never loading `.env` and by using `psql` with an
   explicitly-passed connection string.
