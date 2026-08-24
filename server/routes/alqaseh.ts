import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { requireAdmin } from "../middleware/auth.js";
import {
  AlqasehApiError,
  createAlqasehPayment,
  getAlqasehConfig,
  getAlqasehHostedPaymentUrl,
  getAlqasehPayment,
} from "../services/alqaseh-client.js";

const SANDBOX_TEST_AMOUNT_IQD = 1000;
const SANDBOX_TEST_DESCRIPTION = "AQUAVO Al-Qaseh sandbox integration test";

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
  let raw = "";
  try {
    raw = JSON.stringify(details).slice(0, 800);
  } catch {
    raw = "";
  }

  return [
    providerErr ? `provider_error=${providerErr}` : "",
    message ? `provider_message=${message}` : "",
    code ? `error_code=${code}` : "",
    reference ? `reference_code=${reference}` : "",
    raw ? `provider_details=${raw}` : "",
  ].filter(Boolean).join("\n");
}

function publicSiteOrigin(req: Request): string {
  const configured =
    process.env.PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VITE_SITE_URL;

  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.protocol === "http:")) {
        return url.origin;
      }
    } catch {
      // Fall through to a safe environment-specific origin.
    }
  }

  if (process.env.NODE_ENV === "production") return "https://www.aquavoiq.com";
  return `${req.protocol}://${req.get("host") || "localhost:5000"}`;
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

export function createAlqasehRouter() {
  const router = Router();

  router.get("/health", requireAdmin, (_req, res) => {
    try {
      const config = getAlqasehConfig();
      res.json({
        ok: true,
        environment: config.environment,
        apiBaseUrl: config.apiBaseUrl,
        payBaseUrl: config.payBaseUrl,
        credentialsConfigured: Boolean(config.clientId && config.clientSecret),
      });
    } catch (error) {
      res.status(503).json({
        ok: false,
        message: error instanceof Error ? error.message : "Al-Qaseh configuration error",
      });
    }
  });

  // Deliberately admin-only and sandbox-only. This proves the hosted payment
  // flow without creating an AQUAVO order, consuming stock, coupons or loyalty.
  router.get("/test", requireAdmin, (_req, res) => {
    const config = getAlqasehConfig();
    if (config.environment !== "sandbox") {
      renderPage(
        res,
        "Al-Qaseh test disabled",
        `<h1>الاختبار متوقف</h1><p class="bad">هذا المسار يعمل فقط عندما ALQASEH_ENV=sandbox.</p>`,
        409,
      );
      return;
    }

    renderPage(
      res,
      "Al-Qaseh Sandbox Test",
      `<h1>اختبار Al-Qaseh مع AQUAVO</h1>
       <p>هذا اختبار آمن على بيئة Al-Qaseh التجريبية. لا ينشئ طلب حقيقي داخل AQUAVO ولا يخصم مخزون.</p>
       <div class="meta">Environment: sandbox\nAmount: ${SANDBOX_TEST_AMOUNT_IQD} IQD\nAPI: ${htmlEscape(config.apiBaseUrl)}</div>
       <a class="btn" href="/api/payments/alqaseh/test-payment">بدء دفع تجريبي ${SANDBOX_TEST_AMOUNT_IQD} د.ع</a>`,
    );
  });

  // Use a GET navigation for this admin-only, non-production proof so the test
  // button cannot be swallowed by form/CSRF/browser behavior. This endpoint does
  // not mutate AQUAVO business state; it only creates a provider sandbox context.
  // It first paints a visible loading page, then meta-refreshes into the provider call.
  router.get("/test-payment", requireAdmin, (_req, res) => {
    renderPage(
      res,
      "Connecting to Al-Qaseh",
      `<h1><span class="spinner"></span>جاري الاتصال بـ Al-Qaseh</h1>
       <p>يتم الآن إنشاء عملية دفع تجريبية بقيمة ${SANDBOX_TEST_AMOUNT_IQD} د.ع. لا تغلق الصفحة.</p>
       <p class="warn">إذا بقيت هنا أكثر من 15 ثانية، أعد المحاولة مرة واحدة.</p>`,
      200,
      `<meta http-equiv="refresh" content="0;url=/api/payments/alqaseh/test-payment/run" />`,
    );
  });

  // Backward compatibility for any already-open page that still contains the old POST form.
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
      const origin = publicSiteOrigin(req);
      const redirectUrl = `${origin}/api/payments/alqaseh/return`;

      const payment = await createAlqasehPayment({
        amount: SANDBOX_TEST_AMOUNT_IQD,
        currency: "IQD",
        description: SANDBOX_TEST_DESCRIPTION,
        orderId,
        redirectUrl,
        country: "IQ",
      });

      res.redirect(303, getAlqasehHostedPaymentUrl(payment.token));
    } catch (error) {
      const status = error instanceof AlqasehApiError ? error.status : 500;
      const safeMessage = error instanceof Error ? error.message : "تعذر إنشاء عملية الدفع التجريبية";
      const diagnostic = providerDiagnostic(error);
      renderPage(
        res,
        "Al-Qaseh error",
        `<h1>تعذر بدء الاختبار</h1><p class="bad">${htmlEscape(safeMessage)}</p>${diagnostic ? `<div class="meta">${htmlEscape(diagnostic)}</div>` : ""}<a class="btn secondary" href="/api/payments/alqaseh/test">رجوع</a>`,
        status >= 400 && status < 600 ? status : 500,
      );
    }
  });

  // The query-string status is UX-only. We always ask Al-Qaseh server-to-server
  // for the authoritative payment context before displaying a result.
  router.get("/return", async (req, res) => {
    const paymentId = typeof req.query.payment_id === "string" ? req.query.payment_id : "";
    const redirectedOrderId = typeof req.query.order_id === "string" ? req.query.order_id : "";
    const redirectedStatus = typeof req.query.status === "string" ? req.query.status : "";

    if (!paymentId) {
      renderPage(res, "Invalid payment callback", `<h1>بيانات الرجوع ناقصة</h1><p class="bad">payment_id غير موجود.</p>`, 400);
      return;
    }

    try {
      const context = await getAlqasehPayment(paymentId);
      const isSandboxTest = /^[0-9a-f]{32}$/i.test(context.order_id) && context.description === SANDBOX_TEST_DESCRIPTION;
      const amountMatches = Number(context.amount) === SANDBOX_TEST_AMOUNT_IQD;
      const currencyMatches = String(context.currency).toUpperCase() === "IQD";
      const orderMatches = !redirectedOrderId || context.order_id === redirectedOrderId;
      const verified = isSandboxTest && amountMatches && currencyMatches && orderMatches;
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
         <p>ملاحظة: حالة الرابط لم نعتمد عليها؛ النتيجة أعلاه جرى التحقق منها من خادم Al-Qaseh.</p>
         <a class="btn" href="/api/payments/alqaseh/test">اختبار جديد</a>`,
      );
    } catch (error) {
      const status = error instanceof AlqasehApiError ? error.status : 500;
      renderPage(
        res,
        "Payment verification error",
        `<h1>تعذر التحقق من العملية</h1><p class="bad">${htmlEscape(error instanceof Error ? error.message : "Unknown error")}</p>`,
        status >= 400 && status < 600 ? status : 500,
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
      const status = error instanceof AlqasehApiError ? error.status : 500;
      res.status(status >= 400 && status < 600 ? status : 500).json({
        message: error instanceof Error ? error.message : "Unable to verify payment",
      });
    }
  });

  return router;
}
