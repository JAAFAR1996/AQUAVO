import { useId } from "react";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { WizardData } from "@/types/journey";
import "./aquascape-styles.css";

interface AquascapeStylesProps {
  data: WizardData;
  updateData: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}

const STYLES = [
  {
    id: "stone",
    name: "صخري هادئ",
    tip: "خلّي الصخرة الرئيسية على جهة، واترك مساحة مفتوحة حتى يبرز شكلها.",
    substrate: "sand",
    decorations: ["rocks", "background"],
  },
  {
    id: "wood",
    name: "جذور طبيعية",
    tip: "وجّه الخشب باتجاه واحد، وخلي الرمل قدّامه مفتوح حتى يبين العمق.",
    substrate: "sand",
    decorations: ["driftwood", "rocks", "background"],
  },
  {
    id: "planted",
    name: "مزروع أخضر",
    tip: "رتّب النباتات الطويلة بالخلف والقصيرة بالقدّام حتى تبقى الرؤية واضحة.",
    substrate: "planted-substrate",
    decorations: ["live-plants", "driftwood", "rocks", "background"],
  },
] as const;

type StyleId = (typeof STYLES)[number]["id"];

function StyleSwatch({ style }: { style: StyleId }) {
  const hasWood = style !== "stone";
  const hasPlants = style === "planted";

  return (
    <svg viewBox="0 0 144 82" aria-hidden="true" focusable="false">
      <rect width="144" height="82" rx="6" fill="#102B30" />
      <path d="M0 0H144V41C96 21 44 22 0 45Z" fill="#17393B" />
      <path d="M0 6H144" stroke="#E6D9AC" strokeOpacity=".38" />
      <path d="M0 69C34 56 48 64 74 66S120 66 144 61V82H0Z" fill={hasPlants ? "#544437" : "#C3B596"} />
      <path d="M0 75C40 64 61 71 87 73S119 74 144 69V82H0Z" fill={hasPlants ? "#3A332C" : "#9B8D74"} />
      {hasPlants && (
        <g>
          <path d="M18 67C16 42 9 33 12 18C25 31 26 47 18 67Z" fill="#527A48" />
          <path d="M23 66C20 40 27 22 34 13C37 32 32 48 23 66Z" fill="#79975A" />
          <path d="M29 67C27 45 39 34 46 27C46 43 38 56 29 67Z" fill="#3E704D" />
          <path d="M120 66C119 44 111 25 116 17C127 29 130 49 120 66Z" fill="#5E8451" />
          <path d="M125 66C125 43 135 33 140 28C142 44 133 60 125 66Z" fill="#77975A" />
          <path d="M109 67C106 49 98 41 102 31C114 39 117 53 109 67Z" fill="#3E704D" />
        </g>
      )}
      <path d="M26 68L34 45L48 27L59 35L71 65L54 71Z" fill="#727D76" />
      <path d="M34 45L48 27L47 58L54 71L26 68Z" fill="#929A8D" />
      <path d="M48 27L59 35L71 65L54 71L47 58Z" fill="#53655F" />
      <path d="M28 67L47 58M34 45L43 47L39 57M52 39L60 57" fill="none" stroke="#B4B9A5" strokeWidth=".8" strokeOpacity=".55" />
      <path d="M67 70L75 56L87 53L97 68L83 73Z" fill="#69786E" />
      <path d="M67 70L75 56L87 53L81 66L83 73Z" fill="#8A9383" />
      <path d="M17 72L23 63L29 65L33 72Z" fill="#808B7B" />
      {hasWood && (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M58 72C64 56 88 55 91 39L104 21M82 52L74 35L63 27M90 40L116 32" stroke="#503A2A" strokeWidth="7" />
          <path d="M58 69C64 54 88 54 91 39L104 21M82 50L74 35L63 27M90 39L116 32" stroke="#967455" strokeWidth="2" />
        </g>
      )}
      {hasPlants && (
        <g>
          <path d="M36 72C24 64 24 57 29 55C39 58 43 64 36 72Z" fill="#8CA566" />
          <path d="M38 72C37 57 42 52 47 52C51 62 46 69 38 72Z" fill="#678952" />
          <path d="M98 73C89 61 93 55 97 56C105 60 107 67 98 73Z" fill="#75994E" />
          <path d="M100 74C103 61 112 58 116 62C116 69 109 75 100 74Z" fill="#98AF6D" />
        </g>
      )}
      <g fill="#E9DFC5" opacity=".4">
        <circle cx="11" cy="75" r=".6" /><circle cx="39" cy="77" r=".5" />
        <circle cx="65" cy="75" r=".6" /><circle cx="109" cy="77" r=".5" />
        <circle cx="126" cy="73" r=".6" /><circle cx="134" cy="78" r=".5" />
      </g>
      <path d="M2 10V79H142V10" fill="none" stroke="#D8F1E7" strokeOpacity=".2" />
    </svg>
  );
}

export function AquascapeStyles({ data, updateData }: AquascapeStylesProps) {
  const { t } = useTranslation("tools");
  const headingId = useId();
  const descriptionId = useId();
  const selectedDecorations = new Set(data.decorations);
  const selected = STYLES.find((style) => (
    data.substrateType === style.substrate
    && selectedDecorations.size === style.decorations.length
    && style.decorations.every((item) => selectedDecorations.has(item))
  ));

  return (
    <section className="aqv-aquascape-styles" aria-labelledby={headingId}>
      <div className="aqv-aquascape-styles__heading">
        <h3 id={headingId}>{t("journey-styles.title", { defaultValue: "اختار شكل يعجبك" })}</h3>
        <p id={descriptionId}>
          {t("journey-styles.description", { defaultValue: "يطبّق الأرضية والديكور، وتكدر تعدّلهم بالخطوات." })}
        </p>
      </div>
      <div className="aqv-aquascape-styles__options">
        {STYLES.map((style) => (
          <button
            key={style.id}
            type="button"
            className="aqv-aquascape-styles__option"
            aria-pressed={selected?.id === style.id}
            aria-describedby={descriptionId}
            onClick={() => {
              updateData("substrateType", style.substrate);
              updateData("decorations", [...style.decorations]);
            }}
          >
            <span className="aqv-aquascape-styles__swatch">
              <StyleSwatch style={style.id} />
              {selected?.id === style.id && <span className="aqv-aquascape-styles__check"><Check size={12} aria-hidden="true" /></span>}
            </span>
            <span className="aqv-aquascape-styles__label">
              {t(`journey-styles.${style.id}`, { defaultValue: style.name })}
            </span>
          </button>
        ))}
      </div>
      <div className="aqv-aquascape-styles__tip" aria-live="polite" aria-atomic="true">
        {selected && <p>{t(`journey-styles.${selected.id}Tip`, { defaultValue: selected.tip })}</p>}
      </div>
    </section>
  );
}
