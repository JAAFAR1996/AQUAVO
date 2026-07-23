# Neon Concurrency Verification — Fulfillment / Reshipment Service

**Date:** 2026-07-23
**Branch under test:** Neon verification branch `br-round-dust-a4t0kt58` (database `neondb`)
**Connection used:** `NEON_VERIFY_DATABASE_URL` only. Production (`br-patient-mouse-a4d4cgr4`),
`DATABASE_URL` and `NEON_ROLLBACK_DATABASE_URL` were never opened. All output below is
credential-redacted.
**Precondition:** `_coordination/verify-migrations-passed.json` = `PASS` (unmodified by this run).
**Constraints honoured:** no trigger disabled, no migration file modified, no branch promoted or
deleted, no `rm -rf` / `git clean` / `git reset`.

---

## 1. What was tested, and against what contract

The service code was read before any test was written, so the tests exercise the real contracts:

| Source | Contract taken from it |
|---|---|
| `migrations/add_fulfillment_costing.sql` | `ofe_idempotency_uidx`, `ofe_one_active_original_uidx`, `ofe_order_sequence_uidx`, `pim_idempotency_uidx`, `pim_direction_chk`, immutability triggers `ofl_immutable` / `pim_immutable` / `ofe_guard` |
| `migrations/add_fulfillment_hardening.sql` | `order_fulfillment_sequences` counter-row allocation, `ofe_one_active_reversal_uidx`, `pim_one_reversal_uidx`, exact-negation trigger `pim_reversal_guard`, cycle guard `ofe_reversal_guard` |
| `server/services/fulfillment-service.ts` | `confirmFulfillment()`, `reverseFulfillmentEvent()`, `allocateSequenceNumber()`, `lockOrder()` = `pg_advisory_xact_lock(hashtext(order_id))`, `fulfillmentIdempotencyKey()` = `${orderId}:${eventType}:${requestId}` |
| `server/services/fulfillment-db.ts` | `withBoundedRetry`, `isRetryableConflict` (23505 / 40001 / 40P01) |
| `tools/verify-fulfillment.mjs` | reused unchanged as the independent read-only integrity check |

Tests call the **real exported service functions** (`confirmFulfillment`, `reverseFulfillmentEvent`)
through a Drizzle `neon-serverless` driver. Nothing was re-implemented in SQL.

### How genuine interleaving was forced and proven

Two Neon pools were opened over independent WebSocket sessions: a **service pool** (`max: 20`,
each `db.transaction()` takes its own dedicated backend) and an **auxiliary pool** used for a
*barrier* session and for a lock observer.

The barrier is not a `sleep`. It is a third, independent session that opens a transaction and takes
**the exact lock key the service itself uses**:

```sql
BEGIN;
SELECT pg_advisory_xact_lock(hashtext($1));   -- $1 = the order id
-- … held open while the contending service calls are launched …
COMMIT;
```

Every contending `confirmFulfillment()` therefore parks inside its own open transaction, on the
service's own `lockOrder()` call, at the same instant. Overlap was **observed, not assumed**, from a
separate observer session:

```sql
SELECT l.pid, l.classid, l.objid, l.granted, a.state
  FROM pg_locks l JOIN pg_stat_activity a ON a.pid = l.pid
 WHERE l.locktype = 'advisory';
```

Example snapshot captured during T1 (two contenders blocked on one holder):

```
 pid  | classid |   objid   | granted
------+---------+-----------+---------
 5360 |       0 | 745609845 | false
 5362 |       0 | 745609845 | false
```

`745609845` = `hashtext('c5ea24fb-…-9e37587a1cbf')` (order A) — the same key the service derives.
T2 showed 3 simultaneous blocked waiters, T6 showed **6**. A run only counted as valid once the
required number of `granted = false` waiters was actually observed; each test below reports
`overlapProven`.

### Test fixtures

