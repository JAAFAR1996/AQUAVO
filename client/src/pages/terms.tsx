import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  ShoppingCart,
  CreditCard,
  Truck,
  Shield,
  AlertCircle,
  Scale,
  UserX,
  ChevronLeft,
  CheckCircle2,
  Phone,
  Mail,
  MessageCircle
} from "lucide-react";

export default function Terms() {
  const sections = [
    {
      icon: ShoppingCart,
      title: "الطلبات والشراء",
      content: [
        "جميع الأسعار معروضة بالدينار العراقي ما لم يذكر خلاف ذلك",
        "الأسعار قابلة للتغيير دون إشعار مسبق",
        "نحتفظ بالحق في رفض أو إلغاء أي طلب لأي سبب",
        "تأكيد الطلب يتم عبر البريد الإلكتروني أو رسالة نصية",
        "المنتجات تخضع للتوفر ويمكن استبدالها بمنتجات مماثلة"
      ]
    },
    {
      icon: CreditCard,
      title: "الدفع",
      content: [
        "نقبل الدفع النقدي عند الاستلام والتحويل البنكي",
        "جميع المعاملات آمنة ومشفرة",
        "في حال فشل عملية الدفع، سيتم إلغاء الطلب تلقائياً",
        "الفواتير متوفرة لجميع الطلبات عند الطلب",
        "لا نخزن معلومات بطاقات الائتمان على خوادمنا"
      ]
    },
    {
      icon: Truck,
      title: "الشحن والتوصيل",
      content: [
        "التوصيل مجاني داخل بغداد للطلبات فوق 50,000 دينار",
        "رسوم التوصيل للمحافظات تختلف حسب الموقع",
        "مدة التوصيل من 1-5 أيام عمل حسب الموقع",
        "يجب فحص المنتجات عند الاستلام قبل التوقيع",
        "نحن غير مسؤولين عن التأخير خارج سيطرتنا"
      ]
    },
    {
      icon: Shield,
      title: "الضمان",
      content: [
        "جميع المنتجات الإلكترونية تأتي بضمان الوكيل المحلي",
        "ضمان الشركة المصنعة ساري حسب الشروط المذكورة",
        "الضمان لا يغطي سوء الاستخدام أو الحوادث",
        "يجب الاحتفاظ بالفاتورة الأصلية للاستفادة من الضمان",
        "الأسماك والنباتات الحية مضمونة لمدة 24 ساعة فقط"
      ]
    }
  ];

  const prohibitedActivities = [
    "استخدام الموقع لأغراض غير قانونية",
    "محاولة اختراق أو تعطيل الموقع",
    "نسخ أو استنساخ محتوى الموقع بدون إذن",
    "استخدام معلومات مزورة أو مضللة",
    "إساءة استخدام العروض أو أكواد الخصم",
    "التحايل على نظام الطلبات أو المراجعات"
  ];

  const intellectualProperty = [
    "جميع المحتويات محمية بحقوق الملكية الفكرية",
    "الشعارات والعلامات التجارية ملك لأصحابها",
    "الصور والنصوص لا يمكن استخدامها بدون إذن",
    "المحتوى المقدم من المستخدمين يخضع لموافقتنا",
    "نحتفظ بالحق في إزالة أي محتوى مخالف"
  ];

  const limitations = [
    "نحن غير مسؤولين عن أي أضرار غير مباشرة",
    "مسؤوليتنا محدودة بقيمة المنتج المشترى",
    "لا نضمن توفر الموقع 24/7 بدون انقطاع",
    "المعلومات على الموقع قد تحتوي على أخطاء غير مقصودة",
    "لا نتحمل مسؤولية المواقع الخارجية المرتبطة"
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans" data-testid="terms-page">
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
              <FileText className="w-4 h-4 ml-2" />
              شروط الاستخدام
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6" data-testid="text-page-title">
              الشروط والأحكام
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              يرجى قراءة هذه الشروط والأحكام بعناية قبل استخدام خدماتنا. استخدامك للموقع يعني موافقتك على هذه الشروط.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              آخر تحديث: 2 ديسمبر 2025
            </p>
          </motion.div>
        </div>
      </section>

      <main id="main-content" className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <motion.section
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-primary/20 bg-primary/5 mb-8">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-3">قبول الشروط</h3>
                    <p className="text-muted-foreground">
                      بالوصول إلى هذا الموقع واستخدامه، فإنك توافق على الالتزام بهذه الشروط والأحكام وسياسة الخصوصية.
                      إذا كنت لا توافق على أي من هذه الشروط، يُرجى عدم استخدام موقعنا.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
              <ChevronLeft className="w-6 h-6 text-primary" />
              شروط الاستخدام الأساسية
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {sections.map((section, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                        <section.icon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold">{section.title}</h3>
                    </div>
                    <ul className="space-y-2">
                      {section.content.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          <motion.section
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
              <ChevronLeft className="w-6 h-6 text-primary" />
              الأنشطة المحظورة
            </h2>
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <UserX className="w-5 h-5 text-red-500" />
                  </div>
                  <p className="text-muted-foreground">
                    يُحظر استخدام موقعنا أو خدماتنا للقيام بأي من الأنشطة التالية:
                  </p>
                </div>
                <ul className="grid md:grid-cols-2 gap-3">
                  {prohibitedActivities.map((activity, index) => (
                    <li key={index} className="flex items-start gap-2 p-3 bg-background rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{activity}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.section>

          <motion.section
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
              <ChevronLeft className="w-6 h-6 text-primary" />
              حقوق الملكية الفكرية
            </h2>
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Scale className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-amber-600">حماية المحتوى</h3>
                    <p className="text-muted-foreground mb-4">
                      جميع المحتويات على هذا الموقع، بما في ذلك النصوص والصور والشعارات، محمية بموجب قوانين حقوق النشر والملكية الفكرية.
                    </p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {intellectualProperty.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 p-3 bg-background rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.section>

          <motion.section
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
              <ChevronLeft className="w-6 h-6 text-primary" />
              حدود المسؤولية
            </h2>
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardContent className="p-6">
                <ul className="space-y-3">
                  {limitations.map((limit, index) => (
                    <li key={index} className="flex items-start gap-3 p-3 bg-background rounded-lg">
                      <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>{limit}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 p-4 bg-background rounded-lg border border-blue-500/20">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">ملاحظة مهمة:</strong> هذه الشروط تخضع لقوانين جمهورية العراق.
                    أي نزاع يحل عبر المحاكم المختصة في بغداد.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.section>

          <motion.section
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-3">التعديلات على الشروط</h3>
                    <p className="text-muted-foreground mb-4">
                      نحتفظ بالحق في تعديل هذه الشروط في أي وقت. التعديلات تسري فوراً عند نشرها على الموقع.
                      استمرارك في استخدام الموقع بعد التعديلات يعني موافقتك على الشروط الجديدة.
                    </p>
                    <p className="text-sm text-green-600 font-medium">
                      ننصحك بمراجعة هذه الصفحة بشكل دوري للاطلاع على أي تحديثات.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="bg-gradient-to-l from-primary/10 to-blue-500/10 border-0">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-4">أسئلة حول الشروط؟</h2>
                  <p className="text-muted-foreground">
                    إذا كان لديك أي استفسار حول هذه الشروط والأحكام، لا تتردد في التواصل معنا
                  </p>
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
                    href="mailto:legal@aquavo.iq"
                    className="flex items-center gap-4 p-4 bg-background/80 rounded-xl hover:bg-background transition-colors group"
                  >
                    <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                      <Mail className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">البريد الإلكتروني</p>
                      <p className="text-sm text-muted-foreground">legal@aquavo.iq</p>
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
