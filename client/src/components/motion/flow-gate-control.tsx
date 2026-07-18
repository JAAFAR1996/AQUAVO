import { useFlowGate } from "@/lib/motion/flow-gate-context";

/**
 * Preview-only comparison control for the Flow Gate prototype.
 *
 * - Renders ONLY in Preview environments (hidden on aquavoiq.com / www).
 * - Session-scoped; defaults to "الأصلي" (exact current live behaviour).
 * - "بوابة AQUAVO" enables the new eligible top-level section transitions only.
 */
export function FlowGateControl() {
  const { controlVisible, mode, setMode } = useFlowGate();
  if (!controlVisible) return null;

  const base =
    "px-3 py-1.5 text-[12px] font-semibold rounded-full transition-colors min-h-9";
  const active = "bg-primary text-white shadow";
  const idle = "text-foreground/70 hover:text-foreground";

  return (
    <div
      dir="rtl"
      role="group"
      aria-label="معاينة: نمط الانتقال بين الأقسام"
      className="fixed bottom-4 left-1/2 z-[70] -translate-x-1/2 flex items-center gap-1 rounded-full border border-border bg-background/95 p-1 shadow-lg backdrop-blur-md"
    >
      <button
        type="button"
        onClick={() => setMode("original")}
        aria-pressed={mode === "original"}
        className={`${base} ${mode === "original" ? active : idle}`}
      >
        الأصلي
      </button>
      <button
        type="button"
        onClick={() => setMode("gate")}
        aria-pressed={mode === "gate"}
        className={`${base} ${mode === "gate" ? active : idle}`}
      >
        بوابة AQUAVO
      </button>
    </div>
  );
}
