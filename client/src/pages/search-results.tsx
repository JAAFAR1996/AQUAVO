import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  FileText,
  SearchIcon,
  Sparkles,
  X,
} from "lucide-react";

import { MetaTags } from "@/components/seo/meta-tags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/products/product-card";
import { FishCard } from "@/components/fish/fish-card";
import { FishDetailModal } from "@/components/fish/fish-detail-modal";
import { useFishData } from "@/hooks/use-fish-data";
import { fetchSmartSearch, searchProducts } from "@/lib/api";
import {
  buildUnifiedSiteSearchResults,
  fuzzySearchMatch,
  type SiteSearchResult,
} from "@/lib/site-search";
import { ttqSearch } from "@/lib/tiktok-pixel";
import { metaTrackSearch } from "@/lib/meta-pixel";
import type { FishSpecies } from "@/data/freshwater-fish";

type FilterType = "all" | "products" | "fish" | "pages";
type SortType = "relevance" | "price-asc" | "price-desc" | "rating";

type SearchPageItem =
  | { type: "site"; result: SiteSearchResult; score: number }
  | { type: "fish"; fish: FishSpecies; score: number };

const RESULTS_PER_PAGE = 12;

function readQueryFromLocation(): string {
  return new URLSearchParams(window.location.search).get("q")?.trim() ?? "";
}

function fishSearchScore(fish: FishSpecies, query: string): number {
  const values = [fish.arabicName, fish.commonName, fish.scientificName].filter(Boolean);
  let score = 0;
  values.forEach((value, index) => {
    if (!fuzzySearchMatch(value, query)) return;
    score += index === 0 ? 34 : index === 1 ? 30 : 24;
    if (String(value).toLowerCase().startsWith(query.toLowerCase())) score += 8;
  });
  return score;
}

