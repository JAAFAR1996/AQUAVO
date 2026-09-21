import { MetaTags } from "@/components/seo/meta-tags";
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
import { WHATSAPP_NUMBER, WHATSAPP_URL } from "@/lib/constants/shipping";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { useTranslation } from "react-i18next";

export default function Terms() {
  const { t } = useTranslation("pages");
  const sections = [
    {
      icon: ShoppingCart,
      title: t("terms.s1"),
      content: [
         t("terms.s2"),
         t("terms.s3"),
         t("terms.s4"),
         t("terms.s5"),
         t("terms.s6")
      ]
    },
    {
      icon: CreditCard,
      title: t("terms.s7"),
      content: [
         t("terms.s8"),
         t("terms.s9"),
         t("terms.s10"),
         t("terms.s11"),
         t("terms.s12"),
         t("terms.s13")
      ]
    },
    {
      icon: Truck,
      title: t("terms.s14"),
      content: [
         t("terms.s15"),
         t("terms.s16"),
         t("terms.s17"),
         t("terms.s18")
      ]
    },
    {
      icon: Shield,
      title: t("terms.s19"),
      content: [
         t("terms.s20"),
         t("terms.s21"),
         t("terms.s22"),
         t("terms.s23"),
         t("terms.s24")
      ]
    }
  ];

  const prohibitedActivities = [
    t("terms.s25"),
    t("terms.s26"),
    t("terms.s27"),
    t("terms.s28"),
    t("terms.s29"),
    t("terms.s30")
  ];

  const intellectualProperty = [
    t("terms.s31"),
    t("terms.s32"),
    t("terms.s33"),
    t("terms.s34"),
    t("terms.s35")
  ];

  const limitations = [
    t("terms.s36"),
    t("terms.s37"),
    t("terms.s38"),
    t("terms.s39"),
    t("terms.s40")
  ];

  return (
    <div className="flex-1 flex flex-col bg-background font-sans" data-testid="terms-page">
      <MetaTags title={t("terms.s41")} description={t("terms.s42")} />

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
              {t("terms.s43")}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6" data-testid="text-page-title">
              {t("terms.s41")}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("terms.s44")}
            </p>
             <p className="text-sm text-muted-foreground mt-4">
               {t("terms.s45")}
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
                    <h3 className="text-xl font-bold mb-3">{t("terms.s46")}</h3>
                    <p className="text-muted-foreground">
                      {t("terms.s47")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
              <ChevronLeft className="w-6 h-6 text-primary" />
              {t("terms.s48")}
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {sections.map((section) => (
                <Card key={section.title} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                        <section.icon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold">{section.title}</h3>
                    </div>
                    <ul className="space-y-2">
                      {section.content.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
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
              {t("terms.s49")}
            </h2>
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <UserX className="w-5 h-5 text-red-500" />
                  </div>
                  <p className="text-muted-foreground">
                    {t("terms.s50")}
                  </p>
                </div>
                <ul className="grid md:grid-cols-2 gap-3">
                  {prohibitedActivities.map((activity) => (
                    <li key={activity} className="flex items-start gap-2 p-3 bg-background rounded-lg">
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
              {t("terms.s51")}
            </h2>
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Scale className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-amber-600">{t("terms.s52")}</h3>
                    <p className="text-muted-foreground mb-4">
                      {t("terms.s53")}
                    </p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {intellectualProperty.map((item) => (
                    <li key={item} className="flex items-start gap-2 p-3 bg-background rounded-lg">
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
              {t("terms.s54")}
            </h2>
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardContent className="p-6">
                <ul className="space-y-3">
                  {limitations.map((limit) => (
                    <li key={limit} className="flex items-start gap-3 p-3 bg-background rounded-lg">
                      <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>{limit}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 p-4 bg-background rounded-lg border border-blue-500/20">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">{t("terms.s55")}</strong> {t("terms.s56")}
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
                    <h3 className="text-xl font-bold mb-3">{t("terms.s57")}</h3>
                    <p className="text-muted-foreground mb-4">
                      {t("terms.s58")}
                    </p>
                    <p className="text-sm text-green-600 font-medium">
                      {t("terms.s59")}
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
                  <h2 className="text-3xl font-bold mb-4">{t("terms.s60")}</h2>
                  <p className="text-muted-foreground">
                    {t("terms.s61")}
                  </p>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  <a
                    href={`tel:+${WHATSAPP_NUMBER}`}
                    className="flex items-center gap-4 p-4 bg-background/80 rounded-xl hover:bg-background transition-colors group"
                  >
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                      <Phone className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{t("terms.s62")}</p>
                      <p className="text-sm text-muted-foreground" dir="ltr">+964 774 788 0673</p>
                    </div>
                  </a>
                  <WhatsAppLink
                    source="other"
                    className="flex items-center gap-4 p-4 bg-background/80 rounded-xl hover:bg-background transition-colors group"
                  >
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                      <MessageCircle className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">{t("terms.s63")}</p>
                      <p className="text-sm text-muted-foreground">{t("terms.s64")}</p>
                    </div>
                  </WhatsAppLink>
                  <a
                    href="mailto:info@aquavoiq.com"
                    className="flex items-center gap-4 p-4 bg-background/80 rounded-xl hover:bg-background transition-colors group"
                  >
                    <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                      <Mail className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">{t("terms.s65")}</p>
                      <p className="text-sm text-muted-foreground">info@aquavoiq.com</p>
                    </div>
                  </a>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        </div>
      </main>
    </div>
  );
}