Synthetic records carry the distinctive prefix `CONCTEST-`:
materials `CONCTEST-mat-stocked` / `CONCTEST-mat-nostock`, seed movement `CONCTEST-seed-mv-1`,
and every request id (`CONCTEST-t1-a`, …) which the service folds into the idempotency key, plus
`recorded_by = 'CONCTEST-…'`.

**No synthetic `orders` rows were created.** Three pre-existing orders (which had zero fulfillment
history — every fulfillment table was empty at baseline) were used as FK anchors, precisely so that
`orders`, `order_items_relational` and `inventory_movements` could be asserted unchanged afterwards.

Baseline before any test:

```
orders|37                          order_fulfillment_events|0
order_items_relational|173         order_fulfillment_lines|0
inventory_movements|185            packaging_inventory_movements|0
products|143                       fulfillment_materials|0
                                   order_fulfillment_sequences|0
```

---

## 2. Results

| # | Test | Result | Enforcing mechanism |
|---|---|---|---|
| 1 | Two same-order reshipments issued concurrently | **PASS** | `pg_advisory_xact_lock(hashtext(order_id))` serialization + counter-row allocation |
| 2 | Duplicate idempotency-key race (3 concurrent) | **PASS** | in-lock re-check on `idempotency_key`; `ofe_idempotency_uidx` as backstop |
| 3 | Original-shipment confirmation race | **PASS** | in-lock one-active-original check + `ofe_one_active_original_uidx` |
| 4 | Different-order parallel operations | **PASS** | lock key and counter row are both per-order, never global |
| 5 | Advisory-lock isolation is per-order scoped | **PASS** | distinct `hashtext(order_id)` keys; proven from `pg_locks` |
| 6 | Sequence allocation under concurrency (6 racers) | **PASS** | `INSERT … ON CONFLICT (order_id) DO UPDATE SET next_sequence = next_sequence + 1 RETURNING` |
| 7 | Stock deduction happens exactly once under a race | **PASS** | one movement per (event, material); `pim_idempotency_uidx` on `use:<eventId>:<materialId>` |
| 8 | Insufficient-stock rollback leaves no residue | **PASS** | in-transaction ledger balance guard; whole transaction aborts |
| 9 | Reversal idempotency (concurrent ×3 + sequential repeat) | **PASS** | key `reverse:<eventId>` + `ofe_one_active_reversal_uidx` + `pim_one_reversal_uidx` + exact-negation trigger |
| 10 | Mid-transaction failure rollback | **PASS** | single `db.transaction()`; FK abort rolls back event + line + movement + counter |
| 11 | No partial rows / zero orphans across all tables | **PASS** | atomicity + unique indexes; verified by post-hoc SQL sweep |

**11 / 11 PASS. No failures, no anomalies, no retries required.**

---

### T1 — two same-order reshipments issued concurrently

Two *distinct* requests (`CONCTEST-t1-a`, `CONCTEST-t1-b`) on order A, released simultaneously.
The correct outcome is **not** "one is dropped" — both are legitimate distinct business requests, so
correct serialization means both commit with **different allocated sequence numbers** and neither is
lost or duplicated.

```
overlapProven: true   (2 waiters blocked on advisory objid 745609845)

serviceResults:
  { ok:true, eventId:"28c9c39d-…00cd", reused:false, sequenceNumber:1, actualCost:250, variance:0, costStatus:"exact" }
  { ok:true, eventId:"b315e12a-…f245f1", reused:false, sequenceNumber:2, actualCost:250, variance:0, costStatus:"exact" }

events in DB:
  seq 1  c5ea24fb-…:reshipment:CONCTEST-t1-a  confirmed
  seq 2  c5ea24fb-…:reshipment:CONCTEST-t1-b  confirmed
```

Exactly two rows, two distinct sequence numbers, no duplicate `(order_id, sequence_number)` pair.

### T2 — duplicate idempotency-key race

