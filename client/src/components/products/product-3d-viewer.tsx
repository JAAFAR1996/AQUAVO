import { createElement, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ModelViewerElement = HTMLElement & {
  loaded?: boolean;
  jumpCameraToGoal?: () => void;
  resetTurntableRotation?: () => void;
};

interface Product3DViewerProps {
  src: string;
  poster?: string;
  productName: string;
  pieceCode?: string;
  className?: string;
}

export function Product3DViewer({
  src,
  poster,
  productName,
  pieceCode,
  className,
}: Product3DViewerProps) {
  const modelRef = useRef<ModelViewerElement | null>(null);

  useEffect(() => {
    void import("@google/model-viewer");
  }, []);

  useEffect(() => {
    const viewer = modelRef.current;
    if (!viewer) return;

    let autoRotateTimer: number | undefined;
    let observer: IntersectionObserver | undefined;
    let isVisible = false;
    let hasStartedAutoRotate = false;

    const setProductAngle = () => {
      viewer.setAttribute("camera-orbit", "145deg 71deg 118%");
      viewer.jumpCameraToGoal?.();
    };

    const startAutoRotateFromProductAngle = () => {
      if (hasStartedAutoRotate) return;

      hasStartedAutoRotate = true;
      setProductAngle();

      autoRotateTimer = window.setTimeout(() => {
        viewer.resetTurntableRotation?.();
        viewer.setAttribute("auto-rotate", "");
      }, 900);
    };

    const startWhenVisibleAndLoaded = () => {
      if (isVisible && viewer.loaded) {
        startAutoRotateFromProductAngle();
      }
    };

    const pauseAutoRotate = () => {
      if (autoRotateTimer !== undefined) {
        window.clearTimeout(autoRotateTimer);
      }
      viewer.removeAttribute("auto-rotate");
    };

    viewer.removeAttribute("auto-rotate");
    setProductAngle();

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            isVisible = true;
            setProductAngle();
            startWhenVisibleAndLoaded();
            observer?.disconnect();
          }
        },
        { threshold: 0.35 }
      );
      observer.observe(viewer);
    } else {
      isVisible = true;
      startWhenVisibleAndLoaded();
    }

    viewer.addEventListener("load", startWhenVisibleAndLoaded);
    viewer.addEventListener("pointerdown", pauseAutoRotate, { once: true });
    viewer.addEventListener("touchstart", pauseAutoRotate, { once: true });

    startWhenVisibleAndLoaded();

    return () => {
      if (autoRotateTimer !== undefined) {
        window.clearTimeout(autoRotateTimer);
      }
      observer?.disconnect();
      viewer.removeEventListener("load", startWhenVisibleAndLoaded);
      viewer.removeEventListener("pointerdown", pauseAutoRotate);
      viewer.removeEventListener("touchstart", pauseAutoRotate);
    };
  }, [src]);

  const modelViewer = createElement("model-viewer", {
    ref: modelRef,
    src,
    poster,
    alt: `عرض ثلاثي الأبعاد للمنتج ${productName}`,
    "camera-controls": true,
    "auto-rotate-delay": "2200",
    "rotation-per-second": "7deg",
    "shadow-intensity": "0.9",
    "shadow-softness": "0.82",
    "environment-image": "neutral",
    exposure: "0.45",
    "tone-mapping": "aces",
    "field-of-view": "28deg",
    "camera-orbit": "145deg 71deg 118%",
    "min-camera-orbit": "auto auto 55%",
    "max-camera-orbit": "auto auto 260%",
    "orbit-sensitivity": "1.1",
    "zoom-sensitivity": "0.85",
    "disable-pan": true,
    "interaction-prompt": "auto",
    "interaction-prompt-style": "basic",
    "interaction-prompt-threshold": "1200",
    "touch-action": "none",
    loading: "lazy",
    reveal: "auto",
    className: "absolute inset-0 h-full w-full",
  } as Record<string, unknown>);

  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-primary/20 bg-[#010611] shadow-[0_16px_50px_rgba(0,0,0,0.28)]",
        className
      )}
      aria-label="عرض المنتج ثلاثي الأبعاد"
      dir="rtl"
    >
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

      <div className="relative min-h-[320px] overflow-hidden bg-[radial-gradient(circle_at_48%_38%,rgba(29,211,211,0.2),transparent_25%),radial-gradient(circle_at_76%_78%,rgba(255,123,90,0.1),transparent_23%),linear-gradient(145deg,#010611_0%,#0A1628_54%,#06111f_100%)] sm:min-h-[420px]">
        {modelViewer}
      </div>

      <div className="border-t border-white/10 px-4 py-3 text-xs leading-6 text-white/70">
        هذا العرض مبني على موديل GLB لنفس القطعة، مو صورة تمثيلية عامة.
      </div>
    </section>
  );
}
