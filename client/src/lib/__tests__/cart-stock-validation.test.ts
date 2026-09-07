import { afterEach, describe, expect, it, vi } from "vitest";
import { stockConflictMessage, validateCartStock } from "../cart-stock-validation";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("validateCartStock", () => {
  it("blocks a base product that sold out after it was added to the cart", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      id: "prod-1",
      name: "Filter bag",
      stock: 0,
      variants: null,
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await validateCartStock([
      { productId: "prod-1", name: "Filter bag", quantity: 1 },
    ]);

    expect(result.ok).toBe(false);
    expect(result.conflicts[0]).toMatchObject({ productId: "prod-1", available: 0, quantity: 1 });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/products/prod-1?inventory_check="),
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("prefers the cart slug for non-UUID storefront product ids", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      id: "internal-product-id",
      stock: 4,
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await validateCartStock([
      {
        productId: "internal-product-id",
        slug: "filter-media-bag",
        name: "Filter bag",
        quantity: 1,
      },
    ]);

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/products/filter-media-bag?inventory_check="),
      expect.any(Object),
    );
  });

  it("uses the selected variant stock instead of the base product stock", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      id: "prod-1",
      stock: 50,
      variants: [
        { id: "black-20x15", label: "أسود 20×15", stock: 0 },
        { id: "black-30x20", label: "أسود 30×20", stock: 6 },
      ],
    })));

    const result = await validateCartStock([
      {
        productId: "prod-1",
        name: "كيس شبك لميديا الفلتر",
        quantity: 1,
        variantId: "black-20x15",
        variantLabel: "أسود 20×15",
      },
    ]);

    expect(result.ok).toBe(false);
    expect(result.conflicts[0].available).toBe(0);
    expect(stockConflictMessage(result.conflicts[0])).toContain("نفد من المخزون");
  });

  it("blocks a removed or invalid variant instead of falling back to base stock", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      id: "prod-1",
      stock: 50,
      variants: [{ id: "new-variant", stock: 10 }],
    })));

    const result = await validateCartStock([
      { productId: "prod-1", name: "Variant product", quantity: 1, variantId: "old-variant" },
    ]);

    expect(result.ok).toBe(false);
    expect(result.conflicts[0].available).toBe(0);
  });

  it("allows a quantity that is still available", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      id: "prod-1",
      stock: 3,
    })));

    const result = await validateCartStock([
      { productId: "prod-1", name: "Filter", quantity: 2 },
    ]);

    expect(result).toEqual({ ok: true, conflicts: [] });
  });

  it("fails closed when current stock cannot be verified", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      id: "prod-1",
      stock: null,
    })));

    await expect(validateCartStock([
      { productId: "prod-1", name: "Filter", quantity: 1 },
    ])).rejects.toThrow("تعذر التحقق من مخزون Filter");
  });
});
