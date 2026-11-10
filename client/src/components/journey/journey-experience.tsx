import { useEffect, useId, useMemo, useState } from "react";
import { ChevronDown, MousePointer2, Sun, Sunset } from "lucide-react";

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
import { LessonChoices } from "./journey-lesson";
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
  onExploreStep?: (step: number) => void;
}

const EXPLORE_TOPICS = ["space", "filter", "light", "floor", "water", "fish"] as const;
type ExploreTopic = (typeof EXPLORE_TOPICS)[number];
const EXPLORE_STEPS: Record<ExploreTopic, number> = { space: 0, filter: 2, light: 2, floor: 3, water: 4, fish: 6 };
const STEP_TOPICS: ExploreTopic[] = ["space", "space", "filter", "floor", "water", "water", "fish", "water", "space"];
const ROOM_LIGHTS = [{ id: "day", Icon: Sun }, { id: "dusk", Icon: Sunset }] as const;
type RoomLight = (typeof ROOM_LIGHTS)[number]["id"];

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

export function JourneyTankVisualizer({ data, currentStep, total, onExploreStep }: JourneyTankVisualizerProps) {
  const { t, i18n } = useTranslation("tools");
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [topic, setTopic] = useState<ExploreTopic>(STEP_TOPICS[currentStep] || "space");
  const [roomLight, setRoomLight] = useState<RoomLight>("day");
  const lightGroup = useId();
  const hasFixture = ["basic-led", "planted-led", "rgb-smart"].includes(data.lightingType);
  const dusk = hasFixture && roomLight === "dusk";
  useEffect(() => { if (!hasFixture) setRoomLight("day"); }, [hasFixture]);
  useEffect(() => setTopic((current) => EXPLORE_STEPS[current] === currentStep
    ? current : STEP_TOPICS[currentStep] || "space"), [currentStep]);
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
      data-explore={explorerOpen ? topic : undefined}
      data-room-light={hasFixture ? roomLight : undefined}
    >
      <div className="aqv-aquarium-viewport">
        <AquariumScene
          data={data}
          species={species}
          title={t("journey-experience.s20")}
          description={dusk ? `${t("journey-experience.s21")} · ${t("journey-view-light.dusk")}` : t("journey-experience.s21")}
        />
        {dusk && <span className="aqv-room-light-badge" aria-hidden="true">
          <Sunset size={15} />{t("journey-view-light.dusk")}
        </span>}
      </div>
      {hasFixture && (
        <fieldset className="aqv-room-light" aria-labelledby={`${lightGroup}-title`} aria-describedby={`${lightGroup}-note`}>
          <div className="aqv-room-light__bar">
            <span id={`${lightGroup}-title`} className="aqv-room-light__title">{t("journey-view-light.title")}</span>
            <div className="aqv-room-light__options">
              {ROOM_LIGHTS.map(({ id, Icon }) => (
                <label key={id}>
                  <input className="sr-only" type="radio" name={lightGroup} value={id}
                    checked={roomLight === id} onChange={() => setRoomLight(id)} />
                  <span><Icon size={17} aria-hidden="true" />{t(`journey-view-light.${id}`)}</span>
                </label>
              ))}
            </div>
          </div>
          <span id={`${lightGroup}-note`} hidden>{t("journey-view-light.note")}</span>
        </fieldset>
      )}
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
      <details className="aqv-aquarium-explorer" open={explorerOpen} onToggle={(event) => setExplorerOpen(event.currentTarget.open)}>
        <summary>
          <MousePointer2 size={17} aria-hidden="true" />
          <span>{t("journey-explore.title")}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </summary>
        <div className="aqv-aquarium-explorer__content">
          <p className="aqv-lesson-caption">{t("journey-explore.intro")}</p>
          <LessonChoices label={t("journey-explore.title")}
            options={EXPLORE_TOPICS.map((id) => ({ id, label: t(`journey-explore.${id}.label`) }))}
            value={topic} onChange={(value) => setTopic(value as ExploreTopic)} />
          <div className="aqv-aquarium-explorer__readout" aria-live="polite" aria-atomic="true">
            <h3>{t(`journey-explore.${topic}.title`)}</h3>
            <p>{t(`journey-explore.${topic}.body`)}</p>
            {topic === "space" && <p className="aqv-lesson-caption">{t("journey-explore.space.volume", { liters: litres || "—" })}</p>}
            {topic === "filter" && <p className="aqv-lesson-caption">{data.filterType && data.filterType !== "unknown"
              ? t("journey-explore.selected", { value: t(FILTER_LABEL_KEYS[data.filterType] || "journey-layout.notChosen") })
              : t("journey-explore.filter.unselected")}</p>}
            {topic === "light" && <p className="aqv-lesson-caption">{t(hasFixture ? "journey-view-light.note" : "journey-view-light.unselected")}</p>}
            {topic === "water" && <p className="aqv-lesson-caption">{t("journey-explore.water.preview")}</p>}
            {topic === "fish" && <p className="aqv-lesson-caption">{t("journey-experience.s26")}</p>}
          </div>
          {onExploreStep && <button type="button" className="aqv-aquarium-explorer__link" onClick={() => onExploreStep(EXPLORE_STEPS[topic])}>
            {t("journey-explore.open", { topic: t(`journey-explore.${topic}.label`) })}
          </button>}
        </div>
      </details>
    </section>
  );
}
