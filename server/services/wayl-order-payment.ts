import { randomBytes, randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import {
  coupons,
  orderItems,
  orders,
  payments,
  settings,
  type Order,
  type OrderLineItem,
} from "../../shared/schema.js";
import { getDb } from "../db.js";
import {
  COST_SNAPSHOT_VERSION,
  buildProductCostSnapshot,
  lockProductRowForUpdate,
  toJsonbCostFields,
  toRelationalCostFields,
  type CostSnapshotStatus,
  type ProductCostSnapshot,
} from "./product-cost-snapshot.js";
import { loyaltyStorage, type TransactionalOrderLoyaltyResult } from "../storage/loyalty-storage.js";
import { isCanonicalInventoryBalanceError, STOCK_ERROR_INSUFFICIENT } from "../storage/order-storage.js";
import { sendTelegramMessage } from "./order-notifications.js";
import {
  createWaylLink,
  getWaylLinkByReferenceId,
  type WaylLink,
} from "./wayl-client.js";
import { enqueuePaidOrderOutbox, processPaymentOutboxForOrder } from "./payment-maintenance.js";

const IRAQI_DENOMINATION = 250;
const ORDER_NUMBER_MAX_ATTEMPTS = 3;
const PAYMENT_CURRENCY = "IQD";
export const PAYMENT_METHOD = "wayl";

export type AquavoPaymentStatus = "pending" | "paid" | "failed" | "cancelled" | "expired";

export interface OnlineCheckoutItemInput {
  productId: string;
  quantity: number;
  variantId?: string;
}

export interface OnlineCheckoutInput {
  idempotencyKey: string;
  userId: string | null;
  sessionId?: string;
  customerInfo: {
    name: string;
    phone: string;
    address: string;
    email?: string;
  };
  items: OnlineCheckoutItemInput[];
  couponCode?: string;
  useCashback?: boolean;
  cashbackToUse?: number;
}

export interface PreparedOnlineOrder {
  order: Order;
  payment: any;
  reused: boolean;
}

export interface StartedWaylPayment {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  paymentId: string;
  redirectUrl: string;
  reused: boolean;
}

export interface VerifiedOnlinePaymentState {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  paymentId: string;
  paymentStatus: AquavoPaymentStatus;
  providerStatus: string;
  orderStatus: string;
  inventoryReview: boolean;
  newlyFinalized: boolean;
}

interface FinalizeResult {
  order: Order;
  loyaltyResult: TransactionalOrderLoyaltyResult | null;
  newlyFinalized: boolean;
  sessionId?: string;
}

export class PaidOrderInventoryConflict extends Error {
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

function dbOrThrow() {
  const db = getDb();
  if (!db) throw new Error("Database not connected");
  return db;
}

function reservationTtlMinutes(): number {
  const configured = Number(process.env.WAYL_RESERVATION_TTL_MINUTES ?? 15);
  if (!Number.isFinite(configured)) return 15;
  return Math.max(5, Math.min(60, Math.trunc(configured)));
}

async function activeReservedQuantity(
  tx: any,
  productId: string,
  variantId: string | undefined,
  excludingOrderId?: string,
): Promise<number> {
  const result = await tx.execute(sql`
    SELECT COALESCE(SUM(quantity),0)::int AS reserved
      FROM payment_stock_reservations
     WHERE product_id=${productId}
       AND variant_id IS NOT DISTINCT FROM ${variantId ?? null}
       AND status='active'
       AND expires_at > now()
       ${excludingOrderId ? sql`AND order_id IS DISTINCT FROM ${excludingOrderId}` : sql``}
  `);
  return Number(rowsFromExecute(result)[0]?.reserved ?? 0);
}

async function upsertReservationLines(tx: any, orderId: string, lines: OrderLineItem[]): Promise<void> {
  const ttl = reservationTtlMinutes();
  for (const line of lines) {
    await tx.execute(sql`
      INSERT INTO payment_stock_reservations(order_id,product_id,variant_id,quantity,status,expires_at,created_at,updated_at)
      VALUES (${orderId},${line.productId},${line.variantId ?? null},${Number(line.quantity)},'active',now()+(${ttl} * interval '1 minute'),now(),now())
      ON CONFLICT DO NOTHING
    `);
    await tx.execute(sql`
      UPDATE payment_stock_reservations
         SET quantity=${Number(line.quantity)}, status='active', release_reason=NULL,
             expires_at=now()+(${ttl} * interval '1 minute'), updated_at=now()
       WHERE order_id=${orderId}
         AND product_id=${line.productId}
         AND variant_id IS NOT DISTINCT FROM ${line.variantId ?? null}
    `);
  }
}

async function ensureOrderReservation(orderId: string): Promise<void> {
  const db = dbOrThrow();
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM orders WHERE id=${orderId} FOR UPDATE`);
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });
    if (order.status === "cancelled" || order.paymentStatus === "cancelled") {
      throw Object.assign(new Error("هذا الطلب ملغي ولا يمكن إعادة فتح حجز الدفع أو المخزون له."), { status: 409 });
    }
    const lines = Array.isArray(order.items) ? order.items : [];
    if (lines.length === 0) throw Object.assign(new Error("Order has no items"), { status: 409 });

    for (const line of lines) {
      const product = await lockProductRowForUpdate(tx, line.productId);
      if (!product) throw Object.assign(new Error(STOCK_ERROR_INSUFFICIENT), { status: 409 });
      const quantity = Number(line.quantity);
      const reservedElsewhere = await activeReservedQuantity(tx, line.productId, line.variantId, orderId);
      if (line.variantId) {
        const variants = Array.isArray(product.variants) ? product.variants : [];
        const variant = variants.find((candidate: any) => candidate.id === line.variantId);
        if (!variant || Number(variant.stock ?? 0) - reservedElsewhere < quantity) {
          throw Object.assign(new Error(STOCK_ERROR_INSUFFICIENT), { status: 409 });
        }
      } else if (Number(product.stock ?? 0) - reservedElsewhere < quantity) {
        throw Object.assign(new Error(STOCK_ERROR_INSUFFICIENT), { status: 409 });
      }
    }
    await upsertReservationLines(tx, order.id, lines);
  });
}

async function releaseOrderReservation(orderId: string, reason: string): Promise<void> {
  const db = dbOrThrow();
  await db.execute(sql`
    UPDATE payment_stock_reservations
       SET status='released', release_reason=${reason}, updated_at=now()
     WHERE order_id=${orderId} AND status='active'
  `);
}

function rowsFromExecute(result: unknown): any[] {
  if (Array.isArray(result)) return result;
  return (result as { rows?: any[] } | undefined)?.rows ?? [];
}

function generateOrderNumber(): string {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `FH-${yy}${mm}${dd}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function parsePositivePrice(value: unknown, label: string): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error(`${label} is not available for purchase`);
  return amount;
}

function safeProviderResponse(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, any>) }
    : {};
}

