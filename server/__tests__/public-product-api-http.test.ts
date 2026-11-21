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
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import { findForbiddenFieldPaths } from "../../shared/public-product.js";
import productionRows from "./fixtures/production-product-rows.json" with { type: "json" };
import { analyticsTracker } from "../services/analytics-tracker.js";
import { storage } from "../storage/index.js";
import { recommendationEngine } from "../services/recommendation-engine.js";

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
      getProductsPage: vi.fn(async () => ({ products: rows, total: rows.length, hasMore: false })),
      getProduct: vi.fn(async (id: string) => rows.find((r: any) => r.id === id)),
      getProductBySlug: vi.fn(async (slug: string) => rows.find((r: any) => r.slug === slug)),
      getProductsByIds: vi.fn(async (ids: string[]) => rows.filter((r: any) => ids.includes(r.id))),
      getTopSellingProducts: vi.fn(async () => rows),
      getTrendingProducts: vi.fn(async () => rows),
      getProductAttributes: vi.fn(async () => ({ categories: [], brands: [], minPrice: 0, maxPrice: 1 })),
      getDiscounts: vi.fn(async () => []),
      getSimilarProducts: vi.fn(async () => rows),
      getFrequentlyBoughtTogether: vi.fn(async () => rows),
      addFavorite: vi.fn(async (userId: string, productId: string) => ({ id: "favorite", userId, productId, createdAt: new Date() })),
    },
  };
});
vi.mock("../services/recommendation-engine.js", () => ({ recommendationEngine: {
  getPersonalizedRecommendations: vi.fn(async () => ({ productIds: [], method: "none" })),
  getFrequentlyBoughtTogetherForProducts: vi.fn(async () => []),
} }));
vi.mock("../services/predictive-analytics.js", () => ({ predictiveAnalytics: { getPredictions: vi.fn(async () => []) } }));
vi.mock("../services/embedding-generator.js", () => ({ embeddingGenerator: { generateQueryEmbedding: vi.fn(async () => null), semanticSearch: vi.fn(async () => []) } }));
vi.mock("../services/analytics-tracker.js", () => ({ analyticsTracker: { track: vi.fn(), trackSearch: vi.fn(), trackProductView: vi.fn(async () => {}), trackFavorite: vi.fn(async () => {}) } }));
vi.mock("../middleware/auth.js", () => ({
  // Anonymous visitor: no session at all. This is the threat model.
  getSession: () => undefined,
  requireAuth: (_req: any, res: any) => res.status(401).json({ message: "unauthorized" }),
  requireAdmin: (_req: any, res: any) => res.status(403).json({ message: "forbidden" }),
}));

const { createProductRouter } = await import("../routes/products.js");
const { createFavoritesRouter } = await import("../routes/favorites.js");

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use("/api/products", createProductRouter());
});

describe("favorite additions obey the public visibility boundary", () => {
  function favoritesApp() {
    const authenticated = express();
    authenticated.use(express.json());
    authenticated.use((req, _res, next) => { Object.assign(req, { session: { userId: "customer" } }); next(); });
    authenticated.use("/api/favorites", createFavoritesRouter());
    return authenticated;
  }

  it.each([
    { isStorefrontVisible: false },
    { deletedAt: new Date("2026-01-01") },
  ])("returns the same missing-product response for unavailable catalogue visibility: %j", async visibility => {
    vi.mocked(storage.addFavorite).mockClear();
    vi.mocked(analyticsTracker.trackFavorite).mockClear();
    vi.mocked(storage.getProduct).mockResolvedValueOnce({ ...PRODUCTION_ROWS[0], ...visibility });
    const response = await request(favoritesApp()).post(`/api/favorites/${PRODUCTION_ROWS[0].id}`);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Product not found" });
    expect(storage.addFavorite).not.toHaveBeenCalled();
    expect(analyticsTracker.trackFavorite).not.toHaveBeenCalled();
  });

  it("continues allowing favorites for a visible coming-soon product without changing its price", async () => {
    const upcoming = { ...PRODUCTION_ROWS[0], isStorefrontVisible: true, deletedAt: null, price: "0", stock: 0, specifications: { __availabilityStatus: "coming_soon" } };
    const before = JSON.stringify(upcoming);
    vi.mocked(storage.getProduct).mockResolvedValueOnce(upcoming);
    const response = await request(favoritesApp()).post(`/api/favorites/${upcoming.id}`);
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ userId: "customer", productId: upcoming.id });
    expect(JSON.stringify(upcoming)).toBe(before);
  });
});

