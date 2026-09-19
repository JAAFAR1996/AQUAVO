import { Router, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getSession } from "../middleware/auth.js";
import { orderLimiter } from "../middleware/rate-limit.js";
import { db } from "../db.js";
import {
  WaylApiError,
  checkWaylReadiness,
  isWaylStoreVerificationError,
  noteWaylStoreVerificationFailure,
  verifyWaylWebhookSignature,
} from "../services/wayl-client.js";
import {
  findWebhookSecretForReference,
  getVerifiedPaymentState,
  prepareOnlineOrder,
  retryWaylPayment,
  startWaylPaymentForOrder,
  verifyAndSyncWaylPayment,
} from "../services/wayl-order-payment.js";

const AQUAVO_CANONICAL_ORIGIN = "https://www.aquavoiq.com";
const AQUAVO_PRODUCTION_HOSTS = new Set(["www.aquavoiq.com", "aquavoiq.com"]);
const WEBHOOK_SIGNATURE_HEADER = "x-wayl-signature-256";

const onlineCheckoutSchema = z.object({
  customerInfo: z.object({
    name: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(10).max(15),
    address: z.string().trim().min(10).max(500),
    email: z.string().email().optional().or(z.literal("")),
  }).strict(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive().max(100),
    variantId: z.string().min(1).max(100).optional(),
  }).strict()).min(1).max(50),
  couponCode: z.string().trim().max(100).optional(),
  useCashback: z.boolean().optional().default(false),
  cashbackToUse: z.number().int().min(0).optional().default(0),
}).strict();

const retrySchema = z.object({ paymentId: z.string().trim().min(1).max(300) }).strict();
const idempotencyKeySchema = z.string().uuid();

function errorStatus(error: unknown, fallback = 500): number {
  const status = Number((error as any)?.status ?? (error as any)?.statusCode);
  if (Number.isInteger(status) && status >= 400 && status < 600) return status;
  if (error instanceof WaylApiError && error.status >= 400 && error.status < 600) return error.status;
  return fallback;
}

function publicErrorMessage(error: unknown, fallback: string): string {
  const status = errorStatus(error);
  if (status === 409 || status === 400 || status === 403 || status === 404) {
    return error instanceof Error ? error.message : fallback;
  }
  return fallback;
}

/**
 * Production deliberately ignores legacy SITE_URL values. Payment callback URLs
 * are pinned to AQUAVO's canonical host unless the request itself is already on
 * one of AQUAVO's production hosts.
 */
export function publicSiteOrigin(req: Request): string {
  if (process.env.NODE_ENV === "production") {
    const host = (req.get("host") || "").split(":", 1)[0].trim().toLowerCase();
    if (AQUAVO_PRODUCTION_HOSTS.has(host)) return `https://${host}`;
    return AQUAVO_CANONICAL_ORIGIN;
  }

  const configured = process.env.PUBLIC_SITE_URL || process.env.SITE_URL || process.env.VITE_SITE_URL || process.env.VITE_PUBLIC_BASE_URL;
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === "https:" || url.protocol === "http:") return url.origin;
    } catch {
      // Fall through to the request origin in development.
    }
  }
  return `${req.protocol}://${req.get("host") || "localhost:5000"}`;
}

function paymentUrls(req: Request) {
  const origin = publicSiteOrigin(req);
  return {
    redirectUrl: `${origin}/api/payments/wayl/return`,
    webhookUrl: `${origin}/api/payments/wayl/webhook`,
  };
}

function resultPath(state: { paymentStatus: string; orderId: string; paymentId: string }): string {
  const page = state.paymentStatus === "paid"
    ? "success"
    : ["failed", "cancelled", "expired"].includes(state.paymentStatus)
      ? "failed"
      : "pending";
  const query = new URLSearchParams({ order_id: state.orderId, payment_id: state.paymentId });
  return `/payment/${page}?${query.toString()}`;
}

