# AQUAVO Inventory Reconciliation — Project State

**Last verified:** 2026-07-30T04:32:58Z (read directly from Production)
**Current phase:** `EXTERNAL_OPERATOR_REQUIRED`
**Next action:** `RUN_CANONICAL_TEST_PACKAGE_ON_FRESH_TEST_BRANCH`
**Production writes performed:** none, ever

If you are picking this up in a new session, read this file and
`LAST_VERIFIED_STATE.json`. Nothing else is needed. Do not restart the project.

---

## Owner decision

`OWNER_CONFIRMED_CURRENT_STOREFRONT_AS_CANONICAL_INVENTORY_TRUTH`

The storefront is the only truth for current stock:
- no variants → `products.stock`
- with variants → `products.variants[].stock`, per `product_id + variant_id`
- `products.stock` on a variant product is a trigger-derived projection of the
  variant sum and is never used to settle an individual variant

`inventory_movements` is adjusted to match the storefront. **The storefront is
never edited to match the ledger.**

## What is established

**Production identity** — Neon project `shiny-tree-43710630` (`fishweb`), branch
`br-patient-mouse-a4d4cgr4` (`production`, default, primary, parent none),
database `neondb`, role `neondb_owner`, PostgreSQL 17.10. MAIN location
`3bbe2906-3b51-44dd-825d-af94c4acf526` — the only location, and all 220
movements sit on it. `settings.inventory_ledger_mode = 'enforce'`.

**Production baseline** (unchanged across three separate audits on 2026-07-30 at
03:12Z, 03:45Z and 04:32Z — Production has not moved):

| table | count | hash |
|---|---|---|
| orders | 43 | `ca3b1e066ad48a9147747db36fff4693` |
| order_items_relational | 201 | `46eea063a9368999912fbbc620bb6714` |
| costs (snapshot cols) | — | `ff7a08ed5ad808c648d53970343f2c5d` |
| products | 114 | `cc11f2eca746af38b78812c23241da86` |
| inventory_movements | 220 | `1fbe8afbd7825f0d796daca6333b5a8f` |
| inventory_reconciliations | 215 | — |
| product_variant_reconciliation | 120 (97 active / 23 archived) | `3720adcda7eef5e8c2c01e0f4c04bed3` |
| notification_log | 170 | — |
| accounting_audit_trail | 9 | — |
| cost_ledger | 6 | `4ee36e6aa24324c9f47c8299807f60bc` |
| cash_settlements | 2 | — |

Financial totals: sum_total 2,206,314 · sum_rounded 2,155,920 · delivered
revenue 1,967,920 across 39 delivered orders. 185 of the 220 movements are
`opening_balance` (the 25/6 stocktake) — never touched.

**Classification** — rebuilt from scratch three times, identical each time:

| category | rows | net adjustment |
|---|---|---|
| A — in storefront and ledger, numbers differ | 45 | −293 |
| B — in ledger, variant no longer in `products.variants` | 23 | −135 |
| C — in storefront, stock > 0, no ledger rows at all | 2 | +6 |
| **D — anything else** | **0** | — |
| MATCH | 117 | 0 |
| NOOP (stock 0, no ledger) | 17 | 0 |

204 canonical rows, **70 differences, net −422**.

**Category B archiving is already done, automatically.** The audit traced the
mechanism to the existing trigger `sync_product_variant_reconciliation`, which
sets `is_active=false` on every `product_variant_reconciliation` row of a
product whenever `products.variants` changes, then reactivates only the variants
still present in the JSON. Production shows `is_active=false` on exactly 23 rows
— precisely the Category B set. The apply scripts therefore **assert** that
state and abort if a Category B row is still active. They never flip the flag by
hand and never delete the row.

**Category C has no variant case.** Both rows — `houyi-terminalia-leaves`
(stock 5) and `yee-c4-1067-1` (stock 1) — are `has_variants=false`,
`variant_id=NULL`. No "Category C variant" test was invented.

**Real order path** — attested by the owner as executed outside this session:

```
real_order_path_test_status:   externally_executed_owner_attested_passed
real_order_path_test_branch:   br-floral-voice-a4a0c5iu
real_order_path_test_method:   orders_and_order_items_relational_forced_rollback_transaction
real_order_path_test_result:   one_order_line_sale_movement_stock_50_to_49_then_full_rollback_zero_residue
real_order_path_test_executor: external_neon_write_connector
```

No Claude session executed this test.

## What has NOT been executed

Everything that writes. No test branch was created, no settlement was applied on
any branch, no post-settlement test was run, and Production has never been
written to. Every phase past the audit is packaged and waiting.

