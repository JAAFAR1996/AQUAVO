import { isVariantActive } from "@shared/variant-commerce";
interface PriceSource {
  price?: unknown;
  originalPrice?: unknown;
  stock?: unknown;
  isArchived?: unknown;
  availabilityStatus?: unknown;
  priceStatus?: unknown;
}

interface ProductPriceSource extends PriceSource {
  hasVariants?: boolean;
  variants?: readonly PriceSource[] | null;
}

interface ProductPriceDisplay {
  price: number | null;
  originalPrice: number | null;
  savings: number | null;
  isFromPrice: boolean;
}

// Postgres decimal prices may reach the client as strings despite the Product
// type. Reject missing/invalid values before comparing them numerically.
function positivePrice(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && value.trim() === "") return null;

  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : null;
}

export function getProductPriceDisplay(
  product: ProductPriceSource | null | undefined,
  selectedVariant?: PriceSource | null,
): ProductPriceDisplay {
  const variants = product?.hasVariants ? (product.variants ?? []).filter(isVariantActive) : [];

  if (!selectedVariant && product?.hasVariants) {
    const available = variants.filter(variant => positivePrice(variant.price) !== null && positivePrice(variant.stock) !== null);
    // A sold-out cheap option must not advertise a price the customer cannot
    // buy. Entirely unavailable products can still show their listed prices.
    const priceOptions = available.length > 0 ? available : variants;
    const prices = priceOptions
      .map((variant) => variant.priceStatus === "pending" ? null : positivePrice(variant.price))
      .filter((price): price is number => price !== null);

    // A "from" price represents multiple options, so a parent or another
    // variant's reference price cannot establish a discount for it.
    return {
      price: prices.length > 0 ? Math.min(...prices) : null,
      originalPrice: null,
      savings: null,
      isFromPrice: prices.length > 0,
    };
  }

  const source = selectedVariant ?? product;
  const price = source?.isArchived === true || source?.priceStatus === "pending" ? null : positivePrice(source?.price);
  const referencePrice = positivePrice(source?.originalPrice);
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
