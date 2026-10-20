# AQUAVO: خزينة الحسابات والبطاقات (0103) — خطة نشر آمنة

## What exists
- `/admin/finance` includes `الخزينة — وين فلوسي؟`.
- Existing Accounting V2 ledger balances (`1000`,`1010`,`1100`) remain references, not actual bank-statement balances.
- Add physical cash/bank/wallet accounts; card is a **funding-account alias** and never a second account balance.
- Owner confirms each physical account's opening balance and timestamp. Missing = unknown, never zero.
- Manual receipts, withdrawals, transfers and Wayl payout allocations are an **append-only treasury subledger**, not GL entries.
- Only completed, real, non-archived Wayl/Al-Qaseh payments missing an allocation and without refund/chargeback events appear in the regular payout queue.
- Refund/chargeback payments remain visible as exceptions even if previously allocated. The bank cashbook must not auto-deduct without verified bank/provider evidence; operator must reconcile a real outgoing movement.
- Actual bank balance requires a statement/cash-count reconciliation. Confirmed payment does not imply bank receipt.

## Pre-release gates (production)
1. Confirm the repository target, production deployment and Neon `fishweb` default production branch.
2. Back up the database, record pre-migration row counts and GL balances `1000/1010/1100`.
3. Run `npm run check:accounting`, `npm run check:accounting:routes`, `npm run check:migrations`, and `npx vitest run test/treasury-cashbook-contract.test.ts`.
4. Test migration against temporary Neon branch, including card ownership constraint, immutability and no GL changes.
5. **Only after specific owner approval** run `0103_treasury_cashbook.sql` on the production database using `script/apply-0103-treasury-cashbook.ts`. Requires `DATABASE_URL` pointing to approved environment and `CONFIRM_TREASURY_0103=APPLY_TREASURY_0103`.
6. Verify migration ledger checksum, empty new tables, unchanged existing GL balances.
7. Deploy application commit only after schema is active; log deployment ID and smoke test authenticated treasury GET, account creation and card alias on an approved test configuration.
8. Request verified real opening balances and external bank/Wayl settlement statements before displaying usable cash balances as confirmed.

## Safety / scope
- This feature does **not** change sales recognition, COGS, expenses, COD settlements, or old financial journal entries.
- The way Wayl payments hit GL at order delivery remains unchanged. Gateway payout recording adds to the location cashbook only; it is not an extra sale and does not recognize bank fees as business expenses.
- Bank fees must also be booked through verified expenses or the existing accountant workflow.
- Card numbers: store **last four digits only**. Never paste a full PAN, CVV, payment token or bank credentials into a note.
- Corrections to append-only entries require an opposite audited movement and review, never direct row updates.
- `0103_treasury_cashbook_rollback.sql` fails closed unless owner explicitly authorizes and all new tables are empty. Retain historical evidence after first real transaction.

## Data integrity note
Reconciliation shows a difference, it never auto-adjusts cashbook or GL. Unverified opening balances, missing statements, historical unrecorded movements and unidentified Wayl settlements must remain clearly marked as uncertain.
