import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { MetaTags, OrganizationSchema, BreadcrumbSchema } from "@/components/seo/meta-tags";
import { motion } from "framer-motion";
import { BackToTop } from "@/components/back-to-top";
import { 
  Fish, Truck, ShieldCheck, Phone, Award, Users, MapPin, 
  Clock, Star, Heart, Droplets, Leaf, Package, Sparkles,
  Globe, Target, CheckCircle
} from "lucide-react";

// Company stats
const STATS = [
  { value: "بريميوم", label: "معدات مختارة بعناية", icon: Package },
  { value: "18", label: "محافظة عراقية", icon: MapPin },
  { value: "24/7", label: "دعم فني", icon: Phone },
  { value: "2024", label: "سنة التأسيس", icon: Star },
];

// Core values
const VALUES = [
  {
    icon: ShieldCheck,
    title: "الجودة والأصالة",
    description: "نركز على منتجات أصلية حسب المتوفر من شركات موثوقة في معدات ومستلزمات أحواض الزينة.",
  },
  {
    icon: Truck,
    title: "توصيل لكل العراق",
    description: "نوصل إلى جميع المحافظات العراقية الـ 18. توصيل خلال 24 ساعة فقط — 5,000 د.ع لكل العراق.",
  },
  {
    icon: Heart,
    title: "شغف حقيقي",
    description: "نحن هواة أحواض زينة قبل أن نكون متجراً. نفهم احتياجاتك لأننا نعيش نفس الهواية ونمر بنفس التجارب.",
  },
  {
    icon: Award,
    title: "خبرة متخصصة",
    description: "نقدم محتوى تعليمي ودعم عملي يساعد الهواة على اختيار المعدات والعناية بالحوض بهدوء ووضوح.",
  },
  {
    icon: Leaf,
    title: "الاستدامة",
    description: "نلتزم بممارسات مستدامة ونشجع الحفاظ على البيئة المائية الطبيعية من خلال الأحواض الصحية والمعدات الموفرة للطاقة.",
  },
  {
    icon: Users,
    title: "مجتمع متنامي",
    description: "نريد بناء مجتمع من هواة أحواض الزينة في العراق يتبادل الخبرات والنصائح العملية.",
  },
];

