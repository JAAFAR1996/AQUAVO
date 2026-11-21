import { timingSafeEqual } from "node:crypto";
import { getSession } from "../middleware/auth.js";
import { sessionHash } from "./checkout-security.js";
import { iqdToAdValueAtRate, META_AD_CURRENCY, metaPurchaseEventId, resolveAdCurrencyRate } from "../../shared/ad-currency.js";
import { isPurchaseLifecycleEligible, type PurchaseLifecycle } from "../../shared/purchase-event-policy.js";
import type { Request } from "express";

export interface CanonicalPurchase extends PurchaseLifecycle {
  id: string;
  orderNumber: string | null;
  userId: string | null;
  checkoutSessionHash: string | null;
  total: string;
  roundedTotal: string | null;
  customerPhone: string | null;
  items: { productId: string; quantity: number }[];
}

export function canReportPurchase(req: Request, order: CanonicalPurchase): boolean {
  if (order.userId) return getSession(req)?.userId === order.userId;
  if (!req.sessionID || !order.checkoutSessionHash || !/^[0-9a-f]{64}$/.test(order.checkoutSessionHash)) return false;
  return timingSafeEqual(Buffer.from(order.checkoutSessionHash, "hex"), Buffer.from(sessionHash(req.sessionID), "hex"));
}

export function canonicalPurchaseData(order: CanonicalPurchase) {
  if (!isPurchaseLifecycleEligible(order)) return undefined;
  const total = Number(order.roundedTotal ?? order.total);
  if (!Number.isFinite(total) || total <= 0 || !Array.isArray(order.items) || order.items.length === 0) return undefined;
  if (order.items.some(item => !item.productId || !Number.isSafeInteger(item.quantity) || item.quantity <= 0)) return undefined;
  const publicId = order.orderNumber || order.id;
  return {
    event_id: metaPurchaseEventId(publicId),
    event_time: Math.floor(new Date(order.createdAt!).getTime() / 1000),
    custom_data: {
      order_id: publicId,
      content_ids: order.items.map(item => item.productId),
      content_type: "product",
      num_items: order.items.reduce((sum, item) => sum + item.quantity, 0),
      value: iqdToAdValueAtRate(total, resolveAdCurrencyRate(process.env.VITE_META_IQD_PER_USD)),
      currency: META_AD_CURRENCY,
    },
  };
}
