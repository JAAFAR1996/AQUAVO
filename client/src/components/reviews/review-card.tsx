import { Star, ThumbsUp, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { RatingStars } from "./rating-stars";
import { cn } from "@/lib/utils";
import { addCsrfHeader } from "@/lib/csrf";

interface ReviewProps {
    id: string;
    author: string;
    avatar?: string;
    rating: number;
    title?: string;
    date: string;
    content: string;
    images?: { id: string; url: string }[];
    verifiedPurchase?: boolean;
    helpfulCount?: number;
}

interface ReviewCardProps {
    review: ReviewProps;
    onHelpfulClick?: (reviewId: string) => void;
    isHelpfulLoading?: boolean;
    className?: string;
}

export function ReviewCard({
    review,
    onHelpfulClick,
    isHelpfulLoading,
    className,
}: ReviewCardProps) {
    const handleHelpfulClick = async () => {
        if (onHelpfulClick) {
            onHelpfulClick(review.id);
        } else {
            // Default behavior - call API directly
            try {
                const response = await fetch(`/api/reviews/${review.id}/helpful`, {
                    method: "POST",
                    headers: addCsrfHeader(),
                    credentials: "include",
                });
                if (response.ok) {
                    // Could trigger a refresh here
                }
            } catch (error) {
                console.error("Failed to mark as helpful:", error);
            }
        }
    };

    return (
        <Card
            className={cn(
                "border-none shadow-none bg-muted/30 transition-all duration-300 hover:bg-muted/50",
                className
            )}
        >
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-4">
                    {/* Author Info */}
                    <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border-2 border-background shadow-sm">
                            <AvatarImage src={review.avatar} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                {review.author[0]}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-sm">{review.author}</h4>
                                {review.verifiedPurchase && (
                                    <Badge
                                        variant="secondary"
                                        className="text-[10px] h-5 gap-1 px-1.5 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                                    >
                                        <ShieldCheck className="w-3 h-3" />
                                        شراء مؤكد
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <RatingStars rating={review.rating} size="sm" />
                                <span className="text-xs text-muted-foreground">
                                    {review.date}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Review Title */}
                {review.title && (
                    <h5 className="font-semibold text-sm mt-3 text-right">
                        {review.title}
                    </h5>
                )}
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Review Content */}
                <p className="text-sm leading-relaxed text-right">{review.content}</p>

                {/* Review Images */}
                {review.images && review.images.length > 0 && (
                    <ScrollArea className="w-full whitespace-nowrap pb-2">
                        <div className="flex w-max gap-2">
                            {review.images.map((img) => (
                                <Dialog key={img.id}>
                                    <DialogTrigger asChild>
                                        <div className="relative w-20 h-20 rounded-lg overflow-hidden cursor-pointer group">
                                            <img
                                                src={img.url}
                                                alt="صورة المراجعة"
                                                className="object-cover w-full h-full transition-transform group-hover:scale-110"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                        </div>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-3xl border-none bg-transparent shadow-none p-0">
                                        <img
                                            src={img.url}
                                            alt="صورة المراجعة"
                                            className="rounded-lg w-full h-auto max-h-[80vh] object-contain"
                                        />
                                    </DialogContent>
                                </Dialog>
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                )}

                {/* Actions */}
                <div className="flex items-center gap-4 pt-2 border-t">
                    <button
                        onClick={handleHelpfulClick}
                        disabled={isHelpfulLoading}
                        className={cn(
                            "flex items-center gap-1.5 text-xs text-muted-foreground",
                            "hover:text-primary transition-colors",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                    >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>مفيد</span>
                        {(review.helpfulCount ?? 0) > 0 && (
                            <span className="bg-muted px-1.5 py-0.5 rounded-full text-[10px]">
                                {review.helpfulCount}
                            </span>
                        )}
                    </button>
                </div>
            </CardContent>
        </Card>
    );
}
