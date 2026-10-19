# Security and commerce boundary release — 2026-10-19

## Scope

This release tightens OAuth grants, session invalidation, checkout replay ownership,
public order serialization, coupon eligibility, variant cost capture and payment
state transitions. It also avoids generating push reminders without subscribers,
records the actual finance-audit model, and aligns product image preloads.
It is not a rewrite of the storefront or of historical accounting evidence.

## Research basis

- IETF OAuth security BCP, RFC 9700: https://www.rfc-editor.org/rfc/rfc9700.html
- OAuth refresh scope constraint, RFC 6749 section 6: https://www.rfc-editor.org/rfc/rfc6749#section-6
- OWASP session management: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- PostgreSQL row locks: https://www.postgresql.org/docs/17/explicit-locking.html
- Vercel release checks: https://vercel.com/docs/deployment-checks

## Release order

1. Create a current production snapshot. Verify the target project and branch;
   never infer a database target from an environment-file name.
2. Apply `0101_security_auth_and_checkout_boundaries.sql`, then
   `0102_wayl_monotonic_payment_guards.sql`, with the SHA-256 checksum of each exact
   file set as `aquavo.migration_checksum`. These are additive migrations.
   They must precede any deployment that selects the new schema columns.
3. Validate the migration ledger and unchanged financial row counts/balances.
4. Release only the reviewed Git commit after its required pipeline succeeds.
   The production Vercel check watches the exact `✨ Pipeline Status` job.
   Do not force-promote around the check.
5. Verify catalog and public page responses, authentication rejection, checkout
   ownership and payment state coherence without creating live synthetic orders.

## Expected user-visible effects

- Sessions without the new authentication version require a fresh login.
- Old OAuth access/refresh grants require re-authorization. New refresh grants
  retain or narrow consent and are persisted as hashes, not raw bearer tokens.
- Static MCP tokens default to read-only unless explicitly configured otherwise.
- Personal/per-account-limited coupons require an authenticated eligible account.
- A retry using an old unbound checkout key is rejected rather than disclosing it.
- Password/role/deletion changes revoke that identity's old sessions atomically.

## Rollback and evidence boundaries

Do not rewrite historic order prices/costs, mark settlements received without
records, remove payment evidence, or rebalance the ledger to hide a warning.
Keep the additive schema when rolling application code back unless a separately
reviewed rollback is required. Old application code does not need the new columns.
The supplied migration rollback files are explicit operator tools, not automated
production cleanup. Never execute a destructive rollback merely to clear an alert.

A snapshot's existence is not proof of a restore drill. Track restore completion
and provider limits separately. This release does not certify MFA, independent
backup availability, all historical costs, or the absence of every security issue.
