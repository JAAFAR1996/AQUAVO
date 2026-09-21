import { BookOpen, ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MetaTags } from "@/components/seo/meta-tags";
import { useLocale } from "@/i18n/locale-context";

const GUIDE_CARDS = [
  { key: "filter", href: "/guides/filter-choice" },
  { key: "setup", href: "/guides/new-aquarium-setup-iraq" },
  { key: "heater", href: "/guides/heater-choice" },
] as const;

export default function GuidesIndex() {
  const { t } = useTranslation("home");
  const { href, dir } = useLocale();

  return (
    <main id="main-content" className="flex-1 bg-background text-foreground">
      <MetaTags
        title={`${t("guides.title")} | AQUAVO`}
        description={t("guides.description")}
      />

      <section className="border-b border-border/70 bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm font-semibold text-primary">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              {t("guides.eyebrow")}
            </div>
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
              {t("guides.title")}
            </h1>
            <p className="mt-4 text-base leading-8 text-muted-foreground sm:text-lg">
              {t("guides.description")}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
        {GUIDE_CARDS.map(({ key, href: logicalPath }) => (
          <a
            key={key}
            href={href(logicalPath)}
            className="group flex min-h-64 flex-col rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-primary/45"
          >
            <div className="text-sm font-semibold text-primary">
              {t(`guides.${key}.eyebrow`)}
            </div>
            <h2 className="mt-3 text-xl font-bold leading-8">
              {t(`guides.${key}.title`)}
            </h2>
            <p className="mt-3 flex-1 leading-7 text-muted-foreground">
              {t(`guides.${key}.description`)}
            </p>
            <span className="mt-6 inline-flex items-center gap-2 font-semibold text-primary">
              {t("guides.open")}
              <ChevronLeft
                className={`h-4 w-4 ${dir === "ltr" ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </span>
          </a>
        ))}
      </section>
    </main>
  );
}
