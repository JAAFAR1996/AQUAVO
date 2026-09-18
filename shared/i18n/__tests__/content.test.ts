import { describe, expect, it } from "vitest";
import {
  applyBlogPostTranslation,
  applyProductTranslation,
  coverageOf,
  productSourceFields,
  sourceHash,
} from "../content";

const product = {
  id: "yee-hob-400",
  slug: "yee-hob-400",
  name: "فلتر YEE HOB 400",
  description: "فلتر خارجي معلّق",
  subcategory: "فلاتر معلقة",
  price: "25000",
  stock: 4,
  specifications: {
    benefits: ["تنقية هادئة"],
    usageInstructions: ["ركّبه على حافة الحوض"],
    safetyWarnings: ["افصل الكهرباء قبل التنظيف"],
    __cardBenefit: "هادئ",
    __model3d: { src: "/models/x.glb" },
    "قوة التدفق": "400 لتر/ساعة",
    power: "5W",
  },
  variants: [{ id: "S", label: "صغير", price: 25000 }],
};

describe("applyProductTranslation", () => {
  it("returns the Arabic row untouched for Arabic and flags nothing missing", () => {
    const r = applyProductTranslation(product, null, "ar");
    expect(r.value).toBe(product);
    expect(r.translationMissing).toBe(false);
    expect(r.contentLocale).toBe("ar");
  });

  it("falls back to Arabic and flags it when no translation exists", () => {
    const r = applyProductTranslation(product, null, "en");
    expect(r.value).toBe(product);
    expect(r.translationMissing).toBe(true);
    expect(r.contentLocale).toBe("ar");
  });

  it("merges only linguistic fields and keeps price, stock, model data and technical specs", () => {
    const r = applyProductTranslation(
      product,
      {
        name: "YEE HOB 400 Hang-On-Back Filter",
        description: "External hang-on filter",
        subcategory: "Hang-on filters",
        specifications: {
          benefits: ["Quiet filtration"],
          usageInstructions: ["Hang it on the tank rim"],
          safetyWarnings: ["Unplug before cleaning"],
          __cardBenefit: "Quiet",
          labelled: { "قوة التدفق": { label: "Flow rate", value: "400 L/h" } },
        },
        variantLabels: { S: "Small" },
      },
      "en",
    );
    expect(r.translationMissing).toBe(false);
    expect(r.contentLocale).toBe("en");
    expect(r.value.name).toBe("YEE HOB 400 Hang-On-Back Filter");
    expect(r.value.price).toBe("25000");
    expect(r.value.stock).toBe(4);
    const specs = r.value.specifications as Record<string, unknown>;
    expect(specs.benefits).toEqual(["Quiet filtration"]);
    expect(specs.__model3d).toEqual({ src: "/models/x.glb" });
    expect(specs.power).toBe("5W");
    expect(specs["Flow rate"]).toBe("400 L/h");
    expect(specs["قوة التدفق"]).toBeUndefined();
    expect(r.value.variants[0]).toMatchObject({ id: "S", label: "Small", price: 25000 });
    // The source object is never mutated.
    expect(product.name).toBe("فلتر YEE HOB 400");
    expect(product.specifications["قوة التدفق"]).toBe("400 لتر/ساعة");
  });

  it("treats an empty translated name as missing", () => {
    const r = applyProductTranslation(product, { name: "  ", description: "x" }, "ckb");
    expect(r.translationMissing).toBe(true);
  });
});

describe("applyBlogPostTranslation", () => {
  it("replaces title, excerpt and body and keeps the slug", () => {
    const post = { id: "p1", slug: "cycling", title: "دورة النيتروجين", excerpt: "…", content: "<p>…</p>" };
    const r = applyBlogPostTranslation(post, { title: "The nitrogen cycle", excerpt: "Short", content: "<p>Body</p>" }, "en");
    expect(r.value).toMatchObject({ slug: "cycling", title: "The nitrogen cycle", excerpt: "Short", content: "<p>Body</p>" });
    expect(r.translationMissing).toBe(false);
  });
});

describe("source hashing and coverage", () => {
  it("changes when Arabic copy changes and ignores non-linguistic specs", () => {
    const a = sourceHash(productSourceFields(product));
    const b = sourceHash(productSourceFields({ ...product, description: "نص جديد" }));
    const c = sourceHash(productSourceFields({ ...product, specifications: { ...product.specifications, power: "10W" } }));
    expect(a).not.toBe(b);
    expect(a).toBe(c);
  });

  it("derives complete / machine / outdated / missing", () => {
    const hash = sourceHash(productSourceFields(product));
    const base = { entityType: "product" as const, entityId: "x", locale: "en" as const, data: {} };
    expect(coverageOf(null, hash)).toBe("missing");
    expect(coverageOf({ ...base, status: "machine", sourceHash: hash }, hash)).toBe("machine");
    expect(coverageOf({ ...base, status: "reviewed", sourceHash: hash }, hash)).toBe("complete");
    expect(coverageOf({ ...base, status: "reviewed", sourceHash: "old" }, hash)).toBe("outdated");
  });
});
