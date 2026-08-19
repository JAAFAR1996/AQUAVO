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

  it("indexes only published blog posts, renders real article metadata, and returns real 404s", () => {
    const source = read("api/blog-ssr.ts");

    expect(source).toContain("is_published = TRUE");
    expect(source).not.toContain("status = 'published'");
    expect(source).toContain('image_url AS "imageUrl"');
    expect(source).toContain('published_at AS "publishedAt"');
    expect(source).toContain('updated_at AS "updatedAt"');
    expect(source).toContain("injectMeta(HTML_TEMPLATE, meta)");
    expect(source).toContain('"@type": "Article"');
    expect(source).toContain('res.status(404)');
    expect(source).toContain('"noindex, follow"');
    expect(source).toContain('"index, follow, max-image-preview:large"');
  });

  it("publishes a dedicated sitemap containing only published blog rows", () => {
    const sitemap = read("api/sitemap-blog.ts");
    const sitemapIndex = read("api/sitemap-index.ts");
    const apiIndex = read("api/index.ts");
    const vercel = JSON.parse(read("vercel.json"));

    expect(sitemap).toContain("FROM blog_posts");
    expect(sitemap).toContain("is_published = TRUE");
    expect(sitemap).toContain('published_at AS "publishedAt"');
    expect(sitemap).toContain('updated_at AS "updatedAt"');
    expect(sitemap).toContain('created_at AS "createdAt"');
    expect(sitemap).not.toContain("status = 'published'");
    expect(sitemap).not.toContain('SELECT slug, "publishedAt", "updatedAt"');
    expect(sitemap).not.toContain("BLOG_SITEMAP_RELEASE_LASTMOD");
    expect(sitemap).toContain("effectiveLastmod(post.publishedAt, post.updatedAt, post.createdAt)");
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
