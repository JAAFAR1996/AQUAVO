/**
 * Rule: an English / Kurdish page is indexable only when its translation is
 * reviewed by a person AND still matches the Arabic source. A machine
 * translation is served to visitors but the URL stays noindex and unlisted.
 */
import { beforeAll, describe, expect, it, vi } from "vitest";
import { coverageOf, isIndexableCoverage, productSourceFields, sourceHash, type TranslationRecord } from "../../shared/i18n/content";

const base: TranslationRecord = {
  entityType: "product",
  entityId: "p1",
  locale: "en",
  data: { name: "Heater 100 W" },
  status: "machine",
  sourceHash: "abc",
};

describe("indexable coverage", () => {
  it("presence of a record is not completeness", () => {
    expect(coverageOf(base, "abc")).toBe("machine");
    expect(isIndexableCoverage(coverageOf(base, "abc"))).toBe(false);
  });
  it("reviewed and current is the only indexable state", () => {
    expect(isIndexableCoverage(coverageOf({ ...base, status: "reviewed" }, "abc"))).toBe(true);
  });
  it("a reviewed translation whose Arabic source changed is outdated, not indexable", () => {
    expect(coverageOf({ ...base, status: "reviewed" }, "changed")).toBe("outdated");
    expect(isIndexableCoverage("outdated")).toBe(false);
  });
  it("missing is never indexable", () => {
    expect(isIndexableCoverage(coverageOf(null, "abc"))).toBe(false);
  });
});

describe("content localizer exposes the gate", () => {
  beforeAll(() => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("AQUAVO_TRANSLATIONS_FILE_FALLBACK", "1");
  });

  it("serves the machine English copy but reports the product as not indexable", async () => {
    const { localizeProduct } = await import("../../server/services/content-localizer");
    // Arabic source row shaped like the API's product; the file store holds a
    // machine translation for this id (data/i18n/translations/en/products.json).
    const product = { id: "aquavo-driftwood-dw-01", name: "خشب طبيعي", description: "وصف", subcategory: "خشب", specifications: {} };
    const r = await localizeProduct(product, "en");
    expect(r.translationMissing).toBe(false);
    expect(String(r.product.name)).toMatch(/natural wood/i);
    expect(r.coverage === "machine" || r.coverage === "outdated").toBe(true);
    expect(r.indexable).toBe(false);
  });

  it("an untranslated product falls back to Arabic and is not indexable", async () => {
    const { localizeProduct } = await import("../../server/services/content-localizer");
    const product = { id: "no-such-product", name: "منتج", description: "وصف", subcategory: null, specifications: {} };
    const r = await localizeProduct(product, "ckb");
    expect(r.translationMissing).toBe(true);
    expect(r.contentLocale).toBe("ar");
    expect(r.indexable).toBe(false);
  });

  it("Arabic is always indexable and never consults the translation store", async () => {
    const { localizeProduct } = await import("../../server/services/content-localizer");
    const product = { id: "aquavo-driftwood-dw-01", name: "خشب طبيعي", description: "وصف", subcategory: "خشب", specifications: {} };
    const r = await localizeProduct(product, "ar");
    expect(r.product.name).toBe("خشب طبيعي");
    expect(r.indexable).toBe(true);
  });

  it("source hash is stable for the fields the translation depends on", () => {
    const a = sourceHash(productSourceFields({ name: "x", description: "y", subcategory: null, specifications: {} }));
    const b = sourceHash(productSourceFields({ name: "x", description: "y", subcategory: null, specifications: {} }));
    const c = sourceHash(productSourceFields({ name: "x", description: "changed", subcategory: null, specifications: {} }));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
