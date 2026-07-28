# Full Playwright final certification

**Cycle:** F-10 close-out — live Neon E2E certification
**Executed:** 2026-07-24 → 2026-07-28 (detached-process run; ~567 min of shard wall-clock)
**Author of record:** coordinator (read-only Neon audit + non-production E2E branch)

> Scope note: this document certifies the **accounting** work (F-10 and the
> prior accounting/fulfillment/safety cycle) against a live, production-derived
> database. It also runs the **entire** storefront E2E matrix and reports its
> results honestly. The two verdicts are separated at the end because they are
> not the same question.

---

## 1. E2E branch identity proof (Gate 0)

Neither `NEON_VERIFY_DATABASE_URL` nor `E2E_DATABASE_URL` was present in the
process environment (verified at process/user/machine scope). The connection
string was therefore obtained at **runtime** through the already-authenticated
`neonctl` CLI and injected into each shard's child process by
`scratchpad/e2e-run.mjs`. It was never printed, logged, persisted or committed;
only redacted identity was emitted, and Gate 0 re-ran before **every** shard.

| Property | Value |
|---|---|
| Project | `shiny-tree-43710630` (fishweb) |
| E2E branch | `br-cool-bar-a4x1pig5` — `playwright-final-certification-20260724` |
| E2E endpoint | `ep-rough-smoke-a4umy5in` |
| Database | `neondb` |
| Parent (production) | `br-patient-mouse-a4d4cgr4` — direct child, `parent_lsn 0/4B209770` |
| Production endpoint (blocked) | `ep-quiet-moon-a4h7tdze` |
| default / primary | false / false |

Gate 0 fail-closed checks (all passed): both URLs valid PostgreSQL, resolve to
the same branch, endpoint ≠ production endpoint, branch id ≠ production branch id,
parent **is** production, target not default/primary, credentials present.

The app's own `e2e/support/target-safety.mjs` guard also verified the target
before every shard; production endpoints are structurally rejected.

## 2. Migrations applied (E2E child only — NOT production)

Each file was verified byte-for-byte against its **committed git blob** before
execution, applied in one **executor-owned** transaction (`BEGIN … COMMIT`, no
`session_replication_role`, no global trigger disable), in dependency order.

| # | Migration | sha256 | Result |
|---|---|---|---|
| 1 | `add_order_item_cost_snapshot.sql` | `e507bce47ae334aa77de3df5b38ea2f53e3e656ea6d84f51a2433c4650b3b0ed` | already-applied |
| 2 | `add_orderitem_backfill_trigger_safety.sql` | `ee96e878f98a53c8f303fc0f6be1c629da883cc4e6d2edbc01a717ce73c7cb89` | applied |
| 3 | `backfill_orderitems_from_jsonb.sql` | `bbe942d34716dfc9941f8419559cc78fb45350bafd4faa8a24db962c758a3ac2` | applied (executor set `aquavo.backfill_batch_id` GUC, per contract) |
| 4 | `add_fulfillment_costing.sql` | `ea34a32f5f3d84b5913ca700531941a5ba7f53edf9ba125aa865345a979901d1` | applied |
| 5 | `add_fulfillment_hardening.sql` | `5a7f43634f801f7dc2c77a5f621204c39b1ae1b9cf245a1377e2c67615547f47` | applied |
| 6 | `add_pim_line_identity.sql` | `0b60607b46d17a7f8c34a873f63b2f64b4541b9586a364301ff3124a020dbd03` | applied |
| 7 | `add_product_cost_resolution.sql` | `fd88ddd6f154f939462d30f2736da4443d304a9aea9606dc15387a08432552aa` | applied |
| 8 | `fix_blocked_ips_timestamptz.sql` | `46d064dab3a21e45c09f2c994ca7124d4784c4d92d82165dbf867c47534ba2fb` | applied |
| 9 | `drop_product_cost_zero_defaults.sql` | `5b9f414bc14f1029e8d2da4a29e665cb9494326115ee2a3de39e25261c0d060a` | applied |

## 3. Schema readiness (E2E branch, after migration)

