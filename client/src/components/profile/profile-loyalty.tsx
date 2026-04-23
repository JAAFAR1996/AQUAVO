import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Crown, Star, Gift, TrendingUp, Users, ShoppingCart, History, Coins, ArrowUpCircle, ArrowDownCircle, Sparkles, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { useLoyaltyBalance, useLoyaltyHistory } from "@/hooks/use-loyalty";
import { formatIQD } from "@/lib/utils";

// Tier configuration - must match backend MEMBERSHIP_TIERS (spent-based)
const TIER_CONFIG = {
    bronze: {
        label: "برونزي",
        minSpent: 0,
        color: "text-amber-700 bg-amber-100 dark:bg-amber-900/30",
        iconBg: "bg-amber-500",
        icon: Star,
    },
    silver: {
        label: "فضي",
        minSpent: 150_000,
        color: "text-slate-500 bg-slate-100 dark:bg-slate-900/30",
        iconBg: "bg-slate-500",
        icon: Star,
    },
    gold: {
        label: "ذهبي",
        minSpent: 500_000,
        color: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30",
        iconBg: "bg-yellow-500",
        icon: Crown,
    },
    diamond: {
        label: "ماسي",
        minSpent: 1_500_000,
        color: "text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30",
        iconBg: "bg-cyan-500",
        icon: Crown,
    },
} as const;

type TierKey = keyof typeof TIER_CONFIG;
const TIER_ORDER: TierKey[] = ["bronze", "silver", "gold", "diamond"];

export const tierLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    bronze: { label: "برونزي", color: "text-amber-700", icon: <Star className="w-4 h-4" /> },
    silver: { label: "فضي", color: "text-slate-500", icon: <Star className="w-4 h-4" /> },
    gold: { label: "ذهبي", color: "text-yellow-500", icon: <Crown className="w-4 h-4" /> },
    diamond: { label: "ماسي", color: "text-cyan-500", icon: <Crown className="w-4 h-4" /> },
    // Fallback for any unknown tier
    platinum: { label: "بلاتيني", color: "text-purple-500", icon: <Crown className="w-4 h-4" /> },
};

export function getTierFromPoints(points: number): string {
    // This function is kept for backward compatibility
    // The actual tier comes from the API based on totalSpent
    if (points >= 2000) return "diamond";
    if (points >= 1000) return "gold";
    if (points >= 500) return "silver";
    return "bronze";
}

interface ProfileLoyaltyProps {
    loyaltyPoints: number;
    loyaltyTier: string;
    cashbackBalance?: number;
    birthDate?: string | null;
}

