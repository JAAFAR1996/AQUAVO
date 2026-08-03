import { randomUUID } from "node:crypto";
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

async function automaticCartonClassification(
  tx: Tx,
  input: AutomaticReturnLifecycleInput,
  returnEventId: string,
): Promise<number> {
  const lineResult = await tx.execute(sql`
    SELECT
      l.id,
      l.event_id,
      l.material_id,
      l.material_name_snapshot,
      l.quantity,
      l.unit_cost_snapshot,
      l.total_cost,
      l.cost_status,
      COALESCE((
        SELECT SUM(x.quantity)
        FROM public.order_return_packaging_losses x
        WHERE x.fulfillment_line_id=l.id
      ),0) AS classified_quantity
    FROM public.order_fulfillment_lines l
    JOIN public.order_fulfillment_events e ON e.id=l.event_id
    JOIN public.fulfillment_materials m ON m.id=l.material_id
    WHERE l.order_id=${input.orderId}
      AND e.event_type='original'
      AND e.workflow_state='confirmed'
      AND m.material_kind='carton'
    ORDER BY l.id
    FOR UPDATE OF l
  `);

  for (const line of rowsOf(lineResult)) {
    const used = money(line.quantity);
    const already = money(line.classified_quantity);
    const remaining = Math.max(used - already, 0);
    if (remaining <= 0) continue;
    const unit = line.unit_cost_snapshot == null
      ? (used > 0 && line.total_cost != null ? money(line.total_cost) / used : null)
      : money(line.unit_cost_snapshot);
    const total = unit == null ? null : unit * remaining;
    await tx.execute(sql`
      INSERT INTO public.order_return_packaging_losses(
        id,order_id,return_event_id,fulfillment_event_id,fulfillment_line_id,
        material_id,material_name_snapshot,quantity,
        original_unit_cost_snapshot,original_total_cost_snapshot,original_cost_status,
        loss_category,classification_mode,is_reclassification_only,reason,recorded_by,recorded_at
      ) VALUES(
        ${randomUUID()},${input.orderId},${returnEventId},${String(line.event_id)},${String(line.id)},
        ${line.material_id == null ? null : String(line.material_id)},${String(line.material_name_snapshot)},${remaining},
        ${unit},${total},${String(line.cost_status ?? "unknown")},
        'damaged_carton','automatic',true,'كارتونة تالفة بسبب طلب راجع',${input.actorId ?? null},clock_timestamp()
      )
      ON CONFLICT(return_event_id,fulfillment_line_id) DO NOTHING
    `);
  }

  const totalResult = await tx.execute(sql`
    SELECT COALESCE(SUM(original_total_cost_snapshot),0) AS amount,
           COUNT(*) FILTER(WHERE original_total_cost_snapshot IS NULL) AS unknown_lines
    FROM public.order_return_packaging_losses
    WHERE return_event_id=${returnEventId}
      AND is_reclassification_only=true
  `);
  const totalRow = rowsOf(totalResult)[0];
  if (money(totalRow?.unknown_lines) > 0) {
    throw Object.assign(new Error("RETURN_CARTON_COST_UNKNOWN: كلفة كارتونة الراجع غير مكتملة"), { statusCode: 409 });
  }
  return money(totalRow?.amount);
}

/**
 * The finance screen never creates a return by hand. Rejection creates the
 * operational event atomically; actual receipt restores product stock, freezes
 * a carton-only return classification and verifies the zero-cash event.
 *
 * Carrier deductions are never guessed. When the carrier statement contains an
 * exceptional deduction it is posted as a separate, evidenced reconciliation
 * adjustment rather than rewriting this immutable order-status event.
 */
export async function syncAutomaticReturnLifecycle(
  tx: Tx,
  input: AutomaticReturnLifecycleInput,
): Promise<{ eventId: string | null; action: "none" | "created" | "received"; cartonClassification: number }> {
  const rejectionStatuses = new Set(["rejected", "rejected_carrier"]);
  const receivedStatuses = new Set(["returned", "rejected_returned"]);
  if (!rejectionStatuses.has(input.newStatus) && !receivedStatuses.has(input.newStatus)) {
    return { eventId: null, action: "none", cartonClassification: 0 };
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
    SELECT id,status,restocked
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
    if (existing) return { eventId: String(existing.id), action: "none", cartonClassification: 0 };
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
    return { eventId: eventId || null, action: "created", cartonClassification: 0 };
  }

  let eventId = existing ? String(existing.id) : "";
  if (!eventId) {
    const inserted = await tx.execute(sql`
      INSERT INTO public.order_return_events(
        order_id,type,reason,refund_amount,delivery_cost_loss,return_shipping_cost,
        packaging_loss,product_write_off_amount,cogs_loss,restocked,restocked_at,
        affected_items,status,note,created_by,created_at,updated_at,packaging_loss_source
      ) VALUES(
        ${input.orderId},'rejected_delivery','AUTO_ORDER_STATUS_REJECTED',
        0,0,0,0,0,0,true,clock_timestamp(),${JSON.stringify(affectedItems)}::jsonb,
        'recorded','أنشأه النظام تلقائياً عند استلام الطرد الراجع.',
        ${input.actorId ?? null},clock_timestamp(),clock_timestamp(),'fulfillment_snapshot'
      ) RETURNING id
    `);
    eventId = String(rowsOf(inserted)[0]?.id ?? "");
  }
  if (!eventId) throw new Error("فشل إنشاء سجل الراجع التلقائي");

  const cartonClassification = await automaticCartonClassification(tx, input, eventId);
  await tx.execute(sql`
    UPDATE public.order_return_events
    SET restocked=true,
        restocked_at=COALESCE(restocked_at,clock_timestamp()),
        affected_items=${JSON.stringify(affectedItems)}::jsonb,
        packaging_loss=0,
        packaging_loss_source='fulfillment_snapshot',
        delivery_cost_loss=0,
        return_shipping_cost=0,
        cogs_loss=0,
        product_write_off_amount=0,
        status='verified',
        note=${`أتمّه النظام تلقائياً عند استلام الطرد. المنتجات رجعت للمخزون، وتصنيف الكارتونة التالفة ${Math.round(cartonClassification).toLocaleString("en-US")} د.ع للعرض والتدقيق فقط ولا يُخصم مرتين. اقتطاعات الناقل تعتمد من كشف الشركة.`},
        updated_at=clock_timestamp()
    WHERE id=${eventId}
  `);

  await recordFinancialChange(tx as never, {
    entityType: "return_event",
    entityId: eventId,
    action: "status_change",
    fieldName: "physical_receipt",
    oldValue: { orderStatus: input.oldStatus, restocked: Boolean(existing?.restocked) },
    newValue: { orderStatus: input.newStatus, restocked: true, status: "verified", cartonClassification },
    reason: "استلام الطرد وإكمال الراجع تلقائياً من حالة الطلب",
    performedBy: input.actorId ?? null,
    performedByName: input.actorName ?? null,
  });

  return { eventId, action: "received", cartonClassification };
}
