/**
 * AQUAVO Checkout Loyalty Section
 * ================================
 * عرض خيار استخدام نقاط الولاء والباقي عند الشراء
 */

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Coins, Gift, Sparkles, Info, Loader2 } from "lucide-react";
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
    const [usePoints, setUsePoints] = useState(false);
    const [useCashback, setUseCashback] = useState(false);
    const [preview, setPreview] = useState<RedeemPreview | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

    const hasPoints = (balance?.loyaltyPoints ?? 0) > 0;
    const hasCashback = (balance?.cashbackBalance ?? 0) > 0;
    const hasAny = hasPoints || hasCashback;

    // Fetch redemption preview when toggles change
    const fetchPreview = useCallback(async () => {
        if (!usePoints && !useCashback) {
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
            const result = await previewRedeem(cartTotal, usePoints, useCashback);
            setPreview(result);
            onPointsChange({
                usePoints,
                useCashback,
                pointsToUse: result.loyaltyPointsUsed,
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
    }, [usePoints, useCashback, cartTotal, onPointsChange]);

    useEffect(() => {
        const timer = setTimeout(fetchPreview, 300); // debounce
        return () => clearTimeout(timer);
    }, [fetchPreview]);

    if (isLoading || !balance || !hasAny) {
        return null; // Don't show section if no points
    }

    return (
        <Card className="bg-gradient-to-br from-primary/5 to-cyan-500/5 border-primary/20 p-4 space-y-4">
            <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-primary" />
                <span className="font-semibold text-sm">استخدام النقاط</span>
                <Badge variant="outline" className="text-xs gap-1">
                    {balance.tier === "diamond" ? "💎" : balance.tier === "gold" ? "🥇" : balance.tier === "silver" ? "🥈" : "🥉"}
                    {balance.tierInfo.name}
                </Badge>
            </div>

            {/* Loyalty Points Toggle */}
            {hasPoints && (
                <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Gift className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">نقاط الولاء</p>
                            <p className="text-xs text-muted-foreground">
                                {balance.loyaltyPoints.toLocaleString()} نقطة = {formatIQD(balance.loyaltyValueIQD)}
                            </p>
                        </div>
                    </div>
                    <Switch
                        checked={usePoints}
                        onCheckedChange={setUsePoints}
                        disabled={!hasPoints}
                    />
                </div>
            )}

            {/* Cashback Toggle */}
            {hasCashback && (
                <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">رصيد الباقي</p>
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
            )}

            {/* Preview Summary */}
            {isLoadingPreview ? (
                <div className="flex items-center justify-center py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mr-2">جاري الحساب...</span>
                </div>
            ) : preview && (usePoints || useCashback) ? (
                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 space-y-2 border border-green-100 dark:border-green-900">
                    {preview.totalDiscount > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-green-700 dark:text-green-400">خصم النقاط:</span>
                            <span className="font-bold text-green-700 dark:text-green-400">
                                -{formatIQD(preview.totalDiscount)}
                            </span>
                        </div>
                    )}
                    {preview.rounding.cashbackEarned > 0 && (
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Info className="w-3 h-3" />
                                باقي تقريب يُضاف لرصيدك:
                            </span>
                            <span>+{preview.rounding.cashbackEarned} نقطة</span>
                        </div>
                    )}
                </div>
            ) : null}
        </Card>
    );
}
