# Neon Child-Branch Verification — Final Decision

> ⚠️ **SUPERSEDED — see §12 "rev. 6 — Full child-branch execution" at the end of this
> file.** The child branches were subsequently created, all five operations were executed
> on both, and the rollback was proven. The "BLOCKED" decision below reflects rev. 3 only
> and is retained for history.

**Date:** 2026-07-23 (rev. 3)
**Decision: BLOCKED on Neon execution.** Phase 0 PASSES; the expanded four-operation
migration set is prepared, audited, committed and **locally verified (1,178 tests: 490 server
+ 688 client, 0 failed; repo typecheck clean; build green)**. Nothing has
been run against Neon and no branch has been created.

**Production state: the 12-order relational coverage gap REMAINS UNREPAIRED.** Its root
cause is identified and its repair is built and tested locally, but repair is pending
child-branch verification and owner approval. Diagnosis is not remediation.

---

## 1. Summary

Phase 0 completed and passed. Everything after Phase 0 is blocked by a single cause: the
connected Neon MCP integration is authorized in **read-only** mode. Branch creation is a
write operation, so the two authorized child branches could not be created, and no gate
downstream of them could execute.

This is an authorization scope issue, not a defect in the migrations, the code, or the
plan. The migration integrity gate passed cleanly.

## 2. Phase 0 status — CONDITIONAL PASS (rev. 2, 2026-07-23)

Phase 0 rev. 1 was accepted provisionally and then **failed one gate on challenge**. After
read-only forensic reconciliation, Phase 0 now passes with the order-item finding corrected.

| Gate | rev. 1 | rev. 2 (after reconciliation) |
|---|---|---|
| Neon project identified by multiple independent signals | ✅ PASS | ✅ PASS (revalidated, uncached) |
| Production branch identity + parent recorded | ✅ PASS | ✅ PASS |
| Target revalidation (project/branch/db/role/endpoint) | not done | ✅ PASS |
| Forward-migration SHA-256 vs `neon-migration-review.md` | ✅ PASS | ✅ PASS — both exact, unchanged |
| Rollback-migration hashes recorded | ✅ | ✅ |
| Production object/row baseline captured | ⚠️ partly wrong | ✅ PASS (corrected) |
| **Order-item topology** | ❌ **FAIL — false negative** | ✅ **PASS — corrected, §5** |
| Reconciliation vs prior 2026-07-21 evidence | not done | ✅ PASS — counts identical |

**Overall Phase 0: PASS (rev. 2).** One gate failed in rev. 1 and has been corrected with
full evidence; the correction is recorded, not silently substituted.

