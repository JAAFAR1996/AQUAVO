import type { FilterState } from "@/components/products/filter-modal";
import type { FoodFilter } from "@shared/food-choice";
import { isFoodCategory } from "@shared/food-choice";

export function readListingUrlFilters(search: string): FilterState {
  const params = new URLSearchParams(search);
  const values = (key: string) => [...new Set(params.getAll(key).filter(value => value.length > 0 && value.length <= 200))].slice(0, 50);
  const number = (key: string, fallback: number) => {
    const raw = params.get(key);
    const value = raw === null || raw.trim() === "" ? NaN : Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  };
  const min = number("minPrice", 0);
  const max = number("maxPrice", 1_000_000);
  return {
    priceRange: min <= max ? [min, max] : [0, 1_000_000],
    categories: values("category"), brands: values("brand"),
    difficulties: values("difficulty"), tags: values("tag"),
  };
}

/** Preserve attribution/search while making every applied facet shareable. */
export function productListingUrl(
  search: string,
  state: { filters: FilterState; sortBy: string; foodFilter: FoodFilter },
  minPrice: number,
  maxPrice: number,
): string {
  const params = new URLSearchParams(search);
  const { filters, sortBy, foodFilter } = state;
  for (const [key, values] of [
    ["category", filters.categories], ["brand", filters.brands],
    ["difficulty", filters.difficulties], ["tag", filters.tags],
  ] as const) {
    params.delete(key);
    for (const value of values) params.append(key, value);
  }
  for (const [key, value] of [
    ["minPrice", filters.priceRange[0] > minPrice ? String(filters.priceRange[0]) : ""],
    ["maxPrice", filters.priceRange[1] < maxPrice ? String(filters.priceRange[1]) : ""],
    ["sort", sortBy === "default" ? "" : sortBy],
    ["food", filters.categories.length === 1 && isFoodCategory(filters.categories[0]) && foodFilter !== "all" ? foodFilter : ""],
  ]) {
    if (value) params.set(key, value); else params.delete(key);
  }
  params.delete("recommended");
  const query = params.toString();
  return `/products${query ? `?${query}` : ""}`;
}
