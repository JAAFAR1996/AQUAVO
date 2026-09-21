import { BarChart3, Database, Mail, MessageCircle, PackageCheck, ShieldCheck } from "lucide-react";

import { MetaTags } from "@/components/seo/meta-tags";
import { WHATSAPP_URL } from "@/lib/constants/shipping";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { useTranslation } from "react-i18next";
import { i18next } from "@/i18n";

const sections = [
  {
    icon: PackageCheck,
    title: i18next.t("pages:privacy-policy.s1"),
    text: i18next.t("pages:privacy-policy.s2"),
  },
  {
    icon: BarChart3,
    title: i18next.t("pages:privacy-policy.s3"),
    text: i18next.t("pages:privacy-policy.s4"),
  },
  {
    icon: Database,
    title: i18next.t("pages:privacy-policy.s5"),
    text: i18next.t("pages:privacy-policy.s6"),
  },
  {
    icon: ShieldCheck,
    title: i18next.t("pages:privacy-policy.s7"),
    text: i18next.t("pages:privacy-policy.s8"),
  },
];

export default function PrivacyPolicy() {
  const { t } = useTranslation("pages");
  return (
    <div className="flex-1 bg-background text-foreground" dir="rtl" data-testid="privacy-policy-page">
      <MetaTags title={t("privacy-policy.s9")} description={t("privacy-policy.s10")} />
      <main id="main-content" className="mx-auto max-w-5xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
        <header className="max-w-3xl">
          <p className="text-sm font-bold text-primary">{t("privacy-policy.s11")}</p>
          <h1 className="mt-3 text-4xl font-bold" data-testid="text-page-title">{t("privacy-policy.s9")}</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            {t("privacy-policy.s12")}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">{t("privacy-policy.s13")}</p>
        </header>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-border bg-card/55 p-6">
              <section.icon className="h-7 w-7 text-primary" aria-hidden="true" />
              <h2 className="mt-5 text-xl font-bold">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{section.text}</p>
            </section>
          ))}
        </div>

        <section className="mt-6 rounded-2xl border border-primary/25 bg-primary/5 p-6 sm:p-8">
          <h2 className="text-2xl font-bold">{t("privacy-policy.s14")}</h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            {t("privacy-policy.s15")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <WhatsAppLink source="other" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 font-bold text-primary-foreground">
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> {t("privacy-policy.s16")}
            </WhatsAppLink>
            <a href="mailto:info@aquavoiq.com" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/35 px-5 font-bold text-primary">
              <Mail className="h-4 w-4" aria-hidden="true" /> info@aquavoiq.com
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
