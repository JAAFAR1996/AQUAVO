import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User, CheckCircle2 } from "lucide-react";
import { formatIQD } from "@/lib/utils";
import { CartItem } from "@/contexts/cart-context";
import { useAuth } from "@/contexts/auth-context";
import { ShrimpMascot } from "@/components/gamification/shrimp-mascot";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";

// Sub-components
import { CustomerInfo, GOVERNORATES } from "./checkout/types";
import { CustomerInfoForm } from "./checkout/customer-info-form";
import { CouponSection } from "./checkout/coupon-section";
import { OrderSummary } from "./checkout/order-summary";
import { ConfirmationView } from "./checkout/confirmation-view";
import { CheckoutLoyaltySection } from "./checkout/loyalty-section";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartItems: CartItem[];
  cartTotal: number;
  onCheckoutComplete: (orderData: { customerInfo: CustomerInfo; items: CartItem[]; total: number; orderId?: string; orderNumber?: string }) => void;
}

export function CheckoutDialog({ open, onOpenChange, cartItems, cartTotal, onCheckoutComplete }: CheckoutDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'info' | 'confirm'>('info');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    governorate: '',
    address: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Loyalty points state
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

  // Auto-fill user data when dialog opens
  useEffect(() => {
    if (open && user) {
      setCustomerInfo(prev => ({
        ...prev,
        name: user.fullName || prev.name,
        phone: user.phone || prev.phone
      }));
    }
  }, [open, user]);

  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; type: string; value: number } | null>(null);

  const getDeliveryEstimate = () => {
    if (customerInfo.governorate === "baghdad") return "خلال 24 - 48 ساعة";
    return "خلال 2 - 4 أيام عمل";
  };

  const validatePhone = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\s/g, '');
    const iraqiPhoneRegex = /^(\+964|964|0)?7[3-9]\d{8}$/;
    return iraqiPhoneRegex.test(cleanPhone);
  };

  const validateInfo = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!customerInfo.name.trim()) {
      newErrors.name = 'الاسم مطلوب';
    }

    if (!customerInfo.phone.trim()) {
      newErrors.phone = 'رقم الهاتف مطلوب';
    } else if (!validatePhone(customerInfo.phone)) {
      newErrors.phone = 'رقم الهاتف غير صحيح (مثال: 07801234567)';
    }

    if (!customerInfo.governorate) {
      newErrors.governorate = 'يرجى اختيار المحافظة';
    }

    if (!customerInfo.address.trim()) {
      newErrors.address = 'العنوان مطلوب';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateInfo()) {
      setStep('confirm');
    }
  };

  const handleConfirmOrder = async () => {
    if (!agreed) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: addCsrfHeader({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          customerInfo: {
            ...customerInfo,
            address: `${GOVERNORATES.find(g => g.value === customerInfo.governorate)?.label} - ${customerInfo.address}`
          },
          items: cartItems.map(item => ({
            ...item,
            productId: item.id
          })),
          total: cartTotal,
          couponCode: appliedCoupon ? appliedCoupon.code : undefined,
          // Loyalty points data
          usePoints: loyaltyData.usePoints,
          useCashback: loyaltyData.useCashback,
          pointsToUse: loyaltyData.pointsToUse,
          cashbackToUse: loyaltyData.cashbackToUse,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل في إنشاء الطلب");
      }

      const orderData = await response.json();

      onCheckoutComplete({
        customerInfo,
        items: cartItems,
        total: cartTotal,
        orderId: orderData.id,
        orderNumber: orderData.id
      });

      setStep('info');
      setCustomerInfo({ name: '', phone: '', governorate: '', address: '', notes: '' });
      setAgreed(false);
      onOpenChange(false);

      // Navigate to confirmation page
      window.location.href = `/order-confirmation/${orderData.id}`;
    } catch (error: unknown) {
      console.error("Checkout error:", error);
      const message = error instanceof Error ? error.message : "حدث خطأ";
      toast({
        title: "خطأ في الطلب",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setStep('info');
  };

  // Shipping Logic
  const deliveryFee = (cartTotal > 100000 || appliedCoupon?.type === "free_shipping") ? 0 : 5000;
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
        setCouponSuccess("تم تطبيق شحن مجاني 🚚");
      }
    } catch (error) {
      console.error("Coupon error:", error);
      setCouponError("حدث خطأ أثناء التحقق من الكوبون");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            {step === 'info' ? (
              <>
                <User className="h-5 w-5 text-primary" />
                <span className="text-primary">أهلاً بك في عائلة AQUAVO! 🐟</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                تأكيد انضمام منتجاتك الجديدة للعائلة
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 'info'
              ? 'نحن متحمسون لتجهيز طلبك! يرجى ملء البيانات التالية لنقوم بإيصال السعادة إليك.'
              : 'راجع تفاصيل طلبك بعناية، نحن نريد أن تكون تجربتك مثالية.'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Mascot appearing at purchase */}
        <div className="absolute top-0 left-0 hidden md:block -translate-x-full translate-y-10 z-50">
          <ShrimpMascot
            mood={isFreeShipping ? "excited" : "thinking"}
            size="md"
            message={isFreeShipping ? "يا سلام! توصيل مجاني! 🚚🎉" : `باقي ${formatIQD(100000 - cartTotal)} للتوصيل المجاني!`}
            className={isFreeShipping ? "scale-110" : "opacity-80"}
          />
        </div>

        {/* Mobile Mascot */}
        <div className="md:hidden flex justify-center mb-4">
          <ShrimpMascot
            mood={isFreeShipping ? "excited" : "thinking"}
            size="sm"
            message={isFreeShipping ? "توصيل مجاني! 🎉" : "شحن مجاني > 100 ألف"}
          />
        </div>

        {step === 'info' ? (
          <>
            <CustomerInfoForm
              customerInfo={customerInfo}
              setCustomerInfo={setCustomerInfo}
              errors={errors}
              isGuest={!user}
            />

            <div className="my-4" />

            <div className="space-y-4">
              <CouponSection
                couponCode={couponCode}
                setCouponCode={setCouponCode}
                applyCoupon={applyCoupon}
                couponError={couponError}
                couponSuccess={couponSuccess}
              />

              {/* Loyalty Points Section - Only for logged-in users */}
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
              />

              <Button onClick={handleContinue} className="w-full" size="lg">
                متابعة للتأكيد
              </Button>
            </div>
          </>
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
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
