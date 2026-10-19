import { z } from "zod";
import { canonicalProductCategory } from "./seo-contract.js";

export const FOOD_TARGETS = ["betta", "goldfish", "small-fish", "fry", "shrimp", "koi", "hermit-crab"] as const;
export type FoodTarget = (typeof FOOD_TARGETS)[number];
export const FOOD_FILTERS = ["all", ...FOOD_TARGETS, "supplement", "accessories"] as const;
export const foodFilterSchema = z.enum(FOOD_FILTERS);
export type FoodFilter = z.infer<typeof foodFilterSchema>;

type FoodProductInput = {
  name: string;
  category?: string | null;
  specifications?: unknown;
};

export const foodProfileSchema = z.object({
  accessory: z.boolean(),
  targets: z.array(z.enum(FOOD_TARGETS)),
  intendedFor: z.string().nullable(),
  weight: z.string().nullable(),
  particleSize: z.string().nullable(),
  buoyancy: z.enum(["floating", "sinking", "mixed", "unknown"]),
  dietRole: z.enum(["complete", "supplement", "unknown"]),
}).strict();
export type FoodProfile = z.infer<typeof foodProfileSchema>;

// Source keys also let the content localizer carry the corresponding translated
// values through its labelled map, whose display labels need not be predictable.
export const FOOD_FACT_SPEC_KEYS = {
  intendedFor: ["الأسماك المناسبة", "الحيوانات المناسبة", "الفئة المستهدفة", "الروبيان المناسب", "Suitable for", "Intended species", "Target species"],
  weight: ["الوزن", "Weight", "Net weight"],
  particleSize: ["حجم الحبيبات", "حجم الحبيبة", "Particle size", "Pellet size"],
} as const;

function normalize(value: string): string {
  return value.toLowerCase().replace(/[\u064B-\u065F\u0670]/g, "").replace(/[أإآ]/g, "ا");
}