Three concurrent calls with the **identical** `requestId` (`CONCTEST-t2-same`), all three provably
blocked on the same advisory lock (`blockedWaiters: 3`) before any of them could proceed — so the
pre-transaction fast path could not have short-circuited the race.

```
idempotencyKey: c5ea24fb-b532-4d03-9d74-9e37587a1cbf:reshipment:CONCTEST-t2-same

  { ok:true, eventId:"322a6282-…3fe06", reused:true  }
  { ok:true, eventId:"322a6282-…3fe06", reused:false }   ← the winner
  { ok:true, eventId:"322a6282-…3fe06", reused:true  }

event rows carrying that key: 1   (seq 3)
```

The two losers received **the winner's result**, not an error and not a second row. The DB never
had to fall through to `ofe_idempotency_uidx` because the in-lock re-check caught it first — the
unique index remains as the out-of-band backstop.

### T3 — original-shipment confirmation race

Two concurrent `original` confirmations with different request ids on an order with no original.

```
overlapProven: true
  { ok:true,  eventId:"43369867-…c3e110", reused:false, sequenceNumber:1 }
  { ok:false, error:"ORIGINAL_ALREADY_EXISTS: this order already has an active original shipment" }

active originals for that order: 1
```

Exactly one winner; the loser got a clean domain error, not a raw constraint violation, and left
nothing behind.

### T4 — different-order parallel operations (no false contention)

The barrier held order A's lock. Confirmations were launched against orders B and C at the same
moment.

```
orderB: ok  seq 1     orderC: ok  seq 2
completedWhileOrderALockHeldMs: 1874     (order A's own call was still blocked at this point)
```

Both unrelated orders committed **while order A was locked** — no global serialization point exists.

### T5 — advisory-lock isolation is per-order scoped

```
hashtext(orderA) =  745609845
hashtext(orderB) = 1917835676
hashtext(orderC) = -958808705

pg_locks while the barrier was held:
  pid 5354  objid 745609845  granted = true    ← barrier (order A)
  pid 5362  objid 745609845  granted = false   ← the order-A service call, blocked

orderA_blockedWhileBarrierHeld: true
orderA_completedAfterBarrierReleasedMs: 3977
otherOrdersCompletedAtMs:              1874
```

Only the order-A caller waited; B and C never appeared as waiters at all. The lock is keyed on the
order, and nothing else contends on it.

### T6 — sequence allocation under concurrency

Six confirmations on order A released simultaneously; **6 simultaneous blocked waiters observed**.

```
counter before: next_sequence = 5
allocated:      [5, 6, 7, 8, 9, 10]
counter after:  next_sequence = 11

all sequence numbers for order A: [1,2,3,4,5,6,7,8,9,10]
noDuplicates: true    noGaps: true
```

Six racers, six consecutive numbers, zero collisions and zero gaps. The allocator is the counter
row (`ON CONFLICT DO UPDATE … RETURNING`), which takes a row lock on exactly one order's counter —
`MAX(seq)+1` semantics were never relied on.

### T7 — stock deduction exactly once under a race

Derived from the three racing identical requests in T2 (quantity 2 each):

```
movements for that event:
  { id:"77aa6443-…47aeb", quantity:"-2",
    idempotency_key:"use:322a6282-…3fe06:CONCTEST-mat-stocked" }
cost lines for that event: 1
```

One movement of −2, one cost line — from three concurrent requests. No double deduction.

### T8 — insufficient-stock rollback leaves no residue

Two concurrent confirmations, each demanding 5 units of `CONCTEST-mat-nostock` (ledger balance 0).

```
  { ok:false, error:"INSUFFICIENT_STOCK: material CONCTEST-mat-nostock (available 0, need 5)" }
  { ok:false, error:"INSUFFICIENT_STOCK: material CONCTEST-mat-nostock (available 0, need 5)" }

residue: events 0, lines 0, movements 0
```

