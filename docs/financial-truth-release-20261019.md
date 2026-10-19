# Financial truth and source attribution — 2026-10-19

## Scope

This release repairs source-to-display behavior, not historical documentary evidence.
No receipts, journal entries, inventory quantities, vendor costs or historic snapshots
are backfilled or rebalanced. An unmatched settlement is not evidence of missing cash.
A book balance is not a physical cash count or a bank confirmation.

## Changed behavior

- `GET /api/admin/accounting/v2/truth` is authenticated, non-cacheable and read-only.
- Register and accountant-package amounts and their evidence flags use one
  `REPEATABLE READ READ ONLY` transaction. Missing sources fail closed; no fallback zero.
- Report GET requests no longer invoke automatic closing. The existing protected
  scheduled job remains the automatic writer and also checks current valuation/source
  blockers inside a serializable transaction. Looking at a report is not consent to close it.
- The UI separates selected-period checks, current reconciliation and historical gaps.
- Empty, unpriced catalog drafts without stock are not described as missing-cost stocked assets.
- Incomplete cost/fulfillment/expense/payment inputs suppress an apparently complete profit.
  A computable number is explicitly labelled a recorded book result, not audited profit.
- Relational line costs are matched to product/variant/quantity, never database row position.
  Ambiguous legacy matches remain unresolved rather than silently choosing a cost.
- Personal cash receipt markers are shown separately from matched settlement evidence.
- Archive exports cannot synthesize zero expenses, subsidy or balance values. Reports
  require current quality metadata and complete internal component fields to export;
  unresolved reconciliation remains prominently disclosed as a draft/internal result.
- Business intelligence includes paid online orders with canonical accounting facts,
  preserves the paid/delivered restrictions, exposes incomplete costs and does not
  fabricate 100% growth from a zero prior-period denominator. Heuristic recommendations
  are withheld when their sources are incomplete.

## Deliberate limitations

`independentlyAudited` is always false. `checks_clear` means only that the stated
internal checks passed. It does not prove completeness of cash spending, stocktake,
vendor invoices or external bank/carrier records. A recorded zero expense is not proof
that no unrecorded expense occurred. Historic missing costs remain missing until
supported by evidence. Settlements must be matched to existing documents before
recording another receipt. No blanket certification of every admin/AI screen is made.

Current-state reconciliation is labelled separately from a selected historic month.
An unmatched receipt solely in another month is a global warning, not automatically
that selected month's close blocker. Existing database state and approval guards remain.

## Verification and release

Use synthetic fixtures only in source-control tests; no customer records or private
financial extracts belong in this public repository. Verify the same Git commit through
required CI and the Vercel deployment-alias gate. Preserve concurrent upstream work.
The release has no new database migration. Rollback is an application-code rollback,
not a rollback of financial evidence. Do not use force promotion to bypass failed checks.

Primary technical references:
- PostgreSQL stable-snapshot consistency: https://www.postgresql.org/docs/17/applevel-consistency.html
- HTTP safe-method semantics: https://www.rfc-editor.org/rfc/rfc9110.html#name-safe-methods
- Inventory cost principles (not an assertion of local compliance): https://www.ifrs.org/issued-standards/list-of-standards/ias-2-inventories/

## Final source review

The PostgreSQL view's procurement and settlement-integrity subqueries are global,
not selected-month counts. Their display scope and scheduler-status blockers now
agree with that definition. Read-only close status also includes the same current
valuation blockers as the scheduled writer. A failed recommendation refresh does
not keep presenting a previous recommendation as a current decision.
