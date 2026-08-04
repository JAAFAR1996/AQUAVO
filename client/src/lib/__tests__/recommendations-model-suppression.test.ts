import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequestMock = vi.hoisted(() => vi.fn());

vi.mock("../queryClient", () => ({
  apiRequest: apiRequestMock,
}));

import { fetchTrendingProducts } from "../recommendations";

describe("recommendation product model suppression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removes model fields before returning recommendation products", async () => {
    apiRequestMock.mockResolvedValueOnce({
      json: async () => [
        {
          id: "filter",
          slug: "sponge-filter",
          name: "فلتر إسفنجي",
          brand: "AQUAVO",
          price: 3000,
          thumbnail: "/filter.jpg",
          images: ["/filter.jpg"],
          category: "فلاتر",
          specifications: {
            "الحجم": "صغير",
            "الموديل": "XY-180",
          },
          stock: 4,
        },
      ],
    });

    const products = await fetchTrendingProducts();

    expect(products[0].specifications).toEqual({ "الحجم": "صغير" });
    expect(JSON.stringify(products[0])).not.toContain("الموديل");
    expect(JSON.stringify(products[0])).not.toContain("XY-180");
  });
});
