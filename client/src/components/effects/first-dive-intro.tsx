import { useEffect, useState } from "react";

const FIRST_DIVE_KEY = "aquavo_first_dive_seen_v2";

/**
 * One non-blocking brand reveal for the visitor's first-ever browser visit.
 * App content renders underneath immediately; the surface split is decorative,
 * pointer-transparent and permanently suppressed after its first run.
 */
export function FirstDiveIntro() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(FIRST_DIVE_KEY) === "1") return;
      window.localStorage.setItem(FIRST_DIVE_KEY, "1");
      setVisible(true);
    } catch {
      // Storage-restricted browsers simply skip the decorative first visit.
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setVisible(false), 920);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="aqv-first-dive" data-aqv-motion="first-dive" aria-hidden="true">
      <img className="aqv-first-dive__mark" src="/brand/aquavo-v2-icon.svg" alt="" width={68} height={68} />
      <span className="aqv-first-dive__line" />
    </div>
  );
}
