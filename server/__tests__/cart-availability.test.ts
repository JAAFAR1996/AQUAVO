import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCartRouter } from "../routes/cart.js";
import { storage } from "../storage/index.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/cart", createCartRouter());
  return app;
}

describe("POST /api/cart/availability", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is available to guests and reports fresh base-product stock", async () => {
    vi.spyOn(storage, "getProductsByIds").mockResolvedValue([
      {
        id: "prod-1",
        name: "Filter media bag",
        stock: 1,
        variants: null,
      } as any,
    ]);

    const res = await request(buildApp())
      .post("/api/cart/availability")
      .send({ items: [{ productId: "prod-1", quantity: 2 }] });

    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toContain("no-store");
    expect(res.body.items).toEqual([
      expect.objectContaining({
        productId: "prod-1",
        requestedQuantity: 2,
        availableStock: 1,
        status: "limited",
        reason: "INSUFFICIENT_STOCK",
      }),
    ]);
  });

  it("uses exact variant stock and never falls back to a high base stock", async () => {
    vi.spyOn(storage, "getProductsByIds").mockResolvedValue([
      {
        id: "prod-variant",
        name: "Media bag",
        stock: 50,
        variants: [
          { id: "white-20x30", label: "أبيض 20×30", stock: 1, price: 996 },
          { id: "black-20x30", label: "أسود 20×30", stock: 20, price: 750 },
        ],
      } as any,
    ]);

    const res = await request(buildApp())
      .post("/api/cart/availability")
      .send({
        items: [{
          productId: "prod-variant",
          variantId: "white-20x30",
          quantity: 2,
        }],
      });

    expect(res.status).toBe(200);
    expect(res.body.items[0]).toEqual(expect.objectContaining({
      variantId: "white-20x30",
      variantLabel: "أبيض 20×30",
      requestedQuantity: 2,
      availableStock: 1,
      status: "limited",
      reason: "INSUFFICIENT_STOCK",
    }));
  });

  it("fails closed when a product or variant no longer exists", async () => {
    vi.spyOn(storage, "getProductsByIds").mockResolvedValue([
      {
        id: "prod-variant",
        name: "Media bag",
        stock: 10,
        variants: [{ id: "existing", label: "Existing", stock: 10, price: 1000 }],
      } as any,
    ]);

    const res = await request(buildApp())
      .post("/api/cart/availability")
      .send({
        items: [
          { productId: "missing-product", quantity: 1 },
          { productId: "prod-variant", variantId: "missing-variant", quantity: 1 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.items[0]).toEqual(expect.objectContaining({
      availableStock: 0,
      status: "unavailable",
      reason: "PRODUCT_NOT_FOUND",
    }));
    expect(res.body.items[1]).toEqual(expect.objectContaining({
      availableStock: 0,
      status: "unavailable",
      reason: "VARIANT_NOT_FOUND",
    }));
  });
});
