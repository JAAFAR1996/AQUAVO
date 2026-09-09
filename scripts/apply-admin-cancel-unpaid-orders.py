from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected 1 match, found {count} for:\n{old[:220]}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


client = "client/src/components/admin/orders-management.tsx"

replace_once(
    client,
    'import { Archive, Package, Search, Eye, AlertTriangle, ReceiptText, RotateCcw, Trash2 } from "lucide-react";',
    'import { Archive, Package, Search, Eye, AlertTriangle, ReceiptText, RotateCcw, Trash2, XCircle } from "lucide-react";',
)

replace_once(
    client,
    'const PAYMENT_LOCKED_STATUSES = new Set(["pending_payment", "payment_review"]);\n\nconst ARCHIVABLE_STATUSES',
    'const PAYMENT_LOCKED_STATUSES = new Set(["pending_payment", "payment_review"]);\n\nconst CANCELLABLE_STATUSES = new Set(["pending_payment", "pending", "confirmed", "processing"]);\n\nconst ARCHIVABLE_STATUSES',
)

replace_once(
    client,
    '  const [archiveOrderId, setArchiveOrderId] = useState<string | null>(null);\n  const [purgeOrderId, setPurgeOrderId] = useState<string | null>(null);',
    '  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);\n  const [archiveOrderId, setArchiveOrderId] = useState<string | null>(null);\n  const [purgeOrderId, setPurgeOrderId] = useState<string | null>(null);',
)

replace_once(
    client,
    "{order.status !== 'delivered' && !PAYMENT_LOCKED_STATUSES.has(order.status) && (",
    "{order.status !== 'delivered' && order.status !== 'cancelled' && !PAYMENT_LOCKED_STATUSES.has(order.status) && (",
)

eye_block = '''                        <Button size="sm" variant="outline" onClick={() => { setSelectedOrder(order); setIsDetailOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>

'''
replace_once(
    client,
    eye_block,
    eye_block
    + '''                        {CANCELLABLE_STATUSES.has(order.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="إلغاء الطلب"
                            onClick={() => setCancelOrderId(order.id)}
                          >
                            <XCircle className="h-4 w-4 ml-1" />
                            إلغاء الطلب
                          </Button>
                        )}

''',
)

delivery_marker = '''      {/* Delivery Confirmation Dialog */}
'''
replace_once(
    client,
    delivery_marker,
    '''      {/* Cancel Order Confirmation Dialog */}
      <AlertDialog open={!!cancelOrderId} onOpenChange={(open) => { if (!open) setCancelOrderId(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              إلغاء الطلب؟
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              استخدم الإلغاء إذا الزبون تراجع أو رفض الطلب قبل الشحن. إذا الطلب بانتظار الدفع الإلكتروني راح يتحرر حجز المخزون ويتوقف التنفيذ. إذا وصل دفع متأخر بعد الإلغاء، النظام يمنع التجهيز ويحوله تلقائياً إلى مراجعة دفع حتى ما يضيع حق الزبون.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>رجوع</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                const orderId = cancelOrderId;
                setCancelOrderId(null);
                if (orderId) void handleStatusChange(orderId, 'cancelled');
              }}
            >
              تأكيد إلغاء الطلب
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

'''
    + delivery_marker,
)

admin = "server/routes/admin-orders-v2.ts"
replace_once(
    admin,
    '''type LockedOrder = {
  id: string;
  order_number: string | null;
  status: string;
  user_id: string | null;
  client_ip: string | null;
  carrier: string | null;
  carrier_fee: string | null;
};''',
    '''type LockedOrder = {
  id: string;
  order_number: string | null;
  status: string;
  payment_status: string | null;
  user_id: string | null;
  client_ip: string | null;
  carrier: string | null;
  carrier_fee: string | null;
};
type LockedPayment = {
  id: string;
  status: string;
  transaction_id: string | null;
};''',
)

