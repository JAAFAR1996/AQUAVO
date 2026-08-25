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

function friendlyProviderStatus(status: string): string {
  const labels: Record<string, string> = {
    succeeded: "تم الدفع بنجاح",
    prepared: "بانتظار إكمال الدفع",
    retried: "تم تجهيز محاولة جديدة",
    failed: "لم تكتمل عملية الدفع",
    declined: "لم تُقبل عملية الدفع",
    expired: "انتهت مهلة الدفع",
    revoked: "أُلغيت عملية الدفع",
    cancelled: "أُلغيت عملية الدفع",
    duplicated: "تعذر إكمال المحاولة",
    unknown: "جارٍ تأكيد الحالة",
    pending: "جارٍ تأكيد الحالة",
  };
  return labels[status] || "جارٍ تأكيد الحالة";
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
:root{color-scheme:light;--ink:#0b2028;--muted:#65757d;--line:#dce6e9;--brand:#0b6a73;--brand2:#084e56;--bg:#f3f7f8;--ok:#087443;--bad:#b42318;--warn:#9a5b06;--soft:#f9fbfb}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 50% -10%,#d8f0f1 0,transparent 43%),linear-gradient(180deg,#f8fbfb 0,var(--bg) 100%);font-family:system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif;color:var(--ink);padding:18px}
.wrap{width:min(100%,650px);margin:clamp(12px,4vh,42px) auto}.brand{text-align:center;font-size:25px;font-weight:950;letter-spacing:.15em;margin-bottom:18px;color:#082f37}.card{position:relative;overflow:hidden;background:rgba(255,255,255,.97);border:1px solid rgba(205,220,224,.92);border-radius:30px;padding:clamp(22px,5vw,40px);box-shadow:0 30px 90px rgba(15,45,54,.12)}.card:before{content:"";position:absolute;inset:0 0 auto;height:4px;background:linear-gradient(90deg,var(--brand),#49a7ad,var(--brand))}
.icon{width:68px;height:68px;border-radius:22px;display:grid;place-items:center;margin:0 auto 20px;font-size:31px;font-weight:900;border:1px solid transparent}.icon.ok{background:#e9f8ef;color:var(--ok);border-color:#d2f0dd}.icon.bad{background:#fff0ee;color:var(--bad);border-color:#f7d8d3}.icon.pending{background:#fff5e8;color:var(--warn);border-color:#f3dfbd}
h1{text-align:center;font-size:clamp(24px,5vw,32px);margin:0 0 10px;letter-spacing:-.02em}.lead{text-align:center;color:var(--muted);line-height:1.85;margin:0 auto 24px;max-width:500px}.trust{display:flex;justify-content:center;flex-wrap:wrap;gap:7px;margin:-6px 0 22px}.pill{font-size:11px;font-weight:700;color:#557078;border:1px solid var(--line);background:#fbfdfd;border-radius:999px;padding:6px 9px}
.summary{border:1px solid var(--line);border-radius:20px;padding:15px 18px;margin:20px 0;background:linear-gradient(180deg,#fdfefe,#f8fbfb)}.row{display:flex;justify-content:space-between;gap:18px;padding:9px 0;font-size:14px}.row+.row{border-top:1px dashed #e2eaed}.row span:first-child{color:var(--muted)}.row strong{font-weight:850;text-align:left}.notice{font-size:13px;line-height:1.8;padding:13px 15px;border-radius:15px;margin:16px 0}.notice.warn{background:#fff6e9;color:#754508;border:1px solid #f3dfbd}.notice.ok{background:#edf9f1;color:#126a43;border:1px solid #d5efdf}
.timeline{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin:22px 0 8px}.step{position:relative;text-align:center;padding-top:30px;color:#819096;font-size:11px;line-height:1.45}.step:before{content:"";position:absolute;top:10px;right:0;left:0;height:2px;background:#e4ebed}.step:first-child:before{right:50%}.step:last-child:before{left:50%}.dot{position:absolute;top:3px;right:calc(50% - 8px);width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid #cbd7da;z-index:2}.step.done{color:var(--ok);font-weight:750}.step.done:before{background:#a9dec0}.step.done .dot{border-color:var(--ok);background:var(--ok);box-shadow:0 0 0 4px #e9f8ef}.step.current{color:var(--brand);font-weight:800}.step.current .dot{border-color:var(--brand);background:#fff;box-shadow:0 0 0 4px #e6f3f4}
.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:24px}.btn{min-height:50px;border-radius:14px;border:1px solid var(--line);font:inherit;font-weight:850;cursor:pointer;text-decoration:none;display:flex;align-items:center;justify-content:center;padding:11px 14px;background:white;color:var(--ink);transition:.18s}.btn:hover{transform:translateY(-1px);box-shadow:0 7px 20px rgba(15,45,54,.08)}.btn.primary{background:linear-gradient(135deg,var(--brand),var(--brand2));border-color:transparent;color:white}.btn:disabled{opacity:.55;cursor:wait;transform:none}.btn.full{grid-column:1/-1}.tiny{text-align:center;color:#7a8990;font-size:12px;line-height:1.75;margin:20px 0 0}.spin{display:inline-block;width:20px;height:20px;border:2px solid #decfb7;border-top-color:var(--warn);border-radius:50%;animation:spin .8s linear infinite;vertical-align:-4px}@keyframes spin{to{transform:rotate(360deg)}}
.status-live{text-align:center;font-size:12px;color:var(--muted);min-height:20px;margin-top:9px}
@media(max-width:520px){body{padding:10px}.wrap{margin:8px auto}.card{border-radius:24px;padding:22px 18px}.actions{grid-template-columns:1fr}.btn.full{grid-column:auto}.timeline{margin-inline:-4px}.step{font-size:10px}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}.spin{animation-duration:1.5s}.btn{transition:none}}
</style>
<script src="/payment-flow.js" defer></script>
</head>
<body><main class="wrap"><div class="brand">AQUAVO</div>${content}</main></body>
</html>`;
}

function successPage(state: VerifiedOnlinePaymentState): string {
  const reviewNotice = state.inventoryReview
    ? `<div class="notice warn">تم تأكيد الدفع بنجاح. الطلب يحتاج مراجعة داخلية للمخزون قبل التجهيز. لا تعِد الدفع؛ فريق AQUAVO سيتابع نفس الطلب.</div>`
    : `<div class="notice ok">تم التحقق من عملية الدفع مباشرة من بوابة Al-Qaseh، وطلبك دخل الآن مرحلة التجهيز.</div>`;
  const content = `<section class="card" data-payment-page="success" data-order-id="${h(state.orderId)}" data-payment-id="${h(state.paymentId)}">
    <div class="icon ok">✓</div>
    <h1>تم الدفع بنجاح</h1>
    <p class="lead">شكراً لطلبك من AQUAVO. تم تأكيد العملية من الخادم وربطها بطلبك بشكل آمن.</p>
    <div class="trust"><span class="pill">تحقق من Al-Qaseh</span><span class="pill">لا نخزن بيانات البطاقة</span><span class="pill">الطلب محفوظ</span></div>
    <div class="summary">
      <div class="row"><span>رقم الطلب</span><strong>${h(state.orderNumber)}</strong></div>
      <div class="row"><span>المبلغ المدفوع</span><strong>${h(formatIQD(state.amount))}</strong></div>
      <div class="row"><span>حالة الدفع</span><strong>مدفوع إلكترونياً</strong></div>
    </div>
    ${reviewNotice}
    <div class="timeline" aria-label="مراحل الطلب">
      <div class="step done"><span class="dot"></span>تم الدفع</div>
      <div class="step current"><span class="dot"></span>جاري التجهيز</div>
      <div class="step"><span class="dot"></span>تم الشحن</div>
      <div class="step"><span class="dot"></span>تم التسليم</div>
    </div>
    <div class="actions">
      <a class="btn primary" href="/order-tracking">تتبع طلبي</a>
      <a class="btn" href="/contact">تواصل معنا</a>
      <a class="btn full" href="/products">العودة للتسوق</a>
    </div>
    <p class="tiny">يمكنك إغلاق هذه الصفحة بأمان. تحديثها يعيد التحقق من حالة الدفع الحقيقية ولا يكرر الخصم.</p>
  </section>`;
  return shell("تم الدفع بنجاح", content);
}

function failedPage(state: VerifiedOnlinePaymentState): string {
  const statusLabel = state.paymentStatus === "expired"
    ? "انتهت مهلة الدفع"
    : state.paymentStatus === "cancelled"
      ? "تم إلغاء عملية الدفع"
      : state.providerStatus === "declined"
        ? "لم تُقبل عملية الدفع"
        : "لم تكتمل عملية الدفع";
  const content = `<section class="card" data-payment-page="failed" data-order-id="${h(state.orderId)}" data-payment-id="${h(state.paymentId)}">
    <div class="icon bad">!</div>
    <h1>${h(statusLabel)}</h1>
    <p class="lead">لم نعتبر الطلب مدفوعاً. طلبك محفوظ ويمكنك إعادة المحاولة على نفس الطلب أو الرجوع واختيار الدفع عند الاستلام.</p>
    <div class="summary">
      <div class="row"><span>رقم الطلب</span><strong>${h(state.orderNumber)}</strong></div>
      <div class="row"><span>المبلغ</span><strong>${h(formatIQD(state.amount))}</strong></div>
      <div class="row"><span>الحالة</span><strong>${h(friendlyProviderStatus(state.providerStatus))}</strong></div>
    </div>
    <div id="retryError" class="notice warn" hidden></div>
    <div class="actions">
      <button id="retry" class="btn primary" type="button">إعادة محاولة الدفع الآمن</button>
      <a class="btn" href="/checkout">اختيار طريقة دفع أخرى</a>
      <a class="btn full" href="/contact">تحتاج مساعدة؟ تواصل معنا</a>
    </div>
    <p class="tiny">AQUAVO لا يعرض نجاحاً ولا يعتبر الطلب مدفوعاً إلا بعد تأكيد الحالة مباشرة من مزود الدفع.</p>
  </section>`;
  return shell("لم تكتمل عملية الدفع", content);
}

function pendingPage(state: VerifiedOnlinePaymentState): string {
  const content = `<section class="card" data-payment-page="pending" data-payment-auto="true" data-order-id="${h(state.orderId)}" data-payment-id="${h(state.paymentId)}">
    <div class="icon pending"><span class="spin"></span></div>
    <h1>جارٍ تأكيد عملية الدفع</h1>
    <p class="lead">لا تحتاج إلى إعادة الدفع. سنراجع الحالة تلقائياً مع Al-Qaseh لعدة محاولات قبل أن نطلب منك أي إجراء.</p>
    <div class="summary">
      <div class="row"><span>رقم الطلب</span><strong>${h(state.orderNumber)}</strong></div>
      <div class="row"><span>المبلغ</span><strong>${h(formatIQD(state.amount))}</strong></div>
      <div class="row"><span>الحالة الحالية</span><strong data-payment-status-text>${h(friendlyProviderStatus(state.providerStatus))}</strong></div>
    </div>
    <div class="status-live" data-payment-live aria-live="polite">سيتم التحقق تلقائياً بعد لحظات…</div>
    <div class="actions">
      <button class="btn primary" type="button" data-payment-refresh>تحقق الآن</button>
      <a class="btn" href="/contact">تواصل معنا</a>
      <a class="btn full" href="/products">العودة للتسوق</a>
    </div>
    <p class="tiny">يمكنك ترك الصفحة مفتوحة أو الرجوع لاحقاً؛ لن يؤدي التحقق إلى خصم المخزون أو إضافة النقاط أكثر من مرة.</p>
  </section>`;
  return shell("جارٍ التحقق من الدفع", content);
}

function unavailablePage(orderId: string, paymentId: string): string {
  const query = new URLSearchParams({ order_id: orderId, payment_id: paymentId });
  const content = `<section class="card">
    <div class="icon pending"><span class="spin"></span></div>
    <h1>تعذر التأكد مؤقتاً</h1>
    <p class="lead">لم نفترض نجاح العملية أو فشلها لأن مزود الدفع غير متاح للحظة. لا تعِد الدفع قبل إعادة التحقق.</p>
    <div class="actions"><a class="btn primary" href="/payment/pending?${h(query.toString())}">إعادة التحقق</a><a class="btn" href="/contact">تواصل معنا</a></div>
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
