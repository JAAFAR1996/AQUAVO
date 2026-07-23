# Neon Child Branches — Identity Verification

**Agent:** NeonIdentityAgent (Agent 2) — read-only Neon MCP audit
**Date:** 2026-07-23
**Scope:** Verify existence/identity of the two planned child branches for the accounting/fulfillment verification-and-rollback workflow, and re-confirm the two local env vars are absent.

---

## VERDICT

# `BRANCH_ENV_MISSING`

**Exact blocker:** Neither planned child branch exists in the `fishweb` Neon project, and both required environment variables (`NEON_VERIFY_DATABASE_URL`, `NEON_ROLLBACK_DATABASE_URL`) are absent from the environment. The verification branch (`accounting-fulfillment-verify-20260723`) and the rollback branch (`accounting-fulfillment-rollback-20260723`) were never created — they do not appear anywhere in the project's branch inventory (23 branches enumerated, none matching those names). This blocks any workflow step that depends on connecting to those child branches.

---

## 1. Project Identity Evidence

Multiple independent signals confirm the target project:

| Signal | Value | Match |
|---|---|---|
| Project ID | `shiny-tree-43710630` | ✅ matches expected |
| Project name | `fishweb` | ✅ matches expected |
| Org ID | `org-sweet-glitter-04175211` | ✅ matches expected |
| Org name | `Eng` | (informational) |
| Platform / region | `aws` / `aws-us-east-1` | (informational) |
| Postgres version | 17 (confirmed live: `PostgreSQL 17.10` on aarch64, k8s-neonvm) | ✅ consistent |
| Database name (production branch) | `neondb` | (informational) |
| Connection role | `neondb_owner` | (informational) |

Retrieved via `list_projects` (search `"fishweb"`, returned exactly one project) and `describe_project`, cross-checked with a live `SELECT version()` against the production branch.

---

## 2. Production Branch Identity

| Field | Value |
|---|---|
| Branch ID | `br-patient-mouse-a4d4cgr4` | ✅ matches expected |
| Branch name | `production` |
| `primary` | `true` |
| `default` | `true` |
| `protected` | **`false`** |
| `current_state` | `ready` |
| Parent | none (root branch, `parent_lsn`/`parent_timestamp` present but no `parent_id` — it is the project's original/primary lineage root) |
| Created | 2025-11-04T02:09:40Z |
| Last state change | 2026-04-13T00:27:26Z |

**Note:** the production branch is confirmed primary/default by both the `primary: true` and `default: true` flags, but it is **not** marked `protected` in Neon (`protected: false`). This is a pre-existing project configuration fact, not something introduced by this audit — flagged here only because the task requires recording protected status.

---

## 3. Full Branch Inventory

19 branches total in the project (from `describe_project`), enumerated below. Timestamps are `updated_at`/`state_changed_at` from the API.

| Branch ID | Name | Parent ID | State | primary/default | protected |
|---|---|---|---|---|---|
| `br-patient-mouse-a4d4cgr4` | production | (root) | ready | true / true | false |
| `br-rapid-unit-a4maj64e` | database-repair-final-validation-20260722 | br-patient-mouse-a4d4cgr4 | ready | false / false | false |
| `br-rough-heart-a42qr8im` | production-restore-before-database-repair-20260723 | br-patient-mouse-a4d4cgr4 | ready | false / false | false |
| `br-divine-shadow-a4bjrxbs` | ledger-owner-rules-validation-20260723 | br-patient-mouse-a4d4cgr4 | ready | false / false | false |
| `br-ancient-morning-a47vz7bu` | production-restore-before-ledger-cutover-and-shipping-fix-20260723 | br-patient-mouse-a4d4cgr4 | ready | false / false | false |
| `br-cold-tooth-a4eghe8d` | production-restore-before-order-payment-reconciliation-20260723 | br-patient-mouse-a4d4cgr4 | ready | false / false | false |
| `br-summer-bar-a467617q` | production-restore-before-product-identity-fixes-20260723 | br-patient-mouse-a4d4cgr4 | ready | false / false | false |
| `br-late-credit-a4jtp4ll` | production-restore-before-yee-19939-content-fix-20260723 | br-patient-mouse-a4d4cgr4 | ready | false / false | false |
| `br-dry-cell-a4mfg8uc` | production-restore-before-inventory-supplier-import-20260723 | br-patient-mouse-a4d4cgr4 | ready | false / false | false |
| `br-royal-leaf-a4cszt3k` | production-restore-before-opening-balances-20260723 | br-patient-mouse-a4d4cgr4 | ready | false / false | false |
| `br-cold-shape-a4k7en3m` | production-restore-before-final-inventory-mappings-20260723 | br-patient-mouse-a4d4cgr4 | ready | false / false | false |
| `br-misty-voice-a45ytfz4` | mcp-migration-2026-07-13T08-53-31 | br-patient-mouse-a4d4cgr4 | ready | false / false | false |
| `br-green-cloud-a4drtbz2` | production_old_2026-04-12T22:27:00Z | (root) | archived | false / false | false |
| `br-noisy-cell-a4hwu1ys` | development | br-patient-mouse-a4d4cgr4 | archived | false / false | false |
| `br-patient-feather-a4pwlsxb` | br-patient-feather-a4pwlsxb | br-patient-mouse-a4d4cgr4 | archived | false / false | false |
| `br-lingering-silence-a4oz7n59` | production_old_2026-04-12T22:06:00Z | (root) | archived | false / false | false |
| `br-bitter-art-a45rc24z` | production_old_2026-04-12T10:27:00Z | (root) | archived | false / false | false |
| `br-old-mouse-a4ihokgt` | production_old_2026-04-11T22:00:00Z | (root) | archived | false / false | false |
| `br-proud-recipe-a41bjn5t` | production_old_2026-03-22T06:32:00Z | (root) | archived | false / false | false |
| `br-bitter-brook-a4g8svmw` | production_old_2026-03-22T11:32:00Z | (root) | archived | false / false | false |

**Total branches returned by `describe_project`: 19.**

### Search for the two planned child branches

Scanned every `name` field in the full inventory above for:
- `accounting-fulfillment-verify-20260723`
- `accounting-fulfillment-rollback-20260723`

**Result: NEITHER branch name appears anywhere in the project.** No branch with a matching or similar name exists. The branches present today are a mix of the live `production` branch, several `production-restore-before-*` safety snapshots and `*-validation-*` branches from unrelated 2026-07-22/23 workstreams (database repair, ledger cutover, order-payment reconciliation, product identity fixes, inventory/supplier import, opening balances, final inventory mappings), one MCP migration snapshot, and several archived historical production snapshots — none of them created for, or named after, the accounting-fulfillment verify/rollback workflow.

**Definitive statement:** The verification branch (`accounting-fulfillment-verify-20260723`) and the rollback branch (`accounting-fulfillment-rollback-20260723`) were **never created**. They do not exist in the `fishweb` project.

---

## 4. Environment Variable Presence Check

Presence-only check (no values printed, logged, or written anywhere):

| Variable | Status |
|---|---|
| `NEON_VERIFY_DATABASE_URL` | **ABSENT** |
| `NEON_ROLLBACK_DATABASE_URL` | **ABSENT** |

Checked via `[Environment]::GetEnvironmentVariable(...)` (process/user/machine scope) in the current shell — both returned empty/null. This independently re-confirms the coordinator's prior finding. (A `.env`-file scan was not repeated by this agent since the coordinator already established file-level absence; the process-environment check above is this agent's independent corroboration.)

