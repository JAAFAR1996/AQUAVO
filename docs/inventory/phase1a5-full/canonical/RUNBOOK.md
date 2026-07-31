# RUNBOOK — full storefront-canonical inventory reconciliation

`canonical/` is the **only** executable source of truth. Anything under
`../archive/` is deprecated and must not be run.

State lives in `LAST_VERIFIED_STATE.json`. Update it at every phase transition.
Narrative lives in `00-project-state.md`.

---

## Order of operations

| # | file | target | writes | gate before running |
|---|---|---|---|---|
| 1 | `01-preflight.sql` | fresh test branch | none | branch created from Production |
| 2 | `02-test-apply.sql` | fresh test branch | 2 INSERTs | `01` clean, no category D |
| 3 | `03-test-verify.sql` | fresh test branch | none | `02` committed |
| 4 | `04-post-settlement-tests.sql` | fresh test branch | rolled back | `03` all expectations met |
| 5 | `05-production-preflight.sql` | **Production** | none | `04` passed; run again after backup |
| 6 | `06-production-apply.sql` | **Production** | 2 INSERTs | owner token + backup branch exist |
| 7 | `07-production-post-verify.sql` | **Production** | none | `06` committed, new session |
| 8 | `08-first-real-order-watch.sql` | **Production** | none | first real customer order arrives |

## Constants — do not improvise

| | test | production |
|---|---|---|
| `movement_type` | `manual_adjustment` | `manual_adjustment` |
| `source_type` | `owner_stock_reconciliation` | `owner_stock_reconciliation` |
| `source_id` | `FULL-INVENTORY-STOREFRONT-TRUTH-TEST` | `FULL-INVENTORY-STOREFRONT-TRUTH-PRODUCTION` |
| `created_by` | `owner:jaafar` | `owner:jaafar` |
| `execution_id` | `FULL-INV-TEST-<UTC_TIMESTAMP>` | `FULL-INV-PROD-<UTC_TIMESTAMP>` |
| idempotency key | `fullinv:test:storefront-truth:<product_id>:<variant_id\|NULL>:<execution_id>` | `fullinv:production:storefront-truth:<product_id>:<variant_id\|NULL>:<execution_id>` |

`movement_type='adjustment'` is forbidden and is not in
`inventory_movements_type_check` anyway.

## Adjustment rules

| category | target ledger | adjustment |
|---|---|---|
| A | storefront stock | `storefront − ledger` |
| B | 0 | `0 − ledger` |
| C | storefront stock | `storefront − 0` |
| D | — | `BLOCKED_FOR_OWNER_REVIEW`, never auto-corrected |

`adjustment = 0` → `SKIP_WITH_EVIDENCE`. Never write a zero-quantity movement;
`inventory_movements_quantity_check` forbids it and the row needs a record, not
a write.

Every adjustment is recomputed **inside the transaction, after the advisory
lock**. No numeric adjustment is ever copied from a plan or from the test
branch into Production.

## Transaction ownership

`02` and `06` contain **no** `BEGIN`/`COMMIT`/`ROLLBACK`. The caller owns the
transaction:

```bash
psql "$URL" -v ON_ERROR_STOP=1 --single-transaction -f 02-test-apply.sql
```

`--single-transaction` wraps the file; `ON_ERROR_STOP=1` turns any `RAISE` into
a full rollback. Never add a `BEGIN` to these files, and never split them into
per-row commits.

`04-post-settlement-tests.sql` is the exception: it manages its own explicit
transactions, every one ending in `ROLLBACK`, and must run with
`ON_ERROR_STOP=0` because tests 4 and 6 are *expected* to raise.

## Locking

Key shape is copied from `prevent_negative_inventory_balance`:

```
pg_advisory_xact_lock(hashtextextended(product_id || '|' || COALESCE(variant_id,'') || '|' || location_id, 0))
```

Taken `ORDER BY product_id, variant_id NULLS FIRST` so concurrent runs cannot
deadlock. Every value is re-read after the lock; any drift aborts the run.

## What the triggers do for us

We insert only into `inventory_reconciliations` and `inventory_movements`.
Everything else is existing machinery:

- `inventory_movements_prevent_negative` — BEFORE INSERT, takes the advisory
  lock, rejects a balance that would go negative
- `inventory_movements_project_product_stock` — AFTER INSERT, writes
  `products.stock` / `products.variants[].stock` and updates
  `product_variant_reconciliation`. For a variant absent from
  `products.variants` its products UPDATE is skipped by an `EXISTS` guard, so
  Category B never touches the storefront. It does not write `is_active`.
- `inventory_movements_immutable` — blocks UPDATE/DELETE. This is why the old
  test branch can never be cleaned and must not be reused.
- `products_a_enforce_variant_stock_projection` — keeps `products.stock` as the
  variant sum
- `order_items_record_inventory_sale` — the real order path, AFTER INSERT on
  `order_items_relational`, reads `metadata->>'variantId'`
- `reverse_order_inventory_on_terminal_status` — AFTER UPDATE OF status; writes
  `sale_reversal` with `source_type='order_status_reversal'` and key
  `order_reversal:<order_id>:<order_item_id>`. **It leaves
  `reversed_movement_id` NULL** — expect NULL, that is correct.

## Failure handling

Any assertion failure → full ROLLBACK. Do not retry, do not auto-correct, do not
patch Production. Fix the script, create a **new** test branch from Production,
and start the test sequence again. A failed test branch is never reused as a
clean baseline.

## Secrets

No file here contains a connection string, password or token. Operators pass
`TEST_BRANCH_URL` / `PROD_URL` as environment variables and branch ids as psql
`-v` variables. Never paste a URL into a file in this repo.
