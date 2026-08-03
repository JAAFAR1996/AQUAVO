# Draft PR review notes

## Review first

1. `migrations/0051_accounting_august_foundation.sql`
2. `migrations/0052_accounting_cod_delivery_settlements.sql`
3. `migrations/0053_accounting_expenses_returns.sql`
4. `migrations/0054_accounting_fulfillment_readiness.sql`
5. `server/routes/admin-orders-v2.ts`
6. `server/routes/accounting-operations-v2.ts`
7. `server/routes/accounting-v2.ts`
8. `server/routes/invoice-v2.ts`

## Expected invariants

- Customer gross includes delivery.
- Carrier fee is never product revenue.
- Product revenue + customer delivery = customer gross.
- Merchant net = customer gross - carrier fee.
- Delivery status creates one idempotent completed COD event.
- Every posted journal is balanced and immutable.
- Carrier settlements are derived from immutable order facts.
- Verified expenses require uploaded evidence and server-computed SHA-256.
- Administrative close and tax finalization are separate gates.

## Deployment order

1. Apply and verify database migrations on Production only after explicit approval.
2. Deploy application code.
3. Verify V2 health and zero-order August baseline.
4. Run one controlled order through delivery and settlement.
