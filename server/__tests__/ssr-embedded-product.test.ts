import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";
import {
  FORBIDDEN_PUBLIC_FIELD_PATTERN,
  PUBLIC_PRODUCT_FIELDS,
  findForbiddenFieldPaths,
} from "../../shared/public-product";

/**
 * The product payload embedded in the PDP's HTML.
 *
 * The PDP used to re-fetch `/api/products/:slug` after hydration for a row the
 * server had already read to build the page's own metadata and Product schema.
 * Measured on production: requested at 3,823ms, resolved at 4,390ms, with the
 * variants / similar / frequently-bought queries all queued behind it.
 *
 * Embedding a database row in HTML is exactly the shape of mistake that
 * published AQUAVO's whole cost basis once before, so the tests that matter
 * most here are the ones proving the payload cannot carry cost data and cannot
 * break out of its script block.
 */

// A row as it comes back from the database — including the internal accounting
// columns that must never reach the page. The product-level ones are not even
// selected any more, but a variant blob carries its own via jsonb_set, so this
// fixture keeps both to prove the boundary holds regardless.
const PRODUCT_ROW = {
  id: "houyi-thermostat",
  slug: "houyi-thermostat",
  name: "ميزان حرارة رقمي للأحواض — شاشة LED",
  brand: "Houyi",
  category: "الفحص والمراقبة",
  categoryId: "cat-monitoring",
  subcategory: "موازين حرارة",
  description: "مقياس حرارة رقمي بمستشعر سلكي.",
  price: "6985",
  originalPrice: null,
  currency: "IQD",
  images: ["https://res.cloudinary.com/x/image/upload/v1/a.webp"],
  thumbnail: "https://res.cloudinary.com/x/image/upload/v1/a.webp",
  rating: "4.5",
  reviewCount: 8,
  stock: 12,
  lowStockThreshold: 3,
  isNew: true,
  isBestSeller: false,
  isProductOfWeek: false,
  specifications: { power: "2W" },
  hasVariants: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  variants: [
    {
      id: "v1",
      label: "قياسي",
      price: "6985",
      stock: 12,
      isDefault: true,
      // Written into the jsonb by migration 0073 — invisible to TypeScript.
      costPrice: "3100",
      costStatus: "verified",
      costBasis: "invoice",
      costEvidence: "owner_confirmation:jaafar:2026-05-01",
    },
  ],
  // Product-level accounting columns, deliberately not in the SELECT.
  costPrice: "3100",
  packagingCost: "250",
  costResolutionBy: "owner_confirmation:jaafar",
};

// A product whose name and description contain markup and an apostrophe, to
// prove the serializer cannot be broken out of.
const HOSTILE_ROW = {
  ...PRODUCT_ROW,
  id: "hostile",
  slug: "hostile",
  name: '</script><img src=x onerror="alert(1)">',
  description: "ends a block: </SCRIPT > and an ampersand & a quote \" here",
  variants: null,
};

const ROWS: Record<string, unknown> = {
  [PRODUCT_ROW.slug]: PRODUCT_ROW,
  [HOSTILE_ROW.slug]: HOSTILE_ROW,
};

vi.mock("@neondatabase/serverless", () => ({
  neonConfig: {},
  Pool: vi.fn().mockImplementation(function FakePool() {
    return {
      query: vi.fn(async (sql: string, values?: unknown[]) => {
        if (sql.includes("FROM products")) {
          const slug = typeof values?.[0] === "string" ? values[0] : null;
          if (slug) return { rows: ROWS[slug] ? [ROWS[slug]] : [] };
          return { rows: [PRODUCT_ROW] };
        }
        return { rows: [] };
      }),
    };
  }),
}));

process.env.DATABASE_URL ||= "postgres://u:p@localhost:5432/db";

import handler from "../../api/ssr-meta";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131 Safari/537.36";

async function render(slug: string): Promise<string> {
  let body = "";
  const response = {
    setHeader: vi.fn(),
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
      url: `/products/${slug}`,
      headers: { accept: "text/html", host: "www.aquavoiq.com", "user-agent": BROWSER_UA },
    } as unknown as VercelRequest,
    response as unknown as VercelResponse,
  );
  return body;
}

function embeddedBlock(html: string): string | null {
  return (
    html.match(
      /<script type="application\/json" id="__AQUAVO_PRODUCT__">([\s\S]*?)<\/script>/,
    )?.[1] ?? null
  );
}

function embeddedPayload(html: string): Record<string, unknown> {
  const raw = embeddedBlock(html);
  expect(raw, "the PDP must embed a product payload").toBeTruthy();
  return JSON.parse(raw!) as Record<string, unknown>;
}

