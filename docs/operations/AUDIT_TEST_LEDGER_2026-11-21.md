# AQUAVO integration test repair ledger

Intermediate evidence for integration; no production operations were performed.

## Initial full run

`corepack pnpm exec vitest run --maxWorkers=2`

- Log: /workspace/scratch/02f01ebc162a/full_suite_repair.log
- Duration: 597.39 seconds.
- Files: 443 passed, 16 failed, 1 skipped, 2 worker exits (462 collected).
- Tests: 4699 passed, 44 failed, 7 skipped (4771 collected).
- This initial run was red; its result must not be reported as a green full-suite run.

## Every initially failed file

| File | Cause | Correction | Successful rerun log | Status |
|---|---|---|---|---|
| test/seo-search-metadata.test.tsx | Collection failed: omitted reports/i18n/source-cache.json | Restored tracked reference via sparse checkout; assertions unchanged | integration_reference_rerun.log | Passed |
| server/__tests__/customer-messaging-outbox-contract.test.ts | Collection failed: omitted neon-functions/customer-messaging-scheduler.ts | Restored tracked reference via sparse checkout; assertions unchanged | integration_reference_rerun.log | Passed |
| test/seo-production-safety.test.ts | Missing tracked SEO query map | Restored reports/release-2026-07-12/seo-aeo-geo-query-map.md | integration_reference_rerun.log | Passed |
| server/__tests__/accounting-v2-wiring-contract.test.ts | Static test expected inline MIME logic after extraction | Assert shared upload policy, PDF/MIME checks and SHA-256 over original bytes | integration_tail_rerun.log | Passed |
| server/__tests__/archived-order-display-http.test.ts | DB-null fixture failed at new shared limiter before privacy checks | Use isolated MemoryStore under the real limiter; keep privacy and no-write assertions | integration_reference_rerun.log | Passed |
| server/__tests__/consolidation-engine-agreement.test.ts | Fixture missing mapped customer_notes and visibility/test columns | Add prerequisite nullable/default columns only; all financial identities unchanged | integration_repair_rerun.log | Passed |
| server/__tests__/db-target.test.ts | tsx CLI IPC socket unavailable in local runner | Run actual inherited-env child through Node --import tsx; same target/secret assertions | notification_dbtarget_rerun.log | Passed |
| server/__tests__/deployment-order-guard.test.ts | Unrelated checkout/visibility schema prerequisites absent | Add 0106/0107 prerequisites + existing0083 flag; retain deliberately absent sale-snapshot columns and hazard assertions | integration_repair_rerun.log | Passed |
| server/__tests__/fulfillment-admin-api.test.ts | Fixture lacked newly mapped columns | Update only fixture DDL; preserve profitability/reversal/404 expectations | integration_repair_rerun.log | Passed |
| server/__tests__/order-tracking-security.test.ts | New shared limiter had no DB in isolated fixture | MemoryStore fixture under real limiter; preserve generic denial/last-four/minimal response checks | integration_reference_rerun.log | Passed |
| server/__tests__/orders-api.test.ts | Source-order assertion matched newly added authorized replay repair | Check fresh claim after createOrder and replay claim after ownership/hash validation | integration_repair_rerun.log | Passed |
| server/__tests__/return-request-evidence-http.test.ts | PGlite fixture omitted shared rate_limit_buckets | Add counter table and use real rate middleware; preserve evidence and owner checks | integration_tail_rerun.log | Passed |
| client/src/__tests__/seo-contract.test.ts | Static where() shape changed to compound visibility guard | Assert both soft-delete and storefront-visible filters | integration_reference_rerun.log | Passed |
| client/src/pages/__tests__/compare.test.tsx | Compare fixture omitted new compareIds contract | Supply compareIds/query cache while keeping rendering, empty state, headings assertions | integration_tail_rerun.log | Passed |
| client/src/pages/__tests__/products.test.tsx | Retry mock assumed removed nested retry loops | Keep server failed until error UI then recover before retry click; assert request/recovery | integration_reference_rerun.log | Passed |
| client/src/components/products/__tests__/incoming-product-surfaces.test.tsx | Comparison drawer now queries selected IDs and needs QueryClient | Provide keyed query cache; retain actual/fallback photos and coming-soon behavior checks | integration_tail_rerun.log | Passed |

## Additional checks and completed reruns

