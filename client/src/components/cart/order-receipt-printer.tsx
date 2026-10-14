import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, LoaderCircle, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatIQD } from "@/lib/utils";
import { PRINTER_FEED_DURATION, PRINTER_FEED_TIMES, playReceiptPrinterSound } from "@/lib/receipt-printer-audio";

type ReceiptLine = {
  productId: string;
  productName?: string;
  variantLabel?: string;
  quantity: number;
  priceAtPurchase?: string;
};

interface OrderReceiptPrinterProps {
  orderNumber: string;
  items: ReceiptLine[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentLabel: string;
  dateLabel?: string;
}

type PrinterStage = "idle" | "processing" | "printing" | "complete";

const strings = {
  ar: {
    receipt: "إيصال الطلب", confirmed: "تم تسجيل الطلب", number: "رقم الطلب",
    items: "المنتجات", subtotal: "المجموع الفرعي", delivery: "التوصيل",
    discount: "الخصم", total: "الإجمالي", payment: "طريقة الدفع / الحالة",
    thanks: "شكرا لتسوقك من AQUAVO", processing: "جاري تجهيز الإيصال",
    printing: "جاري طباعة الإيصال", complete: "الإيصال جاهز", store: "المتجر", replay: "إعادة عرض الحركة", soundOn: "تشغيل صوت الطابعة", soundOff: "كتم الصوت",
  },
  en: {
    receipt: "Order receipt", confirmed: "Order received", number: "Order number",
    items: "Items", subtotal: "Subtotal", delivery: "Delivery",
    discount: "Discount", total: "Total", payment: "Payment method / status",
    thanks: "Thank you for shopping with AQUAVO", processing: "Preparing receipt",
    printing: "Printing your receipt", complete: "Receipt ready", store: "Shop", replay: "Replay", soundOn: "Enable printer sound", soundOff: "Mute printer sound",
  },
  ckb: {
    receipt: "پسووڵەی داواکاری", confirmed: "داواکارییەکەت تۆمار کرا", number: "ژمارەی داواکاری",
    items: "بەرهەمەکان", subtotal: "کۆی سەرەتایی", delivery: "گەیاندن",
    discount: "داشکاندن", total: "کۆی گشتی", payment: "شێواز / دۆخی پارەدان",
    thanks: "سوپاس بۆ کڕین لە AQUAVO", processing: "ئامادەکردنی پسووڵە",
    printing: "چاپکردنی پسووڵە", complete: "پسووڵە ئامادەیە", store: "فرۆشگا", replay: "دووبارە پیشاندان", soundOn: "دەنگی چاپکەرەکە چالاک بکە", soundOff: "دەنگی چاپکەرەکە بکوژێنەوە",
  },
} as const;

// Mechanical stepper-motion: feed, pause, feed, pause, and finish.
const feedFrames = [
  "translateY(calc(-100% + 2px))", "translateY(-91%)", "translateY(-91%)", "translateY(-81%)", "translateY(-81%)", "translateY(-70%)", "translateY(-70%)",
  "translateY(-58%)", "translateY(-58%)", "translateY(-45%)", "translateY(-45%)", "translateY(-32%)", "translateY(-32%)", "translateY(-20%)",
  "translateY(-20%)", "translateY(-10%)", "translateY(-10%)", "translateY(-3%)", "translateY(-3%)", "translateY(0%)",
];
// Forty tiny serrations on the bottom edge, independent of receipt height.
const toothPoints = Array.from({ length: 80 }, (_, i) => {
  const x = 100 - ((i + 1) * 100) / 80;
  return String(x) + "% " + (i % 2 === 0 ? "100%" : "calc(100% - 4px)");
}).join(", ");
const paperCut = "polygon(0 0,100% 0,100% calc(100% - 4px)," + toothPoints + ")";

/**
 * Post-order visual only. This never starts checkout, changes payment state,
 * creates an invoice, or represents cash-on-delivery as paid.
 */
export function OrderReceiptPrinter({
  orderNumber, items, subtotal, deliveryFee, discount, total, paymentLabel, dateLabel,
}: OrderReceiptPrinterProps) {
  const { i18n } = useTranslation();
  const language = (i18n.resolvedLanguage ?? i18n.language ?? "ar").split("-")[0];
  const s = strings[language as keyof typeof strings] ?? strings.ar;
  const reduced = useReducedMotion();
  const machineRef = useRef<HTMLDivElement>(null);
  // Keep the paper inside the machine until the user can actually see it.
  // The preceding order-summary content can be tall enough to hide the printer
  // below the fold; a mount-time timer would finish before the user scrolls down.
  const [stage, setStage] = useState<PrinterStage>("idle");
  const [runId, setRunId] = useState(0);
  // Browsers block sound on navigation: explicitly enable it with a click.
  const [soundEnabled, setSoundEnabled] = useState(false);
  const stopSoundRef = useRef<(() => void) | null>(null);

  useEffect(() => () => {
    stopSoundRef.current?.();
    stopSoundRef.current = null;
  }, []);

  const replay = (withSound: boolean) => {
    stopSoundRef.current?.();
    stopSoundRef.current = null;
    if (withSound && !reduced) {
      // The paper starts 650ms after Replay; align mechanical sound with it.
      stopSoundRef.current = playReceiptPrinterSound(0.65);
    }
    setStage("processing");
    setRunId(current => current + 1);
  };

  useEffect(() => {
    if (reduced) {
      setStage("complete");
      return;
    }
    const machine = machineRef.current;
    if (!machine) return;
    if (typeof IntersectionObserver === "undefined") {
      setRunId(current => current === 0 ? 1 : current);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setRunId(current => current === 0 ? 1 : current);
        observer.disconnect();
      }
    }, { threshold: 0.45, rootMargin: "0px 0px -8% 0px" });
    observer.observe(machine);
    return () => observer.disconnect();
  }, [orderNumber, reduced]);

  useEffect(() => {
    if (reduced || runId === 0) return;
    setStage("processing");
    // Start with no paper, wait a moment, then feed in clearly separated steps.
    const start = window.setTimeout(() => setStage("printing"), 650);
    // The paper itself sets completion after its keyframe animation ends.
    return () => {
      window.clearTimeout(start);
    };
  }, [runId, reduced, orderNumber]);

  const statusText = stage === "idle" || stage === "processing" ? s.processing : stage === "printing" ? s.printing : s.complete;

  return (
    <section
      className="relative mx-auto flex w-full max-w-[396px] flex-col items-center py-1"
      aria-label={s.receipt}
      data-aqv-receipt
      data-stage={reduced ? "complete" : stage}
      data-animation-run={runId}
    >
      {!reduced && (
        <div className="mb-3 flex flex-wrap items-center justify-end gap-2 self-end">
          <button
            type="button"
            aria-label={soundEnabled ? s.soundOff : s.soundOn}
            aria-pressed={soundEnabled}
            onClick={() => {
              if (soundEnabled) {
                stopSoundRef.current?.();
                stopSoundRef.current = null;
                setSoundEnabled(false);
              } else {
                // Explicit activation unlocks audio and replays the full motion.
                setSoundEnabled(true);
                replay(true);
              }
            }}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#0B93A6]/35 bg-[#0B93A6]/10 px-3 py-1.5 text-xs font-semibold text-[#0B1E28] transition-colors hover:bg-[#0B93A6]/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B93A6]"
          >
            {soundEnabled ? <Volume2 aria-hidden="true" className="h-3.5 w-3.5" /> : <VolumeX aria-hidden="true" className="h-3.5 w-3.5" />}
            {soundEnabled ? s.soundOff : s.soundOn}
          </button>
          <button
            type="button"
            onClick={() => replay(soundEnabled)}
            aria-label={s.replay}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#0B1E28]/15 bg-[#FFFEFB] px-3 py-1.5 text-xs font-semibold text-[#0B1E28] shadow-sm transition-colors hover:bg-[#F6F4EF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B93A6]"
          >
            <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
            {s.replay}
          </button>
        </div>
      )}
      <div ref={machineRef} className="relative z-20 w-full overflow-hidden rounded-[25px] border border-[#181c1e] bg-[#2b3032] px-3 pb-8 pt-3 text-[#F6F4EF] shadow-[0_20px_36px_-20px_rgba(11,30,40,.56),0_6px_14px_-8px_rgba(11,30,40,.3),inset_0_1px_0_rgba(255,255,255,.16)]">
        <div className="relative z-10 flex h-11 items-start justify-between gap-3 px-1">
          <img src="/brand/aquavo-v2-icon.svg" alt="" width={29} height={29} className="h-7 w-7 object-contain" />
          <a href="/" className="rounded-xl border border-white/10 bg-[#43494b] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_3px_0_rgba(0,0,0,.45)] transition-colors hover:bg-[#545b5d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B93A6]">
            {s.store}
          </a>
        </div>
        <div className="relative z-10 overflow-hidden rounded-[16px] border border-black/35 bg-[#1e2123] px-4 py-4 shadow-[inset_0_2px_12px_rgba(0,0,0,.3)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold">{s.confirmed}</p>
              <p className="mt-1 text-xs text-white/65">{s.receipt}</p>
            </div>
            <div className="min-w-0 shrink-0 text-end">
              <p className="text-xs text-white/65">{s.total}</p>
              <p dir="ltr" className="mt-0.5 text-base font-bold tabular-nums">{formatIQD(total)}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-white/70" role="status" aria-live="polite">
            <span className="relative grid h-5 w-5 shrink-0 place-items-center">
              <AnimatePresence mode="wait" initial={false}>
                {stage === "complete" ? (
                  <motion.span key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-emerald-400">
                    <CheckCircle2 aria-hidden="true" className="h-[18px] w-[18px]" />
                  </motion.span>
                ) : (
                  <motion.span key="working" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <LoaderCircle aria-hidden="true" className="h-[18px] w-[18px] animate-spin motion-reduce:animate-none" />
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={stage} initial={{ y: reduced ? 0 : 4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: reduced ? 0 : -4, opacity: 0 }} transition={{ duration: 0.16 }}>
                {statusText}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
        <div aria-hidden="true" className="absolute inset-x-6 bottom-3 z-30 h-2 rounded bg-[#0b0d0e] shadow-[inset_0_1px_4px_rgba(0,0,0,.9),0_1px_0_rgba(255,255,255,.06)]" />
      </div>

      {/* The sheet emerges from UNDER the printer, not as a floating card. */}
      <div className="relative z-10 -mt-4 w-[calc(80%+3rem)] max-w-full overflow-hidden px-3 pb-5">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-3 top-0 z-20 h-2 bg-[#101517]/70 blur-[5px]" />
        <motion.div
          // Remount the sheet for every Replay, so resetting it never animates
          // upwards in view. Use transform keyframes like the Dqnamo original.
          key={runId}
          initial={reduced ? false : {
            transform: "translateY(calc(-100% + 2px))",
            opacity: 0,
          }}
          animate={{
            transform: reduced || stage === "complete"
              ? "translateY(0%)"
              : stage === "printing"
                ? feedFrames
                : "translateY(calc(-100% + 2px))",
            opacity: reduced || stage === "printing" || stage === "complete" ? 1 : 0,
          }}
          transition={{
            transform: {
              duration: reduced ? 0 : PRINTER_FEED_DURATION,
              ease: "linear",
              times: !reduced && stage === "printing" ? PRINTER_FEED_TIMES : undefined,
            },
            opacity: { duration: reduced ? 0 : 0.16 },
          }}
          aria-hidden={stage !== "complete"}
          onAnimationComplete={() => {
            // Wait for the actual paper-feed animation, not a wall-clock timer.
            if (stage === "printing") setStage("complete");
          }}
          className="relative drop-shadow-[0_12px_14px_rgba(11,30,40,.16)]"
        >
          <article
            dir={i18n.dir()}
            className="relative min-h-[380px] bg-[#FFFEFB] px-6 pb-9 pt-7 text-[#0B1E28] shadow-[0_8px_25px_rgba(11,30,40,.18)]"
            style={{ clipPath: paperCut }}
            aria-label={s.receipt}
          >
            <div className="border-b border-dashed border-[#0B1E28]/25 pb-5 text-center">
              <img src="/brand/aquavo-v2-icon.svg" alt="" width={42} height={32} className="mx-auto h-8 w-auto object-contain" />
              <strong dir="ltr" className="mt-1 block text-sm font-extrabold tracking-[.08em]">AQUAVO</strong>
              <p className="mt-2 text-[10px] font-semibold">{s.number}: <bdi dir="ltr">{orderNumber}</bdi></p>
              {dateLabel && <p className="mt-1 text-[10px] text-[#0B1E28]/65">{dateLabel}</p>}
            </div>

            <div className="border-b border-dashed border-[#0B1E28]/25 py-4 text-[11px]">
              <p className="mb-3 text-xs font-bold">{s.items}</p>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={item.productId + "-" + (item.variantLabel || index)} className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-semibold leading-5">{item.productName || item.productId}</p>
                      {item.variantLabel && <p className="text-[#0B1E28]/65">{item.variantLabel}</p>}
                      <p className="text-[#0B1E28]/60">× {item.quantity}</p>
                    </div>
                    <span dir="ltr" className="shrink-0 text-[10px] font-bold tabular-nums">{formatIQD(Number(item.priceAtPurchase || 0) * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-b border-dashed border-[#0B1E28]/25 py-4 text-[11px]">
              <div className="flex justify-between gap-2"><span>{s.subtotal}</span><bdi dir="ltr">{formatIQD(subtotal)}</bdi></div>
              <div className="flex justify-between gap-2"><span>{s.delivery}</span><bdi dir="ltr">{formatIQD(deliveryFee)}</bdi></div>
              {discount > 0 && <div className="flex justify-between gap-2"><span>{s.discount}</span><bdi dir="ltr">-{formatIQD(discount)}</bdi></div>}
            </div>

            <div className="flex items-center justify-between gap-2 py-4 text-sm font-extrabold">
              <span>{s.total}</span><bdi dir="ltr">{formatIQD(total)}</bdi>
            </div>
            <div className="border-b border-dashed border-[#0B1E28]/25 pb-4 text-[10px]">
              <strong className="block">{s.payment}</strong>
              <p className="mt-1 leading-5">{paymentLabel}</p>
            </div>
            <p className="mt-4 text-center text-[10px] text-[#0B1E28]/65">{s.thanks}</p>

            <div aria-hidden="true" className="mx-auto mt-4 h-8 w-36 max-w-full" style={{
              backgroundImage: "repeating-linear-gradient(to right,#0B1E28 0px,#0B1E28 2px,transparent 2px,transparent 4px,#0B1E28 4px,#0B1E28 5px,transparent 5px,transparent 8px)",
            }} />
            <p dir="ltr" className="mt-1 break-all text-center font-mono text-[9px] tracking-[.08em] text-[#0B1E28]/55">{orderNumber}</p>
          </article>
        </motion.div>
      </div>
    </section>
  );
}
