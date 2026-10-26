import { buildProductStructuredData } from "../../api/_seo-structured-data";
import { guidesForCategory, guideLinksHeading, CATEGORY_GUIDE_LINKS } from "../../shared/guide-links";
import { LOCALES } from "../../shared/i18n/locales";
import { describe, expect, it } from "vitest";
import { applyLocaleToHtml, hreflangLinks, ogLocaleTags } from "../../api/_locale-meta";
import { isLocaleReleased } from "../../shared/i18n/release";

const TEMPLATE = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <link rel="canonical" href="https://www.aquavoiq.com/products/x" />
  <meta property="og:locale" content="ar_IQ" />
</head>
<body dir="rtl">
  <div id="root" dir="rtl"></div>
</body>
</html>`;

describe("hreflangLinks", () => {
  it("does not advertise product translations without indexability evidence", () => {
    const html = hreflangLinks("/products/x");
    expect(html).toContain('hreflang="ar-IQ" href="https://www.aquavoiq.com/products/x"');
    expect(html).toContain('hreflang="x-default" href="https://www.aquavoiq.com/products/x"');
    expect(html).not.toContain('hreflang="en"');
    expect(html).not.toContain('hreflang="ku-IQ"');
  });

  it("emits only the reviewed eligible entity locales, intersected with the release gate", () => {
    const html = hreflangLinks("/products/x", "", ["ar", "en"]);
    expect(html.includes('hreflang="en" href="https://www.aquavoiq.com/en/products/x"')).toBe(isLocaleReleased("en"));
    expect(html).not.toContain('hreflang="ku-IQ"');
  });

  it("continues advertising released languages for complete static pages", () => {
    const html = hreflangLinks("/faq");
    expect(html.includes('hreflang="en" href="https://www.aquavoiq.com/en/faq"')).toBe(isLocaleReleased("en"));
    expect(html.includes('hreflang="ku-IQ" href="https://www.aquavoiq.com/ckb/faq"')).toBe(isLocaleReleased("ckb"));
  });

  it("keeps the category query string that defines a listing page", () => {
    const html = hreflangLinks("/products", "?category=%D8%A3%D8%AD%D9%88%D8%A7%D8%B6");
    expect(html).toContain("https://www.aquavoiq.com/products?category=%D8%A3%D8%AD%D9%88%D8%A7%D8%B6");
    if (isLocaleReleased("en")) expect(html).toContain("https://www.aquavoiq.com/en/products?category=%D8%A3%D8%AD%D9%88%D8%A7%D8%B6");
  });
});

describe("ogLocaleTags", () => {
  it("publishes an own locale for ar/en and only alternates for ckb", () => {
    expect(ogLocaleTags("en")).toContain('og:locale" content="en_US"');
    expect(ogLocaleTags("en")).toContain('og:locale:alternate" content="ar_AR"');
    expect(ogLocaleTags("ckb")).not.toContain('property="og:locale" content=');
    expect(ogLocaleTags("ckb")).toContain("og:locale:alternate");
  });
});

describe("applyLocaleToHtml", () => {
  it("sets lang/dir for English and keeps the shell otherwise intact", () => {
    const out = applyLocaleToHtml(TEMPLATE, "en", "/products/x");
    expect(out).toContain('<html lang="en" dir="ltr" data-locale="en">');
    expect(out).toContain('<body dir="ltr">');
    expect(out).toContain('<div id="root" dir="ltr">');
    expect(out).toContain('hreflang="x-default"');
    expect(out).not.toContain("ar_IQ");
    expect(out).not.toContain("Noto+Sans+Arabic");
  });

  it("keeps RTL for Kurdish and loads the Kurdish font", () => {
    const out = applyLocaleToHtml(TEMPLATE, "ckb", "/");
    expect(out).toContain('<html lang="ckb" dir="rtl" data-locale="ckb">');
    expect(out).toContain("Noto+Sans+Arabic");
  });

  it("does not annotate alternates on pages kept out of the index", () => {
    const out = applyLocaleToHtml(TEMPLATE, "en", "/checkout", "", { indexable: false });
    expect(out).not.toContain("hreflang");
  });

  it("passes the same eligible entity versions into every locale's head", () => {
    for (const locale of ["ar", "en"] as const) {
      const out = applyLocaleToHtml(TEMPLATE, locale, "/products/x", "", { indexableLocales: ["ar", "en"] });
      expect(out).toContain('hreflang="ar-IQ"');
      expect(out.includes('hreflang="en"')).toBe(isLocaleReleased("en"));
      expect(out).not.toContain('hreflang="ku-IQ"');
    }
  });
});

describe("localized product discovery", () => {
  const product = {
    id: "test-heater", slug: "test-heater", name: "Aquarium heater",
    description: "Adjustable aquarium heater.", category: "التحكم بالحرارة",
    price: 15000, stock: 2, currency: "IQD", hasVariants: true,
    variants: [
      { id: "50w", label: "50 W", price: 15000, stock: 2 },
      { id: "100w", label: "100 W", price: 20000, stock: 3 },
    ],
  };

  it.each(["en", "ckb"] as const)("keeps %s product, offers, breadcrumbs and page URLs in the requested locale", (locale) => {
    const graph = buildProductStructuredData(product, { locale }) as Record<string, any>[];
    const url = `https://www.aquavoiq.com/${locale}/products/test-heater`;
    const group = graph.find(n => n["@type"] === "ProductGroup")!;
    const page = graph.find(n => n["@type"] === "WebPage")!;
    const crumbs = graph.find(n => n["@type"] === "BreadcrumbList")!;
    expect(group.url).toBe(url);
    expect(page.url).toBe(url);
    expect(page.inLanguage).toBe(LOCALES[locale].languageTag);
    expect(page.mainEntity["@id"]).toBe(group["@id"]);
    expect(group.category).not.toBe(product.category);
    for (const variant of group.hasVariant) {
      expect(variant.url).toBe(url);
      expect(variant.offers.url).toBe(url);
    }
    for (const item of crumbs.itemListElement) {
      const target = new URL(item.item);
      expect(target.origin).toBe("https://www.aquavoiq.com");
      expect(target.pathname.split("/")[1]).toBe(locale);
    }
  });

  it("labels an Arabic fallback honestly without changing its requested URL", () => {
    const graph = buildProductStructuredData(product, { locale: "en", contentLocale: "ar" }) as Record<string, any>[];
    const page = graph.find(n => n["@type"] === "WebPage")!;
    expect(page.inLanguage).toBe("ar-IQ");
    expect(page.url).toBe("https://www.aquavoiq.com/en/products/test-heater");
  });

  it("preserves the original Arabic product URL and language by default", () => {
    const graph = buildProductStructuredData(product) as Record<string, any>[];
    const page = graph.find(n => n["@type"] === "WebPage")!;
    expect(page.url).toBe("https://www.aquavoiq.com/products/test-heater");
    expect(page.inLanguage).toBe("ar-IQ");
  });

  it.each(["en", "ckb"] as const)("translates all related-guide labels in %s without changing destinations", (locale) => {
    expect(guideLinksHeading(locale)).not.toBe(guideLinksHeading("ar"));
    for (const category of Object.keys(CATEGORY_GUIDE_LINKS)) {
      const source = guidesForCategory(category);
      const translated = guidesForCategory(category, locale);
      expect(translated.map(l => l.href)).toEqual(source.map(l => l.href));
      translated.forEach((link, index) => {
        expect(link.label).not.toBe(source[index].label);
        expect(link.label).not.toBe(link.href);
      });
    }
    expect(guidesForCategory("unknown", locale)).toEqual([]);
  });
});
