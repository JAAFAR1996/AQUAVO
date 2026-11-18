# AQUAVO — Hosting Recovery, 18 November 2026

## Objective and current status

Restore the existing AQUAVO store, customer ordering and its original domain while preserving the production database and real orders. **The recovery URL is live against the original production Neon database. Isolated checkout and production read checks passed. The original domain and several integrations remain unavailable.** All recorded times in this document use Asia/Baghdad (UTC+3), on 18 November 2026 unless stated otherwise.

- The original Vercel website still returns `503 DEPLOYMENT_PAUSED`. Earlier project/deployment lookups and the unpause attempt returned 404. A subsequent read-only connector request returned an explicit 403: `The App installation does not have access to this project.` The Vercel app is connected, but its access to this project is unavailable. These responses are **not proof of project deletion**. The cause of the original deployment pause remains unconfirmed.
- Original Neon production data remains accessible. The read-only check at **15:56:53.770 Baghdad time** found **118 orders, 231 products and 239 inventory rows**. These are incident-check counts, not a current stock audit. No destructive database restore or schema rebuild has occurred.
- Render deployment `dep-dbuq08dckfvc73cuipn0`, commit `4487b7b`, became **live at 16:00:15 Baghdad time**. Database access, catalog reads, a synthetic COD checkout, idempotent replay and an unauthorized-session check passed against an isolated Neon child branch.
- Production deployment `dep-dbuq3u8jo6nc73ar9qq0`, commit `52d862d`, started at **16:02:47** and became **live at 16:07:38 Baghdad time**. Startup logs identify the canonical original production endpoint. Public checks at **16:09:15** and read-only database counts at **16:09:59.246** passed, as recorded below.
- Cloudflare authenticated DNS access remains unavailable. No further browser login attempts are being made. One authorized support email was already sent to Vercel; application recovery continues independently of that reply.
- No Cloudflare DNS change, original-domain reassignment, production database restore, or merge to `main` has occurred. The Render Blueprint plan is **not approved**.

## Resources and source of truth

| Resource | Identifier / location |
|---|---|
| Repository | `JAAFAR1996/AQUAVO` |
| Original production source at diagnosis | Protected `main`, `3e1c0cd9251281d8cda550504ccad0a2554a9bbb` |
| Recovery branch | `recovery/render-20261118` |
| Deployed application commit | `52d862d95de5d0b23610cb897d8df96bd641c8cc`; subsequent documentation-only commits do not imply a new deployment |
| Original Vercel project / team | `aquavo` / `prj_eaTDQ2tkfCX4Mxhn2nymDfDDARep` / `team_56HgXZxSSPCYeVr5ADcQJOK8` |
| Original domain | `www.aquavoiq.com`; apex redirects to www; authoritative DNS is Cloudflare |
| Render service | `aquavo-store-recovery-preview`, `srv-dbup1i1srm7s73figmeg` |
| Render workspace / configuration | `tea-d10bk5q4d50c73akpcmg`; Node, Frankfurt, free plan, automatic deploys off |
| Recovery URL | https://aquavo-store-recovery-preview.onrender.com |
| Original Neon database | Project `shiny-tree-43710630` (`fishweb`), protected production branch `br-patient-mouse-a4d4cgr4`, database `neondb` |
| Canonical production endpoint | `ep-quiet-moon-a4h7tdze` |
| Isolated verification branch | `br-blue-morning-a4mu2n1v`; endpoint `ep-crimson-lake-a4bujrf8` |

The separate Render service `AQUAVO-COMPANY` belongs to another repository and must not be overwritten. Never place connection strings, tokens, customer records or integration secrets in this document, Git, logs or public artifacts. The order identifier below belongs only to the synthetic child-branch test.

## Vercel access diagnosis

The material new diagnostic was a read-only `GET /v2/connect/projects/prj_eaTDQ2tkfCX4Mxhn2nymDfDDARep/connectors` with the explicit original team and `limit=1`. It returned **403 forbidden**, with the app-installation access message above. Request ID: `iad1:fra1:iad1:sfo1::tw2p2-1795007002183-8910e9d92c5e`.

This establishes an effective permission failure for this connected installation; it does not establish whether the project was deleted, or why its deployment was paused. The tool reported no known automatic remedy and instructed against unchanged retries or assuming reauthentication would fix it. No exposed project undelete/restore operation was found. Vercel's [documented deleted-deployment recovery](https://vercel.com/docs/errors/deployment_deleted) is a different operation and requires project access; the observed [deployment-paused error](https://vercel.com/docs/errors/deployment_paused) does not establish deletion. The same-endpoint CLI fallback is unavailable here because neither a system nor a repository-local Vercel CLI was found.

