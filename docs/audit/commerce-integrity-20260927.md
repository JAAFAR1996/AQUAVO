# AQUAVO commerce integrity audit — 2026-09-27

Release branch: `fix/system-audit-20260927`

## Production read-only baseline

- Active product/ledger stock reconciliation:
  - simple products: 0 mismatches
  - variant rows: 0 mismatches
  - variant parent totals: 0 mismatches
- Post-cutover order inventory:
  - sale movement mismatches: 0
  - terminal-status reversal mismatches: 0
- September non-test order financial checks:
  - line arithmetic errors: 0
  - subtotal/formula mismatches: 0
  - total/formula mismatches: 0
  - rounded-total mismatches: 0

## Remediation covered by this branch

- storefront availability reads no longer depend on stale commerce-critical product caching
- out-of-stock products remain discoverable but cannot be purchased
- PDP falls back to an in-stock variant when the configured default is sold out
- authenticated carts self-heal removed variants and return current variant price/label
- guest carts use the read-only `/api/cart/preflight` endpoint to reconcile current price/stock
- checkout refreshes cart truth before review and immediately before order creation
- live cart changes force a new review and clear temporary coupon/loyalty adjustments
- shipping-fee claims across checkout, MCP, AI, FAQ/SEO and article tooling use runtime settings
- coupon exhaustion rules are aligned across checkout, online payment and AI tooling
- migration `0088_allow_zero_stock_variant_shape_changes` preserves ledger-only quantity ownership while allowing zero-stock variant metadata/shape changes

## Release order

1. Apply migration 0088 to Production with the verified runner/checksum.
2. Re-run the inventory reconciliation baseline and require all three mismatch counts to remain zero.
3. Merge PR #254 into `main`.
4. Verify the production deployment and smoke-test catalogue, PDP variant selection, cart preflight and checkout.

Vercel PR previews were unavailable during this audit because the account exceeded the daily deployment limit; GitHub build/test gates are the release validation source until Production deployment is available.
