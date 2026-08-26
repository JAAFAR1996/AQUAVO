import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";

/**
 * The `Accept: text/markdown` representation must not be worse than the HTML.
 *
 * It exists for LLM fetchers, and it used to lose the very facts an agent
 * would want. Verified on production before this change:
 *
 *   $ curl -H 'Accept: text/markdown' .../products/houyi-thermostat | grep -c 6985
 *   0                       # the price was simply absent
 *   $ curl -H 'Accept: text/markdown' .../faq | wc -c
 *   202                     # a title and one line; none of the six Q&As
 *
 * So the contract pinned here is factual parity: whatever the HTML states
 * about price, stock, variants and body content, the markdown states too.
 */

const VARIANT_PRODUCT = {
  id: "houyi-heater",
  slug: "houyi-heater",
  name: "سخان حوض",
  description: "سخان بمنظّم حرارة داخلي مناسب لأحواض الزينة، مع مؤشر تشغيل.",
  price: "12000",
  originalPrice: null,
  currency: "IQD",
  brand: "Houyi",
  category: "التدفئة",
  stock: 6,
  thumbnail: "/images/p.webp",
  images: ["/images/p.webp"],
  hasVariants: true,
  variants: [
    { id: "v50", label: "50 واط", price: "12000", stock: 4, isDefault: true },
    { id: "v100", label: "100 واط", price: "15000", stock: 0 },
  ],
  rating: "0",
  reviewCount: 0,
  specifications: {},
};

const PLAIN_PRODUCT = {
  ...VARIANT_PRODUCT,
  id: "houyi-thermostat",
  slug: "houyi-thermostat",
  name: "ميزان حرارة رقمي",
  description: "مقياس حرارة رقمي بمستشعر سلكي يوضع داخل ماء الحوض وشاشة تبقى خارجه.",
  price: "6985",
  brand: "Houyi",
  category: "الفحص والمراقبة",
  stock: 12,
  hasVariants: false,
  variants: null,
};

const BLOG_ROW = {
  slug: "best-aquarium-filters-iraq",
  title: "أفضل أنواع فلاتر أحواض الأسماك",
  excerpt: "مقارنة عملية بين أنواع الفلاتر.",
  content: "<h3>الخلاصة</h3><p>اختر الفلتر حسب حجم الحوض والحمل الحيوي.</p>",
  category: "معدات",
  author: "AQUAVO Team",
  readTime: "7 دقائق",
  imageUrl: "/images/blog/filters.png",
  publishedAt: new Date("2026-03-08T00:00:00.000Z"),
  updatedAt: new Date("2026-04-01T00:00:00.000Z"),
};

const PRODUCTS: Record<string, unknown> = {
  [PLAIN_PRODUCT.slug]: PLAIN_PRODUCT,
  [VARIANT_PRODUCT.slug]: VARIANT_PRODUCT,
};

vi.mock("@neondatabase/serverless", () => ({
  neonConfig: {},
  Pool: vi.fn().mockImplementation(function FakePool() {
    return {
      query: vi.fn(async (sql: string, values?: unknown[]) => {
        if (sql.includes("FROM products")) {
          const slug = typeof values?.[0] === "string" ? values[0] : null;
          if (slug) return { rows: PRODUCTS[slug] ? [PRODUCTS[slug]] : [] };
          return { rows: [PLAIN_PRODUCT, VARIANT_PRODUCT] };
        }
        if (sql.includes("FROM blog_posts")) {
          const slug = typeof values?.[0] === "string" ? values[0] : null;
          if (slug) return { rows: slug === BLOG_ROW.slug ? [BLOG_ROW] : [] };
          return { rows: [BLOG_ROW] };
        }
        return { rows: [] };
      }),
    };
  }),
}));

process.env.DATABASE_URL ||= "postgres://u:p@localhost:5432/db";

import handler from "../../api/_ssr-preview-source";

async function md(url: string): Promise<{ body: string; contentType: string }> {
  let body = "";
  const headers: Record<string, string> = {};
  const response = {
    setHeader: vi.fn((k: string, v: unknown) => {
      headers[k.toLowerCase()] = String(v);
    }),
    status: vi.fn(() => response),
    send: vi.fn((v: unknown) => {
      body = String(v);
      return response;
    }),
    end: vi.fn((v?: unknown) => {
      if (v !== undefined) body = String(v);
      return response;
    }),
  };
  await handler(
    {
      url,
      headers: { accept: "text/markdown", host: "www.aquavoiq.com", "user-agent": "GPTBot/1.0" },
    } as unknown as VercelRequest,
    response as unknown as VercelResponse,
  );
  return { body, contentType: headers["content-type"] ?? "" };
}