function textField(specs: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = specs[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function productSpecs(product: FoodProductInput): Record<string, unknown> {
  return product.specifications && typeof product.specifications === "object" && !Array.isArray(product.specifications)
    ? product.specifications as Record<string, unknown>
    : {};
}

export function isFoodCategory(category: string | null | undefined): boolean {
  const canonical = canonicalProductCategory(category);
  return canonical === "طعام الأسماك" || /^(fish food|fish foods|خواردنی ماسی)$/i.test(canonical ?? "");
}

/**
 * Organize declared product facts, not biological suitability. In particular,
 * ingredients and marketing descriptions are never used as intended species:
 * shrimp meal in goldfish food must not turn it into a shrimp-food recommendation.
 * Missing particle size, buoyancy and diet identity remain unknown.
 */
export function deriveFoodProfile(product: FoodProductInput): FoodProfile | null {
  if (!isFoodCategory(product.category)) return null;
  // Always derive from canonical product fields. Previously stored/attached
  // __foodChoice metadata must never become the source of a fresh derivation.
  const specs = productSpecs(product);
  const kind = textField(specs, ["النوع", "Type", "type"]) ?? "";
  const identity = normalize(`${product.name} ${kind}`);
  const accessory = /(?:كوب|حلقة|انبوب|بوري|صحن|طبق|مخروط|ملقط)\s+(?:ال)?تغذي|مغذي.*(?:اوتوماتيك|تلقائي)|\b(?:feeding (?:cup|ring|tube|dish|bowl|cone|tongs)|automatic (?:fish )?feeder)\b/.test(identity);
  const intendedFor = textField(specs, FOOD_FACT_SPEC_KEYS.intendedFor);
  // Ingredient suffixes and explicit exclusions do not declare an audience.
  const nameAudience = normalize(product.name).split(/\s+(?:(?:مع|بنكهة|بمسحوق|بمستخلص|بالروبيان|بالجمبري)(?:\s|$)|(?:with|containing|made from|made with)\b)/)[0];
  const audience = normalize(intendedFor ?? nameAudience).split(/(?:غير\s+(?:مناسب|مخصص)|لا\s+(?:يناسب|يصلح)|ليس|ليست|\b(?:not (?:for|suitable|intended)|excluding)\b)/)[0];
  const targets: FoodTarget[] = [];
  if (!accessory) {
    if (/بيتا|فايتر|\bbetta\b/.test(audience)) targets.push("betta");
    if (/جولد|رانشو|گۆڵد|\bgoldfish\b|\branchu\b/.test(audience)) targets.push("goldfish");
    if (/صغيرة الفم|صغيره الفم|الزينة الصغيرة|جوبي|گوپي|تترا|رازبورا|\b(?:small[- ]mouthed|small[- ]mouth|small ornamental|gupp(?:y|ies)|tetras?|rasboras?)\b/.test(audience)) targets.push("small-fish");
    if (/صغار الاسماك|\bfry\b/.test(audience)) targets.push("fry");
    // A shrimp ingredient sold as food (e.g. dried shrimp) is not shrimp food.
    const declaresShrimpFood = intendedFor !== null || /(?:طعام|غذاء|اكل|علف)\s+(?:(?:خاص|مخصص)\s+)?(?:لل?|ال)?(?:روبيان|جمبري)|\b(?:shrimp (?:food|feed|pellets?|flakes?)|(?:food|feed) for (?:ornamental )?shrimp)\b/.test(audience);
    if (declaresShrimpFood && /روبيان|جمبري|\bshrimp\b/.test(audience) && !/ارتميا|ارتيميا|brine|eggs|بيض/.test(audience)) targets.push("shrimp");
    if (/كوي|الكارب|\bkoi\b|\bbutterfly carp\b/.test(audience)) targets.push("koi");
    if (/سرطان الناسك|\bhermit crab\b/.test(audience)) targets.push("hermit-crab");
  }

  const dietFields = ["نوع النظام الغذائي", "نوع الغذاء", "Diet type", "الاستخدام", "Usage"];
  const dietRole = [...dietFields.map(key => textField(specs, [key])), kind]
    .filter((value): value is string => value !== null)
    .map(value => {
      const use = normalize(value);
      if (/تكميلي|\b(?:supplementary|supplemental)\b/.test(use)) return "supplement" as const;
      if (!/(?:ليس|ليست|غير|مو)|\b(?:not|non)\b/.test(use) && /غذاء (?:يومي )?(?:كامل|متكامل)|\bcomplete (?:daily )?(?:food|feed|diet)\b/.test(use)) return "complete" as const;
      return "unknown" as const;
    }).find(role => role !== "unknown") ?? "unknown";
  const buoyancyText = normalize(textField(specs, ["الطفو", "طفو الطعام", "سلوك الطعام", "Buoyancy", "buoyancy"]) ?? kind);
  const positiveBuoyancy = buoyancyText.replace(/(?:غير|ليس|ليست|مو|لا)\s*(?:طاف\S*|غاطس\S*)|\b(?:non|not)[\s-]+(?:a\s+)?(?:floating|sinking)\b/g, "");
  const floating = /طاف|\bfloating\b/.test(positiveBuoyancy);
  const sinking = /غاطس|\bsinking\b/.test(positiveBuoyancy);

  return {
    accessory,
    targets,
    intendedFor,
    weight: textField(specs, FOOD_FACT_SPEC_KEYS.weight),
    particleSize: textField(specs, FOOD_FACT_SPEC_KEYS.particleSize),
    buoyancy: floating && sinking ? "mixed" : floating ? "floating" : sinking ? "sinking" : "unknown",
    dietRole,
  };
}

export function getFoodProfile(product: FoodProductInput): FoodProfile | null {
  if (!isFoodCategory(product.category)) return null;
  const attached = foodProfileSchema.safeParse(productSpecs(product).__foodChoice);
  return attached.success ? attached.data : deriveFoodProfile(product);
}

export function matchesFoodFilter(product: FoodProductInput, filter: FoodFilter): boolean {
  if (filter === "all") return true;
  const profile = getFoodProfile(product);
  if (!profile) return false;
  if (filter === "accessories") return profile.accessory;
  if (profile.accessory) return false;
  if (filter === "supplement") return profile.dietRole === "supplement";
  return profile.targets.includes(filter);
}

/** Shared audience permits comparison; it never claims identical formulation. */
export function areFoodAlternatives(source: FoodProductInput, candidate: FoodProductInput): boolean {
  const from = getFoodProfile(source);
  const to = getFoodProfile(candidate);
  if (!from || !to || from.accessory || to.accessory) return false;
  if ((from.dietRole === "supplement") !== (to.dietRole === "supplement")) return false;
  return from.targets.some(target => to.targets.includes(target));
}