**Process lesson worth carrying forward:** rev. 1 turned a narrow negative result
("no table with this exact name") into a broad architectural conclusion ("no relational
side exists"). Absence-of-evidence claims in this audit must be backed by a pattern sweep
across all schemas, not an exact-name lookup — and must be checked against prior recorded
evidence before being published. The prior evidence contradicted the claim and would have
caught it immediately.

Evidence: `docs/audit/neon-child-branch-baseline.md` (§6 contradiction resolution).

Key identifiers:

- Project: `fishweb` / `shiny-tree-43710630` (org `org-sweet-glitter-04175211`)
- Production branch: `production` / `br-patient-mouse-a4d4cgr4` (root branch, no parent)
- Database `neondb`, PostgreSQL 17.10, 196 public tables, 143 products, 37 orders

## 3. The blocker — exact permission missing

Every Neon MCP tool schema returned by the integration carries this server-side notice:

> The MCP server is currently configured with **read-only permissions**. All write-access
> tools have been removed. All remaining tools are limited to read-only operations (for
> example, read-only SQL queries). … The user can remove read-only mode by removing the
> `readonly` query param from the MCP server URL, or by logging out and back in with OAuth
> and selecting full access.

**Missing capability:** write / full access on the Neon MCP connection for project
`shiny-tree-43710630`.

**Tools that were stripped and are required by this task:**

| Required tool | Needed for |
|---|---|
| `create_branch` | Creating both authorized child branches |
| `run_sql` / `run_sql_transaction` **with write permission** | Applying the two forward migrations in explicit transactions; seeding synthetic test data; rollback and re-apply |
| `delete_branch` (optional) | Disposing of the rollback branch afterwards |

The surviving `run_sql` tool executes read-only statements only, so even given an existing
branch it could not run `BEGIN; … COMMIT;` around DDL.

### How to unblock — official OAuth flow, no credentials in chat

**Not requested yet** — per instruction, write access is deferred until the contradiction
was closed. The contradiction is now closed (§5), so this is the precise ask.

**Preferred (officially supported) flow:** disconnect the Neon connector and reconnect
through **Neon OAuth**, selecting **full access** at the consent screen instead of
read-only. The connector's own notice names this as a supported path
("logging out and back in with OAuth and selecting full access").

The alternative the notice also mentions — hand-editing the `readonly` query parameter out
of the MCP server URL — is **not recommended here** and is not being requested. It is a URL
manipulation rather than a re-consent, it leaves no audit record of a scope change, and it
is indistinguishable from a workaround. Prefer the OAuth re-consent.

**Minimum capabilities required** (all scoped to project `shiny-tree-43710630`):

| Capability | Tool | Why |
|---|---|---|
| Create child branches | `create_branch` | The two authorized isolated branches |
| Write SQL **on those child branches** | `run_sql` / `run_sql_transaction` | `BEGIN; … COMMIT;` around each migration; synthetic seed data; rollback + re-apply |
| Branch-scoped ephemeral connection details | `get_connection_string` | Real multi-connection concurrency; running services against the branch |
| Delete a branch (optional) | `delete_branch` | Disposing of the rollback branch |

Neon OAuth scopes are granted per-project, not per-branch, so this necessarily also confers
production write capability at the API level. **Production remains protected by task
boundary, not by permission.** That gap is exactly why the hardening items in §7b matter.

Nothing here requires a database password, a production connection string, an API key, or
the historical `neondb_owner` credential in chat — and none will be accepted.

### A second gate to expect after that one

Two requested items need more than MCP write access, and will surface as soon as the first
blocker clears:

- **"Run the actual fulfillment services against this Neon child branch"** and
- **"true multi-connection concurrency using separate real Neon connections"**

Both require a *branch-scoped connection string* handed to the Node process and to parallel
`pg` clients — the MCP `run_sql` transport cannot hold two concurrent sessions against each
other, which is precisely what the advisory-lock and race tests need. The connected MCP
exposes `get_connection_string`, which should supply a branch-scoped credential without
touching production secrets, but whether it survives in read-only mode is untested. Plan
for the concurrency harness to read a branch-only connection string from an env var that
you populate, never from chat.

## 4. Reports not produced, and why

Four of the six requested documents are **deliberately absent**. Writing them would mean
publishing headings with no evidence under them, and an audit trail that implies gates ran
when they did not is worse than a missing file.

| Report | Status |
|---|---|
| `neon-child-branch-baseline.md` | ✅ written (Phase 0 only; production baseline, not child-branch baseline) |
| `neon-verification-final.md` | ✅ this document |
| `neon-migration-execution.md` | ❌ not written — no migration executed |
| `neon-concurrency-verification.md` | ❌ not written — no concurrent connections opened |
| `neon-shadow-comparison.md` | ❌ not written — no branch data to compare over |
| `neon-rollback-verification.md` | ❌ not written — no rollback executed |

## 5. Order-item topology — CORRECTED 2026-07-23

> ⚠️ **This section previously contained a false claim, retained here for audit integrity.**
>
> **Retracted claim (rev. 1):** "All 37 production orders store line items exclusively in
> `orders.items` (JSONB). The `order_items` table does not exist at all — 0 relational
> order-item rows... The requested comparison of JSONB and relational order items therefore
> has no relational side on this data set."
>
> **That was wrong.** It came from an exact-equality filter (`table_name='order_items'`)
> that could not match the real table, `order_items_relational`. The `0` it returned was
> then over-interpreted as "no relational storage exists." The prior 2026-07-21 evidence in
> `neon-forensics.md` was correct all along and is reinstated.

**Corrected topology** (full evidence: `neon-child-branch-baseline.md` §6):

- `public.order_items_relational` **exists** — 100 rows, 7 columns, FKs to `orders` and
  `products`, 3 indexes, 0 orphans.
- `public.order_items` does not exist under any name, casing, view, or synonym — but it
  was never the operative table.
- Coverage: **25 of 37 orders** have relational lines; **12 are JSONB-only**; 0 are
  relational-only; 0 have neither.
- Agreement: across the 25-order overlap, **97 of 97 comparison groups agree exactly** on
  line count, quantity, and price. No divergence defect — only a coverage gap.
- Root cause of the gap: **identified, but the gap itself is NOT repaired.** `orders.source`. WhatsApp/admin-created orders are 19/19 covered;
  website/storefront orders are 6/18, with all 12 misses in a contiguous
  2026-05-12 → 2026-06-17 window. The storefront path stopped writing relational lines in
  that window; a fix landed ~2026-06-22.
- **Production data did not change.** Today's counts (100 rows / 25 orders) are identical
  to the independently recorded 2026-07-21 audit.

**Effect on the shadow-comparison plan (revised).** The JSONB-vs-relational axis *is* live
and testable against real production data — the opposite of what rev. 1 concluded. It must
be exercised across the 25-order overlap, and the 12-order gap must be treated as a known
input condition, not a test failure. Any comparison that silently assumes full relational
coverage will misreport those 12 orders.

## 5b. Blocking dependency discovered — the backfill cannot run

`migrations/backfill_orderitems_from_jsonb.sql` writes six cost-snapshot columns
(`unit_cost_price`, `unit_packaging_cost`, `unit_insert_cost`, `cost_snapshot_status`,
`cost_snapshot_source`, `cost_snapshot_confidence`). **None exist** on the live 7-column
table. The script would abort on `column ... does not exist`.

Independently corroborated: the backfill stamps `metadata->>'backfilled' = true` on
everything it writes, and **0 of the 100 live rows carry that marker** — so it has never
run on production, and all 100 rows came from the application write path.

Its prerequisite, `migrations/add_order_item_cost_snapshot.sql`, is **not applied to
production** and is **not part of the two-migration sequence authorized for this task**.
This ordering dependency must be resolved on the verification branch before the 12-order
gap can be repaired. Flagging it rather than acting on it — expanding the authorized
migration set is your call, not mine.

## 6. Boundaries honored

- No branch created; no write issued on any branch.
- No production write, schema change, migration, promotion, endpoint change, env-var
  change, or deletion.
- No credential displayed, reused, requested, or rotated.
- No customer PII read or reproduced.
- No legacy accounting code deleted.
- No deployment or promotion.
- The 38 zero-byte files were not touched.
- No destructive filesystem operation performed.

## 7. Production credential-rotation runbook (documented, NOT executed)

Recorded per instruction; **do not run any of this without separate explicit approval.**
The historical exposed `neondb_owner` credential is a separate incident and was neither
reused nor displayed here.

1. **Inventory consumers first.** Enumerate everything holding a production connection
   string: Vercel env vars (`DATABASE_URL` and any pooled variant), CI secrets, local
   `.env` files, scheduled jobs. Rotation without a complete list causes an outage.
2. **Prefer a new role over resetting the owner.** Create a least-privilege application
   role scoped to `public`, rather than continuing to run the app as `neondb_owner`. This
   converts the incident into a permanent improvement instead of a repeat of the same
   exposure surface.
3. **Rotate in a maintenance window.** The project window is Saturdays 08:00–09:00 UTC.
4. **Reset the password** via the Neon console or API for the target role. Neon invalidates
   the old password immediately — there is no dual-validity grace period, so update
   consumers in the same window.
5. **Update consumers**, redeploy, and confirm the app reconnects before closing the window.
6. **Verify the old credential is dead** by attempting a connection with it and confirming
   rejection.
7. **Restrict the blast radius going forward:** enable `allowed_ips` (currently empty, i.e.
   unrestricted) and consider `protected_branches_only`. Mark `production` as **protected**
   — it is currently `protected: false`, which is why an accidental write or promotion is
   mechanically possible today. This alone is worth doing regardless of rotation.
8. **Purge the leaked value** from git history, logs, and any chat/ticket transcript, and
   confirm the secret scanner flags it.

## 5bis. Storefront fix — VERIFIED IN REPOSITORY HISTORY

The 2026-06-22 inflection was a data-derived hypothesis. It is **now confirmed by the
commit that caused it** — this is no longer a hypothesis.

| Field | Evidence |
|---|---|
| **Commit** | `f1b85d46c649fed0b5a46c1d97156b6d03c1cae3` (`f1b85d4`) |
| **Date** | Fri 2026-06-19 20:51:42 +0300 — inside the data gap (last miss 06-17, first cover 06-22) |
| **Subject** | `fix(orders): persist line items into order_items_relational on every order` |
| **File / function** | `server/storage/order-storage.ts` → `createOrderSecure()`, block "6b" |
| **Diff size** | +18 lines, 1 file |
| **Tests added** | **None.** The fix shipped unguarded. |

The commit body states the defect independently of our data analysis:

> "Website checkout only wrote items to orders.items (JSONB); the relational table
> (order_items_relational) was never populated, so sales analytics under-counted (only
> ~half of orders had relational rows). Insert relational rows inside the order
> transaction."

"only ~half of orders had relational rows" matches the measured 25/37 exactly. **Data
evidence and code evidence agree independently.**

### Do all current order-creation paths dual-write transactionally?

| Path | Source tag | Writes JSONB | Writes relational | Same transaction | Verdict |
|---|---|---|---|---|---|
| `order-storage.ts` `createOrderSecure()` — storefront | `website` | ✅ | ✅ (since f1b85d4) | ✅ `tx.insert` | **OK** |
| `invoice-storage.ts` `createOrderFromInvoice()` — admin | `whatsapp` | ✅ | ✅ | ✅ `tx.insert` | **OK** |
| `order-storage.ts` `createOrder()` — legacy | — | ✅ | ❌ **none** | ❌ bare `db.insert` | **LATENT HAZARD** |
| `auto-order-processor.ts` | — | ❌ | ⚠️ `db.insert` (not `tx`) | ❌ | **DEAD / BROKEN** |

Two findings beyond the original question:

- **`createOrder()` is the same bug, still present.** A bare `db.insert(orders)` with no
  transaction and no relational write. No route calls it today (routes use
  `createOrderSecure`), but it remains on the storage interface — routing anything to it
  would silently recreate the gap.
- **`auto-order-processor.ts` cannot run at all.** It inserts `totalAmount`, `priceAtTime`
  and `shippingMethod` — none of which exist in the schema — writes no `orders.items`, and
  uses `db.insert` outside any transaction. Its processing loop is unreferenced (only
  `create()` and `getUserAutoOrders()` are imported), so it is dead code, not a live defect.

### Regression guard added

`server/__tests__/order-creation-dual-write.test.ts` — **9 tests, passing.** Asserts both
live paths write both stores via `tx`, that cost is frozen NULL-not-0, that `createOrder()`
stays unrouted, and that `auto-order-processor` stays dead. The original regression shipped
with no test; this closes that.

## 5c. Expanded migration set — FINAL, committed and locally verified (rev. 3)

**Execution contract:** migration files contain NO top-level BEGIN/COMMIT/ROLLBACK.
The executor owns the transaction and submits each complete file through one
write-capable transactional call. Full rationale, parameters and per-file detail:
`neon-migration-review.md` (rev. 3). Enforced by an 11-test static guard.

Hashes below are of the **committed** bytes, verified equal to the working tree.

| # | Forward file | SHA-256 (committed) |
|---|---|---|
| 1 | `add_order_item_cost_snapshot.sql` | `e507bce47ae334aa77de3df5b38ea2f53e3e656ea6d84f51a2433c4650b3b0ed` |
| 2 | `backfill_orderitems_from_jsonb.sql` **(rewritten)** | `8225c60242a1ce6944bbdbc2eaa238aaebf8cbad41dcab1ee4fcc612ca5a0f62` |
| 3 | `add_fulfillment_costing.sql` | `ea34a32f5f3d84b5913ca700531941a5ba7f53edf9ba125aa865345a979901d1` |
| 4 | `add_fulfillment_hardening.sql` | `5a7f43634f801f7dc2c77a5f621204c39b1ae1b9cf245a1377e2c67615547f47` |

Read-only companion, run before and after #2:
`backfill_orderitems_reconcile_report.sql` —
`874f5d8e246373e55b15c5c2a5c3c38462009f8b84c0c12bde8b6e7c235f0c25`

| Rollback step | File | SHA-256 (committed) |
|---|---|---|
| 1 | `add_fulfillment_hardening_rollback.sql` | `8a7d97347556de33a7e8fc0c214e85f2fd881ac9e95a70b35724ea3282c510b4` |
| 2 | `add_fulfillment_costing_rollback.sql` | `80fb2b54da93ed0f3c932e71e9321a3adfe185476facd29ccf686cb46f291296` |
| 3 | `backfill_orderitems_from_jsonb_rollback.sql` | `23503c3ee273db51fe0b8b6d6717f38cafdf4864f810d335fdbc219183cf7dd1` |
| 4 | `add_order_item_cost_snapshot_rollback.sql` | `8811d78cc24830e1c70c61b11d1194918d73e6afe516a7ad4132044715dd1ae4` |

**Required `SET LOCAL` parameters** (same transaction, before the file):
`aquavo.backfill_batch_id` is **mandatory** for the rollback — there is no default,
because "latest batch" can change between preview and execution.
`aquavo.backfill_allow_unresolved` gates the fail-closed behaviour;
`aquavo.backfill_drop_control_table` selects rollback MODE A vs MODE B.

**Control-table rollback policy — explicit.** `orderitem_backfill_batches` is
introduced by operation #2. MODE A (`drop_control_table='on'`) removes it, giving a
true byte-for-byte object-set rollback, permitted only on the disposable branch and
only when no un-rolled-back batch remains. MODE B (default) retains it as the audit
trail; under MODE B the rollback is **"complete except for the retained audit
table"** and is never described as unqualified. Both modes are tested.

**Nothing is fabricated.** Quantity is never defaulted to 1, price never to 0.
Eight reason codes classify unresolved lines; the migration fails closed unless the
owner sets an explicit override, and even then bad lines stay uninserted and the
batch records `reconciliation_complete = false`.

**Complete local verification — reported separately** (see
`pre-neon-readiness.md`): server **490**, client **688**, **total 1,178 passed,
0 failed** across 103 files; repository typecheck **clean**; accounting + route
typechecks clean; production build succeeds; credential scan clean. Two gates did
not run and are branch-gated by design: `verify:fulfillment` (refuses to run
without `DATABASE_URL`) and the Playwright fulfillment workflow (needs a live app).

**This is preparation, not authorization.** Nothing has been run against Neon.

## 5d. Deployment-ordering hazard (NEW, needs owner attention)

`server/storage/order-storage.ts` (`createOrderSecure`, current branch) writes
`unit_cost_price`, `cost_snapshot_status` and four sibling columns — added 2026-07-22 in
`ff90377`. **Production does not have those columns.** Deploying this branch before
operation #1 would make every storefront order creation fail.

Required order: **apply migration #1 → then deploy.** Not the reverse.

## 7b. Production hardening proposal (findings only — NO write authorized)

Recorded as a proposal. **No production security setting was changed during this task**,
and none is authorized. Each item is separable and can be approved individually.

| # | Finding | Current state | Proposed | Risk if left |
|---|---|---|---|---|
| H1 | Production branch protection disabled | `protected: false` on `br-patient-mouse-a4d4cgr4` | Enable branch protection on `production` | Accidental write, reset, or promotion to production is mechanically possible — nothing but discipline prevents it |
| H2 | No IP restrictions | `allowed_ips: []`, `block_public_connections: false` | Optional allowlist (Vercel egress + admin) | Any host with a valid credential can connect from anywhere |
| H3 | **MCP executes as `neondb_owner`** | Confirmed `current_user = neondb_owner` | Least-privilege role for tooling; reserve owner for DDL | Read-only is enforced only at the MCP layer; granting write grants **owner-level** production write |
| H4 | App likely runs as owner too | Inferred — needs confirmation | Dedicated app role: DML on `public`, no DDL, no DROP | A single app-side injection reaches full schema authority |
| H5 | Historical `neondb_owner` credential exposed | Rotation UNVERIFIED (per findings register) | Execute the §7 rotation runbook | Known-leaked full-privilege credential may still authenticate |
| H6 | No promotion controls | Any branch promotable | Require protection + explicit approval before promote | An unreviewed branch can become production |

### H1 — exact owner action (recommended BEFORE granting OAuth full access)

**Do this yourself in the Neon console. I am not authorized to perform it and have not.**

1. Neon Console → organization **Eng** (`org-sweet-glitter-04175211`) → project **fishweb**
   (`shiny-tree-43710630`) → **Branches**.
2. Open branch **`production`** (`br-patient-mouse-a4d4cgr4`) — the one marked *default*
   and *primary*.
3. Enable **Branch protection** (branch settings → "Protect branch" / `protected: true`).
4. Confirm the branch list shows `production` as protected.

Effect: protected branches reject deletion and reset, and are excluded from accidental
destructive operations. Child branches can still be created *from* it, so this does **not**
block the verification work — it only removes the hazard of holding write scope.

Verification afterwards (read-only, I can run it): `describe_project` should report
`"protected": true` on `br-patient-mouse-a4d4cgr4`.

Rollback: the same toggle, off.

**Not authorized and not to be done now:** credential rotation, IP allowlisting, role
changes, promotion-control changes. Each needs separate explicit approval.

Suggested order: **H1 first** (single toggle, highest ratio of risk removed to effort),
then H5 (rotation), then H3/H4 (least-privilege roles), then H2 and H6.

H1 and H3 together are the ones that make this verification task safer: with branch
protection on and a non-owner tooling role, granting MCP write access would no longer put
production within reach of a mistake.

## 8. Recommended next step

The read-only contradiction is closed (§5), so the permission ask is now unblocked.

1. Reconnect the Neon connector through **OAuth with full access** (§3), which restores
   `create_branch`, write-capable `run_sql`/`run_sql_transaction`, and
   `get_connection_string`.
2. Optionally enable **H1 (production branch protection)** first — one toggle, and it
   removes the main hazard of holding write scope.
3. Resume at "authorized branch creation." **Phase 0 does not need repeating:** project,
   branch, role, baseline, coverage matrix, and migration hashes are all recorded, and the
   migration bytes are verified unchanged.
4. Decide whether `migrations/add_order_item_cost_snapshot.sql` joins the authorized
   migration set (§5b) — without it the backfill cannot run and the 12-order gap cannot be
   repaired on the verification branch.

---

# MULTI-AGENT VERIFICATION RUN — 2026-07-23 (rev. 4)

**DECISION: FAIL / BLOCKED. Two independent blockers, one of them a newly discovered
migration defect that would have corrupted or aborted production.**

Six independent agents were authorized. **Two ran (Phase A). Four were not launched**,
and that was a deliberate coordinator decision — see §D.

## A. Agents and scope

| Agent | Scope | Ran | Verdict |
|---|---|---|---|
| 1 · TestInventoryAgent | test discovery, configs, full local verification | ✅ | Reconciled; 2 findings |
| 2 · NeonIdentityAgent | read-only branch identity | ✅ | **`BRANCH_ENV_MISSING`** |
| 3 · VerifyMigrationAgent | apply 4 ops to verify branch | ❌ not launched | no database target |
| 4 · ConcurrencyServiceAgent | real multi-connection races | ❌ not launched | no database target |
| 5 · ApplicationShadowAgent | app + Playwright + shadow accounting | ❌ not launched | no database target |
| 6 · RollbackBranchAgent | rollback branch proof | ❌ not launched | no database target |

## B. Blocker 1 — access (`BRANCH_ENV_MISSING`)

Independently confirmed by the coordinator, not taken on the agent's word:

- `NEON_VERIFY_DATABASE_URL` and `NEON_ROLLBACK_DATABASE_URL` are **absent** from the
  process environment and from all five `.env*` files (presence checks only; no values
  were read, printed or logged).
- Agent 2 enumerated **19 branches** in project `shiny-tree-43710630`. Neither
  `accounting-fulfillment-verify-20260723` nor `accounting-fulfillment-rollback-20260723`
  exists. **The child branches were never created** — consistent with MCP still being
  read-only and with branch creation never having been authorized.

Per the coordinator gate, branch identity did not pass, so **all Neon write work stopped**.

## C. Blocker 2 — NEWLY DISCOVERED MIGRATION DEFECT (the important one)

While re-validating Agent 2's baseline the coordinator found that **the production schema
has changed since the 02:49 baseline earlier today**, from a concurrent workstream:

| Metric | 02:49 baseline | 07:00 re-check | Δ |
|---|---:|---:|---:|
| `public` tables | 196 | 196 | 0 |
| Table fingerprint | `88b839d9…` | `88b839d9…` | unchanged |
| Constraints (public) | 528 | **529** | +1 |
| User triggers (public) | 29 | **32** | +3 |
| Functions (public) | 178 | **181** | +3 |

No new tables, but new **triggers and functions** — and three of them are on
`order_items_relational`, the exact table operation #2 writes to. They did not exist when
the backfill was designed and tested.

### C1. The batch rollback is IMPOSSIBLE on production data — hard stop

```
CREATE TRIGGER order_items_guard_order_detach
  BEFORE DELETE OR UPDATE OF order_id ON public.order_items_relational
  FOR EACH ROW EXECUTE FUNCTION prevent_unsafe_order_dependency_mutation('order_id')
```

It raises `order % is audited and its dependent records cannot be removed or detached`
whenever `order_is_hard_deletable(order_id)` is false.

Measured against the real gap orders:

| Check | Result |
|---|---:|
| Gap orders whose rows **cannot** be deleted | **12 of 12** |
| Gap orders that could be deleted | **0** |

Every row the batch rollback would remove belongs to an audited order. **The rollback
raises on the first row and reverses nothing.** Operation #2 would be a one-way door on
production — the exact opposite of the "batch-specific, fully reversible" property that
was reported as verified.

### C2. The backfill would write 73 inventory movements — and likely abort

```
CREATE TRIGGER order_items_record_inventory_sale
  AFTER INSERT ON public.order_items_relational
  FOR EACH ROW EXECUTE FUNCTION record_order_item_inventory_sale()
```

The function is gated on `settings.inventory_ledger_mode`. Measured:

| Check | Result |
|---|---|
| `inventory_ledger_mode` | **`enforce`** — the trigger is live |
| MAIN inventory location configured | yes (1) |
| Existing `source_type='order_line'` movements | **0** |
| Products affected by the 73 backfilled lines | 44 |
| Units that would be deducted | **187** |
| Products whose stock would go **negative** | **7** |
| `inventory_movements_prevent_negative` trigger active | yes |

Two consequences, both bad:

1. **Asymmetric ledger.** The 100 pre-existing relational rows have *no* ledger movements
   (the trigger post-dates them). Backfilling would record sales for 73 of 173 lines and
   not the other 100 — an inventory ledger that is internally inconsistent by construction.
2. **Probable hard abort.** 7 products would be driven negative and a negative-balance
   guard is active, so the whole transaction most likely raises and rolls back. Fail-closed
   rather than silent corruption — but operation #2 simply cannot run as written.

### C3. Why local testing missed this

The PGlite fixture reproduced the production **table shape and data**, but not its
**triggers**. Every "verified" claim about operation #2 holds only for a trigger-free
table. This is a concrete demonstration that the child-branch gate is not a formality:
local verification was necessary and **not sufficient**, exactly as required.

Per the conflict-prevention rules the migration files were **not modified**. Correcting
this changes inventory semantics and is an owner decision (§F).

## D. Why agents 3–6 were not launched

Their scopes are defined by an exclusive database target that does not exist. Launching
them would have produced four report files with headings and no evidence — the same
failure this audit rejected earlier. Blocker C independently invalidates operation #2, so
even with branch URLs, agents 3 and 6 would have been executing a migration now known to
be unsafe.

## E. Verified state — unchanged

- Production: **not touched**. No write, no DDL, no branch created, no setting changed.
- The 12-order coverage gap: **still unrepaired**.
- Migration bytes: all 9 files still match their committed blobs.
- No secret was printed, logged, committed or placed in any report.

## F. Required owner decisions before any retry

1. **Trigger interaction (blocking).** Operation #2 must not proceed until decided:
   should backfilled historical lines produce inventory movements at all? Options include
   backfilling with the ledger disabled, exempting `source_type='order_line'` rows created
   by a backfill batch, or recording movements for all 173 lines rather than 73.
2. **Rollback reversibility (blocking).** With `order_items_guard_order_detach` active,
   no batch rollback is possible. Either the guard must be made backfill-aware, or
   operation #2 must be accepted as irreversible on production — which contradicts the
   stated rollback requirement.
3. **Schema drift (process).** Another workstream is changing production concurrently.
   Any baseline must be re-taken immediately before execution, and the child branch must
   be cut from the branch state at that moment.
4. Child branches + env vars, if and when branch verification resumes.

---

# REV. 5 — TRIGGER-SAFETY REMEDIATION (2026-07-23)

**VERDICT: PASS — approved to manually create the two child branches.**

Four independent agents ran; every claim below was independently reproduced by the
coordinator, and two agent claims from the previous run were corrected rather than
propagated.

## 1. Trigger provenance and drift cause

Agent 1 established, and the coordinator confirmed by direct query, that **the live
production schema was changed outside version control**. Ten trigger/function objects on
`order_items_relational` and `inventory_movements` appear in **no committed migration**;
`git log -S` finds zero occurrences for six of them in the entire tracked history, and the
other four appear only inside a same-day audit narrative that *describes discovering* the
drift. The two thematically closest migrations (`add_fulfillment_costing`,
`add_fulfillment_hardening`) are marked not-yet-applied and define a different subsystem.

**This is a governance finding, not just a technical one:** production is being modified by
a process that leaves no versioned artefact. It is the direct cause of the near-miss.

## 2. Double-counting and blocked deletes — confirmed

- `settings.inventory_ledger_mode = 'enforce'` is live, so any INSERT into
  `order_items_relational` writes an `inventory_movements` row which cascades through
  `inventory_movements_project_product_stock` to `products.stock`, while application code
  manages `products.stock` on a separate unreconciled path. `inventory_movements` holds 185
  rows and **zero** with `source_type='order_line'`, despite 100 existing relational rows.
- **12 of 12** gap orders evaluate `order_is_hard_deletable() = false` -> **0** backfilled
  rows would have been deletable.

## 3. Trigger-safety design — coordinator-verified

`migrations/add_orderitem_backfill_trigger_safety.sql` CREATE OR REPLACEs both functions
from their captured live definitions and adds two exceptions.

**Inventory suppression requires ALL of:** session GUC `aquavo.backfill_batch_id` present ·
row carries `metadata.backfill.batch_id` · exact match · batch exists in
`orderitem_backfill_batches` · `source='orders.items'` and
`migration='backfill_orderitems_from_jsonb.sql'` · `finished_at IS NULL AND rolled_back_at
IS NULL` (the batch is being written by *this* transaction — not "latest batch").

**Delete authorization additionally requires:** `aquavo.backfill_rollback_authorized='on'` ·
`TG_OP='DELETE'` and `TG_TABLE_NAME='order_items_relational'` · row has a `backfill`
metadata key · batch `finished_at IS NOT NULL AND rolled_back_at IS NULL`.

Coordinator checks performed independently:

| Check | Result |
|---|---|
| `DISABLE TRIGGER` / `session_replication_role` / role bypass anywhere in `migrations/` | **none** — the only hits are comments stating they are not used |
| Normal path unchanged when ledger mode is not 'enforce' | PASS — early RETURN NEW preserved |
| UPDATE-of-order_id path unchanged | PASS — exception gated on `TG_OP='DELETE'` |
| Application rows (no `metadata.backfill`) reachable by the delete exception | **unreachable by construction** |
| Metadata trusted alone | NO — every bypass re-validates the persisted control row |
| Transaction-contract compliance of both new files | PASS — enforced by the static guard |

## 4. Revised sequences

**Forward (five operations)** — each file submitted whole inside one executor transaction:

| # | File | SHA-256 (committed) |
|---|---|---|
| 1 | `add_order_item_cost_snapshot.sql` | `e507bce47ae334aa77de3df5b38ea2f53e3e656ea6d84f51a2433c4650b3b0ed` |
| 2 | `add_orderitem_backfill_trigger_safety.sql` | `ee96e878f98a53c8f303fc0f6be1c629da883cc4e6d2edbc01a717ce73c7cb89` |
| 3 | `backfill_orderitems_from_jsonb.sql` | `bbe942d34716dfc9941f8419559cc78fb45350bafd4faa8a24db962c758a3ac2` |
| 4 | `add_fulfillment_costing.sql` | `ea34a32f5f3d84b5913ca700531941a5ba7f53edf9ba125aa865345a979901d1` |
| 5 | `add_fulfillment_hardening.sql` | `5a7f43634f801f7dc2c77a5f621204c39b1ae1b9cf245a1377e2c67615547f47` |

Read-only companion: `backfill_orderitems_reconcile_report.sql` —
`874f5d8e246373e55b15c5c2a5c3c38462009f8b84c0c12bde8b6e7c235f0c25`

**Reverse rollback (six steps):**

| Step | File | SHA-256 (committed) |
|---|---|---|
| 1 | `add_fulfillment_hardening_rollback.sql` | `8a7d97347556de33a7e8fc0c214e85f2fd881ac9e95a70b35724ea3282c510b4` |
| 2 | `add_fulfillment_costing_rollback.sql` | `80fb2b54da93ed0f3c932e71e9321a3adfe185476facd29ccf686cb46f291296` |
| 3 | `backfill_orderitems_from_jsonb_rollback.sql` | `9baedea40786549c6d9cd00c3b16dd3304b8a2d6c20930444d9246edc43a0f44` |
| 4 | `add_orderitem_backfill_trigger_safety_rollback.sql` | `7a969e6fff28dd838442d90c9ba7f648229d13c04673bc77ba5a76eb6a3e003a` |
| 5 | `add_order_item_cost_snapshot_rollback.sql` | `8811d78cc24830e1c70c61b11d1194918d73e6afe516a7ad4132044715dd1ae4` |
| 6 | optional: disposable-branch audit-table cleanup (MODE A) | — |

**Step 3 MUST precede step 4.** The trigger-safety exception is what authorizes deleting
those audited-order rows; removing it first makes every backfilled row permanently
undeletable.

## 5. Execution contract (new GUC requirements)

Forward, operation 3:

```
BEGIN;
SET LOCAL aquavo.backfill_batch_id = '<fresh-uuid-minted-by-the-executor>';
-- optional, only after owner review of unresolved lines:
-- SET LOCAL aquavo.backfill_allow_unresolved = 'on';
<entire backfill_orderitems_from_jsonb.sql>
COMMIT;
```

Rollback, step 3:

```
BEGIN;
SET LOCAL aquavo.backfill_batch_id = '<exact-batch-uuid>';
SET LOCAL aquavo.backfill_rollback_authorized = 'on';
<entire backfill_orderitems_from_jsonb_rollback.sql>
COMMIT;
```

The executor now mints the UUID because the trigger must see the GUC *before* the INSERT
fires it. The migration refuses a reused id and fails closed before any parsing or locking
if the GUC is absent.

## 6. Local verification

**107 files / 1446 tests — all passing.** Reconciles exactly: 1417 (after the shared-test
discovery fix) + 22 trigger-safety + 5 new backfill fail-closed + 2 contract-guard entries.

Repository typecheck clean · accounting typechecks clean · build green · no live secret in
any changed file.

**Honest caveat:** the suite is intermittently flaky under full parallel load. The
reproducible offender was PGlite first-instantiation exceeding the 30 s global timeout
(observed 33-43 s); timeouts were raised in the two backfill suites and the final run is
fully green. A separate occasional timing flake in a client page test was observed by an
agent and is not addressed here.

## 7. What is still NOT proven

Everything requiring a live branch: real multi-connection concurrency, services against the
branch, Playwright, and the accounting shadow comparison. The trigger-safety design is
proven only against a PGlite reconstruction of the live triggers — **it has never executed
against real production triggers.** That is precisely what the child branch is for.

## 8. Decision

**PASS — proceed to manually create the two child branches.** Both blocking owner decisions
are now implemented and locally proven, and the previously fatal defects are addressed.
Production remains untouched: no write, no DDL, no branch, no setting changed; the 12-order
gap remains unrepaired.

---

# 12. rev. 6 — Full child-branch execution (2026-07-23)

**Decision for production planning: CONDITIONAL PASS — the migration set is proven; two
HIGH application defects must be fixed first, and Playwright certification is outstanding.**

This section supersedes the rev. 3 "BLOCKED" decision. The two child branches were
created, Gate 0 passed, and four independent agents executed against them. Every claim
below was independently re-verified by the coordinator against the live branches.

## 12.1 Identity gate — `BRANCH_IDENTITY_PASS`

Full evidence: `docs/audit/neon-child-branches-identity.md`.

Both env vars valid and distinct; verification = `br-round-dust-a4t0kt58`
(`ep-rapid-breeze-a46glg7f`), rollback = `br-wispy-tree-a4ksj3t1`
(`ep-broad-butterfly-a405p27r`); both direct children of production
`br-patient-mouse-a4d4cgr4` at the **identical LSN `0/4AC59150`**; production endpoint
`ep-quiet-moon-a4h7tdze` referenced by neither. Both branches identical pre-migration:
PG 17.10, 185 tables / 529 constraints / 574 indexes / 32 triggers / 181 functions,
fingerprint `7ba395295f65b3a66598a12f64b05ce8`, 100 relational lines, 37 orders.
All 11 migration files hash-matched their committed Git blobs.

## 12.2 Five-operation execution — PASS on both branches

Applied in order, each in a separate executor-owned transaction with `ON_ERROR_STOP=1`.
No file contained an executable top-level transaction command (all `BEGIN` hits were
inside `DO $$` bodies; all `COMMIT` hits were `ON COMMIT DROP` or comments).

Post-migration state is **deterministic across both branches** — independently confirmed:

| | verify branch | rollback branch |
|---|---|---|
| fingerprint | `af3879d5cdf660988d5a0ddcfa270aea` | `af3879d5cdf660988d5a0ddcfa270aea` |
| tables / constraints / indexes / triggers / functions | 200 / 610 / 613 / 43 / 191 | 200 / 610 / 613 / 43 / 191 |
| rows inserted by backfill | 73 | 73 |

Trigger-function SHA-256 after migration, identical on both branches:
`prevent_unsafe_order_dependency_mutation` = `c7c8c844...`,
`record_order_item_inventory_sale` = `efaa7f40...`. The third function,
`refresh_order_financial_snapshot_trigger`, retained its **exact Gate 0 hash**
`a99c1a1d43f9a1423952f169dede585ec0f88ac8178d9ef72c5f32342e1435a4`, proving only the two
declared functions were replaced.

## 12.3 Trigger safety — 10/10 PASS

Run live with `inventory_ledger_mode='enforce'`. Normal insert records a movement; forged
metadata alone, missing session context, and a wrong batch UUID all **fail to bypass**;
only the exact approved batch with full context suppresses the movement; normal audited
deletes stay blocked (`P0001 ... is audited`); the exact authorized batch rollback is
allowed; an application-created row cannot use the exception. Full transcript:
`docs/audit/neon-migration-execution.md`.

## 12.4 Backfill and inventory evidence — PASS

Reconciliation before: 100 exact matches, **73 deterministic missing**, 0 unresolved,
0 ambiguous, 0 surplus, 0 metadata disagreements, 0 variant disagreements. **No
unresolved-data override was used** (`aquavo.backfill_allow_unresolved` never set).

Batch UUID `1833092b-4c7f-4835-9038-dca33e1ce33d`, generated inside the executor
transaction. Coordinator-verified afterwards:

- 173 rows = 100 untagged originals + 73 batch-tagged — original rows md5 `c9d4bc78...`
  identical before and after;
- **inventory movements 185 -> 185** — zero created by the historical backfill; zero
  reference the batch;
- product-stock md5 `cc1f8463...` unchanged;
- all 73 backfilled lines have `unit_cost_price`/`unit_packaging_cost`/`unit_insert_cost`
  **NULL** with `cost_snapshot_status='unknown'` — **zero** zero-valued costs;
- 0 duplicate backfill fingerprints; 173/173 reconciled, 0 missing, 0 surplus.

### Finding N-1 (MEDIUM) — the backfill is *fail-closed* idempotent, not clean-exit idempotent

A second run does **not** exit via the "nothing deterministically missing" notice. It
aborts on the ambiguity gate and rolls back:

```
ERROR:  ABORT: reconciliation incomplete — 0 unresolved line(s) [none],
        1 ambiguous duplicate group(s).
```

**Independently reproduced by the coordinator on the rollback branch** (a second,
untouched branch): zero rows written, no second batch opened, state unchanged at
173 rows / 1 batch / 185 movements. Cause: order `6f11d0f2` has a JSONB line with
genuinely no variant data whose correctly-backfilled counterpart is also variant-less,
which trips the heuristic's `INTERSECT` once the table is complete.

The required behaviour (zero rows on re-run) holds and the failure direction is safe.
**Operational consequence:** an operator re-running the backfill on production will see
an abort and must **not** reflexively set the override GUC. Document this in the runbook.

## 12.5 Concurrency — 11/11 PASS

Full evidence: `docs/audit/neon-concurrency-verification.md`. Driven through the real
exported service functions (`confirmFulfillment`, `reverseFulfillmentEvent`), not
reimplemented SQL. Interleaving was **forced and proven**, not assumed: a holder session
took the service's own `pg_advisory_xact_lock(hashtext(order_id))` key while contenders
launched, and an observer session confirmed the required number of `granted=false`
waiters in `pg_locks` (up to 6 on `objid 745609845`) before each test counted.

Same-order reshipments serialize; duplicate idempotency keys resolve to the winner's row;
original-confirmation race yields one winner and one clean `ORIGINAL_ALREADY_EXISTS`;
different orders proceed in parallel; sequence allocation 5->10 with no gaps or duplicates;
stock deducted exactly once; insufficient-stock rolls back clean; reversal idempotent
(net 0); mid-transaction failure leaves zero residue; zero orphan rows.

## 12.6 Rollback and reapplication — PASS

Full evidence: `docs/audit/neon-rollback-verification.md`. Reverse sequence executed in
the mandated order with the exact batch UUID
(`a2f37658-6b05-49a8-9964-8c6d47d85904`) plus
`aquavo.backfill_rollback_authorized='on'`.

Proven: only the exact batch rows were deleted (73 deleted = 73 inserted, ids identical);
the application-created row survived; unauthorized delete stayed blocked; authorized
rollback succeeded; **no retrospective inventory reversal** (movements 185 and stock
checksum identical at every checkpoint); control table dropped; the three trigger
functions returned to their **exact Gate 0 hashes**; objects back to
185/529/574/32/181; fingerprint `7ba395295f65b3a66598a12f64b05ce8` restored with a
185-table row-count diff showing **no differences**.

Reapplied all five operations: second batch `a7cbf313-33cd-4174-84f4-237ccdca016e`,
again 73 rows / 0 unresolved / 0 ambiguous. Coordinator-verified that the rollback
branch's control table now contains **only** the reapply batch — proving the first batch
was genuinely removed. Branch **not deleted, not promoted**.

> Note: the rollback used MODE A (`aquavo.backfill_drop_control_table='on'`) because that
> branch is disposable. **Production must use the default MODE B**, which retains the
> audit table.

## 12.7 Application, accounting and Playwright

Full evidence: `docs/audit/neon-shadow-comparison.md`,
`docs/audit/neon-playwright-verification.md`.

`/ready` returned **HTTP 200** on the verification branch
(`orderCreationEnabled:true, missingColumns:[]`). Part 1: 25 PASS / 3 FAIL / 2 PARTIAL.
Dual-store creation (website *and* WhatsApp), drafts, profiles, suggestions, manual cost
lines, original shipment, reshipment, returns, reversals, event history, expected-vs-actual
costs, contribution profit, unknown-never-zero and verified-zero-vs-unknown all passed.

Accounting shadow comparison over 34 clean orders reconciles **exactly**:
legacy 984,377 − canonical 967,574 = **16,803 = 1,965 revenue + 9,238 COGS + 5,600 box
cost**, with no unexplained residue. The headline difference is behavioural, not
arithmetic: canonical returns `contributionProfit = null` for all 34 orders because
fulfillment cost is unknown, while legacy confidently reports a number. On the only three
orders carrying real fulfillment data, legacy overstates margin by **16–31 points**.

**Playwright: NOT CERTIFIED.** No clean run was obtained and none is claimed. The dev
server died mid-run on every attempt (best observed: 36 passed / 148 failed / 6 skipped
with `POSTCHECK ready=000`). Theme, preparation-workflow and approval/history specs exist
but are gated behind admin credentials that were not available; `contexts.spec.ts`
resolves credentials at module scope and aborts the whole run. **Arabic RTL, desktop,
mobile, light theme, dark theme, preparation workflow, and approval/history remain
unverified by Playwright.**

## 12.8 Branch disposition — both child branches are now unfit for promotion

Neither was ever going to be promoted, but this is now a hard property rather than a
policy: the concurrency and application agents created synthetic rows that the schema's
own immutability guards (`ofl_immutable`, `pim_immutable`, `ofe_guard_confirmed`,
`order_is_hard_deletable`) **correctly refuse to delete**. No agent forced past any guard.

| Residue | Count | On |
|---|---|---|
| fulfillment events / lines / packaging movements | 15 / 14 / 16 | 3 pre-existing orders, 100% `CONCTEST`-tagged (coordinator-verified) |
| synthetic orders | 16 | `SHADOW-Customer` / `SHADOW-WA-Customer` |

The protected accounting canon was verified intact throughout: 100 original + 73
backfilled relational lines, and `orders`/`inventory_movements`/`products` unchanged at
the point each agent finished.

## 12.9 Production boundary

No production write occurred.

One near-miss is disclosed in full: the application agent's first launch silently
connected to the **production** endpoint, because `server/env.ts` calls
`dotenv.config({override:true})` — so the committed `.env` beats an inherited
`DATABASE_URL` — and `tsx` re-execs a child, so a parent-only preload is not inherited.
It surfaced as a schema-drift 503, not a connection error.

Only `GET /ready` and `GET /health` were issued. The coordinator independently verified
these are write-free: `/health` returns a static JSON literal, and `/ready` calls
`getSchemaReadiness`, a module containing **no** INSERT/UPDATE/DELETE/CREATE/ALTER
statement anywhere (the only such words appear in comments). Neon metadata shows
production with no reset and no schema change. Direct verification queries against
production were **blocked by the safety classifier**, which is the correct outcome; that
denial was not worked around, so the assurance above rests on the read-only endpoint code
plus branch metadata rather than on a production query.

### Finding N-2 (HIGH, tooling) — `dotenv override:true` defeats environment-based branch targeting

This is the single most dangerous thing found in this exercise. Any operator who believes
they are pointing the app at a child branch via `DATABASE_URL` is **silently pointed at
production instead**. It failed safe here only because the child schema was ahead of
production and the probe was read-only. Fix before any further branch-targeted testing.

## 12.10 Local test suite

`npm test -- --run`: **107 test files, 1446 tests, 0 failed** — exactly the expected
baseline, no difference to explain. (A first invocation aborted at startup on an invalid
`--reporter=basic` flag under Vitest 4; that was a CLI error, not a test failure, and the
run was repeated with the default reporter.)

## 12.11 Verdict

**CONDITIONAL PASS for production planning.**

Cleared: the five-operation migration set, the trigger-safety exception protocol, the
historical backfill's zero-inventory guarantee, concurrency behaviour, and the rollback
path including exact-batch deletion and full schema restoration.

Blocking before production execution:
1. **F-1 (HIGH)** — storefront orders freeze `costStatus:"unknown"` permanently.
2. **F-2 (HIGH)** — WhatsApp path writes no snapshot; the two creation paths disagree.
3. **N-2 (HIGH)** — `dotenv override:true` env-targeting hazard.
4. **Playwright certification** — needs a stable server and verification-branch admin
   credentials.

Non-blocking but must be in the runbook: **N-1** (backfill re-run aborts; do not
reflexively override), and **MODE B** for the production rollback path.
