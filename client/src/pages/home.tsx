import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Banknote,
  BookOpen,
  Boxes,
  CircleGauge,
  Droplets,
  FileSearch,
  GraduationCap,
  Headphones,
  Heater,
  LayoutGrid,
  Lightbulb,
  ListChecks,
  PackageCheck,
  PackageSearch,
  Target,
  Truck,
  Utensils,
} from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

import { BackToTop } from "@/components/back-to-top";
import { MetaTags } from "@/components/seo/meta-tags";
import { HomeHero, type HomeHeroCopy } from "@/components/home/home-hero";
import { ArrowForward, useForwardHoverClass } from "@/components/ui/directional-icons";
import { useLocale } from "@/i18n/locale-context";
import { formatLocalizedPrice } from "@/i18n/format";
import { PrecisionReveal } from "@/components/motion/precision-reveal";
import { fetchTopSellingProducts } from "@/lib/api";
import { cardImage, cardImageSrcSet } from "@/lib/cloudinary";
import { SHOP_CATEGORY_LINKS } from "@/lib/product-category-links";
import { getProductDisplayIdentity } from "@/lib/product-display";

const serviceFacts = [
  { icon: Truck, title: "facts.delivery", detail: "facts.deliveryDetail" },
  { icon: Banknote, title: "facts.payment", detail: "facts.paymentDetail" },
  { icon: PackageCheck, title: "facts.fee", detail: "facts.feeDetail" },
  { icon: Headphones, title: "facts.support", detail: "facts.supportDetail" },
] as const;

const categories = [
  { title: "categories.filters", description: "categories.filtersDesc", href: SHOP_CATEGORY_LINKS.filters, icon: CircleGauge },
  { title: "categories.heaters", description: "categories.heatersDesc", href: SHOP_CATEGORY_LINKS.heaters, icon: Heater },
  { title: "categories.lighting", description: "categories.lightingDesc", href: SHOP_CATEGORY_LINKS.lighting, icon: Lightbulb },
  { title: "categories.water", description: "categories.waterDesc", href: SHOP_CATEGORY_LINKS.waterTreatment, icon: Droplets },
  { title: "categories.food", description: "categories.foodDesc", href: SHOP_CATEGORY_LINKS.food, icon: Utensils },
  { title: "categories.tanks", description: "categories.tanksDesc", href: "/products", icon: Boxes },
] as const;

const valuePoints = [
  { icon: Target, title: "why.focus.title", description: "why.focus.description" },
  { icon: LayoutGrid, title: "why.organized.title", description: "why.organized.description" },
  { icon: FileSearch, title: "why.clarity.title", description: "why.clarity.description" },
  { icon: ListChecks, title: "why.compare.title", description: "why.compare.description" },
  { icon: GraduationCap, title: "why.learning.title", description: "why.learning.description" },
] as const;

const guides = [
  { key: "guides.filter", href: "/guides/filter-choice" },
  { key: "guides.setup", href: "/guides/new-aquarium-setup-iraq" },
  { key: "guides.heater", href: "/guides/heater-choice" },
] as const;

