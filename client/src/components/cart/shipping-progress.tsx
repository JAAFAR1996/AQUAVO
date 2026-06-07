import { formatIQD } from "@/lib/utils";
import { DELIVERY_FEE, DELIVERY_DAYS } from "@/lib/constants/shipping";

interface ShippingProgressProps {
  compact?: boolean;
}

export function ShippingProgress({ compact = false }: ShippingProgressProps) {
  if (compact) {
    return (
      <div className="text-xs text-white/70">
        التوصيل {formatIQD(DELIVERY_FEE)} لكل العراق خلال {DELIVERY_DAYS}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm text-white/70">
        رسوم التوصيل{" "}
        <span className="font-semibold text-[#199bb8]">
          {formatIQD(DELIVERY_FEE)}
        </span>{" "}
        لبغداد وكل المحافظات خلال {DELIVERY_DAYS}.
      </p>
    </div>
  );
}
