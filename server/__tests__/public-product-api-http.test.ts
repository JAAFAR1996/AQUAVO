/**
 * HTTP-LEVEL regression test for the public product API.
 *
 * `public-product-boundary.test.ts` proves the DTO is correct. This proves the ROUTES actually call it,
 * which is a different claim and the one that broke: the DTO did not exist, the routes did, and every
 * existing test in `products-api.test.ts` passed anyway because it asserted on locally-declared mock
 * literals and never imported the real router.
 *
 * So this file:
 *   - imports the REAL `createProductRouter()`
 *   - mounts it in a real Express app and drives it over a real HTTP socket via supertest
 *
 * NOT via global `fetch`: `vitest.setup.ts:37` replaces `globalThis.fetch` in `beforeEach` with a stub
 * whose default branch returns `jsonResponse({})`. Any test in this repo that believes it is making an
 * HTTP call is quietly receiving an empty object instead — which is worth knowing, because it means a
 * fetch-based assertion here would have "passed" while proving nothing at all. supertest drives
 * `node:http` directly and is unaffected.
 *   - feeds it real production rows captured from https://www.aquavoiq.com/api/products on 2026-08-14
 *     (fixtures/production-product-rows.json). The STRUCTURE is real — including the cost keys hidden
 *     inside the variants jsonb — but every cost VALUE is replaced with a synthetic sentinel (999111,
 *     999114, …). This repo is PUBLIC on GitHub, so committing the real numbers would have leaked the
 *     exact data this fix exists to protect. Sentinels serve the test equally well: what matters is that
 *     a cost-shaped field is present to be stripped, not what it contains.
 *   - asserts on the JSON that comes back over the wire, after a full serialize/parse round trip
 *
 * The storage layer is stubbed rather than hitting Neon, because the thing under test is the boundary
 * between storage and the wire — and stubbing it lets the fixture BE the leaked production payload, so
 * a regression fails against the exact data that was exposed.
 */
import { describe, it, expect, beforeAll, vi } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import { findForbiddenFieldPaths } from "../../shared/public-product.js";
import productionRows from "./fixtures/production-product-rows.json" with { type: "json" };

/** REAL rows captured from production on 2026-08-14, cost values intact. */
const PRODUCTION_ROWS = productionRows as unknown as Record<string, any>[];

// vi.mock factories are hoisted above every import, so the fixture is loaded through vi.hoisted
// rather than closed over — otherwise the factory would reference an uninitialised binding.
const { rows } = vi.hoisted(() => ({
  rows: require("./fixtures/production-product-rows.json") as Record<string, any>[],
}));

// Stub storage BEFORE importing the router, which pulls in the singleton at module load.
vi.mock("../storage/index.js", () => {
  return {
    storage: {
      getProducts: vi.fn(async () => rows),
      getProduct: vi.fn(async (id: string) => rows.find((r: any) => r.id === id)),
      getProductBySlug: vi.fn(async (slug: string) => rows.find((r: any) => r.slug === slug)),
      getProductsByIds: vi.fn(async (ids: string[]) => rows.filter((r: any) => ids.includes(r.id))),
      getTopSellingProducts: vi.fn(async () => rows),
      getTrendingProducts: vi.fn(async () => rows),
      getProductAttributes: vi.fn(async () => ({ categories: [], brands: [], minPrice: 0, maxPrice: 1 })),
      getDiscounts: vi.fn(async () => []),
      getSimilarProducts: vi.fn(async () => rows),
      getFrequentlyBoughtTogether: vi.fn(async () => rows),
    },
  };
});
vi.mock("../services/recommendation-engine.js", () => ({ recommendationEngine: { getPersonalizedRecommendations: vi.fn(async () => ({ productIds: [], method: "none" })) } }));
vi.mock("../services/predictive-analytics.js", () => ({ predictiveAnalytics: { getPredictions: vi.fn(async () => []) } }));
vi.mock("../services/embedding-generator.js", () => ({ embeddingGenerator: { generateQueryEmbedding: vi.fn(async () => null), semanticSearch: vi.fn(async () => []) } }));
vi.mock("../services/analytics-tracker.js", () => ({ analyticsTracker: { track: vi.fn(), trackSearch: vi.fn(), trackProductView: vi.fn(async () => {}) } }));
vi.mock("../middleware/auth.js", () => ({
  // Anonymous visitor: no session at all. This is the threat model.
  getSession: () => undefined,
  requireAuth: (_req: any, res: any) => res.status(401).json({ message: "unauthorized" }),
  requireAdmin: (_req: any, res: any) => res.status(403).json({ message: "forbidden" }),
}));

const { createProductRouter } = await import("../routes/products.js");

let app: Express;

beforeAll(() => {
  app = express();
  app.use("/api/products", createProductRouter());
});

/** GET a path with NO credentials of any kind. Returns both the parsed body and the raw wire bytes. */
async function getPublic(path: string): Promise<{ status: number; body: any; raw: string }> {
  const res = await request(app).get(path);
  return { status: res.status, body: res.body, raw: res.text ?? "" };
}

/** Every public GET that returns product data, exercised unauthenticated. */
const PUBLIC_PRODUCT_PATHS = [
  "/api/products",
  "/api/products?limit=50",
  "/api/products?search=driftwood",
  "/api/products?category=%D8%AA%D8%B1%D8%A8%D8%A9%20%D9%88%D8%AF%D9%8A%D9%83%D9%88%D8%B1",
  "/api/products/top-selling",
  "/api/products/info/trending",
  "/api/products/personalized",
  "/api/products/cart-suggestions?ids=aquavo-driftwood-dw-11",
  "/api/products/smart-search?q=خشب",
  `/api/products/${PRODUCTION_ROWS[0].slug}`,
  `/api/products/${PRODUCTION_ROWS[1].slug}`,
  `/api/products/${PRODUCTION_ROWS[0].slug}/variants`,
  `/api/products/${PRODUCTION_ROWS[0].slug}/similar`,
  `/api/products/${PRODUCTION_ROWS[0].slug}/frequently-bought-together`,
];

