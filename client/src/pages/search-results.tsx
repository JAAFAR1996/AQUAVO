import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { MetaTags } from "@/components/seo/meta-tags";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SearchIcon, X, FileText, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { searchProducts } from "@/lib/api";
import { ProductCard } from "@/components/products/product-card";
import { FishCard } from "@/components/fish/fish-card";
import { FishDetailModal } from "@/components/fish/fish-detail-modal";
import { useFishData } from "@/hooks/use-fish-data";
import { useState, useEffect, useMemo } from "react";
import { useLocation, Link } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product } from "@/types";
import type { FishSpecies } from "@/data/freshwater-fish";
import { ttqSearch } from "@/lib/tiktok-pixel";
import { metaTrackSearch } from "@/lib/meta-pixel";

type FilterType = "all" | "products" | "fish" | "pages";
type SortType = "relevance" | "price-asc" | "price-desc" | "rating";

interface PageResult {
  id: string;
  title: string;
  description: string;
  url: string;
  keywords: string[];
}

const SITE_PAGES: PageResult[] = [
  {
    id: "home",
    title: "الرئيسية",
    description: "متجر عراقي لمعدات ومستلزمات الأحواض البريميوم",
    url: "/",
    keywords: ["home", "main", "store", "shop"]
  },
  {
    id: "encyclopedia",
    title: "موسوعة الأسماك",
    description: "دليل شامل لجميع أنواع أسماك الزينة وطرق العناية بها",
    url: "/fish-encyclopedia",
    keywords: ["fish", "info", "guide", "species", "care"]
  },
  {
    id: "breeding",
    title: "حاسبة التكاثر",
    description: "أداة متطورة لحساب وتتبع دورات تكاثر الأسماك",
    url: "/fish-breeding-calculator",
    keywords: ["breeding", "calculator", "fry", "reproduction"]
  },
  {
    id: "diagnosis",
    title: "تشخيص الأمراض",
    description: "نظام ذكي لتشخيص أمراض الأسماك واقتراح العلاج",
    url: "/fish-health-diagnosis",
    keywords: ["doctor", "health", "disease", "sick", "cure"]
  },
  {
    id: "gallery",
    title: "معرض الهواة",
    description: "شارك صور حوضك وشاهد إبداعات الآخرين",
    url: "/community-gallery",
    keywords: ["gallery", "photos", "community", "sharing"]
  }
];

