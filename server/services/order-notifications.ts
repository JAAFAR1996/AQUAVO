/**
 * Order notification service — Telegram alerts for confirmed AQUAVO orders.
 *
 * Trigger points (do not add others):
 *  - Cash on delivery: server/routes/orders.ts, after createOrderSecure committed,
 *    via the durable `payment_outbox` merchant_notification event.
 *  - Wayl: server/services/wayl-order-payment.ts finalizePaidOrder enqueues the same
 *    event inside the paid transaction; nothing fires for an unpaid link.
 *  Both are delivered by payment-maintenance.ts, keyed `<orderId>:merchant_notification`,
 *  so one confirmed order produces exactly one merchant message.
 *
 * Also exports a generic `sendTelegramMessage` helper used for operational alerts.
 */

const TELEGRAM_API_HOST = "https://api.telegram.org";
const ADMIN_URL = "https://www.aquavoiq.com/admin";
const BAGHDAD_TZ = "Asia/Baghdad";

export function isTelegramConfigured(): boolean {
    return !!(process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.TELEGRAM_CHAT_ID?.trim());
}

export class TelegramSendError extends Error {
    readonly status: number | null;
    constructor(message: string, status: number | null) {
        super(message);
        this.name = "TelegramSendError";
        this.status = status;
    }
}

/**
 * Send a raw Telegram message (HTML parse_mode) to the merchant chat.
 * Resolves `false` when Telegram is not configured (nothing sent).
 * Throws TelegramSendError on a non-2xx API answer or a network failure so the
 * durable outbox can retry; fire-and-forget callers must `.catch()`.
 * The bot token is never logged.
 */
