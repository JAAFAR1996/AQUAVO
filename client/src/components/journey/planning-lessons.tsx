import { useId, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { ParseKeys, TFunction } from "i18next";
import type { WizardData } from "@/types/journey";
import { JourneyLesson, LessonChoices, LessonSource } from "./journey-lesson";
import "./planning-lessons.css";

const PREFIX = "journey-planning";
const SIZE_CHOICES = ["small", "medium", "large", "xlarge"] as const;
const TYPE_CHOICES = ["freshwater-community", "planted", "species-specific"] as const;
const ZONES = ["swimming", "shelter", "plants"] as const;
const FILTER_CHOICES = ["hob", "canister", "sponge", "internal", "unknown"] as const;
const LIGHT_CHOICES = ["basic-led", "planted-led", "rgb-smart", "none"] as const;
export type LocationChoice = "away-from-sunlight" | "stable-surface" | "near-power" | "quiet-area" | "easy-access" | "away-from-hvac";
const SOURCES = {
    setup: { label: "Aqueon · Aquarium setup", href: "https://www.aqueon.com/articles/setting-up-freshwater-aquarium" },
    environment: { label: "RSPCA · Aquarium environment", href: "https://www.rspca.org.uk/adviceandwelfare/pets/fish/environment" },
    company: { label: "RSPCA · Fish compatibility", href: "https://www.rspca.org.uk/adviceandwelfare/pets/fish/company" },
    filter: { label: "Aqueon · Filtration", href: "https://www.aqueon.com/articles/filtration" },
    filterBasics: { label: "Aqueon · Filtration basics", href: "https://www.aqueon.com/articles/aquarium-filtration-basics" },
    heater: { label: "Aqueon · Heater placement and checks", href: "https://www.aqueon.com/articles/fish-tank-heater-tips-for-cold-weather" },
    planted: { label: "OATA · Planted aquariums", href: "https://ornamentalfish.org/what-we-do/advice-information/care-sheets/caresheets-tropical-freshwater-fish/how-to-set-up-a-planted-aquarium/" },
    light: { label: "Tropica · Starting a planted aquarium", href: "https://tropica.com/en/guide/get-the-right-start/growing-in/" },
};

function lessonSections(t: TFunction<"tools">, path: string) {
    return (["fit", "setup", "watch"] as const).map((key) => ({
        title: t(`${PREFIX}.common.${key}`),
        body: <p>{t(`${PREFIX}.${path}.${key}` as ParseKeys<"tools">)}</p>,
    }));
}

function Sources({ names }: { names: ReadonlyArray<keyof typeof SOURCES> }) {
    const { t } = useTranslation("tools");
    return <LessonSource label={t(`${PREFIX}.common.sources`)} sources={names.map((name) => SOURCES[name])} />;
}

/** This slider explores water depth only. It never updates the saved tank dimensions or litres. */
export function TankSizeLesson({ data }: { data: WizardData }) {
    const { t } = useTranslation("tools");
    const inputId = useId();
    const [fillPercent, setFillPercent] = useState(85);
    const hasDimensions = Boolean(data.tankLengthCm && data.tankWidthCm && data.tankHeightCm);
    const capacityOnly = !hasDimensions && data.tankLiters > 0;
    const length = hasDimensions ? data.tankLengthCm! : 60;
    const width = hasDimensions ? data.tankWidthCm! : 35;
    const height = hasDimensions ? data.tankHeightCm! : 40;
    const depth = Math.round(height * fillPercent / 100 * 10) / 10;
    const waterLitres = Math.round((capacityOnly ? data.tankLiters * fillPercent / 100 : length * width * depth / 1000) * 10) / 10;
    const fillLabel = capacityOnly ? t(`${PREFIX}.volume.percent`, { percent: fillPercent }) : t(`${PREFIX}.volume.depth`, { depth });
    const choice = SIZE_CHOICES.find((value) => value === data.tankSize) ?? "unselected";
    return <JourneyLesson title={t(`${PREFIX}.size.title`)} summary={t(`${PREFIX}.size.${choice}.summary`)}
        sections={lessonSections(t, `size.${choice}`)} footer={<Sources names={["environment"]} />}>
        <div className="aqv-plan-volume-demo">
            <div className="aqv-plan-volume-tank" aria-hidden="true">
                <div className="aqv-plan-volume-water" style={{ blockSize: `${fillPercent}%` }} />
                <div className="aqv-plan-volume-line" style={{ insetBlockEnd: `${fillPercent}%` }} />
            </div>
            <div>
                <p className="aqv-plan-kicker">{capacityOnly
                    ? t(`${PREFIX}.volume.referenceCapacity`, { litres: data.tankLiters })
                    : t(`${PREFIX}.volume.${hasDimensions ? "yourDimensions" : "exampleDimensions"}`, { length, width, height })}</p>
                <label htmlFor={inputId}>{fillLabel}</label>
                <input id={inputId} type="range" min={25} max={100} step={1} value={fillPercent}
                    aria-valuetext={fillLabel}
                    onChange={(event) => setFillPercent(Number(event.target.value))} />
                <output className="aqv-lesson-readout aqv-plan-output" htmlFor={inputId} aria-live="polite">
                    {t(`${PREFIX}.volume.result`, { litres: waterLitres })}
                </output>
            </div>
        </div>
        <p className="aqv-lesson-caption">{t(`${PREFIX}.volume.note`)}</p>
    </JourneyLesson>;
}

export function TankTypeLesson({ tankType }: { tankType: string }) {
    const { t } = useTranslation("tools");
    const [zone, setZone] = useState<typeof ZONES[number]>("swimming");
    const choice = TYPE_CHOICES.find((value) => value === tankType) ?? "unselected";
    return <JourneyLesson title={t(`${PREFIX}.type.title`)} summary={t(`${PREFIX}.type.${choice}.summary`)}
        sections={lessonSections(t, `type.${choice}`)} footer={<Sources names={["company", "planted"]} />}>
        <LessonChoices label={t(`${PREFIX}.zones.label`)} value={zone} onChange={(value) => setZone(ZONES.find((zone) => zone === value) ?? "swimming")}
            options={ZONES.map((id) => ({ id, label: t(`${PREFIX}.zones.${id}.label`) }))} />
        <svg className="aqv-plan-zones" viewBox="0 0 360 150" role="img" aria-label={t(`${PREFIX}.zones.${zone}.image`)}>
            <rect x="15" y="12" width="330" height="125" rx="8" fill="#dceeed" stroke="#7aa4a8" strokeWidth="2" />
            <path d="M18 117 Q90 98 150 118 T342 114 V134 H18Z" fill="#cbbd9e" />
            <g fill="none" stroke={zone === "plants" ? "#177552" : "#8aa79a"} strokeWidth={zone === "plants" ? 7 : 4} strokeLinecap="round">
                <path d="M45 116 Q35 80 48 38 M45 90 Q24 75 30 56 M47 72 Q68 57 64 37 M310 115 Q324 83 313 35 M316 86 Q335 69 331 54" />
            </g>
            <path d="M204 119 Q214 72 256 87 L279 119Z" fill={zone === "shelter" ? "#526e77" : "#9ba9aa"} />
            <path d="M227 120 Q227 98 242 98 Q258 99 260 120Z" fill="#e2f0ed" />
            <path d="M87 61 H265 M251 52 L266 61 L251 70" fill="none" stroke={zone === "swimming" ? "#0b93a6" : "#b1cccc"} strokeWidth={zone === "swimming" ? 5 : 3} strokeLinecap="round" />
        </svg>
        <p className="aqv-lesson-readout" aria-live="polite">{t(`${PREFIX}.zones.${zone}.body`)}</p>
        <p className="aqv-lesson-caption">{t(`${PREFIX}.zones.note`)}</p>
    </JourneyLesson>;
}

export function LocationLesson({ choice, tankLitres, checkedCount }: { choice: LocationChoice; tankLitres: number; checkedCount: number }) {
    const { t } = useTranslation("tools");
    const [example, setExample] = useState<"problem" | "improved">("problem");
    const [dryWeight, setDryWeight] = useState("");
    const weightId = useId();
    const waterMass = Math.round(Math.max(0, tankLitres) * 10) / 10;
    const hasDryWeight = dryWeight.trim() !== "";
    const totalMass = Math.round((waterMass + Number(dryWeight || 0)) * 10) / 10;
    const corrected = example === "improved";
    return <JourneyLesson title={t(`${PREFIX}.location.${choice}.title`)} summary={t(`${PREFIX}.location.${choice}.summary`)}
        sections={lessonSections(t, `location.${choice}`)} footer={<Sources names={["setup", "environment"]} />}>
        <p className="aqv-plan-kicker">{t(`${PREFIX}.location.checked`, { count: checkedCount })}</p>
        <LessonChoices label={t(`${PREFIX}.location.exampleLabel`)} value={example} onChange={(value) => setExample(value === "improved" ? value : "problem")}
            options={(["problem", "improved"] as const).map((id) => ({ id, label: t(`${PREFIX}.location.${id}`) }))} />
        <svg className="aqv-plan-room" viewBox="0 0 360 170" role="img" aria-label={t(`${PREFIX}.location.${choice}.${example}`)}>
            <rect x="4" y="4" width="352" height="162" rx="10" fill="#f0f2ef" />
            <path d="M15 142 H345" stroke="#adc0bc" strokeWidth="2" />
            <g opacity={choice === "away-from-sunlight" ? 1 : .45}>
                <rect x="20" y="20" width="58" height="60" rx="3" fill={corrected ? "#d1dddd" : "#f8d389"} stroke="#7d999d" strokeWidth="3" />
                <path d="M49 20 V80 M20 50 H78" stroke="#7d999d" strokeWidth="3" />
                {choice === "away-from-sunlight" && !corrected && <path d="M78 26 L200 92 H120 L78 64Z" fill="#f4c15a" opacity=".35" />}
            </g>
            <g transform={choice === "stable-surface" && !corrected ? "rotate(-4 180 120)" : undefined}>
                <rect x="116" y="98" width="135" height="10" rx="2" fill={choice === "stable-surface" ? "#0b93a6" : "#799393"} />
                <path d="M125 108 V142 M241 108 V142" stroke="#526e77" strokeWidth="8" />
                <rect x="122" y="42" width="123" height="55" rx="3" fill="#c2e5e4" stroke="#5c8d95" strokeWidth="3" />
                <path d="M124 52 H243" stroke="#65b3bf" strokeWidth="2" />
            </g>
            <g opacity={choice === "near-power" ? 1 : .4} fill="none" stroke="#59747c" strokeWidth="3">
                <rect x="301" y="74" width="20" height="27" rx="3" fill="#fff" />
                <path d={corrected ? "M245 72 H273 V119 Q280 131 287 119 V87 H301" : "M245 72 L301 87"} />
            </g>
            <g opacity={choice === "away-from-hvac" ? 1 : .35}>
                <rect x="275" y="17" width="57" height="18" rx="4" fill="#abbcc1" />
                {choice === "away-from-hvac" && !corrected && <path d="M283 37 Q280 63 247 60 M296 37 Q294 75 247 73" fill="none" stroke="#5ba3bf" strokeWidth="3" strokeDasharray="5 4" />}
            </g>
            {choice === "easy-access" && <path d={corrected ? "M103 38 V96 M97 46 L103 38 L109 46 M97 88 L103 96 L109 88" : "M106 35 H254 V39 H106Z"} fill="none" stroke={corrected ? "#0b93a6" : "#c28b3d"} strokeWidth="4" />}
            {choice === "quiet-area" && !corrected && <path d="M87 112 Q100 99 88 86 M75 121 Q96 99 75 77" fill="none" stroke="#c28b3d" strokeWidth="4" />}
        </svg>
        <p className="aqv-lesson-readout" aria-live="polite">{t(`${PREFIX}.location.${choice}.${example}`)}</p>
        <div className="aqv-plan-weight">
            <h5>{t(`${PREFIX}.weight.title`)}</h5>
            <p>{waterMass > 0 ? t(`${PREFIX}.weight.water`, { litres: tankLitres, kg: waterMass }) : t(`${PREFIX}.weight.noVolume`)}</p>
            <label htmlFor={weightId}>{t(`${PREFIX}.weight.dryLabel`)}</label>
            <input id={weightId} type="number" min={0} max={10000} step="0.1" inputMode="decimal" value={dryWeight}
                onChange={(event) => {
                    const value = event.target.value;
                    if (value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 10000)) setDryWeight(value);
                }} placeholder={t(`${PREFIX}.weight.unknown`)} />
            {hasDryWeight && waterMass > 0 && <output className="aqv-plan-output" htmlFor={weightId} aria-live="polite">{t(`${PREFIX}.weight.total`, { kg: totalMass })}</output>}
            <p className="aqv-lesson-caption">{t(`${PREFIX}.weight.note`)}</p>
        </div>
    </JourneyLesson>;
}

