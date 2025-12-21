import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Crown, Star, Gift, TrendingUp, Users, ShoppingCart } from "lucide-react";
import { useMemo } from "react";

// Tier configuration
const TIER_CONFIG = {
    bronze: {
        label: "برونزي",
        minPoints: 0,
        maxPoints: 500,
        color: "text-amber-700 bg-amber-100 dark:bg-amber-900/30",
        iconBg: "bg-amber-500",
        discount: 0,
        icon: Star,
    },
    silver: {
        label: "فضي",
        minPoints: 500,
        maxPoints: 1000,
        color: "text-slate-500 bg-slate-100 dark:bg-slate-900/30",
        iconBg: "bg-slate-500",
        discount: 5,
        icon: Star,
    },
    gold: {
        label: "ذهبي",
        minPoints: 1000,
        maxPoints: 2000,
        color: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30",
        iconBg: "bg-yellow-500",
        discount: 10,
        icon: Crown,
    },
    platinum: {
        label: "بلاتيني",
        minPoints: 2000,
        maxPoints: Infinity,
        color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30",
        iconBg: "bg-purple-500",
        discount: 15,
        icon: Crown,
    },
} as const;

type TierKey = keyof typeof TIER_CONFIG;
const TIER_ORDER: TierKey[] = ["bronze", "silver", "gold", "platinum"];

export const tierLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    bronze: { label: "برونزي", color: "text-amber-700", icon: <Star className="w-4 h-4" /> },
    silver: { label: "فضي", color: "text-slate-500", icon: <Star className="w-4 h-4" /> },
    gold: { label: "ذهبي", color: "text-yellow-500", icon: <Crown className="w-4 h-4" /> },
    platinum: { label: "بلاتيني", color: "text-purple-500", icon: <Crown className="w-4 h-4" /> },
};

function getTierFromPoints(points: number): TierKey {
    if (points >= 2000) return "platinum";
    if (points >= 1000) return "gold";
    if (points >= 500) return "silver";
    return "bronze";
}

function getNextTier(currentTier: TierKey): TierKey | null {
    const currentIndex = TIER_ORDER.indexOf(currentTier);
    if (currentIndex < TIER_ORDER.length - 1) {
        return TIER_ORDER[currentIndex + 1];
    }
    return null;
}

interface ProfileLoyaltyProps {
    loyaltyPoints: number;
    loyaltyTier: string;
}

export function ProfileLoyalty({ loyaltyPoints, loyaltyTier }: ProfileLoyaltyProps) {
    // Calculate actual tier based on points
    const actualTier = useMemo(() => getTierFromPoints(loyaltyPoints), [loyaltyPoints]);
    const currentTierConfig = TIER_CONFIG[actualTier];
    const nextTier = getNextTier(actualTier);
    const nextTierConfig = nextTier ? TIER_CONFIG[nextTier] : null;

    // Calculate progress to next tier
    const progress = useMemo(() => {
        if (!nextTierConfig) return 100; // Already at max tier
        const pointsInCurrentTier = loyaltyPoints - currentTierConfig.minPoints;
        const pointsNeededForNextTier = nextTierConfig.minPoints - currentTierConfig.minPoints;
        return Math.min(100, (pointsInCurrentTier / pointsNeededForNextTier) * 100);
    }, [loyaltyPoints, currentTierConfig, nextTierConfig]);

    const pointsToNextTier = nextTierConfig
        ? nextTierConfig.minPoints - loyaltyPoints
        : 0;

    const CurrentIcon = currentTierConfig.icon;

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
                        <p className="text-sm text-muted-foreground mb-2">رصيد نقاطك</p>
                        <p className="text-6xl font-bold bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent mb-2">
                            {loyaltyPoints.toLocaleString()}
                        </p>

                        {/* Current Tier Badge */}
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${currentTierConfig.color} mb-4`}>
                            <CurrentIcon className="w-4 h-4" />
                            <span className="font-semibold">عضو {currentTierConfig.label}</span>
                            {currentTierConfig.discount > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                    خصم {currentTierConfig.discount}%
                                </Badge>
                            )}
                        </div>

                        {/* Progress to Next Tier */}
                        {nextTierConfig && (
                            <div className="mt-4">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-muted-foreground">التقدم نحو {nextTierConfig.label}</span>
                                    <span className="font-medium text-primary">{Math.round(progress)}%</span>
                                </div>
                                <Progress value={progress} className="h-3" />
                                <p className="text-sm text-muted-foreground mt-2">
                                    تحتاج <strong className="text-primary">{pointsToNextTier.toLocaleString()}</strong> نقطة للترقية
                                </p>
                            </div>
                        )}

                        {!nextTierConfig && (
                            <div className="mt-4 p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl">
                                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                    🎉 تهانينا! أنت في أعلى مستوى
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tiers Progress */}
                <div className="grid grid-cols-4 gap-2 sm:gap-4">
                    {TIER_ORDER.map((tierKey, index) => {
                        const tier = TIER_CONFIG[tierKey];
                        const isCurrentTier = tierKey === actualTier;
                        const isAchieved = loyaltyPoints >= tier.minPoints;
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
                                    {tier.minPoints.toLocaleString()} نقطة
                                </p>
                                {tier.discount > 0 && (
                                    <Badge variant="outline" className="text-[10px] mt-1">
                                        {tier.discount}% خصم
                                    </Badge>
                                )}
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
                                <p className="text-xs text-muted-foreground">كل 1,000 د.ع = 10 نقاط</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                                <Star className="w-5 h-5 text-yellow-500" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">تقييم المنتجات</p>
                                <p className="text-xs text-muted-foreground">كل تقييم = 5 نقاط</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                <Users className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">دعوة الأصدقاء</p>
                                <p className="text-xs text-muted-foreground">كل دعوة = 50 نقطة</p>
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
                        {currentTierConfig.discount > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>خصم {currentTierConfig.discount}% على جميع المشتريات</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>أولوية في الشحن</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>عروض حصرية للأعضاء</span>
                        </div>
                        {actualTier === "gold" || actualTier === "platinum" ? (
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>دعم فني متميز على مدار الساعة</span>
                            </div>
                        ) : null}
                        {actualTier === "platinum" && (
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>هدايا مجانية مع كل طلب</span>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