replace_once(
    admin,
    '          SELECT id,order_number,status,user_id,client_ip,carrier,carrier_fee\n          FROM orders WHERE id=${req.params.id} FOR UPDATE',
    '          SELECT id,order_number,status,payment_status,user_id,client_ip,carrier,carrier_fee\n          FROM orders WHERE id=${req.params.id} FOR UPDATE',
)

replace_once(
    admin,
    '''        // Payment lifecycle states are owned by the Al-Qaseh verification flow.
        // Admin status buttons must never bypass payment verification or a paid
        // inventory-review hold. The payment service moves a verified successful
        // order from `pending_payment` to `pending` directly and atomically.
        if (PAYMENT_MANAGED_STATUSES.has(oldStatus) && input.status !== oldStatus) {
          throw Object.assign(
            new Error(paymentManagedTransitionMessage(oldStatus)),
            { statusCode: 409 },
          );
        }
''',
    '''        // Payment lifecycle states are owned by the Al-Qaseh verification flow.
        // The single admin exception is cancelling an UNPAID `pending_payment`
        // order. That path releases the reservation and closes the local payment
        // record atomically. A late provider success is handled by the payment
        // service as `payment_review`; it can never resurrect fulfillment.
        const cancellingPendingPayment = oldStatus === "pending_payment" && input.status === "cancelled";
        if (PAYMENT_MANAGED_STATUSES.has(oldStatus) && input.status !== oldStatus && !cancellingPendingPayment) {
          throw Object.assign(
            new Error(paymentManagedTransitionMessage(oldStatus)),
            { statusCode: 409 },
          );
        }

        if (cancellingPendingPayment) {
          const paymentResult = await tx.execute(sql`
            SELECT id,status,transaction_id
            FROM public.payments
            WHERE order_id=${locked.id} AND method='alqaseh'
            FOR UPDATE
          `);
          const payment = rowsOf<LockedPayment>(paymentResult)[0];
          if (!payment) {
            throw Object.assign(new Error("سجل الدفع الإلكتروني لهذا الطلب غير موجود؛ أوقف الإلغاء وراجع الطلب."), { statusCode: 409 });
          }
          if (locked.payment_status === "paid" || payment.status === "completed") {
            throw Object.assign(new Error("تم تأكيد دفع هذا الطلب بالفعل. لا يمكن إلغاؤه كطلب غير مدفوع؛ راجع الدفع والاسترجاع أولاً."), { statusCode: 409 });
          }

          await tx.execute(sql`
            UPDATE public.payment_stock_reservations
               SET status='released',
                   release_reason='admin_cancelled_before_payment',
                   updated_at=clock_timestamp()
             WHERE order_id=${locked.id} AND status='active'
          `);

          await tx.execute(sql`
            UPDATE public.payments
               SET status='cancelled',
                   provider_response=COALESCE(provider_response,'{}'::jsonb) || jsonb_build_object(
                     'adminCancelledAt', clock_timestamp(),
                     'adminCancelledBy', ${actor.id},
                     'adminCancelReason', ${input.financialReason ?? "إلغاء الزبون قبل إتمام الدفع"}
                   ),
                   updated_at=clock_timestamp()
             WHERE id=${payment.id}
          `);
        }
''',
)

replace_once(
    admin,
    '''        const [updated] = await tx.update(orders).set({
          status: input.status,
          ...(input.shippingCost !== undefined ? { shippingCost: String(input.shippingCost) } : {}),''',
    '''        const [updated] = await tx.update(orders).set({
          status: input.status,
          ...(cancellingPendingPayment ? { paymentStatus: "cancelled" } : {}),
          ...(input.shippingCost !== undefined ? { shippingCost: String(input.shippingCost) } : {}),''',
)

