import { useMemo } from "react";
import { Check, Sparkles, Tag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProductVariant } from "@/types";
import { extractVariantDimensions, isMultiDimensionVariantSet } from "@/lib/variant-dimensions";

interface EmbeddedVariantSelectorProps {
  variants: ProductVariant[];
  selectedVariantId: string;
  onVariantSelect: (variant: ProductVariant) => void;
  title?: string;
  productCategory?: string;
}

function cleanSpecificationValue(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

export function EmbeddedVariantSelector({
  variants,
  selectedVariantId,
  onVariantSelect,
  title,
}: EmbeddedVariantSelectorProps) {
  const dimensions = useMemo(() => extractVariantDimensions(variants), [variants]);
  const sortedVariants = useMemo(
    () => [...variants].sort((a, b) => Number(a.price) - Number(b.price)),
    [variants],
  );

  if (!variants || variants.length <= 1 || isMultiDimensionVariantSet(variants)) return null;

  const selectedVariant = sortedVariants.find((variant) => variant.id === selectedVariantId) ?? sortedVariants[0];
  const selectedModel = cleanSpecificationValue(selectedVariant.specifications?.الموديل);
  const detectedTitle = dimensions[0]?.label ? `اختار ${dimensions[0].label}` : "اختار الخيار";

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4" dir="rtl">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-sm font-bold" id="embedded-variant-title">{title || detectedTitle}</span>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-labelledby="embedded-variant-title">
        {sortedVariants.map((variant) => {
          const selected = variant.id === selectedVariant.id;
          const inStock = variant.stock > 0;

          return (
            <button
              key={variant.id}
              type="button"
              onClick={() => onVariantSelect(variant)}
              disabled={!inStock}
              aria-pressed={selected}
              aria-label={!inStock ? `${variant.label}، غير متوفر` : variant.label}
              className={cn(
                "min-h-11 rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:border-primary/50",
                !inStock && "cursor-not-allowed opacity-45 line-through",
              )}
            >
              {selected && <Check className="ml-1 inline h-3.5 w-3.5" aria-hidden="true" />}
              {variant.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-3 text-sm" aria-live="polite">
        {selectedModel && (
          <span className="inline-flex items-center gap-2">
            <span className="text-muted-foreground">الموديل:</span>
            <span className="font-bold text-foreground">{selectedModel}</span>
          </span>
        )}

        <span className="inline-flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-muted-foreground">السعر:</span>
          <span className="font-bold text-primary">{Number(selectedVariant.price).toLocaleString("en-US")} د.ع</span>
        </span>

        {selectedVariant.originalPrice && selectedVariant.originalPrice > selectedVariant.price && (
          <>
            <span className="text-sm text-muted-foreground line-through">
              {Number(selectedVariant.originalPrice).toLocaleString("en-US")} د.ع
            </span>
            <Badge variant="destructive" className="text-[10px]">
              خصم {Math.round(((selectedVariant.originalPrice - selectedVariant.price) / selectedVariant.originalPrice) * 100)}%
            </Badge>
          </>
        )}

        <span className="basis-full text-xs sm:mr-auto sm:basis-auto">
          {selectedVariant.stock > 0 ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              متوفر ({selectedVariant.stock} قطعة)
            </span>
          ) : (
            <span className="text-destructive">غير متوفر حالياً</span>
          )}
        </span>
      </div>
    </div>
  );
}

export function EmbeddedVariantSelectorCompact({
  variants,
  selectedVariantId,
  onVariantSelect,
}: Omit<EmbeddedVariantSelectorProps, "title" | "productCategory">) {
  if (!variants || variants.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-2" dir="rtl" role="group" aria-label="خيارات المنتج">
      {variants.map((variant) => {
        const selected = variant.id === selectedVariantId;
        return (
          <button
            key={variant.id}
            type="button"
            onClick={() => onVariantSelect(variant)}
            disabled={variant.stock <= 0}
            aria-pressed={selected}
            aria-label={variant.stock <= 0 ? `${variant.label}، غير متوفر` : variant.label}
            className={cn(
              "min-h-11 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              selected
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
              variant.stock <= 0 && "cursor-not-allowed opacity-45",
            )}
          >
            {variant.label}
          </button>
        );
      })}
    </div>
  );
}
