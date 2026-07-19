import { useCallback, useEffect, useRef, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { useLocation } from "wouter";
import { runFlowGate, runFlowGateReverse, supportsFlowGate } from "./flow-gate";
import { prefersReducedMotion } from "./reduced-motion";
import { flowDirection, isEligibleSection, normalizeSectionPath } from "./flow-gate-routes";

/**
 * Flow Gate wiring (Production).
 *
 * The gate is the normal experience for eligible principal top-level
 * navigations — no Preview control, no session toggle, no domain guard. It is
 * gated only by feature support and prefers-reduced-motion (both handled inside
 * runFlowGate), exactly like the shipped product motions. The provider only
 * needs to add the browser Back/Forward reverse gesture; the navigation itself
 * is driven by the useFlowGateNav hook on eligible links.
 */

export function FlowGateProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const lastPathRef = useRef<string>(typeof window !== "undefined" ? window.location.pathname : "/");

  useEffect(() => {
    lastPathRef.current = normalizeSectionPath(location);
  }, [location]);

  // Browser Back / Forward → a reveal-only reverse gesture (never re-navigates).
  useEffect(() => {
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
  }, []);

  return <>{children}</>;
}

/**
 * Returns an onClick handler for an eligible top-level navigation link.
 *
 * - Ineligible links, modified clicks (new tab / download), non-primary buttons,
 *   unsupported browsers and reduced-motion all fall through to the underlying
 *   wouter <Link>, which navigates exactly as today.
 * - Otherwise it intercepts the plain-left click and runs the Flow Gate (which
 *   performs the navigation itself, exactly once).
 */
export function useFlowGateNav() {
  const [location, navigate] = useLocation();

  return useCallback(
    (href: string, prefetch?: () => void) =>
      (e: ReactMouseEvent<HTMLElement>) => {
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
    [location, navigate]
  );
}