payment_service = "server/services/alqaseh-order-payment.ts"
replace_once(
    payment_service,
    '''export class PaidOrderInventoryConflict extends Error {
  constructor(message = STOCK_ERROR_INSUFFICIENT) {
    super(message);
    this.name = "PaidOrderInventoryConflict";
  }
}
''',
    '''export class PaidOrderInventoryConflict extends Error {
  constructor(message = STOCK_ERROR_INSUFFICIENT) {
    super(message);
    this.name = "PaidOrderInventoryConflict";
  }
}

class CancelledOrderPaidConflict extends Error {
  constructor() {
    super("Payment succeeded after the order was cancelled");
    this.name = "CancelledOrderPaidConflict";
  }
}
''',
)

replace_once(
    payment_service,
    '''    if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });
    const lines = Array.isArray(order.items) ? order.items : [];''',
    '''    if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });
    if (order.status === "cancelled" || order.paymentStatus === "cancelled") {
      throw Object.assign(new Error("هذا الطلب ملغي ولا يمكن إعادة فتح حجز الدفع أو المخزون له."), { status: 409 });
    }
    const lines = Array.isArray(order.items) ? order.items : [];''',
)

replace_once(
    payment_service,
    '''      if (order.paymentStatus === "paid" && payment.status === "completed") {
        return {
          order,
          loyaltyResult: null,
          newlyFinalized: false,
          sessionId: typeof providerMeta.sessionId === "string" ? providerMeta.sessionId : undefined,
        };
      }

      const lines = Array.isArray(order.items) ? order.items : [];''',
    '''      if (order.paymentStatus === "paid" && payment.status === "completed") {
        return {
          order,
          loyaltyResult: null,
          newlyFinalized: false,
          sessionId: typeof providerMeta.sessionId === "string" ? providerMeta.sessionId : undefined,
        };
      }

      if (order.status === "cancelled" || order.paymentStatus === "cancelled" || payment.status === "cancelled") {
        throw new CancelledOrderPaidConflict();
      }

      const lines = Array.isArray(order.items) ? order.items : [];''',
)

replace_once(
    payment_service,
    '''async function recordPaidInventoryReview(
  orderId: string,
  providerPaymentId: string,
  context: AlqasehPaymentContext,
): Promise<void> {''',
    '''async function recordPaidInventoryReview(
  orderId: string,
  providerPaymentId: string,
  context: AlqasehPaymentContext,
  reviewReason: "inventory_conflict" | "paid_after_cancellation" = "inventory_conflict",
): Promise<void> {''',
)

replace_once(
    payment_service,
    '''        inventoryReview: true,
        verifiedAt: new Date().toISOString(),''',
    '''        inventoryReview: true,
        reviewReason,
        verifiedAt: new Date().toISOString(),''',
)

replace_once(
    payment_service,
    '''  await sendTelegramMessage(
    `⚠️ <b>دفع إلكتروني ناجح يحتاج مراجعة مخزون</b>\\nالطلب: <code>${orderId}</code>\\nPayment: <code>${providerPaymentId}</code>\\nتم تأكيد الدفع من Al-Qaseh لكن لم يتم تنفيذ المخزون/التنفيذ تلقائياً.`
  ).catch(() => {});''',
    '''  const reviewTitle = reviewReason === "paid_after_cancellation"
    ? "دفع إلكتروني وصل بعد إلغاء الطلب"
    : "دفع إلكتروني ناجح يحتاج مراجعة مخزون";
  const reviewDetail = reviewReason === "paid_after_cancellation"
    ? "الطلب كان ملغياً قبل وصول تأكيد الدفع. لم يتم تجهيز الطلب أو استهلاك المخزون؛ راجع المبلغ ونفّذ الاسترجاع المالي حسب الإجراء المعتمد."
    : "تم تأكيد الدفع من Al-Qaseh لكن لم يتم تنفيذ المخزون/التنفيذ تلقائياً.";
  await sendTelegramMessage(
    `⚠️ <b>${reviewTitle}</b>\\nالطلب: <code>${orderId}</code>\\nPayment: <code>${providerPaymentId}</code>\\n${reviewDetail}`
  ).catch(() => {});''',
)

