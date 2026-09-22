import { formatIQD } from "@/lib/utils";
import { DELIVERY_FEE, DELIVERY_DAYS } from "@/lib/constants/shipping";
import { useTranslation } from "react-i18next";
import { Truck } from "lucide-react";

interface ShippingProgressProps {
  compact?: boolean;
}

export function ShippingProgress({ compact = false }: ShippingProgressProps) {
  const { t } = useTranslation("checkout");
  if (compact) {
    return (
      <div className="text-xs text-muted-foreground">
        {t("shippingProgress.line", { fee: formatIQD(DELIVERY_FEE), days: DELIVERY_DAYS })}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary/10 bg-primary/[0.045] p-4">
      <Truck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <p className="text-sm leading-6 text-muted-foreground">
        {t("shippingProgress.feeLabel")}
        <span className="font-semibold text-primary">
          {formatIQD(DELIVERY_FEE)}
        </span>{" "}
        {t("shippingProgress.everywhere", { days: DELIVERY_DAYS })}
      </p>
    </div>
  );
}
