import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("AQUAVO discoverability contract", () => {
  it("publishes a static sitemap index that Vercel cannot shadow with a legacy urlset", () => {
    const sitemap = read("client/public/sitemap.xml");
    expect(sitemap).toContain("<sitemapindex");
    expect(sitemap).not.toContain("<urlset");
    expect(sitemap).toContain("https://www.aquavoiq.com/sitemap-pages.xml");
    expect(sitemap).toContain("https://www.aquavoiq.com/sitemap-products.xml");
    expect(sitemap).toContain("https://www.aquavoiq.com/sitemap-guides.xml");
  });

  it("does not publish retired business claims to AI crawlers", () => {
    const llms = `${read("client/public/llms.txt")}\n${read("client/public/llms-full.txt")}`;
    expect(llms).not.toMatch(/Iraq's first|Founded: 2024|replacement requests are handled within 48 hours/i);
    expect(llms).toContain("do not invent a 48-hour rule");
    expect(llms).toContain("Cash on delivery is the only active payment method");
    expect(llms).toContain("AQUAVO does not sell live fish, live organisms or live aquatic plants");
  });

  it("uses a scoped global brand title instead of blanket authenticity", () => {
    const meta = read("client/src/components/seo/meta-tags.tsx");
    expect(meta).toContain("AQUAVO لمعدات الأحواض | العراق");
    expect(meta).not.toContain("معدات أحواض أصلية | العراق");
    expect(meta).not.toContain("أكبر متجر إلكتروني");
    expect(read("client/src/pages/home.tsx")).toContain("<OrganizationSchema />");
    expect(read("client/src/pages/home.tsx")).toContain("<WebsiteSchema />");
  });

  it("does not expose unverified investor projections as current facts", () => {
    const page = read("client/src/pages/invest.tsx");
    const legacyDeck = read("client/public/AQUAVO_Investor_Pitch.html");
    expect(page).toContain("OWNER DATA REQUIRED");
    expect(page).toContain("noIndex");
    expect(page).not.toMatch(/25%|40%|83%|سوق بلا منافسين/);
    expect(legacyDeck).toContain('name="robots" content="noindex, nofollow"');
    expect(legacyDeck).toContain("نسخة تاريخية غير معتمدة للنشر");
  });

  it("publishes the approved legal operator in server-rendered organization data", () => {
    const ssr = read("api/ssr-meta.ts");
    expect(ssr).toContain('legalName: "محل المنبع / AL NABEA SHOP"');
    expect(ssr).not.toContain('foundingDate: "2024"');
  });

  it("keeps the runtime sitemap truthful and free of noindex or nonexistent routes", () => {
    const system = read("server/routes/system.ts");
    const sitemap = read("client/public/sitemap.xml");
    expect(system).toContain('const staticContentLastmod = "2026-07-12"');
    expect(system).not.toContain("const today = new Date()");
    for (const invalidPath of [
      "/invest",
      "/guides/aquarium-filter-guide",
      "/guides/aquarium-heater-guide",
      "/guides/aquarium-weekly-maintenance",
      "/guides/beginner-aquarium-mistakes",
    ]) {
      expect(system).not.toContain(`loc: "${invalidPath}"`);
      expect(sitemap).not.toContain(`<loc>https://www.aquavoiq.com${invalidPath}</loc>`);
    }
  });

  it("routes health checks to the application and keeps product schema factual", () => {
    expect(read("vercel.json")).toContain('"source": "/health"');
    const ssr = read("api/ssr-meta.ts");
    expect(ssr).toContain('"@type": "BreadcrumbList"');
    expect(ssr).toContain('...(p.brand ? { brand:');
    expect(ssr).not.toContain('name: p.brand || "AQUAVO"');
  });

  it("publishes a product sitemap architecture and disables unready discovery claims", () => {
    const system = read("server/routes/system.ts");
    const vercel = read("vercel.json");
    const server = read("server/index.ts");
    expect(system).toContain('router.get("/sitemap-products.xml"');
    expect(system).toContain(".from(productTable).where(isNull(productTable.deletedAt))");
    expect(system).toContain("!product.deletedAt");
    expect(vercel).toContain('"source": "/sitemap-products.xml"');
    expect(system).toContain('res.status(410).json({ error: "Discovery document unavailable" })');
    expect(system).not.toContain('digest: "sha256:"');
    expect(existsSync(resolve(process.cwd(), "client/public/.well-known/mcp/server-card.json"))).toBe(false);
    expect(existsSync(resolve(process.cwd(), "client/public/.well-known/agent-skills/index.json"))).toBe(false);
    expect(existsSync(resolve(process.cwd(), "client/public/.well-known/acp.json"))).toBe(false);
    expect(vercel).not.toContain('rel=\\"mcp-server-card\\"');
    expect(server).not.toContain('rel="mcp-server-card"');
    expect(vercel).toContain("form-action 'self'");
    expect(vercel).not.toContain("form-action 'self' https://");
  });

  it("keeps minimal precision motion bounded and reduced-motion safe", () => {
    const css = read("client/src/index.css");
    const home = read("client/src/pages/home.tsx");
    const reveal = read("client/src/components/motion/precision-reveal.tsx");
    expect(css).toContain("--aq-motion-standard: 190ms");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).not.toContain("animation: infinite");
    expect(home).toContain("<PrecisionReveal");
    expect(reveal).toContain("observer.disconnect()");
    expect(reveal).toContain('data-motion-ready={motionReady ? "true" : "false"}');
  });

  it("never explains SSR or crawling implementation details to customers", () => {
    const content = read("api/_seo-content.ts");
    expect(content).not.toMatch(/داخل HTML من السيرفر|قبل تحميل JavaScript|محركات البحث|روابط داخلية مفيدة/);
    expect(content).toContain("خلّ القرار مبني على حجم الحوض");
  });
});
