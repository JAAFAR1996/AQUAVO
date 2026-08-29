import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { formatIQD } from "@/lib/utils";
import { useCart, type CartAvailabilityResult } from "@/contexts/cart-context";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";
import { ttqInitiateCheckout, ttqAddPaymentInfo, ttqPlaceAnOrder } from "@/lib/tiktok-pixel";
import { phTrackInitiateCheckout, phTrackPurchase } from "@/lib/posthog";
import { metaTrackInitiateCheckout, metaTrackPurchase } from "@/lib/meta-pixel";
import { trackAddShippingInfo, trackBeginCheckout, trackPurchase } from "@/lib/analytics";
import { BAGHDAD_SHIPPING, OTHER_GOVERNORATES_SHIPPING, WHATSAPP_URL, DELIVERY_DAYS } from "@/lib/constants/shipping";
import { ArrowRight, ShoppingCart, MessageCircle, Instagram } from "lucide-react";
import { MetaTags } from "@/components/seo/meta-tags";
import { resolveCheckoutTotal } from "@/lib/checkout-total";
import { clearOrderIdempotencyKey, getOrderIdempotencyKey } from "@/lib/order-idempotency";

import { stashOrder } from "@/lib/order-stash";
import { CustomerInfo, GOVERNORATES } from "@/components/cart/checkout/types";
import { CustomerInfoForm } from "@/components/cart/checkout/customer-info-form";
import { CouponSection } from "@/components/cart/checkout/coupon-section";
import { OrderSummary } from "@/components/cart/checkout/order-summary";
import { ConfirmationView } from "@/components/cart/checkout/confirmation-view";
import { CheckoutLoyaltySection } from "@/components/cart/checkout/loyalty-section";
import { CheckoutSuccessFallback } from "@/components/cart/checkout/checkout-success-fallback";
import { WhatsAppLink } from "@/components/whatsapp-link";

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    items: cartItems,
    totalPrice: cartTotal,
    clearCart,
    validateAvailability,
  } = useCart();

  const [step, setStep] = useState<"info" | "confirm" | "success">("info");
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    phone: "",
    governorate: "",
    address: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingStock, setIsCheckingStock] = useState(false);
  const [orderResult, setOrderResult] = useState<{ orderId: string; orderNumber: string } | null>(null);

  const [loyaltyData, setLoyaltyData] = useState({
    usePoints: false,
    useCashback: false,
    pointsToUse: 0,
    cashbackToUse: 0,
    pointsDiscount: 0,
    roundedAmount: 0,
    cashbackEarned: 0,
  });

  const handleLoyaltyChange = useCallback((data: typeof loyaltyData) => {
    setLoyaltyData(data);
  }, []);

  useEffect(() => {
    if (cartItems.length === 0 && step !== "success") {
      setLocation("/");
    }
  }, [cartItems.length, step]);

  useEffect(() => {
    if (user) {
      setCustomerInfo((prev) => ({
        ...prev,
        name: user.fullName || prev.name,
        phone: user.phone || prev.phone,
      }));
    }
  }, [user]);

  useEffect(() => {
    if (cartItems.length > 0) {
      ttqInitiateCheckout(
        cartItems.map((item) => ({
          id: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        cartTotal
      );
      metaTrackInitiateCheckout({
        totalIQD: cartTotal + deliveryFee,
        numItems: cartItems.reduce((sum, i) => sum + i.quantity, 0),
        productIds: cartItems.map((i) => i.productId),
      });
      // PostHog, on the LIVE /checkout route. It has been missing here since the call sites moved into
      // checkout-dialog.tsx — a component nothing renders — which is why InitiateCheckout stopped on
      // 2026-06-20 after 30 events. The helper dedups internally, so this cannot double count.
      phTrackInitiateCheckout({
        numItems: cartItems.reduce((sum, i) => sum + i.quantity, 0),
        totalValue: cartTotal + deliveryFee,
        productIds: cartItems.map((i) => i.productId),
        sourcePage: "checkout",
      });
      trackBeginCheckout(
        cartItems.map((item) => ({
          id: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        cartTotal
      );
    }
  }, []);

  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formErrorSummary, setFormErrorSummary] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    type: string;
    value: number;
  } | null>(null);

  const getDeliveryEstimate = () => {
    return `خلال ${DELIVERY_DAYS}`;
  };

  const validatePhone = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\s/g, "");
    const iraqiPhoneRegex = /^(\+964|964|0)?7[3-9]\d{8}$/;
    return iraqiPhoneRegex.test(cleanPhone);
  };

  const FIELD_ORDER = ["name", "phone", "governorate", "address"] as const;

  const validateInfo = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!customerInfo.name.trim()) newErrors.name = "الاسم مطلوب";
    if (!customerInfo.phone.trim()) newErrors.phone = "رقم الهاتف مطلوب";
    else if (!validatePhone(customerInfo.phone))
      newErrors.phone = "رقم الهاتف غير صحيح (مثال: 07801234567)";
    if (!customerInfo.governorate) newErrors.governorate = "يرجى اختيار المحافظة";
    if (!customerInfo.address.trim()) newErrors.address = "العنوان مطلوب";
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setFormErrorSummary(`فيه ${Object.keys(newErrors).length} حقول تحتاج تصحيح`);
      const firstInvalidField = FIELD_ORDER.find((field) => newErrors[field]);
      if (firstInvalidField) {
        requestAnimationFrame(() => {
          document.getElementById(firstInvalidField)?.focus();
        });
      }
    } else {
      setFormErrorSummary("");
    }

    return Object.keys(newErrors).length === 0;
  };

  const resetPriceAdjustmentsAfterStockChange = () => {
    setAgreed(false);
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponSuccess("");
    if (couponCode.trim()) {
      setCouponError("تغيّر محتوى السلة؛ يرجى تطبيق كود الخصم مرة أخرى بعد مراجعة الكميات.");
    }
    setLoyaltyData({
      usePoints: false,
      useCashback: false,
      pointsToUse: 0,
      cashbackToUse: 0,
      pointsDiscount: 0,
      roundedAmount: 0,
      cashbackEarned: 0,
    });
  };

  const showAvailabilityUpdate = (result: CartAvailabilityResult) => {
    if (!result.changed) return;

    resetPriceAdjustmentsAfterStockChange();
    setStep("info");
    window.scrollTo(0, 0);

    if (result.issues.length === 1) {
      const issue = result.issues[0];
      const label = issue.variantLabel ? `${issue.name} — ${issue.variantLabel}` : issue.name;
      if (issue.action === "reduced") {
        toast({
          title: "تغيّرت الكمية المتوفرة",
          description: `بقيت ${issue.availableStock} قطعة فقط من «${label}». عدّلنا الكمية تلقائياً من ${issue.previousQuantity} إلى ${issue.availableStock}. راجع الطلب ثم أكّد من جديد.`,
        });
      } else {
        toast({
          title: "تغيّر توفر أحد المنتجات",
          description: `نفدت كمية «${label}» قبل إتمام الطلب، لذلك أزلناها من السلة. راجع الطلب ثم أكّد من جديد.`,
        });
      }
      return;
    }

    toast({
      title: "حدّثنا سلتك حسب المخزون",
      description: "تغيّرت الكمية المتوفرة لبعض المنتجات. حدّثنا سلتك تلقائياً حسب المخزون الحالي. راجع التغييرات ثم أكّد الطلب من جديد.",
    });
  };

  const checkStockBeforeNextStep = async (): Promise<boolean> => {
    setIsCheckingStock(true);
    try {
      const result = await validateAvailability({ notify: false });
      if (!result.ok) {
        toast({
          title: "تعذر التأكد من المخزون",
          description: "ما قدرنا نتأكد من الكميات المتوفرة الآن. حاول مرة ثانية بعد لحظات.",
          variant: "destructive",
        });
        return false;
      }
      if (result.changed) {
        showAvailabilityUpdate(result);
        return false;
      }
      return true;
    } finally {
      setIsCheckingStock(false);
    }
  };

  const handleContinue = async () => {
    if (!validateInfo() || isCheckingStock) return;

    const stockIsCurrent = await checkStockBeforeNextStep();
    if (!stockIsCurrent) return;

    trackAddShippingInfo(cartItems.map((item) => ({
      id: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    })), cartTotal);
    ttqAddPaymentInfo(
      cartItems.map((item) => ({
        id: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      cartTotal
    );
    setStep("confirm");
    window.scrollTo(0, 0);
  };

  const handleConfirmOrder = async () => {
    if (!agreed || isSubmitting || isCheckingStock) return;
    setIsSubmitting(true);
    try {
      // Re-check immediately before the transactional order request. This closes
      // the stale-cart window between review and confirmation; createOrderSecure
      // remains the final race-safe authority at commit time.
      const availability = await validateAvailability({ notify: false });
      if (!availability.ok) {
        toast({
          title: "تعذر التأكد من المخزون",
          description: "ما قدرنا نتأكد من الكميات المتوفرة الآن. حاول مرة ثانية بعد لحظات.",
          variant: "destructive",
        });
        return;
      }
      if (availability.changed) {
        showAvailabilityUpdate(availability);
        return;
      }

      const cartSignature = JSON.stringify({
        items: cartItems.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })),
        couponCode: appliedCoupon?.code ?? null,
        cashbackToUse: loyaltyData.cashbackToUse,
      });
      const idempotencyKey = getOrderIdempotencyKey(cartSignature);
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: addCsrfHeader({
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        }),
        credentials: "include",
        body: JSON.stringify({
          customerInfo: {
            ...customerInfo,
            address: `${GOVERNORATES.find((g) => g.value === customerInfo.governorate)?.label} - ${customerInfo.address}`,
          },
          items: cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            ...(item.variantId ? { variantId: item.variantId } : {}),
          })),
          total: cartTotal,
          couponCode: appliedCoupon ? appliedCoupon.code : undefined,
          usePoints: loyaltyData.usePoints,
          useCashback: loyaltyData.useCashback,
          pointsToUse: loyaltyData.pointsToUse,
          cashbackToUse: loyaltyData.cashbackToUse,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        // A final 409 can still happen if the very last unit is sold between the
        // preflight above and the DB transaction. Reconcile once more and give the
        // customer an actionable message instead of a raw "order error" toast.
        if (response.status === 409 && errorData?.code === "OUT_OF_STOCK") {
          const refreshed = await validateAvailability({ notify: false });
          if (refreshed.ok && refreshed.changed) {
            showAvailabilityUpdate(refreshed);
            return;
          }
          toast({
            title: "تغيّر المخزون قبل تأكيد الطلب",
            description: "يبدو أن الكمية تغيّرت قبل لحظات. راجع السلة وحاول تأكيد الطلب مرة أخرى.",
            variant: "destructive",
          });
          return;
        }

        throw new Error(errorData?.message || `تعذر إنشاء الطلب (${response.status})`);
      }

      const orderData = await response.json();
      const confirmedTotal = resolveCheckoutTotal(orderData, grandTotal);

      ttqPlaceAnOrder(
        cartItems.map((item) => ({
          id: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        cartTotal
      );
      metaTrackPurchase({
        orderId: orderData.orderNumber || orderData.id || "unknown",
        totalIQD: confirmedTotal,
        productIds: cartItems.map((i) => i.productId),
        numItems: cartItems.reduce((sum, i) => sum + i.quantity, 0),
        phone: customerInfo.phone,
      });
      // Reached only after `response.ok` and a parsed order body, so a failed submission cannot emit it.
      // Note this deliberately does NOT forward customerInfo.phone the way the Meta call above does:
      // Meta hashes it for CAPI matching, PostHog would simply store it.
      phTrackPurchase({
        orderId: orderData.orderNumber ?? orderData.id,
        totalValue: confirmedTotal,
        numItems: cartItems.reduce((sum, i) => sum + i.quantity, 0),
        productIds: cartItems.map((i) => i.productId),
        sourcePage: "checkout",
      });
      trackPurchase({
        orderId: orderData.id || "unknown",
        total: confirmedTotal,
        items: cartItems.map((item) => ({
          id: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      });

      setOrderResult({
        orderId: orderData.id,
        orderNumber: orderData.orderNumber ?? orderData.id,
      });
      setStep("success");
      clearOrderIdempotencyKey();

      if (orderData.id) {
        const governorateLabel = GOVERNORATES.find((g) => g.value === customerInfo.governorate)?.label;
        stashOrder({
          id: orderData.id,
          orderNumber: orderData.orderNumber ?? orderData.id,
          total: confirmedTotal,
          status: orderData.status,
          items: cartItems.map((item) => ({
            productId: item.productId,
            productName: item.name,
            quantity: item.quantity,
            priceAtPurchase: item.price,
            variantId: item.variantId,
            variantLabel: item.variantLabel,
            image: item.image,
          })),
          shippingAddress: `${governorateLabel || customerInfo.governorate} - ${customerInfo.address}`,
          customerName: customerInfo.name,
          customerPhone: customerInfo.phone,
          shippingCost: Number(orderData.shippingCost ?? deliveryFee),
          discountTotal: Number(orderData.discountTotal ?? discount),
          createdAt: new Date().toISOString(),
          loyalty: {
            pointsEarned: orderData.loyalty?.pointsEarned ?? 0,
            cashbackEarned: orderData.loyalty?.cashbackEarned ?? 0,
            cashbackUsed: orderData.loyalty?.cashbackUsed ?? 0,
            roundedTotal: confirmedTotal,
            tier: "",
            tierUpgraded: false,
          },
        });
        await clearCart();
        setLocation(`/order-confirmation/${orderData.id}`);
        return;
      }

      await clearCart();
      window.scrollTo(0, 0);
    } catch (error: unknown) {
      console.error("Checkout error:", error);
      const message = error instanceof Error ? error.message : "حدث خطأ";
      toast({ title: "تعذر إتمام الطلب", description: message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setStep("info");
    window.scrollTo(0, 0);
  };

  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const isFirstStepRender = useRef(true);
  useEffect(() => {
    if (isFirstStepRender.current) {
      isFirstStepRender.current = false;
      return;
    }
    if (step === "success") {
      successHeadingRef.current?.focus();
    } else {
      stepHeadingRef.current?.focus();
    }
  }, [step]);

  const baseDeliveryFee = customerInfo.governorate === "baghdad" ? BAGHDAD_SHIPPING : OTHER_GOVERNORATES_SHIPPING;
  const isFreeShipping = appliedCoupon?.type === "free_shipping";
  const deliveryFee = isFreeShipping ? 0 : baseDeliveryFee;
  const discount = couponDiscount + loyaltyData.pointsDiscount;
  const grandTotal = Math.max(0, cartTotal + deliveryFee - discount);

  const applyCoupon = async () => {
    if (isApplyingCoupon) return;
    const code = couponCode.toUpperCase().trim();
    if (!code) return;
    setCouponError("");
    setCouponSuccess("");
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setIsApplyingCoupon(true);
    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({ code, totalAmount: cartTotal }),
      });
      if (!response.ok) {
        const error = await response.json();
        setCouponError(error.message || "كود الخصم غير صالح");
        return;
      }
      const coupon = await response.json();
      if (coupon.type === "percentage") {
        setAppliedCoupon(coupon);
        const discountAmount = Math.round(cartTotal * (Number(coupon.value) / 100));
        setCouponDiscount(discountAmount);
        setCouponSuccess(`تم تطبيق خصم ${coupon.value}% (${formatIQD(discountAmount)})`);
      } else if (coupon.type === "fixed") {
        setAppliedCoupon(coupon);
        const discountAmount = Number(coupon.value);
        setCouponDiscount(discountAmount);
        setCouponSuccess(`تم تطبيق خصم بقيمة ${formatIQD(discountAmount)}`);
      } else if (coupon.type === "free_shipping") {
        setAppliedCoupon(coupon);
        setCouponDiscount(0);
        setCouponSuccess("تم تطبيق شحن مجاني");
      } else {
        setCouponError("نوع الكوبون غير مدعوم حالياً");
      }
    } catch (error) {
      console.error("Coupon error:", error);
      setCouponError("حدث خطأ أثناء التحقق من الكوبون");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  if (step === "success" && orderResult) {
    return (
      <>
        <MetaTags title="طلبك مسجّل" noIndex />
        <CheckoutSuccessFallback
          orderNumber={orderResult.orderNumber}
          headingRef={successHeadingRef}
          onHome={() => setLocation("/")}
          onTrack={() => setLocation("/order-tracking")}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <MetaTags title="إتمام الطلب" noIndex />

      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="gap-2">
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
            رجوع
          </Button>
          <h1 ref={stepHeadingRef} tabIndex={-1} className="text-lg font-bold outline-none">{step === "info" ? "إتمام الطلب" : "تأكيد الطلب"}</h1>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <ShoppingCart className="w-4 h-4" />
            {cartItems.length}
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 pt-6 pb-0 max-w-lg">
        {step === "info" ? (
          <div className="space-y-5">
            <CustomerInfoForm
              customerInfo={customerInfo}
              setCustomerInfo={setCustomerInfo}
              errors={errors}
              isGuest={!user}
            />

            <CouponSection
              couponCode={couponCode}
              setCouponCode={setCouponCode}
              applyCoupon={applyCoupon}
              couponError={couponError}
              couponSuccess={couponSuccess}
              isApplying={isApplyingCoupon}
            />

            {user && (
              <CheckoutLoyaltySection
                cartTotal={cartTotal - couponDiscount}
                onPointsChange={handleLoyaltyChange}
              />
            )}

            <OrderSummary
              cartItems={cartItems}
              cartTotal={cartTotal}
              deliveryFee={deliveryFee}
              discount={discount}
              grandTotal={grandTotal}
              isFreeShipping={isFreeShipping}
              getDeliveryEstimate={getDeliveryEstimate}
              loyaltyDiscount={loyaltyData.pointsDiscount}
              cashbackEarned={loyaltyData.cashbackEarned}
              isLoggedIn={!!user}
            />

            <p className="sr-only" aria-live="assertive" aria-atomic="true">
              {formErrorSummary}
            </p>
            <Button
              onClick={handleContinue}
              disabled={isCheckingStock}
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              {isCheckingStock ? "نتأكد من المخزون..." : "مراجعة الطلب"}
            </Button>
          </div>
        ) : (
          <ConfirmationView
            customerInfo={customerInfo}
            cartItems={cartItems}
            cartTotal={cartTotal}
            deliveryFee={deliveryFee}
            grandTotal={grandTotal}
            isFreeShipping={isFreeShipping}
            getDeliveryEstimate={getDeliveryEstimate}
            agreed={agreed}
            setAgreed={setAgreed}
            isSubmitting={isSubmitting}
            handleBack={handleBack}
            handleConfirmOrder={handleConfirmOrder}
            couponDiscount={couponDiscount}
            loyaltyData={loyaltyData}
            isLoggedIn={!!user}
          />
        )}
      </main>

      <footer className="container mx-auto px-4 max-w-lg py-6 mt-6 border-t border-border/40 text-center" dir="rtl">
        <p className="text-sm font-semibold text-foreground mb-1">AQUAVO</p>
        <p className="text-xs text-muted-foreground mb-3">AQUAVO — معدات أحواض بريميوم من بغداد لكل العراق</p>
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mb-3">
          <span>الدفع عند الاستلام أو إلكترونياً</span>
          <span className="opacity-40">·</span>
          <span>التوصيل 5,000 د.ع لكل العراق</span>
        </div>
        <div className="flex items-center justify-center gap-4">
          <WhatsAppLink
            source="checkout"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-green-500 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            واتساب
          </WhatsAppLink>
          <a
            href="https://www.instagram.com/aquavo_iq"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Instagram className="w-3.5 h-3.5" />
            Instagram
          </a>
        </div>
      </footer>
    </div>
  );
}
