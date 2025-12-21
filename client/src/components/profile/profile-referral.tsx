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
            if (!response.ok) {
                // If no code exists, create one
                const codeResponse = await fetch("/api/referral/code", {
                    credentials: "include",
                });
                if (!codeResponse.ok) throw new Error("فشل في جلب بيانات الإحالة");
                return codeResponse.json();
            }
            return response.json();
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
                title: "تم النسخ!",
                description: type === 'code' ? "تم نسخ الكود" : "تم نسخ الرابط",
            });
        } catch (err) {
            toast({
                title: "خطأ",
                description: "فشل في النسخ",
                variant: "destructive",
            });
        }
    };

    const shareViaWhatsApp = () => {
        if (!stats?.referralLink) return;
        const message = encodeURIComponent(
            `🎁 سجّل في AQUAVO واحصل على خصم 5%!\n\nاستخدم رابط الدعوة:\n${stats.referralLink}\n\nأو الكود: ${stats.referralCode}`
        );
        window.open(`https://wa.me/?text=${message}`, "_blank");
    };

    const shareNative = async () => {
        if (!stats?.referralLink || !navigator.share) return;
        try {
            await navigator.share({
                title: "دعوة للانضمام إلى AQUAVO",
                text: `سجّل في AQUAVO واحصل على خصم 5%! استخدم الكود: ${stats.referralCode}`,
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
                    <p className="text-destructive">حدث خطأ في تحميل بيانات الإحالة</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-cyan-500/10 via-primary/10 to-blue-500/10 border-b">
                <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    دعوة الأصدقاء
                </CardTitle>
                <CardDescription>شارك رابط الدعوة واكسب نقاط مع كل صديق يسجل!</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
                {/* Rewards Info */}
                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-primary/5 to-cyan-500/5 rounded-xl border">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Gift className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm mb-1">لك عند التسجيل</p>
                            <p className="text-2xl font-bold text-primary">+50 نقطة</p>
                            <p className="text-xs text-muted-foreground">لكل صديق يسجل حساب جديد</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-xl border">
                        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                            <Star className="w-6 h-6 text-green-500" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm mb-1">لصديقك</p>
                            <p className="text-2xl font-bold text-green-600">خصم 5%</p>
                            <p className="text-xs text-muted-foreground">بعد أول عملية شراء</p>
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
                                كود الدعوة الخاص بك
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
                                    رابط الدعوة
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
                                مشاركة عبر واتساب
                            </Button>

                            {typeof navigator.share !== 'undefined' && (
                                <Button
                                    variant="outline"
                                    onClick={shareNative}
                                    className="flex-1"
                                >
                                    <Share2 className="w-4 h-4 ml-2" />
                                    مشاركة
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
                        <p className="text-sm text-muted-foreground">صديق مُسجّل</p>
                    </div>

                    <div className="text-center p-4 bg-muted/50 rounded-xl">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <TrendingUp className="w-5 h-5 text-green-500" />
                        </div>
                        <p className="text-3xl font-bold text-green-600">{stats?.totalPointsEarned || 0}</p>
                        <p className="text-sm text-muted-foreground">نقطة مكتسبة</p>
                    </div>
                </div>

                {/* Recent Referrals */}
                {stats?.recentReferrals && stats.recentReferrals.length > 0 && (
                    <div className="pt-4 border-t">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            آخر الدعوات
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
                                            <p className="text-sm font-medium">صديق جديد</p>
                                            <p className="text-xs text-muted-foreground">
                                                {referral.signupDate
                                                    ? new Date(referral.signupDate).toLocaleDateString("ar-IQ")
                                                    : "قريباً"}
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
                                                ? "أكمل الشراء"
                                                : referral.status === "registered"
                                                    ? "مُسجّل"
                                                    : "معلق"}
                                        </Badge>
                                        {referral.pointsAwarded > 0 && (
                                            <p className="text-xs text-green-600 mt-1">
                                                +{referral.pointsAwarded} نقطة
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
