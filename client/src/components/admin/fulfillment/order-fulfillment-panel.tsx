// The single mount point for the per-order fulfillment costing UX.
// Composes: تجهيز الطلب · خطة التغليف المقترحة · تاريخ التجهيز وإعادة الإرسال ·
// إجمالي تكلفة الطلب.
import { CartonPlanViewer } from "@/components/admin/packaging";
import { FulfillmentDraftPanel } from "./fulfillment-draft-panel";
import { FulfillmentHistoryPanel } from "./fulfillment-history-panel";
import { FulfillmentProfitabilityPanel } from "./fulfillment-profitability-panel";
import { OrderCartonPlanSection } from "./order-carton-plan-section";

export function OrderFulfillmentPanel({ orderId }: { orderId: string }) {
  if (!orderId) return null;
  return (
    <div dir="rtl" className="space-y-3" data-testid="order-fulfillment-panel">
      <FulfillmentDraftPanel orderId={orderId} />
      {/* The planner was built, tested and reachable by API, but nothing ever
          rendered it. This is the order workflow it was written for. */}
      <OrderCartonPlanSection orderId={orderId}>
        <CartonPlanViewer orderId={orderId} />
      </OrderCartonPlanSection>
      <FulfillmentHistoryPanel orderId={orderId} />
      <FulfillmentProfitabilityPanel orderId={orderId} />
    </div>
  );
}
