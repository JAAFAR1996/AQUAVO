import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tag, AlertCircle, CheckCircle2 } from "lucide-react";

interface CouponSectionProps {
    couponCode: string;
    setCouponCode: (code: string) => void;
    applyCoupon: () => void;
    couponError: string;
    couponSuccess: string;
}

export function CouponSection({ couponCode, setCouponCode, applyCoupon, couponError, couponSuccess }: CouponSectionProps) {
    return (
        <div className="space-y-2 bg-gradient-to-r from-cyan-50 via-teal-50 to-emerald-50 dark:from-cyan-950/30 dark:via-teal-950/30 dark:to-emerald-950/30 p-4 rounded-xl border-2 border-dashed border-cyan-300 dark:border-cyan-700 shadow-sm">
            <Label className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400 font-bold text-base">
                <span className="text-lg">🎁</span>
                <Tag className="h-4 w-4" />
                هل لديك كوبون خصم؟
            </Label>
            <div className="flex gap-2">
                <Input
                    placeholder="أدخل كود الخصم هنا..."
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 bg-white dark:bg-background border-cyan-200 dark:border-cyan-800 focus:border-cyan-400 focus:ring-cyan-400"
                    dir="ltr"
                />
                <Button
                    type="button"
                    onClick={applyCoupon}
                    className="min-w-[90px] bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-bold shadow-md hover:shadow-lg transition-all"
                >
                    تطبيق ✨
                </Button>
            </div>
            {couponError && (
                <p className="text-sm text-red-500 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 bg-red-50 dark:bg-red-950/30 p-2 rounded-lg">
                    <AlertCircle className="h-3 w-3" />
                    {couponError}
                </p>
            )}
            {couponSuccess && (
                <p className="text-sm text-green-600 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 bg-green-50 dark:bg-green-950/30 p-2 rounded-lg font-medium">
                    <CheckCircle2 className="h-3 w-3" />
                    {couponSuccess}
                </p>
            )}
        </div>
    );
}
