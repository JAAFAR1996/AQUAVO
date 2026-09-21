import { formatIQD } from "@/lib/utils";
import { DELIVERY_FEE, DELIVERY_DAYS } from "@/lib/constants/shipping";
import { useTranslation } from "react-i18next";

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
    <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
      <p className="text-sm text-muted-foreground">
        {t("shippingProgress.feeLabel")}
        <span className="font-semibold text-primary">
          {formatIQD(DELIVERY_FEE)}
        </span>{" "}
        {t("shippingProgress.everywhere", { days: DELIVERY_DAYS })}
      </p>
    </div>
  );
}
