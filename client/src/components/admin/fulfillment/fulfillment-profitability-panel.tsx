// ─────────────────────────────────────────────────────────────────────────────
// إجمالي تكلفة الطلب · الربح المباشر · حالة البيانات
//
// Every figure below is read straight off `OrderCostBreakdown` from
// `GET /orders/:id/profitability`. This component NEVER sums, subtracts or
// derives a monetary value — clicking a figure only FILTERS the already-fetched
// event/line records that produced it, so the owner can see the evidence.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { formatMargin, formatQuantity } from "@/lib/fulfillment-format";
import {
  useFulfillmentEvents, useOrderProfitability,
  type FulfillmentEvent, type OrderCostBreakdown,
} from "@/hooks/use-fulfillment";
import {
  Amount, CostStatusBadge, DrilldownRow, EmptyState, ErrorState, LoadingState, SectionCard,
} from "./fulfillment-primitives";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err ?? "خطأ غير معروف");
}

/** Events that actually contribute: confirmed, non-reversal, of the given types. */
function contributingEvents(events: FulfillmentEvent[], types: string[]): FulfillmentEvent[] {
  return events.filter(
    (e) => types.includes(e.eventType) && !e.reversalOfEventId && e.workflowState !== "reversed",
  );
}

export function FulfillmentProfitabilityPanel({ orderId }: { orderId: string }) {
  const { data, isLoading, isError, error, refetch } = useOrderProfitability(orderId);
  const eventsQuery = useFulfillmentEvents(orderId);
  const [open, setOpen] = useState<string | null>(null);

  if (isLoading) {
    return <SectionCard title="إجمالي تكلفة الطلب"><LoadingState /></SectionCard>;
  }
  if (isError) {
    return (
      <SectionCard title="إجمالي تكلفة الطلب">
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      </SectionCard>
    );
  }
  if (!data) {
    return <SectionCard title="إجمالي تكلفة الطلب"><EmptyState message="لا توجد بيانات ربحية لهذا الطلب" /></SectionCard>;
  }

  const events = eventsQuery.data ?? [];
  const toggle = (key: string) => setOpen((cur) => (cur === key ? null : key));

  return (
    <SectionCard
      title="إجمالي تكلفة الطلب"
      action={
        <span className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">حالة البيانات</span>
          <CostStatusBadge status={data.dataStatus} />
        </span>
      }
    >
      <div className="space-y-0.5" data-testid="profitability-rows">
        <DrilldownRow label="المبلغ المحصل" value={data.collectedAmount} />
        <DrilldownRow label="الإيراد" value={data.revenue} />

        <DrilldownRow
          label="كلفة البضاعة"
          value={data.productCogs}
          status={data.productCostStatus}
          open={open === "productCogs"}
          onToggle={() => toggle("productCogs")}
        >
          <ItemsDrilldown breakdown={data} />
        </DrilldownRow>

        <DrilldownRow
          label="تغليف المورد"
          value={data.supplierPackaging}
          open={open === "supplierPackaging"}
          onToggle={() => toggle("supplierPackaging")}
        >
          <ItemsDrilldown breakdown={data} />
        </DrilldownRow>

        {data.aquavoFulfillmentCost != null && (
          <DrilldownRow
            label="تكلفة تجهيز AQUAVO"
            value={data.aquavoFulfillmentCost}
            status={data.fulfillmentCostStatus}
            open={open === "fulfillment"}
            onToggle={() => toggle("fulfillment")}
          >
            <EventsDrilldown
              events={contributingEvents(events, ["original", "reshipment", "return_handling", "replacement", "adjustment"])}
              loading={eventsQuery.isLoading}
            />
          </DrilldownRow>
        )}

        {data.courierCost != null && <DrilldownRow label="كلفة التوصيل" value={data.courierCost} />}
        {data.commissions != null && <DrilldownRow label="العمولات" value={data.commissions} />}
        {data.paymentFees != null && <DrilldownRow label="رسوم الدفع" value={data.paymentFees} />}
        {data.otherDirectCosts != null && <DrilldownRow label="تكاليف مباشرة أخرى" value={data.otherDirectCosts} />}

        {data.totalKnownDirectCost != null && (
          <DrilldownRow label="إجمالي التكلفة المباشرة" value={data.totalKnownDirectCost} emphasis />
        )}
        {data.contributionProfit != null && (
          <DrilldownRow label="الربح المباشر" value={data.contributionProfit} emphasis />
        )}
      </div>

      {data.contributionMargin != null ? (
        <div className="mt-2 flex items-center justify-between gap-2 px-2">
          <span className="text-sm text-muted-foreground">هامش الربح المباشر</span>
          <span data-testid="contribution-margin" className="text-sm font-semibold tabular-nums">
            {formatMargin(data.contributionMargin)}
          </span>
        </div>
      ) : (
        <div className="mt-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
          {data.productCogs == null
            ? "الربح النهائي يظهر بعد اكتمال كلفة المنتجات."
            : data.aquavoFulfillmentCost == null
              ? "كلفة المنتجات واضحة. الربح النهائي يظهر بعد تثبيت كلفة تجهيز الطلب."
              : "الربح النهائي ينتظر اكتمال بقية التكاليف المباشرة."}
        </div>
      )}

      <UnallocatedNotes breakdown={data} />
    </SectionCard>
  );
}