| Item | Evidence / status |
|---|---|
| Hidden/deleted cart preflight | Guard added before public fields; cart-stock cases passed in integration_repair_rerun.log |
| Canonical notification result | Actual loyaltyPoints balance and typed metadata; pending points do not activate milestone coupons; notification_dbtarget_rerun.log passed |
| Latest catalogue pagination/variant guards | Passed in integration_tail_rerun.log |
| CSS source graph | Newly added Node test initially failed on unguarded window in shared test setup; browser-only setup now guarded; passed in integration_final_targeted.log |
| financial-realization-immutability.test.ts | Initial worker exit; each test opened PGlite without close. Added afterEach close; isolated maxWorkers1 rerun passed in integration_worker_rerun.log (98 tests across both files, no worker errors) |
| accounting-v2-migration-0074-execution.test.ts | Initial worker exit; per-case PGlite never closed. Added afterEach close; isolated maxWorkers1 rerun passed in integration_worker_rerun.log (98 tests across both files, no worker errors) |
| Latest audit-runtime-integrity/public-product-boundary | Passed in integration_final_targeted.log; included latest counter cleanup/constraint and Arabic/camelCase privacy keys |

## Successful focused batch totals

- integration_repair_rerun.log: 7 files,117 tests passed.
- notification_dbtarget_rerun.log: 2 files,25 tests passed.
- integration_reference_rerun.log: 7 files,92 tests passed.
- integration_tail_rerun.log: 5 files,39 tests passed; one new CSS suite failed collection before setup fix.
- integration_worker_rerun.log: 2 files,98 tests passed, no unhandled worker errors.
- integration_final_targeted.log: 5 files,59 tests passed (Node CSS graph, latest runtime/privacy gates, and DOM compatibility).
- checkout_locale_rerun.log: 3 files,25 tests passed after governorate direction/display-label fix; canonical values untouched.
- loyalty_lifecycle_final.log: 3 files,44 tests passed (initial 13 atomic approve/cancel cases,11 referral cases,20 canonical runtime cases).
- loyalty_replay_bundle_tests.log: 3 files,41 tests passed (20 lifecycle cases including 7 new canonical failure/retry/fresh-delivery cases,20 runtime cases,1 real esbuild local-module graph check).
- Counts overlap across batches and must not be added as unique coverage.

No assertions were disabled, skipped, reduced, or changed to accept failures. Live database, payment, deployment, pricing, coming-soon, and WhatsApp-terms policies were not changed by this integration pass.

## Final loyalty lifecycle repair evidence

- Approve/cancel moves pending ledger and customer balances in one transaction using order → user → pending-ledger locks; current status and owner are rechecked under lock.
- User/ledger/tier-audit failure fixtures prove full rollback; repeated calls and simultaneous awards keep balances additive. PGlite does not independently prove multi-connection PostgreSQL lock scheduling.
- A canonical status transaction may commit before settlement fails. Repeating delivered now retries only approveOrderPoints; repeating each of the five cancellation statuses retries only cancelOrderPoints. Ancillary order bonus/milestone/badge/challenge effects are not replayed.
- Literal local dynamic imports replace a computed import path that remained unresolved in the pre-repair production bundle; the esbuild graph test proves inclusion of the three storage modules without external relative runtime paths.
- Stored total8549/roundedTotal8750 remains unchanged in transition/replay tests. No historical reward reconciliation or new clawback policy was introduced.

## Dependency security wave after the integration reruns

- Root-lock audit originally reported18 advisories (7high,9moderate,2low); after reviewed upstream/patch upgrades, both all-dependency and production audits returned exit0 with every severity0. Evidence: dependency_audit_all_after.json and dependency_audit_prod_after.json.
- Direct changed packages are dev-only: Vitest/ui4.1.12, Happy DOM21.0.4, Puppeteer25.18.1, sharp0.35.5. Runtime direct importers and Playwright1.57 are unchanged. Frozen install used --ignore-scripts.
- dependency_policy_dom_tests.log initially had1 failure in the NEW workflow-policy test: an arbitrary expected floor-count>30, while the reviewed list contains exactly30. Corrected to exact30 and kept every version/override assertion; dependency_policy_final_tests.log then4/4passed. The initial batch's products12 and server bundle1 passed on the new tools.
- dependency_toolchain_smoke.log: actual sharp SVG->PNG with librsvg2.63.2, upstream BiDi157/Zod4 valid/invalid parser, NFT1.11.11 dynamic glob file trace all passed. No browser launch or live service.
- Strict source comparison was rerun for both base and current using identical updated node_modules: baseline301/37, current158/23, all158 matched historical source anchors;0unmatched. Both complete tsc commands exit2 due existing debt. Root owns the final critical-file gate and full suite/build.
- Reports: docs/operations/AUDIT_DEPENDENCIES_2026-11-21.md and AUDIT_TYPECHECK_BASELINE_2026-11-21.md.