## Confirmed Render database failure and changes

The Render database 503 was traced to connection-string normalization in `server/db.ts`. The old expression `.replace(/[&?]channel_binding=require/g, "")` removed the opening query separator when Neon supplied `channel_binding` first:

```text
.../neondb?channel_binding=require&sslmode=require
became .../neondb&sslmode=require
```

This changed the requested database path instead of preserving `neondb` and its TLS option. It is a separate, confirmed application bug; it does not explain the original Vercel pause.

| Change | Evidence / resulting behavior |
|---|---|
| `794a49007b95d7e787616ce8480e2087ee8db62b` | Standalone invoice fonts use bounded, fixed upstream URLs; preview pages carry a visible test label and noindex headers; missing merchant-notification configuration leaves durable alerts pending instead of falsely marking them delivered. Live invoice generation remains untested. |
| `4487b7b0ed3ff4a63eb539402e15fe3a2230fcb2` | Parses the PostgreSQL URL and removes only the unsupported `channel_binding` parameter, preserving database path, encoded credentials, TLS and unrelated options. Malformed URL errors do not echo the credential URL. |
| Targeted verification | 25 runtime tests passed. The URL normalizer has six regression cases covering query order, encoded credentials, missing/repeated options and invalid input. |
| Verified child deployment | `dep-dbuq08dckfvc73cuipn0`, commit `4487b7b`, live at **16:00:15 Baghdad time**; isolated runtime evidence is recorded below. |
| Verified production deployment | `dep-dbuq3u8jo6nc73ar9qq0`, commit `52d862d`, live **16:07:38 Baghdad time**; original database and public storefront verification passed. |

## Verified isolated checkout and storefront evidence

All test writes below targeted child branch `br-blue-morning-a4mu2n1v`, endpoint `ep-crimson-lake-a4bujrf8`. They are not real customer orders and were not written to the original production branch.

| Check | Confirmed result | Limit |
|---|---|---|
| Database health | HTTP **200** against the child database | Does not establish production health after cutover. |
| Public catalog | **217** returned products; checked response excludes private financial fields | This is the public response count, not the 231-row production table count. |
| Synthetic COD checkout | HTTP **201**; test order `371e7cd0-4565-43cb-af16-68b27fe78d8e`; product `houyi-moss-glue-5g` stock **37 → 36** | Child branch only; no real purchase. |
| Idempotent checkout replay | HTTP **200**, same order; stock remained **36** | Confirms no duplicate order or second decrement for this replay. |
| Unauthorized session | HTTP **401**; cookie carried the **Secure** attribute | Does not establish successful admin login or all authentication paths. |
| Browser storefront | Homepage, products, images, variant selection, cart quantity and price, delivery total and checkout form were verified | No purchase was submitted through the browser; a mobile viewport was not verified. |
| Invoice and admin login | **Not tested** | No claim of invoice generation or administrative access recovery. |

## Work tracker and remaining checks

Execution owner: recovery operator. Decision owner: Jaafar. Do not treat an unchecked item as complete.

| Work | Status | Evidence / next action |
|---|---|---|
| Preserve source and original data | Verified within the checks above | Counts at 15:56:53.770 and 16:09:59.246 match: 118 orders, 231 products, 239 inventory rows. Preserve every existing and newly received real order. |
| Publish targeted recovery fixes | Done on recovery branch | Commits above; no `main` merge. |
| Verify corrected child deployment | Done | Live deployment, database 200, catalog response and synthetic COD results above. |
| Verify storefront and ordering | Partly verified | Browser shopping flow and child API checkout passed. Mobile viewport, browser-submitted checkout and invoice generation remain untested. |
| Verify admin and integrations | Pending / configuration blocked | Admin login untested. Check payment, email, merchant alerts, uploads and shipping integrations individually; missing secrets are unrecovered capabilities. |
| Switch to original production data | Done | Canonical endpoint confirmed in new process logs; database, public catalog and unchanged baseline counts verified. No test purchases on production. |
| Restore original domain and TLS | Blocked on authenticated DNS access | Render association is planned; Cloudflare records and original routing remain unchanged. |
| Reconcile changes to `main` | Pending review and required CI | Recovery branch remains unmerged; do not bypass protected-branch checks. |

### Production cutover configuration

After the isolated checkout passed, only these three Render environment values were replaced. Secret values were supplied privately and are not reproduced here.