The guard reads the immutable movement ledger inside the transaction; both aborted cleanly and the
error is a business error, so `withBoundedRetry` correctly did **not** retry it.

### T9 — reversal idempotency

A seeded reshipment (quantity 3) on order B was reversed by **three concurrent**
`reverseFulfillmentEvent()` calls, then once more sequentially.

```
  { ok:true, reversalEventId:"a6032b98-…a5af4b", reused:false, reversedMovements:1 }   ← winner
  { ok:true, reversalEventId:"a6032b98-…a5af4b", reused:true,  reversedMovements:0 }
  { ok:true, reversalEventId:"a6032b98-…a5af4b", reused:true,  reversedMovements:0 }
sequential repeat:
  { ok:true, reversalEventId:"a6032b98-…a5af4b", reused:true,  reversedMovements:0 }

reversal events for that target: 1   (idempotency_key = reverse:b05e7781-…690c628, seq 3)
reversal movements:              1   quantity "+3", reversal_of_movement_id = fab2142e-…54428
original movements:              1   quantity "-3"
net (original + reversal):       0
original workflow_state:         reversed
fulfillment_adjustments rows:    1
```

Four applications, one effect. Exact negation (+3 against −3), same material, same order, and the
original event was state-transitioned rather than edited.

### T10 — mid-transaction failure rollback

A confirmation whose *second* line referenced a non-existent material, so the event row, the first
cost line and the first stock movement were already inserted before the FK error fired.

```
error: insert or update on table "order_fulfillment_lines"
       violates foreign key constraint "order_fulfillment_lines_material_id_fkey"

residue: events 0, lines 0, movements 0
sequence counter for that order:  before 2  →  after 2   (allocation rolled back too)
```

Nothing survived — including the sequence number, which was returned to the counter by the rollback.

### T11 — no partial rows / zero orphans

Post-hoc sweep across the fulfillment tables:

```
orphanLines (line → missing event):                 0
orphanMovements (movement → missing event):         0
non-reversal events with no cost lines:             []
rows left by the failed T8 / T10 operations:        0
duplicate (order_id, sequence_number) pairs:        []
duplicate event idempotency keys:                   []
duplicate movement idempotency keys:                []
```

Independent read-only check (`tools/verify-fulfillment.mjs`, unmodified) against the same branch:

```
Fulfillment integrity — PASS (2026-07-23T08:06:56.181Z)
  rows: events=15 lines=14 movements=16 drafts=0 materials=1 costRecords=0
  all invariants hold.
```

---

## 3. Cleanup and what could not be cleaned

Cleanup was attempted for every synthetic row, matched by the `CONCTEST-` prefix, in
reverse-dependency order. **No trigger was disabled and no migration file was touched**, so the
schema's own append-only guards applied to the cleanup exactly as they apply to production writes.

```
--- DELETE FROM fulfillment_adjustments WHERE recorded_by LIKE 'CONCTEST-%'
DELETE 1

--- DELETE FROM order_fulfillment_lines WHERE material_name_snapshot LIKE 'CONCTEST-%'
ERROR:  immutable fulfillment record: use an adjustment/reversal event instead
CONTEXT:  PL/pgSQL function fulfillment_block_mutation() line 3 at RAISE

--- DELETE FROM packaging_inventory_movements WHERE material_id LIKE 'CONCTEST-%'
ERROR:  immutable fulfillment record: use an adjustment/reversal event instead
CONTEXT:  PL/pgSQL function fulfillment_block_mutation() line 3 at RAISE

--- DELETE FROM order_fulfillment_events WHERE idempotency_key LIKE '%CONCTEST-%' …
ERROR:  cannot delete a settled fulfillment event
CONTEXT:  PL/pgSQL function ofe_guard_confirmed() line 5 at RAISE

--- DELETE FROM fulfillment_materials WHERE id LIKE 'CONCTEST-%'
ERROR:  update or delete on table "fulfillment_materials" violates foreign key constraint
        "order_fulfillment_lines_material_id_fkey" on table "order_fulfillment_lines"
DETAIL:  Key (id)=(CONCTEST-mat-stocked) is still referenced from table "order_fulfillment_lines".

--- DELETE FROM fulfillment_materials WHERE id='CONCTEST-mat-nostock'
DELETE 1
```

