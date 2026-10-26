import { describe, expect, it } from "vitest";
import { getProductPriceDisplay, getPublicProductPriceRange } from "../public-price";

describe("single public product price contract", () => {
  it("treats zero, missing, pending and invalid prices as unpublished", () => {
    for (const price of [0, "0", "", null, undefined, "-20", "bad", Infinity]) {
      expect(getPublicProductPriceRange({ price })).toBeNull();
      expect(getProductPriceDisplay({ price }).price).toBeNull();
    }
    expect(getPublicProductPriceRange({ price: "9000", priceStatus: "pending" })).toBeNull();
  });

  it("uses a saleable option over a cheaper unavailable option for every representation", () => {
    const product = { hasVariants: true, variants: [
      { price: "1000", stock: "0" },
      { price: "7000", stock: 2 },
      { price: "9000", stock: 4 },
      { price: "2000", stock: 2, priceStatus: "pending" },
      { price: "3000", stock: 3, availabilityStatus: "coming_soon" },
    ] };
    expect(getPublicProductPriceRange(product)).toEqual({ min: 7000, max: 9000 });
    expect(getProductPriceDisplay(product)).toMatchObject({ price: 7000, isFromPrice: true });
  });

  it("does not advertise an archived or pending option or borrow a parent price", () => {
    expect(getPublicProductPriceRange({ hasVariants: true, price: 1000, variants: [
      { price: 2500, stock: 1, isArchived: true },
      { price: 4500, stock: 1, priceStatus: "pending" },
    ] })).toBeNull();
    expect(getProductPriceDisplay({ price: 12000, originalPrice: 18000 })).toMatchObject({
      price: 12000, originalPrice: 18000, savings: 6000,
    });
  });
});
