from pathlib import Path
root=Path('.')
def modify(path,old,new,count=1):
    p=root/path;s=p.read_text();actual=s.count(old)
    if actual!=count:raise RuntimeError(f'{path}: expected {count}, got {actual}: {old[:90]}')
    p.write_text(s.replace(old,new))
def block(path,start,end,new):
    p=root/path;s=p.read_text();i=s.index(start);j=s.index(end,i);p.write_text(s[:i]+new+s[j:])
p='server/routes/orders.ts'
modify(p,'import { toPublicOrderItem } from "../../shared/public-product.js";', '''import { toPublicOrderItem } from "../../shared/public-product.js";
import { toCustomerOrder } from "../../shared/public-order.js";
import { checkoutRequestBinding, assertCheckoutReplay, type CheckoutRequestBinding } from "../services/checkout-request-binding.js";
import { securityDb } from "../services/security-db.js";''')
modify(p,'router.post("/", orderLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {\n        try {','router.post("/", orderLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {\n        let requestBinding: CheckoutRequestBinding | undefined;\n        try {')
modify(p,'            // A repeated request returns the already committed order', '            requestBinding = await checkoutRequestBinding(req, validationResult.data);\n\n            // A repeated request returns the already committed order')
modify(p,'                if (existingOrder) {\n                    if ((existingOrder as any).whatsappMarketingOptIn)', '                if (existingOrder) {\n                    await assertCheckoutReplay(securityDb(), existingOrder.id, requestBinding);\n                    if ((existingOrder as any).whatsappMarketingOptIn)')
modify(p,'                    res.status(200).json(existingOrder);','                    res.status(200).json(toCustomerOrder(existingOrder));',count=2)
modify(p,'                    whatsappMarketingOptIn,\n                },','                    whatsappMarketingOptIn,\n                    requestBinding,\n                },')
modify(p,'            res.status(201).json(response);','            res.status(201).json(toCustomerOrder(response));')
modify(p,'''            if (parsedIdempotencyKey?.success) {
                const existingOrder = await storage.getOrder(parsedIdempotencyKey.data);
                if (existingOrder) {
                    res.status(200).json(toCustomerOrder(existingOrder));
                    return;
                }
            }''','''            if (parsedIdempotencyKey?.success && requestBinding) {
                try {
                    const existingOrder = await storage.getOrder(parsedIdempotencyKey.data);
                    if (existingOrder) {
                        await assertCheckoutReplay(securityDb(), existingOrder.id, requestBinding);
                        res.status(200).json(toCustomerOrder(existingOrder));
                        return;
                    }
                } catch (replayError) { next(replayError); return; }
            }''')
modify(p,'        return { ...order, items: enrichedItems, loyalty };','        return toCustomerOrder({ ...order, items: enrichedItems, loyalty });')
p='server/storage/order-storage.ts'
modify(p,'import { randomBytes } from "node:crypto";', '''import { randomBytes } from "node:crypto";
import { normalizeCheckoutItems } from "../../shared/checkout-items.js";
import { persistCheckoutBinding, type CheckoutRequestBinding } from "../services/checkout-request-binding.js";
import { lockEligibleCoupon, couponAmounts } from "../services/coupon-policy.js";
import { projectNewOrderCosts } from "../services/order-cost-projection.js";''')
modify(p,'    whatsappMarketingOptIn?: boolean;\n}', '    whatsappMarketingOptIn?: boolean;\n    requestBinding?: CheckoutRequestBinding;\n}')
modify(p,'            for (const item of items) {','            for (const item of normalizeCheckoutItems(items)) {')
modify(p,'                if (!product) throw new Error(`Product ${item.productId} not found`);','''                if (!product) throw new Error(`Product ${item.productId} not found`);
                if (product.isStorefrontVisible === false) throw Object.assign(new Error(CART_ERROR_NOT_PURCHASABLE), { status: 400 });
                if (product.hasVariants && !item.variantId) throw Object.assign(new Error(CART_ERROR_VARIANT_REQUIRED), { status: 400 });''')
