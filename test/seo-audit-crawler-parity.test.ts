import { existsSync, readFileSync } from "node:fs";
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

  it("publishes blog URLs through the static sitemap index", () => {
    const sitemap = read("client/public/sitemap.xml");

    expect(sitemap).toContain("https://www.aquavoiq.com/sitemap-pages.xml");
    expect(sitemap).toContain("https://www.aquavoiq.com/sitemap-products.xml");
    expect(sitemap).toContain("https://www.aquavoiq.com/sitemap-guides.xml");
    expect(sitemap).toContain("https://www.aquavoiq.com/sitemap-blog.xml");
    // Recovery is intentionally no longer advertised: its six URLs are each
    // covered by the three sitemaps above, so listing it resubmitted the same
    // pages under a second sitemap with a staler stamp.
    expect(sitemap).not.toContain("/sitemap-recovery.xml");
    // The three sitemaps whose content tracks AQUAVO_SEO_RELEASE_LASTMOD must
    // say so here too — this index is what Vercel actually serves, so a stale
    // value here is the one Google reads. They previously said 2026-08-04
    // while the child sitemaps themselves were serving 2026-08-25.
    expect(sitemap.match(/<lastmod>2026-08-25<\/lastmod>/g)?.length).toBe(3);
    expect(sitemap.match(/<lastmod>2026-08-19<\/lastmod>/g)?.length).toBe(1);
  });

  it("keeps serving the recovery sitemap it no longer advertises", () => {
    // Un-advertising it must not 404 a URL Google may already hold.
    expect(existsSync(resolve(process.cwd(), "client/public/sitemap-recovery.xml"))).toBe(true);
  });
});
