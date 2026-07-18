import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { formatIQD } from "@/lib/utils";
import { useCart } from "@/contexts/cart-context";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";
import { ttqInitiateCheckout, ttqAddPaymentInfo, ttqPlaceAnOrder } from "@/lib/tiktok-pixel";
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
import { OrderPackingReveal, type PackItem } from "@/components/checkout/order-packing-reveal";
import { CheckoutLoyaltySection } from "@/components/cart/checkout/loyalty-section";

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { items: cartItems, totalPrice: cartTotal, clearCart } = useCart();

  const [step, setStep] = useState<"info" | "confirm" | "success">("info");
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    phone: "",
    governorate: "",
    address: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<{ orderId: string; orderNumber: string } | null>(null);
  // Ordered line items captured at success time (before the cart is cleared),
  // used only for the visual Pack–Seal–Confirm reveal. `packingDone` gates the
  // one-time reveal so the static confirmation shows afterward.
  const [orderedItems, setOrderedItems] = useState<PackItem[]>([]);
  const [packingDone, setPackingDone] = useState(false);

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

  // Redirect to home if cart is empty
  useEffect(() => {
    if (cartItems.length === 0 && step !== "success") {
      setLocation("/");
    }
  }, [cartItems.length, step]);

  // Auto-fill user data
  useEffect(() => {
    if (user) {
      setCustomerInfo((prev) => ({
        ...prev,
        name: user.fullName || prev.name,
        phone: user.phone || prev.phone,
      }));
    }
  }, [user]);

  // Fire begin_checkout events on mount
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

  // Order the fields appear in the form so focus moves to the first invalid
  // one, top to bottom, regardless of which rule failed.
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
        // Wait a tick so the error markup (and aria-describedby) is in the DOM
        // before we move focus to it.
        requestAnimationFrame(() => {
          document.getElementById(firstInvalidField)?.focus();
        });
      }
    } else {
      setFormErrorSummary("");
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateInfo()) {
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
    }
  };

  const handleConfirmOrder = async () => {
    // Guard against double-submission: a second click/Enter while the first
    // request is still in flight must never fire a second POST.
    if (!agreed || isSubmitting) return;
    setIsSubmitting(true);
    try {
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
        throw new Error(errorData?.message || `خطأ في إنشاء الطلب (${response.status})`);
      }

      const orderData = await response.json();
      const confirmedTotal = resolveCheckoutTotal(orderData, grandTotal);

      // TikTok Pixel
      ttqPlaceAnOrder(
        cartItems.map((item) => ({
          id: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        cartTotal
      );
      // Meta Pixel
      metaTrackPurchase({
        orderId: orderData.orderNumber || orderData.id || "unknown",
        totalIQD: confirmedTotal,
        productIds: cartItems.map((i) => i.productId),
        numItems: cartItems.reduce((sum, i) => sum + i.quantity, 0),
        phone: customerInfo.phone,
      });
      // GA4
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
      // Snapshot the ordered items (real image + quantity) for the packing
      // reveal, captured BEFORE clearCart() empties the cart.
      setOrderedItems(
        cartItems.map((item) => ({ name: item.name, image: item.image, quantity: item.quantity }))
      );
      setPackingDone(false);
      // step "success" first so the empty-cart redirect effect doesn't bounce us
      // home once clearCart() empties the cart.
      setStep("success");
      clearOrderIdempotencyKey();

      if (orderData.id) {
        // Stash the full order so the confirmation page shows a complete invoice
        // for guests too (their authed order endpoint returns 401).
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
        clearCart();
        setLocation(`/order-confirmation/${orderData.id}`);
        return;
      }

      clearCart();
      window.scrollTo(0, 0);
    } catch (error: unknown) {
      console.error("Checkout error:", error);
      const message = error instanceof Error ? error.message : "حدث خطأ";
      toast({ title: "خطأ في الطلب", description: message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setStep("info");
    window.scrollTo(0, 0);
  };

  // Move focus to the current step's heading whenever the step changes, so
  // keyboard and screen-reader users land on the new content instead of
  // staying wherever their focus happened to be on the previous step.
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

  // Success page
  if (step === "success" && orderResult) {
    // Show the one-time packing reveal first (order already created); it always
    // resolves to the static confirmation below (immediately for reduced motion,
    // no items, or any failure). It never submits or mutates the order.
    if (!packingDone && orderedItems.length > 0) {
      return (
        <div className="min-h-screen bg-background flex flex-col" dir="rtl">
          <MetaTags title="تم الطلب بنجاح" noIndex />
          <div className="flex-1 flex items-center justify-center p-6">
            <OrderPackingReveal items={orderedItems} onComplete={() => setPackingDone(true)} />
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-background flex flex-col" dir="rtl">
        <MetaTags title="تم الطلب بنجاح" noIndex />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 ref={successHeadingRef} tabIndex={-1} className="text-2xl font-bold outline-none">تم استلام طلبك بنجاح</h1>
            <p className="text-muted-foreground">رقم الطلب: <span className="font-mono font-bold text-foreground">{orderResult.orderNumber}</span></p>
            <p className="text-sm text-muted-foreground">سنتواصل معك قريباً لتأكيد الطلب</p>
            <a
              href={`${WHATSAPP_URL}?text=${encodeURIComponent(`مرحباً، أريد تأكيد طلبي رقم ${orderResult.orderNumber}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition-colors"
            >
              أكد طلبك عبر واتساب
            </a>
            <div>
              <Button variant="outline" onClick={() => setLocation("/")} className="gap-2">
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
                العودة للرئيسية
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <MetaTags title="إتمام الطلب" noIndex />

      {/* Header */}
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

      {/* Main content */}
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
            <Button onClick={handleContinue} className="w-full h-12 text-base font-semibold" size="lg">
              الدفع عند الاستلام — تأكيد طلبي
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
      {/* Mini footer — trust strip */}
      <footer className="container mx-auto px-4 max-w-lg py-6 mt-6 border-t border-border/40 text-center" dir="rtl">
        <p className="text-sm font-semibold text-foreground mb-1">AQUAVO</p>
        <p className="text-xs text-muted-foreground mb-3">AQUAVO — معدات أحواض بريميوم من بغداد لكل العراق</p>
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mb-3">
          <span>الدفع عند الاستلام</span>
          <span className="opacity-40">·</span>
          <span>التوصيل 5,000 د.ع لكل العراق</span>
        </div>
        <div className="flex items-center justify-center gap-4">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-green-500 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            واتساب
          </a>
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
