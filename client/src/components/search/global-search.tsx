import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/lib/api";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { Product } from "@/types";
import { SearchIcon, Clock, TrendingUp, Package, X, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  id: string;
  type: "product" | "page" | "fish";
  title: string;
  subtitle?: string;
  image?: string;
  price?: number;
  url: string;
  category?: string;
}

const RECENT_SEARCHES_KEY = "fish-web-recent-searches";
const MAX_RECENT_SEARCHES = 5;

// Static pages for search
const staticPages = [
  { title: "الرئيسية", url: "/", keywords: ["home", "رئيسية", "البداية"] },
  { title: "المنتجات", url: "/products", keywords: ["products", "منتجات", "متجر"] },
  { title: "العروض", url: "/deals", keywords: ["deals", "عروض", "تخفيضات", "خصم"] },
  { title: "المفضلة", url: "/wishlist", keywords: ["wishlist", "مفضلة", "قائمة"] },
  { title: "موسوعة الأسماك", url: "/fish-encyclopedia", keywords: ["fish", "encyclopedia", "موسوعة", "أسماك"] },


  { title: "الحاسبات", url: "/calculators", keywords: ["calculators", "حاسبات", "حساب"] },
  { title: "رحلتك", url: "/journey", keywords: ["journey", "رحلة", "دليل"] },
];

// Popular/Quick Links with Arabic keywords for search
const popularItems = [
  { title: "فلاتر المياه", url: "/products?category=Filters", category: "فلاتر", keywords: ["فلتر", "فلاتر", "filter", "filters", "تصفية"] },
  { title: "سخانات الحوض", url: "/products?category=Heaters", category: "سخانات", keywords: ["سخان", "سخانات", "heater", "heaters", "تسخين", "حرارة"] },
  { title: "الإضاءة LED", url: "/products?category=Lighting", category: "إضاءة", keywords: ["ضوء", "إضاءة", "ليد", "led", "lighting", "أضواء"] },
  { title: "النباتات المائية", url: "/products?category=Plants", category: "نباتات", keywords: ["نبات", "نباتات", "plant", "plants", "زرع"] },
  { title: "الديكورات", url: "/products?category=Decorations", category: "ديكور", keywords: ["ديكور", "زينة", "حجر", "صخور", "decoration"] },
  { title: "مضخات الهواء", url: "/products?category=Air Pumps", category: "مضخات", keywords: ["مضخة", "هواء", "أكسجين", "pump", "air"] },
  { title: "أغذية الأسماك", url: "/products?category=Food", category: "أغذية", keywords: ["طعام", "غذاء", "أكل", "food", "علف"] },
  { title: "معالجات المياه", url: "/products?category=Water Treatment", category: "معالجات", keywords: ["معالج", "كيماوي", "ماء", "treatment", "conditioner"] },
];

