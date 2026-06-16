# AQUAVO — Architecture Map & Judgment

_Read-only architecture review. Generated 2026-06-16. Branch: `perfection-campaign/aquavo-global-level`._
_Builds on `reports/01_codebase_and_cleanup.md`. No source modified._

---

## 0. Layer Map (verified)

| Layer | Path | Runtime |
|-------|------|---------|
| Client SPA | `client/` | React 19 + Vite + Wouter (76 `<Route>` in `App.tsx`) + React Query |
| Server | `server/` | Express + Drizzle; 41 route modules in `server/routes/`, 45 services, 11 storage modules |
| Shared | `shared/` | `schema.ts` (85 `pgTable`), `accounting.ts`, `products.ts`, type contracts — source of truth |
| Serverless entry | `api/index.ts` | Wraps Express via `registerRoutes`, bundles `server/**`+`shared/**` |
| Long-running entry | `server/index.ts` | `httpServer.listen()` + `setupWebSocket()` — the **node/dev** path |
| Migrations | `migrations/` | 7 drizzle + 15 hand-SQL (drift — see report 01 §3) |

**Two entry points share one route tree.** `api/index.ts` (Vercel) and `server/index.ts` (node) both call `registerRoutes(httpServer, app)`. This is CLEAN as a pattern — single composition root — but the two diverge in lifecycle (WebSocket + `listen` only in `server/index.ts`), which is the root of the serverless-state mismatches below.

---

## 1. What is CLEAN and worth keeping

1. **Single route-composition root** — `server/routes.ts:53 registerRoutes()` mounts every router in one place (`server/routes.ts:71-154`). Easy to audit the full API surface; both entry points reuse it. Keep.
2. **Storage layer is genuinely separated** — `server/storage/` (11 modules: product, order, user, loyalty, invoice, referral, security, settings…) with an `index.ts` aggregator. Routes call storage, storage calls Drizzle. This is the strongest boundary in the codebase. Keep and extend.
3. **`shared/` as a real contract** — `shared/schema.ts` is consumed by both server (Drizzle) and client (admin finance panels import `shared/accounting.ts` types — `client/src/components/admin/*.tsx`). Verified **no client file imports `server/`** (grep returned zero). The client→server boundary is not leaking implementation, only types. Keep — this is correct.
4. **AI provider clients are singletons with key failover** — `groq-client.ts`, `gemini-client.ts`, `claude-client.ts` each hold a `Map<string, Client>` with multi-key fallback. Consistent shape. Keep the pattern.
5. **Per-router factory functions** (`createProductRouter()`, `createOrderRouter()`…) — dependency-light, testable, no module-level app coupling. Keep.

---

## 2. What HOLDS THE PROJECT BACK

### 2.1 In-memory state inside a serverless function (HIGH)
**Evidence:**
- `server/routes/social-analytics.ts:24` — `const oauthStates = new Map(...)` holds OAuth CSRF state; `:72` set, `:123` get. On Vercel each request may hit a fresh lambda → **OAuth callback fails intermittently** because the state was stored in another instance.
- `server/routes/products.ts:14` — `productsCache = new Map()` + `setInterval` sweeper (`:22`). Cache never warms across cold starts; the `setInterval` leaks a timer that serverless cannot clear.
- `setInterval` also in `analytics.ts`, `ai-monitor.ts`, `social/auto-responder.ts`, `ws-server.ts`, `session-store.ts`, `db.ts`.
- `finance-audit.ts:62-65` — explicit "in-memory cache from this process lifetime" fallback.

**Refactor:**
- SAFE: move OAuth state to a DB table or signed stateless JWT (`state` = HMAC of `userId|platform|nonce|exp`). Removes the Map entirely. Risk: low — isolated to social OAuth flow.
- STRATEGIC: replace in-memory caches with a shared store (Neon table w/ TTL, or Upstash/KV). Gate all `setInterval` behind `if (!process.env.VERCEL)`. Risk: medium — touches caching correctness; needs load verification.

### 2.2 308 `as any` casts across 50 server files (MEDIUM, systemic)
**Evidence:** `order-storage.ts` (36), `admin.ts` (32), `ai-advanced.ts` (51), `product-storage.ts` (18), `orders.ts` (17). Violates CLAUDE.md rule #3 ("no `any` ever"). Concentrated in storage + admin — exactly the data-integrity-critical paths. Many are likely Drizzle/Neon BigInt/Decimal coercion (see CLAUDE.md gotcha).

**Refactor:**
- SAFE: extract the repeated BigInt/Decimal sanitization (`JSON.parse(JSON.stringify(...))`) into one typed helper in `server/utils/` and replace ad-hoc casts. Risk: low.
- STRATEGIC: type Drizzle row results properly (infer from schema) in the 4 hot files. Risk: medium — `tsconfig.json` currently **excludes `server/**`** from type-checking (per MEMORY.md), so these casts are invisible to CI. Re-enabling server type-check is the real fix but will surface a large backlog.

