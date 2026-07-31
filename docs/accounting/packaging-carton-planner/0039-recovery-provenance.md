# Migration 0039 — Governance Recovery Provenance

**Status:** file recovered into git. Production untouched.
**Recovered:** 2026-07-31, read-only session.

## The gap

Production's `public.schema_migrations` contains:

| field | value |
|---|---|
| `version` | `0039_accounting_phase1b_snapshot_writer_and_payment_ledger` |
| `checksum` | `7b76a29582d293d8413b32205afb38400f35faa06127d1a67f40c75f2ea30b11` |
| `applied_at` | `2026-07-30T15:19:58.891Z` |
| `applied_by` | `neondb_owner` |
| `rolled_back_at` | `null` |
| `notes` | Owner-authorized 2026-07-30; tested on br-muddy-night-a4kbk6l9; backup br-late-thunder-a42sjx9q; new order lines only; historical lines untouched; tax final remains fail-closed. |

The corresponding `.sql` file did not exist anywhere in the repository, in any
branch, or in git history. The numbered ledger (`0000`–`0039`) and the
descriptive `migrations/*.sql` files are two separate lineages; only the
descriptive ones were ever committed.

## How the content was derived

No part of this migration was guessed. The exact objects were obtained by
diffing two Neon branches, both read-only:

| role | branch | created |
|---|---|---|
| base (pre-0039) | `br-late-thunder-a42sjx9q` — *backup-before-accounting-phase1b-20260730* | `2026-07-30T15:18:39Z` |
| compare (post-0039) | `br-patient-mouse-a4d4cgr4` — *production* | — |

The backup predates the migration by **79 seconds**, so the diff is exactly 0039.

Neon's `compare_database_schema` returned `HTTP 413 Branch schema too large to
diff`, so the diff was computed manually with catalog signature queries
(`information_schema.tables` / `.columns`, `pg_proc`, `pg_trigger`,
`pg_constraint`, `pg_indexes`), hashed per category and then per first-letter
bucket to localise the difference.

### Diff result

| category | pre-0039 | post-0039 | verdict |
|---|---|---|---|
| tables | 250 | 250 | identical hash |
| constraints | 843 | 843 | identical hash |
| indexes | 767 | 767 | identical hash |
| columns | 3369 | 3386 | **+17** |
| functions | 193 | 194 | **+1** |
| triggers | 48 | 49 | **+1** |

Bucket analysis localised all 17 columns to tables beginning with `a`; every
other bucket hashed identically. The `+17` is not a table alteration — it is the
17 columns of a new **view**, which is why the base-table count did not move.

### The four components

1. **Function** `public.write_order_item_financial_snapshots()` — extracted
   verbatim with `pg_get_functiondef()`.
2. **Trigger** `order_items_b_write_financial_snapshots BEFORE INSERT ON
   public.order_items_relational` — extracted verbatim with
   `pg_get_triggerdef()`.
3. **View** `public.accounting_readiness_status` (17 columns) — extracted
   verbatim with `pg_get_viewdef(..., true)`.
4. **Settings**
   - `payment_ledger_enabled`: `'false'` → `'true'`
   - `financial_snapshot_writer_enabled`: absent → `'true'`

   Both confirmed by reading `public.settings` on each branch.

## Idempotency contract

Applying `0039_...sql` to Production performs **no change**:

- `CREATE OR REPLACE FUNCTION` writes a byte-identical body.
- The trigger is created inside a `DO $$ IF NOT EXISTS ... $$` guard, so it is
  skipped rather than dropped and recreated.
- `CREATE OR REPLACE VIEW` writes a byte-identical definition.
- Both settings writes carry `IS DISTINCT FROM` / `NOT EXISTS` guards and match
  the current values, so zero rows are updated.

`public.schema_migrations` is deliberately **not** written by the file. The
Production row already exists with its original checksum and timestamp.

## Verification procedure (requires a write-capable operator)

1. Create a fresh Neon branch from `br-late-thunder-a42sjx9q` (pre-0039).
2. Apply `migrations/0039_accounting_phase1b_snapshot_writer_and_payment_ledger.sql`.
3. Re-run the six category signature queries on that branch and on Production.
   **All six hashes must match.** That is the pass condition.
4. Separately, apply the same file to a fresh branch cut from Production and
   confirm all six hashes are unchanged — proving the no-op contract.

Until step 3 is executed, this file is *derived-and-reviewed* but not
*execution-verified*. See `docs/accounting/packaging-carton-planner/OPERATOR-RUNBOOK.md`.

## Preventing recurrence

`TOOLS/check-migration-ledger.mjs` fails CI when a numbered migration exists in
`public.schema_migrations` without a matching `migrations/<version>.sql`, or when
a numbered file has no ledger row after application. Every migration added by
this feature (`0040`–`0048`) follows the numbered convention and registers itself
in the ledger.
