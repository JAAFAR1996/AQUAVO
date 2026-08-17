import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Home,
  Package,
  PackageCheck,
  Phone,
  Search,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { useState } from "react";

interface TrackingApiResponse {
  orderNumber: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  estimatedDelivery?: string | null;
}

interface OrderStatus {
  id: string;
  title: string;
  description: string;
  time: string | null;
  completed: boolean;
  current: boolean;
}

interface OrderDetails {
  orderNumber: string;
  orderDate: string;
  status: string;
  courier: string;
  trackingNumber: string | null;
  timeline: OrderStatus[];
}

const STATUS_COPY: Record<string, { label: string; description: string }> = {
  pending: {
    label: "قيد الانتظار",
    description: "استلمنا طلبك وهو بانتظار بدء التجهيز",
  },
  confirmed: {
    label: "تم التأكيد",
    description: "تم تأكيد طلبك وسيبدأ التجهيز",
  },
  processing: {
    label: "جاري التجهيز",
    description: "نقوم بتحضير وتغليف طلبك",
  },
  shipped: {
    label: "تم الشحن",
    description: "تم تسليم طلبك لشركة التوصيل",
  },
  delivered: {
    label: "تم التوصيل",
    description: "تم تسليم طلبك بنجاح",
  },
  cancelled: {
    label: "ملغي",
    description: "تم إلغاء الطلب",
  },
};

