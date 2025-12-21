import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Phone, User, MapPin, CheckCircle2, AlertCircle, Tag, Info, Sparkles } from "lucide-react";
import { formatIQD } from "@/lib/utils";
import { CartItem } from "@/contexts/cart-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { useEffect } from "react";
import { ShrimpMascot } from "@/components/gamification/shrimp-mascot";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";

interface CustomerInfo {
  name: string;
  phone: string;
  governorate: string;
  address: string;
  notes: string;
}

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

  const governorates = [
    { value: "baghdad", label: "بغداد" },
    { value: "basra", label: "البصرة" },
    { value: "ninawa", label: "نينوى" },
    { value: "erbil", label: "أربيل" },
    { value: "duhok", label: "دهوك" },
    { value: "sulaymaniyah", label: "السليمانية" },
    { value: "kirkuk", label: "كركوك" },
    { value: "anbar", label: "الأنبار" },
    { value: "diyala", label: "ديالى" },
    { value: "babil", label: "بابل" },
    { value: "karbala", label: "كربلاء" },
    { value: "najaf", label: "النجف" },
    { value: "wasit", label: "واسط" },
    { value: "qadisiyah", label: "القادسية" },
    { value: "maysan", label: "ميسان" },
    { value: "dhi_qar", label: "ذي قار" },
    { value: "muthanna", label: "المثنى" },
    { value: "saladin", label: "صلاح الدين" }
  ];

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
            address: `${governorates.find(g => g.value === customerInfo.governorate)?.label} - ${customerInfo.address}`
          },
          items: cartItems.map(item => ({
            ...item,
            productId: item.id
          })),
          total: cartTotal, // Note: backend might recalculate this for security, but we send it for now
          couponCode: appliedCoupon ? appliedCoupon.code : undefined
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
        orderNumber: orderData.id // Using ID as orderNumber from backend
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



  // Shipping Logic: Free if > 100,000 IQD or if Free Shipping coupon applied
  const deliveryFee = (cartTotal > 100000 || appliedCoupon?.type === "free_shipping") ? 0 : 5000;
  const isFreeShipping = deliveryFee === 0;
  const discount = couponDiscount;
  const grandTotal = cartTotal + deliveryFee - discount;



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
        setCouponDiscount(0); // Discount is applied to shipping fee logic
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
          <div className="space-y-4 mt-4">
            {/* Guest Checkout Note */}
            {/* Guest Checkout Note - Only show if not logged in */}
            {!user && (
              <Alert className="bg-primary/5 border-primary/20">
                <Sparkles className="h-4 w-4 text-primary" />
                <AlertDescription className="text-sm">
                  <Link href="/login">
                    <span className="text-primary font-semibold hover:underline cursor-pointer">سجل دخولك</span>
                  </Link>
                  {" "}لتصبح فرداً من عائلتنا وتتمتع بمزايا الولاء، أو أكمل كضيف عزيز.
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                الاسم الكامل
              </Label>
              <Input
                id="name"
                placeholder="أدخل اسمك الكامل"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                رقم الهاتف
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="07801234567"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                className={errors.phone ? 'border-red-500' : ''}
                dir="ltr"
              />
              {errors.phone && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.phone}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="governorate" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                المحافظة
              </Label>
              <Select
                value={customerInfo.governorate}
                onValueChange={(value) => setCustomerInfo({ ...customerInfo, governorate: value })}
              >
                <SelectTrigger className={errors.governorate ? 'border-red-500 text-right' : 'text-right'}>
                  <SelectValue placeholder="اختر المحافظة" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {governorates.map((gov) => (
                    <SelectItem key={gov.value} value={gov.value} className="text-right">
                      {gov.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.governorate && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.governorate}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                العنوان
              </Label>
              <Input
                id="address"
                placeholder="المنطقة، الشارع، أقرب نقطة دالة..."
                value={customerInfo.address}
                onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                className={errors.address ? 'border-red-500' : ''}
              />
              {errors.address && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.address}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات إضافية (اختياري)</Label>
              <Input
                id="notes"
                placeholder="أي ملاحظات للتوصيل..."
                value={customerInfo.notes}
                onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
              />
            </div>

            <Separator className="my-4" />

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              {/* Coupon Code - Premium Golden Theme */}
              <div className="space-y-2 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950/30 dark:via-yellow-950/30 dark:to-orange-950/30 p-4 rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-700 shadow-sm">
                <Label className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-base">
                  <span className="text-lg">🎁</span>
                  <Tag className="h-4 w-4" />
                  هل لديك كوبون خصم؟
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="أدخل كود الخصم هنا..."
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 bg-white dark:bg-background border-amber-200 dark:border-amber-800 focus:border-amber-400 focus:ring-amber-400"
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    onClick={applyCoupon}
                    className="min-w-[90px] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-md hover:shadow-lg transition-all"
                  >
                    تطبيق ✨
                  </Button>
                </div>
                {couponError && (
                  <p className="text-sm text-red-500 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 bg-red-50 dark:bg-red-950/30 p-2 rounded-lg">
                    <AlertCircle className="h-3 w-3" />
                    {couponError}
                  </p>
                )}
                {couponSuccess && (
                  <p className="text-sm text-green-600 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 bg-green-50 dark:bg-green-950/30 p-2 rounded-lg font-medium">
                    <CheckCircle2 className="h-3 w-3" />
                    {couponSuccess}
                  </p>
                )}
              </div>

              <Separator />

              <div className="flex justify-between text-sm">
                <span>المجموع الفرعي:</span>
                <span>{formatIQD(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>رسوم التوصيل:</span>
                {isFreeShipping ? (
                  <span className="text-green-600 font-bold">مجاني 🎁</span>
                ) : (
                  <span>{formatIQD(deliveryFee)}</span>
                )}
              </div>
              {!isFreeShipping && (
                <div className="text-xs text-orange-600 font-bold mt-1 text-center bg-orange-50 p-2 rounded border border-orange-100 dark:bg-orange-950/20 dark:border-orange-900">
                  خيار ممتاز! الأسماك بانتظارك 🐠
                  <br />
                  <span className="text-muted-foreground font-normal">
                    (باقي لك {formatIQD(100000 - cartTotal)} للحصول على توصيل مجاني!)
                  </span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>الخصم:</span>
                  <span>-{formatIQD(discount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>المجموع الكلي:</span>
                <span className="text-primary">{formatIQD(grandTotal)}</span>
              </div>

              <div className="mt-2 text-center bg-green-50 text-green-700 py-2 rounded-md text-sm font-bold border border-green-100 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800">
                💰 طريقة الدفع: الدفع عند الاستلام
                <div className="text-xs font-normal mt-1 opacity-90">
                  ⏱️ التوصيل المتوقع: {getDeliveryEstimate()}
                </div>
              </div>
            </div>

            <Button onClick={handleContinue} className="w-full" size="lg">
              متابعة للتأكيد
            </Button>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
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
                    {governorates.find(g => g.value === customerInfo.governorate)?.label} - {customerInfo.address}
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

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>المجموع الفرعي:</span>
                <span>{formatIQD(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>رسوم التوصيل:</span>
                {isFreeShipping ? (
                  <span className="text-green-600 font-bold">مجاني 🎁</span>
                ) : (
                  <span>{formatIQD(deliveryFee)}</span>
                )}
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>المجموع الكلي:</span>
                <span className="text-primary">{formatIQD(grandTotal)}</span>
              </div>

              <div className="mt-2 text-center bg-blue-50 text-blue-700 py-2 rounded-md text-sm font-medium border border-blue-100">
                💰 طريقة الدفع: الدفع عند الاستلام
                <div className="text-xs font-normal mt-1 opacity-90">
                  ⏱️ التوصيل المتوقع: {getDeliveryEstimate()}
                </div>
              </div>
            </div>

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
        )}
      </DialogContent>
    </Dialog>
  );
}
