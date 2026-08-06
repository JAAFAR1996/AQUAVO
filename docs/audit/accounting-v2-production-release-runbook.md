# Accounting V2 Production Release Runbook

## Scope

This runbook releases the Accounting V2 chain through migration
`0071_accounting_return_line_identity_and_refund_guard`.

It must not be executed from a Vercel build. Vercel builds compile the application
only. Production database changes are performed by the manually dispatched GitHub
Actions workflow `.github/workflows/accounting-v2-production-migrate.yml`.

## One-time repository configuration

1. Create or open the GitHub Environment named `production`.
2. Add the Production Neon connection string as the environment secret
   `DATABASE_URL`.
3. Configure a required reviewer for the environment when the repository plan
   supports deployment protection rules.
4. In Vercel Production environment settings, disable automatic assignment of
   custom production domains so a Production build can remain staged until the
   database migration and health checks pass.

Never place the connection string in repository variables, workflow inputs,
comments, logs, or Vercel build commands.

## Release procedure

1. Keep the Accounting PR in Draft until Accounting V2 CI is green.
2. Build the exact release commit as a staged Vercel Production deployment.
3. Confirm the staged deployment completed successfully. Do not promote it yet.
4. In GitHub Actions, run **Accounting V2 Production Migration**.
5. Enter the exact release commit SHA in `ref`.
6. Enter `APPLY_0051_TO_0071` in `confirm`.
7. Approve the `production` environment job when GitHub requests approval.
8. Wait for the workflow to finish. It performs:
   - strict Accounting TypeScript checking;
   - PostgreSQL execution tests for migrations 0062 and 0071;
   - P0 contract tests;
   - migration-ledger governance;
   - a full production build;
   - migrations under the global Accounting advisory lock;
   - post-migration structural and semantic health checks.
9. Call the authenticated endpoint `/api/admin/accounting/v2/health` against the
   staged deployment. It must return:
   - `ready: true`;
   - `migrationsThrough: "0071"`;
   - `returnLineIdentity: "order_items_relational.id"`;
   - `refundSource: "immutable_sale_snapshot"`.
10. Test one non-production return fixture end to end:
    - the UI loads `/api/admin/orders/:id/return-lines`;
    - the refund field is read-only;
    - verification rewrites refund, sale price and COGS from the original line;
    - an excessive second return is rejected.
11. Promote the already staged Vercel Production deployment to the production
    domains.

## Abort conditions

Do not promote the staged deployment when any of these occurs:

- the GitHub workflow fails;
- the health endpoint returns HTTP 503;
- Migration 0071 is absent from `schema_migrations`;
- `order_returns_00_lock_verification` is absent;
- `order_returns_prepare_verification` is absent;
- the verifier function does not contain the line-identity and refund-snapshot
  guards;
- the staged application cannot load relational return lines.

## Rollback boundary

Application code can be rolled back by moving Vercel domains to the previous
known-good deployment.

Database rollback of 0071 is allowed only before any return event changes after
0071 was applied. The rollback migration intentionally fails closed after that
boundary because reverting would reinterpret immutable return evidence.

Do not run rollback SQL from a Vercel build or an interactive dashboard without a
recorded incident decision.
