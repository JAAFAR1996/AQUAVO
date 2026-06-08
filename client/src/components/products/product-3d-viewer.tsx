import { createElement, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ModelViewerElement = HTMLElement & {
  loaded?: boolean;
  jumpCameraToGoal?: () => void;
  model?: {
    materials?: Array<{
      pbrMetallicRoughness?: {
        setRoughnessFactor?: (roughness: number) => void;
        setMetallicFactor?: (metallic: number) => void;
      };
    }>;
  };
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
    // The package does not ship declarations for the prebuilt browser bundle.
    // @ts-expect-error See runtime import path above.
    void import("@google/model-viewer/dist/model-viewer.min.js");
  }, []);

  useEffect(() => {
    const viewer = modelRef.current;
    if (!viewer) return;

    const baseTheta = 145;
    const basePhi = 71;
    const baseRadius = 118;
    const orbitAmplitude = 3.5;
    const orbitCycleMs = 11000;
    let animationFrame: number | undefined;
    let observer: IntersectionObserver | undefined;
    let isVisible = false;
    let isLoaded = Boolean(viewer.loaded);
    let hasUserInteracted = false;

    const formatCameraOrbit = (theta: number) =>
      `${theta.toFixed(2)}deg ${basePhi}deg ${baseRadius}%`;

    const setProductAngle = () => {
      viewer.setAttribute("camera-orbit", formatCameraOrbit(baseTheta));
      viewer.jumpCameraToGoal?.();
    };

    const stopSubtleMotion = () => {
      hasUserInteracted = true;

      if (animationFrame !== undefined) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = undefined;
      }
    };

    const animateCameraOrbit = (timestamp: number) => {
      if (hasUserInteracted || !isVisible || !isLoaded) {
        animationFrame = undefined;
        return;
      }

      const progress = (timestamp % orbitCycleMs) / orbitCycleMs;
      const theta =
        baseTheta + Math.sin(progress * Math.PI * 2) * orbitAmplitude;
      viewer.setAttribute("camera-orbit", formatCameraOrbit(theta));
      animationFrame = window.requestAnimationFrame(animateCameraOrbit);
    };

    const startSubtleMotion = () => {
      if (!isVisible || !isLoaded || hasUserInteracted || animationFrame !== undefined) {
        return;
      }

      setProductAngle();
      animationFrame = window.requestAnimationFrame(animateCameraOrbit);
    };

    const applyMaterial = () => {
      const materials = viewer.model?.materials ?? [];
      materials.forEach((material) => {
        const pbr = material.pbrMetallicRoughness;
        pbr?.setRoughnessFactor?.(0.98);
        pbr?.setMetallicFactor?.(0);
      });
    };

    const handleLoad = () => {
      isLoaded = true;
      applyMaterial();
      setProductAngle();
      startSubtleMotion();
    };

    viewer.removeAttribute("auto-rotate");
    setProductAngle();

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            isVisible = true;
            setProductAngle();
            startSubtleMotion();
            observer?.disconnect();
          }
        },
        { threshold: 0.35 }
      );
      observer.observe(viewer);
    } else {
      isVisible = true;
      startSubtleMotion();
    }

    viewer.addEventListener("load", handleLoad);
    viewer.addEventListener("pointerdown", stopSubtleMotion);
    viewer.addEventListener("touchstart", stopSubtleMotion, { passive: true });
    viewer.addEventListener("wheel", stopSubtleMotion, { passive: true });
    viewer.addEventListener("keydown", stopSubtleMotion);

    if (viewer.loaded) {
      handleLoad();
    }

    return () => {
      if (animationFrame !== undefined) {
        window.cancelAnimationFrame(animationFrame);
      }
      observer?.disconnect();
      viewer.removeEventListener("load", handleLoad);
      viewer.removeEventListener("pointerdown", stopSubtleMotion);
      viewer.removeEventListener("touchstart", stopSubtleMotion);
      viewer.removeEventListener("wheel", stopSubtleMotion);
      viewer.removeEventListener("keydown", stopSubtleMotion);
    };
  }, [src]);

  const modelViewer = createElement("model-viewer", {
    ref: modelRef,
    src,
    poster,
    alt: `عرض ثلاثي الأبعاد للمنتج ${productName}`,
    "camera-controls": true,
    "shadow-intensity": "0.9",
    "shadow-softness": "0.82",
    "environment-image": "neutral",
    exposure: "0.55",
    "field-of-view": "28deg",
    "camera-orbit": "145deg 71deg 118%",
    "min-camera-orbit": "auto auto 55%",
    "max-camera-orbit": "auto auto 260%",
    "orbit-sensitivity": "1.1",
    "zoom-sensitivity": "0.85",
    "disable-pan": true,
    "interaction-prompt": "none",
    "touch-action": "pan-y",
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
        هذا المجسم ثلاثي الأبعاد مبني على تفاصيل وهيكل نفس القطعة الحقيقية حتى تعاين تفرعاتها بدقة من كل جهة قبل الشراء. تذكر أن ألوان المجسم تظل تقريبية بسبب اختلاف الرندرة الرقمية، وتعتبر الصور الفوتوغرافية هي مرجعك الأساسي للون الخشبة الفعلي.
      </div>
    </section>
  );
}