modify(p,'buildProductCostSnapshot(product, snapshotAt)','buildProductCostSnapshot(product, snapshotAt, item.variantId)')
block(p,'            if (couponCode) {','            // 4. Calculate Final Total', '''            if (couponCode) {
                const coupon = await lockEligibleCoupon(tx, couponCode, userId, subtotal);
                couponId = coupon.id;
                const amounts = couponAmounts(coupon, subtotal, deliveryFee);
                discount = amounts.discount;
                deliveryFee = amounts.shipping;
                await tx.update(coupons).set({ usedCount: sql`COALESCE(${coupons.usedCount},0)+1` }).where(eq(coupons.id,coupon.id));
            }

''')
modify(p,'            // 6b. Persist normalized line items','            await persistCheckoutBinding(tx, newOrder.id, commerceContext.requestBinding);\n\n            // 6b. Persist normalized line items')
modify(p,'            if (userId) {\n                const loyaltyResult = await loyaltyStorage.processOrderPointsInTransaction','''            // Reflect the authoritative BEFORE INSERT snapshot values for this NEW order only.
            if (commerceContext.requestBinding) await projectNewOrderCosts(tx, newOrder);

            if (userId) {
                const loyaltyResult = await loyaltyStorage.processOrderPointsInTransaction''')
modify(p,'async getCouponsByUserId(_userId: string)','async getCouponsByUserId(userId: string)')
modify(p,'                eq(coupons.isActive, true),\n                or(isNull(coupons.maxUses)', '''                eq(coupons.isActive, true),
                or(isNull(coupons.userId), eq(coupons.userId, userId)),
                or(isNull(coupons.startDate), sql`${coupons.startDate} <= now()`),
                or(isNull(coupons.endDate), sql`${coupons.endDate} > now()`),
                or(isNull(coupons.maxUses)''')
modify('server/storage/index.ts','            whatsappMarketingOptIn?: boolean;\n        },','            whatsappMarketingOptIn?: boolean;\n            requestBinding?: import("../services/checkout-request-binding.js").CheckoutRequestBinding;\n        },')
(root/'server/routes/coupons.ts').write_text('''import type { Router as RouterType, Request, Response } from "express";
import { Router } from "express";
import { lockEligibleCoupon, INVALID_COUPON_MESSAGE } from "../services/coupon-policy.js";
import { securityDb } from "../services/security-db.js";
import { apiLimiter } from "../middleware/rate-limit.js";
export function createCouponRouter(): RouterType {
  const router = Router();
  router.post("/validate", apiLimiter, async (req: Request, res: Response): Promise<void> => {
    const { code, totalAmount } = req.body ?? {};
    if (typeof code !== "string" || !Number.isFinite(Number(totalAmount)) || Number(totalAmount) < 0) {
      res.status(400).json({ message: INVALID_COUPON_MESSAGE }); return;
    }
    try {
      const coupon = await securityDb().transaction((tx) => lockEligibleCoupon(tx, code, req.session?.userId ?? null, Number(totalAmount)));
      res.set("Cache-Control", "no-store");
      res.json(coupon);
    } catch (error) {
      const status = Number((error as { status?: number }).status) === 400 ? 400 : 503;
      res.status(status).json({ message: status === 400 ? INVALID_COUPON_MESSAGE : "تعذر التحقق من الخصم حالياً" });
    }
  });
  return router;
}
''')
p='server/services/product-cost-snapshot.ts'
modify(p,'    hasVariants?: boolean;','    hasVariants?: boolean;\n    isStorefrontVisible?: boolean;')
modify(p,'    now: Date = new Date(),\n): ProductCostSnapshot {','    now: Date = new Date(),\n    variantId?: string,\n): ProductCostSnapshot {')
modify(p,'    const costPrice = resolveSnapshotComponent(rawCostPrice, costRes);','''    const variant = variantId && Array.isArray(p.variants)
        ? (p.variants as Record<string, unknown>[]).find((candidate) => candidate.id === variantId)
        : undefined;
    const variantVerified = Boolean(variant && variant.costStatus === "verified_derived" && parseCostValue(variant.costPrice) !== null);
    const costPrice = variantVerified ? parseCostValue(variant!.costPrice) : resolveSnapshotComponent(rawCostPrice, costRes);''')
