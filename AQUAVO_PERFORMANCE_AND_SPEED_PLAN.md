# AQUAVO — Performance & Speed Fix Plan

Read-only analysis. Working dir: `C:\Users\jaafa\Desktop\upload\FishWebClean`
Date: 2026-06-16 | Author: Speed & Performance Lead
Builds on `reports/04_performance_and_media.md` — this document is the **concrete, file-level execution plan** (exact files, lines, commands, code, expected impact). It does not re-litigate the findings; it tells you exactly what to change.

---

## 0. Real numbers (the baseline we are moving)

From the repo's Lighthouse JSONs (mobile):

| File | Perf | LCP | FCP | TBT | Speed Index | TTI | Main-thread | Bootup |
|------|------|-----|-----|-----|-------------|-----|-------------|--------|
| `lighthouse-report.json` (dev, unminified) | 26 | 13.8s | 7.4s | 2,850ms | 12.1s | 17.1s | 12.4s | 4.1s |
| `lh-prod.json` (early prod) | 39 | 6.0s | 3.2s | 1,430ms | 7.5s | 7.9s | 17.9s | 2.0s |
| `lh-final.json` (**representative**) | **59** | **5.5s** | 3.2s | **380ms** | 6.0s | 6.7s | **7.8s** | 0.9s |

Two facts that drive the whole plan:

1. **All three runs are the HOMEPAGE** (`localhost:5000/`). The 12–13 MB GLB models are **NOT** in any of these numbers. The product detail page (PDP) — the actual conversion page — has **never been measured** and is far worse than 59. Its critical path carries a 13 MB model + 277 KB model-viewer chunk.
2. On the homepage, the gap from 59 → 80+ is **not bytes** (only 590 KiB total). It is **main-thread work 7.8s** (hydration/execution) and **LCP 5.5s** (largest image paints ~2.3s after FCP).

So there are two independent battles: **(A) the unmeasured PDP disaster** (models) and **(B) the measured homepage hydration cost**.

### Biggest homepage transfers (from `lh-final.json` network-requests)
```
112 KB  webp   yee_c1_1082_2a_1.webp            (product image, oversized)
 81 KB  webp   iwagumi_aquascape_1765676307763  (LCP hero — preloaded)
 52 KB  js     vendor-react
 38 KB  js     index entry
 33 KB  css    index
 33 KB  js     vendor-ui
 33 KB  woff2  Cairo                            (self-host candidate)
 30 KB  woff2  Cairo
```
LCP element = `main#main-content ... img.absolute` (the hero image). FCP→LCP gap is decode + hydration, not download (hero is already preloaded).

---

## 1. GLB COMPRESSION PLAN (P0 — the single biggest win)

### Current state (measured on disk)
```
client/public/models/driftwood/dw-01/model.glb   12.9 MB
client/public/models/driftwood/dw-02/model.glb   12.8 MB
client/public/models/driftwood/dw-03/model.glb   12.1 MB
client/public/models/driftwood/dw-04/model.glb   12.9 MB
client/public/models/driftwood/dw-05/model.glb   12.1 MB
client/public/models/driftwood/dw-06/model.glb   12.8 MB
client/public/models/driftwood/dw-07/model.glb   13.6 MB
client/public/models/driftwood/dw-08/model.glb   12.9 MB
client/public/models/driftwood/dw-09/model.glb   12.1 MB
client/public/models/driftwood/dw-10/model.glb   12.8 MB
client/public/models/driftwood/dw-11/model.glb   13.6 MB
client/public/models/ai-natural-matte-driftwood.glb  7.5 MB
client/public/test_wood.glb                       12.9 MB   ← DEV ARTIFACT
client/public/test_wood_shaded.glb                 5.4 MB   ← DEV ARTIFACT
```
Total driftwood models ≈ **143 MB**. No Draco, no meshopt, no KTX2 (zero hits for those decoders in the viewer). Each PDP pulls 12–13 MB raw over the wire on the critical path.

### Step 1.1 — [SAFE] Delete the dev artifacts (instant 18 MB off the deploy)
`test_wood.glb` (12.9 MB) + `test_wood_shaded.glb` (5.4 MB) are not referenced anywhere in `client/src` (grep for `test_wood` = 0 hits in source). They ship to prod (confirmed in `.vercel/output/static/` and `dist/public/`).
```bash
git rm client/public/test_wood.glb client/public/test_wood_shaded.glb
```
**Impact:** −18 MB deploy size, zero risk. No runtime change (nothing imports them).

### Step 1.2 — [STRATEGIC] Compress every model with gltf-transform
Install the toolchain (one-time, dev dependency / global):
```bash
npm i -g @gltf-transform/cli
# KTX2 texture compression needs the KTX-Software `toktx` binary on PATH
# (https://github.com/KhronosGroup/KTX-Software/releases)
```