function paymentAmount(payment: { amount: unknown }): number {
  const amount = Number(payment.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid stored payment amount");
  return amount;
}

function snapshotFromStoredLine(line: OrderLineItem, at: Date): ProductCostSnapshot {
  const status = (line.costStatus ?? "unknown") as CostSnapshotStatus;
  return {
    costPrice: line.costPrice ?? null,
    packagingCost: line.packagingCost ?? null,
    insertCost: line.insertCost ?? null,
    costStatus: status,
    costSource: line.costSource ?? "none",
    costConfidence: status === "unknown" ? null : status === "incomplete" ? "medium" : "high",
    costSnapshotVersion: COST_SNAPSHOT_VERSION,
    costSnapshotAt: at,
  };
}

function normalizeStatus(status: string): string {
  return String(status || "").trim().toLowerCase();
}

/**
 * Documented Wayl link lifecycle (https://wayl.io/docs): Created, Pending,
 * Processing, Complete, Delivered, Cancelled, Rejected, Returned.
 *
 * - "Complete" is the only status the documentation identifies as a successful
 *   payment, so it is the only one that maps to "paid".
 * - "Cancelled" and "Rejected" are the documented terminal non-paid states; only
 *   these unlock a retry (a new link) for the same order.
 * - "Delivered" and "Returned" are post-payment lifecycle states. They are never
 *   used as proof of payment on their own: an order that was verified as paid on
 *   "Complete" stays paid (monotonic guard in verifyAndSyncWaylPayment); an order
 *   that was never verified stays "pending" and is flagged for manual review.
 * - Anything undocumented stays "pending". We never guess a payment into "paid".
 */
export function mapWaylLinkStatus(status: string): AquavoPaymentStatus {
  const normalized = normalizeStatus(status);
  if (normalized === "complete") return "paid";
  if (normalized === "rejected") return "failed";
  if (normalized === "cancelled") return "cancelled";
  return "pending";
}

export function isTerminalNonPaidWaylStatus(status: string): boolean {
  const normalized = normalizeStatus(status);
  return normalized === "cancelled" || normalized === "rejected";
}

export function isPostPaymentWaylStatus(status: string): boolean {
  const normalized = normalizeStatus(status);
  return normalized === "delivered" || normalized === "returned";
}

const LINK_CREATION_CLAIM_TTL_MS = 45_000;

export function isVerifiedPaymentContext(
  context: { referenceId: string; amount: number; currency: string },
  expected: { referenceId: string; amount: number; currency: string },
): boolean {
  return context.referenceId === expected.referenceId
    && Number(context.amount) === Number(expected.amount)
    && String(context.currency).toUpperCase() === expected.currency.toUpperCase();
}

async function getOrderAndPayment(orderId: string) {
  const db = dbOrThrow();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });
  const [payment] = await db.select().from(payments).where(eq(payments.orderId, orderId)).limit(1);
  if (!payment || payment.method !== PAYMENT_METHOD) {
    throw Object.assign(new Error("Online payment not found for this order"), { status: 404 });
  }
  return { order, payment };
}

function attemptSecret(
  payment: { providerResponse?: unknown },
  referenceId: string,
): string | null {
  const meta = safeProviderResponse(payment.providerResponse);
  const attempts = Array.isArray(meta.attempts) ? meta.attempts : [];
  const matched = attempts.find((entry: any) => entry?.referenceId === referenceId);
  const secret = typeof matched?.webhookSecret === "string" ? matched.webhookSecret : "";
  return secret || null;
}

