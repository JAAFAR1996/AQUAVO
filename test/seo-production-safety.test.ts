import { readFileSync } from "node:fs";
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

describe("SEO production safety invariants", () => {
  it("keeps missing pages noindex without canonical output", () => {
    const source = read("api/ssr-preview.ts");

    expect(source).toContain('if (status === 404) return "noindex, follow"');
    expect(source).toContain("if (!canonical || meta.notFound)");
    expect(source).toContain("meta.notFound || !meta.jsonLd");
    expect(source).toContain("status: 404");
  });

  it("mounts the client separately from server semantic HTML", () => {
    const serverSource = read("api/ssr-preview.ts");
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
