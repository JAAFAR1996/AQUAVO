import type { VercelRequest, VercelResponse } from "@vercel/node";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * /deals showed a visitor 722 words of real offers and a crawler 17. The page
 * fetches every product at runtime and keeps the ones whose original price is
 * above the current price, so none of it reached the HTML.
 *
 * The crawler route now applies that same rule to the products table it already
 * reads. Nothing about a price is computed or restated: the row's own price and
 * original price are printed, and a product only appears when the database says
 * it is discounted.
 *
 * The important safety property is the empty case. If nothing is on sale the
 * page must not claim otherwise, so it falls back to its summary instead of
 * announcing an empty or zero-count offer list.
 */

const QUERY = vi.fn();
vi.mock("@neondatabase/serverless", () => ({
  neonConfig: {},
  Pool: class {
    query = QUERY;
  },
}));

process.env.DATABASE_URL ??= "postgres://user:pass@localhost:5432/db";

const DISCOUNTED = [
  {
    id: "p1",
    slug: "sponge-filter",
    name: "فلتر إسفنجي هوائي بتيار لطيف",
    description: "فلتر إسفنجي مناسب للروبيان وصغار الأسماك.",
    price: "3000",
    originalPrice: "4025",
    currency: "IQD",
    category: "الفلترة والتنقية",
    stock: 5,
    images: [],
    variants: [],
  },
  {
    id: "p2",
    slug: "aquasoil",
    name: "تربة أكواسكيب للنباتات المائية",
    description: "ركيزة مصممة للنباتات المائية.",
    price: "6498",
    originalPrice: "8798",
    currency: "IQD",
    category: "تربة وديكور",
    stock: 3,
    images: [],
    variants: [],
  },
];

async function crawl(path: string): Promise<{ html: string; status: number }> {
  const handler = (await import("../../api/_ssr-preview-source")).default;
  let html = "";
  let status = 200;
  const response = {
    setHeader: vi.fn(),
    status: vi.fn((code: number) => {
      status = code;
      return response;
    }),
    send: vi.fn((value: unknown) => {
      html = String(value);
      return response;
    }),
    end: vi.fn((value?: unknown) => {
      if (value !== undefined) html = String(value);
      return response;
    }),
  };
  const req = {
    url: path,
    headers: {
      accept: "text/html",
      host: "www.aquavoiq.com",
      "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    },
  } as unknown as VercelRequest;
  await (handler as (q: VercelRequest, r: VercelResponse) => Promise<void>)(
    req,
    response as unknown as VercelResponse,
  );
  return { html, status };
}

function substantiveWords(html: string): number {
  const body = html.split("</head>")[1] ?? html;
  const main = body.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  return (main ? main[1] : body)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;
}

afterEach(() => QUERY.mockReset());

describe("/deals serves crawlers the offers the database actually has", () => {
  it("lists the discounted products", async () => {
    QUERY.mockResolvedValue({ rows: DISCOUNTED });
    const { html, status } = await crawl("/deals");
    expect(status).toBe(200);
    for (const product of DISCOUNTED) {
      expect(html, `missing ${product.name}`).toContain(product.name);
      expect(html, `missing description for ${product.name}`).toContain(product.description);
    }
    // The summary-only shell produced 17 substantive words on this route. Two
    // fixture rows clear 40; production has 43 discounted products.
    expect(substantiveWords(html)).toBeGreaterThan(40);
  });

  it("prints the row's own prices, unmodified", async () => {
    QUERY.mockResolvedValue({ rows: DISCOUNTED });
    const { html } = await crawl("/deals");
    // Formatted with the site's existing ar-IQ convention, but the values are
    // the row's own: current price and the struck-through original.
    const { formatMoney } = await import("../../api/_seo-preview-shell");
    expect(html).toContain(formatMoney(3000, "IQD"));
    expect(html).toContain(formatMoney(4025, "IQD"));
    expect(html).toContain("<s>");
  });

  it("takes the offer count from the rows", async () => {
    QUERY.mockResolvedValue({ rows: DISCOUNTED });
    const { html } = await crawl("/deals");
    expect(html).toContain(`${DISCOUNTED.length} منتج`);
  });

  it("does not claim offers when nothing is discounted", async () => {
    QUERY.mockResolvedValue({ rows: [] });
    const { html, status } = await crawl("/deals");
    expect(status).toBe(200);
    expect(html).not.toMatch(/\b0\s*منتج/);
    expect(html).toContain("عروض AQUAVO");
  });

  it("degrades to the summary when the query fails", async () => {
    QUERY.mockRejectedValue(new Error("connection refused"));
    const { html, status } = await crawl("/deals");
    expect(status).toBe(200);
    expect(html).toContain("عروض AQUAVO");
    expect(html).not.toMatch(/\b0\s*منتج/);
  });

  it("leaves unknown routes on their 404", async () => {
    QUERY.mockResolvedValue({ rows: [] });
    const { status } = await crawl("/definitely-not-real");
    expect(status).toBe(404);
  });
});
