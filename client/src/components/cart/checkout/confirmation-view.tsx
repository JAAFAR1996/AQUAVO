import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { CustomerInfo, GOVERNORATES } from "./types";
import { CartItem } from "@/contexts/cart-context";
import { formatIQD } from "@/lib/utils";
import { Truck, Lock } from "lucide-react";

interface LoyaltyBreakdown {
    usePoints: boolean;
    useCashback: boolean;
    pointsToUse: number;
    cashbackToUse: number;
    pointsDiscount: number;
    roundedAmount: number;
    cashbackEarned: number;
}

interface ConfirmationViewProps {
    customerInfo: CustomerInfo;
    cartItems: CartItem[];
    cartTotal: number;
    deliveryFee: number;
    grandTotal: number;
    isFreeShipping: boolean;
    getDeliveryEstimate: () => string;
    agreed: boolean;
    setAgreed: (agreed: boolean) => void;
    isSubmitting: boolean;
    handleBack: () => void;
    handleConfirmOrder: () => void;
    couponDiscount?: number;
    loyaltyData?: LoyaltyBreakdown;
    isLoggedIn?: boolean;
}

export function ConfirmationView({
    customerInfo,
    cartItems,
    cartTotal,
    deliveryFee,
    grandTotal,
    isFreeShipping,
    getDeliveryEstimate,
    agreed,
    setAgreed,
    isSubmitting,
    handleBack,
    handleConfirmOrder,
    couponDiscount = 0,
    loyaltyData,
    isLoggedIn = false,
}: ConfirmationViewProps) {
    const pointsDiscount = loyaltyData?.pointsDiscount ?? 0;
    const cashbackEarned = loyaltyData?.cashbackEarned ?? 0;

    // حساب التقريب
    const amountBeforeRounding = cartTotal + deliveryFee - couponDiscount - pointsDiscount;
    const roundedUp = Math.ceil(Math.max(0, amountBeforeRounding) / 250) * 250;
    const roundingDifference = roundedUp - Math.max(0, amountBeforeRounding);
    const finalAmount = roundingDifference > 0 ? roundedUp : Math.max(0, amountBeforeRounding);

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                <p className="font-semibold text-foreground">راجع طلبك قبل الإرسال</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    الدفع عند الاستلام. بعد الموافقة على الشروط اضغط زر تأكيد الطلب مرة واحدة.
                </p>
            </div>

            {/* === معلومات العميل === */}
            <div className="border border-border/60 rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-semibold">معلومات التوصيل</h4>
                <div className="grid gap-1.5 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">الاسم</span>
                        <span className="font-medium" data-clarity-mask="True">{customerInfo.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">الهاتف</span>
                        <span className="font-medium" dir="ltr" data-clarity-mask="True">{customerInfo.phone}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">العنوان</span>
                        <span className="font-medium text-right max-w-[60%]" data-clarity-mask="True">
                            {GOVERNORATES.find(g => g.value === customerInfo.governorate)?.label} - {customerInfo.address}
                        </span>
                    </div>
                    {customerInfo.notes && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">ملاحظات</span>
                            <span className="font-medium text-right max-w-[60%]" data-clarity-mask="True">{customerInfo.notes}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* === المنتجات === */}
            <div className="border border-border/60 rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-semibold">المنتجات ({cartItems.length})</h4>
                <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {cartItems.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-sm">
                            <div className="min-w-0 flex-1">
                                <span className="block truncate text-muted-foreground">{item.name} × {item.quantity}</span>
                                {item.variantLabel && (
                                    <span className="block truncate text-xs text-muted-foreground">الخيار: {item.variantLabel}</span>
                                )}
                            </div>
                            <span className="font-medium mr-2">{formatIQD(item.price * item.quantity)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* === ملخص الفاتورة === */}
            <section className="border border-border/60 rounded-lg p-4 space-y-2" aria-labelledby="invoice-summary-heading">
                <h4 id="invoice-summary-heading" className="text-sm font-semibold">ملخص الفاتورة</h4>

                {/* المجموع الفرعي */}
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">المجموع الفرعي</span>
                    <span>{formatIQD(cartTotal)}</span>
                </div>

                {/* التوصيل */}
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">التوصيل</span>
                    {isFreeShipping ? (
                        <span className="text-green-600 dark:text-green-400 font-medium">مجاني</span>
                    ) : (
                        <span>{formatIQD(deliveryFee)}</span>
                    )}
                </div>

                {/* خصم الكوبون */}
                {couponDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-green-600 dark:text-green-400">خصم الكوبون</span>
                        <span className="text-green-600 dark:text-green-400">-{formatIQD(couponDiscount)}</span>
                    </div>
                )}

                {/* خصم رصيد الباقي */}
                {loyaltyData && loyaltyData.cashbackToUse > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-green-600 dark:text-green-400">خصم رصيد الباقي</span>
                        <span className="text-green-600 dark:text-green-400">-{formatIQD(loyaltyData.cashbackToUse)}</span>
                    </div>
                )}

                {/* التقريب */}
                {roundingDifference > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>تقريب لأقرب 250 د.ع</span>
                        <span>+{formatIQD(roundingDifference)}</span>
                    </div>
                )}

                <Separator />

                {/* المبلغ النهائي */}
                <div className="flex justify-between items-center" role="status" aria-live="polite" aria-atomic="true">
                    <span className="font-semibold">المبلغ الكلي</span>
                    <span className="text-xl font-bold text-primary">{formatIQD(finalAmount)}</span>
                </div>

                {/* === مستخدم مسجل: يحصل على باقي + نقاط === */}
                {isLoggedIn && roundingDifference > 0 && (
                    <p className="text-xs text-muted-foreground text-center">
                        فرق التقريب ({formatIQD(roundingDifference)}) يُحفظ كرصيد بحسابك
                    </p>
                )}

                {isLoggedIn && (cashbackEarned > 0 || roundingDifference > 0) && (
                    <div className="text-xs text-muted-foreground space-y-0.5 pt-1">
                        <p className="font-medium text-foreground text-xs">رصيد التقريب المتوقع:</p>
                        {(cashbackEarned > 0 || roundingDifference > 0) && (
                            <p>{formatIQD(cashbackEarned || roundingDifference)}</p>
                        )}
                        <p className="flex items-center gap-1 text-muted-foreground/70">
                            <Lock className="w-3 h-3" />
                            تُفعّل بعد تأكيد الاستلام
                        </p>
                    </div>
                )}

                {/* طريقة الدفع + التوصيل */}
                <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2.5">
                    <span className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5" />
                        {getDeliveryEstimate()}
                    </span>
                    <span>الدفع النقدي عند الاستلام</span>
                </div>
            </section>

            {/* === الموافقة على الشروط === */}
            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                <Checkbox
                    id="agree"
                    checked={agreed}
                    onCheckedChange={(checked) => setAgreed(checked === true)}
                    className="mt-0.5"
                />
                <label htmlFor="agree" className="text-sm cursor-pointer leading-relaxed text-muted-foreground">
                    أوافق على{" "}
                    <a
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2 hover:text-primary/80 font-medium"
                        onClick={(e) => e.stopPropagation()}
                    >
                        الشروط والأحكام
                    </a>
                    {" "}وأؤكد صحة رقم الهاتف المدخل
                </label>
            </div>

            {/* === الأزرار === */}
            <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md">
                <Button variant="outline" onClick={handleBack} className="h-12 px-4" disabled={isSubmitting} aria-disabled={isSubmitting}>
                    تعديل
                </Button>
                <Button
                    onClick={handleConfirmOrder}
                    className="flex-1 h-12 text-base font-semibold"
                    size="lg"
                    disabled={!agreed || isSubmitting}
                    aria-disabled={!agreed || isSubmitting}
                    aria-busy={isSubmitting}
                >
                    {isSubmitting ? "جاري إرسال الطلب..." : "تأكيد الطلب — الدفع عند الاستلام"}
                </Button>
            </div>
            <p className="sr-only" role="status" aria-live="polite">
                {isSubmitting ? "جاري إرسال طلبك، الرجاء الانتظار..." : ""}
            </p>
        </div>
    );
}
