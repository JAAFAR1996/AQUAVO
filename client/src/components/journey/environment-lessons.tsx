import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ParseKeys } from "i18next";
import { JourneyLesson, LessonChoices, LessonSource } from "./journey-lesson";
import "./environment-lessons.css";

const SOURCES = {
  water: { label: "OATA · Water quality", href: "https://ornamentalfish.org/what-we-do/advice-information/care-sheets/caresheets-tropical-freshwater-fish/how-to-test-water-quality-in-your-freshwater-tank-aquarium/" },
  cycling: { label: "RSPCA · Aquarium environment", href: "https://science.rspca.org.uk/en/web/rspca/adviceandwelfare/pets/fish/environment" },
  chloramine: { label: "MWRA · Chloramines and aquariums", href: "https://www.mwra.com/sites/default/files/2023-11/chloramines-qa.pdf" },
  minerals: { label: "Seachem · RO water and minerals", href: "https://www.seachem.com/equilibrium.php" },
  treatment: { label: "JBL · Water treatment", href: "https://www.jbl.de/en/essentials-aquarium-water-treatment/section/66/water-treatment" },
  decor: { label: "JBL · Stones and roots", href: "https://www.jbl.de/en/essentials-aquarium-decoration/section/61/decoration-stones-roots?country=us" },
  soil: { label: "Fluval · Aquarium soil", href: "https://fluvalaquatics.com/uk/blog/aquarium-soil-substrates" },
  planting: { label: "Tropica · Aquarium soil", href: "https://tropica.com/en/plant-care/aquarium-soil/aquarium-soil/" },
} as const;

// All callers construct keys from the fixed lesson registries below.
const environmentKey = (key: string) => `journey-environment.${key}` as ParseKeys<"tools">;

const SUBSTRATES = ["gravel", "sand", "planted-substrate", "mixed"] as const;
const DECORATIONS = ["live-plants", "driftwood", "rocks", "caves", "artificial-plants", "background"] as const;
const WATER_SOURCES = ["tap", "ro", "well"] as const;
const CYCLING_METHODS = ["fishless", "with-hardy-fish", "seeded", "bottled-bacteria"] as const;

function SubstrateSection({ type, cleaning, label }: { type: string; cleaning: boolean; label: string }) {
  const titleId = useId();
  const soil = type === "planted-substrate";
  const fine = type === "sand" || soil;
  return <svg className="aqv-environment-diagram" viewBox="0 0 320 150" role="img" aria-labelledby={titleId}>
    <title id={titleId}>{label}</title>
    <rect x="12" y="12" width="296" height="126" rx="6" fill="#173D43" />
    <path d="M13 25H307" stroke="#BCE6DE" strokeOpacity=".4" />
    <path d="M14 83C90 81 168 107 306 108V134H14Z" fill={soil ? "#615041" : type === "gravel" ? "#8A8D80" : "#C8B692"} />
    {type === "mixed" && <path d="M156 97C206 105 250 109 306 108V134H156Z" fill="#675246" />}
    {Array.from({ length: 44 }, (_, index) => {
      const x = 21 + (index % 15) * 19;
      const y = 95 + Math.min(18, x / 12) + Math.floor(index / 15) * 8;
      return <ellipse key={index} cx={x} cy={y} rx={fine ? 1.8 : 5} ry={fine ? 1.2 : 3.2} fill={index % 2 ? "#E0D1AD" : "#554A3F"} opacity={soil ? .28 : .52} />;
    })}
    {type === "mixed" && <path d="M156 98V134" stroke="#B9C7BC" strokeWidth="3" />}
    {cleaning ? <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={`M190 ${type === "gravel" ? 123 : 97}V54H215V${type === "gravel" ? 123 : 97}`} stroke="#D6F1E6" strokeWidth="3" />
      <path d="M203 54V39C203 24 246 30 246 45V80" stroke="#8BCDC2" strokeWidth="4" />
      <path d="M202 91V69M197 75L202 69L207 75" stroke="#F0CB8E" strokeWidth="2" />
      <circle cx="202" cy="102" r="2" fill="#D5B68E" stroke="none" />
      <circle cx="207" cy="110" r="1.5" fill="#D5B68E" stroke="none" />
    </g> : <g fill="none" stroke="#E1DAC1" strokeLinecap="round" opacity=".8">
      <path d="M36 68C113 65 178 92 277 93" strokeWidth="1.5" strokeDasharray="4 5" />
      <path d="M268 87L277 93L267 98" strokeWidth="1.5" />
    </g>}
    <path d="M12 12V138H308V12" fill="none" stroke="#B6DED5" strokeWidth="2" strokeOpacity=".7" />
  </svg>;
}

