import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetaTags } from "@/components/seo/meta-tags";
import { Fish, Ruler, Thermometer, Users, Droplets } from "lucide-react";
import { useTranslation } from "react-i18next";
import { i18next } from "@/i18n";

const checks = [
  {
    title: i18next.t("tools:fish-finder.s1"),
    text: i18next.t("tools:fish-finder.s2"),
    icon: Ruler,
  },
  {
    title: i18next.t("tools:fish-finder.s3"),
    text: i18next.t("tools:fish-finder.s4"),
    icon: Thermometer,
  },
  {
    title: i18next.t("tools:fish-finder.s5"),
    text: i18next.t("tools:fish-finder.s6"),
    icon: Users,
  },
  {
    title: i18next.t("tools:fish-finder.s7"),
    text: i18next.t("tools:fish-finder.s8"),
    icon: Droplets,
  },
];

export default function FishFinder() {
  const { t } = useTranslation("tools");
  return (
    <div className="flex-1 bg-background text-foreground" dir="rtl">
      <MetaTags
        title={t("fish-finder.s9")}
        description={t("fish-finder.s10")}
        canonicalUrl="https://www.aquavoiq.com/fish-finder"
      />      <main className="container mx-auto px-4 py-10">
        <section className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm text-primary">
            <Fish className="h-4 w-4" />
            {t("fish-finder.s11")}
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl md:text-5xl font-black leading-tight">
              {t("fish-finder.s9")}
            </h1>
            <p className="text-lg text-muted-foreground leading-8">
              {t("fish-finder.s12")}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {checks.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="border-border/70 bg-card/80">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <span className="rounded-lg bg-primary/10 p-2 text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-7">{item.text}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <section className="rounded-xl border border-border bg-card/70 p-5 space-y-4">
            <h2 className="text-2xl font-bold">{t("fish-finder.s13")}</h2>
            <p className="text-muted-foreground leading-8">
              {t("fish-finder.s14")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/fish-encyclopedia">{t("fish-finder.s15")}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/fish-compatibility">{t("fish-finder.s16")}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/guides/new-aquarium-setup-iraq">{t("fish-finder.s17")}</Link>
              </Button>
              <Button asChild>
                <Link href="/guides/aquarium-water-test-guide">{t("fish-finder.s18")}</Link>
              </Button>
            </div>
          </section>
        </section>
      </main>    </div>
  );
}
