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
    return cleanValue(variant.specifications?.[dimension.key]) === selectedValue;
  });
}

export function chooseVariantForSelection(
  variants: ProductVariant[],
  selection: Record<string, string>,
  dimensions: VariantDimension[],
): ProductVariant | undefined {
  const exactAvailable = variants.find(
    (variant) => variant.stock > 0 && variantMatchesSelection(variant, selection, dimensions),
  );
  if (exactAvailable) return exactAvailable;

  const exact = variants.find((variant) => variantMatchesSelection(variant, selection, dimensions));
  if (exact) return exact;

  return variants.find((variant) => variant.stock > 0) ?? variants[0];
}

export function isDimensionValueAvailable({
  variants,
  dimensions,
  selection,
  dimensionKey,
  value,
}: {
  variants: ProductVariant[];
  dimensions: VariantDimension[];
  selection: Record<string, string>;
  dimensionKey: string;
  value: string;
}): boolean {
  const candidateSelection = { ...selection, [dimensionKey]: value };
  return variants.some(
    (variant) => variant.stock > 0 && variantMatchesSelection(variant, candidateSelection, dimensions),
  );
}
