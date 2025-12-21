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

interface FilterBarProps {
    filters: FilterState;
    onFiltersChange: (filters: FilterState) => void;
    onOpenFilterModal: () => void;
    activeFiltersCount: number;
    maxPrice: number;
    minPrice?: number;
}

// Quick filter chip
function QuickFilterChip({
    label,
    icon: Icon,
    selected,
    onClick,
    color = "default",
}: {
    label: string;
    icon: React.ElementType;
    selected: boolean;
    onClick: () => void;
    color?: "default" | "blue" | "orange" | "green";
}) {
    const colorClasses = {
        default: selected
            ? "bg-foreground text-background border-foreground"
            : "bg-background text-foreground border-border hover:border-foreground",
        blue: selected
            ? "bg-blue-500 text-white border-blue-500"
            : "bg-background text-foreground border-border hover:border-blue-500",
        orange: selected
            ? "bg-orange-500 text-white border-orange-500"
            : "bg-background text-foreground border-border hover:border-orange-500",
        green: selected
            ? "bg-emerald-500 text-white border-emerald-500"
            : "bg-background text-foreground border-border hover:border-emerald-500",
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium",
                "border transition-all duration-200",
                "hover:shadow-md active:scale-95",
                colorClasses[color]
            )}
        >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
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

    // Check if price filter is active
    const isPriceActive = filters.priceRange[0] > minPrice || filters.priceRange[1] < maxPrice;

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
        <div className="flex items-center gap-3 py-4 overflow-x-auto scrollbar-hide">
            {/* Main Filters Button */}
            <Button
                variant="outline"
                onClick={onOpenFilterModal}
                className={cn(
                    "relative rounded-full border-2 gap-2 px-4 py-2 h-auto",
                    "hover:shadow-md transition-all",
                    activeFiltersCount > 0 && "border-primary bg-primary/5"
                )}
            >
                <SlidersHorizontal className="w-4 h-4" />
                <span>الفلاتر</span>
                {activeFiltersCount > 0 && (
                    <Badge
                        className="h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary text-white text-xs font-bold"
                    >
                        {activeFiltersCount}
                    </Badge>
                )}
            </Button>

            {/* Price Dropdown */}
            <DropdownMenu open={priceDropdownOpen} onOpenChange={setPriceDropdownOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            "rounded-full border-2 gap-2 px-4 py-2 h-auto",
                            "hover:shadow-md transition-all",
                            isPriceActive && "border-primary bg-primary/5"
                        )}
                    >
                        <DollarSign className="w-4 h-4" />
                        <span>السعر</span>
                        <ChevronDown className={cn(
                            "w-4 h-4 transition-transform",
                            priceDropdownOpen && "rotate-180"
                        )} />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-80 p-4">
                    <div className="space-y-4">
                        <h4 className="font-semibold text-sm">نطاق السعر</h4>
                        <DualRangeSlider
                            min={minPrice}
                            max={maxPrice}
                            step={Math.ceil(maxPrice / 50)}
                            value={tempPriceRange}
                            onValueChange={setTempPriceRange}
                            formatValue={(v) => `${formatPrice(v)} د.ع`}
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
                                مسح
                            </Button>
                            <Button
                                size="sm"
                                className="flex-1"
                                onClick={handlePriceApply}
                            >
                                تطبيق
                            </Button>
                        </div>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Divider */}
            <div className="h-8 w-px bg-border mx-1" />

            {/* Quick Filters */}
            <QuickFilterChip
                label="جديد"
                icon={Sparkles}
                color="blue"
                selected={filters.tags.includes("جديد")}
                onClick={() => toggleTag("جديد")}
            />
            <QuickFilterChip
                label="الأكثر مبيعاً"
                icon={TrendingUp}
                color="orange"
                selected={filters.tags.includes("الأكثر مبيعاً")}
                onClick={() => toggleTag("الأكثر مبيعاً")}
            />
            <QuickFilterChip
                label="صديق للبيئة"
                icon={Leaf}
                color="green"
                selected={filters.tags.includes("صديق للبيئة")}
                onClick={() => toggleTag("صديق للبيئة")}
            />
        </div>
    );
}
