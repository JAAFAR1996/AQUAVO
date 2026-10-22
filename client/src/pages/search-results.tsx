import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useSearch } from "wouter";
import { z } from "zod";
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
import { useListingRestoration } from "@/hooks/use-listing-restoration";
import { fetchSmartSearch, searchProducts } from "@/lib/api";
import {
  buildUnifiedSiteSearchResults,
  fuzzySearchMatch,
  type SiteSearchResult,
} from "@/lib/site-search";
import { ttqSearch } from "@/lib/tiktok-pixel";
import { metaTrackSearch } from "@/lib/meta-pixel";
import type { FishSpecies } from "@/data/freshwater-fish";
import { useTranslation } from "react-i18next";

const searchNavigationSchema = z.object({
  q: z.string().trim().catch(""),
  type: z.enum(["all", "products", "fish", "pages"]).catch("all"),
  sort: z.enum(["relevance", "price-asc", "price-desc", "rating"]).catch("relevance"),
  page: z.string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .pipe(z.number().int().positive().safe())
    .catch(1),
});

type SearchNavigationState = z.infer<typeof searchNavigationSchema>;

type SearchPageItem =
  | { type: "site"; result: SiteSearchResult; score: number }
  | { type: "fish"; fish: FishSpecies; score: number };

const RESULTS_PER_PAGE = 12;

