# Neon Child-Branch Identity Gate (Gate 0)

**Date:** 2026-07-23
**Verifier:** coordinator session (independent, read-only)
**Result:** `BRANCH_IDENTITY_PASS`

> Supersedes the earlier `BRANCH_ENV_MISSING` revision of this file, which was written
> before the two child branches were created and before the environment variables were
> provisioned. Both conditions have since been satisfied and independently re-verified.

All credentials were parsed in memory only. No connection string, username, password,
or token appears in this document or in any command output retained by this audit.

---

## 1. Environment variables

| Variable | Present | Valid PostgreSQL URL | Scheme | Host (endpoint) | Database | Role | Credentials |
|---|---|---|---|---|---|---|---|
| `NEON_VERIFY_DATABASE_URL` | yes | yes | `postgresql:` | `ep-rapid-breeze-a46glg7f.us-east-1.aws.neon.tech` | `neondb` | `neondb_owner` | `[REDACTED]` |
| `NEON_ROLLBACK_DATABASE_URL` | yes | yes | `postgresql:` | `ep-broad-butterfly-a405p27r.us-east-1.aws.neon.tech` | `neondb` | `neondb_owner` | `[REDACTED]` |

Distinct endpoints: **confirmed** (`SAME_HOST = false`).

## 2. Endpoint → branch resolution (Neon MCP metadata)

| Endpoint | Branch ID | Branch name | Role in this exercise |
|---|---|---|---|
| `ep-rapid-breeze-a46glg7f` | `br-round-dust-a4t0kt58` | `accounting-fulfillment-verify-20260723` | **verification** |
| `ep-broad-butterfly-a405p27r` | `br-wispy-tree-a4ksj3t1` | `accounting-fulfillment-rollback-20260723` | **rollback** |
| `ep-quiet-moon-a4h7tdze` | `br-patient-mouse-a4d4cgr4` | `production` | **NOT referenced by either env var** |

Production isolation: neither environment variable resolves to the production endpoint
`ep-quiet-moon-a4h7tdze` / branch `br-patient-mouse-a4d4cgr4`. **Confirmed.**

## 3. Parentage

| Branch | Parent ID | Parent LSN | Parent timestamp |
|---|---|---|---|
| `br-round-dust-a4t0kt58` | `br-patient-mouse-a4d4cgr4` | `0/4AC59150` | `2026-07-23T06:53:39Z` |
| `br-wispy-tree-a4ksj3t1` | `br-patient-mouse-a4d4cgr4` | `0/4AC59150` | `2026-07-23T06:53:39Z` |

Both are **direct children of production**, branched at the **identical LSN**, so both
carry the same production schema, triggers and functions captured at branch creation.

Project: `shiny-tree-43710630` (`fishweb`) for both. **Confirmed.**

## 4. Read-only identity queries (executed against both branches)

| Property | `br-round-dust-a4t0kt58` | `br-wispy-tree-a4ksj3t1` | Match |
|---|---|---|---|
| PostgreSQL version | 17.10 (2947584) aarch64 | 17.10 (2947584) aarch64 | yes |
| Database | `neondb` | `neondb` | yes |
| Role | `neondb_owner` | `neondb_owner` | yes |
| Base tables (public) | 185 | 185 | yes |
| Constraints (public) | 529 | 529 | yes |
| Indexes (public) | 574 | 574 | yes |
| User triggers (public) | 32 | 32 | yes |
| Functions (public) | 181 | 181 | yes |
| **Schema fingerprint** | `7ba395295f65b3a66598a12f64b05ce8` | `7ba395295f65b3a66598a12f64b05ce8` | **yes** |
| `order_items_relational` rows | 100 | 100 | yes |
| `orders` rows | 37 | 37 | yes |

Schema fingerprint = `md5` over `relname:attname:type:notnull` for every column of every
ordinary table in `public`.

### Pre-migration object absence (both branches)