---

## 5. Production Read-Only Baseline (reference only)

All queries below are read-only `SELECT` statements executed against the production branch (`br-patient-mouse-a4d4cgr4`), database `neondb`. No writes were made. No PII was read — aggregates/counts only.

| Metric | Value |
|---|---|
| Database name | `neondb` |
| Current user | `neondb_owner` |
| PostgreSQL version | `PostgreSQL 17.10 (2947584) on aarch64-unknown-linux-gnu, compiled by gcc (Debian 12.2.0-14+deb12u1) 12.2.0, 64-bit` |
| Public table count (`information_schema.tables`, schema=`public`, all table types incl. views) | 196 |
| Constraint count (`information_schema.table_constraints`, schema=`public`) | 1,761 |
| Index count (`pg_indexes`, schema=`public`) | 574 |
| Trigger count (`information_schema.triggers`, schema=`public`) | 50 |
| Function/routine count (`information_schema.routines`, schema=`public`) | 180 |
| Products count (`products`) | 143 |
| Orders count (`orders`) | 37 |
| JSONB line count (Σ `jsonb_array_length(orders.items)` over rows where `items` is a JSON array) | 173 |
| Relational line count (`order_items_relational` row count) | 100 |
| Covered-order count (distinct `order_id` in `order_items_relational`) | 25 |
| Schema fingerprint (`md5(string_agg(table_name, ',' ORDER BY table_name))` over `information_schema.tables`, schema=`public`) | `88b839d9f2e106c925e82348312b2975` |

**Note on JSONB vs relational line counts:** 173 JSONB lines vs 100 relational lines across only 25 of 37 orders covered — this baseline is captured for reference per the task instructions; no interpretation or remediation was performed by this agent (out of scope: identity/existence verification only).

---

## 6. Summary

- Project identity: **confirmed** (`shiny-tree-43710630` / `fishweb` / `org-sweet-glitter-04175211`).
- Production branch identity: **confirmed** (`br-patient-mouse-a4d4cgr4`, primary=true, default=true, **protected=false**).
- Planned child branches (`accounting-fulfillment-verify-20260723`, `accounting-fulfillment-rollback-20260723`): **do not exist** — confirmed absent from the full 19-branch inventory.
- `NEON_VERIFY_DATABASE_URL` / `NEON_ROLLBACK_DATABASE_URL`: **both absent**, independently re-confirmed.
- Production read-only baseline: captured above for reference.

**Verdict: `BRANCH_ENV_MISSING`** — both the required env vars and the two planned child branches are missing; the verify/rollback workflow cannot proceed until the branches are created and the connection strings are supplied via those env vars.