export default function SearchResults() {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState(readQueryFromLocation);
  const [draftQuery, setDraftQuery] = useState(readQueryFromLocation);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("relevance");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFish, setSelectedFish] = useState<FishSpecies | null>(null);
  const trackedQueryRef = useRef("");

  useEffect(() => {
    const next = readQueryFromLocation();
    setSearchQuery(next);
    setDraftQuery(next);
    setCurrentPage(1);
  }, [location]);

  const { data: productMatches = [], isLoading: productsLoading } = useQuery({
    queryKey: ["search-products", searchQuery],
    queryFn: () => searchProducts(searchQuery),
    enabled: searchQuery.length > 0,
    staleTime: 60 * 1000,
    retry: false,
  });

  const { data: smartData, isFetching: smartLoading } = useQuery({
    queryKey: ["smart-search", searchQuery],
    queryFn: () => fetchSmartSearch(searchQuery),
    enabled: searchQuery.length >= 2,
    staleTime: 60 * 1000,
    retry: false,
  });

  const { data: fishData = [], isLoading: fishLoading } = useFishData();

  const siteResults = useMemo(
    () =>
      buildUnifiedSiteSearchResults({
        query: searchQuery,
        semanticProducts: smartData?.products ?? [],
        catalogProducts: productMatches,
        limit: 80,
      }),
    [searchQuery, smartData?.products, productMatches],
  );

  const allResults = useMemo<SearchPageItem[]>(() => {
    if (!searchQuery) return [];

    const siteItems = siteResults
      .filter((result) => {
        if (filterType === "products") return result.type === "product";
        if (filterType === "pages") return result.type === "page";
        if (filterType === "fish") return false;
        return true;
      })
      .map((result) => ({ type: "site" as const, result, score: result.score }));

    const fishItems = filterType === "products" || filterType === "pages"
      ? []
      : fishData
          .map((fish) => ({ fish, score: fishSearchScore(fish, searchQuery) }))
          .filter((item) => item.score > 0)
          .map((item) => ({ type: "fish" as const, ...item }));

    return [...siteItems, ...fishItems].sort((a, b) => {
      if (sortBy === "relevance") return b.score - a.score;

      const aProduct = a.type === "site" && a.result.type === "product" ? a.result : null;
      const bProduct = b.type === "site" && b.result.type === "product" ? b.result : null;

      if (aProduct && bProduct) {
        if (sortBy === "price-asc") return Number(aProduct.price ?? 0) - Number(bProduct.price ?? 0);
        if (sortBy === "price-desc") return Number(bProduct.price ?? 0) - Number(aProduct.price ?? 0);
        if (sortBy === "rating") return Number(bProduct.rating ?? 0) - Number(aProduct.rating ?? 0);
      }

      if (aProduct && !bProduct) return -1;
      if (!aProduct && bProduct) return 1;
      return b.score - a.score;
    });
  }, [searchQuery, siteResults, fishData, filterType, sortBy]);

  const counts = useMemo(() => {
    const products = siteResults.filter((result) => result.type === "product").length;
    const pages = siteResults.filter((result) => result.type === "page").length;
    const fish = searchQuery
      ? fishData.filter((item) => fishSearchScore(item, searchQuery) > 0).length
      : 0;
    return { all: products + pages + fish, products, pages, fish };
  }, [siteResults, fishData, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(allResults.length / RESULTS_PER_PAGE));
  const paginatedResults = allResults.slice(
    (currentPage - 1) * RESULTS_PER_PAGE,
    currentPage * RESULTS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, sortBy, searchQuery]);

  useEffect(() => {
    if (!searchQuery || productMatches.length === 0 || trackedQueryRef.current === searchQuery) return;
    trackedQueryRef.current = searchQuery;
    const trackedProducts = productMatches.slice(0, 5).map((product) => ({ id: product.id, name: product.name }));
    ttqSearch(searchQuery, trackedProducts);
    metaTrackSearch(searchQuery);
  }, [searchQuery, productMatches]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = draftQuery.trim();
    if (!next) {
      setSearchQuery("");
      setLocation("/search");
      return;
    }
    setLocation(`/search?q=${encodeURIComponent(next)}`);
  };

  const clearSearch = () => {
    setDraftQuery("");
    setSearchQuery("");
    setLocation("/search");
  };

  const isLoading = searchQuery.length > 0 && (productsLoading || fishLoading);

  return (
    <div className="flex flex-1 flex-col bg-background" dir="rtl">
      <MetaTags
        title={searchQuery ? `نتائج البحث: ${searchQuery}` : "البحث"}
        description={searchQuery ? `نتائج البحث عن ${searchQuery} في AQUAVO` : "ابحث في منتجات وأدلة AQUAVO"}
        noIndex
      />

      <main id="main-content" className="container mx-auto flex-1 px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-sm font-bold text-primary">بحث AQUAVO الموحد</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">المنتجات والمعلومات بمكان واحد</h1>
            <p className="mt-3 leading-7 text-muted-foreground">
              اكتب اسم المنتج، البراند، نوع القطعة أو احتياج الحوض. نفس النتائج تظهر بالبحث السريع وبهذه الصفحة.
            </p>
          </div>

          <form onSubmit={submitSearch} className="mt-7 flex gap-2" role="search">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                value={draftQuery}
                onChange={(event) => setDraftQuery(event.target.value)}
                placeholder="مثال: فلتر لحوض 60 لتر"
                aria-label="اكتب عبارة البحث"
                className="h-12 pr-12 text-base"
              />
            </div>
            {draftQuery && (
              <Button type="button" variant="outline" size="icon" className="h-12 w-12" onClick={clearSearch} aria-label="مسح البحث">
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            <Button type="submit" className="h-12 px-6">بحث</Button>
          </form>

          {searchQuery && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-border py-4">
              <div className="flex flex-wrap gap-2" aria-label="تصفية نتائج البحث">
                {([
                  ["all", "الكل", counts.all],
                  ["products", "المنتجات", counts.products],
                  ["fish", "الموسوعة", counts.fish],
                  ["pages", "الصفحات", counts.pages],
                ] as const).map(([value, label, count]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilterType(value)}
                    aria-pressed={filterType === value}
                    className={`min-h-10 rounded-full border px-4 text-sm font-bold transition-colors ${
                      filterType === value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/45"
                    }`}
                  >
                    {label} ({count})
                  </button>
                ))}
              </div>

              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortType)}>
                <SelectTrigger className="h-11 w-full sm:w-[220px]">
                  <SelectValue placeholder="الترتيب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">الأكثر صلة</SelectItem>
                  <SelectItem value="price-asc">السعر: الأقل أولاً</SelectItem>
                  <SelectItem value="price-desc">السعر: الأعلى أولاً</SelectItem>
                  <SelectItem value="rating">الأعلى تقييماً</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {searchQuery && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <p>
                {allResults.length > 0
                  ? <>لكينا <span className="font-bold text-foreground">{allResults.length}</span> نتيجة لـ «{searchQuery}»</>
                  : <>ما لكينا نتيجة لـ «{searchQuery}»</>}
              </p>
              {smartData?.semantic && (
                <span className="inline-flex items-center gap-1 text-primary">
                  <Sparkles className={`h-4 w-4 ${smartLoading ? "animate-pulse motion-reduce:animate-none" : ""}`} aria-hidden="true" />
                  تم استخدام البحث الذكي
                </span>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4" role="status" aria-label="جاري تحميل نتائج البحث">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="space-y-3">
                  <Skeleton className="aspect-square w-full rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : !searchQuery ? (
            <div className="mt-10 rounded-2xl border border-border bg-card px-6 py-14 text-center">
              <SearchIcon className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-bold">ابدأ بكلمة واضحة</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                اكتب اسم قطعة مثل فلتر، أو مشكلة مثل حرارة الحوض، أو اسم البراند.
              </p>
            </div>
          ) : paginatedResults.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-border bg-card px-6 py-14 text-center">
              <SearchIcon className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-bold">ماكو نتيجة مطابقة</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                جرّب كلمة أقصر أو اختار «الكل» حتى تشوف المنتجات والصفحات والموسوعة سوية.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button variant="outline" onClick={() => setFilterType("all")}>اعرض الكل</Button>
                <Link href="/products"><Button>تصفح المنتجات</Button></Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {paginatedResults.map((item, index) => {
                  if (item.type === "fish") {
                    return (
                      <FishCard
                        key={`fish-${item.fish.scientificName}-${index}`}
                        fish={item.fish}
                        onClick={() => setSelectedFish(item.fish)}
                      />
                    );
                  }

                  const result = item.result;
                  if (result.type === "product" && result.product) {
                    return <ProductCard key={`product-${result.id}`} product={result.product} />;
                  }

                  return (
                    <Link key={`page-${result.id}-${result.url}`} href={result.url} className="group block h-full">
                      <article className="flex h-full min-h-56 flex-col rounded-2xl border border-border bg-card p-5 transition-colors group-hover:border-primary/50">
                        <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                          <FileText className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <h2 className="mt-5 text-lg font-bold group-hover:text-primary">{result.title}</h2>
                        <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{result.description}</p>
                        <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">
                          افتح الصفحة
                          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
                        </span>
                      </article>
                    </Link>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <nav className="mt-10 flex items-center justify-center gap-2" aria-label="صفحات نتائج البحث">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                  >
                    السابق
                  </Button>
                  <span className="px-3 text-sm text-muted-foreground">
                    صفحة {currentPage} من {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                  >
                    التالي
                  </Button>
                </nav>
              )}
            </>
          )}
        </div>
      </main>

      <FishDetailModal
        fish={selectedFish}
        open={Boolean(selectedFish)}
        onOpenChange={(open) => !open && setSelectedFish(null)}
      />
    </div>
  );
}
