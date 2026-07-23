# Verification Infrastructure Remediation

Owner: VerificationInfrastructureAgent
Branch: `feat/accounting-canonical-fulfillment`
Scope: test/build configuration, tracked script-safety wrappers, `.env.example`,
E2E infrastructure (`playwright.config.ts`, `e2e/support/*`, `server/vite.ts`
startup), and the one accidental root file. Nothing outside that surface was
edited; defects found in others' areas are reported, not fixed.

---

## Part A — Authoritative server typecheck

### The problem
`tsconfig.json` excludes `server/**`, and `tsconfig.server.json` (used by the
build) carries `"noCheck": true`. So server code was **never typechecked** by any
gate. Turning strict checking on over the whole server graph surfaces **308
pre-existing errors across 33 files** (legacy debt: `mcp.ts` 53, `analytics-tracker.ts`
25, `pricing-engine.ts` 24, `auto-order-processor.ts` 23, …). Clearing all of that
in one pass is out of scope and unrelated to this effort.

### The chosen shape
Same pattern already used by `check:accounting:routes`: run tsc over the full
server graph so nothing is hidden, **print** the legacy errors so they stay
visible, and **fail only on files this gate owns**. Owned set starts at the one
file called out below and widens as legacy files are cleaned.

Files added / changed:
- `tsconfig.server.check.json` — extends `tsconfig.server.json` with
  `"noCheck": false` (checking back ON over the same include/exclude graph).
- `TOOLS/check-server.mjs` — runs tsc against that config; `OWNED =
  ["server/storage/invoice-storage.ts"]`; prints legacy errors, exits non-zero
  only on owned errors.
- `package.json` scripts:
  - `check:server` → `node TOOLS/check-server.mjs`
  - `check:all` → `npm run check && npm run check:server && npm run check:accounting && npm run check:accounting:routes`

### The surfaced server error and its fix
`server/storage/invoice-storage.ts` (~line 270). Confirmed **byte-identical to
HEAD** (`git show HEAD:` matches), i.e. a real pre-existing error, not another
agent's fresh change.

`orders.shippingAddress` is declared in `shared/schema.ts` as a typed JSONB
object:
```ts
shippingAddress: jsonb("shipping_address").$type<{ addressLine1: string; city: string; country: string; }>()
```
The manual-invoice → order path wrote a **concatenated string** instead:
```ts
// BEFORE (TS2322: string not assignable to the object type; also wrong at runtime)
shippingAddress: invoice.customerCity
  ? `${invoice.customerCity}${invoice.customerAddress ? ` - ${invoice.customerAddress}` : ""}`
  : (invoice.customerAddress || null),
```
This both violated the column type and disagreed at runtime with every reader
that destructures `{ addressLine1, city, country }`. Fixed by building the object
the schema declares (Iraq-only storefront → `country: "IQ"`):
```ts
// AFTER
shippingAddress:
  invoice.customerCity || invoice.customerAddress
    ? { addressLine1: invoice.customerAddress ?? "", city: invoice.customerCity ?? "", country: "IQ" }
    : null,
```
"Fix it properly" = make runtime match the declared type, not cast the type away.

### Gate results (all green)
| Gate | Command | Result |
|---|---|---|
| client/shared typecheck | `npm run check` | PASS (exit 0) |
| server typecheck | `npm run check:server` | PASS — "no strict errors in owned files" (308 legacy printed) |
| accounting typecheck | `npm run check:accounting` | PASS (exit 0) |
| accounting route typecheck | `npm run check:accounting:routes` | PASS — owned clean (53 legacy printed) |
| full build | `npm run build` | PASS (`dist/index.js` emitted, ~11.6s) |

Note: `server/storage/index.ts` and `server/storage/user-storage.ts` each carry
one pre-existing `TS2344` from an address-schema mismatch (`"phone"|"address"`
vs the `userAddresses` column union). Not this effort's scope and not another
agent's fresh change — left as visible legacy, NOT added to the owned set.

---

## Part B — Gitignored script safety

