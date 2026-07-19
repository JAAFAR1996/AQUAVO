// Order-Success "Idea B — تأكيد هادئ" (Calm Confirmation) — owner-locked direction.
//
// A calm 1180ms sequence (see research/.../order-success/idea-b-storyboard.md):
//   0–120 card grounds · 120–250 ORDER NUMBER resolves first (locked ≤250ms) ·
//   250–560 the AQUAVO mark performs one controlled signature · 520–900 products
//   reveal on a 70ms coordinated stagger · 860–1080 total/payment/province/status
//   settle · ending as the real, permanent confirmation card.
//
// Motion uses the Web Animations API (element.animate) — the app globally disables
// framer-motion (MotionConfig reducedMotion="always") and CSS keyframes, so WAAPI
// is the only reliable path (same approach as the shipped product motions).
// Progressive-enhancement + reduced-motion safe: every element's resting CSS state
// is the FINAL state, so if motion never runs the full correct card is on screen.

import { useLayoutEffect, useRef } from "react";
import { Truck, MapPin, Wallet, Package, StickyNote } from "lucide-react";
import { formatIQD } from "@/lib/utils";
import type { OrderSuccessView } from "@/lib/commerce-motion/order-fixtures";

interface Props {
  order: OrderSuccessView;
  /** Bump to replay the sequence from the start. */
  replayKey?: number;
}

const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_STD = "cubic-bezier(0.2, 0.8, 0.2, 1)";
const EASE_SIG = "cubic-bezier(0.16, 1, 0.3, 1)";

function prefersReduced(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}
function canAnimate(): boolean {
  return typeof window !== "undefined" && typeof Element !== "undefined" && "animate" in Element.prototype && !prefersReduced();
}

export function OrderCalmConfirm({ order, replayKey = 0 }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLImageElement>(null);
  const numRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const factsDRef = useRef<HTMLDivElement>(null);
  const factsERef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!canAnimate()) return; // resting CSS state is already the final card
    const anims: Animation[] = [];
    const run = (el: Element | null, keyframes: Keyframe[], opts: KeyframeAnimationOptions) => {
      if (el) anims.push(el.animate(keyframes, { fill: "both", ...opts }));
    };

    // Phase 0 — card grounds
    run(cardRef.current, [{ opacity: 0, transform: "scale(0.985)" }, { opacity: 1, transform: "scale(1)" }],
      { duration: 120, easing: EASE_OUT });
    // Phase 1 — order number resolves first, locked by 250ms
    run(numRef.current, [{ opacity: 0, transform: "translateX(6px)", filter: "blur(3px)" }, { opacity: 1, transform: "translateX(0)", filter: "blur(0px)" }],
      { duration: 130, delay: 120, easing: EASE_STD });
    run(headingRef.current, [{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 160, delay: 190, easing: EASE_STD });
    // Phase 2 — one controlled brand signature (no bounce)
    run(markRef.current, [{ opacity: 0.4, transform: "scale(0.94) rotate(-4deg)" }, { opacity: 1, transform: "scale(1) rotate(0deg)" }],
      { duration: 310, delay: 250, easing: EASE_SIG });
    // Phase 3 — coordinated product reveal, 70ms stagger from 520ms
    rowRefs.current.forEach((row, i) => {
      run(row, [{ opacity: 0, transform: "translateX(10px) scale(0.98)" }, { opacity: 1, transform: "translateX(0) scale(1)" }],
        { duration: 240, delay: 520 + i * 70, easing: EASE_OUT });
    });
    // Phase 4 — facts settle into permanent locations
    run(factsDRef.current, [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 200, delay: 860, easing: EASE_STD });
    run(factsERef.current, [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 200, delay: 960, easing: EASE_STD });

    return () => anims.forEach((a) => a.cancel());
  }, [replayKey]);

  return (
    <div
      ref={cardRef}
      dir="rtl"
      className="relative mx-auto w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xl"
    >
      <div className="h-1.5 w-full bg-gradient-to-l from-[#0B93A6] to-[#0B64A6]" />

      <div className="p-5 sm:p-6">
        {/* A — brand mark (signature at 250–560ms) */}
        <div className="flex justify-center">
          <img ref={markRef} src="/brand/aquavo-v2-icon.svg" alt="AQUAVO" className="h-12 w-auto" />
        </div>

        {/* B — order number (locked ≤250ms) + heading, announced once */}
        <div aria-live="polite" className="mt-4 text-center">
          <div ref={numRef} className="mx-auto max-w-xs rounded-xl border border-[#0B93A6]/25 bg-[#0B93A6]/5 p-3">
            <div className="text-xs text-muted-foreground">رقم الطلب</div>
            <div dir="ltr" className="mt-0.5 font-mono text-lg font-bold tracking-wider text-[#0B93A6]">#{order.orderNumber}</div>
          </div>
          <h2 ref={headingRef} className="mt-3 text-xl font-bold text-foreground">تم تأكيد طلبك</h2>
        </div>

        {/* C — coordinated product reveal */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Package className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{order.items.length} منتجات</span>
          </div>
          {order.items.map((it, i) => (
            <div
              key={i}
              ref={(el) => { rowRefs.current[i] = el; }}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/60 p-2.5"
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                <img src={it.image} alt={it.name} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{it.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  {it.variantLabel && <span className="rounded bg-muted px-1.5 py-0.5">{it.variantLabel}</span>}
                  <span>الكمية: {it.quantity}</span>
                </div>
              </div>
              <span className="shrink-0 font-mono text-sm text-foreground">{formatIQD(it.price * it.quantity)}</span>
            </div>
          ))}
        </div>

        {/* D — total + payment (settle) */}
        <div ref={factsDRef} className="mt-5 space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
            <span className="text-sm font-semibold text-foreground">المبلغ الكلي</span>
            <span className="text-2xl font-bold text-[#0B93A6]">{formatIQD(order.total)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Fact icon={<Wallet className="h-4 w-4" />} label="الدفع" value={order.paymentMethod} />
            <Fact icon={<Package className="h-4 w-4" />} label="المستلم" value={order.customerName} />
          </div>
        </div>

        {/* E — province + status pill (settle) */}
        <div ref={factsERef} className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Fact icon={<MapPin className="h-4 w-4" />} label="المحافظة" value={order.province} />
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 p-2.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#0B93A6]/10 text-[#0B93A6]">
                <Truck className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="text-[11px] text-muted-foreground">حالة الطلب</div>
                <div className="flex items-center gap-1.5 truncate text-xs font-medium text-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0B93A6]" aria-hidden="true" />
                  {order.status}
                </div>
              </div>
            </div>
          </div>
          {order.notes && (
            <div className="flex items-start gap-2 rounded-xl border border-border/70 p-3 text-xs text-muted-foreground">
              <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{order.notes}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 p-2.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#0B93A6]/10 text-[#0B93A6]">{icon}</span>
      <div className="min-w-0">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="truncate text-xs font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}
