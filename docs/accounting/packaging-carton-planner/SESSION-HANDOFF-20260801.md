# Session handoff — packaging / carton completion

**Written:** 2026-08-01, immediately before a context reset.
**Purpose:** let the next session resume without re-deriving anything.

No credentials, connection strings, tokens or customer data appear in this file,
by design. Neon and Vercel identifiers below are non-secret names and IDs only.

---

## 1. Git state

| | |
|---|---|
| Branch | `fix/accounting-packaging-carton-completion-20260731` |
| HEAD | `50a9ed2e07d3e586b475928ebf03517e8b37d817` |
| Branched from | `main` @ `17cc4f92f9b8a0e54c00d38ad62e806725dbb68c` |
| Pushed | yes — `origin/fix/accounting-packaging-carton-completion-20260731` |
| Working tree | **clean** — `git status --short` is empty (nothing modified, staged or untracked) |
| `main` | not merged, not modified, not pushed to |

No work-in-progress commit was needed: every phase attempted in this session was
finished and committed. Nothing was reverted.

---

## 2. Commits created in this session (oldest first)

| # | SHA | Subject |
|---|---|---|
| 1 | `80adec8cf915ae0c05fa9c481de7139f7de0a051` | fix(migrations): pin .sql to LF so the ledger checksum is platform-independent |
| 2 | `bc7fff6f874efaf05049b3c6d52a9237566137fe` | feat(packaging): default preparation profile so 50+100 actually apply |
| 3 | `848ed31c45695f1836e8cdadd76001e03309e2de` | fix(migrations): 0049 re-apply must clear the rolled-back flag |
| 4 | `a1592cce5800539f0cb57c32b46f5b212abe005e` | feat(packaging): mount التغليف والكراتين and add the data-entry workflow |
| 5 | `4d5d72641cfbb2fecb1387f9ccdc760107eee875` | fix(fulfillment): remove the negative-stock override from every layer |
| 6 | `6bf9d1cd9259b61cd947ef7a18f26d912fcbcb30` | feat(packaging): apply the default preparation profile, and fix the stock guard it exposed |
| 7 | `4b33281718c098c914d31422c21e68d185329c3e` | feat(packaging): put خطة التغليف المقترحة in the real order workflow |
| 8 | `59ff363fc4a04df33a350bbdd8098b87889721ff` | feat(packaging): move carton stock on real order-status transitions |
| 9 | `71707ff9e50181fc30c729027f2efe8dcd4a9846` | fix(accounting): stop counting a damaged carton as a second expense |
| 10 | `50a9ed2e07d3e586b475928ebf03517e8b37d817` | feat(packaging): charge the order for the carton the planner chose |

Diff vs `main`: **39 files, +3365 / −58**.

---

## 3. Database

### Neon test branch

| | |
|---|---|
| Name | `carton-planner-completion-test-20260731` |
| Branch ID | `br-shy-surf-a4z9slz5` |
| Project | `shiny-tree-43710630` (`fishweb`) |
| Org | `org-sweet-glitter-04175211` |
| Parent | `br-patient-mouse-a4d4cgr4` (`[default] production`) |
| Parent LSN | `0/4EBD45A8` |

### Production was NOT modified

Verified read-only at the end of the session:

```
PRODUCTION schema_migrations >= 0047 : 0047_packing_import_drafts, 0048_packing_policy_and_preparation_costs
has_0049=0  has_0050=0  profile_families=0
```

Production is still at **0048**. Neither new migration was applied to it. No
write of any kind was issued against the production branch.

### Migrations created

**`0049_default_preparation_profile`** (+ `_rollback`)
Creates one profile family `default-preparation` with `applies_to.default = true`,
version 1, containing `PRICE_LABEL` and `THANK_YOU_SOCIAL_CARD` at quantity 1
each. `expected_cost` is summed from the approved cost records (150) and left
NULL if either is unresolved. Seeds no carton, dimension or weight.

Rollback is deliberately **asymmetric**: `pp_guard_locked` raises on DELETE of a
version a confirmed order has used, so an unused profile is removed outright
while a used one is only deactivated — it stops being suggested for new orders
and the trail that priced old orders stays readable.

**`0050_backfill_stock_tracked`** (+ `_rollback`)
Sets `stock_tracked = true` on materials still sitting on migration 0040's
`DEFAULT false`, excluding the two accounting-only SKUs and anything archived.

Rollback **only reverts the ledger entry** and says so: flipping every `true`
back to `false` would un-track real cartons and recreate the exact bug 0050
fixes. Documented in the file rather than faked.

