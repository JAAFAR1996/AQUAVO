import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import {
    Filter,
    X,
    ChevronDown,
    ChevronUp,
    Star,
    Check,
    RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
} from "@/components/ui/sheet";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export interface FilterState {
    categories: string[];
    brands: string[];
    priceRange: [number, number];
    ratings: number[];
    inStockOnly: boolean;
    sortBy: string;
}

interface ProductFiltersAdvancedProps {
    availableCategories: string[];
    availableBrands: string[];
    priceMin: number;
    priceMax: number;
    filters: FilterState;
    onFiltersChange: (filters: FilterState) => void;
    totalProducts: number;
    filteredCount: number;
    className?: string;
}

const FILTERS_STORAGE_KEY = "aquavo_product_filters";
const SORT_OPTIONS = [
    { value: "newest", label: "الأحدث" },
    { value: "price_asc", label: "السعر: من الأقل للأعلى" },
    { value: "price_desc", label: "السعر: من الأعلى للأقل" },
    { value: "rating", label: "الأعلى تقييماً" },
    { value: "bestseller", label: "الأكثر مبيعاً" },
];

// Hook to sync filters with URL
export function useFilterParams(defaultFilters: FilterState) {
    const [location, setLocation] = useLocation();
    const [filters, setFilters] = useState<FilterState>(defaultFilters);

    // Parse URL params on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);

        const newFilters: FilterState = { ...defaultFilters };

        const categories = params.get("categories");
        if (categories) newFilters.categories = categories.split(",");

        const brands = params.get("brands");
        if (brands) newFilters.brands = brands.split(",");

        const minPrice = params.get("minPrice");
        const maxPrice = params.get("maxPrice");
        if (minPrice || maxPrice) {
            newFilters.priceRange = [
                minPrice ? parseInt(minPrice) : defaultFilters.priceRange[0],
                maxPrice ? parseInt(maxPrice) : defaultFilters.priceRange[1],
            ];
        }

        const ratings = params.get("ratings");
        if (ratings) newFilters.ratings = ratings.split(",").map(Number);

        const inStock = params.get("inStock");
        if (inStock) newFilters.inStockOnly = inStock === "true";

        const sortBy = params.get("sortBy");
        if (sortBy) newFilters.sortBy = sortBy;

        setFilters(newFilters);

        // Also load from localStorage if no URL params
        if (!window.location.search) {
            const stored = localStorage.getItem(FILTERS_STORAGE_KEY);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    setFilters({ ...defaultFilters, ...parsed });
                } catch (e) {
                    console.error("Error parsing stored filters:", e);
                }
            }
        }
    }, []);

    // Update URL and localStorage when filters change
    const updateFilters = useCallback((newFilters: FilterState) => {
        setFilters(newFilters);

        // Save to localStorage
        localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(newFilters));

        // Update URL params
        const params = new URLSearchParams();

        if (newFilters.categories.length > 0) {
            params.set("categories", newFilters.categories.join(","));
        }
        if (newFilters.brands.length > 0) {
            params.set("brands", newFilters.brands.join(","));
        }
        if (newFilters.priceRange[0] > 0) {
            params.set("minPrice", newFilters.priceRange[0].toString());
        }
        if (newFilters.priceRange[1] < Infinity) {
            params.set("maxPrice", newFilters.priceRange[1].toString());
        }
        if (newFilters.ratings.length > 0) {
            params.set("ratings", newFilters.ratings.join(","));
        }
        if (newFilters.inStockOnly) {
            params.set("inStock", "true");
        }
        if (newFilters.sortBy && newFilters.sortBy !== "newest") {
            params.set("sortBy", newFilters.sortBy);
        }

        const search = params.toString();
        const basePath = window.location.pathname;
        const newUrl = search ? `${basePath}?${search}` : basePath;

        // Use history.replaceState for back/forward navigation
        window.history.replaceState({}, "", newUrl);
    }, []);

    return { filters, updateFilters };
}

