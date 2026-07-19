// AC-1 "Thumb-Zone Confirmation Tray" — Preview concept A for Add-to-Cart.
//
// Premium confirmation that springs up from the bottom thumb zone carrying the
// REAL payload (image · name · variant · qty · price) plus two next-actions.
// Enter/exit use CSS keyframes (always play on mount, honor reduced-motion) so the
// surface can never strand invisible. Presentational only.

import { CheckCircle2, ShoppingBag, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatIQD } from "@/lib/utils";
import type { AddToCartPreviewDetail } from "@/lib/commerce-motion/preview-flags";

interface Props {
  item: AddToCartPreviewDetail;
  /** How many adds have coalesced into this one tray (>=1). */
  addedCount: number;
  /** Drives enter (true) / exit (false); the host unmounts after the exit. */
  show: boolean;
  onViewCart: () => void;
  onContinue: () => void;
  onPause: () => void;
  onResume: () => void;
}

export function AddToCartTray({
  item, addedCount, show, onViewCart, onContinue, onPause, onResume,
}: Props) {
  return (
    <div
      dir="rtl"
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-[70] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:left-4 sm:right-auto sm:max-w-sm ${show ? "aqv-cm-enter" : "aqv-cm-exit"}`}
      onMouseEnter={onPause}
      onMouseLeave={onResume}
      onFocusCapture={onPause}
      onBlurCapture={onResume}
    >
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
      >
        {/* AQUAVO identity accent */}
        <div className="h-1 w-full bg-gradient-to-l from-[#0B93A6] to-[#0B64A6]" />

        {/* AQUAVO flow-mark watermark */}
        <img
          src="/brand/aquavo-v2-icon.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -left-4 -top-2 w-24 opacity-[0.06] dark:opacity-[0.10]"
        />

        <div className="flex items-center gap-3 p-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
            {item.image ? (
              <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#0B93A6]">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>تمت الإضافة إلى السلة</span>
              {addedCount > 1 && (
                <span className="mr-auto rounded-full bg-[#0B93A6]/10 px-2 py-0.5 text-[11px] font-bold text-[#0B93A6]">
                  {addedCount} عناصر
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{item.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              {item.variantLabel && (
                <span className="rounded-md bg-muted px-1.5 py-0.5">{item.variantLabel}</span>
              )}
              <span>الكمية: {item.quantity}</span>
              {item.price > 0 && <span className="font-medium text-foreground">{formatIQD(item.price * item.quantity)}</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 p-3 pt-0">
          <Button onClick={onViewCart} className="h-11 gap-1.5 font-semibold">
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            عرض السلة
          </Button>
          <Button onClick={onContinue} variant="outline" className="h-11 gap-1.5 font-semibold">
            متابعة التسوق
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