### Root cause (why `scripts/` is ignored)
`.gitignore` contains:
```
# One-off DB scripts (may contain credentials — never commit)
scripts/
scratch/
script/
```
The directories are ignored **deliberately, for secret-safety** — one-off
migration/backfill/audit scripts have historically carried inline credentials.
The side effect: the DB-target SAFETY logic they rely on lived only in each
machine's untracked copy, so the three earlier `override:true` fixes existed on
exactly one developer's disk and could not be reviewed or enforced.

### Chosen solution — Option (b): consume tracked logic; keep scripts ignored
Keeping the scripts ignored is correct (secrets must not be committed). The fix
is to move the SAFETY logic into **tracked** code and have scripts consume it,
rather than un-ignoring credential-bearing files.

The canonical resolver already exists — `server/db-target.ts` — but it is a
TypeScript module with `.js` ESM specifiers, so a plain-node `.mjs` one-off
script cannot import it. Added a JS-consumable projection of the same policy:

- **`TOOLS/script-db-guard.mjs`** (tracked). Public API:
  - `resolveScriptDatabaseUrl({ mode, key, allowProduction, allowUnknown })` —
    loads env preserving inherited targets, classifies, **fails closed**.
  - `classifyTarget(url)` / `loadEnvPreservingTargets()` — building blocks.
  - Guarantees, mirroring `server/db-target.ts`:
    1. an explicit inherited `DATABASE_URL` **wins over `.env`** (no silent
       replacement of a deliberately-set target);
    2. `mode: "migrate" | "verify"` **rejects a production target** outright
       (`ep-quiet-moon-a4h7tdze` / `br-patient-mouse-a4d4cgr4`);
    3. unidentifiable / unparseable / non-postgres targets are rejected;
    4. it logs only a **redacted** label rebuilt from URL components — never the
       raw connection string / credentials.
  - Verified by smoke test: production/child-branch/local/unknown classified
    correctly and no password leaks into the label even when the URL embeds one.

The production endpoint/branch identifiers are duplicated with an explicit
"keep in sync with server/db-target.ts" contract comment.

### Write-capable classification (149 files read `DATABASE_URL`; ~176 raw reads)
Classifier: a file is **WRITE-capable** if it contains any of `INSERT INTO`,
`UPDATE … SET`, `DELETE FROM`, `CREATE/ALTER/DROP TABLE`, `CREATE INDEX`,
`.insert(` / `.update(` / `.delete(` / `.values(` / `.set(`, or `db.execute`.

