# AQUAVO Database Repair Master Plan

Date: 2026-07-22
Owner: AQUAVO
Repository branch: `fix/database-repair-20260722`
Neon project: `fishweb` (`shiny-tree-43710630`)
Production branch: `production` (`br-patient-mouse-a4d4cgr4`)
Database: `neondb`
PostgreSQL: 17

## Purpose

Repair the confirmed database integrity, inventory, procurement, payment, accounting, security, and schema-hygiene problems without destructive production changes or silent data assumptions.

## Non-negotiable execution rules

1. No migration or data repair runs during application startup, request handling, health checks, or route registration.
2. Every schema change is committed under `migrations/`, reviewed, tested on an isolated Neon branch, and applied to production only through an explicit operator action.
3. Every data correction must have exact target rows, expected row count, evidence, rollback or compensating action, execution owner, and execution timestamp.
4. Existing conflicting stock values are evidence, not truth. They must not be silently normalized into a final balance.
5. `inventory` is treated as a legacy source and must not drive purchasing, pricing, or availability decisions.
6. Physical inventory reconciliation is required before canonical opening balances become approved.
7. SQL invariants decide financial correctness. AI may explain findings but cannot be the only validator.
8. Production credentials and platform tokens must never be printed in logs or committed to the repository.

## Repair sequence and gates

### Gate 0 — Safety and recoverability

Deliverables:
- Isolated Git branch and isolated Neon branch.
- Production snapshot/restore point recorded before deployment.
- Production migration requires explicit owner approval.
- Runtime database role design documented separately from the owner/migration role.
- Neon credential rotation and production branch protection recorded as operator actions.

Pass criteria:
- No production writes during preparation.
- Exact migration hash and exact verification queries recorded.
- Rollback/compensating plan exists.

### Gate 1 — Canonical inventory and reconciliation foundation

Deliverables:
- Relational product-variant snapshot table.
- Inventory movement ledger.
- Inventory locations.
- Reconciliation queue comparing product-level stock, legacy variant stock, and movement-ledger balance.
- Legacy `inventory` table blocked from new purchasing logic.
- No automatic final stock balance assigned to conflicting records.

Pass criteria:
- All existing JSON variants are copied to reconciliation storage.
- Negative legacy values remain visible as evidence.
- Canonical balances cannot go negative.
- Every movement has an idempotency key and audit metadata.

### Gate 2 — Procurement lifecycle

Deliverables:
- Suppliers.
- Supplier products/SKUs/MPNs.
- Supplier quotes and quote items.
- Purchase orders and purchase-order items.
- Goods receipts and receipt items.
- Landed-cost allocation inputs.
- Lead-time and reorder-policy fields.

Pass criteria:
- A purchase can be traced from supplier quote to purchase order to partial/final receipt.
- Received stock generates inventory movements exactly once.
- Damaged, missing, rejected, and accepted quantities are separated.
- Supplier and variant identity are explicit.

### Gate 3 — Orders, payments, COD, and accounting

Deliverables:
- Payment event ledger supporting multiple events per order.
- Cash settlement batches and settlement items.
- Explicit subtotal, discount, shipping, rounding adjustment, and grand-total model.
- Reconciliation queues for delivered/unpaid, paid/no payment event, broken invoices, and unmatched settlements.
- Backfill scripts that create proposed records only from documented evidence.

Pass criteria:
- Every paid order can be traced to a payment/COD event.
- Every COD receipt can be traced to a carrier settlement.
- Every total is reproducible from its components.
- No financial row is counted twice.
- Period close prevents silent historical mutation.

### Gate 4 — Catalog normalization and data quality

Deliverables:
- Canonical category mapping and aliases.
- Supplier/product identifiers per variant.
- Specifications JSON validation.
- Cost-history coverage report.
- Brand/supplier conflict queue.
- Timezone migration plan to `timestamptz` for event timestamps.

Pass criteria:
- No active category lacks a canonical slug.
- No purchasable variant lacks a stable identifier.
- JSON fields satisfy the agreed schema.
- Cost coverage and source evidence are measurable.

### Gate 5 — Security, access, schema hygiene, and performance

Deliverables:
- Limited runtime role and separate migration role.
- RLS decision matrix for any directly exposed tables.
- Token encryption verification and secret rotation runbook.
- Archived backup/legacy tables moved out of the active application namespace.
- Duplicate audit tables resolved.
- Foreign-key index verification using actual query plans.
- Unused-index review over a meaningful observation window.

Pass criteria:
- Application runtime cannot alter schema or truncate tables.
- Directly exposed data has documented row-level access controls.
- Secrets are encrypted or externalized.
- No active code reads legacy sources accidentally.

### Gate 6 — Application cutover

Deliverables:
- Drizzle schema updated.
- Storage/services read canonical inventory and payment ledgers.
- Old paths become read-only compatibility paths, then are removed.
- Tests cover inventory idempotency, partial receipts, payment reconciliation, rounding, and rollback.

Pass criteria:
- Shadow comparison shows the new system matches approved business records.
- No unexplained stock or financial deltas remain.
- Owner signs off before disabling legacy reads.

## Current implementation batch

The first batch is intentionally non-destructive and creates:
- repair run/finding tracking;
- relational variant reconciliation storage;
- inventory locations and movement ledger;
- suppliers, supplier products, quotes, purchase orders, and goods receipts;
- payment events and cash settlement structures;
- reconciliation views for stock and order finance;
- verification and rollback files.

The batch copies legacy variant JSON into reconciliation storage but does not declare any conflicting quantity as approved canonical stock.

## Production deployment protocol

1. Record production branch LSN/timestamp and create a restore branch or snapshot.
2. Apply the exact reviewed migration to an isolated Neon branch.
3. Run schema, row-count, constraint, and reconciliation verification.
4. Run repository type-check and tests against the isolated branch.
5. Review schema diff and migration hash.
6. Obtain explicit owner approval for production.
7. Apply with conservative lock and statement timeouts.
8. Re-run all verification queries on production.
9. Record result, operator, timestamp, and any compensating action.

## Stop conditions

Stop and do not deploy if:
- a migration rewrites or deletes existing source rows unexpectedly;
- backfill row counts differ from audited expectations;
- canonical stock is inferred from conflicting sources without owner-approved reconciliation;
- totals cannot be reproduced;
- a production migration lacks a restore point;
- application tests still read legacy `inventory` for purchasing decisions.
