import { Banknote, BookOpen, Headphones, PackageCheck, Truck } from "lucide-react";
import { Link } from "wouter";

import { BackToTop } from "@/components/back-to-top";
import { BreadcrumbSchema, MetaTags, OrganizationSchema } from "@/components/seo/meta-tags";
import { useTranslation } from "react-i18next";
import { i18next } from "@/i18n";

const reasons = [
  { icon: PackageCheck, title: i18next.t("pages:why-aquavo.s1"), text: i18next.t("pages:why-aquavo.s2") },
  { icon: BookOpen, title: i18next.t("pages:why-aquavo.s3"), text: i18next.t("pages:why-aquavo.s4") },
  { icon: Truck, title: i18next.t("pages:why-aquavo.s5"), text: i18next.t("pages:why-aquavo.s6") },
  { icon: Banknote, title: i18next.t("pages:why-aquavo.s7"), text: i18next.t("pages:why-aquavo.s8") },
  { icon: Headphones, title: i18next.t("pages:why-aquavo.s9"), text: i18next.t("pages:why-aquavo.s10") },
];

export default function WhyAquavo() {
  const { t } = useTranslation("pages");
  return (
    <div className="flex-1 bg-background text-foreground" dir="rtl">
      <MetaTags title={t("why-aquavo.s11")} description={t("why-aquavo.s12")} />
      <OrganizationSchema />
      <BreadcrumbSchema items={[{ name: t("why-aquavo.s13"), url: "https://www.aquavoiq.com" }, { name: t("why-aquavo.s11"), url: "https://www.aquavoiq.com/why-aquavo" }]} />
      <main id="main-content" className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
        <header className="max-w-3xl">
          <p className="text-sm font-bold text-primary">{t("why-aquavo.s14")}</p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">{t("why-aquavo.s11")}</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">{t("why-aquavo.s15")}</p>
        </header>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map(({ icon: Icon, title, text }) => (
            <section key={title} className="rounded-2xl border border-border bg-card/55 p-6">
              <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
              <h2 className="mt-5 text-xl font-bold">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{text}</p>
            </section>
          ))}
        </div>
        <section className="mt-10 rounded-2xl border border-primary/20 bg-[#071821] p-7 text-white sm:p-10">
          <h2 className="text-2xl font-bold">{t("why-aquavo.s16")}</h2>
          <p className="mt-3 max-w-3xl leading-7 text-white/65">{t("why-aquavo.s17")}</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/products" className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-bold text-white">{t("why-aquavo.s18")}</Link><a href="/guides" className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-6 text-sm font-bold">{t("why-aquavo.s19")}</a></div>
        </section>
      </main>
      <BackToTop />
    </div>
  );
}