| Variable | Applied target / setting |
|---|---|
| `DATABASE_URL` | Existing canonical production database connection; no new or restored production database |
| `NEON_PRIMARY_ENDPOINT_ID` | `ep-quiet-moon-a4h7tdze` |
| `RECOVERY_PREVIEW` | `false` |

Other environment values were not changed in this cutover. The pre-cutover read-only baseline is **118 orders, 231 products, 239 inventory rows at 15:56:53.770 Baghdad time**. A second read at **16:09:59.246** returned the same counts. Counts establish continuity for these checks, not a full row-by-row audit or proof of integration recovery.

### Production final verification

- Deployment **live at 16:07:38**, commit `52d862d95de5d0b23610cb897d8df96bd641c8cc`, instance `p97xb`. Startup logs confirmed `env=production`, database `neondb`, endpoint `ep-quiet-moon-a4h7tdze`.
- At **16:09:15**, homepage returned **200** without the preview banner or recovery noindex directives; `/health/db` returned **200, connected**. No production purchase was submitted.
- Public catalog returned **217 products** and passed the check excluding private financial fields. Product `houyi-moss-glue-5g` retained production stock **37**; its isolated test branch had **36**.
- The actual public product image on `res.cloudinary.com` returned **200**, `image/webp`, **82,524 bytes**. Existing image delivery works; this does not verify authenticated image uploads.
- Read-only production counts at **16:09:59.246**: **118 orders, 231 products, 239 inventory rows**, matching the pre-cutover baseline.
- Fresh browser verification on the production recovery URL confirmed the rendered homepage, live product and bundle sections, preview-label removal and an operable cart. The temporary browser test cart was emptied; no browser order was placed. A desktop screenshot was captured. A mobile viewport was not tested.
- Verified public URL: **https://aquavo-store-recovery-preview.onrender.com/**. The retained service name includes `preview`, but the running service now targets the original production database with `RECOVERY_PREVIEW=false`.
- **Original domain: blocked / not changed.** `www.aquavoiq.com` still shows Vercel's paused deployment. No Cloudflare DNS, domain binding or TLS cutover was performed.
- **Not restored or not verified:** admin login and invoice generation; Wayl online payments; email and password-reset delivery; Telegram merchant alerts; authenticated uploads; AI integrations; scheduled jobs and messaging automations. Missing secrets remain a dependency. Online-payment availability reports unavailable. Pending merchant notifications are retained rather than falsely acknowledged.
- The service uses Render's **free plan**. Cold-start loading was observed during recovery. No paid upgrade or new paid subscription was purchased.

## Domain plan — prepared, not applied

Blueprint `exs-dbuq0kqfngtc73dhm77g`, planned sync `exe-dbuq0l2fngtc73dhm7j0`, adopts the existing Render service. Automatic Blueprint sync is off. The reviewed plan adds `www.aquavoiq.com`, sets the health check to `/health`, captures existing service settings, and clears the irrelevant static-site `staticPublishPath` value from `public` to empty. It contains no environment-variable changes or required manual secret inputs. **Approval has not been submitted.**

Before applying, refresh the plan and confirm the intended existing service ID, free compute plan, and absence of replacement resources. Verify the workspace's remaining included custom-domain allowance; no paid upgrade is authorized by this document. The existing onrender.com URL stays enabled.

After application verification and authorized DNS access, record the current Cloudflare website records and TTLs before changing only the necessary apex/www targets. Preserve email and verification records. Domain association alone does not route traffic: verify authoritative DNS, issued TLS, apex-to-www redirect, storefront, cookies and order reads on the actual hostname. Do not claim restoration from a cached search result or deployment status alone.

## Production safeguards and rollback

The isolated child checkout and production cutover are complete. The deployed process uses the canonical production endpoint, and `RECOVERY_PREVIEW=false` is intentional. Keep production verification read-only unless a separate authorized live transaction is needed. Do not submit synthetic orders to the original production database.

Keep `DISABLE_SCHEDULED_JOBS=true` while checking for duplicate workers. Restore integration configuration privately and confirm each capability before reporting it available; retain undelivered notification events for controlled retry. Re-enable each required worker only after confirming one active owner and its target. Invoice generation and admin login still require separate verification.

Rollback the application or traffic to a **previously verified working release**. Do not roll back to the original mock-data preview. Restore previous DNS targets only after the old destination is demonstrably healthy. Keep the production database and all orders created during recovery in place; never replace it with the test branch, truncate tables, rerun migrations blindly, or discard newer orders. If the public service must be withdrawn, suspend order acceptance or withdraw traffic while retaining production data; do not point a customer-facing checkout back to the child database. Preserve the isolated verification branch and incident evidence until reconciliation is complete.
