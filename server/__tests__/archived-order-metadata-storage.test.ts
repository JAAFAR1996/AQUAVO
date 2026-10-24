import { drizzle } from "drizzle-orm/pg-proxy";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db.js", () => ({ getDb: vi.fn(), db: null }));

import { getDb } from "../db.js";
import { ProductStorage } from "../storage/product-storage.js";
import { OrderStorage } from "../storage/order-storage.js";

// Exercise Drizzle's actual SELECT generation, without connecting to any database.
const execute = vi.fn(async (_query: string, _params: unknown[]) => ({ rows: [] as unknown[][] }));

function storageWithProxy() {
    const db = drizzle(execute);
    vi.mocked(getDb).mockReturnValue(db as unknown as NonNullable<ReturnType<typeof getDb>>);
    return new ProductStorage();
}

beforeEach(() => {
    vi.clearAllMocks();
    execute.mockResolvedValue({ rows: [] });
});

describe("archived order metadata is a separate read-only product lookup", () => {
    it("selects only display columns from the requested archived IDs and strips private variant fields", async () => {
        execute.mockResolvedValue({ rows: [[
            "archived-filter", "Archived filter", "/thumbnail.webp", ["/main.webp"],
            [{ id: "large", image: "/large.webp", label: "Current label", price: 99000, stock: 7,
                costPrice: 4000, costStatus: "exact", costSource: "private", supplier: "private" }],
        ]] });
        const storage = storageWithProxy();

        const result = await storage.getArchivedOrderProductMetadataByIds(["archived-filter"]);

        expect(execute).toHaveBeenCalledTimes(1);
        const [query, params] = execute.mock.calls[0];
        expect(query).toMatch(/^select "id", "name", "thumbnail", "images", "variants" from "products"/);
        expect(query).toContain('"products"."id" in ($1)');
        expect(query).toContain('"products"."deleted_at" is not null');
        expect(query).not.toMatch(/\b(insert|update|delete)\b|"(?:price|cost_price|stock)"/i);
        expect(params).toEqual(["archived-filter"]);
        expect(result).toEqual([{
            id: "archived-filter", name: "Archived filter", thumbnail: "/thumbnail.webp", images: ["/main.webp"],
            variants: [{ id: "large", image: "/large.webp" }],
        }]);
        expect(JSON.stringify(result)).not.toMatch(/cost|supplier|stock|price|Current label/i);
    });

    it("normalizes absent variants to an empty display collection", async () => {
        execute.mockResolvedValue({ rows: [["archived-filter", "Archived filter", null, [], null]] });

        const result = await storageWithProxy().getArchivedOrderProductMetadataByIds(["archived-filter"]);

        expect(result[0].variants).toEqual([]);
    });

    it("does not query the database for an empty archived ID list", async () => {
        const result = await storageWithProxy().getArchivedOrderProductMetadataByIds([]);

        expect(result).toEqual([]);
        expect(execute).not.toHaveBeenCalled();
    });

    it.each([
        ["ID detail", (storage: ProductStorage) => storage.getProduct("archived-filter")],
        ["slug detail", (storage: ProductStorage) => storage.getProductBySlug("archived-filter")],
        ["catalog/cart batch", (storage: ProductStorage) => storage.getProductsByIds(["archived-filter"])],
    ] as const)("keeps soft-deleted products excluded from %s", async (_label, lookup) => {
        await lookup(storageWithProxy());

        expect(execute).toHaveBeenCalledTimes(1);
        const [query, params] = execute.mock.calls[0];
        expect(query).toContain('"products"."deleted_at" is null');
        expect(query).not.toContain('"products"."deleted_at" is not null');
        expect(params[0]).toBe("archived-filter");
    });

    it("keeps the add-to-cart lookup archived-excluding and fails before any write", async () => {
        storageWithProxy();

        await expect(new OrderStorage().addToCart("owner", "archived-filter", 1)).rejects.toThrow("Product not found");

        expect(execute).toHaveBeenCalledTimes(1);
        const [query, params] = execute.mock.calls[0];
        expect(query).toMatch(/^select /);
        expect(query).toContain('"products"."deleted_at" is null');
        expect(params).toEqual(["archived-filter", "archived-filter"]);
    });
});