const FILTER_STAGES = ["intake", "mechanical", "biological", "return"] as const;
export function FilterLesson({ filterType }: { filterType: string }) {
    const { t } = useTranslation("tools");
    const [stage, setStage] = useState<typeof FILTER_STAGES[number]>("intake");
    const choice = FILTER_CHOICES.find((value) => value === filterType) ?? "unknown";
    const activeIndex = FILTER_STAGES.findIndex((value) => value === stage);
    return <JourneyLesson title={t(`${PREFIX}.filter.title`)} summary={t(`${PREFIX}.filter.${choice}.summary`)}
        sections={lessonSections(t, `filter.${choice}`)} footer={<Sources names={["filter", "filterBasics"]} />}>
        <svg className="aqv-plan-filter" viewBox="0 0 360 160" role="img" aria-label={t(`${PREFIX}.filter.${choice}.image`)}>
            <rect x="45" y="20" width="235" height="109" rx="6" fill="#dceeed" stroke="#7aa4a8" strokeWidth="2" />
            <path d="M48 37 H277" stroke="#67b8bf" strokeWidth="2" />
            {choice === "hob" && <>
                <rect x="238" y="9" width="65" height="54" rx="6" fill="#546f7b" />
                <path d="M214 98 V20 H260 V48 H239" fill="none" stroke="#0b93a6" strokeWidth="7" />
            </>}
            {choice === "canister" && <>
                <rect x="298" y="87" width="45" height="62" rx="9" fill="#546f7b" />
                <path d="M245 104 V13 H311 V87 M332 87 V6 H270 V50" fill="none" stroke="#0b93a6" strokeWidth="5" />
            </>}
            {choice === "sponge" && <>
                <rect x="94" y="76" width="72" height="43" rx="9" fill="#526f66" />
                <path d="M130 89 V41" fill="none" stroke="#4e7b87" strokeWidth="10" />
                <path d="M155 84 V12 H197" fill="none" stroke="#84aeb2" strokeWidth="3" />
                <g fill="#7cbac4"><circle cx="130" cy="30" r="4" /><circle cx="122" cy="21" r="3" /><circle cx="135" cy="14" r="3" /></g>
            </>}
            {choice === "internal" && <>
                <rect x="232" y="46" width="35" height="68" rx="6" fill="#546f7b" />
                <path d="M238 54 H212" fill="none" stroke="#0b93a6" strokeWidth="7" />
            </>}
            {choice === "unknown" && <rect x="224" y="53" width="39" height="62" rx="7" fill="#8aa5a7" stroke="#557d83" strokeDasharray="4 4" />}
            <g fill="none" stroke="#0b93a6" strokeWidth="3" strokeLinecap="round" opacity={stage === "return" ? 1 : .35}>
                <path d="M188 53 H91 M104 45 L91 53 L104 61 M89 66 V97 H194 M183 89 L195 97 L183 105" />
            </g>
            <g fill="#c49b64" opacity={stage === "intake" || stage === "mechanical" ? 1 : .3}>
                <circle cx="183" cy="101" r="3" /><circle cx="202" cy="90" r="2" /><circle cx="174" cy="83" r="2" />
            </g>
        </svg>
        <LessonChoices label={t(`${PREFIX}.flow.label`)} value={stage} onChange={(value) => setStage(FILTER_STAGES.find((stage) => stage === value) ?? "intake")}
            options={FILTER_STAGES.map((id, index) => ({ id, label: `${index + 1}. ${t(`${PREFIX}.flow.${id}.label`)}` }))} />
        <div className="aqv-plan-media" aria-hidden="true" data-stage={stage}>
            {FILTER_STAGES.map((id, index) => <span key={id} className={index === activeIndex ? "is-current" : ""}>
                {id === "mechanical" ? <span className="aqv-plan-foam" /> : id === "biological" ? <span className="aqv-plan-rings"><i /><i /><i /></span> : <span className="aqv-plan-droplet" />}
            </span>)}
        </div>
        <p className="aqv-lesson-readout" aria-live="polite">{t(`${PREFIX}.flow.${stage}.body`)}</p>
        <button className="aqv-plan-next" type="button" onClick={() => setStage(FILTER_STAGES[(activeIndex + 1) % FILTER_STAGES.length])}>{t(`${PREFIX}.flow.next`)}</button>
        <p className="aqv-lesson-caption">{t(`${PREFIX}.flow.note`)}</p>
    </JourneyLesson>;
}

