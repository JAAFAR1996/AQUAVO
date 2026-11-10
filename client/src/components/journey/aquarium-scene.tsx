import { useId, type CSSProperties } from "react";
import type { WizardData } from "@/types/journey";
import type { FishSpeciesInfo } from "./fish-species-data";

interface AquariumSceneProps {
  data: WizardData;
  species: FishSpeciesInfo[];
  title: string;
  description: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const positive = (value: number | undefined) => Number.isFinite(value) && Number(value) > 0;

/** The front plane uses L:H; depth is a restrained, consistent axonometric projection. */
function tankGeometry(data: WizardData) {
  const presets: Record<string, [number, number, number]> = {
    small: [40, 25, 30], medium: [60, 35, 40], large: [90, 45, 45], xlarge: [120, 50, 50],
  };
  const preset = presets[data.tankSize] || [60, 35, 36];
  const length = positive(data.tankLengthCm) ? Number(data.tankLengthCm) : preset[0];
  const height = positive(data.tankHeightCm) ? Number(data.tankHeightCm) : preset[2];
  const width = positive(data.tankWidthCm) ? Number(data.tankWidthCm) : preset[1];
  // Extreme inputs remain legible. This is a design preview, not a construction drawing.
  const ratio = clamp(length / height, 0.65, 4.5);
  const h = Math.min(246, 446 / ratio);
  const w = h * ratio;
  const dx = clamp((width / length) * w * 0.22, 22, 65);
  const dy = dx * 0.46;
  const x = (640 - w - dx) / 2 - (data.filterType === "canister" ? 12 : 0);
  return { x, y: 337 - h, w, h, dx, dy, bottom: 337, ratio };
}

function Rock({ x, y, scale = 1, flip = false, id }: { x: number; y: number; scale?: number; flip?: boolean; id: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
      <ellipse cx="6" cy="-2" rx="55" ry="6" fill="#071714" opacity=".4" />
      <path d="M-49 0 -39 -24 -24 -43 -13 -79 8 -91 31 -61 39 -28 55 -2 22 4Z" fill={`url(#${id}-stone)`} />
      <path d="M-49 0 -24 -43 -13 -79 8 -91 -1 -48 -17 -25 -11 3Z" fill="#7d8580" />
      <path d="M8 -91 31 -61 15 -49 -1 -48Z" fill="#a4aaa0" />
      <path d="M15 -49 31 -61 39 -28 55 -2 19 1 3 -28Z" fill="#3e504d" />
      <path d="M-24 -43 -1 -48 3 -28 -17 -25Z" fill="#59685e" />
      <path d="M-39 -24 -24 -43 -17 -25 -11 3 -49 0Z" fill="#697265" />
      <path d="M-11 3 -17 -25 -4 -17 8 -22 19 1Z" fill="#879080" opacity=".75" />
      <path d="M-14 -76 -21 -45 -13 -40 M-34 -24 -20 -25 M14 -68 10 -56 16 -50 M22 -37 16 -26 25 -10" fill="none" stroke="#263c37" strokeWidth="1.5" opacity=".55" />
      <path d="M-20 -50 -26 -36 M-36 -12 -24 -10 M3 -80 11 -72 M30 -23 35 -13 M-7 -17 1 -14" fill="none" stroke="#d1d1b3" strokeWidth="1.2" opacity=".35" />
    </g>
  );
}

function BroadPlant({ x, y, scale = 1, id }: { x: number; y: number; scale?: number; id: string }) {
  const leaves = [
    [-67, 65, .92], [-42, 85, 1.05], [-16, 101, 1], [13, 112, 1.1],
    [43, 78, .88], [70, 61, .75], [-23, 63, .82], [28, 65, .83],
  ];
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} className="aqv-aquarium-plant">
      {leaves.map(([angle, height, width], index) => (
        <g key={index} transform={`rotate(${angle}) scale(${width} ${height / 100})`}>
          <path d="M0 0 Q-3 -30 1 -56" fill="none" stroke="#467749" strokeWidth="1.8" />
          <path d="M1 -33 C-17 -46 -25 -72 -8 -104 C13 -97 27 -64 1 -33Z" fill={`url(#${id}-${index % 3 === 0 ? "leaf-bright" : "leaf"})`} />
          <path d="M1 -35 Q1 -72 -8 -103" fill="none" stroke="#b2c97a" strokeWidth=".9" opacity=".6" />
          <path d="M0 -51 -12 -63 M-1 -65 -16 -79 M-4 -82 -14 -91 M-1 -58 14 -68 M-4 -75 8 -84" fill="none" stroke="#b3cc7a" strokeWidth=".55" opacity=".2" />
        </g>
      ))}
    </g>
  );
}