export function SubstrateLesson({ type }: { type: string }) {
  const { t } = useTranslation("tools");
  const [mode, setMode] = useState("prepare");
  if (!SUBSTRATES.some((item) => item === type)) return null;
  const key = (suffix: string) => environmentKey(`substrate_${type}_${suffix}`);
  return <JourneyLesson
    title={t(key("title"))}
    summary={t(key("summary"))}
    sections={[
      { title: t("journey-environment.beforeAdding"), body: t(key("check")) },
      { title: t("journey-environment.choiceFit"), body: t(key("fit")) },
    ]}
    footer={<LessonSource label={t("journey-environment.sources")} sources={[SOURCES.soil, SOURCES.planting]} />}
  >
    <LessonChoices label={t("journey-environment.substrateExplore")} value={mode} onChange={setMode}
      options={[
        { id: "prepare", label: t("journey-environment.crossSection") },
        { id: "clean", label: t("journey-environment.cleaning") },
      ]} />
    <SubstrateSection type={type} cleaning={mode === "clean"} label={t(key(mode === "clean" ? "clean" : "place"))} />
    <p className="aqv-environment-caption" aria-live="polite">{t(key(mode === "clean" ? "clean" : "place"))}</p>
  </JourneyLesson>;
}

function DecorPlacement({ item, top, label }: { item: string; top: boolean; label: string }) {
  const titleId = useId();
  const plants = item === "live-plants" || item === "artificial-plants";
  return <svg className="aqv-environment-diagram" viewBox="0 0 320 150" role="img" aria-labelledby={titleId}>
    <title id={titleId}>{label}</title>
    <rect x="12" y="12" width="296" height="126" rx="6" fill="#183B40" stroke="#93BEB5" strokeWidth="1.5" />
    {top ? <>
      <path d="M24 24H296V124H24Z" fill="#A99C7C" opacity=".18" />
      <path d="M31 98C107 83 209 85 287 103" fill="none" stroke="#B9E0D4" strokeDasharray="4 5" opacity=".65" />
      {plants && <g fill={item === "live-plants" ? "#80A76C" : "#6BA498"}>
        {[42, 61, 80, 218, 239, 260].map((x) => <g key={x} transform={`translate(${x} 43)`}>
          <ellipse rx="8" ry="18" transform="rotate(-35)" /><ellipse rx="7" ry="18" transform="rotate(40)" />
        </g>)}
      </g>}
      {item === "rocks" && <g fill="#98A58F" stroke="#627968" strokeWidth="2"><path d="M58 48L90 25L115 47L103 76L67 70Z" /><path d="M110 65L129 48L146 68L127 84Z" /></g>}
      {item === "driftwood" && <g fill="none" stroke="#AD8960" strokeWidth="10" strokeLinecap="round"><path d="M81 71L146 45L222 58M146 45L184 24M116 56L89 29" /></g>}
      {item === "caves" && <g><path d="M198 29Q250 12 271 45L266 77H202Z" fill="#899482" /><rect x="217" y="65" width="31" height="14" rx="6" fill="#173B40" /></g>}
      {item === "background" && <path d="M20 16H300" stroke="#0A2029" strokeWidth="8" />}
    </> : <>
      <path d="M14 121C96 108 204 123 306 115V136H14Z" fill="#BDAE8D" />
      {plants && <g fill={item === "live-plants" ? "#6F965A" : "#70A89A"}>
        {[47, 66, 239, 260].map((x, index) => <g key={x} transform={`translate(${x} 119)`}>
          <path d={`M0 0C-17 -35 -15 -${67 + index * 5} -7 -83C9 -58 13 -26 0 0Z`} />
          <path d="M0 0C-1 -35 13 -54 23 -62C25 -35 13 -13 0 0Z" fill="#9AB677" />
        </g>)}
      </g>}
      {item === "rocks" && <g><path d="M59 119L76 65L101 41L116 67L140 119Z" fill="#7B8C7E" /><path d="M76 65L101 41L99 102L59 119Z" fill="#A0AA93" /><path d="M133 121L149 87L169 80L187 122Z" fill="#8C9B86" /></g>}
      {item === "driftwood" && <g fill="none" strokeLinecap="round"><path d="M73 121Q137 108 166 76L216 42M151 91L133 59L108 44M178 68L251 63" stroke="#77583E" strokeWidth="14" /><path d="M75 117Q138 103 166 74L216 42M151 88L132 58L108 44M178 65L251 61" stroke="#B89261" strokeWidth="3" /></g>}
      {item === "caves" && <g><path d="M184 120Q182 65 228 61Q274 64 278 120Z" fill="#899782" /><path d="M211 122V101Q228 77 249 102V122Z" fill="#183B40" /></g>}
      {item === "background" && <rect x="16" y="16" width="288" height="100" fill="#0B242C" />}
      <path d="M27 128H292" stroke="#E4D6B5" strokeOpacity=".4" />
    </>}
  </svg>;
}

