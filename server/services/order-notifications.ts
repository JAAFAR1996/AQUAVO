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
                    "Content-Length": Buffer.byteLength(body),
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
    items: Array<{
        productId: string;
        productName?: string;
        quantity: number;
        priceAtPurchase?: string | number;
    }>;
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
        const itemLines = data.items
            .map(
                (item, i) =>
                    `  ${i + 1}. ${item.productName || item.productId} × ${item.quantity}${item.priceAtPurchase ? ` — ${item.priceAtPurchase} IQD` : ""}`
            )
            .join("\n");

        const lines = [
            `🛒 <b>طلب جديد!</b>`,
            ``,
            `📋 <b>رقم الطلب:</b> ${data.orderNumber || data.orderId.slice(0, 8)}`,
            `👤 <b>الاسم:</b> ${escapeHtml(data.customerName)}`,
            `📱 <b>الهاتف:</b> ${escapeHtml(data.customerPhone)}`,
            `📍 <b>العنوان:</b> ${escapeHtml(data.customerAddress)}`,
            ``,
            `📦 <b>المنتجات:</b>`,
            itemLines,
            ``,
            `💰 <b>المجموع:</b> ${data.total} IQD`,
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
