import { formatIQD } from "@/lib/utils";
import { DELIVERY_FEE, DELIVERY_DAYS } from "@/lib/constants/shipping";

interface ShippingProgressProps {
  compact?: boolean;
}

export function ShippingProgress({ compact = false }: ShippingProgressProps) {
  if (compact) {
    return (
      <div className="text-xs text-muted-foreground">
        التوصيل {formatIQD(DELIVERY_FEE)} لكل العراق خلال {DELIVERY_DAYS}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
      <p className="text-sm text-muted-foreground">
        رسوم التوصيل{" "}
        <span className="font-semibold text-[#0B93A6]">
          {formatIQD(DELIVERY_FEE)}
        </span>{" "}
        لبغداد وكل المحافظات خلال {DELIVERY_DAYS}.
      </p>
    </div>
  );
}
