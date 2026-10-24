import { useMemo } from "react";
import { Check, Sparkles, Tag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProductVariant } from "@/types";
import { extractVariantDimensions, isMultiDimensionVariantSet } from "@/lib/variant-dimensions";
import { useTranslation } from "react-i18next";
import { formatIQD } from "@/lib/utils";
import { useLocale } from "@/i18n/locale-context";

interface EmbeddedVariantSelectorProps {
  variants: ProductVariant[];
  selectedVariantId: string;
  onVariantSelect: (variant: ProductVariant) => void;
  title?: string;
  productCategory?: string;
  comingSoon?: boolean;
}

function cleanSpecificationValue(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function getVariantChoiceLabel(
  variant: ProductVariant,
  customerFacingDimensionKey: string | undefined,
): string {
  if (customerFacingDimensionKey) {
    const dimensionValue = cleanSpecificationValue(
      variant.specifications?.[customerFacingDimensionKey],
    );
    if (dimensionValue) return dimensionValue;
  }

  return variant.label;
}

export function EmbeddedVariantSelector({
  variants,
  selectedVariantId,
  onVariantSelect,
  title,
  comingSoon = false,
}: EmbeddedVariantSelectorProps) {
  const { t } = useTranslation("product");
  const dimensions = useMemo(() => extractVariantDimensions(variants), [variants]);
  const sortedVariants = useMemo(() => {
    // When every variant specifies a physical rock size, show the dimensions
    // from small to large. Price=0 means unpriced, NOT a cheap product.
    const areStoneSizes = variants.length > 0 && variants.every((variant) =>
      /^\d+\s*[–-]\s*\d+\s*سم$/.test(String(variant.specifications?.["حجم القطعة"] ?? "")),
    );
    if (areStoneSizes) {
      return [...variants].sort((a, b) =>
        parseInt(String(a.specifications?.["حجم القطعة"])) -
        parseInt(String(b.specifications?.["حجم القطعة"])),
      );
    }
    return [...variants].sort((a, b) => Number(a.price) - Number(b.price));
  }, [variants]);

  if (!variants || variants.length <= 1 || isMultiDimensionVariantSet(variants)) return null;

  // Empty selection must never show a 0-IQD price when another SKU has a
  // real, known price (for example, upcoming volcanic-rock sizes).
  const selectedVariant = sortedVariants.find((variant) => variant.id === selectedVariantId)
    ?? sortedVariants.find((variant) => variant.stock > 0 && Number(variant.price) > 0)
    ?? sortedVariants.find((variant) => variant.isDefault && Number(variant.price) > 0)
    ?? sortedVariants.find((variant) => Number(variant.price) > 0)
    ?? sortedVariants[0];
  const selectedModel = cleanSpecificationValue(selectedVariant.specifications?.الموديل);
  const customerFacingDimensionKey = dimensions.length === 1 ? dimensions[0].key : undefined;
  const detectedTitle = dimensions[0]?.label ? t("variants.choose", { label: dimensions[0].label }) : t("variants.chooseOption");

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4" dir="rtl">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-sm font-bold" id="embedded-variant-title">{title || detectedTitle}</span>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-labelledby="embedded-variant-title">
        {sortedVariants.map((variant) => {
          const selected = Boolean(selectedVariantId) && variant.id === selectedVariant.id;
          const inStock = variant.stock > 0;
          const choiceLabel = getVariantChoiceLabel(variant, customerFacingDimensionKey);
          const unpricedUpcoming = !inStock && Number(variant.price) <= 0;
          const upcomingAriaLabel = choiceLabel.includes(t("price.soon"))
            ? choiceLabel
            : `${choiceLabel} — ${t("price.soon")}`;

          return (
            <button
              key={variant.id}
              type="button"
              onClick={() => onVariantSelect(variant)}
              disabled={!inStock}
              aria-pressed={selected}
              aria-label={!inStock ? (comingSoon || unpricedUpcoming) ? upcomingAriaLabel : t("variants.unavailableAria", { label: choiceLabel }) : choiceLabel}
              className={cn(
                "min-h-11 rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:border-primary/50",
                !inStock && (unpricedUpcoming ? "cursor-not-allowed opacity-60" : "cursor-not-allowed opacity-45 line-through"),
              )}
            >
              {selected && <Check className="ml-1 inline h-3.5 w-3.5" aria-hidden="true" />}
              {choiceLabel}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-3 text-sm" aria-live="polite">
        {selectedModel && (
          <span className="inline-flex items-center gap-2">
            <span className="text-muted-foreground">{t("variants.model")}</span>
            <span className="font-bold text-foreground">{selectedModel}</span>
          </span>
        )}

        <span className="inline-flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-muted-foreground">{t("variants.price")}</span>
          <span className="font-bold text-primary">
            {Number(selectedVariant.price) > 0 ? formatIQD(Number(selectedVariant.price)) : t("price.soon")}
          </span>
        </span>

        {selectedVariant.originalPrice && selectedVariant.originalPrice > selectedVariant.price && (
          <>
            <span className="text-sm text-muted-foreground line-through">
              {formatIQD(Number(selectedVariant.originalPrice))}
            </span>
            <Badge variant="destructive" className="text-[10px]">
              {t("variants.discount", { percent: Math.round(((selectedVariant.originalPrice - selectedVariant.price) / selectedVariant.originalPrice) * 100) })}
            </Badge>
          </>
        )}

        <span className="basis-full text-xs sm:ms-auto sm:basis-auto">
          {selectedVariant.stock > 0 ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              {t("variants.available", { count: selectedVariant.stock })}
            </span>
          ) : (
            <span className="text-destructive">{comingSoon ? t("price.soon") : t("variants.unavailable")}</span>
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
  comingSoon = false,
}: Omit<EmbeddedVariantSelectorProps, "title" | "productCategory">) {
  const { t } = useTranslation("product");
  const { dir } = useLocale();
  const dimensions = useMemo(() => extractVariantDimensions(variants), [variants]);
  const customerFacingDimensionKey = dimensions.length === 1 ? dimensions[0].key : undefined;

  if (!variants || variants.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-2" dir={dir} role="group" aria-label={t("variants.options")}>
      {variants.map((variant) => {
        const selected = variant.id === selectedVariantId;
        const choiceLabel = getVariantChoiceLabel(variant, customerFacingDimensionKey);

        return (
          <button
            key={variant.id}
            type="button"
            onClick={() => onVariantSelect(variant)}
            disabled={variant.stock <= 0}
            aria-pressed={selected}
            aria-label={variant.stock <= 0 ? comingSoon ? `${choiceLabel} — ${t("price.soon")}` : t("variants.unavailableAria", { label: choiceLabel }) : choiceLabel}
            className={cn(
              "min-h-11 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              selected
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
              variant.stock <= 0 && "cursor-not-allowed opacity-45",
            )}
          >
            {choiceLabel}
          </button>
        );
      })}
    </div>
  );
}
