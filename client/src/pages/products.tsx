import { useMemo, useState, useEffect } from "react";
import { useInView } from "@/hooks/use-in-view";
import { Reveal } from "@/components/ui/reveal";
import { useLocation } from "wouter";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { AlertCircle, ArrowUpDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetaTags, OrganizationSchema } from "@/components/seo/meta-tags";
import { ComparisonDrawer, useComparison } from "@/components/products/product-comparison";
import { ProductCard } from "@/components/products/product-card";
import { CategoryScrollBar } from "@/components/products/category-scroll-bar";
import { FilterBar } from "@/components/products/filter-bar";
import { FilterModal, FilterState } from "@/components/products/filter-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts, fetchProductAttributes, fetchPersonalizedOrder } from "@/lib/api";
import { ProductCardSkeleton } from "@/components/ui/loading-skeleton";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { BackToTop } from "@/components/back-to-top";
import { QuickViewModal } from "@/components/products/quick-view-modal";
import { useAuth } from "@/contexts/auth-context";
import type { Product } from "@/types";

type SortOption = "default" | "smart" | "price-asc" | "price-desc" | "name-asc" | "rating-desc";

export default function Products() {
  const [location] = useLocation();
  const { user } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const initialCategory = searchParams.get("category");
  const initialSearch = searchParams.get("search");
  const initialSort = searchParams.get("sort");

  // Fetch dynamic attributes (categories, brands, price range)
  const { data: attributes, isLoading: isAttributesLoading } = useQuery({
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
  const [displayCount, setDisplayCount] = useState(24);

  // Comparison - user-initiated
  const { compareIds, addToCompare, removeFromCompare } = useComparison();

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

  const loadMore = () => {
    setDisplayCount(prev => prev + 24);
  };

  const { ref: sentinelRef, inView: sentinelInView } = useInView({ threshold: 0.5, once: false });

  useEffect(() => {
    if (sentinelInView && hasMore) loadMore();
  }, [sentinelInView, hasMore]);

  const isLoading = isAttributesLoading || isProductsLoading;

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
        title="معدات أحواض أصلية لكل العراق"
        description="منتجات أصلية لتجهيز حوضك بثقة — توصيل خلال 24 ساعة لكل العراق."
      />
      <OrganizationSchema />
      <Navbar />

      <main id="main-content" className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-8" dir="rtl">
        {/* Header */}
        <div className="text-center space-y-2 sm:space-y-3 mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground">معدات أحواض أصلية لكل العراق</h1>
          <p className="text-sm sm:text-lg text-muted-foreground">منتجات أصلية لتجهيز حوضك بثقة — توصيل خلال 24 ساعة لكل العراق.</p>
          <div className="flex flex-wrap justify-center gap-4 text-xs sm:text-sm text-muted-foreground mt-2">
            <span>أصلي 100%</span>
            <span>·</span>
            <span>توصيل 24 ساعة</span>
            <span>·</span>
            <span>دعم 24/7</span>
          </div>
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
                    <Reveal key={product.id} delay={Math.min(index % 8 * 60, 400)}>
                      <div data-tour={index === 0 ? "product-card-first" : undefined} className="h-full">
                        <ProductCard
                          product={product}
                          priority={index < 8}
                          onQuickView={(p) => setQuickViewProduct(p)}
                          onCompare={(p) => addToCompare(p.id)}
                        />
                      </div>
                    </Reveal>
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
              <div className="text-center py-12 px-4">
                {/* Animated aquarium scene */}
                <div className="relative w-40 h-40 mx-auto mb-6">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: "radial-gradient(ellipse at 40% 35%, rgba(25,155,184,0.18) 0%, rgba(25,155,184,0.06) 60%, transparent 100%)",
                      border: "1px solid rgba(25,155,184,0.15)",
                    }}
                  />
                  {/* Fish SVG — pure CSS swim */}
                  <svg
                    viewBox="0 0 80 50"
                    className="absolute inset-0 m-auto w-24 h-16"
                    style={{ animation: "aq-swim 3s ease-in-out infinite" }}
                  >
                    <style>{`
                      @keyframes aq-swim {
                        0%,100% { transform: translateX(0) translateY(0) rotate(-3deg); }
                        25%      { transform: translateX(4px) translateY(-3px) rotate(2deg); }
                        75%      { transform: translateX(-4px) translateY(3px) rotate(-2deg); }
                      }
                      @keyframes aq-bubble {
                        0%   { opacity:0; transform: translateY(0) scale(.6); }
                        40%  { opacity:.7; }
                        100% { opacity:0; transform: translateY(-22px) scale(1); }
                      }
                    `}</style>
                    {/* Body */}
                    <ellipse cx="36" cy="25" rx="22" ry="13" fill="rgba(25,155,184,0.55)" />
                    {/* Tail */}
                    <polygon points="14,25 4,14 4,36" fill="rgba(25,155,184,0.4)" />
                    {/* Fin */}
                    <ellipse cx="36" cy="14" rx="10" ry="5" fill="rgba(25,155,184,0.3)" />
                    {/* Eye */}
                    <circle cx="52" cy="21" r="4" fill="white" />
                    <circle cx="53" cy="21" r="2" fill="#0a1628" />
                    {/* Bubble */}
                    <circle cx="62" cy="14" r="2.5" fill="none" stroke="rgba(25,155,184,0.5)" strokeWidth="1"
                      style={{ animation: "aq-bubble 2s ease-out infinite" }} />
                    <circle cx="66" cy="9" r="1.8" fill="none" stroke="rgba(25,155,184,0.4)" strokeWidth="1"
                      style={{ animation: "aq-bubble 2s ease-out infinite", animationDelay: "0.4s" }} />
                  </svg>
                  {/* Seaweed dots */}
                  <div className="absolute bottom-4 left-8 w-1 h-8 rounded-full opacity-30"
                    style={{ background: "linear-gradient(to top, #199bb8, transparent)" }} />
                  <div className="absolute bottom-4 right-10 w-1 h-5 rounded-full opacity-20"
                    style={{ background: "linear-gradient(to top, #199bb8, transparent)" }} />
                </div>

                <h3 className="text-xl font-bold text-foreground mb-2">
                  ما لقينا منتجات بهذه الفلاتر
                </h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto leading-relaxed">
                  جرب تغيير الفلاتر أو تصفح كل المنتجات
                </p>

                {/* Quick category shortcuts */}
                {availableCategories.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    {availableCategories.slice(0, 4).map(cat => (
                      <button
                        key={cat}
                        onClick={() => {
                          setFilters({
                            priceRange: [minPrice, maxPrice],
                            categories: [cat],
                            brands: [],
                            difficulties: [],
                            tags: [],
                          });
                        }}
                        className="px-3 py-1.5 rounded-full text-xs border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                <Button
                  variant="outline"
                  className="border-primary/40 text-primary hover:bg-primary/10"
                  onClick={() => setFilters({
                    priceRange: [minPrice, maxPrice],
                    categories: [],
                    brands: [],
                    difficulties: [],
                    tags: [],
                  })}
                >
                  عرض كل المنتجات
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


      <BackToTop />

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />

      {/* Filter Modal - Airbnb Style */}
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

      <ComparisonDrawer products={finalProducts} />

      <Footer />
    </div>
  );
}
