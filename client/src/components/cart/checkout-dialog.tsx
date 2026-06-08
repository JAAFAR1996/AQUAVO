import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatIQD } from "@/lib/utils";
import { CartItem, useCart } from "@/contexts/cart-context";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";
import { ttqInitiateCheckout, ttqAddPaymentInfo, ttqPlaceAnOrder } from "@/lib/tiktok-pixel";
import { metaTrackInitiateCheckout, metaTrackPurchase } from "@/lib/meta-pixel";
import { trackBeginCheckout, trackPurchase } from "@/lib/analytics";
import { phTrackInitiateCheckout, phTrackPurchase } from "@/lib/posthog";

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
  onCheckoutComplete: (orderData: {
    customerInfo: CustomerInfo;
    items: CartItem[];
    total: number;
    subtotal?: number;
    deliveryFee?: number;
    discount?: number;
    roundedTotal?: number;
    cashbackUsed?: number;
    pointsEarned?: number;
    cashbackEarned?: number;
    orderId?: string;
    orderNumber?: string;
  }) => void;
}

interface ServerOrderItem {
  productId?: string;
  productName?: string;
  quantity?: number;
  priceAtPurchase?: string | number;
  lineTotal?: string | number;
  variantId?: string;
  variantLabel?: string;
}

const findMatchingCartItem = (cartItems: CartItem[], serverItem: ServerOrderItem) => {
  if (!serverItem.productId) return undefined;

  if (serverItem.variantId) {
    const variantMatch = cartItems.find(
      (cartItem) =>
        cartItem.productId === serverItem.productId &&
        cartItem.variantId === serverItem.variantId
    );
    if (variantMatch) return variantMatch;
  }

  if (serverItem.variantLabel) {
    const labelMatch = cartItems.find(
      (cartItem) =>
        cartItem.productId === serverItem.productId &&
        cartItem.variantLabel === serverItem.variantLabel
    );
    if (labelMatch) return labelMatch;
  }

  return cartItems.find(
    (cartItem) => cartItem.productId === serverItem.productId && !cartItem.variantId
  ) ?? cartItems.find((cartItem) => cartItem.productId === serverItem.productId);
};

