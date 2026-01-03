/**
 * EmbeddedVariantSelector - For products with variants stored in the product record
 * Shows size/power options that update price without page navigation
 */
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { type ProductVariant } from "@/types";
import { Check, Sparkles, Tag } from "lucide-react";

interface EmbeddedVariantSelectorProps {
    variants: ProductVariant[];
    selectedVariantId: string;
    onVariantSelect: (variant: ProductVariant) => void;
    title?: string;
    productCategory?: string;
}

/**
 * Variant selector for products with embedded variants
 * Compact design similar to HOUYI product style
 */
export function EmbeddedVariantSelector({
    variants,
    selectedVariantId,
    onVariantSelect,
    title = "اختر الخصائص",
    productCategory,
}: EmbeddedVariantSelectorProps) {
    if (!variants || variants.length <= 1) {
        return null;
    }

    // Sort variants by price (ascending)
    const sortedVariants = useMemo(() => {
        return [...variants].sort((a, b) => a.price - b.price);
    }, [variants]);

    // Get selected variant for price display
    const selectedVariant = sortedVariants.find(v => v.id === selectedVariantId) || sortedVariants[0];

    return (
        <div className="space-y-3" dir="rtl">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">{title}</span>
            </div>

            {/* Variants as compact buttons */}
            <div className="flex flex-wrap gap-2">
                {sortedVariants.map((variant) => {
                    const isSelected = variant.id === selectedVariantId;
                    const inStock = variant.stock > 0;

                    return (
                        <button
                            key={variant.id}
                            onClick={() => onVariantSelect(variant)}
                            disabled={!inStock}
                            className={cn(
                                "relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                                "border-2 hover:shadow-sm",
                                isSelected
                                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                    : "border-muted bg-background hover:border-primary/50",
                                !inStock && "opacity-50 cursor-not-allowed line-through"
                            )}
                        >
                            {/* Selection checkmark */}
                            {isSelected && (
                                <Check className="inline w-3 h-3 ml-1" />
                            )}
                            {variant.label}
                        </button>
                    );
                })}
            </div>

            {/* Price display */}
            <div className="flex items-center gap-2 pt-2">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">السعر:</span>
                <span className="font-bold text-primary">
                    {Number(selectedVariant.price).toLocaleString('en-US')} د.ع
                </span>
                {selectedVariant.originalPrice && selectedVariant.originalPrice > selectedVariant.price && (
                    <>
                        <span className="text-sm text-muted-foreground line-through">
                            {selectedVariant.originalPrice.toLocaleString()}
                        </span>
                        <Badge variant="destructive" className="text-[10px]">
                            خصم {Math.round(((selectedVariant.originalPrice - selectedVariant.price) / selectedVariant.originalPrice) * 100)}%
                        </Badge>
                    </>
                )}
            </div>

            {/* Stock status */}
            <div className="flex items-center gap-2 text-sm">
                {selectedVariant.stock > 0 ? (
                    <>
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-green-600 dark:text-green-400">
                            متوفر ({selectedVariant.stock} قطعة)
                        </span>
                    </>
                ) : (
                    <span className="text-red-500">غير متوفر</span>
                )}
            </div>
        </div>
    );
}

/**
 * Compact version for quick display
 */
export function EmbeddedVariantSelectorCompact({
    variants,
    selectedVariantId,
    onVariantSelect,
}: Omit<EmbeddedVariantSelectorProps, "title" | "productCategory">) {
    if (!variants || variants.length <= 1) {
        return null;
    }

    return (
        <div className="flex flex-wrap gap-2" dir="rtl">
            {variants.map((variant) => {
                const isSelected = variant.id === selectedVariantId;

                return (
                    <button
                        key={variant.id}
                        onClick={() => onVariantSelect(variant)}
                        disabled={variant.stock <= 0}
                        className={cn(
                            "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                            isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground",
                            variant.stock <= 0 && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {variant.label}
                    </button>
                );
            })}
        </div>
    );
}
