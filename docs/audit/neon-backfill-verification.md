# Backfill Verification — `orders.items` (JSONB) → `order_items_relational`

**Branch:** `br-round-dust-a4t0kt58` (verification branch). Production untouched.
**Batch UUID:** `1833092b-4c7f-4835-9038-dca33e1ce33d`
**Result:** 73 rows inserted, 0 inventory movements created, 0 original rows modified, 0 stock change.

---

## D. Reconciliation report BEFORE the backfill

`migrations/backfill_orderitems_reconcile_report.sql`, run read-only against the branch after operations 1–2, before the backfill.

**Report A — line validity by reason code**

```
 reason_code | lines | orders_affected
-------------+-------+-----------------
 (valid)     |   173 |              37
```

**Report B — unresolved lines in detail**

```
 order_id | jsonb_index | product_id | quantity_raw | price_raw | total_raw | reason_code
----------+-------------+------------+--------------+-----------+-----------+-------------
(0 rows)
```

**Report C — canonical reconciliation summary**

```
 jsonb_lines_valid | relational_rows | exact_matches | missing_lines | surplus_relational_rows | ambiguous_duplicate_groups | metadata_disagreements | deterministic_missing_lines
-------------------+-----------------+---------------+---------------+-------------------------+----------------------------+------------------------+-----------------------------
               173 |             100 |           100 |            73 |                       0 |                          0 |                      0 |                          73
```

### Recorded counts

