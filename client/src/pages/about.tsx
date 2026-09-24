import { MetaTags, OrganizationSchema, BreadcrumbSchema } from "@/components/seo/meta-tags";
import { motion } from "framer-motion";
import { BackToTop } from "@/components/back-to-top";
import { 
  Fish, Truck, ShieldCheck, Phone, Award, Users, MapPin, 
  Clock, Star, Heart, Droplets, Leaf, Package, Sparkles,
  Globe, Target, CheckCircle
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { i18next } from "@/i18n";

// Company stats
const STATS = [
  { value: i18next.t("pages:about.statPremium"), label: i18next.t("pages:about.s1"), icon: Package },
  { value: "18", label: i18next.t("pages:about.s2"), icon: MapPin },
  { value: "24/7", label: i18next.t("pages:about.s3"), icon: Phone },
  { value: "5,000 د.ع", label: i18next.t("pages:about.s4"), icon: Truck },
];

// Core values
const VALUES = [
  {
    icon: ShieldCheck,
    title: i18next.t("pages:about.s5"),
    description: i18next.t("pages:about.s6"),
  },
  {
    icon: Truck,
    title: i18next.t("pages:about.s7"),
    description: i18next.t("pages:about.s8"),
  },
  {
    icon: Heart,
    title: i18next.t("pages:about.s9"),
    description: i18next.t("pages:about.s10"),
  },
  {
    icon: Award,
    title: i18next.t("pages:about.s11"),
    description: i18next.t("pages:about.s12"),
  },
  {
    icon: Leaf,
    title: i18next.t("pages:about.s13"),
    description: i18next.t("pages:about.s14"),
  },
  {
    icon: Users,
    title: i18next.t("pages:about.s15"),
    description: i18next.t("pages:about.s16"),
  },
];

// Product categories
const CATEGORIES = [
  i18next.t("pages:about.s17"),
  i18next.t("pages:about.s18"),
  i18next.t("pages:about.s19"),
  i18next.t("pages:about.s20"),
  i18next.t("pages:about.s21"),
  i18next.t("pages:about.s22"),
  i18next.t("pages:about.s23"),
  i18next.t("pages:about.s24"),
  i18next.t("pages:about.s25"),
  i18next.t("pages:about.s26"),
];

export default function About() {
  const { t } = useTranslation("pages");
  return (
    <div className="flex-1 flex flex-col bg-background">
      <MetaTags
        title={t("about.s27")}
        description={t("about.s28")}
        keywords={["AQUAVO", t("about.s29"), t("about.s30"), t("about.s31"), t("about.s32")]}
      />
      <OrganizationSchema />
      <BreadcrumbSchema
        items={[
          { name: t("about.s33"), url: "https://www.aquavoiq.com" },
          { name: t("about.s30"), url: "https://www.aquavoiq.com/about" },
        ]}
      />
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
                <span className="text-sm font-bold text-primary">{t("about.s34")}</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight" data-speakable>
                <span className="text-primary">AQUAVO</span> —{" "}
                <span className="text-accent">{t("about.s35")}</span> {t("about.s36")}
              </h1>

              {/* Answer-First paragraph for AI */}
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed" data-speakable>
                {t("about.s37")}
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
              {t("about.s38")}
            </h2>
            <div className="prose prose-lg dark:prose-invert max-w-none text-right space-y-4">
              <p data-speakable>
                {t("about.s39")}
              </p>
              <p>
                {t("about.s40")}
              </p>
              <p>
                {t("about.s41")}
              </p>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              <Target className="inline w-8 h-8 text-primary ml-2" />
              {t("about.s42")}
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
              {t("about.s43")}
            </h2>
            <p className="text-center text-muted-foreground mb-8">
              {t("about.s44")}
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
              {t("about.s45")}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed" data-speakable>
              {t("about.s46")}
            </p>
            
            <div className="mt-8 p-6 bg-card rounded-2xl border border-border">
              <h3 className="font-bold text-lg mb-4">{t("about.s47")}</h3>
              <div className="flex flex-col md:flex-row gap-4 justify-center items-center text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  <span dir="ltr">+964 774 788 0673</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>{t("about.s48")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>{t("about.s49")}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <BackToTop />    </div>
  );
}