| Directory | Files reading `DATABASE_URL` | Write-capable |
|---|---|---|
| `scripts/` | 84 | 40 |
| `script/` | 63 | 25 |
| `scratch/` | 1 | 0 |
| `TOOLS/` | 1 | 1 (tracked; the guard's own smoke context) |
| **Total** | **149** | **66** |

Every write-capable script must import `TOOLS/script-db-guard.mjs` and resolve its
target through `resolveScriptDatabaseUrl(...)` (migrate/verify mode for anything
that mutates schema or reconciles money). Because the 66 files are gitignored,
they cannot be committed here; each is named below as a **tracked follow-up** to
be converted the next time it is run. Highest-risk (destructive / prod-touching)
are called out first.

Highest-risk (destructive or explicitly prod-oriented):
`script/inspect-prod-db.ts`, `script/seed-driftwood-prod.mjs`,
`scripts/delete-orders.mjs`, `scripts/delete-users.mjs`, `script/reset_users.ts`,
`script/reset-admin-v2.ts`, `scripts/reset-analytics.ts`,
`scripts/reset-product-stats.ts`, `scripts/fix-database-schema.ts`,
`script/fix-db-integrity.ts`, `script/rollback-import.ts`,
`script/restore-all-products.mjs`, `scripts/fix-db-conflicts.ts`,
`scripts/add-early-access-table.ts`, `scripts/add-preferences-column.ts`,
`scripts/apply-email-logs-migration.ts`, `script/apply-migration.{js,ts}`,
`script/apply-gallery-migration.ts`, `script/apply-newsletter-migration.ts`,
`script/create-sessions-table.js`, `script/migrate-loyalty.cjs`,
`scripts/migrate-categories.ts`, `scripts/migrate-product-images-to-cloudinary.ts`.

Remaining write-capable (product/content seed + update scripts):
`script/add-yee-tank.ts`, `script/create-admin.js`, `script/create-first-admin.ts`,
`script/final-setup.js`, `script/setup-admin.js`,
`script/fix-driftwood-final.mjs`, `script/fix-driftwood-images.mjs`,
`script/fix-driftwood-visibility.mjs`, `script/fix-products-now.mjs`,
`script/inspect-gallery.ts`, `script/merge-driftwood-variants.mjs`,
`script/seed-driftwood-missing.ts`, `script/seed-driftwood-new.ts`,
`script/seed-import-new.ts`, `script/seed-v2.ts`,
`script/update-hygger-images.ts`, `script/update-volcanic-red.ts`,
`scripts/add-all-houyi-products.ts`, `scripts/add-cylinder-air-stone.ts`,
`scripts/add-houyi-products.ts`, `scripts/add-sponge-filter.ts`,
`scripts/find-missing-products.ts`, `scripts/fix-all-product-images.ts`,
`scripts/fix-hygger-images.ts`, `scripts/fix-order-items.ts`,
`scripts/fix-order-numbers.ts`, `scripts/fix-remaining-yee.ts`,
`scripts/import-binzhou-products.ts`, `scripts/import-feeding-cup-with-variants.ts`,
`scripts/import-houyi-products.ts`, `scripts/import-houyi-products-smart.ts`,
`scripts/import-hygger-products.ts`, `scripts/import-yee-products.ts`,
`scripts/insert-missing-decor.ts`, `scripts/remove-measurements.ts`,
`scripts/remove-yee-from-adapter.ts`, `scripts/update-arabic-names.ts`,
`scripts/update-houyi-images.ts`, `scripts/update-houyi-specific-images.ts`,
`scripts/update-hygger-variants.ts`, `scripts/update-product-details.ts`,
`scripts/update-yee-content.ts`.

---

## Part C — Operator `.env`

`.env.example` already exists and is **tracked** (the `.gitignore` `!.env.example`
negation preserves it), with a placeholder `DATABASE_URL`, real secrets excluded,
and `ALLOW_REMOTE_DATABASE_IN_DEV=false` documented. The startup policy is already
enforced in tracked code (`server/env.ts` + `server/db-target.ts`) and was left
intact (built on, not fought):

- Default LOCAL invocation (`NODE_ENV != production`) **refuses to boot** if
  `DATABASE_URL` is remote/Neon-like, unless `ALLOW_REMOTE_DATABASE_IN_DEV=true`
  (staging opt-in only).
- An explicit inherited `DATABASE_URL` always wins over the committed `.env`.
- Resolving to production while `NODE_ENV != production` prints a loud, **redacted**
  `[DB-TARGET]` warning; an unidentifiable target throws (fail closed).

Gap fixed: the file is a **Railway production template** that defaults
`NODE_ENV=production`. A local operator copying it verbatim would inherit
`NODE_ENV=production` and thereby bypass the dev-DB guard. Added a top-of-file
**STARTUP SAFETY POLICY** block spelling out the required local overrides
(`NODE_ENV=development`, local/staging `DATABASE_URL`), the four enforcement rules
above, and the `TOOLS/script-db-guard.mjs` requirement for write scripts. No
secret was added; only comments.

---

## Part D — Dead E2E route (F-9) and process-exit (RC-1)

### F-9 — dead `/admin/orders/:id` route
`e2e/fulfillment-admin.spec.ts`'s second test navigated to `/admin/orders/:id`,
which **does not exist** (`client/src/App.tsx` has no such route — admin routes
are `/admin`, `/admin/login`, `/admin/finance`, `/admin/partners`, `/admin/ai`,
`/admin/merge-product(s)`). The fulfillment panel (`SectionCard title="تجهيز الطلب"`,
composed by `<OrderFulfillmentPanel>`) actually renders **inside the order-detail
Dialog** of the admin Orders tab (`orders-management.tsx` → Dialog → line ~806),
opened from a per-row detail (eye) button. The test therefore drove a 404 and
never exercised the real panel.

Retargeted to the **real flow**: log in → `goto /admin` → click the Orders tab
(`getByRole("tab", { name: "الطلبات" })`) → open the first order's detail dialog
→ scope every assertion (RTL, no fabricated `0 د.ع`, light/dark, mobile
no-horizontal-overflow) to `getByRole("dialog")`. The specific-order coupling was
dropped (the render assertions are UI-shape assertions; the specific-order
accounting is already covered by the first test) and replaced with a `skip` when
the local DB has no orders. Selectors were kept resilient (roles / first table
row) rather than adding test-ids to `orders-management.tsx`, which Agent 2 owns.

### RC-1 — `process.exit(1)` in `server/vite.ts`
The Vite dev middleware installed a `customLogger.error` that called
`process.exit(1)`. Any error the Vite logger emitted — a transient transform
error, an HMR hiccup, one bad request mid-suite — tore down the **entire Express
process**, making Playwright runs flaky (the app could vanish for a non-fatal
reason). Fixed: the logger now reports loudly via `viteLogger.error(...)` and
**keeps the process alive**; genuine request failures still surface through the
existing catch-all handler (`next(e)` → Express error middleware).

Startup/readiness/shutdown stability (`server/index.ts`):
- Added an `httpServer.on("error", …)` handler: a bind failure (`EADDRINUSE`) is
  logged clearly and exits cleanly, instead of an opaque unhandled `error` event.
  (`/health` and `/health/db` readiness endpoints already existed and are used by
  the E2E global-setup.)
- Added `SIGTERM` / `SIGINT` graceful shutdown that `httpServer.close()`s (with a
  5s force-exit fallback), so the port is released deterministically between E2E
  runs instead of lingering to an OS timeout.

---

## Part E — The one accidental file

Target basename: `console.log('env.ts`. Five conditions proven with recorded
evidence **before** any deletion (there are several other zero-byte junk files at
root — `console.log('`, `console.log('ERR'`, `console.error(m)`, etc. — all left
untouched; only the exact target was removed):

1. **At repo root** — `git rev-parse --show-toplevel` =
   `C:/Users/jaafa/Desktop/upload/FishWebClean`; `ls -la "console.log('env.ts"`
   listed it directly in that directory.
2. **Untracked** — `git ls-files --error-unmatch -- "console.log('env.ts"` →
   `error: pathspec … did not match any file(s) known to git`, exit 1.
3. **Exactly 0 bytes** — `wc -c "console.log('env.ts"` → `0`.
4. **Exact basename** — `printf '%s' | cat -A` → `console.log('env.ts$` (no
   trailing/hidden characters).
5. **Deleted with a single narrow `rm --`** — `rm -- "console.log('env.ts"` (no
   globs, no recursion). Post-check `ls` confirms it is gone; no other file was
   affected.

---

## Tests / gates summary

| Gate | Result |
|---|---|
| `npm run check` (client/shared) | PASS |
| `npm run check:server` (new) | PASS (owned clean; 308 legacy printed) |
| `npm run check:accounting` | PASS |
| `npm run check:accounting:routes` | PASS (owned clean; 53 legacy printed) |
| `npm run build` | PASS |
| Vitest suite | 114 files / 1559 tests → **1558 passed, 1 failed** (baseline was 112/1538/0; other workstreams added 2 files / 21 tests) |

### The one failing test — NOT introduced by this effort (reported, not fixed)
`client/src/pages/__tests__/home.test.tsx > Home Page > should render the home
page without crashing` fails with `Unable to find an element by:
[data-testid="footer"]`. `client/src/pages/home.tsx` was already modified in the
working tree at session start by another workstream (it is `M` in `git status`),
and the footer test-id no longer matches. This is a **client React render test**;
nothing this effort changed (server startup, tsconfig, `TOOLS/` scripts, the e2e
spec, `.env.example`) is imported by it, so the failure cannot originate here. It
lives in the home-page area owned by another agent and is **reported to the
coordinator, not fixed** (out of this agent's ownership). Every other test — all
1558 — passes.

## Files changed
Modified: `.env.example`, `package.json`, `server/index.ts`, `server/vite.ts`,
`server/storage/invoice-storage.ts`, `e2e/fulfillment-admin.spec.ts`.
Added (tracked): `tsconfig.server.check.json`, `TOOLS/check-server.mjs`,
`TOOLS/script-db-guard.mjs`, `docs/audit/verification-infrastructure-remediation.md`.
Removed: `console.log('env.ts` (untracked, 0-byte, repo root).

Coordinator commits — this agent did not commit.
