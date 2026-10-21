import { describe, expect, it } from "vitest";
import { renderSeoPreviewShell, productStockLabel, formatPrice, formatMoney, type SeoPreviewProduct } from "../../api/_seo-preview-shell";
import { buildProductStructuredData } from "../../api/_seo-structured-data";
import { toPublicProduct, findForbiddenFieldPaths } from "../../shared/public-product";
import { isProductComingSoon } from "../../shared/product-availability";

const incoming: SeoPreviewProduct = {
  id: "incoming-fixture", slug: "incoming-fixture", name: "فلتر للحوض",
  price: "17500", originalPrice: "20000", stock: 0, hasVariants: false,
  specifications: { __availabilityStatus: "coming_soon", "المقاسات القادمة": "30 سم" },
};

describe("incoming display metadata crosses public boundaries without changing offers", () => {
  it("preserves the marker and public prices while redacting private cost data", () => {
    const row = {
      ...incoming,
      hasVariants: true,
      variants: [{ id: "small", label: "صغير", price: "17500", stock: 0, costPrice: "999" }],
      costPrice: "888", costResolutionNote: "private",
    };
    const publicRow = toPublicProduct(row)!;
    expect(isProductComingSoon(publicRow)).toBe(true);
    expect(publicRow.price).toBe(row.price);
    expect(publicRow.originalPrice).toBe(row.originalPrice);
    expect(publicRow.variants).toEqual([{ id: "small", label: "صغير", price: "17500", stock: 0 }]);
    expect(findForbiddenFieldPaths(publicRow)).toEqual([]);
  });

  it("shows the incoming label on detail and listing SSR while hiding the marker key", () => {
    for (const page of [
      { kind: "product" as const, product: incoming, related: [] },
      { kind: "products" as const, products: [incoming] },
    ]) {
      const html = renderSeoPreviewShell(page);
      expect(html).toContain("قريبًا");
      expect(html).not.toContain("__availabilityStatus");
      expect(html).not.toContain("coming_soon");
    }
    const detail = renderSeoPreviewShell({ kind: "product", product: incoming, related: [] });
    expect(detail).toContain("المقاسات القادمة");
    expect(detail).toContain("30 سم");
  });

  it("keeps known-price JSON-LD OutOfStock and byte-equivalent with or without the marker", () => {
    const unmarked = { ...incoming, specifications: { "المقاسات القادمة": "30 سم" } };
    const schema = buildProductStructuredData(incoming);
    expect(schema).toEqual(buildProductStructuredData(unmarked));
    expect(JSON.stringify(schema)).toContain('"availability":"https://schema.org/OutOfStock"');
    expect(JSON.stringify(schema)).toContain('"price":"17500"');
    expect(JSON.stringify(schema)).not.toContain("PreOrder");
    expect(JSON.stringify(schema)).not.toContain("coming_soon");
  });

  it("keeps each existing variant price and stock in structured offers", () => {
    const product = {
      ...incoming, hasVariants: true,
      variants: [
        { id: "small", label: "صغير", price: "17500", stock: 0 },
        { id: "large", label: "كبير", price: "21000", stock: 0 },
      ],
    };
    const before = JSON.stringify(product);
    const schema = buildProductStructuredData(product);
    expect(schema).toEqual(buildProductStructuredData({ ...product, specifications: {} }));
    expect(JSON.stringify(schema).match(/https:\/\/schema.org\/OutOfStock/g)).toHaveLength(2);
    expect(JSON.stringify(product)).toBe(before);
  });

  it("does not create a sale offer for an incoming product with no sale price", () => {
    expect(buildProductStructuredData({ ...incoming, price: "0" })[0]).not.toHaveProperty("offers", expect.anything());
  });

  it("shows an unpublished-price message for incoming zero-price products without changing known or unmarked prices", () => {
    const unpriced = { ...incoming, price: "0", originalPrice: null };
    const before = JSON.stringify(unpriced);
    for (const page of [
      { kind: "product" as const, product: unpriced, related: [] },
      { kind: "products" as const, products: [unpriced] },
    ]) {
      const html = renderSeoPreviewShell(page);
      expect(html).toContain("السعر يحدد عند التوفر");
      expect(html).not.toContain(formatMoney(0));
    }
    expect(formatPrice(incoming)).toBe(formatMoney(17500));
    expect(formatPrice({ ...unpriced, specifications: {} })).toBe(formatMoney(0));
    expect(buildProductStructuredData(unpriced)[0]).not.toHaveProperty("offers", expect.anything());
    expect(JSON.stringify(unpriced)).toBe(before);
  });

  it("leaves unrelated sold-out and all stocked product labels unchanged", () => {
    expect(productStockLabel({ ...incoming, specifications: {} })).toBe("غير متوفر حالياً");
    expect(productStockLabel({ ...incoming, stock: 3 })).toBe("متوفر");
    expect(productStockLabel({ ...incoming, hasVariants: true, variants: [
      { label: "صغير", price: "17500", stock: 3 }, { label: "كبير", price: "21000", stock: 0 },
    ] })).toBe("متوفر");
  });
});
