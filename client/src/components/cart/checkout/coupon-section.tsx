import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tag, AlertCircle, CheckCircle2, ChevronDown } from "lucide-react";

interface CouponSectionProps {
    couponCode: string;
    setCouponCode: (code: string) => void;
    applyCoupon: () => void;
    couponError: string;
    couponSuccess: string;
    isApplying?: boolean;
}

export function CouponSection({ couponCode, setCouponCode, applyCoupon, couponError, couponSuccess, isApplying = false }: CouponSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const messageId = couponError ? "coupon-error" : couponSuccess ? "coupon-success" : undefined;

    return (
        <div className="border border-border/60 rounded-lg overflow-hidden">
            {/* Collapsible header */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm text-muted-foreground hover:bg-muted/30 transition-colors"
            >
                <span className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    عندك كود خصم؟
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {/* Expandable content */}
            {isExpanded && (
                <div className="px-4 pb-3 space-y-2">
                    <Label htmlFor="coupon-code" className="sr-only">
                        كود الخصم
                    </Label>
                    <div className="flex gap-2">
                        <Input
                            id="coupon-code"
                            data-clarity-mask="True"
                            placeholder="أدخل الكود..."
                            autoComplete="off"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            className="flex-1 h-9 text-sm"
                            dir="ltr"
                            disabled={isApplying}
                            aria-invalid={!!couponError}
                            aria-describedby={messageId}
                        />
                        <Button
                            type="button"
                            onClick={applyCoupon}
                            variant="default"
                            size="sm"
                            className="h-9 px-4"
                            disabled={isApplying}
                            aria-busy={isApplying}
                            aria-disabled={isApplying}
                        >
                            {isApplying ? "جاري التحقق..." : "تطبيق"}
                        </Button>
                    </div>
                    {couponError && (
                        <p id="coupon-error" role="alert" className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" />
                            {couponError}
                        </p>
                    )}
                    {couponSuccess && (
                        <p id="coupon-success" role="status" aria-live="polite" className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                            {couponSuccess}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
