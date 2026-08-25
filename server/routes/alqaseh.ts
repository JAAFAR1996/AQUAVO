import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin, getSession } from "../middleware/auth.js";
import { orderLimiter } from "../middleware/rate-limit.js";
import { db } from "../db.js";
import {
  AlqasehApiError,
  createAlqasehPayment,
  getAlqasehConfig,
  getAlqasehHostedPaymentUrl,
  getAlqasehPayment,
} from "../services/alqaseh-client.js";
import {
  getVerifiedPaymentState,
  prepareOnlineOrder,
  retryAlqasehPayment,
  startAlqasehPaymentForOrder,
  verifyAndSyncAlqasehPayment,
} from "../services/alqaseh-order-payment.js";

const SANDBOX_TEST_AMOUNT_IQD = 1000;
const SANDBOX_TEST_DESCRIPTION = "AQUAVO Al-Qaseh sandbox integration test";
const AQUAVO_CANONICAL_ORIGIN = "https://www.aquavoiq.com";
const AQUAVO_PRODUCTION_HOSTS = new Set(["www.aquavoiq.com", "aquavoiq.com"]);

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

function htmlEscape(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function providerDiagnostic(error: unknown): string {
  if (!(error instanceof AlqasehApiError) || !error.details || typeof error.details !== "object") return "";
  const details = error.details as Record<string, unknown>;
  const code = typeof details.error_code === "string" ? details.error_code : "";
  const reference = typeof details.reference_code === "string" ? details.reference_code : "";
  const providerErr = typeof details.err === "string" ? details.err : "";
  const message = typeof details.message === "string" ? details.message : "";
  return [
    providerErr ? `provider_error=${providerErr}` : "",
    message ? `provider_message=${message}` : "",
    code ? `error_code=${code}` : "",
    reference ? `reference_code=${reference}` : "",
  ].filter(Boolean).join("\n");
}

function errorStatus(error: unknown, fallback = 500): number {
  const status = Number((error as any)?.status ?? (error as any)?.statusCode);
  if (Number.isInteger(status) && status >= 400 && status < 600) return status;
  if (error instanceof AlqasehApiError && error.status >= 400 && error.status < 600) return error.status;
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
    redirectUrl: `${origin}/api/payments/alqaseh/return`,
    webhookUrl: `${origin}/api/payments/alqaseh/webhook`,
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

function renderPage(res: Response, title: string, body: string, status = 200, headExtra = ""): void {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.status(status).type("html").send(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  ${headExtra}
  <title>${htmlEscape(title)} | AQUAVO</title>
  <style>
    body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#f6f8fb;color:#10212b;margin:0;padding:32px}
    main{max-width:680px;margin:40px auto;background:#fff;border:1px solid #dce5ea;border-radius:18px;padding:28px;box-shadow:0 12px 35px rgba(16,33,43,.08)}
    h1{margin-top:0;font-size:26px}p{line-height:1.8}.meta{background:#f4f7f9;border-radius:12px;padding:14px;margin:18px 0;font-family:ui-monospace,monospace;font-size:13px;direction:ltr;text-align:left;overflow-wrap:anywhere;white-space:pre-wrap}
    button,a.btn{display:inline-block;border:0;border-radius:12px;padding:12px 18px;background:#0f766e;color:white;text-decoration:none;font-weight:700;cursor:pointer}a.secondary{background:#475569;margin-inline-start:8px}.ok{color:#067647;font-weight:800}.bad{color:#b42318;font-weight:800}.warn{color:#b54708;font-weight:800}.spinner{display:inline-block;width:18px;height:18px;border:3px solid #d7e5e3;border-top-color:#0f766e;border-radius:50%;vertical-align:middle;margin-inline-end:8px;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
  </style>
</head>
<body><main>${body}</main></body>
</html>`);
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
    console.error("[AQUAVO Al-Qaseh] IP ban check failed:", error);
    return false;
  }
}

async function renderSandboxReturn(req: Request, res: Response, paymentId: string): Promise<void> {
  const redirectedOrderId = typeof req.query.order_id === "string" ? req.query.order_id : "";
  const redirectedStatus = typeof req.query.status === "string" ? req.query.status : "";
  const context = await getAlqasehPayment(paymentId);
  const looksLikeSandboxOrder = /^[0-9a-f]{32}$/i.test(context.order_id);
  const amountMatches = Number(context.amount) === SANDBOX_TEST_AMOUNT_IQD;
  const currencyMatches = String(context.currency).toUpperCase() === "IQD";
  const orderMatches = !redirectedOrderId || context.order_id === redirectedOrderId;
  const verified = looksLikeSandboxOrder && amountMatches && currencyMatches && orderMatches;
  const succeeded = context.payment_status === "succeeded";
  const resultClass = verified && succeeded ? "ok" : succeeded ? "warn" : "bad";
  const resultText = verified && succeeded
    ? "نجح الدفع التجريبي وتم التحقق من العملية مباشرة من API"
    : succeeded
      ? "الدفع ظاهر ناجح لكن بيانات الاختبار لم تتطابق بالكامل"
      : `حالة العملية: ${context.payment_status}`;

  renderPage(
    res,
    "Al-Qaseh payment result",
    `<h1>نتيجة اختبار Al-Qaseh</h1>
     <p class="${resultClass}">${htmlEscape(resultText)}</p>
     <div class="meta">verified_api_status=${htmlEscape(context.payment_status)}\npayment_id=${htmlEscape(context.payment_id)}\norder_id=${htmlEscape(context.order_id)}\namount=${htmlEscape(context.amount)} ${htmlEscape(context.currency)}\nredirect_status_untrusted=${htmlEscape(redirectedStatus || "n/a")}</div>
     <p>حالة الرابط لم تُستخدم كإثبات؛ التحقق تم من Al-Qaseh API.</p>
     <a class="btn" href="/api/payments/alqaseh/test">اختبار جديد</a>`,
  );
}

export function createAlqasehRouter() {
  const router = Router();

  router.get("/availability", (_req, res) => {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    try {
      getAlqasehConfig();
      res.json({ available: true });
    } catch {
      res.json({ available: false });
    }
  });

  router.get("/health", requireAdmin, (req, res) => {
    try {
      const config = getAlqasehConfig();
      res.json({
        ok: true,
        environment: config.environment,
        apiBaseUrl: config.apiBaseUrl,
        payBaseUrl: config.payBaseUrl,
        callbackOrigin: publicSiteOrigin(req),
        credentialsConfigured: Boolean(config.clientId && config.clientSecret),
      });
    } catch (error) {
      res.status(503).json({ ok: false, message: error instanceof Error ? error.message : "Al-Qaseh configuration error" });
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
      const started = await startAlqasehPaymentForOrder(prepared.order.id, paymentUrls(req));
      res.status(prepared.reused ? 200 : 201).json(started);
    } catch (error) {
      const status = errorStatus(error);
      console.error("[AQUAVO Al-Qaseh] checkout failed:", error instanceof Error ? error.message : error);
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
      const result = await retryAlqasehPayment(req.params.orderId, parsed.data.paymentId, paymentUrls(req));
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

  // Webhook is deliberately treated as a trigger, not proof. Al-Qaseh's public
  // docs do not document a webhook signature scheme, so we always fetch the
  // payment context from Al-Qaseh and match order_id + amount + currency first.
  router.post("/webhook", async (req, res) => {
    const paymentId = typeof req.body?.payment_id === "string"
      ? req.body.payment_id
      : typeof req.body?.paymentId === "string"
        ? req.body.paymentId
        : "";
    if (!paymentId) {
      res.status(400).json({ ok: false, message: "payment_id is required" });
      return;
    }
    try {
      const state = await verifyAndSyncAlqasehPayment(paymentId);
      res.json({ ok: true, status: state.paymentStatus });
    } catch (error) {
      const status = errorStatus(error, 502);
      if (status === 404) {
        // A very early provider event can arrive before the create response has
        // been persisted. Do not expose internals; later status/webhook events
        // and the browser return still perform authoritative verification.
        res.status(202).json({ ok: true, status: "not_registered_yet" });
        return;
      }
      console.error("[AQUAVO Al-Qaseh] webhook verification failed:", error instanceof Error ? error.message : error);
      res.status(status).json({ ok: false, message: "verification_failed" });
    }
  });

  // Redirect query parameters are UX-only. We verify against the provider API,
  // finalize server-side, then redirect to an AQUAVO result page.
  router.get("/return", async (req, res) => {
    const paymentId = typeof req.query.payment_id === "string" ? req.query.payment_id.trim() : "";
    if (!paymentId) {
      renderPage(res, "Invalid payment callback", `<h1>بيانات الرجوع ناقصة</h1><p class="bad">payment_id غير موجود.</p>`, 400);
      return;
    }

    try {
      const state = await verifyAndSyncAlqasehPayment(paymentId);
      res.redirect(303, resultPath(state));
    } catch (error) {
      // Preserve the original admin-only sandbox smoke test, which intentionally
      // creates no AQUAVO order/payment row.
      if (errorStatus(error) === 404) {
        try {
          if (getAlqasehConfig().environment === "sandbox") {
            await renderSandboxReturn(req, res, paymentId);
            return;
          }
        } catch (sandboxError) {
          const status = errorStatus(sandboxError, 502);
          renderPage(res, "Payment verification error", `<h1>تعذر التحقق من العملية</h1><p class="bad">أعد المحاولة من صفحة الدفع.</p>`, status);
          return;
        }
      }
      const status = errorStatus(error, 502);
      renderPage(
        res,
        "Payment verification error",
        `<h1>جارٍ التحقق من عملية الدفع</h1><p class="warn">تعذر تأكيد النتيجة الآن. لا تنشئ طلباً جديداً؛ افتح صفحة حالة الدفع وأعد التحقق.</p>`,
        status,
      );
    }
  });

  // Existing isolated sandbox smoke test. It never creates a real AQUAVO order.
  router.get("/test", requireAdmin, (req, res) => {
    const config = getAlqasehConfig();
    if (config.environment !== "sandbox") {
      renderPage(res, "Al-Qaseh test disabled", `<h1>الاختبار متوقف</h1><p class="bad">هذا المسار يعمل فقط عندما ALQASEH_ENV=sandbox.</p>`, 409);
      return;
    }
    renderPage(
      res,
      "Al-Qaseh Sandbox Test",
      `<h1>اختبار Al-Qaseh مع AQUAVO</h1>
       <p>اختبار معزول على بيئة Al-Qaseh التجريبية. لا ينشئ طلباً حقيقياً ولا يخصم مخزوناً.</p>
       <div class="meta">Environment: sandbox\nAmount: ${SANDBOX_TEST_AMOUNT_IQD} IQD\nAPI: ${htmlEscape(config.apiBaseUrl)}\nReturn: ${htmlEscape(publicSiteOrigin(req))}/api/payments/alqaseh/return</div>
       <a class="btn" href="/api/payments/alqaseh/test-payment">بدء دفع تجريبي ${SANDBOX_TEST_AMOUNT_IQD} د.ع</a>`,
    );
  });

  router.get("/test-payment", requireAdmin, (_req, res) => {
    renderPage(
      res,
      "Connecting to Al-Qaseh",
      `<h1><span class="spinner"></span>جاري الاتصال بـ Al-Qaseh</h1><p>يتم إنشاء عملية دفع تجريبية بقيمة ${SANDBOX_TEST_AMOUNT_IQD} د.ع.</p>`,
      200,
      `<meta http-equiv="refresh" content="0;url=/api/payments/alqaseh/test-payment/run" />`,
    );
  });

  router.post("/test-payment", requireAdmin, (_req, res) => {
    res.redirect(303, "/api/payments/alqaseh/test-payment/run");
  });

  router.get("/test-payment/run", requireAdmin, async (req, res) => {
    try {
      const config = getAlqasehConfig();
      if (config.environment !== "sandbox") {
        res.status(409).json({ message: "Sandbox test endpoint is disabled in production mode" });
        return;
      }
      const orderId = randomUUID().replaceAll("-", "");
      const payment = await createAlqasehPayment({
        amount: SANDBOX_TEST_AMOUNT_IQD,
        currency: "IQD",
        description: SANDBOX_TEST_DESCRIPTION,
        orderId,
        redirectUrl: `${publicSiteOrigin(req)}/api/payments/alqaseh/return`,
        country: "IQ",
      });
      res.redirect(303, getAlqasehHostedPaymentUrl(payment.token));
    } catch (error) {
      const status = errorStatus(error);
      const diagnostic = providerDiagnostic(error);
      renderPage(
        res,
        "Al-Qaseh error",
        `<h1>تعذر بدء الاختبار</h1><p class="bad">تعذر الاتصال ببوابة الاختبار.</p>${diagnostic ? `<div class="meta">${htmlEscape(diagnostic)}</div>` : ""}<a class="btn secondary" href="/api/payments/alqaseh/test">رجوع</a>`,
        status,
      );
    }
  });

  router.get("/status/:paymentId", requireAdmin, async (req, res) => {
    try {
      const context = await getAlqasehPayment(req.params.paymentId);
      res.json({
        paymentId: context.payment_id,
        orderId: context.order_id,
        amount: context.amount,
        currency: context.currency,
        status: context.payment_status,
        approvalCode: context.approval_code || null,
        rrn: context.rrn || null,
        updatedAt: context.updated_at || null,
      });
    } catch (error) {
      const status = errorStatus(error);
      res.status(status).json({ message: "Unable to verify payment" });
    }
  });

  return router;
}
