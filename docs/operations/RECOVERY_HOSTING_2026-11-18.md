# AQUAVO — Emergency Hosting Recovery (18 Nov 2026)

## Scope and current evidence
- Source of truth: GitHub `JAAFAR1996/AQUAVO`, protected `main` (commit `3e1c0cd` at diagnosis).
- Original host: Vercel project `aquavo`; owner team `jaafar1996s-projects`.
- Vercel project/deployment lookup and resume API returned 404; domain remained registered and mapped.
- Neon project `fishweb` with protected `production` branch is reachable. **Do not recreate or migrate the production database.**
- `render.yaml` in this recovery branch is an isolated *staging-only* deployment specification; no production changes have been made.

## Recovery route A: restore original Vercel team (preferred if eligible)
1. Verify whether the team was downgraded from Pro trial to Hobby, paused by a quota, or restricted for commercial use.
2. Vercel documents that upgrading a downgraded Pro-trial team to Pro reinstates previous projects and deployments. This is conditional: it does not prove this team's pause reason.
3. Plan changes and payments require the store owner's approval. Do not create a second commercial deployment on Hobby.
4. After restoration, verify the custom domain, database connectivity, admin, public catalog, cart, COD checkout, invoice, and external integrations.

## Recovery route B: Render staging
1. Connect the owner's Render account; the existing Render service `AQUAVO-COMPANY` (April 2026) is a *different repository/service* and must not be overwritten.
2. Import this branch's `render.yaml` as a new Blueprint. The service name `aquavo-store-recovery` is intentionally different.
3. `plan: free` is ONLY for a constrained test. Render states free services are not for production; before live cutover, pick and approve a suitable paid plan.
4. Set `DATABASE_URL` and `SESSION_SECRET` privately through Render's Environment UI. Do **not** paste, commit, or publish secret values. Start command deliberately fails without both.
5. Use a disposable/staging database for any checkout tests that might create or modify records. Production database may be read for diagnostics; do not run test orders against it.
6. Configure `CLIENT_URL` to the exact verified staging host before CORS/checkout tests. Restore other required integration variables separately from trusted secret stores, including payment, media, email and any webhook secrets.
7. The staging config sets `DISABLE_SCHEDULED_JOBS=true` and disables auto-deploys to prevent double-execution of scheduled tasks. Do not enable scheduled jobs before an owner-approved cutover plan.

## Cutover release gate
- HTTP /health succeeds and logs confirm the intended environment/DB target.
- Homepage, categories, SEO product links, inventory availability, variant pricing, images, cart and mobile checkout render correctly.
- Validate CSRF, cookies, CORS, invoice languages, COD and online payment as applicable, and third-party webhooks.
- Compare latest real order count and last order IDs to production before/after; never treat NULL costs as zero.
- Only after passing all checks and owner's explicit approval, change DNS on the authoritative provider (Cloudflare) and confirm TLS on www and apex.
- Keep the old DNS targets and TTL for rollback; if Render fails, restore original records only when Vercel is demonstrably healthy.

## Evidence and limits
- Repository code was inspected; no Render deployment, build, runtime test or domain switch has been completed.
- Do not mark AQUAVO restored until a live external test verifies customer ordering end-to-end.
