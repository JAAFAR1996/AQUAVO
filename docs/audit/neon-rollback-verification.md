# Neon Rollback Verification — disposable branch `br-wispy-tree-a4ksj3t1`

**Date:** 2026-07-23
**Agent:** RollbackBranchAgent
**Target:** rollback branch `br-wispy-tree-a4ksj3t1` ONLY, via `NEON_ROLLBACK_DATABASE_URL`.
**Not touched:** production `br-patient-mouse-a4d4cgr4`, `NEON_VERIFY_DATABASE_URL`, `DATABASE_URL`.
The rollback branch was **not** deleted, **not** promoted, **not** deployed.
All psql output below is reproduced verbatim except that connection strings are
redacted through `sed -E 's#postgres(ql)?://[^ ]*#[REDACTED]#g'`.

**Verdict: full round trip PASSED.** Five forward migrations applied, six rollback
operations executed in the mandated order, all nine required proofs satisfied, and
all five migrations reapplied cleanly. The branch ended in the post-migration state
with zero unexplained residue.

---

## 0. File integrity — working tree AND committed git blob

Every one of the ten SQL files was read in full before execution, and hashed twice:
once from the working tree, once from `git cat-file -p HEAD:<path>`. **All twenty
hashes matched the expected values**, so no file was executed from a drifted copy.

```
$ for f in add_order_item_cost_snapshot add_orderitem_backfill_trigger_safety \
    backfill_orderitems_from_jsonb add_fulfillment_costing add_fulfillment_hardening \
    add_fulfillment_hardening_rollback add_fulfillment_costing_rollback \
    backfill_orderitems_from_jsonb_rollback add_orderitem_backfill_trigger_safety_rollback \
    add_order_item_cost_snapshot_rollback; do
    wt=$(sha256sum migrations/$f.sql | cut -d' ' -f1)
    gb=$(git cat-file -p HEAD:migrations/$f.sql | sha256sum | cut -d' ' -f1)
    echo "$f WT=$wt GIT=$gb"; done

add_order_item_cost_snapshot                   WT=e507bce4…b3b0ed GIT=e507bce4…b3b0ed
add_orderitem_backfill_trigger_safety          WT=ee96e878…c7cb89 GIT=ee96e878…c7cb89
backfill_orderitems_from_jsonb                 WT=bbe942d3…c758a3ac2 GIT=bbe942d3…c758a3ac2
add_fulfillment_costing                        WT=ea34a32f…79901d1 GIT=ea34a32f…79901d1
add_fulfillment_hardening                      WT=5a7f4363…615547f47 GIT=5a7f4363…615547f47
add_fulfillment_hardening_rollback             WT=8a7d9734…82c510b4 GIT=8a7d9734…82c510b4
add_fulfillment_costing_rollback               WT=80fb2b54…46f291296 GIT=80fb2b54…46f291296
backfill_orderitems_from_jsonb_rollback        WT=9baedea4…43ec9f44 GIT=9baedea4…43ec9f44
add_orderitem_backfill_trigger_safety_rollback WT=7a969e6f…e003a GIT=7a969e6f…e003a
add_order_item_cost_snapshot_rollback          WT=8811d78c…44715dd1ae4 GIT=8811d78c…44715dd1ae4
```

(Full 64-char digests are the ones supplied in the task brief; each was compared
character-for-character before the corresponding file was executed.)

### Protocol derived from the SQL itself (not assumed)

Read out of the files, not from prior expectation:

| Item | Value | Source |
|---|---|---|
| Batch GUC | `aquavo.backfill_batch_id` | backfill §3.0, trigger-safety §1/§2 |
| Rollback authorization GUC | `aquavo.backfill_rollback_authorized = 'on'` | rollback §1b, trigger-safety §2 cond. 1 |
| Unresolved override GUC | `aquavo.backfill_allow_unresolved` (not needed — 0 unresolved) | backfill §3c |
| Control-table disposal GUC | `aquavo.backfill_drop_control_table = 'on'` (MODE A, disposable branch) | rollback §5 |
| UUID ownership | **executor mints it**; no internal `gen_random_uuid()` default | backfill header + §3.0 |
| Transaction ownership | executor wraps whole file; files contain no BEGIN/COMMIT | all headers |

