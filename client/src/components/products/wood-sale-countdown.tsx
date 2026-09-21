import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";

import type { Product } from "@/types";

export const WOOD_MONTH_END_SALE_END_AT = "2026-09-30T23:59:59+03:00";
const WOOD_MONTH_END_SALE_END_MS = new Date(WOOD_MONTH_END_SALE_END_AT).getTime();

type SaleProduct = Pick<Product, "subcategory" | "price" | "originalPrice">;

export function isWoodMonthEndSale(product: SaleProduct): boolean {
  const currentPrice = Number(product.price ?? 0);
  const originalPrice = Number(product.originalPrice ?? 0);

  return (
    product.subcategory === "أخشاب طبيعية" &&
    originalPrice > 10_000 &&
    originalPrice > currentPrice &&
    Date.now() <= WOOD_MONTH_END_SALE_END_MS
  );
}

function getRemainingTime() {
  const remainingMs = Math.max(0, WOOD_MONTH_END_SALE_END_MS - Date.now());
  const totalSeconds = Math.floor(remainingMs / 1000);

  return {
    remainingMs,
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}

function CountdownUnit({
  value,
  label,
  compact,
}: {
  value: number;
  label: string;
  compact: boolean;
}) {
  return (
    <span className={compact ? "inline-flex items-baseline gap-0.5" : "inline-flex flex-col items-center leading-none"}>
      <span
        dir="ltr"
        className={
          compact
            ? "tabular-nums font-bold text-[#173a43]"
            : "min-w-7 text-center text-base font-bold tabular-nums text-[#173a43]"
        }
      >
        {value.toString().padStart(2, "0")}
      </span>
      <span className={compact ? "text-[9px] text-[#607278]" : "mt-1 text-[10px] font-medium text-[#607278]"}>
        {label}
      </span>
    </span>
  );
}

export function WoodSaleCountdown({ compact = false }: { compact?: boolean }) {
  const [remaining, setRemaining] = useState(getRemainingTime);

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(getRemainingTime()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  if (remaining.remainingMs <= 0) return null;

  return (
    <div
      className={
        compact
          ? "inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[#d8d0c3] bg-white/70 px-2 py-1 text-[10px] font-semibold text-[#365158]"
          : "inline-flex flex-wrap items-center gap-2 rounded-xl border border-[#d8d0c3] bg-[#fbfaf7] px-3 py-2 text-sm font-semibold text-[#365158] shadow-sm"
      }
      aria-label={`ينتهي عرض نهاية الشهر خلال ${remaining.days} يوم و${remaining.hours} ساعة و${remaining.minutes} دقيقة و${remaining.seconds} ثانية`}
      dir="rtl"
    >
      <Clock3 className={compact ? "h-3 w-3 shrink-0" : "h-4 w-4 shrink-0"} aria-hidden="true" />

      {compact ? (
        <>
          <span className="whitespace-nowrap text-[9px] font-medium text-[#607278]">باقي</span>
          <CountdownUnit value={remaining.days} label="يوم" compact />
          <span className="text-[#b2aaa0]" aria-hidden="true">•</span>
          <CountdownUnit value={remaining.hours} label="ساعة" compact />
          <span className="text-[#b2aaa0]" aria-hidden="true">•</span>
          <CountdownUnit value={remaining.minutes} label="دقيقة" compact />
          <span className="text-[#b2aaa0]" aria-hidden="true">•</span>
          <CountdownUnit value={remaining.seconds} label="ثانية" compact />
        </>
      ) : (
        <>
          <span className="ml-1 whitespace-nowrap text-xs font-medium text-[#607278]">باقي</span>
          <div className="flex items-center gap-2">
            <CountdownUnit value={remaining.days} label="يوم" compact={false} />
            <span className="text-[#d0c8bc]" aria-hidden="true">:</span>
            <CountdownUnit value={remaining.hours} label="ساعة" compact={false} />
            <span className="text-[#d0c8bc]" aria-hidden="true">:</span>
            <CountdownUnit value={remaining.minutes} label="دقيقة" compact={false} />
            <span className="text-[#d0c8bc]" aria-hidden="true">:</span>
            <CountdownUnit value={remaining.seconds} label="ثانية" compact={false} />
          </div>
        </>
      )}
    </div>
  );
}
