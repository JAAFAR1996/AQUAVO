import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Crown, Star, Gift, TrendingUp, Users, ShoppingCart, History, Coins, ArrowUpCircle, ArrowDownCircle, Sparkles, Loader2, Clock, ShieldCheck, Fish, ClipboardList, AlertCircle, Award, Target, Lock, Wrench } from "lucide-react";
import { useState } from "react";
import { useLoyaltyBalance, useLoyaltyHistory, useMilestones, useBadges, useChallenges, useWinback, useRecommendations, saveAquariumProfile } from "@/hooks/use-loyalty";
import { formatIQD } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

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
        minSpent: 400_000,
        color: "text-slate-500 bg-slate-100 dark:bg-slate-900/30",
        iconBg: "bg-slate-500",
        icon: Star,
    },
    gold: {
        label: "ذهبي",
        minSpent: 1_200_000,
        color: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30",
        iconBg: "bg-yellow-500",
        icon: Crown,
    },
    diamond: {
        label: "ماسي",
        minSpent: 3_000_000,
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
    const { data: milestonesData } = useMilestones();
    const { data: badgesData } = useBadges();
    const { data: challengesData } = useChallenges();
    const { data: winbackData } = useWinback();
    const { data: recommendationsData } = useRecommendations();
    const queryClient = useQueryClient();

    // Quiz state
    const [showQuiz, setShowQuiz] = useState(false);
    const [quizSubmitting, setQuizSubmitting] = useState(false);
    const [quizResult, setQuizResult] = useState<{ points: number; alreadyCompleted: boolean } | null>(null);
    const [quizForm, setQuizForm] = useState({ tankSize: "", fishType: "", mainProblem: "", tankAge: "" });

    // Use API data or fallback
    const actualPoints = balance?.loyaltyPoints ?? fallbackPoints;
    const actualTier = (balance?.tier ?? fallbackTier) as TierKey;
    const cashbackBalance = balance?.cashbackBalance ?? 0;
    const pendingLoyaltyPoints = balance?.pendingLoyaltyPoints ?? 0;
    const pendingCashbackBalance = balance?.pendingCashbackBalance ?? 0;
    const totalSpent = balance?.totalSpent ?? 0;
    const progressPercent = balance?.progressPercent ?? 0;
    const amountToNextTier = balance?.amountToNextTier;
    const tierInfo = balance?.tierInfo;
    const welcomeBonusClaimed = balance?.welcomeBonusClaimed ?? false;
    const aquariumProfile = balance?.aquariumProfile;

    const currentTierConfig = TIER_CONFIG[actualTier] || TIER_CONFIG.bronze;
    const currentIndex = TIER_ORDER.indexOf(actualTier);
    const nextTier = currentIndex < TIER_ORDER.length - 1 ? TIER_ORDER[currentIndex + 1] : null;
    const nextTierConfig = nextTier ? TIER_CONFIG[nextTier] : null;
    const CurrentIcon = currentTierConfig.icon;

    const handleQuizSubmit = async () => {
        if (!quizForm.tankSize || !quizForm.fishType || !quizForm.mainProblem || !quizForm.tankAge) return;
        setQuizSubmitting(true);
        try {
            const result = await saveAquariumProfile(quizForm);
            setQuizResult(result);
            queryClient.invalidateQueries({ queryKey: ["/api/loyalty/balance"] });
            queryClient.invalidateQueries({ queryKey: ["/api/loyalty/history"] });
        } catch (e) {
            console.error("Quiz submit failed:", e);
        } finally {
            setQuizSubmitting(false);
        }
    };

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
            case "welcome_bonus":
                return { label: "ترحيب", icon: <Gift className="w-4 h-4 text-emerald-500" />, color: "text-emerald-600" };
            case "quiz_earn":
                return { label: "استبيان", icon: <ClipboardList className="w-4 h-4 text-indigo-500" />, color: "text-indigo-600" };
            case "bonus_reveal":
                return { label: "مكافأة", icon: <Sparkles className="w-4 h-4 text-pink-500" />, color: "text-pink-600" };
            case "order_cancelled":
                return { label: "إلغاء", icon: <ArrowDownCircle className="w-4 h-4 text-red-500" />, color: "text-red-600" };
            case "badge_earn":
                return { label: "شارة", icon: <Award className="w-4 h-4 text-amber-500" />, color: "text-amber-600" };
            case "challenge_complete":
                return { label: "تحدي", icon: <Target className="w-4 h-4 text-teal-500" />, color: "text-teal-600" };
            case "monthly_completion":
                return { label: "ختم الشهر", icon: <CheckCircle className="w-4 h-4 text-green-500" />, color: "text-green-600" };
            case "winback":
                return { label: "رجعة", icon: <Gift className="w-4 h-4 text-emerald-500" />, color: "text-emerald-600" };
            case "ai_bonus":
                return { label: "ذكي", icon: <Sparkles className="w-4 h-4 text-violet-500" />, color: "text-violet-600" };
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

                        {/* Pending Balances */}
                        {(pendingLoyaltyPoints > 0 || pendingCashbackBalance > 0) && (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">أرصدة مجمدة (بانتظار تأكيد الاستلام)</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {pendingLoyaltyPoints > 0 && (
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">+{pendingLoyaltyPoints.toLocaleString()}</p>
                                            <p className="text-xs text-muted-foreground">نقاط ولاء</p>
                                        </div>
                                    )}
                                    {pendingCashbackBalance > 0 && (
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">+{pendingCashbackBalance.toLocaleString()}</p>
                                            <p className="text-xs text-muted-foreground">نقاط باقي</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

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

                {/* Milestone Alerts */}
                {milestonesData && milestonesData.milestones.length > 0 && (
                    <div className="space-y-2">
                        {milestonesData.milestones.map((m, i) => (
                            <div key={i} className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-xl p-4">
                                <AlertCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium">{m.message}</p>
                                    {m.tier && (
                                        <Badge variant="secondary" className="mt-1 text-xs">
                                            {TIER_CONFIG[m.tier as TierKey]?.label ?? m.tier}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Winback Banner */}
                {winbackData && winbackData.type !== "none" && winbackData.message && (
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                <Gift className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{winbackData.message}</p>
                                {winbackData.type === "discount" && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        الكوبون مفعّل بحسابك — استخدمه بطلبك القادم
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Aquarium Quiz — if not completed */}
                {!aquariumProfile && !quizResult && (
                    <div className="border border-indigo-200 dark:border-indigo-800 rounded-xl overflow-hidden">
                        <div className="bg-indigo-50 dark:bg-indigo-950/30 px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Fish className="w-5 h-5 text-indigo-500" />
                                <span className="font-semibold text-sm">ملف حوضك الشخصي</span>
                            </div>
                            <Badge variant="secondary" className="text-xs">+30 نقطة</Badge>
                        </div>
                        {!showQuiz ? (
                            <div className="p-4 text-center">
                                <p className="text-sm text-muted-foreground mb-3">
                                    أجب على 4 أسئلة بسيطة واحصل على 30 نقطة ولاء
                                </p>
                                <Button variant="outline" size="sm" onClick={() => setShowQuiz(true)}>
                                    ابدأ الاستبيان
                                </Button>
                            </div>
                        ) : (
                            <div className="p-4 space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">حجم الحوض</label>
                                    <select
                                        className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                                        value={quizForm.tankSize}
                                        onChange={(e) => setQuizForm(f => ({ ...f, tankSize: e.target.value }))}
                                    >
                                        <option value="">اختر...</option>
                                        <option value="small">صغير (أقل من 50 لتر)</option>
                                        <option value="medium">متوسط (50-150 لتر)</option>
                                        <option value="large">كبير (150-300 لتر)</option>
                                        <option value="xlarge">ضخم (أكثر من 300 لتر)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">نوع الأسماك الرئيسي</label>
                                    <select
                                        className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                                        value={quizForm.fishType}
                                        onChange={(e) => setQuizForm(f => ({ ...f, fishType: e.target.value }))}
                                    >
                                        <option value="">اختر...</option>
                                        <option value="freshwater">مياه عذبة</option>
                                        <option value="saltwater">مياه مالحة</option>
                                        <option value="mixed">مختلط</option>
                                        <option value="planted">أحواض نباتية</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">المشكلة الرئيسية</label>
                                    <select
                                        className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                                        value={quizForm.mainProblem}
                                        onChange={(e) => setQuizForm(f => ({ ...f, mainProblem: e.target.value }))}
                                    >
                                        <option value="">اختر...</option>
                                        <option value="algae">طحالب</option>
                                        <option value="disease">أمراض الأسماك</option>
                                        <option value="water_quality">جودة المياه</option>
                                        <option value="feeding">التغذية</option>
                                        <option value="none">لا توجد مشاكل</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">عمر الحوض</label>
                                    <select
                                        className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                                        value={quizForm.tankAge}
                                        onChange={(e) => setQuizForm(f => ({ ...f, tankAge: e.target.value }))}
                                    >
                                        <option value="">اختر...</option>
                                        <option value="new">جديد (أقل من شهر)</option>
                                        <option value="months">1-6 أشهر</option>
                                        <option value="year">6 أشهر - سنة</option>
                                        <option value="established">أكثر من سنة</option>
                                    </select>
                                </div>
                                <Button
                                    className="w-full"
                                    size="sm"
                                    onClick={handleQuizSubmit}
                                    disabled={quizSubmitting || !quizForm.tankSize || !quizForm.fishType || !quizForm.mainProblem || !quizForm.tankAge}
                                >
                                    {quizSubmitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                                    احفظ واحصل على 30 نقطة
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Quiz completed result */}
                {quizResult && !quizResult.alreadyCompleted && (
                    <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
                        <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p className="font-semibold text-sm">ملف حوضك جاهز!</p>
                        <p className="text-xs text-muted-foreground">كسبت {quizResult.points} نقطة ولاء</p>
                    </div>
                )}

                {/* Aquarium Profile Summary — if already completed */}
                {aquariumProfile && (
                    <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Fish className="w-4 h-4 text-indigo-500" />
                            <span className="font-semibold text-sm">ملف حوضك</span>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            {aquariumProfile.tankSize && <span>الحجم: {aquariumProfile.tankSize}</span>}
                            {aquariumProfile.fishType && <span>النوع: {aquariumProfile.fishType}</span>}
                            {aquariumProfile.mainProblem && <span>المشكلة: {aquariumProfile.mainProblem}</span>}
                            {aquariumProfile.tankAge && <span>العمر: {aquariumProfile.tankAge}</span>}
                        </div>
                    </div>
                )}

                {/* Personalized Recommendations */}
                {recommendationsData && recommendationsData.length > 0 && (
                    <div className="bg-gradient-to-r from-primary/5 to-cyan-500/5 border border-primary/10 rounded-xl p-4">
                        <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                            <Sparkles className="w-4 h-4 text-primary" />
                            توصيات مخصصة لحوضك
                        </h4>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {recommendationsData.map((rec, i) => (
                                <div key={i} className="flex items-start gap-2 p-2 bg-background/50 rounded-lg">
                                    <Fish className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs font-medium">{rec.label}</p>
                                        <p className="text-[10px] text-muted-foreground">{rec.reason}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

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
                                <p className="text-xs text-muted-foreground">15 نقطة للتقييم + 10 مع صورة</p>
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

                {/* Professional Badges */}
                {badgesData && badgesData.length > 0 && (
                    <div className="border rounded-xl p-4">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                            <Award className="w-5 h-5 text-primary" />
                            الشارات الاحترافية
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {badgesData.map((badge) => {
                                const IconComponent = badge.icon === "Crown" ? Crown
                                    : badge.icon === "Star" ? Star
                                    : badge.icon === "ShoppingCart" ? ShoppingCart
                                    : badge.icon === "Fish" ? Fish
                                    : badge.icon === "Users" ? Users
                                    : badge.icon === "ShieldCheck" ? ShieldCheck
                                    : badge.icon === "Wrench" ? Wrench
                                    : Award;
                                return (
                                    <div
                                        key={badge.id}
                                        className={`text-center p-3 rounded-xl border transition-all ${
                                            badge.earned
                                                ? "bg-primary/5 border-primary/30"
                                                : "bg-muted/30 opacity-50 border-transparent"
                                        }`}
                                    >
                                        <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2 ${
                                            badge.earned ? "bg-primary/10" : "bg-muted"
                                        }`}>
                                            {badge.earned ? (
                                                <IconComponent className="w-5 h-5 text-primary" />
                                            ) : (
                                                <Lock className="w-4 h-4 text-muted-foreground" />
                                            )}
                                        </div>
                                        <p className="text-xs font-semibold">{badge.title}</p>
                                        {badge.earned ? (
                                            <p className="text-[10px] text-green-600">+{badge.pointsReward} نقطة</p>
                                        ) : (
                                            <p className="text-[10px] text-muted-foreground">{badge.description}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Monthly Challenges */}
                {challengesData && challengesData.length > 0 && (
                    <div className="border rounded-xl p-4">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                            <Target className="w-5 h-5 text-primary" />
                            تحديات الشهر
                            <Badge variant="secondary" className="text-xs mr-auto">
                                {challengesData.filter(c => c.completed).length}/{challengesData.length}
                            </Badge>
                        </h4>
                        <div className="space-y-3">
                            {challengesData.map((ch) => (
                                <div
                                    key={ch.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                                        ch.completed
                                            ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                                            : "bg-background border-border"
                                    }`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        ch.completed ? "bg-green-500" : "bg-muted"
                                    }`}>
                                        {ch.completed ? (
                                            <CheckCircle className="w-4 h-4 text-white" />
                                        ) : (
                                            <Target className="w-4 h-4 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium ${ch.completed ? "line-through text-muted-foreground" : ""}`}>
                                            {ch.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Progress value={(ch.progress / ch.target) * 100} className="h-1.5 flex-1" />
                                            <span className="text-[10px] text-muted-foreground">
                                                {ch.progress}/{ch.target}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-primary">+{ch.rewardPoints}</span>
                                </div>
                            ))}
                            {challengesData.every(c => c.completed) && (
                                <div className="text-center p-3 bg-gradient-to-r from-primary/5 to-cyan-500/5 rounded-lg">
                                    <p className="text-sm font-semibold text-primary">
                                        أكملت جميع التحديات — ختم الشهر +50 نقطة
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

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
                                        <div className="text-sm font-bold flex items-center gap-1.5">
                                            {tx.status === "pending" && (
                                                <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                                                    <Clock className="w-3 h-3" />
                                                    مجمدة
                                                </span>
                                            )}
                                            {tx.status === "approved" && tx.amount > 0 && (
                                                <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 font-medium">
                                                    <ShieldCheck className="w-3 h-3" />
                                                    مؤكدة
                                                </span>
                                            )}
                                            <span className={tx.amount > 0 ? "text-green-600" : "text-red-500"}>
                                                {tx.amount > 0 ? "+" : ""}{tx.amount}
                                            </span>
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
