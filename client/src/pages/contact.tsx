import { ArrowLeft, Headphones, Mail, MessageCircle, Phone } from "lucide-react";
import { Link } from "wouter";

import { MetaTags } from "@/components/seo/meta-tags";
import { WHATSAPP_URL } from "@/lib/constants/shipping";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { useTranslation } from "react-i18next";

const actionClass = "mt-auto inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-primary/35 px-5 text-sm font-bold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export default function Contact() {
  const { t } = useTranslation("pages");
  return (
    <div className="flex-1 bg-background text-foreground" dir="rtl">
      <MetaTags title={t("contact.s1")} description={t("contact.s2")} />      <main id="main-content" className="mx-auto max-w-5xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
        <header className="max-w-2xl">
          <p className="text-sm font-bold text-primary">{t("contact.s3")}</p>
          <h1 className="mt-3 text-4xl font-bold">{t("contact.s1")}</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">{t("contact.s4")}</p>
        </header>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <section className="flex min-h-64 flex-col rounded-2xl border border-border bg-card/55 p-6">
            <MessageCircle className="h-7 w-7 text-primary" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-bold">{t("contact.s5")}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("contact.s6")}</p>
            <WhatsAppLink source="contact" className={actionClass}>{t("contact.s7")} <ArrowLeft className="h-4 w-4" aria-hidden="true" /></WhatsAppLink>
          </section>
          <section className="flex min-h-64 flex-col rounded-2xl border border-border bg-card/55 p-6">
            <Phone className="h-7 w-7 text-primary" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-bold">{t("contact.s8")}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground" dir="ltr">+964 774 788 0673</p>
            <a href="tel:+9647747880673" className={actionClass}>{t("contact.s9")} <ArrowLeft className="h-4 w-4" aria-hidden="true" /></a>
          </section>
          <section className="flex min-h-64 flex-col rounded-2xl border border-border bg-card/55 p-6">
            <Mail className="h-7 w-7 text-primary" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-bold">{t("contact.s10")}</h2>
            <p className="mt-2 break-all text-sm leading-6 text-muted-foreground" dir="ltr">info@aquavoiq.com</p>
            <a href="mailto:info@aquavoiq.com" className={actionClass}>{t("contact.s11")} <ArrowLeft className="h-4 w-4" aria-hidden="true" /></a>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <Headphones className="h-5 w-5 text-primary" aria-hidden="true" />
          <p className="flex-1 text-sm leading-6">{t("contact.s12")}</p>
          <Link href="/order-tracking" className="text-sm font-bold text-primary hover:underline">{t("contact.s13")}</Link>
          <Link href="/faq" className="text-sm font-bold text-primary hover:underline">{t("contact.s14")}</Link>
        </div>
      </main>    </div>
  );
}
