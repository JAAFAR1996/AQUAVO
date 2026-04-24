/**
 * AQUAVO Checkout Loyalty Section
 * ================================
 * عرض خيار استخدام رصيد الباقي عند الشراء
 * ⚠️ نقاط الولاء لا تُصرف - للعضوية فقط
 * فقط رصيد الباقي (cashback) يُستخدم كخصم
 */

import { useState, useEffect, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Coins, Loader2, Info } from "lucide-react";
import { formatIQD } from "@/lib/utils";
import { useLoyaltyBalance, previewRedeem, type RedeemPreview } from "@/hooks/use-loyalty";

interface CheckoutLoyaltySectionProps {
    cartTotal: number;
    onPointsChange: (data: {
        usePoints: boolean;
        useCashback: boolean;
        pointsToUse: number;
        cashbackToUse: number;
        pointsDiscount: number;
        roundedAmount: number;
        cashbackEarned: number;
    }) => void;
}

export function CheckoutLoyaltySection({ cartTotal, onPointsChange }: CheckoutLoyaltySectionProps) {
    const { data: balance, isLoading } = useLoyaltyBalance();
    const [useCashback, setUseCashback] = useState(false);
    const [preview, setPreview] = useState<RedeemPreview | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

    const hasCashback = (balance?.cashbackBalance ?? 0) > 0;

    // Fetch redemption preview when toggle changes
    const fetchPreview = useCallback(async () => {
        if (!useCashback) {
            setPreview(null);
            onPointsChange({
                usePoints: false,
                useCashback: false,
                pointsToUse: 0,
                cashbackToUse: 0,
                pointsDiscount: 0,
                roundedAmount: cartTotal,
                cashbackEarned: 0,
            });
            return;
        }

        setIsLoadingPreview(true);
        try {
            const result = await previewRedeem(cartTotal, false, useCashback);
            setPreview(result);
            onPointsChange({
                usePoints: false, // نقاط الولاء لا تُصرف أبداً
                useCashback,
                pointsToUse: 0,
                cashbackToUse: result.cashbackUsed,
                pointsDiscount: result.totalDiscount,
                roundedAmount: result.amountToPay,
                cashbackEarned: result.rounding.cashbackEarned,
            });
        } catch (error) {
            console.error("Preview redemption failed:", error);
            setPreview(null);
        } finally {
            setIsLoadingPreview(false);
        }
    }, [useCashback, cartTotal, onPointsChange]);

    useEffect(() => {
        const timer = setTimeout(fetchPreview, 300); // debounce
        return () => clearTimeout(timer);
    }, [fetchPreview]);

    if (isLoading || !balance || !hasCashback) {
        return null; // Don't show section if no cashback balance
    }

    return (
        <div className="border border-border/60 rounded-lg p-4 space-y-3">
            {/* Toggle row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Coins className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-medium">استخدام رصيد الباقي</p>
                        <p className="text-xs text-muted-foreground">
                            {balance.cashbackBalance.toLocaleString()} نقطة = {formatIQD(balance.cashbackValueIQD)}
                        </p>
                    </div>
                </div>
                <Switch
                    checked={useCashback}
                    onCheckedChange={setUseCashback}
                    disabled={!hasCashback}
                />
            </div>

            {/* Preview */}
            {isLoadingPreview ? (
                <div className="flex items-center justify-center py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mr-2">جاري الحساب...</span>
                </div>
            ) : preview && useCashback ? (
                <div className="space-y-1.5">
                    {preview.totalDiscount > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-green-600 dark:text-green-400">خصم رصيد الباقي</span>
                            <span className="font-medium text-green-600 dark:text-green-400">
                                -{formatIQD(preview.totalDiscount)}
                            </span>
                        </div>
                    )}
                    {preview.rounding.cashbackEarned > 0 && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            باقي تقريب يُضاف لرصيدك: +{preview.rounding.cashbackEarned} نقطة
                        </p>
                    )}
                </div>
            ) : null}

            {/* توضيح */}
            <p className="text-[11px] text-muted-foreground/70 text-center">
                رصيد الباقي = فلوسك من فرق التقريب. تگدر تستخدمه كله كخصم
            </p>
        </div>
    );
}