function RibbonPlant({ x, y, scale = 1, id }: { x: number; y: number; scale?: number; id: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} className="aqv-aquarium-plant aqv-aquarium-plant--ribbon">
      <path d="M0 0 C-23 -52 -34 -109 -16 -172 C-25 -112 -13 -58 5 0Z" fill={`url(#${id}-leaf)`} />
      <path d="M4 0 C29 -65 18 -115 37 -150 C24 -112 42 -60 9 0Z" fill={`url(#${id}-leaf-bright)`} />
      <path d="M1 0 C-3 -45 8 -108 -1 -189 C20 -133 8 -57 8 0Z" fill={`url(#${id}-leaf-bright)`} />
      <path d="M2 0 C-45 -39 -57 -97 -43 -129 C-46 -88 -28 -41 8 0Z" fill={`url(#${id}-leaf)`} />
      <path d="M5 0 C38 -44 48 -89 43 -113 C63 -72 38 -25 10 0Z" fill="#427a48" />
      <path d="M3 -2 C-11 -54 -20 -111 -15 -162 M7 -5 C16 -63 11 -121 0 -177" fill="none" stroke="#c5d78c" strokeWidth=".7" opacity=".4" />
    </g>
  );
}

function StemPlant({ x, y, scale = 1, id, artificial = false }: { x: number; y: number; scale?: number; id: string; artificial?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} className="aqv-aquarium-plant">
      {[-18, 0, 21].map((offset, stalk) => (
        <g key={stalk} transform={`translate(${offset} 0) rotate(${(stalk - 1) * 12})`}>
          <path d="M0 0 Q-6 -76 0 -148" stroke={artificial ? "#447d85" : "#5c7840"} strokeWidth="2" fill="none" />
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <g key={index} transform={`translate(${-2 + index * .2} ${-22 - index * 21}) scale(${1 - index * .08})`}>
              <path d="M0 0 C-9 -1 -29 -9 -27 -23 C-9 -24 0 -11 0 0Z" fill={artificial ? (index % 2 ? "#608abb" : "#47a5a0") : `url(#${id}-leaf)`} />
              <path d="M0 -4 C9 -6 27 -19 21 -31 C5 -28 -1 -14 0 -4Z" fill={artificial ? "#60b2a8" : `url(#${id}-leaf-bright)`} />
              <path d="M-1 -1 -24 -21 M0 -5 19 -28" stroke={artificial ? "#9cc9cf" : "#bed48b"} strokeWidth=".7" opacity=".4" />
            </g>
          ))}
        </g>
      ))}
    </g>
  );
}

function Driftwood({ id }: { id: string }) {
  return (
    <g data-decoration="driftwood">
      <ellipse cx="219" cy="209" rx="94" ry="9" fill="#061a13" opacity=".36" />
      <path d="M119 215 C147 207 178 187 199 166 C216 150 227 127 241 107 L258 87 249 113 233 150 C242 152 256 155 271 155 L310 142 294 157 265 166 241 164 C258 182 278 191 310 205 L281 207 C246 197 222 189 211 181 C186 201 164 212 119 215Z" fill={`url(#${id}-wood)`} />
      <path d="M198 171 C184 157 168 138 164 115 L162 86 170 104 174 127 190 146 207 154Z" fill="#725337" />
      <path d="M175 131 142 119 131 104 149 113 173 116Z" fill="#775b40" />
      <path d="M241 114 225 90 223 67 230 82 249 102Z" fill="#92704c" />
      <path d="M147 208 C180 192 206 177 222 150 L247 102 M211 174 Q238 192 288 205 M171 113 Q176 144 196 161" fill="none" stroke="#bc9464" strokeWidth="2" opacity=".7" />
      <path d="M157 208 187 195 211 177 M232 158 260 161 289 151 M221 145 233 122" fill="none" stroke="#3e3426" strokeWidth="2.4" />
    </g>
  );
}

