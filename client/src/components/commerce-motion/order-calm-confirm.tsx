// Order-Success "Idea B — تأكيد هادئ" (Calm Confirmation) — owner-locked direction.
//
// FINAL RESTING LOOK is the approved DARK AQUAVO premium confirmation (Screenshot 2):
// dark page + dark card, teal/blue accents, centered layout, heading «تم إنشاء طلبك»
// + subtitle, order-number box, clean dark product rows, totals. It is a
// self-contained dark card so it NEVER drifts to a light/pale panel regardless of
// the site theme.
//
// Calm 1180ms sequence: card grounds → ORDER NUMBER resolves ≤250ms → heading
// settles → the AQUAVO mark performs one controlled signature → products reveal on
// a 70ms coordinated stagger → total/facts settle. Motion via the Web Animations
// API (the app globally disables framer-motion + CSS keyframes). Progressive-
// enhancement + reduced-motion safe: resting CSS state IS the final dark card.

import { useLayoutEffect, useRef } from "react";
import { Truck, MapPin, Wallet, Package, StickyNote } from "lucide-react";
import { formatIQD } from "@/lib/utils";
import type { OrderSuccessView } from "@/lib/commerce-motion/order-fixtures";

interface Props {
  order: OrderSuccessView;
  replayKey?: number;
}

const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_STD = "cubic-bezier(0.2, 0.8, 0.2, 1)";
const EASE_SIG = "cubic-bezier(0.16, 1, 0.3, 1)";

function prefersReduced(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}
function canAnimate(): boolean {
  return typeof window !== "undefined" && "animate" in Element.prototype && !prefersReduced();
}

export function OrderCalmConfirm({ order, replayKey = 0 }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLImageElement>(null);
  const numRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const factsDRef = useRef<HTMLDivElement>(null);
  const factsERef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!canAnimate()) return;
    const anims: Animation[] = [];
    const run = (el: Element | null, kf: Keyframe[], opts: KeyframeAnimationOptions) => {
      if (el) anims.push(el.animate(kf, { fill: "both", ...opts }));
    };
    run(cardRef.current, [{ opacity: 0, transform: "scale(0.985)" }, { opacity: 1, transform: "scale(1)" }],
      { duration: 120, easing: EASE_OUT });
    // Order number resolves first, locked by 250ms
    run(numRef.current, [{ opacity: 0, transform: "translateX(6px)", filter: "blur(3px)" }, { opacity: 1, transform: "translateX(0)", filter: "blur(0px)" }],
      { duration: 130, delay: 120, easing: EASE_STD });
    run(headingRef.current, [{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 170, delay: 150, easing: EASE_STD });
    // One controlled brand signature
    run(markRef.current, [{ opacity: 0.4, transform: "scale(0.94) rotate(-4deg)" }, { opacity: 1, transform: "scale(1) rotate(0deg)" }],
      { duration: 310, delay: 250, easing: EASE_SIG });
    // Coordinated product reveal, 70ms stagger
    rowRefs.current.forEach((row, i) => {
      run(row, [{ opacity: 0, transform: "translateX(10px) scale(0.98)" }, { opacity: 1, transform: "translateX(0) scale(1)" }],
        { duration: 240, delay: 520 + i * 70, easing: EASE_OUT });
    });
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
      className="relative mx-auto w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#0F2731] text-[#EAF1F3] shadow-2xl"
    >
      {/* teal → FlowLine-blue accent */}
      <div className="h-1.5 w-full bg-gradient-to-l from-[#0B93A6] to-[#0B64A6]" />

      <div className="p-5 sm:p-6">
        {/* A — brand mark */}
        <div className="flex justify-center">
          <img ref={markRef} src="/brand/aquavo-v2-icon.svg" alt="AQUAVO" className="h-12 w-auto" />
        </div>

        {/* Heading + subtitle (Screenshot-2 order: above the number box) */}
        <div ref={headingRef} className="mt-3 text-center">
          <h2 className="text-xl font-bold text-white">تم إنشاء طلبك</h2>
          <p className="mt-1 text-sm text-[#8CA1AB]">شكراً لطلبك — تم استلامه بنجاح</p>
        </div>

        {/* B — order number (locked ≤250ms), announced once */}
        <div aria-live="polite">
          <div ref={numRef} className="mt-5 rounded-xl border border-[#0B93A6]/35 bg-[#0B93A6]/10 p-4 text-center">
            <div className="text-xs text-[#8CA1AB]">رقم الطلب</div>
            <div dir="ltr" className="mt-1 font-mono text-lg font-bold tracking-wider text-[#35C0D1]">#{order.orderNumber}</div>
          </div>
        </div>

        {/* C — coordinated product reveal */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8CA1AB]">
            <Package className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{order.items.length} منتجات</span>
          </div>
          {order.items.map((it, i) => (
            <div
              key={i}
              ref={(el) => { rowRefs.current[i] = el; }}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0C222C] p-2.5"
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/20">
                <img src={it.image} alt={it.name} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#EAF1F3]">{it.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[#8CA1AB]">
                  {it.variantLabel && <span className="rounded bg-white/10 px-1.5 py-0.5">{it.variantLabel}</span>}
                  <span>الكمية: {it.quantity}</span>
                </div>
              </div>
              <span className="shrink-0 font-mono text-sm text-[#EAF1F3]">{formatIQD(it.price * it.quantity)}</span>
            </div>
          ))}
        </div>

        {/* D — total + payment */}
        <div ref={factsDRef} className="mt-5 space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-white/5 p-4">
            <span className="text-sm font-semibold text-[#EAF1F3]">المبلغ الكلي</span>
            <span className="text-2xl font-bold text-[#35C0D1]">{formatIQD(order.total)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Fact icon={<Wallet className="h-4 w-4" />} label="الدفع" value={order.paymentMethod} />
            <Fact icon={<Package className="h-4 w-4" />} label="المستلم" value={order.customerName} />
          </div>
        </div>

        {/* E — province + status pill */}
        <div ref={factsERef} className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Fact icon={<MapPin className="h-4 w-4" />} label="المحافظة" value={order.province} />
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0C222C] p-2.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#0B93A6]/15 text-[#35C0D1]">
                <Truck className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="text-[11px] text-[#8CA1AB]">حالة الطلب</div>
                <div className="flex items-center gap-1.5 truncate text-xs font-medium text-[#EAF1F3]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#35C0D1]" aria-hidden="true" />
                  {order.status}
                </div>
              </div>
            </div>
          </div>
          {order.notes && (
            <div className="flex items-start gap-2 rounded-xl border border-white/10 p-3 text-xs text-[#8CA1AB]">
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
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0C222C] p-2.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#0B93A6]/15 text-[#35C0D1]">{icon}</span>
      <div className="min-w-0">
        <div className="text-[11px] text-[#8CA1AB]">{label}</div>
        <div className="truncate text-xs font-medium text-[#EAF1F3]">{value}</div>
      </div>
    </div>
  );
}