### 2.3 Server type-checking is disabled (HIGH, hidden debt)
`tsconfig.json` excludes `server/**` (per MEMORY.md "Known Pre-existing Issues"). This is why 308 `as any` and other unsafe code survive. The whole server compiles via esbuild bundle (`script/build.ts`) with no type gate.
**Refactor:** STRATEGIC — add `tsconfig.server.json` (already exists) to CI as a non-blocking `tsc --noEmit` report first, then ratchet. Risk: medium, high payoff.

### 2.4 Duplicate / overlapping route mounts (LOW–MEDIUM)
- `server/routes.ts:76-77` mounts `createAnalyticsRouter()` at **both** `/api/admin/analytics` and `/api/analytics` — two instances of the same router, double `setInterval`, ambiguous auth surface.
- `:85-86` mounts `systemRouter` at both `/api/system` and `/`.
- AI surface is fragmented across `ai.ts`, `ai-settings.ts`, `ai-advanced.ts`, `ai-monitor.ts`, `ai-learnings.ts`, `ai-board.ts` — six routers, several sharing `/api/ai` prefix (`:102,:105`).

**Refactor:** SAFE — mount analytics once; if two prefixes are needed, share a single router instance. Consolidate AI routers under a documented prefix map. Risk: low (verify no client calls the dropped path first).

### 2.5 Dead / unwired code paths (LOW)
- `server/services/claude-client.ts` — `@anthropic-ai/sdk` installed (`package.json:32`) but **grep shows zero importers** (`grep -rln claude-client server/` = none). Confirmed dead per MEMORY.md ("ready for future use, NOT wired"). Keep only if Anthropic adoption is imminent; otherwise remove client + dependency.
- `gemini-ai.ts` is **misnamed** — it imports `groq-client` and runs entirely on Groq (`gemini-ai.ts:16,1021`). Historical naming (confirmed in MEMORY.md) actively misleads. Gemini is used **only** by `embedding-generator`, `vet-rag`, `visual-ai`, and the `agents/` (vision/diagnostician/treatment/reviewer).
**Refactor:** SAFE rename `gemini-ai.ts` → `chat-agent.ts` (or `groq-agent.ts`). Risk: low (mechanical, update imports).

### 2.6 Service layer is a flat 45-file bag (MEDIUM, organizational)
`server/services/` mixes AI (12+ files), finance (`accountingAuditTrail`, `groqFinanceAudit`, `financeAuditStorage`), commerce (`pricing-engine`, `recommendation-engine`, `inventory-optimizer`), notifications, and RAG with no sub-grouping except `agents/` and `social/`. `financeAuditStorage.ts` is a *storage* concern living in *services*.
**Refactor:** STRATEGIC — group into `services/ai/`, `services/finance/`, `services/commerce/`, `services/notifications/`; move `financeAuditStorage` to `server/storage/`. Risk: medium (import churn only, no logic change).

---

## 3. Migration drift (carried from report 01, re-affirmed)
85 tables in `shared/schema.ts` vs 7 drizzle migrations + 15 hand-SQL; duplicate `0003_*` prefix; `drizzle.config.ts tablesFilter` lists ~75 < 85. **Do NOT run `db:push`.** `migrations/` is not authoritative — Neon is live truth. Reconcile read-only (Neon MCP `describe_table_schema`), apply additive SQL surgically. Keep all migration files for provenance.

---

## Top 8 Architectural Findings

1. **In-memory state in serverless is the #1 architectural bug.** OAuth state (`social-analytics.ts:24`) and product cache (`products.ts:14`) live in process-local `Map`s + `setInterval`; on Vercel these don't survive across lambdas → flaky OAuth and dead caches. Move to DB/stateless tokens; gate timers behind `!process.env.VERCEL`.
2. **Server type-checking is OFF** (`tsconfig.json` excludes `server/**`), which is the enabling cause of **308 `as any` casts** across 50 files — heaviest in the data-critical `order-storage`/`admin`/`product-storage`. Ratchet `tsc --noEmit` on `tsconfig.server.json`.
3. **CLEAN core worth keeping:** single `registerRoutes()` composition root, a real `storage/` data-access layer, and a genuine `shared/` type contract with **zero client→server imports**.
4. **Two entry points, one route tree** (`api/index.ts` + `server/index.ts` both call `registerRoutes`) is a good pattern, but lifecycle diverges (WebSocket + `listen` only in node entry) — this divergence is what makes the in-memory state assumptions wrong on Vercel.
5. **Duplicate route mounts:** analytics router mounted twice (`routes.ts:76-77`), systemRouter twice (`:85-86`); AI surface fragmented across 6 routers on overlapping prefixes. Consolidate.
6. **`gemini-ai.ts` is misnamed** — runs on Groq, not Gemini (`:16`). Real Gemini usage is isolated to embeddings/vision/RAG/agents. Rename to stop misleading future work.
7. **`claude-client.ts` is dead code** — `@anthropic-ai/sdk` is a dependency with zero importers. Remove or wire intentionally.
8. **Service layer is a flat 45-file directory** mixing AI/finance/commerce/notifications; `financeAuditStorage` is misplaced (storage logic in services). Group into domain subfolders — pure import churn, no behavior change.
