import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { CustomerInfo, GOVERNORATES } from "./types";
import { CartItem } from "@/contexts/cart-context";
import { formatIQD } from "@/lib/utils";
import { Info, Gift, Coins, ArrowUp, Lock } from "lucide-react";

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
}: ConfirmationViewProps) {
    const pointsDiscount = loyaltyData?.pointsDiscount ?? 0;
    const cashbackEarned = loyaltyData?.cashbackEarned ?? 0;
    const roundedAmount = loyaltyData?.roundedAmount ?? grandTotal;

    // حساب التقريب المحلي (للعرض فقط)
    const amountBeforeRounding = cartTotal + deliveryFee - couponDiscount - pointsDiscount;
    const roundedUp = Math.ceil(Math.max(0, amountBeforeRounding) / 250) * 250;
    const roundingDifference = roundedUp - Math.max(0, amountBeforeRounding);
    const displayTotal = pointsDiscount > 0 ? roundedUp : grandTotal;

    // حساب النقاط المكتسبة تقريبياً
    const estimatedPoints = Math.floor(Math.max(0, amountBeforeRounding) / 5000);

    return (
        <div className="space-y-4 mt-4">
            {/* معلومات العميل */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold">معلومات العميل</h4>
                <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">الاسم:</span>
                        <span className="font-medium">{customerInfo.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">الهاتف:</span>
                        <span className="font-medium" dir="ltr">{customerInfo.phone}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">العنوان:</span>
                        <span className="font-medium">
                            {GOVERNORATES.find(g => g.value === customerInfo.governorate)?.label} - {customerInfo.address}
                        </span>
                    </div>
                    {customerInfo.notes && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">ملاحظات:</span>
                            <span className="font-medium">{customerInfo.notes}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* المنتجات */}
            <div className="space-y-2">
                <h4 className="font-semibold">المنتجات ({cartItems.length})</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                    {cartItems.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-sm bg-muted/30 rounded p-2">
                            <span className="truncate flex-1">{item.name} × {item.quantity}</span>
                            <span className="font-medium mr-2">{formatIQD(item.price * item.quantity)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* === تفصيل المبلغ الشفاف === */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                {/* المجموع الفرعي */}
                <div className="flex justify-between text-sm">
                    <span>المجموع الفرعي:</span>
                    <span>{formatIQD(cartTotal)}</span>
                </div>

                {/* رسوم التوصيل */}
                <div className="flex justify-between text-sm">
                    <span>رسوم التوصيل:</span>
                    {isFreeShipping ? (
                        <span className="text-green-600 font-bold">مجاني 🎁</span>
                    ) : (
                        <span>{formatIQD(deliveryFee)}</span>
                    )}
                </div>

                {/* خصم الكوبون */}
                {couponDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                        <span>خصم الكوبون:</span>
                        <span>-{formatIQD(couponDiscount)}</span>
                    </div>
                )}

                {/* خصم رصيد الباقي (نقاط الولاء لا تُصرف - للعضوية فقط) */}
                {loyaltyData && loyaltyData.cashbackToUse > 0 && (
                    <div className="flex justify-between text-sm text-purple-600">
                        <span className="flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5" />
                            خصم رصيد الباقي ({loyaltyData.cashbackToUse} نقطة باقي):
                        </span>
                        <span>-{formatIQD(loyaltyData.cashbackToUse)}</span>
                    </div>
                )}

                {/* تفصيل التقريب - فقط إذا يوجد فرق */}
                {roundingDifference > 0 && (
                    <>
                        <Separator className="my-1" />
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>المبلغ قبل التقريب:</span>
                            <span>{formatIQD(Math.max(0, amountBeforeRounding))}</span>
                        </div>
                        <div className="flex justify-between text-sm text-amber-600">
                            <span className="flex items-center gap-1">
                                <ArrowUp className="w-3.5 h-3.5" />
                                تقريب لأقرب فئة عملة (250 د.ع):
                            </span>
                            <span>+{formatIQD(roundingDifference)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 rounded p-2 border border-amber-100 dark:border-amber-900">
                            <Info className="w-3 h-3 inline ml-1 text-amber-500" />
                            فرق التقريب ({formatIQD(roundingDifference)}) يُحفظ كرصيد في حسابك وتستخدمه في طلبك القادم
                        </div>
                    </>
                )}

                <Separator />

                {/* المجموع النهائي */}
                <div className="flex justify-between font-bold text-lg">
                    <span>المبلغ الذي ستدفعه:</span>
                    <span className="text-primary">{formatIQD(roundingDifference > 0 ? roundedUp : displayTotal)}</span>
                </div>

                {/* ما سيكسبه العميل */}
                {(estimatedPoints > 0 || cashbackEarned > 0 || roundingDifference > 0) && (
                    <div className="bg-gradient-to-br from-primary/5 to-cyan-500/5 rounded-lg p-3 space-y-1.5 border border-primary/10">
                        <p className="text-xs font-semibold text-primary flex items-center gap-1">
                            🎁 ستكسب من هذا الطلب:
                        </p>
                        {estimatedPoints > 0 && (
                            <p className="text-xs text-muted-foreground">
                                • {estimatedPoints} نقطة ولاء (لترقية العضوية)
                            </p>
                        )}
                        {(cashbackEarned > 0 || roundingDifference > 0) && (
                            <p className="text-xs text-muted-foreground">
                                • {cashbackEarned || roundingDifference} نقطة باقي (تساوي {formatIQD(cashbackEarned || roundingDifference)})
                            </p>
                        )}
                        <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            مجمدة حتى تأكيد استلام الطلب
                        </p>
                    </div>
                )}

                {/* طريقة الدفع */}
                <div className="mt-2 text-center bg-blue-50 text-blue-700 py-2 rounded-md text-sm font-medium border border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800">
                    💰 طريقة الدفع: الدفع عند الاستلام
                    <div className="text-xs font-normal mt-1 opacity-90">
                        ⏱️ التوصيل المتوقع: {getDeliveryEstimate()}
                    </div>
                </div>
            </div>

            {/* شرح التقريب - فقط للمرة الأولى أو عند وجود فرق */}
            {roundingDifference > 0 && (
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-100 dark:border-blue-800">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1">
                        <Info className="w-3.5 h-3.5" />
                        لماذا تقريب المبلغ؟
                    </p>
                    <p className="text-xs text-blue-600/80 dark:text-blue-400/70 leading-relaxed">
                        أقل فئة عملة عراقية متداولة هي 250 دينار. نقرّب المبلغ للأعلى ليكون قابلاً للدفع نقداً،
                        والفرق لا يضيع - يُحفظ بالكامل كرصيد في حسابك تستخدمه كخصم في طلبك القادم.
                    </p>
                </div>
            )}

            {/* الموافقة */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <Checkbox
                    id="agree"
                    checked={agreed}
                    onCheckedChange={(checked) => setAgreed(checked === true)}
                    className="mt-0.5"
                />
                <label htmlFor="agree" className="text-sm cursor-pointer leading-relaxed">
                    أوافق على الشروط والأحكام وأؤكد صحة رقم الهاتف المدخل للتواصل بخصوص الطلب
                </label>
            </div>

            {/* أزرار */}
            <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack} className="flex-1">
                    رجوع
                </Button>
                <Button
                    onClick={handleConfirmOrder}
                    className="flex-1"
                    size="lg"
                    disabled={!agreed || isSubmitting}
                >
                    {isSubmitting ? "جاري المعالجة..." : "تأكيد الطلب"}
                </Button>
            </div>
        </div>
    );
}
