import { useEffect, useRef, useState, memo, Component, type ErrorInfo, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────── */

type ModelViewerElement = HTMLElement & {
  loaded?: boolean;
  jumpCameraToGoal?: () => void;
};

interface Product3DViewerProps {
  src: string;
  poster?: string;
  productName: string;
  pieceCode?: string;
  className?: string;
}

/* ──────────────────────────────────────────────────────────
   Self-contained ErrorBoundary — prevents 3D viewer crash
   from propagating to the page-level ErrorBoundary.
   ────────────────────────────────────────────────────────── */

interface ViewerErrorBoundaryState {
  hasError: boolean;
}

class ViewerErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  ViewerErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ViewerErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn("[Product3DViewer] ErrorBoundary caught:", error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

/* ──────────────────────────────────────────────────────────
   model-viewer loader — singleton promise
   ────────────────────────────────────────────────────────── */

let modelViewerReady: Promise<void> | null = null;
let modelViewerResolved = false; // track if already done — no spinner needed

function loadModelViewer(): Promise<void> {
  if (modelViewerReady) return modelViewerReady;
  modelViewerReady = import("@google/model-viewer")
    .then(() => {
      modelViewerResolved = true;
      /* custom element registered */
    })
    .catch((err) => {
      modelViewerReady = null;
      console.warn("[Product3DViewer] Failed to load @google/model-viewer:", err);
      throw err;
    });
  return modelViewerReady;
}

/* ──────────────────────────────────────────────────────────
   Shared UI fragments
   ────────────────────────────────────────────────────────── */

const MODEL_LOAD_ERROR_MESSAGE =
  "تعذر تحميل العرض ثلاثي الأبعاد حالياً، جرّب تحديث الصفحة أو تواصل معنا.";

function ViewerHeader({ pieceCode }: { pieceCode?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-white">عرض 3D للقطعة</p>
        <p className="mt-1 text-xs leading-5 text-white/65">
          لف القطعة وشوفها من كل زاوية قبل الشراء.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-2">
        <Badge className="bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/15">
          شوفها من كل زاوية
        </Badge>
        {pieceCode && (
          <Badge variant="outline" className="border-white/25 text-white">
            {pieceCode}
          </Badge>
        )}
      </div>
    </div>
  );
}

function ViewerFooter() {
  return (
    <div className="border-t border-white/10 px-4 py-3 text-xs leading-6 text-white/70">
      هذا المجسم ثلاثي الأبعاد مبني على تفاصيل وهيكل نفس القطعة الحقيقية حتى تشوف تفرعاتها من كل جهة قبل الشراء. تذكر أن ألوان المجسم تظل تقريبية بسبب اختلاف الرندرة الرقمية، وتعتبر الصور الفوتوغرافية هي مرجعك الأساسي لشكل القطعة.
    </div>
  );
}

const VIEWER_BG =
  "bg-[radial-gradient(circle_at_48%_38%,rgba(29,211,211,0.2),transparent_25%),radial-gradient(circle_at_76%_78%,rgba(255,123,90,0.1),transparent_23%),linear-gradient(145deg,#0B1E28_0%,#0B1E28_54%,#06111f_100%)]";

function ViewerShell({
  className,
  pieceCode,
  children,
}: {
  className?: string;
  pieceCode?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-primary/20 bg-[#0B1E28] shadow-[0_16px_50px_rgba(0,0,0,0.28)]",
        className
      )}
      aria-label="عرض المنتج ثلاثي الأبعاد"
      dir="rtl"
    >
      <ViewerHeader pieceCode={pieceCode} />
      {children}
      <ViewerFooter />
    </section>
  );
}

/* ──────────────────────────────────────────────────────────
   CSS keyframes (inserted once)
   ────────────────────────────────────────────────────────── */

const ANIMATION_CSS = `
  @keyframes horizontal-bounce {
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(3px); }
  }
  @keyframes horizontal-bounce-reverse {
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(-3px); }
  }
  .animate-horizontal-bounce {
    animation: horizontal-bounce 1.5s infinite ease-in-out;
  }
  .animate-horizontal-bounce-reverse {
    animation: horizontal-bounce-reverse 1.5s infinite ease-in-out;
  }
`;

/* ──────────────────────────────────────────────────────────
   Drag overlay hint
   ────────────────────────────────────────────────────────── */

function DragOverlay({ visible }: { visible: boolean }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 items-center justify-center transition-all duration-700 ease-out select-none",
        visible
          ? "translate-y-0 scale-100 opacity-100"
          : "translate-y-2 scale-95 opacity-0"
      )}
    >
      <div className="flex max-w-[290px] items-center gap-3 rounded-full border border-cyan-500/20 bg-[#0B1E28]/85 px-4 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md sm:max-w-md">
        <svg
          className="h-4 w-4 shrink-0 animate-horizontal-bounce-reverse text-cyan-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        <svg
          className="h-5 w-5 shrink-0 animate-pulse text-white/95"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5" />
          <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6" />
          <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4.5" />
          <path d="M6 10V8a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v9a4 4 0 0 0 4 4h7a5 5 0 0 0 5-5v-5" />
        </svg>
        <p className="whitespace-nowrap text-[11px] font-medium leading-none text-white/90">
          اسحب يمين أو يسار حتى تشوف القطعة من كل زاوية
        </p>
        <svg
          className="h-4 w-4 shrink-0 animate-horizontal-bounce text-cyan-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Inner viewer (only mounts when model-viewer library is ready)
   ────────────────────────────────────────────────────────── */

