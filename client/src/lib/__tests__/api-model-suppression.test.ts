import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchProductBySlugCore, fetchProductsCore } from "../api";

global.fetch = vi.fn();

const rawProduct = {
  id: "filter",
  slug: "sponge-filter",
  name: "فلتر إسفنجي",
  price: 3000,
  specifications: {
    "الموديل": "BASE-1",
    "الاستخدام": "أحواض صغيرة",
  },
  hasVariants: true,
  variants: [
    {
      id: "xy-180",
      label: "XY-180 — صغير",
      price: 3000,
      stock: 4,
      specifications: {
        "الحجم": "صغير",
        "الموديل": "XY-180",
      },
    },
  ],
};

describe("public product API model suppression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sanitizes a product details response", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => rawProduct,
    });

    const result = await fetchProductBySlugCore("sponge-filter");

    expect(result.specifications).toEqual({ "الاستخدام": "أحواض صغيرة" });
    expect(result.variants?.[0].label).toBe("صغير");
    expect(result.variants?.[0].specifications).toEqual({ "الحجم": "صغير" });
    expect(JSON.stringify(result)).not.toContain("الموديل");
    expect(JSON.stringify(result)).not.toContain("XY-180");
  });

  it("sanitizes product listing responses too", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ products: [rawProduct] }),
    });

    const result = await fetchProductsCore();

    expect(result.products[0].variants?.[0].label).toBe("صغير");
    expect(JSON.stringify(result)).not.toContain("الموديل");
    expect(JSON.stringify(result)).not.toContain("XY-180");
  });
});
