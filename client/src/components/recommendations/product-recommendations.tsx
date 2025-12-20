import { useEffect, useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Sparkles, History, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchProducts } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

const RECENTLY_VIEWED_KEY = "aquavo_recently_viewed";
const MAX_RECENTLY_VIEWED = 10;

// Hook to track and get recently viewed products
export function useRecentlyViewed() {
    const [viewedIds, setViewedIds] = useState<string[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem(RECENTLY_VIEWED_KEY);
        if (stored) {
            try {
                setViewedIds(JSON.parse(stored));
            } catch (e) {
                console.error("Error parsing recently viewed:", e);
            }
        }
    }, []);

    const addViewed = (productId: string) => {
        setViewedIds((prev) => {
            const filtered = prev.filter((id) => id !== productId);
            const updated = [productId, ...filtered].slice(0, MAX_RECENTLY_VIEWED);
            localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
            return updated;
        });
    };

    const clearViewed = () => {
        localStorage.removeItem(RECENTLY_VIEWED_KEY);
        setViewedIds([]);
    };

    return { viewedIds, addViewed, clearViewed };
}

// Product Recommendation Card
function RecommendationCard({ product }: { product: Product }) {
    return (
        <Link href={`/products/${product.slug}`}>
            <Card className="group h-full overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer border-transparent hover:border-primary/20">
                <div className="relative aspect-square bg-muted/20 overflow-hidden">
                    <img
                        src={product.image || product.thumbnail}
                        alt={product.name}
                        className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                    />
                    {product.isNew && (
                        <Badge className="absolute top-2 right-2 bg-blue-500">جديد</Badge>
                    )}
                    {product.isBestSeller && (
                        <Badge className="absolute top-2 left-2 bg-amber-500">الأكثر مبيعاً</Badge>
                    )}
                </div>
                <CardContent className="p-3">
                    <h4 className="font-medium text-sm line-clamp-2 min-h-[2.5rem] mb-1">
                        {product.name}
                    </h4>
                    <div className="flex items-center justify-between">
                        <span className="font-bold text-primary">
                            {product.price.toLocaleString()} <span className="text-xs">د.ع</span>
                        </span>
                        {product.originalPrice && product.originalPrice > product.price && (
                            <span className="text-xs text-muted-foreground line-through">
                                {product.originalPrice.toLocaleString()}
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

// Carousel Navigation
function CarouselNavigation({
    onPrev,
    onNext,
    canPrev,
    canNext,
}: {
    onPrev: () => void;
    onNext: () => void;
    canPrev: boolean;
    canNext: boolean;
}) {
    return (
        <div className="flex gap-2">
            <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={onPrev}
                disabled={!canPrev}
            >
                <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={onNext}
                disabled={!canNext}
            >
                <ChevronLeft className="w-4 h-4" />
            </Button>
        </div>
    );
}

// Recommended For You Section
interface RecommendedForYouProps {
    currentProductId?: string;
    currentCategory?: string;
    limit?: number;
    className?: string;
}

export function RecommendedForYou({
    currentProductId,
    currentCategory,
    limit = 6,
    className,
}: RecommendedForYouProps) {
    const [startIndex, setStartIndex] = useState(0);
    const itemsPerPage = 4;

    const { data, isLoading } = useQuery({
        queryKey: ["products"],
        queryFn: () => fetchProducts(),
    });

    const recommendations = useMemo(() => {
        if (!data?.products) return [];

        let filtered = data.products.filter((p) => p.id !== currentProductId);

        // Prioritize same category
        if (currentCategory) {
            const sameCategory = filtered.filter((p) => p.category === currentCategory);
            const otherCategory = filtered.filter((p) => p.category !== currentCategory);

            // Sort by rating
            sameCategory.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            otherCategory.sort((a, b) => (b.rating || 0) - (a.rating || 0));

            filtered = [...sameCategory, ...otherCategory];
        } else {
            // Sort by rating and bestseller
            filtered.sort((a, b) => {
                if (a.isBestSeller && !b.isBestSeller) return -1;
                if (!a.isBestSeller && b.isBestSeller) return 1;
                return (b.rating || 0) - (a.rating || 0);
            });
        }

        return filtered.slice(0, limit);
    }, [data, currentProductId, currentCategory, limit]);

    const visibleProducts = recommendations.slice(startIndex, startIndex + itemsPerPage);
    const canPrev = startIndex > 0;
    const canNext = startIndex + itemsPerPage < recommendations.length;

    if (isLoading) {
        return (
            <div className={cn("space-y-4", className)}>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-32" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="aspect-square rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    if (recommendations.length === 0) return null;

    return (
        <div className={cn("space-y-4", className)}>
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    موصى به لك
                </h3>
                <CarouselNavigation
                    onPrev={() => setStartIndex((i) => Math.max(0, i - itemsPerPage))}
                    onNext={() => setStartIndex((i) => Math.min(recommendations.length - itemsPerPage, i + itemsPerPage))}
                    canPrev={canPrev}
                    canNext={canNext}
                />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {visibleProducts.map((product) => (
                    <RecommendationCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    );
}

// Similar Products Section
interface SimilarProductsProps {
    currentProduct: Product;
    limit?: number;
    className?: string;
}

export function SimilarProducts({
    currentProduct,
    limit = 4,
    className,
}: SimilarProductsProps) {
    const { data, isLoading } = useQuery({
        queryKey: ["products"],
        queryFn: () => fetchProducts(),
    });

    const similarProducts = useMemo(() => {
        if (!data?.products) return [];

        return data.products
            .filter((p) => {
                if (p.id === currentProduct.id) return false;

                // Same category
                if (p.category !== currentProduct.category) return false;

                // Similar price range (within 50%)
                const priceDiff = Math.abs(p.price - currentProduct.price) / currentProduct.price;
                return priceDiff <= 0.5;
            })
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, limit);
    }, [data, currentProduct, limit]);

    if (isLoading) {
        return (
            <div className={cn("space-y-4", className)}>
                <Skeleton className="h-6 w-32" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="aspect-square rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    if (similarProducts.length === 0) return null;

    return (
        <div className={cn("space-y-4", className)}>
            <h3 className="text-lg font-bold flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                منتجات مشابهة
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {similarProducts.map((product) => (
                    <RecommendationCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    );
}

// Recently Viewed Products Section
interface RecentlyViewedProps {
    currentProductId?: string;
    className?: string;
}

export function RecentlyViewed({
    currentProductId,
    className,
}: RecentlyViewedProps) {
    const { viewedIds, clearViewed } = useRecentlyViewed();
    const [startIndex, setStartIndex] = useState(0);
    const itemsPerPage = 4;

    const { data, isLoading } = useQuery({
        queryKey: ["products"],
        queryFn: () => fetchProducts(),
    });

    const recentProducts = useMemo(() => {
        if (!data?.products || viewedIds.length === 0) return [];

        return viewedIds
            .filter((id) => id !== currentProductId)
            .map((id) => data.products.find((p) => p.id === id))
            .filter(Boolean) as Product[];
    }, [data, viewedIds, currentProductId]);

    const visibleProducts = recentProducts.slice(startIndex, startIndex + itemsPerPage);
    const canPrev = startIndex > 0;
    const canNext = startIndex + itemsPerPage < recentProducts.length;

    if (isLoading || recentProducts.length === 0) return null;

    return (
        <div className={cn("space-y-4", className)}>
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <History className="w-5 h-5 text-muted-foreground" />
                    شاهدتها مؤخراً
                </h3>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground"
                        onClick={clearViewed}
                    >
                        مسح الكل
                    </Button>
                    <CarouselNavigation
                        onPrev={() => setStartIndex((i) => Math.max(0, i - itemsPerPage))}
                        onNext={() => setStartIndex((i) => Math.min(recentProducts.length - itemsPerPage, i + itemsPerPage))}
                        canPrev={canPrev}
                        canNext={canNext}
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {visibleProducts.map((product) => (
                    <RecommendationCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    );
}

// Compact Recently Viewed (for sidebar)
export function RecentlyViewedCompact({ className }: { className?: string }) {
    const { viewedIds } = useRecentlyViewed();

    const { data } = useQuery({
        queryKey: ["products"],
        queryFn: () => fetchProducts(),
    });

    const recentProducts = useMemo(() => {
        if (!data?.products || viewedIds.length === 0) return [];

        return viewedIds
            .slice(0, 5)
            .map((id) => data.products.find((p) => p.id === id))
            .filter(Boolean) as Product[];
    }, [data, viewedIds]);

    if (recentProducts.length === 0) return null;

    return (
        <Card className={cn("", className)}>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                    <History className="w-4 h-4" />
                    شاهدتها مؤخراً
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {recentProducts.map((product) => (
                    <Link key={product.id} href={`/products/${product.slug}`}>
                        <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                            <div className="w-10 h-10 rounded bg-muted/50 overflow-hidden flex-shrink-0">
                                <img
                                    src={product.image || product.thumbnail}
                                    alt={product.name}
                                    className="w-full h-full object-contain"
                                    loading="lazy"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{product.name}</p>
                                <p className="text-xs text-primary font-bold">
                                    {product.price.toLocaleString()} د.ع
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}
            </CardContent>
        </Card>
    );
}
