import { describe, expect, it } from "vitest";
import { buildProductStructuredData, renderSemanticShell } from "../api/ssr-preview";

const variantProduct = {
  id: "product-1",
  slug: "filter-pro",
  name: "فلتر احترافي",
  description: "فلتر لحوض الزينة",
  currency: "IQD",
  category: "الفلترة والتنقية",
  stock: 12,
  hasVariants: true,
  variants: [
    { label: "صغير", price: 15000, stock: 5 },
    { label: "كبير", price: 25000, stock: 7 },
  ],
};

describe("production semantic SSR entry", () => {
  it("uses AggregateOffer for products with multiple prices", () => {
    const schema = buildProductStructuredData(variantProduct) as Record<string, any>;
    expect(schema.offers).toMatchObject({
      "@type": "AggregateOffer",
      lowPrice: "15000",
      highPrice: "25000",
      offerCount: 2,
      priceCurrency: "IQD",
    });
  });

  it("renders crawlable Arabic categories and product anchors", () => {
    const html = renderSemanticShell({ kind: "products", products: [variantProduct] });
    expect(html).toContain("<h1>جميع مستلزمات أحواض الزينة</h1>");
    expect(html).toContain("category=%D8%A7%D9%84%D9%81%D9%84%D8%AA%D8%B1%D8%A9%20%D9%88%D8%A7%D9%84%D8%AA%D9%86%D9%82%D9%8A%D8%A9");
    expect(html).toContain('href="/products/filter-pro"');
    expect(html).not.toContain("category=filters");
  });
});
