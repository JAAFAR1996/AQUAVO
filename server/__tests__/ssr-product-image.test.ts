import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";

// Drives the real semantic SSR module end to end for a product URL against a
// fake Neon pool. The prerendered product page shipped with zero <img> elements
// for months while its Product schema happily advertised an `image` array, so
// the contract pinned here is that the two agree: whatever the schema leads
// with is the picture a crawler can actually see.
// api/tsconfig.json sets "noCheck": true, so tsc alone will not catch a break.

const CLOUDINARY_THUMB =
  "https://res.cloudinary.com/dyczh8ogv/image/upload/v1781171285/aquavo/products/houyi/thermostat/i30wuasorkj9uq16k8z4.jpg";

const PRODUCT_ROW = {
  id: "houyi-thermostat",
  slug: "houyi-thermostat",
  name: "ميزان حرارة رقمي للأحواض — شاشة LED",
  description: "ميزان حرارة رقمي بشاشة LED لقياس حرارة ماء الحوض بدقة.",
  price: "5000",
  originalPrice: null,
  currency: "IQD",
  brand: "HOUYI",
  category: "معدات",
  stock: 12,
  thumbnail: CLOUDINARY_THUMB,
  images: [CLOUDINARY_THUMB, "/images/products/houyi/thermostat-2.webp"],
  hasVariants: false,
  variants: null,
  rating: "0",
  reviewCount: 0,
};

// A product whose only image is a site-relative path, to prove the <img> src is
// made absolute the same way the schema's image URLs are.
const RELATIVE_ROW = {
  ...PRODUCT_ROW,
  // Its own id, so the fake pool's review lookup does not match it — this row
  // doubles as the "product with no reviews" case.
  id: "aquavo-driftwood-collection",
  slug: "aquavo-driftwood-collection",
  name: "قطع خشب طبيعية للأكواسكيب",
  brand: "AQUAVO",
  thumbnail: "/images/products/driftwood/dw-14.webp",
  images: ["/images/products/driftwood/dw-14.webp"],
};

// A product carrying no image at all: the page must render no <img> rather than
// passing the AQUAVO logo off as a photo of the product.
const IMAGELESS_ROW = {
  ...PRODUCT_ROW,
  slug: "houyi-check-valve",
  name: "صمام عدم رجوع",
  thumbnail: null,
  images: [],
};

// A genuine approved review, shaped exactly as the SSR projection returns it:
// no user id, no ip_address, no moderation status — those are not selected.
const REVIEW_ROW = {
  rating: 5,
  title: null,
  comment: "جيدة جدا و تساعد على متابعة كيمياء الحوض و الوقاية من الاضرار",
  author: "زهراء تحسين",
  createdAt: "2026-06-05T16:18:46.742Z",
};

const ROWS_BY_SLUG: Record<string, unknown> = {
  "houyi-thermostat": PRODUCT_ROW,
  "aquavo-driftwood-collection": RELATIVE_ROW,
  "houyi-check-valve": IMAGELESS_ROW,
};

vi.mock("@neondatabase/serverless", () => ({
  neonConfig: {},
  Pool: vi.fn().mockImplementation(function FakePool() {
    return {
      query: vi.fn(async (sql: string, values?: unknown[]) => {
        if (sql.includes("FROM reviews")) {
          const productId = typeof values?.[0] === "string" ? values[0] : null;
          return { rows: productId === PRODUCT_ROW.id ? [REVIEW_ROW] : [] };
        }
        if (sql.includes("FROM products")) {
          const slug = typeof values?.[0] === "string" ? values[0] : null;
          if (slug && ROWS_BY_SLUG[slug]) return { rows: [ROWS_BY_SLUG[slug]] };
          // The listing query (no slug parameter) backs "related products" and
          // the catalogue listings. IMAGELESS_ROW is included so the listings
          // cover a product that has no photograph of its own.
          return { rows: slug ? [] : [PRODUCT_ROW, RELATIVE_ROW, IMAGELESS_ROW] };
        }
        return { rows: [] };
      }),
    };
  }),
}));

process.env.DATABASE_URL ||= "postgres://test-user:test-pass@localhost:5432/test-db";

import semanticHandler from "../../api/_ssr-preview-source";

