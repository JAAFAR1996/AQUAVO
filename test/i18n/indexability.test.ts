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
  data: { name: "Heater 100 W", description: "Submersible heater." },
  status: "machine",
  sourceHash: "abc",
};

/** Arabic source shaped like the live row for aquavo-driftwood-dw-01 (list lengths match the stored English translation). */
const DW01 = {
  id: "aquavo-driftwood-dw-01",
  name: "خشب طبيعي للأحواض والأكواسكيب — DW-01",
  description: "قطعة خشب طبيعي فريدة.",
  subcategory: "خشب طبيعي",
  specifications: {
    benefits: ["أ", "ب", "ج"],
    usageInstructions: ["أ", "ب", "ج"],
    safetyWarnings: ["أ", "ب"],
    __cardBenefit: "القطعة المعروضة نفسها",
    "ملاحظة": "المعروض هو نفس القطعة",
    "رمز القطعة": "DW-01",
    "نمط الاستخدام": "ديكور وأكواسكيب",
    "طريقة المعاينة": "صورة ومعاينة ثلاثية الأبعاد",
  },
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
    const r = await localizeProduct(DW01, "en");
    expect(r.translationMissing).toBe(false);
    expect(String(r.product.name)).toMatch(/natural wood/i);
    // The fixture cannot reproduce the live source hash, so the record is machine or outdated; never partial, never complete.
    expect(["machine", "outdated"]).toContain(r.coverage);
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
    const r = await localizeProduct(DW01, "ar");
    expect(r.product.name).toBe(DW01.name);
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