Executed accordingly: every operation as `psql -v ON_ERROR_STOP=1 --single-transaction -f <file>`,
with `SET LOCAL` lines prepended into the same transaction where the file requires them.

---

## 1. Pre-state snapshot

```
 db     |     usr      | ver
--------+--------------+---------------------------------------------------------
 neondb | neondb_owner | PostgreSQL 17.10 (2947584) on aarch64-unknown-linux-gnu

 tables | constraints | indexes | user_triggers | functions
--------+-------------+---------+---------------+-----------
    185 |         529 |     574 |            32 |       181

        schema_fingerprint
----------------------------------
 7ba395295f65b3a66598a12f64b05ce8      ← matches Gate 0 baseline

                 proname                  |                              sha256
------------------------------------------+------------------------------------------------------------------
 prevent_unsafe_order_dependency_mutation | 98c626552eb4fe75728dc7c64648e2a50b952f9503dd4b7060550d8e5219f631
 record_order_item_inventory_sale         | c14f31465132476698f4f587cc15849bf3a535f919eab51dd0c0ab35f45dee3c
 refresh_order_financial_snapshot_trigger | a99c1a1d43f9a1423952f169dede585ec0f88ac8178d9ef72c5f32342e1435a4

 oir_rows |           oir_checksum
----------+----------------------------------
      100 | b6869d395e02e5c8f962b18e201ba8ad

 orders_rows = 37        inventory_movements = 185
 orders_checksum = 9f0293b25b260574971b81b376e41b18
 stock_checksum  = 8a77629d4fb27604d623f671ac922030   (143 products, total_stock 2093)

 ctl | batches | fcl | tsa
-----+---------+-----+-----
     |         |     |        ← order_item_backfill_control, orderitem_backfill_batches,
                              fulfillment_cost_lines, orderitem_trigger_safety_audit all absent

 inventory_ledger_mode = enforce   ← the suppression exception is live and meaningful
```

Additionally, **row counts for all 185 public tables** were captured to
`counts_baseline.txt`, and the 100 `order_items_relational` ids to
`oir_ids_baseline.txt`, for exact end-to-end diffing.

`inventory_ledger_mode='enforce'` matters: it means the AFTER INSERT inventory-sale
trigger is armed, so "no movements were created" is a real result, not a vacuous one.

---

## 2. Forward apply ×5 — all PASSED

| # | File | Result |
|---|---|---|
| 1 | `add_order_item_cost_snapshot.sql` | PASS (`ALTER TABLE`, `DO`) |
| 2 | `add_orderitem_backfill_trigger_safety.sql` | PASS (1 table, 2 indexes, 2 functions) |
| 3 | `backfill_orderitems_from_jsonb.sql` | PASS — **73 rows inserted** |
| 4 | `add_fulfillment_costing.sql` | PASS |
| 5 | `add_fulfillment_hardening.sql` | PASS |

### Batch UUID (first run) — `a2f37658-6b05-49a8-9964-8c6d47d85904`

Minted by the executor before the transaction, exactly as the file's contract requires:

```
$ BATCH=$(psql "$NEON_ROLLBACK_DATABASE_URL" -t -A -c "SELECT gen_random_uuid()")
BATCH1=a2f37658-6b05-49a8-9964-8c6d47d85904

$ { echo "SET LOCAL aquavo.backfill_batch_id = '$BATCH';"; \
    cat migrations/backfill_orderitems_from_jsonb.sql; } > fwd3.sql
$ psql "$NEON_ROLLBACK_DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -f fwd3.sql
SET
CREATE TABLE
NOTICE:  Backfill batch a2f37658-6b05-49a8-9964-8c6d47d85904 inserted 73 rows
         (unresolved=0, ambiguous=0, complete=t).
DO
exit=0
```

