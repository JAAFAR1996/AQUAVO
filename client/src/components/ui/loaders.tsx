import { useCallback, useEffect, useState } from "react";
import "./loaders.css";

/**
 * Branded, theme-aware loading indicators. All colors derive from the app
 * theme tokens (--background / --foreground / --primary) so the loaders match
 * the selected light/dark theme with no flash. Motion is CSS-only and gated
 * behind prefers-reduced-motion (see loaders.css).
 */

/**
 * Suspense fallback for lazy routes. Shows an animated AQUAVO logo with a water
 * ripple, rising bubbles and a top progress shimmer. A ~140ms delay avoids
 * flashing the loader on fast navigations; after that it fades in. Because it
 * is a Suspense fallback it unmounts automatically once the route resolves.
 */
export function PageLoader() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShow(true), 140);
    return () => window.clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div
      dir="rtl"
      data-aqv-loader
      data-visible="true"
      className="aqv-loader"
      role="status"
      aria-live="polite"
      aria-label="جارٍ تحميل الصفحة"
    >
      <div className="aqv-loader__progress" aria-hidden="true" />

      <div className="aqv-loader__stage" aria-hidden="true">
        <span className="aqv-loader__ring aqv-loader__ring--1" />
        <span className="aqv-loader__ring aqv-loader__ring--2" />
        <img
          src="/brand/aquavo-v2-icon.svg"
          alt=""
          aria-hidden="true"
          width={64}
          height={64}
          className="aqv-loader__logo"
        />
        <div className="aqv-loader__bubbles">
          <span className="aqv-loader__bubble aqv-loader__bubble--1" />
          <span className="aqv-loader__bubble aqv-loader__bubble--2" />
          <span className="aqv-loader__bubble aqv-loader__bubble--3" />
        </div>
      </div>

      {/* aria-hidden: the live region already announces via aria-label, so the
          visible text is decorative to AT (prevents a double announcement). */}
      <p className="aqv-loader__text" aria-hidden="true">جارٍ تجهيز الصفحة...</p>
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
    // Preserve the short init gate timing.
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
      className="aqv-init"
      role="status"
      aria-live="polite"
      aria-label="جارٍ تحميل التطبيق"
    >
      <div className="aqv-init__wordmark" aria-hidden="true">
        AQUAVO
      </div>
      <p className="aqv-init__tagline" aria-hidden="true">أحواض السمك والمعدات المائية</p>
      <div className="aqv-init__bar" aria-hidden="true" />
    </div>
  );
}
