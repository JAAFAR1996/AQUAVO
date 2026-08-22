import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("product 404 and temperature canonical routing", () => {
  it("returns a real noindex 404 for missing or hidden product slugs", () => {
    const source = read("api/product-ssr.ts");

    expect(source).toContain("FROM products");
    expect(source).toContain("WHERE slug = $1");
    expect(source).toContain("deleted_at IS NULL");
    expect(source).toContain("COALESCE(is_storefront_visible, true) = true");
    expect(source).toContain("rows.length === 0");
    expect(source).toContain("res.status(404)");
    expect(source).toContain('"noindex, follow"');
  });

  it("keeps hidden products out of the product sitemap", () => {
    const source = read("api/sitemap-products.ts");

    expect(source).toContain("deleted_at IS NULL");
    expect(source).toContain("COALESCE(is_storefront_visible, true) = true");
  });

  it("keeps crawler semantic rendering ahead of the human product 404 guard", () => {
    const vercel = JSON.parse(read("vercel.json"));
    const rewrites = vercel.rewrites as Array<{
      source: string;
      destination: string;
      has?: Array<{ type: string; key?: string }>;
    }>;

    const botRewriteIndex = rewrites.findIndex(
      (route) => route.destination === "/api/ssr-preview" && route.has?.some((condition) => condition.key === "user-agent"),
    );
    const productGuardIndex = rewrites.findIndex(
      (route) => route.source === "/products/:slug" && route.destination === "/api/product-ssr",
    );
    const stableSsrIndex = rewrites.findIndex(
      (route) => route.destination === "/api/ssr-meta" && route.source.includes("?!api"),
    );

    expect(botRewriteIndex).toBeGreaterThanOrEqual(0);
    expect(productGuardIndex).toBeGreaterThan(botRewriteIndex);
    expect(stableSsrIndex).toBeGreaterThan(productGuardIndex);
    expect(vercel.functions["api/product-ssr.ts"]).toBeDefined();
  });

  it("permanently consolidates the standalone temperature page into the canonical guide", () => {
    const vercel = JSON.parse(read("vercel.json"));
    const redirects = vercel.redirects as Array<{ source: string; destination: string; permanent?: boolean }>;
    const redirect = redirects.find((route) => route.source === "/temperature-guide");

    expect(redirect).toEqual({
      source: "/temperature-guide",
      destination: "/guides/temperature-guide",
      permanent: true,
    });
  });
});