### Neon validation performed on the TEST branch

- 0049: forward → rollback → re-apply → re-apply. Ends `families=1 versions=1
  items=2 expected_cost=150`, `row_exists=1 rolled_back_is_null=true`.
- 0050: applied; a **no-op on this data** (see §6, bug 2).
- Each material linked **exactly once**, both `per_order`:
  `PRICE_LABEL x1`, `THANK_YOU_SOCIAL_CARD x1`.
- No fabricated operational data:
  `cartons=0 packing_rows=0 reservations=0 plans=0 movements=0 return_losses=0`.
- Also executed forward/rollback/re-apply in the PGlite harness
  (`packaging-migrations-integration.test.ts`), 33/33.

### IMPORTANT operator detail discovered

Production enforces `schema_migrations_checksum_check`:
`CHECK (checksum ~ '^[0-9a-f]{64}$')`. **No migration in git creates this
constraint.** Every migration file ships the literal `'pending'`, which violates
it, so migrations are **not applied verbatim** — the operator substitutes the
file's own sha256 for `'pending'` at apply time. Confirmed because 0048's
recorded Production checksum equals the sha256 of its file in git.

Apply form used for the test branch:

```
SUM=$(sha256sum migrations/<file>.sql | cut -d' ' -f1)
sed "s/'pending'/'$SUM'/" migrations/<file>.sql | psql "$CONN" -v ON_ERROR_STOP=1
```

`check:migrations` reports **12 numbered migrations, all self-registering, all
with rollbacks.**

---

## 4. Test and check results

### Baseline on `main` @ `17cc4f9`, measured before any change

```
12 PRE-EXISTING FAILURES ACROSS 6 FILES
  - 3 ssr-hero-preload failures
  - 9 storefront test failures
Test Files  6 failed | 173 passed (179)
Tests      12 failed | 2269 passed (2281)
```

### Final, on HEAD

```
Test Files  6 failed | 179 passed (185)
Tests      12 failed | 2335 passed (2347)
```

**Same six files, same twelve failures. +66 passing tests, zero new
regressions.** The failing files are exactly:

- `server/__tests__/ssr-hero-preload.test.ts` (3)
- `client/src/components/__tests__/navbar.test.tsx`
- `client/src/components/products/__tests__/filter-bar.test.tsx`
- `client/src/components/products/__tests__/multi-dimension-variant-selector.test.tsx`
- `client/src/pages/__tests__/checkout.test.tsx`
- `client/src/pages/__tests__/order-confirmation-ux.test.tsx`

### Pre-existing TypeScript errors — deliberately NOT fixed (out of scope)

```
client/src/lib/site-search.ts(132,31): error TS1501: This regular expression flag is only available when targeting 'es6' or later.
client/src/lib/site-search.ts(270,14): error TS2802: Type 'MapIterator<SiteSearchResult>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.
```

These arrived with the storefront merge into `main` on 2026-07-31 and are
unrelated to packaging. **They short-circuit `npm run check:all` at step 1.** The
remaining checks pass when run individually:

| Check | Result |
|---|---|
| `npm run check` (tsc) | fails — the 2 site-search errors only |
| `npm run check:server` | OK |
| `npm run check:accounting` | OK |
| `npm run check:accounting:routes` | OK |
| `npm run check:migrations` | OK — 12 numbered migrations |
| `npm run build` | **succeeded**, `dist/index.js`, 2985ms |

Note: the same old tsconfig target caused a real error in new code
(`Set` spread in `packing-import-panel.tsx`); it was fixed there with
`Array.from`, not by changing the shared target.

---

## 5. Phase status

### Completed

| Phase | What landed |
|---|---|
| 0 | Full evidence-based audit against current `main` |
| 1 | التغليف والكراتين mounted in finance; full data-entry workflow |
| 2 | Default preparation profile applies 50 + 100 once per order |
| 3 | خطة التغليف المقترحة mounted in the real order workflow |
| 4 | Reserve / consume / release wired to real order-status transitions |
| 5 | `allowNegativeStock` removed from every layer + hard rejection |
| 6 | Damaged-carton return classification, double-count closed |
| 7 | Carton cost reaches the order's cost snapshot and profit |
| 10 | Full verification: suite, checks, build, Neon validation |

### Partially completed

**Phase 8 (UI/UX).** Not run as a separate pass — it was folded into Phases 1
and 3 as those surfaces were built (Arabic RTL, empty/loading/error states,
IQD formatting, archive-not-delete, confirmation only on archive, no raw SQL or
technical identifiers surfaced to the admin). A dedicated review pass for mobile
breakpoints and Cairo typography tokens has **not** been done.

