# EXTERNAL OPERATOR PACKAGE — copy/paste sequence

**Status:** `EXTERNAL_OPERATOR_REQUIRED`
**Package path:** `docs/inventory/phase1a5-full/canonical/`
**Production verified read-only at:** 2026-07-30T04:32:58Z
**Decision:** `OWNER_CONFIRMED_CURRENT_STOREFRONT_AS_CANONICAL_INVENTORY_TRUTH`

This package covers the **test branch only**. Production execution is a separate
gate that needs the owner token — see the end of this file.

No connection string, password or token appears anywhere in this repository.
Everything below reads secrets from your shell environment.

---

## 0 — Environment

```bash
cd /path/to/A16/docs/inventory/phase1a5-full/canonical

export TS=$(date -u +%Y%m%dT%H%M%SZ)
export EXECUTION_ID="FULL-INV-TEST-${TS}"
export TEST_BRANCH_NAME="inventory-full-reconciliation-test-${TS}"

echo "TS=$TS"
echo "EXECUTION_ID=$EXECUTION_ID"
echo "TEST_BRANCH_NAME=$TEST_BRANCH_NAME"
```

## 1 — Create a fresh test branch from Production

Do **not** reuse `br-floral-voice-a4a0c5iu`: it holds two committed test
movements that `inventory_movements_immutable` makes unremovable, so it can
never be a clean baseline again. Do not delete it either.

```bash
neonctl branches create \
  --project-id shiny-tree-43710630 \
  --parent br-patient-mouse-a4d4cgr4 \
  --name "$TEST_BRANCH_NAME" \
  --output json > /tmp/newbranch.json

export TEST_BRANCH_ID=$(jq -r '.branch.id'          /tmp/newbranch.json)
export TEST_PARENT_ID=$(jq -r '.branch.parent_id'   /tmp/newbranch.json)
export TEST_CREATED_AT=$(jq -r '.branch.created_at' /tmp/newbranch.json)

echo "TEST_BRANCH_ID=$TEST_BRANCH_ID"
echo "TEST_PARENT_ID=$TEST_PARENT_ID"     # must be br-patient-mouse-a4d4cgr4
echo "TEST_CREATED_AT=$TEST_CREATED_AT"
```

Get the connection string into the environment **without printing it**:

```bash
export TEST_BRANCH_URL=$(neonctl connection-string \
  --project-id shiny-tree-43710630 \
  --branch-id "$TEST_BRANCH_ID" \
  --database-name neondb)

# sanity check that does NOT reveal the secret:
[ -n "$TEST_BRANCH_URL" ] && echo "TEST_BRANCH_URL is set (${#TEST_BRANCH_URL} chars)"
```

Never `echo "$TEST_BRANCH_URL"`, never paste it into a file, never send it to
anyone.

Report back: `TEST_BRANCH_NAME`, `TEST_BRANCH_ID`, `TEST_PARENT_ID`,
`TEST_CREATED_AT`.

## 2 — Preflight

```bash
psql "$TEST_BRANCH_URL" -v ON_ERROR_STOP=1 -f 01-preflight.sql \
  2>&1 | tee "preflight-${TS}.log"
```

**Stop if any of these fail:**
- `ledger_mode` is not `enforce`, or `main_location` is not
  `3bbe2906-3b51-44dd-825d-af94c4acf526`
- baseline counts/hashes differ from Production (43 / 201 / 114 / 220 / 215 /
  120 / 170 / 9 / 6 / 2 and the hashes printed inline) — a fresh child branch is
  byte-identical, so a difference means you are on the wrong branch
- `prior_test_movements` is not 0
- a category **D** row appears
- archived / active is not 23 / 97
- any trigger `tgenabled` is not `O`

Expected classification: **A 45 (−293) · B 23 (−135) · C 2 (+6) · MATCH 117 ·
NOOP 17 · no D.**

## 3 — Apply, as one transaction

```bash
psql "$TEST_BRANCH_URL" -v ON_ERROR_STOP=1 \
  -v execution_id="$EXECUTION_ID" \
  -v test_branch_id="$TEST_BRANCH_ID" \
  --single-transaction -f 02-test-apply.sql \
  2>&1 | tee "apply-${TS}.log"
```

`--single-transaction` is what makes the file one transaction — the file itself
contains no `BEGIN`/`COMMIT`. With `ON_ERROR_STOP=1`, any raised exception rolls
the whole thing back and nothing is written.

Expected tail: `A 45 (-293) | B 23 (-135) | C 2 (+6)` — 70 movements, net −422.

If it aborts: keep the log, **do not** rerun against this branch. Fix the
script, create a new branch, start again from step 1.

## 4 — Verify

```bash
psql "$TEST_BRANCH_URL" -v ON_ERROR_STOP=1 -f 03-test-verify.sql \
  2>&1 | tee "verify-${TS}.log"
```

Read every block; each states its own expectation inline. Headlines:
unsettled rows **0** · one movement-shape row (`manual_adjustment` /
`owner_stock_reconciliation` / `FULL-INVENTORY-STOREFRONT-TRUTH-TEST` /
`owner:jaafar` / 70) · archived variants 23, none with stock, none resurrected ·
`pvr_rows` still 120 · orders/order_items/costs hashes unchanged ·
movements 290, reconciliations 285 · `ledger_mode` still `enforce`.

## 5 — Post-settlement behaviour tests

```bash
psql "$TEST_BRANCH_URL" -v ON_ERROR_STOP=0 -f 04-post-settlement-tests.sql \
  2>&1 | tee "tests-${TS}.log"
```

`ON_ERROR_STOP=0` is deliberate — tests 4 and 6 are **expected** to raise:

- **T4** must fail with `insufficient canonical inventory balance for product
  houyi-white-sand, variant 2kg, ...`
- **T6** must fail with `duplicate key value violates unique constraint
  "inventory_movements_idempotency_key_key"`

If either of those *succeeds*, the settlement is unsafe — stop and report.

Every test ends in `ROLLBACK`. The final sweep must print
`0 | 0 | 0 | 43 | 201 | 290 | 285 | 170 | 9 | 2 | enforce`.

## 6 — Confirm Production is still untouched

```bash
psql "$PROD_READONLY_URL" -v ON_ERROR_STOP=1 -f 05-production-preflight.sql \
  2>&1 | tee "prod-check-${TS}.log"
```

A read-only role is sufficient and preferred here. Expect the same baseline as
2026-07-30T04:32:58Z and `existing_production_settlement_rows = 0`.

## 7 — Return these

- `TEST_BRANCH_NAME`, `TEST_BRANCH_ID`, `TEST_PARENT_ID`, `TEST_CREATED_AT`
- `EXECUTION_ID`
- the logs: `preflight-`, `apply-`, `verify-`, `tests-`, `prod-check-`
- whether T4 and T6 raised the expected errors

Do not include any connection string in what you send back.

---

## After this package

The results are checked against the inline expectations, then
`LAST_VERIFIED_STATE.json` and `00-project-state.md` advance to
`READY_FOR_OWNER_PRODUCTION_APPROVAL`.

Production execution (`06-production-apply.sql`) additionally requires:

1. a backup branch created from Production at approval time, named
   `production-backup-before-full-inventory-reconciliation-<UTC_TIMESTAMP>`
2. `05-production-preflight.sql` re-run **after** the backup, showing no
   category D and no unexplained drift
3. this exact phrase from the owner:

```
OWNER_APPROVES_FULL_STOREFRONT_CANONICAL_INVENTORY_RECONCILIATION
```

Nothing writes to Production before all three exist.