describe("public product API over real HTTP, unauthenticated", () => {
  it("the fixture really is the leaked payload — otherwise this whole file proves nothing", () => {
    // Guard against a future edit sanitizing the fixture and making every assertion below vacuous.
    const paths = findForbiddenFieldPaths(PRODUCTION_ROWS);
    expect(paths.length).toBeGreaterThan(0);
    expect(PRODUCTION_ROWS.some((r) => r.costPrice)).toBe(true);
    expect(
      PRODUCTION_ROWS.some((r) => Array.isArray(r.variants) && r.variants.some((v: any) => "costPrice" in v)),
    ).toBe(true);
  });

  it.each(PUBLIC_PRODUCT_PATHS)("exposes no internal financial field: GET %s", async (path) => {
    const { status, body } = await getPublic(path);
    expect(status, `${path} returned ${status}`).toBeLessThan(500);
    const leaks = findForbiddenFieldPaths(body);
    expect(leaks, `${path} leaked: ${leaks.join(", ")}`).toEqual([]);
  });

  it.each(PUBLIC_PRODUCT_PATHS)("contains no leaked cost VALUE in its raw bytes: GET %s", async (path) => {
    // Field-name matching can be fooled by a rename. This checks the actual numbers that were exposed,
    // as they appear on the wire — a value under an alias still fails.
    const { raw } = await getPublic(path);
    const secretValues = new Set<string>();
    for (const row of PRODUCTION_ROWS) {
      for (const key of ["costPrice", "packagingCost", "insertCost"]) {
        const v = row[key];
        // Only distinctive values: "0" appears everywhere legitimately, and a cost that happens to equal
        // the retail price would produce a false positive.
        if (v && String(v).length >= 3 && String(v) !== String(row.price)) secretValues.add(String(v));
      }
      for (const variant of (row.variants ?? []) as any[]) {
        const v = variant?.costPrice;
        if (v && String(v).length >= 3 && String(v) !== String(variant.price)) secretValues.add(String(v));
      }
    }
    expect(secretValues.size, "no distinctive cost values in the fixture to search for").toBeGreaterThan(0);
    const found = [...secretValues].filter((v) => raw.includes(v));
    expect(found, `${path} contains cost value(s) ${found.join(", ")} on the wire`).toEqual([]);
    // The operator identity in costResolutionBy must not survive either.
    expect(raw).not.toContain("owner_confirmation");   // the operator identity in costResolutionBy
  });

  it("still returns the storefront payload the site needs", async () => {
    const { body } = await getPublic("/api/products");
    expect(Array.isArray(body.products)).toBe(true);
    expect(body.products.length).toBe(PRODUCTION_ROWS.length);
    const first = body.products[0];
    for (const key of ["id", "slug", "name", "brand", "category", "price", "currency", "images", "thumbnail", "stock"]) {
      expect(first, `storefront lost required field "${key}"`).toHaveProperty(key);
    }
    expect(Number(first.price)).toBeGreaterThan(0);
    expect(Array.isArray(first.images)).toBe(true);
  });

  it("preserves variants for the storefront while stripping their internal keys", async () => {
    const withVariants = PRODUCTION_ROWS.find((r) => Array.isArray(r.variants) && r.variants.length > 0)!;
    const { body } = await getPublic(`/api/products/${withVariants.slug}`);
    expect(Array.isArray(body.variants)).toBe(true);
    expect(body.variants.length).toBe(withVariants.variants.length);
    for (const v of body.variants) {
      expect(v).toHaveProperty("id");
      expect(v).toHaveProperty("label");
      expect(v).toHaveProperty("price");
      expect(v).toHaveProperty("stock");
      for (const bad of ["costPrice", "costStatus", "costBasis", "costEvidence"]) {
        expect(v, `variant leaked ${bad}`).not.toHaveProperty(bad);
      }
    }
  });

  it("the product DETAIL route still resolves and still returns the product", async () => {
    // Note: ids in this catalogue are slugs, not UUIDs, and the route only attempts getProduct() when the
    // parameter matches a UUID — so slug resolution is the path the storefront actually uses.
    const row = PRODUCTION_ROWS[0];
    const bySlug = await getPublic(`/api/products/${row.slug}`);
    expect(bySlug.status).toBe(200);
    expect(bySlug.body.id).toBe(row.id);
    expect(bySlug.body.name).toBe(row.name);
    expect(Number(bySlug.body.price)).toBeGreaterThan(0);
    const missing = await getPublic("/api/products/no-such-product-slug");
    expect(missing.status).toBe(404);
  });

  it("does not serve a leaked payload out of the 60s response cache", async () => {
    // The cache stores the RESPONSE object. If sanitization ran after caching, the first request would
    // populate the cache with raw rows and every subsequent hit would serve them — so check a repeat
    // request explicitly rather than assuming one clean response means the cache is clean.
    const first = await getPublic("/api/products?limit=50");
    const second = await getPublic("/api/products?limit=50");
    expect(findForbiddenFieldPaths(first.body)).toEqual([]);
    expect(findForbiddenFieldPaths(second.body)).toEqual([]);
    expect(second.body.products.length).toBe(first.body.products.length);
  });
});
