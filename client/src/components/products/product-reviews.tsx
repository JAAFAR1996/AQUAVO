import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  Star,
  User,
  MessageSquare,
  ThumbsUp,
  ShieldCheck,
  Loader2,
  SlidersHorizontal,
  ChevronDown,
  ImagePlus,
  X
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { addCsrfHeader } from "@/lib/csrf";

interface Review {
  id: string;
  userId: string;
  author?: string;
  rating: number;
  title?: string;
  comment?: string;
  images?: string[];
  verifiedPurchase?: boolean;
  helpfulCount?: number;
  createdAt: string;
  userEmail?: string;
}

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

type SortOption = "newest" | "oldest" | "highest" | "lowest" | "helpful";

const sortLabels: Record<SortOption, string> = {
  newest: "الأحدث",
  oldest: "الأقدم",
  highest: "الأعلى تقييماً",
  lowest: "الأقل تقييماً",
  helpful: "الأكثر فائدة",
};

export function ProductReviews({ productId, productName }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [helpfulLoading, setHelpfulLoading] = useState<string | null>(null);
  const itemsPerPage = 5;

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      // Try the new reviews API first, fallback to old
      let response = await fetch(`/api/reviews/${productId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        // Fallback to old API
        response = await fetch(`/api/products/${productId}/reviews`, {
          credentials: "include",
        });
      }

      if (response.ok) {
        const data = await response.json();
        setReviews(data || []);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "يجب تسجيل الدخول",
        description: "يرجى تسجيل الدخول لإضافة تقييم",
        variant: "destructive",
      });
      return;
    }

    if (rating === 0) {
      toast({
        title: "اختر التقييم",
        description: "يرجى اختيار تقييم من 1 إلى 5 نجوم",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/reviews`, {
        method: "POST",
        headers: addCsrfHeader({
          "Content-Type": "application/json",
        }),
        credentials: "include",
        body: JSON.stringify({
          productId,
          rating,
          title: title.trim() || undefined,
          comment: comment.trim() || undefined,
        }),
      });

      if (response.ok) {
        toast({
          title: "تم إضافة التقييم",
          description: "شكراً لك على تقييمك!",
        });

        // Reset form
        setRating(0);
        setTitle("");
        setComment("");

        // Refresh reviews
        fetchReviews();
      } else {
        const error = await response.json();
        toast({
          title: "خطأ",
          description: error.message || "فشل إضافة التقييم",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة التقييم",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkHelpful = async (reviewId: string) => {
    setHelpfulLoading(reviewId);
    try {
      const response = await fetch(`/api/reviews/${reviewId}/helpful`, {
        method: "POST",
        headers: addCsrfHeader(),
        credentials: "include",
      });

      if (response.ok) {
        toast({
          title: "شكراً لك",
          description: "تم تسجيل رأيك",
        });
        fetchReviews();
      } else {
        const error = await response.json();
        toast({
          title: "تنبيه",
          description: error.message || "لقد قيمت هذه المراجعة مسبقاً",
        });
      }
    } catch (error) {
      console.error("Error marking helpful:", error);
    } finally {
      setHelpfulLoading(null);
    }
  };

  // Calculate rating breakdown
  const ratingBreakdown = useMemo(() => {
    const breakdown: { [key: number]: number } = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((review) => {
      const r = Math.min(5, Math.max(1, Math.round(review.rating)));
      breakdown[r] = (breakdown[r] || 0) + 1;
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

  const getPercentage = (count: number) => {
    if (reviews.length === 0) return 0;
    return Math.round((count / reviews.length) * 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ar-IQ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const renderStars = (value: number, interactive: boolean = false, size: "sm" | "md" | "lg" = "md") => {
    const sizeClasses = {
      sm: "h-3 w-3",
      md: "h-5 w-5",
      lg: "h-7 w-7",
    };

    return (
      <div className="flex gap-0.5" dir="ltr">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && setRating(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            className={cn(
              interactive && "cursor-pointer transition-transform hover:scale-110"
            )}
          >
            <Star
              className={cn(
                sizeClasses[size],
                star <= (interactive ? (hoverRating || rating) : value)
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground"
              )}
            />
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Rating Breakdown Summary */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            تقييمات العملاء
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {reviews.length > 0 ? (
            <div className="flex flex-col md:flex-row gap-8">
              {/* Average Rating */}
              <div className="text-center md:text-right space-y-2 md:min-w-[120px]">
                <div className="text-5xl font-bold text-amber-600 dark:text-amber-400">
                  {averageRating.toFixed(1)}
                </div>
                <div className="flex justify-center md:justify-start">
                  {renderStars(Math.round(averageRating), false, "sm")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {reviews.length} {reviews.length === 1 ? "تقييم" : "تقييمات"}
                </div>
              </div>

              {/* Rating Bars */}
              <div className="flex-1 space-y-2">
                {[5, 4, 3, 2, 1].map((starNum) => {
                  const count = ratingBreakdown[starNum] || 0;
                  const percentage = getPercentage(count);
                  const isSelected = filterRating === starNum;

                  return (
                    <button
                      key={starNum}
                      onClick={() => setFilterRating(isSelected ? null : starNum)}
                      className={cn(
                        "w-full flex items-center gap-2 group transition-all duration-200 rounded-md p-1 -m-1",
                        "cursor-pointer hover:bg-amber-100/50 dark:hover:bg-amber-900/20",
                        isSelected && "bg-amber-100 dark:bg-amber-900/30"
                      )}
                    >
                      <div className="flex items-center gap-1 w-16 text-sm">
                        <span className="font-medium">{starNum}</span>
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
                      <div className="w-12 text-xs text-muted-foreground text-left">
                        ({count})
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              لا توجد تقييمات بعد. كن أول من يقيّم هذا المنتج!
            </p>
          )}

          {/* Clear Filter */}
          {filterRating && (
            <button
              onClick={() => setFilterRating(null)}
              className="mt-4 text-sm text-primary hover:underline flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              عرض جميع المراجعات
            </button>
          )}
        </CardContent>
      </Card>

      {/* Add Review Form */}
      {user && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">أضف تقييمك</CardTitle>
            <CardDescription>شارك تجربتك مع {productName}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Rating */}
              <div className="space-y-2">
                <Label>التقييم *</Label>
                <div className="flex gap-1" dir="ltr">
                  {renderStars(rating, true, "lg")}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="review-title">عنوان المراجعة (اختياري)</Label>
                <Input
                  id="review-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="منتج رائع!"
                  className="text-right"
                  dir="rtl"
                  maxLength={100}
                />
              </div>

              {/* Comment */}
              <div className="space-y-2">
                <Label htmlFor="review-comment">تفاصيل المراجعة (اختياري)</Label>
                <Textarea
                  id="review-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="شارك تجربتك مع هذا المنتج..."
                  rows={4}
                  className="resize-none text-right"
                  dir="rtl"
                  maxLength={2000}
                />
              </div>

              <Button type="submit" disabled={submitting || rating === 0} className="gap-2">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  "إرسال التقييم"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      {reviews.length > 0 && (
        <div className="space-y-4">
          {/* Sort Controls */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {filterRating
                ? `عرض ${processedReviews.length} مراجعة بتقييم ${filterRating} نجوم`
                : `جميع التقييمات (${reviews.length})`}
            </h3>

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

          {/* Review Cards */}
          {paginatedReviews.length > 0 ? (
            <div className="space-y-4">
              {paginatedReviews.map((review) => (
                <Card key={review.id} className="overflow-hidden">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {(review.author || review.userEmail?.split("@")[0] || "م")[0]}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm">
                                {review.author || review.userEmail?.split("@")[0] || "مستخدم"}
                              </p>
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
                              {renderStars(review.rating, false, "sm")}
                              <span className="text-xs text-muted-foreground">
                                {formatDate(review.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Title */}
                        {review.title && (
                          <h4 className="font-semibold text-sm">{review.title}</h4>
                        )}

                        {/* Comment */}
                        {review.comment && (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {review.comment}
                          </p>
                        )}

                        {/* Images */}
                        {review.images && review.images.length > 0 && (
                          <ScrollArea className="w-full whitespace-nowrap pb-2">
                            <div className="flex w-max gap-2">
                              {review.images.map((img, idx) => (
                                <Dialog key={idx}>
                                  <DialogTrigger asChild>
                                    <div className="relative w-16 h-16 rounded-lg overflow-hidden cursor-pointer group">
                                      <img
                                        src={img}
                                        alt={`صورة المراجعة ${idx + 1}`}
                                        className="object-cover w-full h-full transition-transform group-hover:scale-110"
                                      />
                                    </div>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl border-none bg-transparent shadow-none p-0">
                                    <img
                                      src={img}
                                      alt={`صورة المراجعة ${idx + 1}`}
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
                        <div className="flex items-center gap-4 pt-2 border-t mt-4">
                          <button
                            onClick={() => handleMarkHelpful(review.id)}
                            disabled={helpfulLoading === review.id}
                            className={cn(
                              "flex items-center gap-1.5 text-xs text-muted-foreground",
                              "hover:text-primary transition-colors",
                              "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                          >
                            {helpfulLoading === review.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <ThumbsUp className="w-3.5 h-3.5" />
                            )}
                            <span>مفيد</span>
                            {(review.helpfulCount ?? 0) > 0 && (
                              <span className="bg-muted px-1.5 py-0.5 rounded-full text-[10px]">
                                {review.helpfulCount}
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد مراجعات بتقييم {filterRating} نجوم
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
                السابق
              </Button>

              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  const shouldShow =
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    Math.abs(pageNum - page) <= 1;

                  if (!shouldShow) {
                    if (pageNum === 2 || pageNum === totalPages - 1) {
                      return (
                        <span key={i} className="px-2 text-muted-foreground">
                          ...
                        </span>
                      );
                    }
                    return null;
                  }

                  return (
                    <Button
                      key={i}
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
                التالي
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
