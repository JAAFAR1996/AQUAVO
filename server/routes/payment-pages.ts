import { Router, type Request, type Response } from "express";
import { getVerifiedPaymentState, type VerifiedOnlinePaymentState } from "../services/alqaseh-order-payment.js";

const validPages = new Set(["success", "failed", "pending"]);

function h(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatIQD(value: number): string {
  return `${Math.round(value).toLocaleString("en-US")} د.ع`;
}

function canonicalPage(status: string): "success" | "failed" | "pending" {
  if (status === "paid") return "success";
  if (["failed", "cancelled", "expired"].includes(status)) return "failed";
  return "pending";
}

function canonicalUrl(state: VerifiedOnlinePaymentState): string {
  const query = new URLSearchParams({ order_id: state.orderId, payment_id: state.paymentId });
  return `/payment/${canonicalPage(state.paymentStatus)}?${query.toString()}`;
}

function shell(title: string, content: string): string {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<meta name="robots" content="noindex,nofollow" />
<meta name="theme-color" content="#071c24" />
<title>${h(title)} | AQUAVO</title>
<style>
:root{color-scheme:light;--ink:#0c2028;--muted:#62727a;--line:#dfe7ea;--brand:#0c6972;--brand2:#0a5259;--bg:#f3f7f8;--ok:#087443;--bad:#b42318;--warn:#a15c00}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 50% -15%,#dff2f3 0,transparent 45%),var(--bg);font-family:system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif;color:var(--ink);padding:20px}
.wrap{width:min(100%,620px);margin:5vh auto}.brand{text-align:center;font-size:24px;font-weight:900;letter-spacing:.14em;margin-bottom:20px;color:#082c35}.card{background:rgba(255,255,255,.96);border:1px solid rgba(207,222,226,.9);border-radius:28px;padding:clamp(22px,5vw,38px);box-shadow:0 28px 80px rgba(17,47,56,.12)}
.icon{width:64px;height:64px;border-radius:20px;display:grid;place-items:center;margin:0 auto 20px;font-size:30px}.icon.ok{background:#e9f8ef;color:var(--ok)}.icon.bad{background:#fff0ee;color:var(--bad)}.icon.pending{background:#fff5e7;color:var(--warn)}
h1{text-align:center;font-size:clamp(24px,5vw,32px);margin:0 0 10px}.lead{text-align:center;color:var(--muted);line-height:1.8;margin:0 auto 26px;max-width:480px}.summary{border:1px solid var(--line);border-radius:18px;padding:16px 18px;margin:20px 0;background:#fbfdfd}.row{display:flex;justify-content:space-between;gap:18px;padding:8px 0;font-size:14px}.row+.row{border-top:1px dashed #e6edef}.row span:first-child{color:var(--muted)}.row strong{font-weight:800;text-align:left}.notice{font-size:13px;line-height:1.7;padding:12px 14px;border-radius:14px;margin:16px 0}.notice.warn{background:#fff6e9;color:#7b4b09}.notice.ok{background:#edf9f1;color:#126a43}
.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:24px}.btn{min-height:48px;border-radius:14px;border:1px solid var(--line);font:inherit;font-weight:800;cursor:pointer;text-decoration:none;display:flex;align-items:center;justify-content:center;padding:10px 14px;background:white;color:var(--ink)}.btn.primary{background:linear-gradient(135deg,var(--brand),var(--brand2));border-color:transparent;color:white}.btn:disabled{opacity:.55;cursor:wait}.btn.full{grid-column:1/-1}.tiny{text-align:center;color:#7a8990;font-size:12px;line-height:1.7;margin-top:20px}.spin{display:inline-block;width:18px;height:18px;border:2px solid #dbcdb8;border-top-color:var(--warn);border-radius:50%;animation:spin .8s linear infinite;margin-inline-end:7px;vertical-align:-4px}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:520px){body{padding:12px}.wrap{margin:2vh auto}.card{border-radius:22px}.actions{grid-template-columns:1fr}.btn.full{grid-column:auto}}
</style>
<script src="/payment-flow.js" defer></script>
</head>
<body><main class="wrap"><div class="brand">AQUAVO</div>${content}</main></body>
</html>`;
}

function successPage(state: VerifiedOnlinePaymentState): string {
  const reviewNotice = state.inventoryReview
    ? `<div class="notice warn">تم تأكيد الدفع، لكن الطلب يحتاج مراجعة داخلية للمخزون قبل التجهيز. لا تعِد الدفع؛ فريق AQUAVO سيتابع نفس الطلب.</div>`
    : `<div class="notice ok">تم التحقق من عملية الدفع مباشرة من بوابة الدفع، وأصبح الطلب جاهزاً للمعالجة.</div>`;
  const content = `<section class="card" data-payment-page="success" data-order-id="${h(state.orderId)}" data-payment-id="${h(state.paymentId)}">
    <div class="icon ok">✓</div>
    <h1>تم الدفع بنجاح</h1>
    <p class="lead">شكراً لطلبك من AQUAVO. تم تأكيد حالة الدفع من الخادم، وليس من بيانات الرابط.</p>
    <div class="summary">
      <div class="row"><span>رقم الطلب</span><strong>${h(state.orderNumber)}</strong></div>
      <div class="row"><span>المبلغ</span><strong>${h(formatIQD(state.amount))}</strong></div>
      <div class="row"><span>حالة الدفع</span><strong>مدفوع</strong></div>
    </div>
    ${reviewNotice}
    <div class="actions">
      <a class="btn primary" href="/order-tracking">تتبع الطلب</a>
      <a class="btn" href="/products">العودة للتسوق</a>
    </div>
    <p class="tiny">يمكنك إغلاق هذه الصفحة بأمان. تحديث الصفحة يعيد التحقق من الحالة الحقيقية.</p>
  </section>`;
  return shell("تم الدفع بنجاح", content);
}

function failedPage(state: VerifiedOnlinePaymentState): string {
  const statusLabel = state.paymentStatus === "expired"
    ? "انتهت صلاحية محاولة الدفع"
    : state.paymentStatus === "cancelled"
      ? "أُلغيت عملية الدفع"
      : "لم تكتمل عملية الدفع";
  const content = `<section class="card" data-payment-page="failed" data-order-id="${h(state.orderId)}" data-payment-id="${h(state.paymentId)}">
    <div class="icon bad">!</div>
    <h1>${h(statusLabel)}</h1>
    <p class="lead">الطلب محفوظ ولم نعتبره مدفوعاً. يمكنك إعادة المحاولة على نفس الطلب بدون إنشاء طلب جديد.</p>
    <div class="summary">
      <div class="row"><span>رقم الطلب</span><strong>${h(state.orderNumber)}</strong></div>
      <div class="row"><span>المبلغ</span><strong>${h(formatIQD(state.amount))}</strong></div>
      <div class="row"><span>حالة الدفع</span><strong>${h(state.paymentStatus)}</strong></div>
    </div>
    <div id="retryError" class="notice warn" hidden></div>
    <div class="actions">
      <button id="retry" class="btn primary" type="button">إعادة محاولة الدفع</button>
      <a class="btn" href="/checkout">العودة لطرق الدفع</a>
      <a class="btn full" href="/products">العودة للتسوق</a>
    </div>
    <p class="tiny">لن نعرض رسالة عن الخصم من البطاقة ما لم تكن الحالة مؤكدة من المزود.</p>
  </section>`;
  return shell("لم تكتمل عملية الدفع", content);
}

function pendingPage(state: VerifiedOnlinePaymentState): string {
  const content = `<section class="card" data-payment-page="pending" data-order-id="${h(state.orderId)}" data-payment-id="${h(state.paymentId)}">
    <div class="icon pending"><span class="spin"></span></div>
    <h1>جارٍ التحقق من عملية الدفع</h1>
    <p class="lead">الحالة النهائية لم تُحسم بعد. AQUAVO يعيد قراءة الحالة من Al-Qaseh قبل اعتبار الطلب مدفوعاً.</p>
    <div class="summary">
      <div class="row"><span>رقم الطلب</span><strong>${h(state.orderNumber)}</strong></div>
      <div class="row"><span>المبلغ</span><strong>${h(formatIQD(state.amount))}</strong></div>
      <div class="row"><span>الحالة الحالية</span><strong>${h(state.providerStatus)}</strong></div>
    </div>
    <div class="actions">
      <button class="btn primary" type="button" data-payment-refresh>تحقق مرة أخرى</button>
      <a class="btn" href="/products">العودة للتسوق</a>
    </div>
    <p class="tiny">يمكنك تحديث الصفحة؛ لن يؤدي ذلك إلى خصم المخزون أو إضافة النقاط أكثر من مرة.</p>
  </section>`;
  return shell("جارٍ التحقق من الدفع", content);
}

function unavailablePage(orderId: string, paymentId: string): string {
  const query = new URLSearchParams({ order_id: orderId, payment_id: paymentId });
  const content = `<section class="card">
    <div class="icon pending"><span class="spin"></span></div>
    <h1>جارٍ التحقق من عملية الدفع</h1>
    <p class="lead">تعذر الوصول إلى مزود الدفع مؤقتاً، لذلك لم نفترض نجاح العملية أو فشلها. أعد التحقق بعد قليل.</p>
    <div class="actions"><a class="btn primary" href="/payment/pending?${h(query.toString())}">تحقق مرة أخرى</a><a class="btn" href="/products">العودة للتسوق</a></div>
  </section>`;
  return shell("تعذر التحقق مؤقتاً", content);
}

export function createPaymentPageRouter() {
  const router = Router();

  const handler = async (req: Request, res: Response) => {
    const requestedPage = req.path.replace(/^\//, "");
    if (!validPages.has(requestedPage)) {
      res.status(404).end();
      return;
    }
    const orderId = typeof req.query.order_id === "string" ? req.query.order_id.trim() : "";
    const paymentId = typeof req.query.payment_id === "string" ? req.query.payment_id.trim() : "";
    if (!orderId || !paymentId) {
      res.status(400).setHeader("Cache-Control", "no-store");
      res.type("html").send(shell("بيانات دفع ناقصة", `<section class="card"><div class="icon bad">!</div><h1>بيانات الدفع ناقصة</h1><p class="lead">لا يمكن عرض حالة العملية بدون معرف الطلب ومعرف الدفع.</p><div class="actions"><a class="btn primary full" href="/products">العودة للتسوق</a></div></section>`));
      return;
    }

    res.setHeader("Cache-Control", "no-store, max-age=0");
    try {
      const state = await getVerifiedPaymentState(orderId, paymentId);
      const actualPage = canonicalPage(state.paymentStatus);
      if (actualPage !== requestedPage) {
        res.redirect(303, canonicalUrl(state));
        return;
      }
      const html = actualPage === "success" ? successPage(state) : actualPage === "failed" ? failedPage(state) : pendingPage(state);
      res.type("html").send(html);
    } catch (error: any) {
      const status = Number(error?.status ?? error?.statusCode ?? 502);
      if (status === 403 || status === 404) {
        res.status(status).type("html").send(shell("عملية غير صالحة", `<section class="card"><div class="icon bad">!</div><h1>تعذر العثور على عملية الدفع</h1><p class="lead">الرابط غير صالح أو لا يخص هذا الطلب.</p><div class="actions"><a class="btn primary full" href="/products">العودة للتسوق</a></div></section>`));
        return;
      }
      res.status(503).type("html").send(unavailablePage(orderId, paymentId));
    }
  };

  router.get("/success", handler);
  router.get("/failed", handler);
  router.get("/pending", handler);
  return router;
}
