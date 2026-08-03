import { describe, expect, it } from "vitest";
import { renderSeoPreviewShell, type SeoPreviewProduct } from "../_seo-preview-shell.js";

const products: SeoPreviewProduct[] = [
  {
    id: "p1",
    slug: "aquavo-test-filter",
    name: "فلتر اختبار AQUAVO",
    description: "فلتر تجريبي لحوض 60 لتر.",
    price: 25000,
    currency: "IQD",
    category: "filters",
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
    category: "heaters",
    stock: 0,
  },
];

describe("SEO preview shell", () => {
  it("renders a crawlable product collection with real anchors", () => {
    const html = renderSeoPreviewShell({ kind: "products", products });

    expect(html).toContain("<h1>جميع مستلزمات أحواض الزينة في العراق</h1>");
    expect(html).toContain('href="/products/aquavo-test-filter"');
    expect(html).toContain('href="/products/aquavo-test-heater"');
    expect(html).toContain('href="/products?category=filters"');
    expect(html).toContain("متوفر");
    expect(html).toContain("غير متوفر حالياً");
  });

  it("renders semantic product facts, breadcrumbs, and related links", () => {
    const html = renderSeoPreviewShell({
      kind: "product",
      product: products[0],
      related: [products[1]],
    });

    expect(html).toContain('itemType="https://schema.org/Product"');
    expect(html).toContain('<h1 itemProp="name">فلتر اختبار AQUAVO</h1>');
    expect(html).toContain("25,000");
    expect(html).toContain('href="/products"');
    expect(html).toContain('href="/products/aquavo-test-heater"');
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