Recommended per-file pipeline (Draco geometry + KTX2/Basis textures + prune + dedup):
```bash
# Run from repo root. Writes compressed files next to originals via a temp dir.
for f in client/public/models/driftwood/dw-*/model.glb \
         client/public/models/ai-natural-matte-driftwood.glb; do
  gltf-transform optimize "$f" "$f.opt.glb" \
    --compress draco \
    --texture-compress ktx2 \
    --texture-size 1024 \
    --simplify true --simplify-error 0.001
  mv "$f.opt.glb" "$f"
done
```
What each flag does and why:
- `--compress draco` — quantizes + entropy-codes geometry. Typically 80–95% off mesh data. model-viewer auto-loads the Draco decoder.
- `--texture-compress ktx2` — GPU-native Basis Universal. Cuts texture bytes AND GPU memory/upload time (raw PNG/JPEG in GLB is the usual bulk of a 13 MB driftwood file). model-viewer supports KTX2.
- `--texture-size 1024` — driftwood at 381×278 CSS px (LCP boundingRect) does not need 2K/4K textures. Downscaling is the largest single byte saver here.
- `--simplify` — decimates over-dense meshes (photogrammetry/AI-generated driftwood is usually wildly over-tessellated). 0.001 error is visually lossless at this display size.

**Expected:** 12–13 MB → **1.5–3 MB** per model (75–88% reduction). Verify with `gltf-transform inspect <file>` before/after.

> If `toktx` is unavailable in the build environment, fall back to `--texture-compress webp` (still a big win, broader tooling support) and keep Draco. Even Draco-only + texture-resize alone typically lands ~3–5 MB.

### Step 1.3 — [SAFE] Remove the cache-busting query param
`client/src/components/products/product-3d-viewer.tsx:240-242`:
```ts
const busterSrc = src ? `${src}${src.includes("?") ? "&" : "?"}v=20260610` : src;
```
This defeats CDN/browser caching whenever the date string changes, and forces re-download of a (soon) multi-MB asset on every version bump. The hashed filename pattern is the correct cache-bust mechanism. **Fix:** use `src` directly (rename models with a content hash if you need busting), and add immutable caching (Step 1.4).

### Step 1.4 — [SAFE] Add immutable cache headers for models in `vercel.json`
Models currently match only the catch-all `/(.*)` rule (no `Cache-Control` → default short cache). Add **before** the `/(.*)` block in the `headers` array of `vercel.json`:
```jsonc
{
  "source": "/models/(.*)",
  "headers": [
    { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
  ]
},
```
**Impact:** repeat PDP views + navigation between driftwood variants serve models from cache (0 bytes) instead of re-fetching. Combined with Step 1.3 (drop the buster), this makes the 3D experience near-instant on second view.

---

## 2. LAZY-3D-VIEWER PLAN (P0 — get the model off the initial PDP critical path)

### Two problems in `product-3d-viewer.tsx` + `product-details.tsx`

**Problem A — `Product3DViewer` is statically imported into the PDP.**
`product-details.tsx:22`:
```ts
import { Product3DViewer } from "@/components/products/product-3d-viewer";
```
Because this module is statically imported, the module-level side effect (lines 80–82) runs as soon as the PDP bundle parses:
```ts
if (typeof window !== "undefined") {
  loadModelViewer().catch(() => {});   // ← downloads the 277 KB chunk
}
```
So **every** PDP — even products with NO 3D model — eagerly downloads the 277 KB model-viewer chunk on mount. That is on the PDP hydration critical path for the 95%+ of products that aren't driftwood.

**Problem B — the model itself loads eagerly, above the gallery.**
`product-3d-viewer.tsx:274-275` sets `loading="eager"` + `reveal="auto"`, and `product-details.tsx:379-387` renders the viewer FIRST (above the photo gallery). So the (currently 13 MB, post-fix 2–3 MB) GLB starts downloading the instant the PDP mounts, ahead of the gallery and Add-to-Cart.

