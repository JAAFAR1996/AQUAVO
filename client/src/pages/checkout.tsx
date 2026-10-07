import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { formatIQD } from "@/lib/utils";
import { useCart } from "@/contexts/cart-context";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";
import { ttqInitiateCheckout, ttqAddPaymentInfo, ttqPlaceAnOrder } from "@/lib/tiktok-pixel";
import { phTrackCheckoutStep, phTrackInitiateCheckout, phTrackPurchase } from "@/lib/posthog";
import { metaTrackInitiateCheckout, metaTrackPurchase } from "@/lib/meta-pixel";
import { trackAddShippingInfo, trackBeginCheckout, trackPurchase } from "@/lib/analytics";
import { DELIVERY_DAYS } from "@/lib/constants/shipping";
import { ArrowRight, ShoppingCart, MessageCircle, Instagram, Loader2 } from "lucide-react";
import { MetaTags } from "@/components/seo/meta-tags";
import { resolveCheckoutTotal } from "@/lib/checkout-total";
import { clearOrderIdempotencyKey, getOrderIdempotencyKey } from "@/lib/order-idempotency";
import { getClientSessionId } from "@/lib/client-session";
import { orderAttributionPayload } from "@/lib/attribution";

import { stashOrder } from "@/lib/order-stash";
import { CustomerInfo, GOVERNORATES } from "@/components/cart/checkout/types";
import { CustomerInfoForm, normalizePhoneInputDigits } from "@/components/cart/checkout/customer-info-form";
import { CouponSection } from "@/components/cart/checkout/coupon-section";
import { OrderSummary } from "@/components/cart/checkout/order-summary";
import { ConfirmationView } from "@/components/cart/checkout/confirmation-view";
import { CheckoutLoyaltySection } from "@/components/cart/checkout/loyalty-section";
import { CheckoutSuccessFallback } from "@/components/cart/checkout/checkout-success-fallback";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/locale-context";
import { ArrowBack } from "@/components/ui/directional-icons";
import { useShippingFee } from "@/contexts/shipping-fee-context";

const CHECKOUT_DRAFT_STORAGE_KEY = "aquavo_checkout_delivery_draft_v1";

function readCheckoutDeliveryDraft(): CustomerInfo {
  const empty: CustomerInfo = { name: "", phone: "", governorate: "", address: "", notes: "" };
  if (typeof window === "undefined") return empty;
  try {
    const raw = sessionStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<CustomerInfo>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      governorate: typeof parsed.governorate === "string" ? parsed.governorate : "",
      address: typeof parsed.address === "string" ? parsed.address : "",
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
    };
  } catch {
    return empty;
  }
}

function clearCheckoutDeliveryDraft(): void {
  try { sessionStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY); } catch { /* optional storage */ }
}