/**
 * Looks up the AQUAVO order that owns a given Wayl referenceId. The first attempt's
 * referenceId is the order id itself; retries use `${orderId}#r{n}` so each Wayl link
 * still has a unique referenceId while remaining traceable to a single AQUAVO order.
 */
function orderIdFromReferenceId(referenceId: string): string {
  const hashIndex = referenceId.indexOf("#");
  return hashIndex === -1 ? referenceId : referenceId.slice(0, hashIndex);
}

export async function findWebhookSecretForReference(referenceId: string): Promise<{ orderId: string; secret: string } | null> {
  const orderId = orderIdFromReferenceId(referenceId);
  const db = dbOrThrow();
  const [payment] = await db.select().from(payments).where(eq(payments.orderId, orderId)).limit(1);
  if (!payment || payment.method !== PAYMENT_METHOD) return null;
  const secret = attemptSecret(payment, referenceId);
  if (!secret) return null;
  return { orderId, secret };
}

export async function prepareOnlineOrder(input: OnlineCheckoutInput): Promise<PreparedOnlineOrder> {
  if (input.useCashback || Number(input.cashbackToUse ?? 0) > 0) {
    throw Object.assign(
      new Error("لا يمكن استخدام رصيد الباقي مع الدفع الإلكتروني حالياً. ألغِ استخدام الرصيد أو اختر الدفع عند الاستلام."),
      { status: 400 },
    );
  }

  const db = dbOrThrow();
  const existing = await db.select().from(orders).where(eq(orders.id, input.idempotencyKey)).limit(1);
  if (existing[0]) {
    const [existingPayment] = await db.select().from(payments).where(eq(payments.orderId, existing[0].id)).limit(1);
    if (existingPayment?.method !== PAYMENT_METHOD) {
      throw Object.assign(new Error("Idempotency key is already attached to another order"), { status: 409 });
    }
    return { order: existing[0], payment: existingPayment, reused: true };
  }

  for (let attempt = 1; attempt <= ORDER_NUMBER_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await db.transaction(async (tx) => {
        const concurrent = await tx.select().from(orders).where(eq(orders.id, input.idempotencyKey)).limit(1);
        if (concurrent[0]) {
          const [concurrentPayment] = await tx.select().from(payments).where(eq(payments.orderId, concurrent[0].id)).limit(1);
          if (concurrentPayment?.method !== PAYMENT_METHOD) {
            throw Object.assign(new Error("Idempotency key is already attached to another order"), { status: 409 });
          }
          return { order: concurrent[0], payment: concurrentPayment, reused: true };
        }

        let subtotal = 0;
        const lines: OrderLineItem[] = [];
        const snapshotAt = new Date();

        for (const item of input.items) {
          const product = await lockProductRowForUpdate(tx, item.productId);
          if (!product) throw Object.assign(new Error(`Product ${item.productId} not found`), { status: 400 });
          const quantity = Number(item.quantity);
          if (!Number.isInteger(quantity) || quantity <= 0) {
            throw Object.assign(new Error(`Invalid quantity for ${product.name}`), { status: 400 });
          }

          let price: number;
          let variantLabel: string | undefined;
          if (item.variantId) {
            const variants = Array.isArray(product.variants) ? product.variants : [];
            const variant = variants.find((candidate: any) => candidate.id === item.variantId);
            if (!variant) throw Object.assign(new Error(`Invalid variant ${item.variantId} for ${product.name}`), { status: 400 });
            const reservedElsewhere = await activeReservedQuantity(tx, product.id, item.variantId, input.idempotencyKey);
            if (Number(variant.stock ?? 0) - reservedElsewhere < quantity) throw Object.assign(new Error(STOCK_ERROR_INSUFFICIENT), { status: 409 });
            price = parsePositivePrice(variant.price, `Variant ${variant.label}`);
            variantLabel = variant.label;
          } else {
            const reservedElsewhere = await activeReservedQuantity(tx, product.id, undefined, input.idempotencyKey);
            if (Number(product.stock ?? 0) - reservedElsewhere < quantity) throw Object.assign(new Error(STOCK_ERROR_INSUFFICIENT), { status: 409 });
            price = parsePositivePrice(product.price, `Product ${product.name}`);
          }

          const lineTotal = price * quantity;
          subtotal += lineTotal;
          const snapshot = buildProductCostSnapshot(product, snapshotAt);
          lines.push({
            productId: product.id,
            productName: product.name,
            quantity,
            ...(item.variantId ? { variantId: item.variantId } : {}),
            ...(variantLabel ? { variantLabel } : {}),
            priceAtPurchase: price,
            lineTotal,
            ...toJsonbCostFields(snapshot),
          });
        }

        const shippingRows = await tx.select().from(settings).where(eq(settings.key, "shipping_fee")).limit(1);
        const configuredShipping = Number(shippingRows[0]?.value ?? 5000);
        let shippingCost = Number.isFinite(configuredShipping) && configuredShipping > 0 ? configuredShipping : 5000;
        let discount = 0;
        let couponId: string | null = null;
        let normalizedCouponCode: string | undefined;

        if (input.couponCode?.trim()) {
          normalizedCouponCode = input.couponCode.trim().toUpperCase();
          const [coupon] = await tx.select().from(coupons)
            .where(and(eq(sql`lower(${coupons.code})`, normalizedCouponCode.toLowerCase()), eq(coupons.isActive, true)))
            .limit(1);
          const now = new Date();
          const valid = Boolean(coupon)
            && (!coupon!.startDate || new Date(coupon!.startDate) <= now)
            && (!coupon!.endDate || new Date(coupon!.endDate) >= now)
            && (!coupon!.minOrderAmount || subtotal >= Number(coupon!.minOrderAmount))
            && (!coupon!.maxUses || Number(coupon!.usedCount ?? 0) < Number(coupon!.maxUses));
          if (!coupon || !valid) {
            throw Object.assign(new Error("كود الخصم لم يعد صالحاً. أعد التحقق منه قبل الدفع."), { status: 400 });
          }
          couponId = coupon.id;
          if (coupon.type === "percentage") discount = Math.round(subtotal * (Number(coupon.value) / 100));
          else if (coupon.type === "fixed") discount = Number(coupon.value);
          else if (coupon.type === "free_shipping") shippingCost = 0;
          else throw Object.assign(new Error("نوع كود الخصم غير مدعوم"), { status: 400 });
        }

        const total = Math.max(0, subtotal + shippingCost - discount);
        const roundedTotal = Math.ceil(total / IRAQI_DENOMINATION) * IRAQI_DENOMINATION;
        if (roundedTotal <= 0) throw Object.assign(new Error("Online payment amount must be greater than zero"), { status: 400 });

        const [order] = await tx.insert(orders).values({
          id: input.idempotencyKey,
          orderNumber: generateOrderNumber(),
          userId: input.userId ?? undefined,
          items: lines,
          total: String(total),
          roundedTotal: String(roundedTotal),
          roundingCashback: roundedTotal - total,
          shippingCost: String(shippingCost),
          discountTotal: String(discount),
          couponId,
          status: "pending_payment",
          paymentStatus: "pending",
          shippingAddress: input.customerInfo.address as any,
          customerName: input.customerInfo.name,
          customerEmail: input.customerInfo.email || undefined,
          customerPhone: input.customerInfo.phone,
          source: "website",
        } as any).returning();

        const [payment] = await tx.insert(payments).values({
          orderId: order.id,
          amount: String(roundedTotal),
          currency: PAYMENT_CURRENCY,
          method: PAYMENT_METHOD,
          status: "pending",
          providerResponse: {
            flowVersion: 1,
            sessionId: input.sessionId || null,
            couponCode: normalizedCouponCode || null,
            attempts: [],
            preparedAt: new Date().toISOString(),
          },
        } as any).returning();

        await upsertReservationLines(tx, order.id, lines);
        return { order, payment, reused: false };
      });
    } catch (error: any) {
      if (error?.code === "23505" || error?.cause?.code === "23505") {
        const existingAfterRace = await db.select().from(orders).where(eq(orders.id, input.idempotencyKey)).limit(1);
        if (existingAfterRace[0]) {
          const [existingPayment] = await db.select().from(payments).where(eq(payments.orderId, existingAfterRace[0].id)).limit(1);
          if (existingPayment?.method === PAYMENT_METHOD) {
            return { order: existingAfterRace[0], payment: existingPayment, reused: true };
          }
        }
        if (attempt < ORDER_NUMBER_MAX_ATTEMPTS) continue;
      }
      throw error;
    }
  }

  throw new Error("Unable to prepare online order");
}

