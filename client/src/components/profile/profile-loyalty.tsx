import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Crown, Star, Gift, TrendingUp, Users, ShoppingCart, History, Coins, ArrowUpCircle, ArrowDownCircle, Sparkles, Loader2, Clock, ShieldCheck, Fish, ClipboardList, AlertCircle, Award, Target, Lock, Wrench } from "lucide-react";
import { useState } from "react";
import { useLoyaltyBalance, useLoyaltyHistory, useMilestones, useBadges, useChallenges, useWinback, useRecommendations, saveAquariumProfile } from "@/hooks/use-loyalty";
import { formatIQD } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { i18next } from "@/i18n";

// Tier configuration - must match backend MEMBERSHIP_TIERS (spent-based)
const TIER_CONFIG = {
    bronze: {
        label: i18next.t("account:profile-loyalty.s1"),
        minSpent: 0,
        color: "text-amber-700 bg-amber-100 dark:bg-amber-900/30",
        iconBg: "bg-amber-500",
        icon: Star,
    },
    silver: {
        label: i18next.t("account:profile-loyalty.s2"),
        minSpent: 400_000,
        color: "text-slate-500 bg-slate-100 dark:bg-slate-900/30",
        iconBg: "bg-slate-500",
        icon: Star,
    },
    gold: {
        label: i18next.t("account:profile-loyalty.s3"),
        minSpent: 1_200_000,
        color: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30",
        iconBg: "bg-yellow-500",
        icon: Crown,
    },
    diamond: {
        label: i18next.t("account:profile-loyalty.s4"),
        minSpent: 3_000_000,
        color: "text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30",
        iconBg: "bg-cyan-500",
        icon: Crown,
    },
} as const;

type TierKey = keyof typeof TIER_CONFIG;
const TIER_ORDER: TierKey[] = ["bronze", "silver", "gold", "diamond"];

