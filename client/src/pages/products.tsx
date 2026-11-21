import { useMemo, useState, useEffect, useRef, useCallback, lazy, Suspense, type SetStateAction } from "react";
import { z } from "zod";
import { phTrackCategoryClick } from "@/lib/posthog";
import { useInView } from "@/hooks/use-in-view";
import { useListingRestoration } from "@/hooks/use-listing-restoration";
import { readListingState } from "@/lib/listing-navigation";
import { Link, useLocation, useSearch } from "wouter";
import { AlertCircle, ArrowUpDown, Banknote, Clock, Eye, Headphones, RefreshCw, Sparkles, Truck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetaTags, ItemListSchema, BreadcrumbSchema } from "@/components/seo/meta-tags";
import { productListingSeo } from "@shared/seo-contract";
import { ProductCard } from "@/components/products/product-card";
import { CategoryScrollBar } from "@/components/products/category-scroll-bar";
import { GuideLinksSection } from "@/components/seo/guide-links-section";
import { CategoryIntro } from "@/components/seo/category-intro";
import { categoryContent } from "@shared/category-content";
import { categorySearch } from "@shared/category-search";
import { FilterBar } from "@/components/products/filter-bar";
import type { FilterState } from "@/components/products/filter-modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { buildProductQuery } from "@/lib/product-listing-filters";
import { readListingUrlFilters, productListingUrl } from "@/lib/product-listing-url";
import { fetchProducts, fetchProductAttributes, fetchPersonalizedOrder } from "@/lib/api";
import { ProductCardSkeleton } from "@/components/ui/loading-skeleton";
import { BackToTop } from "@/components/back-to-top";
import { useAuth } from "@/contexts/auth-context";
import type { Product } from "@/types";
import { trackViewItemList } from "@/lib/analytics";
import { Trans, useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/locale-context";
import { currencyLabel } from "@/i18n/format";
import { localizeCategoryName } from "@shared/i18n/categories";
import { PRODUCT_TAG_VALUES, productDifficultyKey, productTagKey } from "@/lib/product-filter-values";
import { getLocalizedStaticMeta } from "@/i18n/static-meta";
import { formatShippingFeeNumber, useShippingFee } from "@/contexts/shipping-fee-context";
import { FoodCategoryGuide } from "@/components/products/food-choice-guide";
import { foodFilterSchema, isFoodCategory, type FoodFilter } from "@shared/food-choice";

const FilterModal = lazy(() => import("@/components/products/filter-modal").then(m => ({ default: m.FilterModal })));
const QuickViewModal = lazy(() => import("@/components/products/quick-view-modal").then(m => ({ default: m.QuickViewModal })));
const ComparisonDrawer = lazy(() => import("@/components/products/product-comparison").then(m => ({ default: m.ComparisonDrawer })));

const sortOptionSchema = z.enum(["default", "newest", "smart", "price-asc", "price-desc", "name-asc", "rating-desc"]);
const listingStateSchema = z.object({
  filters: z.object({
    priceRange: z.tuple([z.number().finite().nonnegative(), z.number().finite().nonnegative()])
      .refine(([min, max]) => min <= max),
    categories: z.array(z.string()),
    brands: z.array(z.string()),
    difficulties: z.array(z.string()),
    tags: z.array(z.string()),
  }),
  sortBy: sortOptionSchema,
  foodFilter: foodFilterSchema,
  displayCount: z.number().int().min(24).max(Number.MAX_SAFE_INTEGER),
});
type ProductsListingState = z.infer<typeof listingStateSchema>;

function sameFilters(left: FilterState, right: FilterState): boolean {
  return left.priceRange[0] === right.priceRange[0] && left.priceRange[1] === right.priceRange[1]
    && (["categories", "brands", "difficulties", "tags"] as const).every(key =>
      left[key].length === right[key].length && left[key].every(value => right[key].includes(value)));
}

type ActiveFilterChip = {
  id: string;
  label: string;
  onRemove: () => void;
};

export default function Products() {
  const { t } = useTranslation("products");
  const { locale, dir } = useLocale();
  const shippingFeeLabel = formatShippingFeeNumber(useShippingFee());
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const searchParams = new URLSearchParams(search);
  const initialCategory = searchParams.get("category");
  // Canonical identity of this listing, from the same builder SSR uses, so the
  // category facet survives hydration instead of collapsing to bare /products.
  const listingSeo = productListingSeo(initialCategory);
  const initialSearch = searchParams.get("search");
  const initialSort = searchParams.get("sort");
  const isRecommendedView = searchParams.get("recommended") === "1";

  const { data: attributes, isLoading: isAttributesLoading, isFetching: isAttributesFetching, isError: isAttributesError, refetch: refetchAttributes } = useQuery({
    queryKey: ["product-attributes"],
    queryFn: fetchProductAttributes,
    staleTime: 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const availableCategories = attributes?.categories || [];
  const availableBrands = attributes?.brands || [];
  const minPrice = attributes?.minPrice || 0;
  const maxPrice = attributes?.maxPrice || 1000000;

  const [listing, setListing] = useState<ProductsListingState & { priceRangeInitialized: boolean }>(() => {
    const restored = readListingState("products", value => {
      const parsed = listingStateSchema.safeParse(value);
      return parsed.success ? parsed.data : undefined;
    });
    if (restored) return { ...restored, priceRangeInitialized: true };

    const food = foodFilterSchema.safeParse(searchParams.get("food"));
    const urlFilters = readListingUrlFilters(search);
    const parsedSort = sortOptionSchema.safeParse(initialSort);
    return {
      filters: {
        ...urlFilters,
        tags: initialSort === "best-selling" ? [...new Set([...urlFilters.tags, PRODUCT_TAG_VALUES.bestSeller])] : urlFilters.tags,
      },
      sortBy: initialSort === "best-selling" ? "rating-desc" : parsedSort.success ? parsedSort.data : (isRecommendedView && user ? "smart" : "default"),
      foodFilter: isFoodCategory(initialCategory) && food.success ? food.data : "all",
      displayCount: 24,
      priceRangeInitialized: false,
    };
  });
  const { filters, sortBy, foodFilter, displayCount } = listing;
  const syncUrlRequested = useRef(false);
  useEffect(() => {
    if (!syncUrlRequested.current) return;
    syncUrlRequested.current = false;
    const next = productListingUrl(search, { filters, sortBy, foodFilter }, minPrice, maxPrice);
    if (next !== `/products${search ? `?${search}` : ""}`) setLocation(next, { replace: true });
  }, [filters, sortBy, foodFilter, minPrice, maxPrice, search, setLocation]);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const isFoodListing = filters.categories.length === 1 && isFoodCategory(filters.categories[0]);
  const lastLoadAtRef = useRef(0);

  useEffect(() => {
    if (!attributes || !Number.isFinite(attributes.minPrice) || !Number.isFinite(attributes.maxPrice)) return;
    setListing(prev => {
      if (prev.priceRangeInitialized) return prev;
      // Resolve the default range once. A restored or user-selected range must
      // survive attribute refetches without resetting the loaded product count.
      const isDefaultRange = prev.filters.priceRange[0] === 0 && prev.filters.priceRange[1] === 1000000;
      return {
        ...prev,
        priceRangeInitialized: true,
        filters: isDefaultRange
          ? { ...prev.filters, priceRange: [attributes.minPrice, attributes.maxPrice] }
          : prev.filters,
      };
    });
  }, [attributes]);

  const { data: boostData, isLoading: isBoostLoading, isFetching: isBoostFetching } = useQuery({
    queryKey: ["personalized-order"],
    queryFn: fetchPersonalizedOrder,
    staleTime: 5 * 60 * 1000,
    enabled: !!user && sortBy === "smart",
  });

  const boostIds = boostData?.boostIds ?? [];

  const queryParams = useMemo(() => ({
    ...buildProductQuery(filters, minPrice, maxPrice, sortBy, initialSearch),
    paginated: true,
    limit: 24,
    ...(filters.categories.length === 1 && isFoodCategory(filters.categories[0]) ? { food: foodFilter } : {}),
    ...(sortBy === "smart" && boostIds.length ? { preferredIds: boostIds } : {}),
  }), [filters, sortBy, initialSearch, minPrice, maxPrice, foodFilter, boostIds]);

  const getDraftResultCount = useCallback(async (draft: FilterState) => {
    const params = {
      ...buildProductQuery(draft, minPrice, maxPrice, sortBy, initialSearch),
      paginated: true, limit: 1,
      ...(draft.categories.length === 1 && isFoodCategory(draft.categories[0]) ? { food: foodFilter } : {}),
    };
    const result = await queryClient.fetchQuery({
      queryKey: ["products-count", params],
      queryFn: () => fetchProducts(params),
      staleTime: 15_000,
    });
    return result.total ?? result.products.length;
  }, [queryClient, minPrice, maxPrice, sortBy, initialSearch, foodFilter]);

  const {
    data, isLoading: isProductsLoading, isFetching: isProductsFetching,
    isError: isProductsError, refetch: refetchProducts, hasNextPage, fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["products-page", queryParams],
    queryFn: ({ pageParam }) => fetchProducts({ ...queryParams, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, _pages, offset) => last.hasMore && last.products.length ? offset + last.products.length : undefined,
    staleTime: 15_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
  });
  const isError = isProductsError || isAttributesError;
  const finalProducts = useMemo(() => {
    const unique = new Map<string, Product>();
    for (const page of data?.pages ?? []) for (const product of page.products) unique.set(product.id, product);
    return [...unique.values()];
  }, [data]);
  const totalProducts = data?.pages[0]?.total ?? finalProducts.length;
  const displayedProducts = finalProducts.slice(0, displayCount);

  // A restored long listing may need additional network pages if its cache was
  // evicted. Fetch them before restoring the product anchor/scroll position.
  useEffect(() => {
    if (finalProducts.length < displayCount && hasNextPage && !isProductsFetching && !isError) void fetchNextPage();
  }, [finalProducts.length, displayCount, hasNextPage, isProductsFetching, isError, fetchNextPage]);

  const { containerRef, isRestoring } = useListingRestoration({
    kind: "products",
    state: { filters, sortBy, foodFilter, displayCount },
    ready: finalProducts.length >= Math.min(displayCount, totalProducts) && !isProductsLoading && !isProductsFetching && !isError
      && !isAttributesLoading && !isAttributesFetching
      && (!(user && sortBy === "smart") || (!isBoostLoading && !isBoostFetching)),
    contentKey: displayedProducts.map(product => product.id).join(","),
  });

  const trackedListSignature = useRef("");
  useEffect(() => {
    const signature = displayedProducts.map((product) => product.id).join(",");
    if (!signature || signature === trackedListSignature.current) return;
    trackedListSignature.current = signature;
    trackViewItemList(displayedProducts.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      category: product.category,
    })), initialCategory ? `products:${initialCategory}` : "products");
  }, [displayedProducts, initialCategory]);

  const hasMore = displayCount < finalProducts.length || Boolean(hasNextPage);

  const loadMore = useCallback(() => {
    if (isRestoring || isProductsLoading || isProductsFetching) return;
    const now = Date.now();
    if (now - lastLoadAtRef.current < 400) return;
    lastLoadAtRef.current = now;
    if (displayCount < finalProducts.length) {
      setListing(prev => ({ ...prev, displayCount: prev.displayCount + 24 }));
    } else if (hasNextPage) {
      void fetchNextPage().then(result => {
        if (!result.isError) setListing(prev => ({ ...prev, displayCount: prev.displayCount + 24 }));
      });
    }
  }, [displayCount, finalProducts.length, hasNextPage, fetchNextPage, isRestoring, isProductsLoading, isProductsFetching]);

  const { ref: sentinelRef, inView: sentinelInView } = useInView({ threshold: 0.5, once: false });

  useEffect(() => {
    if (!isRestoring && sentinelInView && hasMore) loadMore();
  }, [sentinelInView, hasMore, isRestoring, loadMore]);

  const isLoading = isProductsLoading;

  const categoryCounts = useMemo(() => attributes?.categoryCounts
    ? new Map(Object.entries(attributes.categoryCounts))
    : undefined, [attributes?.categoryCounts]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (Math.abs(filters.priceRange[0] - minPrice) > 1 || Math.abs(filters.priceRange[1] - maxPrice) > 1) count++;
    count += filters.brands.length;
    count += filters.difficulties.length;
    count += filters.tags.length;
    return count;
  }, [filters, minPrice, maxPrice]);

  const applyFilters = useCallback((next: SetStateAction<FilterState>) => {
    syncUrlRequested.current = true;
    setListing(prev => {
      const updated = typeof next === "function" ? next(prev.filters) : next;
      if (sameFilters(prev.filters, updated)) return prev;
      return {
        ...prev,
        filters: updated,
        foodFilter: updated.categories.length === 1 && isFoodCategory(updated.categories[0]) ? prev.foodFilter : "all",
        displayCount: 24,
      };
    });
  }, []);

  const changeSort = (value: string) => {
    const parsed = sortOptionSchema.safeParse(value);
    if (!parsed.success) return;
    syncUrlRequested.current = true;
    setListing(prev => prev.sortBy === parsed.data ? prev : { ...prev, sortBy: parsed.data, displayCount: 24 });
  };

  const changeFoodFilter = (value: FoodFilter) => {
    syncUrlRequested.current = true;
    setListing(prev => prev.foodFilter === value ? prev : { ...prev, foodFilter: value, displayCount: 24 });
  };

  const handleCategoryToggle = (category: string) => {
    applyFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category],
    }));
    phTrackCategoryClick(category);
  };

  const clearAllFilters = () => {
    syncUrlRequested.current = false;
    const clearedFilters: FilterState = {
      priceRange: [minPrice, maxPrice],
      categories: [],
      brands: [],
      difficulties: [],
      tags: [],
    };
    setListing(prev => sameFilters(prev.filters, clearedFilters) && prev.foodFilter === "all" && prev.sortBy === "default"
      ? prev
      : { ...prev, filters: clearedFilters, foodFilter: "all", sortBy: "default", displayCount: 24 });
    if (window.location.search) setLocation("/products");
  };

  const activeFilterChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];

    filters.categories.forEach(category => {
      chips.push({
        id: `category:${category}`,
        label: category,
        onRemove: () => applyFilters(prev => ({
          ...prev,
          categories: prev.categories.filter(item => item !== category),
        })),
      });
    });

    filters.brands.forEach(brand => {
      chips.push({
        id: `brand:${brand}`,
        label: brand,
        onRemove: () => applyFilters(prev => ({
          ...prev,
          brands: prev.brands.filter(item => item !== brand),
        })),
      });
    });

    filters.difficulties.forEach(difficulty => {
      chips.push({
        id: `difficulty:${difficulty}`,
        label: difficulty,
        onRemove: () => applyFilters(prev => ({
          ...prev,
          difficulties: prev.difficulties.filter(item => item !== difficulty),
        })),
      });
    });

    filters.tags.forEach(tag => {
      chips.push({
        id: `tag:${tag}`,
        label: tag === "in-stock" ? t("tags.inStock") : tag,
        onRemove: () => applyFilters(prev => ({
          ...prev,
          tags: prev.tags.filter(item => item !== tag),
        })),
      });
    });

    const isPriceFiltered = Math.abs(filters.priceRange[0] - minPrice) > 1 || Math.abs(filters.priceRange[1] - maxPrice) > 1;
    if (isPriceFiltered) {
      const numberFormat = new Intl.NumberFormat("en-US");
      chips.push({
        id: "price",
        label: `${numberFormat.format(filters.priceRange[0])}–${numberFormat.format(filters.priceRange[1])} ${currencyLabel(locale)}`,
        onRemove: () => applyFilters(prev => ({
          ...prev,
          priceRange: [minPrice, maxPrice],
        })),
      });
    }

    if (initialSearch) {
      chips.push({
        id: "search",
        label: t("chips.search", { query: initialSearch }),
        onRemove: () => setLocation("/products"),
      });
    }

    return chips;
  }, [filters, initialSearch, minPrice, maxPrice, setLocation, applyFilters, locale, t]);

  const breadcrumbItems = [
    { name: t("breadcrumb.home"), url: "https://www.aquavoiq.com" },
    { name: t("breadcrumb.shop"), url: "https://www.aquavoiq.com/products" },
  ];
  if (filters.categories.length === 1) {
    breadcrumbItems.push({
      name: localizeCategoryName(filters.categories[0], locale),
      url: `https://www.aquavoiq.com/products?category=${encodeURIComponent(filters.categories[0])}`,
    });
  }

  const itemListItems = useMemo(() => {
    return displayedProducts.map((p, idx) => ({
      name: p.name,
      url: `https://www.aquavoiq.com/products/${p.slug}`,
      image: p.images[0] ?? p.image ?? p.thumbnail,
      price: p.price,
      description: p.description?.slice(0, 150),
      position: idx + 1,
    }));
  }, [displayedProducts]);

  return (
    <div ref={containerRef} className="flex flex-1 flex-col bg-background font-sans transition-colors duration-300">
      <MetaTags
        title={listingSeo.category ? (categorySearch(listingSeo.category, locale)?.title ?? (locale === "ar" ? listingSeo.title : `${localizeCategoryName(listingSeo.category, locale)} | AQUAVO`)) : t("meta.title")}
        description={
          // Each category has its own description. All eleven previously
          // shared this one sentence, so eleven indexable listings competed
          // with an identical snippet.
          categorySearch(listingSeo.category, locale)?.description ??
          (locale === "ar" ? categoryContent(listingSeo.category)?.metaDescription : undefined) ??
          t("meta.description")
        }
        canonicalUrl={listingSeo.canonicalUrl}
      />
      <BreadcrumbSchema items={breadcrumbItems} />
      {itemListItems.length > 0 && (
        <ItemListSchema
          name={filters.categories.length === 1 ? t("meta.categoryListName", { category: localizeCategoryName(filters.categories[0], locale) }) : t("meta.listName")}
          items={itemListItems}
        />
      )}
      <main id="main-content" className="container mx-auto flex-1 px-3 pb-12 pt-6 sm:px-4 sm:pt-12" dir={dir}>
        <div className="mb-3 space-y-1 text-start sm:text-center sm:mb-6 sm:space-y-2">
          {/* A single category shows its own heading, the same words the
              crawler shell uses; the generic line stays for the full listing. */}
          <h1 className="text-2xl font-bold text-foreground sm:text-4xl">
            {(filters.categories.length === 1 && categorySearch(filters.categories[0], locale)?.heading) || t("header.title")}
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">{t("header.subtitle")}</p>
        </div>

        <section
          aria-label={t("service.label")}
          className="mb-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border text-xs sm:grid-cols-4 sm:text-sm"
        >
          <div className="flex min-h-11 items-center justify-center gap-2 bg-card px-3 py-2 text-center">
            <Banknote className="h-4 w-4 text-primary" aria-hidden="true" />
            {t("service.payment")}
          </div>
          <div className="flex min-h-11 items-center justify-center gap-2 bg-card px-3 py-2 text-center">
            <Truck className="h-4 w-4 text-primary" aria-hidden="true" />
            {t("service.delivery", { fee: shippingFeeLabel })}
          </div>
          <div className="hidden min-h-11 items-center justify-center gap-2 bg-card px-3 py-2 text-center sm:flex">
            <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
            {t("service.within24h")}
          </div>
          <div className="hidden min-h-11 items-center justify-center gap-2 bg-card px-3 py-2 text-center sm:flex">
            <Headphones className="h-4 w-4 text-primary" aria-hidden="true" />
            {t("service.support")}
          </div>
        </section>

        {isRecommendedView && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3" dir={dir}>
            <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-foreground">{t("recommended.title")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("recommended.subtitle")}</p>
            </div>
          </div>
        )}

        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border pb-2">
          <p className="text-sm leading-6 text-muted-foreground">{t("helper.text")}</p>
          <Link href="/journey" className="inline-flex min-h-11 shrink-0 items-center text-sm font-bold text-primary underline-offset-4 hover:underline">
            {t("helper.action")}
          </Link>
        </div>

        <div className="mb-3 overflow-hidden rounded-xl border border-border/70">
          <CategoryScrollBar
            categories={availableCategories}
            selectedCategories={filters.categories}
            onCategoryToggle={handleCategoryToggle}
            categoryCounts={categoryCounts}
          />
        </div>

        {isFoodListing && !isError && (
          <FoodCategoryGuide products={finalProducts} counts={data?.pages[0]?.foodCounts} value={foodFilter} onChange={changeFoodFilter} />
        )}

        <div className="aq-filter-chamber mb-4 flex flex-col gap-2 ps-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4" data-tour="products-filter">
          <FilterBar
            filters={filters}
            onFiltersChange={applyFilters}
            onOpenFilterModal={() => setIsFilterModalOpen(true)}
            activeFiltersCount={activeFiltersCount}
            maxPrice={maxPrice}
            minPrice={minPrice}
          />

          <div className="flex items-center justify-between gap-2 sm:justify-end sm:gap-3">
            <div className="flex items-center gap-1 sm:gap-2">
              <ArrowUpDown className="h-3 w-3 text-muted-foreground sm:h-4 sm:w-4" aria-hidden="true" />
              <Select value={sortBy} onValueChange={changeSort}>
                <SelectTrigger aria-label={t("sort.label")} className="h-11 w-[140px] text-xs sm:w-[170px] sm:text-sm">
                  <SelectValue placeholder={t("sort.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{t("sort.default")}</SelectItem>
                  {user && <SelectItem value="smart">{t("sort.smart")}</SelectItem>}
                  <SelectItem value="newest">{t("sort.newest")}</SelectItem>
                  <SelectItem value="price-asc">{t("sort.priceAsc")}</SelectItem>
                  <SelectItem value="price-desc">{t("sort.priceDesc")}</SelectItem>
                  <SelectItem value="name-asc">{t("sort.nameAsc")}</SelectItem>
                  <SelectItem value="rating-desc">{t("sort.ratingDesc")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {!isLoading && !isError && (
          <div className="mb-6 space-y-3">
            {activeFilterChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2" aria-label={t("chips.label")}>
                {activeFilterChips.map(chip => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={chip.onRemove}
                    aria-label={t("chips.remove", { label: chip.label })}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-primary/35 bg-primary/5 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <span>{chip.label}</span>
                    <X className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="min-h-10 px-2 text-xs font-semibold text-primary underline-offset-4 hover:underline"
                >
                  {t("chips.clearAll")}
                </button>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
              {finalProducts.length > 0 ? (
                <span aria-live="polite">
                  <Trans t={t} i18nKey="results.showing" values={{ shown: displayedProducts.length, total: totalProducts }} components={{ strong: <strong /> }} />
                </span>
              ) : <span aria-live="polite">{t("results.none")}</span>}
              {sortBy === "smart" && boostIds.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-primary">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  {t("sort.byInterests")}
                </span>
              )}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        )}

        {isError ? (
          <section className="rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-12 text-center" aria-live="polite">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="h-7 w-7" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-xl font-bold">{t("error.title")}</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              {t("error.description")}
            </p>
            <Button type="button" variant="outline" className="mt-6 min-h-11" onClick={() => { void refetchProducts(); void refetchAttributes(); }}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {t("error.retry")}
            </Button>
          </section>
        ) : !isLoading ? (
          <>
            {finalProducts.length > 0 ? (
              <>
                {sortBy === "default" && !initialSearch && (
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
                    <h2 className="flex items-center gap-2 text-xl font-bold text-foreground sm:text-2xl">
                      <Eye className="h-5 w-5 text-primary" aria-hidden="true" />
                      {t("mostViewed.title")}
                    </h2>
                    <p className="text-xs leading-6 text-muted-foreground sm:text-sm">
                      {t("mostViewed.description")}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5">
                  {displayedProducts.map((product, index) => (
                    <div key={product.id} data-tour={index === 0 ? "product-card-first" : undefined} className="h-full min-w-0">
                      <ProductCard
                        product={product}
                        priority={index < 4}
                        onQuickView={(p) => setQuickViewProduct(p)}
                      />
                    </div>
                  ))}
                </div>

                {hasMore && (
                  <div ref={sentinelRef} className="flex min-h-20 items-center justify-center py-5">
                    <Button type="button" variant="outline" onClick={loadMore}>
                      {t("results.loadMore")}
                    </Button>
                  </div>
                )}

                {!hasMore && finalProducts.length > 24 && (
                  <div className="mt-8 rounded-xl border border-border bg-card p-6 text-center">
                    <p className="text-base font-semibold text-foreground">
                      {t("results.endTitle")}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("results.endCount", { count: totalProducts })}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <section className="rounded-xl border border-border bg-card px-5 py-14 text-center" aria-live="polite">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                </div>
                <h2 className="mb-3 text-2xl font-bold">
                  {t("empty.title")}
                </h2>
                <p className="mx-auto mb-6 max-w-md text-muted-foreground">
                  {t("empty.description")}
                </p>
                <Button variant="outline" onClick={clearAllFilters}>
                  {t("empty.clear")}
                </Button>
              </section>
            )}
          </>
        ) : null}

        {/* The guides for the category being browsed, on the same condition the
            canonical and the breadcrumb use: exactly one category selected is
            the state that has a category URL to be a page about. */}
        {filters.categories.length === 1 && <CategoryIntro category={filters.categories[0]} />}
        {filters.categories.length === 1 && <GuideLinksSection category={filters.categories[0]} />}
      </main>

      <BackToTop />

      <Suspense fallback={null}>
        {quickViewProduct && (
          <QuickViewModal
            product={quickViewProduct}
            isOpen={!!quickViewProduct}
            onClose={() => setQuickViewProduct(null)}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {isFilterModalOpen && (
          <FilterModal
            isOpen={isFilterModalOpen}
            onClose={() => setIsFilterModalOpen(false)}
            filters={filters}
            onApplyFilters={applyFilters}
            availableBrands={availableBrands}
            maxPrice={maxPrice}
            minPrice={minPrice}
            getResultCount={getDraftResultCount}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        <ComparisonDrawer />
      </Suspense>
    </div>
  );
}
