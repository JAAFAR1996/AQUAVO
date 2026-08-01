import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSpeciesById, type FishSpeciesInfo } from "@/components/journey/fish-species-data";
import type { WizardData } from "@/types/journey";

const JOURNEY_INTRO_KEY = "aquavo_journey_intro_seen_v3";
const LEGACY_JOURNEY_TOUR_KEY = "aquavo_tour_seen_journey";

function claimFirstJourneyVisit(): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(LEGACY_JOURNEY_TOUR_KEY, "true");
    const seen = window.localStorage.getItem(JOURNEY_INTRO_KEY) === "1";
    if (!seen) window.localStorage.setItem(JOURNEY_INTRO_KEY, "1");
    return !seen;
  } catch {
    return false;
  }
}

export function JourneyFirstVisitIntro() {
  const [eligible] = useState(claimFirstJourneyVisit);
  const [open, setOpen] = useState(false);

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
              كل اختيار يبني حوضك
            </DialogTitle>
            <DialogDescription className="mt-2 text-base leading-7">
              من الحجم والموقع للمعدات والديكور والأسماك — المعاينة راح تتغيّر قدامك خطوة بخطوة وتبقى مطابقة لاختياراتك.
            </DialogDescription>
          </DialogHeader>
          <Button className="h-12 w-full font-bold aqv-press" onClick={() => setOpen(false)}>
            ابدأ بناء الحوض
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
  label: string;
}

const FILTER_LABELS: Record<string, string> = {
  hob: "فلتر HOB",
  canister: "فلتر كانستر",
  sponge: "فلتر إسفنجي",
  internal: "فلتر داخلي",
};

const SUBSTRATE_LABELS: Record<string, string> = {
  gravel: "حصى",
  sand: "رمل",
  "planted-substrate": "تربة نباتية",
  mixed: "ركيزة مختلطة",
};

const TANK_TYPE_LABELS: Record<string, string> = {
  "freshwater-community": "مجتمع مياه عذبة",
  planted: "حوض نباتي",
  "species-specific": "نوع محدد",
};

const MAINTENANCE_LABELS: Record<string, string> = {
  minimal: "15 دقيقة أسبوعياً",
  moderate: "30–45 دقيقة أسبوعياً",
  intensive: "ساعة أو أكثر أسبوعياً",
};

const FISH_COLORS: Record<string, string> = {
  community: "#F2A65A",
  cichlids: "#4A90E2",
  "bottom-dwellers": "#8B6B4A",
  labyrinth: "#D66BA0",
  schooling: "#38A3A5",
  invertebrates: "#D77A61",
};

const FISH_POSITIONS = [
  { x: 108, y: 112, flip: false },
  { x: 160, y: 88, flip: true },
  { x: 218, y: 125, flip: false },
  { x: 270, y: 94, flip: true },
  { x: 318, y: 135, flip: false },
  { x: 195, y: 158, flip: true },
  { x: 135, y: 150, flip: false },
  { x: 285, y: 158, flip: true },
];

type PreviewFish = Pick<FishSpeciesInfo, "id" | "category" | "nameAr">;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function tankSizeKey(litres: number, fallback: string) {
  if (litres > 300 || fallback === "xlarge") return "xlarge";
  if (litres > 150 || fallback === "large") return "large";
  if (litres > 60 || fallback === "medium") return "medium";
  return "small";
}

function waterPalette(source: string) {
  switch (source) {
    case "ro":
      return { top: "#E7FBFF", bottom: "#91D7E5", haze: 0.02 };
    case "well":
      return { top: "#DDEEDB", bottom: "#86BDB1", haze: 0.08 };
    case "tap":
    default:
      return { top: "#C7F1F4", bottom: "#68BFCB", haze: 0.04 };
  }
}

function speciesY(species: FishSpeciesInfo, index: number) {
  if (species.category === "bottom-dwellers") return 177 + (index % 2) * 5;
  if (species.category === "labyrinth") return 78 + (index % 2) * 16;
  return FISH_POSITIONS[index % FISH_POSITIONS.length].y;
}

