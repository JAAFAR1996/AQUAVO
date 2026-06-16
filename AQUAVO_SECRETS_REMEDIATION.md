# AQUAVO Secrets Remediation

**Branch:** `perfection-campaign/aquavo-global-level`
**Scope:** Remove committed secrets from *tracked working-tree files* + give a rotation list.
**Not done (by instruction):** no git-history rewrite, no production deploy, no merge to main, no dead-code deletion.

> Secret values are **not** printed here. Refer to your local (now-gitignored) `env.prod` / `.env.production` for the actual values when rotating.

---

## 1. Exposed-secret inventory & required rotation

> ⚠️ Every credential below was committed to git and remains in **git history** even after this cleanup. Treat all as **compromised** and rotate. The working tree is now clean; history is not (see §4).

| # | Secret type | Service affected | Where it was (tracked) | Live/Prod? | Rotation action |
|---|---|---|---|---|---|
| 1 | Neon `DATABASE_URL` password — project `ep-quiet-moon-a4h7tdze` (us-east-1) | **Neon PostgreSQL** (primary DB) | `env.prod`, `.replit`, `.env.production`, `script/inspect-gallery.ts`, **209 dev scripts** | **Yes — production DB** | Neon Console → reset the role password for `neondb_owner`; update `DATABASE_URL` in Vercel + Replit secrets. At least **3 distinct passwords** for this project have been committed over time — rotate to a new one. |
| 2 | Neon `DATABASE_URL` password — project `ep-nameless-glade-al3932cf` (eu-central-1) | **Neon PostgreSQL** (second project) | `script/inspect-prod-db.ts` | Unknown — verify if still used | If this Neon project still exists, reset its password too; otherwise delete the project. |
| 3 | `SESSION_SECRET` | Express session signing | `env.prod` | **Yes — prod** | Generate a new 32+ char random secret; set in Vercel. (Rotating invalidates existing sessions — users re-login.) |
| 4 | `JWT_SECRET` | App JWT signing | `env.prod`, `.replit` | **Yes — prod** | Generate new secret; set in Vercel. (Invalidates existing tokens.) |
| 5 | `RESEND_API_KEY` | **Resend** (transactional email) | `env.prod`, `.replit` | **Yes — prod** | Resend dashboard → revoke key → create new → update Vercel. |
| 6 | `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` | **Cloudflare R2** (object storage) | `env.prod`, `.replit` | **Yes — prod** | Cloudflare → R2 → API Tokens → roll the token (revoke + recreate) → update Vercel. |
| 7 | `R2_ACCOUNT_ID` | Cloudflare account identifier | `env.prod`, `.replit` | Low-sensitivity (not a secret per se) | No rotation needed; not a credential. |
| 8 | `SMTP_PASS` (Yahoo app password) | **Yahoo SMTP** (email send) | `env.prod` | **Yes — prod** | Yahoo Account → revoke the app password → generate a new one → update Vercel. |
| 9 | `META_CAPI_TOKEN` | **Meta Conversions API** | `.env.production` | **Yes — prod** | Meta Events Manager → regenerate the CAPI access token → update Vercel. |
| 10 | `GROQ_API_KEY` (`gsk_…`) | **Groq** (LLM) | `TOOLS/audit/.env.example` | **Yes — live key** | Groq Console → delete key → create new → update env. |

**Not secrets (no action):** `VITE_META_PIXEL_ID` / `META_PIXEL_ID` (public pixel IDs, ship in client JS), `VITE_SENTRY_DSN` (public DSN), R2/site public URLs, emails, Neon host/db/user names.

**Possible (verify):** the TikTok client secret was flagged earlier in `reports/06`; confirm whether it was ever committed and rotate if so (TikTok Developer portal).

---

## 2. What this commit changed (files)
- **Untracked (kept locally, gitignored):** `env.prod`, `.env.production`.
- **Scrubbed in place:** `.replit` (blanked `[userenv.shared]` secret values), `script/inspect-gallery.ts` + `script/inspect-prod-db.ts` (→ `process.env.DATABASE_URL`), `TOOLS/audit/.env.example` (placeholder Groq key).
- **Neutralized token:** leaked Neon password replaced with `REDACTED_ROTATE_ME` across **209 dev/ops scripts** (`scripts/`, `scratch/`, `Launch_Ideas/promot/`, root throwaway). These are not part of the deployed app.
- **`.gitignore`:** explicit secrets section added.

## 3. Verification (commands + results)
```
git grep -nI -E "<known secret values>" -- ':!reports/02...'   → ✅ no matches in tracked text
git diff --cached | grep '^+' | grep -E "<secret values>"      → ✅ no secret in any added line
npx tsc (touched files)                                        → ✅ 0 errors
```
- The only binary "match" was a product PNG (`yee/C4-1067/...png`) hitting a 4-char fragment — a false positive, not a secret.

## 4. ⚠️ Git history is NOT clean (decision pending)
`git rm --cached` and scrubbing remove secrets from the **current tree only**. Every value above is still retrievable from prior commits. Options (pick one — not done yet per your instruction):
- **(A) Rotate-only:** rotate all credentials (§1). History still contains the old, now-invalid values. Simplest; safe once rotation is complete.
- **(B) History rewrite:** `git filter-repo` / BFG to purge the values, then force-push. More thorough but rewrites shared history (coordination + force-push required).
**Recommended:** do **(A) rotation now** (mandatory regardless), then decide on (B) separately.

## 5. Status
- **Branch safe to keep working on?** Yes — no live secret remains in the tracked tree; new commits won't re-expose these (gitignore covers env files). History caveat in §4 stands.
- **What still blocks production:** (1) rotate all §1 credentials; (2) decide history rewrite (A/B); (3) the pre-existing dirty files (`navbar.tsx`, `security.ts` CSP, `vercel.json` CSP) still need to be committed/resolved before a clean merge; (4) earlier QA "CAUTION" items.
