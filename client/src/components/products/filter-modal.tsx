import { useEffect, useId, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, RotateCcw, Check, DollarSign, Tag, Sparkles, PackageCheck, TrendingUp } from "lucide-react";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { PRODUCT_TAG_VALUES } from "@/lib/product-filter-values";

export interface FilterState {
    priceRange: [number, number];
    categories: string[];
    brands: string[];
    difficulties: string[];
    tags: string[];
}

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    filters: FilterState;
    onApplyFilters: (filters: FilterState) => void;
    availableBrands: string[];
    maxPrice: number;
    minPrice?: number;
    brandCounts?: Map<string, number>;
    resultCount?: number;
    getResultCount?: (filters: FilterState) => Promise<number>;
}

// Pill button for selections
function FilterPill({
    label,
    selected,
    onClick,
    icon: Icon,
    count,
    color = "default",
}: {
    label: string;
    selected: boolean;
    onClick: () => void;
    icon?: React.ElementType;
    count?: number;
    color?: "default" | "green" | "blue" | "orange" | "purple";
}) {
    const colorClasses = {
        default: selected
            ? "bg-foreground text-background border-foreground"
            : "bg-transparent text-foreground border-border hover:border-foreground",
        green: selected
            ? "bg-emerald-500 text-white border-emerald-500"
            : "bg-transparent text-foreground border-border hover:border-emerald-500",
        blue: selected
            ? "bg-blue-500 text-white border-blue-500"
            : "bg-transparent text-foreground border-border hover:border-blue-500",
        orange: selected
            ? "bg-orange-500 text-white border-orange-500"
            : "bg-transparent text-foreground border-border hover:border-orange-500",
        purple: selected
            ? "bg-purple-500 text-white border-purple-500"
            : "bg-transparent text-foreground border-border hover:border-purple-500",
    };

    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={selected}
            className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium",
                "border-2 transition-all duration-200",
                "hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:transform-none",
                colorClasses[color]
            )}
        >
            {Icon && <Icon className="w-4 h-4" aria-hidden="true" />}
            <span>{label}</span>
            {count !== undefined && count > 0 && (
                <Badge
                    variant="secondary"
                    className={cn(
                        "h-5 px-1.5 text-[10px] font-bold rounded-full",
                        selected ? "bg-card/20 text-inherit" : "bg-muted"
                    )}
                >
                    {count}
                </Badge>
            )}
            {selected && <Check className="w-4 h-4" aria-hidden="true" />}
        </button>
    );
}

// Section component
function FilterSection({
    title,
    icon: Icon,
    children
}: {
    title: string;
    icon?: React.ElementType;
    children: React.ReactNode;
}) {
    return (
        <div className="py-6 border-b border-border last:border-b-0">
            <div className="flex items-center gap-2 mb-4">
                {Icon && <Icon className="w-5 h-5 text-muted-foreground" />}
                <h3 className="text-lg font-semibold">{title}</h3>
            </div>
            {children}
        </div>
    );
}

