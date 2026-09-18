import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SlidersHorizontal, ChevronDown, Sparkles, TrendingUp, Leaf, DollarSign } from "lucide-react";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import { cn } from "@/lib/utils";
import { FilterState } from "./filter-modal";
import { useTranslation } from "react-i18next";
import { PRODUCT_TAG_VALUES } from "@/lib/product-filter-values";

interface FilterBarProps {
    filters: FilterState;
    onFiltersChange: (filters: FilterState) => void;
    onOpenFilterModal: () => void;
    activeFiltersCount: number;
    maxPrice: number;
    minPrice?: number;
}

function QuickFilterChip({
    label,
    icon: Icon,
    selected,
    onClick,
}: {
    label: string;
    icon: React.ElementType;
    selected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={selected}
            className={cn(
                "inline-flex min-h-11 flex-shrink-0 items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors sm:gap-1.5 sm:px-4 sm:py-2 sm:text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:border-primary hover:bg-primary/5"
            )}
        >
            <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap">{label}</span>
        </button>
    );
}

export function FilterBar({
    filters,
    onFiltersChange,
    onOpenFilterModal,
    activeFiltersCount,
    maxPrice,
    minPrice = 0,
}: FilterBarProps) {
    const { t } = useTranslation("products");
    const [priceDropdownOpen, setPriceDropdownOpen] = useState(false);
    const [tempPriceRange, setTempPriceRange] = useState<[number, number]>(filters.priceRange);

    const handlePriceApply = () => {
        onFiltersChange({ ...filters, priceRange: tempPriceRange });
        setPriceDropdownOpen(false);
    };

    const toggleTag = (tag: string) => {
        const newTags = filters.tags.includes(tag)
            ? filters.tags.filter(t => t !== tag)
            : [...filters.tags, tag];
        onFiltersChange({ ...filters, tags: newTags });
    };

    const isPriceActive = filters.priceRange[0] > minPrice || filters.priceRange[1] < maxPrice;

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
        <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-hide sm:gap-3 sm:py-4">
            <Button
                variant="outline"
                onClick={onOpenFilterModal}
                className={cn(
                    "relative min-h-11 flex-shrink-0 gap-1.5 rounded-full border-2 px-2.5 py-1.5 text-xs sm:gap-2 sm:px-4 sm:py-2 sm:text-sm",
                    activeFiltersCount > 0 && "border-primary bg-primary/5"
                )}
            >
                <SlidersHorizontal className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">{t("filters.button")}</span>
                {activeFiltersCount > 0 && (
                    <Badge className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary p-0 text-xs font-bold text-primary-foreground">
                        {activeFiltersCount}
                    </Badge>
                )}
            </Button>

            <DropdownMenu open={priceDropdownOpen} onOpenChange={setPriceDropdownOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            "min-h-11 flex-shrink-0 gap-1.5 rounded-full border-2 px-2.5 py-1.5 text-xs sm:gap-2 sm:px-4 sm:py-2 sm:text-sm",
                            isPriceActive && "border-primary bg-primary/5"
                        )}
                    >
                        <DollarSign className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        <span className="whitespace-nowrap">{t("filters.price")}</span>
                        <ChevronDown
                            className={cn(
                                "h-4 w-4 flex-shrink-0 transition-transform",
                                priceDropdownOpen && "rotate-180"
                            )}
                            aria-hidden="true"
                        />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-80 p-4">
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold">{t("filters.priceRange")}</h4>
                        <DualRangeSlider
                            min={minPrice}
                            max={maxPrice}
                            step={Math.ceil(maxPrice / 50)}
                            value={tempPriceRange}
                            onValueChange={setTempPriceRange}
                            formatValue={(v) => formatPrice(v)}
                            showValues={true}
                        />
                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => {
                                    setTempPriceRange([minPrice, maxPrice]);
                                    onFiltersChange({ ...filters, priceRange: [minPrice, maxPrice] });
                                    setPriceDropdownOpen(false);
                                }}
                            >
                                {t("filters.clear")}
                            </Button>
                            <Button size="sm" className="flex-1" onClick={handlePriceApply}>
                                {t("filters.apply")}
                            </Button>
                        </div>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            <div className="mx-1 h-8 w-px flex-shrink-0 bg-border" aria-hidden="true" />

            <QuickFilterChip
                label={t("tags.new")}
                icon={Sparkles}
                selected={filters.tags.includes(PRODUCT_TAG_VALUES.new)}
                onClick={() => toggleTag(PRODUCT_TAG_VALUES.new)}
            />
            <QuickFilterChip
                label={t("tags.bestSeller")}
                icon={TrendingUp}
                selected={filters.tags.includes(PRODUCT_TAG_VALUES.bestSeller)}
                onClick={() => toggleTag(PRODUCT_TAG_VALUES.bestSeller)}
            />
            <QuickFilterChip
                label={t("tags.eco")}
                icon={Leaf}
                selected={filters.tags.includes(PRODUCT_TAG_VALUES.eco)}
                onClick={() => toggleTag(PRODUCT_TAG_VALUES.eco)}
            />
        </div>
    );
}
