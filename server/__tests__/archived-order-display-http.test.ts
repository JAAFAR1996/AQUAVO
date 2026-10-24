import { randomBytes } from "node:crypto";
import express from "express";
import session from "express-session";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Order, Product, User } from "../../shared/schema.js";
import { findForbiddenFieldPaths } from "../../shared/public-product.js";

// Keep requests isolated from Neon while exercising the real router and requireAuth.
vi.mock("../db.js", () => ({ getDb: () => null, db: null }));

import { createOrderRouter } from "../routes/orders.js";
import { createCartRouter } from "../routes/cart.js";
import { storage } from "../storage/index.js";
import type { ArchivedOrderProductMetadata } from "../storage/product-storage.js";

const archivedProduct: ArchivedOrderProductMetadata = {
    id: "archived-filter",
    name: "Archived filter",
    thumbnail: "/archive/filter.webp",
    images: ["/archive/filter-main.webp"],
    variants: [{ id: "large", image: "/archive/filter-large.webp" }],
};

function makeOrder(items: Record<string, unknown>[]): Order {
    return {
        id: "order-owned",
        orderNumber: "FH-ARCHIVED-ORDER",
        userId: "owner",
        customerPhone: "07747880673",
        status: "delivered",
        total: "12500",
        roundedTotal: "12500",
        createdAt: new Date("2026-07-13T08:00:00.000Z"),
        updatedAt: new Date("2026-07-14T08:00:00.000Z"),
        items,
    } as unknown as Order;
}

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use(session({
        secret: randomBytes(32).toString("hex"),
        resave: false,
        saveUninitialized: false,
    }));
    app.post("/fixture-login", (req, res) => {
        req.session.userId = req.body.userId;
        res.sendStatus(204);
    });
    app.use("/api/orders", createOrderRouter());
    app.use("/api/cart", createCartRouter());
    return app;
}

beforeEach(() => {
    vi.spyOn(storage, "getUser").mockImplementation(async (id) => ({ id, role: "user" }) as User);
    vi.spyOn(storage, "getProductsByIds").mockResolvedValue([]);
    vi.spyOn(storage, "getArchivedOrderProductMetadataByIds").mockResolvedValue([archivedProduct]);
    vi.spyOn(storage, "getOrder").mockResolvedValue(makeOrder([
        { productId: archivedProduct.id, quantity: 1, priceAtPurchase: 12500 },
    ]));
    vi.spyOn(storage, "getOrders").mockResolvedValue([]);
    vi.spyOn(storage, "updateOrder");
    vi.spyOn(storage, "updateProduct");
});

afterEach(() => {
    expect(storage.updateOrder).not.toHaveBeenCalled();
    expect(storage.updateProduct).not.toHaveBeenCalled();
    vi.restoreAllMocks();
});

