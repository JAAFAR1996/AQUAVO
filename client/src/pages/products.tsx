import { useMemo, useState, useEffect, useRef, lazy, Suspense } from "react";
import { phTrackCategoryClick } from "@/lib/posthog";
import { useInView } from "@/hooks/use-in-view";
import { useLocation } from "wouter";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { AlertCircle, ArrowUpDown, RefreshCw, Sparkles } from "lucide-react";
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

const FilterModal = lazy(() => import("@/components/products/filter-modal").then(m => ({ default: m.FilterModal })));
const QuickViewModal = lazy(() => import("@/components/products/quick-view-modal").then(m => ({ default: m.QuickViewModal })));
const ComparisonDrawer = lazy(() => import("@/components/products/product-comparison").then(m => ({ default: m.ComparisonDrawer })));

type SortOption = "default" | "smart" | "price-asc" | "price-desc" | "name-asc" | "rating-desc";

export default function Products() {
  const [location] = useLocation();
  const { user } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const initialCategory = searchParams.get("category");
  const initialSearch = searchParams.get("search");
  const initialSort = searchParams.get("sort");
  const isRecommendedView = searchParams.get("recommended") === "1";

  // Fetch dynamic attributes (categories, brands, price range)
  const { data: attributes } = useQuery({
    queryKey: ["product-attributes"],
    queryFn: fetchProductAttributes,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  const availableCategories = attributes?.categories || [];
  const availableBrands = attributes?.brands || [];
  const minPrice = attributes?.minPrice || 0;
  const maxPrice = attributes?.maxPrice || 1000000;

  // Local filter state
  const [filters, setFilters] = useState<FilterState>({
    priceRange: [0, 1000000], // Temporary default, updated via useEffect
    categories: initialCategory ? [initialCategory] : [],
    brands: [],
    difficulties: [],
    tags: initialSort === 'best-selling' ? ["الأكثر مبيعاً"] : [],
  });

  const [sortBy, setSortBy] = useState<SortOption>(
    initialSort === 'best-selling' ? "rating-desc" : (isRecommendedView && user ? "smart" : user ? "smart" : "default")
  );
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(() => {
    // Restore displayCount if coming back from a product detail page
    try {
      const saved = sessionStorage.getItem('aq_products_display_count');
      if (saved) return Math.max(24, parseInt(saved, 10));
    } catch { /* ignore */ }
    return 24;
  });

  // Ref to track whether we've already done the initial scroll restoration
  const scrollRestored = useRef(false);

  // Update filters when URL params change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const category = params.get("category");
    const sort = params.get("sort");

    if (category) {
      setFilters(prev => ({
        ...prev,
        categories: [category]
      }));
    }

    if (sort === 'best-selling') {
      setFilters(prev => ({
        ...prev,
        tags: prev.tags.includes("الأكثر مبيعاً") ? prev.tags : [...prev.tags, "الأكثر مبيعاً"]
      }));
      setSortBy("rating-desc");
    }
  }, [location]);

  // Initialize price range from attributes once loaded
  useEffect(() => {
    if (attributes && filters.priceRange[1] === 1000000 && attributes.maxPrice !== 1000000) {
      setFilters(prev => ({
        ...prev,
        priceRange: [attributes.minPrice, attributes.maxPrice]
      }));
    }
  }, [attributes]);


  // Fetch AI personalized boost order (for logged-in users with smart sort)
  const { data: boostData } = useQuery({
    queryKey: ["personalized-order"],
    queryFn: fetchPersonalizedOrder,
    staleTime: 5 * 60 * 1000,
    enabled: !!user && sortBy === "smart",
  });

  const boostIds = boostData?.boostIds ?? [];

  // Prepare query params for backend
  const queryParams = useMemo(() => {
    const params: import("@/types").ProductQueryParams = {};

    // Filters
    if (filters.categories.length > 0) params.category = filters.categories;
    if (filters.brands.length > 0) params.brand = filters.brands;
    if (filters.priceRange[0] > minPrice) params.minPrice = filters.priceRange[0];
    if (filters.priceRange[1] < maxPrice) params.maxPrice = filters.priceRange[1];

    // Search
    if (initialSearch) params.search = initialSearch;

    if (filters.tags.includes("جديد")) params.isNew = true;
    if (filters.tags.includes("الأكثر مبيعاً")) params.isBestSeller = true;

    // Sorting
    if (sortBy === "price-asc") { params.sortBy = "price"; params.sortOrder = "asc"; }
    else if (sortBy === "price-desc") { params.sortBy = "price"; params.sortOrder = "desc"; }
    else if (sortBy === "name-asc") { params.sortBy = "name"; params.sortOrder = "asc"; }
    else if (sortBy === "rating-desc") { params.sortBy = "rating"; params.sortOrder = "desc"; }
    else { params.sortBy = "createdAt"; params.sortOrder = "desc"; } // default & smart (smart reorders client-side)

    return params;
  }, [filters, sortBy, initialSearch, minPrice, maxPrice]);

  // Fetch products with backend filtering
  const { data, isLoading: isProductsLoading, isError, refetch: refetchProducts } = useQuery({
    queryKey: ["products", queryParams],
    queryFn: () => fetchProducts(queryParams),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
    retryDelay: 500,
  });

  const products = data?.products ?? [];

  // Client-side filtering for unsupported backend filters (Difficulty, specific tags)
  const finalProducts = useMemo(() => {
    let filtered = products.filter(product => {
      // Difficulty
      if (filters.difficulties.length > 0 && product.difficulty && !filters.difficulties.includes(product.difficulty)) {
        return false;
      }
      // Eco Friendly Tag
      if (filters.tags.includes("صديق للبيئة") && !product.ecoFriendly) {
        return false;
      }
      return true;
    });

    // Smart sort: boost AI-recommended products to the top
    if (sortBy === "smart" && boostIds.length > 0) {
      const boostSet = new Set(boostIds);
      const boosted = filtered.filter(p => boostSet.has(p.id));
      const rest = filtered.filter(p => !boostSet.has(p.id));
      // O(1) lookup map instead of O(n) indexOf inside sort
      const orderMap = new Map(boostIds.map((id, i) => [id, i]));
      boosted.sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
      filtered = [...boosted, ...rest];
    }

    // Always push products without a price ("قريباً") to the bottom
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

  // Load More functionality
  const displayedProducts = useMemo(() => {
    return finalProducts.slice(0, displayCount);
  }, [finalProducts, displayCount]);

  const hasMore = displayCount < finalProducts.length;

  // Restore scroll position when coming back from product detail page
  useEffect(() => {
    // Only attempt to restore if we actually have products rendered
    if (finalProducts.length === 0) return;
    if (scrollRestored.current) return;
    scrollRestored.current = true;

    const savedScroll = sessionStorage.getItem('aq_products_scroll');
    if (!savedScroll) return;

    // Clear stored scroll so it doesn't trigger on fresh visits
    try { sessionStorage.removeItem('aq_products_scroll'); } catch { /* ignore */ }

    const targetY = parseInt(savedScroll, 10);
    if (!targetY || targetY < 10) return;

    // Wait a tiny bit for the DOM layout to settle, then scroll
    const attempt = (retries: number) => {
      if (window.scrollY >= targetY - 50) return; // already there
      window.scrollTo({ top: targetY, behavior: 'instant' as ScrollBehavior });
      if (retries > 0 && window.scrollY < targetY - 50) {
        requestAnimationFrame(() => attempt(retries - 1));
      }
    };

    const t = setTimeout(() => attempt(15), 50);
    return () => clearTimeout(t);
  }, [finalProducts.length]); // run when products are loaded

  // Save displayCount whenever it changes (for scroll restoration)
  useEffect(() => {
    try {
      sessionStorage.setItem('aq_products_display_count', String(displayCount));
    } catch { /* ignore */ }
  }, [displayCount]);

  // Clear saved state when user navigates away via fresh link (not back button)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a[href]');
      if (!target) return;
      const href = (target as HTMLAnchorElement).href;
      // If they're clicking a product card link, keep the scroll state
      // If they're clicking something else (category, home, etc.), clear it
      if (!href.includes('/products/') && !href.includes('/product/')) {
        try {
          sessionStorage.removeItem('aq_products_scroll');
          sessionStorage.removeItem('aq_products_display_count');
        } catch { /* ignore */ }
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);


  const loadMore = () => {
    setDisplayCount(prev => prev + 24);
  };

  const { ref: sentinelRef, inView: sentinelInView } = useInView({ threshold: 0.5, once: false });

  useEffect(() => {
    if (sentinelInView && hasMore) loadMore();
  }, [sentinelInView, hasMore]);

  const isLoading = isProductsLoading;

  // Calculate category counts from ALL products (not filtered)
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach(product => {
      if (product.category) {
        counts.set(product.category, (counts.get(product.category) || 0) + 1);
      }
    });
    return counts;
  }, [products]);

  // Calculate brand counts from ALL products (not filtered)
  const brandCounts = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach(product => {
      if (product.brand) {
        counts.set(product.brand, (counts.get(product.brand) || 0) + 1);
      }
    });
    return counts;
  }, [products]);

  // Active filters count (excluding categories which are shown in scroll bar)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (Math.abs(filters.priceRange[0] - minPrice) > 1 || Math.abs(filters.priceRange[1] - maxPrice) > 1) count++;
    count += filters.brands.length;
    count += filters.difficulties.length;
    count += filters.tags.length;
    return count;
  }, [filters, minPrice, maxPrice]);

  // Toggle individual raw category — the CategoryScrollBar handles single-select
  // at the group level by clearing existing selections before adding the new group.
  const handleCategoryToggle = (category: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category],
    }));
    phTrackCategoryClick(category);
  };

  const breadcrumbItems = [
    { name: "الرئيسية", url: "https://www.aquavoiq.com" },
    { name: "المتجر", url: "https://www.aquavoiq.com/products" },
  ];
  if (filters.categories.length === 1) {
    breadcrumbItems.push({
      name: filters.categories[0],
      url: `https://www.aquavoiq.com/products?category=${encodeURIComponent(filters.categories[0])}`
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
    <div className="min-h-screen flex flex-col bg-background font-sans transition-colors duration-300">
      <MetaTags
        title="متجر معدات الأحواض"
        description="اختار معدات حوضك حسب الفئة والسعر والاستخدام. فلاتر وسخانات وإضاءة ومستلزمات عناية، مع الدفع عند الاستلام وتوصيل لكل العراق."
      />
      <BreadcrumbSchema items={breadcrumbItems} />
      {itemListItems.length > 0 && (
        <ItemListSchema 
          name={filters.categories.length === 1 ? `معدات أحواض الزينة - ${filters.categories[0]}` : "جميع منتجات AQUAVO"}
          items={itemListItems} 
        />
      )}
      <Navbar />

      <main id="main-content" className="container mx-auto flex-1 px-3 pb-12 pt-24 sm:px-4 sm:pt-28" dir="rtl">
        {/* Header */}
        <div className="text-center space-y-1 sm:space-y-2 mb-5 sm:mb-6">
          <h1 className="text-2xl font-bold text-foreground sm:text-4xl">جهّز حوضك على أساس واضح</h1>
          <p className="text-sm text-muted-foreground sm:text-base">اختار القسم، رتّب النتائج، وشوف المعلومات المتوفرة قبل ما تقرر.</p>
        </div>

        {/* Recommended banner — shown when arriving from a notification */}
        {isRecommendedView && (
          <div className="mb-5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex items-start gap-3" dir="rtl">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">منتجات مناسبة إلك</p>
              <p className="text-xs text-muted-foreground mt-0.5">اختيارات تساعدك تكمل تجهيز حوضك — متوفرة هسه وبسعر واضح.</p>
            </div>
          </div>
        )}

        {/* Category Selector — primary navigation */}
        <div className="mb-5 rounded-xl border border-border/50 overflow-hidden shadow-sm">
          <CategoryScrollBar
            categories={availableCategories}
            selectedCategories={filters.categories}
            onCategoryToggle={handleCategoryToggle}
            categoryCounts={categoryCounts}
          />
        </div>

        {/* Filter Bar with Quick Filters */}
        <div className="aq-filter-chamber flex flex-col gap-2 ps-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 mb-4 sm:mb-6" data-tour="products-filter">
          <FilterBar
            filters={filters}
            onFiltersChange={setFilters}
            onOpenFilterModal={() => setIsFilterModalOpen(true)}
            activeFiltersCount={activeFiltersCount}
            maxPrice={maxPrice}
            minPrice={minPrice}
          />

          {/* Sort & View Toggle */}
          <div className="flex items-center gap-2 sm:gap-3 justify-between sm:justify-end">
            <div className="flex items-center gap-1 sm:gap-2">
              <ArrowUpDown className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger aria-label="ترتيب المنتجات" className="h-10 w-[140px] text-xs sm:w-[170px] sm:text-sm">
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

        {/* Results Count */}
        {!isLoading && !isError && (
          <div className="mb-6 text-sm text-muted-foreground flex items-center gap-2 justify-between">
            {finalProducts.length > 0 ? (
              <span>عرض <strong>{displayedProducts.length}</strong> من <strong>{finalProducts.length}</strong> منتج</span>
            ) : <span />}
            {sortBy === "smart" && boostIds.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-primary">
                <Sparkles className="w-3 h-3" />
                مرتب حسب اهتماماتك
              </span>
            )}
          </div>
        )}

        {/* Products Grid - Full Width (No Sidebar) */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
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
                  <div ref={sentinelRef} className="h-16 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                )}

                {/* End Message */}
                {!hasMore && finalProducts.length > 24 && (
                  <div className="text-center mt-8 p-6 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/20">
                    <p className="text-lg font-semibold text-primary">
                      شاهدت جميع المنتجات المتاحة
                    </p>
                    <p className="text-muted-foreground mt-2">
                      تم عرض {finalProducts.length} منتج
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16 bg-muted/30 rounded-xl">
                <div className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center mb-6">
                  <AlertCircle className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-bold mb-3">
                  لم يتم العثور على منتجات
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  جرب تغيير أو إزالة بعض الفلاتر للحصول على نتائج أكثر
                </p>
                <Button
                  variant="outline"
                  onClick={() => setFilters({
                    priceRange: [minPrice, maxPrice],
                    categories: [],
                    brands: [],
                    difficulties: [],
                    tags: [],
                  })}
                >
                  مسح جميع الفلاتر
                </Button>
              </div>
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

      <Footer />
    </div>
  );
}
