import { describe, expect, it } from "vitest";
import { buildProductStructuredData, productGalleryImages } from "../api/_seo-structured-data.js";
import { formatPrice, getActiveVariants, isInStock, renderSeoPreviewShell, type SeoPreviewProduct } from "../api/_seo-preview-shell.js";

const product: SeoPreviewProduct = {
  id: "preview", slug: "preview", name: "رمل", price: 9999, stock: 12, hasVariants: true,
  images: ["https://example.com/mixed.jpg"],
  variants: [
    { id: "legacy", label: "قديم", isArchived: true, price: 3000, stock: 0 },
    { id: "red", label: "أحمر", price: null, stock: 0, priceStatus: "pending", availabilityStatus: "coming_soon", images: ["https://example.com/red.jpg"] },
    { id: "brown", label: "بني", price: null, stock: 0, priceStatus: "pending", availabilityStatus: "coming_soon", images: ["https://example.com/brown.jpg"] },
  ],
};

describe("preview-only option SEO", () => {
  it("never exposes archived prices or falls back to unrelated base retail", () => {
    expect(getActiveVariants(product).map((variant) => variant.id)).toEqual(["red", "brown"]);
    expect(formatPrice(product)).not.toContain("9,999");
    expect(formatPrice(product)).not.toContain("3,000");
    expect(formatPrice(product)).toBe("السعر غير منشور حالياً");
    expect(isInStock(product)).toBe(false);
    const schema = buildProductStructuredData(product)[0] as { hasVariant: Array<{ offers?: unknown; image?: string[]; name: string }> };
    expect(schema.hasVariant).toHaveLength(2);
    expect(schema.hasVariant.every((variant) => variant.offers === undefined)).toBe(true);
    expect(schema.hasVariant[0].image).toEqual(["https://example.com/red.jpg"]);
    expect(schema.hasVariant[1].image).toEqual(["https://example.com/brown.jpg"]);
  });

  it("shows pending labels and only one type's preview gallery before selection", () => {
    expect(productGalleryImages(product)).toEqual(["https://example.com/red.jpg"]);
    const html = renderSeoPreviewShell({ kind: "product", product, related: [] });
    expect(html).toContain("السعر يحدد لاحقا");
    expect(html).not.toContain("mixed.jpg");
    expect(html).not.toContain("brown.jpg");
    expect(html).not.toContain("قديم");
  });

  it("keeps an explicitly empty verified gallery empty instead of borrowing photos", () => {
    expect(productGalleryImages({ ...product, variants: [{ id: "unknown", label: "غير مصور", images: [], price: null, stock: 0 }] })).toEqual([]);
  });

  it("never offers an archived-only legacy product at the parent price", () => {
    const archived = { ...product, variants: [product.variants![0]] };
    expect((buildProductStructuredData(archived)[0] as { offers?: unknown }).offers).toBeUndefined();
    expect(isInStock(archived)).toBe(false);
  });
});