interface ClaimedAttempt {
  order: Order;
  paymentRowId: string;
  amount: number;
  currency: string;
  referenceId: string;
  webhookSecret: string;
}

/**
 * Link creation is split into two short transactions around the Wayl HTTP call so
 * no PostgreSQL row lock or transaction is ever held across the network:
 *
 *   1. claim  (tx, FOR UPDATE)  – validate, pick the next referenceId, generate the
 *                                webhookSecret, persist a "creating" placeholder
 *                                attempt, point transactionId at it.
 *   2. call   (no tx)            – POST /api/v1/links.
 *   3. record (tx, FOR UPDATE)  – store id/url/status on the placeholder, or drop
 *                                the placeholder and restore the previous
 *                                transactionId if the call failed.
 *
 * Concurrency: a second request that finds a live "creating" placeholder gets 409
 * (the client already blocks double clicks; this covers two tabs). A placeholder
 * older than LINK_CREATION_CLAIM_TTL_MS is treated as abandoned (process died
 * mid-call) and is replaced. Because the webhookSecret is persisted in step 1, a
 * webhook that races ahead of step 3 can still be signature-verified.
 *
 * Double-charge guard: a new link is only ever claimed when either no link exists
 * yet, or `forceNew` is set AND the current link's last verified provider status
 * is a documented terminal non-paid state (Cancelled/Rejected). `forceNew` is only
 * passed by retryWaylPayment after a live re-verification against Wayl.
 */