| Check | Result |
|---|---|
| `products.*_resolution` columns | 3 present |
| `order_items_relational` cost-snapshot columns | 5 present |
| `order_fulfillment_lines` / `_sequences` | present |
| `blocked_ips.expires_at` timestamptz | yes |
| cost columns still carrying `DEFAULT 0` | **0** (F-10 applied) |
| `products_zero_cost_needs_resolution_chk` | present |
| App readiness / `/ready` | 200 — `orderCreationEnabled: true` (global-setup proved a verify-branch-only account authenticated before every shard) |

**F-10 counts on the live E2E data (= production shape):** 114 active · **113
known** · **1 unresolved** (`houyi-mountain-wood`, stock 0) · **0 invented
`verified_zero`** · **0 active in-stock zero-cost**.

## 4. Manifest and execution totals

The read-only `--list` manifest enumerated **4,984** tests across **31** files ×
4 projects. Two files are **data-driven** (generate cases from live DB rows), so
against a writable branch they expanded at run time:

| File | manifest (`--list`) | actually ran |
|---|---|---|
| `features.spec.ts` | 224 | **1,368** |
| `admin.spec.ts` | 340 | **352** |
| all others (29) | exact | exact |

**Every one of the 31 manifest files ran (31/31 coverage).** Because the two
data-driven specs expanded, the executed total **exceeds** the manifest.

| Metric | Count |
|---|---|
| Shard units | 37 (29 file-level + 2 write-heavy specs × 4 projects) |
| Discovered | 6,140 |
| **Executed** | **6,138** |
| Passed | 5,274 |
| Failed | 864 |
| Skipped | 2 |

The 2 skips are in `admin-mobile-nav.spec.ts` (documented F-7 mobile-nav gate),
not suppressions introduced here.

## 5. Accounting certification — the reason this run exists

The two specs that exercise the accounting/fulfillment write path were sharded
per project, each against its **own pristine order**, and passed **completely**:

| Spec | Discovered | Executed | Passed | Failed |
|---|---|---|---|---|
| `certification.spec.ts` (D7–D12) × 4 projects | 44 | 44 | **44** | 0 |
| `fulfillment-admin.spec.ts` × 4 projects | 12 | 12 | **12** | 0 |

These cover, in Arabic RTL across desktop/mobile × light/dark: preparation (D7),
approvals & history (D8), cost status known/unknown/verified-zero/incomplete
(D9), expected-vs-actual cost (D10), contribution profit (D11), returns &
reversals (D12), inventory locking, out-of-stock handling, and the independent
fulfillment verifier reporting zero critical findings.

