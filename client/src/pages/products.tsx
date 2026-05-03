import { lazy, Suspense, useMemo, useState, useEffect } from "react";
import { useLocation } from "wouter";
import Navbar from "@/components/navbar";
import { AlertCircle, ArrowUpDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetaTags, OrganizationSchema } from "@/components/seo/meta-tags";
import { useComparison } from "@/contexts/comparison-context";
import { ProductCard } from "@/components/products/product-card";
import { CategoryScrollBar } from "@/components/products/category-scroll-bar";
import { FilterBar } from "@/components/products/filter-bar";
import type { FilterState } from "@/components/products/filter-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts, fetchProductAttributes, fetchPersonalizedOrder } from "@/lib/api";
import { ProductCardSkeleton } from "@/components/ui/loading-skeleton";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { useAuth } from "@/contexts/auth-context";
import type { Product } from "@/types";

type SortOption = "default" | "smart" | "price-asc" | "price-desc" | "name-asc" | "rating-desc";

const Footer = lazy(() => import("@/components/footer"));
const BackToTop = lazy(() => import("@/components/back-to-top").then((mod) => ({ default: mod.BackToTop })));
const FilterModal = lazy(() => import("@/components/products/filter-modal").then((mod) => ({ default: mod.FilterModal })));
const QuickViewModal = lazy(() => import("@/components/products/quick-view-modal").then((mod) => ({ default: mod.QuickViewModal })));
const ComparisonDrawer = lazy(() => import("@/components/products/product-comparison").then((mod) => ({ default: mod.ComparisonDrawer })));

function useIdleMounted(timeout: number) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const mount = () => setMounted(true);
    let idleId: number | undefined;
    const timer = window.setTimeout(() => {
      idleId = (window as any).requestIdleCallback?.(mount, { timeout: 2000 });
      if (!idleId) mount();
    }, timeout);

    return () => {
      window.clearTimeout(timer);
      if (idleId) (window as any).cancelIdleCallback(idleId);
    };
  }, [timeout]);

  return mounted;
}

export default function Products() {
  const [location] = useLocation();
  const { user } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const initialCategory = searchParams.get("category");
  const initialSearch = searchParams.get("search");
  const initialSort = searchParams.get("sort");

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
    initialSort === 'best-selling' ? "rating-desc" : (user ? "smart" : "default")
  );
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(8);

  // Comparison - user-initiated
  const { compareIds } = useComparison();

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
    params.limit = displayCount + 1;

    return params;
  }, [filters, sortBy, initialSearch, minPrice, maxPrice, displayCount]);

  // Fetch products with backend filtering
  const { data, isLoading: isProductsLoading, isError } = useQuery({
    queryKey: ["products", queryParams],
    queryFn: () => fetchProducts(queryParams),
    staleTime: 1000 * 60 * 5, // 5 minutes
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

    return filtered;
  }, [products, filters.difficulties, filters.tags, sortBy, boostIds]);

  // Load More functionality
  const displayedProducts = useMemo(() => {
    return finalProducts.slice(0, displayCount);
  }, [finalProducts, displayCount]);

  const hasMore = displayCount < finalProducts.length;

  const loadMore = () => {
    setDisplayCount(prev => prev + 24);
  };

  const isLoading = isProductsLoading;
  const shouldRenderFooter = useIdleMounted(9000);
  const shouldRenderBackToTop = useIdleMounted(6000);

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

  // Toggle category
  const handleCategoryToggle = (category: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans transition-colors duration-300">
      <MetaTags
        title="المنتجات"
        description="تسوق أحدث منتجات أحواض الأسماك، الأحياء المائية، والمعدات في العراق."
      />
      <OrganizationSchema />
      <Navbar />

      <main id="main-content" className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="text-center space-y-2 sm:space-y-3 mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground">جميع المنتجات</h1>
          <p className="text-sm sm:text-lg text-muted-foreground">تصفح مجموعتنا الكاملة من المنتجات عالية الجودة</p>
        </div>

        {/* Airbnb-style Category Scroll Bar */}
        <div className="border-b border-border mb-4">
          <CategoryScrollBar
            categories={availableCategories}
            selectedCategories={filters.categories}
            onCategoryToggle={handleCategoryToggle}
            categoryCounts={categoryCounts}
          />
        </div>

        {/* Filter Bar with Quick Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4 sm:mb-6" data-tour="products-filter">
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
            <Tabs defaultValue="grid" className="hidden sm:block">
              <TabsList className="h-9">
                <TabsTrigger value="grid" className="text-xs">الشبكة</TabsTrigger>
                <TabsTrigger value="compare" className="text-xs">المقارنة</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-1 sm:gap-2">
              <ArrowUpDown className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-[120px] sm:w-[160px] h-8 sm:h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="ترتيب حسب" />
                </SelectTrigger>
                <SelectContent>
                  {user && <SelectItem value="smart">✨ مخصص لك</SelectItem>}
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
        {!isLoading && (
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

        {!isLoading && (
          <>
            {finalProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {displayedProducts.map((product, index) => (
                    <div key={product.id} data-tour={index === 0 ? "product-card-first" : undefined} className="h-full">
                      <ProductCard
                        product={product}
                        priority={index < 2}
                        onQuickView={(p) => setQuickViewProduct(p)}
                      />
                    </div>
                  ))}
                </div>

                {/* Load More Button */}
                {hasMore && (
                  <div className="flex justify-center mt-12">
                    <Button
                      onClick={loadMore}
                      size="lg"
                      className="min-w-[250px] bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    >
                      تحميل المزيد من المنتجات
                      <span className="mr-2">
                        ({finalProducts.length - displayCount} متبقي)
                      </span>
                    </Button>
                  </div>
                )}

                {/* End Message */}
                {!hasMore && finalProducts.length > 24 && (
                  <div className="text-center mt-8 p-6 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/20">
                    <p className="text-lg font-semibold text-primary">
                      ✨ شاهدت جميع المنتجات المتاحة
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
        )}

        {isError && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>خطأ في تحميل المنتجات</AlertTitle>
            <AlertDescription>
              تعذر تحميل المنتجات. يرجى المحاولة مرة أخرى لاحقاً.
            </AlertDescription>
          </Alert>
        )}
      </main>


      {shouldRenderBackToTop && (
        <Suspense fallback={null}>
          <BackToTop />
        </Suspense>
      )}

      {/* Quick View Modal */}
      {quickViewProduct && (
        <Suspense fallback={null}>
          <QuickViewModal
            product={quickViewProduct}
            isOpen={!!quickViewProduct}
            onClose={() => setQuickViewProduct(null)}
          />
        </Suspense>
      )}

      {/* Filter Modal - Airbnb Style */}
      {isFilterModalOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {compareIds.length > 0 && (
        <Suspense fallback={null}>
          <ComparisonDrawer products={finalProducts} />
        </Suspense>
      )}

      {shouldRenderFooter && (
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      )}
    </div>
  );
}