async function claimLinkAttempt(
  orderId: string,
  options: { forceNew?: boolean },
): Promise<ClaimedAttempt | StartedWaylPayment> {
  const db = dbOrThrow();
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM payments WHERE order_id=${orderId} FOR UPDATE`);
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    const [payment] = await tx.select().from(payments).where(eq(payments.orderId, orderId)).limit(1);
    if (!order || !payment || payment.method !== PAYMENT_METHOD) {
      throw Object.assign(new Error("Online payment not found for this order"), { status: 404 });
    }
    if (order.paymentStatus === "paid" || payment.status === "completed") {
      throw Object.assign(new Error("هذا الطلب مدفوع بالفعل ولا يمكن إنشاء عملية دفع جديدة له."), { status: 409 });
    }

    const previous = safeProviderResponse(payment.providerResponse);
    const attempts: any[] = Array.isArray(previous.attempts) ? [...previous.attempts] : [];
    const amount = paymentAmount(payment);
    const currency = String(payment.currency || PAYMENT_CURRENCY);
    const now = Date.now();

    const currentAttempt = attempts.find((entry: any) => entry?.referenceId === payment.transactionId);
    if (currentAttempt) {
      if (currentAttempt.status === "creating") {
        const claimedAt = Date.parse(currentAttempt.claimedAt || "");
        if (Number.isFinite(claimedAt) && now - claimedAt < LINK_CREATION_CLAIM_TTL_MS) {
          throw Object.assign(new Error("جاري تجهيز رابط الدفع لهذا الطلب. انتظر لحظات ثم أعد المحاولة."), { status: 409 });
        }
        // Abandoned claim: the previous process died between claim and record.
        attempts.splice(attempts.indexOf(currentAttempt), 1);
      } else if (!options.forceNew && currentAttempt.url) {
        return {
          orderId: order.id,
          orderNumber: order.orderNumber || order.id,
          amount,
          currency,
          paymentId: payment.transactionId as string,
          redirectUrl: currentAttempt.url,
          reused: true,
        };
      } else if (options.forceNew && currentAttempt.url && !isTerminalNonPaidWaylStatus(String(currentAttempt.status || ""))) {
        throw Object.assign(
          new Error("لا يمكن إنشاء رابط دفع جديد قبل أن تصبح المحاولة الحالية ملغاة أو مرفوضة لدى Wayl."),
          { status: 409 },
        );
      }
    }

    const referenceId = attempts.length === 0 ? order.id : `${order.id}#r${attempts.length}`;
    const webhookSecret = randomBytes(32).toString("hex");
    attempts.push({
      referenceId,
      webhookSecret,
      status: "creating",
      claimedAt: new Date(now).toISOString(),
      previousTransactionId: payment.transactionId ?? null,
    });

    await tx.update(payments).set({
      transactionId: referenceId,
      status: "pending",
      providerResponse: { ...previous, attempts },
      updatedAt: new Date(),
    } as any).where(eq(payments.id, payment.id));

    return { order, paymentRowId: payment.id, amount, currency, referenceId, webhookSecret };
  });
}

