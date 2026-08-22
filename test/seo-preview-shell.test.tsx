import { describe, expect, it } from "vitest";
import {
  deriveProductCategories,
  renderSeoPreviewShell,
  type SeoPreviewProduct,
} from "../api/_seo-preview-shell.js";
import {
  buildCollectionStructuredData,
  buildProductStructuredData,
} from "../api/_seo-structured-data.js";

const products: SeoPreviewProduct[] = [
  {
    id: "p1",
    slug: "aquavo-test-filter",
    name: "فلتر اختبار AQUAVO",
    description: "فلتر تجريبي لحوض 60 لتر.",
    price: 25000,
    currency: "IQD",
    category: "الفلترة والتنقية",
    brand: "AQUAVO",
    stock: 4,
  },
  {
    id: "p2",
    slug: "aquavo-test-heater",
    name: "سخان اختبار AQUAVO",
    description: "سخان تجريبي.",
    price: 18000,
    currency: "IQD",
    category: "التحكم بالحرارة",
    stock: 0,
  },
  {
    id: "p3",
    slug: "aquavo-variant-light",
    name: "إضاءة متعددة القياسات",
    description: "إضاءة تحتوي خيارات متعددة.",
    price: 20000,
    currency: "IQD",
    category: "الإضاءة",
    brand: "YEE",
    stock: 5,
    hasVariants: true,
    variants: [
      { id: "30cm", label: "30 سم", price: 20000, stock: 3, sku: "LIGHT-30" },
      { id: "60cm", label: "60 سم", price: 35000, stock: 2, sku: "LIGHT-60" },
    ],
  },
];

describe("SEO preview shell", () => {
  it("renders a crawlable product collection with database-shaped Arabic categories", () => {
    const html = renderSeoPreviewShell({ kind: "products", products });

    expect(html).toContain("<h1>جميع مستلزمات أحواض الزينة في العراق</h1>");
    expect(html).toContain('href="/products/aquavo-test-filter"');
    expect(html).toContain('href="/products/aquavo-test-heater"');
    expect(html).toContain('category=%D8%A7%D9%84%D9%81%D9%84%D8%AA%D8%B1%D8%A9%20%D9%88%D8%A7%D9%84%D8%AA%D9%86%D9%82%D9%8A%D8%A9');
    expect(html).not.toContain("category=filters");
    expect(html).toContain("متوفر");
    expect(html).toContain("غير متوفر حالياً");
  });

  it("derives categories from the product source of truth", () => {
    const categories = deriveProductCategories([
      ...products,
      { ...products[0], id: "p4", slug: "filter-two" },
    ]);

    expect(categories[0]).toEqual({ name: "الفلترة والتنقية", count: 2 });
    expect(categories.map((category) => category.name)).toEqual([
      "الفلترة والتنقية",
      "الإضاءة",
      "التحكم بالحرارة",
    ]);
  });

  it("renders semantic product facts, breadcrumbs, related links, and visible variants", () => {
    const html = renderSeoPreviewShell({
      kind: "product",
      product: products[2],
      related: [products[1]],
    });

    expect(html).toContain('itemType="https://schema.org/Product"');
    expect(html).toContain('<h1 itemProp="name">إضاءة متعددة القياسات</h1>');
    expect(html).toContain("من");
    expect(html).toContain("30 سم");
    expect(html).toContain("60 سم");
    expect(html).toContain('href="/products"');
    expect(html).toContain('href="/products/aquavo-test-heater"');
  });

  it("builds ProductGroup markup with explicit nested variants and offers", () => {
    const schemas = buildProductStructuredData(products[2]) as Array<Record<string, any>>;
    const group = schemas[0] as Record<string, any>;

    expect(group["@type"]).toBe("ProductGroup");
    expect(group.productGroupID).toBe("p3");
    expect(group.variesBy).toContain("https://schema.org/size");
    expect(group.hasVariant).toHaveLength(2);
    expect(group.hasVariant[0]["@type"]).toBe("Product");
    expect(group.hasVariant[0].sku).toBe("LIGHT-30");
    expect(group.hasVariant[0].inProductGroupWithID).toBe("p3");
    expect(group.hasVariant[0].size).toBe("30 سم");
    expect(group.hasVariant[0].offers["@type"]).toBe("Offer");
    expect(group.hasVariant[0].offers.price).toBe("20000");
    expect(group.hasVariant[1].offers.price).toBe("35000");
    expect(JSON.stringify(group.hasVariant)).toContain("60 سم");
    expect((schemas[1] as Record<string, any>).mainEntity["@id"]).toContain("#product-group");
  });

  it("keeps simple products as Product markup", () => {
    const schemas = buildProductStructuredData(products[0]) as Array<Record<string, any>>;
    const product = schemas[0] as Record<string, any>;

    expect(product["@type"]).toBe("Product");
    expect(product.offers["@type"]).toBe("Offer");
    expect(product.offers.price).toBe("25000");
    expect(product.offers.priceCurrency).toBe("IQD");
  });

  it("builds a collection ItemList containing every product and real categories", () => {
    const schemas = buildCollectionStructuredData(products) as Array<Record<string, any>>;
    const collection = schemas[0];

    expect(collection.mainEntity.numberOfItems).toBe(3);
    expect(collection.mainEntity.itemListElement).toHaveLength(3);
    expect(JSON.stringify(collection.about)).toContain("الفلترة والتنقية");
    expect(JSON.stringify(collection.about)).not.toContain("filters");
  });

  it("renders answer-first FAQ content in the initial HTML", () => {
    const html = renderSeoPreviewShell({ kind: "faq" });

    expect(html).toContain("<h1>الأسئلة الشائعة عن AQUAVO وأحواض الزينة</h1>");
    expect((html.match(/<details>/g) || []).length).toBeGreaterThanOrEqual(6);
    expect(html).toContain("هل AQUAVO يوصّل لكل العراق؟");
    expect(html).toContain("شلون أختار الفلتر المناسب؟");
  });

  it("renders a crawlable not-found page", () => {
    const html = renderSeoPreviewShell({ kind: "not-found", path: "/missing" });

    expect(html).toContain("<h1>الصفحة غير موجودة</h1>");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/products"');
  });
});
