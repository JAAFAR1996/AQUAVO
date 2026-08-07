# Accounting V2 Production Release Runbook

## Scope

This runbook releases the Accounting V2 chain through migration
`0072_accounting_require_explicit_shipped_carrier`.

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
6. Enter `APPLY_0051_TO_0072` in `confirm`.
7. Approve the `production` environment job when GitHub requests approval.
8. Wait for the workflow to finish. It performs:
   - strict Accounting TypeScript checking;
   - PostgreSQL execution tests for migrations 0062, 0071 and 0072;
   - P0 contract tests;
   - migration-ledger governance;
   - a full production build;
   - migrations under the global Accounting advisory lock;
   - post-migration structural and semantic health checks, including the explicit
     shipped-carrier guard.
9. Call the authenticated endpoint `/api/admin/accounting/v2/health` against the
   staged deployment. The existing Accounting V2 P0 health contract remains
   through 0071 and must return:
   - `ready: true`;
   - `migrationsThrough: "0071"`;
   - `returnLineIdentity: "order_items_relational.id"`;
   - `refundSource: "immutable_sale_snapshot"`.
10. Verify migration 0072 separately in Production:
    - `0072_accounting_require_explicit_shipped_carrier` exists in
      `schema_migrations` and is not rolled back;
    - `orders_apply_default_delivery_company` is enabled on carrier/status updates;
    - `apply_default_delivery_company_to_order()` contains
      `DELIVERY_COMPANY_REQUIRED_FOR_SHIPPED`;
    - active rows in `delivery_companies` are the source of carrier choices.
11. Test one non-production shipping fixture end to end:
    - processing → shipped opens the delivery-company dialog;
    - confirmation is disabled until a company is selected;
    - active carriers are loaded dynamically from `delivery_companies`;
    - shipping with الوسيط or الطائر المميز للنقل stores the selected carrier and
      current default fee;
    - an inactive company is rejected;
    - shipping does not set COD received/paid;
    - delivered still follows the existing Accounting V2 flow.
12. Promote the already staged Vercel Production deployment to the production
    domains.

## Abort conditions

Do not promote the staged deployment when any of these occurs:

- the GitHub workflow fails;
- the health endpoint returns HTTP 503;
- Migration 0071 or 0072 is absent from `schema_migrations`;
- `order_returns_00_lock_verification` is absent;
- `order_returns_prepare_verification` is absent;
- the return verifier function does not contain the line-identity and
  refund-snapshot guards;
- `apply_default_delivery_company_to_order()` does not contain the explicit
  shipped-carrier guard;
- the staged application cannot load active delivery companies or requires a
  hard-coded carrier list.

## Rollback boundary

Application code can be rolled back by moving Vercel domains to the previous
known-good deployment.

Migration 0072 changes trigger/function behavior only and does not rewrite
historical orders. Its rollback restores the pre-0072 default-carrier behavior.
Database rollback of 0071 remains allowed only before any return event changes
after 0071 was applied; its rollback intentionally fails closed after that
boundary because reverting would reinterpret immutable return evidence.

Do not run rollback SQL from a Vercel build or an interactive dashboard without a
recorded incident decision.
