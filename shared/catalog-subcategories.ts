/** Facets use the stored category/subcategory, independent of supplier or stock. */
export type CatalogFacetProduct = { category?: string | null; subcategory?: string | null };

export function catalogSubcategories(products: readonly CatalogFacetProduct[], category: string) {
  const counts = new Map<string, number>();
  for (const product of products) {
    const value = product.subcategory?.trim();
    if (product.category !== category || !value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts].map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value, "ar"));
}

/** Ignore stale links after a category change instead of showing an empty shop. */
export function activeCatalogSubcategory(
  requested: string | null,
  urlCategory: string | null,
  selectedCategories: readonly string[],
  options: readonly { value: string }[],
): string | null {
  if (selectedCategories.length !== 1 || selectedCategories[0] !== urlCategory) return null;
  return options.some(option => option.value === requested) ? requested : null;
}
