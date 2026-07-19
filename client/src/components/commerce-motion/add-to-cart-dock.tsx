// AC-3 "Shared-Element Cart Dock" — Preview concept B for Add-to-Cart.
//
// The added product settles into a persistent thumb-zone dock bar with a running
// count and a single primary action. Enter/exit via CSS keyframes (bulletproof,
// reduced-motion aware). Presentational only.

import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AddToCartPreviewDetail } from "@/lib/commerce-motion/preview-flags";

interface Props {
  item: AddToCartPreviewDetail;
  /** Most-recent thumbnails (newest first), for the overlapping stack. */
  thumbs: string[];
  /** Total items added in this dock session. */
  addedCount: number;
  /** Drives enter (true) / exit (false); the host unmounts after the exit. */
  show: boolean;
  onViewCart: () => void;
  onPause: () => void;
  onResume: () => void;
}

export function AddToCartDock({
  item, thumbs, addedCount, show, onViewCart, onPause, onResume,
}: Props) {
  const stack = thumbs.slice(0, 3);

  return (
    <div
      dir="rtl"
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-[70] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${show ? "aqv-cm-enter" : "aqv-cm-exit"}`}
      onMouseEnter={onPause}
      onMouseLeave={onResume}
    >
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto mx-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-border bg-card/95 p-2.5 shadow-2xl backdrop-blur-md"
      >
        {/* Overlapping thumbnail stack — the product "docks" here */}
        <div className="relative flex shrink-0 items-center">
          {stack.map((src, i) => (
            <div
              key={src + i}
              className="h-11 w-11 overflow-hidden rounded-lg border-2 border-card bg-muted shadow-sm"
              style={{ marginInlineStart: i === 0 ? 0 : -16, zIndex: stack.length - i }}
            >
              {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : null}
            </div>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#0B93A6]">أُضيف إلى السلة</div>
          <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="grid h-7 min-w-7 place-items-center rounded-full bg-[#0B93A6] px-2 text-xs font-bold text-white"
            aria-label={`${addedCount} عناصر في السلة`}
          >
            {addedCount}
          </span>
          <Button onClick={onViewCart} size="sm" className="h-9 gap-1.5 font-semibold">
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            عرض السلة
          </Button>
        </div>
      </div>
    </div>
  );
}
