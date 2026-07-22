# Read-only Admin Audit — owner-run command

Script: `scripts/audit-admin-readonly.mjs` (reviewed, transparent, read-only).

It only ever **submits the login form**; everything else is URL navigation + clicking
tab headers. It cannot create/edit/confirm/refund/cancel/delete. It refuses to run
unless `ADMIN_AUDIT_READ_ONLY=true`, only targets whitelisted AQUAVO domains, redacts
PII, writes artifacts **outside** the repo, clears cookies afterward, and never prints
credentials/cookies/tokens/headers.

Credentials are supplied **only via environment variables** — never on the command
line, never committed. Run it yourself locally when ready.

## PowerShell (Windows)
```powershell
$env:ADMIN_AUDIT_READ_ONLY = "true"
$env:ADMIN_AUDIT_URL       = "https://www.aquavoiq.com"
$env:ADMIN_AUDIT_EMAIL     = "<your-admin-email>"
$env:ADMIN_AUDIT_PASSWORD  = "<your-admin-password>"
# optional: output dir OUTSIDE the repo (defaults to the OS temp dir)
# $env:ADMIN_AUDIT_OUT     = "C:\Users\<you>\audit-out"
node scripts/audit-admin-readonly.mjs
# clean up the env vars afterward:
Remove-Item Env:ADMIN_AUDIT_PASSWORD, Env:ADMIN_AUDIT_EMAIL, Env:ADMIN_AUDIT_URL, Env:ADMIN_AUDIT_READ_ONLY
```

## bash (macOS/Linux/Git-Bash)
```bash
ADMIN_AUDIT_READ_ONLY=true \
ADMIN_AUDIT_URL="https://www.aquavoiq.com" \
ADMIN_AUDIT_EMAIL="<your-admin-email>" \
ADMIN_AUDIT_PASSWORD="<your-admin-password>" \
node scripts/audit-admin-readonly.mjs
```

## Output
- Prints `LOGIN: SUCCESS|FAILED`. **FAILED is the desired outcome for the default
  seed credential** — it proves no default-credential vulnerability on production.
- Writes a redacted `audit-data.json` (+ screenshots) to the output dir it reports.
- The JSON contains per-screen redacted text and an API request log (method/path/status
  only — no headers/bodies). Hand it back for analysis; do not commit it.

The permission classifier blocks an *agent* from performing an automated production
login — by design. This owner-run path is the sanctioned way to execute the audit.