export function DecorationExplorer({ decorations, activeId, onActiveChange }: {
  decorations: string[];
  activeId: string;
  onActiveChange: (value: string) => void;
}) {
  const { t } = useTranslation("tools");
  const [view, setView] = useState("front");
  const selected = DECORATIONS.filter((item) => decorations.includes(item));
  if (selected.length === 0) return null;
  const active = selected.find((item) => item === activeId) ?? selected[selected.length - 1];
  const key = (suffix: string) => environmentKey(`decor_${active}_${suffix}`);
  return <JourneyLesson title={t("journey-environment.decorExplore")} summary={t("journey-environment.decorExploreIntro")}
    sections={[
      { title: t("journey-environment.beforeAdding"), body: t(key("check")) },
      { title: t("journey-environment.careAfter"), body: t(key("care")) },
    ]}
    footer={<LessonSource label={t("journey-environment.sources")} sources={[SOURCES.decor, SOURCES.planting]} />}
  >
    <LessonChoices label={t("journey-environment.selectedDecorations")} value={active} onChange={onActiveChange}
      options={selected.map((id) => ({ id, label: t(environmentKey(`decor_${id}_title`)) }))} />
    <p className="aqv-environment-caption">{t(key("summary"))}</p>
    <LessonChoices label={t("journey-environment.viewDirection")} value={view} onChange={setView}
      options={[{ id: "front", label: t("journey-environment.frontView") }, { id: "top", label: t("journey-environment.topView") }]} />
    <DecorPlacement item={active} top={view === "top"} label={t(key("place"))} />
    <p className="aqv-environment-caption" aria-live="polite">{t(key("place"))}</p>
  </JourneyLesson>;
}

export function WaterSourceLesson({ source }: { source: string }) {
  const { t } = useTranslation("tools");
  const [step, setStep] = useState("check");
  if (!WATER_SOURCES.some((item) => item === source)) return null;
  const key = (suffix: string) => environmentKey(`water_${source}_${suffix}`);
  const sourceLinks = source === "tap" ? [SOURCES.chloramine, SOURCES.treatment]
    : source === "ro" ? [SOURCES.minerals, SOURCES.water] : [SOURCES.treatment, SOURCES.water];
  return <JourneyLesson title={t(key("title"))} summary={t(key("summary"))}
    sections={[{ title: t("journey-environment.commonMistake"), body: t(key("caution")) }]}
    footer={<LessonSource label={t("journey-environment.sources")} sources={sourceLinks} />}
  >
    <LessonChoices label={t("journey-environment.waterWalkthrough")} value={step} onChange={setStep}
      options={[
        { id: "check", label: t("journey-environment.waterStepCheck") },
        { id: "prepare", label: t("journey-environment.waterStepPrepare") },
        { id: "verify", label: t("journey-environment.waterStepVerify") },
      ]} />
    <div className="aqv-environment-water-step" aria-live="polite">
      <span className="aqv-environment-step-number" aria-hidden="true">{step === "check" ? "01" : step === "prepare" ? "02" : "03"}</span>
      <p>{t(key(step))}</p>
    </div>
  </JourneyLesson>;
}

export function WaterTestExplorer() {
  const { t } = useTranslation("tools");
  const [test, setTest] = useState("waste");
  return <JourneyLesson title={t("journey-environment.testsTitle")} summary={t("journey-environment.testsIntro")}
    sections={[{ title: t("journey-environment.testsKitTitle"), body: t("journey-environment.testsKitBody") }]}
    footer={<LessonSource label={t("journey-environment.sources")} sources={[SOURCES.water]} />}
  >
    <LessonChoices label={t("journey-environment.testsExplore")} value={test} onChange={setTest}
      options={[
        { id: "waste", label: t("journey-environment.testsWaste") },
        { id: "minerals", label: t("journey-environment.testsMinerals") },
        { id: "temperature", label: t("journey-environment.testsTemperature") },
      ]} />
    <p className="aqv-environment-caption" aria-live="polite">{t(environmentKey(`tests_${test}`))}</p>
  </JourneyLesson>;
}

export function CycleMethodLesson({ method }: { method: string }) {
  const { t } = useTranslation("tools");
  if (!CYCLING_METHODS.some((item) => item === method)) return null;
  const key = (suffix: string) => environmentKey(`cycle_${method}_${suffix}`);
  return <JourneyLesson title={t(key("title"))} summary={t(key("summary"))}
    sections={[
      { title: t("journey-environment.methodHow"), body: t(key("how")) },
      { title: t("journey-environment.methodCheck"), body: t(key("check")) },
    ]}
    footer={<LessonSource label={t("journey-environment.sources")} sources={[SOURCES.cycling, SOURCES.water]} />}
  />;
}

