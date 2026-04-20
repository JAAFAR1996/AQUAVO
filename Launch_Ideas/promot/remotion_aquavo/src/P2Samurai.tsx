import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Video,
  interpolate,
  spring,
  staticFile,
} from "remotion";

// ─── Typography tokens ──────────────────────────────────────────────
const WHITE = "#FFFFFF";
const AMBER = "#FFB347";
const GOLD = "#FFD700";

// ─── Timeline (frames at 30fps) ─────────────────────────────────────
interface Overlay {
  text: string;
  size: number;
  color: string;
  weight: "900" | "700" | "400";
  yPct: number;
  startFrame: number;
  endFrame: number;
  anim: "pop" | "slide" | "fade";
}

const OVERLAYS: Overlay[] = [
  {
    text: "الهيتر ديشوه منظر حوضك؟",
    size: 60, color: WHITE, weight: "900", yPct: 0.30,
    startFrame: 5, endFrame: 85, anim: "pop",
  },
  {
    text: "كل هالتعب على التنسيق —\nهيتر قبيح بالنص يدمر كلشي",
    size: 46, color: WHITE, weight: "700", yPct: 0.44,
    startFrame: 75, endFrame: 175, anim: "slide",
  },
  {
    text: "الساموراي الأسود قوة ما تنشاف",
    size: 50, color: AMBER, weight: "900", yPct: 0.50,
    startFrame: 165, endFrame: 250, anim: "fade",
  },
  {
    text: "تصميم أسود غامق يندمج بالخلفية",
    size: 46, color: WHITE, weight: "700", yPct: 0.50,
    startFrame: 240, endFrame: 325, anim: "slide",
  },
  {
    text: "مو مجرد هيتر — جزء من التصميم",
    size: 54, color: GOLD, weight: "900", yPct: 0.45,
    startFrame: 315, endFrame: 400, anim: "pop",
  },
  {
    text: "قوة مخفية وجمال ظاهر",
    size: 46, color: WHITE, weight: "700", yPct: 0.53,
    startFrame: 315, endFrame: 400, anim: "fade",
  },
  {
    text: "متوفر الآن — aquavoiq.com",
    size: 46, color: WHITE, weight: "700", yPct: 0.45,
    startFrame: 390, endFrame: 480, anim: "slide",
  },
  {
    text: "AQUAVO",
    size: 54, color: GOLD, weight: "900", yPct: 0.53,
    startFrame: 390, endFrame: 480, anim: "pop",
  },
];

// ─── Single text layer ────────────────────────────────────────────
const TextLayer: React.FC<{ overlay: Overlay }> = ({ overlay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame - overlay.startFrame;
  const duration = overlay.endFrame - overlay.startFrame;
  const isActive = frame >= overlay.startFrame && frame < overlay.endFrame;

  if (!isActive) return null;

  // ── Animation
  let opacity = 1;
  let scale = 1;
  let translateX = 0;

  const fadeOutStart = duration - 9; // last 9 frames

  if (overlay.anim === "pop") {
    scale = spring({
      frame: localFrame,
      fps,
      config: { damping: 14, stiffness: 200, mass: 0.6 },
      from: 0.1,
      to: 1,
    });
    opacity = interpolate(localFrame, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  } else if (overlay.anim === "slide") {
    translateX = interpolate(localFrame, [0, 18], [120, 0], {
      extrapolateRight: "clamp",
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });
    opacity = interpolate(localFrame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  } else {
    // fade
    opacity = interpolate(localFrame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  }

  // Fade out
  if (localFrame >= fadeOutStart) {
    const fadeOutOpacity = interpolate(localFrame, [fadeOutStart, duration], [1, 0], {
      extrapolateRight: "clamp",
    });
    opacity = Math.min(opacity, fadeOutOpacity);
  }

  const yPos = overlay.yPct * 1920;

  return (
    <div
      style={{
        position: "absolute",
        top: yPos,
        left: 0,
        right: 0,
        transform: `translateY(-50%) translateX(${translateX}px) scale(${scale})`,
        opacity,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "0 60px",
        direction: "rtl",
        textAlign: "center",
      }}
    >
      <span
        style={{
          fontFamily: "'Cairo', 'Tajawal', sans-serif",
          fontSize: overlay.size,
          fontWeight: overlay.weight,
          color: overlay.color,
          lineHeight: 1.35,
          whiteSpace: "pre-line",
          // Shadow + Stroke via text-shadow (CSS is perfect, no Pillow bugs!)
          textShadow: `
            0 0 2px #000,
            0 0 2px #000,
            2px 2px 1px #000,
            -2px -2px 1px #000,
            2px -2px 1px #000,
            -2px 2px 1px #000,
            4px 6px 12px rgba(0,0,0,0.85)
          `,
        }}
      >
        {overlay.text}
      </span>
    </div>
  );
};

// ─── Main composition ────────────────────────────────────────────
export const P2Samurai: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Background video */}
      <Video
        src={staticFile("video/0419.mp4")}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        startFrom={0}
      />

      {/* Text layers */}
      {OVERLAYS.map((ov, i) => (
        <TextLayer key={i} overlay={ov} />
      ))}
    </AbsoluteFill>
  );
};
