/**
 * Cart stock enforcement tests.
 *
 * Confirms the fix for the P2 data-integrity defect: PUT /api/cart/:itemId
 * (quantity update) now validates the requested quantity against current
 * product/variant stock — the same source-of-truth check addToCart() and
 * createOrderSecure() already perform — instead of only catching oversell at
 * order-creation time.
 */
import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cartItems, products } from "../../shared/schema.js";

vi.mock("../db.js", () => ({
    getDb: vi.fn(),
    db: null,
}));

import { getDb } from "../db.js";
import { OrderStorage, STOCK_ERROR_INSUFFICIENT } from "../storage/order-storage.js";
import { createCartRouter } from "../routes/cart.js";
import { storage } from "../storage/index.js";

function makeFakeDb(cartItemRow: any, productRow: any) {
    return {
        select: vi.fn(() => ({
            from: vi.fn((table: unknown) => ({
                where: vi.fn(async () => {
                    if (table === cartItems) return cartItemRow ? [cartItemRow] : [];
                    if (table === products) return productRow ? [productRow] : [];
                    return [];
                }),
            })),
        })),
        update: vi.fn(() => ({
            set: vi.fn((payload: any) => ({
                where: vi.fn(() => ({
                    returning: vi.fn(async () => [{ ...cartItemRow, ...payload }]),
                })),
            })),
        })),
    };
}

describe("OrderStorage.updateCartItem stock enforcement", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("rejects a quantity exceeding known base-product stock", async () => {
        const cartItemRow = { id: "item-1", userId: "user-1", productId: "prod-1", quantity: 1, variantId: null };
        const productRow = { id: "prod-1", name: "Filter", stock: 3, variants: null };
        (getDb as any).mockReturnValue(makeFakeDb(cartItemRow, productRow));

        const orderStorage = new OrderStorage();
        await expect(orderStorage.updateCartItem("user-1", "item-1", 10)).rejects.toThrow(STOCK_ERROR_INSUFFICIENT);
    });

    it("rejects a quantity exceeding known variant stock (does not fall back to base stock)", async () => {
        const cartItemRow = { id: "item-1", userId: "user-1", productId: "prod-1", quantity: 1, variantId: "small" };
        const productRow = {
            id: "prod-1",
            name: "Tank",
            stock: 50, // base stock is high on purpose — must NOT be used for a variant line
            variants: [
                { id: "small", label: "Small", price: 10000, stock: 2 },
                { id: "large", label: "Large", price: 20000, stock: 20 },
            ],
        };
        (getDb as any).mockReturnValue(makeFakeDb(cartItemRow, productRow));

        const orderStorage = new OrderStorage();
        await expect(orderStorage.updateCartItem("user-1", "item-1", 5)).rejects.toThrow(STOCK_ERROR_INSUFFICIENT);
    });

    it("allows a quantity within known base-product stock", async () => {
        const cartItemRow = { id: "item-1", userId: "user-1", productId: "prod-1", quantity: 1, variantId: null };
        const productRow = { id: "prod-1", name: "Filter", stock: 5, variants: null };
        (getDb as any).mockReturnValue(makeFakeDb(cartItemRow, productRow));

        const orderStorage = new OrderStorage();
        const updated = await orderStorage.updateCartItem("user-1", "item-1", 3);
        expect(updated.quantity).toBe(3);
    });

    it("allows a quantity within known variant stock", async () => {
        const cartItemRow = { id: "item-1", userId: "user-1", productId: "prod-1", quantity: 1, variantId: "small" };
        const productRow = {
            id: "prod-1",
            name: "Tank",
            stock: 50,
            variants: [{ id: "small", label: "Small", price: 10000, stock: 4 }],
        };
        (getDb as any).mockReturnValue(makeFakeDb(cartItemRow, productRow));

        const orderStorage = new OrderStorage();
        const updated = await orderStorage.updateCartItem("user-1", "item-1", 4);
        expect(updated.quantity).toBe(4);
    });

    it("does not validate stock when the cart item cannot be found (no behavior change for missing items)", async () => {
        (getDb as any).mockReturnValue(makeFakeDb(undefined, undefined));

        const orderStorage = new OrderStorage();
        // Should not throw a stock error — falls through to the update, which
        // affects zero rows (pre-existing behavior, unchanged by this fix).
        await expect(orderStorage.updateCartItem("user-1", "missing-item", 999)).resolves.toBeDefined();
    });
});

describe("PUT /api/cart/:itemId route", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    function buildApp() {
        const app = express();
        app.use(express.json());
        // Stand in for the session middleware — cart.ts reads req.session.userId.
        app.use((req, _res, next) => {
            (req as any).session = { userId: "user-1" };
            next();
        });
        app.use("/api/cart", createCartRouter());
        return app;
    }

    it("rejects a forged excessive quantity with a clean 409 Arabic message", async () => {
        vi.spyOn(storage, "getUser").mockResolvedValue({ id: "user-1" } as any);
        vi.spyOn(storage, "updateCartItem").mockRejectedValue(new Error(STOCK_ERROR_INSUFFICIENT));

        const app = buildApp();
        const res = await request(app).put("/api/cart/item-1").send({ quantity: 999999 });

        expect(res.status).toBe(409);
        expect(res.body).toEqual({ message: STOCK_ERROR_INSUFFICIENT, code: "OUT_OF_STOCK" });
    });

    it("allows a valid quantity update to succeed", async () => {
        vi.spyOn(storage, "getUser").mockResolvedValue({ id: "user-1" } as any);
        vi.spyOn(storage, "updateCartItem").mockResolvedValue({ id: "item-1", quantity: 2 } as any);

        const app = buildApp();
        const res = await request(app).put("/api/cart/item-1").send({ quantity: 2 });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: "item-1", quantity: 2 });
    });

    it("still removes the item when quantity is 0 (unrelated existing behavior preserved)", async () => {
        vi.spyOn(storage, "getUser").mockResolvedValue({ id: "user-1" } as any);
        const removeFromCart = vi.spyOn(storage, "removeFromCart").mockResolvedValue(undefined);

        const app = buildApp();
        const res = await request(app).put("/api/cart/item-1").send({ quantity: 0 });

        expect(res.status).toBe(200);
        expect(removeFromCart).toHaveBeenCalledWith("user-1", "item-1");
    });
});