**Why:** the assistant's Neon MCP server is configured read-only — all
write-access tools are removed, and `get_connection_string` is denied by the
permission classifier. Neither was worked around. No password or production
connection string was ever requested from the owner.

## Corrections applied while consolidating

1. **Two competing file sets existed.** The older set (`_canonical_plan.sql`,
   `full-inventory-*.sql`, keys `phase1a5:test:`, source_id `PHASE-1A5-TEST`)
   was superseded by the newer set (keys `fullinv:test:`, source_id
   `FULL-INVENTORY-STOREFRONT-TRUTH-TEST`), which matches the owner's final
   naming. The old set now lives in `../archive/` with a
   `DEPRECATED — DO NOT EXECUTE` header on every file. `canonical/` is the only
   source of truth.

2. **The sale_reversal test was wrong and is fixed.** It asserted
   `reversed_movement_id` would point at the sale row. Reading the live
   `reverse_order_inventory_on_terminal_status` showed it does **not** populate
   that column — it links by `source_type='order_status_reversal'` and
   `idempotency_key='order_reversal:<order_id>:<order_item_id>'`, leaving
   `reversed_movement_id` NULL. The test now expects NULL as correct behaviour,
   and additionally proves a second terminal transition does not double-reverse
   (`ON CONFLICT DO NOTHING`).

3. **`executed_at` and the full real-order-path attestation** were added to
   every movement and evidence metadata block, and to the verification assertion
   that checks required keys are present.

4. **Hard-coded baseline numbers were removed from `02-test-apply.sql`.** It used
   to abort if `orders <> 43`, which would fire spuriously on a test branch cut
   after a genuine new customer order. It now freezes a snapshot inside the
   transaction (STEP 0b) and compares against that, so "nothing financial moved"
   fails only for the right reason. It also now proves that pre-existing
   movements were not altered and that `product_variant_reconciliation` gained
   and lost no rows.

5. **The superseded 8-row plan** at `docs/inventory/phase-1a5-reconciliation-plan-20260729.md`
   (decision code `OWNER_CONFIRMED_WEBSITE_STOCK_AS_CURRENT_TRUTH`) now carries a
   `DEPRECATED — DO NOT EXECUTE` banner pointing here. No two documents give
   conflicting operating instructions any more.

## Not committed to git — and why

The files are complete on disk but **were not committed**. This working tree uses
sparse-checkout in cone mode, and `/docs/` is not in the cone (allowed: `TOOLS`,
`api`, `client`, `e2e`, `migrations`, `public`, `script`, `scripts`, `server`,
`shared`, `test`). `git add` refuses every path under `docs/`. Staging them would
need `git add --sparse` or `git sparse-checkout add docs` — both change
repository configuration that was not authorised, so nothing was forced.

To commit manually:

```bash
git sparse-checkout add docs
git add docs/inventory/phase1a5-full docs/inventory/phase-1a5-reconciliation-plan-20260729.md
git commit -m "docs(inventory): consolidate canonical full reconciliation runbook"
```

No merge, no push, either way.

## Next step

Run `EXTERNAL_OPERATOR_PACKAGE.md` — create a fresh test branch from Production,
then `01` → `02` → `03` → `04`. Return the output. It will be verified against
the expectations written inline in each script, and this file plus
`LAST_VERIFIED_STATE.json` will be updated to the next phase.

After the test branch passes, Phase 4 produces the owner approval summary. The
production run needs, verbatim:

```
OWNER_APPROVES_FULL_STOREFRONT_CANONICAL_INVENTORY_RECONCILIATION
```

## Open risks

- **RISK-1 (medium)** — rows with real sale history (`houyi-net-bag/black-15x20`,
  `houyi-oxygenation-tube/4m-black`, `yee-c4-1123-1a/full`) can move between
  planning and execution. Mitigated: `06` recomputes under an advisory lock and
  turns `adjustment = 0` into `SKIP_WITH_EVIDENCE` rather than writing a
  zero-quantity movement.
- **RISK-2 (low)** — Category B retires 135 recorded units by settling 23 removed
  variants to 0. A deliberate consequence of the owner decision, not a defect.
  Every zeroing writes evidence; no historical movement is edited or deleted.
- **RISK-3 (low)** — Category C gives two products a ledger with no
  `opening_balance` entry. Explicit owner instruction, documented in metadata.

## Hard prohibitions, in force for every phase

No direct write to `products.stock` or `products.variants` · no UPDATE or DELETE
of any historical `inventory_movement` · no new or modified `opening_balance` ·
the 25/6 stocktake untouched · `inventory_ledger_mode` never disabled ·
`movement_type='adjustment'` never used · no price/cost/tax changes here · no
Phase 1B · no Snapshot Writer · no TAX FINAL · backup and test branches never
deleted · no password or connection string requested · no secrets in any file.
