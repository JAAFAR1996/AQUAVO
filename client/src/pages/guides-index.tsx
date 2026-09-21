import { BookOpen, ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MetaTags } from "@/components/seo/meta-tags";
import { useLocale } from "@/i18n/locale-context";

const GUIDE_CARDS = [
  { id: "eco-friendly", href: "/guides/eco-friendly", title: "guides-eco-friendly.s2", description: "guides-eco-friendly.s3" },
  { id: "fish-hiding", href: "/guides/fish-hiding", title: "guides-fish-hiding.s4", description: "guides-fish-hiding.s6" },
  { id: "water-myths", href: "/guides/water-myths", title: "guides-water-myths.s5", description: "guides-water-myths.s7" },
  { id: "essential-tools", href: "/guides/essential-tools", title: "guides-essential-tools.s5", description: "guides-essential-tools.s7" },
  { id: "water-change-schedule", href: "/guides/water-change-schedule", title: "guides-water-change-schedule.s4", description: "guides-water-change-schedule.s6" },
  { id: "tank-rescue-plan", href: "/guides/tank-rescue-plan", title: "guides-tank-rescue-plan.s4", description: "guides-tank-rescue-plan.s6" },
  { id: "feeding-table", href: "/guides/feeding-table", title: "guides-feeding-table.s4", description: "guides-feeding-table.s6" },
  { id: "filter-choice", href: "/guides/filter-choice", title: "guides-filter-choice.s9", description: "guides-filter-choice.s11" },
  { id: "temperature-guide", href: "/guides/temperature-guide", title: "guides-temperature-guide.s3", description: "guides-temperature-guide.s5" },
  { id: "happy-fish-signs", href: "/guides/happy-fish-signs", title: "guides-happy-fish-signs.s2", description: "guides-happy-fish-signs.s4" },
  { id: "aquarium-salt", href: "/guides/aquarium-salt", title: "guides-aquarium-salt.s2", description: "guides-aquarium-salt.s4" },
  { id: "filter-media", href: "/guides/filter-media", title: "guides-filter-media.s5", description: "guides-filter-media.s7" },
  { id: "algae-control", href: "/guides/algae-control", title: "guides-algae-control.s2", description: "guides-algae-control.s4" },
  { id: "white-scale", href: "/guides/white-scale", title: "guides-white-scale.s2", description: "guides-white-scale.s4" },
  { id: "quarantine", href: "/guides/quarantine", title: "guides-quarantine.s3", description: "guides-quarantine.s5" },
  { id: "heater-choice", href: "/guides/heater-choice", title: "guides-heater-choice.s5", description: "guides-heater-choice.s7" },
  { id: "treatment-basics", href: "/guides/treatment-basics", title: "guides-treatment-basics.s2", description: "guides-treatment-basics.s4" },
  { id: "new-aquarium-setup", href: "/guides/new-aquarium-setup-iraq", title: "guides-new-aquarium-setup.s51", description: "guides-new-aquarium-setup.s52" },
  { id: "water-test-guide", href: "/guides/aquarium-water-test-guide", title: "guides-water-test-guide.s55", description: "guides-water-test-guide.s56" },
  { id: "decor-stones", href: "/guides/aquarium-decor-stones-guide", title: "guides-decor-stones.s46", description: "guides-decor-stones.s47" },
] as const;

export default function GuidesIndex() {
  const { t: homeT } = useTranslation("home");
  const { t: guidesT } = useTranslation("guides");
  const { href, dir } = useLocale();

  return (
    <main id="main-content" className="flex-1 bg-background text-foreground">
      <MetaTags
        title={`${homeT("guides.title")} | AQUAVO`}
        description={homeT("guides.description")}
      />

      <section className="border-b border-border/70 bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm font-semibold text-primary">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              {homeT("guides.eyebrow")}
            </div>
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
              {homeT("guides.title")}
            </h1>
            <p className="mt-4 text-base leading-8 text-muted-foreground sm:text-lg">
              {homeT("guides.description")}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-5 text-sm font-medium text-muted-foreground">
          {GUIDE_CARDS.length} {homeT("guides.viewAll")}
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {GUIDE_CARDS.map((guide) => (
            <a
              key={guide.id}
              href={href(guide.href)}
              className="group flex min-h-64 flex-col rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-primary/45"
            >
              <h2 className="text-xl font-bold leading-8">
                {guidesT(guide.title)}
              </h2>
              <p className="mt-3 flex-1 leading-7 text-muted-foreground">
                {guidesT(guide.description)}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 font-semibold text-primary">
                {homeT("guides.open")}
                <ChevronLeft
                  className={`h-4 w-4 ${dir === "ltr" ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
