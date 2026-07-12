import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("AQUAVO discoverability contract", () => {
  it("keeps every static sitemap URL on a real public route", () => {
    const app = read("client/src/App.tsx");
    const sitemap = read("client/public/sitemap.xml");
    const routes = new Set(Array.from(app.matchAll(/<Route path="([^"]+)"/g)).map((match) => match[1]));
    const paths = Array.from(sitemap.matchAll(/<loc>https:\/\/www\.aquavoiq\.com([^<]*)<\/loc>/g))
      .map((match) => match[1] || "/")
      .filter((path) => !path.includes(":"));

    expect(paths.filter((path) => !routes.has(path))).toEqual([]);
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
});