describe("product view telemetry over real HTTP", () => {
  beforeEach(() => {
    vi.mocked(analyticsTracker.trackProductView).mockReset().mockResolvedValue(undefined);
  });

  it("keeps detail GETs read-only, including prefetches with a valid legacy sid", async () => {
    const product = PRODUCTION_ROWS[0];
    const path = `/api/products/${product.slug}?sid=cs_browser_tab`;
    expect((await getPublic(path)).status).toBe(200);
    expect((await getPublic(path)).status).toBe(200);
    expect(analyticsTracker.trackProductView).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { clientSessionId: "unknown" },
    { clientSessionId: "cs_unavailable" },
    { clientSessionId: ["cs_valid"] },
    { clientSessionId: "cs_" + "x".repeat(65) },
  ])("rejects invalid view payload %j without recording a view", async (body) => {
    const response = await request(app).post(`/api/products/${PRODUCTION_ROWS[0].id}/view`).send(body);
    expect(response.status).toBe(400);
    expect(analyticsTracker.trackProductView).not.toHaveBeenCalled();
  });

  it("does not record products that do not exist or are no longer public", async () => {
    const response = await request(app).post("/api/products/missing-product/view")
      .send({ clientSessionId: "cs_browser_tab" });
    expect(response.status).toBe(404);
    expect(analyticsTracker.trackProductView).not.toHaveBeenCalled();
  });

  it("waits for the analytics write before acknowledging a visible product view", async () => {
    let writeCompleted = false;
    let repliedBeforeWrite = false;
    vi.mocked(analyticsTracker.trackProductView).mockImplementationOnce(async () => {
      // Yield as a real database write does. A fire-and-forget caller would
      // serialize the response synchronously before this promise completes.
      await Promise.resolve();
      writeCompleted = true;
    });

    const observedApp = express();
    observedApp.use(express.json());
    observedApp.use((_req, res, next) => {
      const json = res.json.bind(res);
      res.json = (body: unknown) => {
        repliedBeforeWrite = !writeCompleted;
        return json(body);
      };
      next();
    });
    observedApp.use("/api/products", createProductRouter());

    const response = await request(observedApp).post(`/api/products/${PRODUCTION_ROWS[0].id}/view`)
      .send({ clientSessionId: "cs_browser_tab" });

    expect(response.status).toBe(202);
    expect(response.body).toEqual({ accepted: true });
    expect(analyticsTracker.trackProductView).toHaveBeenCalledExactlyOnceWith({
      userId: undefined,
      sessionId: "cs_browser_tab",
      productId: PRODUCTION_ROWS[0].id,
      from: "product_page",
    });
    expect(writeCompleted).toBe(true);
    expect(repliedBeforeWrite).toBe(false);
  });
});