const linkButton =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function Home() {
  const { t } = useTranslation("home");
  const { locale, dir, href } = useLocale();
  const forwardHover = useForwardHoverClass();
  const heroCopy: HomeHeroCopy = {
    eyebrow: t("hero.eyebrow"),
    title: t("hero.title"),
    description: t("hero.description"),
    browse: t("hero.browse"),
    journey: t("hero.journey"),
    help: t("hero.help"),
    imageAlt: t("hero.imageAlt"),
    methodLabel: t("hero.methodLabel"),
    methodTitle: t("hero.methodTitle"),
  };
  const { data: salesData, isLoading: isStorePicksLoading, isError: isStorePicksError } = useQuery({
    queryKey: ["products", "top-selling"],
    queryFn: fetchTopSellingProducts,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const storePicks = salesData?.bestSellers?.slice(0, 4) ?? [];
  const hasStorePicks = storePicks.length > 0;

  return (
    <div className="flex-1 overflow-x-hidden bg-background text-foreground">
      <MetaTags title={t("meta.title")} description={t("meta.description")} />

      <main id="main-content" dir={dir}>
        <HomeHero copy={heroCopy} dir={dir} />

        <section aria-label={t("guarantees")} className="border-b border-border bg-background">
          <PrecisionReveal stagger className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-border sm:grid-cols-4">
            {serviceFacts.map(({ icon: Icon, title, detail }) => (
              <div key={title} className="aq-trust-seal flex min-h-28 flex-col justify-center bg-background px-4 py-5 text-center sm:min-h-32">
                <Icon className="mx-auto mb-3 h-5 w-5 text-primary" aria-hidden="true" />
                <p className="text-sm font-bold text-foreground">{t(title)}</p>
                <p className="mt-1 text-xs leading-5 text-foreground/60">{t(detail)}</p>
              </div>
            ))}
          </PrecisionReveal>
        </section>

        <section className="bg-background">
          <PrecisionReveal stagger className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-bold text-primary">{t("categories.eyebrow")}</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight text-foreground sm:text-4xl">{t("categories.title")}</h2>
            <p className="mt-4 leading-7 text-muted-foreground">{t("categories.description")}</p>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map(({ title, description, href, icon: Icon }) => (
              <Link
                key={title}
                href={href}
                className="aq-interactive-card group flex min-h-40 items-start gap-4 rounded-2xl border border-border bg-card p-5 hover:border-[#0B93A6]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="flex items-center gap-2 text-lg font-bold text-foreground">
                    {t(title)}
                    <ArrowForward className={`h-4 w-4 text-muted-foreground transition-transform ${forwardHover} group-hover:text-[#0B93A6]`} aria-hidden="true" />
                  </span>
                  <span className="mt-2 block text-sm leading-6 text-muted-foreground">{t(description)}</span>
                </span>
              </Link>
            ))}
          </div>
          </PrecisionReveal>
        </section>

        <section className="border-y border-border bg-card">
          <PrecisionReveal stagger className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-primary">{t("picks.eyebrow")}</p>
                <h2 className="mt-2 text-3xl font-bold text-foreground">{t("picks.title")}</h2>
              </div>
              <Link href="/products" className="text-sm font-bold text-primary hover:underline">{t("picks.viewAll")}</Link>
            </div>

            {isStorePicksLoading ? (
              <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4" role="status" aria-label={t("picks.loading")}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="aspect-square animate-pulse bg-muted motion-reduce:animate-none" />
                    <div className="space-y-2 p-4">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                      <div className="h-4 w-1/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                    </div>
                  </div>
                ))}
                <span className="sr-only">{t("picks.loadingDetail")}</span>
              </div>
            ) : isStorePicksError ? (
              <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-border bg-background px-6 py-12 text-center">
                <AlertTriangle className="h-6 w-6 text-[#C97A2E]" aria-hidden="true" />
                <p className="max-w-md text-sm leading-6 text-muted-foreground">
                  {t("picks.error")}
                </p>
                <Link href="/products" className={`${linkButton} border border-primary/40 text-primary hover:bg-[#0B93A6]/10`}>
                  {t("picks.viewAll")}
                  <ArrowForward className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            ) : hasStorePicks ? (
              <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {storePicks.map((product) => {
                  const productDisplay = getProductDisplayIdentity(product);
                  return (
                    <Link
                      key={product.id}
                      href={`/products/${product.slug}`}
                      className="aq-interactive-card overflow-hidden rounded-2xl border border-border bg-card hover:border-[#0B93A6]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="aspect-square bg-card p-3 sm:p-5">
                        <img
                          src={cardImage(product.images[0]) || "/brand/aquavo-v2-icon.svg"}
                          srcSet={cardImageSrcSet(product.images[0])}
                          sizes="(max-width: 1023px) 50vw, 25vw"
                          alt={product.name}
                          width={360}
                          height={360}
                          loading="lazy"
                          decoding="async"
                          className="aq-product-image h-full w-full object-contain"
                        />
                      </div>
                      <div className="p-4">
                        <p className="min-h-4 truncate text-[10px] font-bold uppercase tracking-[0.08em] text-primary/75">
                          {productDisplay.brand ? <bdi dir="ltr">{productDisplay.brand}</bdi> : "\u00a0"}
                        </p>
                        <h3 className="line-clamp-2 min-h-11 text-sm font-bold leading-6 text-foreground">{productDisplay.name}</h3>
                        <p className="mt-2 text-sm font-bold text-primary">
                          {(product.price ?? 0) > 0 ? formatLocalizedPrice(product.price ?? 0, locale) : t("picks.seeDetails")}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-border bg-background px-6 py-12 text-center">
                <PackageSearch className="h-6 w-6 text-primary" aria-hidden="true" />
                <p className="max-w-md text-sm leading-6 text-muted-foreground">
                  {t("picks.empty")}
                </p>
                <Link href="/products" className={`${linkButton} border border-primary/40 text-primary hover:bg-[#0B93A6]/10`}>
                  {t("picks.viewAll")}
                  <ArrowForward className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            )}
          </PrecisionReveal>
        </section>

        <section className="bg-background">
          <PrecisionReveal stagger className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.75fr_1.25fr] lg:items-end lg:px-8">
            <div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <BookOpen className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mt-6 text-sm font-bold text-primary">{t("guides.eyebrow")}</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight text-foreground sm:text-4xl">{t("guides.title")}</h2>
              <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
                {t("guides.description")}
              </p>
              <a href={href("/guides")} className={`${linkButton} mt-7 border border-primary/35 text-primary hover:bg-[#0B93A6]/10`}>
                {t("guides.viewAll")}
                <ArrowForward className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {guides.map((guide) => (
                <Link
                  key={guide.href}
                  href={guide.href}
                  className="aq-interactive-card group flex min-h-56 flex-col rounded-2xl border border-border bg-card p-5 hover:border-[#0B93A6]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="text-xs font-bold text-primary">{t(`${guide.key}.eyebrow`)}</span>
                  <h3 className="mt-4 text-lg font-bold leading-7 text-foreground">{t(`${guide.key}.title`)}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{t(`${guide.key}.description`)}</p>
                  <span className="mt-auto flex items-center gap-2 pt-5 text-sm font-bold text-primary">
                    {t("guides.open")}
                    <ArrowForward className={`h-4 w-4 transition-transform ${forwardHover}`} aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </PrecisionReveal>
        </section>

        <section className="border-t border-border bg-card">
          <PrecisionReveal stagger className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-bold text-primary">{t("why.eyebrow")}</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight text-foreground sm:text-4xl">{t("why.title")}</h2>
            </div>

            <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {valuePoints.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-border bg-background p-5"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-bold leading-6 text-foreground">{t(title)}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(description)}</p>
                </div>
              ))}
            </div>
          </PrecisionReveal>
        </section>

        <section className="border-t border-border bg-muted text-foreground">
          <PrecisionReveal className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <p className="text-sm font-bold text-foreground/80">{t("cta.eyebrow")}</p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{t("cta.title")}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("cta.description")}</p>
            </div>
            <Link href="/contact" className={`${linkButton} shrink-0 bg-primary text-white hover:bg-primary/90`}>
              {t("cta.button")}
              <ArrowForward className="h-4 w-4" aria-hidden="true" />
            </Link>
          </PrecisionReveal>
        </section>
      </main>
      <BackToTop />
    </div>
  );
}
