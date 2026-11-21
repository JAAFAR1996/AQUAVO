import { isVariantPurchasable, type VariantCommerceSource } from "./variant-commerce.js";

export const HOME_PICK_COUNT = 4;
export const HOME_PICK_INITIAL_CANDIDATE_LIMIT = 12;
// Preserve the old homepage fallback's candidate ceiling and ranking. The API
// filters these candidates before returning the four cards to the browser.
export const HOME_PICK_CANDIDATE_LIMIT = 500;

/** The homepage's existing selection policy, shared without changing catalogue policy. */
export function isHomePickProduct(product: {
  price?: unknown;
  stock?: unknown;
  hasVariants?: boolean | null;
  variants?: readonly VariantCommerceSource[] | null;
}): boolean {
  if (product.hasVariants && Array.isArray(product.variants) && product.variants.length) {
    return product.variants.some((variant) => isVariantPurchasable(variant));
  }
  return Number(product.price ?? 0) > 0 && Number(product.stock ?? 0) > 0;
}
