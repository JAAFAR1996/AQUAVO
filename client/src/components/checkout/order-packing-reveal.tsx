import { useCallback, useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";

/**
 * Order "Pack–Seal–Confirm" reveal, shown once on the real successful-order
 * screen BEFORE the static confirmation. It is purely visual: it never creates
 * or submits an order, never touches cart/stock/pricing, and always calls
 * onComplete exactly once so the normal confirmation is shown. Motion runs via
 * the Web Animations API (independent of the global CSS motion rules).
 *
 * Falls through to onComplete immediately for reduced-motion users, when there
 * are no items, or if image preloading / the animation fails — so the customer
 * is never blocked from their confirmation.
 */

export interface PackItem {
  name: string;
  image: string;
  quantity: number;
}

const FALLBACK_IMG = "/brand/aquavo-v2-icon.svg";
const PRELOAD_TIMEOUT = 1500;
const SAFETY_TIMEOUT = 3500;

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// Each step resolves within its own duration even if the Web Animations API is
// unavailable or `.finished` never settles — so the confirmation is never blocked.
async function play(el: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
  const dur = typeof options.duration === "number" ? options.duration : 400;
  const cap = wait(dur + 120);
  try {
    const anim = el.animate(keyframes, { fill: "forwards", ...options });
    await Promise.race([anim.finished.catch(() => {}), cap]);
  } catch {
    await cap;
  }
}

function preload(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

export function OrderPackingReveal({ items, onComplete }: { items: PackItem[]; onComplete: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const lidRef = useRef<HTMLDivElement>(null);
  const tapeRef = useRef<HTMLDivElement>(null);
  const sealRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete();
  }, [onComplete]);

  const packItems = items.slice(0, 4);

  useEffect(() => {
    if (prefersReducedMotion() || packItems.length === 0) {
      finish();
      return;
    }
    let cancelled = false;
    const safety = window.setTimeout(finish, SAFETY_TIMEOUT);

    (async () => {
      try {
        await Promise.race([
          Promise.all(packItems.map((it) => preload(it.image || FALLBACK_IMG))),
          wait(PRELOAD_TIMEOUT),
        ]);
        if (cancelled) return;

        const count = packItems.length;
        await Promise.all(
          itemRefs.current.slice(0, count).map((el, i) => {
            if (!el) return Promise.resolve();
            const spread = (i - (count - 1) / 2) * 96;
            return play(
              el,
              [
                { transform: `translateX(${spread}px) scale(1)`, opacity: 1 },
                { transform: "translateX(0) translateY(6px) scale(0.5)", opacity: 0.92 },
              ],
              { duration: 480, easing: "cubic-bezier(.4,0,.2,1)" }
            );
          })
        );
        if (cancelled) return;
        if (boxRef.current)
          await play(boxRef.current, [{ transform: "scale(0.2)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 340, easing: "cubic-bezier(.34,1.4,.64,1)" });
        if (cancelled) return;
        if (lidRef.current)
          await play(lidRef.current, [{ transform: "rotateX(-92deg)", opacity: 0.4 }, { transform: "rotateX(0deg)", opacity: 1 }], { duration: 320, easing: "cubic-bezier(.4,0,.2,1)" });
        if (cancelled) return;
        if (tapeRef.current)
          await play(tapeRef.current, [{ transform: "scaleY(0)", opacity: 0 }, { transform: "scaleY(1)", opacity: 1 }], { duration: 240, easing: "ease-out" });
        if (cancelled) return;
        if (sealRef.current)
          await play(sealRef.current, [{ transform: "scale(0) rotate(-20deg)", opacity: 0 }, { transform: "scale(1) rotate(-8deg)", opacity: 1 }], { duration: 300, easing: "cubic-bezier(.34,1.56,.64,1)" });
        if (cancelled) return;
        await wait(320);
      } catch {
        /* fall through to finish */
      } finally {
        if (!cancelled) finish();
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(safety);
    };
    // Run once for this set of items.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center" dir="rtl" aria-hidden="true">
      <div className="relative flex h-64 w-full max-w-sm items-center justify-center" style={{ perspective: "700px" }}>
        <div className="absolute inset-0 flex items-center justify-center">
          {packItems.map((it, i) => (
            <div
              key={i}
              ref={(el) => { itemRefs.current[i] = el; }}
              className="absolute flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-card shadow"
              style={{ transform: `translateX(${(i - (packItems.length - 1) / 2) * 96}px)` }}
            >
              <img
                src={it.image || FALLBACK_IMG}
                onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
                alt=""
                className="h-full w-full rounded-xl object-contain p-1"
              />
              {it.quantity > 1 && (
                <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                  ×{it.quantity}
                </span>
              )}
            </div>
          ))}
        </div>

        <div ref={boxRef} className="relative h-40 w-44 rounded-lg border-2 border-[#C9852F]/70 bg-[#E8B972]/25" style={{ opacity: 0, transformStyle: "preserve-3d" }}>
          <div ref={lidRef} className="absolute inset-x-0 top-0 h-1/2 origin-top rounded-t-lg border-2 border-[#C9852F]/70 bg-[#E8B972]/45" style={{ transform: "rotateX(-92deg)", opacity: 0.4 }} />
          <div ref={tapeRef} className="absolute left-1/2 top-0 h-full w-6 -translate-x-1/2 origin-top bg-[#C9852F]/60" style={{ transform: "scaleY(0)", opacity: 0 }} />
          <div ref={sealRef} className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-primary bg-card text-primary shadow" style={{ transform: "scale(0) rotate(-20deg)", opacity: 0 }}>
            <span className="text-[8px] font-bold tracking-wide">AQUAVO</span>
            <span className="text-[11px] font-black leading-tight">مُغَلَّف</span>
            <span className="text-[11px] font-black leading-tight">بعناية</span>
          </div>
        </div>
      </div>
      <p className="mt-2 text-sm font-bold text-muted-foreground">نجهّز طلبك…</p>
    </div>
  );
}
