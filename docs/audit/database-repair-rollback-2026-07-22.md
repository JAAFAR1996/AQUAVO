# AQUAVO Database Repair Rollback Procedure

Date: 2026-07-22

## Principle

The repair migrations are additive and do not update or delete existing product, order, invoice, payment, or legacy inventory rows. The primary rollback is therefore to disable the new runtime flags and restore the pre-migration Neon branch or point in time if deployment verification fails.

## Before production migration

Record:

- production branch ID;
- current LSN and timestamp;
- exact migration files and commit SHA;
- operator identity;
- a restore branch or confirmed point-in-time restore window;
- verification output before the migration.

Do not proceed without a recoverable production state.

## Immediate application rollback

Set:

```text
INVENTORY_LEDGER_MODE=off
PAYMENT_LEDGER_ENABLED=false
```

Redeploy the previously known-good application revision. These flags keep the new ledgers from becoming write paths while leaving the additive tables available for investigation.

## Database rollback before any canonical writes

If no production rows have been written to the new ledgers, restore the pre-migration branch or remove the additive objects in reverse dependency order after review.

Order:

1. reconciliation views;
2. payment and inventory triggers;
3. stored functions;
4. settlement and payment tables;
5. goods receipt and purchase-order tables;
6. supplier tables;
7. inventory movement and reconciliation tables;
8. repair tracking and source registry tables.

Never drop the legacy `products`, `orders`, `manual_invoices`, `inventory`, or `payments` tables as part of this rollback.

## Database rollback after canonical writes

Do not drop the new tables. Instead:

1. turn both runtime flags off;
2. stop new procurement receipt posting and payment-event writes;
3. capture a snapshot of every new table;
4. reconcile all ledger writes with the corresponding business documents;
5. create compensating movements or reversing payment events when required;
6. restore application reads to the legacy path only after the owner approves the reconciliation;
7. retain the ledger tables as immutable audit evidence.

## Stop conditions

Stop deployment or rollback immediately if:

- snapshot counts do not match the source counts;
- a canonical balance becomes negative;
- an idempotency key appears more than once;
- received quantity exceeds ordered quantity;
- the application starts migrations automatically;
- the new runtime code is enabled before opening balances are approved;
- payment events are created without external evidence.