describe("product markdown carries the facts the HTML carries", () => {
  it("states the price — the single thing it used to omit", async () => {
    const { body } = await md("/products/houyi-thermostat");
    // 6,985 formatted for ar-IQ, as the page itself formats it.
    expect(body).toMatch(/٦٬٩٨٥|6,985|6٬985/);
    expect(body).toContain("د.ع");
  });

  it("states availability and category", async () => {
    const { body } = await md("/products/houyi-thermostat");
    expect(body).toContain("التوفر:");
    expect(body).toContain("متوفر");
    expect(body).toContain("الفحص والمراقبة");
  });

  it("states the brand and the real delivery fee", async () => {
    const { body } = await md("/products/houyi-thermostat");
    expect(body).toContain("Houyi");
    // 5,000 IQD flat across Iraq — the real published rate.
    expect(body).toMatch(/٥٬٠٠٠|5,000|5٬000/);
  });

  it("carries the full description, not the truncated meta snippet", async () => {
    const { body } = await md("/products/houyi-thermostat");
    expect(body).toContain("وشاشة تبقى خارجه");
  });

  it("lists every option with its own price and stock", async () => {
    const { body } = await md("/products/houyi-heater");
    expect(body).toContain("50 واط");
    expect(body).toContain("100 واط");
    expect(body).toMatch(/١٥٬٠٠٠|15,000|15٬000/);
    // The 100W option has zero stock and must not be presented as available.
    const line = body.split("\n").find((l) => l.includes("100 واط")) ?? "";
    expect(line).toContain("غير متوفر");
  });

  it("serves it as markdown", async () => {
    const { contentType } = await md("/products/houyi-thermostat");
    expect(contentType).toContain("text/markdown");
  });
});

describe("FAQ markdown contains the actual questions and answers", () => {
  it("is no longer a title and a single line", async () => {
    const { body } = await md("/faq");
    // The old response was 202 bytes with zero Q&As.
    expect(body.length).toBeGreaterThan(800);
  });

  it("carries every question the page renders, each with its answer", async () => {
    const { body } = await md("/faq");
    // The same eleven questions shared/faq-content.ts gives the /faq page.
    expect(body).toContain("وين يوصل AQUAVO؟");
    expect(body).toContain("شلون أدفع؟");
    expect(body).toContain("هل دعم AQUAVO متوفر طول اليوم؟");
    // …and the answers, not just the headings.
    expect(body).toContain("24/7");
    expect(body).toContain("نوصل لكل العراق خلال 24 ساعة");
  });

  it("keeps the truthful no-live-animals answer", async () => {
    const { body } = await md("/faq");
    expect(body).toContain("ما نبيع أسماك حية، كائنات حية، أو نباتات مائية حية");
  });

  it("states both payment methods, matching the live checkout", async () => {
    const { body } = await md("/faq");
    // Al-Qaseh online payment is live alongside cash on delivery; the FAQ says
    // so, and adds that AQUAVO itself stores no card data.
    expect(body).toContain("نقداً عند الاستلام");
    expect(body).toContain("إلكترونياً");
    expect(body).toContain("ما يخزنها AQUAVO");
  });
});

describe("article markdown contains the article", () => {
  it("carries the body text, not just the title", async () => {
    const { body } = await md("/blog/best-aquarium-filters-iraq");
    expect(body).toContain("اختر الفلتر حسب حجم الحوض");
  });

  it("attributes the author and section", async () => {
    const { body } = await md("/blog/best-aquarium-filters-iraq");
    expect(body).toContain("AQUAVO Team");
    expect(body).toContain("معدات");
  });

  it("strips markup rather than emitting raw HTML", async () => {
    const { body } = await md("/blog/best-aquarium-filters-iraq");
    expect(body).not.toContain("<p>");
    expect(body).not.toContain("<h3>");
  });
});

describe("listing markdown is usable without following every link", () => {
  it("gives each product a price and a stock state", async () => {
    const { body } = await md("/products");
    const line = body.split("\n").find((l) => l.includes("ميزان حرارة رقمي")) ?? "";
    expect(line).toContain("](https://www.aquavoiq.com/products/houyi-thermostat)");
    expect(line).toMatch(/د\.ع/);
    expect(line).toMatch(/متوفر/);
  });

  it("lists blog posts with their excerpts", async () => {
    const { body } = await md("/blog");
    expect(body).toContain("أفضل أنواع فلاتر أحواض الأسماك");
    expect(body).toContain("مقارنة عملية بين أنواع الفلاتر");
  });
});

describe("about markdown states the business truth", () => {
  it("says there is no physical shop, and sells no live animals", async () => {
    const { body } = await md("/about");
    expect(body).toContain("لا يوجد محل لاستقبال الزبائن");
    expect(body).toContain("لا يبيع أسماكاً أو كائنات أو نباتات حية");
  });

  it("invents no storefront address or opening hours", async () => {
    const { body } = await md("/about");
    expect(body).not.toMatch(/شارع|street/i);
    expect(body).toContain("24/7");
  });
});