export function CheckoutDialog({ open, onOpenChange, cartItems, cartTotal, onCheckoutComplete }: CheckoutDialogProps) {
  const { user } = useAuth();
  const { clearCart } = useCart();
  const { toast } = useToast();

  // Read shipping fee from settings (admin-configurable)
  const { data: shippingConfig } = useQuery<{ shippingFee: number }>({
    queryKey: ["/api/settings/shipping"],
    staleTime: 1000 * 60 * 10,
  });
  const SHIPPING_FEE = shippingConfig?.shippingFee ?? 5000;
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

  // TikTok Pixel: InitiateCheckout when dialog opens
  useEffect(() => {
    if (open && cartItems.length > 0) {
      try {
        ttqInitiateCheckout(
          cartItems.map(item => ({
            id: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
          cartTotal
        );
        metaTrackInitiateCheckout({
          totalIQD: grandTotal,
          numItems: cartItems.reduce((sum, i) => sum + i.quantity, 0),
          productIds: cartItems.map(i => i.productId),
        });
        trackBeginCheckout(
          cartItems.map(item => ({
            id: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
          cartTotal
        );
        phTrackInitiateCheckout({
          numItems: cartItems.reduce((sum, i) => sum + i.quantity, 0),
          totalValue: cartTotal,
        });
      } catch (_) { /* pixel error — never block checkout */ }
    }
  }, [open]);

  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; type: string; value: number } | null>(null);

  const getDeliveryEstimate = () => {
    return "توصيل خلال 24 ساعة";
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
      // TikTok Pixel: AddPaymentInfo when user proceeds to confirm
      ttqAddPaymentInfo(
        cartItems.map(item => ({
          id: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        cartTotal
      );
      setStep('confirm');
    }
  };

  const handleConfirmOrder = async () => {
    if (!agreed) return;

    setIsSubmitting(true);
    try {
      const governorateLabel = GOVERNORATES.find(g => g.value === customerInfo.governorate)?.label;
      const submittedCustomerInfo = {
        ...customerInfo,
        address: `${governorateLabel || customerInfo.governorate} - ${customerInfo.address}`,
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        credentials: "include",
        headers: addCsrfHeader({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          customerInfo: submittedCustomerInfo,
          items: cartItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            ...(item.variantId ? { variantId: item.variantId } : {}),
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
      const serverTotal = Number(orderData.total ?? grandTotal);
      const serverDeliveryFee = Number(orderData.shippingCost ?? deliveryFee);
      const serverDiscount = Number(orderData.discountTotal ?? discount);
      const serverRoundedTotal = Number(orderData.loyalty?.roundedTotal ?? orderData.roundedTotal ?? serverTotal);
      const serverItems = Array.isArray(orderData.items) ? orderData.items as ServerOrderItem[] : [];
      const invoiceItems = serverItems.length > 0
        ? serverItems.map((item) => {
            const cartItem = findMatchingCartItem(cartItems, item);
            const productId = item.productId || cartItem?.productId || cartItem?.id || "";
            const variantId = item.variantId ?? cartItem?.variantId;
            const variantLabel = item.variantLabel ?? cartItem?.variantLabel;
            return {
              id: cartItem?.id || (variantId ? `${productId}-${variantId}` : productId),
              productId,
              name: item.productName || cartItem?.name || productId,
              price: Number(item.priceAtPurchase ?? cartItem?.price ?? 0),
              quantity: item.quantity || cartItem?.quantity || 1,
              image: cartItem?.image || "",
              slug: cartItem?.slug || "",
              variantId,
              variantLabel,
            };
          })
        : cartItems;
      const serverSubtotal = invoiceItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // Complete order first — never let pixel errors block this
      onCheckoutComplete({
        customerInfo: submittedCustomerInfo,
        items: invoiceItems,
        total: serverTotal,
        subtotal: serverSubtotal,
        deliveryFee: serverDeliveryFee,
        discount: serverDiscount,
        roundedTotal: serverRoundedTotal,
        cashbackUsed: orderData.loyalty?.cashbackUsed ?? 0,
        pointsEarned: orderData.loyalty?.pointsEarned ?? 0,
        cashbackEarned: orderData.loyalty?.cashbackEarned ?? 0,
        orderId: orderData.id,
        orderNumber: orderData.orderNumber ?? orderData.id
      });

      clearCart();
      setStep('info');
      setCustomerInfo({ name: '', phone: '', governorate: '', address: '', notes: '' });
      setAgreed(false);
      onOpenChange(false);

      // Fire-and-forget pixel tracking — errors must never block checkout
      try {
        ttqPlaceAnOrder(
          cartItems.map(item => ({
            id: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
          cartTotal
        );
      } catch (_) { /* pixel error — ignore */ }
      try {
        metaTrackPurchase({
          orderId: orderData.orderNumber || orderData.id || 'unknown',
          totalIQD: serverTotal,
          productIds: cartItems.map(i => i.productId),
          numItems: cartItems.reduce((sum, i) => sum + i.quantity, 0),
          phone: customerInfo.phone,
        });
      } catch (_) { /* pixel error — ignore */ }
      try {
        trackPurchase({
          orderId: orderData.id || 'unknown',
          total: cartTotal,
          items: cartItems.map(item => ({
            id: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        });
        phTrackPurchase({
          orderId: orderData.id || 'unknown',
          totalValue: cartTotal,
          numItems: cartItems.reduce((sum, i) => sum + i.quantity, 0),
        });
      } catch (_) { /* pixel error — ignore */ }
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

  // Shipping: ثابت لكل العراق — يُقرأ من إعدادات الأدمن
  const deliveryFee = SHIPPING_FEE;
  const isFreeShipping = false;
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
      } else {
        setCouponError("التوصيل ثابت 5,000 د.ع لبغداد وكل المحافظات خلال 24 ساعة");
      }
    } catch (error) {
      console.error("Coupon error:", error);
      setCouponError("حدث خطأ أثناء التحقق من الكوبون");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {step === 'info' ? 'إتمام الطلب' : 'تأكيد الطلب'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {step === 'info'
              ? 'أدخل بيانات التوصيل لإكمال طلبك'
              : 'راجع تفاصيل طلبك قبل التأكيد'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'info' ? (
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
              isLoggedIn={!!user}
            />

            <Button onClick={handleContinue} className="w-full h-12 text-base font-semibold" size="lg" disabled={isSubmitting}>
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
      </DialogContent>
    </Dialog>
  );
}