function normalizeLastFourInput(value: string): string {
  const arabicIndic = "٠١٢٣٤٥٦٧٨٩";
  const easternArabic = "۰۱۲۳۴۵۶۷۸۹";

  return value
    .replace(/[٠-٩]/g, (digit) => String(arabicIndic.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(easternArabic.indexOf(digit)))
    .replace(/\D/g, "")
    .slice(0, 4);
}

function formatOrderDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير متوفر";

  return date.toLocaleDateString("ar-IQ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatEventTime(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function getStatusCopy(status: string) {
  return STATUS_COPY[status] ?? {
    label: "حالة الطلب",
    description: "تم تحديث حالة طلبك",
  };
}

function buildTimeline(data: TrackingApiResponse): OrderStatus[] {
  const status = data.status;
  const receivedTime = formatEventTime(data.createdAt);
  const updatedTime = formatEventTime(data.updatedAt);

  const items: OrderStatus[] = [
    {
      id: "received",
      title: "تم استلام الطلب",
      description: "تم استلام طلبك بنجاح",
      time: receivedTime,
      completed: status !== "pending" && status !== "cancelled",
      current: status === "pending",
    },
  ];

  if (status !== "pending") {
    const copy = getStatusCopy(status);
    items.push({
      id: "current-status",
      title: copy.label,
      description: copy.description,
      time: updatedTime,
      completed: status === "delivered",
      current: status !== "delivered" && status !== "cancelled",
    });
  }

  if (["pending", "confirmed"].includes(status)) {
    items.push({
      id: "next-processing",
      title: "جاري التجهيز",
      description: "سنبدأ بتحضير وتغليف طلبك",
      time: null,
      completed: false,
      current: false,
    });
  } else if (status === "processing") {
    items.push({
      id: "next-shipping",
      title: "جاهز للشحن",
      description: "بعد اكتمال التجهيز سيتم تسليم الطلب لشركة التوصيل",
      time: null,
      completed: false,
      current: false,
    });
  } else if (status === "shipped") {
    items.push({
      id: "next-delivered",
      title: "تم التوصيل",
      description: "تكتمل هذه المرحلة بعد استلامك للطلب",
      time: null,
      completed: false,
      current: false,
    });
  }

  return items;
}

function getShippingMessage(status: string) {
  if (["pending", "confirmed", "processing"].includes(status)) {
    return {
      title: "سيتم إشعارك عند شحن الطلب",
      helper: "تظهر تفاصيل التوصيل بعد تسليم الطلب لشركة التوصيل",
    };
  }

  if (status === "shipped") {
    return {
      title: "طلبك لدى شركة التوصيل",
      helper: "سنحدّث معلومات التتبع عند توفرها",
    };
  }

  if (status === "delivered") {
    return {
      title: "تم توصيل الطلب",
      helper: "اكتملت عملية التوصيل بنجاح",
    };
  }

  if (status === "cancelled") {
    return {
      title: "تم إلغاء الطلب",
      helper: "إذا تحتاج مساعدة تواصل ويانا",
    };
  }

  return {
    title: "جاري تحديث حالة الشحن",
    helper: "ستظهر التفاصيل هنا عند توفرها",
  };
}

function getTrackingPlaceholder(status: string): string {
  if (["pending", "confirmed", "processing"].includes(status)) {
    return "سيظهر بعد الشحن";
  }

  if (status === "cancelled") return "غير متاح";
  return "غير متوفر حالياً";
}

export default function OrderTracking() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOrderDetails(null);

    const normalizedOrderNumber = orderNumber.trim();
    const normalizedPhoneLast4 = phoneNumber.trim();

    if (!normalizedOrderNumber || !/^\d{4}$/.test(normalizedPhoneLast4)) {
      setError("أدخل رقم الطلب وآخر 4 أرقام من رقم الهاتف المستخدم بالطلب");
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(`/api/orders/track/${encodeURIComponent(normalizedOrderNumber)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneLast4: normalizedPhoneLast4 }),
      });

      if (!response.ok) {
        throw new Error("تعذر التحقق من الطلب. تأكد من المعلومات وحاول مرة ثانية.");
      }

      const data = (await response.json()) as TrackingApiResponse;
      const safeOrderNumber = data.orderNumber?.trim() || normalizedOrderNumber;

      setOrderDetails({
        orderNumber: safeOrderNumber,
        orderDate: formatOrderDate(data.createdAt),
        status: data.status,
        courier: "خدمة التوصيل",
        trackingNumber: null,
        timeline: buildTimeline(data),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    if (status.completed) {
      return <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />;
    }

    if (status.current) {
      return <Truck className="h-5 w-5 text-primary" aria-hidden="true" />;
    }

    return <Clock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />;
  };

  const shippingMessage = orderDetails ? getShippingMessage(orderDetails.status) : null;
  const currentStatusCopy = orderDetails ? getStatusCopy(orderDetails.status) : null;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background font-sans" data-testid="order-tracking-page">
      <section className="border-b bg-gradient-to-b from-primary/[0.06] to-background py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mx-auto flex max-w-2xl flex-col items-center"
          >
            <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/[0.07] px-4 py-1.5 text-sm text-primary">
              <Package className="ml-2 h-4 w-4" aria-hidden="true" />
              تتبع الشحنات
            </Badge>
            <h1 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl" data-testid="text-page-title">
              تتبع طلبك
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
              أدخل رقم الطلب وآخر 4 أرقام من رقم الهاتف المستخدم بالطلب
            </p>
          </motion.div>
        </div>
      </section>

      <main id="main-content" className="flex-1 py-8 md:py-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-8 max-w-2xl"
          >
            <Card className="border-border/70 shadow-sm">
              <CardContent className="p-5 md:p-7">
                <form onSubmit={handleSearch} className="space-y-5">
                  <div className="space-y-2">
                    <label htmlFor="order-number" className="text-sm font-semibold text-foreground/85">
                      رقم الطلب
                    </label>
                    <div className="relative">
                      <Package className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <Input
                        type="text"
                        id="order-number"
                        placeholder="مثال: FH-260816-13180F34"
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        className="h-12 border-border/80 pr-12 text-base shadow-none focus-visible:border-primary"
                        autoComplete="off"
                        data-testid="input-order-number"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="phone-last-four" className="text-sm font-semibold text-foreground/85">
                      آخر 4 أرقام من رقم الهاتف
                    </label>
                    <div className="relative">
                      <Phone className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <Input
                        type="tel"
                        id="phone-last-four"
                        placeholder="مثال: 0673"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(normalizeLastFourInput(e.target.value))}
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={4}
                        required
                        className="h-12 border-border/80 pr-12 shadow-none focus-visible:border-primary"
                        dir="ltr"
                        data-testid="input-phone-number"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-red-700" role="alert">
                      <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
                      <p className="text-sm font-medium leading-6">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="h-12 w-full text-base font-bold shadow-sm"
                    disabled={isSearching}
                    data-testid="button-track-order"
                  >
                    {isSearching ? (
                      <>
                        <span className="ml-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
                        جاري البحث...
                      </>
                    ) : (
                      <>
                        <Search className="ml-2 h-5 w-5" aria-hidden="true" />
                        تتبع الطلب
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-5 border-t pt-5">
                  <p className="text-center text-sm leading-6 text-muted-foreground">
                    ستجد رقم الطلب في رسالة التأكيد التي وصلتك عبر واتساب
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {orderDetails && shippingMessage && currentStatusCopy && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="mx-auto max-w-5xl"
            >
              <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
                <Card className="overflow-hidden border-border/70 shadow-sm">
                  <CardContent className="p-0">
                    <div className="border-b bg-muted/[0.18] p-5 md:p-7">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="mb-1 text-sm text-muted-foreground">رقم الطلب</p>
                          <h2 className="break-all text-xl font-bold tracking-tight md:text-2xl" dir="ltr">
                            {orderDetails.orderNumber}
                          </h2>
                          <p className="mt-2 text-sm text-muted-foreground">
                            تاريخ الطلب: <span dir="ltr">{orderDetails.orderDate}</span>
                          </p>
                        </div>

                        <Badge className="w-fit border-0 bg-primary/10 px-3.5 py-2 text-sm font-bold text-primary hover:bg-primary/10">
                          <Truck className="ml-2 h-4 w-4" aria-hidden="true" />
                          {currentStatusCopy.label}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-5 md:p-7">
                      <h3 className="mb-6 text-lg font-bold">حالة الطلب</h3>
                      <div className="relative space-y-1">
                        <div className="absolute bottom-6 right-5 top-6 w-px bg-border" aria-hidden="true" />

                        {orderDetails.timeline.map((status) => (
                          <div
                            key={status.id}
                            className={`relative flex gap-4 py-4 ${status.completed || status.current ? "" : "opacity-55"}`}
                          >
                            <div
                              className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border ${
                                status.completed
                                  ? "border-emerald-200 bg-emerald-50"
                                  : status.current
                                    ? "border-primary/35 bg-primary/10 ring-4 ring-primary/[0.08]"
                                    : "border-border bg-background"
                              }`}
                            >
                              {getStatusIcon(status)}
                            </div>

                            <div className="min-w-0 flex-1 pt-0.5">
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                <h4 className={`font-bold ${status.current ? "text-primary" : "text-foreground"}`}>
                                  {status.title}
                                </h4>
                                {status.time && (
                                  <time className="text-xs text-muted-foreground" dir="ltr">
                                    {status.time}
                                  </time>
                                )}
                              </div>
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">{status.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="h-fit border-border/70 shadow-sm">
                  <CardContent className="p-5 md:p-6">
                    <h3 className="mb-5 flex items-center gap-2 text-lg font-bold">
                      <Truck className="h-5 w-5 text-primary" aria-hidden="true" />
                      معلومات الشحن
                    </h3>

                    <div className="space-y-3">
                      <div className="rounded-xl border border-primary/10 bg-primary/[0.045] p-4">
                        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <Bell className="h-4 w-4 text-primary" aria-hidden="true" />
                          حالة الشحن
                        </div>
                        <p className="font-bold leading-6 text-primary">{shippingMessage.title}</p>
                        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{shippingMessage.helper}</p>
                      </div>

                      <div className="rounded-xl border border-border/70 bg-muted/[0.18] p-4">
                        <p className="mb-1 text-xs text-muted-foreground">شركة التوصيل</p>
                        <p className="font-semibold">{orderDetails.courier}</p>
                      </div>

                      <div className="rounded-xl border border-border/70 bg-muted/[0.18] p-4">
                        <p className="mb-1 text-xs text-muted-foreground">رقم التتبع</p>
                        <p className="font-semibold text-foreground/80" dir={orderDetails.trackingNumber ? "ltr" : "rtl"}>
                          {orderDetails.trackingNumber || getTrackingPlaceholder(orderDetails.status)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {!orderDetails && !error && (
            <motion.section
              className="mx-auto mt-10 max-w-4xl"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <h2 className="mb-7 flex items-center justify-center gap-2 text-center text-xl font-bold md:text-2xl">
                <ChevronLeft className="h-5 w-5 text-primary" aria-hidden="true" />
                كيف يعمل تتبع الطلب؟
              </h2>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { icon: ShoppingBag, title: "تم الطلب", desc: "نستلم طلبك ونثبته بالنظام" },
                  { icon: PackageCheck, title: "جاري التجهيز", desc: "نحضّر ونغلف المنتجات" },
                  { icon: Truck, title: "تم الشحن", desc: "نسلم الطلب لشركة التوصيل" },
                  { icon: Home, title: "تم التسليم", desc: "يوصل الطلب إليك" },
                ].map((step) => (
                  <Card key={step.title} className="border-border/60 shadow-none">
                    <CardContent className="p-5 text-center">
                      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/[0.08]">
                        <step.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                      </div>
                      <h3 className="mb-1 font-bold">{step.title}</h3>
                      <p className="text-sm leading-6 text-muted-foreground">{step.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.section>
          )}
        </div>
      </main>
    </div>
  );
}
