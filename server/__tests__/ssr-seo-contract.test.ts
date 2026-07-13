import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";
import handler, {
  buildProductMetaDescription,
  buildProductMetaTitle,
  injectMeta,
} from "../../api/ssr-meta";

function request(url: string): VercelRequest {
  return { url, headers: { accept: "text/html" } } as unknown as VercelRequest;
}

async function render(url: string): Promise<string> {
  let body = "";
  const response = {
    setHeader: vi.fn(),
    status: vi.fn(() => response),
    send: vi.fn((value: unknown) => {
      body = String(value);
      return response;
    }),
    end: vi.fn(() => response),
  };
  await handler(request(url), response as unknown as VercelResponse);
  return body;
}

const PRELOAD_TEMPLATE = `
<head>
  <title>__META_TITLE__</title>
  <meta name="description" content="__META_DESCRIPTION__">
  <meta name="keywords" content="__META_KEYWORDS__">
  <link rel="canonical" href="__META_URL__">
  <link rel="preload" fetchpriority="high" as="image" href="/images/aquascape-styles/iwagumi_aquascape_1765676307763.webp">
  <!-- Open Graph / Facebook -->
  <meta property="og:title" content="__META_TITLE__">
  <meta property="og:description" content="__META_DESCRIPTION__">
  <meta property="og:type" content="__META_OG_TYPE__">
  <meta property="og:url" content="__META_URL__">
  <meta property="og:image" content="__META_IMAGE__">
  <meta name="twitter:title" content="__META_TITLE__">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <!--__JSON_LD__-->
</head>`;

describe("product metadata descriptions", () => {
  const product = { name: "فلتر YEE 600", brand: "YEE" };

  it("uses complete sentences from a long Arabic description without ellipsis", () => {
    const description = buildProductMetaDescription({
      ...product,
      description: "فلتر عملي يساعد على تدوير ماء الحوض بكفاءة. يأتي بتصميم مناسب للاستخدام اليومي داخل الحوض. هذا شرح إضافي طويل جداً لا يحتاج أن يدخل كله في مقتطف نتيجة البحث لأنه يتجاوز المساحة المناسبة للمقتطف.",
    });
    expect(description).toBe("فلتر عملي يساعد على تدوير ماء الحوض بكفاءة. يأتي بتصميم مناسب للاستخدام اليومي داخل الحوض.");
    expect(description).not.toMatch(/\.{2,}|…/);
  });

  it("normalizes multiline descriptions", () => {
    expect(buildProductMetaDescription({
      ...product,
      description: "فلتر عملي للحوض.\n\nيساعد على تدوير المي بصورة منتظمة.",
    })).toBe("فلتر عملي للحوض. يساعد على تدوير المي بصورة منتظمة.");
  });

  it("uses a factual complete fallback for missing or ellipsis-ended descriptions", () => {
    const missing = buildProductMetaDescription({ ...product, description: null, specifications: { model: "600" } });
    const truncated = buildProductMetaDescription({ ...product, description: "وصف قديم غير مكتمل..." });
    expect(missing).toContain("فلتر YEE 600");
    expect(missing).toMatch(/[.؟!]$/);
    expect(truncated).toContain("فلتر YEE 600");
    expect(truncated).not.toMatch(/\.{2,}|…/);
  });
});

describe("SEO metadata contracts", () => {
  it("does not duplicate a product brand or the AQUAVO site suffix", () => {
    expect(buildProductMetaTitle("فلتر YEE 600", "YEE")).toBe("فلتر YEE 600 | AQUAVO");
    expect(buildProductMetaTitle("فلتر YEE 600 | AQUAVO", "YEE")).toBe("فلتر YEE 600 | AQUAVO");
  });

  it("derives ItemList numberOfItems from the final list", async () => {
    const html = await render("/products");
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)]
      .map((match) => JSON.parse(match[1]) as { "@type"?: string; numberOfItems?: number; itemListElement?: unknown[] });
    const itemList = scripts.find((schema) => schema["@type"] === "ItemList");
    expect(itemList).toBeDefined();
    expect(itemList?.numberOfItems).toBe(itemList?.itemListElement?.length);
  });

  it("preloads only the route's relevant LCP image", () => {
    const base = {
      title: "عنوان",
      description: "وصف.",
      url: "https://www.aquavoiq.com/",
      image: "https://www.aquavoiq.com/brand/aquavo-v2-horizontal.png",
    };
    const home = injectMeta(PRELOAD_TEMPLATE, base);
    const product = injectMeta(PRELOAD_TEMPLATE, {
      ...base,
      url: "https://www.aquavoiq.com/products/yee-filter",
      image: "https://res.cloudinary.com/aquavo/product.webp",
      ogType: "product",
    });
    const other = injectMeta(PRELOAD_TEMPLATE, { ...base, url: "https://www.aquavoiq.com/shipping" });

    expect(home.match(/rel="preload"[^>]*as="image"/g)).toHaveLength(1);
    expect(home).toContain("iwagumi_aquascape");
    expect(product.match(/rel="preload"[^>]*as="image"/g)).toHaveLength(1);
    expect(product).toContain('href="https://res.cloudinary.com/aquavo/product.webp"');
    expect(product).not.toContain("iwagumi_aquascape");
    expect(other).not.toMatch(/rel="preload"[^>]*as="image"/);
    expect(other).not.toContain("iwagumi_aquascape");
  });
});