export default function SearchResults() {
  const [location] = useLocation();
  const queryParams = new URLSearchParams(window.location.search);
  const initialQuery = queryParams.get("q") || "";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("relevance");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFish, setSelectedFish] = useState<FishSpecies | null>(null);
  const resultsPerPage = 12;

  // 1. Fetch Products (Server-Side Search)
  const { data: serverProducts, isLoading: productsLoading } = useQuery({
    queryKey: ["products", searchQuery],
    queryFn: () => searchProducts(searchQuery), // defined in api.ts
    staleTime: 1000 * 60 * 1, // 1 minute
    enabled: true // Always fetch, even if query is empty (returns all) or handle inside api
  });

  const products = serverProducts || [];

  // 2. Fetch Fish
  const { data: fishData, isLoading: fishLoading } = useFishData();
  const fishList = fishData || [];

  const isLoading = productsLoading || fishLoading;

  // Update search query when URL changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") || "";
    setSearchQuery(q);
    setCurrentPage(1);
  }, [location]);

  // TikTok Pixel: Search event
  useEffect(() => {
    if (searchQuery.trim() && products.length > 0) {
      ttqSearch(searchQuery, products.slice(0, 5).map(p => ({
        id: p.id,
        name: p.name,
      })));
      // Meta Pixel: Search event
      metaTrackSearch(searchQuery);
    }
  }, [searchQuery, products.length]);

  // Combined Search Logic
  const allResults = useMemo(() => {
    // If no query, we might want to show nothing or all (depending on UX). 
    // The previous implementation showed NOTHING if (!searchQuery). 
    // But now we might get recommended products? 
    // Let's stick to "if (!searchQuery.trim()) return []" for the main list.
    if (!searchQuery.trim()) return [];

    const lowerQuery = searchQuery.toLowerCase().trim();
    const results: Array<{ type: 'product' | 'fish' | 'page', data: Product | FishSpecies | PageResult, score: number }> = [];

    // Filter Products
    // Server has already filtered by name/desc/brand match if we used searchProducts(query).
    // So we just score them or add them directly.
    if (filterType === "all" || filterType === "products") {
      products.forEach(product => {
        let score = 0;
        const name = product.name.toLowerCase();
        const brand = product.brand.toLowerCase();
        const desc = (product.description || "").toLowerCase();

        if (name.includes(lowerQuery)) score += 10;
        if (name.startsWith(lowerQuery)) score += 5;
        if (brand.includes(lowerQuery)) score += 3;
        if (desc.includes(lowerQuery)) score += 1;

        // Since server already matched it, we assume score > 0 or at least it's a match.
        // But scoring helps sorting.
        if (score === 0) score = 1; // Base score for server match

        results.push({ type: 'product', data: product, score });
      });
    }

    // Filter Fish
    if (filterType === "all" || filterType === "fish") {
      fishList.forEach(fish => {
        let score = 0;
        const arName = fish.arabicName.toLowerCase();
        const enName = fish.commonName.toLowerCase();
        const sciName = fish.scientificName.toLowerCase();

        if (arName.includes(lowerQuery)) score += 10;
        if (enName.includes(lowerQuery)) score += 10;
        if (sciName.includes(lowerQuery)) score += 8;

        if (score > 0) {
          results.push({ type: 'fish', data: fish, score });
        }
      });
    }

    // Filter Pages
    if (filterType === "all" || filterType === "pages") {
      SITE_PAGES.forEach(page => {
        let score = 0;
        const title = page.title.toLowerCase();
        const desc = page.description.toLowerCase();

        if (title.includes(lowerQuery)) score += 10;
        if (desc.includes(lowerQuery)) score += 5;
        if (page.keywords.some(k => k.includes(lowerQuery))) score += 5;

        if (score > 0) {
          results.push({ type: 'page', data: page, score });
        }
      });
    }

    // Sorting
    return results.sort((a, b) => {
      // Primary sort: Score (Relevance)
      if (sortBy === "relevance") {
        return b.score - a.score;
      }

      // Secondary sorts (mainly for products)
      if (a.type === 'product' && b.type === 'product') {
        const pA = a.data as Product;
        const pB = b.data as Product;
        if (sortBy === "price-asc") return pA.price - pB.price;
        if (sortBy === "price-desc") return pB.price - pA.price;
        if (sortBy === "rating") return pB.rating - pA.rating;
      }

      // Fallback to score
      return b.score - a.score;
    });
  }, [searchQuery, filterType, products, fishList, sortBy]);

  // Pagination
  const totalResults = allResults.length;
  const totalPages = Math.ceil(totalResults / resultsPerPage);
  const startIndex = (currentPage - 1) * resultsPerPage;
  const endIndex = startIndex + resultsPerPage;
  const paginatedResults = allResults.slice(startIndex, endIndex);

  // Suggestion Logic
  const suggestedQuery = useMemo(() => {
    if (!searchQuery || allResults.length > 0) return null;
    const lowerQuery = searchQuery.toLowerCase();

    // Check products
    const foundProduct = products.find(p =>
      p.name.toLowerCase().includes(lowerQuery.slice(0, -1))
    );
    if (foundProduct) return foundProduct.name;

    // Check fish
    const foundFish = fishList.find(f =>
      f.commonName.toLowerCase().includes(lowerQuery.slice(0, -1))
    );
    if (foundFish) return foundFish.commonName;

    return null;
  }, [searchQuery, allResults.length, products, fishList]);

  // Counts for tabs
  const getCount = (type: FilterType) => {
    if (type === 'all') return products.length + fishList.length + SITE_PAGES.length; // Approximate/Total available, simpler to just not show or show filtered count?
    // Better to show count of MATCHING items?
    // The previous code showed "Products (N)" where N was TOTAL products.
    if (type === 'products') return products.length;
    if (type === 'fish') return fishList.length;
    if (type === 'pages') return SITE_PAGES.length;
    return 0;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MetaTags
        title={searchQuery ? `نتائج البحث: ${searchQuery}` : "البحث"}
        description={`نتائج البحث عن "${searchQuery}" في منتجات وأسماك AQUAVO`}
        noIndex={true}
      />
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8" id="main-content">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">نتائج البحث</h1>

          {/* Search Bar */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="ابحث عن منتجات، أسماك، أو صفحات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            {searchQuery && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSearchQuery("")}
                aria-label="مسح البحث"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Filters and Sort */}
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <Badge
                variant={filterType === "all" ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/80"
                onClick={() => setFilterType("all")}
              >
                الكل
              </Badge>
              <Badge
                variant={filterType === "products" ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/80"
                onClick={() => setFilterType("products")}
              >
                المنتجات
              </Badge>
              <Badge
                variant={filterType === "fish" ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/80"
                onClick={() => setFilterType("fish")}
              >
                الموسوعة
              </Badge>
              <Badge
                variant={filterType === "pages" ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/80"
                onClick={() => setFilterType("pages")}
              >
                الصفحات
              </Badge>
            </div>

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="الترتيب حسب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">الأكثر صلة</SelectItem>
                <SelectItem value="price-asc">السعر: من الأقل للأعلى</SelectItem>
                <SelectItem value="price-desc">السعر: من الأعلى للأقل</SelectItem>
                <SelectItem value="rating">الأعلى تقييماً</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Count */}
        {searchQuery && (
          <div className="mb-6">
            <p className="text-muted-foreground">
              تم العثور على <span className="font-bold text-foreground">{totalResults}</span> نتيجة
              {searchQuery && ` لـ "${searchQuery}"`}
            </p>
          </div>
        )}

        {/* Suggestion for typos */}
        {suggestedQuery && (
          <div className="mb-6 p-4 rounded-lg bg-muted/50 border">
            <p className="text-sm">
              هل تقصد:{" "}
              <button
                onClick={() => setSearchQuery(suggestedQuery)}
                className="text-primary font-medium hover:underline"
              >
                {suggestedQuery}
              </button>
              ؟
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {!isLoading && searchQuery && paginatedResults.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-muted/30 p-8 rounded-full mb-6">
              <SearchIcon className="h-24 w-24 text-muted-foreground/50" />
            </div>
            <h2 className="text-2xl font-bold mb-2">لم نعثر على نتائج</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              حاول البحث بكلمات مختلفة أو تصفح الأقسام المختلفة
            </p>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setSearchQuery("")}>بحث جديد</Button>
              <Link href="/products">
                <Button>تصفح المنتجات</Button>
              </Link>
            </div>
          </div>
        )}

        {/* Results Grid */}
        {!isLoading && paginatedResults.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {paginatedResults.map((item, index) => {
                const uniqueKey = `${item.type}-${(item.data as { id?: string }).id || index}`;

                if (item.type === 'product') {
                  const product = item.data as Product;
                  return <ProductCard key={uniqueKey} product={product} />;
                }

                if (item.type === 'fish') {
                  const fish = item.data as FishSpecies;
                  return (
                    <FishCard
                      key={uniqueKey}
                      fish={fish}
                      onClick={() => setSelectedFish(fish)}
                    />
                  );
                }

                if (item.type === 'page') {
                  const page = item.data as PageResult;
                  return (
                    <Link key={uniqueKey} href={page.url} className="group block">
                      <div className="h-full border rounded-xl p-6 bg-card hover:shadow-lg transition-all hover:border-primary/50 flex flex-col">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                          <FileText className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                          {page.title}
                        </h3>
                        <p className="text-muted-foreground text-sm flex-1">
                          {page.description}
                        </p>
                        <div className="mt-4 flex items-center text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          زيارة الصفحة <ArrowRight className="w-4 h-4 mr-1" />
                        </div>
                      </div>
                    </Link>
                  );
                }

                return null;
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  السابق
                </Button>

                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          onClick={() => setCurrentPage(page)}
                          className="w-10"
                        >
                          {page}
                        </Button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span key={page} className="px-2 flex items-center">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  التالي
                </Button>
              </div>
            )}
          </>
        )}

        {/* Empty State (no search query) */}
        {!isLoading && !searchQuery && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-muted/30 p-8 rounded-full mb-6">
              <SearchIcon className="h-24 w-24 text-muted-foreground/50" />
            </div>
            <h2 className="text-2xl font-bold mb-2">ابدأ البحث</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              استخدم شريط البحث أعلاه للعثور على المنتجات، معلومات الأسماك، والمزيد
            </p>
          </div>
        )}
      </main>

      {/* Fish Detail Modal */}
      <FishDetailModal
        fish={selectedFish}
        open={!!selectedFish}
        onOpenChange={(open) => !open && setSelectedFish(null)}
      />

      <Footer />
    </div>
  );
}