**A scan of all 864 failures' full error text for `cost / COGS / snapshot /
unit_cost / profit / verified_zero / packaging / expectedCost / actualCost`
returns 0 matches.** No accounting assertion failed.

### 5a. The 4 initial `certification` failures were an isolation defect, now fixed

The first `certification` run (one shard, all 4 projects on ONE shared order)
failed 4 tests: `ORIGINAL_ALREADY_EXISTS` (409≠201) and `expectedCost`
9500/11400/13300/15200 ≠ 1900. Root cause: the spec mutates its order (opens a
preparation draft, confirms a shipment), and `POST /orders/{id}/draft` returns
the existing open draft, so lines accumulated across projects (+1900 each) and a
prior shipment stayed active. This is a **test-isolation** defect, not a product
defect — the arithmetic (1500 catalog + 400 manual = 1900) was correct on every
run. Fixed by giving each spec×project shard its own pristine order. **No
assertion was weakened and no test was excluded.**

## 6. The 864 storefront failures — classified, and why they are out of scope

Every failure falls into UI/test-quality classes unrelated to the server changes
in this cycle:

| Class | Count | What it is |
|---|---|---|
| ambiguous-locator strict-mode | 286 | spec locators match ≥2 elements |
| UI locator timeout / visibility | 219 | element never appears / not clickable |
| assertion on UI count/text (`toBeGreaterThan`, `toBe`, `toMatch`, `toHaveURL`) | 153 | storefront DOM shape assertions |
| malformed CSS selector **in the spec** (`Unexpected token "=" … css selector`, `Invalid flags supplied to RegExp`) | 116 | selectors that can never parse |
| element-not-visible | 90 | `toBeVisible` on absent elements |
| route-path mismatch **in the spec** | 4 | asserts `/api/categories`, which has never existed |

Two independent proofs these are **not** caused by this cycle's work:

1. **This cycle's four commits touched zero `client/**` and zero `*.spec.ts`
   files** — only `server/services`, `server/storage`, `shared/schema.ts`,
   `migrations/`, and `docs/`.
2. **The repository already carries substantial uncommitted client work** from a
   prior session (`navbar.tsx` modified with `NavbarStyleSwitcher.tsx` +
   `navbar/index.ts` deleted, plus `home.tsx`, `product-card.tsx`,
   `product-image-gallery.tsx`, `App.tsx`, `index.css`, …). The failure
   concentration matches it exactly — highest in `journey` (77), `products`
   (73), `home` (45), `calculators` (83, ambiguous `has-text` button locators).

These are pre-existing storefront-spec and in-flight-UI issues. Remediating them
is a separate front-end task and was explicitly out of scope for this accounting
close-out.

## 7. Per-shard results

| Shard | Disc | Exec | Pass | Fail | Skip | Exit | Retry class | s |
|---|---|---|---|---|---|---|---|---|
| admin-mobile-nav.spec.ts | 44 | 42 | 42 | 0 | 2 | 0 | — | 286 |
| accessibility.spec.ts | 96 | 96 | 96 | 0 | 0 | 0 | — | 229 |
| admin.spec.ts | 352 | 352 | 336 | 16 | 0 | 1 | deterministic-failure | 2154 |
| advanced-features.spec.ts | 276 | 276 | 244 | 32 | 0 | 1 | deterministic-failure | 1377 |
| advanced-pages.spec.ts | 188 | 188 | 176 | 12 | 0 | 1 | deterministic-failure | 744 |
| api-integration.spec.ts | 104 | 104 | 100 | 4 | 0 | 1 | deterministic-failure | 77 |
| auth.spec.ts | 176 | 176 | 161 | 15 | 0 | 1 | deterministic-failure | 884 |
| calculators.spec.ts | 172 | 172 | 89 | 83 | 0 | 1 | unstable-failure | 755 |
| cart.spec.ts | 112 | 112 | 92 | 20 | 0 | 1 | unstable-failure | 651 |
| certification.spec.ts::desktop-dark | 11 | 11 | 11 | 0 | 0 | 0 | — | 117 |
| certification.spec.ts::desktop-light | 11 | 11 | 11 | 0 | 0 | 0 | — | 115 |
| certification.spec.ts::mobile-dark | 11 | 11 | 11 | 0 | 0 | 0 | — | 123 |
| certification.spec.ts::mobile-light | 11 | 11 | 11 | 0 | 0 | 0 | — | 128 |
| chat.spec.ts | 160 | 160 | 160 | 0 | 0 | 0 | — | 700 |
| checkout.spec.ts | 128 | 128 | 100 | 28 | 0 | 1 | unstable-failure | 1416 |
| contexts.spec.ts | 168 | 168 | 152 | 16 | 0 | 1 | deterministic-failure | 939 |
| effects-interactions.spec.ts | 220 | 220 | 208 | 12 | 0 | 1 | deterministic-failure | 923 |
| extended-features.spec.ts | 228 | 228 | 190 | 38 | 0 | 1 | deterministic-failure | 1024 |
| features.spec.ts | 1368 | 1368 | 1187 | 181 | 0 | 1 | unstable-failure | 5697 |
| final-features.spec.ts | 184 | 184 | 156 | 28 | 0 | 1 | deterministic-failure | 752 |
| fish.spec.ts | 136 | 136 | 121 | 15 | 0 | 1 | unstable-failure | 856 |
| fulfillment-admin.spec.ts::desktop-dark | 3 | 3 | 3 | 0 | 0 | 0 | — | 83 |
| fulfillment-admin.spec.ts::desktop-light | 3 | 3 | 3 | 0 | 0 | 0 | — | 87 |
| fulfillment-admin.spec.ts::mobile-dark | 3 | 3 | 3 | 0 | 0 | 0 | — | 89 |
| fulfillment-admin.spec.ts::mobile-light | 3 | 3 | 3 | 0 | 0 | 0 | — | 88 |
| gallery.spec.ts | 120 | 120 | 93 | 27 | 0 | 1 | deterministic-failure | 759 |
| home.spec.ts | 144 | 144 | 99 | 45 | 0 | 1 | unstable-failure | 1396 |
| journey.spec.ts | 152 | 152 | 75 | 77 | 0 | 1 | unstable-failure | 3010 |
| navigation.spec.ts | 172 | 172 | 156 | 16 | 0 | 1 | unstable-failure | 775 |
| page-features.spec.ts | 248 | 248 | 216 | 32 | 0 | 1 | deterministic-failure | 987 |
| products.spec.ts | 172 | 172 | 99 | 73 | 0 | 1 | unstable-failure | 2130 |
| responsive.spec.ts | 128 | 128 | 116 | 12 | 0 | 1 | deterministic-failure | 414 |
| security-widgets.spec.ts | 160 | 160 | 152 | 8 | 0 | 1 | deterministic-failure | 696 |
| system-features.spec.ts | 208 | 208 | 176 | 32 | 0 | 1 | deterministic-failure | 1001 |
| ui-components.spec.ts | 228 | 228 | 212 | 16 | 0 | 1 | deterministic-failure | 829 |
| user-flows.spec.ts | 88 | 88 | 68 | 20 | 0 | 1 | deterministic-failure | 1059 |
| utilities.spec.ts | 152 | 152 | 146 | 6 | 0 | 1 | deterministic-failure | 691 |

Retries: every shard that exited non-zero was retried exactly once and
classified (`deterministic-failure` = same failures both attempts;
`unstable-failure` = differed → contains flake). No shard was excluded; the
final attempt's numbers are the recorded ones.

## 8. Regression gates

| Gate | Result |
|---|---|
| Vitest | **1,589 / 1,590 passed**, 0 skipped in the clean run. The single failure — `client/src/pages/__tests__/home.test.tsx › should render without crashing` — is an environmental flake (7.4 s `waitForWrapper` timeout under full-suite load); it **passes 5/5 in isolation, twice**, imports nothing from this cycle's changes, and belongs to the uncommitted `home.tsx` work. All 116 server/accounting test files pass. |
| Typechecks (`check:all` — `tsc`, `check:server`, `check:accounting`, `check:accounting:routes`) | **PASS** |
| Production build (`npm run build`) | **PASS** (client bundles + `dist/index.js`) |
| Credential / PII scan | **PASS** — no live secret in this cycle's changes. Two matches are pre-existing and safe: `pre-neon-readiness.md` (already `REDACTED_ROTATE_ME`) and `db-target.test.ts` (a `${SECRET}` variable in the production-detection fixture). The E2E connection string never entered any file. |

## 9. Production-isolation proof (read-only)

| Property | Production `br-patient-mouse-a4d4cgr4` | E2E `br-cool-bar-a4x1pig5` |
|---|---|---|
| `*_resolution` columns | **0** | 3 |
| cost columns with `DEFAULT 0` | **3** | 0 |
| fulfillment tables | **absent** | present |
| synthetic E2E users | **0** | 2 |
| fulfillment events (test-generated) | — | 27 |
| fulfillment materials (test-generated) | — | 30 |
| products (total/active/zero-cost) | 114 / 114 / 1 | 114 / 114 / 1 |

Production carries **none** of the migrations, synthetic users, or test-generated
accounting rows. Every write from this run landed on the E2E child branch. (The
production `orders` count moved 38→42 over the elapsed days — ordinary customer
traffic, not this run: those writes carry a synthetic user, and production shows
0.) No migration or test changed production.

## 10. What remains

- **864 storefront E2E failures + in-flight uncommitted client work** — a
  separate front-end remediation task, not an accounting blocker.
- The final clean Neon verification/rollback pair has **not** been created
  (correctly deferred to the owner).
