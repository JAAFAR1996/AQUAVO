import { useId, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft, ChevronRight, Fish, Ruler, Thermometer, Users } from "lucide-react";
import type { WizardData } from "@/types/journey";
import { JourneyLesson, LessonChoices, LessonSource } from "./journey-lesson";
import { speciesDisplayName, type FishCategory, type FishSpeciesInfo } from "./fish-species-data";
import "./care-lessons.css";

const CARE_SOURCES = {
    company: { label: "RSPCA — Keeping fish together", href: "https://www.rspca.org.uk/adviceandwelfare/pets/fish/company" },
    maintenance: { label: "Aqueon — Aquarium cleaning checklist", href: "https://www.aqueon.com/articles/aquarium-cleaning-checklist" },
    heater: { label: "Aqueon — Aquarium heater safety", href: "https://www.aqueon.com/articles/fish-tank-heater-tips-for-cold-weather" },
    guides: { label: "OATA — Species care sheets", href: "https://ornamentalfish.org/what-we-do/advice-information/care-sheets/" },
} as const;

const CATEGORY_SOURCES: Record<string, { label: string; href: string }> = {
    community: { label: "Aqueon — Livebearers", href: "https://www.aqueon.com/resources/care-guides/livebearer" },
    schooling: { label: "Aqueon — Tetras", href: "https://www.aqueon.com/resources/care-guides/tetras" },
    cichlids: { label: "OATA — American cichlids", href: "https://ornamentalfish.org/what-we-do/advice-information/care-sheets/caresheets-tropical-freshwater-fish/how-to-look-after-american-cichlids/" },
    "shrimp-snails": { label: "OATA — Freshwater shrimp and snails", href: "https://ornamentalfish.org/what-we-do/advice-information/care-sheets/caresheets-tropical-freshwater-invertebrates/how-to-look-after-freshwater-shrimp-and-snails/" },
};

type FishGroupId = "community" | "cichlids" | "bottom-dwellers" | "schooling" | "centerpiece" | "goldfish" | "shrimp-snails";
type ProfileTopic = "space" | "water" | "food";
type GroupTopic = "space" | "social" | "food";
type WaterChangeStage = "before" | "remove" | "refill";

const GROUP_ZONES: Record<string, string[]> = {
    community: ["top", "middle"], cichlids: ["top", "middle", "bottom"],
    "bottom-dwellers": ["bottom"], schooling: ["middle"], centerpiece: ["top", "middle"],
    goldfish: ["top", "middle", "bottom"], "shrimp-snails": ["bottom"],
};

export function FishGroupLesson({ category }: { category: FishCategory }) {
    const { t } = useTranslation("tools");
    const [topic, setTopic] = useState<GroupTopic>("space");
    const groupId = category.id as FishGroupId;
    return <JourneyLesson
        title={t("journey-care.group.title")}
        summary={t(`journey-care.groups.${groupId}.summary`)}
        sections={[{ title: t("journey-care.group.limitTitle"), body: <p>{t("journey-care.group.limit")}</p> }]}
        footer={<LessonSource label={t("journey-care.sources")} sources={[CATEGORY_SOURCES[category.id] || CARE_SOURCES.guides, CARE_SOURCES.company]} />}
    >
        <LessonChoices label={t("journey-care.group.topics")} value={topic} onChange={(value) => setTopic(value as GroupTopic)}
            options={(["space", "social", "food"] as const).map((id) => ({ id, label: t(`journey-care.topics.${id}`) }))} />
        {topic === "space" && <div className="aqv-care-water-column" aria-hidden="true">
            {(["top", "middle", "bottom"] as const).map((zone) => <div key={zone} data-active={GROUP_ZONES[category.id]?.includes(zone)}>
                <span>{t(`journey-care.zones.${zone}`)}</span><Fish size={19} />
            </div>)}
        </div>}
        <p className="aqv-lesson-readout" aria-live="polite">{t(`journey-care.groups.${groupId}.${topic}`)}</p>
        {topic === "space" && <p className="aqv-lesson-caption">{t("journey-care.group.zoneNote")}</p>}
    </JourneyLesson>;
}