export const tierLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    bronze: { label: i18next.t("account:profile-loyalty.s1"), color: "text-amber-700", icon: <Star className="w-4 h-4" /> },
    silver: { label: i18next.t("account:profile-loyalty.s2"), color: "text-slate-500", icon: <Star className="w-4 h-4" /> },
    gold: { label: i18next.t("account:profile-loyalty.s3"), color: "text-yellow-500", icon: <Crown className="w-4 h-4" /> },
    diamond: { label: i18next.t("account:profile-loyalty.s4"), color: "text-cyan-500", icon: <Crown className="w-4 h-4" /> },
    // Fallback for any unknown tier
    platinum: { label: i18next.t("account:profile-loyalty.s5"), color: "text-purple-500", icon: <Crown className="w-4 h-4" /> },
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
  const { t } = useTranslation("account");
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
                return { label: t("profile-loyalty.s6"), icon: <ShoppingCart className="w-4 h-4 text-green-500" />, color: "text-green-600" };
            case "referral_earn":
                return { label: t("profile-loyalty.s7"), icon: <Users className="w-4 h-4 text-blue-500" />, color: "text-blue-600" };
            case "review_earn":
                return { label: t("profile-loyalty.s8"), icon: <Star className="w-4 h-4 text-yellow-500" />, color: "text-yellow-600" };
            case "rounding_earn":
                return { label: t("profile-loyalty.s9"), icon: <Coins className="w-4 h-4 text-purple-500" />, color: "text-purple-600" };
            case "redeem":
                return { label: t("profile-loyalty.s10"), icon: <ArrowDownCircle className="w-4 h-4 text-red-500" />, color: "text-red-600" };
            case "tier_bonus":
                return { label: t("profile-loyalty.s11"), icon: <ArrowUpCircle className="w-4 h-4 text-cyan-500" />, color: "text-cyan-600" };
            case "welcome_bonus":
                return { label: t("profile-loyalty.s12"), icon: <Gift className="w-4 h-4 text-emerald-500" />, color: "text-emerald-600" };
            case "quiz_earn":
                return { label: t("profile-loyalty.s13"), icon: <ClipboardList className="w-4 h-4 text-indigo-500" />, color: "text-indigo-600" };
            case "bonus_reveal":
                return { label: t("profile-loyalty.s14"), icon: <Sparkles className="w-4 h-4 text-pink-500" />, color: "text-pink-600" };
            case "order_cancelled":
                return { label: t("profile-loyalty.s15"), icon: <ArrowDownCircle className="w-4 h-4 text-red-500" />, color: "text-red-600" };
            case "badge_earn":
                return { label: t("profile-loyalty.s16"), icon: <Award className="w-4 h-4 text-amber-500" />, color: "text-amber-600" };
            case "challenge_complete":
                return { label: t("profile-loyalty.s17"), icon: <Target className="w-4 h-4 text-teal-500" />, color: "text-teal-600" };
            case "monthly_completion":
                return { label: t("profile-loyalty.s18"), icon: <CheckCircle className="w-4 h-4 text-green-500" />, color: "text-green-600" };
            case "winback":
                return { label: t("profile-loyalty.s19"), icon: <Gift className="w-4 h-4 text-emerald-500" />, color: "text-emerald-600" };
            case "ai_bonus":
                return { label: t("profile-loyalty.s20"), icon: <Sparkles className="w-4 h-4 text-violet-500" />, color: "text-violet-600" };
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
                    {t("profile-loyalty.s21")}
                </CardTitle>
                <CardDescription>{t("profile-loyalty.s22")}</CardDescription>
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
                                <p className="text-xs text-muted-foreground mb-1">{t("profile-loyalty.s23")}</p>
                                <p className="text-4xl font-bold bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
                                    {actualPoints.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {t("profile-loyalty.s24")} {formatIQD(balance?.loyaltyValueIQD ?? actualPoints * 20)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">{t("profile-loyalty.s25")}</p>
                                <p className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                                    {cashbackBalance.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {t("profile-loyalty.s24")} {formatIQD(balance?.cashbackValueIQD ?? cashbackBalance)}
                                </p>
                            </div>
                        </div>

                        {/* Pending Balances */}
                        {(pendingLoyaltyPoints > 0 || pendingCashbackBalance > 0) && (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{t("profile-loyalty.s26")}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {pendingLoyaltyPoints > 0 && (
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">+{pendingLoyaltyPoints.toLocaleString()}</p>
                                            <p className="text-xs text-muted-foreground">{t("profile-loyalty.s27")}</p>
                                        </div>
                                    )}
                                    {pendingCashbackBalance > 0 && (
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">+{pendingCashbackBalance.toLocaleString()}</p>
                                            <p className="text-xs text-muted-foreground">{t("profile-loyalty.s28")}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Total Value */}
                        <div className="bg-card/50 dark:bg-white/5 rounded-lg px-4 py-2 mb-4">
                            <p className="text-sm font-semibold">
                                {t("profile-loyalty.s29")} <span className="text-primary">{formatIQD(balance?.totalValueIQD ?? 0)}</span>
                            </p>
                        </div>

                        {/* Current Tier Badge */}
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${currentTierConfig.color} mb-4`}>
                            <CurrentIcon className="w-4 h-4" />
                            <span className="font-semibold">{t("profile-loyalty.s30")} {currentTierConfig.label}</span>
                            {tierInfo && tierInfo.discountPercent > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                    {t("profile-loyalty.s31")} {tierInfo.discountPercent}%
                                </Badge>
                            )}
                        </div>

                        {/* Progress to Next Tier */}
                        {nextTierConfig && amountToNextTier && amountToNextTier > 0 ? (
                            <div className="mt-4">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-muted-foreground">{t("profile-loyalty.s32")} {nextTierConfig.label}</span>
                                    <span className="font-medium text-primary">{Math.round(progressPercent)}%</span>
                                </div>
                                <Progress value={progressPercent} className="h-3" />
                                <p className="text-sm text-muted-foreground mt-2">
                                    {t("profile-loyalty.s33")} <strong className="text-primary">{formatIQD(amountToNextTier)}</strong> {t("profile-loyalty.s34")}
                                </p>
                            </div>
                        ) : (
                            <div className="mt-4 p-3 bg-gradient-to-r from-cyan-500/10 to-pink-500/10 rounded-xl">
                                <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400">
                                    {t("profile-loyalty.s35")} {currentTierConfig.label}
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
                                        {t("profile-loyalty.s36")}
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
                                <span className="font-semibold text-sm">{t("profile-loyalty.s37")}</span>
                            </div>
                            <Badge variant="secondary" className="text-xs">{t("profile-loyalty.s38")}</Badge>
                        </div>
                        {!showQuiz ? (
                            <div className="p-4 text-center">
                                <p className="text-sm text-muted-foreground mb-3">
                                    {t("profile-loyalty.s39")}
                                </p>
                                <Button variant="outline" size="sm" onClick={() => setShowQuiz(true)}>
                                    {t("profile-loyalty.s40")}
                                </Button>
                            </div>
                        ) : (
                            <div className="p-4 space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("profile-loyalty.s41")}</label>
                                    <select
                                        className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                                        value={quizForm.tankSize}
                                        onChange={(e) => setQuizForm(f => ({ ...f, tankSize: e.target.value }))}
                                    >
                                        <option value="">{t("profile-loyalty.s42")}</option>
                                        <option value="small">{t("profile-loyalty.s43")}</option>
                                        <option value="medium">{t("profile-loyalty.s44")}</option>
                                        <option value="large">{t("profile-loyalty.s45")}</option>
                                        <option value="xlarge">{t("profile-loyalty.s46")}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("profile-loyalty.s47")}</label>
                                    <select
                                        className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                                        value={quizForm.fishType}
                                        onChange={(e) => setQuizForm(f => ({ ...f, fishType: e.target.value }))}
                                    >
                                        <option value="">{t("profile-loyalty.s42")}</option>
                                        <option value="freshwater">{t("profile-loyalty.s48")}</option>
                                        <option value="saltwater">{t("profile-loyalty.s49")}</option>
                                        <option value="mixed">{t("profile-loyalty.s50")}</option>
                                        <option value="planted">{t("profile-loyalty.s51")}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("profile-loyalty.s52")}</label>
                                    <select
                                        className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                                        value={quizForm.mainProblem}
                                        onChange={(e) => setQuizForm(f => ({ ...f, mainProblem: e.target.value }))}
                                    >
                                        <option value="">{t("profile-loyalty.s42")}</option>
                                        <option value="algae">{t("profile-loyalty.s53")}</option>
                                        <option value="disease">{t("profile-loyalty.s54")}</option>
                                        <option value="water_quality">{t("profile-loyalty.s55")}</option>
                                        <option value="feeding">{t("profile-loyalty.s56")}</option>
                                        <option value="none">{t("profile-loyalty.s57")}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("profile-loyalty.s58")}</label>
                                    <select
                                        className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                                        value={quizForm.tankAge}
                                        onChange={(e) => setQuizForm(f => ({ ...f, tankAge: e.target.value }))}
                                    >
                                        <option value="">{t("profile-loyalty.s42")}</option>
                                        <option value="new">{t("profile-loyalty.s59")}</option>
                                        <option value="months">{t("profile-loyalty.s60")}</option>
                                        <option value="year">{t("profile-loyalty.s61")}</option>
                                        <option value="established">{t("profile-loyalty.s62")}</option>
                                    </select>
                                </div>
                                <Button
                                    className="w-full"
                                    size="sm"
                                    onClick={handleQuizSubmit}
                                    disabled={quizSubmitting || !quizForm.tankSize || !quizForm.fishType || !quizForm.mainProblem || !quizForm.tankAge}
                                >
                                    {quizSubmitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                                    {t("profile-loyalty.s63")}
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Quiz completed result */}
                {quizResult && !quizResult.alreadyCompleted && (
                    <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
                        <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p className="font-semibold text-sm">{t("profile-loyalty.s64")}</p>
                        <p className="text-xs text-muted-foreground">{t("profile-loyalty.s65")} {quizResult.points} {t("profile-loyalty.s66")}</p>
                    </div>
                )}

                {/* Aquarium Profile Summary — if already completed */}
                {aquariumProfile && (
                    <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Fish className="w-4 h-4 text-indigo-500" />
                            <span className="font-semibold text-sm">{t("profile-loyalty.s67")}</span>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            {aquariumProfile.tankSize && <span>{t("profile-loyalty.s68")} {aquariumProfile.tankSize}</span>}
                            {aquariumProfile.fishType && <span>{t("profile-loyalty.s69")} {aquariumProfile.fishType}</span>}
                            {aquariumProfile.mainProblem && <span>{t("profile-loyalty.s70")} {aquariumProfile.mainProblem}</span>}
                            {aquariumProfile.tankAge && <span>{t("profile-loyalty.s71")} {aquariumProfile.tankAge}</span>}
                        </div>
                    </div>
                )}

                {/* Personalized Recommendations */}
                {recommendationsData && recommendationsData.length > 0 && (
                    <div className="bg-gradient-to-r from-primary/5 to-cyan-500/5 border border-primary/10 rounded-xl p-4">
                        <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                            <Sparkles className="w-4 h-4 text-primary" />
                            {t("profile-loyalty.s72")}
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
                                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-foreground dark:text-white" />
                                    ) : (
                                        <TierIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${isCurrentTier || isAchieved ? "text-foreground dark:text-white" : "text-muted-foreground"}`} />
                                    )}
                                </div>
                                <p className={`font-semibold text-xs sm:text-sm ${isCurrentTier ? "text-primary" : ""}`}>
                                    {tier.label}
                                </p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">
                                    {tier.minSpent > 0 ? `${(tier.minSpent / 1000).toLocaleString()}K` : t("profile-loyalty.s73")}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* How to earn */}
                <div className="bg-muted/50 rounded-xl p-6">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <Gift className="w-5 h-5 text-primary" />
                        {t("profile-loyalty.s74")}
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                <ShoppingCart className="w-5 h-5 text-green-500" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">{t("profile-loyalty.s75")}</p>
                                <p className="text-xs text-muted-foreground">{t("profile-loyalty.s76")}</p>
                                <p className="text-xs text-muted-foreground">{t("profile-loyalty.s77")}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                                <Star className="w-5 h-5 text-yellow-500" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">{t("profile-loyalty.s78")}</p>
                                <p className="text-xs text-muted-foreground">{t("profile-loyalty.s79")}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                <Users className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">{t("profile-loyalty.s80")}</p>
                                <p className="text-xs text-muted-foreground">{t("profile-loyalty.s81")}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Professional Badges */}
                {badgesData && badgesData.length > 0 && (
                    <div className="border rounded-xl p-4">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                            <Award className="w-5 h-5 text-primary" />
                            {t("profile-loyalty.s82")}
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
                                            <p className="text-[10px] text-green-600">+{badge.pointsReward} {t("profile-loyalty.s83")}</p>
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
                            {t("profile-loyalty.s84")}
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
                                            <CheckCircle className="w-4 h-4 text-foreground dark:text-white" />
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
                                        {t("profile-loyalty.s85")}
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
                        {t("profile-loyalty.s86")}
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
                                <span>{t("profile-loyalty.s87")}</span>
                            </div>
                        )}
                        {tierInfo && tierInfo.pointMultiplier > 1 && (
                            <div className="flex items-center gap-2 text-sm">
                                <Sparkles className="w-4 h-4 text-yellow-500" />
                                <span>{t("profile-loyalty.s88")} {tierInfo.pointMultiplier}x</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Transaction History */}
                <div className="border rounded-xl p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <History className="w-5 h-5 text-primary" />
                        {t("profile-loyalty.s89")}
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
                                                    {t("profile-loyalty.s90")}
                                                </span>
                                            )}
                                            {tx.status === "approved" && tx.amount > 0 && (
                                                <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 font-medium">
                                                    <ShieldCheck className="w-3 h-3" />
                                                    {t("profile-loyalty.s91")}
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
                            {t("profile-loyalty.s92")}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
