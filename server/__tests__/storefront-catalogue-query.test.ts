import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { getTableName } from "drizzle-orm";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { products, productInteractions, productViews } from "../../shared/schema.js";
import { getPublicProductPriceRange } from "../../shared/public-price.js";
import { getDb } from "../db.js";
import { ProductStorage } from "../storage/product-storage.js";
import { RecommendationEngine } from "../services/recommendation-engine.js";

vi.mock("../db.js", () => ({ getDb: vi.fn() }));

let pg: PGlite;
let catalogue: ProductStorage;
let recommendations: RecommendationEngine;

// Isolated PostgreSQL test schema, never a connection to Neon or production.
function tableDdl(table: PgTable) {
  return `CREATE TABLE "${getTableName(table)}" (${getTableConfig(table).columns.map(column => `"${column.name}" ${column.getSQLType()}`).join(", ")})`;
}

const options = [
  { id: "small", label: "Small", price: 100, stock: 3 },
  { id: "sold", label: "Sold", price: 50, stock: 0 },
  { id: "archived", label: "Old", price: 1, stock: 10, isArchived: true },
  { id: "soon", label: "Soon", price: 5, stock: 0, availabilityStatus: "coming_soon" as const },
  { id: "pending", label: "Pending", price: null, stock: 0, priceStatus: "pending" as const },
];

beforeAll(async () => {
  pg = new PGlite();
  await pg.exec([products, productInteractions, productViews].map(tableDdl).join(";"));
  const db = drizzle(pg);
  vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);
  catalogue = new ProductStorage();
  recommendations = new RecommendationEngine();
  const common = {
    name: "Product", brand: "YEE", category: "Equipment", subcategory: "Parts", description: "Test product",
    images: [], thumbnail: "", deletedAt: null, isStorefrontVisible: true, stock: 2, hasVariants: false,
    createdAt: new Date("2026-01-01"), specifications: {},
  };
  await db.insert(products).values([
    { ...common, id: "connectors", slug: "connectors", price: "150", hasVariants: true, variants: options },
    { ...common, id: "next", slug: "next", price: "400" },
    { ...common, id: "hidden", slug: "hidden", price: "75", isStorefrontVisible: false },
    { ...common, id: "incoming", slug: "incoming", price: "0", stock: 0, hasVariants: true,
      variants: [{ id: "incoming-v", label: "Soon", price: null, stock: 0, priceStatus: "pending", availabilityStatus: "coming_soon" }],
      specifications: { __availabilityStatus: "coming_soon" } },
  ]);
});
afterAll(async () => { await pg.close(); });

describe("public catalogue SQL", () => {
  it("matches the displayed sellable option price without changing stored values", async () => {
    const result = await catalogue.getProductsPage({ storefrontOnly: true, maxPrice: 120, sortBy: "price", sortOrder: "asc", limit: 24 });
    expect(result.products.map(product => product.id)).toEqual(["connectors", "incoming"]);
    expect(result).toMatchObject({ total: 2, hasMore: false });
    expect(result.products[0].price).toBe("150");
    expect(result.products[0].variants).toEqual(options);
    expect(getPublicProductPriceRange(result.products[0])).toEqual({ min: 100, max: 100 });
  });

  it("pages a visible catalogue deterministically and preserves upcoming products", async () => {
    const filters = { storefrontOnly: true, limit: 1, sortBy: "price" as const, sortOrder: "asc" as const };
    const first = await catalogue.getProductsPage(filters);
    const second = await catalogue.getProductsPage({ ...filters, offset: 1 });
    const third = await catalogue.getProductsPage({ ...filters, offset: 2 });
    expect(first.products.map(product => product.id)).toEqual(["connectors"]);
    expect(second.products.map(product => product.id)).toEqual(["next"]);
    expect(first).toMatchObject({ total: 3, hasMore: true });
    expect(third).toMatchObject({ total: 3, hasMore: false, products: [{ id: "incoming", price: "0", specifications: { __availabilityStatus: "coming_soon" } }] });
    expect(third.products[0].variants?.[0]).toMatchObject({ price: null, priceStatus: "pending", availabilityStatus: "coming_soon", stock: 0 });
    expect((await catalogue.getProducts()).some(product => product.id === "hidden")).toBe(true);
  });

  it("returns global visible category counts and the same display price bounds", async () => {
    expect(await catalogue.getProductAttributes()).toMatchObject({ minPrice: 0, maxPrice: 400, categoryCounts: { Equipment: 3 } });
  });

  it("retains the filtered total when the requested offset is beyond the last page", async () => {
    const page = await catalogue.getProductsPage({ storefrontOnly: true, maxPrice: 120, sortBy: "price", sortOrder: "asc", offset: 999, limit: 24 });
    expect(page).toEqual({ products: [], total: 2, hasMore: false });
    const empty = await catalogue.getProductsPage({ storefrontOnly: true, brand: "Unknown", offset: 999, limit: 24 });
    expect(empty).toEqual({ products: [], total: 0, hasMore: false });
  });

  it.each([{ invalid: true }, "invalid", 42, null])("tolerates a historical non-array variants payload: %j", async value => {
    try {
      await pg.query("UPDATE products SET variants = $1::jsonb WHERE id = 'connectors'", [JSON.stringify(value)]);
      const page = await catalogue.getProductsPage({ storefrontOnly: true, search: "connectors", minPrice: 150, maxPrice: 150, limit: 24 });
      expect(page).toMatchObject({ products: [{ id: "connectors", price: "150" }], total: 1, hasMore: false });
      expect(await catalogue.getProductAttributes()).toMatchObject({ minPrice: 0, maxPrice: 400 });
    } finally {
      await pg.query("UPDATE products SET variants = $1::jsonb WHERE id = 'connectors'", [JSON.stringify(options)]);
    }
  });

  it("keeps a zero-price coming-soon item in the same zero-budget filter as before", async () => {
    const page = await catalogue.getProductsPage({ storefrontOnly: true, minPrice: 0, maxPrice: 0, sortBy: "price", sortOrder: "asc", limit: 24 });
    expect(page.products).toMatchObject([{ id: "incoming", price: "0", stock: 0, specifications: { __availabilityStatus: "coming_soon" } }]);
    expect(page.total).toBe(1);
    expect(page.products[0].variants?.[0]).toMatchObject({ price: null, priceStatus: "pending", availabilityStatus: "coming_soon", stock: 0 });
  });
});

it("co-purchase aggregation joins actual orders and counts one order once", async () => {
  const db = drizzle(pg);
  const events = [
    ["connectors", "order-a"], ["next", "order-a"], ["next", "order-a"],
    ["connectors", "order-b"], ["next", "order-b"],
    ["unrelated", "order-c"], ["unrelated", "order-d"],
    ["one-order-only", "order-a"], ["one-order-only", "order-a"],
  ];
  await db.insert(productInteractions).values(events.map(([productId, orderId], index) => ({
    id: String(index), userId: "customer", productId, interactionType: "purchase", metadata: { orderId },
  })));
  expect(await recommendations.getFrequentlyBoughtTogether("connectors")).toEqual(["next"]);
  expect(await recommendations.getFrequentlyBoughtTogetherForProducts(["connectors", "connectors"])).toEqual(["next"]);
  expect(await recommendations.getFrequentlyBoughtTogetherForProducts(["connectors", "next"])).toEqual([]);
});