// Fuzzy matching helper
function fuzzyMatch(text: string, query: string): boolean {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  // Direct inclusion
  if (textLower.includes(queryLower)) return true;

  // Character-by-character fuzzy match
  let textIndex = 0;
  let queryIndex = 0;

  while (textIndex < textLower.length && queryIndex < queryLower.length) {
    if (textLower[textIndex] === queryLower[queryIndex]) {
      queryIndex++;
    }
    textIndex++;
  }

  return queryIndex === queryLower.length;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data } = useQuery<{ products: Product[] }>({
    queryKey: ["products"],
    queryFn: () => fetchProducts(),
  });

  // Load recent searches
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load recent searches:", error);
    }
  }, []);

  // Save to recent searches
  const addToRecentSearches = (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    const updated = [
      searchQuery,
      ...recentSearches.filter((s) => s !== searchQuery),
    ].slice(0, MAX_RECENT_SEARCHES);

    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  // Search logic
  const searchResults = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    // Search products
    (data?.products || []).forEach((product) => {
      const matchScore =
        (product.name.toLowerCase().includes(lowerQuery) ? 3 : 0) +
        (product.brand.toLowerCase().includes(lowerQuery) ? 2 : 0) +
        (product.category.toLowerCase().includes(lowerQuery) ? 2 : 0) +
        (fuzzyMatch(product.name, lowerQuery) ? 1 : 0);

      if (matchScore > 0) {
        results.push({
          id: product.id,
          type: "product",
          title: product.name,
          subtitle: product.brand,
          image: product.image,
          price: product.price,
          url: `/products/${product.slug}`,
          category: product.category,
        });
      }
    });

    // Search pages
    staticPages.forEach((page) => {
      const matchesTitle = fuzzyMatch(page.title, lowerQuery);
      const matchesKeywords = page.keywords.some((keyword) =>
        fuzzyMatch(keyword, lowerQuery)
      );

      if (matchesTitle || matchesKeywords) {
        results.push({
          id: page.url,
          type: "page",
          title: page.title,
          url: page.url,
        });
      }
    });

    // Search popular category items by keywords
    popularItems.forEach((item) => {
      const matchesTitle = fuzzyMatch(item.title, lowerQuery);
      const matchesCategory = fuzzyMatch(item.category, lowerQuery);
      const matchesKeywords = item.keywords?.some((keyword) =>
        fuzzyMatch(keyword, lowerQuery)
      );

      if (matchesTitle || matchesCategory || matchesKeywords) {
        // Avoid duplicates
        if (!results.find(r => r.url === item.url)) {
          results.push({
            id: item.url,
            type: "page",
            title: item.title,
            subtitle: item.category,
            url: item.url,
          });
        }
      }
    });

    return results.slice(0, 10); // Limit to 10 results
  }, [query, data]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < searchResults.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          e.preventDefault();
          if (searchResults[selectedIndex]) {
            addToRecentSearches(query);
            setLocation(searchResults[selectedIndex].url);
            onOpenChange(false);
            setQuery("");
          }
          break;
        case "Escape":
          onOpenChange(false);
          setQuery("");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, searchResults, selectedIndex, query, onOpenChange, setLocation]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  const handleResultClick = (url: string) => {
    addToRecentSearches(query);
    setLocation(url);
    onOpenChange(false);
    setQuery("");
  };

  const handleRecentSearchClick = (search: string) => {
    setQuery(search);
    inputRef.current?.focus();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0">
        {/* Search Input */}
        <div className="flex items-center gap-2 p-4 border-b">
          <SearchIcon className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
          <Input
            ref={inputRef}
            type="search"
            placeholder="ابحث عن المنتجات، الصفحات، الأسماك..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 text-lg"
            aria-label="البحث"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setQuery("")}
              className="shrink-0"
              aria-label="مسح البحث"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[500px]">
          {/* Search Results */}
          {query.trim() && searchResults.length > 0 && (
            <div className="p-2">
              <div className="text-xs text-muted-foreground px-3 py-2 font-medium">
                نتائج البحث ({searchResults.length})
              </div>
              {searchResults.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result.url)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-right ${index === selectedIndex ? "bg-muted" : ""
                    }`}
                  aria-label={`انتقل إلى ${result.title}`}
                >
                  {result.type === "product" && result.image && (
                    <img
                      src={result.image}
                      alt={result.title}
                      loading="lazy"
                      decoding="async"
                      className="w-12 h-12 object-contain rounded-md bg-white shrink-0"
                    />
                  )}
                  {result.type === "page" && (
                    <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Package className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-right">
                    <div className="font-medium text-sm truncate">{result.title}</div>
                    {result.subtitle && (
                      <div className="text-xs text-muted-foreground truncate">
                        {result.subtitle}
                      </div>
                    )}
                    {result.price !== undefined && (
                      <div className="text-xs text-primary font-bold mt-1">
                        {result.price.toLocaleString()} د.ع
                      </div>
                    )}
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {result.type === "product" ? "منتج" : "صفحة"}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {query.trim() && searchResults.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <SearchIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">لا توجد نتائج</p>
              <p className="text-sm mt-1">جرب البحث بكلمات مختلفة</p>
            </div>
          )}

          {/* Default View (Recent + Popular) */}
          {!query.trim() && (
            <div className="p-2">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <Clock className="w-4 h-4" />
                      عمليات البحث الأخيرة
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearRecentSearches}
                      className="h-auto p-1 text-xs"
                    >
                      مسح
                    </Button>
                  </div>
                  {recentSearches.map((search) => (
                    <button
                      key={search}
                      onClick={() => handleRecentSearchClick(search)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-right"
                    >
                      <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 text-sm">{search}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                  <Separator className="my-2" />
                </>
              )}

              {/* Popular Items */}
              <div className="px-3 py-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-2">
                  <TrendingUp className="w-4 h-4" />
                  روابط سريعة
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {popularItems.map((item) => (
                    <button
                      key={item.title}
                      onClick={() => handleResultClick(item.url)}
                      className="w-full p-3 rounded-lg border hover:bg-muted transition-colors text-right"
                    >
                      <div className="font-medium text-sm">{item.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {item.category}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-3 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-muted">↓</kbd>
              للتنقل
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted">Enter</kbd>
              للاختيار
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted">Esc</kbd>
            للإغلاق
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
