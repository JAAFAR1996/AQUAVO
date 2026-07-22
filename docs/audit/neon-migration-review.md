# Neon migration boundary review

Direct line-by-line inspection of the four SQL files proposed for the Neon child branch,
performed 2026-07-23 against these exact bytes:

| File | Lines | SHA-256 |
|---|---|---|
| `migrations/add_fulfillment_costing.sql` | 255 | `ea34a32f…9901d1` |
| `migrations/add_fulfillment_costing_rollback.sql` | 21 | `80fb2b54…f291296` |
| `migrations/add_fulfillment_hardening.sql` | 449 | `5a7f4363…547f47` |
| `migrations/add_fulfillment_hardening_rollback.sql` | 60 | `8a7d9734…82c510b4` |

Verdict: **cleared for an isolated Neon child branch**, with four operational conditions in §3
and three non-blocking observations in §4.

---

## 1. Required checklist

### 1.1 No duplicate definitions from patch artifacts — ✅

Every object is defined exactly once. Counted across both forward files:

- 13 `CREATE TABLE IF NOT EXISTS` — 13 distinct table names
- 8 `CREATE OR REPLACE FUNCTION` — 8 distinct function names
- 10 `CREATE TRIGGER` — 10 distinct trigger names, each preceded by its own `DROP TRIGGER IF EXISTS`
- 16 partial/plain indexes — 16 distinct index names
- 26 `ADD CONSTRAINT` — each inside an `IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname=…)` guard, 26 distinct constraint names

No block appears twice; no half-applied patch fragment; no orphaned `$$` delimiter. Function
bodies use `$BODY$` rather than `$$`, so no dollar-quote nesting collision with the enclosing
`DO $$ … $$` blocks.

### 1.2 No malformed comments or SQL — ✅

All comments are `--` line comments; no unterminated `/* */`. The box-drawing `─` and `═`
characters in section headers are inside `--` comments and are valid UTF-8. Every statement is
semicolon-terminated. Every `DO $$ BEGIN … END $$;` is balanced. The two `RAISE EXCEPTION`
calls with `%` placeholders (`hardening.sql:399`, `:428`) supply matching argument counts.

### 1.3 Every function/trigger name is unique — ✅

| Function | Trigger | Table |
|---|---|---|
| `fulfillment_block_mutation()` | `ofl_immutable`, `pim_immutable` | lines, movements |
| `ofe_guard_confirmed()` | `ofe_guard` | events |
| `pp_guard_locked()` | `pp_locked_guard` | profiles |
| `ppi_guard_locked()` | `ppi_locked_guard` | profile items |
| `mcr_guard_approved()` | `mcr_approved_guard` | cost records |
| `fmat_guard_cost_consistency()` | `fmat_cost_consistency` | materials |
| `fpd_guard_consumed()` | `fpd_consumed_guard` | drafts |
| `fpdl_guard_consumed()` | `fpdl_consumed_guard` | draft lines |
| `pim_guard_reversal()` | `pim_reversal_guard` | movements |
| `ofe_guard_reversal()` | `ofe_reversal_guard` | events |

`fulfillment_block_mutation()` is intentionally shared by two triggers on two tables — one
function, two attachments, no name collision. All names are unqualified (`public` schema);
none collide with an existing object (verified against `docs/audit/schema-map.md`).

### 1.4 Rollback removes everything introduced — ✅ with one ordering condition

**Hardening rollback** (60 lines) reverses hardening exactly:
8 triggers → 8 functions → 11 indexes → 5 constraints on pre-existing tables → 7 added columns
on pre-existing tables → 4 new tables → 7 profile columns → the families table.
Constraints living *on* dropped tables (`mcr_*`, `fpd_*`, `fpdl_*`) are removed with their tables.
Drop order respects every FK: `fulfillment_materials.current_cost_record_id` (line 44) before
`material_cost_records` (line 48); `order_fulfillment_events.draft_id` (line 38) before
`fulfillment_preparation_drafts` (line 47).

**Costing rollback** (21 lines) reverses costing exactly: 3 triggers → 2 functions → the
deferred FK → 8 tables in dependency order. Indexes and CHECK constraints die with their tables.

⚠️ **Condition:** `DROP TRIGGER IF EXISTS x ON t` still errors if **`t`** does not exist —
`IF EXISTS` guards the trigger, not the table. So the hardening rollback **must** run before
the costing rollback. Running costing-rollback first leaves hardening-rollback unable to
execute. This ordering is stated in §2 and is not optional.

### 1.5 Migration ordering is explicit — ✅

`add_fulfillment_hardening.sql:1` states *"Applies AFTER add_fulfillment_costing.sql."*
The dependency is also structural: hardening alters `packaging_profiles`,
`order_fulfillment_events`, `order_fulfillment_lines`, `fulfillment_materials` and FK-references
`orders`, all of which costing creates. Applying hardening first fails immediately on
`ALTER TABLE packaging_profiles` — a loud failure, not silent corruption.

### 1.6 Existing production rows are handled — ✅

