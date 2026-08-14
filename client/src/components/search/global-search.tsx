import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Clock3,
  FileText,
  Package,
  SearchIcon,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchProducts, fetchSmartSearch } from "@/lib/api";
import { thumbImage } from "@/lib/cloudinary";
import { formatPrice } from "@/lib/format";
import { phTrackSearch } from "@/lib/posthog";
import {
  buildUnifiedSiteSearchResults,
  POPULAR_SEARCH_LINKS,
  type SiteSearchResult,
} from "@/lib/site-search";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RECENT_SEARCHES_KEY = "aquavo-recent-searches";
const LEGACY_RECENT_SEARCHES_KEY = "fish-web-recent-searches";
const MAX_RECENT_SEARCHES = 6;

function readRecentSearches(): string[] {
  try {
    const current = localStorage.getItem(RECENT_SEARCHES_KEY);
    const legacy = localStorage.getItem(LEGACY_RECENT_SEARCHES_KEY);
    const value = current || legacy;
    if (!value) return [];
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string").slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

function saveRecentSearches(values: string[]): void {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(values));
    localStorage.removeItem(LEGACY_RECENT_SEARCHES_KEY);
  } catch {
    // Search remains usable when storage is unavailable.
  }
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const firedSearchRef = useRef("");

  const { data: catalogData, isLoading: isCatalogLoading } = useQuery({
    queryKey: ["products", "global-search-catalog"],
    queryFn: () => fetchProducts({ limit: 120 }),
    enabled: open,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const { data: smartData, isFetching: isSmartSearching } = useQuery({
    queryKey: ["smart-search", debouncedQuery],
    queryFn: () => fetchSmartSearch(debouncedQuery),
    enabled: open && debouncedQuery.length >= 2,
    staleTime: 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebouncedQuery("");
      setSelectedIndex(0);
      return;
    }

    setRecentSearches(readRecentSearches());
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(focusTimer);
  }, [open]);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) {
      setDebouncedQuery("");
      return;
    }

    const timer = window.setTimeout(() => setDebouncedQuery(normalized), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery || firedSearchRef.current === debouncedQuery) return;
    firedSearchRef.current = debouncedQuery;
    phTrackSearch({ queryLength: debouncedQuery.length });
  }, [debouncedQuery]);

  const results = useMemo(
    () =>
      buildUnifiedSiteSearchResults({
        query,
        semanticProducts: smartData?.products ?? [],
        catalogProducts: catalogData?.products ?? [],
        limit: 14,
      }),
    [query, smartData?.products, catalogData?.products],
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, results.length]);

  const addRecentSearch = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return;
    const next = [normalized, ...recentSearches.filter((item) => item !== normalized)].slice(0, MAX_RECENT_SEARCHES);
    setRecentSearches(next);
    saveRecentSearches(next);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    saveRecentSearches([]);
  };

  /**
   * Report which result was chosen, then navigate.
   *
   * This is the ONLY place a search result is opened — both the mouse click and the Enter key funnel
   * through here — so one call covers every path. Until this existed the server could see that a search
   * happened and never which product it led to.
   */
  const reportSearchClick = (result: SiteSearchResult, index: number) => {
    if (result.type !== "product") return;
    const q = query.trim();
    if (q.length < 2) return;
    try {
      const body = JSON.stringify({ query: q, productId: result.id, position: index });
      // keepalive so the request survives the navigation that happens on the next line.
      void fetch("/api/products/search-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        keepalive: true,
        body,
      }).catch(() => {});
    } catch {
      // Telemetry must never break navigation.
    }
  };

  const navigateToResult = (result: SiteSearchResult, index = results.findIndex((r) => r.id === result.id && r.url === result.url)) => {
    reportSearchClick(result, index < 0 ? 0 : index);
    addRecentSearch(query || result.title);
    onOpenChange(false);
    setLocation(result.url);
  };

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((current) => Math.min(current + 1, Math.max(0, results.length - 1)));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((current) => Math.max(0, current - 1));
      } else if (event.key === "Enter" && results[selectedIndex]) {
        event.preventDefault();
        navigateToResult(results[selectedIndex], selectedIndex);
      } else if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, results, selectedIndex, query, recentSearches, onOpenChange]);

  const showLoading = query.trim().length > 0 && isCatalogLoading;
  const showSearching = query.trim().length >= 2 && isSmartSearching;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[680px]" dir="rtl">
        <DialogTitle className="sr-only">بحث AQUAVO</DialogTitle>
        <DialogDescription className="sr-only">
          ابحث بنفس النظام عن المنتجات والأقسام وصفحات المساعدة.
        </DialogDescription>

        <div className="flex min-h-16 items-center gap-3 border-b border-border px-4">
          <SearchIcon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <Input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="اكتب اسم المنتج أو احتياج الحوض..."
            aria-label="بحث AQUAVO"
            className="h-12 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
          />
          {showSearching && <Sparkles className="h-4 w-4 animate-pulse text-primary motion-reduce:animate-none" aria-label="جاري البحث الذكي" />}
          {query && (
            <Button type="button" variant="ghost" size="icon" onClick={() => setQuery("")} aria-label="مسح البحث">
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[min(70vh,560px)]">
          {query.trim() ? (
            <div className="p-3">
              <div className="flex items-center justify-between px-2 py-2 text-xs text-muted-foreground">
                <span>{results.length > 0 ? `${results.length} نتيجة مرتبة حسب الصلة والتوفر` : "نتائج البحث"}</span>
                {smartData?.semantic && (
                  <span className="inline-flex items-center gap-1 text-primary">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    بحث ذكي
                  </span>
                )}
              </div>

              {showLoading ? (
                <div className="space-y-2 p-2" role="status" aria-label="جاري تحميل نتائج البحث">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-16 w-full rounded-xl" />
                  ))}
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-1" role="listbox" aria-label="نتائج البحث">
                  {results.map((result, index) => {
                    const isSelected = index === selectedIndex;
                    return (
                      <button
                        key={`${result.type}-${result.id}-${result.url}`}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={() => setSelectedIndex(index)}
                        onClick={() => navigateToResult(result, index)}
                        className={`flex min-h-16 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-right transition-colors ${
                          isSelected
                            ? "border-primary/40 bg-primary/10"
                            : "border-transparent hover:border-border hover:bg-muted/60"
                        }`}
                      >
                        {result.type === "product" ? (
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-card p-1">
                            {result.image ? (
                              <img
                                src={thumbImage(result.image)}
                                alt=""
                                loading="lazy"
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <Package className="m-auto h-full w-5 text-muted-foreground" aria-hidden="true" />
                            )}
                          </div>
                        ) : (
                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                            <FileText className="h-5 w-5" aria-hidden="true" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-foreground">{result.title}</p>
                          {(result.subtitle || result.description) && (
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {result.subtitle || result.description}
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 text-left">
                          {result.type === "product" && Number(result.price ?? 0) > 0 && (
                            <p className="text-sm font-bold text-primary">{formatPrice(result.price ?? 0)}</p>
                          )}
                          {result.type === "product" && (
                            <p className={`mt-1 text-[11px] ${(result.stock ?? 0) > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                              {(result.stock ?? 0) > 0 ? "متوفر" : "غير متوفر حالياً"}
                            </p>
                          )}
                          {result.type === "page" && <ArrowLeft className="h-4 w-4 text-primary" aria-hidden="true" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center px-6 py-14 text-center">
                  <SearchIcon className="h-9 w-9 text-muted-foreground" aria-hidden="true" />
                  <h3 className="mt-4 font-bold">ما لكينا نتيجة مطابقة</h3>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                    جرّب اسم أقصر، اسم البراند، أو اكتب احتياج مثل فلتر أو سخان.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-5"
                    onClick={() => {
                      addRecentSearch(query);
                      onOpenChange(false);
                      setLocation(`/search?q=${encodeURIComponent(query.trim())}`);
                    }}
                  >
                    افتح صفحة البحث الكاملة
                  </Button>
                </div>
              )}

              {results.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    addRecentSearch(query);
                    onOpenChange(false);
                    setLocation(`/search?q=${encodeURIComponent(query.trim())}`);
                  }}
                  className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border text-sm font-bold text-primary hover:border-primary/45 hover:bg-primary/5"
                >
                  شوف النتائج بصفحة كاملة
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6 p-5">
              {recentSearches.length > 0 && (
                <section aria-labelledby="recent-searches-title">
                  <div className="flex items-center justify-between">
                    <h3 id="recent-searches-title" className="flex items-center gap-2 text-sm font-bold">
                      <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
                      آخر عمليات البحث
                    </h3>
                    <button type="button" onClick={clearRecentSearches} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      مسح
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recentSearches.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setQuery(value)}
                        className="min-h-10 rounded-full border border-border px-4 text-sm text-foreground hover:border-primary/45 hover:bg-primary/5"
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section aria-labelledby="popular-searches-title">
                <h3 id="popular-searches-title" className="text-sm font-bold">روح مباشرة للقسم</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {POPULAR_SEARCH_LINKS.map((link) => (
                    <button
                      key={link.url}
                      type="button"
                      onClick={() => {
                        onOpenChange(false);
                        setLocation(link.url);
                      }}
                      className="flex min-h-12 items-center justify-between rounded-xl border border-border px-4 text-right text-sm font-medium hover:border-primary/45 hover:bg-primary/5"
                    >
                      <span>{link.title}</span>
                      <ArrowLeft className="h-4 w-4 text-primary" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
