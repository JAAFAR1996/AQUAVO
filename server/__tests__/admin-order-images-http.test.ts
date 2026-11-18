import { randomBytes } from "node:crypto";
import { drizzle } from "drizzle-orm/pg-proxy";
import express from "express";
import session from "express-session";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Product } from "../../shared/schema.js";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getOrders: vi.fn(),
  getUser: vi.fn(),
}));
vi.mock("../db.js", () => ({ getDb: mocks.getDb, db: null }));
vi.mock("../storage/index.js", () => ({ storage: mocks }));
vi.mock("../services/accounting-engine.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../services/accounting-engine.js")>();
  return {
    ...original,
    buildCostResolver: vi.fn(async () => ({
      getEffective: () => ({ name: "Current catalog name", price: 99000, costKnown: true, costPrice: 8000 }),
    })),
    buildFulfillmentResolver: vi.fn(async () => new Map()),
    calcOrderProfit: vi.fn(() => ({ netProfit: 3000, revenue: 12500, cogs: 4400, costsComplete: true })),
  };
});

import { createAdminOrderArchiveRouter } from "../routes/admin-order-archive.js";
import { buildOrderItemImageResolver, resolveOrderItemImage } from "../services/order-item-images.js";
import type { getDb } from "../db.js";

type ProductImages = Pick<Product, "id" | "images" | "thumbnail" | "variants">;
const product: ProductImages = {
  id: "filter",
  images: ["/images/filter-main.webp"],
  thumbnail: "/images/legacy-thumbnail.webp",
  variants: [
    { id: "small", label: "Small", price: null, stock: 1, images: ["/images/small.webp"] },
    { id: "large", label: "Large", price: null, stock: 0, isArchived: true,
      images: [" ", "/images/large.webp"], image: "/images/old-large.webp" },
  ],
};
const archivedProduct: ProductImages = {
  id: "archived-product", images: [], thumbnail: "/images/archived.webp", variants: [],
};

let imageRows: ProductImages[];
let archivedRows: Array<{ id: string; archived_at: string | null }>;
let rejectImages: boolean;
const execute = vi.fn(async (query: string, _params: unknown[]): Promise<{ rows: unknown[] }> => {
  if (query.includes("FROM public.orders")) return { rows: archivedRows };
  if (query.startsWith('select "id", "images", "thumbnail", "variants" from "products"')) {
    if (rejectImages) throw new Error("Fixture image metadata unavailable");
    return { rows: imageRows.map((row) => [row.id, row.images, row.thumbnail, row.variants]) };
  }
  throw new Error("Unexpected fixture database read");
});

function fixtureDb() {
  return drizzle(execute) as unknown as NonNullable<ReturnType<typeof getDb>>;
}

function makeOrder(id: string, items: Record<string, unknown>[]) {
  return { id, status: "delivered", total: "12500", createdAt: new Date("2026-11-01T09:00:00Z"), items };
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: randomBytes(32).toString("hex"), resave: false, saveUninitialized: false }));
  app.post("/fixture-login", (req, res) => {
    req.session.userId = req.body.userId;
    res.sendStatus(204);
  });
  app.use("/api/admin", createAdminOrderArchiveRouter());
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  imageRows = [product, archivedProduct];
  archivedRows = [];
  rejectImages = false;
  mocks.getDb.mockReturnValue(fixtureDb());
  mocks.getOrders.mockResolvedValue([]);
  mocks.getUser.mockImplementation(async (id: string) => ({ id, role: id === "fixture-admin" ? "admin" : "user" }));
});
afterEach(() => vi.restoreAllMocks());

describe("historical order image selection", () => {
  it("preserves a stored photograph even if the current product is missing or renamed", () => {
    expect(resolveOrderItemImage({ productId: "missing", image: "/purchase/snapshot.webp" }, product))
      .toBe("/purchase/snapshot.webp");
  });

  it("selects only the ordered variant's authoritative gallery, including archived variants", () => {
    expect(resolveOrderItemImage({ productId: product.id, variantId: "large" }, product)).toBe("/images/large.webp");
    const withoutVerifiedPhoto = { ...product, variants: [{ ...product.variants![1], images: [] }] };
    expect(resolveOrderItemImage({ productId: product.id, variantId: "large" }, withoutVerifiedPhoto)).toBe("");
  });

  it("supports legacy variant photos and product galleries without substituting a sibling variant", () => {
    const legacy = { ...product, variants: [{ ...product.variants![1], images: undefined }] };
    expect(resolveOrderItemImage({ productId: product.id, variantId: "large" }, legacy)).toBe("/images/old-large.webp");
    expect(resolveOrderItemImage({ productId: product.id, variantId: "removed" }, product)).toBe("");
    expect(resolveOrderItemImage({ productId: "different-product" }, product)).toBe("");
    expect(resolveOrderItemImage({ productId: product.id }, product)).toBe("/images/filter-main.webp");
    expect(resolveOrderItemImage({ productId: archivedProduct.id }, archivedProduct)).toBe("/images/archived.webp");
  });
});

