import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Shield,
  Lock,
  Eye,
  Database,
  UserCheck,
  FileText,
  Cookie,
  Mail,
  Phone,
  MessageCircle,
  ChevronLeft,
  CheckCircle2
} from "lucide-react";

export default function PrivacyPolicy() {
  const dataTypes = [
    {
      icon: UserCheck,
      title: "المعلومات الشخصية",
      items: [
        "الاسم الكامل",
        "رقم الهاتف",
        "البريد الإلكتروني",
        "العنوان للتوصيل"
      ]
    },
    {
      icon: Database,
      title: "معلومات الطلبات",
      items: [
        "سجل المشتريات",
        "تفضيلات المنتجات",
        "طرق الدفع المحفوظة",
        "عناوين التوصيل"
      ]
    },
    {
      icon: Eye,
      title: "معلومات التصفح",
      items: [
        "عنوان IP",
        "نوع المتصفح",
        "صفحات الزيارة",
        "وقت التصفح"
      ]
    }
  ];

  const usageReasons = [
    "معالجة وتنفيذ طلباتك بدقة وسرعة",
    "تحسين تجربتك على الموقع وتخصيص المحتوى",
    "إرسال إشعارات حول الطلبات والعروض الخاصة",
    "تقديم خدمة عملاء أفضل وحل المشاكل",
    "تحليل البيانات لتحسين منتجاتنا وخدماتنا",
    "الحماية من الاحتيال والأنشطة المشبوهة"
  ];

  const protectionMeasures = [
    {
      icon: Lock,
      title: "تشفير البيانات",
      description: "جميع البيانات الحساسة محمية بتشفير SSL/TLS المتقدم"
    },
    {
      icon: Shield,
      title: "خوادم آمنة",
      description: "بياناتك محفوظة على خوادم محمية بأحدث أنظمة الأمان"
    },
    {
      icon: Database,
      title: "نسخ احتياطية",
      description: "نسخ احتياطية منتظمة لحماية بياناتك من الفقدان"
    },
    {
      icon: UserCheck,
      title: "وصول محدود",
      description: "فقط الموظفون المصرح لهم يمكنهم الوصول لبياناتك"
    }
  ];

  const userRights = [
    "الحق في الوصول إلى بياناتك الشخصية ومراجعتها",
    "الحق في تصحيح أو تحديث معلوماتك",
    "الحق في حذف بياناتك (وفق الشروط القانونية)",
    "الحق في سحب موافقتك على استخدام البيانات",
    "الحق في تقييد معالجة بياناتك",
    "الحق في نقل بياناتك إلى خدمة أخرى"
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans" data-testid="privacy-policy-page">
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
              <Shield className="w-4 h-4 ml-2" />
              خصوصيتك محمية
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6" data-testid="text-page-title">
              سياسة الخصوصية
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              نحن ملتزمون بحماية خصوصيتك وأمان معلوماتك الشخصية. هذه السياسة توضح كيفية جمع واستخدام وحماية بياناتك.
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
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
              <ChevronLeft className="w-6 h-6 text-primary" />
              البيانات التي نجمعها
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {dataTypes.map((type, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                      <type.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-4">{type.title}</h3>
                    <ul className="space-y-2">
                      {type.items.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
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
              كيف نستخدم بياناتك
            </h2>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <ul className="grid md:grid-cols-2 gap-4">
                  {usageReasons.map((reason, index) => (
                    <li key={index} className="flex items-start gap-3 p-3 bg-background rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{reason}</span>
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
              كيف نحمي بياناتك
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {protectionMeasures.map((measure, index) => (
                <Card key={index} className="group hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <measure.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{measure.title}</h3>
                    <p className="text-sm text-muted-foreground">{measure.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          <motion.section
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
              <ChevronLeft className="w-6 h-6 text-primary" />
              حقوقك كمستخدم
            </h2>
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="p-6">
                <ul className="space-y-3">
                  {userRights.map((right, index) => (
                    <li key={index} className="flex items-start gap-3 p-3 bg-background rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{right}</span>
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
            transition={{ delay: 0.6 }}
          >
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="border-blue-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <Cookie className="w-5 h-5 text-blue-500" />
                    </div>
                    <h3 className="text-2xl font-bold">ملفات تعريف الارتباط (Cookies)</h3>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    نستخدم ملفات تعريف الارتباط لتحسين تجربة التصفح وتذكر تفضيلاتك. يمكنك التحكم في إعدادات ملفات تعريف الارتباط من خلال متصفحك.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>ملفات ضرورية: مطلوبة لعمل الموقع</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>ملفات تحليلية: لفهم كيفية استخدام الموقع</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>ملفات تسويقية: لعرض إعلانات مخصصة</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-amber-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                      <FileText className="w-5 h-5 text-amber-500" />
                    </div>
                    <h3 className="text-2xl font-bold">مشاركة البيانات</h3>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    نحن لا نبيع أو نشارك معلوماتك الشخصية مع أطراف ثالثة إلا في الحالات التالية:
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      <span>شركات الشحن لتوصيل طلباتك</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      <span>معالجات الدفع لإتمام المعاملات</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      <span>عند الطلب القانوني من السلطات</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="bg-gradient-to-l from-primary/10 to-blue-500/10 border-0">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-4">تواصل معنا بخصوص خصوصيتك</h2>
                  <p className="text-muted-foreground">
                    إذا كان لديك أي أسئلة حول سياسة الخصوصية أو ترغب في ممارسة حقوقك، تواصل معنا
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
                    href="mailto:privacy@aquavo.iq"
                    className="flex items-center gap-4 p-4 bg-background/80 rounded-xl hover:bg-background transition-colors group"
                  >
                    <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                      <Mail className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">البريد الإلكتروني</p>
                      <p className="text-sm text-muted-foreground">privacy@aquavo.iq</p>
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
