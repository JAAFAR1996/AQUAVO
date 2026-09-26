import { Banknote, Clock3, MapPinned, PackageCheck, Truck } from "lucide-react";
import { Link } from "wouter";

import { MetaTags } from "@/components/seo/meta-tags";
import { DELIVERY_DAYS } from "@/lib/constants/shipping";
import { formatShippingFeeNumber, useShippingFee } from "@/contexts/shipping-fee-context";
import { useTranslation } from "react-i18next";

export default function Shipping() {
  const { t } = useTranslation("pages");
  const shippingFeeLabel = formatShippingFeeNumber(useShippingFee());
  const facts = [
    { icon: Clock3, title: t("shipping.s1", { v0: DELIVERY_DAYS }), detail: t("shipping.s2") },
    { icon: Truck, title: t("shipping.s3", { v0: shippingFeeLabel }), detail: t("shipping.s4") },
    { icon: Banknote, title: t("shipping.s5"), detail: t("shipping.s6") },
    { icon: MapPinned, title: t("shipping.s7"), detail: t("shipping.s8") },
  ];
  return (
    <div className="flex-1 bg-background text-foreground" dir="rtl">
      <MetaTags title={t("shipping.s9")} description={t("shipping.s10", { fee: shippingFeeLabel })} />
      <main id="main-content" className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
        <header className="max-w-3xl">
          <p className="text-sm font-bold text-primary">{t("shipping.s11")}</p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">{t("shipping.s12")}</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">{t("shipping.s13", { fee: shippingFeeLabel })}</p>
        </header>
        <div className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {facts.map(({ icon: Icon, title, detail }) => (
            <section key={title} className="rounded-2xl border border-border bg-card/55 p-5 text-center">
              <Icon className="mx-auto h-6 w-6 text-primary" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
            </section>
          ))}
        </div>
        <section className="mt-10 rounded-2xl border border-border bg-card/55 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <PackageCheck className="mt-1 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <h2 className="text-2xl font-bold">{t("shipping.s14")}</h2>
              <p className="mt-3 leading-7 text-muted-foreground">{t("shipping.s15")}</p>
            </div>
          </div>
        </section>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/order-tracking" className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-bold text-white">{t("shipping.s16")}</Link>
          <Link href="/contact" className="inline-flex min-h-11 items-center rounded-full border border-border px-6 text-sm font-bold hover:border-primary/50">{t("shipping.s17")}</Link>
        </div>
      </main>
    </div>
  );
}
