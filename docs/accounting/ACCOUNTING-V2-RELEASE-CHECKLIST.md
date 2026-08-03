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
- [x] Final split migrations 0051–0056 applied in order on fresh Production child branch `br-young-paper-a4ffxuk2`.
- [x] Forward catalog checked against expected tables, columns, triggers and views.
- [x] `delivered_at`, payment occurrence, immutable fact recognition and order journal entry date are identical.
- [x] Exact-cost smoke order posts 25,000 product revenue, 48 COGS and 150 fulfillment cost with journal difference zero.
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
