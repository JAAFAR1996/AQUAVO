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
  it("emits an Arabic link, an Arabic x-default, and a link per RELEASED locale only", () => {
    const html = hreflangLinks("/products/x");
    expect(html).toContain('hreflang="ar-IQ" href="https://www.aquavoiq.com/products/x"');
    expect(html).toContain('hreflang="x-default" href="https://www.aquavoiq.com/products/x"');
    // Unreleased locales are not advertised to crawlers (shared/i18n/release.ts).
    expect(html.includes('hreflang="en" href="https://www.aquavoiq.com/en/products/x"')).toBe(isLocaleReleased("en"));
    expect(html.includes('hreflang="ckb-IQ" href="https://www.aquavoiq.com/ckb/products/x"')).toBe(isLocaleReleased("ckb"));
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
});