export function ProfileLoyalty({ loyaltyPoints: fallbackPoints, loyaltyTier: fallbackTier }: ProfileLoyaltyProps) {
    // Fetch real data from API
    const { data: balance, isLoading: isLoadingBalance } = useLoyaltyBalance();
    const { data: history, isLoading: isLoadingHistory } = useLoyaltyHistory(10);

    // Use API data or fallback
    const actualPoints = balance?.loyaltyPoints ?? fallbackPoints;
    const actualTier = (balance?.tier ?? fallbackTier) as TierKey;
    const cashbackBalance = balance?.cashbackBalance ?? 0;
    const totalSpent = balance?.totalSpent ?? 0;
    const progressPercent = balance?.progressPercent ?? 0;
    const amountToNextTier = balance?.amountToNextTier;
    const tierInfo = balance?.tierInfo;

    const currentTierConfig = TIER_CONFIG[actualTier] || TIER_CONFIG.bronze;
    const currentIndex = TIER_ORDER.indexOf(actualTier);
    const nextTier = currentIndex < TIER_ORDER.length - 1 ? TIER_ORDER[currentIndex + 1] : null;
    const nextTierConfig = nextTier ? TIER_CONFIG[nextTier] : null;
    const CurrentIcon = currentTierConfig.icon;

    // Transaction type labels and icons
    const getTransactionInfo = (type: string, amount: number) => {
        switch (type) {
            case "purchase_earn":
                return { label: "شراء", icon: <ShoppingCart className="w-4 h-4 text-green-500" />, color: "text-green-600" };
            case "referral_earn":
                return { label: "إحالة", icon: <Users className="w-4 h-4 text-blue-500" />, color: "text-blue-600" };
            case "review_earn":
                return { label: "تقييم", icon: <Star className="w-4 h-4 text-yellow-500" />, color: "text-yellow-600" };
            case "rounding_earn":
                return { label: "باقي", icon: <Coins className="w-4 h-4 text-purple-500" />, color: "text-purple-600" };
            case "redeem":
                return { label: "استبدال", icon: <ArrowDownCircle className="w-4 h-4 text-red-500" />, color: "text-red-600" };
            case "tier_bonus":
                return { label: "ترقية", icon: <ArrowUpCircle className="w-4 h-4 text-cyan-500" />, color: "text-cyan-600" };
            default:
                return { label: type, icon: <Sparkles className="w-4 h-4 text-gray-500" />, color: "text-gray-600" };
        }
    };

    if (isLoadingBalance) {
        return (
            <Card className="overflow-hidden">
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-primary/5 to-cyan-500/5 border-b">
                <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    برنامج الولاء
                </CardTitle>
                <CardDescription>اجمع النقاط واحصل على خصومات حصرية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                {/* Points Display */}
                <div className="bg-gradient-to-br from-primary/10 to-cyan-500/10 rounded-2xl p-6 text-center relative overflow-hidden">
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl" />

                    <div className="relative">
                        {/* Two columns: loyalty points + cashback */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">نقاط الولاء</p>
                                <p className="text-4xl font-bold bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
                                    {actualPoints.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    تساوي {formatIQD(balance?.loyaltyValueIQD ?? actualPoints * 20)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">رصيد الباقي</p>
                                <p className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                                    {cashbackBalance.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    تساوي {formatIQD(balance?.cashbackValueIQD ?? cashbackBalance)}
                                </p>
                            </div>
                        </div>

                        {/* Total Value */}
                        <div className="bg-white/50 dark:bg-white/5 rounded-lg px-4 py-2 mb-4">
                            <p className="text-sm font-semibold">
                                إجمالي القيمة: <span className="text-primary">{formatIQD(balance?.totalValueIQD ?? 0)}</span>
                            </p>
                        </div>

                        {/* Current Tier Badge */}
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${currentTierConfig.color} mb-4`}>
                            <CurrentIcon className="w-4 h-4" />
                            <span className="font-semibold">عضو {currentTierConfig.label}</span>
                            {tierInfo && tierInfo.discountPercent > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                    خصم {tierInfo.discountPercent}%
                                </Badge>
                            )}
                        </div>

                        {/* Progress to Next Tier */}
                        {nextTierConfig && amountToNextTier && amountToNextTier > 0 ? (
                            <div className="mt-4">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-muted-foreground">التقدم نحو {nextTierConfig.label}</span>
                                    <span className="font-medium text-primary">{Math.round(progressPercent)}%</span>
                                </div>
                                <Progress value={progressPercent} className="h-3" />
                                <p className="text-sm text-muted-foreground mt-2">
                                    تحتاج مشتريات بقيمة <strong className="text-primary">{formatIQD(amountToNextTier)}</strong> للترقية
                                </p>
                            </div>
                        ) : (
                            <div className="mt-4 p-3 bg-gradient-to-r from-cyan-500/10 to-pink-500/10 rounded-xl">
                                <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400">
                                    🎉 تهانينا! أنت في أعلى مستوى - عضو {currentTierConfig.label}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tiers Progress */}
                <div className="grid grid-cols-4 gap-2 sm:gap-4">
                    {TIER_ORDER.map((tierKey) => {
                        const tier = TIER_CONFIG[tierKey];
                        const isCurrentTier = tierKey === actualTier;
                        const isAchieved = totalSpent >= tier.minSpent;
                        const TierIcon = tier.icon;

                        return (
                            <div
                                key={tierKey}
                                className={`text-center p-3 sm:p-4 rounded-xl transition-all ${isCurrentTier
                                    ? "bg-primary/10 border-2 border-primary shadow-lg scale-105"
                                    : isAchieved
                                        ? "bg-muted/80"
                                        : "bg-muted/30 opacity-60"
                                    }`}
                            >
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${isCurrentTier ? tier.iconBg : isAchieved ? "bg-green-500" : "bg-muted"
                                    }`}>
                                    {isAchieved && !isCurrentTier ? (
                                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                    ) : (
                                        <TierIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${isCurrentTier || isAchieved ? "text-white" : "text-muted-foreground"}`} />
                                    )}
                                </div>
                                <p className={`font-semibold text-xs sm:text-sm ${isCurrentTier ? "text-primary" : ""}`}>
                                    {tier.label}
                                </p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">
                                    {tier.minSpent > 0 ? `${(tier.minSpent / 1000).toLocaleString()}K` : "بداية"}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* How to earn */}
                <div className="bg-muted/50 rounded-xl p-6">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <Gift className="w-5 h-5 text-primary" />
                        كيف تجمع النقاط؟
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                <ShoppingCart className="w-5 h-5 text-green-500" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">عند الشراء</p>
                                <p className="text-xs text-muted-foreground">نقطة لكل 5,000 د.ع</p>
                                <p className="text-xs text-muted-foreground">+ باقي التقريب كـ cashback</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                                <Star className="w-5 h-5 text-yellow-500" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">تقييم المنتجات</p>
                                <p className="text-xs text-muted-foreground">كل تقييم = 10 نقاط</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                <Users className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">دعوة الأصدقاء</p>
                                <p className="text-xs text-muted-foreground">50 نقطة عند التسجيل + 25 عند أول شراء</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Benefits Summary */}
                <div className="border rounded-xl p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        مزايا مستواك الحالي
                    </h4>
                    <div className="space-y-2">
                        {tierInfo?.benefits?.map((benefit: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                <span>{benefit}</span>
                            </div>
                        )) ?? (
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>نقطة لكل 5,000 دينار</span>
                            </div>
                        )}
                        {tierInfo && tierInfo.pointMultiplier > 1 && (
                            <div className="flex items-center gap-2 text-sm">
                                <Sparkles className="w-4 h-4 text-yellow-500" />
                                <span>مضاعف النقاط: {tierInfo.pointMultiplier}x</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Transaction History */}
                <div className="border rounded-xl p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <History className="w-5 h-5 text-primary" />
                        سجل حركات النقاط
                    </h4>
                    {isLoadingHistory ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : history && history.length > 0 ? (
                        <div className="space-y-3">
                            {history.map((tx) => {
                                const info = getTransactionInfo(tx.type, tx.amount);
                                return (
                                    <div key={tx.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                            {info.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{tx.description}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(tx.createdAt).toLocaleDateString("ar-IQ", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric",
                                                })}
                                            </p>
                                        </div>
                                        <div className={`text-sm font-bold ${tx.amount > 0 ? "text-green-600" : "text-red-500"}`}>
                                            {tx.amount > 0 ? "+" : ""}{tx.amount}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            لا توجد حركات بعد. ابدأ بالشراء لكسب النقاط! 🎉
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
