# Final Neon Rollback Test — `accounting-final-rollback-20260728`

**Executed:** 2026-07-28
**Project:** `shiny-tree-43710630` (fishweb)
**Rollback branch:** `br-twilight-cake-a4972nn6` — endpoint `ep-snowy-salad-a4uv1l7x`, database `neondb`, PostgreSQL 17.10
**Parent:** `br-patient-mouse-a4d4cgr4` (production) — never written to.

Purpose: prove the rollback begins from a **genuinely migrated** state, not an untouched
production clone, and that reversing it restores the production baseline.

---

## 1. Baseline (before anything was applied)

```
products = 114   products_active = 114   products_softdeleted = 0
active_zerocost = 1   active_instock_zerocost = 0
pubtables = 230  constraints = 730  indexes = 710  triggers = 32
orders = 42      order_items_relational = 112   inventory_movements = 194
stock_md5 = 30635a9204ba52d54b0ec2614cadc8a4    inventory_ledger_mode = enforce
```

Byte-identical to the verification branch's independently measured baseline and to the
owner-stated figures.

---

## 2. Forward chain (Phase 4) — proving a real migrated state

The same nine committed migrations, same order, same execution contract, same corrected
executor (see `final-neon-verify-result.md` §2). Every file SHA-256-verified against its
`HEAD` blob; each ran in one executor-owned transaction.

| # | Migration | Outcome | Duration |
|---|---|---|---|
| 1 | `add_order_item_cost_snapshot.sql` | APPLIED / COMMIT | 2230 ms |
| 2 | `add_orderitem_backfill_trigger_safety.sql` | APPLIED / COMMIT | 2960 ms |
| 3 | `backfill_orderitems_from_jsonb.sql` | APPLIED / COMMIT | 2999 ms |
| 4 | `add_fulfillment_costing.sql` | APPLIED / COMMIT | 7195 ms |
| 5 | `add_fulfillment_hardening.sql` | APPLIED / COMMIT | 13317 ms |
| 6 | `add_pim_line_identity.sql` | APPLIED / COMMIT | 2971 ms |
| 7 | `add_product_cost_resolution.sql` | APPLIED / COMMIT | 2971 ms |
| 8 | `fix_blocked_ips_timestamptz.sql` | APPLIED / COMMIT | 3280 ms |
| 9 | `drop_product_cost_zero_defaults.sql` | APPLIED / COMMIT | 4112 ms |

(SHA-256 values are identical to those tabulated in `final-neon-rollback-result.md`'s
sibling document, `final-neon-verify-result.md` §3 — the same committed blobs were used.)

Backfill batch: **`d68c2139-12ba-4938-a220-5f761fb31a9a`**, 83 rows inserted,
`unresolved=0, ambiguous=0, complete=t`. `aquavo.backfill_allow_unresolved` not set.

### Post-forward readiness (identical to the verification branch)

```
pubtables = 245                          resolution cols = 3
oir snapshot cols = 8                    fulfillment tables = 14
pim.line_id + pim_line_uidx = PRESENT    blocked_ips.expires_at = timestamp with time zone
products cost defaults = NULL,NULL,NULL  known/unresolved/verified_zero = 113/1/0
order_items_relational = 195             products/active = 114/114
stock_md5 = 30635a9204ba52d54b0ec2614cadc8a4   inventory_movements = 194
orderitem_backfill_batches rows = 1
```

The branch was therefore in a genuinely migrated state before rollback began.

---

## 3. Rollback partner discovery

Every forward migration's rollback partner was found as a **committed repository file**
(`migrations/<name>_rollback.sql`), confirmed by the `EXECUTION CONTRACT` headers and the
audit documentation. All nine exist, all nine matched `HEAD` (working tree == blob), and
none contains a top-level transaction command.