Immediately after the backfill:

```
 oir_total | batch_rows | inv_moves | suppressed |          stock_checksum
-----------+------------+-----------+------------+----------------------------------
       173 |         73 |       185 |         73 | 8a77629d4fb27604d623f671ac922030

               batch_id               | rows_inserted | unresolved | ambiguous | complete | finished | rolled_back_at
--------------------------------------+---------------+------------+-----------+----------+----------+----------------
 a2f37658-6b05-49a8-9964-8c6d47d85904 |            73 |          0 |         0 | t        | t        |
```

`inv_moves` stayed at the baseline 185 and `stock_checksum` was unchanged while 73
suppression records were written — the exception fired 73 times and created zero
inventory movements.

Post-forward object inventory: **200 tables, 610 constraints, 613 indexes, 43 user
triggers, 191 functions** (up from 185/529/574/32/181).

### Application-created row (outside the batch)

`id = rbtest-approw-0001`, on a synthetic host order `rbtest-order-0001`, inserted
**after** the backfill with no `backfill` key in its metadata:

```
         id         |     order_id      | has_backfill_key | metadata
--------------------+-------------------+------------------+------------------------------------------
 rbtest-approw-0001 | rbtest-order-0001 | f                | {"note": "ROLLBACK-TEST application-created
                                                             row — NOT part of any backfill batch",
                                                             "createdBy": "application"}
```

**Method disclosed in full, because it is non-obvious.** Two hard constraints shaped it:

1. `inventory_movements` carries `inventory_movements_immutable` (BEFORE DELETE OR
   UPDATE). Any sale movement created by the test row would be **permanently
   unremovable**, corrupting the end-to-end inventory proof.
2. `order_is_hard_deletable()` is false for **every one of the 37 real orders**
   (each has `order_line` movements), so a test row placed on a real order could
   never be cleaned up once the original guard was restored.

Therefore the row was placed on a fresh `pending`/`pending`/`cod_received=false`
order with `items='[]'` (so it contributes nothing to any backfill scan), and the
insert was performed in a single transaction that temporarily set
`settings.inventory_ledger_mode` to `'off'` and restored it in the same transaction:

```sql
UPDATE settings SET value='off' WHERE key='inventory_ledger_mode';
INSERT INTO orders (id, order_number, total, items, status, payment_status, cod_received)
VALUES ('rbtest-order-0001','RB-TEST-0001', 5000, '[]'::jsonb, 'pending','pending', false);
INSERT INTO order_items_relational (id, order_id, product_id, quantity, price_at_purchase, total_price, metadata)
VALUES ('rbtest-approw-0001','rbtest-order-0001','17023591-de5c-4e14-966a-aee8e9437311',1,5000,5000,
        jsonb_build_object('createdBy','application','note','ROLLBACK-TEST …'));
UPDATE settings SET value='enforce', updated_at='2026-07-23 04:54:31.412599'
 WHERE key='inventory_ledger_mode';
```

This used the system's own documented mode switch — **no trigger was disabled**, no
`session_replication_role` change, no `DISABLE TRIGGER`. The settings row was
restored byte-identical including `updated_at`:

```
 oir | inv |             stock_ck             |                         settings_row
-----+-----+----------------------------------+--------------------------------------------------------------
 174 | 185 | 8a77629d4fb27604d623f671ac922030 | (inventory_ledger_mode,enforce,"2026-07-23 04:54:31.412599")
```

174 = 100 original + 73 batch + 1 application row.

**Honest caveat.** Because the host order is not audited, this row's survival proves
the rollback's *selector* is batch-scoped (`metadata #>> '{backfill,batch_id}'`), which
is exactly the claim being tested. It does **not** additionally exercise the audited
-order guard on that row — that property is covered separately by the blocked-delete
proof in §4.3, which uses real audited rows.

---

## 3. Rollback ×6 — all PASSED, in the mandated order