export function ProductFiltersAdvanced({
    availableCategories,
    availableBrands,
    priceMin,
    priceMax,
    filters,
    onFiltersChange,
    totalProducts,
    filteredCount,
    className,
}: ProductFiltersAdvancedProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        categories: true,
        price: true,
        rating: false,
        brands: false,
    });

    const toggleSection = (section: string) => {
        setExpandedSections((prev) => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.categories.length > 0) count++;
        if (filters.brands.length > 0) count++;
        if (filters.priceRange[0] > priceMin || filters.priceRange[1] < priceMax) count++;
        if (filters.ratings.length > 0) count++;
        if (filters.inStockOnly) count++;
        return count;
    }, [filters, priceMin, priceMax]);

    const resetFilters = () => {
        onFiltersChange({
            categories: [],
            brands: [],
            priceRange: [priceMin, priceMax],
            ratings: [],
            inStockOnly: false,
            sortBy: "newest",
        });
    };

    const toggleCategory = (category: string) => {
        const newCategories = filters.categories.includes(category)
            ? filters.categories.filter((c) => c !== category)
            : [...filters.categories, category];
        onFiltersChange({ ...filters, categories: newCategories });
    };

    const toggleBrand = (brand: string) => {
        const newBrands = filters.brands.includes(brand)
            ? filters.brands.filter((b) => b !== brand)
            : [...filters.brands, brand];
        onFiltersChange({ ...filters, brands: newBrands });
    };

    const toggleRating = (rating: number) => {
        const newRatings = filters.ratings.includes(rating)
            ? filters.ratings.filter((r) => r !== rating)
            : [...filters.ratings, rating];
        onFiltersChange({ ...filters, ratings: newRatings });
    };

    const FilterContent = () => (
        <div className="space-y-4">
            {/* Active Filters */}
            {activeFiltersCount > 0 && (
                <div className="flex flex-wrap gap-2 pb-4 border-b">
                    {filters.categories.map((cat) => (
                        <Badge key={cat} variant="secondary" className="gap-1">
                            {cat}
                            <X
                                className="w-3 h-3 cursor-pointer"
                                onClick={() => toggleCategory(cat)}
                            />
                        </Badge>
                    ))}
                    {filters.brands.map((brand) => (
                        <Badge key={brand} variant="secondary" className="gap-1">
                            {brand}
                            <X
                                className="w-3 h-3 cursor-pointer"
                                onClick={() => toggleBrand(brand)}
                            />
                        </Badge>
                    ))}
                    {filters.inStockOnly && (
                        <Badge variant="secondary" className="gap-1">
                            متوفر فقط
                            <X
                                className="w-3 h-3 cursor-pointer"
                                onClick={() => onFiltersChange({ ...filters, inStockOnly: false })}
                            />
                        </Badge>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-6"
                        onClick={resetFilters}
                    >
                        <RotateCcw className="w-3 h-3 ml-1" />
                        إعادة تعيين
                    </Button>
                </div>
            )}

            {/* In Stock */}
            <div className="flex items-center gap-2">
                <Checkbox
                    id="inStock"
                    checked={filters.inStockOnly}
                    onCheckedChange={(checked) =>
                        onFiltersChange({ ...filters, inStockOnly: !!checked })
                    }
                />
                <Label htmlFor="inStock" className="text-sm cursor-pointer">
                    المنتجات المتوفرة فقط
                </Label>
            </div>

            {/* Categories */}
            <Collapsible open={expandedSections.categories}>
                <CollapsibleTrigger
                    onClick={() => toggleSection("categories")}
                    className="flex items-center justify-between w-full py-2 font-medium"
                >
                    الفئات
                    {expandedSections.categories ? (
                        <ChevronUp className="w-4 h-4" />
                    ) : (
                        <ChevronDown className="w-4 h-4" />
                    )}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">
                    {availableCategories.map((category) => (
                        <div key={category} className="flex items-center gap-2">
                            <Checkbox
                                id={`cat-${category}`}
                                checked={filters.categories.includes(category)}
                                onCheckedChange={() => toggleCategory(category)}
                            />
                            <Label
                                htmlFor={`cat-${category}`}
                                className="text-sm cursor-pointer flex-1"
                            >
                                {category}
                            </Label>
                        </div>
                    ))}
                </CollapsibleContent>
            </Collapsible>

            {/* Price Range */}
            <Collapsible open={expandedSections.price}>
                <CollapsibleTrigger
                    onClick={() => toggleSection("price")}
                    className="flex items-center justify-between w-full py-2 font-medium"
                >
                    السعر
                    {expandedSections.price ? (
                        <ChevronUp className="w-4 h-4" />
                    ) : (
                        <ChevronDown className="w-4 h-4" />
                    )}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 pb-2">
                    <div className="px-1">
                        <Slider
                            min={priceMin}
                            max={priceMax}
                            step={5000}
                            value={filters.priceRange}
                            onValueChange={(value) =>
                                onFiltersChange({
                                    ...filters,
                                    priceRange: value as [number, number],
                                })
                            }
                            className="mb-6"
                        />
                    </div>
                    <div className="flex items-center justify-between text-sm font-medium">
                        <div className="flex flex-col items-start">
                            <span className="text-xs text-muted-foreground">من</span>
                            <span className="text-primary">{filters.priceRange[0].toLocaleString()} د.ع</span>
                        </div>
                        <span className="text-muted-foreground">-</span>
                        <div className="flex flex-col items-end">
                            <span className="text-xs text-muted-foreground">إلى</span>
                            <span className="text-primary">{filters.priceRange[1].toLocaleString()} د.ع</span>
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>

            {/* Rating */}
            <Collapsible open={expandedSections.rating}>
                <CollapsibleTrigger
                    onClick={() => toggleSection("rating")}
                    className="flex items-center justify-between w-full py-2 font-medium"
                >
                    التقييم
                    {expandedSections.rating ? (
                        <ChevronUp className="w-4 h-4" />
                    ) : (
                        <ChevronDown className="w-4 h-4" />
                    )}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">
                    {[5, 4, 3, 2, 1].map((rating) => (
                        <div key={rating} className="flex items-center gap-2">
                            <Checkbox
                                id={`rating-${rating}`}
                                checked={filters.ratings.includes(rating)}
                                onCheckedChange={() => toggleRating(rating)}
                            />
                            <Label
                                htmlFor={`rating-${rating}`}
                                className="text-sm cursor-pointer flex items-center gap-1"
                            >
                                <div className="flex">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={cn(
                                                "w-3 h-3",
                                                i < rating
                                                    ? "fill-amber-400 text-amber-400"
                                                    : "text-muted-foreground"
                                            )}
                                        />
                                    ))}
                                </div>
                                <span className="text-muted-foreground">وأعلى</span>
                            </Label>
                        </div>
                    ))}
                </CollapsibleContent>
            </Collapsible>

            {/* Brands */}
            {availableBrands.length > 0 && (
                <Collapsible open={expandedSections.brands}>
                    <CollapsibleTrigger
                        onClick={() => toggleSection("brands")}
                        className="flex items-center justify-between w-full py-2 font-medium"
                    >
                        العلامات التجارية
                        {expandedSections.brands ? (
                            <ChevronUp className="w-4 h-4" />
                        ) : (
                            <ChevronDown className="w-4 h-4" />
                        )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 pt-2">
                        {availableBrands.map((brand) => (
                            <div key={brand} className="flex items-center gap-2">
                                <Checkbox
                                    id={`brand-${brand}`}
                                    checked={filters.brands.includes(brand)}
                                    onCheckedChange={() => toggleBrand(brand)}
                                />
                                <Label
                                    htmlFor={`brand-${brand}`}
                                    className="text-sm cursor-pointer flex-1"
                                >
                                    {brand}
                                </Label>
                            </div>
                        ))}
                    </CollapsibleContent>
                </Collapsible>
            )}
        </div>
    );

    return (
        <>
            {/* Desktop Filters (Sidebar) */}
            <div className={cn("hidden lg:block", className)}>
                <div className="sticky top-24">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            الفلاتر
                            {activeFiltersCount > 0 && (
                                <Badge variant="secondary" className="h-5 px-1.5">
                                    {activeFiltersCount}
                                </Badge>
                            )}
                        </h3>
                        <span className="text-sm text-muted-foreground">
                            {filteredCount} من {totalProducts}
                        </span>
                    </div>
                    <FilterContent />
                </div>
            </div>

            {/* Mobile Filters (Sheet) */}
            <div className="lg:hidden">
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                    <SheetTrigger asChild>
                        <Button variant="outline" className="gap-2">
                            <Filter className="w-4 h-4" />
                            الفلاتر
                            {activeFiltersCount > 0 && (
                                <Badge variant="secondary" className="h-5 px-1.5">
                                    {activeFiltersCount}
                                </Badge>
                            )}
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[300px] overflow-y-auto">
                        <SheetHeader>
                            <SheetTitle className="text-right">الفلاتر</SheetTitle>
                        </SheetHeader>
                        <div className="py-4">
                            <FilterContent />
                        </div>
                        <SheetFooter>
                            <Button onClick={() => setIsOpen(false)} className="w-full">
                                عرض {filteredCount} نتيجة
                            </Button>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>
            </div>
        </>
    );
}

// Sort Dropdown Component
export function ProductSortDropdown({
    value,
    onChange,
    className,
}: {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const currentLabel = SORT_OPTIONS.find((o) => o.value === value)?.label || "ترتيب";

    return (
        <div className={cn("relative", className)}>
            <Button
                variant="outline"
                className="gap-2"
                onClick={() => setIsOpen(!isOpen)}
            >
                {currentLabel}
                <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
            </Button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute left-0 top-full mt-1 z-50 bg-popover border rounded-lg shadow-lg min-w-[180px] py-1">
                        {SORT_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                    // Save to localStorage
                                    localStorage.setItem("aquavo_sort_preference", option.value);
                                }}
                                className={cn(
                                    "w-full text-right px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between",
                                    value === option.value && "bg-muted"
                                )}
                            >
                                {option.label}
                                {value === option.value && <Check className="w-4 h-4" />}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