function buildFish(species: FishSpeciesInfo[], stockingLevel: string, cyclingMethod: string): PreviewFish[] {
  if (species.length === 0 && cyclingMethod === "with-hardy-fish") {
    return [
      { id: "hardy-preview-1", category: "community", nameAr: "سمكة قوية" },
      { id: "hardy-preview-2", category: "community", nameAr: "سمكة قوية" },
    ];
  }
  if (species.length === 0) return [];
  const target = stockingLevel === "heavy" ? 8 : stockingLevel === "moderate" ? 6 : 4;
  const result: PreviewFish[] = [];
  for (let index = 0; index < target; index += 1) {
    result.push(species[index % species.length]);
  }
  return result;
}

function FilterVisual({ type }: { type: string }) {
  if (type === "canister") {
    return (
      <g className="aqv-jtank__equipment" aria-hidden="true">
        <path d="M315 47 C348 47 348 221 318 221" fill="none" stroke="#254854" strokeWidth="5" />
        <rect x="310" y="205" width="38" height="38" rx="9" fill="#18333D" />
        <rect x="317" y="211" width="24" height="4" rx="2" fill="#63BFCB" />
      </g>
    );
  }
  if (type === "hob") {
    return (
      <g className="aqv-jtank__equipment" aria-hidden="true">
        <path d="M315 34 h34 v52 h-22 v-30 h-12" fill="#18333D" />
        <path d="M327 85 v24" stroke="#63BFCB" strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  }
  if (type === "sponge") {
    return (
      <g className="aqv-jtank__equipment" aria-hidden="true">
        <rect x="54" y="139" width="28" height="50" rx="8" fill="#203C45" />
        <path d="M61 147 h14 M61 156 h14 M61 165 h14 M61 174 h14" stroke="#4E747F" strokeWidth="3" />
        <path d="M68 139 v-36" stroke="#203C45" strokeWidth="5" />
      </g>
    );
  }
  if (type === "internal") {
    return (
      <g className="aqv-jtank__equipment" aria-hidden="true">
        <rect x="312" y="92" width="24" height="76" rx="7" fill="#17313A" />
        <path d="M317 106 h14 M317 116 h14 M317 126 h14" stroke="#5B8792" strokeWidth="3" />
        <path d="M312 92 h-20" stroke="#63BFCB" strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  }
  return null;
}

function SubstrateVisual({ type }: { type: string }) {
  if (!type) return null;
  if (type === "sand") {
    return <path d="M31 191 C100 181 170 200 240 188 C290 180 336 187 369 181 V218 H31 Z" fill="#D7BE8A" />;
  }
  if (type === "planted-substrate") {
    return <path d="M31 184 C115 176 190 195 275 183 C316 177 346 182 369 178 V218 H31 Z" fill="#4E3A2B" />;
  }
  if (type === "mixed") {
    return (
      <g>
        <path d="M31 188 C95 179 150 194 205 186 V218 H31 Z" fill="#D7BE8A" />
        <path d="M205 186 C270 177 326 190 369 181 V218 H205 Z" fill="#5A4432" />
      </g>
    );
  }
  return (
    <g>
      <path d="M31 187 C110 177 184 197 266 186 C310 180 342 185 369 180 V218 H31 Z" fill="#8C8176" />
      {Array.from({ length: 18 }, (_, index) => (
        <circle key={index} cx={45 + (index * 19) % 320} cy={195 + (index % 3) * 7} r={3 + (index % 2)} fill={index % 2 ? "#B3AAA0" : "#675F58"} />
      ))}
    </g>
  );
}

function DecorVisual({ decorations }: { decorations: string[] }) {
  return (
    <g className="aqv-jtank__decor" aria-hidden="true">
      {decorations.includes("live-plants") && (
        <g fill="none" stroke="#2D8C66" strokeWidth="5" strokeLinecap="round">
          <path d="M82 190 C77 163 70 144 78 121" />
          <path d="M89 190 C101 164 104 145 98 126" />
          <path d="M106 190 C111 160 124 145 121 119" />
          <path d="M76 151 l-14 -11 M99 154 l14 -12 M116 148 l13 -13" strokeWidth="4" />
        </g>
      )}
      {decorations.includes("artificial-plants") && (
        <g fill="none" stroke="#2E9FA6" strokeWidth="5" strokeLinecap="round">
          <path d="M286 191 C278 164 281 143 294 127" />
          <path d="M300 191 C310 167 313 148 306 131" />
          <path d="M291 153 l-13 -8 M305 158 l13 -9" stroke="#6B77B8" strokeWidth="4" />
        </g>
      )}
      {decorations.includes("driftwood") && (
        <path d="M129 188 C153 171 167 160 180 137 C184 157 202 170 226 181 M171 151 C154 143 146 134 141 122" fill="none" stroke="#79543D" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {decorations.includes("rocks") && (
        <g fill="#68747A" stroke="#405057" strokeWidth="2">
          <path d="M232 190 l24 -47 25 47 Z" />
          <path d="M259 190 l19 -34 23 34 Z" fill="#7D898E" />
        </g>
      )}
      {decorations.includes("caves") && (
        <path d="M267 190 C267 161 286 146 312 146 C337 146 350 163 350 190 Z M291 190 C291 171 300 164 311 164 C323 164 333 173 333 190 Z" fill="#5C6468" fillRule="evenodd" />
      )}
    </g>
  );
}

function FishVisual({ fish, index }: { fish: PreviewFish; index: number }) {
  const position = FISH_POSITIONS[index % FISH_POSITIONS.length];
  const y = "maxSizeCm" in fish ? speciesY(fish as FishSpeciesInfo, index) : position.y;
  const color = FISH_COLORS[fish.category] ?? "#38A3A5";
  const round = fish.category === "cichlids";
  const bottom = fish.category === "bottom-dwellers";
  const transform = `translate(${position.x} ${y}) scale(${position.flip ? -1 : 1} 1)`;

  if (bottom) {
    return (
      <g transform={transform} className="aqv-jtank__fish" aria-label={fish.nameAr}>
        <ellipse cx="0" cy="0" rx="17" ry="6" fill={color} />
        <path d="M-14 1 l-11 7 l4 -12 Z" fill={color} />
        <circle cx="10" cy="-1" r="1.5" fill="#0B1E28" />
      </g>
    );
  }

  return (
    <g transform={transform} className="aqv-jtank__fish" aria-label={fish.nameAr}>
      <ellipse cx="0" cy="0" rx={round ? 13 : 17} ry={round ? 12 : 8} fill={color} />
      <path d={`M-${round ? 11 : 15} 0 l-12 -9 v18 Z`} fill={color} opacity=".85" />
      <path d="M-2 -7 C3 -12 9 -12 12 -6" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity=".55" />
      <circle cx={round ? 7 : 11} cy="-2" r="1.8" fill="#0B1E28" />
    </g>
  );
}

export function JourneyTankVisualizer({ data, currentStep, total, label }: JourneyTankVisualizerProps) {
  const species = useMemo(() => getSpeciesById(data.selectedSpecies || []), [data.selectedSpecies]);
  const fish = useMemo(
    () => buildFish(species, data.stockingLevel, data.cyclingMethod),
    [species, data.stockingLevel, data.cyclingMethod],
  );

  const litres = Number(data.tankLiters || 0);
  const size = tankSizeKey(litres, data.tankSize);
  const completion = clamp(Math.round(((currentStep + 1) / total) * 100), 8, 100);
  const waterLevel = clamp(26 + completion * 0.7, 30, 96);
  const waterY = 218 - (waterLevel / 100) * 180;
  const waterHeight = 218 - waterY;
  const palette = waterPalette(data.waterSource);
  const cyclingHaze = currentStep === 5 ? 0.18 : data.cyclingMethod && currentStep < 6 ? 0.1 : palette.haze;

  const location = new Set(data.location || []);
  const decorations = data.decorations || [];
  const hasStableSurface = location.has("stable-surface");
  const style = {
    "--aqv-jtank-water-top": `${waterY}px`,
  } as CSSProperties;

  const selectedLabels = [
    litres > 0 ? `${litres} لتر` : TANK_TYPE_LABELS[data.tankType],
    FILTER_LABELS[data.filterType],
    SUBSTRATE_LABELS[data.substrateType],
    species.length > 0 ? species.map((item) => item.nameAr).join("، ") : undefined,
    MAINTENANCE_LABELS[data.maintenancePreference],
  ].filter(Boolean) as string[];

  return (
    <section
      className="aqv-journey-preview"
      data-aqv-motion="journey-preview"
      data-size={size}
      data-summary={currentStep === total - 1 ? "true" : "false"}
      aria-label={label}
      style={style}
    >
      <div
        className="aqv-journey-scene"
        data-sun-safe={location.has("away-from-sunlight") ? "true" : "false"}
        data-stable={hasStableSurface ? "true" : "false"}
        data-power={location.has("near-power") ? "true" : "false"}
        data-quiet={location.has("quiet-area") ? "true" : "false"}
        data-access={location.has("easy-access") ? "true" : "false"}
        data-hvac-safe={location.has("away-from-hvac") ? "true" : "false"}
      >
        <div className="aqv-journey-scene__window" aria-hidden="true"><span /></div>
        <div className="aqv-journey-scene__vent" aria-hidden="true" />
        <div className="aqv-journey-scene__socket" aria-hidden="true"><i /><i /></div>
        <div className="aqv-journey-scene__clearance" aria-hidden="true" />

        <div className="aqv-jtank__viewport">
          <svg viewBox="0 0 400 260" role="img" aria-labelledby="aqv-tank-title aqv-tank-desc">
            <title id="aqv-tank-title">معاينة حوضك المختار</title>
            <desc id="aqv-tank-desc">
              معاينة بصرية تتغير حسب الحجم والموقع والمعدات والديكور والماء والأسماك التي اخترتها.
            </desc>
            <defs>
              <linearGradient id="aqv-water-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={palette.top} stopOpacity=".82" />
                <stop offset="100%" stopColor={palette.bottom} stopOpacity=".92" />
              </linearGradient>
              <linearGradient id="aqv-rgb-light" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0B93A6" />
                <stop offset="45%" stopColor="#8D6BC4" />
                <stop offset="100%" stopColor="#D37A5D" />
              </linearGradient>
              <linearGradient id="aqv-glass-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity=".48" />
                <stop offset="48%" stopColor="#FFFFFF" stopOpacity=".04" />
                <stop offset="100%" stopColor="#8EDCE6" stopOpacity=".18" />
              </linearGradient>
              <clipPath id="aqv-tank-clip">
                <rect x="31" y="29" width="338" height="188" rx="14" />
              </clipPath>
            </defs>

            <g clipPath="url(#aqv-tank-clip)">
              <rect x="31" y="29" width="338" height="188" fill={decorations.includes("background") ? "#173844" : "#EDF9FA"} />
              {decorations.includes("background") && <path d="M31 155 C105 110 177 154 245 105 C294 70 337 90 369 65 V218 H31 Z" fill="#235665" opacity=".7" />}
              <rect x="31" y={waterY} width="338" height={waterHeight} fill="url(#aqv-water-gradient)" className="aqv-jtank__water" />
              <path d={`M31 ${waterY + 1} C105 ${waterY - 4} 184 ${waterY + 5} 260 ${waterY} C309 ${waterY - 3} 342 ${waterY + 2} 369 ${waterY}`} fill="none" stroke="#D9FBFF" strokeWidth="3" opacity=".85" className="aqv-jtank__waterline" />
              <rect x="31" y={waterY} width="338" height={waterHeight} fill="#D9E0D2" opacity={cyclingHaze} className="aqv-jtank__haze" />

              <SubstrateVisual type={data.substrateType} />
              <DecorVisual decorations={decorations} />
              <FilterVisual type={data.filterType} />

              {data.heaterWattage > 0 && (
                <g className="aqv-jtank__equipment" aria-label={`سخان ${data.heaterWattage} واط`}>
                  <rect x="345" y="105" width="8" height="67" rx="4" fill="#344B55" />
                  <rect x="347" y="132" width="4" height="31" rx="2" fill="#E46A5D" />
                </g>
              )}

              {fish.map((item, index) => (
                <FishVisual key={`${item.id}-${index}`} fish={item} index={index} />
              ))}

              {data.cyclingMethod === "seeded" && (
                <g aria-hidden="true">
                  <circle cx="74" cy="118" r="4" fill="#725B45" />
                  <circle cx="85" cy="112" r="4" fill="#8C755D" />
                  <circle cx="93" cy="121" r="4" fill="#5F4B39" />
                </g>
              )}

              <rect x="31" y="29" width="338" height="188" fill="url(#aqv-glass-gradient)" pointerEvents="none" />
              <path d="M70 34 L42 198" stroke="#FFFFFF" strokeWidth="5" opacity=".2" />
            </g>

            <rect x="30" y="28" width="340" height="190" rx="15" fill="none" stroke="#0B93A6" strokeWidth="3" />
            <path d="M36 218 h328" stroke="#0B1E28" strokeWidth="5" strokeLinecap="round" opacity=".55" />

            {data.lightingType && data.lightingType !== "none" && (
              <g className="aqv-jtank__light" data-light={data.lightingType} aria-label={data.lightingType}>
                <rect x="82" y="15" width="236" height="10" rx="5" fill={data.lightingType === "rgb-smart" ? "url(#aqv-rgb-light)" : "#17333D"} />
                <path d="M105 27 L80 188 M200 27 L200 188 M295 27 L320 188" stroke={data.lightingType === "planted-led" ? "#C7F7D8" : "#E7FBFF"} strokeWidth="18" opacity=".09" />
              </g>
            )}

            {hasStableSurface && (
              <g className="aqv-jtank__cabinet" aria-hidden="true">
                <rect x="72" y="224" width="256" height="31" rx="5" fill="#5C4A3C" />
                <path d="M200 225 v30" stroke="#3E3128" strokeWidth="3" />
                <circle cx="190" cy="239" r="2" fill="#D3B990" />
                <circle cx="210" cy="239" r="2" fill="#D3B990" />
              </g>
            )}

            {data.cyclingMethod === "bottled-bacteria" && (
              <g transform="translate(342 218)" aria-label="بكتيريا معبأة">
                <rect x="0" y="0" width="24" height="31" rx="5" fill="#0B93A6" />
                <rect x="6" y="-6" width="12" height="8" rx="2" fill="#17333D" />
                <path d="M8 15 C11 9 15 9 17 15 C17 20 8 20 8 15" fill="#D9FBFF" />
              </g>
            )}
          </svg>
        </div>
      </div>

      <div className="aqv-journey-preview__status">
        <div>
          <strong>{label}</strong>
          <span>{completion}% مكتمل</span>
        </div>
        <div className="aqv-journey-preview__chips" aria-label="اختيارات مطبقة على المعاينة">
          {selectedLabels.slice(0, 5).map((item) => <span key={item}>{item}</span>)}
        </div>
        {fish.length > 0 && (
          <small>الأسماك داخل المعاينة تمثيل بصري للأنواع والكثافة المختارة، مو عدداً نهائياً.</small>
        )}
      </div>
    </section>
  );
}
