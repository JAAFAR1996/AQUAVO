import { Separator } from "@/components/ui/separator";
import { formatIQD } from "@/lib/utils";
import { Truck, Info } from "lucide-react";
import { CartItem } from "@/contexts/cart-context";

interface OrderSummaryProps {
    cartTotal: number;
    deliveryFee: number;
    discount: number;
    grandTotal: number;
    isFreeShipping: boolean;
    getDeliveryEstimate: () => string;
    loyaltyDiscount?: number;
    cashbackEarned?: number;
    isLoggedIn?: boolean;
    cartItems?: CartItem[];
}

export function OrderSummary({ cartTotal, deliveryFee, discount, grandTotal, isFreeShipping, getDeliveryEstimate, loyaltyDiscount, cashbackEarned, isLoggedIn = false, cartItems = [] }: OrderSummaryProps) {
    // حساب التقريب للعرض
    const rawTotal = Math.max(0, grandTotal);
    const roundedTotal = Math.ceil(rawTotal / 250) * 250;
    const roundingDiff = roundedTotal - rawTotal;
    const displayTotal = roundingDiff > 0 ? roundedTotal : rawTotal;

    // حساب خصم الكوبون فقط (بدون النقاط)
    const couponOnlyDiscount = loyaltyDiscount && loyaltyDiscount > 0
        ? discount - loyaltyDiscount
        : discount;

    return (
        <div className="rounded-lg border border-border/60 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">ملخص الطلب</h3>

            {cartItems.length > 0 && (
                <>
                    <div className="space-y-2">
                        {cartItems.map((item) => (
                            <div key={item.id} className="flex items-start justify-between gap-2 text-sm">
                                <div className="flex-1 min-w-0">
                                    <p className="text-foreground truncate">{item.name}</p>
                                    {item.variantLabel && (
                                        <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        {formatIQD(item.price)} × {item.quantity}
                                    </p>
                                </div>
                                <span className="shrink-0 font-medium">{formatIQD(item.price * item.quantity)}</span>
                            </div>
                        ))}
                    </div>
                    <Separator />
                </>
            )}

            <div className="space-y-2">
                {/* المجموع الفرعي */}
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">المجموع الفرعي</span>
                    <span>{formatIQD(cartTotal)}</span>
                </div>

                {/* أجور التوصيل */}
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">أجور التوصيل</span>
                    {isFreeShipping
                        ? <span className="text-green-600 dark:text-green-400">مجاني</span>
                        : <span>{formatIQD(deliveryFee)}</span>
                    }
                </div>

                {/* خصم الكوبون */}
                {couponOnlyDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-green-600 dark:text-green-400">خصم الكوبون</span>
                        <span className="text-green-600 dark:text-green-400">-{formatIQD(couponOnlyDiscount)}</span>
                    </div>
                )}

                {/* خصم رصيد الباقي */}
                {!!loyaltyDiscount && loyaltyDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-green-600 dark:text-green-400">خصم رصيد الباقي</span>
                        <span className="text-green-600 dark:text-green-400">-{formatIQD(loyaltyDiscount)}</span>
                    </div>
                )}

                {/* التقريب */}
                {roundingDiff > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            تقريب لأقرب 250 د.ع
                        </span>
                        <span>+{formatIQD(roundingDiff)}</span>
                    </div>
                )}
            </div>

            <Separator />

            {/* المجموع النهائي */}
            <div className="flex justify-between items-center">
                <span className="font-semibold">المبلغ الكلي</span>
                <span className="text-xl font-bold text-primary">{formatIQD(displayTotal)}</span>
            </div>

            {/* باقي التقريب — للمسجلين فقط */}
            {isLoggedIn && roundingDiff > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                    فرق التقريب ({formatIQD(roundingDiff)}) يُحفظ كرصيد بحسابك
                </p>
            )}

            {/* رسالة تشجيعية لغير المسجلين */}
            {!isLoggedIn && roundingDiff > 0 && (
                <p className="text-xs text-primary/80 text-center">
                    سجّل بالموقع ويرجعلك {formatIQD(roundingDiff)} كرصيد باقي
                </p>
            )}

            {/* نقاط مكتسبة — للمسجلين فقط */}
            {isLoggedIn && !!cashbackEarned && cashbackEarned > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                    ستحصل على +{cashbackEarned} نقطة باقي تقريب
                </p>
            )}

            {/* طريقة الدفع والتوصيل */}
            <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2.5">
                <span className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" />
                    {getDeliveryEstimate()}
                </span>
                <span>الدفع عند الاستلام</span>
            </div>

            {/* رسالة شفافية */}
            <p className="text-xs text-muted-foreground text-center">
                لا توجد تكاليف مخفية
            </p>
        </div>
    );
}
