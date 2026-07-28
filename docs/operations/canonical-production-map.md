# AQUAVO — Canonical Production Map

**Status:** authoritative. If any other document disagrees with this file, this file wins.
**Last updated:** 2026-07-28

---

## 1. GitHub

| Item | Value |
|---|---|
| Repository | `JAAFAR1996/AQUAVO` (public) |
| Canonical production branch | `main` |
| Default branch | `main` |

There is exactly one repository. Two git remotes (`origin` and `aquavo-repo`) are
configured locally and both point at the same URL; `origin` is canonical. The duplicate
remote is a local convenience only and carries no separate state.

## 2. Official branch strategy

* `main` is the only long-lived branch and the only branch that deploys to production.
* Work happens on short-lived `feat/*`, `fix/*`, `hotfix/*` branches.
* A `release/*` branch is used when work must be curated onto the latest `main` rather
  than merged wholesale (as with the accounting consolidation).
* Every branch reaches `main` through a pull request. No direct pushes to `main`.
* A branch is deleted once `git merge-base --is-ancestor <branch> origin/main` succeeds.
* `prototype/*` branches are exploratory and are never merged; they are deleted or
  archived as tags.

## 3. Vercel

| Item | Value |
|---|---|
| Official project name | `aquavo` |
| Project ID | `prj_eaTDQ2tkfCX4Mxhn2nymDfDDARep` |
| Org / team ID | `team_56HgXZxSSPCYeVr5ADcQJOK8` |
| Owner | jaafar1996's projects |
| Production branch | `main` |
| Framework preset | Vite |
| Build command | `pnpm run build` |
| Install command | `pnpm install --frozen-lockfile` |
| Output directory | `dist/public` |
| Node.js version | 24.x |
| Regions | `fra1` |

`aquavo` is the **only** Vercel project for this application. The local binding in
`.vercel/project.json` matches the values above and must not be re-pointed.

### Retired check contexts

The Vercel projects / GitHub check contexts named **`aquavoiq`** and **`fist-live`**
return 404 in the current team. They are historical records only. Do not recreate them,
do not add them as required status checks, and do not treat their old statuses as gating.
If branch protection still requires them, remove them from the required-checks list.

## 4. Cloudflare — ownership boundary

`aquavoiq.com` DNS is managed in Cloudflare and is **out of scope for all repository and
deployment automation**. Nothing in this repository, in CI, or in any runbook may create,
modify or delete Cloudflare records, zones, page rules, or the domain's Vercel
attachment. Domain and DNS changes are a manual, owner-only operation.

## 5. Neon (database)

| Item | Value |
|---|---|
| Project | `shiny-tree-43710630` ("fishweb") |
| Production branch | `br-patient-mouse-a4d4cgr4` |
| Production compute endpoint | `ep-quiet-moon-a4h7tdze` |
| Database | `neondb` |
| Role | `neondb_owner` |
| PostgreSQL | 17.10 |

Non-production child branches are created per verification exercise and are disposable.
The production endpoint id is pinned in `server/db-target.ts` (`PRODUCTION_ENDPOINT_IDS`)
and in `e2e/support/target-safety.mjs` (`PRODUCTION_DB_MARKERS`); those guards fail closed
and must never be relaxed to let a test or script reach production.

Use the **direct** (non-pooled) endpoint for DDL; the pooled host is for application
traffic.

## 6. Migration source of truth

`migrations/*.sql` in this repository, at the commit being deployed. Nothing else.

`npm run db:push` (drizzle-kit push) is **forbidden** — the schema has drifted from the
Drizzle model and a push would rewrite production. Apply additive SQL surgically.

The accounting cutover set, in dependency order:

1. `add_order_item_cost_snapshot.sql`
2. `add_orderitem_backfill_trigger_safety.sql`
3. `backfill_orderitems_from_jsonb.sql`
4. `add_fulfillment_costing.sql`
5. `add_fulfillment_hardening.sql`
6. `add_pim_line_identity.sql`
7. `add_product_cost_resolution.sql`
8. `fix_blocked_ips_timestamptz.sql`
9. `drop_product_cost_zero_defaults.sql`

Execution contract for every file: no top-level `BEGIN`/`COMMIT`; the executor owns the
transaction (`psql -v ON_ERROR_STOP=1 --single-transaction`). Verify each file's SHA-256
against its committed blob immediately before running it. Never use
`session_replication_role` and never globally disable triggers.

Full hashes, locks, durations and checks: `docs/audit/production-accounting-cutover-plan.md`.

## 7. Deployment sequence

**Migrations first, application second.** The nine migrations are additive and
backward-compatible (nullable columns, `NOT VALID` checks), so the currently deployed
application keeps working against the migrated schema.

1. Run the read-only pre-migration checks (cutover plan §5). Abort on any mismatch.
2. Create a timestamped Neon backup branch from production.
3. Apply the nine migrations in order, each in its own executor-owned transaction.
4. Run the post-migration readiness checks (cutover plan §8).
5. Merge the release PR into `main`.
6. Vercel deploys `main` to production automatically.
7. Verify `/ready` returns 200 with `orderCreationEnabled: true` and `missingColumns: []`.
8. Run the production smoke checks (cutover plan §9).

Never deploy application code that is behind `main`; a stale tree would revert
owner-approved work. Always deploy by merging to `main`, not by pushing a working tree
with `vercel --prod`.

> **Current state (2026-07-28):** steps 1–4 are **already complete on production**. The
> nine migrations are applied and verified; production is running the previous
> application code against the migrated schema, which is the intended backward-compatible
> interim state. Steps 5–8 remain.

## 8. Rollback source of truth

Two independent mechanisms, in order of preference:

1. **Neon backup branch** taken immediately before the migration run. Fastest and does not
   depend on the rollback SQL being correct. Retain for at least one business day.
2. **Committed rollback partners** — `migrations/<name>_rollback.sql`, one for each of the
   nine forward migrations, executed in reverse dependency order. Proven end-to-end.

The backfill rollback requires the exact batch id from the forward run plus
`aquavo.backfill_rollback_authorized = 'on'`, both set transaction-locally. It deletes only
rows tagged with that batch and aborts on any row-count mismatch.

`orderitem_backfill_batches` is deliberately **retained** after rollback (MODE B audit
trail). That is the expected end state, not drift.

Application rollback is a Vercel instant rollback to the previous production deployment.

## 9. Branches retained temporarily

| Branch | Reason |
|---|---|
| `release/accounting-production-20260728` | the release PR; delete after merge |
| `feat/accounting-canonical-fulfillment` | source of the accounting port; archived as a tag, delete after the release is verified |
| `fix/database-repair-20260722` | open draft PR #11; close as superseded after the release is verified |

Archival tags (permanent, safe to keep):

* `archive/accounting-before-consolidation-20260728` → `765bc52ded0bfcb76550157841a773b91fd35993`
* `archive/database-repair-before-consolidation-20260728` → `c0b58bf71d2f18551439508bba3972d71ace1081`

## 10. Branches safe to delete after merge

A remote branch may be deleted **only** when it is fully contained in `main`:

```bash
git merge-base --is-ancestor origin/<branch> origin/main   # exit 0 => safe
```

Branches with unique unmerged commits are never deleted silently — either merge them,
archive them as a tag, or leave them and report why.
