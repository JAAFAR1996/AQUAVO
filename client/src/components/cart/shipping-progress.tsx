import { useCart } from "@/contexts/cart-context";
import { formatIQD } from "@/lib/utils";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants/shipping";

interface ShippingProgressProps {
  compact?: boolean;
}

export function ShippingProgress({ compact = false }: ShippingProgressProps) {
  const { totalPrice } = useCart();

  const progress = Math.min(100, (totalPrice / FREE_SHIPPING_THRESHOLD) * 100);
  const remaining = FREE_SHIPPING_THRESHOLD - totalPrice;
  const isUnlocked = totalPrice >= FREE_SHIPPING_THRESHOLD;

  const bar = (
    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
      <div
        className="bg-gradient-to-r from-[#199bb8] to-[#22c55e] rounded-full h-2"
        style={{
          width: `${progress}%`,
          transition: "width 600ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </div>
  );

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1">{bar}</div>
        <span className="text-xs text-white/70 whitespace-nowrap shrink-0">
          {isUnlocked
            ? "شحن مجاني"
            : `باقي ${formatIQD(remaining)}`}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2 ${
        isUnlocked ? "bg-[#22c55e]/10 border-[#22c55e]/30" : ""
      }`}
    >
      {isUnlocked ? (
        <p className="text-sm font-semibold text-[#22c55e] text-center">
          حصلت على شحن مجاني! 🎉
        </p>
      ) : (
        <p className="text-sm text-white/70">
          باقي{" "}
          <span className="font-semibold text-[#199bb8]">
            {formatIQD(remaining)}
          </span>{" "}
          للشحن المجاني ✈
        </p>
      )}
      {bar}
    </div>
  );
}
