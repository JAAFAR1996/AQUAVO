# Accounting V2 release checklist

## Code gate

- [ ] Strict accounting TypeScript check passes.
- [ ] COD policy and wiring contract tests pass.
- [ ] Migration ledger governance passes.
- [ ] Production build passes.
- [ ] Draft PR reviewed with no unresolved money-critical comments.

## Temporary database gate

- [x] 30,000 gross / 5,000 carrier / 25,000 AQUAVO smoke test passed.
- [x] Free delivery posts 5,000 delivery subsidy.
- [x] Carrier settlement posts net receipt and clears COD receivable.
- [x] Return verification and reversal keep inventory and journal aligned.
- [x] Expense verification and reversal remain balanced.
- [x] Fulfillment cost recognition and reversal remain balanced.
- [ ] Final split migrations 0051–0055 applied in order on a fresh Production child branch.
- [ ] Forward catalog checked against expected tables, columns, triggers and views.
- [ ] Rollbacks exercised on a disposable branch.

## Business evidence gate

- [ ] Physical opening inventory approved for the seven mismatched products.
- [ ] Product packaging and insert costs approved or marked verified zero with evidence.
- [ ] Actual carrier name recorded.
- [ ] Cash, bank and carrier-held opening balances recorded.
- [ ] Tax profile fields populated only from original documents.

## Production gate

- [ ] Explicit owner approval received after all checks are green.
- [ ] Point-in-time restore/backup confirmed.
- [ ] Migrations applied before deploying V2 route code.
- [ ] `/api/admin/accounting/v2/health` returns ready.
- [ ] Finance register loads and August starts with zero realized orders.
- [ ] One controlled order tested from delivery through settlement.
- [ ] Production monitoring checked for errors.