function ModelViewerInner({
  src,
  poster,
  productName,
}: {
  src: string;
  poster?: string;
  productName: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<ModelViewerElement | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [viewerError, setViewerError] = useState(false);

  // Cache-bust the GLB URL
  const busterSrc = src
    ? `${src}${src.includes("?") ? "&" : "?"}v=20260610`
    : src;

  // Create the <model-viewer> element imperatively via DOM API
  // This avoids React's createElement which can throw if the custom element
  // registration has subtle issues.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let viewer: ModelViewerElement | null = null;

    try {
      viewer = document.createElement("model-viewer") as ModelViewerElement;
      viewer.setAttribute("src", busterSrc);
      if (poster) viewer.setAttribute("poster", poster);
      viewer.setAttribute("alt", `عرض ثلاثي الأبعاد للمنتج ${productName}`);
      viewer.setAttribute("dir", "ltr");
      viewer.setAttribute("camera-controls", "");
      viewer.setAttribute("shadow-intensity", "0.9");
      viewer.setAttribute("shadow-softness", "0.82");
      viewer.setAttribute("environment-image", "neutral");
      viewer.setAttribute("tone-mapping", "neutral");
      viewer.setAttribute("exposure", "1.0");
      viewer.setAttribute("field-of-view", "28deg");
      viewer.setAttribute("camera-orbit", "145deg 71deg 118%");
      viewer.setAttribute("min-camera-orbit", "auto auto 55%");
      viewer.setAttribute("max-camera-orbit", "auto auto 260%");
      viewer.setAttribute("orbit-sensitivity", "1.1");
      viewer.setAttribute("zoom-sensitivity", "0.85");
      viewer.setAttribute("disable-pan", "");
      viewer.setAttribute("interaction-prompt", "none");
      viewer.setAttribute("touch-action", "pan-y");
      viewer.setAttribute("loading", "eager");
      viewer.setAttribute("reveal", "auto");
      viewer.style.cssText =
        "background:transparent;--poster-color:transparent;position:absolute;inset:0;width:100%;height:100%;";

      viewerRef.current = viewer;
      container.appendChild(viewer);
    } catch (err) {
      console.warn("[Product3DViewer] Failed to create model-viewer element:", err);
      setViewerError(true);
      return;
    }

    /* ── Motion animation ─────────────────────────── */

    const baseTheta = 145;
    const basePhi = 71;
    const baseRadius = 118;
    const orbitAmplitude = 4.0;
    const orbitCycleMs = 4000;
    let animationFrame: number | undefined;
    let hasUserInteracted = false;
    let overlayTimeout: ReturnType<typeof setTimeout> | undefined;

    const formatOrbit = (theta: number) =>
      `${theta.toFixed(2)}deg ${basePhi}deg ${baseRadius}%`;

    const jumpTo = (theta: number) => {
      try {
        viewer!.setAttribute("camera-orbit", formatOrbit(theta));
        viewer!.jumpCameraToGoal?.();
      } catch {
        /* element not yet upgraded */
      }
    };

    const stopMotion = () => {
      hasUserInteracted = true;
      setShowOverlay(false);
      if (overlayTimeout) {
        clearTimeout(overlayTimeout);
        overlayTimeout = undefined;
      }
      if (animationFrame !== undefined) {
        cancelAnimationFrame(animationFrame);
        animationFrame = undefined;
      }
    };

    const animate = (timestamp: number) => {
      if (hasUserInteracted) {
        animationFrame = undefined;
        return;
      }
      const progress = (timestamp % orbitCycleMs) / orbitCycleMs;
      const theta = baseTheta + Math.sin(progress * Math.PI * 2) * orbitAmplitude;
      jumpTo(theta);
      animationFrame = requestAnimationFrame(animate);
    };

    const startMotion = () => {
      if (hasUserInteracted || animationFrame !== undefined) return;
      jumpTo(baseTheta);
      animationFrame = requestAnimationFrame(animate);
      if (!overlayTimeout) {
        overlayTimeout = setTimeout(stopMotion, 6000);
      }
    };

    const handleLoad = () => {
      jumpTo(baseTheta);
      startMotion();
    };

    const handleCameraChange = (event: Event) => {
      const ce = event as CustomEvent<{ source: string }>;
      if (ce.detail?.source === "user-interaction") stopMotion();
    };

    const handleError = (event: Event) => {
      console.warn("[Product3DViewer] model-viewer error event:", event);
      setShowOverlay(false);
      setViewerError(true);
    };

    viewer.addEventListener("load", handleLoad);
    viewer.addEventListener("camera-change", handleCameraChange);
    viewer.addEventListener("error", handleError);

    jumpTo(baseTheta);
    startMotion();

    if (viewer.loaded) handleLoad();

    return () => {
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
      if (overlayTimeout) clearTimeout(overlayTimeout);
      try {
        viewer!.removeEventListener("load", handleLoad);
        viewer!.removeEventListener("camera-change", handleCameraChange);
        viewer!.removeEventListener("error", handleError);
        container.removeChild(viewer!);
      } catch {
        /* already removed */
      }
      viewerRef.current = null;
    };
  }, [busterSrc, poster, productName]);

  if (viewerError) {
    return (
      <div
        className={cn(
          "relative flex min-h-[320px] items-center justify-center overflow-hidden sm:min-h-[420px]",
          VIEWER_BG
        )}
      >
        {poster && (
          <img
            src={poster}
            alt={productName}
            className="absolute inset-0 h-full w-full object-contain"
          />
        )}
        <div className="relative z-10 mx-4 max-w-sm rounded-lg border border-white/15 bg-[#0B1E28]/85 px-4 py-3 text-center text-sm leading-6 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          {MODEL_LOAD_ERROR_MESSAGE}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative min-h-[320px] overflow-hidden sm:min-h-[420px]",
        VIEWER_BG
      )}
    >
      {/* model-viewer gets appended here imperatively */}
      <div ref={containerRef} className="absolute inset-0" />

      <style dangerouslySetInnerHTML={{ __html: ANIMATION_CSS }} />
      <DragOverlay visible={showOverlay} />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Main exported component
   ────────────────────────────────────────────────────────── */