| Forward migration | Committed rollback partner | SHA-256 |
|---|---|---|
| `add_order_item_cost_snapshot.sql` | `add_order_item_cost_snapshot_rollback.sql` | `8811d78cc24830e1c70c61b11d1194918d73e6afe516a7ad4132044715dd1ae4` |
| `add_orderitem_backfill_trigger_safety.sql` | `add_orderitem_backfill_trigger_safety_rollback.sql` | `7a969e6fff28dd838442d90c9ba7f648229d13c04673bc77ba5a76eb6a3e003a` |
| `backfill_orderitems_from_jsonb.sql` | `backfill_orderitems_from_jsonb_rollback.sql` | `9baedea40786549c6d9cd00c3b16dd3304b8a2d6c20930444d9246edc43a0f44` |
| `add_fulfillment_costing.sql` | `add_fulfillment_costing_rollback.sql` | `80fb2b54da93ed0f3c932e71e9321a3adfe185476facd29ccf686cb46f291296` |
| `add_fulfillment_hardening.sql` | `add_fulfillment_hardening_rollback.sql` | `8a7d97347556de33a7e8fc0c214e85f2fd881ac9e95a70b35724ea3282c510b4` |
| `add_pim_line_identity.sql` | `add_pim_line_identity_rollback.sql` | `c105afb2b0ef55774544380e848eb877374e3d2dd5141ab9237bd3d442b82ec2` |
| `add_product_cost_resolution.sql` | `add_product_cost_resolution_rollback.sql` | `4e3fdaa8f87e44f6b1900ef7f1ba6ed93660ad643d653740aba4b31393176708` |
| `fix_blocked_ips_timestamptz.sql` | `fix_blocked_ips_timestamptz_rollback.sql` | `1deb966884d3dff4b1038eae7c22ac6e4d7a593124f212630c54c201f80b9494` |
| `drop_product_cost_zero_defaults.sql` | `drop_product_cost_zero_defaults_rollback.sql` | `3a8f2cbcb3fff67cbc460c9745843b59b10325c7d94cf2430a162662062a23df` |

No rollback file was invented and no destructive SQL was inferred.

---

## 4. Rollback execution (safe reverse dependency order)

| Order | Rollback file | Outcome | Duration |
|---|---|---|---|
| 1 | `drop_product_cost_zero_defaults_rollback.sql` | APPLIED / COMMIT | 3575 ms |
| 2 | `fix_blocked_ips_timestamptz_rollback.sql` | APPLIED / COMMIT | 2117 ms |
| 3 | `add_product_cost_resolution_rollback.sql` | APPLIED / COMMIT | 2529 ms |
| 4 | `add_pim_line_identity_rollback.sql` | APPLIED / COMMIT | 2424 ms |
| 5 | `add_fulfillment_hardening_rollback.sql` | APPLIED / COMMIT | 11151 ms |
| 6 | `add_fulfillment_costing_rollback.sql` | APPLIED / COMMIT | 3958 ms |
| 7 | `backfill_orderitems_from_jsonb_rollback.sql` | APPLIED / COMMIT | 2200 ms |
| 8 | `add_orderitem_backfill_trigger_safety_rollback.sql` | APPLIED / COMMIT | 2059 ms |
| 9 | `add_order_item_cost_snapshot_rollback.sql` | APPLIED / COMMIT | 1875 ms |

### Data backfill rollback — exact batch scoping

Pre-rollback row accounting:

```
order_items_relational total          = 195
tagged batch d68c2139-…               =  83
untagged (must survive)               = 112
tagged with any OTHER batch           =   0
```

The committed rollback identifies its rows by `metadata #>> '{backfill,batch_id}'`, and
refuses to proceed unless the selected count equals the audited `rows_inserted`; it
re-verifies the deleted count in-transaction and aborts on mismatch. Both GUCs were
supplied transaction-locally (`aquavo.backfill_batch_id`,
`aquavo.backfill_rollback_authorized`).

```
NOTICE: Batch d68c2139-12ba-4938-a220-5f761fb31a9a rolled back: 83 rows deleted (matches audit record).
NOTICE: Control table RETAINED (MODE B: production audit trail). Rollback is complete except for this documented exception.
```

Post-rollback: `order_items_relational` = 112 — exactly the 112 untagged pre-existing
rows. **No unrelated order item was removed.**

Audit evidence preserved: the `orderitem_backfill_batches` row for this batch survives
with `rolled_back_at = 2026-07-28 03:25:50.541217+00`.

---

## 5. Post-rollback state vs the production baseline

| Requirement | Result |
|---|---|
| No product resolution columns | PASS — 0 remain |
| Product cost defaults restored | PASS — `'0'::numeric` on all three (see §6, difference 2) |
| Fulfillment additions removed | PASS — 0 fulfillment/packaging tables remain |
| Blocked-IP schema restored | PASS — `blocked_ips.expires_at` back to `timestamp without time zone` |
| PIM identity rollback complete | PASS — table dropped, so `line_id` and `pim_line_uidx` are gone |
| Cost snapshot / backfill rollback complete | PASS — 0 snapshot columns; 83 batch rows deleted; `orderitem_trigger_safety_audit` dropped |
| Product count remains 114 | PASS |
| Active product count remains 114 | PASS |
| No soft-deleted products | PASS — 0 |
| Orders and inventory preserved | PASS — orders 42, `inventory_movements` 194, `stock_md5` `30635a92…` unchanged |
| No synthetic smoke-test residue | PASS — the minimal smoke test on this branch created no persistent rows |

