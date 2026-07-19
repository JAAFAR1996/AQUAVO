import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tag, AlertCircle, CheckCircle2, ChevronDown, Loader2, X } from "lucide-react";
import { formatIQD } from "@/lib/utils";
import { COUPON_MESSAGES } from "@/lib/coupon-messages";

interface AppliedCoupon {
    code: string;
    type?: string;
    value?: number;
}

interface CouponSectionProps {
    couponCode: string;
    setCouponCode: (code: string) => void;
    applyCoupon: () => void;
    couponError: string;
    couponSuccess: string;
    /** True while /validate is in flight — disables Apply and shows a checking state. */
    isChecking?: boolean;
    /** Set once a coupon is successfully applied — switches to the applied summary. */
    appliedCoupon?: AppliedCoupon | null;
    /** Discount amount in IQD. */
    couponDiscount?: number;
    /** Order total after the discount, for the applied summary. */
    newTotal?: number;
    /** Remove the applied coupon. */
    onRemove?: () => void;
}

export function CouponSection({
    couponCode, setCouponCode, applyCoupon, couponError, couponSuccess,
    isChecking = false, appliedCoupon = null, couponDiscount = 0, newTotal, onRemove,
}: CouponSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const isApplied = Boolean(appliedCoupon);

    return (
        <div className="border border-border/60 rounded-lg overflow-hidden">
            {/* Collapsible header */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-expanded={isExpanded || isApplied}
                className="w-full flex items-center justify-between px-4 py-3 text-sm text-muted-foreground hover:bg-muted/30 transition-colors"
            >
                <span className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    {isApplied ? "كود الخصم مطبّق" : "عندك كود خصم؟"}
                </span>
                {isApplied ? (
                    <CheckCircle2 className="h-4 w-4 text-[#0B93A6]" />
                ) : (
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                )}
            </button>

            {/* Applied summary — code + discount + new total + remove */}
            {isApplied ? (
                <div className="px-4 pb-3">
                    <div role="status" aria-live="polite" className="rounded-lg border border-[#0B93A6]/30 bg-[#0B93A6]/5 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-sm font-semibold text-[#0B93A6]">
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                {COUPON_MESSAGES.applied}
                            </span>
                            {onRemove && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={onRemove}
                                    className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                                >
                                    <X className="h-3.5 w-3.5" />
                                    إزالة
                                </Button>
                            )}
                        </div>
                        {couponSuccess && couponSuccess !== COUPON_MESSAGES.applied && (
                            <p className="text-xs font-medium text-[#0B93A6]">{couponSuccess}</p>
                        )}
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">الكود</span>
                            <span className="font-mono font-semibold text-foreground" dir="ltr">{appliedCoupon?.code}</span>
                        </div>
                        {couponDiscount > 0 && (
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">قيمة الخصم</span>
                                <span className="font-semibold text-[#0B93A6]">- {formatIQD(couponDiscount)}</span>
                            </div>
                        )}
                        {typeof newTotal === "number" && (
                            <div className="flex items-center justify-between border-t border-border/50 pt-2 text-sm">
                                <span className="font-medium text-foreground">المجموع بعد الخصم</span>
                                <span className="font-bold text-foreground">{formatIQD(newTotal)}</span>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                isExpanded && (
                    <div className="px-4 pb-3 space-y-2">
                        <div className="flex gap-2">
                            <Input
                                data-clarity-mask="True"
                                placeholder="أدخل الكود..."
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter" && !isChecking) { e.preventDefault(); applyCoupon(); } }}
                                disabled={isChecking}
                                className="flex-1 h-9 text-sm"
                                dir="ltr"
                                aria-label="كود الخصم"
                                aria-invalid={Boolean(couponError)}
                                aria-describedby={couponError ? "coupon-error" : undefined}
                            />
                            <Button
                                type="button"
                                onClick={applyCoupon}
                                variant="default"
                                size="sm"
                                className="h-9 px-4 gap-1.5"
                                disabled={isChecking}
                                aria-busy={isChecking}
                            >
                                {isChecking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                                {isChecking ? "جارٍ التحقق..." : "تطبيق"}
                            </Button>
                        </div>

                        {/* Failure: assertive alert, linked to the input via aria-describedby */}
                        {!isChecking && couponError && (
                            <p id="coupon-error" role="alert" className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                                {couponError}
                            </p>
                        )}
                        {/* Checking / success: polite live region */}
                        <div role="status" aria-live="polite" className="min-h-[1rem]">
                            {isChecking && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />
                                    {COUPON_MESSAGES.checking}
                                </p>
                            )}
                            {!isChecking && !couponError && couponSuccess && (
                                <p className="text-xs text-[#0B93A6] flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                                    {couponSuccess}
                                </p>
                            )}
                        </div>
                    </div>
                )
            )}
        </div>
    );
}
