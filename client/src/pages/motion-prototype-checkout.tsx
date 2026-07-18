import { useRef, useState } from "react";
import { CheckCircle2, PlayCircle, RotateCcw } from "lucide-react";
import { MetaTags } from "@/components/seo/meta-tags";
import { prefersReducedMotion } from "@/prototype/motion-prototype";

/**
 * PREVIEW-ONLY "Pack–Seal–Confirm" motion demo.
 *
 * Demo data only. This route never creates an order, never touches cart,
 * stock, pricing, payment, or the database. Motion runs via the Web
 * Animations API (independent of the global CSS no-motion backstop) and only
 * after an explicit user action. Respects prefers-reduced-motion.
 */

const DEMO_ITEMS = [
  { name: "فلتر داخلي", src: "/brand/aquavo-v2-icon.svg" },
  { name: "سخان 100W", src: "/brand/aquavo-v2-icon.svg" },
  { name: "إضاءة LED", src: "/brand/aquavo-v2-icon.svg" },
];

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function play(el: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
  const anim = el.animate(keyframes, { fill: "forwards", ...options });
  await anim.finished.catch(() => {});
}

export default function MotionPrototypeCheckout() {
  const stageRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const lidRef = useRef<HTMLDivElement>(null);
  const tapeRef = useRef<HTMLDivElement>(null);
  const sealRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");

  const reset = () => {
    setStatus("idle");
    // Clear inline animation fills.
    [boxRef, lidRef, tapeRef, sealRef, confirmRef].forEach((r) => {
      if (r.current) r.current.getAnimations().forEach((a) => a.cancel());
    });
    itemRefs.current.forEach((el) => el?.getAnimations().forEach((a) => a.cancel()));
  };

  const run = async () => {
    if (status === "running") return;
    setStatus("running");

    const reduced = prefersReducedMotion();
    const t = (ms: number) => (reduced ? Math.min(120, ms) : ms);

    // 1. Thumbnails converge to centre.
    await Promise.all(
      itemRefs.current.map((el, i) => {
        if (!el) return Promise.resolve();
        const spread = (i - 1) * 120;
        return play(
          el,
          [
            { transform: `translateX(${spread}px) translateY(0) scale(1)`, opacity: 1 },
            { transform: "translateX(0) translateY(6px) scale(0.55)", opacity: 0.9 },
          ],
          { duration: t(520), easing: "cubic-bezier(.4,0,.2,1)" }
        );
      })
    );

    // 2. Box forms around them.
    if (boxRef.current) {
      await play(
        boxRef.current,
        [
          { transform: "scale(0.2)", opacity: 0 },
          { transform: "scale(1)", opacity: 1 },
        ],
        { duration: t(360), easing: "cubic-bezier(.34,1.4,.64,1)" }
      );
    }
    await wait(t(80));

    // 3. Lid closes.
    if (lidRef.current) {
      await play(
        lidRef.current,
        [
          { transform: "rotateX(-92deg)", opacity: 0.4 },
          { transform: "rotateX(0deg)", opacity: 1 },
        ],
        { duration: t(340), easing: "cubic-bezier(.4,0,.2,1)" }
      );
    }

    // 4. Packing tape appears.
    if (tapeRef.current) {
      await play(
        tapeRef.current,
        [
          { transform: "scaleY(0)", opacity: 0 },
          { transform: "scaleY(1)", opacity: 1 },
        ],
        { duration: t(260), easing: "ease-out" }
      );
    }

    // 5. Seal is applied.
    if (sealRef.current) {
      await play(
        sealRef.current,
        [
          { transform: "scale(0) rotate(-25deg)", opacity: 0 },
          { transform: "scale(1) rotate(-12deg)", opacity: 1 },
        ],
        { duration: t(300), easing: "cubic-bezier(.34,1.56,.64,1)" }
      );
    }
    await wait(t(120));

    // 6. Becomes a static confirmation card.
    if (confirmRef.current) {
      await play(
        confirmRef.current,
        [
          { opacity: 0 },
          { opacity: 1 },
        ],
        { duration: t(240), easing: "ease-out" }
      );
    }
    setStatus("done");
  };

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <MetaTags title="نموذج حركة — تأكيد الطلب (تجريبي)" description="عرض حركة تجريبي فقط." />
      <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-10">
        <div className="mb-3 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
          نسخة تجريبية — لا يتم إنشاء طلب حقيقي
        </div>
        <h1 className="text-center text-2xl font-bold">تعبئة — ختم — تأكيد</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          عرض حركة بعد ضغط زر واحد. البيانات تجريبية فقط.
        </p>

        {/* Stage */}
        <div
          ref={stageRef}
          className="relative mt-8 flex h-72 w-full max-w-md items-center justify-center"
          style={{ perspective: "700px" }}
          aria-live="polite"
        >
          {/* converging thumbnails */}
          <div className="absolute inset-0 flex items-center justify-center">
            {DEMO_ITEMS.map((item, i) => (
              <div
                key={item.name}
                ref={(el) => { itemRefs.current[i] = el; }}
                className="absolute flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-card shadow"
                style={{ transform: `translateX(${(i - 1) * 120}px)` }}
                aria-hidden="true"
              >
                <img src={item.src} alt="" className="h-9 w-9" />
              </div>
            ))}
          </div>

          {/* box */}
          <div
            ref={boxRef}
            className="relative h-40 w-44 rounded-lg border-2 border-[#C9852F]/70 bg-[#E8B972]/25"
            style={{ opacity: 0, transformStyle: "preserve-3d" }}
            aria-hidden="true"
          >
            {/* lid */}
            <div
              ref={lidRef}
              className="absolute inset-x-0 top-0 h-1/2 origin-top rounded-t-lg border-2 border-[#C9852F]/70 bg-[#E8B972]/45"
              style={{ transform: "rotateX(-92deg)", opacity: 0.4 }}
            />
            {/* tape */}
            <div
              ref={tapeRef}
              className="absolute left-1/2 top-0 h-full w-6 -translate-x-1/2 origin-top bg-[#C9852F]/60"
              style={{ transform: "scaleY(0)", opacity: 0 }}
            />
            {/* seal */}
            <div
              ref={sealRef}
              className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-primary bg-card text-primary shadow"
              style={{ transform: "scale(0) rotate(-25deg)", opacity: 0 }}
            >
              <span className="text-[9px] font-black leading-tight">AQUAVO<br />SEALED</span>
            </div>
          </div>

          {/* final confirmation overlay */}
          {status === "done" && (
            <div
              ref={confirmRef}
              className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-border bg-card/95 text-center backdrop-blur"
              style={{ opacity: 0 }}
            >
              <CheckCircle2 className="h-12 w-12 text-primary" aria-hidden="true" />
              <p className="mt-3 text-lg font-bold">تم تجهيز الطلب (تجريبي)</p>
              <p className="mt-1 text-sm text-muted-foreground">هذا عرض حركة فقط — لا يوجد طلب حقيقي.</p>
            </div>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={run}
            disabled={status === "running"}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-white disabled:opacity-50"
          >
            <PlayCircle className="h-4 w-4" aria-hidden="true" />
            {status === "idle" ? "ابدأ العرض" : status === "running" ? "جاري العرض…" : "أعد العرض"}
          </button>
          {status !== "idle" && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-6 text-sm font-bold text-foreground"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              إعادة تعيين
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
