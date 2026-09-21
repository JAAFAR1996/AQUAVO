import { i18next } from "@/i18n";
/**
 * Identity values of the product quick filters. They are Arabic strings
 * because that is what the catalogue data, the URL state and the analytics
 * events have always carried. Only their *labels* are localized, through the
 * "products" namespace (tags.* / difficulty.*). Never compare against a
 * translated label.
 */
export const PRODUCT_TAG_VALUES = {
  new: i18next.t("pages:product-filter-values.s1"),
  bestSeller: i18next.t("pages:product-filter-values.s2"),
  eco: i18next.t("pages:product-filter-values.s3"),
} as const;

export const PRODUCT_DIFFICULTY_VALUES = {
  beginner: i18next.t("pages:product-filter-values.s4"),
  intermediate: i18next.t("pages:product-filter-values.s5"),
  advanced: i18next.t("pages:product-filter-values.s6"),
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