function ItemsDrilldown({ breakdown }: { breakdown: OrderCostBreakdown }) {
  if (breakdown.items.length === 0) return <EmptyState message="لا توجد بنود منتجات لهذا الطلب" />;
  return (
    <ul className="space-y-1" data-testid="items-drilldown">
      {breakdown.items.map((it) => (
        <li key={it.productId} className="rounded border border-border/60 px-2 py-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">{it.name}</span>
            <CostStatusBadge status={it.costStatus} />
          </div>
          <div className="text-muted-foreground">
            الكمية: {formatQuantity(it.qty)} · كلفة الشراء للوحدة: <Amount value={it.unitCostPrice} className="text-xs" />
            {" · "}تغليف المورد للوحدة: <Amount value={it.unitPackagingCost} className="text-xs" />
            {" · "}إدراج للوحدة: <Amount value={it.unitInsertCost} className="text-xs" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EventsDrilldown({ events, loading }: { events: FulfillmentEvent[]; loading: boolean }) {
  if (loading) return <LoadingState label="جاري تحميل الأحداث..." />;
  if (events.length === 0) return <EmptyState message="لا توجد أحداث تجهيز وراء هذا المبلغ" />;
  return (
    <ul className="space-y-1" data-testid="events-drilldown">
      {events.map((ev) => (
        <li key={ev.id} className="rounded border border-border/60 px-2 py-1">
          <div className="flex items-center justify-between gap-2">
            <span>حدث #{ev.sequenceNumber}</span>
            <Amount value={ev.actualCost} className="text-xs" />
          </div>
          <ul className="mt-1 space-y-0.5">
            {ev.lines.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 text-muted-foreground">
                <span className="truncate">{l.materialName} × {formatQuantity(l.quantity, l.unit)}</span>
                <Amount value={l.totalCost} className="text-xs" />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function UnallocatedNotes({ breakdown }: { breakdown: OrderCostBreakdown }) {
  const u = breakdown.unallocated;
  const notes: string[] = [];
  if (u.unknownProductLines > 0) notes.push(`${u.unknownProductLines} بند منتج بكلفة غير معروفة`);
  if (u.unknownFulfillmentLines > 0) notes.push(`${u.unknownFulfillmentLines} بند تجهيز بكلفة غير معروفة`);
  if (u.legacyBoxCost != null) notes.push("يوجد كلفة صندوق قديمة غير مرحّلة إلى حدث تجهيز");
  if (u.reversedFulfillmentCost > 0) notes.push("توجد أحداث تجهيز معكوسة مستبعدة من الإجماليات");
  if (notes.length === 0) return null;
  return (
    <ul
      data-testid="unallocated-notes"
      className="mt-3 space-y-1 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
    >
      {notes.map((n) => <li key={n}>{n}</li>)}
    </ul>
  );
}
