# AQUAVO / محل المنبع — Accounting V2

## Cutover

- Effective: 2026-08-01 00:00 Asia/Baghdad
- Currency: IQD
- Legacy data remains read-only and outside the new monthly register except verified opening balances.

## COD policy

Customer gross already includes delivery.

Example:

- Customer pays: 30,000
- Customer delivery component: 5,000
- Carrier actual fee: 5,000
- Product revenue: 25,000
- AQUAVO merchant net: 25,000

Free delivery example:

- Customer pays: 25,000
- Customer delivery component: 0
- Carrier actual fee: 5,000
- Product revenue: 25,000
- AQUAVO merchant net: 20,000
- Delivery subsidy expense: 5,000

## Operator flow

1. Create/confirm order. No revenue is recognized yet.
2. Prepare and ship. Fulfillment material lifecycle runs with stock guards.
3. Mark delivered. Status, packaging lifecycle, COD payment event, immutable order accounting fact, COGS and journals commit atomically.
4. In Finance → السجل المحاسبي وملف المحاسب:
   - Review gross COD, customer delivery, carrier fee and AQUAVO net separately.
   - Upload the carrier statement and select unsettled orders.
   - The server computes totals from immutable facts and reconciles the settlement.
   - Upload expense receipts/PDFs; SHA-256 is calculated server-side before verification.
5. Resolve physical opening inventory and cost review flags using actual evidence.
6. Close the month administratively only when the readiness checklist is empty.
7. Tax finalization remains separate and requires a complete tax profile plus licensed accountant approval evidence.

## Safety

- Posted journals are immutable; corrections use reversal entries.
- Return events and verified expenses cannot be hard-deleted.
- The accountant package is marked non-tax-final until accountant approval is complete.
- Production migration requires explicit approval after temporary-branch verification.

## Verification

- Strict accounting TypeScript configuration includes all money-critical V2 routes.
- Contract tests prevent route unmounting, legacy-order shadowing, missing evidence upload, or migration rollback weakening.
- GitHub Actions runs strict typecheck, targeted tests, migration-ledger governance and a production build.