export async function sendTelegramMessage(text: string): Promise<boolean> {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
    if (!token || !chatId) return false;

    let response: Response;
    try {
        response = await fetch(`${TELEGRAM_API_HOST}/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
            signal: AbortSignal.timeout(10_000),
        });
    } catch (error) {
        throw new TelegramSendError(`Telegram unreachable: ${error instanceof Error ? error.message : String(error)}`, null);
    }
    if (!response.ok) {
        let description = "";
        try {
            const body = (await response.json()) as { description?: unknown };
            if (typeof body?.description === "string") description = body.description;
        } catch {
            // ignore unparsable error body
        }
        throw new TelegramSendError(`Telegram API HTTP ${response.status}${description ? `: ${description}` : ""}`, response.status);
    }
    return true;
}

export interface OrderNotificationLine {
    productId: string;
    productName?: string | null;
    variantLabel?: string | null;
    quantity: number;
    priceAtPurchase?: string | number | null;
    lineTotal?: string | number | null;
}

export interface OrderNotificationData {
    orderId: string;
    orderNumber?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
    customerAddress?: string | null;
    customerNotes?: string | null;
    /** Authoritative stored totals. Subtotal is derived when omitted. */
    total: string | number;
    subtotal?: string | number | null;
    shippingCost?: string | number | null;
    discountTotal?: string | number | null;
    paymentMethod: "cod" | "wayl_paid";
    items: OrderNotificationLine[];
    /** Committed order timestamp; rendered in Asia/Baghdad. */
    createdAt?: Date | string | null;
    /** When set, the message is prefixed as a technical test, never a customer order. */
    testOrder?: boolean;
}

export function escapeHtml(text: unknown): string {
    return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

export function formatIQD(value: string | number | null | undefined): string {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n)) return "0 د.ع";
    return `${Math.round(n).toLocaleString("en-US")} د.ع`;
}

/** e.g. "18/09/2026 - 3:45 م" in Asia/Baghdad, or null when the date is unusable. */
export function formatBaghdadTime(value: Date | string | null | undefined): string | null {
    if (value == null) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: BAGHDAD_TZ,
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "numeric", minute: "2-digit", hour12: true,
    }).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const period = get("dayPeriod").toLowerCase().startsWith("p") ? "م" : "ص";
    return `${get("day")}/${get("month")}/${get("year")} - ${get("hour")}:${get("minute")} ${period}`;
}

function shippingAddressText(value: unknown): string {
    if (value == null) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object") {
        const obj = value as Record<string, unknown>;
        const parts = [obj.addressLine1, obj.city, obj.country]
            .filter((part) => typeof part === "string" && part.trim() && part !== "Iraq" && part !== "IQ");
        if (parts.length) return parts.join(" - ");
        return JSON.stringify(value);
    }
    return String(value);
}

export function paymentMethodLabel(method: OrderNotificationData["paymentMethod"]): string {
    return method === "wayl_paid" ? "✅ مدفوع إلكترونياً — Wayl" : "💵 الدفع عند الاستلام";
}

/**
 * Pure: builds the merchant message (Telegram HTML). Every customer-supplied
 * string is escaped; only fields that exist are rendered.
 */
export function buildOrderNotificationMessage(data: OrderNotificationData): string {
    const items = Array.isArray(data.items) ? data.items : [];
    const itemBlocks = items.map((item, i) => {
        const qty = Number(item.quantity) || 1;
        const unit = Number(item.priceAtPurchase ?? 0);
        const line = item.lineTotal != null && Number.isFinite(Number(item.lineTotal))
            ? Number(item.lineTotal)
            : unit * qty;
        const rows = [`${i + 1}. <b>${escapeHtml(item.productName || item.productId)}</b>`];
        if (item.variantLabel && String(item.variantLabel).trim()) {
            rows.push(`   الخيار: ${escapeHtml(String(item.variantLabel).trim())}`);
        }
        rows.push(`   الكمية: ${qty}`);
        rows.push(`   سعر القطعة: ${formatIQD(unit)}`);
        rows.push(`   المجموع: ${formatIQD(line)}`);
        return rows.join("\n");
    });

    const shipping = data.shippingCost == null ? null : Number(data.shippingCost);
    const discount = data.discountTotal == null ? 0 : Number(data.discountTotal);
    const total = Number(data.total);
    const subtotal = data.subtotal != null && Number.isFinite(Number(data.subtotal))
        ? Number(data.subtotal)
        : total - (shipping ?? 0) + (Number.isFinite(discount) ? discount : 0);

    const address = shippingAddressText(data.customerAddress);
    const notes = typeof data.customerNotes === "string" ? data.customerNotes.trim() : "";
    const when = formatBaghdadTime(data.createdAt);

    const lines: string[] = [];
    if (data.testOrder) {
        lines.push(`🧪 <b>طلب اختبار — لا يتم التجهيز</b>`, ``);
    }
    lines.push(`🛒 <b>طلب جديد من AQUAVO</b>`, ``);
    lines.push(`📋 <b>رقم الطلب:</b>`, `<code>${escapeHtml(data.orderNumber || data.orderId)}</code>`, ``);
    if (data.customerName?.trim()) lines.push(`👤 <b>الزبون:</b>`, escapeHtml(data.customerName.trim()), ``);
    if (data.customerPhone?.trim()) lines.push(`📱 <b>الهاتف:</b>`, escapeHtml(data.customerPhone.trim()), ``);
    if (address.trim()) lines.push(`📍 <b>العنوان:</b>`, escapeHtml(address.trim()), ``);
    lines.push(`💳 <b>طريقة الدفع:</b>`, paymentMethodLabel(data.paymentMethod), ``);
    lines.push(`📦 <b>المنتجات:</b>`, ``);
    lines.push(itemBlocks.length ? itemBlocks.join("\n\n") : "—");
    lines.push(``, `━━━━━━━━━━━━━━`);
    lines.push(`🧾 المنتجات: ${formatIQD(subtotal)}`);
    if (shipping != null && Number.isFinite(shipping)) {
        lines.push(shipping > 0 ? `🚚 التوصيل: ${formatIQD(shipping)}` : `🚚 التوصيل: مجاني`);
    }
    if (Number.isFinite(discount) && discount > 0) lines.push(`🎁 الخصم: -${formatIQD(discount)}`);
    lines.push(`💰 <b>المطلوب: ${formatIQD(total)}</b>`);
    if (notes) lines.push(``, `📝 <b>ملاحظات الزبون:</b>`, escapeHtml(notes));
    if (when) lines.push(``, `🕐 <b>وقت الطلب:</b>`, `${when} بغداد`);
    lines.push(``, `🔗 <a href="${ADMIN_URL}">فتح الطلب في لوحة AQUAVO</a>`);
    return lines.join("\n");
}

export interface SendOrderNotificationOptions {
    /** Rethrow delivery failures (durable outbox path). Default: swallow and log. */
    rethrow?: boolean;
}

/**
 * Send the merchant "new order" alert.
 * Returns "sent" | "skipped" (not configured) | "failed" (only when not rethrowing).
 */
export async function sendOrderNotification(
    data: OrderNotificationData,
    options: SendOrderNotificationOptions = {},
): Promise<"sent" | "skipped" | "failed"> {
    if (!isTelegramConfigured()) {
        console.warn(`[OrderNotify] Telegram not configured (TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID); skipping order ${data.orderId}`);
        return "skipped";
    }
    try {
        await sendTelegramMessage(buildOrderNotificationMessage(data));
        console.log(`[OrderNotify] Telegram notification sent for order ${data.orderId} (${data.paymentMethod}${data.testOrder ? ", test" : ""})`);
        return "sent";
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[OrderNotify] Telegram notification FAILED for order ${data.orderId}: ${message}`);
        if (options.rethrow) throw error;
        return "failed";
    }
}
