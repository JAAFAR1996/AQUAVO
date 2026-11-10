import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSpeciesById, speciesDisplayName } from "@/components/journey/fish-species-data";
import type { WizardData } from "@/types/journey";
import { useTranslation } from "react-i18next";
import { AquariumScene } from "./aquarium-scene";
import "./aquarium-scene.css";

const JOURNEY_INTRO_KEY = "aquavo_journey_intro_seen_v3";
const LEGACY_JOURNEY_TOUR_KEY = "aquavo_tour_seen_journey";

export function JourneyFirstVisitIntro() {
  const { t } = useTranslation("tools");
  const [eligible, setEligible] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      // Retire the older multi-step Joyride tour before its deferred mount runs.
      window.localStorage.setItem(LEGACY_JOURNEY_TOUR_KEY, "true");
      if (window.localStorage.getItem(JOURNEY_INTRO_KEY) === "1") return;
      window.localStorage.setItem(JOURNEY_INTRO_KEY, "1");
      setEligible(true);
    } catch {
      // Storage-restricted browsers skip the optional explanation.
    }
  }, []);

  useEffect(() => {
    if (!eligible) return;
    const timer = window.setTimeout(() => setOpen(true), 420);
    return () => window.clearTimeout(timer);
  }, [eligible]);

  if (!eligible) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        dir="rtl"
        data-aqv-motion="journey-intro"
        className="aqv-journey-intro max-w-md overflow-hidden border-primary/25 p-0"
      >
        <div className="aqv-journey-intro__visual" aria-hidden="true">
          <img src="/brand/aquavo-v2-icon.svg" alt="" width={48} height={48} />
          <span />
        </div>
        <div className="space-y-5 px-6 pb-6 pt-2 text-right">
          <DialogHeader className="text-right sm:text-right">
            <DialogTitle className="text-2xl font-black text-primary">
              {t("journey-experience.s1")}
            </DialogTitle>
            <DialogDescription className="mt-2 text-base leading-7">
              {t("journey-experience.s2")}
            </DialogDescription>
          </DialogHeader>
          <Button className="h-12 w-full font-bold aqv-press" onClick={() => setOpen(false)}>
            {t("journey-experience.s3")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface JourneyTankVisualizerProps {
  data: WizardData;
  currentStep: number;
  total: number;
}

type PreviewLabelKey = `journey-experience.s${4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14}`;

const FILTER_LABEL_KEYS: Partial<Record<string, PreviewLabelKey>> = {
  hob: "journey-experience.s4",
  canister: "journey-experience.s5",
  sponge: "journey-experience.s6",
  internal: "journey-experience.s7",
};
const SUBSTRATE_LABEL_KEYS: Partial<Record<string, PreviewLabelKey>> = {
  gravel: "journey-experience.s8",
  sand: "journey-experience.s9",
  "planted-substrate": "journey-experience.s10",
  mixed: "journey-experience.s11",
};
const TANK_TYPE_LABEL_KEYS: Partial<Record<string, PreviewLabelKey>> = {
  "freshwater-community": "journey-experience.s12",
  planted: "journey-experience.s13",
  "species-specific": "journey-experience.s14",
};

export function JourneyTankVisualizer({ data, currentStep, total }: JourneyTankVisualizerProps) {
  const { t, i18n } = useTranslation("tools");
  const species = useMemo(
    () => getSpeciesById([...new Set(data.selectedSpecies || [])]),
    [data.selectedSpecies],
  );
  const litres = Number(data.tankLiters || 0);
  const labelKeys = [
    TANK_TYPE_LABEL_KEYS[data.tankType],
    FILTER_LABEL_KEYS[data.filterType],
    SUBSTRATE_LABEL_KEYS[data.substrateType],
  ];
  const speciesLanguage = i18n.language.startsWith("ar") ? "ar" : "en";
  const speciesNames = species
    .map((item) => speciesDisplayName(item, speciesLanguage))
    .join(speciesLanguage === "ar" ? "، " : ", ");
  const selectedLabels = [
    litres > 0 ? t("journey-experience.s19", { v0: litres }) : "",
    ...labelKeys.flatMap((key) => key ? [t(key)] : []),
    data.heaterWattage > 0 ? t("journey-experience.s22", { v0: data.heaterWattage }) : "",
  ].filter(Boolean);

  return (
    <section
      className="aqv-journey-preview aqv-aquarium-preview"
      data-aqv-motion="journey-preview"
      data-summary={currentStep === total - 1 ? "true" : "false"}
      aria-label={t("journey-experience.s20")}
    >
      <AquariumScene
        data={data}
        species={species}
        title={t("journey-experience.s20")}
        description={t("journey-experience.s21")}
      />
      {(selectedLabels.length > 0 || speciesNames) && (
        <div className="aqv-journey-preview__status">
          <ul className="aqv-journey-preview__chips m-0 list-none p-0" aria-label={t("journey-experience.s25")}>
            {selectedLabels.map((item) => (
              <li key={item} className="min-w-0"><span className="block break-words">{item}</span></li>
            ))}
            {speciesNames && (
              <li className="min-w-0">
                <span className="block break-words" lang={speciesLanguage} dir={speciesLanguage === "ar" ? "rtl" : "ltr"}>
                  {speciesNames}
                </span>
              </li>
            )}
          </ul>
          {species.length > 0 && <small>{t("journey-experience.s26")}</small>}
        </div>
      )}
    </section>
  );
}
