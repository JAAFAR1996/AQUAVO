import { useState, useEffect, useMemo } from "react";
import { Loader2, SlidersHorizontal, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReviewWithImages } from "./review-with-images";
import { RatingBreakdown } from "./rating-breakdown";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { i18next } from "@/i18n";

interface Review {
    id: string;
    author: string;
    authorTier?: string;
    avatar?: string;
    rating: number;
    title?: string;
    comment?: string;
    images?: { id: string; url: string }[];
    verifiedPurchase?: boolean;
    helpfulCount?: number;
    createdAt: string;
}

interface ReviewListProps {
    productId: string;
    className?: string;
}

type SortOption = "newest" | "oldest" | "highest" | "lowest" | "helpful";

const sortLabels: Record<SortOption, string> = {
    newest: i18next.t("pages:review-list.s1"),
    oldest: i18next.t("pages:review-list.s2"),
    highest: i18next.t("pages:review-list.s3"),
    lowest: i18next.t("pages:review-list.s4"),
    helpful: i18next.t("pages:review-list.s5"),
};

export function ReviewList({ productId, className }: ReviewListProps) {
  const { t } = useTranslation("pages");
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<SortOption>("newest");
    const [filterRating, setFilterRating] = useState<number | null>(null);
    const [page, setPage] = useState(1);
    const itemsPerPage = 5;

    // Fetch reviews
    useEffect(() => {
        const fetchReviews = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/reviews/${productId}`);
                if (!response.ok) {
                    throw new Error(t("review-list.s6"));
                }
                const data = await response.json();
                // Transform data to match our interface
                interface ServerReview {
                    id: string;
                    author?: string;
                    authorTier?: string;
                    avatar?: string;
                    rating: number;
                    title?: string;
                    comment: string;
                    images?: string[];
                    verifiedPurchase?: boolean;
                    helpfulCount?: number;
                    createdAt: string;
                }
                const transformedReviews = data.map((review: ServerReview) => ({
                    id: review.id,
                    author: review.author || t("review-list.s7"),
                    authorTier: review.authorTier || "bronze",
                    avatar: review.avatar,
                    rating: review.rating,
                    title: review.title,
                    comment: review.comment,
                    images: review.images?.map((url: string, idx: number) => ({
                        id: `${review.id}-img-${idx}`,
                        url,
                    })),
                    verifiedPurchase: review.verifiedPurchase,
                    helpfulCount: review.helpfulCount || 0,
                    createdAt: review.createdAt,
                }));
                setReviews(transformedReviews);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : t("review-list.s8");
                setError(message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchReviews();
    }, [productId]);

    // Calculate rating breakdown
    const ratingBreakdown = useMemo(() => {
        const breakdown: { [key: number]: number } = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach((review) => {
            const rating = Math.min(5, Math.max(1, Math.round(review.rating)));
            breakdown[rating] = (breakdown[rating] || 0) + 1;
        });
        return breakdown;
    }, [reviews]);

    const averageRating = useMemo(() => {
        if (reviews.length === 0) return 0;
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        return sum / reviews.length;
    }, [reviews]);

    // Filter and sort reviews
    const processedReviews = useMemo(() => {
        let filtered = [...reviews];

        // Apply rating filter
        if (filterRating !== null) {
            filtered = filtered.filter(
                (r) => Math.round(r.rating) === filterRating
            );
        }

        // Apply sorting
        switch (sortBy) {
            case "newest":
                filtered.sort(
                    (a, b) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                break;
            case "oldest":
                filtered.sort(
                    (a, b) =>
                        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                );
                break;
            case "highest":
                filtered.sort((a, b) => b.rating - a.rating);
                break;
            case "lowest":
                filtered.sort((a, b) => a.rating - b.rating);
                break;
            case "helpful":
                filtered.sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0));
                break;
        }

        return filtered;
    }, [reviews, filterRating, sortBy]);

    // Paginate
    const paginatedReviews = useMemo(() => {
        const start = (page - 1) * itemsPerPage;
        return processedReviews.slice(start, start + itemsPerPage);
    }, [processedReviews, page]);

    const totalPages = Math.ceil(processedReviews.length / itemsPerPage);

    // Reset page when filter changes
    useEffect(() => {
        setPage(1);
    }, [filterRating, sortBy]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("ar-IQ", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12 text-destructive">
                <p>{error}</p>
                <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => window.location.reload()}
                >
                    {t("review-list.s9")}
                </Button>
            </div>
        );
    }

    return (
        <div className={cn("space-y-6", className)}>
            {/* Rating Breakdown */}
            {reviews.length > 0 && (
                <RatingBreakdown
                    ratings={ratingBreakdown}
                    totalReviews={reviews.length}
                    averageRating={averageRating}
                    onFilterChange={setFilterRating}
                    selectedFilter={filterRating}
                />
            )}

            {/* Sort Controls */}
            {reviews.length > 0 && (
                <div className="flex items-center justify-between border-b pb-4">
                    <div className="text-sm text-muted-foreground">
                        {filterRating
                            ? t("review-list.s10", { v0: processedReviews.length, v1: filterRating })
                            : t("review-list.s11", { v0: reviews.length })}
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <SlidersHorizontal className="w-4 h-4" />
                                {sortLabels[sortBy]}
                                <ChevronDown className="w-3 h-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {(Object.entries(sortLabels) as [SortOption, string][]).map(
                                ([value, label]) => (
                                    <DropdownMenuItem
                                        key={value}
                                        onClick={() => setSortBy(value)}
                                        className={cn(sortBy === value && "bg-accent")}
                                    >
                                        {label}
                                    </DropdownMenuItem>
                                )
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}

            {/* Reviews List */}
            {paginatedReviews.length > 0 ? (
                <div className="space-y-4">
                    {paginatedReviews.map((review) => (
                        <ReviewWithImages
                            key={review.id}
                            review={{
                                id: review.id,
                                author: review.author,
                                authorTier: review.authorTier,
                                avatar: review.avatar,
                                rating: review.rating,
                                date: formatDate(review.createdAt),
                                content: review.comment || review.title || "",
                                images: review.images,
                                verifiedPurchase: review.verifiedPurchase,
                                helpfulCount: review.helpfulCount,
                            }}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-muted-foreground">
                    {filterRating
                        ? t("review-list.s12", { v0: filterRating })
                        : t("review-list.s13")}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                    >
                        {t("review-list.s14")}
                    </Button>

                    <div className="flex items-center gap-1">
                        {[...Array(totalPages)].map((_, i) => {
                            const pageNum = i + 1;
                            // Show first, last, current, and adjacent pages
                            const shouldShow =
                                pageNum === 1 ||
                                pageNum === totalPages ||
                                Math.abs(pageNum - page) <= 1;

                            if (!shouldShow) {
                                // Show ellipsis
                                if (pageNum === 2 || pageNum === totalPages - 1) {
                                    return (
                                        <span key={`ellipsis-${pageNum}`} className="px-2 text-muted-foreground">
                                            ...
                                        </span>
                                    );
                                }
                                return null;
                            }

                            return (
                                <Button
                                    key={pageNum}
                                    variant={page === pageNum ? "default" : "ghost"}
                                    size="sm"
                                    className="w-8 h-8 p-0"
                                    onClick={() => setPage(pageNum)}
                                >
                                    {pageNum}
                                </Button>
                            );
                        })}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        {t("review-list.s15")}
                    </Button>
                </div>
            )}
        </div>
    );
}
