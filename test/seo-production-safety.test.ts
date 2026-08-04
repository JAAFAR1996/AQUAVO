import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  canonicalGuidePaths,
  resolveGuidePage,
} from "../api/_canonical-guides.js";
import {
  PUBLIC_INDEXABLE_PATHS,
  isNoindexPath,
} from "../shared/seo-contract.js";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const runtimeSource = () => {
  const generated = resolve(process.cwd(), "generated/ssr-preview-runtime.ts");
  return existsSync(generated) ? readFileSync(generated, "utf8") : read("api/ssr-preview.ts");
};

describe("SEO production safety invariants", () => {
  it("keeps missing pages noindex without canonical output", () => {
    const source = runtimeSource();

    expect(source).toContain('if (status === 404) return "noindex, follow"');
    expect(source).toContain("if (!canonical || meta.notFound)");
    expect(source).toContain("meta.notFound || !meta.jsonLd");
    expect(source).toContain("status: 404");
  });

  it("mounts the client separately from server semantic HTML", () => {
    const serverSource = runtimeSource();
    const clientSource = read("client/src/main.tsx");

    expect(serverSource).toContain('<div id="seo-root"');
    expect(serverSource).toContain('<div id="root"');
    expect(clientSource).toContain('document.getElementById("seo-root")');
    expect(clientSource).toContain('createRoot(document.getElementById("root")!)');
    expect(clientSource).not.toContain('createRoot(document.getElementById("seo-root")');
  });

  it("contains no physical-store coordinates or map claims in client schemas", () => {
    const source = read("client/src/components/seo/meta-tags.tsx");

    expect(source).toContain('"@type": "OnlineStore"');
    expect(source).not.toContain("GeoCoordinates");
    expect(source).not.toContain("hasMap");
    expect(source).not.toContain("latitude:");
    expect(source).not.toContain("longitude:");
  });

  it("publishes owner-verified fixed shipping and 24/7 support facts", () => {
    const contract = read("shared/seo-contract.ts");
    const structuredData = read("api/_seo-structured-data.ts");
    const clientSchemas = read("client/src/components/seo/meta-tags.tsx");
    const sources = [
      contract,
      read("api/_seo-preview-shell.tsx"),
      structuredData,
      read("api/ssr-preview.ts"),
      clientSchemas,
      read("client/src/pages/home.tsx"),
      read("client/src/pages/about.tsx"),
      read("client/src/pages/contact.tsx"),
      read("client/src/pages/faq.tsx"),
      read("client/src/pages/shipping.tsx"),
      read("client/src/pages/why-aquavo.tsx"),
      read("client/src/components/footer.tsx"),
      read("client/public/llms.txt"),
      read("client/public/llms-full.txt"),
    ].join("\n");

    expect(contract).toContain("deliveryFee: 5000");
    expect(contract).toContain("deliveryMaxDays: 1");
    expect(contract).toContain('supportAvailability: "24/7"');
    expect(sources).toContain("توصيل خلال 24 ساعة");
    expect(sources).toContain("5,000");
    expect(sources).toContain("24/7");
    expect(structuredData).toContain("shippingDetails");
    expect(structuredData).toContain("hoursAvailable");
    expect(clientSchemas).toContain("shippingDetails");
    expect(clientSchemas).toContain("hoursAvailable");
  });

  it("consolidates production aliases and advertises stale-result recovery", () => {
    const build = read("script/build.ts");
    const productSitemap = read("api/sitemap-products.ts");
    const sitemapIndex = read("api/sitemap-index.ts");
    const recoverySitemap = read("client/public/sitemap-recovery.xml");
    const structuredData = read("api/_seo-structured-data.ts");

    expect(build).toContain('host !== "www.aquavoiq.com"');
    expect(build).toContain('res.status(308).end()');
    expect(build).toContain('"X-Robots-Tag", "noindex, follow"');
    expect(build).toContain('"Last-Modified", SEO_RELEASE_LAST_MODIFIED');

    expect(productSitemap).toContain("effectiveLastmod");
    expect(productSitemap).toContain("AQUAVO_SEO_RELEASE_LASTMOD");
    expect(productSitemap).toContain('res.setHeader("Last-Modified"');

    expect(sitemapIndex).toContain("/sitemap-recovery.xml");
    expect(recoverySitemap).toContain("/products/houyi-stainless-shunt");
    expect(recoverySitemap).toContain("/guides/aquarium-decor-stones-guide");
    expect(recoverySitemap).not.toContain("fist-live.vercel.app");

    expect(structuredData).toContain('"@type": "WebPage"');
    expect(structuredData).toContain("dateModified: AQUAVO_SEO_RELEASE_LASTMOD");
  });

  it("marks private and transactional routes as noindex", () => {
    for (const path of [
      "/search",
      "/wishlist",
      "/compare",
      "/cart",
      "/checkout",
      "/profile",
      "/admin",
      "/order-confirmation/123",
      "/invoice/123",
    ]) {
      expect(isNoindexPath(path), path).toBe(true);
    }
    expect(isNoindexPath("/products")).toBe(false);
  });

  it("resolves every canonical guide sitemap path to full content", () => {
    const paths = canonicalGuidePaths();
    expect(paths).toContain("/guides/cloudy-water-causes");
    expect(paths).toContain("/guides/filter-maintenance");
    expect(paths).toContain("/guides/fish-gasping-surface");
    expect(paths).toContain("/guides/aquarium-maintenance-checklist");

    for (const path of paths) {
      const resolved = resolveGuidePage(path);
      expect(resolved, path).not.toBeNull();
      expect(resolved?.page.answer.length, path).toBeGreaterThan(40);
      expect(resolved?.page.sections.length, path).toBeGreaterThan(0);
    }
  });

  it("keeps the query map canonical and free from legacy category aliases", () => {
    const queryMap = read("reports/release-2026-07-12/seo-aeo-geo-query-map.md");

    expect(queryMap).not.toContain("`/guides-filter-choice`");
    expect(queryMap).not.toContain("`/guides-filter-media-guide`");
    expect(queryMap).not.toContain("category=filters");
    expect(queryMap).not.toContain("category=treatments");
    expect(queryMap).toContain("online-only");
    expect(queryMap).toContain("no live fish, organisms, or plants");
  });

  it("publishes a complete public-page sitemap contract", () => {
    for (const path of [
      "/calculators",
      "/journey",
      "/fish-encyclopedia",
      "/fish-health",
      "/sustainability",
      "/contact",
    ]) {
      expect(PUBLIC_INDEXABLE_PATHS, path).toContain(path);
    }
    expect(PUBLIC_INDEXABLE_PATHS).not.toContain("/search");
    expect(PUBLIC_INDEXABLE_PATHS).not.toContain("/checkout");
  });
});