| # | Operation | Result |
|---|---|---|
| 1 | `add_fulfillment_hardening_rollback.sql` | PASS |
| 2 | `add_fulfillment_costing_rollback.sql` | PASS |
| 3 | `backfill_orderitems_from_jsonb_rollback.sql` (batch `a2f37658-…`, both GUCs, MODE A) | PASS — 73 deleted |
| 4 | `add_orderitem_backfill_trigger_safety_rollback.sql` | PASS |
| 5 | `add_order_item_cost_snapshot_rollback.sql` | PASS |
| 6 | disposable-branch audit/test-data cleanup | PASS |

Step 3 was supplied the exact batch UUID and the exact authorization GUC the SQL
demands, plus MODE A control-table disposal (the file's own designation for the
disposable rollback-test branch):

```
$ { echo "SET LOCAL aquavo.backfill_batch_id = 'a2f37658-6b05-49a8-9964-8c6d47d85904';"
    echo "SET LOCAL aquavo.backfill_rollback_authorized = 'on';"
    echo "SET LOCAL aquavo.backfill_drop_control_table = 'on';"
    cat migrations/backfill_orderitems_from_jsonb_rollback.sql; } > rb3.sql
$ psql "$NEON_ROLLBACK_DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -f rb3.sql
SET
SET
SET
NOTICE:  Batch a2f37658-6b05-49a8-9964-8c6d47d85904 rolled back: 73 rows deleted
         (matches audit record).
NOTICE:  Control table dropped (MODE A: child-branch full rollback).
DO
exit=0
```

**Step 6 scope.** A full 185-table count diff after step 5 showed the two audit
tables the exercise created were already gone — `orderitem_backfill_batches` dropped
by step 3 (MODE A) and `orderitem_trigger_safety_audit` dropped by step 4 — and that
**no other table anywhere in the schema had accumulated audit rows**. The only
residue was the agent's own synthetic test data, which step 6 removed:

```sql
DELETE FROM order_items_relational WHERE id = 'rbtest-approw-0001';   -- DELETE 1
DELETE FROM orders               WHERE id = 'rbtest-order-0001';      -- DELETE 1
```

---

## 4. The nine proofs

### 4.1 Only the exact-batch rows were deleted — count AND identity

Deleted count (73) equals the count the backfill inserted (73) equals the count the
batch row recorded (`rows_inserted = 73`); the rollback file itself re-checks this
twice in-transaction and would have raised otherwise.

Identity, not just count. The 73 ids captured before the delete were diffed against
the 73 ids the trigger recorded as authorized deletions:

```
$ diff <(sort batch1_ids.txt) <(sort deleted_ids.txt) && echo "IDENTICAL: deleted set == batch set"
IDENTICAL: deleted set == batch set
```

And the surviving id set versus the 100-row baseline:

```
$ diff <(sort oir_ids_baseline.txt) <(sort oir_ids_after_rb3.txt)
100a101
> rbtest-approw-0001
```

The only difference is the application row. **Every one of the 100 original rows
survived; every one of the 73 batch rows was removed; nothing else was touched.**

### 4.2 The application-created row still exists — PASS

```
 oir_now | approw_survives | any_backfill_rows_left | authorized_deletes | inv | reversal_moves | control_table
---------+-----------------+------------------------+--------------------+-----+----------------+---------------
     101 |               1 |                      0 |                 73 | 185 |              0 |
```

101 = 100 original + 1 application row. `approw_survives = 1`.

### 4.3 A normal audited DELETE remains blocked — PASS

Unauthorized delete of a backfilled row, no GUCs set:

```
$ psql … --single-transaction -c "
  DELETE FROM order_items_relational
   WHERE id = (SELECT id FROM order_items_relational
               WHERE metadata #>> '{backfill,batch_id}' = 'a2f37658-…' ORDER BY id LIMIT 1);"
ERROR:  order 632e71ef-6138-4dc1-aac2-8cc805eb43e7 is audited and its dependent records
        cannot be removed or detached
CONTEXT:  PL/pgSQL function prevent_unsafe_order_dependency_mutation() line 62 at RAISE
exit=1
```

