/** Presentation metadata only; price, stock, and purchase eligibility stay authoritative. */
export interface ProductAvailabilitySource {
  stock?: unknown;
  hasVariants?: boolean | null;
  variants?: readonly { stock?: unknown }[] | null;
  specifications?: unknown;
}

function isConfirmedZero(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value) && value === 0;
  if (typeof value !== "string" || value.trim() === "") return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed === 0;
}

/**
 * Announce an explicitly marked incoming product only while its actual stock is
 * confirmed zero. Any stocked option (or positive parent stock) takes precedence.
 * Unknown stock is not evidence that a product is incoming. Historical variants
 * on simple products are ignored, matching the public product/commerce contract.
 */
export function isProductComingSoon(product: ProductAvailabilitySource | null | undefined): boolean {
  if (!product || !isConfirmedZero(product.stock)) return false;
  const specifications = product.specifications;
  if (!specifications || typeof specifications !== "object" || Array.isArray(specifications)) return false;
  if ((specifications as Record<string, unknown>).__availabilityStatus !== "coming_soon") return false;
  if (!product.hasVariants) return true;
  return Array.isArray(product.variants)
    && product.variants.length > 0
    && product.variants.every((variant) => isConfirmedZero(variant?.stock));
}
