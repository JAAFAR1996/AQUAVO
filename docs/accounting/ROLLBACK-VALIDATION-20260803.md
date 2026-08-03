# Full reverse rollback validation — 2026-08-03

Disposable Neon branch: `accounting-v2-rollback-from-validated-20260803`.

The Accounting V2 objects were removed in reverse dependency order after the forward migrations and smoke data existed.

## Result

- PASS — immutable fact and settlement tables removed
- PASS — journal lines and entries removed
- PASS — readiness and order-accounting views removed
- PASS — evidence and tax-profile tables removed
- PASS — expense evidence/review columns removed
- PASS — V2 triggers and functions removed
- PASS — pre-V2 tax-finalization guard restored
- PASS — migrations 0051–0056 marked rolled back
- PASS — `delivered_at` retained because historical delivery evidence existed; destructive evidence deletion is intentionally prohibited

Production was not touched.
