# AQUAVO — Performance & Media Audit (Report 04)

Read-only audit. Working dir: `C:\Users\jaafa\Desktop\upload\FishWebClean`
Date: 2026-06-15

---

## 0. Lighthouse Scores (real numbers from repo JSONs)

All runs are mobile, against `http://localhost:5000/` (homepage). Captured 2026-05-11.

| Report | Time (UTC) | Perf | LCP | FCP | TBT | CLS | Speed Index | TTI |
|--------|-----------|------|-----|-----|-----|-----|-------------|-----|
| `lighthouse-report.json` (baseline) | 09:35 | **26** | 13.8 s | 7.4 s | 2,850 ms | 0.007 | 12.1 s | 17.1 s |
| `lh-after.json` | 10:03 | **25** | 13.8 s | 7.4 s | 3,570 ms | 0.013 | 29.2 s | 14.8 s |
| `lh-prod.json` | 10:17 | **39** | 6.0 s | 3.2 s | 1,430 ms | 0.007 | 7.5 s | 7.9 s |
| `lh-final.json` (latest/best) | 11:06 | **59** | 5.5 s | 3.2 s | 380 ms | 0.007 | 6.0 s | 6.7 s |

**Trajectory:** 26 → 59 perf score over the session. The production-build run (`lh-final`) is the representative state. CLS is excellent throughout (≤0.013). The dev-server runs (26/25) are not representative — unminified, no compression.

### `lh-final.json` diagnostics (the state that matters)
- Total byte weight: **590 KiB** (homepage — 3D models NOT loaded here)
- Main-thread work: **7.8 s** (still the dominant remaining cost)
- JS bootup time: 0.9 s
- DOM size: 252 elements (fine)
- Unused JavaScript: ~47 KiB savings available
- Render-blocking resources: 1 (minor)
- Text compression: passing (gzip + brotli via vite-plugin-compression)
- Server response time: 30 ms (root doc — fine)
- Third-party main-thread blocking: 0 ms

**Remaining bottleneck on homepage:** LCP 5.5 s + main-thread work 7.8 s. Not bytes — it's JS execution/hydration. LCP at 5.5 s with FCP 3.2 s means the largest element paints ~2.3 s after first paint (likely hero image decode + React hydration).

---

## 1. Frontend Performance

### What's already good (no action needed)
- **Code splitting is thorough.** `vite.config.ts` defines manual vendor chunks: `vendor-react`, `vendor-ui` (Radix), `vendor-icons` (lucide), `vendor-animation` (framer-motion), `vendor-charts` (recharts/d3), `vendor-utils`. Charts/animation are isolated so they don't load on every page.
- **`modulePreload: false`** — deliberately disabled to stop the browser eagerly fetching all chunks (charts 110KB, animation 44KB) on every page. Good call, documented in comments.
- **Route-level lazy loading is comprehensive** — `App.tsx` lazy-loads ~40 page components including `ProductDetails`, `AdminDashboard`, `CheckoutPage`, all guides. Only the shell loads eagerly.
- **Compression:** gzip + brotli generated at build (threshold 1KB).
- **Minify:** `oxc` with `dropConsole`/`dropDebugger` in production; `cssCodeSplit: true`.
- **React Query** (`queryClient.ts`): `refetchOnWindowFocus: false`, `staleTime: 5min` (note comment "was Infinity" — was over-caching before). Sensible.
- **Bundle visualizer** wired (`dist/stats.html`) for ongoing monitoring.

### Findings

**[STRATEGIC] P1 — Main-thread work 7.8s / LCP 5.5s on homepage.**
Bytes are already small (590 KiB). The remaining cost is JS execution during hydration. Worth profiling `home.tsx` + its eager sections (PersonalizedSection, etc.) to defer below-the-fold work. ~47 KiB unused JS is also flagged. Impact: this is the gap between 59 and 80+.

**[SAFE] P3 — `product-details.tsx` fetches the full product catalog for "related products".**
Lines 85–92: `useQuery(["products"], fetchProducts)` pulls ALL products just to filter 4 same-category items client-side. On a product page this is wasteful. A dedicated `similar`/category endpoint already exists (`RecommendationsSection` uses `fetchSimilarProducts`), so the `relatedProducts` block appears to be redundant legacy code. Low risk to remove or replace with a scoped query.

**[SAFE] Pre-existing bug spotted (out of scope but flag it):** `product-details.tsx:161` calls `setViewerCount(...)` but there is no `viewerCount`/`setViewerCount` state declared in the component. This is a likely runtime ReferenceError / dead-code remnant. Recommend verifying — it may be silently caught or may break the viewer-count interval.

---

## 2. Images

### Setup (good)
`client/src/lib/cloudinary.ts` provides correctly-sized, WebP/AVIF, auto-quality transforms:
- `cardImage()` — 400×400, `auto` quality, pad+auto-bg (listing cards)
- `thumbImage()` — 120×120, `auto:eco` (gallery thumbs)
- `detailImage()` — 800×800, `auto:good` (detail main)
- `lightboxImage()` — original size, `auto:best` (fullscreen)
- All four first prefer a local WebP variant (`preferLocalWebp` / `preferLocalProductCardWebp`), then fall back to Cloudinary transforms. Non-Cloudinary URLs pass through. Double-transform guard present (`/upload/f_` check).

### Applied in
`product-card.tsx`, `product-image-gallery.tsx`, `frequently-bought-together.tsx`, `search-autocomplete.tsx`, `search-dialog.tsx`, `home.tsx`. Coverage of the high-traffic surfaces is solid.

### Findings

