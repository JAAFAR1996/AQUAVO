// The single mount point for the per-order fulfillment costing UX.
// Composes: تجهيز الطلب · تاريخ التجهيز وإعادة الإرسال · إجمالي تكلفة الطلب.
import { FulfillmentDraftPanel } from "./fulfillment-draft-panel";
import { FulfillmentHistoryPanel } from "./fulfillment-history-panel";
import { FulfillmentProfitabilityPanel } from "./fulfillment-profitability-panel";

export function OrderFulfillmentPanel({ orderId }: { orderId: string }) {
  if (!orderId) return null;
  return (
    <div dir="rtl" className="space-y-3" data-testid="order-fulfillment-panel">
      <FulfillmentDraftPanel orderId={orderId} />
      <FulfillmentHistoryPanel orderId={orderId} />
      <FulfillmentProfitabilityPanel orderId={orderId} />
    </div>
  );
}
