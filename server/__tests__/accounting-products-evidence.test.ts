import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { accountingProductsResponseSchema } from "../../shared/accounting.js";
import { createCanonicalPackagingAccountingRouter } from "../routes/accounting-packaging-canonical.js";
import { productCostFromProduct, type ProductRow } from "../services/accounting-engine.js";

const fixtures = vi.hoisted(() => ({
  from: vi.fn(),
  orders: vi.fn(),
  costs: vi.fn(),
  fulfillment: vi.fn(),
}));
vi.mock("../db.js", () => ({
  getDb: () => ({ select: () => ({ from: fixtures.from }), execute: async () => [] }),
}));
vi.mock("../middleware/auth.js", () => ({
  requireAdmin: (_req: Request, _res: Response, next: NextFunction) => next(),
}));
vi.mock("../services/accounting-engine.js", async (importOriginal) => ({
  ...await importOriginal<typeof import("../services/accounting-engine.js")>(),
  getRealizedOrdersForPeriod: fixtures.orders,
  buildCostResolver: fixtures.costs,
  buildRelationalLineResolver: async () => new Map(),
  buildFulfillmentResolver: fixtures.fulfillment,
}));

describe("product profitability cost evidence", () => {
  it("propagates missing costs across sales, preserving known components, verified zero and exact profit", async () => {
    const catalog = [
      ["mixed", "0", "unresolved"], ["pack", "200", "entered"],
      ["free", "0", "verified_zero"], ["estimate", "100", "entered"],
      ["no-sales", null, "unresolved"], ["missing-ancillary", "100", "entered"],
    ].map(([id, costPrice, costPriceResolution]) => ({
      id: id!, name: id!, price: "1000", costPrice, costPriceResolution,
      packagingCost: id === "free" ? "0" : "10", packagingCostResolution: "verified_zero",
      insertCost: id === "missing-ancillary" ? null : "0", insertCostResolution: "verified_zero",
    }));
    fixtures.from.mockResolvedValue(catalog);
    const current = (id: string) => {
      const product = catalog.find((p) => p.id === id);
      return product && productCostFromProduct(product as ProductRow);
    };
    fixtures.costs.mockResolvedValue({ getCurrent: current, getEffective: current });

    const exact = { costStatus: "exact", costPrice: 200, packagingCost: 10, insertCost: 0 };
    function sale(id: string, productId: string, snapshot = {}, boxCost: number | null = 0) {
      return { id, boxCost, createdAt: new Date("2026-11-10"), roundedTotal: 1000, shippingCost: 0,
        items: [{ productId, productName: productId, quantity: 1, priceAtPurchase: 1000, ...snapshot }] };
    }
    fixtures.orders.mockResolvedValue([
      sale("unknown", "mixed"), sale("known", "mixed", exact),
      sale("no-carton", "pack", exact), sale("free", "free"),
      sale("estimate", "estimate", {}, 50), sale("partial", "missing-ancillary"),
    ]);
    fixtures.fulfillment.mockResolvedValue(new Map([["no-carton", {
      eventCount: 1, status: "exact", totalFulfillmentCost: 50,
    }]]));
    const app = express();
    app.use("/api/admin/accounting", createCanonicalPackagingAccountingRouter());
    const getRows = async () => {
      const response = await request(app).get("/api/admin/accounting/products").expect(200);
      return accountingProductsResponseSchema.parse(response.body.data);
    };
    const products = await getRows();
    const rows = Object.fromEntries(products.map((p) => [p.productId, p]));
    expect(rows.mixed).toMatchObject({ revenue: 2000, packaging: 20, cogs: null, costPrice: null,
      netProfit: null, exactNetProfit: null, margin: null, missingCostLines: 1, costsComplete: false });
    expect(rows.pack).toMatchObject({ cogs: 210, packaging: 10, netProfit: null, margin: null,
      costsComplete: false });
    expect(rows.free).toMatchObject({ costPrice: 0, cogs: 0, packaging: 0, netProfit: 1000,
      margin: 100, exactNetProfit: 1000, costsComplete: true });
    expect(rows.estimate).toMatchObject({ cogs: 110, netProfit: 840, estimatedNetProfit: 840,
      exactNetProfit: null, costsComplete: true });
    expect(rows["missing-ancillary"]).toMatchObject({ packaging: null, insertCost: null, costPrice: 100,
      cogs: null, netProfit: null });
    expect(rows["no-sales"]).toMatchObject({ unitsSold: 0, cogs: 0, netProfit: 0, costPrice: null });
    expect(products.findIndex((p) => p.netProfit == null)).toBe(3);

    fixtures.orders.mockResolvedValue([sale("missing-legacy-box", "pack", exact, null)]);
    expect((await getRows()).find((p) => p.productId === "pack")).toMatchObject({
      cogs: 210, netProfit: null, exactNetProfit: null, costsComplete: false,
    });
  });
});
