import type { Product, ProductVariant } from "@/types";
import { isVariantActive } from "@shared/variant-commerce";

export function selectedComparisonVariant(product: Product, variantId?: string): ProductVariant | undefined {
    return product.hasVariants ? product.variants?.find(variant => variant.id === variantId && isVariantActive(variant)) : undefined;
}

/** Never substitute the family photograph for a selected model without evidence. */
export function comparisonPhoto(product: Product, variant?: ProductVariant): string | undefined {
    if (variant) return variant.images?.length === 0 ? undefined : variant.image || variant.images?.[0];
    return product.image || product.thumbnail || product.images?.[0] || "/brand/aquavo-v2-icon.svg";
}

/** Variant facts are not inherited from another option or guessed from a label. */
export function comparisonSpecifications(product: Product, variant?: ProductVariant): Record<string, unknown> {
    if (variant) return variant.specifications ?? {};
    return product.specifications ?? {};
}

export function specificationValuesDiffer(values: (string | undefined)[]): boolean {
    // Missing evidence is not a known technical difference.
    const known = values.filter((value): value is string => value !== undefined);
    return new Set(known).size > 1;
}
