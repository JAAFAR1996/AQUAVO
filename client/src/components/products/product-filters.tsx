import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export interface FilterState {
  priceRange: [number, number];
  categories: string[];
  brands: string[];
  difficulties: string[];
  tags: string[];
}

interface ProductFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  availableCategories: string[];
  availableBrands: string[];
  maxPrice: number;
  activeFiltersCount: number;
}

export function ProductFilters({
  filters,
  onFilterChange,
  availableCategories,
  availableBrands,
  maxPrice,
  activeFiltersCount,
}: ProductFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  // Sync local state with prop changes
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const difficulties = ["مبتدئ", "متوسط", "متقدم"];
  const tags = ["جديد", "الأكثر مبيعاً", "صديق للبيئة"];

  // Update visual slider only
  const handlePriceChange = (value: number[]) => {
    setLocalFilters(prev => ({ ...prev, priceRange: [value[0], value[1]] as [number, number] }));
  };

  // Commit change to parent (API call)
  const handlePriceCommit = (value: number[]) => {
    const newFilters = { ...localFilters, priceRange: [value[0], value[1]] as [number, number] };
    onFilterChange(newFilters);
  };

  const handleCategoryToggle = (category: string) => {
    const newCategories = localFilters.categories.includes(category)
      ? localFilters.categories.filter((c) => c !== category)
      : [...localFilters.categories, category];
    const newFilters = { ...localFilters, categories: newCategories };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleBrandToggle = (brand: string) => {
    const newBrands = localFilters.brands.includes(brand)
      ? localFilters.brands.filter((b) => b !== brand)
      : [...localFilters.brands, brand];
    const newFilters = { ...localFilters, brands: newBrands };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleDifficultyToggle = (difficulty: string) => {
    const newDifficulties = localFilters.difficulties.includes(difficulty)
      ? localFilters.difficulties.filter((d) => d !== difficulty)
      : [...localFilters.difficulties, difficulty];
    const newFilters = { ...localFilters, difficulties: newDifficulties };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleTagToggle = (tag: string) => {
    const newTags = localFilters.tags.includes(tag)
      ? localFilters.tags.filter((t) => t !== tag)
      : [...localFilters.tags, tag];
    const newFilters = { ...localFilters, tags: newTags };
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

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Active Filters Count */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-sm">
            {activeFiltersCount} فلتر نشط
          </Badge>
          <Button variant="ghost" size="sm" onClick={handleClearAll} className="h-8 text-xs">
            <X className="w-3 h-3 ml-1" />
            مسح الكل
          </Button>
        </div>
      )}

      {/* Price Range */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">السعر</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Slider
            min={0}
            max={maxPrice}
            step={1000}
            value={localFilters.priceRange}
            onValueChange={handlePriceChange}
            onValueCommit={handlePriceCommit}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{localFilters.priceRange[0].toLocaleString()} د.ع</span>
            <span>{localFilters.priceRange[1].toLocaleString()} د.ع</span>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      {availableCategories.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">الفئة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableCategories.map((category) => (
              <div key={category} className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id={`category-${category}`}
                  checked={localFilters.categories.includes(category)}
                  onCheckedChange={() => handleCategoryToggle(category)}
                />
                <Label
                  htmlFor={`category-${category}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {category}
                </Label>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Brands */}
      {availableBrands.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">العلامة التجارية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[200px] overflow-y-auto">
            {availableBrands.map((brand) => (
              <div key={brand} className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id={`brand-${brand}`}
                  checked={localFilters.brands.includes(brand)}
                  onCheckedChange={() => handleBrandToggle(brand)}
                />
                <Label htmlFor={`brand-${brand}`} className="text-sm font-normal cursor-pointer">
                  {brand}
                </Label>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Difficulty */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">مستوى الخبرة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {difficulties.map((difficulty) => (
            <div key={difficulty} className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id={`difficulty-${difficulty}`}
                checked={localFilters.difficulties.includes(difficulty)}
                onCheckedChange={() => handleDifficultyToggle(difficulty)}
              />
              <Label
                htmlFor={`difficulty-${difficulty}`}
                className="text-sm font-normal cursor-pointer"
              >
                {difficulty}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">خصائص إضافية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tags.map((tag) => (
            <div key={tag} className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id={`tag-${tag}`}
                checked={localFilters.tags.includes(tag)}
                onCheckedChange={() => handleTagToggle(tag)}
              />
              <Label htmlFor={`tag-${tag}`} className="text-sm font-normal cursor-pointer">
                {tag}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <>
      {/* Desktop Filters */}
      <div className="hidden lg:block sticky top-20">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5" />
              تصفية المنتجات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FilterContent />
          </CardContent>
        </Card>
      </div>

      {/* Mobile Filters */}
      <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="lg" className="shadow-lg relative">
              <SlidersHorizontal className="w-5 h-5 ml-2" />
              الفلاتر
              {activeFiltersCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>تصفية المنتجات</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