```
products = 114  products_active = 114  products_softdeleted = 0
active_zerocost = 1  active_instock_zerocost = 0
pubtables = 231  constraints = 731  indexes = 711  triggers = 32
orders = 42  order_items_relational = 112  inventory_movements = 194
stock_md5 = 30635a9204ba52d54b0ec2614cadc8a4
```

---

## 6. Schema comparison: rollback branch vs production

The Neon API schema-diff endpoint returned `HTTP 413 — Branch schema too large to diff`,
so the comparison was performed as a catalog fingerprint comparison. Production was read
**read-only** through the read-only Neon MCP; the rollback branch was read over its own
connection.

| Category | Production | Rollback branch | Fingerprint |
|---|---|---|---|
| tables | 230 | 231 | differs (+1) |
| columns | 3068 | 3079 | differs (+11) |
| constraints | 730 | 731 | differs (+1) |
| indexes | 710 | 711 | differs (+1) |
| triggers | 32 | 32 | **identical** (`57fc400d…`) |
| routines | 181 | 181 | **identical** (`e2e83d11…`) |
| products (id+stock) | 114 | 114 | **identical** (`30635a92…`) |
| orders | 42 | 42 | identical |
| order_items_relational | 112 | 112 | identical |

Excluding the single retained control table, the fingerprints match production **exactly**:

| Category | Production | Rollback branch minus `orderitem_backfill_batches` |
|---|---|---|
| tables | 230 / `c8ce50a4086c4e894bd6859b686fa973` | 230 / `c8ce50a4086c4e894bd6859b686fa973` |
| constraints | 730 / `4162ca44fec615406574508f670689f4` | 730 / `4162ca44fec615406574508f670689f4` |
| indexes | 710 / `2f8a913b19e402d0c5aba78aab0b230e` | 710 / `2f8a913b19e402d0c5aba78aab0b230e` |

### Every remaining difference, explained

**Difference 1 — the retained backfill control table.**
`orderitem_backfill_batches` (11 columns, 1 PK constraint, 1 PK index) is deliberately
kept. This is the committed rollback contract's **MODE B: production audit trail**,
stated in the rollback's own `NOTICE`. Retaining it is what preserves the evidence that
the batch ran and was reversed (`rolled_back_at`). Dropping it requires the explicit
`aquavo.backfill_drop_control_table = 'on'` GUC, which was deliberately not set.
This fully accounts for the +1 table, +11 columns, +1 constraint and +1 index.

**Difference 2 — textual form of the three `products` cost defaults.**
Per-table column fingerprints matched production for `blocked_ips`, `login_attempts`,
`orders`, `inventory_movements` and `order_items_relational`. Only `products` differed —
same 32 columns, different signature. The cause:

| Column | Production | After rollback |
|---|---|---|
| `cost_price` | `0` | `'0'::numeric` |
| `packaging_cost` | `0` | `'0'::numeric` |
| `insert_cost` | `0` | `'0'::numeric` |

Production's default was written as an unquoted integer literal (`SET DEFAULT 0`);
the committed rollback writes a quoted literal (`SET DEFAULT '0'`, lines 29–31 of
`drop_product_cost_zero_defaults_rollback.sql`), which PostgreSQL canonicalises to
`'0'::numeric`. Both are the numeric zero default and are semantically identical —
verified in-database: `(0::numeric) = ('0'::numeric)` → `t`, both `pg_typeof` → `numeric`.
The difference is cosmetic catalog text only; insert behaviour is unchanged.

**No unexplained difference remains.**

---

## 7. Safety statement

* Only `NEON_ROLLBACK_DATABASE_URL` was used for writes on this branch; never printed,
  logged, persisted or committed.
* Production was read **read-only** (catalog metadata only) and never written.
* No branch was promoted, reset, deleted or created.
* `session_replication_role` was never set; no trigger was globally disabled.
* No rollback file was invented; no destructive SQL was inferred where a committed
  rollback was absent — all nine partners exist and were used verbatim from `HEAD`.