| Object | State |
|---|---|
| `public.order_items_relational` | present |
| `public.orders` | present |
| `public.order_item_backfill_control` | **absent** (expected — introduced by op 2) |
| `public.fulfillment_cost_lines` | **absent** (expected — introduced by op 4) |

## 5. `order_items_relational` trigger definitions and hashes

Identical on both branches:

| Trigger | Trigger-def SHA-256 | Function | Function-def SHA-256 |
|---|---|---|---|
| `order_items_guard_order_detach` | `1407b6613e9ae4164f0d866272ae95ea4b8b0f5265b6e5ec6fae99145918d27b` | `prevent_unsafe_order_dependency_mutation` | `98c626552eb4fe75728dc7c64648e2a50b952f9503dd4b7060550d8e5219f631` |
| `order_items_record_inventory_sale` | `7c188d100d6dc338acff697377d10f29c69ea17b478dd10e2021d509e339064a` | `record_order_item_inventory_sale` | `c14f31465132476698f4f587cc15849bf3a535f919eab51dd0c0ab35f45dee3c` |
| `order_items_refresh_financial_snapshot` | `81003c8d2705db2a9945c015064817bd8f94bcb74df41e4d9ab6d1f069f0fb17` | `refresh_order_financial_snapshot_trigger` | `a99c1a1d43f9a1423952f169dede585ec0f88ac8178d9ef72c5f32342e1435a4` |

These are the **baseline hashes** the rollback branch must return to after the reverse
sequence completes.

## 6. Frozen migration integrity (working tree vs committed Git blob)

All eleven files hash-match their `HEAD` blobs (SHA-256 of file bytes):

| File | SHA-256 | WT == Git blob |
|---|---|---|
| `add_order_item_cost_snapshot.sql` | `e507bce47ae334aa77de3df5b38ea2f53e3e656ea6d84f51a2433c4650b3b0ed` | yes |
| `add_orderitem_backfill_trigger_safety.sql` | `ee96e878f98a53c8f303fc0f6be1c629da883cc4e6d2edbc01a717ce73c7cb89` | yes |
| `backfill_orderitems_from_jsonb.sql` | `bbe942d34716dfc9941f8419559cc78fb45350bafd4faa8a24db962c758a3ac2` | yes |
| `add_fulfillment_costing.sql` | `ea34a32f5f3d84b5913ca700531941a5ba7f53edf9ba125aa865345a979901d1` | yes |
| `add_fulfillment_hardening.sql` | `5a7f43634f801f7dc2c77a5f621204c39b1ae1b9cf245a1377e2c67615547f47` | yes |
| `add_fulfillment_hardening_rollback.sql` | `8a7d97347556de33a7e8fc0c214e85f2fd881ac9e95a70b35724ea3282c510b4` | yes |
| `add_fulfillment_costing_rollback.sql` | `80fb2b54da93ed0f3c932e71e9321a3adfe185476facd29ccf686cb46f291296` | yes |
| `backfill_orderitems_from_jsonb_rollback.sql` | `9baedea40786549c6d9cd00c3b16dd3304b8a2d6c20930444d9246edc43a0f44` | yes |
| `add_orderitem_backfill_trigger_safety_rollback.sql` | `7a969e6fff28dd838442d90c9ba7f648229d13c04673bc77ba5a76eb6a3e003a` | yes |
| `add_order_item_cost_snapshot_rollback.sql` | `8811d78cc24830e1c70c61b11d1194918d73e6afe516a7ad4132044715dd1ae4` | yes |
| `backfill_orderitems_reconcile_report.sql` | `874f5d8e246373e55b15c5c2a5c3c38462009f8b84c0c12bde8b6e7c235f0c25` | yes |

## 7. Gate result

All nine Gate-0 requirements are satisfied.

```
BRANCH_IDENTITY_PASS
```

Write agents are authorised to proceed against the two child branches only.