function Substrate({ type, id }: { type: string; id: string }) {
  if (!type) return null;
  const sand = type === "sand";
  const dark = type === "planted-substrate";
  return (
    <g data-decoration="substrate" data-substrate={type}>
      <path d="M0 193 C58 177 91 177 137 193 C201 216 248 211 309 196 C353 183 397 191 440 183 L440 230 H0Z" fill={`url(#${id}-${sand ? "sand" : dark ? "soil" : "gravel"})`} />
      {type === "mixed" && <path d="M165 201 C191 199 201 204 224 205 C263 210 304 210 354 199 L440 217 V230 H114 C130 216 142 207 165 201Z" fill={`url(#${id}-sand)`} />}
      <path d="M0 193 C58 177 91 177 137 193 C201 216 248 211 309 196 C353 183 397 191 440 183 L440 230 H0Z" fill={`url(#${id}-${sand ? "fine-grain" : "pebbles"})`} opacity={dark ? ".44" : ".7"} />
      <path d="M0 224 C125 220 197 228 282 223 C345 218 387 219 440 218 V230 H0Z" fill="#111b12" opacity=".18" />
    </g>
  );
}

function InternalEquipment({ data, id }: { data: WizardData; id: string }) {
  return (
    <g>
      {data.filterType === "sponge" && (
        <g data-equipment="sponge">
          <ellipse cx="38" cy="213" rx="24" ry="5" fill="#071815" opacity=".55" />
          <path d="M39 184 V102 Q39 93 47 93 H55" stroke="#576d66" strokeWidth="8" strokeLinejoin="round" fill="none" />
          <rect x="18" y="170" width="41" height="40" rx="5" fill="#192a26" stroke="#46564b" />
          {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M21 ${175 + i * 6} H56`} stroke="#3c4b40" strokeWidth="2" />)}
          <path d="M39 170 V149" stroke="#9bada0" strokeWidth="4" />
          {data.waterSource && [0, 1, 2, 3, 4, 5].map((index) => (
            <circle key={index} cx={54 + (index % 2) * 4} cy={83 - index * 11} r={1.1 + (index % 3) * .6} stroke="#cae8d8" fill="#c1e9df" fillOpacity=".16" strokeOpacity=".5" className="aqv-aquarium-bubble" style={{ "--bubble-delay": `${-index * .7}s` } as CSSProperties} />
          ))}
        </g>
      )}
      {data.filterType === "internal" && (
        <g data-equipment="internal">
          <path d="M410 56 H389" stroke="#567a73" strokeWidth="9" strokeLinecap="round" />
          <rect x="400" y="48" width="25" height="111" rx="5" fill={`url(#${id}-equipment)`} stroke="#6a8175" strokeWidth=".8" />
          <rect x="405" y="54" width="14" height="21" rx="2" fill="#31453c" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => <path key={i} d={`M405 ${88 + i * 8} H421`} stroke="#12251e" strokeWidth="3" />)}
          <path d="M418 48 V-4" fill="none" stroke="#253e34" strokeWidth="2" />
        </g>
      )}
      {(data.filterType === "canister" || data.filterType === "hob") && (
        <g data-equipment="intake">
          <path d="M404 -8 V155" stroke="#597b6e" strokeWidth="7" fill="none" />
          <path d="M405 -8 V153" stroke="#b0c5a6" strokeWidth="1.5" fill="none" opacity=".45" />
          <rect x="398" y="144" width="13" height="32" rx="3" fill="#243d32" />
          {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M400 ${150 + i * 5} H409`} stroke="#597063" strokeWidth="1.5" />)}
        </g>
      )}
      {data.heaterWattage > 0 && (
        <g data-equipment="heater">
          <path d="M377 56 V-5" fill="none" stroke="#20372e" strokeWidth="2" />
          <rect x="372" y="61" width="10" height="114" rx="5" fill={`url(#${id}-equipment)`} stroke="#a0b2a3" strokeWidth=".7" />
          <rect x="372" y="58" width="10" height="19" rx="2" fill="#18322b" />
          <rect x="375" y="80" width="2" height="81" rx="1" fill="#a2b0a0" opacity=".6" />
          <circle cx="378" cy="85" r="1.4" fill="#c27b49" />
          <path d="M369 100 H384 M369 143 H384" stroke="#18322b" strokeWidth="3" />
        </g>
      )}
    </g>
  );
}

function Fish({ species, index, count }: { species: FishSpeciesInfo; index: number; count: number }) {
  const bottomDweller = species.category === "bottom-dwellers" || species.category === "shrimp-snails";
  const columns = Math.min(5, count);
  const rows = Math.max(1, Math.ceil(count / columns));
  const x = count < 5 ? [234, 155, 310, 100][index] : 75 + (index % columns) * 71;
  const y = bottomDweller ? 205 - (index % 3) * 6 : 66 + Math.floor(index / columns) * (100 / rows) + (index % 3) * 23;
  const flip = index % 2 ? -1 : 1;
  const scale = species.category === "cichlids" || species.category === "goldfish" ? .9 : .72;
  const neon = species.id === "neon-tetra" || species.id === "cardinal-tetra";
  const snail = species.id.includes("snail");
  const shrimp = species.id.includes("shrimp");
  const angelfish = species.id === "angelfish";
  const bodyColor = neon ? "#92c8bb" : species.category === "goldfish" ? "#d59d51" : species.category === "cichlids" ? "#93aca4" : species.id === "betta" ? "#81b7bb" : species.id === "molly" ? "#374945" : bottomDweller ? "#9d9170" : "#ccad6e";
  return (
    <g data-species-id={species.id} transform={`translate(${x} ${y}) scale(${flip * scale} ${scale})`}>
      <g className="aqv-aquarium-fish" style={{ "--fish-delay": `${index * -.9}s` } as CSSProperties}>
        {snail ? (
          <>
            <ellipse cx="1" cy="5" rx="17" ry="4" fill="#9b9777" />
            <circle cx="-3" cy="-1" r="10" fill="#98724b" stroke="#c3a778" />
            <path d="M2 4 C-11 9 -14 -6 -5 -7 C3 -9 5 1 -1 2 C-5 4 -7 -1 -3 -2" stroke="#3f4937" fill="none" strokeWidth="1.5" />
            <path d="M12 3 17 -3 M13 5 19 0" stroke="#b5ba91" fill="none" />
          </>
        ) : shrimp ? (
          <>
            <path d="M-19 2 Q-9 -10 9 -4 L20 1 7 5 -9 4Z" fill={species.id === "cherry-shrimp" ? "#bd7152" : "#b4ad91"} />
            <path d="M-19 2 -25 -4 -23 5Z M-9 4 -12 12 M-1 4 -2 12 M6 4 9 11 M18 0 Q30 -10 38 -4 M18 1 Q30 -4 39 2" fill="none" stroke="#c5a683" strokeWidth="1.2" />
            <circle cx="16" cy="-1" r="1.5" fill="#142b26" />
          </>
        ) : (
          <>
            <path d={species.id === "betta" ? "M-11 0 C-28 -23 -43 -17 -40 0 C-44 17 -28 24 -11 0Z" : species.id === "guppy" ? "M-13 0 -36 -18 Q-29 0 -36 18Z" : "M-17 0 -33 -11 -28 0 -33 11Z"} fill={species.id === "guppy" ? "#cb8b56" : bodyColor} opacity=".88" />
            <path d={angelfish ? "M-9 -6 -3 -35 14 -1 3 27 -7 5Z" : "M-10 -5 Q-2 -24 11 -7 M-2 7 5 19 13 5"} fill={bodyColor} opacity=".8" />
            <path d={bottomDweller ? "M-19 0 Q-5 -10 15 -2 L23 5 Q5 12 -19 0Z" : "M-21 0 C-7 -18 12 -14 25 -1 C14 13 -8 15 -21 0Z"} fill={bodyColor} />
            <path d="M-15 -1 Q6 -12 21 -2" fill="none" stroke="#e6e3bc" strokeWidth="2" opacity=".5" />
            {neon && <><path d="M-17 -2 Q5 -4 21 -2" fill="none" stroke="#5cd6d9" strokeWidth="3" /><path d="M-16 3 H5" stroke="#ca796a" strokeWidth="4" /></>}
            {angelfish && <path d="M0 -12 3 12 M10 -9 12 9 M-4 9 -9 37" fill="none" stroke="#344b48" strokeWidth="3" />}
            <path d="M5 0 -2 9 11 4Z" fill="#d0d2b1" opacity=".5" />
            <circle cx="17" cy="-3" r="2.2" fill="#e7dfb7" />
            <circle cx="17.5" cy="-3" r="1.3" fill="#0a2524" />
          </>
        )}
      </g>
    </g>
  );
}

export function AquariumScene({ data, species, title, description }: AquariumSceneProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = `aqv-aquarium-${uid}`;
  const { x, y, w, h, dx, dy, bottom, ratio } = tankGeometry(data);
  const decor = new Set(data.decorations || []);
  const hasWater = Boolean(data.waterSource);
  const hasLight = Boolean(data.lightingType && data.lightingType !== "none");
  const stable = (data.location || []).includes("stable-surface");
  const waterTop = 17;
  const plantsBase = data.substrateType ? 201 : 226;
  const url = (name: string) => `url(#${id}-${name})`;

  return (
    <div className="aqv-aquarium-studio">
      <svg viewBox="0 0 640 440" role="img" aria-labelledby={`${id}-title ${id}-desc`} data-testid="journey-aquarium" data-has-water={hasWater} data-tank-ratio={ratio}>
        <title id={`${id}-title`}>{title}</title>
        <desc id={`${id}-desc`}>{description}</desc>
        <defs>
          <radialGradient id={`${id}-studio`} cx="48%" cy="37%" r="65%"><stop stopColor="#254638" /><stop offset=".55" stopColor="#132b2b" /><stop offset="1" stopColor="#0b1d26" /></radialGradient>
          <radialGradient id={`${id}-halo`}><stop stopColor="#a7a674" stopOpacity=".2" /><stop offset="1" stopColor="#a7a674" stopOpacity="0" /></radialGradient>
          <linearGradient id={`${id}-back`} x2="0" y2="1"><stop stopColor={decor.has("background") ? "#142b27" : "#193c3e"} /><stop offset="1" stopColor={decor.has("background") ? "#071b1c" : "#102b30"} /></linearGradient>
          <linearGradient id={`${id}-water`} x2="0" y2="1"><stop stopColor="#95c1a9" stopOpacity=".1" /><stop offset=".5" stopColor="#81b6a4" stopOpacity=".13" /><stop offset="1" stopColor="#57877f" stopOpacity=".25" /></linearGradient>
          <linearGradient id={`${id}-glass`} x2="1" y2="1"><stop stopColor="#c9efdf" stopOpacity=".12" /><stop offset=".34" stopColor="#c9efdf" stopOpacity="0" /><stop offset=".82" stopColor="#69acac" stopOpacity=".025" /><stop offset="1" stopColor="#d7e4be" stopOpacity=".14" /></linearGradient>
          <linearGradient id={`${id}-side`} x2="1" y2=".15"><stop stopColor="#9ac2a6" stopOpacity=".2" /><stop offset="1" stopColor="#86bfb2" stopOpacity=".045" /></linearGradient>
          <linearGradient id={`${id}-edge`} x2="1" y2=".1"><stop stopColor="#d6e8c4" stopOpacity=".8" /><stop offset=".55" stopColor="#75bfb2" stopOpacity=".5" /><stop offset="1" stopColor="#d5efd2" stopOpacity=".82" /></linearGradient>
          <linearGradient id={`${id}-sand`} x2=".15" y2="1"><stop stopColor="#b8ae82" /><stop offset=".48" stopColor="#c7bb92" /><stop offset="1" stopColor="#857451" /></linearGradient>
          <linearGradient id={`${id}-soil`} x2="0" y2="1"><stop stopColor="#5e5b3d" /><stop offset=".45" stopColor="#3e3f2d" /><stop offset="1" stopColor="#242c22" /></linearGradient>
          <linearGradient id={`${id}-gravel`} x2="0" y2="1"><stop stopColor="#90927d" /><stop offset="1" stopColor="#5a6050" /></linearGradient>
          <linearGradient id={`${id}-stone`} x2=".2" y2="1"><stop stopColor="#a6afa0" /><stop offset=".5" stopColor="#68766b" /><stop offset="1" stopColor="#2a4439" /></linearGradient>
          <linearGradient id={`${id}-wood`} x1="0" y1="1" x2=".3" y2="0"><stop stopColor="#483d29" /><stop offset=".45" stopColor="#80623e" /><stop offset="1" stopColor="#b1905d" /></linearGradient>
          <linearGradient id={`${id}-leaf`} x2=".8" y2=".4"><stop stopColor="#224b33" /><stop offset=".4" stopColor="#417543" /><stop offset="1" stopColor="#759850" /></linearGradient>
          <linearGradient id={`${id}-leaf-bright`} x2="1" y2=".6"><stop stopColor="#344f27" /><stop offset=".45" stopColor="#72964e" /><stop offset="1" stopColor="#a9bc67" /></linearGradient>
          <linearGradient id={`${id}-equipment`}><stop stopColor="#192c27" /><stop offset=".45" stopColor="#506254" /><stop offset="1" stopColor="#233e32" /></linearGradient>
          <linearGradient id={`${id}-beam`} x2="0" y2="1"><stop stopColor="#e8e5b3" stopOpacity=".16" /><stop offset="1" stopColor="#e8e5b3" stopOpacity="0" /></linearGradient>
          <linearGradient id={`${id}-rgb`}><stop stopColor="#63aca8" /><stop offset=".52" stopColor="#a594ad" /><stop offset="1" stopColor="#caa17d" /></linearGradient>
          <linearGradient id={`${id}-plinth`} x2="0" y2="1"><stop stopColor="#586058" /><stop offset=".13" stopColor="#323e36" /><stop offset="1" stopColor="#152820" /></linearGradient>
          <radialGradient id={`${id}-shadow`}><stop stopColor="#000a10" stopOpacity=".7" /><stop offset="1" stopColor="#000a10" stopOpacity="0" /></radialGradient>
          <pattern id={`${id}-fine-grain`} width="13" height="11" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r=".65" fill="#efe0af" /><circle cx="8" cy="7" r=".55" fill="#403b29" /><circle cx="11" cy="2" r=".4" fill="#564d34" /><circle cx="4" cy="9" r=".4" fill="#fff1c7" /></pattern>
          <pattern id={`${id}-pebbles`} width="19" height="14" patternUnits="userSpaceOnUse"><ellipse cx="3" cy="4" rx="2.4" ry="1.5" fill="#b2ac8c" /><ellipse cx="11" cy="3" rx="2.7" ry="1.9" fill="#2b3328" /><ellipse cx="6" cy="11" rx="2" ry="1.5" fill="#73765b" /><ellipse cx="16" cy="10" rx="2.5" ry="1.8" fill="#b4b393" /></pattern>
          <clipPath id={`${id}-interior`}><rect x="1" y="1" width="438" height="228" /></clipPath>
        </defs>

        <rect width="640" height="440" fill={url("studio")} />
        <ellipse cx="316" cy="177" rx="278" ry="190" fill={url("halo")} />
        <path d="M0 359 Q320 349 640 359" stroke="#809286" strokeOpacity=".07" fill="none" />
        <ellipse cx="329" cy="371" rx={Math.max(w * .65, 180)} ry="39" fill={url("shadow")} />

        {/* A studio plinth gives the transparent glass a physical contact edge. */}
        <path d={`M${x - 9} ${bottom + 5} h${w + 17} l${dx + 3} ${-dy - 2} h${-w - 16}Z`} fill="#546459" />
        <path d={`M${x - 9} ${bottom + 5} h${w + 17} v${stable ? 40 : 10} h${-w - 17}Z`} fill={url("plinth")} />
        <path d={`M${x + w + 8} ${bottom + 5} l${dx + 3} ${-dy - 2} v${stable ? 40 : 10} l${-dx - 3} ${dy + 2}Z`} fill="#182e27" />
        {stable && <><path d={`M${x + w * .5} ${bottom + 7} v36`} stroke="#111e1a" /><path d={`M${x + w * .5 - 12} ${bottom + 14} v10 M${x + w * .5 + 12} ${bottom + 14} v10`} stroke="#a4ac92" strokeWidth="1.7" /></>}

        {/* Back pane and open rim, then interior, side pane and front reflections. */}
        <path d={`M${x} ${y} l${dx} ${-dy} h${w} v${h} l${-dx} ${dy}Z`} fill={url("back")} stroke="#9dbbab" strokeOpacity=".18" />
        <path d={`M${x} ${y} l${dx} ${-dy} h${w} l${-dx} ${dy}Z`} fill="#b5d2b1" fillOpacity=".035" />
        <path d={`M${x + dx} ${y - dy} v${h}`} stroke="#a4c9b3" strokeOpacity=".17" />

        <g transform={`translate(${x} ${y}) scale(${w / 440} ${h / 230})`}>
          <g clipPath={url("interior")}>
            <rect width="440" height="230" fill={url("back")} data-decoration={decor.has("background") ? "background" : undefined} />
            {hasWater && <rect data-testid="journey-water" x="0" y={waterTop} width="440" height={230 - waterTop} fill={url("water")} />}
            {hasLight && <path d="M47 0 H394 L438 230 H0Z" fill={url("beam")} />}
            <InternalEquipment data={data} id={id} />

            {decor.has("live-plants") && <g data-decoration="live-plants"><RibbonPlant x={67} y={plantsBase} scale={.93} id={id} /><RibbonPlant x={335} y={plantsBase + 1} scale={.78} id={id} /><StemPlant x={116} y={plantsBase + 2} scale={.77} id={id} /><StemPlant x={371} y={plantsBase + 1} scale={.69} id={id} /></g>}
            {decor.has("artificial-plants") && <g data-decoration="artificial-plants"><StemPlant x={324} y={plantsBase + 6} scale={.9} id={id} artificial /><StemPlant x={90} y={plantsBase + 4} scale={.7} id={id} artificial /></g>}
            <Substrate type={data.substrateType} id={id} />
            <g transform={data.substrateType ? undefined : "translate(0 15)"}>
              {decor.has("rocks") && <g data-decoration="rocks"><Rock x={139} y={210} scale={1.04} id={id} /><Rock x={91} y={214} scale={.57} id={id} flip /><Rock x={294} y={210} scale={.62} id={id} flip /><Rock x={333} y={215} scale={.36} id={id} /><Rock x={190} y={217} scale={.28} id={id} /></g>}
              {decor.has("driftwood") && <Driftwood id={id} />}
              {decor.has("caves") && <g data-decoration="caves" transform="translate(273 213)"><ellipse cx="0" cy="0" rx="46" ry="6" fill="#0a2118" opacity=".4" /><path d="M-43 0 -40 -18 -27 -39 -8 -48 17 -39 38 -22 43 0Z" fill={url("stone")} /><path d="M-23 0 C-26 -40 25 -39 24 0Z" fill="#0b211c" /><path d="M-27 -39 -8 -48 17 -39 7 -30 -12 -33Z" fill="#a1a794" /><path d="M-43 0 -40 -18 -27 -39 -22 -28 -30 -8Z" fill="#71806d" /></g>}
              {decor.has("live-plants") && <g><BroadPlant x={81} y={213} scale={.43} id={id} /><BroadPlant x={323} y={216} scale={.52} id={id} /><BroadPlant x={165} y={218} scale={.31} id={id} /></g>}
            </g>
            {hasWater && species.map((item, index) => <Fish key={item.id} species={item} index={index} count={species.length} />)}
            {hasWater && <><path d={`M0 ${waterTop} Q105 ${waterTop - 2} 220 ${waterTop} T440 ${waterTop}`} fill="none" stroke="#d5e9cb" strokeWidth="1.1" strokeOpacity=".48" /><path d="M57 28 Q118 24 160 29 M212 25 Q271 29 303 25" fill="none" stroke="#c0dbc2" strokeOpacity=".09" strokeWidth="2" /></>}
            <rect width="440" height="230" fill={url("glass")} />
            <path d="M20 3 8 205 M33 4 27 72" stroke="#e7efda" strokeOpacity=".14" strokeWidth="2.2" />
            <path d="M392 4 420 194" stroke="#dcebd7" strokeOpacity=".025" strokeWidth="14" />
          </g>
        </g>

        {hasWater && <path d={`M${x + w} ${y + h * waterTop / 230} l${dx} ${-dy} v${h * (1 - waterTop / 230)} l${-dx} ${dy}Z`} fill="#7ea593" fillOpacity=".1" />}
        <path d={`M${x + w} ${y} l${dx} ${-dy} v${h} l${-dx} ${dy}Z`} fill={url("side")} stroke="#c0d7b7" strokeWidth=".7" strokeOpacity=".45" />
        <path d={`M${x} ${y} h${w} v${h} h${-w}Z M${x} ${y} l${dx} ${-dy} h${w} v${h} l${-dx} ${dy}`} fill="none" stroke={url("edge")} strokeWidth="1.45" />
        <path d={`M${x + 3} ${y + 3} v${h - 5} h${w - 4}`} fill="none" stroke="#b6d3a9" strokeOpacity=".32" strokeWidth="2" />

        {hasLight && <g data-equipment="light">
          <path d={`M${x + w * .14} ${y - 2} V${y - dy - 18} M${x + w * .86} ${y - 2} V${y - dy - 18}`} stroke="#5c7064" strokeWidth="3" fill="none" />
          <rect x={x + w * .09} y={y - dy - 24} width={w * .82} height="7" rx="2" fill="#192a26" stroke="#738576" strokeWidth=".8" />
          <rect x={x + w * .1} y={y - dy - 17} width={w * .8} height="2.7" rx="1" fill={data.lightingType === "rgb-smart" ? url("rgb") : "#e8e4b2"} />
        </g>}
        {data.filterType === "hob" && <g data-equipment="hob">
          <rect x={x + w * .74 + dx * .5} y={y - dy - 11} width={w * .16} height="38" rx="3" fill={url("equipment")} stroke="#82917a" strokeWidth=".75" />
          <path d={`M${x + w * .76} ${y - 5} h${w * .1} v17 h${-w * .1}Z`} fill="#4b6758" />
          {hasWater && <path d={`M${x + w * .77} ${y + 12} q${w * .04} 8 ${w * .08} 0`} fill="none" stroke="#adcebb" strokeWidth="2" strokeOpacity=".5" />}
        </g>}
        {data.filterType === "canister" && <g data-equipment="canister">
          <path d={`M${x + w * .92} ${y + 10} V${y - dy - 8} Q${x + w + dx + 20} ${y - dy - 18} ${x + w + dx + 20} ${y + 15} V340 M${x + w * .83} ${y + 2} V${y - dy - 14} Q${x + w + dx + 35} ${y - dy - 24} ${x + w + dx + 35} ${y + 20} V340`} fill="none" stroke="#577464" strokeWidth="4" />
          <rect x={x + w + dx + 8} y="338" width="43" height="49" rx="7" fill={url("equipment")} stroke="#788a71" strokeWidth=".8" />
          <rect x={x + w + dx + 10} y="334" width="39" height="12" rx="3" fill="#253e34" />
          <path d={`M${x + w + dx + 19} 355 h20 M${x + w + dx + 16} 381 h25`} stroke="#6c8d76" strokeWidth="2" />
        </g>}
      </svg>
    </div>
  );
}
