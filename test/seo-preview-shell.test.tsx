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
import { PRERENDERED_PAGES } from "../api/_prerendered-pages.js";
import { resolveGuidePage } from "../api/_canonical-guides.js";
import { AQUAVO_ENTITY } from "../shared/seo-contract.js";
import { preservePublicEmailHtml } from "../shared/public-email-html.js";

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
  it.each(["/contact", "/privacy-policy", "/terms"])(
    "keeps every published support email usable in the initial %s HTML",
    (path) => {
      const prerendered = PRERENDERED_PAGES[path];
      expect(prerendered).toContain('href="mailto:info@aquavoiq.com"');
      const html = renderSeoPreviewShell({
        kind: "static",
        path,
        heading: "AQUAVO",
        summary: "معلومات AQUAVO",
        paragraphs: path === "/contact" ? ["البريد الرسمي: " + AQUAVO_ENTITY.email + "."] : [],
        prerendered,
      });
      const protectedMarkup = html.match(/<!--email_off-->[\s\S]*?<!--\/email_off-->/g) || [];

      expect(protectedMarkup.some((markup) => markup.includes('href="mailto:info@aquavoiq.com"'))).toBe(true);
      expect(html.replace(/<!--email_off-->[\s\S]*?<!--\/email_off-->/g, "")).not.toContain(AQUAVO_ENTITY.email);
      // Comments do not alter the original anchor classes, accessibility
      // attributes, SVG icons or visible text from the page component.
      expect(html.replace(/<!--\/?email_off-->/g, "")).toContain(prerendered);
      expect(html).not.toContain("&lt;!--email_off--&gt;");
    },
  );

  it("exempts only the exact public address without rewriting attributes or raw-text elements", () => {
    const anchor = '<a class="email-button" aria-label="Email AQUAVO" href="mailto:info@aquavoiq.com?subject=Help"><span>info@aquavoiq.com</span></a>';
    const other = '<a href="mailto:customer@example.com">customer@example.com</a>';
    const attributes = '<p data-email="info@aquavoiq.com">customer+info@aquavoiq.com info@aquavoiq.com.example</p>';
    const rawText = '<script type="application/ld+json">{"email":"info@aquavoiq.com"}</script><style>.x::after{content:"info@aquavoiq.com"}</style>';
    const original = anchor + other + attributes + rawText + "<p>البريد: info@aquavoiq.com.</p>";
    const expected = "<!--email_off-->" + anchor + "<!--/email_off-->" + other + attributes + rawText
      + "<p>البريد: <!--email_off-->info@aquavoiq.com<!--/email_off-->.</p>";

    expect(preservePublicEmailHtml(original)).toBe(expected);
    expect(preservePublicEmailHtml(expected)).toBe(expected);
  });

  it("sends the beginner-mistakes guide CTA to the existing bundles page", () => {
    const guide = resolveGuidePage("/guides/5-mistakes");
    expect(guide?.page.cta).toMatchObject({
      href: "/bundles",
      label: "تصفح باقات البداية",
    });
  });

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

  it.each(["Houyi", "AQUAVO"])("renders %s as a nested Brand with the unchanged product name", (brand) => {
    const product = { ...products[0], brand };
    const html = renderSeoPreviewShell({ kind: "product", product, related: [] });
    const document = new DOMParser().parseFromString(html, "text/html");
    const productItem = document.querySelector('article[itemtype="https://schema.org/Product"]');
    const brandItem = productItem?.querySelector('[itemprop="brand"]');

    // A bare text value here caused Ahrefs to reject the Product microdata,
    // even while the separately emitted Product JSON-LD was valid.
    expect(brandItem?.hasAttribute("itemscope")).toBe(true);
    expect(brandItem?.getAttribute("itemtype")).toBe("https://schema.org/Brand");
    const brandName = brandItem?.querySelector('[itemprop="name"]');
    expect(brandName?.textContent).toBe(brand);
    expect(brandName?.closest("[itemscope]")).toBe(brandItem);
    expect(productItem?.querySelector('h1[itemprop="name"]')?.textContent).toBe(product.name);
    expect(brandItem?.textContent).toBe(brand);
    expect(buildProductStructuredData(product)[0]).toMatchObject({
      brand: { "@type": "Brand", name: brand },
    });
  });

  it("does not invent a brand microdata entity for an unbranded product", () => {
    const html = renderSeoPreviewShell({ kind: "product", product: products[1], related: [] });
    const document = new DOMParser().parseFromString(html, "text/html");
    expect(document.querySelector('[itemprop="brand"]')).toBeNull();
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
    // The crawler FAQ used to be its own six questions, separate from the
    // eleven on the customer-facing /faq page. Both now render
    // shared/faq-content.ts, so a crawler is shown the FAQ a customer is shown
    // — which is why the wording asserted here is the customer wording.
    expect((html.match(/<details>/g) || []).length).toBeGreaterThanOrEqual(11);
    expect(html).toContain("وين يوصل AQUAVO؟");
    expect(html).toContain("شلون أختار الفلتر المناسب؟");
    expect(html).toContain("شلون أدفع؟");
  });

  it("renders a crawlable not-found page", () => {
    const html = renderSeoPreviewShell({ kind: "not-found", path: "/missing" });

    expect(html).toContain("<h1>الصفحة غير موجودة</h1>");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/products"');
  });
});
