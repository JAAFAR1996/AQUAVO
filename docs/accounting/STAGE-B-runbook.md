# Stage B — Runbook & Status

All code changes are **additive, reversible, and tested (228/228 server tests, 0 new type errors)**. They are safe to run *before* the DB migration — the accounting engine tolerates the snapshot columns being absent (it falls back to effective-dated cost).

## Code changes (working tree, not committed)
| File | Change |
|---|---|
| `shared/order-financials.ts` (new) | Canonical status sets, `toMoney`, `orderCollectedAmount`, `roundCollected` |
| `server/routes/accounting.ts` | Imports canonical helpers (pure refactor); `lineCostSnapshot()` prefers frozen snapshot; `estimatedCostLines` counter |
| `server/routes/analytics.ts` | Revenue = delivered-only `collected − shipping` (was `sum(total)` all statuses); AOV over realized orders |
| `server/routes/orders.ts` | COD notification sends `orderCollectedAmount()` (post-cashback payable) |
| `server/storage/invoice-storage.ts` | Parameterized stock update (SQL-injection fix), transaction, carries `discountTotal` |
| `server/storage/order-storage.ts` | Freezes cost snapshot onto new order lines (JSONB + relational) |
| `shared/schema.ts` | `OrderLineItem` + `order_items_relational` snapshot fields |
| `server/__tests__/order-financials.test.ts`, `cost-snapshot.test.ts` (new) + `orders-api.test.ts` (updated) | Coverage |

## DB steps (owner runs — I cannot write to prod; Neon MCP is read-only)
Apply **in order**, ideally on a Neon branch first:
1. `migrations/add_order_item_cost_snapshot.sql` — adds `unit_cost_price/unit_packaging_cost/unit_insert_cost` (additive, idempotent). Rollback: `add_order_item_cost_snapshot_rollback.sql`.
2. `migrations/backfill_orderitems_from_jsonb.sql` — **run STEP 1 (dry-run) first**, eyeball counts, then STEP 2 insert, then STEP 3 verify (expect 0 rows). Idempotent, FK-safe, tags rows `metadata.backfilled=true`. Rollback: `backfill_orderitems_from_jsonb_rollback.sql`.
   - Expected: ~12 orders backfilled (Stage A). Does NOT fabricate cost (snapshots = 0 → shown as estimated).
- **Never** `npm run db:push` (drifted tablesFilter). Apply these SQL files directly.

## Verified / rejected
- **Rejected on verification:** "duplicate analytics mount" — both `/api/admin/analytics` and `/api/analytics` are used by the client. No change.

## Still blocked
- **Writable Neon** — needed to branch-test the two migrations (owner chose branch-testing; MCP is read-only, so owner must re-auth full access or apply directly).
- **Admin credentials** — needed for the live browser baseline + post-implementation regression (a completion criterion).

## Not yet done (needs the above or Stage C decisions)
- Live browser baseline + regression audit.
- `financially_counted` is NULL on all 37 orders — accounting keys off `status=delivered` (verified), so revenue is unaffected; confirm the override semantics are intended.
- Stage C policy modules (see below) — designed, not activated.

## Stage C — owner decisions required before activating (do NOT choose silently)
Inventory valuation method · historical cost-backfill method · landed-cost allocation · delivery-revenue treatment · affiliate commission timing · ad-cost attribution · overhead allocation · **VAT/tax status confirmation** (research says Iraq has no VAT on aquarium equipment — needs accountant sign-off) · period-locking policy · any destructive correction. Each will be presented with options + data + recommendation + impact.

## Security (owner action, independent of code)
Rotate the 10 production secrets found in git history (see `docs/security/admin-financial-security.md`). Working tree is clean; commit is safe.