export const Product3DViewer = memo(function Product3DViewer({
  src,
  poster,
  productName,
  pieceCode,
  className,
}: Product3DViewerProps) {
  // If the library already resolved before mount (module-level preload), skip
  // the async wait entirely — no spinner shown.
  const [libraryReady, setLibraryReady] = useState(() => modelViewerResolved);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (modelViewerResolved) return; // already done — nothing to wait for
    let cancelled = false;
    loadModelViewer()
      .then(() => {
        if (!cancelled) setLibraryReady(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fallback: show a clear error instead of implying a working 3D view.
  const fallbackContent = (
    <ViewerShell className={className} pieceCode={pieceCode}>
      <div
        className={cn(
          "relative flex min-h-[320px] items-center justify-center overflow-hidden sm:min-h-[420px]",
          VIEWER_BG
        )}
      >
        {poster && (
          <img
            src={poster}
            alt={productName}
            className="absolute inset-0 h-full w-full object-contain"
          />
        )}
        <div className="relative z-10 flex flex-col items-center gap-2 text-white/50">
          <p className="max-w-sm rounded-lg border border-white/15 bg-[#0B1E28]/85 px-4 py-3 text-center text-sm leading-6 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
            {MODEL_LOAD_ERROR_MESSAGE}
          </p>
        </div>
      </div>
    </ViewerShell>
  );

  // Library failed to load — show fallback with poster
  if (loadError) return fallbackContent;

  // Library still loading — show spinner
  if (!libraryReady) {
    return (
      <ViewerShell className={className} pieceCode={pieceCode}>
        <div
          className={cn(
            "relative flex min-h-[320px] items-center justify-center overflow-hidden sm:min-h-[420px]",
            VIEWER_BG
          )}
        >
          {poster && (
            <img
              src={poster}
              alt={productName}
              className="absolute inset-0 h-full w-full object-contain opacity-40"
            />
          )}
          <div className="relative z-10 flex flex-col items-center gap-3 text-white/60">
            <svg className="h-8 w-8 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-xs">جاري تحميل المجسم...</p>
          </div>
        </div>
      </ViewerShell>
    );
  }

  // Library ready — render the model viewer inside its own error boundary
  return (
    <ViewerErrorBoundary fallback={fallbackContent}>
      <ViewerShell className={className} pieceCode={pieceCode}>
        <ModelViewerInner
          src={src}
          poster={poster}
          productName={productName}
        />
      </ViewerShell>
    </ViewerErrorBoundary>
  );
});
