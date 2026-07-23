# `order_items_relational` Backfill vs. Production-Only Triggers — Safety Design

Scope: the two live-production-only trigger functions captured verbatim in
`docs/audit/orderitem-trigger-forensics.md` — `record_order_item_inventory_sale()`
and `prevent_unsafe_order_dependency_mutation()` — and how
`migrations/backfill_orderitems_from_jsonb.sql` (owned by another workstream,
not edited here) can coexist with them safely.

Files delivered by this workstream:
- `migrations/add_orderitem_backfill_trigger_safety.sql`
- `migrations/add_orderitem_backfill_trigger_safety_rollback.sql`
- `server/__tests__/orderitem-trigger-safety.test.ts`
- this document

## 1. Why this exists

Production has three triggers on `order_items_relational` that appear in NO
committed migration. Two of them can break a historical backfill:

- `record_order_item_inventory_sale()` — fires on every INSERT and, while
  `settings.inventory_ledger_mode='enforce'` (the live value), writes a
  negative `sale` row into `inventory_movements`. Backfilling historical order
  lines for already-delivered, already-stock-adjusted orders would create
  movements for units the application-code stock path already accounted for —
  an internally inconsistent, double-counted ledger (§3–4 of the forensics doc).
- `prevent_unsafe_order_dependency_mutation()` — fires on DELETE or
  UPDATE-of-`order_id` and raises unless `order_is_hard_deletable(order_id)`.
  All 12 gap orders are `delivered/paid/cod_received=true`, so this is `false`
  for all of them (§5 of the forensics doc) — meaning a batch-scoped backfill
  rollback (`DELETE ... WHERE metadata #>> '{backfill,batch_id}' = ...`) would
  be unconditionally blocked for exactly the rows the backfill needs to be
  reversible for.

Since production was changed outside version control, this migration's job is
to `CREATE OR REPLACE` both functions from their captured live definitions —
preserving every existing behaviour exactly — and add the narrowest possible
exceptions so the ONE approved, batch-tagged backfill can (a) insert with no
new movement and (b) have its own batch deleted by its own rollback, without
opening any bypass for anything else.

## 2. Design

### 2.1 Session-local parameters (no defaults, nothing persists past the tx)

| GUC | Used by | Meaning |
|---|---|---|
| `aquavo.backfill_batch_id` | both functions | the batch id under way (insert) or being rolled back (delete) |
| `aquavo.backfill_rollback_authorized` | delete exception only | a SEPARATE flag; the batch id alone is never sufficient for a delete |

