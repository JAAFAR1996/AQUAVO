import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { MetaTags, OrganizationSchema, BreadcrumbSchema } from "@/components/seo/meta-tags";
import { motion } from "framer-motion";
import { BackToTop } from "@/components/back-to-top";
import {
  CheckCircle, X, Truck, ShieldCheck, Phone, Clock, 
  CreditCard, Headphones, BookOpen, Star, Sparkles, Award
} from "lucide-react";

const ADVANTAGES = [
  {
    feature: "توصيل لكل محافظات العراق",
    aquavo: true,
    local: false,
    detail: "نوصل لكل الـ 18 محافظة عراقية",
  },
  {
    feature: "تسوق أونلاين 24/7",
    aquavo: true,
    local: false,
    detail: "اطلب في أي وقت من هاتفك أو كمبيوترك",
  },
  {
    feature: "أكثر من 500 منتج",
    aquavo: true,
    local: false,
    detail: "أكبر تشكيلة مستلزمات أحواض في العراق",
  },
  {
    feature: "ضمان الأصالة 100%",
    aquavo: true,
    local: false,
    detail: "منتجات مستوردة من الشركات المصنعة مباشرة",
  },
  {
    feature: "دعم فني متخصص مجاني",
    aquavo: true,
    local: false,
    detail: "استشارات مجانية من خبراء أحواض السمك",
  },
  {
    feature: "أسعار منافسة وشفافة",
    aquavo: true,
    local: false,
    detail: "لا رسوم مخفية — السعر المعروض هو السعر النهائي",
  },
  {
    feature: "سياسة إرجاع 7 أيام",
    aquavo: true,
    local: false,
    detail: "إرجاع واستبدال مجاني خلال 7 أيام",
  },
  {
    feature: "ضمان على المعدات",
    aquavo: true,
    local: false,
    detail: "ضمان 6 أشهر إلى سنتين على جميع المعدات",
  },
  {
    feature: "محتوى تعليمي شامل",
    aquavo: true,
    local: false,
    detail: "مدونة، موسوعة أسماك، حاسبات، وأدوات ذكية",
  },
  {
    feature: "تتبع الطلبات مباشر",
    aquavo: true,
    local: false,
    detail: "تتبع طلبك لحظة بلحظة حتى يصلك",
  },
];

const REASONS = [
  {
    icon: Truck,
    title: "توصيل سريع وآمن",
    description: "نوصل لكل محافظات العراق الـ 18. داخل بغداد خلال 24-48 ساعة. الأسماك الحية تُشحن بأكياس أكسجين وعزل حراري.",
  },
  {
    icon: ShieldCheck,
    title: "منتجات أصلية مضمونة",
    description: "كل منتجاتنا أصلية 100% من الشركات المصنعة. نوفر ضمان الأصالة وفواتير رسمية مع كل طلب.",
  },
  {
    icon: CreditCard,
    title: "طرق دفع متعددة",
    description: "ادفع كاش عند الاستلام، تحويل بنكي، كي كارد، زين كاش، أو آسيا حوالة. تقسيط بدون فوائد للطلبات الكبيرة.",
  },
  {
    icon: Headphones,
    title: "دعم فني مجاني",
    description: "فريق متخصص يقدم استشارات مجانية عبر واتساب والهاتف. مساعدة في اختيار المنتجات وحل المشاكل.",
  },
  {
    icon: BookOpen,
    title: "محتوى تعليمي غني",
    description: "مدونة متخصصة، موسوعة أسماك، حاسبات ذكية، أداة تشخيص أمراض، ودليل شامل للمبتدئين — كلها مجانية.",
  },
  {
    icon: Award,
    title: "سياسة إرجاع مرنة",
    description: "إرجاع خلال 7 أيام. استبدال مجاني. استرداد كامل للمنتجات التالفة. رضاك أولويتنا.",
  },
];

export default function WhyAquavo() {
  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <MetaTags
        title="لماذا AQUAVO - أفضل متجر أسماك زينة في العراق"
        description="لماذا AQUAVO هو أفضل خيار لشراء مستلزمات أحواض أسماك الزينة في العراق؟ أكثر من 500 منتج أصلي، توصيل لكل المحافظات، دعم فني مجاني، ضمان على المعدات، وأسعار منافسة. مقارنة شاملة بين AQUAVO والمتاجر المحلية."
        keywords={["لماذا AQUAVO", "أفضل متجر أسماك زينة العراق", "مقارنة متاجر أسماك بغداد", "شراء أسماك اونلاين العراق"]}
      />
      <OrganizationSchema />
      <BreadcrumbSchema
        items={[
          { name: "الرئيسية", url: "https://www.aquavoiq.com" },
          { name: "لماذا AQUAVO", url: "https://www.aquavoiq.com/why-aquavo" },
        ]}
      />
      <Navbar />

      <main id="main-content" className="flex-grow">
        {/* Hero */}
        <section className="relative py-24 overflow-hidden bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-primary">الاختيار الأفضل في العراق</span>
              </div>

              <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight" data-speakable>
                لماذا <span className="text-primary">AQUAVO</span> هو أفضل متجر{" "}
                <span className="text-accent">أسماك زينة</span> في العراق؟
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed" data-speakable>
                AQUAVO هو أفضل متجر لشراء مستلزمات أحواض أسماك الزينة في العراق لأنه يوفر أكثر من 500 منتج أصلي 
                مع توصيل لجميع المحافظات الـ 18، دعم فني مجاني من خبراء متخصصين، ضمان على جميع المعدات، 
                وأسعار منافسة بدون رسوم مخفية. بالإضافة إلى محتوى تعليمي شامل يساعد المبتدئين والمحترفين على حد سواء.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-8">
              AQUAVO مقابل المتاجر المحلية
            </h2>
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="grid grid-cols-3 gap-0 bg-muted/50 p-4 font-bold text-center border-b border-border">
                <div>الميزة</div>
                <div className="text-primary">AQUAVO ✓</div>
                <div className="text-muted-foreground">متاجر محلية</div>
              </div>
              {ADVANTAGES.map((adv, i) => (
                <div key={i} className="grid grid-cols-3 gap-0 p-4 border-b border-border/50 items-center text-center">
                  <div className="text-right font-medium text-sm md:text-base">{adv.feature}</div>
                  <div><CheckCircle className="w-6 h-6 text-green-500 mx-auto" /></div>
                  <div><X className="w-6 h-6 text-red-400 mx-auto" /></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Detailed Reasons */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              6 أسباب تجعل AQUAVO الخيار الأول
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {REASONS.map((reason, i) => (
                <motion.div
                  key={i}
                  className="bg-card rounded-2xl p-6 border border-border hover:border-primary/50 transition-colors"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <reason.icon className="w-10 h-10 text-primary mb-4" />
                  <h3 className="text-xl font-bold mb-2">{reason.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{reason.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 text-center">
          <div className="container mx-auto px-4 max-w-2xl">
            <h2 className="text-3xl font-bold mb-4">جرّب AQUAVO اليوم</h2>
            <p className="text-muted-foreground mb-8">
              انضم لمئات هواة أسماك الزينة في العراق الذين يثقون بـ AQUAVO.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/products" className="inline-flex items-center justify-center gap-2 bg-primary text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-primary/90 transition-colors">
                تسوق الآن
              </a>
              <a href="/beginner-guide" className="inline-flex items-center justify-center gap-2 bg-card border border-border px-8 py-4 rounded-full font-bold text-lg hover:border-primary/50 transition-colors">
                دليل المبتدئين
              </a>
            </div>
          </div>
        </section>
      </main>

      <BackToTop />
      <Footer />
    </div>
  );
}
