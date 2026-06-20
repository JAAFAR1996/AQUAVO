/**
 * Order notification service — sends Telegram alerts for new orders.
 * Also exports a generic `sendTelegramMessage` helper usable elsewhere.
 */
import https from "https";

function isConfigured(): boolean {
    return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

/**
 * Send a raw Telegram message (HTML parse_mode).
 * Silently does nothing when env vars are missing.
 */
export async function sendTelegramMessage(text: string): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;

    const body = JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" });

    await new Promise<void>((resolve, reject) => {
        const req = https.request(
            {
                hostname: "api.telegram.org",
                path: `/bot${token}/sendMessage`,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": String(Buffer.byteLength(body)),
                },
            },
            (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    if (res.statusCode && res.statusCode >= 400) {
                        console.error("[Telegram] API error:", res.statusCode, data);
                    }
                    resolve();
                });
            }
        );
        req.on("error", reject);
        req.write(body);
        req.end();
    });
}

interface OrderNotificationData {
    orderId: string;
    orderNumber?: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    total: string | number;
    subtotal?: string | number;
    shippingCost?: string | number;
    discountTotal?: string | number;
    paymentMethod?: string;
    items: Array<{
        productId: string;
        productName?: string;
        variantLabel?: string;
        quantity: number;
        priceAtPurchase?: string | number;
        lineTotal?: string | number;
    }>;
}

function formatIQD(value: string | number | undefined): string {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n)) return "0 د.ع";
    return `${n.toLocaleString("en-US")} د.ع`;
}

/**
 * Send a Telegram alert for a new order.
 * Fire-and-forget — never throws.
 */
export async function sendOrderNotification(data: OrderNotificationData): Promise<void> {
    if (!isConfigured()) {
        console.log("[OrderNotify] Telegram not configured, skipping notification");
        return;
    }

    try {
        const totalQty = data.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

        const itemLines = data.items
            .map((item, i) => {
                const name = escapeHtml(item.productName || item.productId);
                // The chosen variant/option — the whole point of "I want to know
                // exactly what they picked, not just the product name".
                const variant = item.variantLabel
                    ? `\n      ▸ <b>الخيار:</b> ${escapeHtml(item.variantLabel)}`
                    : "";
                const unit = formatIQD(item.priceAtPurchase);
                const line = formatIQD(
                    item.lineTotal ?? Number(item.priceAtPurchase ?? 0) * (Number(item.quantity) || 1)
                );
                return `  ${i + 1}. <b>${name}</b>${variant}\n      ▸ الكمية: ${item.quantity} × ${unit} = <b>${line}</b>`;
            })
            .join("\n");

        const lines = [
            `🛒 <b>طلب جديد على الموقع!</b>`,
            ``,
            `📋 <b>رقم الطلب:</b> <code>${escapeHtml(data.orderNumber || data.orderId.slice(0, 8))}</code>`,
            `👤 <b>الاسم:</b> ${escapeHtml(data.customerName)}`,
            `📱 <b>الهاتف:</b> ${escapeHtml(data.customerPhone)}`,
            `📍 <b>العنوان:</b> ${escapeHtml(data.customerAddress)}`,
            ``,
            `📦 <b>المنتجات (${data.items.length} نوع / ${totalQty} قطعة):</b>`,
            itemLines,
            ``,
            `━━━━━━━━━━━━━━━`,
            ...(data.subtotal != null ? [`🧾 <b>المجموع الفرعي:</b> ${formatIQD(data.subtotal)}`] : []),
            ...(data.shippingCost != null ? [`🚚 <b>التوصيل:</b> ${formatIQD(data.shippingCost)}`] : []),
            ...(data.discountTotal != null && Number(data.discountTotal) > 0
                ? [`🎁 <b>الخصم:</b> -${formatIQD(data.discountTotal)}`]
                : []),
            `💰 <b>المبلغ الكلي:</b> ${formatIQD(data.total)}`,
            `💵 <b>طريقة الدفع:</b> ${escapeHtml(data.paymentMethod || "الدفع عند الاستلام")}`,
            ``,
            `🔗 <a href="https://www.aquavoiq.com/ADMIN">فتح لوحة التحكم</a>`,
        ];

        await sendTelegramMessage(lines.join("\n"));
        console.log(`[OrderNotify] ✅ Telegram notification sent for order ${data.orderId}`);
    } catch (err) {
        // Never crash the order flow
        console.error("[OrderNotify] ❌ Failed to send Telegram notification:", err instanceof Error ? err.message : err);
    }
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
