# Admin & Financial Security Audit (Agent: SecurityAudit)

READ-ONLY. **Commit verdict: GO** — no secret is git-tracked or staged; `.env*`/env.prod untracked + gitignored. Standing CRITICAL blocks PRODUCTION, not this commit.

## Findings (severity | issue | location | fix)
- **CRITICAL** | Real prod secrets remain in git HISTORY (Neon DB pw, SESSION_SECRET, JWT_SECRET, RESEND_API_KEY, R2 keys, SMTP_PASS, META_CAPI_TOKEN, live GROQ `gsk_` key). Working tree scrubbed by commit 767ec47; history not. Rotation "still required" per commit msg — UNVERIFIED. | AQUAVO_SECRETS_REMEDIATION.md:11-30 | **Rotate all 10 creds now (mandatory)**, then decide BFG history purge.
- **MEDIUM** | 373 dev scripts (scripts/, scratch/) git-tracked despite gitignore — leak DB host/region/username (password already redacted). | scripts/*.ts, scratch/*.mjs | `git rm --cached -r scripts/ scratch/`
- **LOW** | Public invoice confirm/reject unrate-limited (16-char randomBytes token, brute-force impractical). | server/routes/invoice.ts:42,57 | add per-IP limiter.
- **LOW** | Stray empty files from shell mishaps (`console.log('`, `{const`, `{try{const`) in root — clean before commit, not secrets.

## Strong / no gaps
- Admin+financial authz: blanket `requireAdmin` on admin.ts:122 (first middleware), accounting.ts:37, expenses.ts:11, finance-audit.ts:10, admin-invoices.ts:8; ai-settings/analytics per-route. requireAdmin re-loads user from DB, checks role==admin (auth.ts:31). **No unguarded admin/finance/export/invoice route found.**
- Audit trail insert-only (accountingAuditTrail.ts:53); no route updates/deletes audit rows. Actor from req.user/session, not body — not spoofable, changes attributable.
- Session hardened (httpOnly, sameSite lax, secure in prod; SESSION_SECRET 32+ enforced). CSRF strict Origin-vs-Host (index.ts:198). CORS allowlist, no creds wildcard. Zod .strip() on financial mutations.
- No credential values logged (presence/counts/client IDs only).
