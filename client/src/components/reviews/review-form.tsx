import { useState } from "react";
import { Star, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";
import { useTranslation } from "react-i18next";

interface ReviewFormProps {
    productId: string;
    onReviewSubmitted?: () => void;
}

export function ReviewForm({ productId, onReviewSubmitted }: ReviewFormProps) {
  const { t } = useTranslation("pages");
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
                title: t("review-form.s1"),
                description: t("review-form.s2"),
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch("/api/reviews", {
                method: "POST",
                headers: addCsrfHeader({ "Content-Type": "application/json" }),
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
                throw new Error(data.message || t("review-form.s3"));
            }

            toast({
                title: t("review-form.s4"),
                description: t("review-form.s5"),
            });

            // Reset form
            setRating(0);
            setTitle("");
            setComment("");

            onReviewSubmitted?.();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : t("review-form.s6");
            toast({
                title: t("review-form.s1"),
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
                <CardTitle className="text-lg font-bold text-right">{t("review-form.s7")}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Star Rating */}
                    <div className="space-y-2">
                        <Label className="text-right block">{t("review-form.s8")}</Label>
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
                            {t("review-form.s9")}
                        </Label>
                        <Input
                            id="review-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t("review-form.s10")}
                            className="text-right"
                            dir="rtl"
                            maxLength={100}
                        />
                    </div>

                    {/* Comment */}
                    <div className="space-y-2">
                        <Label htmlFor="review-comment" className="text-right block">
                            {t("review-form.s11")}
                        </Label>
                        <Textarea
                            id="review-comment"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder={t("review-form.s12")}
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
                                {t("review-form.s13")}
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                {t("review-form.s14")}
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
