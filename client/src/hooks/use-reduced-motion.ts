import { useEffect, useState } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function readPreference(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Live-updating read of the user's OS-level "reduce motion" preference.
 *
 * Use this for any non-CSS (JS-driven) motion decision — e.g. skipping an
 * IntersectionObserver-triggered reveal, or gating a manual rAF animation.
 * Purely CSS animations/transitions are already covered globally by the
 * `@media (prefers-reduced-motion: reduce)` block in `client/src/index.css`,
 * and framer-motion components are covered by the app-wide
 * `<MotionConfig reducedMotion="user">` provider — you don't need this hook
 * for those.
 *
 * Never use the returned value to hide content or controls; only to skip or
 * shorten decorative movement.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(readPreference);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const handleChange = (event: MediaQueryListEvent) => setReduced(event.matches);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    // Safari <14 fallback
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return reduced;
}

/** Non-hook, one-off check for use outside React render (e.g. before mount). */
export function prefersReducedMotion(): boolean {
  return readPreference();
}
