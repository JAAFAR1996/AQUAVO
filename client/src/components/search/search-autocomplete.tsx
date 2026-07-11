import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Search, Clock, TrendingUp, X, Loader2, Fish } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type FishSpecies } from "@/data/freshwater-fish";
import { useFishData } from "@/hooks/use-fish-data";
import { cardImage } from "@/lib/cloudinary";

interface SearchResult {
    id: string;
    name: string;
    slug: string;
    category: string;
    price: number;
    image: string;
}

interface SearchAutocompleteProps {
    className?: string;
    placeholder?: string;
    onSearch?: (query: string) => void;
}

const RECENT_SEARCHES_KEY = "aquavo_recent_searches";
const MAX_RECENT_SEARCHES = 5;

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

export function SearchAutocomplete({
    className,
    placeholder = "ابحث عن المنتجات...",
    onSearch,
}: SearchAutocompleteProps) {
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [fishResults, setFishResults] = useState<FishSpecies[]>([]);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [, setLocation] = useLocation();
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { data: freshwaterFish = [] } = useFishData();

    const debouncedQuery = useDebounce(query, 300);

    // Load recent searches from localStorage
    useEffect(() => {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) {
            try {
                setRecentSearches(JSON.parse(stored));
            } catch (e) {
                console.error("Error parsing recent searches:", e);
            }
        }
    }, []);

    // Save recent search
    const saveRecentSearch = useCallback((searchQuery: string) => {
        if (!searchQuery.trim()) return;

        setRecentSearches((prev) => {
            const filtered = prev.filter((s) => s.toLowerCase() !== searchQuery.toLowerCase());
            const updated = [searchQuery, ...filtered].slice(0, MAX_RECENT_SEARCHES);
            localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    // Clear recent searches
    const clearRecentSearches = useCallback(() => {
        localStorage.removeItem(RECENT_SEARCHES_KEY);
        setRecentSearches([]);
    }, []);

    // Fetch search results (products from API + fish from local data)
    useEffect(() => {
        if (!debouncedQuery.trim()) {
            setResults([]);
            setFishResults([]);
            return;
        }

        const searchQuery = debouncedQuery.toLowerCase().trim();

        // Search fish encyclopedia (local data)
        const matchedFish = freshwaterFish.filter((fish) => {
            return (
                fish.arabicName.toLowerCase().includes(searchQuery) ||
                fish.commonName.toLowerCase().includes(searchQuery) ||
                fish.scientificName.toLowerCase().includes(searchQuery)
            );
        }).slice(0, 3); // Limit to 3 fish results

        setFishResults(matchedFish);

        // Fetch products from API
        const fetchResults = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(
                    `/api/products/search?q=${encodeURIComponent(debouncedQuery)}&limit=5`
                );
                if (response.ok) {
                    const data = await response.json();
                    setResults(data.products || []);
                }
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchResults();
    }, [debouncedQuery, freshwaterFish]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Handle search submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            saveRecentSearch(query);
            setIsOpen(false);
            if (onSearch) {
                onSearch(query);
            } else {
                setLocation(`/products?search=${encodeURIComponent(query)}`);
            }
        }
    };

    // Handle result click
    const handleResultClick = (result: SearchResult) => {
        saveRecentSearch(result.name);
        setIsOpen(false);
        setLocation(`/products/${result.slug}`);
    };

    // Handle recent search click
    const handleRecentClick = (search: string) => {
        setQuery(search);
        saveRecentSearch(search);
        setIsOpen(false);
        if (onSearch) {
            onSearch(search);
        } else {
            setLocation(`/products?search=${encodeURIComponent(search)}`);
        }
    };

    const showDropdown = isOpen && (query.trim() || recentSearches.length > 0);

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            <form onSubmit={handleSubmit}>
                <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setIsOpen(true)}
                        placeholder={placeholder}
                        className="pr-10 pl-10"
                        dir="rtl"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => {
                                setQuery("");
                                inputRef.current?.focus();
                            }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    {isLoading && (
                        <Loader2 className="absolute left-10 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                </div>
            </form>

            {/* Dropdown */}
            {showDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg overflow-hidden">
                    {/* Recent Searches */}
                    {!query.trim() && recentSearches.length > 0 && (
                        <div className="p-2">
                            <div className="flex items-center justify-between px-2 pb-2">
                                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    البحوث الأخيرة
                                </span>
                                <button
                                    onClick={clearRecentSearches}
                                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                                >
                                    مسح الكل
                                </button>
                            </div>
                            {recentSearches.map((search) => (
                                <button
                                    key={search}
                                    onClick={() => handleRecentClick(search)}
                                    className="w-full text-right px-3 py-2 hover:bg-muted rounded-md transition-colors text-sm"
                                >
                                    {search}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Fish Encyclopedia Results */}
                    {query.trim() && fishResults.length > 0 && (
                        <div className="p-2 border-b border-border">
                            <div className="px-2 pb-2">
                                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <Fish className="w-3 h-3" />
                                    الموسوعة المائية
                                </span>
                            </div>
                            {fishResults.map((fish) => (
                                <button
                                    key={fish.id}
                                    onClick={() => {
                                        saveRecentSearch(fish.arabicName);
                                        setIsOpen(false);
                                        setLocation(`/fish-encyclopedia?fish=${fish.id}`);
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-md transition-colors"
                                >
                                    <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden flex-shrink-0">
                                        <img
                                            src={fish.image}
                                            alt={fish.arabicName}
                                            className="w-full h-full object-contain"
                                            loading="lazy"
                                        />
                                    </div>
                                    <div className="flex-1 text-right min-w-0">
                                        <p className="text-sm font-medium truncate">{fish.arabicName}</p>
                                        <p className="text-xs text-muted-foreground italic">{fish.scientificName}</p>
                                    </div>
                                    <Badge variant="secondary" className="text-[10px] px-1.5 bg-primary/10 text-primary">
                                        موسوعة
                                    </Badge>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Search Results */}
                    {query.trim() && results.length > 0 && (
                        <div className="p-2">
                            <div className="px-2 pb-2">
                                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    نتائج البحث
                                </span>
                            </div>
                            {results.map((result) => (
                                <button
                                    key={result.id}
                                    onClick={() => handleResultClick(result)}
                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-md transition-colors"
                                >
                                    <div className="w-10 h-10 rounded bg-muted/50 overflow-hidden flex-shrink-0">
                                        <img
                                            src={cardImage(result.image) || "/brand/aquavo-v2-icon.svg"}
                                            alt={result.name}
                                            className="w-full h-full object-contain"
                                            loading="lazy"
                                            decoding="async"
                                            width={40}
                                            height={40}
                                        />
                                    </div>
                                    <div className="flex-1 text-right min-w-0">
                                        <p className="text-sm font-medium truncate">{result.name}</p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Badge variant="secondary" className="text-[10px] px-1.5">
                                                {result.category}
                                            </Badge>
                                            <span>{Number(result.price).toLocaleString('en-US')} د.ع</span>
                                        </div>
                                    </div>
                                </button>
                            ))}

                            {/* View all results */}
                            <Button
                                variant="ghost"
                                className="w-full mt-2 text-sm"
                                onClick={handleSubmit}
                            >
                                عرض جميع النتائج لـ "{query}"
                            </Button>
                        </div>
                    )}

                    {/* No results */}
                    {query.trim() && !isLoading && results.length === 0 && fishResults.length === 0 && (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            لا توجد نتائج لـ "{query}"
                        </div>
                    )}

                    {/* Loading */}
                    {query.trim() && isLoading && (
                        <div className="p-4 text-center">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
