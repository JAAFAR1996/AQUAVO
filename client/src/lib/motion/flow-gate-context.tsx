import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { useLocation } from "wouter";
import { runFlowGate, runFlowGateReverse, supportsFlowGate } from "./flow-gate";
import { prefersReducedMotion } from "./reduced-motion";
import { flowDirection, isEligibleSection, normalizeSectionPath } from "./flow-gate-routes";

/**
 * Preview-only Flow Gate mode. Session-scoped, defaults to "original" (the exact
 * current live behaviour). The control is hidden — and the gate is inert — on
 * the production domains, so nothing here can ever affect Production.
 */

type FlowGateMode = "original" | "gate";

const STORAGE_KEY = "aqv-flowgate-mode";
const PRODUCTION_HOSTS = new Set(["aquavoiq.com", "www.aquavoiq.com"]);

/** Feature/environment: the prototype control is Preview-only, never Production. */
export function isFlowGatePreviewEnv(): boolean {
  if (typeof window === "undefined") return false;
  return !PRODUCTION_HOSTS.has(window.location.hostname);
}

interface FlowGateContextValue {
  mode: FlowGateMode;
  setMode: (m: FlowGateMode) => void;
  /** Control is rendered only in Preview environments. */
  controlVisible: boolean;
  /** Gate actually runs only when enabled in a Preview environment. */
  gateActive: boolean;
}

const FlowGateContext = createContext<FlowGateContextValue | null>(null);

export function FlowGateProvider({ children }: { children: ReactNode }) {
  const controlVisible = useMemo(() => isFlowGatePreviewEnv(), []);
  const [mode, setModeState] = useState<FlowGateMode>("original");
  const [location] = useLocation();
  const lastPathRef = useRef<string>(typeof window !== "undefined" ? window.location.pathname : "/");

  // Restore the session-scoped choice (Preview only).
  useEffect(() => {
    if (!controlVisible) return;
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved === "gate" || saved === "original") setModeState(saved);
    } catch {
      /* ignore */
    }
  }, [controlVisible]);

  const setMode = useCallback((m: FlowGateMode) => {
    setModeState(m);
    try {
      sessionStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* ignore */
    }
  }, []);

  const gateActive = controlVisible && mode === "gate";

  // Keep the last path in sync so a popstate can compute a spatial direction.
  useEffect(() => {
    lastPathRef.current = normalizeSectionPath(location);
  }, [location]);

  // Browser Back / Forward → a reveal-only reverse gesture (never re-navigates).
  useEffect(() => {
    if (!gateActive) return;
    const onPop = () => {
      const from = lastPathRef.current;
      const to = normalizeSectionPath(window.location.pathname);
      lastPathRef.current = to;
      if (prefersReducedMotion() || !supportsFlowGate()) return;
      if (!isEligibleSection(to) && !isEligibleSection(from)) return;
      void runFlowGateReverse(flowDirection(from, to));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [gateActive]);

  const value = useMemo<FlowGateContextValue>(
    () => ({ mode, setMode, controlVisible, gateActive }),
    [mode, setMode, controlVisible, gateActive]
  );

  return <FlowGateContext.Provider value={value}>{children}</FlowGateContext.Provider>;
}

export function useFlowGate(): FlowGateContextValue {
  const ctx = useContext(FlowGateContext);
  if (!ctx) {
    // Safe default when the provider is absent (e.g. isolated tests): inert.
    return { mode: "original", setMode: () => {}, controlVisible: false, gateActive: false };
  }
  return ctx;
}

/**
 * Returns an onClick handler for an eligible top-level navigation link.
 *
 * - Original mode (or ineligible / modified click / unsupported): returns a
 *   no-op — the underlying wouter <Link> navigates exactly as it does today.
 * - Gate mode: intercepts the plain-left click, prevents the default SPA
 *   navigation, and runs the Flow Gate (which performs the navigation itself).
 */
export function useFlowGateNav() {
  const [location, navigate] = useLocation();
  const { gateActive } = useFlowGate();

  return useCallback(
    (href: string, prefetch?: () => void) =>
      (e: ReactMouseEvent<HTMLElement>) => {
        if (!gateActive) return; // original behaviour — do not touch the click
        if (!isEligibleSection(href)) return;
        if (!supportsFlowGate()) return; // immediate fallback via the normal Link

        // Respect modified clicks (new tab / download) and non-primary buttons.
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        const to = normalizeSectionPath(href);
        if (normalizeSectionPath(location) === to) return; // same section — no gate

        e.preventDefault();
        void runFlowGate({
          navigate: () => navigate(to),
          direction: flowDirection(location, href),
          triggerEl: e.currentTarget,
          prefetch,
        });
      },
    [gateActive, location, navigate]
  );
}