Two further negative tests confirm the two GUCs are genuinely independent and
neither alone suffices:

**NEG A — batch id supplied, authorization withheld → still blocked at the trigger:**

```
SET
ERROR:  order 632e71ef-6138-4dc1-aac2-8cc805eb43e7 is audited and its dependent records
        cannot be removed or detached
CONTEXT:  PL/pgSQL function prevent_unsafe_order_dependency_mutation() line 62 at RAISE
```

**NEG B — rollback file run with the batch id but without the authorization GUC →
fails closed before any DELETE:**

```
SET
ERROR:  ABORT: rollback not authorized. Set "SET LOCAL aquavo.backfill_rollback_authorized = 'on';"
        in the same transaction, alongside aquavo.backfill_batch_id. There is deliberately no default.
CONTEXT:  PL/pgSQL function inline_code_block line 36 at RAISE
```

**Reported honestly — one discarded test.** An additional test attempted a delete of
the *application* row with both GUCs set, expecting a block. It returned `DELETE 1`.
This is **not** a defect in the exception: the row sat on the synthetic
`pending`/`pending` order, which `order_is_hard_deletable()` correctly reports as
deletable, so the **original, unmodified** guard path permitted it — the exception
was never consulted. The test was mis-designed (it silently assumed the synthetic
order was audited) and is discarded as uninformative. It did delete the test row,
which was then recreated identically before the rollback sequence began; the
recreation is visible in the row counts above (174 → back to 174). No batch row and
no original row was affected.

### 4.4 The authorized rollback delete succeeded — PASS

`NOTICE: Batch a2f37658-… rolled back: 73 rows deleted (matches audit record).`
The trigger's own evidence table recorded exactly 73 `audited_delete_authorized`
events, one per deleted row (§4.1).

### 4.5 No retrospective inventory reversal movements — PASS

`inventory_movements` held **185** rows at every single checkpoint: baseline, after
the backfill, after the application row, after the batch-scoped delete, and at the
end. `reversal_moves = 0`. The product stock checksum was
`8a77629d4fb27604d623f671ac922030` at every checkpoint without exception.

The forward path created no movements (suppression exception, 73 records) and the
rollback path created none either — consistent with the rollback file's locked
policy: nothing was created, so there is nothing to reverse.

### 4.6 The control table is removed — PASS

```
 control_table
---------------
                ← to_regclass('public.orderitem_backfill_batches') IS NULL
```

Dropped under MODE A after the file verified no un-rolled-back batch remained.
`orderitem_trigger_safety_audit` was likewise dropped by the trigger-safety rollback.

### 4.7 Trigger functions back to exact baseline SHA-256 — PASS

```
                 proname                  |                              sha256
------------------------------------------+------------------------------------------------------------------
 prevent_unsafe_order_dependency_mutation | 98c626552eb4fe75728dc7c64648e2a50b952f9503dd4b7060550d8e5219f631
 record_order_item_inventory_sale         | c14f31465132476698f4f587cc15849bf3a535f919eab51dd0c0ab35f45dee3c
 refresh_order_financial_snapshot_trigger | a99c1a1d43f9a1423952f169dede585ec0f88ac8178d9ef72c5f32342e1435a4
```

Character-for-character identical to the three baseline fingerprints.

### 4.8 All objects introduced by the five migrations are gone — PASS

```
 tables | constraints | indexes | user_triggers | functions
--------+-------------+---------+---------------+-----------
    185 |         529 |     574 |            32 |       181
```

Exactly the Gate 0 baseline (peak during the exercise: 200 / 610 / 613 / 43 / 191).
Fifteen tables, eighty-one constraints, thirty-nine indexes, eleven triggers and ten
functions were added and then fully removed.

### 4.9 Original data and schema fingerprint restored — PASS