// Product categories
const CATEGORIES = [
  "أحواض زجاجية بجميع الأحجام",
  "فلاتر داخلية وخارجية",
  "سخانات ومنظمات حرارة",
  "إضاءة LED متخصصة",
  "أغذية أسماك متنوعة",
  "علاجات وأدوية أسماك",
  "ديكورات وصخور وأخشاب",
  "ركائز وحصى ملونة",
  "مضخات هواء وأكسسوارات",
  "أطقم حوض كاملة للمبتدئين",
];

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <MetaTags
        title="من نحن - AQUAVO"
        description="AQUAVO متجر إلكتروني عراقي متخصص في معدات ومستلزمات أحواض الزينة، يقدم منتجات أصلية حسب المتوفر وتعليم عملي للهواة."
        keywords={["AQUAVO", "اكوافو", "من نحن", "مستلزمات أحواض الزينة في العراق", "معدات أحواض بغداد"]}
      />
      <OrganizationSchema />
      <BreadcrumbSchema
        items={[
          { name: "الرئيسية", url: "https://www.aquavoiq.com" },
          { name: "من نحن", url: "https://www.aquavoiq.com/about" },
        ]}
      />
      <Navbar />

      <main id="main-content" className="flex-grow">
        {/* Hero Section */}
        <section className="relative py-24 overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-primary">براند عراقي لمعدات أحواض الزينة</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight" data-speakable>
                <span className="text-primary">AQUAVO</span> —{" "}
                <span className="text-accent">مستلزمات أحواض الزينة</span> في العراق
              </h1>

              {/* Answer-First paragraph for AI */}
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed" data-speakable>
                AQUAVO (اكوافو) متجر إلكتروني عراقي متخصص في معدات ومستلزمات أحواض الزينة.
                تأسس في بغداد عام 2024، ويخدم هواة الأحواض في جميع المحافظات العراقية الـ 18 مع توصيل لكل العراق ودفع عند الاستلام.
                نوفر تشكيلة متخصصة من المنتجات الأصلية حسب المتوفر، تشمل الأحواض، الفلاتر، السخانات، الإضاءة، الأغذية، الديكور ومعالجات المياه،
                مع محتوى تعليمي ودعم عملي لاختيار المناسب.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 border-y border-border/50">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {STATS.map((stat, i) => (
                <motion.div
                  key={i}
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <stat.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                  <div className="text-3xl md:text-4xl font-extrabold text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Our Story */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-8">
              <Fish className="inline w-8 h-8 text-primary ml-2" />
              قصتنا
            </h2>
            <div className="prose prose-lg dark:prose-invert max-w-none text-right space-y-4">
              <p data-speakable>
                بدأت قصة AQUAVO من شغف حقيقي بعالم أحواض الزينة في العراق. لاحظنا أن هواة الأحواض في بغداد والمحافظات 
                الأخرى يواجهون صعوبة كبيرة في إيجاد مستلزمات أحواض عالية الجودة بأسعار مناسبة. المتاجر المحلية محدودة 
                في خياراتها، والشراء من الخارج مكلف ومعقد.
              </p>
              <p>
                من هنا ولدت فكرة AQUAVO — متجر إلكتروني عراقي متخصص في معدات ومستلزمات أحواض الزينة. 
                أطلقنا المتجر في بغداد عام 2024 برؤية واضحة: جعل تجهيز أحواض الزينة أسهل وأكثر وضوحاً للهواة في العراق، 
                من المبتدئ الذي يجهز حوضه الأول إلى الهاوي الذي يبني أكواسكيب مرتب.
              </p>
              <p>
                اليوم، AQUAVO يخدم هواة أحواض الزينة في كل محافظات العراق الـ 18، مع تشكيلة متخصصة من منتجات بريميوم 
                من علامات موثوقة حسب المتوفر. نركز على المنتجات والمعرفة معاً — من خلال 
                المدونة التعليمية، أدلة التجهيز والصيانة، أدوات الحاسبات، والدعم العملي.
              </p>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              <Target className="inline w-8 h-8 text-primary ml-2" />
              قيمنا ومميزاتنا
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {VALUES.map((value, i) => (
                <motion.div
                  key={i}
                  className="bg-card rounded-2xl p-6 border border-border hover:border-primary/50 transition-colors"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <value.icon className="w-10 h-10 text-primary mb-4" />
                  <h3 className="text-xl font-bold mb-2">{value.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{value.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Product Categories */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-8">
              <Package className="inline w-8 h-8 text-primary ml-2" />
              ماذا نوفر
            </h2>
            <p className="text-center text-muted-foreground mb-8">
              نوفر كل ما يحتاجه هاوي أسماك الزينة في العراق تحت سقف واحد:
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              {CATEGORIES.map((cat, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="font-medium">{cat}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h2 className="text-3xl font-bold mb-6">
              <Globe className="inline w-8 h-8 text-primary ml-2" />
              رسالتنا
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed" data-speakable>
              رسالة AQUAVO هي جعل هواية أسماك الزينة متاحة ومستدامة لكل شخص في العراق. 
              نؤمن أن حوض الأسماك ليس مجرد ديكور — بل هو نافذة إلى عالم مائي ساحر يجلب الهدوء والجمال 
              إلى حياتك اليومية. نسعى أن نكون الشريك الموثوق لكل هاوٍ عراقي في رحلته مع أسماك الزينة.
            </p>
            
            <div className="mt-8 p-6 bg-card rounded-2xl border border-border">
              <h3 className="font-bold text-lg mb-4">تواصل معنا</h3>
              <div className="flex flex-col md:flex-row gap-4 justify-center items-center text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  <span dir="ltr">+964 774 788 0673</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>بغداد، العراق</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>السبت - الخميس: 9 صباحاً - 9 مساءً</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <BackToTop />
      <Footer />
    </div>
  );
}