**These rows cannot be deleted, and were deliberately not forced.** `ofl_immutable`, `pim_immutable`
and `ofe_guard_confirmed` make confirmed fulfillment events, their cost lines and their stock
movements permanently undeletable by design — that is the audit guarantee the system exists to
provide. Removing them would have required `ALTER TABLE … DISABLE TRIGGER` or
`session_replication_role = replica`, both explicitly out of bounds.

### Post-cleanup state — accounting canon asserted unchanged

```
orders                        | 37    ← unchanged (no synthetic orders were ever created)
order_items_relational        | 173   ← unchanged
inventory_movements           | 185   ← unchanged
products                      | 143   ← unchanged
```

The canonical accounting tables are **byte-for-byte at their pre-test counts**. This was designed in
from the start by anchoring the tests on pre-existing order ids rather than minting `CONCTEST-`
orders — synthetic orders would have been just as undeletable, and would have moved `orders` off 37
permanently.

### Residue that remains (all of it synthetic, all of it attributable)

```
order_fulfillment_events      | 15   (was 0)
order_fulfillment_lines       | 14   (was 0)
packaging_inventory_movements | 16   (was 0)
fulfillment_materials         |  1   (was 0)  — CONCTEST-mat-stocked
order_fulfillment_sequences   |  3   (was 0)  — counters for the 3 anchor orders
```

Attribution proof — every remaining row in each table carries the prefix:

```
events    matching CONCTEST : 15/15
lines     matching CONCTEST : 14/14
movements matching CONCTEST : 16/16
materials matching CONCTEST :  1/1
net packaging ledger balance: 86        (100 seeded − 17 used + 3 reversed)
```

Every other fulfillment / packaging table is back at **zero**:

```
fulfillment_adjustments 0   packaging_purchases 0   packaging_profiles 0
packaging_profile_families 0   packaging_profile_items 0   material_cost_records 0
fulfillment_preparation_drafts 0   fulfillment_preparation_draft_lines 0
```

The three `order_fulfillment_sequences` counter rows were **intentionally left in place**: their
events still exist, and deleting the counters would let already-used sequence numbers be reissued
and collide with `ofe_order_sequence_uidx`. Deleting them would have been the destructive choice.

---

## 4. Findings

1. **All eleven concurrency properties hold under genuinely overlapping sessions.** Serialization is
   real (observed `granted = false` waiters), per-order (unrelated orders never blocked), and the
   sequence allocator is a true allocator, not collision detection.
2. **Idempotency is resolved in the service, not by exception.** In every duplicate race the losers
   returned the winner's result via the in-lock re-check; the unique indexes were never the thing
   that stopped a double-create. That is the stronger outcome — callers get a result, not a 23505 —
   and the indexes remain as the out-of-band backstop.
3. **Business errors do not retry.** `INSUFFICIENT_STOCK` and `ORIGINAL_ALREADY_EXISTS` were raised
   once and propagated once; `withBoundedRetry` correctly reserved retries for 23505 / 40001 / 40P01.
4. **Operational finding (not a defect): concurrency verification against this schema is not
   reversible.** Any committed fulfillment event is permanently undeletable by design. Verification
   on a branch is therefore inherently one-way, and any future load or concurrency exercise should be
   run on a branch that will be discarded rather than promoted. This branch
   (`br-round-dust-a4t0kt58`) now carries 15 synthetic events and must not be promoted.

## 5. Blockers

None for the concurrency contract itself. The only unresolved item is the intentional, documented
residue in §3 — undeletable by the schema's own audit guards, left in place rather than forced.
