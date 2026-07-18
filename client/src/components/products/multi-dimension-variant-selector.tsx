/**
 * MultiDimensionVariantSelector - For products with multiple variant dimensions
 * Example: Colors (Black, White) + Sizes (S, M, L)
 * Shows separate rows for each dimension - Compact design
 */
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { type ProductVariant } from "@/types";
import { Check, Palette, Ruler, Sparkles, Tag } from "lucide-react";

interface VariantDimension {
    name: string;
    values: string[];
    icon?: React.ComponentType<{ className?: string }>;
}

interface MultiDimensionVariantSelectorProps {
    variants: ProductVariant[];
    selectedVariantId: string;
    onVariantSelect: (variant: ProductVariant) => void;
    dimensions?: VariantDimension[];
}

/**
 * Extract dimensions from variants based on specifications
 */
function extractDimensions(variants: ProductVariant[]): VariantDimension[] {
    const colorSet = new Set<string>();
    const sizeSet = new Set<string>();

    variants.forEach((variant) => {
        const specs = variant.specifications || {};
        if (specs["اللون"]) colorSet.add(specs["اللون"]);
        if (specs["الحجم"]) sizeSet.add(specs["الحجم"]);
    });

    const dimensions: VariantDimension[] = [];

    if (colorSet.size > 0) {
        dimensions.push({
            name: "اللون",
            values: Array.from(colorSet),
            icon: Palette,
        });
    }

    if (sizeSet.size > 0) {
        dimensions.push({
            name: "الحجم",
            values: Array.from(sizeSet),
            icon: Ruler,
        });
    }

    return dimensions;
}

/**
 * Multi-dimensional variant selector - Compact design
 * Shows separate rows for colors and sizes
 */
export function MultiDimensionVariantSelector({
    variants,
    selectedVariantId,
    onVariantSelect,
}: MultiDimensionVariantSelectorProps) {
    const dimensions = useMemo(() => extractDimensions(variants), [variants]);

    // Track selected values for each dimension
    const [selectedValues, setSelectedValues] = useState<Record<string, string>>({});

    // Initialize selected values from current selected variant
    useEffect(() => {
        const selectedVariant = variants.find((v) => v.id === selectedVariantId);
        if (selectedVariant?.specifications) {
            const initial: Record<string, string> = {};
            dimensions.forEach((dim) => {
                const value = selectedVariant.specifications?.[dim.name];
                if (value) initial[dim.name] = value;
            });
            setSelectedValues(initial);
        }
    }, [selectedVariantId, variants, dimensions]);

    // If no multi-dimensions detected, return null (use standard selector)
    if (dimensions.length < 2) {
        return null;
    }

    // Handle dimension value selection
    const handleDimensionSelect = (dimensionName: string, value: string) => {
        const newSelectedValues = { ...selectedValues, [dimensionName]: value };
        setSelectedValues(newSelectedValues);

        // Find matching variant
        const matchingVariant = variants.find((variant) => {
            return dimensions.every((dim) => {
                const variantValue = variant.specifications?.[dim.name];
                const selectedValue = newSelectedValues[dim.name];
                return variantValue === selectedValue;
            });
        });

        if (matchingVariant) {
            onVariantSelect(matchingVariant);
        }
    };

    // Get selected variant
    const selectedVariant = variants.find((v) => v.id === selectedVariantId);

    return (
        <div className="space-y-4" dir="rtl">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
                <span className="font-semibold text-sm">اختر الخصائص</span>
            </div>

            {/* Render each dimension as a compact row */}
            {dimensions.map((dimension) => {
                const Icon = dimension.icon || Palette;
                const selectedValue = selectedValues[dimension.name];

                return (
                    <div key={dimension.name} className="space-y-2">
                        {/* Dimension label */}
                        <div className="flex items-center gap-2 text-sm">
                            <Icon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                            <span className="font-medium" id={`variant-dim-${dimension.name}`}>{dimension.name}:</span>
                            {selectedValue && (
                                <span className="text-primary font-semibold">{selectedValue}</span>
                            )}
                        </div>

                        {/* Dimension options as compact buttons */}
                        <div
                            className="flex flex-wrap gap-2"
                            role="group"
                            aria-labelledby={`variant-dim-${dimension.name}`}
                        >
                            {dimension.values.map((value) => {
                                const isSelected = selectedValue === value;

                                // Check if this combination is available
                                const isAvailable = variants.some((v) => {
                                    const matchesDimension = v.specifications?.[dimension.name] === value;
                                    const matchesOthers = dimensions
                                        .filter((d) => d.name !== dimension.name)
                                        .every((d) => {
                                            const otherSelected = selectedValues[d.name];
                                            return !otherSelected || v.specifications?.[d.name] === otherSelected;
                                        });
                                    return matchesDimension && matchesOthers && v.stock > 0;
                                });

                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => handleDimensionSelect(dimension.name, value)}
                                        disabled={!isAvailable}
                                        aria-pressed={isSelected}
                                        aria-label={!isAvailable ? `${dimension.name} ${value}، غير متوفر` : `${dimension.name} ${value}`}
                                        className={cn(
                                            "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                                            "border-2 hover:shadow-sm min-h-11",
                                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                            isSelected
                                                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                                : "border-muted bg-background hover:border-primary/50",
                                            !isAvailable && "opacity-40 cursor-not-allowed line-through"
                                        )}
                                    >
                                        {isSelected && <Check className="inline w-3 h-3 ml-1" aria-hidden="true" />}
                                        {value}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {/* Show selected variant price */}
            {selectedVariant && (
                <div className="pt-3 border-t space-y-2" aria-live="polite">
                    <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                        <span className="text-sm text-muted-foreground">السعر:</span>
                        <span className="font-bold text-primary">
                            {Number(selectedVariant.price).toLocaleString('en-US')} د.ع
                        </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                        {selectedVariant.stock > 0 ? (
                            <>
                                <Check className="w-4 h-4 text-green-500" aria-hidden="true" />
                                <span className="text-green-600 dark:text-green-400">
                                    متوفر ({selectedVariant.stock} قطعة)
                                </span>
                            </>
                        ) : (
                            <span className="text-red-500">غير متوفر</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
