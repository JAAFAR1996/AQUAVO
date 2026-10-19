import { describe, expect, it } from "vitest";
import { areFoodAlternatives, deriveFoodProfile, foodFilterSchema, getFoodProfile, matchesFoodFilter } from "../food-choice";
import { applyProductTranslation } from "../i18n/content";

const betta = { name: "طعام بيتا (فايتر) — 15 غرام", category: "طعام الأسماك", specifications: { "الوزن": "15 غرام", "الأسماك المناسبة": "الفايتر (بيتا)" } };

describe("food choice from declared product facts", () => {
  it("retains unknown size, buoyancy and diet identity instead of deriving them from format", () => {
    const profile = getFoodProfile({ ...betta, specifications: { ...betta.specifications, "النوع": "حبيبات" } });
    expect(profile).toMatchObject({ weight: "15 غرام", particleSize: null, buoyancy: "unknown", dietRole: "unknown", targets: ["betta"] });
  });

  it("does not recommend hermit crab food as a betta alternative", () => {
    const crab = { name: "طعام سرطان الناسك", category: "طعام الأسماك", specifications: { "الحيوانات المناسبة": "سرطان الناسك" } };
    expect(areFoodAlternatives(betta, crab)).toBe(false);
    expect(matchesFoodFilter(crab, "betta")).toBe(false);
    expect(matchesFoodFilter(crab, "hermit-crab")).toBe(true);
  });

  it("does not confuse shrimp ingredients or Artemia eggs with intended shrimp use", () => {
    expect(matchesFoodFilter({ name: "طعام جولدفش", category: "food", specifications: { "الأسماك المناسبة": "جولدفش", "المكونات الأساسية": "مسحوق الروبيان" } }, "shrimp")).toBe(false);
    expect(matchesFoodFilter({ name: "Shelled shrimp eggs", category: "food", specifications: { "الفئة المستهدفة": "صغار الأسماك" } }, "shrimp")).toBe(false);
    expect(getFoodProfile({ name: "طعام جولدفش مع الروبيان", category: "food" })?.targets).toEqual(["goldfish"]);
    expect(matchesFoodFilter({ name: "روبيان مجفف لتغذية الأسماك", category: "food" }, "shrimp")).toBe(false);
    expect(matchesFoodFilter({ name: "طعام روبيان الزينة", category: "food" }, "shrimp")).toBe(true);
  });

  it("separates feeding equipment and supplements from food alternatives", () => {
    const cup = { name: "كوب تغذية أسماك بماصة شفط", category: "food" };
    const supplement = { ...betta, specifications: { ...betta.specifications, "الاستخدام": "غذاء تكميلي" } };
    expect(matchesFoodFilter(cup, "accessories")).toBe(true);
    expect(matchesFoodFilter(cup, "betta")).toBe(false);
    expect(matchesFoodFilter(supplement, "supplement")).toBe(true);
    expect(areFoodAlternatives(betta, supplement)).toBe(false);
    expect(matchesFoodFilter({ name: "أنبوب تغذية الروبيان", category: "food" }, "accessories")).toBe(true);
    const withUsage = { ...supplement, specifications: { ...betta.specifications, "الاستخدام": "بكميات صغيرة", "نوع الغذاء": "غذاء تكميلي" } };
    expect(matchesFoodFilter(withUsage, "supplement")).toBe(true);
    expect(areFoodAlternatives(betta, withUsage)).toBe(false);
  });

  it("allows comparison of explicitly targeted betta foods without copying missing facts", () => {
    const large = { ...betta, name: "طعام بيتا — 130 غرام", specifications: { ...betta.specifications, "الوزن": "130 غرام", "حجم الحبيبات": "0.8 ملم بحسب بيانات المنتج" } };
    expect(areFoodAlternatives(betta, large)).toBe(true);
    expect(getFoodProfile(large)?.particleSize).toBe("0.8 ملم بحسب بيانات المنتج");
    expect(getFoodProfile(betta)?.particleSize).toBeNull();
  });

  it("does not assign a species or complete diet to an unspecified food", () => {
    const generic = { name: "طعام عالي البروتين", category: "food", specifications: { "بروتين خام": "≥ 48%" } };
    expect(getFoodProfile(generic)).toMatchObject({ targets: [], dietRole: "unknown" });
    expect(areFoodAlternatives(betta, generic)).toBe(false);
    expect(foodFilterSchema.safeParse("unknown-animal").success).toBe(false);
  });

  it.each(["حبيبات غير طافية", "حبيبات مو طافية", "Non-floating pellets", "Not floating"])(
    "does not turn a negated floating description into a floating or sinking claim: %s",
    kind => {
      expect(getFoodProfile({ ...betta, specifications: { "النوع": kind } })?.buoyancy).toBe("unknown");
    },
  );

  it("retains an explicit positive sinking description when floating is negated", () => {
    expect(getFoodProfile({ ...betta, specifications: { "الطفو": "غاطس وغير طافي" } })?.buoyancy).toBe("sinking");
  });

  it("does not classify a specifically excluded animal as an intended audience", () => {
    expect(getFoodProfile({ name: "طعام أسماك", category: "food", specifications: { "الأسماك المناسبة": "جولدفش، غير مناسب للبيتا" } })?.targets).toEqual(["goldfish"]);
  });

  it("preserves canonical classification and translated facts when translated spec labels are arbitrary", () => {
    const source = { ...betta, specifications: { ...betta.specifications, "حجم الحبيبات": "0.8 ملم", "الاستخدام": "غذاء تكميلي" } };
    const localized = applyProductTranslation(source, {
      name: "خواردنی بێتا",
      description: "خواردنی ماسی",
      specifications: { labelled: {
        "الأسماك المناسبة": { label: "Animal this packet is intended for", value: "بێتا" },
        "الوزن": { label: "Packet contents", value: "15 g" },
        "حجم الحبيبات": { label: "Granule diameter", value: "0.8 mm" },
        "الاستخدام": { label: "How to use", value: "خواردنی تەواوکەر" },
      } },
    }, "ckb").value;

    expect(matchesFoodFilter(localized, "betta")).toBe(true);
    expect(matchesFoodFilter(localized, "supplement")).toBe(true);
    expect(getFoodProfile(localized)).toMatchObject({
      targets: ["betta"], intendedFor: "بێتا", weight: "15 g", particleSize: "0.8 mm", dietRole: "supplement",
    });
  });

  it("derives fresh canonical metadata rather than reusing a stored classification", () => {
    const stale = { accessory: false, targets: ["shrimp"], intendedFor: "روبيان", weight: null, particleSize: null, buoyancy: "sinking", dietRole: "complete" };
    const source = { ...betta, specifications: { ...betta.specifications, __foodChoice: stale } };
    expect(deriveFoodProfile(source)?.targets).toEqual(["betta"]);
    const localized = applyProductTranslation(source, { name: "Betta food", description: "Food" }, "en").value;
    expect(getFoodProfile(localized)).toMatchObject({ targets: ["betta"], intendedFor: null, buoyancy: "unknown", dietRole: "unknown" });
  });

  it("rejects malformed attached metadata and derives from available product facts", () => {
    const source = { ...betta, specifications: { ...betta.specifications, __foodChoice: { targets: ["unknown-animal"] } } };
    expect(getFoodProfile(source)?.targets).toEqual(["betta"]);
  });
});