export default function CheckoutPage() {
  const { t } = useTranslation("checkout");
  const { dir } = useLocale();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { items: cartItems, totalPrice: cartTotal, clearCart, refetchCart, isReady: isCartReady } = useCart();
  const canUseTestMode = user?.role === "admin" || user?.role === "accounting_admin";
  const testRequested = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("test") === "1";
  const [testMode, setTestMode] = useState(testRequested);

  const configuredShippingFee = useShippingFee();

  const [step, setStep] = useState<"info" | "confirm" | "success">("info");
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>(() => readCheckoutDeliveryDraft());
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

  const resetCommercialAdjustments = useCallback(() => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponError("");
    setCouponSuccess("");
    setLoyaltyData({
      usePoints: false,
      useCashback: false,
      pointsToUse: 0,
      cashbackToUse: 0,
      pointsDiscount: 0,
      roundedAmount: 0,
      cashbackEarned: 0,
    });
  }, []);

  const setSafeTestMode = (enabled: boolean) => {
    setTestMode(enabled);
    if (enabled) {
      resetCommercialAdjustments();
      setCouponCode("");
    }
  };

  const emptyRedirectTrackedRef = useRef(false);
  useEffect(() => {
    if (!isCartReady || step === "success") return;
    if (cartItems.length === 0) {
      if (!emptyRedirectTrackedRef.current && !testMode) {
        emptyRedirectTrackedRef.current = true;
        phTrackCheckoutStep({ step: "empty_cart_redirect", numItems: 0, totalValue: 0 });
      }
      setLocation("/");
    }
  }, [isCartReady, cartItems.length, step, testMode, setLocation]);

  useEffect(() => {
    if (user) {
      setCustomerInfo((prev) => ({
        ...prev,
        name: user.fullName?.trim().toLowerCase() === "system admin"
          ? prev.name
          : (user.fullName || prev.name),
        phone: normalizePhoneInputDigits(user.phone || prev.phone),
      }));
      if (testMode && user.role !== "admin" && user.role !== "accounting_admin") {
        setTestMode(false);
      }
    }
  }, [user]);

  useEffect(() => {
    if (testMode) return;
    try {
      sessionStorage.setItem(CHECKOUT_DRAFT_STORAGE_KEY, JSON.stringify(customerInfo));
    } catch {
      // Checkout must remain usable when storage is unavailable.
    }
  }, [customerInfo, testMode]);

  const checkoutTrackedRef = useRef(false);
  useEffect(() => {
    if (isCartReady && cartItems.length > 0 && !testMode && !checkoutTrackedRef.current) {
      checkoutTrackedRef.current = true;
      phTrackCheckoutStep({
        step: "checkout_loaded",
        numItems: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        totalValue: cartTotal,
      });
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
  }, [isCartReady, cartItems.length, cartTotal, testMode]);

  const [agreed, setAgreed] = useState(false);
  const [whatsappMarketingOptIn, setWhatsappMarketingOptIn] = useState(false);
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
    return t("deliveryEstimate", { days: DELIVERY_DAYS });
  };

  const validatePhone = (phone: string): boolean => {
    const cleanPhone = normalizePhoneInputDigits(phone).replace(/\s/g, "");
    const iraqiPhoneRegex = /^(\+964|964|0)?7[3-9]\d{8}$/;
    return iraqiPhoneRegex.test(cleanPhone);
  };

  const FIELD_ORDER = ["name", "phone", "governorate", "address"] as const;

  const validateInfo = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!customerInfo.name.trim()) newErrors.name = t("validation.nameRequired");
    if (!customerInfo.phone.trim()) newErrors.phone = t("validation.phoneRequired");
    else if (!validatePhone(customerInfo.phone))
      newErrors.phone = t("validation.phoneInvalid");
    if (!customerInfo.governorate) newErrors.governorate = t("validation.governorateRequired");
    if (!customerInfo.address.trim()) newErrors.address = t("validation.addressRequired");
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setFormErrorSummary(t("validation.summary", { count: Object.keys(newErrors).length }));
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

  const findStockIssue = (items: typeof cartItems) =>
    items.find((item) =>
      item.stock != null &&
      Number.isFinite(Number(item.stock)) &&
      item.quantity > Number(item.stock)
    );

  const cartCommercialFingerprint = (items: typeof cartItems) =>
    JSON.stringify(
      items
        .map((item) => ({
          productId: item.productId,
          variantId: item.variantId ?? null,
          quantity: item.quantity,
          price: Number(item.price),
        }))
        .sort((left, right) =>
          `${left.productId}::${left.variantId ?? ""}`.localeCompare(
            `${right.productId}::${right.variantId ?? ""}`,
          ),
        ),
    );

  const cartCommerciallyChanged = (before: typeof cartItems, after: typeof cartItems) =>
    cartCommercialFingerprint(before) !== cartCommercialFingerprint(after);


  const surfaceStockIssue = (item: (typeof cartItems)[number]) => {
    const available = Math.max(0, Number(item.stock ?? 0));
    toast({
      title: t("errors.stockChangedTitle"),
      description: available <= 0
        ? t("errors.stockUnavailable", { name: item.name })
        : t("errors.stockQuantityChanged", {
            name: item.name,
            requested: item.quantity,
            available,
          }),
      variant: "destructive",
    });
  };

  const handleContinue = async () => {
    if (validateInfo()) {
      const latestCart = await refetchCart();
      const stockIssue = findStockIssue(latestCart);
      if (stockIssue) {
        surfaceStockIssue(stockIssue);
        return;
      }
      if (latestCart.length === 0) {
        toast({
          title: t("errors.cartChangedTitle"),
          description: t("errors.cartEmptyAfterRefresh"),
          variant: "destructive",
        });
        return;
      }
      if (cartCommerciallyChanged(cartItems, latestCart)) {
        resetCommercialAdjustments();
        toast({
          title: t("errors.cartChangedTitle"),
          description: t("errors.cartUpdatedReview"),
        });
        return;
      }

      if (!testMode) {
        phTrackCheckoutStep({
          step: "customer_info_completed",
          numItems: latestCart.reduce((sum, item) => sum + item.quantity, 0),
          totalValue: latestCart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        });
        trackAddShippingInfo(latestCart.map((item) => ({
          id: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })), latestCart.reduce((sum, item) => sum + item.price * item.quantity, 0));
        ttqAddPaymentInfo(
          latestCart.map((item) => ({
            id: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
          latestCart.reduce((sum, item) => sum + item.price * item.quantity, 0)
        );
      }
      setStep("confirm");
      window.scrollTo(0, 0);
    }
  };

  const handleConfirmOrder = async () => {
    if (!agreed || isSubmitting) return;

    const latestCart = await refetchCart();
    const stockIssue = findStockIssue(latestCart);
    if (stockIssue) {
      surfaceStockIssue(stockIssue);
      setStep("info");
      return;
    }
    if (latestCart.length === 0) {
      toast({
        title: t("errors.cartChangedTitle"),
        description: t("errors.cartEmptyAfterRefresh"),
        variant: "destructive",
      });
      setStep("info");
      return;
    }
    if (cartCommerciallyChanged(cartItems, latestCart)) {
      setAgreed(false);
      resetCommercialAdjustments();
      toast({
        title: t("errors.cartChangedTitle"),
        description: t("errors.cartUpdatedConfirm"),
      });
      return;
    }

    const checkoutItems = latestCart;
    const checkoutSubtotal = checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const checkoutGrandTotal = Math.max(0, checkoutSubtotal + deliveryFee - discount);

    let failureTracked = false;
    setIsSubmitting(true);
    if (!testMode) {
      phTrackCheckoutStep({
        step: "order_submit_started",
        numItems: checkoutItems.reduce((sum, item) => sum + item.quantity, 0),
        totalValue: checkoutGrandTotal,
        paymentMethod: "cod",
      });
    }
    try {
      const cartSignature = JSON.stringify({
        items: checkoutItems.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })),
        couponCode: testMode ? null : appliedCoupon?.code ?? null,
        cashbackToUse: testMode ? 0 : loyaltyData.cashbackToUse,
        whatsappMarketingOptIn: testMode ? false : whatsappMarketingOptIn,
        testMode,
      });
      const idempotencyKey = getOrderIdempotencyKey(cartSignature);
      const response = await fetch(testMode ? "/api/orders/test" : "/api/orders", {
        method: "POST",
        headers: addCsrfHeader({
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        }),
        credentials: "include",
        body: JSON.stringify({
          clientSessionId: getClientSessionId(),
          attribution: orderAttributionPayload(),
          customerInfo: {
            ...customerInfo,
            address: `${GOVERNORATES.find((g) => g.value === customerInfo.governorate)?.label} - ${customerInfo.address}`,
          },
          items: checkoutItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            ...(item.variantId ? { variantId: item.variantId } : {}),
          })),
          total: checkoutSubtotal,
          couponCode: testMode ? undefined : appliedCoupon ? appliedCoupon.code : undefined,
          usePoints: testMode ? false : loyaltyData.usePoints,
          useCashback: testMode ? false : loyaltyData.useCashback,
          pointsToUse: testMode ? 0 : loyaltyData.pointsToUse,
          cashbackToUse: testMode ? 0 : loyaltyData.cashbackToUse,
          whatsappMarketingOptIn: testMode ? false : whatsappMarketingOptIn,
          ...(testMode ? { notifyTelegram: true } : {}),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (!testMode) {
          failureTracked = true;
          phTrackCheckoutStep({
            step: "order_submit_failed",
            numItems: checkoutItems.reduce((sum, item) => sum + item.quantity, 0),
            totalValue: checkoutGrandTotal,
            paymentMethod: "cod",
            statusCode: response.status,
            errorCode: typeof errorData?.code === "string" ? errorData.code : `HTTP_${response.status}`,
          });
        }
        throw new Error(errorData?.message || t("errors.createFailed", { status: response.status }));
      }

      const orderData = await response.json();
      if (!testMode) {
        phTrackCheckoutStep({
          step: "order_created",
          numItems: checkoutItems.reduce((sum, item) => sum + item.quantity, 0),
          totalValue: checkoutGrandTotal,
          paymentMethod: "cod",
        });
      }
      const confirmedTotal = resolveCheckoutTotal(orderData, checkoutGrandTotal);

      if (!testMode) {
        ttqPlaceAnOrder(
          checkoutItems.map((item) => ({
            id: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
          checkoutSubtotal
        );
        metaTrackPurchase({
          orderId: orderData.orderNumber || orderData.id || "unknown",
          totalIQD: confirmedTotal,
          productIds: checkoutItems.map((i) => i.productId),
          numItems: checkoutItems.reduce((sum, i) => sum + i.quantity, 0),
          phone: customerInfo.phone,
        });
        // Reached only after `response.ok` and a parsed order body, so a failed submission cannot emit it.
        // Note this deliberately does NOT forward customerInfo.phone the way the Meta call above does:
        // Meta hashes it for CAPI matching, PostHog would simply store it.
        phTrackPurchase({
          orderId: orderData.orderNumber ?? orderData.id,
          totalValue: confirmedTotal,
          numItems: checkoutItems.reduce((sum, i) => sum + i.quantity, 0),
          productIds: checkoutItems.map((i) => i.productId),
          sourcePage: "checkout",
        });
        trackPurchase({
          orderId: orderData.orderNumber || orderData.id || "unknown",
          total: confirmedTotal,
          items: checkoutItems.map((item) => ({
            id: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        });
      }

      setOrderResult({
        orderId: orderData.id,
        orderNumber: orderData.orderNumber ?? orderData.id,
      });
      setStep("success");
      clearOrderIdempotencyKey();
      if (!testMode) clearCheckoutDeliveryDraft();

      if (testMode) {
        clearCart();
        window.scrollTo(0, 0);
        return;
      }

      if (orderData.id) {
        const governorateLabel = GOVERNORATES.find((g) => g.value === customerInfo.governorate)?.label;
        stashOrder({
          id: orderData.id,
          orderNumber: orderData.orderNumber ?? orderData.id,
          total: confirmedTotal,
          status: orderData.status,
          items: checkoutItems.map((item) => ({
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
      if (!testMode && !failureTracked) {
        phTrackCheckoutStep({
          step: "order_submit_failed",
          numItems: checkoutItems.reduce((sum, item) => sum + item.quantity, 0),
          totalValue: checkoutGrandTotal,
          paymentMethod: "cod",
          errorCode: "CLIENT_OR_NETWORK_ERROR",
        });
      }
      const message = error instanceof Error ? error.message : t("errors.generic");
      toast({ title: t("errors.orderTitle"), description: message, variant: "destructive" });
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

  const baseDeliveryFee = configuredShippingFee;
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
        setCouponError(error.message || t("coupon.invalid"));
        return;
      }
      const coupon = await response.json();
      if (coupon.type === "percentage") {
        setAppliedCoupon(coupon);
        const discountAmount = Math.round(cartTotal * (Number(coupon.value) / 100));
        setCouponDiscount(discountAmount);
        setCouponSuccess(t("coupon.appliedPercent", { value: coupon.value, amount: formatIQD(discountAmount) }));
      } else if (coupon.type === "fixed") {
        setAppliedCoupon(coupon);
        const discountAmount = Number(coupon.value);
        setCouponDiscount(discountAmount);
        setCouponSuccess(t("coupon.appliedFixed", { amount: formatIQD(discountAmount) }));
      } else if (coupon.type === "free_shipping") {
        setAppliedCoupon(coupon);
        setCouponDiscount(0);
        setCouponSuccess(t("coupon.appliedFreeShipping"));
      } else {
        setCouponError(t("coupon.unsupported"));
      }
    } catch (error) {
      console.error("Coupon error:", error);
      setCouponError(t("coupon.checkError"));
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const whatsappCartItems = cartItems
    .map((item) => `- ${item.name}${item.variantLabel ? ` (${item.variantLabel})` : ""} × ${item.quantity}`)
    .join("\n");
  const whatsappCheckoutMessage = t("footer.whatsappPrefill", {
    items: whatsappCartItems,
    total: formatIQD(cartTotal),
  });

  if (!isCartReady && step !== "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" role="status" aria-live="polite">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span>{t("steps.loadingCart")}</span>
        </div>
      </div>
    );
  }

  if (step === "success" && orderResult) {
    return (
      <>
        <MetaTags title={testMode ? t("meta.testSuccess") : t("meta.success")} noIndex />
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
    <div className="min-h-screen bg-background flex flex-col" dir={dir}>
      <MetaTags title={t("meta.title")} noIndex />

      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="gap-2">
            <ArrowBack className="w-4 h-4" aria-hidden="true" />
            {t("steps.back")}
          </Button>
          <h1 ref={stepHeadingRef} tabIndex={-1} className="text-lg font-bold outline-none">{step === "info" ? t("steps.info") : t("steps.confirm")}</h1>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <ShoppingCart className="w-4 h-4" aria-hidden="true" />
            {cartItems.length}
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1 container mx-auto px-4 pt-6 pb-0 max-w-lg">
        {step === "info" ? (
          <div className="space-y-5">
            <CustomerInfoForm
              customerInfo={customerInfo}
              setCustomerInfo={setCustomerInfo}
              errors={errors}
              isGuest={!user}
            />

            {canUseTestMode && (
              <label className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={testMode}
                  onChange={(event) => setSafeTestMode(event.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span className="space-y-1">
                  <span className="block font-semibold text-sm">{t("testMode.label")}</span>
                  <span className="block text-xs text-muted-foreground">
                    {t("testMode.hint")}
                  </span>
                </span>
              </label>
            )}

            {!testMode && (
              <CouponSection
                couponCode={couponCode}
                setCouponCode={setCouponCode}
                applyCoupon={applyCoupon}
                couponError={couponError}
                couponSuccess={couponSuccess}
                isApplying={isApplyingCoupon}
              />
            )}

            {user && !testMode && (
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
              {t("steps.review")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {testMode && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                <strong>{t("testMode.bannerTitle")}</strong> {t("testMode.banner")}
              </div>
            )}
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
              whatsappMarketingOptIn={whatsappMarketingOptIn}
              setWhatsappMarketingOptIn={setWhatsappMarketingOptIn}
            />
          </div>
        )}
      </main>

      <footer className="container mx-auto px-4 max-w-lg py-6 mt-6 border-t border-border/40 text-center" dir={dir}>
        <p className="text-sm font-semibold text-foreground mb-1">AQUAVO</p>
        <p className="text-xs text-muted-foreground mb-3">{t("footer.tagline")}</p>
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mb-3">
          <span>{t("footer.payment")}</span>
          <span className="opacity-40">·</span>
          <span>{t("footer.delivery")}</span>
        </div>
        <div className="flex items-center justify-center gap-4">
          <WhatsAppLink
            source="checkout"
            message={whatsappCheckoutMessage}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-green-500 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
            {t("footer.whatsappHelp")}
          </WhatsAppLink>
          <a
            href="https://www.instagram.com/aquavo_iq"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Instagram className="w-3.5 h-3.5" aria-hidden="true" />
            Instagram
          </a>
        </div>
      </footer>
    </div>
  );
}