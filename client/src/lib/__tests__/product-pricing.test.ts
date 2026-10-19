import { describe, expect, it } from "vitest";

import { getProductPriceDisplay } from "../product-pricing";

describe("product price display", () => {
  it("compares decimal API strings numerically without changing the sale price", () => {
    // Production regression: JavaScript's string comparison treats "9775" as
    // greater than "12100", advertising a negative saving on the product card.
    const product = Object.freeze({ price: "12100", originalPrice: "9775" });
    expect(getProductPriceDisplay(product)).toEqual({
      price: 12100,
      originalPrice: null,
      savings: null,
      isFromPrice: false,
    });
    expect(product).toEqual({ price: "12100", originalPrice: "9775" });

    expect(getProductPriceDisplay({ price: "9775.00", originalPrice: "12100.00" })).toEqual({
      price: 9775,
      originalPrice: 12100,
      savings: 2325,
      isFromPrice: false,
    });
  });

  it.each([12100, "12100.00", 9775, 0, -1, "", " ", null, undefined, "invalid", "15000 IQD", Infinity, "Infinity", NaN, true])(
    "does not advertise an equal, lower, or invalid reference price: %s",
    (originalPrice) => {
      expect(getProductPriceDisplay({ price: "12100", originalPrice })).toMatchObject({
        price: 12100,
        originalPrice: null,
        savings: null,
      });
    },
  );

  it.each([0, -1, "", " ", null, undefined, "invalid", "12100 IQD", Infinity, "Infinity", NaN, true])(
    "does not derive a purchasable price or saving from an invalid sale price: %s",
    (price) => {
      expect(getProductPriceDisplay({ price, originalPrice: 15000 })).toMatchObject({
        price: null,
        originalPrice: null,
        savings: null,
      });
    },
  );

  it("keeps the reference price in the same variant context as the displayed price", () => {
    const small = { price: "8000", originalPrice: "10000" };
    const large = { price: "15000" };
    const product = {
      price: "5000",
      originalPrice: "30000",
      hasVariants: true,
      variants: [small, large, { price: "invalid" }, { price: "Infinity" }],
    };

    // A list/quick view has no selected variant, so it shows the actual minimum
    // option price without pairing it with the parent's reference price.
    expect(getProductPriceDisplay(product)).toEqual({
      price: 8000,
      originalPrice: null,
      savings: null,
      isFromPrice: true,
    });
    expect(getProductPriceDisplay(product, small)).toEqual({
      price: 8000,
      originalPrice: 10000,
      savings: 2000,
      isFromPrice: false,
    });
    expect(getProductPriceDisplay(product, large)).toEqual({
      price: 15000,
      originalPrice: null,
      savings: null,
      isFromPrice: false,
    });
  });

  it("does not substitute the parent price when none of its required options has a valid price", () => {
    expect(getProductPriceDisplay({
      price: 5000,
      originalPrice: 10000,
      hasVariants: true,
      variants: [{ price: 0 }, { price: "invalid" }],
    })).toEqual({
      price: null,
      originalPrice: null,
      savings: null,
      isFromPrice: false,
    });
  });

  it("starts at an available option instead of a cheaper sold-out option", () => {
    // Current c2-1016: 400 ml is sold out; only 760 ml can be purchased.
    expect(getProductPriceDisplay({ hasVariants: true, variants: [
      { price: "12450", stock: "0" }, { price: "16450", stock: "8" },
    ] })).toMatchObject({ price: 16450, isFromPrice: true, originalPrice: null });
  });

  it("does not borrow a parent price when required variant data is absent", () => {
    expect(getProductPriceDisplay({ hasVariants: true, price: 5000, variants: [] }))
      .toEqual({ price: null, originalPrice: null, savings: null, isFromPrice: false });
  });
});
