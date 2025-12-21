import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, RotateCcw, Check, DollarSign, Tag, Star, Sparkles, Leaf, TrendingUp } from "lucide-react";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import { cn } from "@/lib/utils";

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
            onClick={onClick}
            className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium",
                "border-2 transition-all duration-200",
                "hover:shadow-md active:scale-95",
                colorClasses[color]
            )}
        >
            {Icon && <Icon className="w-4 h-4" />}
            <span>{label}</span>
            {count !== undefined && count > 0 && (
                <Badge
                    variant="secondary"
                    className={cn(
                        "h-5 px-1.5 text-[10px] font-bold rounded-full",
                        selected ? "bg-white/20 text-inherit" : "bg-muted"
                    )}
                >
                    {count}
                </Badge>
            )}
            {selected && <Check className="w-4 h-4" />}
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
    resultCount = 0,
}: FilterModalProps) {
    // Local state for pending changes
    const [localFilters, setLocalFilters] = useState<FilterState>(filters);

    // Sync with parent when dialog opens
    const handleOpenChange = (open: boolean) => {
        if (open) {
            setLocalFilters(filters);
        } else {
            onClose();
        }
    };

    const difficulties = [
        { label: "مبتدئ", value: "مبتدئ", color: "green" as const },
        { label: "متوسط", value: "متوسط", color: "orange" as const },
        { label: "متقدم", value: "متقدم", color: "purple" as const },
    ];

    const tags = [
        { label: "جديد", value: "جديد", icon: Sparkles, color: "blue" as const },
        { label: "الأكثر مبيعاً", value: "الأكثر مبيعاً", icon: TrendingUp, color: "orange" as const },
        { label: "صديق للبيئة", value: "صديق للبيئة", icon: Leaf, color: "green" as const },
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
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
                {/* Header */}
                <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <DialogClose asChild>
                            <Button variant="ghost" size="icon" className="rounded-full">
                                <X className="w-5 h-5" />
                            </Button>
                        </DialogClose>
                        <DialogTitle className="text-lg font-bold">الفلاتر</DialogTitle>
                        <div className="w-10" /> {/* Spacer for alignment */}
                    </div>
                </DialogHeader>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto px-6">
                    {/* Price Range */}
                    <FilterSection title="نطاق السعر" icon={DollarSign}>
                        <div className="px-2">
                            <DualRangeSlider
                                min={minPrice}
                                max={maxPrice}
                                step={Math.ceil(maxPrice / 50)}
                                value={localFilters.priceRange}
                                onValueChange={handlePriceChange}
                                formatValue={(v) => `${formatPrice(v)} د.ع`}
                                showValues={true}
                            />
                        </div>
                    </FilterSection>

                    {/* Quick Tags */}
                    <FilterSection title="نوع المنتج" icon={Sparkles}>
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
                        <FilterSection title="العلامات التجارية" icon={Tag}>
                            <div className="flex flex-wrap gap-2">
                                {availableBrands.map((brand) => (
                                    <FilterPill
                                        key={brand}
                                        label={brand}
                                        count={brandCounts?.get(brand)}
                                        selected={localFilters.brands.includes(brand)}
                                        onClick={() => toggleArrayFilter("brands", brand)}
                                    />
                                ))}
                            </div>
                        </FilterSection>
                    )}

                    {/* Difficulty */}
                    <FilterSection title="مستوى الخبرة" icon={Star}>
                        <div className="flex flex-wrap gap-3">
                            {difficulties.map((diff) => (
                                <FilterPill
                                    key={diff.value}
                                    label={diff.label}
                                    color={diff.color}
                                    selected={localFilters.difficulties.includes(diff.value)}
                                    onClick={() => toggleArrayFilter("difficulties", diff.value)}
                                />
                            ))}
                        </div>
                    </FilterSection>
                </div>

                {/* Footer */}
                <DialogFooter className="px-6 py-4 border-t border-border flex-shrink-0">
                    <div className="flex items-center justify-between w-full">
                        <Button
                            variant="ghost"
                            onClick={handleClearAll}
                            className="text-sm underline underline-offset-4 hover:no-underline"
                            disabled={activeFiltersCount === 0}
                        >
                            <RotateCcw className="w-4 h-4 ml-2" />
                            مسح الكل
                        </Button>
                        <Button
                            onClick={handleApply}
                            size="lg"
                            className="px-8 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90"
                        >
                            عرض {resultCount} منتج
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