**[SAFE] P3 — `product-details.tsx` main detail image is NOT routed through `detailImage()`.**
The page imports `ProductImageGallery` (which does optimize internally), but the raw `product.image`/`product.thumbnail` values passed to `MetaTags`/`ProductSchema` (lines 326, 332) and any direct `<img>` are unoptimized originals. Gallery is fine; OG/schema images are intentionally full-size (acceptable). Net: images are largely handled — no oversized-image bomb found on the product page itself.

**Verdict:** Image pipeline is in good shape. No high-impact image findings.

---

## 3. 3D / Media — **the biggest finding**

**[STRATEGIC] P0 — GLB model files are massive and uncompressed (~135 MB total).**

```
client/public/models/driftwood/dw-01..dw-11/model.glb   12–13 MB EACH
client/public/models/ai-natural-matte-driftwood.glb     7.5 MB
client/public/test_wood.glb                              13 MB
client/public/test_wood_shaded.glb                       5.2 MB
client/public/models/driftwood total                     135 MB
```

- No Draco or meshopt compression is applied (`grep` for `draco`/`meshopt`/`KHR_draco` in the viewer = zero hits). These are raw GLBs.
- Each driftwood product page downloads a **12–13 MB** model over the wire. On Iraqi mobile connections this is many seconds of transfer plus GPU decode.
- The viewer sets `loading="eager"` and `reveal="auto"` (`product-3d-viewer.tsx:274-275`) — the model starts downloading the instant the component mounts, and on product pages the 3D viewer is rendered **first / above the gallery** (`product-details.tsx:394-402`). So the 13 MB is on the critical path of the product page.
- A cache-buster query (`?v=20260610`, line 240-242) is appended to the GLB URL, which can defeat CDN/browser caching on repeat views if the version string changes.

**Recommended (strategic):**
1. Compress GLBs with Draco (geometry) + KTX2/Basis (textures) — `gltf-transform optimize` typically cuts 12 MB → 1–3 MB (70–90%). `@google/model-viewer` supports Draco/meshopt/KTX2 decoders out of the box.
2. Consider `loading="lazy"` or intersection-based mount so the model only downloads when the viewer scrolls into view (or behind a "View in 3D" tap), instead of eager on mount.
3. Drop the two `test_wood*.glb` (18 MB) from `client/public` if they're dev artifacts — they ship to the static bundle (`.vercel/output/static` confirms they deploy).

### What's already good
- The `@google/model-viewer` library (~280 KB) load is well-engineered: singleton promise, kicked off at module import (`product-3d-viewer.tsx:80-82`) so the chunk is in-flight before the component mounts — eliminates the library spinner. Recent commits confirm this was a deliberate fix.
- Self-contained `ViewerErrorBoundary` + poster-image fallback if the model fails. Good resilience.
- The library itself is code-split (dynamic `import("@google/model-viewer")`), so non-3D pages never pay for it.

The library loading is solved; the **model payload** is the unsolved problem.

---

## 4. Server Performance

### Findings

**[STRATEGIC] P2 — VetRAG embeddings regenerate on every serverless cold start.**
`server/services/vet-rag.ts`: `embeddingsCache` is an in-memory array (line 16). `_doInitialize()` (line 31) re-embeds all `VET_KNOWLEDGE_CHUNKS` via Gemini `text-embedding-004` in batches of 3 with 500ms delays between batches. In serverless (Vercel), every cold start that hits the diagnosis path pays this cost — multiple Gemini round-trips + ~500ms×(chunks/3) of artificial delay. This is the known gotcha (CLAUDE.md: "Embeddings reset per cold start — keyword search is the reliable path").
- Mitigation already present: keyword-search fallback when embeddings aren't ready (line 99+ comment), and `initialize()` is lazy + idempotent. So correctness is fine; it's a latency/cost issue on cold paths.
- **Strategic fix:** precompute the static knowledge embeddings at build time and ship them as a JSON constant (the knowledge is static — comment even says "no DB needed"). Then cold start = load JSON, zero Gemini calls.

**[SAFE] No N+1 query patterns found in hot paths.**
The many `for` loops in `server/routes/accounting.ts` (lines 286–1094) iterate over **already-fetched** row sets in memory (building maps, aggregating orders/items) — not per-iteration DB queries. This is the correct pattern. Accounting endpoints are admin-only and not on the customer hot path anyway.

**[SAFE] Root document server response is 30 ms** (lighthouse) — Express/Drizzle/Neon serving is not a bottleneck for page load.

### Already good
- BigInt/Decimal sanitization, `req.body ?? {}` null-checks, absolute OG URLs, top-selling `gt(stock,0)` filters, cart-suggestion fallback to trending — all documented gotchas already handled (per CLAUDE.md and confirmed in code structure).

---

## Ranked Summary

| # | Severity | Area | Finding |
|---|----------|------|---------|
| 1 | **STRATEGIC P0** | 3D/Media | 12–13 MB uncompressed GLBs (135 MB total), loaded eagerly above the fold on product pages. No Draco/meshopt/KTX2. |
| 2 | **STRATEGIC P1** | Frontend | Homepage main-thread work 7.8 s / LCP 5.5 s — hydration-bound, not byte-bound. ~47 KiB unused JS. |
| 3 | **STRATEGIC P2** | Server | VetRAG re-embeds static knowledge via Gemini on every cold start. Precompute at build. |
| 4 | SAFE P3 | Frontend | `product-details.tsx` fetches entire catalog for 4 "related products" (redundant with RecommendationsSection). |
| 5 | SAFE | Media | 18 MB `test_wood*.glb` dev artifacts ship to production static bundle. |
| 6 | SAFE | Bug | `product-details.tsx:161` calls undefined `setViewerCount` — likely dead/broken code. |

**No action needed:** code-splitting, lazy routes, compression, React Query config, Cloudinary image pipeline, model-viewer library loading, BigInt/null-check gotchas, accounting loops (not N+1).