```
        schema_fingerprint
----------------------------------
 7ba395295f65b3a66598a12f64b05ce8
```

After step 6 cleanup:

```
 oir | orders | inv |           oir_checksum           |         orders_checksum          |             stock_ck
-----+--------+-----+----------------------------------+----------------------------------+----------------------------------
 100 |     37 | 185 | b6869d395e02e5c8f962b18e201ba8ad | 9f0293b25b260574971b81b376e41b18 | 8a77629d4fb27604d623f671ac922030
```

All three checksums are byte-identical to the §1 pre-state. Note that
`orders_checksum` matching is a strong result in its own right: the backfill and its
rollback both fire `refresh_order_financial_snapshot_trigger`, which rewrites
`orders.items_subtotal_snapshot` / `formula_total_snapshot` /
`rounding_adjustment_snapshot` — those recomputed values returned to their exact
original state.

And the decisive check, a row-count diff across **all 185 tables**:

```
$ diff counts_baseline.txt counts_final.txt && echo "NO DIFFERENCES"
NO DIFFERENCES
```

---

## 5. Reapplication — all five PASSED

| # | File | Result |
|---|---|---|
| 1 | `add_order_item_cost_snapshot.sql` | PASS |
| 2 | `add_orderitem_backfill_trigger_safety.sql` | PASS |
| 3 | `backfill_orderitems_from_jsonb.sql` | PASS — **73 rows** |
| 4 | `add_fulfillment_costing.sql` | PASS |
| 5 | `add_fulfillment_hardening.sql` | PASS |

### Second batch UUID — `a7cbf313-33cd-4174-84f4-237ccdca016e`

```
NOTICE:  Backfill batch a7cbf313-33cd-4174-84f4-237ccdca016e inserted 73 rows
         (unresolved=0, ambiguous=0, complete=t).
```

Identical to the first run — 73 rows, 0 unresolved, 0 ambiguous, reconciliation
complete. The backfill is deterministic across a full drop-and-rebuild cycle.

### Post-reapplication integrity

```
 oir_total | batch2_rows | original_rows | orders | inv |             stock_ck             | suppressed
-----------+-------------+---------------+--------+-----+----------------------------------+------------
       173 |          73 |           100 |     37 | 185 | 8a77629d4fb27604d623f671ac922030 |         73

 tables | indexes | user_triggers | functions
--------+---------+---------------+-----------
    200 |     613 |            43 |       191

 orders_with_mismatch
----------------------
                    0

      original_100_checksum
----------------------------------
 b6869d395e02e5c8f962b18e201ba8ad
```

- Objects present again (200 / 613 / 43 / 191).
- The **original 100 rows are byte-identical** to the §1 baseline checksum — the
  backfill never touched a pre-existing row.
- `orders_with_mismatch = 0`: for every order, relational line count now equals
  JSONB line count. Reconciliation is complete and consistent.
- Stock unchanged and `inventory_movements` still 185 across the entire exercise.

---

## 6. Blockers

**None.** No step failed, no proof was unobtainable, no safety boundary was
approached. The two items worth carrying forward are judgements, not blockers:

1. **The disclosed test-row technique (§2).** Because `inventory_movements` is
   immutable and no real order is hard-deletable, a *removable* application-created
   test row on this branch is only achievable via a synthetic non-audited order with
   `inventory_ledger_mode` briefly toggled inside one transaction. Any future rerun
   of this exercise faces the same constraint. A test row placed on a real order
   would be permanently undeletable and would permanently alter stock.

2. **MODE A vs MODE B (§3).** This run used MODE A (`backfill_drop_control_table='on'`)
   because the branch is disposable and the task requires proving every introduced
   object is gone. **A production emergency rollback must use the default MODE B**,
   which deliberately retains `orderitem_backfill_batches` as the audit trail. Under
   MODE B the result must be described as "rollback complete except for the retained
   audit table", never as an unqualified full rollback — the file says so explicitly
   and this verification does not license dropping that table in production.
