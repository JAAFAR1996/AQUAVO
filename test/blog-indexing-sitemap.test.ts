import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("published blog indexing and sitemap wiring", () => {
  it("routes blog detail pages through the published-post SSR guard", () => {
    const vercel = JSON.parse(read("vercel.json"));
    const rewrites = vercel.rewrites as Array<{ source: string; destination: string }>;
    const blogRouteIndex = rewrites.findIndex((route) => route.source === "/blog/:slug");
    const genericSsrIndex = rewrites.findIndex((route) => route.destination === "/api/ssr-meta" && route.source !== "/blog/:slug");

    expect(blogRouteIndex).toBeGreaterThanOrEqual(0);
    expect(rewrites[blogRouteIndex]?.destination).toBe("/api/blog-ssr");
    expect(genericSsrIndex).toBeGreaterThan(blogRouteIndex);
  });

  it("indexes only published blog posts and returns real 404s for missing posts", () => {
    const source = read("api/blog-ssr.ts");

    expect(source).toContain("status = 'published'");
    expect(source).toContain('res.status(404)');
    expect(source).toContain('"noindex, follow"');
    expect(source).toContain('"index, follow, max-image-preview:large"');
    expect(source).toContain("stableSsrHandler");
  });

  it("publishes a dedicated sitemap containing only published blog rows", () => {
    const sitemap = read("api/sitemap-blog.ts");
    const sitemapIndex = read("api/sitemap-index.ts");
    const apiIndex = read("api/index.ts");
    const vercel = JSON.parse(read("vercel.json"));

    expect(sitemap).toContain("FROM blog_posts");
    expect(sitemap).toContain("status = 'published'");
    expect(sitemap).toContain("/blog/${slug}");
    expect(sitemapIndex).toContain("/sitemap-blog.xml");
    expect(apiIndex).toContain('case "/sitemap-blog.xml"');
    expect(vercel.rewrites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "/sitemap-blog.xml" }),
      ]),
    );
  });
});