async function recordLinkAttempt(
  claim: ClaimedAttempt,
  outcome: { link: WaylLink } | { error: unknown },
): Promise<void> {
  const db = dbOrThrow();
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM payments WHERE id=${claim.paymentRowId} FOR UPDATE`);
    const [payment] = await tx.select().from(payments).where(eq(payments.id, claim.paymentRowId)).limit(1);
    if (!payment) return;
    const previous = safeProviderResponse(payment.providerResponse);
    const attempts: any[] = Array.isArray(previous.attempts) ? [...previous.attempts] : [];
    const index = attempts.findIndex((entry: any) => entry?.referenceId === claim.referenceId);
    if (index === -1) return;

    if ("link" in outcome) {
      const { previousTransactionId: _drop, claimedAt: _claimedAt, ...placeholder } = attempts[index];
      attempts[index] = {
        ...placeholder,
        linkId: outcome.link.id,
        status: outcome.link.status,
        url: outcome.link.url,
        createdAt: new Date().toISOString(),
      };
      await tx.update(payments).set({
        transactionId: claim.referenceId,
        status: "pending",
        providerResponse: { ...previous, attempts, providerStatus: outcome.link.status, startedAt: new Date().toISOString() },
        updatedAt: new Date(),
      } as any).where(eq(payments.id, payment.id));
      await tx.update(orders).set({ paymentStatus: "pending", status: "pending_payment", updatedAt: new Date() } as any)
        .where(eq(orders.id, claim.order.id));
      return;
    }

    const restoreTo = attempts[index].previousTransactionId ?? null;
    attempts.splice(index, 1);
    await tx.update(payments).set({
      transactionId: restoreTo,
      providerResponse: { ...previous, attempts },
      updatedAt: new Date(),
    } as any).where(eq(payments.id, payment.id));
  });
}

export async function startWaylPaymentForOrder(
  orderId: string,
  urls: { redirectUrl: string; webhookUrl: string },
  options: { forceNew?: boolean } = {},
): Promise<StartedWaylPayment> {
  await ensureOrderReservation(orderId);

  const claimed = await claimLinkAttempt(orderId, options);
  if ("redirectUrl" in claimed) return claimed;

  // Wayl may append its own query parameters to redirectionUrl; embedding our
  // referenceId keeps the return handler independent of that. It is a lookup key
  // only — never proof of payment.
  const redirectionUrl = `${urls.redirectUrl}?payment_id=${encodeURIComponent(claimed.referenceId)}`;
  let link: WaylLink;
  try {
    link = await createWaylLink({
      referenceId: claimed.referenceId,
      total: claimed.amount,
      currency: claimed.currency,
      customParameter: claimed.order.customerEmail || claimed.order.id,
      lineItem: [{ label: `AQUAVO order ${claimed.order.orderNumber || claimed.order.id}`, amount: claimed.amount, type: "increase" }],
      webhookUrl: urls.webhookUrl,
      webhookSecret: claimed.webhookSecret,
      redirectionUrl,
    });
  } catch (error) {
    await recordLinkAttempt(claimed, { error }).catch((recordError) =>
      console.error("[AQUAVO Wayl] failed to roll back link claim:", recordError),
    );
    throw error;
  }

  await recordLinkAttempt(claimed, { link });

  return {
    orderId: claimed.order.id,
    orderNumber: claimed.order.orderNumber || claimed.order.id,
    amount: claimed.amount,
    currency: claimed.currency,
    paymentId: claimed.referenceId,
    redirectUrl: link.url,
    reused: false,
  };
}

async function finalizePaidOrder(
  orderId: string,
  referenceId: string,
  context: { referenceId: string; amount: number; currency: string; status: string },
): Promise<FinalizeResult> {
  const db = dbOrThrow();
  try {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`);
      await tx.execute(sql`SELECT id FROM payments WHERE order_id = ${orderId} FOR UPDATE`);
      const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      const [payment] = await tx.select().from(payments).where(eq(payments.orderId, orderId)).limit(1);
      if (!order || !payment) throw new Error("Order payment record disappeared during finalization");
      const providerMeta = safeProviderResponse(payment.providerResponse);

      if (order.paymentStatus === "paid" && payment.status === "completed") {
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

      const lines = Array.isArray(order.items) ? order.items : [];
      if (lines.length === 0) throw new PaidOrderInventoryConflict("Order has no stored line items");

      for (const line of lines) {
        const product = await lockProductRowForUpdate(tx, line.productId);
        if (!product) throw new PaidOrderInventoryConflict(`Product ${line.productId} is no longer available`);
        const qty = Number(line.quantity);
        if (line.variantId) {
          const variants = Array.isArray(product.variants) ? product.variants : [];
          const variant = variants.find((candidate: any) => candidate.id === line.variantId);
          if (!variant || Number(variant.stock ?? 0) < qty) throw new PaidOrderInventoryConflict();
        } else if (Number(product.stock ?? 0) < qty) {
          throw new PaidOrderInventoryConflict();
        }
      }

      const existingLines = await tx.select({ id: orderItems.id }).from(orderItems)
        .where(eq(orderItems.orderId, order.id)).limit(1);
      if (existingLines.length === 0) {
        await tx.insert(orderItems).values(lines.map((line) => ({
          orderId: order.id,
          productId: line.productId,
          quantity: Number(line.quantity),
          priceAtPurchase: String(line.priceAtPurchase),
          totalPrice: String(line.lineTotal ?? Number(line.priceAtPurchase) * Number(line.quantity)),
          ...toRelationalCostFields(snapshotFromStoredLine(line, order.createdAt)),
          metadata: (line.variantId || line.variantLabel)
            ? { variantId: line.variantId, variantLabel: line.variantLabel }
            : null,
        })) as any);
      }

      if (order.couponId) {
        await tx.update(coupons).set({ usedCount: sql`COALESCE(${coupons.usedCount}, 0) + 1` } as any)
          .where(eq(coupons.id, order.couponId));
      }

      let loyaltyResult: TransactionalOrderLoyaltyResult | null = null;
      const orderUpdates: Record<string, any> = {
        paymentStatus: "paid",
        status: "pending",
        updatedAt: new Date(),
      };
      if (order.userId) {
        loyaltyResult = await loyaltyStorage.processOrderPointsInTransaction(tx, {
          userId: order.userId,
          orderId: order.id,
          orderTotal: Number(order.total),
          useCashback: false,
          cashbackToUse: 0,
        });
        orderUpdates.roundedTotal = String(loyaltyResult.roundedTotal);
        orderUpdates.pointsUsed = 0;
        orderUpdates.cashbackUsed = loyaltyResult.actualCashbackUsed;
        orderUpdates.pointsDiscount = String(loyaltyResult.pointsDiscount);
        orderUpdates.pointsEarned = loyaltyResult.purchasePoints;
        orderUpdates.roundingCashback = loyaltyResult.roundingPoints;
      }

      const [updatedOrder] = await tx.update(orders).set(orderUpdates as any)
        .where(eq(orders.id, order.id)).returning();
      const attempts = Array.isArray(providerMeta.attempts) ? providerMeta.attempts : [];
      await tx.update(payments).set({
        transactionId: referenceId,
        status: "completed",
        providerResponse: {
          ...providerMeta,
          attempts: attempts.map((entry: any) => entry?.referenceId === referenceId
            ? { ...entry, status: context.status }
            : entry),
          providerStatus: context.status,
          verifiedAt: new Date().toISOString(),
          finalizedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      } as any).where(eq(payments.id, payment.id));

      await tx.execute(sql`
        UPDATE payment_stock_reservations
           SET status='consumed', release_reason='payment_succeeded', updated_at=now()
         WHERE order_id=${order.id} AND status='active'
      `);
      const sessionId = typeof providerMeta.sessionId === "string" ? providerMeta.sessionId : undefined;
      await enqueuePaidOrderOutbox(tx, { orderId: updatedOrder.id, sessionId, loyaltyResult });

      return {
        order: updatedOrder,
        loyaltyResult,
        newlyFinalized: true,
        sessionId,
      };
    });
  } catch (error) {
    if (error instanceof PaidOrderInventoryConflict || isCanonicalInventoryBalanceError(error)) {
      throw new PaidOrderInventoryConflict();
    }
    throw error;
  }
}

