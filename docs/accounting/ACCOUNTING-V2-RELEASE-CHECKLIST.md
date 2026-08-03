# Accounting V2 release checklist

## Code gate

- [ ] Strict accounting TypeScript check passes on the latest commit.
- [ ] COD policy, wiring and operating-default contract tests pass.
- [ ] Migration ledger governance passes through 0058.
- [ ] Production build passes.
- [ ] Draft PR reviewed with no unresolved money-critical comments.

## Temporary database gate

- [x] 30,000 gross / 5,000 carrier / 25,000 AQUAVO smoke test passed.
- [x] Free delivery posts 5,000 delivery subsidy.
- [x] Carrier settlement posts net receipt and clears COD receivable.
- [x] Return verification and reversal keep inventory and journal aligned.
- [x] Expense verification and reversal remain balanced.
- [x] Fulfillment cost recognition and reversal remain balanced.
- [x] Final split migrations 0051–0058 applied in order on Production child branch `br-young-paper-a4ffxuk2`.
- [x] Forward catalog checked against expected tables, columns, triggers and views.
- [x] `delivered_at`, payment occurrence, immutable fact recognition and order journal entry date are identical.
- [x] Exact-cost smoke order posts 25,000 product revenue, 48 COGS and 150 fulfillment cost with journal difference zero.
- [x] 0056 rollback retains historical delivery evidence when facts exist, restores the old function, and reapplies cleanly.
- [x] 0057 rollback drops delivery-company/monthly-position objects and the final migration reapplies cleanly.
- [x] Re-running 0057 preserves a later owner-selected default company instead of forcing Al-Waseet again.
- [x] User-provided carrier position balances: 183,750 gross - 31,000 fees = 152,750 net.
- [x] Fixed preparation item test creates profile v2 at 175 while preserving historical profile v1 at 150.
- [x] 0058 confirms all 112 active product packaging/insert components as verified zero on the test branch.
- [x] 0058 guarded rollback preserves verified-zero evidence after Accounting V2 facts exist and reapplies cleanly.
- [ ] Full reverse-order rollback of 0055–0051 exercised on a disposable no-business-data branch.

## Owner decisions captured

- [x] Common box/label/card costs belong to the order fulfillment layer, not product unit cost.
- [x] Current fixed common items: price label 50 IQD + thank-you/contact card 100 IQD per order.
- [x] Carton cost remains determined by the actual carton selected for the order.
- [x] Future common additions use a dedicated field and create a new profile version for future orders only.
- [x] Electronic evidence is optional; an explicit owner confirmation is allowed and labelled internal-only.
- [x] Multiple delivery companies are supported; Al-Waseet starts as default at 5,000 IQD.
- [x] A company may be selected/corrected at settlement only when its configured fee matches the frozen order fee.
- [x] Monthly position snapshots are optional and do not alter profit.
- [x] Bank balance currently zero; supplier payable zero; other receivable zero.

## Business evidence gate

- [ ] Physical opening inventory approved for the seven mismatched products.
- [x] Product packaging and insert policy approved by owner; Production application remains pending.
- [x] Default delivery company policy approved by owner; Production application remains pending.
- [ ] Actual physical cash balance counted and entered separately from July profit.
- [x] Current carrier-held position supplied by owner: gross 183,750 / fees 31,000 / net 152,750.
- [ ] Tax profile fields populated only from original documents or licensed-accountant confirmation.
- [ ] July returned order `FH-260721-00FFC198` reviewed for actual carrier/packaging/write-off loss before treating July profit as final.

## Production gate

- [ ] Explicit owner approval received after all checks are green.
- [ ] Point-in-time restore/backup confirmed.
- [ ] Migrations applied before deploying V2 route code.
- [ ] `/api/admin/accounting/v2/health` returns ready through migration 0058.
- [ ] Finance register loads and August starts with zero realized orders.
- [ ] One controlled order tested from delivery through settlement.
- [ ] Production monitoring checked for errors.