| Quantity | Value |
|---|---|
| Exact matches | **100** |
| Deterministic missing lines | **73** |
| Unresolved lines | **0** |
| Ambiguous duplicate groups | **0** |
| Surplus relational rows | **0** |
| Metadata disagreements | **0** |
| Variant disagreements | **0** (no variant-key mismatch appears; surplus and metadata-disagreement counts are both 0, which is the report's variant-level signal) |

**Because unresolved lines = 0 and ambiguous groups = 0, no override GUC was needed.**
`aquavo.backfill_allow_unresolved` was **never set**. Only the deterministic path was used.

---

## E. Trigger-safety proofs on the real branch

All proofs ran against the live verification branch with `inventory_ledger_mode='enforce'` and all three
`order_items_relational` triggers active. Synthetic rows use the `SYNTH-VERIFY-` prefix.

**Fixtures** — order `07ed9e6a-416b-4e0e-88cd-b6b8f2cae630` (audited, `order_is_hard_deletable = false`),
product `houyi-tracheal-suction-cup` (canonical MAIN balance 96, so the real `prevent_negative_inventory_balance()`
guard does not mask results). Two synthetic control rows in `orderitem_backfill_batches`:

* `11111111-1111-1111-1111-111111111111` — **open** (`finished_at IS NULL`) ⇒ insert-suppression eligible
* `22222222-2222-2222-2222-222222222222` — **finished** (`finished_at` set) ⇒ rollback-delete eligible
* `99999999-9999-9999-9999-999999999999` — **never inserted** ⇒ eligible for nothing

The whole harness ran inside one transaction that was **`ROLLBACK`-ed**, so no synthetic row survived.

> An earlier attempt used a product with zero canonical balance; the insert failed inside
> `prevent_negative_inventory_balance()` *at the movement INSERT statement* — which itself demonstrates the
> movement was being attempted, i.e. not suppressed. The fixture was changed to an in-stock product so every
> proof yields a clean positive/negative result rather than an unrelated guard error.

### Results

| # | Proof | Expectation | Observed | Verdict |
|---|---|---|---|---|
| 1 | Normal INSERT, no GUC, no metadata (`SYNTH-VERIFY-P1`) | movement created | `movements = 1` | **PASS** |
| 2 | Forged metadata naming a **real, eligible** batch, **no GUC** (`P2`) | metadata alone cannot bypass | `movements = 1` | **PASS** |
| 3 | Correct metadata, session context **removed** (`RESET`, GUC reads `<unset>`) (`P3`) | cannot bypass | `movements = 1` | **PASS** |
| 4a | GUC = `9999…` and metadata = `9999…` (batch absent from control table) (`P4A`) | wrong batch cannot bypass | `movements = 1` | **PASS** |
| 4b | GUC = open batch but metadata = a *different* batch (`P4B`) | mismatch cannot bypass | `movements = 1` | **PASS** |
| 5 | **Exact** approved open batch in GUC **and** metadata (`P5`) | movement suppressed + audited | `movements = 0`, `audit_rows = 1` (`inventory_sale_suppressed`) | **PASS** |
| 6 | Normal audited DELETE, no authorization (`P1`) | blocked | `SQLSTATE P0001: order 07ed9e6a-… is audited and its dependent records cannot be removed or detached`; row still present | **PASS** |
| 7 | Exact authorized finished batch + **both** GUCs, DELETE (`P7`) | allowed + audited | `DELETE 1`, `row_remaining = 0`, `audit_rows = 1` (`audited_delete_authorized`) | **PASS** |
| 8 | Application-created row (no `backfill` key) + full rollback authorization (`P1`) | still blocked | same `P0001` audited-order exception; row still present | **PASS** |

Two additional hardening proofs beyond the required eight:

| # | Proof | Observed | Verdict |
|---|---|---|---|
| 8b | GUC = open batch, but application row with **no** backfill metadata, INSERT | `movements = 1` (not suppressed) | **PASS** |
| 8c | Backfill row of a **different** batch than the authorized one, DELETE | blocked with the same `P0001` exception; row still present | **PASS** |

Real error message captured verbatim for proofs 6, 8 and 8c:

```
NOTICE:  P6 RESULT=BLOCKED sqlstate=P0001 message=order 07ed9e6a-416b-4e0e-88cd-b6b8f2cae630
         is audited and its dependent records cannot be removed or detached
```

### State before rollback (8 synthetic inserts, 1 suppressed)

```
        id        |              meta_batch
------------------+--------------------------------------
 SYNTH-VERIFY-P1  |
 SYNTH-VERIFY-P2  | 11111111-1111-1111-1111-111111111111
 SYNTH-VERIFY-P3  | 11111111-1111-1111-1111-111111111111
 SYNTH-VERIFY-P4A | 99999999-9999-9999-9999-999999999999
 SYNTH-VERIFY-P4B | 22222222-2222-2222-2222-222222222222
 SYNTH-VERIFY-P5  | 11111111-1111-1111-1111-111111111111
 SYNTH-VERIFY-P8B |
(7 rows)              -- P7 already deleted by proof 7

 synth_movements
-----------------
               7   -- 8 inserts, exactly 1 suppressed (P5)
```

### Cleanup proof (after `ROLLBACK`)

```
 synth_order_items            | 0
 synth_movements              | 0
 synth_audit                  | 0
 control_table_should_be_null |      (NULL — orderitem_backfill_batches gone)
 order_items_total            | 100
 inventory_movements_total    | 185
```

Every synthetic row is gone and both totals are back at their pre-proof baselines.

---

## F. Backfill execution

The batch UUID was generated **inside the executor transaction** and installed as a transaction-local GUC
before the migration body ran, so the trigger's suppression exception could see it at INSERT time:

```sql
BEGIN;
  SELECT set_config('aquavo.backfill_batch_id', gen_random_uuid()::text, true) AS batch_uuid;
  -- aquavo.backfill_allow_unresolved deliberately NOT set (0 unresolved, 0 ambiguous)
  \i migrations/backfill_orderitems_from_jsonb.sql
COMMIT;
```

Required GUCs, derived from the SQL itself:

| GUC | Set? | Why |
|---|---|---|
| `aquavo.backfill_batch_id` | **Yes**, `SET LOCAL` via `set_config(..., true)` | Mandatory. STEP 3.0 raises and writes nothing without it; the trigger exception is keyed off it and must see it before the INSERT fires. |
| `aquavo.backfill_allow_unresolved` | **No** | Override for unresolved/ambiguous data only. Both counts were 0, so it was correctly withheld. |
| `aquavo.backfill_rollback_authorized` | **No** | Delete-exception only; irrelevant to a forward backfill. |

**Batch UUID: `1833092b-4c7f-4835-9038-dca33e1ce33d`**

```
NOTICE:  Backfill batch 1833092b-4c7f-4835-9038-dca33e1ce33d inserted 73 rows
         (unresolved=0, ambiguous=0, complete=t).
```

Control row:

```
               batch_id               | rows_inserted | unresolved_lines | ambiguous_groups | reconciliation_complete | finished | rolled_back_at
--------------------------------------+---------------+------------------+------------------+-------------------------+----------+----------------
 1833092b-4c7f-4835-9038-dca33e1ce33d |            73 |                0 |                0 | t                       | t        |
```

---

## G. Post-backfill proofs

### G1 — the original 100 rows are byte-for-byte unchanged

Pre-state md5 captured **inside** the backfill transaction over all 100 rows:
`c9d4bc78ab43435d22e22197912eb503`. Recomputed afterwards over exactly the rows that carry no
`backfill` metadata key (i.e. the originals), using the identical expression:

```
 proof | original_rows |             oir_md5              | matches_pre_snapshot
-------+---------------+----------------------------------+----------------------
 G1    |           100 | c9d4bc78ab43435d22e22197912eb503 | t
```

And no original row acquired a cost-snapshot value:

```
 G1b   | originals_with_any_cost_field_set = 0
```

**PASS** — identical checksum, identical row count, no cost columns populated on historical rows.

### G2 — only the deterministic-missing rows were inserted

```
 proof | total_rows | backfilled_rows | rows_in_batch | distinct_batches | control_rows_inserted
-------+------------+-----------------+---------------+------------------+-----------------------
 G2    |        173 |              73 |            73 |                1 |                    73
```

73 inserted = the 73 `deterministic_missing_lines` from §D. Every inserted row is tagged to the single
batch `1833092b-…`; there is exactly one distinct batch id. 100 + 73 = 173. **PASS**

### G3 — ZERO inventory movements created by the backfill

```
 proof | movements_now | movements_before | movements_for_backfilled_rows | movements_referencing_backfill | suppressions_audited
-------+---------------+------------------+-------------------------------+--------------------------------+----------------------
 G3    |           185 |              185 |                             0 |                              0 |                   73
```

Movement count unchanged (185 → 185); no movement carries an `order_item:<backfilled id>` idempotency key;
no movement's metadata references a backfilled line. All 73 suppressions are recorded in
`orderitem_trigger_safety_audit` for this batch — the suppression is provable even though the movements
never existed. **PASS**

### G4 — stock balances did not change

```
 proof | products |            stock_md5             | matches_pre_snapshot
-------+----------+----------------------------------+----------------------
 G4    |      143 | cc1f84635c7ec9453a238437f0adff6d | t
```

**PASS** — checksum over all 143 products' stock identical to the pre-migration snapshot.

### G5 — backfilled costs are NULL (unknown), never zero

```
 proof | backfilled_rows | unit_cost_null | packaging_null | insert_null | any_zero_cost | status_unknown | source_none
-------+-----------------+----------------+----------------+-------------+---------------+----------------+-------------
 G5    |              73 |             73 |             73 |          73 |             0 |             73 |          73
```

All three cost columns NULL on all 73 rows; **zero** rows carry a `0` cost; `cost_snapshot_status='unknown'`
and `cost_snapshot_source='none'` on all 73. The NULL-not-zero rule holds. **PASS**

### G6 — no duplicate lines

```
 G6a | duplicate_ids                   = 0
 G6b | canonical_keys_over_represented = 0
```

No duplicate primary keys, and no canonical identity `(order, product, variant_key, quantity, price, total)`
is represented more times in the relational table than in the source JSONB. **PASS**

### G7 — re-running the backfill inserts ZERO rows (idempotency)

Re-run with a fresh executor-generated UUID (`69fd8b6f-9b35-4750-94ce-af9623876d3b`):

```
ERROR:  ABORT: reconciliation incomplete — 0 unresolved line(s) [none], 1 ambiguous duplicate group(s).
        Review with backfill_orderitems_reconcile_report.sql. To proceed anyway, set
        "SET LOCAL aquavo.backfill_allow_unresolved = 'on';" in the same transaction.
```

State immediately afterwards:

```
 oir | batches | mov
-----+---------+-----
 173 |       1 | 185
```

**PASS — zero rows inserted**, and reported honestly: the re-run does not fall through to a no-op notice,
it **fails closed** on the fail-closed ambiguity gate and rolls back. Both idempotency facts hold:

1. the post-backfill reconciliation reports `deterministic_missing_lines = 0` — there is nothing left to insert; and
2. the actual re-run wrote nothing: still 173 rows, still 1 batch, still 185 movements, and no second batch row was opened.

**Why the ambiguity flag appeared (analysed, not waved away).** The report marks a
`(order, product, quantity, price)` cluster ambiguous when the JSONB side holds more than one distinct
`variant_key` **and** some relational row in that cluster has `variant_key = '~none~'`. Two JSONB clusters
have multiple variants:

```
               order_id               |          pid           | qty | price | variants |        keys
--------------------------------------+------------------------+-----+-------+----------+---------------------
 29fc8ce5-a1f2-4007-a735-00f426840584 | houyi-oxygenation-tube |   1 |  2500 |        2 | 4m-black | 4m-white
 6f11d0f2-960d-4cfc-9ebb-09c84543d6ec | houyi-oxygenation-tube |   1 |  2500 |        2 | 4m-white | ~none~
```

Only the second intersects a `'~none~'` relational row — and it does so *because the backfill correctly
inserted the counterpart of a JSONB line that genuinely has no variant information at all*. Line-by-line
comparison of that order shows a perfect 1:1 correspondence:

```
    src     | idx |           pid           |    vk    | q  |   p
------------+-----+-------------------------+----------+----+-------
 jsonb      |   5 | houyi-stainless-shunt   | 4-port   | 2  | 7000
 jsonb      |   4 | houyi-oxygenation-tube  | 4m-white | 1  | 2500
 jsonb      |   1 | houyi-check-valve       | ~none~   | 10 | 150
 jsonb      |   3 | houyi-oxygenation-tube  | ~none~   | 1  | 2500
 jsonb      |   2 | houyi-terminalia-leaves | ~none~   | 30 | 240
 jsonb      |   6 | yee-02938a              | ~none~   | 1  | 11249
 jsonb      |   8 | yee-c1-1073-1a          | ~none~   | 1  | 6993
 jsonb      |   7 | yee-c1-1124-1           | ~none~   | 1  | 5850
 relational |     | houyi-stainless-shunt   | 4-port   | 2  | 7000
 relational |     | houyi-oxygenation-tube  | 4m-white | 1  | 2500
 relational |     | houyi-check-valve       | ~none~   | 10 | 150
 relational |     | houyi-oxygenation-tube  | ~none~   | 1  | 2500
 relational |     | houyi-terminalia-leaves | ~none~   | 30 | 240
 relational |     | yee-02938a              | ~none~   | 1  | 11249
 relational |     | yee-c1-1073-1a          | ~none~   | 1  | 6993
 relational |     | yee-c1-1124-1           | ~none~   | 1  | 5850
```

Eight JSONB lines, eight relational rows, identical on every canonical field. The flag is a definitional
side-effect of the ambiguity heuristic once the table is complete, not an unmatched or mispaired line —
confirmed independently by `missing_lines = 0` and `surplus_relational_rows = 0` below. The fail-closed
behaviour is correct and conservative: a second backfill run cannot proceed without explicit owner override.

### G8 — valid orders reconcile

`migrations/backfill_orderitems_reconcile_report.sql` re-run after the backfill:

```
 reason_code | lines | orders_affected
-------------+-------+-----------------
 (valid)     |   173 |              37

 order_id | jsonb_index | product_id | quantity_raw | price_raw | total_raw | reason_code
----------+-------------+------------+--------------+-----------+-----------+-------------
(0 rows)

 jsonb_lines_valid | relational_rows | exact_matches | missing_lines | surplus_relational_rows | ambiguous_duplicate_groups | metadata_disagreements | deterministic_missing_lines
-------------------+-----------------+---------------+---------------+-------------------------+----------------------------+------------------------+-----------------------------
               173 |             173 |           173 |             0 |                       0 |                          1 |                      0 |                           0
```

**PASS** — 173 JSONB lines, 173 relational rows, **173 exact matches**, 0 missing, 0 surplus,
0 metadata disagreements, 0 remaining deterministic-missing lines, across all 37 orders. Full
line-by-line reconciliation. The single `ambiguous_duplicate_groups` entry is analysed under G7 above.

---

## Summary

| Section | Result |
|---|---|
| A — per-operation integrity gate (×5) | PASS |
| D — pre-backfill reconciliation | 100 exact / 73 deterministic-missing / 0 unresolved / 0 ambiguous / 0 surplus / 0 metadata disagreements |
| E — trigger-safety proofs (8 required + 2 extra) | 10/10 PASS, all synthetic data cleaned up and cleanup proven |
| F — backfill | 73 rows, batch `1833092b-4c7f-4835-9038-dca33e1ce33d`, no override GUC used |
| G — post-backfill proofs (8) | 8/8 PASS |
