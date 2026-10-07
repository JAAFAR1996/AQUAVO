import { useState } from "react";
import { Link } from "wouter";
import { SearchCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TankFit } from "@/components/journey/tank-fit";

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const EASTERN_ARABIC_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function westernDigits(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_INDIC_DIGITS.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(EASTERN_ARABIC_DIGITS.indexOf(digit)))
    .replace(/[^0-9]/g, "");
}

export function HomeTankFit() {
  const { t } = useTranslation("home");
  const [draft, setDraft] = useState("");
  const [litres, setLitres] = useState<number | null>(null);

  const submit = () => {
    const parsed = Number(draft);
    if (Number.isFinite(parsed) && parsed >= 10 && parsed <= 2000) {
      setLitres(parsed);
    }
  };

  return (
    <section className="border-y border-border bg-card" aria-labelledby="home-tank-fit-title">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <SearchCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-5 text-sm font-bold text-primary">{t("tankFit.eyebrow")}</p>
          <h2 id="home-tank-fit-title" className="mt-2 text-3xl font-bold leading-tight text-foreground">
            {t("tankFit.title")}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">{t("tankFit.description")}</p>

          <div className="mt-6 flex max-w-md gap-2">
            <div className="relative flex-1">
              <Input
                value={draft}
                onChange={(event) => {
                  setDraft(westernDigits(event.target.value).slice(0, 4));
                  setLitres(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submit();
                }}
                inputMode="numeric"
                placeholder={t("tankFit.placeholder")}
                aria-label={t("tankFit.inputLabel")}
                className="h-12 pe-14 text-left text-lg font-bold"
                dir="ltr"
              />
              <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs font-bold text-muted-foreground">
                {t("tankFit.litre")}
              </span>
            </div>
            <Button type="button" className="h-12 shrink-0 px-5" onClick={submit} disabled={Number(draft) < 10}>
              {t("tankFit.button")}
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2" aria-label={t("tankFit.quickLabel")}>
            {[40, 60, 100, 200].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  setDraft(String(size));
                  setLitres(size);
                }}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                {size} {t("tankFit.litre")}
              </button>
            ))}
          </div>

          <p className="mt-4 text-xs leading-6 text-muted-foreground">{t("tankFit.proof")}</p>
          <Link href="/journey" className="mt-4 inline-flex text-sm font-bold text-primary hover:underline">
            {t("tankFit.fullPlan")}
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4 sm:p-5">
          {litres ? (
            <TankFit litres={litres} />
          ) : (
            <div className="flex min-h-52 items-center justify-center px-5 text-center text-sm leading-7 text-muted-foreground">
              {t("tankFit.empty")}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