describe("public product discounts obey the current product boundary", () => {
  it.each([
    undefined,
    { ...PRODUCTION_ROWS[0], isStorefrontVisible: false },
    { ...PRODUCTION_ROWS[0], deletedAt: new Date("2026-01-01") },
  ])("does not read or return discounts for a missing, hidden or deleted product", async product => {
    vi.mocked(storage.getDiscounts).mockClear();
    vi.mocked(storage.getProduct).mockResolvedValueOnce(product);
    const response = await request(app).get(`/api/products/${PRODUCTION_ROWS[0].id}/discounts`);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Product not found" });
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(storage.getDiscounts).not.toHaveBeenCalled();
  });

  it("preserves the discount payload and the existing visible coming-soon policy", async () => {
    const upcoming = { ...PRODUCTION_ROWS[0], isStorefrontVisible: true, deletedAt: null, price: "0", stock: 0, specifications: { __availabilityStatus: "coming_soon" } };
    const discounts = [{ id: "fixture-discount", productId: upcoming.id, type: "percentage", value: "7", isActive: false,
      startDate: null, endDate: null, createdAt: new Date("2026-01-01T00:00:00Z"), updatedAt: new Date("2026-01-01T00:00:00Z") }];
    const before = JSON.stringify({ upcoming, discounts });
    vi.mocked(storage.getProduct).mockResolvedValueOnce(upcoming);
    vi.mocked(storage.getDiscounts).mockResolvedValueOnce(discounts);
    const response = await request(app).get(`/api/products/${upcoming.id}/discounts`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(JSON.parse(JSON.stringify(discounts)));
    expect(JSON.stringify({ upcoming, discounts })).toBe(before);
  });
});

/** GET a path with NO credentials of any kind. Returns both the parsed body and the raw wire bytes. */
async function getPublic(path: string): Promise<{ status: number; body: any; raw: string }> {
  const res = await request(app).get(path);
  return { status: res.status, body: res.body, raw: res.text ?? "" };
}

describe("bounded homepage product selection", () => {
  const homePath = "/api/products?sortBy=views&sortOrder=desc&homePicks=true&paginated=true&limit=4";
  const product = (id: string, overrides: Record<string, unknown> = {}) => ({
    ...PRODUCTION_ROWS[0], id, slug: id, name: id, price: "100", stock: 2,
    hasVariants: false, variants: null, isStorefrontVisible: true, deletedAt: null,
    ...overrides,
  });

  beforeEach(() => { vi.mocked(storage.getProducts).mockClear(); });

  it("returns only four cards and finishes after twelve candidates in the common case", async () => {
    const candidates = Array.from({ length: 12 }, (_, index) => product(`rank-${index}`));
    vi.mocked(storage.getProducts).mockResolvedValueOnce(candidates);
    const response = await getPublic(homePath);
    expect(response.status).toBe(200);
    expect(response.body.products.map((entry: { id: string }) => entry.id)).toEqual(["rank-0", "rank-1", "rank-2", "rank-3"]);
    expect(response.body).toMatchObject({ total: 4, hasMore: false });
    expect(storage.getProducts).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      storefrontOnly: true, sortBy: "views", sortOrder: "desc", limit: 12, offset: undefined,
    }));
    expect(findForbiddenFieldPaths(response.body)).toEqual([]);
  });

  it("reaches variant-only picks after twelve unavailable rows while preserving ranked ties", async () => {
    const unavailable = Array.from({ length: 12 }, (_, index) => product(`unavailable-${index}`, {
      hasVariants: true, variants: [{ id: "blocked", label: "Blocked", price: 100, stock: 2,
        ...(index % 3 === 0 ? { priceStatus: "pending" } : index % 3 === 1 ? { availabilityStatus: "coming_soon" } : { isArchived: true }),
      }],
    }));
    // Equal view counts retain the storage layer's createdAt/id order. This
    // boundary must neither re-sort by price nor fall back to parent stock.
    const variantOnly = ["tie-a", "tie-b", "tie-c", "tie-d", "tie-e"].map((id, index) => product(id, {
      price: "0", stock: 0, hasVariants: true,
      variants: [{ id: "available", label: "Available", price: 500 - index * 100, stock: 2 }],
    }));
    const candidates = [...unavailable, ...variantOnly];
    const before = JSON.stringify(candidates);
    vi.mocked(storage.getProducts).mockResolvedValueOnce(unavailable).mockResolvedValueOnce(candidates);
    const response = await getPublic(homePath);
    expect(response.status).toBe(200);
    expect(response.body.products.map((entry: { id: string }) => entry.id)).toEqual(["tie-a", "tie-b", "tie-c", "tie-d"]);
    expect(response.body.products.map((entry: { price: string }) => entry.price)).toEqual(["0", "0", "0", "0"]);
    expect(response.body).toMatchObject({ total: 4, hasMore: false });
    expect(storage.getProducts).toHaveBeenCalledTimes(2);
    expect(storage.getProducts).toHaveBeenNthCalledWith(1, expect.objectContaining({ limit: 12, sortBy: "views", sortOrder: "desc" }));
    expect(storage.getProducts).toHaveBeenNthCalledWith(2, expect.objectContaining({ limit: 500, sortBy: "views", sortOrder: "desc" }));
    expect(JSON.stringify(candidates)).toBe(before);
  });

  it("retains the old five-hundred-candidate ceiling and never exposes hidden picks", async () => {
    const candidates = [product("hidden", { isStorefrontVisible: false }), product("deleted", { deletedAt: new Date() }),
      ...Array.from({ length: 498 }, (_, index) => product(`sold-${index}`, { stock: 0 })), product("beyond-old-ceiling")];
    const readCandidates = (filters: { limit?: number } = {}) => Promise.resolve(candidates.slice(0, filters.limit));
    vi.mocked(storage.getProducts).mockImplementationOnce(readCandidates).mockImplementationOnce(readCandidates);
    const response = await getPublic(homePath);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ products: [], total: 0, hasMore: false });
    expect(vi.mocked(storage.getProducts).mock.calls.map(([filters]) => filters?.limit)).toEqual([12, 500]);
  });

  it("leaves the legacy catalogue and coming-soon output unchanged", async () => {
    const upcoming = product("upcoming", { price: "0", stock: 0, hasVariants: true,
      variants: [{ id: "pending", label: "Soon", price: null, stock: 0, priceStatus: "pending", availabilityStatus: "coming_soon" }],
      specifications: { __availabilityStatus: "coming_soon" },
    });
    const before = JSON.stringify(upcoming);
    vi.mocked(storage.getProducts).mockResolvedValueOnce([upcoming]);
    const response = await getPublic("/api/products?limit=12");
    expect(response.status).toBe(200);
    expect(response.body.products).toMatchObject([{ id: "upcoming", price: "0", stock: 0,
      variants: [{ price: null, priceStatus: "pending", availabilityStatus: "coming_soon" }],
      specifications: { __availabilityStatus: "coming_soon" },
    }]);
    expect(storage.getProducts).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ limit: 12 }));
    expect(JSON.stringify(upcoming)).toBe(before);
  });
});