async function render(url: string): Promise<{ body: string; status: number }> {
  let body = "";
  let status = 200;
  const response = {
    setHeader: vi.fn(),
    status: vi.fn((code: number) => {
      status = code;
      return response;
    }),
    send: vi.fn((value: unknown) => {
      body = String(value);
      return response;
    }),
    end: vi.fn(() => response),
  };
  const req = {
    url,
    headers: { accept: "text/html", host: "www.aquavoiq.com", "user-agent": "Googlebot/2.1" },
  } as unknown as VercelRequest;
  await semanticHandler(req, response as unknown as VercelResponse);
  return { body, status };
}

function imgTags(html: string): string[] {
  return html.match(/<img\b[^>]*>/g) ?? [];
}

function schemaBlocks(html: string): unknown[] {
  return [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)].map((m) =>
    JSON.parse(m[1]),
  );
}

function findProductSchema(html: string): Record<string, unknown> {
  let found: Record<string, unknown> | null = null;
  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    const record = node as Record<string, unknown>;
    if (!found && record["@type"] === "Product") found = record;
    Object.values(record).forEach(walk);
  };
  schemaBlocks(html).forEach(walk);
  if (!found) throw new Error("no Product schema in rendered page");
  return found;
}

describe("crawler-visible product image", () => {
  it("renders a real <img> for the product, not a schema-only image", async () => {
    const { body, status } = await render("/products/houyi-thermostat");
    expect(status).toBe(200);
    expect(imgTags(body).length).toBeGreaterThan(0);
  });

  it("gives the image a descriptive alt and a stable, uncropped box", async () => {
    const { body } = await render("/products/houyi-thermostat");
    const img = imgTags(body)[0];
    expect(img).toContain(`alt="${PRODUCT_ROW.name}"`);
    expect(img).toMatch(/\bwidth="1000"/);
    expect(img).toMatch(/\bheight="1000"/);
    // Above the fold: it must not be lazy-loaded.
    expect(img).not.toMatch(/loading="lazy"/);
    expect(img).toMatch(/loading="eager"/);
    expect(body).toContain("aspect-ratio:1/1");
    expect(body).toContain("object-fit:contain");
  });

  // The page now renders the product's whole gallery, so "one image" is no
  // longer the invariant. What still has to hold is the reason that assertion
  // existed: exactly one *hero*. React mounts into a separate #root and never
  // hydrates #seo-root, and #seo-root is display:none for JS visitors, so the
  // gallery cannot duplicate anything on screen — but two eager images would
  // still make the LCP candidate ambiguous. The gallery's own lazy-loading
  // contract is pinned in "crawler-visible product gallery" below.
  it("leads with exactly one hero image, so the LCP candidate is unambiguous", async () => {
    const { body } = await render("/products/houyi-thermostat");
    const productImages = imgTags(body).filter((tag) => tag.includes("aq-ssr-product-image"));
    const eager = productImages.filter((tag) => /loading="eager"/.test(tag));
    expect(eager).toHaveLength(1);
    expect(productImages[0]).toMatch(/loading="eager"/);
  });

  it("serves the same image the Product schema leads with", async () => {
    const { body } = await render("/products/houyi-thermostat");
    const schema = findProductSchema(body);
    const schemaImages = schema.image as string[];
    const src = imgTags(body)[0].match(/src="([^"]+)"/)?.[1] ?? "";
    // Cloudinary assets are right-sized for delivery, so compare the identity of
    // the asset rather than the transformation applied to it.
    const assetId = (url: string) => url.split("/").pop();
    expect(assetId(src)).toBe(assetId(schemaImages[0]));
    expect(src).toContain("res.cloudinary.com");
  });

  it("optimizes a Cloudinary asset instead of shipping the original", async () => {
    const { body } = await render("/products/houyi-thermostat");
    const src = imgTags(body)[0].match(/src="([^"]+)"/)?.[1] ?? "";
    expect(src).toContain("f_auto");
    expect(src).toContain("q_auto");
    expect(src).toContain("w_1000");
  });

  it("makes a site-relative product image absolute", async () => {
    const { body } = await render("/products/aquavo-driftwood-collection");
    const src = imgTags(body)[0].match(/src="([^"]+)"/)?.[1] ?? "";
    expect(src).toBe("https://www.aquavoiq.com/images/products/driftwood/dw-14.webp");
  });

  it("renders no product image when the product has none", async () => {
    const { body } = await render("/products/houyi-check-valve");
    const productImages = imgTags(body).filter((tag) => tag.includes("aq-ssr-product-image"));
    expect(productImages).toHaveLength(0);
    // And it must not pass the AQUAVO logo off as the product photo.
    expect(body).not.toMatch(/<img[^>]+alt="صمام عدم رجوع"/);
  });

  it("keeps the page's single <h1> and its Product schema intact", async () => {
    const { body } = await render("/products/houyi-thermostat");
    expect(body.match(/<h1\b/g) ?? []).toHaveLength(1);
    const schema = findProductSchema(body);
    expect(schema.name).toBe(PRODUCT_ROW.name);
    // No invented trust signals on a product with no real reviews.
    expect(schema.aggregateRating).toBeUndefined();
    expect(schema.review).toBeUndefined();
    expect(schema.gtin).toBeUndefined();
    expect(schema.mpn).toBeUndefined();
  });
});