async function isBannedPurchaseIp(req: Request): Promise<boolean> {
  if (!db) return false;
  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
    || req.socket.remoteAddress
    || "unknown";
  if (clientIp === "unknown") return false;
  try {
    const result = await db.execute(sql`
      SELECT 1 FROM banned_ips WHERE ip_address = ${clientIp} AND is_active = true LIMIT 1
    `);
    return Boolean(result.rows?.length);
  } catch (error) {
    console.error("[AQUAVO Wayl] IP ban check failed:", error);
    return false;
  }
}

export function createWaylRouter() {
  const router = Router();

  // Config → auth → live-merchant readiness (see checkWaylReadiness). The public
  // body is deliberately only { available }; the reason stays in server logs.
  router.get("/availability", async (_req, res) => {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    try {
      const readiness = await checkWaylReadiness();
      if (!readiness.available) {
        console.log(`[AQUAVO Wayl] availability: ${readiness.reason} | config: ${readiness.checks.configValid} | auth: ${readiness.checks.authValid} | store verified: ${readiness.checks.storeVerified}`);
      }
      res.json({ available: readiness.available });
    } catch (error) {
      console.error("[AQUAVO Wayl] availability: UNKNOWN_CONFIG_ERROR |", error instanceof Error ? error.message : error);
      res.json({ available: false });
    }
  });

  // Real storefront online checkout. The browser sends product IDs/quantities only;
  // the service re-reads prices, stock, shipping and coupon state from the DB.
  router.post("/checkout", orderLimiter, async (req, res) => {
    try {
      if (await isBannedPurchaseIp(req)) {
        res.status(403).json({ message: "تم حظر هذا الجهاز من الشراء بسبب رفض استلام طلبات سابقة. تواصل مع الدعم." });
        return;
      }
      const parsed = onlineCheckoutSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "بيانات الطلب غير صالحة" });
        return;
      }
      const parsedKey = idempotencyKeySchema.safeParse(req.get("Idempotency-Key"));
      if (!parsedKey.success) {
        res.status(400).json({ message: "Invalid Idempotency-Key header" });
        return;
      }

      const session = getSession(req);
      const prepared = await prepareOnlineOrder({
        idempotencyKey: parsedKey.data,
        userId: session?.userId || null,
        sessionId: (req as any).sessionID,
        customerInfo: parsed.data.customerInfo,
        items: parsed.data.items,
        couponCode: parsed.data.couponCode,
        useCashback: parsed.data.useCashback,
        cashbackToUse: parsed.data.cashbackToUse,
      });
      const started = await startWaylPaymentForOrder(prepared.order.id, paymentUrls(req));
      res.status(prepared.reused ? 200 : 201).json(started);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (/PRODUCTION_TEST_ORDER_BLOCKED/.test(errorMessage)) {
        res.status(400).json({ message: "اكتب اسم المستلم الحقيقي بدل اسم حساب الإدارة (System Admin)، وبعدها أعد المحاولة." });
        return;
      }
      if (isWaylStoreVerificationError(error)) {
        // Wayl refused to issue a link because the merchant store is not verified.
        // Never echo the provider's English message; hide the option for a while.
        noteWaylStoreVerificationFailure();
        console.error("[AQUAVO Wayl] checkout refused: WAYL_ACCOUNT_NOT_LIVE_ENABLED (store not verified at Wayl)");
        res.status(503).json({ message: "الدفع الإلكتروني غير متاح حالياً. اختر الدفع عند الاستلام وراح نكمل طلبك." });
        return;
      }
      const status = errorStatus(error);
      console.error("[AQUAVO Wayl] checkout failed:", error instanceof Error ? error.message : error);
      res.status(status).json({
        message: publicErrorMessage(error, "تعذر تجهيز الدفع الإلكتروني. حاول مرة ثانية."),
      });
    }
  });

  router.get("/order/:orderId/status", async (req, res) => {
    const paymentId = typeof req.query.paymentId === "string" ? req.query.paymentId.trim() : "";
    if (!paymentId) {
      res.status(400).json({ message: "paymentId is required" });
      return;
    }
    try {
      const state = await getVerifiedPaymentState(req.params.orderId, paymentId);
      res.setHeader("Cache-Control", "no-store, max-age=0");
      res.json(state);
    } catch (error) {
      const status = errorStatus(error, 502);
      res.status(status).json({ message: publicErrorMessage(error, "تعذر التحقق من حالة الدفع حالياً.") });
    }
  });

  router.post("/order/:orderId/retry", orderLimiter, async (req, res) => {
    const parsed = retrySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "بيانات إعادة المحاولة غير صالحة" });
      return;
    }
    try {
      const result = await retryWaylPayment(req.params.orderId, parsed.data.paymentId, paymentUrls(req));
      if ("redirectUrl" in result) {
        res.json(result);
        return;
      }
      res.status(409).json({ message: "تم تأكيد الدفع بالفعل.", payment: result });
    } catch (error) {
      const status = errorStatus(error, 502);
      res.status(status).json({ message: publicErrorMessage(error, "تعذر إنشاء محاولة دفع جديدة حالياً.") });
    }
  });

  // Webhook is deliberately treated as a trigger, not proof. We verify the
  // HMAC-SHA256 signature against the per-payment secret we generated and stored
  // server-side, then re-read amount/currency/status from Wayl's authoritative
  // GET /api/v1/links/{referenceId} before changing any order state. This also
  // makes duplicate/replayed webhooks safe: finalizePaidOrder is idempotent on
  // orders already marked paid.
  router.post(
    "/webhook",
    async (req: Request, res: Response) => {
      // server/index.ts captures the raw request body into req.rawBody via
      // express.json()'s verify callback so this check hashes the exact bytes
      // Wayl signed. A re-serialisation of req.body is never an acceptable
      // substitute, so a missing raw body is rejected outright.
      const rawBody = req.rawBody;
      if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
        res.status(400).json({ ok: false, message: "raw_body_unavailable" });
        return;
      }
      const payload = req.body ?? {};

      const referenceId = typeof payload?.referenceId === "string" ? payload.referenceId : "";
      if (!referenceId) {
        res.status(400).json({ ok: false, message: "referenceId is required" });
        return;
      }

      try {
        const bound = await findWebhookSecretForReference(referenceId);
        if (!bound) {
          // A very early provider event can arrive before the create response has
          // been persisted, or referenceId is unknown. Do not expose internals;
          // the browser return and status polling still perform authoritative
          // verification later.
          res.status(202).json({ ok: true, status: "not_registered_yet" });
          return;
        }

        const signatureHeader = req.headers[WEBHOOK_SIGNATURE_HEADER];
        if (!verifyWaylWebhookSignature(rawBody, signatureHeader, bound.secret)) {
          console.error("[AQUAVO Wayl] webhook signature verification failed for reference", referenceId);
          res.status(401).json({ ok: false, message: "invalid_signature" });
          return;
        }

        const state = await verifyAndSyncWaylPayment(referenceId);
        res.json({ ok: true, status: state.paymentStatus });
      } catch (error) {
        const status = errorStatus(error, 502);
        console.error("[AQUAVO Wayl] webhook verification failed:", error instanceof Error ? error.message : error);
        res.status(status).json({ ok: false, message: "verification_failed" });
      }
    },
  );

  // Redirect query parameters are UX-only. We verify against the provider API,
  // finalize server-side, then redirect to an AQUAVO result page.
  router.get("/return", async (req, res) => {
    const paymentId = typeof req.query.id === "string" && req.query.id.trim()
      ? req.query.id.trim()
      : typeof req.query.payment_id === "string" ? req.query.payment_id.trim() : "";
    if (!paymentId) {
      res.status(400).type("html").send("<h1>بيانات الرجوع ناقصة</h1><p>payment_id غير موجود.</p>");
      return;
    }

    try {
      const state = await verifyAndSyncWaylPayment(paymentId);
      res.redirect(303, resultPath(state));
    } catch (error) {
      const status = errorStatus(error, 502);
      res.status(status).type("html").send(
        "<h1>جارٍ التحقق من عملية الدفع</h1><p>تعذر تأكيد النتيجة الآن. لا تنشئ طلباً جديداً؛ افتح صفحة حالة الدفع وأعد التحقق.</p>",
      );
    }
  });

  return router;
}
