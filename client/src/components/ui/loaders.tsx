import { useCallback, useEffect, useState } from "react";
import "./loaders.css";
import "../../styles/flow-gate-copy.css";

/**
 * Suspense fallback for lazy routes. The marker is present from the first
 * fallback frame so Flow Gate can distinguish a genuinely pending route from a
 * ready one. The visual waits briefly to avoid flashing on fast navigation.
 */
export function PageLoader() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShow(true), 180);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      dir="rtl"
      data-aqv-loader
      data-visible={show ? "true" : "false"}
      className="aqv-loader"
      role="status"
      aria-live="polite"
      aria-label="جارٍ تحميل الصفحة"
    >
      <div className="aqv-loader__progress" aria-hidden="true" />
      <div className="aqv-loader__stage" aria-hidden="true">
        <img
          src="/brand/aquavo-v2-icon.svg"
          alt=""
          width={48}
          height={48}
          className="aqv-loader__logo"
        />
      </div>
      <p className="aqv-loader__text" aria-hidden="true">العمق يتشكّل…</p>
    </div>
  );
}

interface AppInitLoaderProps {
  onDone: () => void;
}

/** Legacy safety fallback for storage-restricted browsers. */
export function AppInitLoader({ onDone }: AppInitLoaderProps) {
  const [hidden, setHidden] = useState(false);
  const triggerDone = useCallback(onDone, [onDone]);

  useEffect(() => {
    const hideTimer = window.setTimeout(() => setHidden(true), 320);
    const doneTimer = window.setTimeout(() => triggerDone(), 420);
    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(doneTimer);
    };
  }, [triggerDone]);

  if (hidden) return null;

  return (
    <div dir="rtl" className="aqv-loader" data-visible="true" role="status" aria-label="جارٍ تحميل التطبيق">
      <div className="aqv-loader__stage" aria-hidden="true">
        <img src="/brand/aquavo-v2-icon.svg" alt="" width={48} height={48} className="aqv-loader__logo" />
      </div>
      <p className="aqv-loader__text" aria-hidden="true">العمق يتشكّل…</p>
    </div>
  );
}
