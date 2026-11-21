import { describe, expect, it } from "vitest";
import { productListingUrl, readListingUrlFilters } from "../product-listing-url";

describe("shareable product filters", () => {
  it("round trips multiple facets while preserving the search and attribution", () => {
    const filters = { priceRange: [100, 120] as [number, number], categories: ["الفلترة والتنقية", "التهوية والأكسجين"], brands: ["YEE"], difficulties: ["easy"], tags: ["in-stock"] };
    const url = productListingUrl("search=filter&campaign=guide&food=betta", { filters, sortBy: "price-asc", foodFilter: "all" }, 0, 1000000);
    const search = url.split("?")[1];
    expect(readListingUrlFilters(search)).toEqual(filters);
    const params = new URLSearchParams(search);
    expect(params.get("search")).toBe("filter");
    expect(params.get("campaign")).toBe("guide");
    expect(params.get("sort")).toBe("price-asc");
    expect(params.has("food")).toBe(false);
  });

  it("ignores malformed and reversed price ranges", () => {
    expect(readListingUrlFilters("minPrice=NaN&maxPrice=-1").priceRange).toEqual([0, 1000000]);
    expect(readListingUrlFilters("minPrice=1000&maxPrice=100").priceRange).toEqual([0, 1000000]);
  });
});