Both are read with `current_setting(name, true)` (the `true` = "missing-ok,
return NULL" form) — a session that never sets them observes NULL, and NULL
never satisfies any of the six-condition checks below. Ordinary application
traffic never sets either GUC, so ordinary traffic is provably unaffected —
every check that gates the exception fails closed on `NULL`.

### 2.2 `record_order_item_inventory_sale()` — inventory-sale exception

Inserted immediately after the ORIGINAL `inventory_ledger_mode<>'enforce'`
early-return (so when the ledger is not in enforce mode, behaviour is
byte-for-byte unchanged — the function still returns on the first branch).
Skips movement creation (no INSERT into `inventory_movements` at all) only when
**all six** hold, re-evaluated on every single row:

1. `current_setting('aquavo.backfill_batch_id', true)` is non-empty.
2. `NEW.metadata->'backfill'->>'batch_id'` is present on the inserted row.
3. The two values are textually identical.
4. That id exists as a row in `orderitem_backfill_batches`.
5. That row's `source`/`migration` identify the ONE approved backfill:
   `source='orders.items'`, `migration='backfill_orderitems_from_jsonb.sql'`.
6. That row is the batch **currently being written by this same transaction**:
   `finished_at IS NULL AND rolled_back_at IS NULL`.

**Why rule 6 is `finished_at IS NULL`, not "latest batch":**
`backfill_orderitems_from_jsonb.sql` opens the batch row FIRST
(`INSERT ... RETURNING batch_id`) and only stamps `finished_at` AFTER every row
for that batch has been inserted (its own STEP 3e). At the exact moment this
AFTER-INSERT trigger fires for a row belonging to that open batch,
`finished_at` is necessarily still NULL — that is not a loophole, it is the
one and only moment in the batch's lifecycle this trigger can observe it. A
FINISHED batch (`finished_at` set) can never again satisfy rule 6, so a
completed batch cannot be "reopened" to suppress movements for a later,
unrelated insert that happens to forge the same batch id (test: *"a FINISHED
batch cannot suppress a movement for a new, unrelated insert"*). This is also
literally what "latest batch" auto-selection was explicitly forbidden for
avoiding: rule 6 is a property of the SPECIFIC batch row a caller names, not
an implicit "most recent" lookup — there is no `ORDER BY ... LIMIT 1` anywhere
in either function.

Every suppression is recorded, in the same INSERT-triggering statement, to
`orderitem_trigger_safety_audit` (`event_type='inventory_sale_suppressed'`,
`batch_id`, `order_item_id`, `order_id`, `detail`) — this is the evidence
trail: "the movement was suppressed" is provable even though the movement row
itself never existed.

If any one condition fails, the function falls through to the **ORIGINAL,
completely unmodified** logic: MAIN-location lookup, `RAISE EXCEPTION` if
unconfigured, and the same `INSERT ... ON CONFLICT (idempotency_key) DO
NOTHING` as before.

### 2.3 `prevent_unsafe_order_dependency_mutation()` — audited-delete exception

This function is generic — it takes the order-id column name as `TG_ARGV[0]`
and could in principle be attached to triggers on other tables. The exception
is therefore scoped as tightly as the function's own generality allows:

- `TG_OP` must be exactly `'DELETE'` — never `'UPDATE'`. An order-id
  **reassignment** is never authorized by this exception, only removal of a
  batch's own rows (test: *"a row shaped like backfill but wrapped in an
  UPDATE of order_id is STILL blocked"* — even with the authorization GUC
  set).
- `TG_TABLE_NAME` must be exactly `'order_items_relational'` — a
  differently-shaped table reusing this same function (no `metadata` column,
  different semantics) takes the ORIGINAL path unconditionally; the exception
  code never even evaluates `OLD.metadata` for another table.

Given both of those, skip the `RAISE EXCEPTION` only when **all six** hold:

1. `current_setting('aquavo.backfill_rollback_authorized', true) = 'on'` — a
   dedicated flag, deliberately independent of the batch id (two separate
   settings must both be supplied; the batch id alone never authorizes a
   delete, unlike the insert-exception where the batch id textually matching
   the row IS most of the proof).
2. `current_setting('aquavo.backfill_batch_id', true)` is non-empty and casts
   to a valid `uuid` (a malformed value never authorizes anything — caught
   explicitly with `EXCEPTION WHEN others`).
3. `OLD.metadata->'backfill'->>'batch_id'` equals that batch id exactly.
4. That batch exists in `orderitem_backfill_batches`, its `source`/`migration`
   match the approved backfill, **and** it is eligible for rollback:
   `finished_at IS NOT NULL AND rolled_back_at IS NULL` — completed (never
   delete out of a batch still being written) and not already reversed. This
   is the SAME eligibility rule
   `migrations/backfill_orderitems_from_jsonb_rollback.sql` itself enforces
   before issuing its own `DELETE` (`v_rec.finished_at IS NULL` and
   `v_rec.rolled_back_at IS NOT NULL` both raise there) — the two guards agree
   on what "eligible" means by construction, not by coincidence.
5. The row is backfill-created: `OLD.metadata IS NOT NULL AND OLD.metadata ?
   'backfill'`, checked explicitly and not left as an implicit side-effect of
   condition 3 (an application-created row has no `backfill` key at all, so
   condition 3's comparison would be `NULL = '<uuid>'` → `NULL`/false anyway —
   but the design deliberately does not rely on that alone; see §3, threat 4).
6. `TG_OP = 'DELETE'` (restated for the record; already the outer gate).

Every authorized bypass is recorded to `orderitem_trigger_safety_audit`
(`event_type='audited_delete_authorized'`) BEFORE the row is allowed to
proceed to deletion.

If any one condition fails, the function falls through to the **ORIGINAL,
completely unmodified** guard: `IF old_order_id IS NOT NULL AND NOT
order_is_hard_deletable(old_order_id) THEN RAISE EXCEPTION ...`.

### 2.4 Evidence table

`orderitem_trigger_safety_audit` (owned and dropped by this workstream — never
an `ALTER TABLE` on `orderitem_backfill_batches`, which another workstream
owns) — append-only, one row per exception firing, `event_type` constrained
to the two known values. Chosen over "increment a counter column on the batch
row" because:
- it needs zero coordination with the batch table's owner (no schema
  dependency on that table's shape beyond reading its existing columns);
- it records the SPECIFIC row and quantity/product affected, not just a
  count — useful for a later audit trying to reconcile exactly which order
  lines had their movement suppressed or their delete authorized;
- it is trivially droppable in the rollback without touching any table this
  workstream doesn't own.

### 2.5 Rollback

`add_orderitem_backfill_trigger_safety_rollback.sql` `CREATE OR REPLACE`s both
functions with the captured-live `$function$...$function$` bodies from
`docs/audit/orderitem-trigger-forensics.md` §2, verbatim, character-for-
character, and drops `orderitem_trigger_safety_audit`. It touches nothing
else — no other table, no other function, no `order_items_relational` rows.

## 3. Threat model

| # | What a careless operator or attacker could try | Why it fails |
|---|---|---|
| 1 | Set `aquavo.backfill_batch_id` to a real, in-flight batch id on an ordinary application INSERT, hoping to suppress its movement | The row also needs `metadata->'backfill'->>'batch_id'` to equal that id (condition 2/3). Application-created rows never carry a `backfill` key at all — SET LOCAL alone, on a row with no matching metadata, never satisfies the match. |
| 2 | Forge `metadata.backfill.batch_id` on an application row to some plausible-looking UUID, with no GUC set | Condition 1 requires the session GUC to ALSO be set and match; a forged metadata value with no matching session context falls straight through to the original path (test 2). |
| 3 | Forge BOTH the row metadata and the session GUC to the same made-up UUID that was never actually opened as a batch | Condition 4 re-queries `orderitem_backfill_batches` for that literal id inside the SAME transaction — a non-existent batch id fails `EXISTS(...)` regardless of what the row or GUC claim (test 5). Trusting row metadata alone is exactly what was forbidden; every bypass re-validates against the persisted control-table row. |
| 4 | Reuse a batch id that DID exist and finish successfully, weeks later, to suppress a movement on a brand-new unrelated insert | Rule 6 (`finished_at IS NULL`) is false for any completed batch — the insert-exception can only ever fire for the exact narrow window while that specific batch is still being written (test: "a FINISHED batch cannot suppress..."). |
| 5 | Set only `aquavo.backfill_batch_id` (correct value) and attempt a DELETE, without the `rollback_authorized` flag | Two independent settings are required; the batch id alone never authorizes a delete (test 8b). |
| 6 | Set both delete-exception GUCs correctly, but target the wrong order item's id (right GUCs, row from a DIFFERENT batch) | Condition 3 compares the ROW's own `metadata.backfill.batch_id` against the GUC — a row from another batch fails the textual match regardless of what GUC is active (test 8). |
| 7 | Set both delete-exception GUCs correctly, target an application-created row that happens to sit on an audited (non-hard-deletable) order | Condition 5 (`OLD.metadata ? 'backfill'`) is false for any application row — explicitly checked, not inferred — so the exception never fires for a row with no backfill provenance, full stop (test 9, plus a `NULL`-metadata variant). |
| 8 | Attempt to reuse the delete-exception on an `UPDATE ... SET order_id = ...` (order reassignment) instead of a `DELETE`, hoping the same GUCs work | The outer gate requires `TG_OP = 'DELETE'` explicitly; an UPDATE never even evaluates the six conditions and always takes the original guard (test 9a). |
| 9 | Try to reuse `prevent_unsafe_order_dependency_mutation()` on some OTHER table that also uses `TG_ARGV[0]='order_id'`, expecting the exception to apply there too | The outer gate also requires `TG_TABLE_NAME = 'order_items_relational'` explicitly — any other table's trigger call takes the unconditional original path; `OLD.metadata` is never referenced for another table's row shape. |
| 10 | Attempt a blanket bypass — `ALTER TABLE ... DISABLE TRIGGER`, `session_replication_role`, `DISABLE TRIGGER ALL` | None of these are used anywhere in either migration. They are explicitly out of scope by the owner-locked policy; the exceptions here are function-body `IF` branches, re-validated per row against a persisted control table, not a session-wide or role-wide switch. |
| 11 | Roll back the SAME batch twice (double-delete / re-run the rollback script after it already succeeded) | Condition 4's eligibility check (`rolled_back_at IS NULL`) fails the second time — the batch's own rollback migration (owned separately) already stamps `rolled_back_at` on success, and this function reads that same column live. |
| 12 | Delete a batch's rows while the batch is still mid-insert (partial batch, another session racing the backfill) | Condition 4 requires `finished_at IS NOT NULL` — a batch with `finished_at` still NULL is never eligible for the delete-exception, matching `backfill_orderitems_from_jsonb_rollback.sql`'s own `IF v_rec.finished_at IS NULL THEN RAISE EXCEPTION` guard. |

## 4. PGlite fixture — what was simplified, and why it doesn't weaken the proof

The test recreates: `settings`, `inventory_locations`, `products`, `orders`,
`payment_events`, `cash_settlement_items`, `inventory_movements`,
`order_items_relational`, `orderitem_backfill_batches`,
`order_is_hard_deletable()`, `prevent_negative_inventory_balance()` (+ its
trigger), and the two functions under test with their two triggers — all
copied verbatim from the forensics capture where applicable.

Cut, and why each cut does not weaken the proof:

- **`project_inventory_movement_to_product_stock()`** (AFTER INSERT ON
  `inventory_movements` → writes `products.stock`/`variants`) — not modeled.
  It runs strictly AFTER the movement row this migration's guard decides to
  create or suppress; nothing about whether a movement was created depends on
  what happens to it afterward. Its absence cannot make a suppressed movement
  look created, or vice versa — the assertions are on `inventory_movements`
  row counts directly, before any projection would run.
- **`refresh_order_financial_snapshot_trigger()`** (the third live trigger on
  `order_items_relational`) — not modeled. Its called procedure
  (`refresh_order_financial_snapshot`) was not captured verbatim in the
  forensics pass and this migration does not touch it at all (it is untouched
  by `CREATE OR REPLACE` here). Including a stub for it would add fixture
  surface without exercising anything this migration changed.
- **`reject_inventory_movement_mutation()`** (immutability guard on
  `inventory_movements` UPDATE/DELETE) — not modeled. No test here updates or
  deletes an `inventory_movements` row; irrelevant to the six-condition guards
  under test.
- **`products.variants` jsonb / variant-product shape** — not modeled; all
  fixture products are non-variant (`variant_id` always NULL on movements).
  Neither guard branches on variant vs. non-variant status.

What WAS modeled despite being extra work: `prevent_negative_inventory_balance()`
(BEFORE INSERT ON `inventory_movements`), because omitting it would make every
`record_order_item_inventory_sale()` INSERT trivially succeed regardless of
starting balance — an unrealistically permissive fixture. Every test product
is seeded with an opening `inventory_reconciliation` movement (mirroring the
real one-time `owner_approved_storefront_opening` batch documented in the
forensics doc §9) before any order-line insert, so the negative-balance guard
is live and exercised exactly as it would be in production.

## 5. Test results

`npx vitest run server/__tests__/orderitem-trigger-safety.test.ts` — **22
passed, 0 failed** (covers the 10 required proofs plus supporting checks: pre-
migration baseline behaviour, post-migration behaviour-preservation controls,
an UPDATE-of-order_id negative control, a wrong-table-shaped negative control
via `TG_TABLE_NAME`, and a `NULL`-metadata variant of the application-row
guard).

| # | Required proof | Test name | Result |
|---|---|---|---|
| 1 | Normal application insert still records a movement | "1. a normal application insert records an inventory movement" (pre- and post-migration) | PASS |
| 2 | Backfill-shaped insert, no valid session context, still records a movement | "2. a backfill-SHAPED insert with NO valid session context still records a movement" | PASS |
| 3 | Exact approved backfill insert creates ZERO movements | "3. exact approved backfill insert (all 6 conditions) creates ZERO inventory movements" | PASS |
| 4 | Wrong batch UUID in the GUC cannot bypass | "4. wrong batch UUID in the GUC cannot bypass" | PASS |
| 5 | Forged metadata batch_id, no matching batch row, cannot bypass | "5. forged metadata.backfill.batch_id with no matching batch row cannot bypass" | PASS |
| 6 | Normal audited-row deletion remains blocked | "6. normal audited-row deletion remains BLOCKED" (pre- and post-migration) | PASS |
| 7 | Exact batch rollback deletion succeeds | "7. exact batch rollback deletion SUCCEEDS" | PASS |
| 8 | Wrong-batch deletion remains blocked | "8. wrong-batch deletion remains BLOCKED" (+ "8b." missing-authorization-flag variant) | PASS |
| 9 | Application-created rows can never be deleted via the exception | "9. application-created rows (no metadata.backfill) can NEVER be deleted via the exception" (+ NULL-metadata variant) | PASS |
| 10 | Rollback restores original definitions EXACTLY | "10. rollback restores the original function definitions EXACTLY" | PASS |

Test 10 compares the SHA-256 of PGlite's own `pg_get_functiondef()`
reconstruction, post-rollback, directly against the fingerprints captured LIVE
against real production in `docs/audit/orderitem-trigger-forensics.md` §2:

```
record_order_item_inventory_sale:          c14f31465132476698f4f587cc15849bf3a535f919eab51dd0c0ab35f45dee3c
prevent_unsafe_order_dependency_mutation:  98c626552eb4fe75728dc7c64648e2a50b952f9503dd4b7060550d8e5219f631
```

Both matched exactly. A negative control in the same test confirms the
POST-FORWARD-MIGRATION (modified) function hashes do NOT already equal these
fingerprints, so the match after rollback is a real assertion, not a
vacuously-true comparison against an unmodified function.

## 6. SHA-256 of the delivered migration files

```
ee96e878f98a53c8f303fc0f6be1c629da883cc4e6d2edbc01a717ce73c7cb89  migrations/add_orderitem_backfill_trigger_safety.sql
7a969e6fff28dd838442d90c9ba7f648229d13c04673bc77ba5a76eb6a3e003a  migrations/add_orderitem_backfill_trigger_safety_rollback.sql
```

## 7. Residual risk not eliminated locally

- **No live Neon verification.** This agent is explicitly forbidden from
  connecting to Neon. Everything above is proven against a PGlite fixture
  built from the forensics doc's verbatim captures, not against the real
  database. Before this migration is ever applied to production, someone with
  read/write access should re-run `pg_get_functiondef` on the live functions
  immediately before AND after applying it, and diff both against this
  design's expected before/after text, exactly as the PGlite test does
  locally.
- **`refresh_order_financial_snapshot()` is unverified.** The third trigger on
  `order_items_relational` (`order_items_refresh_financial_snapshot`) and its
  called procedure were out of scope for this workstream (not one of "the two
  functions") and were never captured verbatim in the forensics pass. This
  migration does not touch it, but its behaviour under a suppressed-movement
  backfill insert has not been independently verified here.
- **Execution ordering with the backfill migration is a coordination
  assumption, not something this migration can enforce.** For the insert
  exception to matter at all, `add_orderitem_backfill_trigger_safety.sql`
  must be applied to production BEFORE `backfill_orderitems_from_jsonb.sql`
  runs its INSERTs, in the SAME transaction the backfill runs (or an earlier
  one) — and the backfill's own executor must additionally
  `SET LOCAL aquavo.backfill_batch_id = '<the batch this file just opened>'`
  inside that same transaction, and the batch-rollback executor must
  additionally set `aquavo.backfill_rollback_authorized = 'on'` alongside the
  batch id `backfill_orderitems_from_jsonb_rollback.sql` already requires.
  Nothing in this file can force another workstream's executor to set that
  GUC; if it is never set, the insert exception simply never fires and the
  original double-counting problem the forensics doc describes recurs. This
  is a deliberate design property (fail-closed to the original, safer
  behaviour) but it means safe operation depends on the backfill's executor
  script actually setting the GUC, which is outside this file's control.
- **PGlite is not byte-identical to real Postgres in every respect** (it is a
  WASM reimplementation). The fixture's `pg_get_functiondef()` matching the
  real captured fingerprint (§5) is strong evidence the reconstruction
  behaves identically for these two functions specifically, but it is not a
  substitute for the live verification described above.
