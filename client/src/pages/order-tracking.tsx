import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Package,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  MessageCircle,
  Mail,
  ShoppingBag,
  PackageCheck,
  Home,
  AlertCircle,
  ChevronLeft
} from "lucide-react";
import { useState } from "react";
import { ShrimpMascot } from "@/components/gamification/shrimp-mascot";

interface OrderStatus {
  id: string;
  title: string;
  description: string;
  time: string;
  completed: boolean;
  current: boolean;
}

interface OrderDetails {
  orderNumber: string;
  orderDate: string;
  estimatedDelivery: string;
  status: string;
  customerName: string;
  shippingAddress: string;
  phone: string;
  courier: string;
  trackingNumber: string;
  shippingMethod: string;
  items: {
    name: string;
    quantity: number;
    price: string;
    image: string;
  }[];
  timeline: OrderStatus[];
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

    if (!orderNumber.trim()) {
      setError("الرجاء إدخال رقم الطلب");
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(`/api/orders/track/${orderNumber}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("لم يتم العثور على الطلب. يرجى التحقق من الرقم.");
        }
        throw new Error("حدث خطأ أثناء البحث عن الطلب.");
      }

      const data = await response.json();

      // Type-safe parsing of shippingAddress (can be string or object)
      let shippingInfo: { name?: string; address?: string; phone?: string } = {};
      if (typeof data.shippingAddress === 'string') {
        try {
          shippingInfo = JSON.parse(data.shippingAddress);
        } catch {
          shippingInfo = { address: data.shippingAddress };
        }
      } else if (data.shippingAddress && typeof data.shippingAddress === 'object') {
        shippingInfo = data.shippingAddress;
      }

      const mappedOrder: OrderDetails = {
        orderNumber: data.orderNumber || data.id,
        orderDate: new Date(data.createdAt).toLocaleDateString("ar-IQ"),
        estimatedDelivery: "قريباً",
        status: data.status,
        customerName: shippingInfo.name || "عميل",
        shippingAddress: shippingInfo.address || "العنوان غير متوفر",
        phone: shippingInfo.phone || "",
        courier: "خدمة التوصيل",
        trackingNumber: "---",
        shippingMethod: "قياسي",
        items: data.items.map((item: { name: string; quantity: number; price: number | string }) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price + " د.ع",
          image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=100&h=100&fit=crop" // Placeholder or item image
        })) || [],
        timeline: [
          {
            id: "ordered",
            title: "تم استلام الطلب",
            description: "تم استلام طلبك",
            time: new Date(data.createdAt).toLocaleString("ar-IQ"),
            completed: true,
            current: data.status === "pending"
          },
          {
            id: "current_status",
            title: "الحالة الحالية",
            description: data.status === "pending" ? "في الانتظار" :
              data.status === "processing" ? "جاري التجهيز" :
                data.status === "shipped" ? "تم الشحن" : "تم التوصيل",
            time: new Date().toLocaleString("ar-IQ"),
            completed: data.status === "delivered",
            current: true // Simplified for now
          }
        ]
      };

      setOrderDetails(mappedOrder);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "حدث خطأ";
      setError(message);
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    if (status.completed) {
      return <CheckCircle2 className="w-6 h-6 text-green-500" />;
    }
    if (status.current) {
      return <Truck className="w-6 h-6 text-primary animate-pulse" />;
    }
    return <Clock className="w-6 h-6 text-muted-foreground" />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans" data-testid="order-tracking-page">
      <Navbar />

      <section className="relative py-20 overflow-hidden bg-gradient-to-b from-primary/5 to-background">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-64 h-64 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-20 w-48 h-48 bg-green-500 rounded-full blur-3xl" />
        </div>

        <div className="container relative z-10 mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center"
          >
            <ShrimpMascot mood="working" size="lg" className="mb-4" />
            <Badge variant="outline" className="mb-4 border-primary/50 text-primary bg-primary/10 px-4 py-1 text-sm">
              <Package className="w-4 h-4 ml-2" />
              تتبع الشحنات
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6" data-testid="text-page-title">
              تتبع طلبك
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              أدخل رقم طلبك لمعرفة حالة الشحنة ووقت التسليم المتوقع
            </p>
          </motion.div>
        </div>
      </section>

      <main id="main-content" className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto mb-12"
          >
            <Card className="p-6">
              <form onSubmit={handleSearch} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-base font-medium text-foreground/80">رقم الطلب</label>
                  <div className="relative group">
                    <Package className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 group-focus-within:text-primary transition-colors" />
                    <Input
                      type="text"
                      placeholder="مثال: ORD-X1Y2Z3"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      className="pr-12 py-6 text-lg border-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
                      data-testid="input-order-number"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-base font-medium text-foreground/80">رقم الهاتف (اختياري)</label>
                  <div className="relative group">
                    <Phone className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 group-focus-within:text-primary transition-colors" />
                    <Input
                      type="tel"
                      placeholder="للتحقق الإضافي"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="pr-12 py-5 border-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
                      dir="ltr"
                      data-testid="input-phone-number"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 p-4 rounded-lg animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full py-6 text-lg font-bold shadow-md hover:shadow-lg transition-all"
                  size="lg"
                  disabled={isSearching}
                  data-testid="button-track-order"
                >
                  {isSearching ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                      جاري البحث...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5 ml-2" />
                      تتبع الطلب
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  ستجد رقم الطلب في رسالة التأكيد عبر البريد الإلكتروني أو واتساب
                </p>
              </div>
            </Card>
          </motion.div>

          {orderDetails && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-2xl font-bold">{orderDetails.orderNumber}</h2>
                          <p className="text-muted-foreground">تاريخ الطلب: {orderDetails.orderDate}</p>
                        </div>
                        <Badge className="bg-primary/20 text-primary border-0 px-4 py-2 text-base">
                          <Truck className="w-4 h-4 ml-2" />
                          {orderDetails.status}
                        </Badge>
                      </div>

                      <div className="relative">
                        <div className="absolute right-[23px] top-0 bottom-0 w-0.5 bg-muted" />

                        <div className="space-y-8">
                          {orderDetails.timeline.map((status) => (
                            <div
                              key={status.id}
                              className={`relative flex gap-4 ${status.completed || status.current ? "" : "opacity-50"}`}
                            >
                              <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center ${status.completed
                                ? "bg-green-500/20"
                                : status.current
                                  ? "bg-primary/20 ring-4 ring-primary/30"
                                  : "bg-muted"
                                }`}>
                                {getStatusIcon(status)}
                              </div>
                              <div className="flex-1 pb-2">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-semibold text-lg">{status.title}</h3>
                                  <span className="text-sm text-muted-foreground">{status.time}</span>
                                </div>
                                <p className="text-muted-foreground mt-1">{status.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-primary" />
                        محتويات الطلب
                      </h3>
                      <div className="space-y-4">
                        {orderDetails.items.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg"
                          >
                            <div className="flex-1">
                              <h4 className="font-medium">{item.name}</h4>
                              <p className="text-sm text-muted-foreground">الكمية: {item.quantity}</p>
                            </div>
                            <p className="font-semibold">{item.price}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Truck className="w-5 h-5 text-primary" />
                        معلومات الشحن
                      </h3>
                      <div className="space-y-3">
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">شركة التوصيل</p>
                          <p className="font-medium">{orderDetails.courier}</p>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">رقم التتبع</p>
                          <p className="font-mono font-medium" dir="ltr">{orderDetails.trackingNumber}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        عنوان التوصيل
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Home className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{orderDetails.customerName}</p>
                            <p className="text-sm text-muted-foreground">{orderDetails.shippingAddress}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Phone className="w-5 h-5 text-muted-foreground" />
                          <p className="text-sm" dir="ltr">{orderDetails.phone}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {!orderDetails && !error && (
            <motion.section
              className="max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-2xl font-bold mb-8 text-center flex items-center justify-center gap-3">
                <ChevronLeft className="w-6 h-6 text-primary" />
                كيف يعمل تتبع الطلب؟
              </h2>
              <div className="grid md:grid-cols-4 gap-6">
                {[
                  { icon: ShoppingBag, title: "تم الطلب", desc: "نستلم طلبك ونبدأ بتجهيزه" },
                  { icon: PackageCheck, title: "جاري التجهيز", desc: "نغلف منتجاتك بعناية" },
                  { icon: Truck, title: "في الطريق", desc: "المندوب في طريقه إليك" },
                  { icon: Home, title: "تم التسليم", desc: "وصل طلبك بأمان" }
                ].map((step, index) => (
                  <Card key={index} className="text-center p-6 hover:shadow-lg transition-shadow">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <step.icon className="w-8 h-8 text-primary" />
                    </div>
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <h3 className="font-semibold mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </Card>
                ))}
              </div>
            </motion.section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
