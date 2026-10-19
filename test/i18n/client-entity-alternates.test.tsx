import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MetaTags } from "../../client/src/components/seo/meta-tags";
import { LOCALE_RELEASE } from "../../shared/i18n/release";

const originalRelease = { en: LOCALE_RELEASE.en.ready, ckb: LOCALE_RELEASE.ckb.ready };

function setServerHead(path: string, robots: string, locales: readonly string[] = []) {
  document.head.innerHTML = `<link rel="canonical" href="https://www.aquavoiq.com${path}">
    <meta name="robots" content="${robots}">`;
  for (const locale of locales) {
    const alternate = document.createElement("link");
    alternate.rel = "alternate";
    alternate.hreflang = locale === "ar" ? "ar-IQ" : locale === "ckb" ? "ku-IQ" : locale;
    alternate.href = `https://www.aquavoiq.com${locale === "ar" ? "" : `/${locale}`}/products/p1`;
    document.head.appendChild(alternate);
  }
}

const languages = () => [...document.head.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]')].map((link) => link.hreflang);
const robots = () => document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content;

beforeEach(() => {
  document.head.innerHTML = "";
  LOCALE_RELEASE.en.ready = true;
  LOCALE_RELEASE.ckb.ready = true;
});

afterEach(() => {
  cleanup();
  document.head.innerHTML = "";
  window.history.replaceState({}, "", "/");
  LOCALE_RELEASE.en.ready = originalRelease.en;
  LOCALE_RELEASE.ckb.ready = originalRelease.ckb;
});

describe("client entity search metadata", () => {
  it("keeps the server-proven subset on an Arabic product after hydration", () => {
    window.history.replaceState({}, "", "/products/p1");
    setServerHead("/products/p1", "index, follow", ["ar", "en"]);
    render(<MetaTags title="Product" type="product" />);
    expect(languages()).toEqual(["ar-IQ", "en", "x-default"]);
    expect(robots()).toMatch(/^index/);
  });

  it("does not reopen an unreviewed translated product when React mounts", () => {
    window.history.replaceState({}, "", "/ckb/products/p1");
    setServerHead("/ckb/products/p1", "noindex, nofollow, noarchive");
    render(<MetaTags title="Product" type="product" />);
    expect(languages()).toEqual([]);
    expect(robots()).toContain("noindex");
  });

  it("preserves a reviewed translated product's indexability", () => {
    window.history.replaceState({}, "", "/en/products/p1");
    setServerHead("/en/products/p1", "index, follow", ["ar", "en"]);
    render(<MetaTags title="Product" type="product" />);
    expect(languages()).toEqual(["ar-IQ", "en", "x-default"]);
    expect(robots()).toMatch(/^index/);
  });

  it("does not carry another product's eligibility across SPA navigation", () => {
    window.history.replaceState({}, "", "/en/products/p2");
    setServerHead("/en/products/p1", "index, follow", ["ar", "en"]);
    render(<MetaTags title="Second product" type="product" />);
    expect(languages()).toEqual([]);
    expect(robots()).toContain("noindex");
  });

  it("accepts checked entity eligibility for a client navigation", () => {
    window.history.replaceState({}, "", "/en/blog/post");
    const view = render(<MetaTags title="Article" type="article" />);
    expect(robots()).toContain("noindex");
    view.rerender(<MetaTags title="Article" type="article" indexableLocales={["ar", "en"]} />);
    expect(languages()).toEqual(["ar-IQ", "en", "x-default"]);
    expect(robots()).toMatch(/^index/);
    expect(document.head.querySelector<HTMLLinkElement>('link[hreflang="en"]')?.href).toBe("https://www.aquavoiq.com/en/blog/post");
  });

  it("keeps released static-page alternates", () => {
    window.history.replaceState({}, "", "/faq");
    render(<MetaTags title="FAQ" />);
    expect(languages()).toEqual(["ar-IQ", "en", "ku-IQ", "x-default"]);
  });
});

describe("client listing language and category canonicals", () => {
  const categorySearch = `?category=${encodeURIComponent("التحكم بالحرارة")}`;

  it.each(["en", "ckb"])("keeps the %s listing self-canonical after hydration", (locale) => {
    window.history.replaceState({}, "", `/${locale}/products${categorySearch}&utm_source=ad`);
    render(<MetaTags title="Heaters" canonicalUrl={`https://www.aquavoiq.com/products${categorySearch}`} />);
    const expected = `https://www.aquavoiq.com/${locale}/products${categorySearch}`;
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(expected);
    expect(document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.content).toBe(expected);
    for (const link of document.head.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]')) {
      expect(new URL(link.href).search).toBe(categorySearch);
      expect(link.href).not.toContain("utm_source");
    }
    expect(document.head.querySelector<HTMLLinkElement>('link[hreflang="x-default"]')?.href).toBe(`https://www.aquavoiq.com/products${categorySearch}`);
  });

  it("canonicalizes a category alias and removes tracking parameters", () => {
    window.history.replaceState({}, "", "/en/products?category=heaters&utm_source=ad");
    render(<MetaTags title="Heaters" canonicalUrl="https://www.aquavoiq.com/products?category=heaters&utm_source=ad" />);
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(`https://www.aquavoiq.com/en/products${categorySearch}`);
    expect(document.head.querySelector<HTMLLinkElement>('link[hreflang="en"]')?.href).toBe(`https://www.aquavoiq.com/en/products${categorySearch}`);
  });

  it("localizes explicit static-page canonicals too", () => {
    window.history.replaceState({}, "", "/ckb/beginner-guide");
    render(<MetaTags title="Guide" canonicalUrl="https://www.aquavoiq.com/beginner-guide" />);
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe("https://www.aquavoiq.com/ckb/beginner-guide");
  });
});