### Remaining

**Phase 11 (Preview deployment).** BLOCKED — not attempted.
`vercel whoami` returns *"The specified token is not valid."* The user must run
`vercel login` themselves; it is interactive and cannot be done from inside the
agent loop.

Also outstanding, and not a code task: **no screenshots exist.** The app was
never launched in this session. Every surface has test-level verification but no
visual confirmation.

---

## 6. Bugs discovered and how each was resolved

**1. Stock guard rejected every order carrying a price label.**
`confirmFulfillment` summed `packaging_inventory_movements` for every line with a
`materialId`. An accounting-only material has none and sums to 0, so
`INSUFFICIENT_STOCK` fired on every order. Unreachable until 0049 made drafts
actually carry one. → Guard now checks `stock_tracked` materials only.

"Has movements" was tried first and is **wrong**: a real carton that has never
been received also has none and must still fail rather than be waved through at
zero stock. `stock_tracked` is the only sound discriminator — which made its
correctness a prerequisite, hence bug 2.

**2. `stock_tracked` could not be trusted.**
0040 added it `NOT NULL DEFAULT false` and never backfilled, **and**
`POST /api/admin/fulfillment/materials` never set it. Materials on both the old
and the NEW path read `false`. Trusting the flag would have silently exempted
them from the guard — stock going negative with no error and, with the override
gone, no way to notice. Strictly worse than bug 1. → Fixed on both sides:
migration 0050 backfills, and the create route sets it explicitly.

Measured on the Production clone: Production holds exactly **2**
`fulfillment_materials`, both accounting costs, so **0050 is a no-op there
today**. Kept as the safety net and to make the flag's meaning explicit.

**3. Damaged cartons were counted as a second expense.**
`packaging_loss_source` was live in Production (0046) and `isAdditiveReturnLoss()`
implemented the rule — but `shared/schema.ts` never modelled the column, so every
`select()` dropped it, and `eventActualReturnLoss()` added `packagingLoss`
unconditionally. A carton's cost came out of profit at shipment **and again** as
a return loss. Nothing covered it because nothing produced a
`fulfillment_snapshot` row yet. → Column modelled; engine honours the predicate.
A missing source still counts as additive, matching 0046's default, so historical
hand-typed rows are unaffected.

**4. The planned carton was never paid for.**
Reserve/consume moved INVENTORY; nothing moved COST. The plan knew the carton;
the draft that becomes the immutable snapshot did not. → `plan-carton-costing.ts`,
invoked on plan validation.

**5. `check:migrations` failed on `main`.**
Not content drift: `core.autocrlf=true` with no `.gitattributes` checked 0039 out
as CRLF, so the tool hashed `69e56dcd…` instead of the recorded `9f00fac1…`. The
git blob was already byte-identical to Production's expectation. → `.gitattributes`
pins `*.sql` to LF. Re-recording the checksum was rejected — it would bake a
Windows-only value into a governance tool and move the break to CI.

---

## 7. Implementation decisions worth remembering

- **Import is CSV, not `.xlsx`.** The repo has no spreadsheet parser and the npm
  `xlsx` package is unmaintained upstream. Adding an unmaintained binary-format
  parser to a production accounting system to read a file that exports as CSV in
  two clicks was judged the wrong trade. The locked Arabic headers survive the
  export unchanged. **Both** the sheet's real typo `عرض المنتج مع كارتونتة` and
  the correct `عرض المنتج مع كارتونة` are accepted. *Revisit if the owner wants
  true `.xlsx`.*
- **Costs go through propose → approve**, on `/api/admin/fulfillment/materials/:id/costs`
  then `/cost-records/:id/approve` — a different route base from packaging admin.
  A cost is never typed straight onto a material; unapproved reads «غير معروف».
- **Zod strips unknown keys silently**, so removing `allowNegativeStock` from the
  schemas was not enough. Both write routes reject the key outright with
  `STOCK_OVERRIDE_REMOVED` (400) via `DOMAIN_ERROR_STATUS`, so an old bundle or
  saved cURL learns the capability is gone instead of getting a 200.
- **The confirm button is disabled on a shortfall, not relabelled.** There is no
  server path that would accept it.
- **Lifecycle idempotency is structural**: the reservation `requestId` is derived
  (`lifecycle:{orderId}:reserve:{planId}`), not random, so replays collapse.
- **`INSUFFICIENT_CARTON_STOCK` is NOT swallowed** at the status-change call site,
  unlike the audit-trail block above it. Letting a status change proceed while
  carton stock goes negative is the failure removing the override was meant to end.
