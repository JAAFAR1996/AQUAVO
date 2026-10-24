/** Shared public-option contract; historical variants remain stored, never sold. */
export interface VariantCommerceSource {
  price?: unknown;
  stock?: unknown;
  priceStatus?: unknown;
  availabilityStatus?: unknown;
  isArchived?: unknown;
}
export function positiveVariantPrice(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
export function isVariantActive(variant: VariantCommerceSource | null | undefined): boolean {
  return Boolean(variant) && variant?.isArchived !== true;
}
export function isVariantComingSoon(variant: VariantCommerceSource | null | undefined): boolean {
  return variant?.availabilityStatus === 'coming_soon';
}
export function isVariantPurchasable(variant: VariantCommerceSource | null | undefined, quantity = 1): boolean {
  return isVariantActive(variant) && !isVariantComingSoon(variant)
    && variant?.priceStatus !== 'pending' && positiveVariantPrice(variant?.price) !== null
    && Number.isInteger(quantity) && quantity > 0
    && Number.isInteger(Number(variant?.stock)) && Number(variant?.stock) >= quantity;
}
