// ─────────────────────────────────────────────────────────────────────────────
// تاريخ التجهيز وإعادة الإرسال — the full immutable event history for an order:
// the original shipment, every reshipment/replacement/return, and every reversal,
// in server-assigned sequence order. Each event expands to its frozen lines.
//
// All amounts come from the event snapshots verbatim; nothing is recomputed here.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  eventTypeLabel, formatDateTime, formatQuantity, workflowStateLabel,
} from "@/lib/fulfillment-format";
import { useFulfillmentEvents, useReverseEvent, type FulfillmentEvent } from "@/hooks/use-fulfillment";
import {
  Amount, CostStatusBadge, EmptyState, ErrorState, LoadingState, SectionCard,
} from "./fulfillment-primitives";

const MIN_REASON = 3;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err ?? "خطأ غير معروف");
}

export function FulfillmentHistoryPanel({ orderId }: { orderId: string }) {
  const { data, isLoading, isError, error, refetch } = useFulfillmentEvents(orderId);
  const reverse = useReverseEvent(orderId);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [reversing, setReversing] = useState<{ eventId: string; reason: string } | null>(null);

  if (isLoading) {
    return <SectionCard title="تاريخ التجهيز وإعادة الإرسال"><LoadingState /></SectionCard>;
  }
  if (isError) {
    return (
      <SectionCard title="تاريخ التجهيز وإعادة الإرسال">
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      </SectionCard>
    );
  }

  const events = data ?? [];

  return (
    <SectionCard title="تاريخ التجهيز وإعادة الإرسال">
      {events.length === 0 ? (
        <EmptyState message="لا توجد أحداث تجهيز مسجلة لهذا الطلب بعد" />
      ) : (
        <ol className="space-y-2" data-testid="event-history">
          {events.map((ev) => (
            <EventRow
              key={ev.id}
              event={ev}
              open={!!expanded[ev.id]}
              onToggle={() => setExpanded((p) => ({ ...p, [ev.id]: !p[ev.id] }))}
              onReverse={() => setReversing({ eventId: ev.id, reason: "" })}
            />
          ))}
        </ol>
      )}

      {reversing && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/70 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="عكس الحدث"
            dir="rtl"
            data-testid="reverse-dialog"
            className="w-full max-w-md space-y-3 rounded-xl border border-border bg-background p-4"
          >
            <h3 className="text-sm font-bold text-destructive">عكس حدث تجهيز</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              العكس لا يحذف الحدث — يسجل قيداً معاكساً يعيد المواد للمخزون ويستبعد الكلفة من الحسابات.
            </p>
            <label className="block text-xs text-muted-foreground">
              سبب العكس (مطلوب)
              <input
                className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                value={reversing.reason}
                onChange={(e) => setReversing({ ...reversing, reason: e.target.value })}
                placeholder="اكتب سبب العكس"
                data-testid="reverse-reason"
              />
            </label>
            {reversing.reason.trim().length > 0 && reversing.reason.trim().length < MIN_REASON && (
              <p className="text-xs text-destructive">السبب يجب أن يكون 3 أحرف على الأقل</p>
            )}
            {reverse.isError && <ErrorState message={errorMessage(reverse.error)} />}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setReversing(null)}>إلغاء</Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                data-testid="reverse-submit"
                disabled={reversing.reason.trim().length < MIN_REASON || reverse.isPending}
                onClick={() => reverse.mutate(
                  { eventId: reversing.eventId, reason: reversing.reason.trim() },
                  { onSuccess: () => setReversing(null) },
                )}
              >
                {reverse.isPending ? "جاري العكس..." : "تأكيد العكس"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function EventRow({
  event, open, onToggle, onReverse,
}: { event: FulfillmentEvent; open: boolean; onToggle: () => void; onReverse: () => void }) {
  const isReversal = !!event.reversalOfEventId;
  const reversed = event.workflowState === "reversed";
  const canReverse = !isReversal && !reversed;

  return (
    <li className="rounded-lg border border-border/70" data-testid="event-row" data-sequence={event.sequenceNumber}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full px-3 py-2 text-right hover:bg-muted/50 rounded-lg"
      >
        <span className="flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">#{event.sequenceNumber}</span>
            <span className="text-sm font-medium">{eventTypeLabel(event.eventType)}</span>
            {isReversal && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">قيد عكسي</span>
            )}
            {reversed && (
              <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">
                {workflowStateLabel(event.workflowState)}
              </span>
            )}
            <CostStatusBadge status={event.costStatus} />
          </span>
          <span className="flex items-center gap-2">
            <Amount value={event.actualCost} className="text-sm" />
            <span className="text-xs text-muted-foreground">{open ? "▲" : "▼"}</span>
          </span>
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">{formatDateTime(event.recordedAt)}</span>
      </button>

      {open && (
        <div className="border-t border-border/60 px-3 py-2 space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <span className="text-muted-foreground">التكلفة المتوقعة</span>
            <span className="text-left"><Amount value={event.expectedCost} className="text-xs" /></span>
            <span className="text-muted-foreground">التكلفة الفعلية</span>
            <span className="text-left"><Amount value={event.actualCost} className="text-xs" /></span>
            <span className="text-muted-foreground">فرق التكلفة</span>
            <span className="text-left"><Amount value={event.variance} className="text-xs" variance /></span>
          </div>
          {event.varianceReason && <p className="text-muted-foreground">سبب الفرق: {event.varianceReason}</p>}
          {event.adjustmentReason && <p className="text-muted-foreground">سبب التعديل: {event.adjustmentReason}</p>}

          {event.lines.length === 0 ? (
            <EmptyState message="لا توجد بنود مسجلة لهذا الحدث" />
          ) : (
            <ul className="space-y-1" data-testid="event-lines">
              {event.lines.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 rounded border border-border/60 px-2 py-1">
                  <span className="min-w-0">
                    <span className="block truncate">{l.materialName}</span>
                    <span className="text-muted-foreground">
                      {formatQuantity(l.quantity, l.unit)} · كلفة الوحدة: <Amount value={l.unitCost} className="text-xs" />
                    </span>
                  </span>
                  <Amount value={l.totalCost} className="text-xs" />
                </li>
              ))}
            </ul>
          )}

          {canReverse && (
            <div className="flex justify-end">
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={onReverse}>
                عكس الحدث
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
