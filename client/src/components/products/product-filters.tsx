import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, SlidersHorizontal, Sparkles, Tag, Layers, Star, Leaf, Zap, DollarSign, Package, TrendingUp } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import { cn } from "@/lib/utils";

export interface FilterState {
  priceRange: [number, number];
  categories: string[];
  brands: string[];
  difficulties: string[];
  tags: string[];
}

export interface CategoryCount {
  name: string;
  count: number;
}

export interface BrandCount {
  name: string;
  count: number;
}

interface ProductFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  availableCategories: string[];
  availableBrands: string[];
  maxPrice: number;
  activeFiltersCount: number;
  categoryCounts?: CategoryCount[];
  brandCounts?: BrandCount[];
}

// Enhanced Chip component for filter options with counts
function FilterChip({
  label,
  selected,
  onClick,
  icon: Icon,
  color = "default",
  count,
  disabled = false,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: React.ElementType;
  color?: "default" | "green" | "blue" | "orange" | "purple" | "cyan";
  count?: number;
  disabled?: boolean;
}) {
  const colorClasses = {
    default: selected
      ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-transparent shadow-lg shadow-primary/25"
      : "bg-card/80 backdrop-blur-sm hover:bg-accent/50 border-border/50 hover:border-primary/50 hover:shadow-md",
    green: selected
      ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-transparent shadow-lg shadow-emerald-500/25"
      : "bg-card/80 backdrop-blur-sm hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-border/50 hover:border-emerald-400 hover:shadow-md",
    blue: selected
      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-transparent shadow-lg shadow-blue-500/25"
      : "bg-card/80 backdrop-blur-sm hover:bg-blue-50 dark:hover:bg-blue-950/30 border-border/50 hover:border-blue-400 hover:shadow-md",
    orange: selected
      ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white border-transparent shadow-lg shadow-orange-500/25"
      : "bg-card/80 backdrop-blur-sm hover:bg-orange-50 dark:hover:bg-orange-950/30 border-border/50 hover:border-orange-400 hover:shadow-md",
    purple: selected
      ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white border-transparent shadow-lg shadow-purple-500/25"
      : "bg-card/80 backdrop-blur-sm hover:bg-purple-50 dark:hover:bg-purple-950/30 border-border/50 hover:border-purple-400 hover:shadow-md",
    cyan: selected
      ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-white border-transparent shadow-lg shadow-cyan-500/25"
      : "bg-card/80 backdrop-blur-sm hover:bg-cyan-50 dark:hover:bg-cyan-950/30 border-border/50 hover:border-cyan-400 hover:shadow-md",
  };

  if (disabled || count === 0) {
    return null; // Hide chips with 0 products
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all duration-300",
        "hover:scale-[1.02] active:scale-[0.98]",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
        colorClasses[color]
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <Badge
          variant="secondary"
          className={cn(
            "h-5 px-1.5 text-[10px] font-bold rounded-md transition-colors",
            selected
              ? "bg-white/20 text-white"
              : "bg-primary/10 text-primary"
          )}
        >
          {count}
        </Badge>
      )}
      {selected && <X className="w-3.5 h-3.5 ml-0.5 opacity-70" />}
    </button>
  );
}

// Enhanced Section header with icon
function FilterSection({
  title,
  icon: Icon,
  children,
  badge,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="w-4 h-4 text-primary" />
            </div>
          )}
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {badge !== undefined && badge > 0 && (
          <Badge variant="outline" className="text-[10px] px-2">
            {badge} مختار
          </Badge>
        )}
      </div>
      {children}
    </div>
  );
}

