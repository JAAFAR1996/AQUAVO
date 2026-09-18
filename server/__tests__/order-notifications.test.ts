import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TelegramSendError,
  buildOrderNotificationMessage,
  escapeHtml,
  formatBaghdadTime,
  formatIQD,
  paymentMethodLabel,
  sendOrderNotification,
  sendTelegramMessage,
  type OrderNotificationData,
} from "../services/order-notifications.js";

const ENV_KEYS = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"] as const;
const original = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

function configure() {
  process.env.TELEGRAM_BOT_TOKEN = "123456:unit-test-token";
  process.env.TELEGRAM_CHAT_ID = "-1000000000001";
}

function telegramResponse(ok: boolean, status = ok ? 200 : 400, description = "Bad Request: test") {
  return new Response(JSON.stringify(ok ? { ok: true, result: { message_id: 1 } } : { ok: false, description }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const baseOrder: OrderNotificationData = {
  orderId: "0d2a4f10-1111-4c2b-9a1e-000000000001",
  orderNumber: "FH-2609181",
  customerName: "جعفر محمد",
  customerPhone: "07701234567",
  customerAddress: "بغداد - حي الجامعة - شارع 12",
  total: 32000,
  shippingCost: 5000,
  discountTotal: 2000,
  paymentMethod: "cod",
  createdAt: "2026-09-18T12:45:00.000Z", // 15:45 in Baghdad (UTC+3)
  items: [
    { productId: "p1", productName: "YEE Filter", variantLabel: "16/22 mm", quantity: 2, priceAtPurchase: 8500, lineTotal: 17000 },
    { productId: "p2", productName: "Black Sand", variantLabel: "1 kg", quantity: 3, priceAtPurchase: 4000, lineTotal: 12000 },
  ],
};

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  for (const key of ENV_KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

describe("formatting helpers", () => {
  it("formats IQD with thousands separators", () => {
    expect(formatIQD(32000)).toBe("32,000 د.ع");
    expect(formatIQD("1234567")).toBe("1,234,567 د.ع");
    expect(formatIQD(0)).toBe("0 د.ع");
    expect(formatIQD("not a number")).toBe("0 د.ع");
  });

  it("renders the committed timestamp in Asia/Baghdad, not server-local time", () => {
    expect(formatBaghdadTime("2026-09-18T12:45:00.000Z")).toBe("18/09/2026 - 3:45 م");
    expect(formatBaghdadTime("2026-01-05T06:05:00.000Z")).toBe("05/01/2026 - 9:05 ص");
    expect(formatBaghdadTime(null)).toBeNull();
    expect(formatBaghdadTime("garbage")).toBeNull();
  });

  it("escapes every HTML-significant character", () => {
    expect(escapeHtml(`<b onclick="x">Tom & Jerry</b>`)).toBe("&lt;b onclick=&quot;x&quot;&gt;Tom &amp; Jerry&lt;/b&gt;");
    expect(escapeHtml(null)).toBe("");
  });

  it("labels the two payment states exactly", () => {
    expect(paymentMethodLabel("cod")).toBe("💵 الدفع عند الاستلام");
    expect(paymentMethodLabel("wayl_paid")).toBe("✅ مدفوع إلكترونياً — Wayl");
  });
});

describe("buildOrderNotificationMessage", () => {
  it("renders the target layout from stored lines with variant, quantity, unit price and line total", () => {
    const message = buildOrderNotificationMessage(baseOrder);
    expect(message).toContain("🛒 <b>طلب جديد من AQUAVO</b>");
    expect(message).toContain("📋 <b>رقم الطلب:</b>\n<code>FH-2609181</code>");
    expect(message).toContain("👤 <b>الزبون:</b>\nجعفر محمد");
    expect(message).toContain("📱 <b>الهاتف:</b>\n07701234567");
    expect(message).toContain("📍 <b>العنوان:</b>\nبغداد - حي الجامعة - شارع 12");
    expect(message).toContain("💳 <b>طريقة الدفع:</b>\n💵 الدفع عند الاستلام");
    expect(message).toContain("1. <b>YEE Filter</b>\n   الخيار: 16/22 mm\n   الكمية: 2\n   سعر القطعة: 8,500 د.ع\n   المجموع: 17,000 د.ع");
    expect(message).toContain("2. <b>Black Sand</b>\n   الخيار: 1 kg\n   الكمية: 3\n   سعر القطعة: 4,000 د.ع\n   المجموع: 12,000 د.ع");
    expect(message).toContain("🧾 المنتجات: 29,000 د.ع");
    expect(message).toContain("🚚 التوصيل: 5,000 د.ع");
    expect(message).toContain("🎁 الخصم: -2,000 د.ع");
    expect(message).toContain("💰 <b>المطلوب: 32,000 د.ع</b>");
    expect(message).toContain("🕐 <b>وقت الطلب:</b>\n18/09/2026 - 3:45 م بغداد");
    expect(message).toContain('<a href="https://www.aquavoiq.com/admin">فتح الطلب في لوحة AQUAVO</a>');
    expect(message).not.toContain("طلب اختبار");
    expect(message).not.toContain("ملاحظات الزبون");
  });

  it("omits the variant row when the line has no variant and computes a missing line total", () => {
    const message = buildOrderNotificationMessage({
      ...baseOrder,
      items: [{ productId: "p9", productName: "Heater 100W", quantity: 2, priceAtPurchase: 15000 }],
    });
    expect(message).toContain("1. <b>Heater 100W</b>\n   الكمية: 2\n   سعر القطعة: 15,000 د.ع\n   المجموع: 30,000 د.ع");
    expect(message).not.toContain("الخيار:");
  });

  it("shows free shipping and hides a zero discount, using the stored shippingCost (never a hardcoded 5,000)", () => {
    const message = buildOrderNotificationMessage({ ...baseOrder, shippingCost: 0, discountTotal: 0, total: 29000 });
    expect(message).toContain("🚚 التوصيل: مجاني");
    expect(message).not.toContain("🎁 الخصم");
    expect(message).not.toContain("5,000");
    expect(message).toContain("🧾 المنتجات: 29,000 د.ع");
  });

  it("labels a verified Wayl payment as paid and never as cash", () => {
    const message = buildOrderNotificationMessage({ ...baseOrder, paymentMethod: "wayl_paid" });
    expect(message).toContain("💳 <b>طريقة الدفع:</b>\n✅ مدفوع إلكترونياً — Wayl");
    expect(message).not.toContain("الدفع عند الاستلام");
  });

  it("includes customer notes only when present, escaped", () => {
    expect(buildOrderNotificationMessage({ ...baseOrder, customerNotes: "   " })).not.toContain("ملاحظات الزبون");
    const message = buildOrderNotificationMessage({ ...baseOrder, customerNotes: "اتصل قبل <التوصيل>" });
    expect(message).toContain("📝 <b>ملاحظات الزبون:</b>\nاتصل قبل &lt;التوصيل&gt;");
  });

  it("escapes customer-controlled text so it cannot inject Telegram HTML", () => {
    const message = buildOrderNotificationMessage({
      ...baseOrder,
      orderNumber: "FH-<script>",
      customerName: '<a href="x">مهاجم</a>',
      customerAddress: "بغداد & <b>",
      items: [{ productId: "p1", productName: "<i>Filter</i>", variantLabel: "<u>16/22</u>", quantity: 1, priceAtPurchase: 1 }],
    });
    expect(message).not.toMatch(/<script>|<a href="x">|<i>Filter|<u>16/);
    expect(message).toContain("&lt;a href=&quot;x&quot;&gt;مهاجم&lt;/a&gt;");
    expect(message).toContain("<code>FH-&lt;script&gt;</code>");
    expect(message).toContain("الخيار: &lt;u&gt;16/22&lt;/u&gt;");
  });

  it("renders a JSON shipping address object as readable text", () => {
    const message = buildOrderNotificationMessage({
      ...baseOrder,
      customerAddress: { addressLine1: "الكرادة - شارع 62", city: "Iraq", country: "IQ" } as unknown as string,
    });
    expect(message).toContain("📍 <b>العنوان:</b>\nالكرادة - شارع 62");
  });

  it("prefixes explicit test orders so nobody prepares them", () => {
    const message = buildOrderNotificationMessage({ ...baseOrder, testOrder: true });
    expect(message.startsWith("🧪 <b>طلب اختبار — لا يتم التجهيز</b>")).toBe(true);
  });
});

describe("sendTelegramMessage / sendOrderNotification", () => {
  it("skips safely when Telegram is not configured", async () => {
    for (const key of ENV_KEYS) delete process.env[key];
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await sendTelegramMessage("x")).toBe(false);
    expect(await sendOrderNotification(baseOrder)).toBe("skipped");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts HTML to the Bot API sendMessage endpoint with the configured chat id", async () => {
    configure();
    const fetchMock = vi.fn(async () => telegramResponse(true));
    vi.stubGlobal("fetch", fetchMock);

    expect(await sendOrderNotification(baseOrder)).toBe("sent");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.telegram.org/bot123456:unit-test-token/sendMessage");
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ chat_id: "-1000000000001", parse_mode: "HTML" });
    expect(body.text).toContain("طلب جديد من AQUAVO");
  });

  it("reports an API failure as an error (so the outbox can retry) without leaking the token", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn(async () => telegramResponse(false, 403, "Forbidden: bot was blocked")));

    await expect(sendTelegramMessage("x")).rejects.toMatchObject({ name: "TelegramSendError", status: 403 });
    await expect(sendOrderNotification(baseOrder, { rethrow: true })).rejects.toBeInstanceOf(TelegramSendError);
    const logged = (console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls.flat().join(" ");
    expect(logged).not.toContain("unit-test-token");
  });

  it("swallows Telegram failures by default so an order flow can never fail because of it", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));

    await expect(sendOrderNotification(baseOrder)).resolves.toBe("failed");
  });
});