export function SpeciesCareLesson({ species, tankLiters, tankLengthCm }: {
    species: FishSpeciesInfo;
    tankLiters: number;
    tankLengthCm?: number;
}) {
    const { t, i18n } = useTranslation("tools");
    const [topic, setTopic] = useState<ProfileTopic>("space");
    const groupId = species.category as FishGroupId;
    const speciesKey = `journey-fish-guide.species.${species.id}`;
    const knownLength = Number.isFinite(tankLengthCm) && Number(tankLengthCm) > 0;
    const fishFraction = knownLength ? Math.min(100, species.maxSizeCm / Number(tankLengthCm) * 100) : 45;
    const tooSmall = tankLiters > 0 && tankLiters < species.tankMinLiters;
    const groupText = species.schooling && species.minGroupSize
        ? t("journey-care.species.groupSize", { count: species.minGroupSize })
        : t("journey-care.species.socialReview");
    return <JourneyLesson
        title={t("journey-care.species.title", { name: speciesDisplayName(species, i18n.language) })}
        summary={t("journey-care.species.intro")}
        sections={[
            { title: t("journey-care.species.compatibilityTitle"), body: <><p>{t(`${speciesKey}.compatibility`, { defaultValue: species.compatibilityNotes })}</p><p>{t("journey-care.species.compatibilityNote")}</p></> },
            { title: t("journey-care.species.valuesTitle"), body: <p>{t("journey-care.species.valuesNote")}</p> },
        ]}
        footer={<LessonSource label={t("journey-care.sources")} sources={[CATEGORY_SOURCES[species.category] || CARE_SOURCES.guides, CARE_SOURCES.company]} />}
    >
        <LessonChoices label={t("journey-care.species.topics")} value={topic} onChange={(value) => setTopic(value as ProfileTopic)}
            options={(["space", "water", "food"] as const).map((id) => ({ id, label: t(`journey-care.topics.${id}`) }))} />
        <div aria-live="polite" className="aqv-care-profile">
            {topic === "space" && <>
                {knownLength && species.maxSizeCm <= Number(tankLengthCm) && <div className="aqv-care-size-demo" aria-hidden="true" style={{ "--fish-width": `${fishFraction}%` } as CSSProperties}><span><Fish /></span></div>}
                <dl className="aqv-care-facts">
                    <div><dt><Ruler size={16} aria-hidden="true" />{t("journey-care.species.adultSize")}</dt><dd>{t("journey-care.species.cm", { value: species.maxSizeCm })}</dd></div>
                    <div><dt>{t("journey-care.species.recordedSpace")}</dt><dd>{t("journey-care.species.liters", { value: species.tankMinLiters })}</dd></div>
                    <div><dt><Users size={16} aria-hidden="true" />{t("journey-care.species.group")}</dt><dd>{groupText}</dd></div>
                </dl>
                {knownLength && <p className="aqv-lesson-caption">{t("journey-care.species.lengthComparison", { value: tankLengthCm })}</p>}
                <p className="aqv-lesson-readout" data-warning={tooSmall || undefined}>
                    {t(tankLiters <= 0 ? "journey-care.species.noVolume" : tooSmall ? "journey-care.species.belowVolume" : "journey-care.species.volumeNeedsReview", { value: tankLiters, guide: species.tankMinLiters })}
                </p>
            </>}
            {topic === "water" && <>
                <dl className="aqv-care-facts">
                    <div><dt><Thermometer size={16} aria-hidden="true" />{t("journey-care.species.temperature")}</dt><dd><bdi dir="ltr">{species.temperatureRange}</bdi></dd></div>
                    <div><dt>{t("journey-care.species.ph")}</dt><dd><bdi dir="ltr">{species.phRange}</bdi></dd></div>
                </dl>
                <p className="aqv-lesson-readout">{t("journey-care.species.waterNote")}</p>
            </>}
            {topic === "food" && <>
                <div className="aqv-care-food-tags">{species.feedingInfo.foodTypes.map((food) => <span key={food}>{t(`journey-labels.foodTypes.${food}`)}</span>)}</div>
                <p className="aqv-lesson-readout">{t(`journey-care.groups.${groupId}.food`)}</p>
                <p className="aqv-lesson-caption">{t("journey-care.species.foodNote")}</p>
            </>}
        </div>
    </JourneyLesson>;
}

