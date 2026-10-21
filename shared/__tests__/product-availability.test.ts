import { describe, expect, it } from "vitest";
import { isProductComingSoon } from "../product-availability";

const marker = { __availabilityStatus: "coming_soon" };

describe("explicit incoming product presentation", () => {
  it("requires the exact marker and confirmed zero stock", () => {
    expect(isProductComingSoon({ stock: 0, specifications: marker })).toBe(true);
    expect(isProductComingSoon({ stock: "0", specifications: marker })).toBe(true);
    expect(isProductComingSoon({ stock: 0 })).toBe(false);
    expect(isProductComingSoon({ stock: 0, specifications: { __availabilityStatus: "sold_out" } })).toBe(false);
    expect(isProductComingSoon({ stock: 0, specifications: { __availabilityStatus: "COMING_SOON" } })).toBe(false);
    expect(isProductComingSoon(null)).toBe(false);
  });

  it.each([undefined, null, "", " ", "unknown", NaN, Infinity, -1, 1, "2", false])(
    "does not announce incoming availability for unknown or nonzero stock %s",
    (stock) => expect(isProductComingSoon({ stock, specifications: marker })).toBe(false),
  );

  it.each([null, [], "coming_soon", 3])("handles malformed specifications %s", (specifications) => {
    expect(isProductComingSoon({ stock: 0, specifications })).toBe(false);
  });

  it("uses all active options and lets any stocked option override the marker", () => {
    const product = { stock: 0, hasVariants: true, specifications: marker };
    expect(isProductComingSoon({ ...product, variants: [{ stock: 0 }, { stock: "0" }] })).toBe(true);
    expect(isProductComingSoon({ ...product, variants: [{ stock: 0 }, { stock: 2 }] })).toBe(false);
    expect(isProductComingSoon({ ...product, stock: 2, variants: [{ stock: 0 }] })).toBe(false);
    expect(isProductComingSoon({ ...product, variants: [{ stock: 0 }, {}] })).toBe(false);
    expect(isProductComingSoon({ ...product, variants: [] })).toBe(false);
    expect(isProductComingSoon({ ...product, variants: null })).toBe(false);
  });

  it("ignores inactive historical option JSON on simple products", () => {
    expect(isProductComingSoon({
      stock: 0, hasVariants: false, variants: [{ stock: 9 }], specifications: marker,
    })).toBe(true);
  });

  it("never changes commercial fields or specifications", () => {
    const product = Object.freeze({
      stock: 0,
      price: "12345",
      originalPrice: "15678",
      hasVariants: true,
      variants: Object.freeze([
        Object.freeze({ id: "small", price: "12345", stock: 0 }),
        Object.freeze({ id: "large", price: "17000", stock: 0 }),
      ]),
      specifications: Object.freeze({ ...marker, "المقاسات القادمة": "30 سم" }),
    });
    const before = JSON.stringify(product);
    expect(isProductComingSoon(product)).toBe(true);
    expect(JSON.stringify(product)).toBe(before);
  });
});
