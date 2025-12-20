import { useState } from "react";
import { Star, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface ReviewFormProps {
    productId: string;
    onReviewSubmitted?: () => void;
}

export function ReviewForm({ productId, onReviewSubmitted }: ReviewFormProps) {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [title, setTitle] = useState("");
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (rating === 0) {
            toast({
                title: "خطأ",
                description: "يرجى اختيار تقييم",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch("/api/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    productId,
                    rating,
                    title: title.trim() || undefined,
                    comment: comment.trim() || undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "فشل إرسال المراجعة");
            }

            toast({
                title: "تم بنجاح",
                description: "شكراً لك! تم إضافة مراجعتك",
            });

            // Reset form
            setRating(0);
            setTitle("");
            setComment("");

            onReviewSubmitted?.();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "حدث خطأ أثناء إرسال المراجعة";
            toast({
                title: "خطأ",
                description: message,
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="border-none shadow-lg bg-gradient-to-b from-background to-muted/30">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-right">أضف مراجعتك</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Star Rating */}
                    <div className="space-y-2">
                        <Label className="text-right block">التقييم</Label>
                        <div className="flex gap-1 justify-end" dir="ltr">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    className="p-1 transition-transform hover:scale-110"
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    onClick={() => setRating(star)}
                                >
                                    <Star
                                        className={`w-8 h-8 transition-colors ${star <= (hoverRating || rating)
                                            ? "fill-amber-400 text-amber-400"
                                            : "text-muted-foreground"
                                            }`}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="review-title" className="text-right block">
                            عنوان المراجعة (اختياري)
                        </Label>
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
                        <Label htmlFor="review-comment" className="text-right block">
                            تفاصيل المراجعة (اختياري)
                        </Label>
                        <Textarea
                            id="review-comment"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="شاركنا تجربتك مع هذا المنتج..."
                            className="text-right min-h-[100px] resize-none"
                            dir="rtl"
                            maxLength={2000}
                        />
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        disabled={isSubmitting || rating === 0}
                        className="w-full gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                جاري الإرسال...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                إرسال المراجعة
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