export function StockingCareLesson({ value }: { value: string }) {
    const { t } = useTranslation("tools");
    if (!["light", "moderate", "heavy"].includes(value)) return null;
    const choice = value as "light" | "moderate" | "heavy";
    const level = ["light", "moderate", "heavy"].indexOf(choice);
    return <JourneyLesson title={t(`journey-care.stocking.${choice}.title`)} summary={t(`journey-care.stocking.${choice}.summary`)}
        sections={[{ title: t("journey-care.stocking.actionTitle"), body: <p>{t(`journey-care.stocking.${choice}.action`)}</p> }]}
        footer={<p>{t("journey-care.stocking.scope")}</p>}>
        <div className="aqv-care-load" aria-hidden="true">{[0, 1, 2].map((index) => <i key={index} data-active={index <= level} />)}</div>
        <p className="aqv-lesson-caption">{t("journey-care.stocking.loadLabel")}</p>
    </JourneyLesson>;
}

/** A calculation only; a percentage is never a prescription for an untested tank. */
export function waterChangeLiters(volume: number, percentage: number): number | null {
    if (!Number.isFinite(volume) || volume <= 0 || volume > 2000 || !Number.isFinite(percentage) || percentage < 5 || percentage > 50) return null;
    return Math.round(volume * percentage) / 100;
}

export function WaterChangeLesson({ tankLiters }: { tankLiters: number }) {
    const { t } = useTranslation("tools");
    const uid = useId();
    const [percentage, setPercentage] = useState(25);
    const [actualVolume, setActualVolume] = useState("");
    const [stage, setStage] = useState<WaterChangeStage>("remove");
    const volume = actualVolume.trim() ? Number(actualVolume) : tankLiters;
    const amount = waterChangeLiters(volume, percentage);
    const remaining = stage === "remove" ? 100 - percentage : 100;
    const display = (value: number) => Number(value.toFixed(2)).toString();
    return <JourneyLesson title={t("journey-care.change.title")} summary={t("journey-care.change.summary")}
        sections={[{ title: t("journey-care.change.chooseTitle"), body: <p>{t("journey-care.change.chooseBody")}</p> }]}
        footer={<LessonSource label={t("journey-care.sources")} sources={[CARE_SOURCES.maintenance]} />}>
        <div className="aqv-care-change-controls">
            <label htmlFor={`${uid}-volume`}>{t("journey-care.change.actualVolume")}</label>
            <input id={`${uid}-volume`} inputMode="decimal" type="number" min="1" max="2000" step="any" value={actualVolume} onChange={(event) => setActualVolume(event.target.value)} placeholder={tankLiters > 0 ? String(tankLiters) : ""} aria-describedby={`${uid}-volume-note`} />
            <p id={`${uid}-volume-note`} className="aqv-lesson-caption">{t(actualVolume.trim() ? "journey-care.change.actualNote" : "journey-care.change.estimateNote", { value: tankLiters })}</p>
            <label htmlFor={`${uid}-percentage`}>{t("journey-care.change.percentage", { value: percentage })}</label>
            <input id={`${uid}-percentage`} type="range" min="5" max="50" step="5" value={percentage} onChange={(event) => setPercentage(Number(event.target.value))} />
        </div>
        <LessonChoices label={t("journey-care.change.demoStage")} value={stage} onChange={(value) => setStage(value as WaterChangeStage)}
            options={(["before", "remove", "refill"] as const).map((id) => ({ id, label: t(`journey-care.change.${id}`) }))} />
        <div className="aqv-care-change-visual" aria-hidden="true">
            <div className="aqv-care-mini-tank"><span style={{ height: `${remaining * .8}%` }} /><i /></div>
            <div className="aqv-care-change-arrow">{stage === "refill" ? "←" : "→"}</div>
            <div className="aqv-care-bucket"><span style={{ height: stage === "remove" ? `${percentage * 1.4}%` : "0%" }} /></div>
        </div>
        <div className="aqv-lesson-readout" role="status">
            {amount === null ? t("journey-care.change.enterVolume") : <>
                <strong>{t("journey-care.change.amount", { value: display(amount) })}</strong>
                <p>{t(`journey-care.change.result.${stage}`, { volume: display(volume), amount: display(amount), percentage })}</p>
            </>}
        </div>
        <p className="aqv-lesson-caption">{t("journey-care.change.scope")}</p>
    </JourneyLesson>;
}

