import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  RotateCcw,
  Clock,
  Package,
  CheckCircle2,
  XCircle,
  Truck,
  CreditCard,
  Phone,
  Mail,
  MessageCircle,
  Shield,
  AlertTriangle,
  FileText,
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReturnPolicy() {
  const steps = [
    {
      icon: MessageCircle,
      title: "تواصل معنا",
      description: "اتصل بخدمة العملاء أو أرسل رسالة عبر واتساب لبدء طلب الإرجاع"
    },
    {
      icon: FileText,
      title: "احصل على موافقة",
      description: "سنراجع طلبك ونرسل لك رقم تأكيد الإرجاع خلال 24 ساعة"
    },
    {
      icon: Package,
      title: "غلّف المنتج",
      description: "أعد تغليف المنتج بعناية في العبوة الأصلية مع جميع الملحقات"
    },
    {
      icon: Truck,
      title: "أرسل أو سنستلم",
      description: "يمكنك إرسال المنتج أو طلب استلام من موقعك (مجاناً في بغداد)"
    }
  ];

  const eligibleItems = [
    "الأحواض والديكورات غير المستخدمة",
    "الفلاتر والمضخات في حالتها الأصلية",
    "الإضاءة والملحقات الإلكترونية",
    "مستلزمات التنظيف والصيانة",
    "الأطعمة المغلقة غير المفتوحة"
  ];

  const nonEligibleItems = [
    "الأسماك والكائنات الحية",
    "النباتات المائية الحية",
    "الأطعمة المفتوحة أو المستخدمة",
    "المنتجات التالفة بسبب سوء الاستخدام",
    "العناصر المخصصة حسب الطلب"
  ];

  const refundMethods = [
    {
      icon: CreditCard,
      title: "استرداد نقدي",
      description: "استرداد كامل المبلغ بنفس طريقة الدفع الأصلية",
      time: "3-7 أيام عمل"
    },
    {
      icon: RotateCcw,
      title: "استبدال المنتج",
      description: "استبدال بمنتج آخر بنفس القيمة أو أعلى مع دفع الفرق",
      time: "فوري عند الاستلام"
    },
    {
      icon: Shield,
      title: "رصيد متجر",
      description: "احصل على رصيد بقيمة 110% لاستخدامه في مشترياتك القادمة",
      time: "فوري"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans" data-testid="return-policy-page">
      <Navbar />

      <section className="relative py-20 overflow-hidden bg-gradient-to-b from-primary/5 to-background">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-64 h-64 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-20 w-48 h-48 bg-blue-500 rounded-full blur-3xl" />
        </div>

        <div className="container relative z-10 mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="outline" className="mb-4 border-primary/50 text-primary bg-primary/10 px-4 py-1 text-sm">
              <RotateCcw className="w-4 h-4 ml-2" />
              سياسة مرنة
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6" data-testid="text-page-title">
              سياسة الإرجاع والاستبدال
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              راحتك أولويتنا. نقدم سياسة إرجاع مرنة وسهلة لضمان رضاك التام عن مشترياتك.
            </p>
          </motion.div>
        </div>
      </section>

      <main id="main-content" className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="h-full border-primary/20 bg-primary/5">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">7 أيام</h3>
                  <p className="text-muted-foreground">فترة الإرجاع من تاريخ الاستلام</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="h-full border-green-500/20 bg-green-500/5">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Truck className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">استلام مجاني</h3>
                  <p className="text-muted-foreground">نستلم المنتجات مجاناً داخل بغداد</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="h-full border-amber-500/20 bg-amber-500/5">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-8 h-8 text-amber-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">استرداد كامل</h3>
                  <p className="text-muted-foreground">استرداد 100% للمنتجات المؤهلة</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.section
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
              <ChevronLeft className="w-6 h-6 text-primary" />
              خطوات الإرجاع
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((step, index) => (
                <Card key={index} className="relative overflow-hidden group hover:shadow-lg transition-shadow">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-primary/10 flex items-center justify-center text-primary font-bold text-xl rounded-bl-2xl">
                    {index + 1}
                  </div>
                  <CardContent className="p-6 pt-8">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <step.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          <div className="grid lg:grid-cols-2 gap-8 mb-16">
            <motion.section
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="h-full border-green-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-green-600">المنتجات المؤهلة للإرجاع</h2>
                  </div>
                  <ul className="space-y-3">
                    {eligibleItems.map((item, index) => (
                      <li key={index} className="flex items-center gap-3 p-3 bg-green-500/5 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="h-full border-red-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-red-600">المنتجات غير المؤهلة</h2>
                  </div>
                  <ul className="space-y-3">
                    {nonEligibleItems.map((item, index) => (
                      <li key={index} className="flex items-center gap-3 p-3 bg-red-500/5 rounded-lg">
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.section>
          </div>

          <motion.section
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
              <ChevronLeft className="w-6 h-6 text-primary" />
              طرق الاسترداد
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {refundMethods.map((method, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                      <method.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{method.title}</h3>
                    <p className="text-muted-foreground mb-4">{method.description}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="text-primary font-medium">{method.time}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          <motion.section
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-3 text-amber-600">شروط مهمة</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-1">•</span>
                        <span>يجب أن يكون المنتج في حالته الأصلية مع جميع العلامات والملحقات</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-1">•</span>
                        <span>يجب تقديم فاتورة الشراء الأصلية أو رقم الطلب</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-1">•</span>
                        <span>للمنتجات المعيبة، يرجى التقاط صور واضحة للعيب قبل التواصل</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-1">•</span>
                        <span>قد تستغرق عمليات الاسترداد البنكية من 7-10 أيام عمل حسب البنك</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <Card className="bg-gradient-to-l from-primary/10 to-blue-500/10 border-0">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-4">هل تحتاج مساعدة؟</h2>
                  <p className="text-muted-foreground">فريق خدمة العملاء جاهز لمساعدتك على مدار الساعة</p>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  <a
                    href="tel:+9647700000000"
                    className="flex items-center gap-4 p-4 bg-background/80 rounded-xl hover:bg-background transition-colors group"
                  >
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                      <Phone className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">اتصل بنا</p>
                      <p className="text-sm text-muted-foreground" dir="ltr">+964 770 000 0000</p>
                    </div>
                  </a>
                  <a
                    href="https://wa.me/9647700000000"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 bg-background/80 rounded-xl hover:bg-background transition-colors group"
                  >
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                      <MessageCircle className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">واتساب</p>
                      <p className="text-sm text-muted-foreground">رد سريع</p>
                    </div>
                  </a>
                  <a
                    href="mailto:support@aquavo.iq"
                    className="flex items-center gap-4 p-4 bg-background/80 rounded-xl hover:bg-background transition-colors group"
                  >
                    <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                      <Mail className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">البريد الإلكتروني</p>
                      <p className="text-sm text-muted-foreground">support@aquavo.iq</p>
                    </div>
                  </a>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
