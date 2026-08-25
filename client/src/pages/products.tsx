import { useMemo, useState, useEffect, useRef, lazy, Suspense } from "react";
import { phTrackCategoryClick } from "@/lib/posthog";
import { useInView } from "@/hooks/use-in-view";
import { useLocation } from "wouter";
import { AlertCircle, ArrowUpDown, Banknote, Clock, Headphones, RefreshCw, Sparkles, Truck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetaTags, ItemListSchema, BreadcrumbSchema } from "@/components/seo/meta-tags";
import { ProductCard } from "@/components/products/product-card";
import { CategoryScrollBar } from "@/components/products/category-scroll-bar";
import { FilterBar } from "@/components/products/filter-bar";
import type { FilterState } from "@/components/products/filter-modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts, fetchProductAttributes, fetchPersonalizedOrder } from "@/lib/api";
import { ProductCardSkeleton } from "@/components/ui/loading-skeleton";
import { BackToTop } from "@/components/back-to-top";
import { useAuth } from "@/contexts/auth-context";
import type { Product } from "@/types";
import { trackViewItemList } from "@/lib/analytics";

const FilterModal = lazy(() => import("@/components/products/filter-modal").then(m => ({ default: m.FilterModal })));
const QuickViewModal = lazy(() => import("@/components/products/quick-view-modal").then(m => ({ default: m.QuickViewModal })));
const ComparisonDrawer = lazy(() => import("@/components/products/product-comparison").then(m => ({ default: m.ComparisonDrawer })));

type SortOption = "default" | "smart" | "price-asc" | "price-desc" | "name-asc" | "rating-desc";

type ActiveFilterChip = {
  id: string;
  label: string;
  onRemove: () => void;
};

