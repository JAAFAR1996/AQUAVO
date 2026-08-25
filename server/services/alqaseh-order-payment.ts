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
  AlqasehApiError,
  createAlqasehPayment,
  getAlqasehHostedPaymentUrl,
  getAlqasehPaymentInfo,
  retryAlqasehPaymentContext,
  type AlqasehPaymentContext,
  type AlqasehPaymentStatus,
} from "./alqaseh-client.js";
import { enqueuePaidOrderOutbox, processPaymentOutboxForOrder } from "./payment-maintenance.js";

const IRAQI_DENOMINATION = 250;
const ORDER_NUMBER_MAX_ATTEMPTS = 3;
const PAYMENT_CURRENCY = "IQD";

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

export interface StartedAlqasehPayment {
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
  providerStatus: AlqasehPaymentStatus;
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

function dbOrThrow() {
  const db = getDb();
  if (!db) throw new Error("Database not connected");
  return db;
}

function reservationTtlMinutes(): number {
  const configured = Number(process.env.ALQASEH_RESERVATION_TTL_MINUTES ?? 15);
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

function paymentTokenForProviderId(
  payment: { transactionId?: string | null; providerResponse?: unknown },
  providerPaymentId: string,
): string | null {
  const meta = safeProviderResponse(payment.providerResponse);
  const currentToken = typeof meta.token === "string" ? meta.token.trim() : "";
  if (payment.transactionId === providerPaymentId && currentToken) return currentToken;

  const attempts = Array.isArray(meta.attempts) ? meta.attempts : [];
  const matched = attempts.find((entry: any) => entry?.paymentId === providerPaymentId);
  const attemptToken = typeof matched?.token === "string" ? matched.token.trim() : "";
  return attemptToken || null;
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

export function mapAlqasehPaymentStatus(status: AlqasehPaymentStatus): AquavoPaymentStatus {
  switch (status) {
    case "succeeded":
      return "paid";
    case "failed":
    case "declined":
    case "duplicated":
      return "failed";
    case "revoked":
      return "cancelled";
    case "expired":
      return "expired";
    case "prepared":
    case "retried":
    case "unknown":
    default:
      return "pending";
  }
}

export function isVerifiedPaymentContext(
  context: Pick<AlqasehPaymentContext, "order_id" | "amount" | "currency">,
  expected: { orderId: string; amount: number; currency: string },
): boolean {
  return context.order_id === expected.orderId
    && Number(context.amount) === Number(expected.amount)
    && String(context.currency).toUpperCase() === expected.currency.toUpperCase();
}

async function getOrderAndPayment(orderId: string) {
  const db = dbOrThrow();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });
  const [payment] = await db.select().from(payments).where(eq(payments.orderId, orderId)).limit(1);
  if (!payment || payment.method !== "alqaseh") {
    throw Object.assign(new Error("Online payment not found for this order"), { status: 404 });
  }
  return { order, payment };
}

async function paymentRecognizesProviderId(orderId: string, paymentId: string): Promise<boolean> {
  const db = dbOrThrow();
  const result = await db.execute(sql`
    SELECT 1
    FROM payments
    WHERE order_id = ${orderId}
      AND method = 'alqaseh'
      AND (
        transaction_id = ${paymentId}
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE(provider_response->'attempts', '[]'::jsonb)) AS attempt
          WHERE attempt->>'paymentId' = ${paymentId}
        )
      )
    LIMIT 1
  `);
  return rowsFromExecute(result).length > 0;
}

async function findOrderIdByProviderPaymentId(paymentId: string): Promise<string | null> {
  const db = dbOrThrow();
  const result = await db.execute(sql`
    SELECT order_id AS "orderId"
    FROM payments
    WHERE method = 'alqaseh'
      AND (
        transaction_id = ${paymentId}
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE(provider_response->'attempts', '[]'::jsonb)) AS attempt
          WHERE attempt->>'paymentId' = ${paymentId}
        )
      )
    LIMIT 1
  `);
  return rowsFromExecute(result)[0]?.orderId ?? null;
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
    if (existingPayment?.method !== "alqaseh") {
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
          if (concurrentPayment?.method !== "alqaseh") {
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
          method: "alqaseh",
          status: "pending",
          providerResponse: {
            flowVersion: 2,
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
          if (existingPayment?.method === "alqaseh") {
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

export async function startAlqasehPaymentForOrder(
  orderId: string,
  urls: { redirectUrl: string; webhookUrl: string },
  options: { forceNew?: boolean } = {},
): Promise<StartedAlqasehPayment> {
  const db = dbOrThrow();
  await ensureOrderReservation(orderId);

  // Serialize hosted-session creation on the payment row. Holding the row lock
  // through the provider call is deliberate: checkout volume is low, the provider
  // client has a 10s timeout, and this closes the double-session race from two tabs.
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM payments WHERE order_id=${orderId} FOR UPDATE`);
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    const [payment] = await tx.select().from(payments).where(eq(payments.orderId, orderId)).limit(1);
    if (!order || !payment || payment.method !== "alqaseh") {
      throw Object.assign(new Error("Online payment not found for this order"), { status: 404 });
    }
    if (order.paymentStatus === "paid" || payment.status === "completed") {
      throw Object.assign(new Error("هذا الطلب مدفوع بالفعل ولا يمكن إنشاء عملية دفع جديدة له."), { status: 409 });
    }

    const previous = safeProviderResponse(payment.providerResponse);
    const currentToken = typeof previous.token === "string" ? previous.token : "";
    if (!options.forceNew && payment.transactionId && currentToken) {
      return {
        orderId: order.id,
        orderNumber: order.orderNumber || order.id,
        amount: paymentAmount(payment),
        currency: String(payment.currency || PAYMENT_CURRENCY),
        paymentId: payment.transactionId,
        redirectUrl: getAlqasehHostedPaymentUrl(currentToken),
        reused: true,
      };
    }

    const created = await createAlqasehPayment({
      amount: paymentAmount(payment),
      currency: String(payment.currency || PAYMENT_CURRENCY),
      description: `AQUAVO order ${order.orderNumber || order.id}`,
      orderId: order.id,
      redirectUrl: urls.redirectUrl,
      webhookUrl: urls.webhookUrl,
      country: "IQ",
      email: order.customerEmail || undefined,
      nonce: randomUUID(),
      customData: { orderNumber: order.orderNumber || order.id },
    });

    const attempts = Array.isArray(previous.attempts) ? [...previous.attempts] : [];
    if (payment.transactionId) {
      const currentIndex = attempts.findIndex((entry: any) => entry?.paymentId === payment.transactionId);
      const currentAttempt = {
        paymentId: payment.transactionId,
        status: previous.providerStatus || "unknown",
        ...(currentToken ? { token: currentToken } : {}),
      };
      if (currentIndex >= 0) attempts[currentIndex] = { ...attempts[currentIndex], ...currentAttempt };
      else attempts.push(currentAttempt);
    }
    const createdIndex = attempts.findIndex((entry: any) => entry?.paymentId === created.payment_id);
    const createdAttempt = { paymentId: created.payment_id, token: created.token, status: "prepared" };
    if (createdIndex >= 0) attempts[createdIndex] = { ...attempts[createdIndex], ...createdAttempt };
    else attempts.push(createdAttempt);

    await tx.update(payments).set({
      transactionId: created.payment_id,
      status: "pending",
      providerResponse: {
        ...previous,
        attempts,
        token: created.token,
        providerStatus: "prepared",
        paymentId: created.payment_id,
        startedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    } as any).where(eq(payments.id, payment.id));
    await tx.update(orders).set({ paymentStatus: "pending", status: "pending_payment", updatedAt: new Date() } as any)
      .where(eq(orders.id, order.id));

    return {
      orderId: order.id,
      orderNumber: order.orderNumber || order.id,
      amount: paymentAmount(payment),
      currency: String(payment.currency || PAYMENT_CURRENCY),
      paymentId: created.payment_id,
      redirectUrl: getAlqasehHostedPaymentUrl(created.token),
      reused: false,
    };
  });
}

async function finalizePaidOrder(
  orderId: string,
  providerPaymentId: string,
  context: AlqasehPaymentContext,
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
        transactionId: providerPaymentId,
        status: "completed",
        providerResponse: {
          ...providerMeta,
          attempts: attempts.map((entry: any) => entry?.paymentId === providerPaymentId
            ? { ...entry, status: "succeeded" }
            : entry),
          token: null,
          providerStatus: context.payment_status,
          paymentId: context.payment_id,
          approvalCode: context.approval_code || null,
          rrn: context.rrn || null,
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
  providerPaymentId: string,
  context: AlqasehPaymentContext,
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
      transactionId: providerPaymentId,
      status: "completed",
      providerResponse: {
        ...meta,
        token: null,
        providerStatus: context.payment_status,
        paymentId: providerPaymentId,
        inventoryReview: true,
        verifiedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    } as any).where(eq(payments.id, payment.id));
  });
  await sendTelegramMessage(
    `⚠️ <b>دفع إلكتروني ناجح يحتاج مراجعة مخزون</b>\nالطلب: <code>${orderId}</code>\nPayment: <code>${providerPaymentId}</code>\nتم تأكيد الدفع من Al-Qaseh لكن لم يتم تنفيذ المخزون/التنفيذ تلقائياً.`
  ).catch(() => {});
}

export async function verifyAndSyncAlqasehPayment(
  providerPaymentId: string,
  expectedOrderId?: string,
): Promise<VerifiedOnlinePaymentState> {
  const recognizedOrderId = await findOrderIdByProviderPaymentId(providerPaymentId);
  if (!recognizedOrderId) throw Object.assign(new Error("Payment not found"), { status: 404 });
  if (expectedOrderId && recognizedOrderId !== expectedOrderId) {
    throw Object.assign(new Error("Payment does not belong to this order"), { status: 403 });
  }

  const { order, payment } = await getOrderAndPayment(recognizedOrderId);
  const providerToken = paymentTokenForProviderId(payment, providerPaymentId);
  if (!providerToken) {
    throw Object.assign(new Error("Stored Al-Qaseh payment token is missing for this payment attempt"), { status: 409 });
  }

  // Al-Qaseh v2 documents authoritative status retrieval by request token:
  // GET /egw/payments/info/{token}. The order<->payment_id<->token binding
  // comes from the create/retry response we persisted server-side; the
  // browser redirect status is never trusted as proof.
  const info = await getAlqasehPaymentInfo(providerToken);
  const amount = paymentAmount(payment);
  const currency = String(payment.currency || PAYMENT_CURRENCY);
  const context: AlqasehPaymentContext = {
    amount: Number(info.amount),
    currency: String(info.currency),
    description: info.description,
    order_id: order.id,
    payment_id: providerPaymentId,
    payment_status: info.payment_status,
  };
  if (!isVerifiedPaymentContext(context, { orderId: order.id, amount, currency })) {
    throw Object.assign(new Error("Payment verification mismatch"), { status: 409 });
  }

  const mappedStatus = mapAlqasehPaymentStatus(context.payment_status);
  let finalOrder = order;
  let newlyFinalized = false;
  let inventoryReview = false;

  if (mappedStatus === "paid") {
    try {
      const finalized = await finalizePaidOrder(order.id, providerPaymentId, context);
      finalOrder = finalized.order;
      newlyFinalized = finalized.newlyFinalized;
      await processPaymentOutboxForOrder(order.id).catch((error) =>
        console.error("[AQUAVO Al-Qaseh] durable outbox immediate drain failed:", error),
      );
    } catch (error) {
      if (!(error instanceof PaidOrderInventoryConflict)) throw error;
      await recordPaidInventoryReview(order.id, providerPaymentId, context);
      const refreshed = await getOrderAndPayment(order.id);
      finalOrder = refreshed.order;
      inventoryReview = true;
    }
  } else {
    const isCurrentAttempt = payment.transactionId === providerPaymentId;
    if (isCurrentAttempt) {
      const meta = safeProviderResponse(payment.providerResponse);
      const attempts = Array.isArray(meta.attempts) ? meta.attempts : [];
      await dbOrThrow().transaction(async (tx) => {
        await tx.update(payments).set({
          status: mappedStatus === "pending" ? "pending" : "failed",
          providerResponse: {
            ...meta,
            attempts: attempts.map((entry: any) => entry?.paymentId === providerPaymentId
              ? { ...entry, status: context.payment_status }
              : entry),
            providerStatus: context.payment_status,
            verifiedAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        } as any).where(eq(payments.id, payment.id));
        await tx.update(orders).set({ paymentStatus: mappedStatus, updatedAt: new Date() } as any)
          .where(eq(orders.id, order.id));
      });
      finalOrder = { ...order, paymentStatus: mappedStatus } as Order;
      if (mappedStatus !== "pending") {
        await releaseOrderReservation(order.id, `payment_${mappedStatus}`).catch((error) =>
          console.error("[AQUAVO Al-Qaseh] reservation release failed:", error),
        );
      }
    }
  }

  return {
    orderId: finalOrder.id,
    orderNumber: finalOrder.orderNumber || finalOrder.id,
    amount,
    currency,
    paymentId: providerPaymentId,
    paymentStatus: mappedStatus === "paid" ? "paid" : (finalOrder.paymentStatus as AquavoPaymentStatus) || mappedStatus,
    providerStatus: context.payment_status,
    orderStatus: finalOrder.status,
    inventoryReview: inventoryReview || finalOrder.status === "payment_review",
    newlyFinalized,
  };
}

export async function retryAlqasehPayment(
  orderId: string,
  currentPaymentId: string,
  urls: { redirectUrl: string; webhookUrl: string },
): Promise<StartedAlqasehPayment | VerifiedOnlinePaymentState> {
  if (!(await paymentRecognizesProviderId(orderId, currentPaymentId))) {
    throw Object.assign(new Error("Payment does not belong to this order"), { status: 403 });
  }

  const verified = await verifyAndSyncAlqasehPayment(currentPaymentId, orderId);
  if (verified.paymentStatus === "paid") return verified;
  if (verified.paymentStatus === "pending") {
    throw Object.assign(new Error("عملية الدفع ما زالت قيد التحقق. انتظر قليلاً قبل إعادة المحاولة."), { status: 409 });
  }

  await ensureOrderReservation(orderId);
  const db = dbOrThrow();
  try {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM payments WHERE order_id=${orderId} FOR UPDATE`);
      const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      const [payment] = await tx.select().from(payments).where(eq(payments.orderId, orderId)).limit(1);
      if (!order || !payment || payment.method !== "alqaseh") {
        throw Object.assign(new Error("Online payment not found for this order"), { status: 404 });
      }
      if (order.paymentStatus === "paid" || payment.status === "completed") {
        throw Object.assign(new Error("تم تأكيد الدفع بالفعل."), { status: 409 });
      }

      const retried = await retryAlqasehPaymentContext(currentPaymentId);
      const previous = safeProviderResponse(payment.providerResponse);
      const attempts = Array.isArray(previous.attempts) ? [...previous.attempts] : [];
      const index = attempts.findIndex((entry: any) => entry?.paymentId === retried.payment_id);
      const nextAttempt = {
      paymentId: retried.payment_id,
      token: retried.token,
      status: retried.payment_status || "prepared",
      retriedAt: new Date().toISOString(),
    };
      if (index >= 0) attempts[index] = { ...attempts[index], ...nextAttempt };
      else attempts.push(nextAttempt);

      await tx.update(payments).set({
        transactionId: retried.payment_id,
        status: "pending",
        providerResponse: {
          ...previous,
          attempts,
          token: retried.token,
          providerStatus: retried.payment_status || "prepared",
          paymentId: retried.payment_id,
          nativeRetryAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      } as any).where(eq(payments.id, payment.id));
      await tx.update(orders).set({ paymentStatus: "pending", status: "pending_payment", updatedAt: new Date() } as any)
        .where(eq(orders.id, order.id));

      return {
        orderId: order.id,
        orderNumber: order.orderNumber || order.id,
        amount: paymentAmount(payment),
        currency: String(payment.currency || PAYMENT_CURRENCY),
        paymentId: retried.payment_id,
        redirectUrl: getAlqasehHostedPaymentUrl(retried.token),
        reused: false,
      };
    });
  } catch (error) {
    // Al-Qaseh documents retry for failed/expiring contexts. If it explicitly
    // rejects a terminal context, create a fresh context for the SAME AQUAVO
    // order. Never fall back on timeout/5xx because the retry may have executed.
    if (error instanceof AlqasehApiError && (error.status === 400 || error.status === 404)) {
      return startAlqasehPaymentForOrder(orderId, urls, { forceNew: true });
    }
    throw error;
  }
}

export async function getVerifiedPaymentState(
  orderId: string,
  paymentId: string,
): Promise<VerifiedOnlinePaymentState> {
  if (!(await paymentRecognizesProviderId(orderId, paymentId))) {
    throw Object.assign(new Error("Payment does not belong to this order"), { status: 403 });
  }
  return verifyAndSyncAlqasehPayment(paymentId, orderId);
}
