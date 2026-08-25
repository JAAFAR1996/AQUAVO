from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def replace_once(path: str, old: str, new: str) -> None:
    p = ROOT / path
    text = p.read_text()
    if old not in text:
        raise RuntimeError(f"missing expected text in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))

def replace_between(path: str, start: str, end: str, replacement: str) -> None:
    p = ROOT / path
    text = p.read_text()
    i = text.find(start)
    if i < 0:
        raise RuntimeError(f"missing start marker in {path}: {start}")
    j = text.find(end, i)
    if j < 0:
        raise RuntimeError(f"missing end marker in {path}: {end}")
    p.write_text(text[:i] + replacement + text[j:])

# ---------------------------------------------------------------------------
# Al-Qaseh client: production fail-closed + official retry endpoint.
# ---------------------------------------------------------------------------
replace_once(
    "server/services/alqaseh-client.ts",
    '''export interface AlqasehCreatePaymentResponse {\n  payment_id: string;\n  token: string;\n}\n''',
    '''export interface AlqasehCreatePaymentResponse {\n  payment_id: string;\n  token: string;\n}\n\nexport interface AlqasehRetryPaymentResponse {\n  payment_id: string;\n  payment_status: AlqasehPaymentStatus;\n  token: string;\n}\n''',
)
replace_once(
    "server/services/alqaseh-client.ts",
    '''  const environment: AlqasehEnvironment =\n    process.env.ALQASEH_ENV?.toLowerCase() === "production" ? "production" : "sandbox";\n''',
    '''  const requestedEnvironment = process.env.ALQASEH_ENV?.trim().toLowerCase();\n  if (process.env.NODE_ENV === "production" && requestedEnvironment !== "production") {\n    throw new Error("Al-Qaseh online payments are disabled in production until ALQASEH_ENV=production is explicitly configured.");\n  }\n  const environment: AlqasehEnvironment = requestedEnvironment === "production" ? "production" : "sandbox";\n''',
)
replace_once(
    "server/services/alqaseh-client.ts",
    '''export async function getAlqasehPayment(paymentId: string): Promise<AlqasehPaymentContext> {\n  if (!paymentId?.trim()) throw new Error("paymentId is required");\n  return alqasehRequest<AlqasehPaymentContext>(\n    `/egw/payments/${encodeURIComponent(paymentId.trim())}`,\n    { method: "GET" },\n  );\n}\n\nexport function getAlqasehHostedPaymentUrl(token: string): string {\n''',
    '''export async function getAlqasehPayment(paymentId: string): Promise<AlqasehPaymentContext> {\n  if (!paymentId?.trim()) throw new Error("paymentId is required");\n  return alqasehRequest<AlqasehPaymentContext>(\n    `/egw/payments/${encodeURIComponent(paymentId.trim())}`,\n    { method: "GET" },\n  );\n}\n\nexport async function retryAlqasehPaymentContext(\n  paymentId: string,\n  details = "Customer requested a payment retry from AQUAVO",\n): Promise<AlqasehRetryPaymentResponse> {\n  const normalized = paymentId?.trim();\n  if (!normalized) throw new Error("paymentId is required");\n  return alqasehRequest<AlqasehRetryPaymentResponse>("/egw/payments/retry", {\n    method: "POST",\n    body: JSON.stringify({ payment_id: normalized, details }),\n  });\n}\n\nexport function getAlqasehHostedPaymentUrl(token: string): string {\n''',
)

# ---------------------------------------------------------------------------
# Order payment service: reservations, session serialization, outbox, retry.
# ---------------------------------------------------------------------------
replace_once(
    "server/services/alqaseh-order-payment.ts",
    '''import { analyticsTracker } from "./analytics-tracker.js";\nimport { ReferralStorage } from "../storage/referral-storage.js";\nimport { loyaltyNotifications } from "./loyalty-notifications.js";\nimport { sendOrderNotification, sendTelegramMessage } from "./order-notifications.js";\nimport {\n  createAlqasehPayment,\n  getAlqasehHostedPaymentUrl,\n  getAlqasehPayment,\n  type AlqasehPaymentContext,\n  type AlqasehPaymentStatus,\n} from "./alqaseh-client.js";\n''',
    '''import { sendTelegramMessage } from "./order-notifications.js";\nimport {\n  AlqasehApiError,\n  createAlqasehPayment,\n  getAlqasehHostedPaymentUrl,\n  getAlqasehPayment,\n  retryAlqasehPaymentContext,\n  type AlqasehPaymentContext,\n  type AlqasehPaymentStatus,\n} from "./alqaseh-client.js";\nimport { enqueuePaidOrderOutbox, processPaymentOutboxForOrder } from "./payment-maintenance.js";\n''',
)
replace_once(
    "server/services/alqaseh-order-payment.ts",
    '''const PAYMENT_CURRENCY = "IQD";\nconst referralStorage = new ReferralStorage();\n''',
    '''const PAYMENT_CURRENCY = "IQD";\n''',
)
replace_once(
    "server/services/alqaseh-order-payment.ts",
    '''function dbOrThrow() {\n  const db = getDb();\n  if (!db) throw new Error("Database not connected");\n  return db;\n}\n\nfunction rowsFromExecute(result: unknown): any[] {\n''',
    '''function dbOrThrow() {\n  const db = getDb();\n  if (!db) throw new Error("Database not connected");\n  return db;\n}\n\nfunction reservationTtlMinutes(): number {\n  const configured = Number(process.env.ALQASEH_RESERVATION_TTL_MINUTES ?? 15);\n  if (!Number.isFinite(configured)) return 15;\n  return Math.max(5, Math.min(60, Math.trunc(configured)));\n}\n\nasync function activeReservedQuantity(\n  tx: any,\n  productId: string,\n  variantId: string | undefined,\n  excludingOrderId?: string,\n): Promise<number> {\n  const result = await tx.execute(sql`\n    SELECT COALESCE(SUM(quantity),0)::int AS reserved\n      FROM payment_stock_reservations\n     WHERE product_id=${productId}\n       AND variant_id IS NOT DISTINCT FROM ${variantId ?? null}\n       AND status='active'\n       AND expires_at > now()\n       ${excludingOrderId ? sql`AND order_id IS DISTINCT FROM ${excludingOrderId}` : sql``}\n  `);\n  return Number(rowsFromExecute(result)[0]?.reserved ?? 0);\n}\n\nasync function upsertReservationLines(tx: any, orderId: string, lines: OrderLineItem[]): Promise<void> {\n  const ttl = reservationTtlMinutes();\n  for (const line of lines) {\n    await tx.execute(sql`\n      INSERT INTO payment_stock_reservations(order_id,product_id,variant_id,quantity,status,expires_at,created_at,updated_at)\n      VALUES (${orderId},${line.productId},${line.variantId ?? null},${Number(line.quantity)},'active',now()+(${ttl} * interval '1 minute'),now(),now())\n      ON CONFLICT DO NOTHING\n    `);\n    await tx.execute(sql`\n      UPDATE payment_stock_reservations\n         SET quantity=${Number(line.quantity)}, status='active', release_reason=NULL,\n             expires_at=now()+(${ttl} * interval '1 minute'), updated_at=now()\n       WHERE order_id=${orderId}\n         AND product_id=${line.productId}\n         AND variant_id IS NOT DISTINCT FROM ${line.variantId ?? null}\n    `);\n  }\n}\n\nasync function ensureOrderReservation(orderId: string): Promise<void> {\n  const db = dbOrThrow();\n  await db.transaction(async (tx) => {\n    await tx.execute(sql`SELECT id FROM orders WHERE id=${orderId} FOR UPDATE`);\n    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);\n    if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });\n    const lines = Array.isArray(order.items) ? order.items : [];\n    if (lines.length === 0) throw Object.assign(new Error("Order has no items"), { status: 409 });\n\n    for (const line of lines) {\n      const product = await lockProductRowForUpdate(tx, line.productId);\n      if (!product) throw Object.assign(new Error(STOCK_ERROR_INSUFFICIENT), { status: 409 });\n      const quantity = Number(line.quantity);\n      const reservedElsewhere = await activeReservedQuantity(tx, line.productId, line.variantId, orderId);\n      if (line.variantId) {\n        const variants = Array.isArray(product.variants) ? product.variants : [];\n        const variant = variants.find((candidate: any) => candidate.id === line.variantId);\n        if (!variant || Number(variant.stock ?? 0) - reservedElsewhere < quantity) {\n          throw Object.assign(new Error(STOCK_ERROR_INSUFFICIENT), { status: 409 });\n        }\n      } else if (Number(product.stock ?? 0) - reservedElsewhere < quantity) {\n        throw Object.assign(new Error(STOCK_ERROR_INSUFFICIENT), { status: 409 });\n      }\n    }\n    await upsertReservationLines(tx, order.id, lines);\n  });\n}\n\nasync function releaseOrderReservation(orderId: string, reason: string): Promise<void> {\n  const db = dbOrThrow();\n  await db.execute(sql`\n    UPDATE payment_stock_reservations\n       SET status='released', release_reason=${reason}, updated_at=now()\n     WHERE order_id=${orderId} AND status='active'\n  `);\n}\n\nfunction rowsFromExecute(result: unknown): any[] {\n''',
)

# Reservation-aware stock validation during online preparation.
replace_once(
    "server/services/alqaseh-order-payment.ts",
    '''            if (Number(variant.stock ?? 0) < quantity) throw Object.assign(new Error(STOCK_ERROR_INSUFFICIENT), { status: 409 });\n            price = parsePositivePrice(variant.price, `Variant ${variant.label}`);\n''',
    '''            const reservedElsewhere = await activeReservedQuantity(tx, product.id, item.variantId, input.idempotencyKey);\n            if (Number(variant.stock ?? 0) - reservedElsewhere < quantity) throw Object.assign(new Error(STOCK_ERROR_INSUFFICIENT), { status: 409 });\n            price = parsePositivePrice(variant.price, `Variant ${variant.label}`);\n''',
)
replace_once(
    "server/services/alqaseh-order-payment.ts",
    '''          } else {\n            if (Number(product.stock ?? 0) < quantity) throw Object.assign(new Error(STOCK_ERROR_INSUFFICIENT), { status: 409 });\n            price = parsePositivePrice(product.price, `Product ${product.name}`);\n          }\n''',
    '''          } else {\n            const reservedElsewhere = await activeReservedQuantity(tx, product.id, undefined, input.idempotencyKey);\n            if (Number(product.stock ?? 0) - reservedElsewhere < quantity) throw Object.assign(new Error(STOCK_ERROR_INSUFFICIENT), { status: 409 });\n            price = parsePositivePrice(product.price, `Product ${product.name}`);\n          }\n''',
)
replace_once(
    "server/services/alqaseh-order-payment.ts",
    '''        const [payment] = await tx.insert(payments).values({\n          orderId: order.id,\n          amount: String(roundedTotal),\n          currency: PAYMENT_CURRENCY,\n          method: "alqaseh",\n          status: "pending",\n          providerResponse: {\n            flowVersion: 1,\n            sessionId: input.sessionId || null,\n            couponCode: normalizedCouponCode || null,\n            attempts: [],\n            preparedAt: new Date().toISOString(),\n          },\n        } as any).returning();\n\n        return { order, payment, reused: false };\n''',
    '''        const [payment] = await tx.insert(payments).values({\n          orderId: order.id,\n          amount: String(roundedTotal),\n          currency: PAYMENT_CURRENCY,\n          method: "alqaseh",\n          status: "pending",\n          providerResponse: {\n            flowVersion: 2,\n            sessionId: input.sessionId || null,\n            couponCode: normalizedCouponCode || null,\n            attempts: [],\n            preparedAt: new Date().toISOString(),\n          },\n        } as any).returning();\n\n        await upsertReservationLines(tx, order.id, lines);\n        return { order, payment, reused: false };\n''',
)

new_start = '''export async function startAlqasehPaymentForOrder(\n  orderId: string,\n  urls: { redirectUrl: string; webhookUrl: string },\n  options: { forceNew?: boolean } = {},\n): Promise<StartedAlqasehPayment> {\n  const db = dbOrThrow();\n  await ensureOrderReservation(orderId);\n\n  // Serialize hosted-session creation on the payment row. Holding the row lock\n  // through the provider call is deliberate: checkout volume is low, the provider\n  // client has a 10s timeout, and this closes the double-session race from two tabs.\n  return db.transaction(async (tx) => {\n    await tx.execute(sql`SELECT id FROM payments WHERE order_id=${orderId} FOR UPDATE`);\n    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);\n    const [payment] = await tx.select().from(payments).where(eq(payments.orderId, orderId)).limit(1);\n    if (!order || !payment || payment.method !== "alqaseh") {\n      throw Object.assign(new Error("Online payment not found for this order"), { status: 404 });\n    }\n    if (order.paymentStatus === "paid" || payment.status === "completed") {\n      throw Object.assign(new Error("هذا الطلب مدفوع بالفعل ولا يمكن إنشاء عملية دفع جديدة له."), { status: 409 });\n    }\n\n    const previous = safeProviderResponse(payment.providerResponse);\n    const currentToken = typeof previous.token === "string" ? previous.token : "";\n    if (!options.forceNew && payment.transactionId && currentToken) {\n      return {\n        orderId: order.id,\n        orderNumber: order.orderNumber || order.id,\n        amount: paymentAmount(payment),\n        currency: String(payment.currency || PAYMENT_CURRENCY),\n        paymentId: payment.transactionId,\n        redirectUrl: getAlqasehHostedPaymentUrl(currentToken),\n        reused: true,\n      };\n    }\n\n    const created = await createAlqasehPayment({\n      amount: paymentAmount(payment),\n      currency: String(payment.currency || PAYMENT_CURRENCY),\n      description: `AQUAVO order ${order.orderNumber || order.id}`,\n      orderId: order.id,\n      redirectUrl: urls.redirectUrl,\n      webhookUrl: urls.webhookUrl,\n      country: "IQ",\n      email: order.customerEmail || undefined,\n      nonce: randomUUID(),\n      customData: { orderNumber: order.orderNumber || order.id },\n    });\n\n    const attempts = Array.isArray(previous.attempts) ? [...previous.attempts] : [];\n    if (payment.transactionId && !attempts.some((entry: any) => entry?.paymentId === payment.transactionId)) {\n      attempts.push({ paymentId: payment.transactionId, status: previous.providerStatus || "unknown" });\n    }\n    if (!attempts.some((entry: any) => entry?.paymentId === created.payment_id)) {\n      attempts.push({ paymentId: created.payment_id, status: "prepared" });\n    }\n\n    await tx.update(payments).set({\n      transactionId: created.payment_id,\n      status: "pending",\n      providerResponse: {\n        ...previous,\n        attempts,\n        token: created.token,\n        providerStatus: "prepared",\n        paymentId: created.payment_id,\n        startedAt: new Date().toISOString(),\n      },\n      updatedAt: new Date(),\n    } as any).where(eq(payments.id, payment.id));\n    await tx.update(orders).set({ paymentStatus: "pending", status: "pending_payment", updatedAt: new Date() } as any)\n      .where(eq(orders.id, order.id));\n\n    return {\n      orderId: order.id,\n      orderNumber: order.orderNumber || order.id,\n      amount: paymentAmount(payment),\n      currency: String(payment.currency || PAYMENT_CURRENCY),\n      paymentId: created.payment_id,\n      redirectUrl: getAlqasehHostedPaymentUrl(created.token),\n      reused: false,\n    };\n  });\n}\n\n'''
replace_between(
    "server/services/alqaseh-order-payment.ts",
    "export async function startAlqasehPaymentForOrder(",
    "async function finalizePaidOrder(",
    new_start,
)

# Consume the reservation and enqueue durable post-payment work inside the SAME tx.
replace_once(
    "server/services/alqaseh-order-payment.ts",
    '''      await tx.update(payments).set({\n        transactionId: providerPaymentId,\n        status: "completed",\n        providerResponse: {\n          ...providerMeta,\n          attempts: attempts.map((entry: any) => entry?.paymentId === providerPaymentId\n            ? { ...entry, status: "succeeded" }\n            : entry),\n          token: null,\n          providerStatus: context.payment_status,\n          paymentId: context.payment_id,\n          approvalCode: context.approval_code || null,\n          rrn: context.rrn || null,\n          verifiedAt: new Date().toISOString(),\n          finalizedAt: new Date().toISOString(),\n        },\n        updatedAt: new Date(),\n      } as any).where(eq(payments.id, payment.id));\n\n      return {\n        order: updatedOrder,\n        loyaltyResult,\n        newlyFinalized: true,\n        sessionId: typeof providerMeta.sessionId === "string" ? providerMeta.sessionId : undefined,\n      };\n''',
    '''      await tx.update(payments).set({\n        transactionId: providerPaymentId,\n        status: "completed",\n        providerResponse: {\n          ...providerMeta,\n          attempts: attempts.map((entry: any) => entry?.paymentId === providerPaymentId\n            ? { ...entry, status: "succeeded" }\n            : entry),\n          token: null,\n          providerStatus: context.payment_status,\n          paymentId: context.payment_id,\n          approvalCode: context.approval_code || null,\n          rrn: context.rrn || null,\n          verifiedAt: new Date().toISOString(),\n          finalizedAt: new Date().toISOString(),\n        },\n        updatedAt: new Date(),\n      } as any).where(eq(payments.id, payment.id));\n\n      await tx.execute(sql`\n        UPDATE payment_stock_reservations\n           SET status='consumed', release_reason='payment_succeeded', updated_at=now()\n         WHERE order_id=${order.id} AND status='active'\n      `);\n      const sessionId = typeof providerMeta.sessionId === "string" ? providerMeta.sessionId : undefined;\n      await enqueuePaidOrderOutbox(tx, { orderId: updatedOrder.id, sessionId, loyaltyResult });\n\n      return {\n        order: updatedOrder,\n        loyaltyResult,\n        newlyFinalized: true,\n        sessionId,\n      };\n''',
)
replace_between(
    "server/services/alqaseh-order-payment.ts",
    "async function runPaidOrderSideEffects(",
    "async function recordPaidInventoryReview(",
    "",
)
replace_once(
    "server/services/alqaseh-order-payment.ts",
    '''    await tx.update(payments).set({\n      transactionId: providerPaymentId,\n      status: "completed",\n''',
    '''    await tx.execute(sql`\n      UPDATE payment_stock_reservations\n         SET status='released', release_reason='paid_inventory_review', updated_at=now()\n       WHERE order_id=${orderId} AND status='active'\n    `);\n    await tx.update(payments).set({\n      transactionId: providerPaymentId,\n      status: "completed",\n''',
)
replace_once(
    "server/services/alqaseh-order-payment.ts",
    '''      const finalized = await finalizePaidOrder(order.id, providerPaymentId, context);\n      finalOrder = finalized.order;\n      newlyFinalized = finalized.newlyFinalized;\n      await runPaidOrderSideEffects(finalized);\n''',
    '''      const finalized = await finalizePaidOrder(order.id, providerPaymentId, context);\n      finalOrder = finalized.order;\n      newlyFinalized = finalized.newlyFinalized;\n      await processPaymentOutboxForOrder(order.id).catch((error) =>\n        console.error("[AQUAVO Al-Qaseh] durable outbox immediate drain failed:", error),\n      );\n''',
)
replace_once(
    "server/services/alqaseh-order-payment.ts",
    '''      finalOrder = { ...order, paymentStatus: mappedStatus } as Order;\n    }\n  }\n\n  return {\n''',
    '''      finalOrder = { ...order, paymentStatus: mappedStatus } as Order;\n      if (mappedStatus !== "pending") {\n        await releaseOrderReservation(order.id, `payment_${mappedStatus}`).catch((error) =>\n          console.error("[AQUAVO Al-Qaseh] reservation release failed:", error),\n        );\n      }\n    }\n  }\n\n  return {\n''',
)

new_retry = '''export async function retryAlqasehPayment(\n  orderId: string,\n  currentPaymentId: string,\n  urls: { redirectUrl: string; webhookUrl: string },\n): Promise<StartedAlqasehPayment | VerifiedOnlinePaymentState> {\n  if (!(await paymentRecognizesProviderId(orderId, currentPaymentId))) {\n    throw Object.assign(new Error("Payment does not belong to this order"), { status: 403 });\n  }\n\n  const verified = await verifyAndSyncAlqasehPayment(currentPaymentId, orderId);\n  if (verified.paymentStatus === "paid") return verified;\n  if (verified.paymentStatus === "pending") {\n    throw Object.assign(new Error("عملية الدفع ما زالت قيد التحقق. انتظر قليلاً قبل إعادة المحاولة."), { status: 409 });\n  }\n\n  await ensureOrderReservation(orderId);\n  const db = dbOrThrow();\n  try {\n    return await db.transaction(async (tx) => {\n      await tx.execute(sql`SELECT id FROM payments WHERE order_id=${orderId} FOR UPDATE`);\n      const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);\n      const [payment] = await tx.select().from(payments).where(eq(payments.orderId, orderId)).limit(1);\n      if (!order || !payment || payment.method !== "alqaseh") {\n        throw Object.assign(new Error("Online payment not found for this order"), { status: 404 });\n      }\n      if (order.paymentStatus === "paid" || payment.status === "completed") {\n        throw Object.assign(new Error("تم تأكيد الدفع بالفعل."), { status: 409 });\n      }\n\n      const retried = await retryAlqasehPaymentContext(currentPaymentId);\n      const previous = safeProviderResponse(payment.providerResponse);\n      const attempts = Array.isArray(previous.attempts) ? [...previous.attempts] : [];\n      const index = attempts.findIndex((entry: any) => entry?.paymentId === retried.payment_id);\n      const nextAttempt = { paymentId: retried.payment_id, status: retried.payment_status || "prepared", retriedAt: new Date().toISOString() };\n      if (index >= 0) attempts[index] = { ...attempts[index], ...nextAttempt };\n      else attempts.push(nextAttempt);\n\n      await tx.update(payments).set({\n        transactionId: retried.payment_id,\n        status: "pending",\n        providerResponse: {\n          ...previous,\n          attempts,\n          token: retried.token,\n          providerStatus: retried.payment_status || "prepared",\n          paymentId: retried.payment_id,\n          nativeRetryAt: new Date().toISOString(),\n        },\n        updatedAt: new Date(),\n      } as any).where(eq(payments.id, payment.id));\n      await tx.update(orders).set({ paymentStatus: "pending", status: "pending_payment", updatedAt: new Date() } as any)\n        .where(eq(orders.id, order.id));\n\n      return {\n        orderId: order.id,\n        orderNumber: order.orderNumber || order.id,\n        amount: paymentAmount(payment),\n        currency: String(payment.currency || PAYMENT_CURRENCY),\n        paymentId: retried.payment_id,\n        redirectUrl: getAlqasehHostedPaymentUrl(retried.token),\n        reused: false,\n      };\n    });\n  } catch (error) {\n    // Al-Qaseh documents retry for failed/expiring contexts. If it explicitly\n    // rejects a terminal context, create a fresh context for the SAME AQUAVO\n    // order. Never fall back on timeout/5xx because the retry may have executed.\n    if (error instanceof AlqasehApiError && (error.status === 400 || error.status === 404)) {\n      return startAlqasehPaymentForOrder(orderId, urls, { forceNew: true });\n    }\n    throw error;\n  }\n}\n\n'''
replace_between(
    "server/services/alqaseh-order-payment.ts",
    "export async function retryAlqasehPayment(",
    "export async function getVerifiedPaymentState(",
    new_retry,
)

# ---------------------------------------------------------------------------
# Public availability endpoint + customer-safe configuration behavior.
# ---------------------------------------------------------------------------
replace_once(
    "server/routes/alqaseh.ts",
    '''export function createAlqasehRouter() {\n  const router = Router();\n\n  router.get("/health", requireAdmin, (req, res) => {\n''',
    '''export function createAlqasehRouter() {\n  const router = Router();\n\n  router.get("/availability", (_req, res) => {\n    res.setHeader("Cache-Control", "no-store, max-age=0");\n    try {\n      getAlqasehConfig();\n      res.json({ available: true });\n    } catch {\n      res.json({ available: false });\n    }\n  });\n\n  router.get("/health", requireAdmin, (req, res) => {\n''',
)

# ---------------------------------------------------------------------------
# Canonical stock error mapping includes reservation protection.
# ---------------------------------------------------------------------------
replace_once(
    "server/storage/order-storage.ts",
    '''    const direct = typeof anyErr.message === "string" &&\n        anyErr.message.includes("insufficient canonical inventory balance");\n''',
    '''    const direct = typeof anyErr.message === "string" && (\n        anyErr.message.includes("insufficient canonical inventory balance")\n        || anyErr.message.includes("insufficient inventory after active payment reservations")\n    );\n''',
)

# ---------------------------------------------------------------------------
# Daily fallback maintenance uses the existing Hobby-compatible nightly cron.
# ---------------------------------------------------------------------------
replace_once(
    "server/routes/cron.ts",
    '''import { smartNotifications } from "../services/smart-notifications.js";\n''',
    '''import { smartNotifications } from "../services/smart-notifications.js";\nimport { runPaymentMaintenance } from "../services/payment-maintenance.js";\n''',
)
replace_once(
    "server/routes/cron.ts",
    '''router.get("/nightly", async (_req: Request, res: Response) => {\n  console.log("[Cron] Starting nightly tasks...");\n  const startTime = Date.now();\n  const results: Record<string, { success: boolean; message: string; duration: number }> = {};\n''',
    '''router.get("/nightly", async (_req: Request, res: Response) => {\n  console.log("[Cron] Starting nightly tasks...");\n  const startTime = Date.now();\n  const results: Record<string, { success: boolean; message: string; duration: number }> = {};\n  let paymentMaintenance: Awaited<ReturnType<typeof runPaymentMaintenance>> | null = null;\n  try {\n    paymentMaintenance = await runPaymentMaintenance();\n  } catch (error) {\n    console.error("[Cron] Payment maintenance fallback failed:", error);\n  }\n''',
)
replace_once(
    "server/routes/cron.ts",
    '''  res.status(200).json({ success: allSucceeded, totalDuration, completed: `${successCount}/${tasks.length}`, results });\n''',
    '''  res.status(200).json({ success: allSucceeded, totalDuration, completed: `${successCount}/${tasks.length}`, paymentMaintenance, results });\n''',
)

# ---------------------------------------------------------------------------
# Checkout UI: availability, explicit hosted handoff, premium transition/CTA.
# ---------------------------------------------------------------------------
replace_once(
    "client/src/components/cart/checkout/confirmation-view.tsx",
    '''import { useState } from "react";\n''',
    '''import { useEffect, useState } from "react";\n''',
)
replace_once(
    "client/src/components/cart/checkout/confirmation-view.tsx",
    '''import { Loader2, Lock, RotateCcw, Truck } from "lucide-react";\n''',
    '''import { ArrowLeft, Loader2, Lock, LockKeyhole, RotateCcw, ShieldCheck, Truck } from "lucide-react";\n''',
)
replace_once(
    "client/src/components/cart/checkout/confirmation-view.tsx",
    '''    const [onlineError, setOnlineError] = useState("");\n    const [preparedOrder, setPreparedOrder] = useState<Pick<OnlineStartResponse, "orderNumber" | "amount"> | null>(null);\n\n    const pointsDiscount = loyaltyData?.pointsDiscount ?? 0;\n''',
    '''    const [onlineError, setOnlineError] = useState("");\n    const [onlineAvailable, setOnlineAvailable] = useState<boolean | null>(null);\n    const [preparedOrder, setPreparedOrder] = useState<Pick<OnlineStartResponse, "orderNumber" | "amount"> | null>(null);\n\n    useEffect(() => {\n        let active = true;\n        fetch("/api/payments/alqaseh/availability", { credentials: "include", cache: "no-store" })\n            .then((response) => response.json())\n            .then((data) => { if (active) setOnlineAvailable(data?.available === true); })\n            .catch(() => { if (active) setOnlineAvailable(false); });\n        return () => { active = false; };\n    }, []);\n\n    useEffect(() => {\n        if (onlineAvailable === false && paymentMethod === "online") {\n            setPaymentMethod("cod");\n        }\n    }, [onlineAvailable, paymentMethod]);\n\n    const pointsDiscount = loyaltyData?.pointsDiscount ?? 0;\n''',
)
replace_once(
    "client/src/components/cart/checkout/confirmation-view.tsx",
    '''    const beginOnlinePayment = async () => {\n        if (!agreed || busy || onlineBlockedByLoyalty) return;\n''',
    '''    const beginOnlinePayment = async () => {\n        if (!agreed || busy || onlineBlockedByLoyalty || onlineAvailable === false) return;\n''',
)
replace_once(
    "client/src/components/cart/checkout/confirmation-view.tsx",
    '''            window.setTimeout(() => window.location.assign(started.redirectUrl), 350);\n''',
    '''            window.setTimeout(() => window.location.assign(started.redirectUrl), 250);\n''',
)
replace_between(
    "client/src/components/cart/checkout/confirmation-view.tsx",
    '''    if (onlinePreparing) {\n''',
    '''    return (\n        <div className="space-y-4">\n''',
    '''    if (onlinePreparing) {\n        return (\n            <div className="flex min-h-[440px] flex-col items-center justify-center overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-b from-primary/[0.07] via-background to-background px-6 py-12 text-center shadow-sm">\n                <div className="mb-6 flex items-center gap-3" aria-hidden="true">\n                    <div className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm font-black tracking-[0.16em] shadow-sm">AQUAVO</div>\n                    <ArrowLeft className="h-5 w-5 text-muted-foreground" />\n                    <div className="grid h-12 w-12 place-items-center rounded-2xl border border-primary/15 bg-primary/10 text-primary"><ShieldCheck className="h-6 w-6" /></div>\n                    <div className="text-right"><div className="text-sm font-bold">Al-Qaseh</div><div className="text-[11px] text-muted-foreground">بوابة الدفع الآمنة</div></div>\n                </div>\n                <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">\n                    <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />\n                </div>\n                <h3 className="text-xl font-bold">جاري نقلك إلى بوابة الدفع الآمنة</h3>\n                <p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">\n                    لا تغلق الصفحة. ستُدخل بيانات البطاقة مباشرة لدى Al-Qaseh ثم ستعود تلقائياً إلى AQUAVO.\n                </p>\n                <div className="mt-6 w-full max-w-sm rounded-2xl border border-border/70 bg-background/90 p-4 text-sm shadow-sm">\n                    <div className="flex justify-between gap-4 py-1.5">\n                        <span className="text-muted-foreground">المبلغ</span>\n                        <strong>{formatIQD(preparedOrder?.amount ?? finalAmount)}</strong>\n                    </div>\n                    {preparedOrder?.orderNumber && (\n                        <div className="flex justify-between gap-4 border-t border-border/60 py-1.5 pt-3">\n                            <span className="text-muted-foreground">رقم الطلب</span>\n                            <strong dir="ltr">{preparedOrder.orderNumber}</strong>\n                        </div>\n                    )}\n                </div>\n                <div className="mt-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5" />AQUAVO لا يستقبل أو يخزن بيانات بطاقتك</div>\n            </div>\n        );\n    }\n\n    return (\n        <div className="space-y-4">\n''',
)
replace_once(
    "client/src/components/cart/checkout/confirmation-view.tsx",
    '''                <div className="grid gap-3 sm:grid-cols-2">\n                    <PaymentMethodCard method="cod" selected={paymentMethod} onChange={(method) => { setPaymentMethod(method); setOnlineError(""); }} disabled={busy} />\n                    <PaymentMethodCard method="online" selected={paymentMethod} onChange={(method) => { setPaymentMethod(method); setOnlineError(""); }} disabled={busy || onlineBlockedByLoyalty} />\n                </div>\n''',
    '''                <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="طريقة الدفع">\n                    <PaymentMethodCard method="cod" selected={paymentMethod} onChange={(method) => { setPaymentMethod(method); setOnlineError(""); }} disabled={busy} />\n                    <PaymentMethodCard method="online" selected={paymentMethod} onChange={(method) => { setPaymentMethod(method); setOnlineError(""); }} disabled={busy || onlineBlockedByLoyalty || onlineAvailable === false} />\n                </div>\n                {onlineAvailable === false && (\n                    <p className="rounded-xl border border-border/70 bg-muted/35 px-3 py-2 text-xs leading-6 text-muted-foreground">\n                        الدفع الإلكتروني غير متاح مؤقتاً، لذلك يمكنك إكمال الطلب بالدفع عند الاستلام.\n                    </p>\n                )}\n                {paymentMethod === "online" && onlineAvailable !== false && !onlineBlockedByLoyalty && (\n                    <div className="rounded-2xl border border-primary/15 bg-primary/[0.045] p-3.5">\n                        <div className="flex items-start gap-2.5">\n                            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />\n                            <div>\n                                <p className="text-sm font-semibold">ستنتقل إلى صفحة Al-Qaseh الآمنة</p>\n                                <p className="mt-1 text-xs leading-6 text-muted-foreground">بيانات البطاقة تُدخل لدى مزود الدفع مباشرة، وبعد إكمال العملية ستعود تلقائياً إلى AQUAVO للتحقق من النتيجة.</p>\n                            </div>\n                        </div>\n                    </div>\n                )}\n''',
)
replace_once(
    "client/src/components/cart/checkout/confirmation-view.tsx",
    '''                            ? `الدفع الآن • ${formatIQD(finalAmount)}`\n                            : "تأكيد الطلب"}\n''',
    '''                            ? `متابعة إلى الدفع الآمن — ${formatIQD(finalAmount)}`\n                            : "تأكيد الطلب"}\n''',
)

# ---------------------------------------------------------------------------
# Environment example documents the configurable reservation window.
# ---------------------------------------------------------------------------
replace_once(
    ".env.example",
    '''ALQASEH_CLIENT_SECRET=\n''',
    '''ALQASEH_CLIENT_SECRET=\n# Soft stock reservation while a customer is on the hosted payment page (5-60 minutes).\nALQASEH_RESERVATION_TTL_MINUTES=15\n''',
)

print("payment modernization patch applied")
