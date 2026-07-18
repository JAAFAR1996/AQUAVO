import { useCallback, useEffect, useState } from "react";

/**
 * Static loading indicators. All motion (fish-draw, pulsing dots, aurora,
 * scan-line, glow, fade) has been removed; loaders are now a static logo +
 * static text on a light surface. Dark Mode keeps a readable surface via the
 * theme tokens on the surrounding page.
 */
export function PageLoader() {
  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "18px",
        background: "#F6F4EF",
        color: "#0B1E28",
      }}
    >
      <img src="/brand/aquavo-v2-icon.svg" alt="" aria-hidden="true" width={64} height={64} />
      <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "#0B1E28" }} role="status">
        جاري التحميل…
      </p>
    </div>
  );
}

interface AppInitLoaderProps {
  onDone: () => void;
}

export function AppInitLoader({ onDone }: AppInitLoaderProps) {
  const [hidden, setHidden] = useState(false);
  const triggerDone = useCallback(onDone, [onDone]);

  useEffect(() => {
    // Preserve the short init gate, but with no fade animation.
    const hideTimer = window.setTimeout(() => setHidden(true), 300);
    const doneTimer = window.setTimeout(() => triggerDone(), 500);
    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(doneTimer);
    };
  }, [triggerDone]);

  if (hidden) return null;

  return (
    <div
      dir="rtl"
      style={{
        position: "fixed",
        inset: 0,
        background: "#F6F4EF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "18px",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          fontFamily: '"Segoe UI", system-ui, sans-serif',
          fontSize: "2.6rem",
          fontWeight: 800,
          letterSpacing: "6px",
          color: "#0B93A6",
        }}
      >
        AQUAVO
      </div>
      <p style={{ color: "#0B1E28", fontSize: "0.8rem", letterSpacing: "2px" }}>
        أحواض السمك والمعدات المائية
      </p>
    </div>
  );
}