describe("archived product metadata on authenticated order reads", () => {
    it("backfills an owner's historical name and variant image without changing the stored price or row", async () => {
        const order = makeOrder([{
            productId: archivedProduct.id,
            variantId: "large",
            variantLabel: "Large at purchase",
            quantity: 1,
            priceAtPurchase: 12500,
            lineTotal: 12500,
            costPrice: 4400,
            costStatus: "exact",
            costSource: "product_current",
        }]);
        const before = JSON.stringify(order);
        vi.mocked(storage.getOrder).mockResolvedValue(order);
        const owner = request.agent(buildApp());
        await owner.post("/fixture-login").send({ userId: "owner" });

        const response = await owner.get("/api/orders/order-owned");

        expect(response.status).toBe(200);
        expect(response.body.items).toEqual([{
            productId: archivedProduct.id,
            variantId: "large",
            variantLabel: "Large at purchase",
            quantity: 1,
            priceAtPurchase: 12500,
            lineTotal: 12500,
            productName: "Archived filter",
            image: "/archive/filter-large.webp",
        }]);
        expect(response.body.total).toBe("12500");
        expect(findForbiddenFieldPaths(response.body)).toEqual([]);
        expect(storage.getProductsByIds).toHaveBeenCalledWith([archivedProduct.id]);
        expect(storage.getArchivedOrderProductMetadataByIds).toHaveBeenCalledWith([archivedProduct.id]);
        expect(JSON.stringify(order)).toBe(before);
    });

    it("preserves stored names, images, variant labels, and numeric zero rather than repricing from a product", async () => {
        const lines = [archivedProduct.id, "current-filter"].map((productId) => ({
            productId,
            productName: "Name at purchase",
            image: "/purchase/snapshot.webp",
            variantId: "large",
            variantLabel: "Size at purchase",
            quantity: 1,
            priceAtPurchase: 0,
            lineTotal: 0,
        }));
        vi.mocked(storage.getOrder).mockResolvedValue(makeOrder(lines));
        vi.mocked(storage.getProductsByIds).mockResolvedValue([{
            id: "current-filter", name: "Renamed filter", price: "99000", thumbnail: "/current.webp",
        } as Product]);
        const owner = request.agent(buildApp());
        await owner.post("/fixture-login").send({ userId: "owner" });

        const response = await owner.get("/api/orders/order-owned");

        expect(response.status).toBe(200);
        expect(response.body.items).toEqual(lines);
        expect(storage.getArchivedOrderProductMetadataByIds).toHaveBeenCalledExactlyOnceWith([archivedProduct.id]);
    });

    it("enriches the owner's order list, batches only missing IDs, and never invents an archived price", async () => {
        vi.mocked(storage.getOrders).mockResolvedValue([makeOrder([
            { productId: archivedProduct.id, quantity: 1, priceAtPurchase: "12500" },
            { productId: archivedProduct.id, quantity: 1 },
            { productId: "current-filter", quantity: 1, priceAtPurchase: 5000 },
        ])]);
        vi.mocked(storage.getProductsByIds).mockResolvedValue([{
            id: "current-filter", name: "Current filter", price: "99000", thumbnail: "/current.webp",
        } as Product]);
        const owner = request.agent(buildApp());
        await owner.post("/fixture-login").send({ userId: "owner" });

        const response = await owner.get("/api/orders");

        expect(response.status).toBe(200);
        expect(storage.getOrders).toHaveBeenCalledExactlyOnceWith("owner");
        expect(storage.getProductsByIds).toHaveBeenCalledExactlyOnceWith([archivedProduct.id, "current-filter"]);
        expect(storage.getArchivedOrderProductMetadataByIds).toHaveBeenCalledExactlyOnceWith([archivedProduct.id]);
        expect(response.body[0].items[0]).toMatchObject({
            productName: "Archived filter", image: "/archive/filter.webp", priceAtPurchase: "12500",
        });
        expect(response.body[0].items[1].priceAtPurchase).toBe("0");
        expect(response.body[0].items[2]).toMatchObject({
            productName: "Current filter", image: "/current.webp", priceAtPurchase: 5000,
        });
    });

    it("keeps historical order reads available if the optional metadata lookup fails", async () => {
        vi.mocked(storage.getArchivedOrderProductMetadataByIds).mockRejectedValue(new Error("Metadata unavailable"));
        const owner = request.agent(buildApp());
        await owner.post("/fixture-login").send({ userId: "owner" });

        const response = await owner.get("/api/orders/order-owned");

        expect(response.status).toBe(200);
        expect(response.body.items[0]).toMatchObject({
            productName: archivedProduct.id, image: "", priceAtPurchase: 12500,
        });
    });

    it("denies a different account before looking up current or archived metadata", async () => {
        const stranger = request.agent(buildApp());
        await stranger.post("/fixture-login").send({ userId: "not-owner" });

        const response = await stranger.get("/api/orders/order-owned");

        expect(response.status).toBe(403);
        expect(storage.getProductsByIds).not.toHaveBeenCalled();
        expect(storage.getArchivedOrderProductMetadataByIds).not.toHaveBeenCalled();
        expect(response.body).not.toHaveProperty("items");
    });

    it.each(["/api/orders", "/api/orders/order-owned"])("requires authentication before reading %s", async (path) => {
        const response = await request(buildApp()).get(path);

        expect(response.status).toBe(401);
        expect(storage.getOrder).not.toHaveBeenCalled();
        expect(storage.getOrders).not.toHaveBeenCalled();
        expect(storage.getProductsByIds).not.toHaveBeenCalled();
        expect(storage.getArchivedOrderProductMetadataByIds).not.toHaveBeenCalled();
    });

    it("never enriches public tracking, even when its phone verifier succeeds", async () => {
        const response = await request(buildApp())
            .post("/api/orders/track/FH-ARCHIVED-ORDER")
            .send({ phoneLast4: "0673" });

        expect(response.status).toBe(200);
        expect(Object.keys(response.body).sort()).toEqual([
            "createdAt", "estimatedDelivery", "orderNumber", "status", "updatedAt",
        ]);
        expect(storage.getProductsByIds).not.toHaveBeenCalled();
        expect(storage.getArchivedOrderProductMetadataByIds).not.toHaveBeenCalled();
    });

    it("does not use historical metadata to make an archived product purchasable in cart preflight", async () => {
        const response = await request(buildApp()).post("/api/cart/preflight").send({
            items: [{ productId: archivedProduct.id, quantity: 1 }],
        });

        expect(response.status).toBe(200);
        expect(response.body.items[0]).toMatchObject({
            productId: archivedProduct.id, valid: false, reason: "PRODUCT_NOT_FOUND", price: null, stock: 0,
        });
        expect(storage.getArchivedOrderProductMetadataByIds).not.toHaveBeenCalled();
    });
});