export function HeaterLesson({ wattage }: { wattage: number }) {
    const { t } = useTranslation("tools");
    const [room, setRoom] = useState(20);
    const [target, setTarget] = useState(25);
    const id = useId();
    const delta = target - room;
    return <JourneyLesson title={t(`${PREFIX}.heater.title`)}
        summary={t(`${PREFIX}.heater.${wattage > 0 ? "selected" : "unknown"}`, { watts: wattage })}
        sections={lessonSections(t, "heater")} footer={<Sources names={["environment", "heater"]} />}>
        <p className="aqv-plan-kicker">{t(`${PREFIX}.heater.demo`)}</p>
        <div className="aqv-plan-temperature">
            <div>
                <label htmlFor={`${id}-room`}>{t(`${PREFIX}.heater.room`, { temperature: room })}</label>
                <input id={`${id}-room`} type="range" min={10} max={35} step={1} value={room}
                    aria-valuetext={`${room} °C`} onChange={(event) => setRoom(Number(event.target.value))} />
            </div>
            <div>
                <label htmlFor={`${id}-target`}>{t(`${PREFIX}.heater.target`, { temperature: target })}</label>
                <input id={`${id}-target`} type="range" min={15} max={32} step={1} value={target}
                    aria-valuetext={`${target} °C`} onChange={(event) => setTarget(Number(event.target.value))} />
            </div>
        </div>
        <div className="aqv-plan-temperature-scale" aria-hidden="true">
            <span style={{ insetInlineStart: `${(room - 10) * 4}%` }} />
            <i style={{ insetInlineStart: `${(target - 10) * 4}%` }} />
        </div>
        <output className="aqv-lesson-readout aqv-plan-output" htmlFor={`${id}-room ${id}-target`} aria-live="polite">
            {delta > 0 ? t(`${PREFIX}.heater.warmer`, { delta }) : delta < 0 ? t(`${PREFIX}.heater.cooling`) : t(`${PREFIX}.heater.equal`)}
        </output>
        <p className="aqv-lesson-caption">{t(`${PREFIX}.heater.note`)}</p>
    </JourneyLesson>;
}