export default function Products() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const initialCategory = searchParams.get("category");
  const initialSearch = searchParams.get("search");
  const initialSort = searchParams.get("sort");
  const isRecommendedView = searchParams.get("recommended") === "1";

  const { data: attributes } = useQuery({
    queryKey: ["product-attributes"],
    queryFn: fetchProductAttributes,
    staleTime: 1000 * 60 * 10,
  });

  const availableCategories = attributes?.categories || [];
  const availableBrands = attributes?.brands || [];
  const minPrice = attributes?.minPrice || 0;
  const maxPrice = attributes?.maxPrice || 1000000;

  const [filters, setFilters] = useState<FilterState>({
    priceRange: [0, 1000000],
    categories: initialCategory ? [initialCategory] : [],
    brands: [],
    difficulties: [],
    tags: initialSort === "best-selling" ? ["الأكثر مبيعاً"] : [],
  });

  const [sortBy, setSortBy] = useState<SortOption>(
    initialSort === "best-selling" ? "rating-desc" : (isRecommendedView && user ? "smart" : user ? "smart" : "default")
  );
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(() => {
    try {
      const saved = sessionStorage.getItem("aq_products_display_count");
      if (saved) return Math.max(24, parseInt(saved, 10));
    } catch { /* ignore */ }
    return 24;
  });

  const scrollRestored = useRef(false);
  const lastLoadAtRef = useRef(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const category = params.get("category");
    const sort = params.get("sort");

    if (category) {
      setFilters(prev => ({
        ...prev,
        categories: [category],
      }));
    }

    if (sort === "best-selling") {
      setFilters(prev => ({
        ...prev,
        tags: prev.tags.includes("الأكثر مبيعاً") ? prev.tags : [...prev.tags, "الأكثر مبيعاً"],
      }));
      setSortBy("rating-desc");
    }
  }, [location]);

  useEffect(() => {
    if (attributes && filters.priceRange[1] === 1000000 && attributes.maxPrice !== 1000000) {
      setFilters(prev => ({
        ...prev,
        priceRange: [attributes.minPrice, attributes.maxPrice],
      }));
    }
  }, [attributes]);

  const { data: boostData } = useQuery({
    queryKey: ["personalized-order"],
    queryFn: fetchPersonalizedOrder,
    staleTime: 5 * 60 * 1000,
    enabled: !!user && sortBy === "smart",
  });

  const boostIds = boostData?.boostIds ?? [];

  const queryParams = useMemo(() => {
    const params: import("@/types").ProductQueryParams = {};

    if (filters.categories.length > 0) params.category = filters.categories;
    if (filters.brands.length > 0) params.brand = filters.brands;
    if (filters.priceRange[0] > minPrice) params.minPrice = filters.priceRange[0];
    if (filters.priceRange[1] < maxPrice) params.maxPrice = filters.priceRange[1];

    if (initialSearch) params.search = initialSearch;

    if (filters.tags.includes("جديد")) params.isNew = true;
    if (filters.tags.includes("الأكثر مبيعاً")) params.isBestSeller = true;

    if (sortBy === "price-asc") { params.sortBy = "price"; params.sortOrder = "asc"; }
    else if (sortBy === "price-desc") { params.sortBy = "price"; params.sortOrder = "desc"; }
    else if (sortBy === "name-asc") { params.sortBy = "name"; params.sortOrder = "asc"; }
    else if (sortBy === "rating-desc") { params.sortBy = "rating"; params.sortOrder = "desc"; }
    else { params.sortBy = "createdAt"; params.sortOrder = "desc"; }

    return params;
  }, [filters, sortBy, initialSearch, minPrice, maxPrice]);

  const { data, isLoading: isProductsLoading, isError, refetch: refetchProducts } = useQuery({
    queryKey: ["products", queryParams],
    queryFn: () => fetchProducts(queryParams),
    staleTime: 1000 * 60 * 5,
    retry: 1,
    retryDelay: 500,
  });

  const products = data?.products ?? [];

  const finalProducts = useMemo(() => {
    let filtered = products.filter(product => {
      if (filters.difficulties.length > 0 && product.difficulty && !filters.difficulties.includes(product.difficulty)) {
        return false;
      }
      if (filters.tags.includes("صديق للبيئة") && !product.ecoFriendly) {
        return false;
      }
      return true;
    });

    if (sortBy === "smart" && boostIds.length > 0) {
      const boostSet = new Set(boostIds);
      const boosted = filtered.filter(p => boostSet.has(p.id));
      const rest = filtered.filter(p => !boostSet.has(p.id));
      const orderMap = new Map(boostIds.map((id, i) => [id, i]));
      boosted.sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
      filtered = [...boosted, ...rest];
    }

    const hasPrice = (p: Product) => {
      if ((p.price ?? 0) > 0) return true;
      if (p.hasVariants && p.variants?.length) {
        return p.variants.some(v => (v.price ?? 0) > 0);
      }
      return false;
    };
    const withPrice = filtered.filter(p => hasPrice(p));
    const noPrice = filtered.filter(p => !hasPrice(p));
    filtered = [...withPrice, ...noPrice];

    return filtered;
  }, [products, filters.difficulties, filters.tags, sortBy, boostIds]);

  const displayedProducts = useMemo(() => {
    return finalProducts.slice(0, displayCount);
  }, [finalProducts, displayCount]);

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

  const hasMore = displayCount < finalProducts.length;

  useEffect(() => {
    if (finalProducts.length === 0) return;
    if (scrollRestored.current) return;
    scrollRestored.current = true;

    const savedScroll = sessionStorage.getItem("aq_products_scroll");
    if (!savedScroll) return;

    try { sessionStorage.removeItem("aq_products_scroll"); } catch { /* ignore */ }

    const targetY = parseInt(savedScroll, 10);
    if (!targetY || targetY < 10) return;

    const attempt = (retries: number) => {
      if (window.scrollY >= targetY - 50) return;
      window.scrollTo({ top: targetY, behavior: "instant" as ScrollBehavior });
      if (retries > 0 && window.scrollY < targetY - 50) {
        requestAnimationFrame(() => attempt(retries - 1));
      }
    };

    const t = setTimeout(() => attempt(15), 50);
    return () => clearTimeout(t);
  }, [finalProducts.length]);

  useEffect(() => {
    try {
      sessionStorage.setItem("aq_products_display_count", String(displayCount));
    } catch { /* ignore */ }
  }, [displayCount]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a[href]");
      if (!target) return;
      const href = (target as HTMLAnchorElement).href;
      if (!href.includes("/products/") && !href.includes("/product/")) {
        try {
          sessionStorage.removeItem("aq_products_scroll");
          sessionStorage.removeItem("aq_products_display_count");
        } catch { /* ignore */ }
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const loadMore = () => {
    const now = Date.now();
    if (now - lastLoadAtRef.current < 400) return;
    lastLoadAtRef.current = now;
    setDisplayCount(prev => Math.min(prev + 24, finalProducts.length));
  };

  const { ref: sentinelRef, inView: sentinelInView } = useInView({ threshold: 0.5, once: false });

  useEffect(() => {
    if (sentinelInView && hasMore) loadMore();
  }, [sentinelInView, hasMore]);

  const isLoading = isProductsLoading;

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach(product => {
      if (product.category) {
        counts.set(product.category, (counts.get(product.category) || 0) + 1);
      }
    });
    return counts;
  }, [products]);

  const brandCounts = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach(product => {
      if (product.brand) {
        counts.set(product.brand, (counts.get(product.brand) || 0) + 1);
      }
    });
    return counts;
  }, [products]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (Math.abs(filters.priceRange[0] - minPrice) > 1 || Math.abs(filters.priceRange[1] - maxPrice) > 1) count++;
    count += filters.brands.length;
    count += filters.difficulties.length;
    count += filters.tags.length;
    return count;
  }, [filters, minPrice, maxPrice]);

  const handleCategoryToggle = (category: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category],
    }));
    phTrackCategoryClick(category);
  };

  const clearAllFilters = () => {
    setFilters({
      priceRange: [minPrice, maxPrice],
      categories: [],
      brands: [],
      difficulties: [],
      tags: [],
    });
    setSortBy(user ? "smart" : "default");
    if (window.location.search) setLocation("/products");
  };

  const activeFilterChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];

    filters.categories.forEach(category => {
      chips.push({
        id: `category:${category}`,
        label: category,
        onRemove: () => setFilters(prev => ({
          ...prev,
          categories: prev.categories.filter(item => item !== category),
        })),
      });
    });

    filters.brands.forEach(brand => {
      chips.push({
        id: `brand:${brand}`,
        label: brand,
        onRemove: () => setFilters(prev => ({
          ...prev,
          brands: prev.brands.filter(item => item !== brand),
        })),
      });
    });

    filters.difficulties.forEach(difficulty => {
      chips.push({
        id: `difficulty:${difficulty}`,
        label: difficulty,
        onRemove: () => setFilters(prev => ({
          ...prev,
          difficulties: prev.difficulties.filter(item => item !== difficulty),
        })),
      });
    });

    filters.tags.forEach(tag => {
      chips.push({
        id: `tag:${tag}`,
        label: tag,
        onRemove: () => setFilters(prev => ({
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
        label: `${numberFormat.format(filters.priceRange[0])}–${numberFormat.format(filters.priceRange[1])} د.ع`,
        onRemove: () => setFilters(prev => ({
          ...prev,
          priceRange: [minPrice, maxPrice],
        })),
      });
    }

    if (initialSearch) {
      chips.push({
        id: "search",
        label: `بحث: ${initialSearch}`,
        onRemove: () => setLocation("/products"),
      });
    }

    return chips;
  }, [filters, initialSearch, minPrice, maxPrice, setLocation]);

  const breadcrumbItems = [
    { name: "الرئيسية", url: "https://www.aquavoiq.com" },
    { name: "المتجر", url: "https://www.aquavoiq.com/products" },
  ];
  if (filters.categories.length === 1) {
    breadcrumbItems.push({
      name: filters.categories[0],
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
    <div className="flex flex-1 flex-col bg-background font-sans transition-colors duration-300">
      <MetaTags
        title="متجر معدات الأحواض"
        description="اختار معدات حوضك حسب الفئة والسعر والاستخدام. فلاتر وسخانات وإضاءة ومستلزمات عناية، مع الدفع عند الاستلام أو إلكترونياً وتوصيل لكل العراق."
      />
      <BreadcrumbSchema items={breadcrumbItems} />
      {itemListItems.length > 0 && (
        <ItemListSchema
          name={filters.categories.length === 1 ? `معدات أحواض الزينة - ${filters.categories[0]}` : "جميع منتجات AQUAVO"}
          items={itemListItems}
        />
      )}
      <main id="main-content" className="container mx-auto flex-1 px-3 pb-12 pt-24 sm:px-4 sm:pt-28" dir="rtl">
        <div className="mb-5 space-y-1 text-center sm:mb-6 sm:space-y-2">
          <h1 className="text-2xl font-bold text-foreground sm:text-4xl">جهّز حوضك على أساس واضح</h1>
          <p className="text-sm text-muted-foreground sm:text-base">اختار القسم، رتّب النتائج، وشوف المعلومات المتوفرة قبل ما تقرر.</p>
        </div>

        <section
          aria-label="معلومات التوصيل والدفع"
          className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border text-xs sm:grid-cols-4 sm:text-sm"
        >
          <div className="flex min-h-11 items-center justify-center gap-2 bg-card px-3 py-2 text-center">
            <Banknote className="h-4 w-4 text-primary" aria-hidden="true" />
            الدفع عند الاستلام أو إلكترونياً
          </div>
          <div className="flex min-h-11 items-center justify-center gap-2 bg-card px-3 py-2 text-center">
            <Truck className="h-4 w-4 text-primary" aria-hidden="true" />
            التوصيل 5,000 د.ع
          </div>
          <div className="hidden min-h-11 items-center justify-center gap-2 bg-card px-3 py-2 text-center sm:flex">
            <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
            خلال 24 ساعة
          </div>
          <div className="hidden min-h-11 items-center justify-center gap-2 bg-card px-3 py-2 text-center sm:flex">
            <Headphones className="h-4 w-4 text-primary" aria-hidden="true" />
            دعم 24/7
          </div>
        </section>

        {isRecommendedView && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3" dir="rtl">
            <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-foreground">منتجات مناسبة إلك</p>
              <p className="mt-0.5 text-xs text-muted-foreground">اختيارات تساعدك تكمل تجهيز حوضك — متوفرة هسه وبسعر واضح.</p>
            </div>
          </div>
        )}

        <div className="mb-5 overflow-hidden rounded-xl border border-border/70">
          <CategoryScrollBar
            categories={availableCategories}
            selectedCategories={filters.categories}
            onCategoryToggle={handleCategoryToggle}
            categoryCounts={categoryCounts}
          />
        </div>

        <div className="aq-filter-chamber mb-4 flex flex-col gap-2 ps-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4" data-tour="products-filter">
          <FilterBar
            filters={filters}
            onFiltersChange={setFilters}
            onOpenFilterModal={() => setIsFilterModalOpen(true)}
            activeFiltersCount={activeFiltersCount}
            maxPrice={maxPrice}
            minPrice={minPrice}
          />

          <div className="flex items-center justify-between gap-2 sm:justify-end sm:gap-3">
            <div className="flex items-center gap-1 sm:gap-2">
              <ArrowUpDown className="h-3 w-3 text-muted-foreground sm:h-4 sm:w-4" aria-hidden="true" />
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger aria-label="ترتيب المنتجات" className="h-11 w-[140px] text-xs sm:w-[170px] sm:text-sm">
                  <SelectValue placeholder="ترتيب حسب" />
                </SelectTrigger>
                <SelectContent>
                  {user && <SelectItem value="smart">مخصص لك</SelectItem>}
                  <SelectItem value="default">الافتراضي</SelectItem>
                  <SelectItem value="price-asc">السعر: الأقل</SelectItem>
                  <SelectItem value="price-desc">السعر: الأعلى</SelectItem>
                  <SelectItem value="name-asc">الاسم: أ - ي</SelectItem>
                  <SelectItem value="rating-desc">الأعلى تقييماً</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {!isLoading && !isError && (
          <div className="mb-6 space-y-3">
            {activeFilterChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2" aria-label="الفلاتر المفعلة">
                {activeFilterChips.map(chip => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={chip.onRemove}
                    aria-label={`إزالة فلتر: ${chip.label}`}
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
                  مسح الكل
                </button>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
              {finalProducts.length > 0 ? (
                <span aria-live="polite">
                  عرض <strong>{displayedProducts.length}</strong> من <strong>{finalProducts.length}</strong> منتج
                </span>
              ) : <span aria-live="polite">ماكو نتائج بهذي الفلاتر</span>}
              {sortBy === "smart" && boostIds.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-primary">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  مرتب حسب اهتماماتك
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
            <h2 className="mt-5 text-xl font-bold">ما كدرنا نحمّل المنتجات</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              ممكن الاتصال انقطع مؤقتاً. جرّب مرة ثانية، وإذا استمرت المشكلة تواصل ويانه.
            </p>
            <Button type="button" variant="outline" className="mt-6 min-h-11" onClick={() => void refetchProducts()}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              حاول مرة ثانية
            </Button>
          </section>
        ) : !isLoading ? (
          <>
            {finalProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5">
                  {displayedProducts.map((product, index) => (
                    <div key={product.id} data-tour={index === 0 ? "product-card-first" : undefined} className="h-full min-w-0">
                      <ProductCard
                        product={product}
                        priority={index < 8}
                        onQuickView={(p) => setQuickViewProduct(p)}
                      />
                    </div>
                  ))}
                </div>

                {hasMore && (
                  <div ref={sentinelRef} className="flex min-h-20 items-center justify-center py-5">
                    <Button type="button" variant="outline" onClick={loadMore}>
                      شوف المزيد
                    </Button>
                  </div>
                )}

                {!hasMore && finalProducts.length > 24 && (
                  <div className="mt-8 rounded-xl border border-border bg-card p-6 text-center">
                    <p className="text-base font-semibold text-foreground">
                      هذا كلشي المتوفر هسه
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      عرضنا {finalProducts.length} منتج
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
                  ما لكينا منتجات بهذي الفلاتر
                </h2>
                <p className="mx-auto mb-6 max-w-md text-muted-foreground">
                  شيل فلتر أو اثنين وجرّب، أو امسحهن كلهن حتى تشوف المتوفر.
                </p>
                <Button variant="outline" onClick={clearAllFilters}>
                  مسح كل الفلاتر
                </Button>
              </section>
            )}
          </>
        ) : null}
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
            onApplyFilters={setFilters}
            availableBrands={availableBrands}
            maxPrice={maxPrice}
            minPrice={minPrice}
            brandCounts={brandCounts}
            resultCount={finalProducts.length}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        <ComparisonDrawer products={finalProducts} />
      </Suspense>
    </div>
  );
}
