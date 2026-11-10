import { useState } from "react";
import { useTranslation } from "react-i18next";
import { JourneyLesson, LessonChoices, LessonSource } from "./journey-lesson";

export function AquascapeGuide({ style }: { style: "stone" | "wood" | "planted" }) {
    const { t } = useTranslation("tools");
    const [stage, setStage] = useState<"focus" | "space" | "depth">("focus");
    return <JourneyLesson title={t(`journey-style-guide.${style}.title`)} summary={t(`journey-style-guide.${style}.summary`)}
        sections={[
            { title: t("journey-style-guide.setup"), body: t(`journey-style-guide.${style}.setup`) },
            { title: t("journey-style-guide.check"), body: t(`journey-style-guide.${style}.check`) },
        ]}
        footer={<LessonSource label={t("journey-style-guide.sources")} sources={[
            { label: "OATA · Freshwater aquarium setup", href: "https://ornamentalfish.org/what-we-do/advice-information/care-sheets/caresheets-tropical-freshwater-fish/how-to-set-up-and-look-after-a-freshwater-tank-aquarium/" },
            { label: "Aqueon · Choosing aquarium plants", href: "https://www.aqueon.com/articles/choosing-the-right-aquarium-plant" },
            { label: "JBL · Stones and wood", href: "https://www.jbl.de/en/essentials-aquarium-decoration/section/61/decoration-stones-roots?country=us" },
        ]} />}>
        <LessonChoices label={t("journey-style-guide.explore")} options={(["focus", "space", "depth"] as const).map((id) => ({ id, label: t(`journey-style-guide.${id}`) }))} value={stage} onChange={(value) => { if (value === "focus" || value === "space" || value === "depth") setStage(value); }} />
        <svg viewBox="0 0 360 170" role="img" aria-label={t(`journey-style-guide.${style}.${stage}`)} className="aqv-style-guide-map">
            <rect x="2" y="2" width="356" height="166" rx="12" fill="#102b34" stroke="#43686d" />
            <path d="M8 120 Q90 88 178 125 T352 118 V162 H8Z" fill={style === "planted" ? "#544639" : "#c4b18c"} />
            {style === "planted" && <g fill="#59865e">
                <path d="M35 122 Q7 63 32 23 Q51 64 35 122 M53 122 Q42 45 71 16 Q80 67 53 122 M295 123 Q276 62 303 25 Q317 72 295 123 M322 123 Q311 73 336 46 Q347 90 322 123" />
            </g>}
            <path d="M73 127 L82 80 L112 48 L140 67 L157 128Z" fill="#7e8d83" stroke={stage === "focus" ? "#a2f6e6" : "#4d665f"} strokeWidth={stage === "focus" ? 3 : 1} />
            <path d="M112 48 L109 109 L73 127 L82 80Z" fill="#9da99b" />
            <path d="M144 131 L161 104 L185 99 L203 130Z" fill="#526c62" />
            {style !== "stone" && <g fill="none" strokeLinecap="round">
                <path d="M137 130 Q187 103 211 50 L230 30 M201 72 L176 43 M206 66 L247 52" stroke="#9e7952" strokeWidth="9" />
                <path d="M137 130 Q187 103 211 50 L230 30" stroke={stage === "focus" ? "#a2f6e6" : "#d4ad75"} strokeWidth="2" />
            </g>}
            {stage === "space" && <rect x="210" y="92" width="126" height="55" rx="20" fill="#7cdee0" fillOpacity=".17" stroke="#a2f6e6" strokeWidth="2" strokeDasharray="6 4" />}
            {stage === "depth" && <g fill="none" stroke="#a2f6e6" strokeWidth="2" strokeDasharray="5 4">
                <path d="M20 148 H340 M20 102 H340 M20 42 H340" />
                <path d="M23 140 V51 M17 61 L23 51 L29 61" strokeDasharray="none" />
            </g>}
        </svg>
        <p className="aqv-lesson-caption" aria-live="polite">{t(`journey-style-guide.${style}.${stage}`)}</p>
        <p className="aqv-lesson-caption">{t("journey-style-guide.illustration")}</p>
    </JourneyLesson>;
}