export function LightingLesson({ lightingType }: { lightingType: string }) {
    const { t } = useTranslation("tools");
    const [brightness, setBrightness] = useState(60);
    const [hours, setHours] = useState(8);
    const [period, setPeriod] = useState<"day" | "night">("day");
    const inputId = useId();
    const choice = LIGHT_CHOICES.find((value) => value === lightingType) ?? "unselected";
    const hasFixture = choice !== "none" && choice !== "unselected";
    const illuminated = hasFixture && period === "day";
    const sceneStyle: CSSProperties = { opacity: illuminated ? .2 + brightness / 125 : .15 };
    return <JourneyLesson title={t(`${PREFIX}.light.title`)} summary={t(`${PREFIX}.light.${choice}.summary`)}
        sections={lessonSections(t, `light.${choice}`)} footer={<Sources names={["environment", "planted", "light"]} />}>
        <LessonChoices label={t(`${PREFIX}.light.previewLabel`)} value={period} onChange={(value) => setPeriod(value === "night" ? value : "day")}
            options={(["day", "night"] as const).map((id) => ({ id, label: t(`${PREFIX}.light.${id}`) }))} />
        <div className="aqv-plan-light-scene" role="img" aria-label={t(`${PREFIX}.light.${illuminated ? "onImage" : "offImage"}`)}>
            <div className="aqv-plan-light-beam" style={sceneStyle} />
            <svg viewBox="0 0 360 120" aria-hidden="true" style={sceneStyle}>
                <path d="M0 102 Q93 85 174 103 T360 98 V120 H0Z" fill="#b8ab8b" />
                <g fill="none" stroke="#4ba67d" strokeWidth="7" strokeLinecap="round">
                    <path d="M45 105 Q32 68 45 28 M45 75 Q23 65 30 45 M45 58 Q64 43 62 25 M310 105 Q324 72 310 34 M314 77 Q332 65 330 49" />
                </g>
                <path d="M210 107 L234 75 L255 80 L272 107Z" fill="#7b8e89" />
            </svg>
        </div>
        <label htmlFor={`${inputId}-brightness`}>{t(`${PREFIX}.light.brightness`, { percent: brightness })}</label>
        <input id={`${inputId}-brightness`} type="range" min={10} max={100} step={5} value={brightness}
            disabled={!hasFixture} aria-valuetext={`${brightness}%`} onChange={(event) => setBrightness(Number(event.target.value))} />
        {!hasFixture && <p className="aqv-lesson-caption">{t(`${PREFIX}.light.noFixture`)}</p>}
        <label htmlFor={`${inputId}-hours`}>{t(`${PREFIX}.light.hours`, { hours })}</label>
        <input id={`${inputId}-hours`} type="range" min={4} max={12} step={1} value={hours}
            aria-valuetext={t(`${PREFIX}.light.hours`, { hours })} onChange={(event) => setHours(Number(event.target.value))} />
        <div className="aqv-plan-day-cycle" aria-hidden="true" dir="ltr">
            {Array.from({ length: 24 }, (_, hour) => <span key={hour} className={hour >= 10 && hour < 10 + hours ? "is-lit" : ""} />)}
        </div>
        <output className="aqv-lesson-readout aqv-plan-output" htmlFor={`${inputId}-hours`} aria-live="polite">
            {t(`${PREFIX}.light.cycle`, { hours, dark: 24 - hours, end: `${10 + hours}:00` })}
        </output>
        <p className="aqv-lesson-caption">{t(`${PREFIX}.light.note`)}</p>
    </JourneyLesson>;
}
