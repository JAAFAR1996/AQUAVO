import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Users,
    Copy,
    Check,
    Share2,
    Gift,
    TrendingUp,
    MessageCircle,
    Link as LinkIcon,
    Crown,
    Star
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { openWhatsApp } from "@/lib/whatsapp";
import { useTranslation } from "react-i18next";

interface ReferralStats {
    referralCode: string | null;
    referralLink: string | null;
    totalReferrals: number;
    totalPointsEarned: number;
    recentReferrals: {
        id: string;
        status: string;
        signupDate: string | null;
        firstOrderDate: string | null;
        pointsAwarded: number;
    }[];
}

export function ProfileReferral() {
  const { t } = useTranslation("account");
    const { toast } = useToast();
    const [copiedCode, setCopiedCode] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    // Fetch referral stats
    const { data: stats, isLoading, error } = useQuery<ReferralStats>({
        queryKey: ["/api/referral/stats"],
        queryFn: async () => {
            const response = await fetch("/api/referral/stats", {
                credentials: "include",
            });
            if (!response.ok) throw new Error(t("profile-referral.s1"));
            const data = await response.json();
            // Auto-generate referral code if user doesn't have one yet
            if (!data.referralCode) {
                const codeResponse = await fetch("/api/referral/code", { credentials: "include" });
                if (codeResponse.ok) {
                    const codeData = await codeResponse.json();
                    return { ...data, referralCode: codeData.code, referralLink: codeData.link };
                }
            }
            return data;
        },
    });

    const copyToClipboard = async (text: string, type: 'code' | 'link') => {
        try {
            await navigator.clipboard.writeText(text);
            if (type === 'code') {
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
            } else {
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
            }
            toast({
                title: t("profile-referral.s2"),
                description: type === 'code' ? t("profile-referral.s3") : t("profile-referral.s4"),
            });
        } catch (err) {
            toast({
                title: t("profile-referral.s5"),
                description: t("profile-referral.s6"),
                variant: "destructive",
            });
        }
    };

    const shareViaWhatsApp = () => {
        if (!stats?.referralLink) return;
        const message = encodeURIComponent(
            t("profile-referral.s7", { v0: stats.referralLink, v1: stats.referralCode })
        );
        openWhatsApp({ source: "referral" }, "https://wa.me/");
    };

    const shareNative = async () => {
        if (!stats?.referralLink || !navigator.share) return;
        try {
            await navigator.share({
                title: t("profile-referral.s8"),
                text: t("profile-referral.s9", { v0: stats.referralCode }),
                url: stats.referralLink,
            });
        } catch (err) {
            // User cancelled or share failed silently
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-muted rounded w-1/2 mx-auto" />
                        <div className="h-24 bg-muted rounded" />
                        <div className="h-12 bg-muted rounded w-3/4 mx-auto" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <p className="text-destructive">{t("profile-referral.s10")}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-cyan-500/10 via-primary/10 to-blue-500/10 border-b">
                <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    {t("profile-referral.s11")}
                </CardTitle>
                <CardDescription>{t("profile-referral.s12")}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
                {/* Rewards Info */}
                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-primary/5 to-cyan-500/5 rounded-xl border">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Gift className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm mb-1">{t("profile-referral.s13")}</p>
                            <p className="text-2xl font-bold text-primary">{t("profile-referral.s14")}</p>
                            <p className="text-xs text-muted-foreground">{t("profile-referral.s15")}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-xl border">
                        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                            <Star className="w-6 h-6 text-green-500" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm mb-1">{t("profile-referral.s16")}</p>
                            <p className="text-2xl font-bold text-green-600">{t("profile-referral.s17")}</p>
                            <p className="text-xs text-muted-foreground">{t("profile-referral.s18")}</p>
                        </div>
                    </div>
                </div>

                {/* Referral Code & Link */}
                {stats?.referralCode && (
                    <div className="space-y-4">
                        {/* Code */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Crown className="w-4 h-4 text-yellow-500" />
                                {t("profile-referral.s19")}
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    value={stats.referralCode}
                                    readOnly
                                    className="font-mono text-lg tracking-wider font-bold text-center bg-muted/50"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => copyToClipboard(stats.referralCode!, 'code')}
                                    className="flex-shrink-0"
                                >
                                    {copiedCode ? (
                                        <Check className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Link */}
                        {stats.referralLink && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <LinkIcon className="w-4 h-4 text-blue-500" />
                                    {t("profile-referral.s20")}
                                </label>
                                <div className="flex gap-2">
                                    <Input
                                        value={stats.referralLink}
                                        readOnly
                                        className="text-sm text-muted-foreground bg-muted/50"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => copyToClipboard(stats.referralLink!, 'link')}
                                        className="flex-shrink-0"
                                    >
                                        {copiedLink ? (
                                            <Check className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <Copy className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Share Buttons */}
                        <div className="flex flex-wrap gap-2 pt-2">
                            <Button
                                onClick={shareViaWhatsApp}
                                className="flex-1 bg-green-500 hover:bg-green-600"
                            >
                                <MessageCircle className="w-4 h-4 ml-2" />
                                {t("profile-referral.s21")}
                            </Button>

                            {typeof navigator.share !== 'undefined' && (
                                <Button
                                    variant="outline"
                                    onClick={shareNative}
                                    className="flex-1"
                                >
                                    <Share2 className="w-4 h-4 ml-2" />
                                    {t("profile-referral.s22")}
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="text-center p-4 bg-muted/50 rounded-xl">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Users className="w-5 h-5 text-primary" />
                        </div>
                        <p className="text-3xl font-bold text-primary">{stats?.totalReferrals || 0}</p>
                        <p className="text-sm text-muted-foreground">{t("profile-referral.s23")}</p>
                    </div>

                    <div className="text-center p-4 bg-muted/50 rounded-xl">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <TrendingUp className="w-5 h-5 text-green-500" />
                        </div>
                        <p className="text-3xl font-bold text-green-600">{stats?.totalPointsEarned || 0}</p>
                        <p className="text-sm text-muted-foreground">{t("profile-referral.s24")}</p>
                    </div>
                </div>

                {/* Recent Referrals */}
                {stats?.recentReferrals && stats.recentReferrals.length > 0 && (
                    <div className="pt-4 border-t">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            {t("profile-referral.s25")}
                        </h4>
                        <div className="space-y-2">
                            {stats.recentReferrals.map((referral) => (
                                <div
                                    key={referral.id}
                                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Users className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{t("profile-referral.s26")}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {referral.signupDate
                                                    ? new Date(referral.signupDate).toLocaleDateString("ar-IQ")
                                                    : t("profile-referral.s27")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <Badge
                                            variant={
                                                referral.status === "first_purchase"
                                                    ? "default"
                                                    : referral.status === "registered"
                                                        ? "secondary"
                                                        : "outline"
                                            }
                                        >
                                            {referral.status === "first_purchase"
                                                ? t("profile-referral.s28")
                                                : referral.status === "registered"
                                                    ? t("profile-referral.s29")
                                                    : t("profile-referral.s30")}
                                        </Badge>
                                        {referral.pointsAwarded > 0 && (
                                            <p className="text-xs text-green-600 mt-1">
                                                +{referral.pointsAwarded} {t("profile-referral.s31")}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
