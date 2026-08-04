import type { ProductVariant } from "@/types";

export interface VariantDimension {
  key: string;
  label: string;
  values: string[];
}

const DIMENSION_PRIORITY = [
  "اللون",
  "الحجم",
  "المقاس",
  "القدرة",
  "القوة",
  "السعة",
  "الوزن",
  "الطول",
  "العرض",
  "الموديل",
] as const;

const DIMENSION_LABELS: Record<string, string> = {
  اللون: "اللون",
  الحجم: "الحجم",
  المقاس: "المقاس",
  القدرة: "القدرة",
  القوة: "القوة",
  السعة: "السعة",
  الوزن: "الوزن",
  الطول: "الطول",
  العرض: "العرض",
  الموديل: "الموديل",
};

function cleanValue(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function matchesDimensionValue(
  variant: ProductVariant,
  dimensionKey: string,
  value: string,
): boolean {
  return cleanValue(variant.specifications?.[dimensionKey]) === value;
}

function countPreservedSelections(
  variant: ProductVariant,
  selection: Record<string, string>,
  dimensions: VariantDimension[],
  ignoredDimensionKey: string,
): number {
  return dimensions.reduce((score, dimension) => {
    if (dimension.key === ignoredDimensionKey) return score;
    const selectedValue = selection[dimension.key];
    if (!selectedValue) return score;
    return matchesDimensionValue(variant, dimension.key, selectedValue) ? score + 1 : score;
  }, 0);
}

export function extractVariantDimensions(variants: ProductVariant[]): VariantDimension[] {
  if (!Array.isArray(variants) || variants.length < 2) return [];

  return DIMENSION_PRIORITY.flatMap((key) => {
    const values = Array.from(
      new Set(
        variants
          .map((variant) => cleanValue(variant.specifications?.[key]))
          .filter((value): value is string => Boolean(value)),
      ),
    );

    if (values.length < 2) return [];
    return [{ key, label: DIMENSION_LABELS[key] ?? key, values }];
  });
}

export function isMultiDimensionVariantSet(variants: ProductVariant[]): boolean {
  return extractVariantDimensions(variants).length >= 2;
}

export function selectionFromVariant(
  variant: ProductVariant | undefined,
  dimensions: VariantDimension[],
): Record<string, string> {
  if (!variant) return {};
  return dimensions.reduce<Record<string, string>>((selection, dimension) => {
    const value = cleanValue(variant.specifications?.[dimension.key]);
    if (value) selection[dimension.key] = value;
    return selection;
  }, {});
}

export function variantMatchesSelection(
  variant: ProductVariant,
  selection: Record<string, string>,
  dimensions: VariantDimension[],
): boolean {
  return dimensions.every((dimension) => {
    const selectedValue = selection[dimension.key];
    if (!selectedValue) return true;
    return matchesDimensionValue(variant, dimension.key, selectedValue);
  });
}

export function chooseVariantForSelection(
  variants: ProductVariant[],
  selection: Record<string, string>,
  dimensions: VariantDimension[],
  preferredDimensionKey?: string,
): ProductVariant | undefined {
  const exactAvailable = variants.find(
    (variant) => variant.stock > 0 && variantMatchesSelection(variant, selection, dimensions),
  );
  if (exactAvailable) return exactAvailable;

  // Some product dimensions describe the same physical variant rather than a
  // Cartesian combination (for example aquarium capacity + model). In that
  // case, changing one value must switch to the variant that owns that value
  // and synchronize the remaining dimensions instead of rejecting the click.
  if (preferredDimensionKey) {
    const preferredValue = selection[preferredDimensionKey];
    if (preferredValue) {
      const matchingVariants = variants.filter((variant) =>
        matchesDimensionValue(variant, preferredDimensionKey, preferredValue),
      );
      const availableMatches = matchingVariants.filter((variant) => variant.stock > 0);
      const candidates = availableMatches.length > 0 ? availableMatches : matchingVariants;

      let bestCandidate = candidates[0];
      let bestScore = bestCandidate
        ? countPreservedSelections(bestCandidate, selection, dimensions, preferredDimensionKey)
        : -1;

      for (const candidate of candidates.slice(1)) {
        const score = countPreservedSelections(
          candidate,
          selection,
          dimensions,
          preferredDimensionKey,
        );
        if (score > bestScore) {
          bestCandidate = candidate;
          bestScore = score;
        }
      }

      if (bestCandidate) return bestCandidate;
    }
  }

  const exact = variants.find((variant) => variantMatchesSelection(variant, selection, dimensions));
  if (exact) return exact;

  return variants.find((variant) => variant.stock > 0) ?? variants[0];
}

export function isDimensionValueAvailable({
  variants,
  dimensionKey,
  value,
}: {
  variants: ProductVariant[];
  dimensions: VariantDimension[];
  selection: Record<string, string>;
  dimensionKey: string;
  value: string;
}): boolean {
  // A value is selectable when any stocked variant owns it. The selector will
  // then synchronize the other displayed dimensions to that concrete variant.
  return variants.some(
    (variant) => variant.stock > 0 && matchesDimensionValue(variant, dimensionKey, value),
  );
}
