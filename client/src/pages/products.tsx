import { useMemo, useState, useEffect } from "react";
import { useLocation } from "wouter";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { AlertCircle, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetaTags, OrganizationSchema } from "@/components/seo/meta-tags";
import { ProductComparisonTable as ProductComparison, ComparisonDrawer, useComparison } from "@/components/products/product-comparison";
import { ProductCard } from "@/components/products/product-card";
import { ProductFilters, FilterState } from "@/components/products/product-filters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts, fetchProductAttributes } from "@/lib/api";
import { ProductCardSkeleton } from "@/components/ui/loading-skeleton";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WhatsAppWidget } from "@/components/whatsapp-widget";
import { BackToTop } from "@/components/back-to-top";
import { QuickViewModal } from "@/components/products/quick-view-modal";
import { CategoryCardsGrid } from "@/components/products/category-cards";
import type { Product } from "@/types";

type SortOption = "default" | "price-asc" | "price-desc" | "name-asc" | "rating-desc";

export default function Products() {
  const [location] = useLocation();
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
    initialSort === 'best-selling' ? "rating-desc" : "default"
  );
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

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

    // Difficulty (Note: Backend might need update if difficulty filter logic strictly requires 'difficulty' param, assumption: it maps to something or we keep client side for some?)
    // Checking product-storage: it does NOT currently have 'difficulty' filter in the WHERE clause I saw earlier.
    // It has: category, subcategory, brand, isNew, isBestSeller, minPrice, maxPrice, search.
    // Difficulty is NOT filtered on backend!
    // And Tags (isNew, isBestSeller) ARE supported.

    if (filters.tags.includes("جديد")) params.isNew = true;
    if (filters.tags.includes("الأكثر مبيعاً")) params.isBestSeller = true;
    // "صديق للبيئة" mapping? Schema has `ecoFriendly`?
    // Let's assume tags need partial client side filtering OR updated backend.

    // Sorting
    if (sortBy === "price-asc") { params.sortBy = "price"; params.sortOrder = "asc"; }
    else if (sortBy === "price-desc") { params.sortBy = "price"; params.sortOrder = "desc"; }
    else if (sortBy === "name-asc") { params.sortBy = "name"; params.sortOrder = "asc"; }
    else if (sortBy === "rating-desc") { params.sortBy = "rating"; params.sortOrder = "desc"; }
    else { params.sortBy = "createdAt"; params.sortOrder = "desc"; } // default

    return params;
  }, [filters, sortBy, initialSearch, minPrice, maxPrice]);

  // Fetch products with backend filtering
  const { data, isLoading: isProductsLoading, isError } = useQuery({
    queryKey: ["products", queryParams],
    queryFn: () => fetchProducts(queryParams),
    staleTime: 1000 * 60, // 1 minute
  });

  const products = data?.products ?? [];

  // Client-side filtering for unsupported backend filters (Difficulty, specific tags)
  // Ideally we should add these to backend, but for now we filter the returned page.
  // Note: This works correctly only if pagination is not used (fetch all). 
  // Current fetchProducts fetches ALL by default (no limit).
  const finalProducts = useMemo(() => {
    return products.filter(product => {
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
  }, [products, filters.difficulties, filters.tags]);

  // Get only products that user added to comparison
  const comparedProducts = useMemo(() => {
    return finalProducts.filter(p => compareIds.includes(p.id));
  }, [finalProducts, compareIds]);

  const isLoading = isAttributesLoading || isProductsLoading;

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (Math.abs(filters.priceRange[0] - minPrice) > 1 || Math.abs(filters.priceRange[1] - maxPrice) > 1) count++;
    count += filters.categories.length;
    count += filters.brands.length;
    count += filters.difficulties.length;
    count += filters.tags.length;
    return count;
  }, [filters, minPrice, maxPrice]);

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans transition-colors duration-300">
      <MetaTags
        title="المنتجات"
        description="تسوق أحدث منتجات أحواض الأسماك، الأحياء المائية، والمعدات في العراق."
      />
      <OrganizationSchema />
      <Navbar />
      <main id="main-content" className="flex-1 container mx-auto px-4 py-12">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl font-bold text-foreground">جميع المنتجات</h1>
          <p className="text-xl text-muted-foreground">تصفح مجموعتنا الكاملة من المنتجات عالية الجودة</p>
        </div>

        {/* Category Cards Grid */}
        <CategoryCardsGrid
          categories={availableCategories}
          selectedCategories={filters.categories}
          onCategoryToggle={(category) => {
            setFilters(prev => ({
              ...prev,
              categories: prev.categories.includes(category)
                ? prev.categories.filter(c => c !== category)
                : [...prev.categories, category]
            }));
          }}
        />

        <Tabs defaultValue="grid" className="mb-12">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <TabsList>
              <TabsTrigger value="grid">عرض الشبكة</TabsTrigger>
              <TabsTrigger value="compare">مقارنة المنتجات</TabsTrigger>
            </TabsList>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="ترتيب حسب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">الافتراضي</SelectItem>
                  <SelectItem value="price-asc">السعر: من الأقل للأعلى</SelectItem>
                  <SelectItem value="price-desc">السعر: من الأعلى للأقل</SelectItem>
                  <SelectItem value="name-asc">الاسم: أ - ي</SelectItem>
                  <SelectItem value="rating-desc">الأعلى تقييماً</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="grid">
            <div className="flex gap-6">
              {/* Filters Sidebar */}
              <aside className="w-64 flex-shrink-0">
                <ProductFilters
                  filters={filters}
                  onFilterChange={setFilters}
                  availableCategories={availableCategories}
                  availableBrands={availableBrands}
                  maxPrice={maxPrice}
                  activeFiltersCount={activeFiltersCount}
                />
              </aside>

              {/* Products Grid */}
              <div className="flex-1">
                {isLoading && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <ProductCardSkeleton key={i} />
                    ))}
                  </div>
                )}

                {!isLoading && (
                  <>
                    {/* Results Count */}
                    <div className="mb-4 text-sm text-muted-foreground">
                      عرض {finalProducts.length} من {finalProducts.length} منتج
                    </div>

                    {finalProducts.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20 lg:pb-6">
                        {finalProducts.map((product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            onQuickView={(p) => setQuickViewProduct(p)}
                            onCompare={(p) => addToCompare(p.id)}
                          />
                        ))}
                      </div>
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
              </div>
            </div>
          </TabsContent>

          <TabsContent value="compare">
            <div className="animate-in fade-in slide-in-from-bottom-4">
              <ProductComparison
                products={comparedProducts}
                onRemove={removeFromCompare}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <WhatsAppWidget />
      <BackToTop />

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />

      <ComparisonDrawer products={finalProducts} />

      <Footer />
    </div>
  );
}
