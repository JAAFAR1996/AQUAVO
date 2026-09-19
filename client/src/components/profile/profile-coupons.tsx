import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Ticket } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export function ProfileCoupons() {
  const { t } = useTranslation("account");
    const { toast } = useToast();
    const { data: coupons, isLoading } = useQuery({
        queryKey: ["/api/coupons/my-coupons"],
        queryFn: async () => {
            const response = await fetch("/api/coupons/my-coupons", {
                credentials: "include",
            });
            if (!response.ok) throw new Error("Failed to fetch coupons");
            return response.json();
        }
    });

    const copyCoupon = (code: string) => {
        navigator.clipboard.writeText(code);
        toast({
            title: t("profile-coupons.s1"),
            description: t("profile-coupons.s2"),
        });
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!coupons || coupons.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Ticket className="w-5 h-5" />
                        {t("profile-coupons.s3")}
                    </CardTitle>
                    <CardDescription>{t("profile-coupons.s4")}</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-12 text-muted-foreground">
                    <Ticket className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>{t("profile-coupons.s5")}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Ticket className="w-5 h-5" />
                    {t("profile-coupons.s3")}
                </CardTitle>
                <CardDescription>{t("profile-coupons.s4")}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                    {/* Coupon interface */}
                    {coupons.map((coupon: { id: string; code: string; description: string; type: string; value: number; usedCount: number }) => (
                        <div key={coupon.id} className="border-2 border-dashed border-primary/30 bg-primary/5 rounded-lg p-4 relative overflow-hidden group">
                            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-background rounded-full border border-primary/30" />
                            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-background rounded-full border border-primary/30" />

                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-bold text-lg text-primary">{coupon.code}</h4>
                                    <p className="text-sm text-muted-foreground">{coupon.description}</p>
                                </div>
                                <Button size="sm" variant="secondary" onClick={() => copyCoupon(coupon.code)}>
                                    {t("profile-coupons.s6")}
                                </Button>
                            </div>
                            <div className="my-2 border-t border-dashed border-primary/20" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{coupon.type === 'percentage' ? t("profile-coupons.s7", { v0: coupon.value }) : t("profile-coupons.s8", { v0: coupon.value })}</span>
                                {coupon.usedCount > 0 ? (
                                    <span className="text-destructive">{t("profile-coupons.s9")}</span>
                                ) : (
                                    <span className="text-green-600">{t("profile-coupons.s10")}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