function searchLocation(search: string, state: SearchNavigationState): string {
  const params = new URLSearchParams(search);
  const values = {
    q: state.q,
    type: state.type === "all" ? "" : state.type,
    sort: state.sort === "relevance" ? "" : state.sort,
    page: state.page === 1 ? "" : String(state.page),
  };
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const nextSearch = params.toString();
  // Wouter applies the active locale's router base to this path.
  return `/search${nextSearch ? `?${nextSearch}` : ""}`;
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
  const { t } = useTranslation("search");
  const [, setLocation] = useLocation();
  const search = useSearch();
  const navigationState = useMemo(() => {
    const params = new URLSearchParams(search);
    return searchNavigationSchema.parse({
      q: params.get("q"),
      type: params.get("type"),
      sort: params.get("sort"),
      page: params.get("page"),
    });
  }, [search]);
  const { q: searchQuery, type: filterType, sort: sortBy, page: currentPage } = navigationState;
  const [draftQuery, setDraftQuery] = useState(searchQuery);
  const [selectedFish, setSelectedFish] = useState<FishSpecies | null>(null);
  const trackedQueryRef = useRef("");

  useEffect(() => {
    setDraftQuery(searchQuery);
  }, [searchQuery]);

  const {
    data: productMatches = [],
    isLoading: productsLoading,
    isPending: productsPending,
    isFetching: productsFetching,
    isSuccess: productsLoaded,
  } = useQuery({
    queryKey: ["search-products", searchQuery],
    queryFn: () => searchProducts(searchQuery, { throwOnError: true }),
    enabled: searchQuery.length > 0,
    staleTime: 60 * 1000,
    retry: false,
  });

  const {
    data: smartData,
    isPending: smartPending,
    isFetching: smartLoading,
    isSuccess: smartLoaded,
  } = useQuery({
    // The quick-search overlay caches an empty fallback on request failure.
    // Keep validated results separate so that fallback cannot clamp this page.
    queryKey: ["smart-search", searchQuery, { throwOnError: true }],
    queryFn: () => fetchSmartSearch(searchQuery, { throwOnError: true }),
    enabled: searchQuery.length >= 2,
    staleTime: 60 * 1000,
    retry: false,
  });

  const {
    data: fishData = [],
    isLoading: fishLoading,
    isPending: fishPending,
    isFetching: fishFetching,
    isSuccess: fishLoaded,
  } = useFishData();

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

  const usesSiteResults = filterType !== "fish";
  const usesFishResults = filterType === "all" || filterType === "fish";
  const requestsSettled = !searchQuery || (
    (!usesSiteResults || (
      !productsPending && !productsFetching
      && (searchQuery.length < 2 || (!smartPending && !smartLoading))
    ))
    && (!usesFishResults || (!fishPending && !fishFetching))
  );
  // A failed source cannot establish the final number of pages. It can still
  // leave a usable page of results, whose saved position should be restored.
  const safeToClamp = requestsSettled && (!searchQuery || (
    (!usesSiteResults || (productsLoaded && (searchQuery.length < 2 || smartLoaded)))
    && (!usesFishResults || fishLoaded)
  ));
  const isLoading = searchQuery.length > 0 && (
    (usesSiteResults && (productsLoading || (currentPage > totalPages && smartLoading)))
    || (usesFishResults && fishLoading)
  );
  const restorationReady = requestsSettled && !isLoading && currentPage <= totalPages;

  useEffect(() => {
    if (!safeToClamp || currentPage <= totalPages) return;
    setLocation(searchLocation(search, { ...navigationState, page: totalPages }), { replace: true });
  }, [safeToClamp, currentPage, totalPages, search, navigationState, setLocation]);

  const { containerRef } = useListingRestoration({
    kind: "search",
    state: {},
    ready: restorationReady,
    contentKey: paginatedResults.map((item) => item.type === "fish"
      ? `fish:${item.fish.id}`
      : `${item.result.type}:${item.result.id}`).join(","),
  });

  const updateNavigation = (changes: Partial<SearchNavigationState>) => {
    setLocation(searchLocation(search, { ...navigationState, ...changes }));
  };

  useEffect(() => {
    if (!searchQuery || productMatches.length === 0 || trackedQueryRef.current === searchQuery) return;
    trackedQueryRef.current = searchQuery;
    const trackedProducts = productMatches.slice(0, 5).map((product) => ({ id: product.id, name: product.name }));
    ttqSearch(searchQuery, trackedProducts);
    metaTrackSearch(searchQuery);
  }, [searchQuery, productMatches]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateNavigation({ q: draftQuery.trim(), page: 1 });
  };

  const clearSearch = () => {
    setDraftQuery("");
    updateNavigation({ q: "", page: 1 });
  };

  return (
    <div ref={containerRef} className="flex flex-1 flex-col bg-background" dir="rtl">
      <MetaTags
        title={searchQuery ? t("search-results.s1", { v0: searchQuery }) : t("search-results.s2")}
        description={searchQuery ? t("search-results.s3", { v0: searchQuery }) : t("search-results.s4")}
        noIndex
      />

      <main id="main-content" className="container mx-auto flex-1 px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-sm font-bold text-primary">{t("search-results.s5")}</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{t("search-results.s6")}</h1>
            <p className="mt-3 leading-7 text-muted-foreground">
              {t("search-results.s7")}
            </p>
          </div>

          <form onSubmit={submitSearch} className="mt-7 flex gap-2" role="search">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                value={draftQuery}
                onChange={(event) => setDraftQuery(event.target.value)}
                placeholder={t("search-results.s8")}
                aria-label={t("search-results.s9")}
                className="h-12 pr-12 text-base"
              />
            </div>
            {draftQuery && (
              <Button type="button" variant="outline" size="icon" className="h-12 w-12" onClick={clearSearch} aria-label={t("search-results.s10")}>
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            <Button type="submit" className="h-12 px-6">{t("search-results.s11")}</Button>
          </form>

          {searchQuery && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-border py-4">
              <div className="flex flex-wrap gap-2" aria-label={t("search-results.s12")}>
                {([
                  ["all", t("search-results.s13"), counts.all],
                  ["products", t("search-results.s14"), counts.products],
                  ["fish", t("search-results.s15"), counts.fish],
                  ["pages", t("search-results.s16"), counts.pages],
                ] as const).map(([value, label, count]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      if (value !== filterType) updateNavigation({ type: value, page: 1 });
                    }}
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

              <Select value={sortBy} onValueChange={(value) => updateNavigation({
                sort: searchNavigationSchema.shape.sort.parse(value), page: 1,
              })}>
                <SelectTrigger className="h-11 w-full sm:w-[220px]" aria-label={t("search-results.s17")}>
                  <SelectValue placeholder={t("search-results.s17")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">{t("search-results.s18")}</SelectItem>
                  <SelectItem value="price-asc">{t("search-results.s19")}</SelectItem>
                  <SelectItem value="price-desc">{t("search-results.s20")}</SelectItem>
                  <SelectItem value="rating">{t("search-results.s21")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {searchQuery && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <p>
                {allResults.length > 0
                  ? <>{t("search-results.s22")} <span className="font-bold text-foreground">{allResults.length}</span> {t("search-results.s23")}{searchQuery}»</>
                  : <>{t("search-results.s24")}{searchQuery}»</>}
              </p>
              {smartData?.semantic && (
                <span className="inline-flex items-center gap-1 text-primary">
                  <Sparkles className={`h-4 w-4 ${smartLoading ? "animate-pulse motion-reduce:animate-none" : ""}`} aria-hidden="true" />
                  {t("search-results.s25")}
                </span>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4" role="status" aria-label={t("search-results.s26")}>
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
              <h2 className="mt-4 text-xl font-bold">{t("search-results.s27")}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                {t("search-results.s28")}
              </p>
            </div>
          ) : paginatedResults.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-border bg-card px-6 py-14 text-center">
              <SearchIcon className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-bold">{t("search-results.s29")}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                {t("search-results.s30")}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button variant="outline" onClick={() => updateNavigation({ type: "all", page: 1 })}>{t("search-results.s31")}</Button>
                <Link href="/products"><Button>{t("search-results.s32")}</Button></Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {paginatedResults.map((item) => {
                  if (item.type === "fish") {
                    return (
                      <div key={`fish-${item.fish.id}`} data-listing-item={`fish:${item.fish.id}`}>
                        <FishCard
                          fish={item.fish}
                          onClick={() => setSelectedFish(item.fish)}
                        />
                      </div>
                    );
                  }

                  const result = item.result;
                  if (result.type === "product" && result.product) {
                    return <ProductCard key={`product-${result.id}`} product={result.product} />;
                  }

                  return (
                    <Link key={`page-${result.id}-${result.url}`} href={result.url} className="group block h-full" data-listing-item={`page:${result.id}`}>
                      <article className="flex h-full min-h-56 flex-col rounded-2xl border border-border bg-card p-5 transition-colors group-hover:border-primary/50">
                        <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                          <FileText className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <h2 className="mt-5 text-lg font-bold group-hover:text-primary">{result.title}</h2>
                        <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{result.description}</p>
                        <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">
                          {t("search-results.s33")}
                          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
                        </span>
                      </article>
                    </Link>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <nav className="mt-10 flex items-center justify-center gap-2" aria-label={t("search-results.s34")}>
                  <Button
                    variant="outline"
                    onClick={() => updateNavigation({ page: Math.max(1, currentPage - 1) })}
                    disabled={currentPage === 1}
                  >
                    {t("search-results.s35")}
                  </Button>
                  <span className="px-3 text-sm text-muted-foreground">
                    {t("search-results.s36")} {currentPage} {t("search-results.s37")} {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => updateNavigation({ page: Math.min(totalPages, currentPage + 1) })}
                    disabled={currentPage >= totalPages}
                  >
                    {t("search-results.s38")}
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
