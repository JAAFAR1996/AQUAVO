import { describe, expect, it } from "vitest";
import { getSelectedVariantContent } from "../selected-variant-content";
import { isVariantPurchasable } from "@shared/variant-commerce";

const small = { id: "2-6mm", label: "2–6 ملم", price: 3649, stock: 17, specifications: { "المقاس": "2–6 ملم" } };
const large = { id: "5-8mm", label: "5–8 ملم — قريبا", price: null, stock: 0, priceStatus: "pending", availabilityStatus: "coming_soon", specifications: { "المقاس": "5–8 ملم" } };
const archived = { id: "1kg", label: "1 كغ", isArchived: true, price: 3649, stock: 10, specifications: { "الوزن": "1 كغ" } };
const product = {
  slug: "houyi-stream-sand", name: "رمل جداول طبيعي للأكواسكيب — 2–6 ملم", hasVariants: true,
  description: "رمل جداول طبيعي بحبيبات 2–6 ملم لتنسيق أرضية الحوض. يصلح كطبقة ديكورية.\n\nاغسله قبل الاستخدام.",
  specifications: { "حجم الحبيبات": "2–6 ملم", benefits: ["حبيبات طبيعية بحجم 2–6 ملم", "لون طبيعي"], __cardBenefit: "حبيبات 2–6 ملم", usageInstructions: ["اغسله قبل الاستخدام"] },
  variants: [small, large, archived],
};

describe("selected variant content", () => {
  it("uses the selected verified grain size in identity and specifications, without parent-only size claims", () => {
    const result = getSelectedVariantContent(product, large);
    expect(result.name).toBe("رمل جداول طبيعي للأكواسكيب — 5–8 ملم");
    expect(result.specifications["حجم الحبيبات"]).toBe("5–8 ملم");
    expect(JSON.stringify(result)).not.toContain("2–6");
    expect(result.description).toBe("يصلح كطبقة ديكورية.\n\nاغسله قبل الاستخدام.");
    expect(result.specifications.benefits).toEqual(["لون طبيعي"]);
    expect(result.specifications.usageInstructions).toEqual(["اغسله قبل الاستخدام"]);
  });
  it("shows the selected original size without duplicating it", () => {
    expect(getSelectedVariantContent(product, small).name).toBe(product.name);
  });
  it("does not claim a selected dimension before an explicit choice", () => {
    expect(JSON.stringify(getSelectedVariantContent(product))).not.toContain("2–6");
  });
  it.each([archived, { ...large, id: "unknown" }])("ignores archived or unrelated selections", selected => {
    const result = getSelectedVariantContent(product, selected);
    expect(result.name).toBe("رمل جداول طبيعي للأكواسكيب");
    expect(result.specifications["حجم الحبيبات"]).toBeUndefined();
  });
  it("does not infer an unknown dimension from a variant ID or label", () => {
    const unknown = { id: "5-8mm", label: "5–8 ملم" };
    const result = getSelectedVariantContent({ ...product, variants: [unknown] }, unknown);
    expect(result.name).toBe("رمل جداول طبيعي للأكواسكيب");
    expect(result.specifications["حجم الحبيبات"]).toBeUndefined();
  });
  it("handles missing parent descriptions and specifications without inventing details", () => {
    const sparse = { slug: product.slug, name: product.name, hasVariants: true, variants: [large] };
    const result = getSelectedVariantContent(sparse, large);
    expect(result.description).toBe("");
    expect(result.specifications).toEqual({ "حجم الحبيبات": "5–8 ملم" });
  });
  it("reconciles the selected ID with current data rather than stale specs", () => {
    expect(getSelectedVariantContent(product, { ...large, specifications: { "المقاس": "99 ملم" } }).name).toContain("5–8 ملم");
  });
  it("does not strip dimensions or model numbers from other products", () => {
    const other = { ...product, slug: "other-product", name: "Model 2-6mm" };
    const result = getSelectedVariantContent(other, large);
    expect(result.name).toBe(other.name);
    expect(result.description).toBe(other.description);
    expect(result.specifications).toEqual(other.specifications);
  });
  it("preserves non-variant stream-sand records", () => {
    expect(getSelectedVariantContent({ ...product, hasVariants: false }).name).toBe(product.name);
  });
  it("handles translated names and specification labels without a stale dimension", () => {
    const translated = { ...product, name: "Houyi Natural Stream Sand - 2-6mm", description: "Natural 2-6mm grains. Wash lightly.", specifications: { labelled: { "حجم الحبيبات": { label: "Grain Size", value: "2-6mm" } }, benefits: ["Natural 2-6mm grains", "Decorative substrate"] } };
    const result = getSelectedVariantContent(translated, large);
    expect(result.name).toBe("Houyi Natural Stream Sand — 5–8 ملم");
    expect(JSON.stringify(result)).not.toContain("2-6mm");
  });
  it("never mutates canonical identity, claims, inventory, prices or archived history", () => {
    const before = JSON.stringify(product);
    getSelectedVariantContent(product, large);
    expect(JSON.stringify(product)).toBe(before);
    expect(isVariantPurchasable(small)).toBe(true);
    expect(isVariantPurchasable(small, 18)).toBe(false);
    expect(isVariantPurchasable(large)).toBe(false);
    expect(isVariantPurchasable(archived)).toBe(false);
  });
});