/**
 * The reviews behind a product's aggregateRating.
 *
 * The Product schema publishes an aggregateRating whenever a product has real
 * reviews — and it does: `/api/reviews/yee-c4-1123-1a` returns a genuine
 * approved review. But the crawler-visible page rendered none of them, so a
 * crawler was shown a 5-star rating with nothing on the page behind it. Google
 * asks that a review snippet be backed by a review the visitor can see.
 *
 * These reviews are real customer content, which also means the projection
 * matters: no user id, no IP address, no moderation status may reach the page.
 */
describe("crawler-visible customer reviews", () => {
  it("renders an approved review with its author, rating and text", async () => {
    const { body } = await render("/products/houyi-thermostat");
    expect(body).toContain("آراء الزبائن");
    expect(body).toContain("زهراء تحسين");
    expect(body).toContain("جيدة جدا و تساعد على متابعة كيمياء الحوض");
    expect(body).toContain("5 من 5");
  });

  it("publishes no reviewer PII on the page", async () => {
    const { body } = await render("/products/houyi-thermostat");
    // The public reviews API leaked exactly these two by spreading the row.
    expect(body).not.toContain("162.158.210.203");
    expect(body).not.toContain("6c420beb");
    expect(body).not.toContain("approved");
  });

  it("renders nothing at all for a product with no reviews", async () => {
    const { body } = await render("/products/aquavo-driftwood-collection");
    expect(body).not.toContain("آراء الزبائن");
  });

  it("keeps the page's single h1 — reviews are an h2 section", async () => {
    const { body } = await render("/products/houyi-thermostat");
    expect(body.match(/<h1\b/g) ?? []).toHaveLength(1);
    expect(body).toMatch(/<h2[^>]*aq-reviews-title[^>]*>آراء الزبائن<\/h2>|<h2[^>]*id="aq-reviews-title"/);
  });
});

// A product carrying several real photographs. The catalogue holds 342 images
// across 112 products, but the prerendered page led with one and dropped the
// rest, so 230 real pictures reached no crawler and no image sitemap while the
// Product schema had been advertising them all along.
describe("crawler-visible product gallery", () => {
  it("renders every real product image, not just the hero", async () => {
    const { body } = await render("/products/houyi-thermostat");
    const productImages = imgTags(body).filter((tag) => tag.includes("aq-ssr-product-image"));
    expect(productImages).toHaveLength(PRODUCT_ROW.images.length);
  });

  it("keeps exactly one eager hero, so the LCP candidate stays unambiguous", async () => {
    const { body } = await render("/products/houyi-thermostat");
    const productImages = imgTags(body).filter((tag) => tag.includes("aq-ssr-product-image"));
    const eager = productImages.filter((tag) => /loading="eager"/.test(tag));
    expect(eager).toHaveLength(1);
    expect(productImages[0]).toMatch(/loading="eager"/);
  });

  // #seo-root is display:none for JS visitors and is removed once React commits,
  // so a lazy image inside it never intersects a viewport and is never fetched.
  // Eager gallery images would be fetched by every real browser for nothing.
  it("lazy-loads every image after the hero, so browsers fetch none of them", async () => {
    const { body } = await render("/products/houyi-thermostat");
    const productImages = imgTags(body).filter((tag) => tag.includes("aq-ssr-product-image"));
    for (const tag of productImages.slice(1)) {
      expect(tag).toMatch(/loading="lazy"/);
      expect(tag).not.toMatch(/loading="eager"/);
    }
  });

  it("shows the same set of images the Product schema claims", async () => {
    const { body } = await render("/products/houyi-thermostat");
    const schema = findProductSchema(body);
    const assetId = (url: string) => url.split("/").pop();
    const rendered = imgTags(body)
      .filter((tag) => tag.includes("aq-ssr-product-image"))
      .map((tag) => assetId(tag.match(/src="([^"]+)"/)?.[1] ?? ""));
    const claimed = (schema.image as string[]).map(assetId);
    expect(rendered).toEqual(claimed);
  });

  it("gives each gallery image a descriptive alt naming the product", async () => {
    const { body } = await render("/products/houyi-thermostat");
    const productImages = imgTags(body).filter((tag) => tag.includes("aq-ssr-product-image"));
    for (const tag of productImages) {
      const alt = tag.match(/alt="([^"]*)"/)?.[1] ?? "";
      expect(alt).toContain(PRODUCT_ROW.name);
    }
  });

  it("still renders a single image for a single-image product", async () => {
    const { body } = await render("/products/aquavo-driftwood-collection");
    const productImages = imgTags(body).filter((tag) => tag.includes("aq-ssr-product-image"));
    expect(productImages).toHaveLength(1);
  });

  it("still renders nothing for a product with no images", async () => {
    const { body } = await render("/products/houyi-check-valve");
    const productImages = imgTags(body).filter((tag) => tag.includes("aq-ssr-product-image"));
    expect(productImages).toHaveLength(0);
  });
});