Nothing in these files reads, updates, or deletes a row in `orders`, `products`, `users`, or
any pre-existing business table. The only DML is two backfills over **new** tables:

- `hardening.sql:27-30` — seeds `order_fulfillment_sequences` from existing
  `order_fulfillment_events`. On a fresh Neon branch that table is empty, so zero rows.
  Re-running uses `GREATEST(existing, EXCLUDED)`, which can only move a counter forward —
  never backwards into a reused sequence number.
- `hardening.sql:57-66` — adopts orphan `packaging_profiles` into single-version families.
  Empty on a fresh branch; the `WHERE profile_family_id IS NULL` filter makes re-runs no-ops.

All new CHECK constraints use `NOT VALID`, so no existing row is scanned or rejected at apply
time (they still enforce on new/updated rows — the desired behaviour).

### 1.7 No destructive table drops in forward migrations — ✅

Neither forward file contains `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `DELETE`, or a
column-type change. Every schema change is `CREATE … IF NOT EXISTS` or
`ADD COLUMN IF NOT EXISTS`. The only `DROP`s are the 10 `DROP TRIGGER IF EXISTS` statements
that precede each `CREATE TRIGGER` for idempotency — see condition §2.2.

### 1.8 No default-zero treatment for unknown financial evidence — ✅

This is the invariant the whole design rests on, and it holds throughout:

- Every money column is **nullable with no default**: `current_unit_cost`, `total_cost`,
  `unit_cost`, `expected_cost`, `actual_cost`, `variance`, `unit_cost_snapshot`, `amount`.
  NULL means *unknown*; there is no path where unknown silently becomes `0`.
- Non-negativity checks are all written `x IS NULL OR x >= 0` — they never coerce.
- `mcr_zero_cost_chk` (`hardening.sql:166-169`) permits a genuine zero cost **only** with a
  non-blank `reason`. A zero with no justification is rejected.
- `fmat_guard_cost_consistency` (`:203-232`) forbids the catalog from claiming any
  `current_unit_cost` unless it cites an **approved** `material_cost_records` row whose
  `unit_cost` matches exactly, and whose `purchase_id` matches. Contradiction is impossible.
- `cost_status` is a first-class column on events, lines and drafts
  (`exact|estimated|incomplete|unknown`), so incompleteness is *recorded*, not defaulted away.

### 1.9 Advisory locks and sequence allocation are PostgreSQL/Neon compatible — ✅

**Advisory locks do not appear in the SQL at all.** They live in the service layer
(`pg_advisory_xact_lock(hashtext(order_id))`). That is a core PostgreSQL function, fully
supported on Neon; `pg_advisory_xact_lock` (transaction-scoped) is the correct choice for
serverless — it releases at commit/rollback and cannot leak a lock across a recycled
connection the way session-scoped `pg_advisory_lock` can.

**Sequence allocation uses no PostgreSQL SEQUENCE object.** It is a counter row per order in
`order_fulfillment_sequences`, advanced by a single
`INSERT … ON CONFLICT (order_id) DO UPDATE … RETURNING`. That statement takes a row lock on
exactly one order's counter: concurrent requests for the *same* order serialize and each
receive a *different* number (both succeed); requests for *different* orders never contend.
This is real allocation, and it is exactly the pattern that survives Neon's connection pooling
— unlike `MAX(sequence_number)+1`, which is collision *detection* and races.

The uniqueness backstop `ofe_order_sequence_uidx` on `(order_id, sequence_number)`
(`costing.sql:202`) means that even if allocation were bypassed, a duplicate is a constraint
violation rather than silent corruption.

`gen_random_uuid()` requires **pgcrypto** on PG ≤ 12; it is built into `pg_catalog` from PG 13
onward. Neon runs PG 16/17, so it is available — but this is verification step 3 in §5.

### 1.10 Triggers do not block legitimate reversal state changes — ✅

This was the highest-risk area and it checks out:

- `ofe_guard_confirmed` (`costing.sql:222-242`) freezes only the **financial snapshot**
  (`expected_cost`, `actual_cost`, `variance`, `cost_status`, `profile_id`, `profile_version`)
  once settled. `workflow_state` is deliberately **excluded** from the frozen list, so
  `confirmed → reversed` and `confirmed → adjusted` both pass.
- `ofe_one_active_original_uidx` and `ofe_one_active_reversal_uidx` are partial indexes
  excluding `workflow_state = 'reversed'`. A reversed row therefore *frees its slot*, which is
  what allows a legitimate re-reversal via an explicit new event.
- `ofe_guard_reversal` requires the target to be `confirmed` or `adjusted` — a draft or
  suggestion cannot be "reversed", which is correct, since it never hit the books.
- `pim_guard_reversal` is `BEFORE INSERT` only, so it cannot interfere with state transitions;
  it enforces exact negation (`NEW.quantity = -orig.quantity`), same material, same order, and
  refuses to reverse a reversal.
- The cycle check (`:433-442`) is a depth-bounded recursive CTE (`c.depth < 64`) and terminates.

**Trigger firing order:** PostgreSQL fires same-event row triggers in alphabetical order. On
UPDATE of `order_fulfillment_events`, that is `ofe_guard` then `ofe_reversal_guard`. Both are
`BEFORE` and both only validate-or-raise; neither rewrites `NEW`, so order is immaterial.

### 1.11 Partial unique indexes match the intended domain rules — ✅

| Index | Predicate | Rule it encodes | Correct? |
|---|---|---|---|
| `ofe_one_active_original_uidx` | `event_type='original' AND workflow_state<>'reversed'` | one live original shipment per order; reversing frees the slot | ✅ |
| `ofe_one_active_reversal_uidx` | `reversal_of_event_id IS NOT NULL AND workflow_state<>'reversed'` | one live reversal per target; a reversed reversal frees the slot | ✅ |
| `pim_one_reversal_uidx` | `reversal_of_movement_id IS NOT NULL` | **no** predicate on state — a movement is reversed once, ever | ✅ movements are immutable, so this asymmetry with the event rule is deliberate and right |
| `mcr_active_approved_uidx` | `approval_status='approved' AND superseded_by_id IS NULL` | exactly one live approved cost per material; superseding frees the slot | ✅ |
| `fpd_open_uidx` | `state IN ('suggested','editing','awaiting_confirmation')` | one open draft per (order, event_type); consumed/discarded free the slot | ✅ |
| `ofe_draft_uidx` | `draft_id IS NOT NULL` | a draft converts to at most one event — the idempotency backstop | ✅ |
| `pp_family_version_uidx` | none | (family, version) is unique | ✅ |
| `ofe_idempotency_uidx`, `pim_idempotency_uidx` | none | global request de-duplication | ✅ |

Critically, `ofe_idempotency_uidx` is on `idempotency_key` **alone**, not `(order_id, event_type)`
— which is what permits many reshipments per order while still blocking a duplicate *request*.

---

## 2. Operational conditions for the Neon run

### 2.1 Apply order (mandatory)

```
1. migrations/add_fulfillment_costing.sql
2. migrations/add_fulfillment_hardening.sql
```

### 2.2 Each file must run inside ONE transaction

Both files are transaction-safe (no `CREATE INDEX CONCURRENTLY`, no `VACUUM`). Wrapping is
**required**, not stylistic: the 10 `DROP TRIGGER IF EXISTS` / `CREATE TRIGGER` pairs open a
window in which a guard does not exist. Inside a transaction that window is invisible to other
sessions. Outside one, a concurrent write could slip past an immutability guard.

```sql
BEGIN; \i migrations/add_fulfillment_costing.sql   COMMIT;
BEGIN; \i migrations/add_fulfillment_hardening.sql COMMIT;
```

### 2.3 Rollback order (mandatory — reverse of apply)

```
1. migrations/add_fulfillment_hardening_rollback.sql
2. migrations/add_fulfillment_costing_rollback.sql
```

Reversing this order fails: see §1.4.

### 2.4 Re-hash before applying

Verify the four SHA-256 values at the top of this document. A mismatch means this review no
longer describes the bytes being applied.

---

## 3. Non-blocking observations

These are recorded for completeness. None justifies a change before the child-branch test, and
none affects financial correctness.

1. **`ofe_guard_confirmed` does not constrain the direction of `workflow_state`.** It correctly
   allows `confirmed → reversed`, but it would equally allow `confirmed → suggested`. The
   service layer never does this, and `ofe_guard_reversal` blocks reversing a non-settled
   event, so the reachable damage is nil. A `CHECK`-style state-machine guard would close it.
2. **`pim_direction_chk` permits `movement_type='correction'` with `quantity = 0`.** A zero
   correction is a no-op row, not a wrong number. `reversal` is already protected by
   `pim_reversal_nonzero_chk`.
3. **`fmat_guard_cost_consistency` is effectively insert-time-restrictive.** A new material can
   never cite a cost record on INSERT, because the record's FK requires the material to exist
   first. That forces the intended two-step (create material → approve cost → point at it), so
   it is correct behaviour, but it is implicit rather than documented in the SQL.

## 4. Explicitly out of scope for the child branch

`migrations/archive_orphan_backup_tables.sql` and `backfill_orderitems_from_jsonb.sql` are
**not** part of this plan and must not be applied. Only the two files in §2.1 are proposed.

## 5. What the child branch must prove (beyond a clean apply)

1. Both files apply cleanly inside transactions, in order.
2. Both files apply a **second** time with no error and no object duplication (idempotency).
3. `gen_random_uuid()` resolves without an extension on the Neon PG version.
4. Baseline object counts for `orders`/`products`/`users` are byte-identical before and after.
5. True multi-connection concurrency — the one thing PGlite cannot test locally, because it
   serializes statements. Specifically: two reshipments for one order from two connections,
   a duplicate idempotency request, two orders simultaneously, and advisory-lock scope.
6. Rollback, on a **separate disposable child branch**, restores the baseline exactly.
