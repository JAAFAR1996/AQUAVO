import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { formatIQD } from "@/lib/utils";
import { useCart } from "@/contexts/cart-context";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";
import { ttqInitiateCheckout, ttqAddPaymentInfo, ttqPlaceAnOrder } from "@/lib/tiktok-pixel";
import { metaTrackInitiateCheckout, metaTrackPurchase } from "@/lib/meta-pixel";
import { trackBeginCheckout, trackPurchase } from "@/lib/analytics";
import { BAGHDAD_SHIPPING, OTHER_GOVERNORATES_SHIPPING, FREE_SHIPPING_THRESHOLD, WHATSAPP_URL, DELIVERY_DAYS } from "@/lib/constants/shipping";
import { ArrowRight, ShoppingCart } from "lucide-react";
import { MetaTags } from "@/components/seo/meta-tags";

import { CustomerInfo, GOVERNORATES } from "@/components/cart/checkout/types";
import { CustomerInfoForm } from "@/components/cart/checkout/customer-info-form";
import { CouponSection } from "@/components/cart/checkout/coupon-section";
import { OrderSummary } from "@/components/cart/checkout/order-summary";
import { ConfirmationView } from "@/components/cart/checkout/confirmation-view";
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
        totalIQD: cartTotal,
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
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
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

  const validateInfo = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!customerInfo.name.trim()) newErrors.name = "الاسم مطلوب";
    if (!customerInfo.phone.trim()) newErrors.phone = "رقم الهاتف مطلوب";
    else if (!validatePhone(customerInfo.phone))
      newErrors.phone = "رقم الهاتف غير صحيح (مثال: 07801234567)";
    if (!customerInfo.governorate) newErrors.governorate = "يرجى اختيار المحافظة";
    if (!customerInfo.address.trim()) newErrors.address = "العنوان مطلوب";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateInfo()) {
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
    if (!agreed) return;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({
          customerInfo: {
            ...customerInfo,
            address: `${GOVERNORATES.find((g) => g.value === customerInfo.governorate)?.label} - ${customerInfo.address}`,
          },
          items: cartItems.map((item) => ({
            ...item,
            productId: item.productId,
          })),
          total: cartTotal,
          couponCode: appliedCoupon ? appliedCoupon.code : undefined,
          loyaltyPointsUsed: loyaltyData.usePoints ? loyaltyData.pointsToUse : 0,
          cashbackUsed: loyaltyData.useCashback ? loyaltyData.cashbackToUse : 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `خطأ في إنشاء الطلب (${response.status})`);
      }

      const orderData = await response.json();

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
        orderId: orderData.id || "unknown",
        totalIQD: Number(orderData.total ?? grandTotal),
        productIds: cartItems.map((i) => i.productId),
        numItems: cartItems.reduce((sum, i) => sum + i.quantity, 0),
        phone: customerInfo.phone,
      });
      // GA4
      trackPurchase({
        orderId: orderData.id || "unknown",
        total: cartTotal,
        items: cartItems.map((item) => ({
          id: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      });

      setOrderResult({ orderId: orderData.id, orderNumber: orderData.id });
      setStep("success");
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

  const baseDeliveryFee = customerInfo.governorate === "baghdad" ? BAGHDAD_SHIPPING : OTHER_GOVERNORATES_SHIPPING;
  const deliveryFee = cartTotal >= FREE_SHIPPING_THRESHOLD || appliedCoupon?.type === "free_shipping" ? 0 : baseDeliveryFee;
  const isFreeShipping = deliveryFee === 0;
  const discount = couponDiscount + loyaltyData.pointsDiscount;
  const grandTotal = Math.max(0, cartTotal + deliveryFee - discount);

  const applyCoupon = async () => {
    setCouponError("");
    setCouponSuccess("");
    setAppliedCoupon(null);
    setCouponDiscount(0);
    const code = couponCode.toUpperCase().trim();
    if (!code) return;
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
      setAppliedCoupon(coupon);
      if (coupon.type === "percentage") {
        const discountAmount = Math.round(cartTotal * (Number(coupon.value) / 100));
        setCouponDiscount(discountAmount);
        setCouponSuccess(`تم تطبيق خصم ${coupon.value}% (${formatIQD(discountAmount)})`);
      } else if (coupon.type === "fixed") {
        const discountAmount = Number(coupon.value);
        setCouponDiscount(discountAmount);
        setCouponSuccess(`تم تطبيق خصم بقيمة ${formatIQD(discountAmount)}`);
      } else if (coupon.type === "free_shipping") {
        setCouponDiscount(0);
        setCouponSuccess("تم تطبيق توصيل مجاني");
      }
    } catch (error) {
      console.error("Coupon error:", error);
      setCouponError("حدث خطأ أثناء التحقق من الكوبون");
    }
  };

  // Success page
  if (step === "success" && orderResult) {
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
            <h1 className="text-2xl font-bold">تم استلام طلبك بنجاح</h1>
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
                <ArrowRight className="w-4 h-4 rotate-180" />
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
            <ArrowRight className="w-4 h-4" />
            رجوع
          </Button>
          <h1 className="text-lg font-bold">{step === "info" ? "إتمام الطلب" : "تأكيد الطلب"}</h1>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <ShoppingCart className="w-4 h-4" />
            {cartItems.length}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-6 max-w-lg">
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
            />

            {user && (
              <CheckoutLoyaltySection
                cartTotal={cartTotal - couponDiscount}
                onPointsChange={handleLoyaltyChange}
              />
            )}

            <OrderSummary
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

            <Button onClick={handleContinue} className="w-full h-12 text-base font-semibold" size="lg">
              متابعة للتأكيد
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
    </div>
  );
}