describe("the catalogue listings show a crawler the products, not just their names", () => {
  // Verified on production before this change:
  //   $ curl -A Googlebot https://www.aquavoiq.com/          | grep -c '<img'
  //   0
  //   $ curl -A Googlebot https://www.aquavoiq.com/products  | grep -c '<img'
  //   0
  // Every product had a photograph, its own page led with it, and the image
  // sitemap declared it — the two pages that list the whole catalogue were
  // simply the ones that showed none of them.

  it("renders a thumbnail for every product on /products that has one", async () => {
    const { body } = await render("/products");
    const thumbs = imgTags(body).filter((tag) => tag.includes("aq-ssr-product-thumb"));
    // Two of the three fixture products have a real image; the third has none.
    expect(thumbs).toHaveLength(2);
  });

  it("renders thumbnails on the homepage too", async () => {
    const { body } = await render("/");
    const thumbs = imgTags(body).filter((tag) => tag.includes("aq-ssr-product-thumb"));
    expect(thumbs.length).toBeGreaterThan(0);
  });

  it("names the product in the alt text rather than leaving it empty", async () => {
    const { body } = await render("/products");
    const thumb = imgTags(body).find((tag) => tag.includes("aq-ssr-product-thumb")) ?? "";
    expect(thumb).toContain('alt="');
    expect(thumb).not.toContain('alt=""');
  });

  it("reserves the box, so nothing reflows", async () => {
    const { body } = await render("/products");
    const thumb = imgTags(body).find((tag) => tag.includes("aq-ssr-product-thumb")) ?? "";
    expect(thumb).toContain('width="320"');
    expect(thumb).toContain('height="320"');
  });

  it("keeps every listing thumbnail lazy, so a real browser fetches none of them", async () => {
    // #seo-root is display:none for JS visitors, so a lazy image inside it
    // never intersects a viewport. An eager one would be fetched anyway.
    const { body } = await render("/products");
    const thumbs = imgTags(body).filter((tag) => tag.includes("aq-ssr-product-thumb"));
    expect(thumbs.length).toBeGreaterThan(0);
    for (const thumb of thumbs) {
      expect(thumb).toContain('loading="lazy"');
    }
  });

  it("renders no thumbnail at all for a product with no photograph", async () => {
    const { body } = await render("/products");
    // The imageless fixture is listed by name…
    expect(body).toContain("صمام عدم رجوع");
    // …but must not borrow the AQUAVO logo as if it were the product.
    const thumbs = imgTags(body).filter((tag) => tag.includes("aq-ssr-product-thumb"));
    for (const thumb of thumbs) {
      expect(thumb).not.toContain("صمام عدم رجوع");
    }
  });

  it("right-sizes a Cloudinary thumbnail instead of shipping the full-size original", async () => {
    const { body } = await render("/products");
    const cloudinaryThumb = imgTags(body).find(
      (tag) => tag.includes("aq-ssr-product-thumb") && tag.includes("res.cloudinary.com"),
    );
    expect(cloudinaryThumb).toBeDefined();
    expect(cloudinaryThumb).toContain("w_320");
    expect(cloudinaryThumb).toContain("f_auto");
  });
});
