import { useEffect, useMemo, useState } from "react";
import { Check, Palette, Ruler, Sparkles, Tag } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ProductVariant } from "@/types";
import {
  chooseVariantForSelection,
  extractVariantDimensions,
  isDimensionValueAvailable,
  selectionFromVariant,
} from "@/lib/variant-dimensions";

interface MultiDimensionVariantSelectorProps {
  variants: ProductVariant[];
  selectedVariantId: string;
  onVariantSelect: (variant: ProductVariant) => void;
}

const AQUARIUM_MEASUREMENTS_BY_MODEL: Record<string, string> = {
  "YXL-003": "40 × 23 × 25 سم",
  "YKK-50": "50 × 27 × 30 سم",
  "YKK-60": "60 × 30 × 35 سم",
  "YEE-1090": "35 × 35 × 35 سم",
  "YCG-40": "40 × 40 × 40 سم",
  "C5-1062": "60 × 40 × 40 سم",
};

function cleanSpecificationValue(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function getAquariumModel(variant: ProductVariant): string | null {
  return (
    cleanSpecificationValue(variant.specifications?.الموديل) ??
    cleanSpecificationValue(variant.sku) ??
    cleanSpecificationValue(variant.label)
  );
}

function getAquariumMeasurement(variant: ProductVariant): string | null {
  const directMeasurement =
    cleanSpecificationValue(variant.specifications?.الأبعاد) ??
    cleanSpecificationValue(variant.specifications?.القياسات) ??
    cleanSpecificationValue(variant.specifications?.المقاس);
  if (directMeasurement) return directMeasurement;

  const model = getAquariumModel(variant);
  return model ? AQUARIUM_MEASUREMENTS_BY_MODEL[model] ?? null : null;
}

function getAquariumCapacity(variant: ProductVariant | undefined): string | null {
  const capacity = cleanSpecificationValue(variant?.specifications?.السعة);
  return capacity?.replace(/^~\s*/, "") ?? null;
}

function isAquariumMeasurementSet(variants: ProductVariant[]): boolean {
  return (
    variants.length > 1 &&
    variants.every((variant) => {
      const model = getAquariumModel(variant);
      return Boolean(
        model &&
          AQUARIUM_MEASUREMENTS_BY_MODEL[model] &&
          getAquariumMeasurement(variant) &&
          getAquariumCapacity(variant),
      );
    })
  );
}

function DimensionIcon({ dimensionKey }: { dimensionKey: string }) {
  if (dimensionKey === "اللون") {
    return <Palette className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
  }
  return <Ruler className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
}

export function MultiDimensionVariantSelector({
  variants,
  selectedVariantId,
  onVariantSelect,
}: MultiDimensionVariantSelectorProps) {
  const dimensions = useMemo(() => extractVariantDimensions(variants), [variants]);
  const selectedVariant = useMemo(
    () => variants.find((variant) => variant.id === selectedVariantId) ?? variants[0],
    [variants, selectedVariantId],
  );
  const aquariumMeasurementSet = useMemo(
    () => isAquariumMeasurementSet(variants),
    [variants],
  );
  const selectedMeasurement = aquariumMeasurementSet
    ? getAquariumMeasurement(selectedVariant)
    : null;
  const selectedCapacity = aquariumMeasurementSet
    ? getAquariumCapacity(selectedVariant)
    : null;
  const modelIsSelectableDimension = dimensions.some((dimension) => dimension.key === "الموديل");
  const selectedModel = !aquariumMeasurementSet && !modelIsSelectableDimension
    ? cleanSpecificationValue(selectedVariant?.specifications?.الموديل)
    : null;
  const [selection, setSelection] = useState<Record<string, string>>({});

  useEffect(() => {
    setSelection(selectionFromVariant(selectedVariant, dimensions));
  }, [selectedVariant, dimensions]);

  if (variants.length <= 1 || (!aquariumMeasurementSet && dimensions.length < 2)) return null;

  const selectValue = (dimensionKey: string, value: string) => {
    const nextSelection = { ...selection, [dimensionKey]: value };
    const nextVariant = chooseVariantForSelection(
      variants,
      nextSelection,
      dimensions,
      dimensionKey,
    );
    if (!nextVariant) return;

    setSelection(selectionFromVariant(nextVariant, dimensions));
    onVariantSelect(nextVariant);
  };

  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-4" dir="rtl">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-sm font-bold">اختار مواصفات القطعة</span>
      </div>

      {aquariumMeasurementSet ? (
        <>
          <fieldset className="space-y-2.5">
            <legend id="aquarium-measurements" className="flex items-center gap-2 text-sm font-medium">
              <Ruler className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span>القياسات</span>
              {selectedMeasurement && (
                <span className="font-bold text-primary">: {selectedMeasurement}</span>
              )}
            </legend>

            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="aquarium-measurements">
              {variants.map((variant) => {
                const measurement = getAquariumMeasurement(variant);
                if (!measurement) return null;

                const selected = variant.id === selectedVariant?.id;
                const available = variant.stock > 0;

                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => available && onVariantSelect(variant)}
                    disabled={!available}
                    aria-pressed={selected}
                    aria-label={!available ? `القياسات ${measurement}، مو متوفر هسه` : `القياسات ${measurement}`}
                    className={cn(
                      "min-h-11 rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/50",
                      !available && "cursor-not-allowed opacity-40 line-through",
                    )}
                  >
                    {selected && <Check className="ml-1 inline h-3.5 w-3.5" aria-hidden="true" />}
                    {measurement}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {selectedCapacity && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-sm" aria-live="polite">
              <span className="text-muted-foreground">السعة</span>
              <span className="font-bold text-primary">{selectedCapacity}</span>
            </div>
          )}
        </>
      ) : (
        <>
          {dimensions.map((dimension) => {
            const selectedValue = selection[dimension.key];
            const labelId = `variant-dimension-${dimension.key}`;

            return (
              <fieldset key={dimension.key} className="space-y-2.5">
                <legend id={labelId} className="flex items-center gap-2 text-sm font-medium">
                  <DimensionIcon dimensionKey={dimension.key} />
                  <span>{dimension.label}</span>
                  {selectedValue && <span className="font-bold text-primary">: {selectedValue}</span>}
                </legend>

                <div className="flex flex-wrap gap-2" role="group" aria-labelledby={labelId}>
                  {dimension.values.map((value) => {
                    const selected = selectedValue === value;
                    const available = isDimensionValueAvailable({
                      variants,
                      dimensionKey: dimension.key,
                      value,
                    });

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => selectValue(dimension.key, value)}
                        disabled={!available}
                        aria-pressed={selected}
                        aria-label={!available ? `${dimension.label} ${value}، مو متوفر هسه` : `${dimension.label} ${value}`}
                        className={cn(
                          "min-h-11 rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground hover:border-primary/50",
                          !available && "cursor-not-allowed opacity-40 line-through",
                        )}
                      >
                        {selected && <Check className="ml-1 inline h-3.5 w-3.5" aria-hidden="true" />}
                        {value}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}

          {selectedModel && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-sm" aria-live="polite">
              <span className="text-muted-foreground">الموديل</span>
              <span className="font-bold text-foreground">{selectedModel}</span>
            </div>
          )}
        </>
      )}

      {selectedVariant && (
        <div className="grid gap-2 border-t border-border pt-4 text-sm sm:grid-cols-2" aria-live="polite">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-muted-foreground">السعر:</span>
            <span className="font-bold text-primary">{Number(selectedVariant.price).toLocaleString("en-US")} د.ع</span>
          </div>
          <div className="flex items-center gap-2 sm:justify-end">
            {selectedVariant.stock > 0 ? (
              <>
                <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                <span className="text-emerald-600 dark:text-emerald-400">متوفر ({selectedVariant.stock} قطعة)</span>
              </>
            ) : (
              <span className="text-destructive">هذا الخيار غير متوفر حالياً</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
