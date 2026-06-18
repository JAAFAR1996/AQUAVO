import { useMemo } from "react";

/**
 * UnderwaterAmbiance — AQUAVO signature ambient layer.
 * GPU-cheap, decorative-only (pointer-events-none, aria-hidden), sits behind content.
 * Renders drifting caustic light, soft god-rays, and rising bubbles.
 *
 * Respects reduced motion: when the OS requests reduced motion, the CSS
 * keyframes (defined in index.css, gated by @media) freeze to a static frame.
 */
interface UnderwaterAmbianceProps {
  /** Visual strength. "full" for heroes, "soft" for section backgrounds. */
  intensity?: "full" | "soft";
  /** Number of rising bubbles. Keep modest for performance. */
  bubbles?: number;
  className?: string;
}

interface Bubble {
  left: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
}

export function UnderwaterAmbiance({
  intensity = "full",
  bubbles = 16,
  className,
}: UnderwaterAmbianceProps) {
  // Stable randomized bubble field (computed once per mount)
  const field = useMemo<Bubble[]>(
    () =>
      Array.from({ length: bubbles }, () => ({
        left: Math.random() * 100,
        size: 4 + Math.random() * 16,
        delay: Math.random() * 8,
        duration: 7 + Math.random() * 9,
        drift: -30 + Math.random() * 60,
      })),
    [bubbles],
  );

  const isFull = intensity === "full";

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
    >
      {/* Caustic light — two drifting radial-gradient sheets */}
      <div
        className="aq-caustics absolute inset-0"
        style={{ opacity: isFull ? 0.55 : 0.3 }}
      />
      <div
        className="aq-caustics aq-caustics--alt absolute inset-0"
        style={{ opacity: isFull ? 0.4 : 0.22 }}
      />

      {/* God-rays — soft light shafts from the surface */}
      {isFull && <div className="aq-godrays absolute inset-x-0 top-0 h-2/3" />}

      {/* Rising bubbles */}
      {field.map((b, i) => (
        <span
          key={i}
          className="aq-bubble"
          style={{
            left: `${b.left}%`,
            width: `${b.size}px`,
            height: `${b.size}px`,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
            ["--aq-drift" as string]: `${b.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
