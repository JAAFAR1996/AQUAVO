// CAPI forwards bounded interaction events; Purchase is derived from an owned, eligible order.
import { Router, type Request, type Response } from "express";
import { createHash } from "node:crypto";
import { z } from "zod";
import { eq, or, sql } from "drizzle-orm";
import rateLimit from "express-rate-limit";
import { getDb } from "../db.js";
import { orders, payments, mutationReceipts } from "../../shared/schema.js";
import { createSharedRateLimitStore } from "../middleware/shared-rate-limit-store.js";
import { OperationalError } from "../middleware/error-handler.js";
import { canReportPurchase, canonicalPurchaseData } from "../services/capi-purchase.js";

const router = Router();
const PIXEL_ID = process.env.META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_CAPI_TOKEN;
const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || "v21.0";
const TEST_CODE = process.env.META_TEST_EVENT_CODE;
const capiLimiter = rateLimit({
  store: createSharedRateLimitStore("capi-event"), windowMs: 60_000, max: 60,
  standardHeaders: true, legacyHeaders: false, message: { ok: false, error: "تم تجاوز الحد المسموح" },
});

const eventSchema = z.object({
  event_name: z.enum(["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase", "Search", "CompleteRegistration", "AddToWishlist"]),
  event_id: z.string().min(1).max(160),
  event_time: z.number().int().positive().optional(),
  event_source_url: z.string().max(2048).url().optional(),
  user_agent: z.string().max(1024).optional(),
  fbc: z.string().max(512).nullish(), fbp: z.string().max(512).nullish(),
  phone: z.string().max(32).optional(),
  custom_data: z.object({
    order_id: z.string().min(1).max(100).optional(),
    content_ids: z.array(z.string().min(1).max(100)).max(100).optional(),
    content_name: z.string().max(300).optional(), content_type: z.enum(["product", "product_group"]).optional(),
    content_category: z.string().max(120).optional(), search_string: z.string().max(300).optional(),
    value: z.number().finite().min(0).max(100_000_000).optional(), currency: z.literal("USD").optional(),
    num_items: z.number().int().min(0).max(10000).optional(),
  }).optional(),
});

function hashPhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("07")) digits = `964${digits.slice(1)}`;
  else if (digits.startsWith("7")) digits = `964${digits}`;
  return createHash("sha256").update(digits).digest("hex");
}

function sourceUrl(value?: string): string {
  if (value) {
    const url = new URL(value);
    if (url.protocol === "https:" && ["aquavoiq.com", "www.aquavoiq.com"].includes(url.hostname) && !url.port && !url.username && !url.password) {
      return `${url.origin}${url.pathname}`;
    }
  }
  return "https://www.aquavoiq.com/";
}

async function forwardEvent(event: Record<string, unknown>): Promise<number> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${PIXEL_ID}/events`, {
      method: "POST", signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [event], access_token: ACCESS_TOKEN, ...(TEST_CODE ? { test_event_code: TEST_CODE } : {}) }),
    });
    if (!response.ok) throw new OperationalError("تعذر تسجيل الحدث حاليا", 502);
    const result: unknown = await response.json();
    const received = result && typeof result === "object" && "events_received" in result ? result.events_received : undefined;
    if (typeof received !== "number" || received < 1) throw new OperationalError("تعذر تسجيل الحدث حاليا", 502);
    return received;
  } finally { clearTimeout(timer); }
}

router.get("/status", (_req: Request, res: Response) => {
  res.json({ pixelIdSet: !!PIXEL_ID, tokenSet: !!ACCESS_TOKEN, testCodeSet: !!TEST_CODE,
    graphApiVersion: GRAPH_API_VERSION, previewDisabled: process.env.VERCEL_ENV === "preview" });
});

router.post("/event", capiLimiter, async (req: Request, res: Response, next) => {
  try {
    if (process.env.VERCEL_ENV === "preview") return res.json({ ok: true, skipped: true, reason: "preview" });
    const input = eventSchema.parse(req.body);
    if (!PIXEL_ID || !ACCESS_TOKEN) return res.json({ ok: true, skipped: true, reason: "unconfigured" });
    const now = Math.floor(Date.now() / 1000);
    if (input.event_time && (input.event_time > now + 60 || input.event_time < now - 7 * 86400)) {
      throw new OperationalError("وقت الحدث غير صالح", 400);
    }
    const userData: Record<string, string> = {};
    if (input.fbc) userData.fbc = input.fbc;
    if (input.fbp) userData.fbp = input.fbp;
    const agent = req.get("user-agent");
    if (agent) userData.client_user_agent = agent.slice(0, 1024);
    if (req.ip) userData.client_ip_address = req.ip;
    const event: Record<string, unknown> = {
      event_name: input.event_name, event_id: input.event_id, event_time: input.event_time || now,
      event_source_url: sourceUrl(input.event_source_url), action_source: "website", user_data: userData,
      ...(input.custom_data ? { custom_data: input.custom_data } : {}),
    };

    if (input.event_name === "Purchase") {
      if (!input.custom_data?.order_id) throw new OperationalError("معرف الطلب مطلوب", 400);
      const db = getDb();
      if (!db) throw new OperationalError("تعذر تسجيل الحدث حاليا", 503);
      const orderRef = input.custom_data.order_id;
      const [order] = await db.select({
        id: orders.id, orderNumber: orders.orderNumber, userId: orders.userId,
        checkoutSessionHash: orders.checkoutSessionHash, total: orders.total, roundedTotal: orders.roundedTotal,
        customerPhone: orders.customerPhone, items: orders.items, status: orders.status,
        paymentStatus: orders.paymentStatus, paymentMethod: payments.method, paymentRecordStatus: payments.status,
        source: orders.source, createdAt: orders.createdAt,
        isTest: sql<boolean>`COALESCE(${orders}.is_test, false)`,
      }).from(orders).leftJoin(payments, eq(payments.orderId, orders.id))
        .where(or(eq(orders.id, orderRef), eq(orders.orderNumber, orderRef))).limit(1);
      if (!order || !canReportPurchase(req, order)) throw new OperationalError("الطلب غير موجود", 404);
      const canonical = canonicalPurchaseData(order);
      if (!canonical) return res.json({ ok: true, skipped: true, reason: "ineligible_order" });
      Object.assign(event, canonical);
      // Preserve optional matching; never add a phone when the client did not request it.
      if (input.phone && order.customerPhone) userData.ph = hashPhone(order.customerPhone);
      const received = await db.transaction(async tx => {
        // Only this receipt is locked. Never hold an order lock while calling a provider.
        const [claim] = await tx.insert(mutationReceipts).values({
          key: `capi:purchase:${order.id}`, resourceId: order.id,
          requestHash: createHash("sha256").update(JSON.stringify(canonical)).digest("hex"),
        }).onConflictDoNothing().returning({ key: mutationReceipts.key });
        if (!claim) return undefined;
        // Failure rolls back the claim. A response lost after delivery may be retried
        // with the same event ID; the provider is the final deduplication boundary.
        return forwardEvent(event);
      });
      if (received === undefined) return res.json({ ok: true, skipped: true, reason: "duplicate" });
      return res.json({ ok: true, events_received: received });
    }
    if (input.phone) userData.ph = hashPhone(input.phone);
    return res.json({ ok: true, events_received: await forwardEvent(event) });
  } catch (error) { next(error); }
});

export function createCAPIRouter() { return router; }
export default router;
