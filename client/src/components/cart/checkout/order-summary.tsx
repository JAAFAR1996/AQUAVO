import { Separator } from "@/components/ui/separator";
import { formatIQD } from "@/lib/utils";
import { ArrowUp, Info } from "lucide-react";

interface OrderSummaryProps {
    cartTotal: number;
    deliveryFee: number;
    discount: number;
    grandTotal: number;
    isFreeShipping: boolean;
    getDeliveryEstimate: () => string;
    loyaltyDiscount?: number;
    cashbackEarned?: number;
}

export function OrderSummary({ cartTotal, deliveryFee, discount, grandTotal, isFreeShipping, getDeliveryEstimate, loyaltyDiscount, cashbackEarned }: OrderSummaryProps) {
    // حساب التقريب للعرض
    const rawTotal = Math.max(0, grandTotal);
    const roundedTotal = Math.ceil(rawTotal / 250) * 250;
    const roundingDiff = roundedTotal - rawTotal;
    const displayTotal = roundingDiff > 0 ? roundedTotal : rawTotal;

    return (
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between text-sm">
                <span>المجموع الفرعي:</span>
                <span>{formatIQD(cartTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
                <span>رسوم التوصيل:</span>
                {isFreeShipping ? (
                    <span className="text-green-600 font-bold">مجاني 🎁</span>
                ) : (
                    <span>{formatIQD(deliveryFee)}</span>
                )}
            </div>
            {!isFreeShipping && (
                <div className="text-xs text-orange-600 font-bold mt-1 text-center bg-orange-50 p-2 rounded border border-orange-100 dark:bg-orange-950/20 dark:border-orange-900">
                    خيار ممتاز! الأسماك بانتظارك 🐠
                    <br />
                    <span className="text-muted-foreground font-normal">
                        (باقي لك {formatIQD(100000 - cartTotal)} للحصول على توصيل مجاني!)
                    </span>
                </div>
            )}

            {/* خصم الكوبون فقط (بدون النقاط لتجنب العرض المزدوج) */}
            {discount > 0 && loyaltyDiscount && loyaltyDiscount > 0 ? (
                // إذا يوجد كوبون + نقاط: نعرض خصم الكوبون فقط هنا
                (discount - loyaltyDiscount) > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                        <span>خصم الكوبون:</span>
                        <span>-{formatIQD(discount - loyaltyDiscount)}</span>
                    </div>
                )
            ) : discount > 0 ? (
                // إذا يوجد خصم بدون نقاط
                <div className="flex justify-between text-sm text-green-600">
                    <span>الخصم:</span>
                    <span>-{formatIQD(discount)}</span>
                </div>
            ) : null}

            {/* خصم النقاط - سطر واحد فقط */}
            {loyaltyDiscount && loyaltyDiscount > 0 && (
                <div className="flex justify-between text-sm text-purple-600">
                    <span>خصم النقاط:</span>
                    <span>-{formatIQD(loyaltyDiscount)}</span>
                </div>
            )}

            {/* التقريب */}
            {roundingDiff > 0 && (
                <div className="flex justify-between text-xs text-amber-600">
                    <span className="flex items-center gap-1">
                        <ArrowUp className="w-3 h-3" />
                        تقريب لأقرب 250 د.ع:
                    </span>
                    <span>+{formatIQD(roundingDiff)}</span>
                </div>
            )}

            <Separator />
            <div className="flex justify-between font-bold text-lg">
                <span>المبلغ الذي ستدفعه:</span>
                <span className="text-primary">{formatIQD(displayTotal)}</span>
            </div>

            {/* باقي التقريب */}
            {roundingDiff > 0 && (
                <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded border border-amber-100 dark:border-amber-800 text-center">
                    <Info className="w-3 h-3 inline ml-1" />
                    فرق التقريب ({formatIQD(roundingDiff)}) يُحفظ كرصيد في حسابك
                </div>
            )}

            {/* نقاط مكتسبة */}
            {cashbackEarned && cashbackEarned > 0 && (
                <div className="text-xs text-purple-600 bg-purple-50 dark:bg-purple-950/20 p-2 rounded border border-purple-100 dark:border-purple-800 text-center">
                    ✨ ستحصل على +{cashbackEarned} نقطة باقي تقريب مع هذا الطلب
                </div>
            )}

            <div className="mt-2 text-center bg-green-50 text-green-700 py-2 rounded-md text-sm font-bold border border-green-100 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800">
                💰 طريقة الدفع: الدفع عند الاستلام
                <div className="text-xs font-normal mt-1 opacity-90">
                    ⏱️ التوصيل المتوقع: {getDeliveryEstimate()}
                </div>
            </div>
        </div>
    );
}
