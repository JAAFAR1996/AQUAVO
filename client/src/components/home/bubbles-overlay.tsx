import { useMemo } from "react";

// Floating bubbles overlay (2026) — calm, brand-aligned aquatic motion for the
// hero. Pure CSS animation (transform/opacity only), ~14 bubbles, GPU-friendly.
// Decorative + pointer-events-none, and fully disabled under reduced-motion.

interface Bubble {
  left: number;      // %
  size: number;      // px
  delay: number;     // s
  duration: number;  // s
  drift: number;     // px sideways sway
}

export function BubblesOverlay({ count }: { count?: number }) {
  // Fewer bubbles on phones / data-saver / reduced-motion — they cost compositor
  // layers and were a real source of jank on low-end devices.
  const resolvedCount = useMemo(() => {
    if (count != null) return count;
    if (typeof window === "undefined") return 0;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return 0;
    const saveData = Boolean((navigator as any).connection?.saveData);
    if (saveData) return 0;
    const isMobile = window.matchMedia?.("(max-width: 768px)").matches;
    return isMobile ? 5 : 12;
  }, [count]);

  const bubbles = useMemo<Bubble[]>(() => {
    return Array.from({ length: resolvedCount }, () => ({
      left: Math.random() * 100,
      size: 6 + Math.random() * 18,
      delay: Math.random() * 8,
      duration: 9 + Math.random() * 8,
      drift: (Math.random() - 0.5) * 40,
    }));
  }, [resolvedCount]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden z-[15] motion-reduce:hidden"
    >
      {bubbles.map((b, i) => (
        <span
          key={i}
          className="bubble-rise absolute bottom-[-40px] rounded-full"
          style={{
            left: `${b.left}%`,
            width: `${b.size}px`,
            height: `${b.size}px`,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
            // @ts-expect-error — CSS custom property for the keyframe sway
            "--drift": `${b.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
