import { Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface RatingBreakdownProps {
    ratings: { [key: number]: number }; // { 5: 10, 4: 5, 3: 2, 2: 1, 1: 0 }
    totalReviews: number;
    averageRating: number;
    onFilterChange?: (rating: number | null) => void;
    selectedFilter?: number | null;
    className?: string;
}

export function RatingBreakdown({
    ratings,
    totalReviews,
    averageRating,
    onFilterChange,
    selectedFilter,
    className,
}: RatingBreakdownProps) {
    const getPercentage = (count: number) => {
        if (totalReviews === 0) return 0;
        return Math.round((count / totalReviews) * 100);
    };

    const handleClick = (rating: number) => {
        if (onFilterChange) {
            // Toggle filter - if same rating clicked, clear filter
            onFilterChange(selectedFilter === rating ? null : rating);
        }
    };

    return (
        <div className={cn("space-y-4", className)}>
            {/* Average Rating Summary */}
            <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl">
                <div className="text-center">
                    <div className="text-4xl font-bold text-amber-600 dark:text-amber-400">
                        {averageRating.toFixed(1)}
                    </div>
                    <div className="flex justify-center mt-1" dir="ltr">
                        {[...Array(5)].map((_, i) => (
                            <Star
                                key={i}
                                className={cn(
                                    "w-4 h-4",
                                    i < Math.round(averageRating)
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-muted-foreground"
                                )}
                            />
                        ))}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                        {totalReviews} مراجعة
                    </div>
                </div>

                {/* Rating Bars */}
                <div className="flex-1 space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => {
                        const count = ratings[rating] || 0;
                        const percentage = getPercentage(count);
                        const isSelected = selectedFilter === rating;

                        return (
                            <button
                                key={rating}
                                onClick={() => handleClick(rating)}
                                className={cn(
                                    "w-full flex items-center gap-2 group transition-all duration-200 rounded-md p-1 -m-1",
                                    onFilterChange && "cursor-pointer hover:bg-amber-100/50 dark:hover:bg-amber-900/20",
                                    isSelected && "bg-amber-100 dark:bg-amber-900/30"
                                )}
                            >
                                <div className="flex items-center gap-1 w-12 text-sm">
                                    <span className="font-medium">{rating}</span>
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                </div>
                                <div className="flex-1">
                                    <Progress
                                        value={percentage}
                                        className={cn(
                                            "h-2 transition-all",
                                            isSelected && "h-3"
                                        )}
                                    />
                                </div>
                                <div className="w-10 text-xs text-muted-foreground text-left">
                                    ({count})
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Clear Filter Button */}
            {selectedFilter && onFilterChange && (
                <button
                    onClick={() => onFilterChange(null)}
                    className="text-sm text-primary hover:underline"
                >
                    عرض جميع المراجعات
                </button>
            )}
        </div>
    );
}