describe("the PDP embeds the product the server already read", () => {
  it("emits exactly one JSON payload block", async () => {
    const html = await render("houyi-thermostat");
    const blocks = html.match(/id="__AQUAVO_PRODUCT__"/g) ?? [];
    expect(blocks).toHaveLength(1);
  });

  it("names the slug it belongs to, so a later navigation cannot misuse it", async () => {
    expect(embeddedPayload(await render("houyi-thermostat")).slug).toBe("houyi-thermostat");
  });

  it("stamps the server render time, so the client can age the data", async () => {
    const before = Date.now();
    const payload = embeddedPayload(await render("houyi-thermostat"));
    const renderedAt = payload.renderedAt as number;
    expect(typeof renderedAt).toBe("number");
    expect(renderedAt).toBeGreaterThanOrEqual(before - 1000);
    expect(renderedAt).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it("carries every field the storefront reads from a product", async () => {
    const product = (embeddedPayload(await render("houyi-thermostat")).product) as Record<
      string,
      unknown
    >;
    // The same allowlist GET /api/products/:slug is built from — if the two
    // diverge, the PDP renders from a payload that is missing fields.
    for (const field of PUBLIC_PRODUCT_FIELDS) {
      expect(product, `missing public field: ${field}`).toHaveProperty(field);
    }
    expect(product.name).toBe(PRODUCT_ROW.name);
    expect(product.price).toBe("6985");
    expect(product.stock).toBe(12);
  });

  it("returns 404 rather than embedding anything for an unknown product", async () => {
    const html = await render("no-such-product");
    expect(embeddedBlock(html)).toBeNull();
  });
});

describe("the embedded payload cannot leak cost data", () => {
  it("carries no field whose name looks internal-financial", async () => {
    const payload = embeddedPayload(await render("houyi-thermostat"));
    expect(findForbiddenFieldPaths(payload)).toEqual([]);
  });

  it("strips the cost keys migration 0073 writes into the variants jsonb", async () => {
    const payload = embeddedPayload(await render("houyi-thermostat"));
    const variants = (payload.product as Record<string, unknown>).variants as Record<
      string,
      unknown
    >[];
    expect(variants).toHaveLength(1);
    expect(variants[0].label).toBe("قياسي");
    for (const key of ["costPrice", "costStatus", "costBasis", "costEvidence"]) {
      expect(variants[0], `variant leaked ${key}`).not.toHaveProperty(key);
    }
  });

  it("never puts an operator identity in the page", async () => {
    const html = await render("houyi-thermostat");
    expect(html).not.toContain("owner_confirmation");
    expect(html).not.toContain("jaafar");
  });

  it("keeps the whole rendered document free of forbidden field names", async () => {
    const html = await render("houyi-thermostat");
    // Belt and braces: scan the raw HTML, not just the parsed payload, in case
    // a future change writes the row somewhere else on the page too.
    const suspicious = html.match(/"[a-zA-Z_]*[Cc]ost[a-zA-Z_]*"\s*:/g) ?? [];
    expect(suspicious).toEqual([]);
    expect(FORBIDDEN_PUBLIC_FIELD_PATTERN.test("costPrice")).toBe(true); // sanity: the pattern works
  });
});

describe("the payload cannot break out of its script block", () => {
  it("escapes angle brackets so a closing tag cannot appear in the JSON", async () => {
    const raw = embeddedBlock(await render("hostile"));
    expect(raw).toBeTruthy();
    expect(raw).not.toContain("<");
    expect(raw).not.toContain(">");
    expect(raw).toContain("\\u003c");
  });

  it("still parses back to the exact original strings", async () => {
    const payload = embeddedPayload(await render("hostile"));
    const product = payload.product as Record<string, unknown>;
    // Escaping must be lossless — the page has to show the real name.
    expect(product.name).toBe(HOSTILE_ROW.name);
    expect(product.description).toBe(HOSTILE_ROW.description);
  });

  it("leaves no executable markup in the document from the payload", async () => {
    const html = await render("hostile");
    expect(html).not.toContain('onerror="alert(1)"');
    expect(html).not.toContain("<img src=x");
  });

  it("uses an inert JSON script type, not an executable assignment", async () => {
    const html = await render("houyi-thermostat");
    expect(html).toContain('<script type="application/json" id="__AQUAVO_PRODUCT__">');
    expect(html).not.toContain("window.__AQUAVO_PRODUCT__");
  });
});

describe("embedding does not disturb the rest of the page", () => {
  it("keeps the Product schema and the meta tags intact", async () => {
    const html = await render("houyi-thermostat");
    expect(html).toContain('"@type":"Product"');
    expect(html).toMatch(/<title>[^<]*ميزان حرارة/);
    expect(html).toContain('rel="canonical"');
  });

  it("places the payload at the end of the body, not in the head", async () => {
    const html = await render("houyi-thermostat");
    const payloadAt = html.indexOf('id="__AQUAVO_PRODUCT__"');
    const headEndsAt = html.indexOf("</head>");
    expect(payloadAt).toBeGreaterThan(headEndsAt);
    expect(html.indexOf("</body>")).toBeGreaterThan(payloadAt);
  });

  it("does not embed a product on a non-product page", async () => {
    let body = "";
    const response = {
      setHeader: vi.fn(),
      status: vi.fn(() => response),
      send: vi.fn((v: unknown) => {
        body = String(v);
        return response;
      }),
      end: vi.fn(() => response),
    };
    await handler(
      {
        url: "/about",
        headers: { accept: "text/html", host: "www.aquavoiq.com", "user-agent": BROWSER_UA },
      } as unknown as VercelRequest,
      response as unknown as VercelResponse,
    );
    expect(embeddedBlock(body)).toBeNull();
  });
});