### Step 2.1 — [STRATEGIC] Lazy-import the viewer so non-3D PDPs never touch model-viewer
In `product-details.tsx`, replace the static import (line 22) with a lazy one, and only mount it when `product3DMeta` exists (it's already gated by `product3DMeta ?` at line 379):
```ts
// remove line 22 static import
import { lazy, Suspense } from "react"; // (already importing React hooks)
const Product3DViewer = lazy(() =>
  import("@/components/products/product-3d-viewer").then(m => ({ default: m.Product3DViewer }))
);
```
Wrap the usage (line 382) in `<Suspense fallback={<div className="min-h-[420px]" />}>`. Because the `loadModelViewer()` side effect lives **inside** that module, lazy-importing it means the 277 KB chunk only starts downloading for products that actually have a 3D model. **Impact:** removes 277 KB + its parse/execute from the hydration path of every non-driftwood PDP.

### Step 2.2 — [STRATEGIC] Intersection-gate the model download (and/or "View in 3D" tap)
Even on driftwood PDPs, defer the GLB until the viewer is near the viewport. Two options:

- **Cheap (attribute only):** change `product-3d-viewer.tsx:274` from `loading="eager"` to `loading="lazy"`. model-viewer then waits until near-viewport to fetch the GLB. One-line, SAFE.
- **Stronger (recommended):** mount `ModelViewerInner` only after an `IntersectionObserver` fires, OR behind a poster + "شوفها 3D" button. The poster image already exists (`product3DMeta.poster`) and is shown as the fallback — promote it to the default state and swap to the live viewer on tap/scroll. This keeps the GLB completely off first paint while preserving the "3D first" visual (poster looks identical until interaction).

### Step 2.3 — [SAFE] Reconsider rendering 3D above the gallery
`product-details.tsx:379-398` puts the viewer first. For LCP/TBT, the photographic gallery (already Cloudinary-optimized, small) is the better above-the-fold LCP candidate. If product/UX allows, render the optimized gallery first and the 3D viewer just below (still visible, but not the LCP/critical element). Coordinate with UX — marked SAFE technically, STRATEGIC for UX.

**Combined Section 1+2 impact:** PDP initial transfer drops from ~13 MB + 277 KB to **~40 KB** (gallery images) on first paint; the model (2–3 MB compressed) loads lazily/on-demand. This is the difference between an unusable PDP on Iraqi mobile and a fast one.

---

## 3. HOMEPAGE HYDRATION / MAIN-THREAD (P1 — closes 59 → ~80)

The homepage is byte-light (590 KiB) but spends **7.8s** on the main thread. Attack execution, not bytes.

### Step 3.1 — [SAFE] Right-size the oversized homepage product image
`yee_c1_1082_2a_1.webp` ships at **112 KB** but renders in a small card. Route every homepage product image through `cardImage()` (400×400) from `client/src/lib/cloudinary.ts`. Report 04 says `home.tsx` already uses the helper — audit for any direct `<img src={product.image}>` that bypasses it (the 112 KB file suggests at least one does). **Impact:** −80 KB+ on the heaviest non-LCP image; faster decode = less main-thread.

### Step 3.2 — [STRATEGIC] Defer below-the-fold homepage sections
The 7.8s main-thread is hydration of eager homepage sections (`PersonalizedSection`, trending, etc.). Wrap below-the-fold sections in an IntersectionObserver-gated lazy mount (or `React.lazy` + Suspense triggered on scroll). Only the hero + first product row should hydrate on load. **Impact:** this is the lever that moves main-thread from 7.8s toward ~3–4s and TBT/SI down with it.

### Step 3.3 — [SAFE] Strip the ~47 KiB unused JS flagged by Lighthouse
Run `dist/stats.html` (visualizer is already wired). Most likely culprits: an icon set imported as a namespace, or a chart/animation vendor pulled onto the homepage. Confirm `vendor-charts`/`vendor-animation` are NOT in the homepage entry graph (they shouldn't be, per the manual-chunk config — verify). Tree-shake named imports. **Impact:** −47 KiB + less parse/execute.

### Step 3.4 — [SAFE] Self-host the Arabic fonts (Cairo/Changa/Outfit)
`client/index.html:56-66` loads fonts from `fonts.googleapis.com` + `fonts.gstatic.com`. Each Cairo woff2 is 30–33 KB on a cross-origin connection (extra DNS+TLS even with preconnect). Self-hosting from your own origin (with `font-display: swap` and a `preload` for the one above-the-fold weight) removes a third-party round-trip on the render path. The fonts are already deferred via `media="print"` swap — good — but cross-origin still costs handshake time. **Impact:** removes a cross-origin dependency from LCP path; modest but safe.

### Step 3.5 — [SAFE] Confirm third-party scripts stay deferred
`App.tsx:206` defers `third-party-analytics` and `:175` defers Sentry — good. Verify GTM/TikTok/Meta/PostHog (all in the CSP) are loaded via that deferred path and not injected eagerly. `lh-final` shows third-party main-thread = 0ms, so this is currently healthy — keep it that way; do not regress.

---

## 4. SERVER COLD START / VetRAG (P2)

### Step 4.1 — [STRATEGIC] Precompute VetRAG embeddings at build time
`server/services/vet-rag.ts`: `embeddingsCache` is an in-memory array (line ~16); `_doInitialize()` (line ~31) re-embeds all `VET_KNOWLEDGE_CHUNKS` via Gemini `text-embedding-004` in batches of 3 with **500ms inter-batch delays** on every cold start that hits the diagnosis path.

The knowledge is **static**. Precompute once and ship as JSON:
1. Add a build script (e.g. `scripts/build-vet-embeddings.ts`) that embeds `VET_KNOWLEDGE_CHUNKS` and writes `server/services/vet-embeddings.json` (array of `{chunkId, vector}`).
2. Run it in CI / `prebuild` (NOT at request time).
3. In `vet-rag.ts`, `_doInitialize()` becomes: `import` the JSON and assign to `embeddingsCache`. Zero Gemini calls, zero artificial delay on cold start.

Keep the existing keyword-search fallback (it's the documented reliable path). **Impact:** removes multiple Gemini round-trips + `500ms × ceil(chunks/3)` of artificial latency from cold diagnosis requests. Correctness unchanged.

### Step 4.2 — [SAFE / OPS] Note region vs cold-start tradeoff
`vercel.json` pins `regions: ["fra1"]` (Frankfurt) — sensible latency for Iraq. No change recommended; just be aware cold starts hit the VetRAG cost in 4.1. Memory (1024 MB on `api/index.ts`) is fine.

---

## 5. [SAFE] Cleanup items confirmed from code (do alongside)

- **`product-details.tsx` fetches the entire catalog for 4 "related products"** (`useQuery(["products"])` at line ~85, redundant with `RecommendationsSection`'s `fetchSimilarProducts`). Remove the redundant block or scope it to a category-limited endpoint. Cuts an unnecessary full-catalog payload on the PDP. (Report 04 §52.)
- **`product-details.tsx:161` references `setViewerCount`** with no matching state declaration — likely dead/broken code (potential ReferenceError on the viewer-count interval). Verify and remove. (Report 04 §55.)

---

## 6. Verification protocol (do NOT trust on-disk; measure the PDP)

1. After Section 1–2: run Lighthouse mobile against an actual **driftwood PDP URL** (not the homepage). This is the page that has never been measured and where the 13 MB lived.
2. `gltf-transform inspect <model>` before/after to confirm per-file MB reduction.
3. Re-run homepage Lighthouse after Section 3; target Perf 80+, main-thread < 4s.
4. Check `dist/stats.html` after build to confirm model-viewer chunk is NOT in any non-3D entry and vendor-charts/animation are off the homepage graph.

---

## TOP 10 SPEED FIXES (ranked by impact)

| # | Fix | File(s) | Class | Expected impact |
|---|-----|---------|-------|-----------------|
| 1 | Compress all GLBs (Draco + KTX2 + 1024px textures + simplify) via `gltf-transform optimize` | `client/public/models/driftwood/*/model.glb`, `ai-natural-matte-driftwood.glb` | STRATEGIC | 12–13 MB → 1.5–3 MB each (75–88%); makes PDP usable on Iraqi mobile |
| 2 | Lazy-mount the 3D model: `loading="lazy"` + intersection/poster-tap gate so GLB is off first paint | `product-3d-viewer.tsx:274`, `product-details.tsx:379` | STRATEGIC | PDP first-paint transfer 13 MB → ~40 KB; huge LCP/TBT win on PDP |
| 3 | Lazy-import `Product3DViewer` so non-3D PDPs never download the 277 KB model-viewer chunk | `product-details.tsx:22` | STRATEGIC | −277 KB + parse off every non-driftwood PDP hydration path |
| 4 | Delete `test_wood.glb` + `test_wood_shaded.glb` dev artifacts | `client/public/test_wood*.glb` | SAFE | −18 MB deploy, zero risk |
| 5 | Defer below-the-fold homepage sections (intersection-gated hydration) | `home.tsx` / its section components | STRATEGIC | main-thread 7.8s → ~3–4s; biggest homepage Perf lever (59→80) |
| 6 | Add `/models/(.*)` immutable cache header + drop `?v=` cache-buster | `vercel.json` headers, `product-3d-viewer.tsx:240` | SAFE | repeat/variant PDP views serve models from cache (0 bytes) |
| 7 | Precompute VetRAG embeddings at build, ship as JSON; no Gemini on cold start | `server/services/vet-rag.ts` + new build script | STRATEGIC | removes Gemini round-trips + 500ms×N delay from cold diagnosis |
| 8 | Right-size oversized homepage product image(s) through `cardImage()` (400×400) | `home.tsx`, `cloudinary.ts` (helpers exist) | SAFE | −80 KB+ on heaviest non-LCP image; faster decode |
| 9 | Strip ~47 KiB unused homepage JS (audit `dist/stats.html`, fix namespace imports) | homepage entry graph | SAFE | −47 KiB + less parse/execute |
| 10 | Self-host Arabic fonts (Cairo/Changa/Outfit) with one preloaded weight | `client/index.html:56-66` | SAFE | removes cross-origin handshake from LCP path |
