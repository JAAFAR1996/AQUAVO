import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALES,
  SUPPORTED_LOCALES,
  alternatesFor,
  localizePath,
  parseLocale,
  splitLocaleFromPath,
} from "../locales";

describe("locale configuration", () => {
  it("supports exactly ar, en and ckb with the required directions and native names", () => {
    expect(SUPPORTED_LOCALES).toEqual(["ar", "en", "ckb"]);
    expect(DEFAULT_LOCALE).toBe("ar");
    expect(LOCALES.ar).toMatchObject({ dir: "rtl", nativeName: "العربية", urlPrefix: "" });
    expect(LOCALES.en).toMatchObject({ dir: "ltr", nativeName: "English", urlPrefix: "/en" });
    expect(LOCALES.ckb).toMatchObject({ dir: "rtl", nativeName: "کوردی سۆرانی", urlPrefix: "/ckb" });
  });

  it("uses Intl locales that Node resolves natively with Latin digits", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const formatted = new Intl.NumberFormat(LOCALES[locale].intl).format(1234567);
      expect(formatted).toMatch(/1.234.567/);
    }
  });
});

describe("splitLocaleFromPath", () => {
  it("keeps Arabic on unprefixed URLs", () => {
    expect(splitLocaleFromPath("/products/yee-hob-400")).toEqual({ locale: "ar", path: "/products/yee-hob-400", explicit: false });
    expect(splitLocaleFromPath("/")).toEqual({ locale: "ar", path: "/", explicit: false });
  });

  it("strips the English and Kurdish prefixes", () => {
    expect(splitLocaleFromPath("/en/products/x")).toEqual({ locale: "en", path: "/products/x", explicit: true });
    expect(splitLocaleFromPath("/ckb")).toEqual({ locale: "ckb", path: "/", explicit: true });
    expect(splitLocaleFromPath("/ckb/")).toEqual({ locale: "ckb", path: "/", explicit: true });
  });

  it("does not treat look-alike paths as a locale", () => {
    expect(splitLocaleFromPath("/encyclopedia").locale).toBe("ar");
    expect(splitLocaleFromPath("/english-guide").locale).toBe("ar");
  });
});

describe("localizePath", () => {
  it("maps the same logical page across locales and preserves query strings", () => {
    expect(localizePath("/products/x?variant=2#top", "en")).toBe("/en/products/x?variant=2#top");
    expect(localizePath("/en/products/x?variant=2", "ckb")).toBe("/ckb/products/x?variant=2");
    expect(localizePath("/ckb/products/x", "ar")).toBe("/products/x");
  });

  it("handles the home page for every locale", () => {
    expect(localizePath("/", "en")).toBe("/en");
    expect(localizePath("/en", "ar")).toBe("/");
    expect(localizePath("/?open-cart=1", "ckb")).toBe("/ckb?open-cart=1");
  });
});

describe("alternatesFor", () => {
  it("produces reciprocal alternates and an Arabic x-default", () => {
    const { alternates, xDefault } = alternatesFor("/en/blog/post");
    expect(alternates).toEqual([
      { locale: "ar", hreflang: "ar-IQ", path: "/blog/post" },
      { locale: "en", hreflang: "en", path: "/en/blog/post" },
      { locale: "ckb", hreflang: "ku-IQ", path: "/ckb/blog/post" },
    ]);
    expect(xDefault).toBe("/blog/post");
  });
});

describe("parseLocale", () => {
  it("accepts codes, regional variants and rejects everything else", () => {
    expect(parseLocale("en-US")).toBe("en");
    expect(parseLocale("ckb_IQ")).toBe("ckb");
    expect(parseLocale("AR")).toBe("ar");
    expect(parseLocale("ku")).toBeNull();
    expect(parseLocale(undefined)).toBeNull();
  });
});
