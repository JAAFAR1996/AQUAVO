// The single mount point for the per-order fulfillment costing UX.
// Composes: تجهيز الطلب · اختيار الكارتون · تاريخ التجهيز وإعادة الإرسال ·
// إجمالي تكلفة الطلب.
import { useEffect, useState } from "react";
import { CheckCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";
import { ReturnCartonLossPanel } from "@/components/admin/packaging";
import { useFulfillmentEvents } from "@/hooks/use-fulfillment";
import { CustomerMessagingPanel } from "./customer-messaging-panel";
import { FulfillmentDraftPanel } from "./fulfillment-draft-panel";
import { FulfillmentHistoryPanel } from "./fulfillment-history-panel";
import { FulfillmentProfitabilityPanel } from "./fulfillment-profitability-panel";
import { OrderCartonPlanSection } from "./order-carton-plan-section";

type PurgeEligibility = {
  canPurge: boolean;
  reason?: string | null;
};

export function OrderFulfillmentPanel({ orderId }: { orderId: string }) {
  const { toast } = useToast();
  const [eligibility, setEligibility] = useState<PurgeEligibility | null>(null);
  const [purging, setPurging] = useState(false);
  const fulfillmentEvents = useFulfillmentEvents(orderId);

  // An order can have only one active ORIGINAL fulfillment event. Once that event
  // exists, never mount a second editable ORIGINAL draft. The carton selector stays
  // available: if the old confirmed event has no carton, it records only the carton
  // as an adjustment so the original fulfillment cost/stock can never be duplicated.
  const activeOriginal = fulfillmentEvents.data?.find(
    (event) => event.eventType === "original" && event.workflowState !== "reversed",
  );

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    fetch(`/api/admin/orders/${orderId}/purge-eligibility`, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return await response.json() as PurgeEligibility;
      })
      .then((data) => {
        if (!cancelled && data) setEligibility(data);
      })
      .catch(() => {
        // The purge control is optional UI. Fulfillment must keep rendering if
        // eligibility cannot be loaded.
      });
    return () => { cancelled = true; };
  }, [orderId]);

  if (!orderId) return null;

  const handlePurge = async () => {
    const confirmed = window.confirm(
      "مسح هذا الطلب نهائياً؟\n\nسيختفي الطلب من النظام وتُرجع آثاره القابلة للعكس من المخزون والكوبونات والنقاط. لا يمكن التراجع عن هذا الإجراء.",
    );
    if (!confirmed) return;

    setPurging(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/purge`, {
        method: "POST",
        credentials: "include",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        body: JSON.stringify({ reason: "مسح نهائي من إدارة الطلبات" }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.message || "تعذر مسح الطلب");
      }

      toast({ title: "تم مسح الطلب نهائياً", description: "تمت إزالة الطلب وآثاره القابلة للعكس من النظام" });
      window.setTimeout(() => window.location.reload(), 150);
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر مسح الطلب";
      toast({ title: "لم يتم المسح", description: message, variant: "destructive" });
      setPurging(false);
    }
  };

  return (
    <div dir="rtl" className="space-y-3" data-testid="order-fulfillment-panel">
      {fulfillmentEvents.isLoading ? (
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
          جاري تحميل حالة التجهيز…
        </div>
      ) : fulfillmentEvents.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50/60 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-400">
          تعذر تحميل حالة التجهيز. أغلق الطلب وافتحه مرة ثانية قبل إجراء أي تعديل.
        </div>
      ) : activeOriginal ? (
        <>
          <div
            className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20"
            data-testid="original-fulfillment-confirmed"
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  تجهيز الطلب مؤكد مسبقاً
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  التجهيز الأصلي ما راح يتكرر. إذا الكارتون بعده مو محفوظ، اختاره أدناه وينضاف وحده للكلفة والمخزون.
                </p>
              </div>
            </div>
          </div>
          <OrderCartonPlanSection orderId={orderId} afterConfirmation />
        </>
      ) : (
        <>
          <FulfillmentDraftPanel orderId={orderId} />
          <OrderCartonPlanSection orderId={orderId} />
        </>
      )}

      <FulfillmentHistoryPanel orderId={orderId} />
      {/* Damaged cartons from returns. Reclassification, never a second expense —
          the panel says so, and eventActualReturnLoss now enforces it. */}
      <ReturnCartonLossPanel orderId={orderId} />
      <CustomerMessagingPanel orderId={orderId} />
      <FulfillmentProfitabilityPanel orderId={orderId} />

      {eligibility?.canPurge && (
        <div className="rounded-lg border border-red-200 bg-red-50/60 p-3 dark:border-red-900/60 dark:bg-red-950/20 print:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">مسح الطلب نهائياً</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                للطلب المكرر أو الملغي فقط. المسح يرجع الآثار القابلة للعكس ثم يزيل الطلب من النظام.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={purging}
              onClick={() => void handlePurge()}
              className="shrink-0"
            >
              <Trash2 className="ml-1 h-4 w-4" />
              {purging ? "جاري المسح..." : "مسح نهائي"}
            </Button>
          </div>
        </div>
      )}

      {eligibility && !eligibility.canPurge && (
        <p className="text-xs text-muted-foreground print:hidden" data-testid="order-purge-protected">
          الطلب المستلم أو المحاسبي محمي من المسح النهائي.
        </p>
      )}
    </div>
  );
}
