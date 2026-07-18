import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * PREVIEW-ONLY experimental motion prototype.
 *
 * This module is intentionally isolated. It is only ever built on the
 * `prototype/aquavo-product-motion` branch (never merged into main), and the
 * on-screen control additionally hides itself on the production domains, so it
 * can never appear on the live site even if this branch were deployed by
 * accident. The official static, no-motion experience is the default; motion
 * is strictly opt-in per Preview session.
 */

const STORAGE_KEY = "aqv-motion-prototype";

/** True only when NOT on a production AQUAVO domain (i.e. on a Preview URL). */
export function isPrototypeEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  return !/(^|\.)aquavoiq\.com$/i.test(window.location.hostname);
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface MotionPrototypeValue {
  /** Whether the experimental motion experience is active this session. */
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  /** Motion should actually run (enabled AND user has not requested reduced motion). */
  motionActive: boolean;
}

const MotionPrototypeContext = createContext<MotionPrototypeValue>({
  enabled: false,
  setEnabled: () => {},
  motionActive: false,
});

export function MotionPrototypeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    try {
      sessionStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<MotionPrototypeValue>(
    () => ({ enabled, setEnabled, motionActive: enabled && !prefersReducedMotion() }),
    [enabled, setEnabled]
  );

  return <MotionPrototypeContext.Provider value={value}>{children}</MotionPrototypeContext.Provider>;
}

export function useMotionPrototype(): MotionPrototypeValue {
  return useContext(MotionPrototypeContext);
}

/**
 * Small floating Preview control that switches between the current static
 * experience ("Original") and the experimental motion experience.
 * Renders nothing on production domains.
 */
export function PrototypeControl() {
  const { enabled, setEnabled } = useMotionPrototype();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isPrototypeEnvironment());
  }, []);

  if (!visible) return null;

  return (
    <div
      dir="rtl"
      style={{ position: "fixed", bottom: 16, insetInlineStart: 16, zIndex: 2147483000 }}
      className="rounded-full border border-border bg-card/95 px-1.5 py-1.5 shadow-lg backdrop-blur"
      role="group"
      aria-label="معاينة: تبديل نمط الحركة (Preview only)"
    >
      <div className="flex items-center gap-1">
        <span className="px-2 text-[10px] font-bold text-muted-foreground">تجريبي</span>
        <button
          type="button"
          onClick={() => setEnabled(false)}
          aria-pressed={!enabled}
          className={`min-h-9 rounded-full px-3 text-xs font-semibold ${
            !enabled ? "bg-primary text-white" : "text-foreground hover:bg-foreground/5"
          }`}
        >
          الأصلي
        </button>
        <button
          type="button"
          onClick={() => setEnabled(true)}
          aria-pressed={enabled}
          className={`min-h-9 rounded-full px-3 text-xs font-semibold ${
            enabled ? "bg-primary text-white" : "text-foreground hover:bg-foreground/5"
          }`}
        >
          الحركة التجريبية
        </button>
      </div>
    </div>
  );
}