describe("admin order image reads", () => {
  it("uses one bounded display-only SELECT for current and soft-deleted product IDs", async () => {
    const resolve = await buildOrderItemImageResolver(fixtureDb(), new Set([product.id, archivedProduct.id, product.id]));

    expect(execute).toHaveBeenCalledTimes(1);
    const [query, params] = execute.mock.calls[0];
    expect(query).toContain('"products"."id" in ($1, $2)');
    expect(query).not.toMatch(/\b(insert|update|delete)\b|deleted_at|"(?:price|cost_price|stock)"/i);
    expect(params).toEqual([product.id, archivedProduct.id]);
    expect(resolve({ productId: archivedProduct.id })).toBe("/images/archived.webp");
  });

  it("performs no image query when the order list has no product IDs", async () => {
    const resolve = await buildOrderItemImageResolver(fixtureDb(), new Set());
    expect(execute).not.toHaveBeenCalled();
    expect(resolve({ image: "/purchase/snapshot.webp" })).toBe("/purchase/snapshot.webp");
  });

  it("enriches the actual admin list once while preserving names, purchase amounts, costs and source records", async () => {
    const item = {
      productId: product.id, productName: "Name at purchase", variantId: "large", variantLabel: "Size at purchase",
      quantity: 1, priceAtPurchase: "12500", lineTotal: 12500, costPrice: "4400", costStatus: "exact",
    };
    const orders = [makeOrder("visible", [item, { ...item, image: "/purchase/snapshot.webp", priceAtPurchase: 0 }]),
      makeOrder("archived", [{ productId: archivedProduct.id, productName: "Archived name", quantity: 1, priceAtPurchase: "2000" }])];
    const before = JSON.stringify(orders);
    mocks.getOrders.mockResolvedValue(orders);
    archivedRows = [{ id: "archived", archived_at: "2026-11-02T09:00:00Z" }];
    const admin = request.agent(buildApp());
    await admin.post("/fixture-login").send({ userId: "fixture-admin" });

    const response = await admin.get("/api/admin/orders?includeArchived=1");

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store, private");
    expect(response.body[0].items[0]).toEqual({ ...item, price: 12500, costPrice: 4400, image: "/images/large.webp" });
    expect(response.body[0].items[1]).toMatchObject({ priceAtPurchase: 0, price: 0, image: "/purchase/snapshot.webp" });
    expect(response.body[0]).toMatchObject({ total: "12500", profit: 3000, revenue: 12500, cogs: 4400, costsComplete: true });
    expect(response.body[1]).toMatchObject({ archivedAt: "2026-11-02T09:00:00Z", items: [{ image: "/images/archived.webp" }] });
    const imageCalls = execute.mock.calls.filter(([query]) => query.startsWith('select "id", "images"'));
    expect(imageCalls).toHaveLength(1);
    expect(imageCalls[0][1]).toEqual([product.id, archivedProduct.id]);
    expect(JSON.stringify(orders)).toBe(before);
  });

  it("limits image IDs to orders included in the response when archived orders are hidden", async () => {
    mocks.getOrders.mockResolvedValue([
      makeOrder("visible", [{ productId: product.id }]),
      makeOrder("archived", [{ productId: archivedProduct.id }]),
    ]);
    archivedRows = [{ id: "archived", archived_at: "2026-11-02T09:00:00Z" }];
    const admin = request.agent(buildApp());
    await admin.post("/fixture-login").send({ userId: "fixture-admin" });

    const response = await admin.get("/api/admin/orders");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(execute.mock.calls.find(([query]) => query.startsWith('select "id", "images"'))?.[1]).toEqual([product.id]);
  });

  it("keeps orders readable with snapshot or empty images if optional image metadata fails", async () => {
    rejectImages = true;
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.getOrders.mockResolvedValue([makeOrder("visible", [
      { productId: product.id, priceAtPurchase: "12500" },
      { productId: product.id, image: "/purchase/snapshot.webp", priceAtPurchase: "5000" },
    ])]);
    const admin = request.agent(buildApp());
    await admin.post("/fixture-login").send({ userId: "fixture-admin" });

    const response = await admin.get("/api/admin/orders");

    expect(response.status).toBe(200);
    expect(response.body[0].items.map((item: { image: string }) => item.image)).toEqual(["", "/purchase/snapshot.webp"]);
    expect(response.body[0].items[0].priceAtPurchase).toBe("12500");
  });

  it("rejects signed-out and non-admin requests before reading order or image data", async () => {
    const app = buildApp();
    expect((await request(app).get("/api/admin/orders")).status).toBe(401);
    const user = request.agent(app);
    await user.post("/fixture-login").send({ userId: "fixture-customer" });
    expect((await user.get("/api/admin/orders")).status).toBe(403);
    expect(mocks.getOrders).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });
});
