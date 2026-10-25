import type { FilterState } from "@/components/products/filter-modal";
import type { Product, ProductQueryParams } from "@/types";
import { PRODUCT_TAG_VALUES } from "@/lib/product-filter-values";
import { isFoodCategory, matchesFoodFilter, type FoodFilter } from "@shared/food-choice";

/** Shared by the applied listing and the draft preview; never count an already filtered subset. */
export function buildProductQuery(
  filters: FilterState,
  minPrice: number,
  maxPrice: number,
  sortBy: string,
  search?: string | null,
): ProductQueryParams {
  const params: ProductQueryParams = {};
  if (filters.categories.length) params.category = filters.categories;
  if (filters.brands.length) params.brand = filters.brands;
  if (filters.priceRange[0] > minPrice) params.minPrice = filters.priceRange[0];
  if (filters.priceRange[1] < maxPrice) params.maxPrice = filters.priceRange[1];
  if (search) params.search = search;
  if (filters.tags.includes(PRODUCT_TAG_VALUES.new)) params.isNew = true;
  if (filters.tags.includes(PRODUCT_TAG_VALUES.bestSeller)) params.isBestSeller = true;
  if (sortBy === "price-asc") { params.sortBy = "price"; params.sortOrder = "asc"; }
  else if (sortBy === "price-desc") { params.sortBy = "price"; params.sortOrder = "desc"; }
  else if (sortBy === "name-asc") { params.sortBy = "name"; params.sortOrder = "asc"; }
  else if (sortBy === "rating-desc") { params.sortBy = "rating"; params.sortOrder = "desc"; }
  else if (sortBy === "default") { params.sortBy = "views"; params.sortOrder = "desc"; }
  else { params.sortBy = "createdAt"; params.sortOrder = "desc"; }
  return params;
}

export function isListingProductSellable(product: Product): boolean {
  const hasPrice = (product.price ?? 0) > 0 || Boolean(product.hasVariants && product.variants?.some(v => (v.price ?? 0) > 0));
  const inStock = product.hasVariants && product.variants?.length
    ? product.variants.some(v => (v.stock ?? 0) > 0 && (v.price ?? 0) > 0)
    : (product.stock ?? 0) > 0;
  return hasPrice && inStock;
}

export function filterListingProducts(products: Product[], filters: FilterState, foodFilter: FoodFilter): Product[] {
  const foodListing = filters.categories.length === 1 && isFoodCategory(filters.categories[0]);
  return products.filter(product => {
    if (foodListing && !matchesFoodFilter(product, foodFilter)) return false;
    if (filters.difficulties.length && (!product.difficulty || !filters.difficulties.includes(product.difficulty))) return false;
    if (filters.tags.includes(PRODUCT_TAG_VALUES.eco) && !product.ecoFriendly) return false;
    return !filters.tags.includes("in-stock") || isListingProductSellable(product);
  });
}