modify(p,'    const complete = packagingCost !== null && insertCost !== null;','    const complete = packagingCost !== null && insertCost !== null && (!variantId || variantVerified);')
modify(p,'               p.has_variants AS "hasVariants",','               p.has_variants AS "hasVariants",\n               p.is_storefront_visible AS "isStorefrontVisible",')
p='server/routes/wayl.ts'
modify(p,'import { getSession } from "../middleware/auth.js";', 'import { getSession } from "../middleware/auth.js";\nimport { checkoutRequestBinding } from "../services/checkout-request-binding.js";')
modify(p,'      const prepared = await prepareOnlineOrder({','      const requestBinding = await checkoutRequestBinding(req, parsed.data);\n      const prepared = await prepareOnlineOrder({\n        requestBinding,')
p='server/services/wayl-order-payment.ts'
modify(p,'import { randomBytes, randomUUID } from "node:crypto";', '''import { randomBytes, randomUUID } from "node:crypto";
import { normalizeCheckoutItems } from "../../shared/checkout-items.js";
import { persistCheckoutBinding, assertCheckoutReplay, checkoutConflict, type CheckoutRequestBinding } from "./checkout-request-binding.js";
import { lockEligibleCoupon, couponAmounts } from "./coupon-policy.js";
import { projectNewOrderCosts } from "./order-cost-projection.js";''')
modify(p,'export interface OnlineCheckoutInput {','export interface OnlineCheckoutInput {\n  requestBinding?: CheckoutRequestBinding;')
modify(p,'  if (existing[0]) {\n    const [existingPayment]', '  if (existing[0]) {\n    if (!input.requestBinding) throw checkoutConflict();\n    await assertCheckoutReplay(db, existing[0].id, input.requestBinding);\n    const [existingPayment]')
modify(p,'        if (concurrent[0]) {\n          const [concurrentPayment]', '        if (concurrent[0]) {\n          if (!input.requestBinding) throw checkoutConflict();\n          await assertCheckoutReplay(tx, concurrent[0].id, input.requestBinding);\n          const [concurrentPayment]')
modify(p,'        if (existingAfterRace[0]) {\n          const [existingPayment]', '        if (existingAfterRace[0]) {\n          if (!input.requestBinding) throw checkoutConflict();\n          await assertCheckoutReplay(db, existingAfterRace[0].id, input.requestBinding);\n          const [existingPayment]')
modify(p,'        for (const item of input.items) {','        for (const item of normalizeCheckoutItems(input.items)) {')
modify(p,'          if (!product) throw Object.assign(new Error(`Product ${item.productId} not found`), { status: 400 });','''          if (!product) throw Object.assign(new Error(`Product ${item.productId} not found`), { status: 400 });
          if (product.isStorefrontVisible === false || (product.hasVariants && !item.variantId)) throw Object.assign(new Error("هذا الخيار غير متاح للشراء"), { status: 400 });''')
modify(p,'buildProductCostSnapshot(product, snapshotAt)','buildProductCostSnapshot(product, snapshotAt, item.variantId)')
block(p,'        if (input.couponCode?.trim()) {','        const total = Math.max', '''        if (input.couponCode?.trim()) {
          normalizedCouponCode = input.couponCode.trim().toUpperCase();
          const coupon = await lockEligibleCoupon(tx, normalizedCouponCode, input.userId, subtotal);
          couponId = coupon.id;
          const amounts = couponAmounts(coupon, subtotal, shippingCost);
          discount = amounts.discount;
          shippingCost = amounts.shipping;
        }

''')
modify(p,'        const [payment] = await tx.insert(payments).values({','        await persistCheckoutBinding(tx, order.id, input.requestBinding);\n\n        const [payment] = await tx.insert(payments).values({')
modify(p,'        })) as any);\n      }\n\n      if (order.couponId)', '        })) as any);\n        await projectNewOrderCosts(tx, order);\n      }\n\n      if (order.couponId)')
modify('server/storage/invoice-storage.ts','buildProductCostSnapshot(locked, snapshotAt)','buildProductCostSnapshot(locked, snapshotAt, item.variantId)')