- **Consumption requires a confirmed original fulfillment event.**
  `confirmFulfillment` is what deducts stock; closing the claim without it would
  let a later real event deduct a second time.
- **A returned carton is classified, never restocked.** Product-stock restoration
  on return stays a separate flow that never touches carton inventory.
- **`syncPlanCartonsToDraft` stops if the order already has a confirmed original
  event.** Checking the draft's own state is insufficient — `getOrCreateDraft`
  opens a FRESH draft once the previous is consumed, which would have quietly
  started a second draft carrying another carton line.
- **Test isolation by fresh ids, not cleanup.** `packaging_inventory_movements`
  and `order_fulfillment_events` are immutable by trigger and refuse truncation.
  Plan fixtures satisfy `opp_validated_evidence_chk` and `oppi_geometry_chk`
  rather than dodging them.
- **Harnesses predating 0040** now apply its DDL plus
  `ALTER COLUMN stock_tracked SET DEFAULT true` (pre-0040 semantics). The
  migration tests deliberately keep a pre-0040 baseline and were left alone.

---

## 8. Files being edited

**None.** The working tree is clean; there is no half-finished edit anywhere.

Key files this session touched, for orientation:

```
migrations/0049_default_preparation_profile.sql            (+ _rollback)
migrations/0050_backfill_stock_tracked.sql                 (+ _rollback)
.gitattributes
client/src/pages/admin/finance.tsx                         tab mounted here
client/src/components/admin/packaging/packaging-section.tsx
client/src/components/admin/packaging/packaging-forms.tsx
client/src/components/admin/packaging/packing-import-panel.tsx
client/src/components/admin/fulfillment/order-fulfillment-panel.tsx
client/src/components/admin/fulfillment/order-carton-plan-section.tsx
client/src/hooks/use-packaging.ts
server/services/packaging-lifecycle-runner.ts              NEW
server/services/plan-carton-costing.ts                     NEW
server/services/fulfillment-service.ts                     stock guard
server/services/accounting-engine.ts                       return-loss guard
server/routes/admin.ts                                     lifecycle call site
server/routes/fulfillment-admin.ts                         override rejection
server/routes/packaging-admin.ts                           carton active, costing
shared/schema.ts                                           packagingLossSource
```

---

## 9. Exact next safe action after `/clear`

1. `git status --short` → expect empty.
2. `git log --oneline -1` → expect `50a9ed2`.
3. **Ask the user to run `vercel login` themselves** (interactive; cannot be done
   from the agent loop). Nothing else is blocked on it.
4. Once authenticated, deploy a **Preview** only, pointed at Neon branch
   `br-shy-surf-a4z9slz5` — never Production.
5. Optionally, before that: a Phase 8 review pass for mobile breakpoints and
   Cairo typography tokens, and capture the screenshots that were never taken.

Do **not** resume by re-running Phases 1–7. They are complete, committed, pushed
and verified.

---

## 10. Stop conditions and non-negotiable safety rules

Carried forward unchanged. Stop and report rather than guess if:

- current `main` conflicts with the carton implementation;
- migrations 0040–0048 in git differ from what Production expects
  (**checked this session: they do not** — the 0039 mismatch was a CRLF artifact);
- a safe test database branch cannot be created;
- historical financial data would need rewriting;
- product dimensions or carton data are unavailable;
- fixing the feature would require weakening accounting or inventory controls;
- any test reveals new accounting, stock or order regressions.

Never:

- modify Neon Production, or apply 0049/0050 to it;
- deploy Vercel Production;
- merge into `main` or push to `main`;
- edit historical orders, financial snapshots, inventory movements or approved
  historical costs;
- seed fake cartons, dimensions, weights, costs, inventory or orders;
- remove accounting immutability guards, or weaken stock, reservation, audit or
  idempotency protections;
- rewrite migrations 0040–0048, or reuse a migration number;
- expose credentials, connection strings, tokens, customer names, phone numbers
  or addresses.

Automated tests may create isolated temporary fixtures **inside the test database
only**, and those are never owner or Production business data.

---

## 11. Owner data still required

Nothing below can be invented, and the planner correctly fails closed until it
exists.

Per carton type: Arabic name, internal length / width / height, maximum weight,
unit cost, current stock, low-stock threshold.

Per product: **packed depth** and **packed weight** — neither is supplied by the
owner's spreadsheet, which carries only height and width.

**Tax-final readiness remains FALSE and must not be described as complete.**
