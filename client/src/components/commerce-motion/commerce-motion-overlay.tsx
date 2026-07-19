// Host for the Preview Add-to-Cart concepts (researched winners).
//   A = "FlowLine Seal": card grows in place (clip-path), the real product image
//       docks in, a single teal FlowLine seal-stroke draws around the edge, the
//       cart count ticks. Persistent, legible, thumb-zone anchored.
//   B = "Facet Turn": the product image tile turns (rotateY) to reveal the
//       confirmation face; count ticks. Genuinely different mechanic.
//
// Motion uses the Web Animations API — the app globally disables framer-motion
// (MotionConfig reducedMotion="always") + CSS keyframes, so WAAPI is the reliable
// path. Progressive-enhancement + reduced-motion safe (resting state = final).
// Renders nothing when the concept is "current" → Production experience untouched.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CheckCircle2, ShoppingBag, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatIQD } from "@/lib/utils";
import { useCart } from "@/contexts/cart-context";
import {
  ADD_TO_CART_EVENT, FLAG_CHANGE_EVENT, getCartConcept,
  isCommerceMotionPreviewHost, type AddToCartPreviewDetail, type CartConcept,
} from "@/lib/commerce-motion/preview-flags";

function prefersReduced(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}
function canAnimate(): boolean {
  return typeof window !== "undefined" && "animate" in Element.prototype && !prefersReduced();
}

export function CommerceMotionOverlay() {
  const [concept, setConcept] = useState<CartConcept>("current");
  const [item, setItem] = useState<AddToCartPreviewDetail | null>(null);
  const [seq, setSeq] = useState(0); // bumps per add → re-runs entrance
  const { totalItems } = useCart();

  const cardRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);
  const sealRef = useRef<SVGPathElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isCommerceMotionPreviewHost()) return;
    const sync = () => setConcept(getCartConcept());
    sync();
    window.addEventListener(FLAG_CHANGE_EVENT, sync);
    return () => window.removeEventListener(FLAG_CHANGE_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!isCommerceMotionPreviewHost()) return;
    const onAdd = (e: Event) => {
      if (getCartConcept() === "current") return; // production: do nothing
      const detail = (e as CustomEvent<AddToCartPreviewDetail>).detail;
      if (!detail) return;
      setItem(detail);
      setSeq((s) => s + 1);
    };
    window.addEventListener(ADD_TO_CART_EVENT, onAdd);
    return () => window.removeEventListener(ADD_TO_CART_EVENT, onAdd);
  }, []);

  // WAAPI entrance, re-run each add.
  useLayoutEffect(() => {
    if (!item || !canAnimate()) return;
    const anims: Animation[] = [];
    const run = (el: Element | null, kf: Keyframe[], opts: KeyframeAnimationOptions) => {
      if (el) anims.push(el.animate(kf, { fill: "both", ...opts }));
    };
    if (concept === "A") {
      // FlowLine Seal — grow in place, dock image, draw the seal, tick the count.
      run(cardRef.current, [{ opacity: 0, clipPath: "inset(100% 0 0 0 round 16px)" }, { opacity: 1, clipPath: "inset(0% 0 0 0 round 16px)" }],
        { duration: 300, easing: "cubic-bezier(0.22,1,0.36,1)" });
      run(imgRef.current, [{ opacity: 0, transform: "scale(0.6)" }, { opacity: 1, transform: "scale(1)" }],
        { duration: 320, delay: 120, easing: "cubic-bezier(0.16,1,0.3,1)" });
      run(sealRef.current, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
        { duration: 460, delay: 200, easing: "cubic-bezier(0.4,0,0.2,1)" });
    } else {
      // Facet Turn — the image tile turns to reveal, card settles, count ticks.
      run(cardRef.current, [{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "translateY(0)" }],
        { duration: 260, easing: "cubic-bezier(0.22,1,0.36,1)" });
      run(imgRef.current, [{ transform: "perspective(600px) rotateY(-92deg)", opacity: 0.2 }, { transform: "perspective(600px) rotateY(0deg)", opacity: 1 }],
        { duration: 420, delay: 120, easing: "cubic-bezier(0.16,1,0.3,1)" });
    }
    run(countRef.current, [{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }],
      { duration: 360, delay: 420, easing: "ease-out" });
    return () => anims.forEach((a) => a.cancel());
  }, [seq, concept, item]);

  const openCart = useCallback(() => {
    window.dispatchEvent(new CustomEvent("aqv:open-cart"));
    setItem(null);
  }, []);
  const dismiss = useCallback(() => setItem(null), []);

  if (!isCommerceMotionPreviewHost() || concept === "current" || !item) return null;

  return (
    <div
      dir="rtl"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:left-4 sm:right-auto sm:max-w-sm"
    >
      <div
        ref={cardRef}
        role="status"
        aria-live="polite"
        className="pointer-events-auto relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
      >
        {/* FlowLine seal stroke (concept A) — decorative */}
        {concept === "A" && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" preserveAspectRatio="none">
            <rect ref={sealRef as unknown as React.RefObject<SVGRectElement>} x="1.5" y="1.5" width="calc(100% - 3px)" height="calc(100% - 3px)" rx="15"
              fill="none" stroke="#0B93A6" strokeWidth="2" pathLength={1} strokeDasharray={1} strokeDashoffset={1} />
          </svg>
        )}
        <div className="h-1 w-full bg-gradient-to-l from-[#0B93A6] to-[#0B64A6]" />

        <div className="flex items-center gap-3 p-4">
          <div ref={imgRef} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted [transform-style:preserve-3d]">
            {item.image
              ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
              : <div className="flex h-full w-full items-center justify-center"><ShoppingBag className="h-6 w-6 text-muted-foreground" /></div>}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#0B93A6]">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>تمت الإضافة إلى السلة</span>
              <span ref={countRef} dir="ltr" className="mr-auto inline-flex items-center gap-1 rounded-full bg-[#0B93A6]/10 px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#0B93A6]">
                <ShoppingBag className="h-3 w-3" aria-hidden="true" />
                {totalItems}
              </span>
            </div>
            <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{item.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              {item.variantLabel && <span className="rounded-md bg-muted px-1.5 py-0.5">{item.variantLabel}</span>}
              <span>الكمية: {item.quantity}</span>
              {item.price > 0 && <span className="font-medium text-foreground">{formatIQD(item.price * item.quantity)}</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 p-3 pt-0">
          <Button onClick={openCart} className="h-11 gap-1.5 font-semibold">
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            عرض السلة
          </Button>
          <Button onClick={dismiss} variant="outline" className="h-11 gap-1.5 font-semibold">
            أكمل التسوق
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <p className="px-4 pb-3 text-center text-[11px] text-muted-foreground">الدفع عند الاستلام · توصيل 5,000 د.ع · دعم 24/7</p>
      </div>
    </div>
  );
}
