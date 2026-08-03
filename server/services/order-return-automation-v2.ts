import { sql } from "drizzle-orm";
import { getDb } from "../db.js";
import { recordFinancialChange } from "./accountingAuditTrail.js";

type Db = NonNullable<ReturnType<typeof getDb>>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Row = Record<string, unknown>;

function rowsOf(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  const rows = (result as { rows?: Row[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

function money(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export interface AutomaticReturnLifecycleInput {
  orderId: string;
  orderNumber?: string | null;
  oldStatus: string;
  newStatus: string;
  actorId?: string | null;
  actorName?: string | null;
}

/**
 * The finance screen must never ask the owner to create a return event that the
 * order workflow already knows about. Rejection creates the event atomically;
 * physical receipt enriches the same event and marks inventory as restocked.
 *
 * Carrier penalties remain zero until a carrier settlement proves them. This is
 * deliberate: automation must not invent a 5,000 IQD loss merely because the
 * order was rejected. The event stays `recorded` and the carrier reconciliation
 * promotes exact money later.
 */
export async function syncAutomaticReturnLifecycle(
  tx: Tx,
  input: AutomaticReturnLifecycleInput,
): Promise<{ eventId: string | null; action: "none" | "created" | "received" }> {
  const rejectionStatuses = new Set(["rejected", "rejected_carrier"]);
  const receivedStatuses = new Set(["returned", "rejected_returned"]);
  if (!rejectionStatuses.has(input.newStatus) && !receivedStatuses.has(input.newStatus)) {
    return { eventId: null, action: "none" };
  }

  const affectedResult = await tx.execute(sql`
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'orderItemId',oi.id,
      'productId',oi.product_id,
      'qty',oi.quantity,
      'variantId',NULLIF(oi.metadata->>'variantId',''),
      'unitCostAtTime',COALESCE(oi.unit_cost_price,0),
      'cogsAtTime',COALESCE(oi.unit_cost_price,0)*oi.quantity,
      'costStatus',oi.cost_snapshot_status
    ) ORDER BY oi.id),'[]'::jsonb) AS items
    FROM public.order_items_relational oi
    WHERE oi.order_id=${input.orderId}
  `);
  const affectedItems = rowsOf(affectedResult)[0]?.items ?? [];

  const existingResult = await tx.execute(sql`
    SELECT id,status,restocked,packaging_loss
    FROM public.order_return_events
    WHERE order_id=${input.orderId}
      AND type='rejected_delivery'
      AND reason='AUTO_ORDER_STATUS_REJECTED'
      AND status<>'disputed'
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE
  `);
  const existing = rowsOf(existingResult)[0];

  if (rejectionStatuses.has(input.newStatus)) {
    if (existing) return { eventId: String(existing.id), action: "none" };
    const inserted = await tx.execute(sql`
      INSERT INTO public.order_return_events(
        order_id,type,reason,refund_amount,delivery_cost_loss,return_shipping_cost,
        packaging_loss,product_write_off_amount,cogs_loss,restocked,affected_items,
        status,note,created_by,created_at,updated_at,packaging_loss_source
      ) VALUES(
        ${input.orderId},'rejected_delivery','AUTO_ORDER_STATUS_REJECTED',
        0,0,0,0,0,0,false,${JSON.stringify(affectedItems)}::jsonb,'recorded',
        'أنشأه النظام تلقائياً عند رفض الاستلام. المخزون لا يرجع قبل استلام الطرد فعلياً، وأي أجرة أو اقتطاع تعتمد من كشف شركة التوصيل فقط.',
        ${input.actorId ?? null},clock_timestamp(),clock_timestamp(),'fulfillment_snapshot'
      ) RETURNING id
    `);
    const eventId = String(rowsOf(inserted)[0]?.id ?? "");
    if (eventId) {
      await recordFinancialChange(tx as never, {
        entityType: "return_event",
        entityId: eventId,
        action: "create",
        fieldName: "order_status_automation",
        newValue: { orderId: input.orderId, orderNumber: input.orderNumber, status: input.newStatus },
        reason: "إنشاء راجع تلقائي من حالة الطلب",
        performedBy: input.actorId ?? null,
        performedByName: input.actorName ?? null,
      });
    }
    return { eventId: eventId || null, action: "created" };
  }

  const fulfillmentResult = await tx.execute(sql`
    SELECT COALESCE(
      (SELECT SUM(e.actual_cost)
       FROM public.order_fulfillment_events e
       WHERE e.order_id=${input.orderId}
         AND e.event_type='original'
         AND e.workflow_state='confirmed'
         AND e.actual_cost IS NOT NULL),
      (SELECT COALESCE(o.box_cost,0) FROM public.orders o WHERE o.id=${input.orderId}),
      0
    ) AS packaging_loss
  `);
  const packagingLoss = money(rowsOf(fulfillmentResult)[0]?.packaging_loss);

  let eventId = existing ? String(existing.id) : "";
  if (!eventId) {
    const inserted = await tx.execute(sql`
      INSERT INTO public.order_return_events(
        order_id,type,reason,refund_amount,delivery_cost_loss,return_shipping_cost,
        packaging_loss,product_write_off_amount,cogs_loss,restocked,restocked_at,
        affected_items,status,note,created_by,created_at,updated_at,packaging_loss_source
      ) VALUES(
        ${input.orderId},'rejected_delivery','AUTO_ORDER_STATUS_REJECTED',
        0,0,0,${packagingLoss},0,0,true,clock_timestamp(),${JSON.stringify(affectedItems)}::jsonb,
        'recorded',
        'أنشأه النظام تلقائياً عند استلام الطرد الراجع. المنتجات أُعيدت للمخزون؛ خسارة التغليف مأخوذة من لقطة تجهيز الطلب، وأي أجرة ناقل تنتظر كشف الشركة.',
        ${input.actorId ?? null},clock_timestamp(),clock_timestamp(),'fulfillment_snapshot'
      ) RETURNING id
    `);
    eventId = String(rowsOf(inserted)[0]?.id ?? "");
  } else {
    await tx.execute(sql`
      UPDATE public.order_return_events
      SET restocked=true,
          restocked_at=COALESCE(restocked_at,clock_timestamp()),
          affected_items=${JSON.stringify(affectedItems)}::jsonb,
          packaging_loss=${packagingLoss},
          packaging_loss_source='fulfillment_snapshot',
          cogs_loss=0,
          product_write_off_amount=0,
          note='حدّثه النظام تلقائياً عند استلام الطرد الراجع. المنتجات أُعيدت للمخزون؛ خسارة التغليف مأخوذة من لقطة تجهيز الطلب، وأي أجرة ناقل تنتظر كشف الشركة.',
          updated_at=clock_timestamp()
      WHERE id=${eventId}
    `);
  }

  if (eventId) {
    await recordFinancialChange(tx as never, {
      entityType: "return_event",
      entityId: eventId,
      action: "status_change",
      fieldName: "physical_receipt",
      oldValue: { orderStatus: input.oldStatus, restocked: Boolean(existing?.restocked) },
      newValue: { orderStatus: input.newStatus, restocked: true, packagingLoss },
      reason: "استلام الطرد الراجع وتحديثه تلقائياً من حالة الطلب",
      performedBy: input.actorId ?? null,
      performedByName: input.actorName ?? null,
    });
  }
  return { eventId: eventId || null, action: "received" };
}
