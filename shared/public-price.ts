import { isVariantActive, isVariantComingSoon, positiveVariantPrice } from "./variant-commerce.js";

/**
 * One price-presentation contract shared by the browser and crawler/SSR.
 * Database zero/NULL is an unpriced item, never a customer-facing sale price.
 * The server still decides whether a product can actually be purchased.
 */
export interface PublicPriceSource {
  price?: unknown;
  originalPrice?: unknown;
  stock?: unknown;
  priceStatus?: unknown;
  availabilityStatus?: unknown;
  isArchived?: unknown;
}

export interface PublicPricedProduct extends PublicPriceSource {
  hasVariants?: boolean | null;
  variants?: readonly PublicPriceSource[] | null;
}

export interface PublicProductPriceDisplay {
  price: number | null;
  originalPrice: number | null;
  savings: number | null;
  isFromPrice: boolean;
}

export interface PublicProductPriceRange {
  min: number;
  max: number;
}

function displayOptions(product: PublicPricedProduct): PublicPriceSource[] {
  const active = (product.variants ?? []).filter(isVariantActive);
  const inStockAndPriced = active.filter((option) =>
    option.priceStatus !== "pending"
    && !isVariantComingSoon(option)
    && positiveVariantPrice(option.price) !== null
    && positiveVariantPrice(option.stock) !== null
  );
  // When everything is sold out, a known historical price is still informative.
  return inStockAndPriced.length > 0 ? inStockAndPriced : active;
}

export function getPublicProductPriceRange(
  product: PublicPricedProduct | null | undefined,
): PublicProductPriceRange | null {
  if (!product) return null;

  if (!product.hasVariants) {
    const price = product.priceStatus === "pending" || product.isArchived === true
      ? null
      : positiveVariantPrice(product.price);
    return price === null ? null : { min: price, max: price };
  }

  const prices = displayOptions(product)
    .map((option) =>
      option.priceStatus === "pending" || option.isArchived === true
        ? null
        : positiveVariantPrice(option.price)
    )
    .filter((price): price is number => price !== null);

  if (prices.length === 0) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function getProductPriceDisplay(
  product: PublicPricedProduct | null | undefined,
  selectedVariant?: PublicPriceSource | null,
): PublicProductPriceDisplay {
  if (!selectedVariant && product?.hasVariants) {
    const range = getPublicProductPriceRange(product);
    return {
      price: range?.min ?? null,
      originalPrice: null,
      savings: null,
      isFromPrice: range !== null,
    };
  }

  const source = selectedVariant ?? product;
  const price = source?.isArchived === true || source?.priceStatus === "pending"
    ? null
    : positiveVariantPrice(source?.price);
  const referencePrice = positiveVariantPrice(source?.originalPrice);
  const originalPrice = price !== null && referencePrice !== null && referencePrice > price
    ? referencePrice
    : null;

  return {
    price,
    originalPrice,
    savings: price !== null && originalPrice !== null ? originalPrice - price : null,
    isFromPrice: false,
  };
}