// Applied Filters Bar
function AppliedFiltersBar({
  filters,
  onRemoveCategory,
  onRemoveBrand,
  onRemoveDifficulty,
  onRemoveTag,
  onClearAll,
}: {
  filters: FilterState;
  onRemoveCategory: (cat: string) => void;
  onRemoveBrand: (brand: string) => void;
  onRemoveDifficulty: (diff: string) => void;
  onRemoveTag: (tag: string) => void;
  onClearAll: () => void;
}) {
  const allFilters = [
    ...filters.categories.map(c => ({ type: 'category', value: c, label: c })),
    ...filters.brands.map(b => ({ type: 'brand', value: b, label: b })),
    ...filters.difficulties.map(d => ({ type: 'difficulty', value: d, label: d })),
    ...filters.tags.map(t => ({ type: 'tag', value: t, label: t })),
  ];

  if (allFilters.length === 0) return null;

  const handleRemove = (type: string, value: string) => {
    switch (type) {
      case 'category': onRemoveCategory(value); break;
      case 'brand': onRemoveBrand(value); break;
      case 'difficulty': onRemoveDifficulty(value); break;
      case 'tag': onRemoveTag(value); break;
    }
  };

  return (
    <div className="p-3 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
            <Zap className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium text-primary">{allFilters.length} فلتر نشط</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-destructive h-7 px-2"
        >
          <X className="w-3 h-3 ml-1" />
          مسح الكل
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {allFilters.map((filter, i) => (
          <Badge
            key={`${filter.type}-${filter.value}-${i}`}
            variant="secondary"
            className="pl-2 pr-1 py-1 text-xs cursor-pointer hover:bg-destructive/10 transition-colors group"
            onClick={() => handleRemove(filter.type, filter.value)}
          >
            {filter.label}
            <X className="w-3 h-3 mr-1 opacity-50 group-hover:opacity-100 group-hover:text-destructive" />
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function ProductFilters({
  filters,
  onFilterChange,
  availableCategories,
  availableBrands,
  maxPrice,
  activeFiltersCount,
  categoryCounts = [],
  brandCounts = [],
}: ProductFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Build count maps for quick lookup
  const categoryCountMap = useMemo(() => {
    const map = new Map<string, number>();
    categoryCounts.forEach(c => map.set(c.name, c.count));
    return map;
  }, [categoryCounts]);

  const brandCountMap = useMemo(() => {
    const map = new Map<string, number>();
    brandCounts.forEach(b => map.set(b.name, b.count));
    return map;
  }, [brandCounts]);

  const difficulties = [
    { label: "مبتدئ", value: "مبتدئ", color: "green" as const },
    { label: "متوسط", value: "متوسط", color: "orange" as const },
    { label: "متقدم", value: "متقدم", color: "purple" as const },
  ];

  const tags = [
    { label: "جديد", value: "جديد", icon: Sparkles, color: "cyan" as const },
    { label: "الأكثر مبيعاً", value: "الأكثر مبيعاً", icon: TrendingUp, color: "orange" as const },
    { label: "صديق للبيئة", value: "صديق للبيئة", icon: Leaf, color: "green" as const },
  ];

  const handlePriceChange = (value: [number, number]) => {
    const newFilters = { ...localFilters, priceRange: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const toggleFilter = (type: keyof FilterState, value: string) => {
    const current = localFilters[type] as string[];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    const newFilters = { ...localFilters, [type]: updated };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const removeFilter = (type: keyof FilterState, value: string) => {
    const current = localFilters[type] as string[];
    const updated = current.filter(v => v !== value);
    const newFilters = { ...localFilters, [type]: updated };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClearAll = () => {
    const clearedFilters: FilterState = {
      priceRange: [0, maxPrice],
      categories: [],
      brands: [],
      difficulties: [],
      tags: [],
    };
    setLocalFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  // Format price for display
  const formatPrice = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toLocaleString();
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Applied Filters Bar */}
      <AppliedFiltersBar
        filters={localFilters}
        onRemoveCategory={(cat) => removeFilter("categories", cat)}
        onRemoveBrand={(brand) => removeFilter("brands", brand)}
        onRemoveDifficulty={(diff) => removeFilter("difficulties", diff)}
        onRemoveTag={(tag) => removeFilter("tags", tag)}
        onClearAll={handleClearAll}
      />

      {/* Price Range - Dual Slider */}
      <FilterSection title="نطاق السعر" icon={DollarSign}>
        <div className="px-1">
          <DualRangeSlider
            min={0}
            max={maxPrice}
            step={Math.ceil(maxPrice / 100)}
            value={localFilters.priceRange}
            onValueChange={handlePriceChange}
            formatValue={(v) => `${formatPrice(v)} د.ع`}
            showValues={true}
          />
        </div>
      </FilterSection>

      {/* Quick Tags */}
      <FilterSection title="تصفية سريعة" icon={Sparkles} badge={localFilters.tags.length}>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <FilterChip
              key={tag.value}
              label={tag.label}
              icon={tag.icon}
              color={tag.color}
              selected={localFilters.tags.includes(tag.value)}
              onClick={() => toggleFilter("tags", tag.value)}
            />
          ))}
        </div>
      </FilterSection>

      {/* Categories with Counts */}
      {availableCategories.length > 0 && (
        <FilterSection title="الفئات" icon={Layers} badge={localFilters.categories.length}>
          <div className="flex flex-wrap gap-2">
            {availableCategories.map((category) => (
              <FilterChip
                key={category}
                label={category}
                count={categoryCountMap.get(category) || 0}
                selected={localFilters.categories.includes(category)}
                onClick={() => toggleFilter("categories", category)}
              />
            ))}
          </div>
        </FilterSection>
      )}

      {/* Brands with Counts */}
      {availableBrands.length > 0 && (
        <FilterSection title="العلامات التجارية" icon={Tag} badge={localFilters.brands.length}>
          <div className="flex flex-wrap gap-2 max-h-[180px] overflow-y-auto custom-scrollbar p-1">
            {availableBrands.map((brand) => (
              <FilterChip
                key={brand}
                label={brand}
                count={brandCountMap.get(brand) || 0}
                selected={localFilters.brands.includes(brand)}
                onClick={() => toggleFilter("brands", brand)}
              />
            ))}
          </div>
        </FilterSection>
      )}

      {/* Difficulty */}
      <FilterSection title="مستوى الخبرة" icon={Star} badge={localFilters.difficulties.length}>
        <div className="flex flex-wrap gap-2">
          {difficulties.map((diff) => (
            <FilterChip
              key={diff.value}
              label={diff.label}
              color={diff.color}
              selected={localFilters.difficulties.includes(diff.value)}
              onClick={() => toggleFilter("difficulties", diff.value)}
            />
          ))}
        </div>
      </FilterSection>
    </div>
  );

  return (
    <>
      {/* Desktop Filters - Enhanced Glassmorphism Sidebar */}
      <div className="hidden lg:block sticky top-24">
        <div className="p-5 rounded-2xl bg-card/70 backdrop-blur-xl border border-border/50 shadow-2xl shadow-primary/5">
          {/* Header */}
          <div className="mb-6 pb-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <SlidersHorizontal className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg">تصفية المنتجات</h2>
                <p className="text-xs text-muted-foreground">اختر ما يناسبك</p>
              </div>
            </div>
          </div>
          <FilterContent />
        </div>
      </div>

      {/* Mobile Filters - Bottom Sheet */}
      <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              size="lg"
              className="shadow-2xl shadow-primary/30 rounded-full px-6 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all hover:scale-105"
            >
              <SlidersHorizontal className="w-5 h-5 ml-2" />
              الفلاتر
              {activeFiltersCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center bg-white text-primary border-2 border-primary font-bold animate-bounce">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
            <SheetHeader className="pb-4 border-b">
              <div className="flex items-center justify-between">
                <SheetTitle className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4 text-white" />
                  </div>
                  تصفية المنتجات
                </SheetTitle>
                <SheetClose asChild>
                  <Button variant="ghost" size="sm" className="rounded-full">
                    <X className="w-5 h-5" />
                  </Button>
                </SheetClose>
              </div>
            </SheetHeader>
            <div className="mt-6 overflow-y-auto h-[calc(100%-80px)] pb-20">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