replace_once(
    payment_service,
    '''    } catch (error) {
      if (!(error instanceof PaidOrderInventoryConflict)) throw error;
      await recordPaidInventoryReview(order.id, providerPaymentId, context);
      const refreshed = await getOrderAndPayment(order.id);
      finalOrder = refreshed.order;
      inventoryReview = true;
    }
  } else {''',
    '''    } catch (error) {
      if (!(error instanceof PaidOrderInventoryConflict) && !(error instanceof CancelledOrderPaidConflict)) throw error;
      const reviewReason = error instanceof CancelledOrderPaidConflict
        ? "paid_after_cancellation"
        : "inventory_conflict";
      await recordPaidInventoryReview(order.id, providerPaymentId, context, reviewReason);
      const refreshed = await getOrderAndPayment(order.id);
      finalOrder = refreshed.order;
      inventoryReview = true;
    }
  } else {''',
)

replace_once(
    payment_service,
    '''    const isCurrentAttempt = payment.transactionId === providerPaymentId;
    if (isCurrentAttempt) {
      const meta = safeProviderResponse(payment.providerResponse);
      const attempts = Array.isArray(meta.attempts) ? meta.attempts : [];
      await dbOrThrow().transaction(async (tx) => {
        await tx.update(payments).set({
          status: mappedStatus === "pending" ? "pending" : "failed",''',
    '''    const isCurrentAttempt = payment.transactionId === providerPaymentId;
    if (isCurrentAttempt) {
      const meta = safeProviderResponse(payment.providerResponse);
      const attempts = Array.isArray(meta.attempts) ? meta.attempts : [];
      const locallyCancelled = order.status === "cancelled" || order.paymentStatus === "cancelled" || payment.status === "cancelled";
      await dbOrThrow().transaction(async (tx) => {
        await tx.update(payments).set({
          status: locallyCancelled ? "cancelled" : (mappedStatus === "pending" ? "pending" : "failed"),''',
)

replace_once(
    payment_service,
    '''        await tx.update(orders).set({ paymentStatus: mappedStatus, updatedAt: new Date() } as any)
          .where(eq(orders.id, order.id));
      });
      finalOrder = { ...order, paymentStatus: mappedStatus } as Order;''',
    '''        await tx.update(orders).set({ paymentStatus: locallyCancelled ? "cancelled" : mappedStatus, updatedAt: new Date() } as any)
          .where(eq(orders.id, order.id));
      });
      finalOrder = { ...order, paymentStatus: locallyCancelled ? "cancelled" : mappedStatus } as Order;''',
)

test_path = Path("server/services/__tests__/alqaseh-admin-cancellation-contract.test.ts")
test_path.parent.mkdir(parents=True, exist_ok=True)
test_path.write_text('''import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const adminRoute = fs.readFileSync(path.join(root, "server/routes/admin-orders-v2.ts"), "utf8");
const paymentService = fs.readFileSync(path.join(root, "server/services/alqaseh-order-payment.ts"), "utf8");
const adminUi = fs.readFileSync(path.join(root, "client/src/components/admin/orders-management.tsx"), "utf8");

describe("admin cancellation for unpaid Al-Qaseh orders", () => {
  it("only allows the payment-managed escape hatch to cancelled", () => {
    expect(adminRoute).toContain('oldStatus === "pending_payment" && input.status === "cancelled"');
    expect(adminRoute).toContain("admin_cancelled_before_payment");
    expect(adminRoute).toContain('{ paymentStatus: "cancelled" }');
  });

  it("prevents a late successful payment from reviving fulfillment", () => {
    expect(paymentService).toContain("CancelledOrderPaidConflict");
    expect(paymentService).toContain('"paid_after_cancellation"');
    expect(paymentService).toContain('status: locallyCancelled ? "cancelled"');
  });

  it("gives admins an explicit cancel action but keeps hard-delete protected", () => {
    expect(adminUi).toContain("CANCELLABLE_STATUSES");
    expect(adminUi).toContain("تأكيد إلغاء الطلب");
    expect(adminUi).toContain("order.status !== 'cancelled'");
  });
});
''', encoding="utf-8")