## Full suite after dependency remediation

Command: `NODE_ENV=test corepack pnpm exec vitest run --maxWorkers=2 --reporter=default --reporter=json --outputFile=.../full_suite_after_dependencies.json`.

- Runtime: Vitest4.1.12 / Happy DOM21.0.4; production build generated immediately before the run.
- Duration: 656.29 seconds.
- Files: 474 passed,1 skipped (475). Tests:4906 passed,7 skipped (4913). No assertion failures or worker exits.
- **Exit code1**:81 unhandled `AbortError: The animation was canceled.` rejections from Happy DOM Animation.cancel through Motion native animation cleanup. The JSON reporter's `success:true` does not override the unsuccessful process result.
- Affected file counts: product-details42, checkout2, ai-chat-bot13, cart2, global-search2, order-tracking10, confirmation-consent6, incoming-product-surfaces2, profile2.
- Logs: `/workspace/scratch/02f01ebc162a/full_suite_after_dependencies.log`, JSON report beside it, and `animation_unhandled_summary.json`.
- No error-ignore option, global unhandled-rejection suppression or assertion removal is permitted as the fix. Compatibility remediation and its rerun will be recorded below.

## Additional final local gates

- Full production build after dependency updates and bounded home picks: exit0 (`build_after_dependencies.log`).
- Gzip budgets unchanged: entry6.78KiB/60, CSS49.58/50, product24.52/25, deferred3D278.19/300; initial HTML has no3D preload. No production sourcemaps.
- Client TypeScript, expanded server gate, accounting and accounting-route gates: exit0. Full server strict still has158 old diagnostics/23files and exits2; matched baseline comparison documents0new diagnostics.
- Migration governance:70numbered migrations registered with rollbacks; historical warnings retained.
- SSR generated-runtime/canonical-host smoke and cold-start all locales at256MB heap: exit0.
- UI translation validator:0errors/0warnings. Link and HTML structure gates:exit0.
- Commerce integrity against the freshly fetched public source:0findings. The tracked historical source cache gave216findings; no data was pruned or assertions weakened to change that result.
- Full live-source content validation still has2missing-translation findings for a private-invoice product incorrectly exposed by the pre-fix production catalogue. No translation or private reference was copied into the public repository. Re-fetch after an approved visibility deployment; do not manufacture a public translation merely to pass CI.

## Happy DOM cancellation compatibility repair

- Source cause: Happy DOM21.0.4 rejects `Animation.finished` in `cancel()` without implementing the handled internal-promise step in [Web Animations4.4.14](https://www.w3.org/TR/web-animations-1/#canceling-an-animation-section).
- `test/helpers/happy-dom-animation.ts`, imported only by Vitest setup, handles that specific internal promise before native cancellation. It does not replace the promise, disable native animations, alter production Motion code or install a global rejection listener.
- Six isolated child-process controls run with `--unhandled-rejections=strict`: raw upstream cancellation reproduces failure; patched cancellation/events/replay pass; captured `finished` remains rejected; non-Happy-DOM/idle behavior stays unchanged; consumer-derived and unrelated unhandled rejections still fail the child.
- The first narrow run fixed the nine affected files but two new control assertions expected a different Node error-string format. Node did fail correctly; assertions were corrected to match the actual error name/message, without altering the expected exit status.
- Final rerun:10files/136tests passed, exit0, zero unhandled errors,27.32seconds (`happy_dom_animation_focused_final.log`).
- Direct strict/noEmit check of setup/helper/test:exit0 (`happy_dom_animation_types.log`); the ordinary client tsconfig does not include these harness files.
- Dependencies/lockfile and production runtime did not change during this repair. The final complete suite and actual browser checks are required in CI; no broad green result is inferred from the focused rerun.
