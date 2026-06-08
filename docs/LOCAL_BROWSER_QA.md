# Local Browser QA

Use this only with a local, mock, or explicitly safe staging target. Never run browser QA against a production database.

Required local QA env:

```env
# Prefer unset/empty DATABASE_URL for mock storage, or a local PostgreSQL URL.
DATABASE_URL=
ALLOW_REMOTE_DATABASE_IN_DEV=false
DISABLE_SCHEDULED_JOBS=true
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5000
```

If using a staging/test database, set `DATABASE_URL` to that safe database and set `ALLOW_REMOTE_DATABASE_IN_DEV=true`. Do not use that opt-in with production.

Before running browser QA:

1. Confirm `DATABASE_URL` is empty, local, or safe staging only.
2. Confirm `DISABLE_SCHEDULED_JOBS=true`.
3. Start the app intentionally.
4. Run Playwright only with `PLAYWRIGHT_BASE_URL` or `E2E_BASE_URL` pointing at the safe target.

Do not run migrations, use real customer data, or submit production orders during QA.