export function FilterModal({
    isOpen,
    onClose,
    filters,
    onApplyFilters,
    availableBrands,
    maxPrice,
    minPrice = 0,
    brandCounts,
    resultCount,
    getResultCount,
}: FilterModalProps) {
    const { t } = useTranslation("products");
    // Local state for pending changes
    const [localFilters, setLocalFilters] = useState<FilterState>(filters);
    const [showAllBrands, setShowAllBrands] = useState(false);
    const brandsId = useId();
    const [preview, setPreview] = useState<{ filters: FilterState; count?: number; failed?: boolean }>();

    useEffect(() => {
        if (!isOpen) return;
        setLocalFilters(filters);
        setShowAllBrands(false);
    }, [isOpen, filters]);

    useEffect(() => {
        if (!isOpen || !getResultCount) return;
        let cancelled = false;
        const timer = window.setTimeout(() => {
            void getResultCount(localFilters).then(count => {
                if (!cancelled) setPreview({ filters: localFilters, count });
            }).catch(() => {
                if (!cancelled) setPreview({ filters: localFilters, failed: true });
            });
        }, 200);
        return () => { cancelled = true; window.clearTimeout(timer); };
    }, [isOpen, localFilters, getResultCount]);

    const currentPreview = preview?.filters === localFilters ? preview : undefined;
    const previewPending = Boolean(getResultCount && !currentPreview);
    const count = getResultCount ? currentPreview?.count : resultCount;
    // Selected brands remain visible even when they fall beyond the initial eight.
    const firstBrands = availableBrands.filter((brand, index) => index < 8 || localFilters.brands.includes(brand));
    const hasHiddenBrands = availableBrands.length - firstBrands.length > 1;
    const visibleBrands = showAllBrands || !hasHiddenBrands ? availableBrands : firstBrands;

    // Sync with parent when dialog opens
    const handleOpenChange = (open: boolean) => {
        if (open) {
            setLocalFilters(filters);
        } else {
            onClose();
        }
    };

    const tags = [
        { label: t("tags.new"), value: PRODUCT_TAG_VALUES.new, icon: Sparkles, color: "blue" as const },
        { label: t("tags.bestSeller"), value: PRODUCT_TAG_VALUES.bestSeller, icon: TrendingUp, color: "orange" as const },
        { label: t("tags.inStock"), value: "in-stock", icon: PackageCheck, color: "green" as const },
    ];

    const handlePriceChange = (value: [number, number]) => {
        setLocalFilters(prev => ({ ...prev, priceRange: value }));
    };

    const toggleArrayFilter = (type: 'brands' | 'difficulties' | 'tags', value: string) => {
        setLocalFilters(prev => {
            const current = prev[type];
            const updated = current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value];
            return { ...prev, [type]: updated };
        });
    };

    const handleClearAll = () => {
        setLocalFilters({
            priceRange: [minPrice, maxPrice],
            categories: filters.categories, // Keep categories as they're handled separately
            brands: [],
            difficulties: [],
            tags: [],
        });
    };

    const handleApply = () => {
        onApplyFilters(localFilters);
        onClose();
    };

    // Count active filters (excluding categories which are shown in the scroll bar)
    const activeFiltersCount =
        (localFilters.priceRange[0] > minPrice || localFilters.priceRange[1] < maxPrice ? 1 : 0) +
        localFilters.brands.length +
        localFilters.difficulties.length +
        localFilters.tags.length;

    // Format price for display
    const formatPrice = (value: number) => {
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
        }
        if (value >= 1000) {
            return `${(value / 1000).toFixed(0)}K`;
        }
        return value.toLocaleString();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden p-0 [&>button]:hidden">
                {/* Header */}
                <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <DialogClose asChild>
                            <Button variant="ghost" size="icon" className="rounded-full" aria-label={t("filters.close")}>
                                <X className="w-5 h-5" />
                            </Button>
                        </DialogClose>
                        <DialogTitle className="text-lg font-bold">{t("filters.button")}</DialogTitle>
                        <div className="w-10" /> {/* Spacer for alignment */}
                    </div>
                    <DialogDescription className="sr-only">{t("filters.subtitle")}</DialogDescription>
                </DialogHeader>

                {/* Content - Scrollable */}
                <div className="min-h-0 flex-1 overflow-y-auto px-6">
                    {/* Price Range */}
                    <FilterSection title={t("filters.priceRange")} icon={DollarSign}>
                        <div className="px-2">
                            <DualRangeSlider
                                min={minPrice}
                                max={maxPrice}
                                step={Math.ceil(maxPrice / 50)}
                                value={localFilters.priceRange}
                                onValueChange={handlePriceChange}
                                formatValue={(v) => formatPrice(v)}
                                showValues={true}
                            />
                        </div>
                    </FilterSection>

                    {/* Quick Tags */}
                    <FilterSection title={t("filters.productType")} icon={Sparkles}>
                        <div className="flex flex-wrap gap-3">
                            {tags.map((tag) => (
                                <FilterPill
                                    key={tag.value}
                                    label={tag.label}
                                    icon={tag.icon}
                                    color={tag.color}
                                    selected={localFilters.tags.includes(tag.value)}
                                    onClick={() => toggleArrayFilter("tags", tag.value)}
                                />
                            ))}
                        </div>
                    </FilterSection>

                    {/* Brands */}
                    {availableBrands.length > 0 && (
                        <FilterSection title={t("filters.brands")} icon={Tag}>
                            <div id={brandsId} className="flex flex-wrap gap-2">
                                {visibleBrands.map((brand) => (
                                    <FilterPill
                                        key={brand}
                                        label={brand}
                                        count={brandCounts?.get(brand)}
                                        selected={localFilters.brands.includes(brand)}
                                        onClick={() => toggleArrayFilter("brands", brand)}
                                    />
                                ))}
                            </div>
                            {hasHiddenBrands && (
                                <Button type="button" variant="ghost" className="mt-3 min-h-11 text-primary underline underline-offset-4"
                                    aria-expanded={showAllBrands} aria-controls={brandsId}
                                    onClick={() => setShowAllBrands(value => !value)}>
                                    {showAllBrands ? t("filters.fewerBrands") : t("filters.moreBrands", { count: availableBrands.length - firstBrands.length })}
                                </Button>
                            )}
                        </FilterSection>
                    )}

                </div>

                {/* Footer */}
                <DialogFooter className="px-6 py-4 border-t border-border flex-shrink-0">
                    <div className="w-full space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                        <Button
                            variant="ghost"
                            onClick={handleClearAll}
                            className="text-sm underline underline-offset-4 hover:no-underline"
                            disabled={activeFiltersCount === 0}
                        >
                            <RotateCcw className="w-4 h-4 me-2" aria-hidden="true" />
                            {t("filters.clearAll")}
                        </Button>
                        <Button
                            onClick={handleApply}
                            size="lg"
                            className="px-8 rounded-xl bg-foreground text-background hover:bg-foreground/90"
                            aria-busy={previewPending}
                        >
                            <span aria-live="polite" aria-atomic="true">
                                {previewPending ? t("filters.counting") : count !== undefined ? t("filters.showResults", { count }) : t("filters.applyDraft")}
                            </span>
                        </Button>
                    </div>
                    {currentPreview?.failed && <p role="status" className="text-sm text-muted-foreground">{t("filters.countError")}</p>}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
