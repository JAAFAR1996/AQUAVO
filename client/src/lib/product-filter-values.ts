/**
 * Identity values of the product quick filters. They are Arabic strings
 * because that is what the catalogue data, the URL state and the analytics
 * events have always carried. Only their *labels* are localized, through the
 * "products" namespace (tags.* / difficulty.*). Never compare against a
 * translated label.
 */
export const PRODUCT_TAG_VALUES = {
  new: "جديد",
  bestSeller: "الأكثر مبيعاً",
  eco: "صديق للبيئة",
} as const;

export const PRODUCT_DIFFICULTY_VALUES = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
} as const;

export type ProductTagKey = keyof typeof PRODUCT_TAG_VALUES;
export type ProductDifficultyKey = keyof typeof PRODUCT_DIFFICULTY_VALUES;

const TAG_KEY_BY_VALUE = Object.fromEntries(Object.entries(PRODUCT_TAG_VALUES).map(([k, v]) => [v, k])) as Record<string, ProductTagKey>;
const DIFFICULTY_KEY_BY_VALUE = Object.fromEntries(Object.entries(PRODUCT_DIFFICULTY_VALUES).map(([k, v]) => [v, k])) as Record<string, ProductDifficultyKey>;

export function productTagKey(value: string): ProductTagKey | undefined {
  return TAG_KEY_BY_VALUE[value];
}
export function productDifficultyKey(value: string): ProductDifficultyKey | undefined {
  return DIFFICULTY_KEY_BY_VALUE[value];
}
