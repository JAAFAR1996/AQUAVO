import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Minus, PlayCircle, Plus, RotateCcw } from "lucide-react";
import { MetaTags } from "@/components/seo/meta-tags";
import { prefersReducedMotion } from "@/prototype/motion-prototype";
import { fetchProducts } from "@/lib/api";
import { cardImage } from "@/lib/cloudinary";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/types";

/**
 * PREVIEW-ONLY "Pack–Seal–Confirm" motion demo.
 *
 * Reads REAL catalogue products (read-only, via the existing react-query layer
 * and canonical image helpers). It never creates an order, never mutates cart,
 * stock, pricing, payment, or the database. Motion runs via the Web Animations
 * API (independent of the global CSS no-motion backstop) and only after an
 * explicit user action. Respects prefers-reduced-motion. All interface text is
 * Arabic.
 */

const FALLBACK_IMG = "/brand/aquavo-v2-icon.svg";
const MAX_SELECTION = 4;

function imageOf(product: Product): string {
  return cardImage(product.thumbnail || product.image) || FALLBACK_IMG;
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function play(el: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
  const anim = el.animate(keyframes, { fill: "forwards", ...options });
  await anim.finished.catch(() => {});
}

export default function MotionPrototypeCheckout() {
  const { data, isLoading } = useQuery({
    queryKey: ["products", "motion-demo"],
    queryFn: () => fetchProducts(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const catalogue = useMemo(
    () => (data?.products ?? []).filter((p) => (p.price ?? 0) > 0).slice(0, 8),
    [data]
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [imagesReady, setImagesReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");

  const boxRef = useRef<HTMLDivElement>(null);
  const lidRef = useRef<HTMLDivElement>(null);
  const tapeRef = useRef<HTMLDivElement>(null);
  const sealRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Default to the first three real catalogue products once they load.
  useEffect(() => {
    if (catalogue.length > 0 && selectedIds.length === 0) {
      const first3 = catalogue.slice(0, 3).map((p) => p.id);
      setSelectedIds(first3);
      setQuantities(Object.fromEntries(first3.map((id) => [id, 1])));
    }
  }, [catalogue, selectedIds.length]);

  const selectedProducts = useMemo(
    () => selectedIds.map((id) => catalogue.find((p) => p.id === id)).filter(Boolean) as Product[],
    [selectedIds, catalogue]
  );

  // Preload the selected real images before allowing the sequence to start.
  useEffect(() => {
    let cancelled = false;
    setImagesReady(false);
    if (selectedProducts.length === 0) return;
    Promise.all(
      selectedProducts.map(
        (p) =>
          new Promise<void>((res) => {
            const img = new Image();
            img.onload = () => res();
            img.onerror = () => res(); // fallback handled at render via onError
            img.src = imageOf(p);
          })
      )
    ).then(() => {
      if (!cancelled) setImagesReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedProducts]);

  const toggleProduct = (id: string) => {
    if (status === "running") return;
    setStatus("idle");
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.length > 1 ? prev.filter((x) => x !== id) : prev;
      }
      if (prev.length >= MAX_SELECTION) return prev;
      setQuantities((q) => ({ ...q, [id]: q[id] || 1 }));
      return [...prev, id];
    });
  };

  const changeQty = (id: string, delta: number) => {
    if (status === "running") return;
    setQuantities((q) => {
      const next = Math.min(9, Math.max(1, (q[id] || 1) + delta));
      return { ...q, [id]: next };
    });
  };

  const totalItems = selectedProducts.reduce((n, p) => n + (quantities[p.id] || 1), 0);
  const totalPrice = selectedProducts.reduce((s, p) => s + (p.price ?? 0) * (quantities[p.id] || 1), 0);

  const reset = () => {
    setStatus("idle");
    [boxRef, lidRef, tapeRef, sealRef, confirmRef].forEach((r) =>
      r.current?.getAnimations().forEach((a) => a.cancel())
    );
    itemRefs.current.forEach((el) => el?.getAnimations().forEach((a) => a.cancel()));
  };

  const run = async () => {
    if (status === "running" || !imagesReady || selectedProducts.length === 0) return;
    setStatus("running");
    const reduced = prefersReducedMotion();
    const t = (ms: number) => (reduced ? Math.min(120, ms) : ms);
    const count = selectedProducts.length;

    await Promise.all(
      itemRefs.current.slice(0, count).map((el, i) => {
        if (!el) return Promise.resolve();
        const spread = (i - (count - 1) / 2) * 110;
        return play(
          el,
          [
            { transform: `translateX(${spread}px) translateY(0) scale(1)`, opacity: 1 },
            { transform: "translateX(0) translateY(6px) scale(0.5)", opacity: 0.92 },
          ],
          { duration: t(500), easing: "cubic-bezier(.4,0,.2,1)" }
        );
      })
    );
    if (boxRef.current)
      await play(
        boxRef.current,
        [{ transform: "scale(0.2)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }],
        { duration: t(360), easing: "cubic-bezier(.34,1.4,.64,1)" }
      );
    await wait(t(80));
    if (lidRef.current)
      await play(
        lidRef.current,
        [{ transform: "rotateX(-92deg)", opacity: 0.4 }, { transform: "rotateX(0deg)", opacity: 1 }],
        { duration: t(340), easing: "cubic-bezier(.4,0,.2,1)" }
      );
    if (tapeRef.current)
      await play(
        tapeRef.current,
        [{ transform: "scaleY(0)", opacity: 0 }, { transform: "scaleY(1)", opacity: 1 }],
        { duration: t(260), easing: "ease-out" }
      );
    if (sealRef.current)
      await play(
        sealRef.current,
        [{ transform: "scale(0) rotate(-20deg)", opacity: 0 }, { transform: "scale(1) rotate(-8deg)", opacity: 1 }],
        { duration: t(300), easing: "cubic-bezier(.34,1.56,.64,1)" }
      );
    await wait(t(120));
    if (confirmRef.current)
      await play(confirmRef.current, [{ opacity: 0 }, { opacity: 1 }], { duration: t(240), easing: "ease-out" });
    setStatus("done");
  };

  const startDisabled = status === "running" || isLoading || !imagesReady || selectedProducts.length === 0;

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <MetaTags title="نموذج حركة — تأكيد الطلب (تجريبي)" description="عرض حركة تجريبي فقط." />
      <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-10">
        <div className="mb-3 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
          نسخة تجريبية — لا يتم إنشاء طلب حقيقي
        </div>
        <h1 className="text-center text-2xl font-bold">تعبئة — ختم — تأكيد</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          اختر منتجات حقيقية من الكتالوج (١–٤) ثم ابدأ العرض. لا يتم إنشاء طلب أو تعديل مخزون.
        </p>

        {/* Real product selector */}
        <section className="mt-6 w-full" aria-label="اختيار منتجات العرض">
          <h2 className="mb-2 text-center text-xs font-bold text-muted-foreground">
            منتجات العرض (من الكتالوج الحقيقي)
          </h2>
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground">جاري تحميل المنتجات…</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {catalogue.map((p) => {
                const active = selectedIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    className={`rounded-xl border p-2 text-right ${
                      active ? "border-primary bg-primary/5" : "border-border bg-card"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleProduct(p.id)}
                      aria-pressed={active}
                      disabled={status === "running" || (!active && selectedIds.length >= MAX_SELECTION)}
                      className="flex w-full items-center gap-2 disabled:opacity-50"
                    >
                      <img
                        src={imageOf(p)}
                        onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
                        alt=""
                        aria-hidden="true"
                        className="h-10 w-10 shrink-0 rounded-lg border border-border bg-card object-contain p-0.5"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-bold">{p.name}</span>
                        <span className="block text-[11px] text-primary">{formatPrice(p.price ?? 0)}</span>
                      </span>
                    </button>
                    {active && (
                      <div className="mt-2 flex items-center justify-between gap-1" role="group" aria-label={`كمية ${p.name}`}>
                        <button type="button" onClick={() => changeQty(p.id, -1)} aria-label={`تقليل كمية ${p.name}`} className="flex h-8 w-8 items-center justify-center rounded-md border border-border">
                          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <span className="text-sm font-bold" aria-live="polite">{quantities[p.id] || 1}</span>
                        <button type="button" onClick={() => changeQty(p.id, 1)} aria-label={`زيادة كمية ${p.name}`} className="flex h-8 w-8 items-center justify-center rounded-md border border-border">
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            المختار: {selectedProducts.length} منتج — الكمية الكلية: {totalItems} — الإجمالي: {formatPrice(totalPrice)}
          </p>
        </section>

        {/* Stage */}
        <div className="relative mt-6 flex h-72 w-full max-w-md items-center justify-center" style={{ perspective: "700px" }} aria-live="polite">
          <div className="absolute inset-0 flex items-center justify-center">
            {selectedProducts.map((p, i) => (
              <div
                key={p.id}
                ref={(el) => { itemRefs.current[i] = el; }}
                className="absolute flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-card shadow"
                style={{ transform: `translateX(${(i - (selectedProducts.length - 1) / 2) * 110}px)` }}
                aria-hidden="true"
              >
                <img
                  src={imageOf(p)}
                  onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
                  alt=""
                  className="h-full w-full rounded-xl object-contain p-1"
                />
                {(quantities[p.id] || 1) > 1 && (
                  <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                    ×{quantities[p.id]}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div ref={boxRef} className="relative h-40 w-44 rounded-lg border-2 border-[#C9852F]/70 bg-[#E8B972]/25" style={{ opacity: 0, transformStyle: "preserve-3d" }} aria-hidden="true">
            <div ref={lidRef} className="absolute inset-x-0 top-0 h-1/2 origin-top rounded-t-lg border-2 border-[#C9852F]/70 bg-[#E8B972]/45" style={{ transform: "rotateX(-92deg)", opacity: 0.4 }} />
            <div ref={tapeRef} className="absolute left-1/2 top-0 h-full w-6 -translate-x-1/2 origin-top bg-[#C9852F]/60" style={{ transform: "scaleY(0)", opacity: 0 }} />
            <div ref={sealRef} className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-primary bg-card text-primary shadow" style={{ transform: "scale(0) rotate(-20deg)", opacity: 0 }}>
              <span className="text-[8px] font-bold tracking-wide">AQUAVO</span>
              <span className="text-[11px] font-black leading-tight">مُغَلَّف</span>
              <span className="text-[11px] font-black leading-tight">بعناية</span>
            </div>
          </div>

          {status === "done" && (
            <div ref={confirmRef} className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-border bg-card/95 text-center backdrop-blur" style={{ opacity: 0 }}>
              <CheckCircle2 className="h-12 w-12 text-primary" aria-hidden="true" />
              <p className="mt-3 text-lg font-bold">تم تجهيز الطلب (تجريبي)</p>
              <p className="mt-1 px-4 text-sm text-muted-foreground">
                عرض حركة فقط — لا يوجد طلب حقيقي. {selectedProducts.length} منتج، كمية {totalItems}، إجمالي {formatPrice(totalPrice)}.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={run}
            disabled={startDisabled}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-white disabled:opacity-50"
          >
            <PlayCircle className="h-4 w-4" aria-hidden="true" />
            {status === "running" ? "جاري العرض…" : !imagesReady ? "جاري تجهيز الصور…" : status === "done" ? "أعد العرض" : "ابدأ العرض"}
          </button>
          {status !== "idle" && (
            <button type="button" onClick={reset} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-6 text-sm font-bold text-foreground">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              إعادة تعيين
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