export function NitrogenExplorer() {
  const { t } = useTranslation("tools");
  const [stage, setStage] = useState("ammonia");
  return <JourneyLesson title={t("journey-environment.nitrogenTitle")} summary={t("journey-environment.nitrogenIntro")}
    sections={[{ title: t("journey-environment.cycleTimeTitle"), body: t("journey-environment.cycleTimeBody") }]}
    footer={<LessonSource label={t("journey-environment.sources")} sources={[SOURCES.water, SOURCES.cycling]} />}
  >
    <LessonChoices label={t("journey-environment.nitrogenExplore")} value={stage} onChange={setStage}
      options={[
        { id: "ammonia", label: t("journey-environment.ammonia") },
        { id: "nitrite", label: t("journey-environment.nitrite") },
        { id: "nitrate", label: t("journey-environment.nitrate") },
      ]} />
    <div className="aqv-environment-cycle" aria-hidden="true" dir="ltr">
      {[{ id: "ammonia", formula: "NH₃ / NH₄⁺" }, { id: "nitrite", formula: "NO₂⁻" }, { id: "nitrate", formula: "NO₃⁻" }].map((item, index) =>
        <div key={item.id} data-active={stage === item.id}>
          <span>{item.formula}</span>
          {index < 2 && <i>→</i>}
        </div>)}
    </div>
    <p className="aqv-environment-caption" aria-live="polite">{t(environmentKey(`stage_${stage}`))}</p>
  </JourneyLesson>;
}

const REVIEW_ITEMS = ["filter", "cycleEvidence", "species", "replacement"] as const;

function reading(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function WaterReadinessChecklist() {
  const { t } = useTranslation("tools");
  const id = useId();
  const [ammonia, setAmmonia] = useState("");
  const [nitrite, setNitrite] = useState("");
  const [checked, setChecked] = useState<string[]>([]);
  const ammoniaReading = reading(ammonia);
  const nitriteReading = reading(nitrite);
  const status = (ammoniaReading !== null && ammoniaReading > 0) || (nitriteReading !== null && nitriteReading > 0)
    ? "detected" : ammoniaReading === null || nitriteReading === null ? "missing" : "review";

  return <JourneyLesson title={t("journey-environment.readinessTitle")} summary={t("journey-environment.readinessIntro")}
    sections={[{ title: t("journey-environment.zeroNotProofTitle"), body: t("journey-environment.zeroNotProofBody") }]}
    footer={<LessonSource label={t("journey-environment.sources")} sources={[SOURCES.water, SOURCES.cycling]} />}
  >
    <div className="aqv-environment-readings">
      {[
        { key: "ammonia", value: ammonia, set: setAmmonia },
        { key: "nitrite", value: nitrite, set: setNitrite },
      ].map((field) => <div key={field.key}>
        <label htmlFor={`${id}-${field.key}`}>{t(environmentKey(`reading_${field.key}`))}</label>
        <input id={`${id}-${field.key}`} type="number" min="0" step="any" inputMode="decimal" dir="ltr"
          value={field.value} placeholder={t("journey-environment.notMeasured")}
          onChange={(event) => field.set(event.target.value)}
          aria-invalid={field.value !== "" && reading(field.value) === null}
          aria-describedby={`${id}-readings-note ${id}-status`} />
      </div>)}
    </div>
    <p id={`${id}-readings-note`} className="aqv-environment-caption">{t("journey-environment.readingsNote")}</p>
    <div id={`${id}-status`} className="aqv-environment-reading-status" data-status={status} role="status" aria-atomic="true">
      {t(environmentKey(`readings_${status}`))}
    </div>
    <fieldset className="aqv-environment-review">
      <legend>{t("journey-environment.reviewLegend")}</legend>
      {REVIEW_ITEMS.map((item) => <label key={item} htmlFor={`${id}-review-${item}`}>
        <input id={`${id}-review-${item}`} type="checkbox" checked={checked.includes(item)}
          onChange={(event) => setChecked((previous) => event.target.checked ? [...previous, item] : previous.filter((value) => value !== item))} />
        <span>{t(environmentKey(`review_${item}`))}</span>
      </label>)}
    </fieldset>
    <p className="aqv-environment-caption" aria-live="polite">
      {t("journey-environment.reviewCount", { count: checked.length, total: REVIEW_ITEMS.length })}
      {" "}{t("journey-environment.reviewScope")}
    </p>
  </JourneyLesson>;
}
