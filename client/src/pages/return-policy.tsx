import { AlertTriangle, CheckCircle2, PackageSearch, ShieldCheck, Wrench } from "lucide-react";
import { Link } from "wouter";

import { MetaTags } from "@/components/seo/meta-tags";
import { useTranslation } from "react-i18next";

export default function ReturnPolicy() {
  const { t } = useTranslation("pages");
  return (
    <div className="flex-1 bg-background text-foreground" data-testid="return-policy-page" dir="rtl">
      <MetaTags title={t("return-policy.s1")} description={t("return-policy.s2")} />
      <main id="main-content" className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
        <header className="max-w-3xl">
          <p className="text-sm font-bold text-primary">{t("return-policy.s3")}</p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl" data-testid="text-page-title">{t("return-policy.s1")}</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">{t("return-policy.s4")}</p>
        </header>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card/55 p-6 sm:p-8">
            <PackageSearch className="h-7 w-7 text-primary" aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-bold">{t("return-policy.s5")}</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{t("return-policy.s6")}</p>
            <ul className="mt-6 space-y-3 text-sm leading-6">
              <li className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{t("return-policy.s7")}</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{t("return-policy.s8")}</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{t("return-policy.s9")}</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-primary/25 bg-primary/5 p-6 sm:p-8">
            <ShieldCheck className="h-7 w-7 text-primary" aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-bold">{t("return-policy.s10")}</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{t("return-policy.s11")}</p>
            <dl className="mt-6 space-y-4 text-sm">
              <div><dt className="text-muted-foreground">{t("return-policy.s12")}</dt><dd className="mt-1 font-bold">{t("return-policy.s13")}</dd></div>
              <div><dt className="text-muted-foreground">{t("return-policy.s14")}</dt><dd className="mt-1 font-bold">{t("return-policy.s15")}</dd></div>
              <div><dt className="text-muted-foreground">{t("return-policy.s16")}</dt><dd className="mt-1">{t("return-policy.s17")}</dd></div>
              <div><dt className="text-muted-foreground">{t("return-policy.s18")}</dt><dd className="mt-1">{t("return-policy.s19")}</dd></div>
            </dl>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
            <div><h2 className="font-bold">{t("return-policy.s20")}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{t("return-policy.s21")}</p></div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-border p-6">
          <div className="flex items-start gap-3"><Wrench className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><div><h2 className="font-bold">{t("return-policy.s22")}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{t("return-policy.s23")}</p></div></div>
        </section>

        <Link href="/contact" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-primary px-6 text-sm font-bold text-white">{t("return-policy.s24")}</Link>
      </main>
    </div>
  );
}
