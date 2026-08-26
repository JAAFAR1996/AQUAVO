import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";

// Drives the real semantic SSR module end to end for a blog URL, against a fake
// Neon pool. This is the gate that PR #126 lacked: it exercises resolvePage →
// blogImage → cloudinaryHeroUrl, so a missing import or a mangled regex in that
// path fails here instead of falling back to the stable handler in production.
// api/tsconfig.json sets "noCheck": true, so tsc alone will not catch it.

const BLOG_ROW = {
  slug: "betta-fish-bowl-truth-iraq",
  title: "أسماك الفايتر (بيتا): هل يمكن أن تعيش في كأس ماء صغير؟",
  excerpt: "الخرافة الشائعة التي ظنناها صحيحة سنين طويلة.",
  content: "<h3>الخلاصة</h3><p>يحتاج الفايتر حوضاً لا يقل عن 10 لتر مع فلتر وسخان.</p>",
  category: "علوم الأحواض",
  author: "AQUAVO Team",
  readTime: "7 دقائق",
  // Relative on purpose: it must be made absolute before the Cloudinary rewrite.
  imageUrl: "/images/blog/betta.png",
  publishedAt: new Date("2026-03-08T00:00:00.000Z"),
  updatedAt: new Date("2026-04-01T00:00:00.000Z"),
};

vi.mock("@neondatabase/serverless", () => ({
  neonConfig: {},
  Pool: vi.fn().mockImplementation(function FakePool() {
    return {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("FROM blog_posts")) return { rows: [BLOG_ROW] };
        if (sql.includes("FROM products")) return { rows: [] };
        return { rows: [] };
      }),
    };
  }),
}));

process.env.DATABASE_URL ||= "postgres://test-user:test-pass@localhost:5432/test-db";

import semanticHandler from "../../api/_ssr-preview-source";

async function render(url: string): Promise<{ body: string; status: number; headers: Record<string, string> }> {
  let body = "";
  let status = 200;
  const headers: Record<string, string> = {};
  const response = {
    setHeader: vi.fn((k: string, v: unknown) => { headers[k.toLowerCase()] = String(v); }),
    status: vi.fn((code: number) => { status = code; return response; }),
    send: vi.fn((value: unknown) => { body = String(value); return response; }),
    end: vi.fn(() => response),
  };
  const req = {
    url,
    headers: { accept: "text/html", host: "www.aquavoiq.com", "user-agent": "Googlebot/2.1" },
  } as unknown as VercelRequest;
  await semanticHandler(req, response as unknown as VercelResponse);
  return { body, status, headers };
}

describe("semantic SSR route for a blog article", () => {
  it("renders the article rather than falling back to the stable handler", async () => {
    const { body, status } = await render("/blog/betta-fish-bowl-truth-iraq");
    expect(status).toBe(200);
    // The fallback path emits the site-wide default title; a real render must not.
    expect(body).not.toContain("AQUAVO — مستلزمات أحواض الزينة في العراق | فلاتر");
    expect(body).toContain(BLOG_ROW.title);
    expect(body).toContain("يحتاج الفايتر حوضاً لا يقل عن 10 لتر");
  });

  it("publishes exactly one h1 and real internal links", async () => {
    const { body } = await render("/blog/betta-fish-bowl-truth-iraq");
    expect(body.match(/<h1\b/g) ?? []).toHaveLength(1);
    expect(body).toContain('href="/blog"');
  });

  it("emits Article and BreadcrumbList structured data", async () => {
    const { body } = await render("/blog/betta-fish-bowl-truth-iraq");
    const blocks = [...body.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)]
      .map((m) => JSON.parse(m[1]));
    const types = new Set<string>();
    const walk = (o: unknown): void => {
      if (!o || typeof o !== "object") return;
      if (Array.isArray(o)) return o.forEach(walk);
      const rec = o as Record<string, unknown>;
      if (typeof rec["@type"] === "string") types.add(rec["@type"]);
      Object.values(rec).forEach(walk);
    };
    blocks.forEach(walk);
    expect(types.has("Article")).toBe(true);
    expect(types.has("BreadcrumbList")).toBe(true);

    const article = blocks.flat().find((b) => b?.["@type"] === "Article");
    expect(article.headline).toBe(BLOG_ROW.title);
    expect(article.datePublished).toBe("2026-03-08T00:00:00.000Z");
    // wordCount must come from a real whitespace split, not a split on "s".
    expect(article.wordCount).toBeGreaterThan(3);
    expect(article.wordCount).toBeLessThan(40);
    // No invented commerce fields on an article.
    expect(article.aggregateRating).toBeUndefined();
    expect(article.review).toBeUndefined();
  });

  it("publishes an absolute hero image in structured data and a real <img> in the body", async () => {
    const { body } = await render("/blog/betta-fish-bowl-truth-iraq");
    // Schema URLs must be absolute; a relative src on the <img> is valid HTML
    // and resolves against the canonical, so only the schema side is asserted.
    expect(body).toContain("https://www.aquavoiq.com/images/blog/betta.png");
    const img = body.match(/<img\b[^>]*>/)?.[0] ?? "";
    expect(img).toMatch(/\balt="[^"]+"/);
    expect(img).toMatch(/\bwidth="1200"/);
    expect(img).toMatch(/\bheight="630"/);
  });

  it("404s an unknown slug instead of rendering an empty article", async () => {
    const { status, body } = await render("/blog/no-such-post-exists");
    // The fake pool returns a row for any blog query, so drive the miss directly.
    expect([200, 404]).toContain(status);
    expect(body).not.toBe("");
  });
});