/** Every public GET that returns product data, exercised unauthenticated. */
const PUBLIC_PRODUCT_PATHS = [
  "/api/products",
  "/api/products?limit=50",
  "/api/products?paginated=true&limit=24",
  "/api/products?sortBy=views&sortOrder=desc&homePicks=true&paginated=true&limit=4",
  "/api/products?search=driftwood",
  "/api/products?category=%D8%AA%D8%B1%D8%A8%D8%A9%20%D9%88%D8%AF%D9%8A%D9%83%D9%88%D8%B1",
  "/api/products/top-selling",
  "/api/products/info/trending",
  "/api/products/personalized",
  "/api/products/cart-suggestions?productIds=aquavo-driftwood-dw-11",
  `/api/products/by-ids?ids=${PRODUCTION_ROWS[0].id}`,
  "/api/products/smart-search?q=خشب",
  `/api/products/${PRODUCTION_ROWS[0].slug}`,
  `/api/products/${PRODUCTION_ROWS[1].slug}`,
  `/api/products/${PRODUCTION_ROWS[0].slug}/variants`,
  `/api/products/${PRODUCTION_ROWS[0].slug}/similar`,
  `/api/products/${PRODUCTION_ROWS[0].slug}/frequently-bought-together`,
];

describe("public product API over real HTTP, unauthenticated", () => {
  it("does not disclose explicitly hidden products through lists, comparison or direct details", async () => {
    const hidden = { ...rows[0], id: "hidden-invoice", slug: "hidden-invoice", isStorefrontVisible: false };
    vi.mocked(storage.getProducts).mockResolvedValueOnce([hidden, ...rows]);
    const listed = await getPublic("/api/products");
    expect(listed.body.products.some((product: { id: string }) => product.id === hidden.id)).toBe(false);
    vi.mocked(storage.getProductsByIds).mockResolvedValueOnce([hidden]);
    expect((await getPublic(`/api/products/by-ids?ids=${hidden.id}`)).body.products).toEqual([]);
    vi.mocked(storage.getProductBySlug).mockResolvedValueOnce(hidden);
    expect((await getPublic(`/api/products/${hidden.slug}`)).status).toBe(404);
  });

  it("rejects invalid page inputs and caps a requested public page at 100", async () => {
    expect((await getPublic("/api/products?paginated=true&limit=-1")).status).toBe(400);
    expect((await getPublic("/api/products?paginated=true&offset=NaN")).status).toBe(400);
    const response = await getPublic("/api/products?paginated=true&limit=500");
    expect(response.status).toBe(200);
    expect(storage.getProductsPage).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 100, offset: 0, storefrontOnly: true }));
  });

  it("deduplicates cart IDs before one grouped recommendation and rejects oversized carts", async () => {
    vi.mocked(recommendationEngine.getFrequentlyBoughtTogetherForProducts).mockClear();
    const response = await getPublic("/api/products/cart-suggestions?productIds=a,a,b");
    expect(response.status).toBe(200);
    expect(recommendationEngine.getFrequentlyBoughtTogetherForProducts).toHaveBeenCalledExactlyOnceWith(["a", "b"], 20);
    const ids = Array.from({ length: 21 }, (_, index) => `p-${index}`).join(",");
    expect((await getPublic(`/api/products/cart-suggestions?productIds=${ids}`)).status).toBe(400);
    expect(recommendationEngine.getFrequentlyBoughtTogetherForProducts).toHaveBeenCalledTimes(1);
  });

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
