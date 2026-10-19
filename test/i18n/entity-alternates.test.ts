import { afterEach, describe, expect, it } from "vitest";
import { blogPostSourceFields, productSourceFields, sourceHash, type TranslationRecord } from "../../shared/i18n/content";
import { indexableAlternatesFor, indexableLocalesForEntity, isTranslatedEntityPath } from "../../shared/i18n/indexability";
import { LOCALE_RELEASE } from "../../shared/i18n/release";

const originalRelease = { en: LOCALE_RELEASE.en.ready, ckb: LOCALE_RELEASE.ckb.ready };
afterEach(() => {
  LOCALE_RELEASE.en.ready = originalRelease.en;
  LOCALE_RELEASE.ckb.ready = originalRelease.ckb;
});

const productSource = productSourceFields({ name: "منتج", description: "وصف المنتج", subcategory: "معدات" });
const productRecord: TranslationRecord = {
  entityType: "product",
  entityId: "p1",
  locale: "en",
  data: { name: "Product", description: "Product description", subcategory: "Equipment" },
  status: "reviewed",
  sourceHash: sourceHash(productSource),
};

describe("entity alternate eligibility", () => {
  it("keeps reviewed, current, complete languages while omitting a machine translation", () => {
    LOCALE_RELEASE.en.ready = true;
    LOCALE_RELEASE.ckb.ready = true;
    const locales = indexableLocalesForEntity("product", productSource, [
      productRecord,
      { ...productRecord, locale: "ckb", status: "machine" },
    ]);
    expect(locales).toEqual(["ar", "en"]);
    expect(indexableAlternatesFor("/products/p1", locales).alternates.map((a) => a.locale)).toEqual(locales);
  });

  it.each([
    ["missing", []],
    ["machine", [{ ...productRecord, status: "machine" }]],
    ["outdated", [{ ...productRecord, sourceHash: "old-source" }]],
    ["partial", [{ ...productRecord, data: { name: "Product", description: "Product description" } }]],
  ] as const)("does not advertise a %s translation", (_label, records) => {
    LOCALE_RELEASE.en.ready = true;
    expect(indexableLocalesForEntity("product", productSource, records)).toEqual(["ar"]);
  });

  it("preserves the release gate even for a reviewed current translation", () => {
    LOCALE_RELEASE.en.ready = false;
    expect(indexableLocalesForEntity("product", productSource, [productRecord])).toEqual(["ar"]);
    expect(indexableAlternatesFor("/products/p1", ["ar", "en"]).alternates.map((a) => a.locale)).toEqual(["ar"]);
  });

  it("applies article completeness, including missing body structure", () => {
    LOCALE_RELEASE.en.ready = true;
    const source = blogPostSourceFields({ title: "عنوان", excerpt: "مقدمة", content: "<h2>قسم</h2><p>محتوى</p>" });
    const record: TranslationRecord = {
      entityType: "blog_post", entityId: "b1", locale: "en", status: "reviewed", sourceHash: sourceHash(source),
      data: { title: "Title", excerpt: "Introduction", content: "<h2>Section</h2><p>Content</p>" },
    };
    expect(indexableLocalesForEntity("blog_post", source, [record])).toEqual(["ar", "en"]);
    expect(indexableLocalesForEntity("blog_post", source, [{ ...record, data: { ...record.data, content: "<p>Content</p>" } }])).toEqual(["ar"]);
  });

  it("uses the same alternate group for each locale's URL", () => {
    LOCALE_RELEASE.en.ready = true;
    LOCALE_RELEASE.ckb.ready = true;
    const arabic = indexableAlternatesFor("/blog/article", ["ar", "en"]);
    expect(indexableAlternatesFor("/en/blog/article", ["ar", "en"])).toEqual(arabic);
    expect(indexableAlternatesFor("/ckb/blog/article", ["ar", "en"])).toEqual(arabic);
  });
});

describe("unknown entity eligibility", () => {
  it.each(["/products/p1", "/en/products/p1", "/ckb/blog/article", "/blog/article/"])("fails closed for %s", (path) => {
    expect(isTranslatedEntityPath(path)).toBe(true);
    expect(indexableAlternatesFor(path).alternates.map((a) => a.locale)).toEqual(["ar"]);
  });

  it.each(["/", "/products", "/products?category=heaters", "/blog", "/faq"])("keeps released static/listing alternates for %s", (path) => {
    LOCALE_RELEASE.en.ready = true;
    LOCALE_RELEASE.ckb.ready = true;
    expect(isTranslatedEntityPath(path)).toBe(false);
    expect(indexableAlternatesFor(path).alternates.map((a) => a.locale)).toEqual(["ar", "en", "ckb"]);
  });
});