const MAINTENANCE_TASKS = ["prepare", "power", "siphon", "filter", "refill"] as const;

export function MaintenanceWalkthrough() {
    const { t } = useTranslation("tools");
    const [step, setStep] = useState(0);
    const [checked, setChecked] = useState<string[]>([]);
    const key = MAINTENANCE_TASKS[step];
    const finished = checked.includes(key);
    return <JourneyLesson title={t("journey-care.walkthrough.title")} summary={t("journey-care.walkthrough.summary")}
        footer={<><p>{t("journey-care.walkthrough.scope")}</p><LessonSource label={t("journey-care.sources")} sources={[CARE_SOURCES.maintenance, CARE_SOURCES.heater]} /></>}>
        <div className="aqv-care-task-nav" role="group" aria-label={t("journey-care.walkthrough.steps")}>
            {MAINTENANCE_TASKS.map((task, index) => <button type="button" key={task} aria-pressed={step === index}
                aria-label={t(`journey-care.tasks.${task}.title`)} onClick={() => setStep(index)}>
                {checked.includes(task) ? <Check size={16} aria-hidden="true" /> : index + 1}
            </button>)}
        </div>
        <div className="aqv-care-task-content" aria-live="polite">
            <h5>{t(`journey-care.tasks.${key}.title`)}</h5>
            <p>{t(`journey-care.tasks.${key}.body`)}</p>
            <p className="aqv-lesson-caption">{t(`journey-care.tasks.${key}.check`)}</p>
        </div>
        <label className="aqv-care-check"><input type="checkbox" checked={finished} onChange={() => setChecked((items) => finished ? items.filter((item) => item !== key) : [...items, key])} />{t("journey-care.walkthrough.understood")}</label>
        <div className="aqv-care-task-actions">
            <button type="button" disabled={step === 0} onClick={() => setStep((value) => value - 1)}><ChevronRight size={16} aria-hidden="true" />{t("journey-care.walkthrough.previous")}</button>
            <span role="status">{t("journey-care.walkthrough.progress", { value: checked.length, total: MAINTENANCE_TASKS.length })}</span>
            <button type="button" disabled={step === MAINTENANCE_TASKS.length - 1} onClick={() => setStep((value) => value + 1)}>{t("journey-care.walkthrough.next")}<ChevronLeft size={16} aria-hidden="true" /></button>
        </div>
    </JourneyLesson>;
}

export function MaintenancePreferenceLesson({ value }: { value: WizardData["maintenancePreference"] }) {
    const { t } = useTranslation("tools");
    if (!["minimal", "moderate", "intensive"].includes(value)) return null;
    const choice = value as "minimal" | "moderate" | "intensive";
    return <JourneyLesson title={t(`journey-care.maintenance.${choice}.title`)} summary={t(`journey-care.maintenance.${choice}.summary`)}
        sections={[{ title: t("journey-care.maintenance.detailTitle"), body: <p>{t(`journey-care.maintenance.${choice}.body`)}</p> }]}
        footer={<p>{t("journey-care.maintenance.scope")}</p>} />;
}
