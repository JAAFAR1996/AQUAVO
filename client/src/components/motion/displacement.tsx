import { Children, useEffect, useRef, useState, type ReactNode } from "react";

import {
  MOTION,
  isCompactViewport,
  prefersReducedMotion,
  refractionRing,
  setWaterLevel,
} from "@/lib/motion/displacement";
import { observeMembranes } from "@/lib/motion/membrane";

export function Membrane({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) observeMembranes(ref.current.parentNode ?? document);
  }, []);
  return (
    <div ref={ref} data-aqv-membrane data-aqv-motion="membrane" className={`aqv-membrane ${className}`}>
      {children}
    </div>
  );
}

export function MembraneGroup({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={className} data-aqv-motion="membrane-group">
      {Children.map(children, (child) => <Membrane>{child}</Membrane>)}
    </div>
  );
}

const LITRES = {
  small: { width: 180, height: 170 },
  medium: { width: 240, height: 210 },
  large: { width: 296, height: 226 },
} as const;

export function TankProgress({
  step,
  total = 9,
  size = "medium",
  cyclingStep = 5,
  label,
}: {
  step: number;
  total?: number;
  size?: keyof typeof LITRES;
  cyclingStep?: number;
  label: string;
}) {
  const water = useRef<HTMLDivElement>(null);
  const haze = useRef<HTMLDivElement>(null);
  const tank = useRef<HTMLDivElement>(null);
  const compact = isCompactViewport();

  useEffect(() => {
    setWaterLevel(water.current, 6 + (step / Math.max(1, total - 1)) * 86, "settle");
    if (haze.current) haze.current.style.opacity = step < cyclingStep ? "0.4" : "0";
    if (tank.current) {
      tank.current.style.boxShadow =
        step === total - 1 && !prefersReducedMotion()
          ? "0 0 46px rgba(127,227,239,.5)"
          : "none";
    }
  }, [step, total, cyclingStep]);

  const dimensions = compact
    ? { width: "100%", height: 44, borderRadius: 999 }
    : { ...LITRES[size], borderRadius: 10 };

  return (
    <div data-aqv-motion="tank-progress">
      <div
        ref={tank}
        aria-hidden="true"
        style={{
          position: "relative",
          overflow: "hidden",
          border: "2px solid var(--aqv-primary-45)",
          background: "linear-gradient(to bottom,#EDF6F7,#E2EFF1)",
          transition: `width ${MOTION.dur.calm}ms ${MOTION.ease.precision}, height ${MOTION.dur.calm}ms ${MOTION.ease.precision}, box-shadow ${MOTION.dur.signature}ms ${MOTION.ease.precision}`,
          ...dimensions,
        }}
      >
        <div
          ref={water}
          className="aqv-water-level"
          style={{
            position: "absolute",
            insetInline: 0,
            bottom: 0,
            height: "6%",
            background: "linear-gradient(to bottom,rgba(11,147,166,.55),rgba(11,100,166,.72))",
          }}
        >
          {!compact && (
            <div style={{ position: "absolute", insetInline: 0, top: -5, height: 10, overflow: "hidden" }}>
              <div
                className="aqv-surface-ripple"
                style={{
                  width: "200%",
                  height: "100%",
                  background: "repeating-radial-gradient(circle at 12px -6px,rgba(196,247,255,.9) 0 6px,transparent 6px 24px)",
                }}
              />
            </div>
          )}
        </div>
        <div
          ref={haze}
          className="aqv-water-haze"
          style={{
            position: "absolute",
            inset: 0,
            background: "var(--aqv-substrate)",
            opacity: 0.4,
            mixBlendMode: "soft-light",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            insetInline: 0,
            bottom: 0,
            height: 14,
            background: "linear-gradient(to bottom,rgba(201,174,140,.2),rgba(201,174,140,.85))",
          }}
        />
      </div>
      <p
        role="status"
        style={{
          margin: "12px 0 0",
          font: "700 13px Cairo,sans-serif",
          color: "var(--aqv-primary-shade)",
          textAlign: compact ? "start" : "center",
        }}
      >
        {label} · {Math.round((step / Math.max(1, total - 1)) * 100)}% مكتمل
      </p>
    </div>
  );
}

export function SurfaceBreak({ confirmed, children }: { confirmed: boolean; children: ReactNode }) {
  const stage = useRef<HTMLDivElement>(null);
  const water = useRef<HTMLDivElement>(null);
  const played = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !confirmed || played.current) return;
    played.current = true;
    const layer = water.current;
    if (!layer) return;
    if (prefersReducedMotion()) {
      layer.style.display = "none";
      return;
    }

    layer.style.transition = "none";
    layer.style.height = "100%";
    requestAnimationFrame(() => {
      layer.style.transition = `height ${isCompactViewport() ? MOTION.dur.calm : MOTION.dur.settle}ms ${MOTION.ease.precision}`;
      requestAnimationFrame(() => { layer.style.height = "0%"; });
    });
    const id = window.setTimeout(
      () => refractionRing(stage.current, undefined, undefined, 40),
      isCompactViewport() ? 420 : 620,
    );
    return () => window.clearTimeout(id);
  }, [confirmed, mounted]);

  return (
    <div ref={stage} style={{ position: "relative" }} data-aqv-motion="surface-break">
      {children}
      {mounted && confirmed && !prefersReducedMotion() && (
        <div
          ref={water}
          aria-hidden="true"
          style={{
            position: "absolute",
            insetInline: 0,
            top: 0,
            height: "100%",
            background: "linear-gradient(to bottom,var(--aqv-primary),var(--aqv-flowline))",
            pointerEvents: "none",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingBottom: 20,
            zIndex: 20,
            borderRadius: "inherit",
            overflow: "hidden",
          }}
        >
          <span style={{ font: "700 13px Cairo,sans-serif", color: "rgba(255,255,255,.9)" }}>
            نثبّت الطلب…
          </span>
        </div>
      )}
    </div>
  );
}

export function acknowledgeAdd(button: HTMLElement | null) {
  refractionRing(button, undefined, undefined, 30);
}
