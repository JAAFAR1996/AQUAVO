import { useCallback, useEffect, useRef, useState } from "react";
import "./loaders.css";
import "../../styles/flow-gate-copy.css";
import { i18next } from "@/i18n";
import { LogoTraceLoader } from "./logo-trace-loader";

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
      aria-label={i18next.t("errors:loader.page")}
    >
      <div className="aqv-loader__stage" aria-hidden="true">
        <LogoTraceLoader loading size={132} strokeWidth={3} className="aqv-loader__logo" ariaLabel={i18next.t("errors:loader.page")} />
      </div>
      <p className="aqv-loader__text" aria-hidden="true">{i18next.t("errors:loader.text")}</p>
    </div>
  );
}

interface AppInitLoaderProps {
  onDone: () => void;
}

/** Legacy safety fallback for storage-restricted browsers. */
export function AppInitLoader({ onDone }: AppInitLoaderProps) {
  const [hidden, setHidden] = useState(false);
  const finishedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const triggerDone = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setHidden(true);
    onDoneRef.current();
  }, []);

  // Let the real vector fill finish rather than hiding at 320ms, while a
  // bounded fallback guarantees this legacy safety screen can never hang.
  useEffect(() => {
    const safetyTimer = window.setTimeout(triggerDone, 1000);
    return () => window.clearTimeout(safetyTimer);
  }, [triggerDone]);

  if (hidden) return null;

  return (
    <div dir={i18next.dir()} className="aqv-loader" data-visible="true" role="status" aria-label={i18next.t("errors:loader.app")}>
      <div className="aqv-loader__stage" aria-hidden="true">
        <LogoTraceLoader
          loading={false}
          size={132}
          strokeWidth={3}
          className="aqv-loader__logo"
          ariaLabel={i18next.t("errors:loader.app")}
          onDone={triggerDone}
        />
      </div>
      <p className="aqv-loader__text" aria-hidden="true">{i18next.t("errors:loader.text")}</p>
    </div>
  );
}
