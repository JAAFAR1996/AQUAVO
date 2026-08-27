import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { canonicalUrlFor, isNoindexPath, productListingSeo } from "@shared/seo-contract";
import { AQUAVO_ENTITY } from "@/../../shared/seo-contract";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("AQUAVO discoverability contract", () => {
  it("publishes a static sitemap index that Vercel cannot shadow with a legacy urlset", () => {
    const sitemap = read("client/public/sitemap.xml");
    expect(sitemap).toContain("<sitemapindex");
    expect(sitemap).not.toContain("<urlset");
    expect(sitemap).toContain("https://www.aquavoiq.com/sitemap-pages.xml");
    expect(sitemap).toContain("https://www.aquavoiq.com/sitemap-products.xml");
    expect(sitemap).toContain("https://www.aquavoiq.com/sitemap-guides.xml");
    expect(sitemap).toContain("https://www.aquavoiq.com/sitemap-blog.xml");
  });

  it("does not publish retired business claims to AI crawlers", () => {
    const llms = `${read("client/public/llms.txt")}\n${read("client/public/llms-full.txt")}`;
    expect(llms).not.toMatch(/Iraq's first|Founded: 2024|replacement requests are handled within 48 hours/i);
    expect(llms).toContain("do not invent a 48-hour rule");
    expect(llms).toContain("Checkout supports cash on delivery and online payment through Al-Qaseh");
    expect(llms).toContain("AQUAVO does not sell live fish, live organisms or live aquatic plants");
  });

  it("uses a scoped global brand title instead of blanket authenticity", () => {
    const meta = read("client/src/components/seo/meta-tags.tsx");
    // The global suffix was shortened to `| AQUAVO العراق` in df0cf112 ("replace
    // client schemas with truthful online-store contract"). What this contract
    // protects is the *scoping*: a brand + country suffix, never a blanket
    // authenticity or superlative claim applied to every page in the store.
    expect(meta).toContain("| AQUAVO العراق");
    expect(meta).not.toContain("أصلية");
    expect(meta).not.toContain("معدات أحواض أصلية | العراق");
    expect(meta).not.toContain("أكبر متجر إلكتروني");
  });

  it("does not duplicate Organization/WebSite structured data on the client (SSR already owns it)", () => {
    const home = read("client/src/pages/home.tsx");
    // ssr-meta.ts already injects Organization + WebSite JSON-LD for "/" server-side
    // (see STATIC_PAGES["/"].jsonLd). Rendering them again client-side would duplicate
    // the entities in the hydrated document, so home.tsx must not import or render them.
    expect(home).not.toContain("OrganizationSchema");
    expect(home).not.toContain("WebsiteSchema");
    expect(home).not.toContain("<OrganizationSchema />");
    expect(home).not.toContain("<WebsiteSchema />");
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
    // This used to pin the literal string in api/ssr-meta.ts. Spelling the
    // identity out in two places is how it drifted: ssr-meta separated the
    // legal name with "/" while shared/seo-contract.ts — the source the
    // crawler-facing graph uses, and therefore the one Google is already
    // indexed on — separates it with an em dash. ssr-meta now reads from that
    // contract, so what is pinned here is that it has no identity of its own
    // to disagree with, and that the contract still holds the approved value.
    //
    // That the rendered output actually carries it is asserted against the
    // real handler in server/__tests__/ssr-schema-parity.test.ts.
    const ssr = read("api/ssr-meta.ts");
    expect(AQUAVO_ENTITY.legalName).toBe("محل المنبع — AL NABEA SHOP");
    expect(ssr).toContain("legalName: AQUAVO_ENTITY.legalName");
    expect(ssr).not.toMatch(/legalName:\s*"/);
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

    // Product schema has one producer now: api/ssr-meta.ts hands off to
    // buildProductStructuredData instead of hand-rolling a second, thinner
    // copy, so the factual-brand invariant is asserted where it now lives.
    const ssr = read("api/ssr-meta.ts");
    expect(ssr).toContain("buildProductStructuredData(");

    const builder = read("api/_seo-structured-data.ts");
    expect(builder).toContain('"@type": "BreadcrumbList"');
    // Brand is emitted only when the product really has one …
    expect(builder).toContain(
      'product.brand ? { "@type": "Brand", name: product.brand } : undefined',
    );
    // … and is never defaulted to the store name, which would claim AQUAVO
    // manufactured every third-party product in the catalogue.
    for (const source of [ssr, builder]) {
      expect(source).not.toContain('name: p.brand || "AQUAVO"');
      expect(source).not.toContain('brand: { "@type": "Brand", name: "AQUAVO" }');
    }
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
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).not.toContain("animation: infinite");
    expect(home).toContain("<PrecisionReveal");
    // Entrance/viewport motion has been removed: the reveal wrapper is now a
    // static passthrough — no IntersectionObserver, no data-motion toggling.
    expect(reveal).not.toContain("IntersectionObserver");
    expect(reveal).not.toContain("observer.disconnect()");
    expect(reveal).not.toContain("data-motion-ready");
  });

  it("never explains SSR or crawling implementation details to customers", () => {
    const content = read("api/_seo-content.ts");
    expect(content).not.toMatch(/داخل HTML من السيرفر|قبل تحميل JavaScript|محركات البحث|روابط داخلية مفيدة/);
    expect(content).toContain("خلّ القرار مبني على حجم الحوض");
  });
});

describe("canonical URL contract", () => {
  it("keeps exactly one trailing slash on the home page, matching the sitemap", () => {
    // The sitemap publishes "https://www.aquavoiq.com/". Every producer of a
    // canonical — SSR, the React app, the bot shell — must agree with it.
    expect(canonicalUrlFor("/")).toBe("https://www.aquavoiq.com/");
    expect(canonicalUrlFor("")).toBe("https://www.aquavoiq.com/");
    expect(canonicalUrlFor("//")).toBe("https://www.aquavoiq.com/");
  });

  it("strips trailing slashes so /products/ never self-canonicalizes", () => {
    expect(canonicalUrlFor("/products")).toBe("https://www.aquavoiq.com/products");
    expect(canonicalUrlFor("/products/")).toBe("https://www.aquavoiq.com/products");
    expect(canonicalUrlFor("/products/houyi-check-valve/")).toBe(
      "https://www.aquavoiq.com/products/houyi-check-valve",
    );
  });

  it("drops query strings and fragments, so tracking params cannot fork a URL", () => {
    expect(canonicalUrlFor("/products?category=filters")).toBe("https://www.aquavoiq.com/products");
    expect(canonicalUrlFor("/products/x?ref=tiktok&utm_source=ig")).toBe(
      "https://www.aquavoiq.com/products/x",
    );
    expect(canonicalUrlFor("/guides#section")).toBe("https://www.aquavoiq.com/guides");
  });

  it("agrees with isNoindexPath on trailing-slash and query variants", () => {
    expect(isNoindexPath("/cart/")).toBe(true);
    expect(isNoindexPath("/checkout?step=2")).toBe(true);
    expect(isNoindexPath("/products")).toBe(false);
  });

  it("keeps the category facet in the product listing canonical", () => {
    // Without this, every category listing collapses to bare /products after
    // hydration and the eleven category pages lose their own identity.
    const filters = productListingSeo("الفلترة والتنقية");
    expect(filters.canonicalUrl).toBe(
      `https://www.aquavoiq.com/products?category=${encodeURIComponent("الفلترة والتنقية")}`,
    );
    expect(filters.title).toBe("منتجات الفلترة والتنقية | AQUAVO");
  });

  it("normalizes English category aliases to the canonical Arabic facet", () => {
    expect(productListingSeo("filters").canonicalUrl).toBe(
      productListingSeo("الفلترة والتنقية").canonicalUrl,
    );
    expect(productListingSeo("heaters").category).toBe("التحكم بالحرارة");
  });

  it("falls back to the bare listing when no category is active", () => {
    for (const empty of [undefined, null, "", "   "]) {
      const seo = productListingSeo(empty);
      expect(seo.canonicalUrl).toBe("https://www.aquavoiq.com/products");
      expect(seo.category).toBeUndefined();
    }
  });

  it("gives the React listing page an explicit canonical from the shared builder", () => {
    const page = read("client/src/pages/products.tsx");
    expect(page).toContain("productListingSeo(initialCategory)");
    expect(page).toContain("canonicalUrl={listingSeo.canonicalUrl}");
  });

  it("marks private routes noindex in the markup, not only in the header", () => {
    // The bot-UA path sets X-Robots-Tag, but a crawler outside that user-agent
    // allowlist only ever sees the meta tag, and the SPA template default says
    // "index, follow". ssr-meta must override it for every noindex path.
    const ssr = read("api/ssr-meta.ts");
    expect(ssr).toContain("noIndex = isNoindexPath(cleanPath)");
    expect(ssr).toContain('content="noindex, nofollow, noarchive"');
    expect(ssr).toContain('res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive")');
    for (const p of ["/cart", "/checkout", "/profile", "/wishlist", "/compare"]) {
      expect(isNoindexPath(p)).toBe(true);
    }
  });

  it("is the only canonical rule the React meta layer applies", () => {
    // Guards the regression this test was written for: meta-tags.tsx used to
    // build the home canonical inline as `${BASE}${path === "/" ? "" : path}`,
    // which published a slashless home URL that contradicted the sitemap.
    const metaTags = read("client/src/components/seo/meta-tags.tsx");
    // Comments are allowed to name the anti-pattern; executable code is not.
    const code = metaTags.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(code).toContain("canonicalUrlFor(currentPath)");
    expect(code).not.toContain('currentPath === "/" ? "" : currentPath');
    expect(code).not.toContain("window.location.href");
  });
});
