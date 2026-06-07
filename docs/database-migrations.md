# Database Migration Policy

This app must never run schema migrations or data fixes during serverless startup, request initialization, health checks, or normal route registration.

## Schema Changes

- Use Drizzle migrations in `migrations/` for schema changes.
- Generate and review migration SQL before applying it.
- Apply migrations from an explicit operator action or CI/CD migration step, not from `api/index.ts`, `server/index.ts`, route registration, or database client initialization.
- Test every migration against staging before production.
- Use a direct database connection for migrations. Do not rely on a pooled runtime connection for schema migration work.

## Data Fixes

- Data fixes must be manual, explicit, reviewed, and reversible where practical.
- Product renames, price fixes, stock corrections, and catalog cleanups must never run automatically on app startup.
- Every manual data fix must record the exact SQL, target rows, expected row count, backup or reversal plan, execution owner, and execution time.
- The historical `yff-049` product rename must not be executed automatically by the app server. If it is still needed, run it as a reviewed manual data-fix operation after staging verification.

## Production Safety

- Never migrate production from app startup.
- Never let a cold start, deploy, health check, or user request create tables, alter schema, update products, or repair data.
- If startup requires a table or column that may not exist, fail visibly and fix the migration state instead of patching the database at runtime.

## CI / Release Gate

- A release must fail if migration-like SQL appears in startup paths such as `api/index.ts`, `server/index.ts`, `server/db.ts`, or route registration.
- A release must fail if startup imports migration-only helpers or app startup code calls database writes for schema or data repair.
- A release must fail if a production data fix is not documented with exact SQL, target rows, expected row count, backup or reversal plan, execution owner, and execution time.
- Generated Drizzle migrations must stay in `migrations/`; do not create duplicate ad-hoc migration files for schema already represented there.
- Passing the release gate does not authorize applying production migrations. Production migration execution remains a separate explicit approval step.

## Verification

Before release, search startup paths for migration-like SQL:

```bash
rg -n "CREATE TABLE|ALTER TABLE|CREATE INDEX|UPDATE products|DROP TABLE|TRUNCATE|db\\.execute\\(sql" api server
```

Any result in startup paths such as `api/index.ts`, `server/index.ts`, `server/db.ts`, or route registration must be treated as a release blocker unless it is an explicit minimal health check such as `SELECT 1`. Other read-only queries are not allowed in startup paths without a written release exception.
