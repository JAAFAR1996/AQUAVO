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

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function WoodSaleCountdown({ compact = false }: { compact?: boolean }) {
  const [remaining, setRemaining] = useState(getRemainingTime);

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(getRemainingTime()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  if (remaining.remainingMs <= 0) return null;

  const clock = `${pad(remaining.hours)}:${pad(remaining.minutes)}:${pad(remaining.seconds)}`;
  const label = remaining.days > 0 ? `${remaining.days} يوم • ${clock}` : clock;

  return (
    <div
      className={
        compact
          ? "inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[#d8d0c3] bg-white/70 px-2 py-1 text-[10px] font-semibold text-[#365158]"
          : "inline-flex items-center gap-2 rounded-xl border border-[#d8d0c3] bg-[#fbfaf7] px-3 py-2 text-sm font-semibold text-[#365158] shadow-sm"
      }
      aria-label={`ينتهي عرض نهاية الشهر خلال ${label}`}
    >
      <Clock3 className={compact ? "h-3 w-3 shrink-0" : "h-4 w-4 shrink-0"} aria-hidden="true" />
      <span className="whitespace-nowrap">ينتهي خلال</span>
      <span dir="ltr" className="whitespace-nowrap tabular-nums text-[#173a43]">
        {label}
      </span>
    </div>
  );
}
