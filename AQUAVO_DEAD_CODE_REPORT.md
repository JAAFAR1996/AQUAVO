# AQUAVO Dead-Code Report (verified — awaiting approval to delete)

**Branch:** `perfection-campaign/aquavo-global-level`
**Status:** Evidence gathered. **NOTHING deleted.** Deletion held for owner approval per instruction.
**Method:** `grep -rn <name> client/src server shared api` (excluding the file's own definition) → zero importers; `git ls-files` for tracking.

## Confirmed dead code (zero importers across the entire codebase)

| # | Path | Tracked? | Evidence | Recommendation | Risk if deleted |
|---|------|----------|----------|----------------|-----------------|
| 1 | `client/src/lib/mock-data.ts` | yes | No file imports `lib/mock-data` anywhere in `client/src`. | `git rm` | None — fixture data, unreferenced |
| 2 | `server/services/claude-client.ts` | yes | No importer in `server/`. Matches project memory: "@anthropic-ai/sdk … created (ready for future use, NOT wired)". | `git rm` (and optionally drop `@anthropic-ai/sdk` from package.json) | None for code; keep the dep if Claude wiring is planned |
| 3 | `server/scripts/debug-chat.ts` | yes | No importer; a manual debug script. | `git rm` | None — dev-only script |
| 4 | `client/src/components/reviews/` (barrel + components) | (dir) | No `components/reviews` import in `client/src`; the live reviews UI is `components/products/product-reviews.tsx`. | `git rm -r` after a 2-minute manual confirm | Low — verify no dynamic/string import first |

## Notable but NOT auto-deletable (need a decision, not just evidence)
- **Duplicate pages** (from file-by-file audit): `app/not-found.tsx` vs `pages/404.tsx`; `temperature-guide.tsx` vs `guides-temperature-guide.tsx` (both routed → SEO duplicate-content). These are *referenced* (routed), so deletion = a routing decision, not dead-code removal. Owner to pick the canonical one.
- **`@anthropic-ai/sdk`** dependency: only used by the dead `claude-client.ts`. Removing the file makes the dep unused too — but keep if Claude integration is on the roadmap.

## Why I did not delete this round
Your standing rules: "report before deletion" and "prepare the delete list with evidence first." The file-by-file inspector also cautioned that some barrel files may be deliberately-kept API surface. All four items above are high-confidence, but I'm holding deletion until you say go. They are reversible (`git rm` on a branch) once approved.

## Suggested deletion command (run only after approval)
```bash
git rm client/src/lib/mock-data.ts server/services/claude-client.ts server/scripts/debug-chat.ts
git rm -r client/src/components/reviews
# optional, only if Claude wiring is abandoned:
# npm pkg delete dependencies.@anthropic-ai/sdk
```
After deletion: re-run `npx tsc`, `npx vitest run`, `npx vite build` to confirm nothing referenced them dynamically.
