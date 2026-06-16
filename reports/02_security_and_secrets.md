# AQUAVO Security & Secrets Audit

**Branch:** `perfection-campaign/aquavo-global-level`
**Date:** 2026-06-15
**Auditor:** AQUAVO Security Auditor (read-only)
**Scope:** Working tree + git-tracked files (`git ls-files`, 4616 files)

---

## VERDICT: 🔴 NO-GO

**Do NOT push this branch.** Three git-tracked files contain LIVE production secrets (Neon DB password, R2 keys, Resend API key, JWT/session secrets, Yahoo SMTP app password). They are committed in `HEAD` and on the remote history path. Pushing re-exposes / keeps exposing live credentials.

---

## 1. SECRET FINDINGS

### CRITICAL — GIT-TRACKED files leaking LIVE secrets

> **NOTE:** Actual secret values are intentionally REDACTED from this committed report.
> The real values live only in the working-tree files listed below — refer to those
> directly when rotating. Do not paste live secrets into any committed document.

| File | Line | Secret type | Value |
|------|------|-------------|-------|
| `env.prod` | 1 | Neon `DATABASE_URL` (postgres password) | `[REDACTED]` |
| `env.prod` | 2 | `SESSION_SECRET` | `[REDACTED]` |
| `env.prod` | 3 | `JWT_SECRET` | `[REDACTED]` |
| `env.prod` | 13 | Resend API key | `[REDACTED]` |
| `env.prod` | 17-19 | Cloudflare R2 account id / access key / **secret access key** | `[REDACTED]` |
| `env.prod` | 23-24 | Yahoo SMTP user + **app password** | `[REDACTED]` |
| `env.prod` | 26 | Sentry DSN | `[REDACTED]` |
| `.replit` | 69 | Neon `DATABASE_URL` (same live password) | `[REDACTED]` |
| `.replit` | 70 | `JWT_SECRET` (same) | `[REDACTED]` |
| `.replit` | 72 | Resend API key (same) | `[REDACTED]` |
| `.replit` | 74-75 | R2 access key id + secret access key (same) | `[REDACTED]` |
| `script/inspect-gallery.ts` | 5 | Hardcoded Neon `connectionString` (same live password, pooler host) | `[REDACTED]` |

All three confirmed **TRACKED** (`git ls-files --error-unmatch` succeeds) and **present in `HEAD`** (`git cat-file -e HEAD:env.prod` → exists).

**Note:** The same credential set is duplicated across all three files, so a single Neon password / R2 key / Resend key / JWT secret is exposed in multiple places. Rotation must cover the full set once.

### Staged deletion (good, but history remains)
- `.env.production` — staged for deletion (`D` in `git status`). Was committed previously (history: `3e480af`, `fa56f3d`, `bb02742`). Deletion is correct; secret may still live in git history.

### Lower severity / NOT secrets (tracked, benign)
- `.env.example` — placeholder values only (`your-api-key`, etc.). Safe.
- `connectors-check.json` / `connectors-check.txt` — product/variant data only. No secrets.
- `runtime-logs.txt` / `vercel-logs.txt` — Vercel CLI help text + error output. Deployment IDs only, no tokens. Low risk (clutter, not secret).
- `hasvar.txt`, `errors.txt` (empty), `vercel_build_errors.txt`, and other root `*.txt` — build/inspection noise, no secrets found.
- VAPID public key / `VITE_*` / GA id / R2 public CDN URL — public by design.

---

## 2. .gitignore COVERAGE

The `.gitignore` is thorough and **already lists `env.prod`, `.env.production`, `scripts/`, `script/query-variants.*`, `*_src.txt`, `*.log`, `.env.vercel*`** etc. **BUT these files were committed before the ignore rules existed** — gitignore does not untrack already-tracked files. Gaps:

- `.replit` is **not** ignored and **not** intended to be deleted — needs an explicit untrack + ignore entry, or scrub the secrets.
- `script/inspect-gallery.ts` slips past the partial `script/` rules (only `script/query-variants.*` and `script/update-volcanic-red.ts` are ignored). The broader `scripts/` (plural) rule does not match `script/` (singular).

---

## 3. AUTH / MIDDLEWARE AUDIT (informational — not gating)

- **requireAdmin/requireAuth:** Broadly applied across `server/routes/*` (ai-advanced 41, loyalty 16, ai-settings 13, notifications 11, users 9, analytics/social-analytics 7-8, etc.). Admin/finance/AI/upload/newsletter routes are guarded. Matches prior QA-fix history in project memory.
- **Rate limiting:** `server/middleware/security.ts` provides `rateLimiter(max, windowMs)` via IP-based `checkRateLimit`; applied to sensitive routes (newsletter, gallery per memory).
- **Security headers / CSP:** Present — `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, env-specific CSP, `frame-ancestors 'none'`. Reasonable.
- **Zod validation:** Project convention enforced (per CLAUDE.md rule #5); not exhaustively re-verified here.
- No auth regressions introduced by this branch's staged changes (navbar.tsx, product-details.tsx, security.ts, vercel.json) relative to secret exposure.

---

## 4. REQUIRED REMEDIATION BEFORE ANY PUSH

**Files that MUST be purged / untracked first:**
1. `env.prod` → `git rm --cached env.prod` (already in .gitignore)
2. `.replit` → scrub the `[userenv.shared]` secret block, then `git rm --cached` or commit the scrubbed version; add to .gitignore if not needed
3. `script/inspect-gallery.ts` → remove hardcoded `connectionString`, read from `process.env.DATABASE_URL`; tighten .gitignore `script/` rule

**Then:**
4. **ROTATE ALL EXPOSED CREDENTIALS** (they are compromised the moment they were committed): Neon DB password, Cloudflare R2 access key + secret, Resend API key, JWT_SECRET, SESSION_SECRET, Yahoo SMTP app password.
5. Consider history scrubbing (BFG / `git filter-repo`) for `env.prod`, `.replit`, `.env.production`, `script/inspect-gallery.ts` — the secrets persist in past commits even after deletion.
6. Optional cleanup (non-blocking): untrack log/inspection noise (`runtime-logs.txt`, `vercel-logs.txt`, `connectors-check.*`, root `*.txt`).

---

## FINAL: 🔴 NO-GO until `env.prod`, `.replit`, and `script/inspect-gallery.ts` are untracked/scrubbed AND all listed credentials are rotated.
