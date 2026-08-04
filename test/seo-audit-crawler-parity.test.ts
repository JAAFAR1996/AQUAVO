import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("SEO audit crawler parity", () => {
  it("routes major search-audit crawlers to the semantic SSR runtime", () => {
    const vercel = JSON.parse(read("vercel.json")) as {
      rewrites: Array<{
        destination?: string;
        has?: Array<{ type?: string; key?: string; value?: string }>;
      }>;
    };
    const userAgentRule = vercel.rewrites.find(
      (rewrite) =>
        rewrite.destination === "/api/ssr-preview" &&
        rewrite.has?.some(
          (condition) =>
            condition.type === "header" && condition.key === "user-agent",
        ),
    );
    const userAgentValue =
      userAgentRule?.has?.find(
        (condition) =>
          condition.type === "header" && condition.key === "user-agent",
      )?.value ?? "";

    for (const crawler of [
      "SiteAuditBot",
      "SemrushBot",
      "AhrefsBot",
      "AhrefsSiteAudit",
      "Screaming Frog SEO Spider",
    ]) {
      expect(userAgentValue, crawler).toContain(crawler);
    }

    expect(userAgentRule).toBeDefined();
  });

  it("publishes recovery URLs through the static sitemap index", () => {
    const sitemap = read("client/public/sitemap.xml");

    expect(sitemap).toContain("https://www.aquavoiq.com/sitemap-recovery.xml");
    expect(sitemap).toContain("https://www.aquavoiq.com/sitemap-pages.xml");
    expect(sitemap).toContain("https://www.aquavoiq.com/sitemap-products.xml");
    expect(sitemap).toContain("https://www.aquavoiq.com/sitemap-guides.xml");
    expect(sitemap.match(/<lastmod>2026-08-04<\/lastmod>/g)?.length).toBe(4);
  });
});