async function recordPaidInventoryReview(
  orderId: string,
  referenceId: string,
  context: { status: string },
  reviewReason: "inventory_conflict" | "paid_after_cancellation" = "inventory_conflict",
): Promise<void> {
  const db = dbOrThrow();
  const { payment } = await getOrderAndPayment(orderId);
  const meta = safeProviderResponse(payment.providerResponse);
  await db.transaction(async (tx) => {
    await tx.update(orders).set({ paymentStatus: "paid", status: "payment_review", updatedAt: new Date() } as any)
      .where(eq(orders.id, orderId));
    await tx.execute(sql`
      UPDATE payment_stock_reservations
         SET status='released', release_reason='paid_inventory_review', updated_at=now()
       WHERE order_id=${orderId} AND status='active'
    `);
    await tx.update(payments).set({
      transactionId: referenceId,
      status: "completed",
      providerResponse: {
        ...meta,
        providerStatus: context.status,
        inventoryReview: true,
        reviewReason,
        verifiedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    } as any).where(eq(payments.id, payment.id));
  });
  const reviewTitle = reviewReason === "paid_after_cancellation"
    ? "دفع إلكتروني وصل بعد إلغاء الطلب"
    : "دفع إلكتروني ناجح يحتاج مراجعة مخزون";
  const reviewDetail = reviewReason === "paid_after_cancellation"
    ? "الطلب كان ملغياً قبل وصول تأكيد الدفع. لم يتم تجهيز الطلب أو استهلاك المخزون؛ راجع المبلغ ونفّذ الاسترجاع المالي حسب الإجراء المعتمد."
    : "تم تأكيد الدفع من Wayl لكن لم يتم تنفيذ المخزون/التنفيذ تلقائياً.";
  await sendTelegramMessage(
    `⚠️ <b>${reviewTitle}</b>\nالطلب: <code>${orderId}</code>\nPayment: <code>${referenceId}</code>\n${reviewDetail}`
  ).catch(() => {});
}

/**
 * The webhook is treated as a trigger only — never as proof. We always re-read the
 * link's current amount/currency/status directly from Wayl (GET /api/v1/links/{referenceId})
 * before changing any order state.
 */
export async function verifyAndSyncWaylPayment(
  referenceId: string,
  expectedOrderId?: string,
): Promise<VerifiedOnlinePaymentState> {
  const orderId = orderIdFromReferenceId(referenceId);
  if (expectedOrderId && orderId !== expectedOrderId) {
    throw Object.assign(new Error("Payment does not belong to this order"), { status: 403 });
  }

  const { order, payment } = await getOrderAndPayment(orderId);
  const meta = safeProviderResponse(payment.providerResponse);
  const attempts = Array.isArray(meta.attempts) ? meta.attempts : [];
  const knownAttempt = attempts.find((entry: any) => entry?.referenceId === referenceId);
  if (!knownAttempt) {
    throw Object.assign(new Error("Payment attempt is not registered for this order"), { status: 404 });
  }

  const link = await getWaylLinkByReferenceId(referenceId);
  const amount = paymentAmount(payment);
  const currency = String(payment.currency || PAYMENT_CURRENCY);
  const context = { referenceId: link.referenceId, amount: Number(link.total), currency: String(link.currency), status: link.status };
  if (!isVerifiedPaymentContext(context, { referenceId, amount, currency })) {
    throw Object.assign(new Error("Payment verification mismatch"), { status: 409 });
  }

  const mappedStatus = mapWaylLinkStatus(context.status);
  let finalOrder = order;
  let newlyFinalized = false;
  let inventoryReview = false;

  // Monotonic guard: once an order has been securely verified as paid, no later
  // provider status (Delivered, Returned, or anything else) can move it back to
  // unpaid. If a *different* link for the same order also reports Complete, the
  // customer may have been charged twice — flag it for a refund review.
  const locallyPaid = order.paymentStatus === "paid" && payment.status === "completed";
  if (locallyPaid) {
    if (mappedStatus === "paid" && payment.transactionId && payment.transactionId !== referenceId) {
      await sendTelegramMessage(
        `⚠️ <b>احتمال دفع مكرر عبر Wayl</b>\nالطلب: <code>${order.id}</code>\nالرابط المدفوع أولاً: <code>${payment.transactionId}</code>\nرابط ثانٍ مكتمل: <code>${referenceId}</code>\nراجع الحسابات ونفّذ الاسترجاع للمحاولة الثانية حسب الإجراء المعتمد.`,
      ).catch(() => {});
    }
    return {
      orderId: order.id,
      orderNumber: order.orderNumber || order.id,
      amount,
      currency,
      paymentId: payment.transactionId || referenceId,
      paymentStatus: "paid",
      providerStatus: context.status,
      orderStatus: order.status,
      inventoryReview: order.status === "payment_review",
      newlyFinalized: false,
    };
  }

  if (isPostPaymentWaylStatus(context.status)) {
    // Post-payment lifecycle state seen without a prior verified Complete. Not
    // proof of payment; keep the order pending and ask a human to look.
    console.warn(`[AQUAVO Wayl] post-payment status "${context.status}" for unverified reference ${referenceId}`);
    await sendTelegramMessage(
      `⚠️ <b>حالة Wayl بعد الدفع بدون تأكيد سابق</b>\nالطلب: <code>${order.id}</code>\nالمرجع: <code>${referenceId}</code>\nالحالة: <code>${context.status}</code>\nلم يُعتبر الطلب مدفوعاً تلقائياً؛ راجع لوحة Wayl يدوياً.`,
    ).catch(() => {});
  }

  if (mappedStatus === "paid") {
    try {
      const finalized = await finalizePaidOrder(order.id, referenceId, context);
      finalOrder = finalized.order;
      newlyFinalized = finalized.newlyFinalized;
      await processPaymentOutboxForOrder(order.id).catch((error) =>
        console.error("[AQUAVO Wayl] durable outbox immediate drain failed:", error),
      );
    } catch (error) {
      if (!(error instanceof PaidOrderInventoryConflict) && !(error instanceof CancelledOrderPaidConflict)) throw error;
      const reviewReason = error instanceof CancelledOrderPaidConflict
        ? "paid_after_cancellation"
        : "inventory_conflict";
      await recordPaidInventoryReview(order.id, referenceId, context, reviewReason);
      const refreshed = await getOrderAndPayment(order.id);
      finalOrder = refreshed.order;
      inventoryReview = true;
    }
  } else {
    const isCurrentAttempt = payment.transactionId === referenceId;
    if (isCurrentAttempt) {
      const locallyCancelled = order.status === "cancelled" || order.paymentStatus === "cancelled" || payment.status === "cancelled";
      await dbOrThrow().transaction(async (tx) => {
        await tx.update(payments).set({
          status: locallyCancelled ? "cancelled" : (mappedStatus === "pending" ? "pending" : "failed"),
          providerResponse: {
            ...meta,
            attempts: attempts.map((entry: any) => entry?.referenceId === referenceId
              ? { ...entry, status: context.status }
              : entry),
            providerStatus: context.status,
            verifiedAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        } as any).where(eq(payments.id, payment.id));
        await tx.update(orders).set({ paymentStatus: locallyCancelled ? "cancelled" : mappedStatus, updatedAt: new Date() } as any)
          .where(eq(orders.id, order.id));
      });
      finalOrder = { ...order, paymentStatus: locallyCancelled ? "cancelled" : mappedStatus } as Order;
      if (mappedStatus !== "pending") {
        await releaseOrderReservation(order.id, `payment_${mappedStatus}`).catch((error) =>
          console.error("[AQUAVO Wayl] reservation release failed:", error),
        );
      }
    }
  }

  return {
    orderId: finalOrder.id,
    orderNumber: finalOrder.orderNumber || finalOrder.id,
    amount,
    currency,
    paymentId: referenceId,
    paymentStatus: mappedStatus === "paid" ? "paid" : (finalOrder.paymentStatus as AquavoPaymentStatus) || mappedStatus,
    providerStatus: context.status,
    orderStatus: finalOrder.status,
    inventoryReview: inventoryReview || finalOrder.status === "payment_review",
    newlyFinalized,
  };
}

export async function retryWaylPayment(
  orderId: string,
  currentPaymentId: string,
  urls: { redirectUrl: string; webhookUrl: string },
): Promise<StartedWaylPayment | VerifiedOnlinePaymentState> {
  if (orderIdFromReferenceId(currentPaymentId) !== orderId) {
    throw Object.assign(new Error("Payment does not belong to this order"), { status: 403 });
  }

  // Live re-verification against Wayl first. A new link is only created once the
  // provider itself reports the current link as Cancelled or Rejected — the only
  // documented states in which it can no longer charge the customer. Created,
  // Pending, Processing, Delivered, Returned and unknown states all refuse.
  const verified = await verifyAndSyncWaylPayment(currentPaymentId, orderId);
  if (verified.paymentStatus === "paid") return verified;
  if (!isTerminalNonPaidWaylStatus(verified.providerStatus)) {
    throw Object.assign(new Error("عملية الدفع ما زالت قيد التحقق لدى Wayl. انتظر قليلاً قبل إعادة المحاولة."), { status: 409 });
  }

  return startWaylPaymentForOrder(orderId, urls, { forceNew: true });
}

export async function getVerifiedPaymentState(
  orderId: string,
  paymentId: string,
): Promise<VerifiedOnlinePaymentState> {
  return verifyAndSyncWaylPayment(paymentId, orderId);
}
