import { describe, expect, it } from "vitest";
import {
  buildHomeStructuredData,
  buildProductStructuredData,
} from "../api/_seo-structured-data.js";
import { renderSeoPreviewShell } from "../api/_seo-preview-shell.js";
import {
  canonicalGuidePath,
  resolveGuidePage,
} from "../api/_canonical-guides.js";
import {
  canonicalProductCategory,
  categoryProductsPath,
} from "../shared/seo-contract.js";

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
    { id: "small", label: "صغير", price: 15000, stock: 5, sku: "FILTER-S" },
    { id: "large", label: "كبير", price: 25000, stock: 7, sku: "FILTER-L" },
  ],
};

describe("production SEO/AEO/GEO contract", () => {
  it("uses one selectable Offer instead of an invalid AggregateOffer for variants", () => {
    const schemas = buildProductStructuredData(variantProduct) as Array<Record<string, any>>;
    const product = schemas[0];

    expect(product.offers).toMatchObject({
      "@type": "Offer",
      price: "15000",
      priceCurrency: "IQD",
      availability: "https://schema.org/InStock",
    });
    expect(product.offers.shippingDetails.shippingRate).toMatchObject({
      value: 5000,
      currency: "IQD",
    });
    expect(product.offers.shippingDetails.deliveryTime.transitTime.maxValue).toBe(1);
    expect(JSON.stringify(product)).not.toContain("AggregateOffer");
    expect(JSON.stringify(product)).not.toContain("ProductGroup");
    expect(JSON.stringify(product.additionalProperty)).toContain("كبير");
  });

  it("describes an online store without fake physical geo or map data", () => {
    const schemas = buildHomeStructuredData([variantProduct]) as Array<Record<string, any>>;
    const store = schemas[0];
    const serialized = JSON.stringify(store);

    expect(store["@type"]).toBe("OnlineStore");
    expect(store.legalName).toContain("AL NABEA SHOP");
    expect(store.paymentAccepted).toBe("Cash on Delivery");
    expect(store.contactPoint.hoursAvailable.opens).toBe("00:00");
    expect(serialized).not.toContain("GeoCoordinates");
    expect(serialized).not.toContain("hasMap");
    expect(serialized).not.toContain("LocalBusiness");
  });

  it("renders crawlable Arabic categories, filters, and product anchors", () => {
    const html = renderSeoPreviewShell({
      kind: "products",
      products: [variantProduct],
      category: "الفلترة والتنقية",
    });

    expect(html).toContain("<h1>منتجات الفلترة والتنقية</h1>");
    expect(html).toContain('href="/products/filter-pro"');
    expect(html).not.toContain("category=filters");
  });

  it("normalizes legacy product categories to database categories", () => {
    expect(canonicalProductCategory("filters")).toBe("الفلترة والتنقية");
    expect(canonicalProductCategory("treatments")).toBe("معالجة المياه");
    expect(categoryProductsPath("maintenance")).toContain(encodeURIComponent("الصيانة والتنظيف"));
  });

  it("canonicalizes legacy guide URLs and their internal category links", () => {
    expect(canonicalGuidePath("/guides/aquarium-filter-guide")).toBe("/guides/filter-choice");
    const resolved = resolveGuidePage("/guides/filter-choice");
    expect(resolved?.canonicalPath).toBe("/guides/filter-choice");
    expect(JSON.stringify(resolved?.page)).not.toContain("category=filters");
    expect(JSON.stringify(resolved?.page)).toContain(encodeURIComponent("الفلترة والتنقية"));
  });
});
