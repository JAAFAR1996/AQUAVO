import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { CustomerInfo, GOVERNORATES } from "./types";
import { CartItem } from "@/contexts/cart-context";
import { formatIQD } from "@/lib/utils";
import { addCsrfHeader } from "@/lib/csrf";
import { getOrderIdempotencyKey } from "@/lib/order-idempotency";
import { PaymentMethodCard } from "./payment-method-card";
import { ArrowLeft, Loader2, Lock, LockKeyhole, RotateCcw, ShieldCheck, Truck } from "lucide-react";

const APPLIED_COUPON_STORAGE_KEY = "aquavo_applied_coupon_v1";

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

type PaymentMethod = "cod" | "online";

type OnlineStartResponse = {
    orderId: string;
    orderNumber: string;
    amount: number;
    currency: string;
    paymentId: string;
    redirectUrl: string;
};

export function ConfirmationView({
    customerInfo,
    cartItems,
    cartTotal,
    deliveryFee,
    grandTotal: _grandTotal,
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
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
    const [onlinePreparing, setOnlinePreparing] = useState(false);
    const [onlineError, setOnlineError] = useState("");
    const [onlineAvailable, setOnlineAvailable] = useState<boolean | null>(null);
    const [preparedOrder, setPreparedOrder] = useState<Pick<OnlineStartResponse, "orderNumber" | "amount"> | null>(null);

    useEffect(() => {
        let active = true;
        fetch("/api/payments/alqaseh/availability", { credentials: "include", cache: "no-store" })
            .then((response) => response.json())
            .then((data) => { if (active) setOnlineAvailable(data?.available === true); })
            .catch(() => { if (active) setOnlineAvailable(false); });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (onlineAvailable === false && paymentMethod === "online") {
            setPaymentMethod("cod");
        }
    }, [onlineAvailable, paymentMethod]);

    const pointsDiscount = loyaltyData?.pointsDiscount ?? 0;
    const cashbackEarned = loyaltyData?.cashbackEarned ?? 0;
    const amountBeforeRounding = cartTotal + deliveryFee - couponDiscount - pointsDiscount;
    const roundedUp = Math.ceil(Math.max(0, amountBeforeRounding) / 250) * 250;
    const roundingDifference = roundedUp - Math.max(0, amountBeforeRounding);
    const finalAmount = roundingDifference > 0 ? roundedUp : Math.max(0, amountBeforeRounding);
    const onlineBlockedByLoyalty = Boolean(
        (loyaltyData?.useCashback && loyaltyData.cashbackToUse > 0)
        || (loyaltyData?.usePoints && (loyaltyData.pointsToUse > 0 || pointsDiscount > 0)),
    );
    const busy = isSubmitting || onlinePreparing;

    const beginOnlinePayment = async () => {
        if (!agreed || busy || onlineBlockedByLoyalty || onlineAvailable === false) return;
        setOnlinePreparing(true);
        setOnlineError("");
        setPreparedOrder(null);

        try {
            let couponCode = "";
            try { couponCode = sessionStorage.getItem(APPLIED_COUPON_STORAGE_KEY) || ""; } catch { /* optional storage */ }

            const cartSignature = JSON.stringify({
                paymentMethod: "online",
                items: cartItems.map((item) => ({
                    productId: item.productId,
                    variantId: item.variantId || "",
                    quantity: item.quantity,
                })),
                couponCode,
                cashback: 0,
            });
            const idempotencyKey = getOrderIdempotencyKey(cartSignature);
            const governorate = GOVERNORATES.find((entry) => entry.value === customerInfo.governorate)?.label;
            const address = governorate ? `${governorate} - ${customerInfo.address}` : customerInfo.address;

            const response = await fetch("/api/payments/alqaseh/checkout", {
                method: "POST",
                headers: addCsrfHeader({
                    "Content-Type": "application/json",
                    "Idempotency-Key": idempotencyKey,
                }),
                credentials: "include",
                body: JSON.stringify({
                    customerInfo: {
                        name: customerInfo.name,
                        phone: customerInfo.phone,
                        address,
                    },
                    items: cartItems.map((item) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        ...(item.variantId ? { variantId: item.variantId } : {}),
                    })),
                    ...(couponCode ? { couponCode } : {}),
                    useCashback: false,
                    cashbackToUse: 0,
                }),
            });

            const data = await response.json().catch(() => ({})) as Partial<OnlineStartResponse> & { message?: string };
            if (!response.ok || !data.redirectUrl || !data.orderId || !data.paymentId) {
                throw new Error(data.message || "تعذر تجهيز الدفع الإلكتروني. حاول مرة ثانية.");
            }

            const started = data as OnlineStartResponse;
            setPreparedOrder({ orderNumber: started.orderNumber, amount: started.amount });
            try {
                sessionStorage.setItem("aquavo_online_payment_v1", JSON.stringify({
                    orderId: started.orderId,
                    orderNumber: started.orderNumber,
                    paymentId: started.paymentId,
                    amount: started.amount,
                }));
            } catch { /* optional storage */ }

            window.setTimeout(() => window.location.assign(started.redirectUrl), 250);
        } catch (error) {
            setOnlineError(error instanceof Error ? error.message : "تعذر تجهيز الدفع الإلكتروني. حاول مرة ثانية.");
            setOnlinePreparing(false);
            setPreparedOrder(null);
        }
    };

    const submit = () => {
        if (paymentMethod === "online") {
            void beginOnlinePayment();
            return;
        }
        handleConfirmOrder();
    };

    if (onlinePreparing) {
        return (
            <div className="flex min-h-[440px] flex-col items-center justify-center overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-b from-primary/[0.07] via-background to-background px-6 py-12 text-center shadow-sm">
                <div className="mb-6 flex items-center gap-3" aria-hidden="true">
                    <div className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm font-black tracking-[0.16em] shadow-sm">AQUAVO</div>
                    <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                    <div className="grid h-12 w-12 place-items-center rounded-2xl border border-primary/15 bg-primary/10 text-primary"><ShieldCheck className="h-6 w-6" /></div>
                    <div className="text-right"><div className="text-sm font-bold">Al-Qaseh</div><div className="text-[11px] text-muted-foreground">بوابة الدفع الآمنة</div></div>
                </div>
                <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold">جاري نقلك إلى بوابة الدفع الآمنة</h3>
                <p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">
                    لا تغلق الصفحة. ستُدخل بيانات البطاقة مباشرة لدى Al-Qaseh ثم ستعود تلقائياً إلى AQUAVO.
                </p>
                <div className="mt-6 w-full max-w-sm rounded-2xl border border-border/70 bg-background/90 p-4 text-sm shadow-sm">
                    <div className="flex justify-between gap-4 py-1.5">
                        <span className="text-muted-foreground">المبلغ</span>
                        <strong>{formatIQD(preparedOrder?.amount ?? finalAmount)}</strong>
                    </div>
                    {preparedOrder?.orderNumber && (
                        <div className="flex justify-between gap-4 border-t border-border/60 py-1.5 pt-3">
                            <span className="text-muted-foreground">رقم الطلب</span>
                            <strong dir="ltr">{preparedOrder.orderNumber}</strong>
                        </div>
                    )}
                </div>
                <div className="mt-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5" />AQUAVO لا يستقبل أو يخزن بيانات بطاقتك</div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="border border-border/60 rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-semibold">معلومات التوصيل</h4>
                <div className="grid gap-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">الاسم</span><span className="font-medium" data-clarity-mask="True">{customerInfo.name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">الهاتف</span><span className="font-medium" dir="ltr" data-clarity-mask="True">{customerInfo.phone}</span></div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">العنوان</span>
                        <span className="font-medium text-right max-w-[60%]" data-clarity-mask="True">
                            {GOVERNORATES.find(g => g.value === customerInfo.governorate)?.label} - {customerInfo.address}
                        </span>
                    </div>
                    {customerInfo.notes && <div className="flex justify-between"><span className="text-muted-foreground">ملاحظات</span><span className="font-medium text-right max-w-[60%]" data-clarity-mask="True">{customerInfo.notes}</span></div>}
                </div>
            </div>

            <div className="border border-border/60 rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-semibold">المنتجات ({cartItems.length})</h4>
                <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {cartItems.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-sm">
                            <div className="min-w-0 flex-1">
                                <span className="block truncate text-muted-foreground">{item.name} × {item.quantity}</span>
                                {item.variantLabel && <span className="block truncate text-xs text-muted-foreground">الخيار: {item.variantLabel}</span>}
                            </div>
                            <span className="font-medium mr-2">{formatIQD(item.price * item.quantity)}</span>
                        </div>
                    ))}
                </div>
            </div>

            <section className="border border-border/60 rounded-lg p-4 space-y-2" aria-labelledby="invoice-summary-heading">
                <h4 id="invoice-summary-heading" className="text-sm font-semibold">ملخص الفاتورة</h4>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">المجموع الفرعي</span><span>{formatIQD(cartTotal)}</span></div>
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">التوصيل</span>
                    {isFreeShipping ? <span className="text-green-600 dark:text-green-400 font-medium">مجاني</span> : <span>{formatIQD(deliveryFee)}</span>}
                </div>
                {couponDiscount > 0 && <div className="flex justify-between text-sm"><span className="text-green-600 dark:text-green-400">خصم الكوبون</span><span className="text-green-600 dark:text-green-400">-{formatIQD(couponDiscount)}</span></div>}
                {loyaltyData && loyaltyData.cashbackToUse > 0 && <div className="flex justify-between text-sm"><span className="text-green-600 dark:text-green-400">خصم رصيد الباقي</span><span className="text-green-600 dark:text-green-400">-{formatIQD(loyaltyData.cashbackToUse)}</span></div>}
                {roundingDifference > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>تقريب لأقرب 250 د.ع</span><span>+{formatIQD(roundingDifference)}</span></div>}
                <Separator />
                <div className="flex justify-between items-center" role="status" aria-live="polite" aria-atomic="true">
                    <span className="font-semibold">المبلغ الكلي</span><span className="text-xl font-bold text-primary">{formatIQD(finalAmount)}</span>
                </div>
                {isLoggedIn && roundingDifference > 0 && <p className="text-xs text-muted-foreground text-center">فرق التقريب ({formatIQD(roundingDifference)}) يُحفظ كرصيد بحسابك</p>}
                {isLoggedIn && (cashbackEarned > 0 || roundingDifference > 0) && (
                    <div className="text-xs text-muted-foreground space-y-0.5 pt-1">
                        <p className="font-medium text-foreground text-xs">رصيد التقريب المتوقع:</p>
                        <p>{formatIQD(cashbackEarned || roundingDifference)}</p>
                        <p className="flex items-center gap-1 text-muted-foreground/70"><Lock className="w-3 h-3" />تُفعّل بعد تأكيد الاستلام</p>
                    </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2.5">
                    <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" />{getDeliveryEstimate()}</span>
                    <span>{paymentMethod === "online" ? "الدفع الإلكتروني" : "الدفع عند الاستلام"}</span>
                </div>
            </section>

            <section className="space-y-3" aria-labelledby="payment-method-heading">
                <div>
                    <h4 id="payment-method-heading" className="text-sm font-semibold">طريقة الدفع</h4>
                    <p className="mt-1 text-xs text-muted-foreground">اختر الطريقة التي تناسبك لإكمال الطلب.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="طريقة الدفع">
                    <PaymentMethodCard method="cod" selected={paymentMethod} onChange={(method) => { setPaymentMethod(method); setOnlineError(""); }} disabled={busy} />
                    <PaymentMethodCard method="online" selected={paymentMethod} onChange={(method) => { setPaymentMethod(method); setOnlineError(""); }} disabled={busy || onlineBlockedByLoyalty || onlineAvailable === false} />
                </div>
                {onlineAvailable === false && (
                    <p className="rounded-xl border border-border/70 bg-muted/35 px-3 py-2 text-xs leading-6 text-muted-foreground">
                        الدفع الإلكتروني غير متاح مؤقتاً، لذلك يمكنك إكمال الطلب بالدفع عند الاستلام.
                    </p>
                )}
                {paymentMethod === "online" && onlineAvailable !== false && !onlineBlockedByLoyalty && (
                    <div className="rounded-2xl border border-primary/15 bg-primary/[0.045] p-3.5">
                        <div className="flex items-start gap-2.5">
                            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                            <div>
                                <p className="text-sm font-semibold">ستنتقل إلى صفحة Al-Qaseh الآمنة</p>
                                <p className="mt-1 text-xs leading-6 text-muted-foreground">بيانات البطاقة تُدخل لدى مزود الدفع مباشرة، وبعد إكمال العملية ستعود تلقائياً إلى AQUAVO للتحقق من النتيجة.</p>
                            </div>
                        </div>
                    </div>
                )}
                {onlineBlockedByLoyalty && (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
                        لاستخدام الدفع الإلكتروني حالياً، ارجع وألغِ استخدام النقاط أو رصيد الباقي. لن نخصم أي رصيد ولاء قبل تأكيد الدفع.
                    </p>
                )}
                {onlineError && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3" role="alert">
                        <p className="text-sm text-destructive">{onlineError}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Button type="button" size="sm" onClick={() => void beginOnlinePayment()} disabled={busy}>
                                <RotateCcw className="ml-1.5 h-3.5 w-3.5" />إعادة المحاولة
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => { setPaymentMethod("cod"); setOnlineError(""); }}>اختيار الدفع عند الاستلام</Button>
                        </div>
                    </div>
                )}
            </section>

            <div className="flex items-start gap-3 py-2">
                <Checkbox id="agree" checked={agreed} onCheckedChange={(checked) => setAgreed(checked === true)} className="mt-0.5" disabled={busy} />
                <label htmlFor="agree" className="text-sm cursor-pointer leading-relaxed text-muted-foreground">
                    أوافق على{" "}<a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80 font-medium" onClick={(e) => e.stopPropagation()}>الشروط والأحكام</a>{" "}وأؤكد صحة رقم الهاتف المدخل
                </label>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
                <Button variant="outline" onClick={handleBack} className="order-2 h-11 w-full sm:order-1 sm:h-12 sm:flex-1" disabled={busy} aria-disabled={busy}>تعديل البيانات</Button>
                <Button
                    onClick={submit}
                    className="order-1 h-12 w-full text-base font-semibold sm:order-2 sm:flex-1"
                    size="lg"
                    disabled={!agreed || busy || (paymentMethod === "online" && onlineBlockedByLoyalty)}
                    aria-disabled={!agreed || busy || (paymentMethod === "online" && onlineBlockedByLoyalty)}
                    aria-busy={busy}
                >
                    {isSubmitting
                        ? "جاري المعالجة..."
                        : paymentMethod === "online"
                            ? `متابعة إلى الدفع الآمن — ${formatIQD(finalAmount)}`
                            : "تأكيد الطلب"}
                </Button>
            </div>
            <p className="sr-only" role="status" aria-live="polite">{busy ? "جاري معالجة طلبك، الرجاء الانتظار..." : ""}</p>
        </div>
    );
}