import { Router, type NextFunction, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { orders } from "../../shared/schema.js";
import { getDb } from "../db.js";
import { requireAccountingAdmin } from "../middleware/accounting-auth-v2.js";
import { actorFromRequest, recordFinancialChange } from "../services/accountingAuditTrail.js";
import { applyPackagingLifecycle, type LifecycleOutcome } from "../services/packaging-lifecycle-runner.js";
import { syncAutomaticReturnLifecycle } from "../services/order-return-automation-v2.js";
import { orderCollectedAmount } from "../../shared/order-financials.js";

const numericInput = z.union([z.string(), z.number()])
  .transform((value) => Number(value))
  .refine((amount) => Number.isFinite(amount) && amount >= 0, {
    message: "قيمة مالية غير صالحة",
  });

const statusTransitionSchema = z.object({
  status: z.string().trim().min(1).max(64),
  shippingCost: numericInput.optional(),
  carrierFee: numericInput.optional(),
  roundedTotal: numericInput.optional(),
  deliveryCompanyId: z.string().trim().min(1).max(128).optional(),
  carrier: z.string().trim().max(100).nullable().optional(),
  boxCost: numericInput.optional(),
  source: z.string().trim().min(1).max(64).optional(),
  financiallyCounted: z.boolean().nullable().optional(),
  financialReason: z.string().trim().min(3).max(500).optional(),
}).strict();

type LockedOrder = {
  id: string;
  order_number: string | null;
  status: string;
  user_id: string | null;
  client_ip: string | null;
  carrier: string | null;
  carrier_fee: string | null;
};
type DeliveryCompany = { id: string; name: string; default_fee: string };
type ReturnOrderLineRow = {
  order_item_id: string;
  product_id: string;
  product_name: string | null;
  quantity: number | string;
  price: number | string;
  variant_id: string | null;
  variant_label: string | null;
};

type LoyaltyStorageRuntime = {
  approveOrderPoints(userId: string, orderId: string, amount: number): Promise<unknown>;
  generateOrderBonus(userId: string, orderId: string): Promise<unknown>;
  checkMilestones(userId: string): Promise<unknown>;
  cancelOrderPoints(userId: string, orderId: string): Promise<unknown>;
};
type BadgeEngineRuntime = { checkAndAwardBadges(userId: string): Promise<unknown> };
type ChallengeStorageRuntime = { updateProgress(userId: string, challenge: string, amount: number): Promise<unknown> };

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: T[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

async function importLegacyModule<T>(segments: string[]): Promise<T> {
  const modulePath = segments.join("/");
  return await import(modulePath) as T;
}

async function runPostCommitCustomerEffects(order: any, oldStatus: string, newStatus: string): Promise<void> {
  if (!order?.userId) return;
  try {
    const loyaltyModule = await importLegacyModule<{ loyaltyStorage: LoyaltyStorageRuntime }>(["..", "storage", "loyalty-storage.js"]);
    const loyaltyStorage = loyaltyModule.loyaltyStorage;
    if (newStatus === "delivered" && oldStatus !== "delivered") {
      await loyaltyStorage.approveOrderPoints(order.userId, order.id, orderCollectedAmount(order));
      await loyaltyStorage.generateOrderBonus(order.userId, order.id).catch(() => null);
      await loyaltyStorage.checkMilestones(order.userId).catch(() => null);
      const badgeModule = await importLegacyModule<{ badgeEngine: BadgeEngineRuntime }>(["..", "storage", "badge-engine.js"]);
      await badgeModule.badgeEngine.checkAndAwardBadges(order.userId).catch(() => []);
      const challengeModule = await importLegacyModule<{ challengeStorage: ChallengeStorageRuntime }>(["..", "storage", "challenge-storage.js"]);
      await challengeModule.challengeStorage.updateProgress(order.userId, "cross_category", 1).catch(() => undefined);
      return;
    }
    if (["cancelled", "rejected", "rejected_returned", "rejected_carrier", "returned"].includes(newStatus)) {
      await loyaltyStorage.cancelOrderPoints(order.userId, order.id);
    }
  } catch (error) {
    console.error("[AdminOrdersV2] post-commit loyalty effect failed", error);
  }
}

async function recordRejectedIp(clientIp: string | null): Promise<void> {
  if (!clientIp) return;
  const db = getDb();
  if (!db) return;
  try {
    await db.execute(sql`
      INSERT INTO banned_ips(ip_address,rejection_count,is_active,last_rejection_at,created_at)
      VALUES(${clientIp},1,false,NOW(),NOW())
      ON CONFLICT(ip_address) DO UPDATE SET
        rejection_count=banned_ips.rejection_count+1,last_rejection_at=NOW(),
        is_active=(banned_ips.rejection_count+1)>=3,
        ban_reason=CASE WHEN (banned_ips.rejection_count+1)>=3 THEN 'حظر تلقائي: رفض استلام 3 طلبات' ELSE banned_ips.ban_reason END
    `);
  } catch (error) {
    console.error("[AdminOrdersV2] rejection IP update failed", error);
  }
}

export function createAdminOrdersV2Router() {
  const router = Router();
  router.use(requireAccountingAdmin);

  router.get("/orders/:id/return-lines", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const db = getDb();
    if (!db) { res.status(503).json({ message: "قاعدة البيانات غير مهيأة" }); return; }

    try {
      const result = await db.execute(sql`
        SELECT
          oi.id AS order_item_id,
          oi.product_id,
          COALESCE(p.name,oi.product_id) AS product_name,
          oi.quantity,
          COALESCE(oi.final_unit_sale_price_snapshot,oi.price_at_purchase) AS price,
          NULLIF(COALESCE(oi.metadata->>'variantId',oi.metadata->>'variant_id'),'') AS variant_id,
          NULLIF(COALESCE(oi.metadata->>'variantLabel',oi.metadata->>'variant_label'),'') AS variant_label
        FROM public.order_items_relational oi
        LEFT JOIN public.products p ON p.id=oi.product_id
        WHERE oi.order_id=${req.params.id}
        ORDER BY oi.id
      `);

      const lines = rowsOf<ReturnOrderLineRow>(result).map((row) => ({
        id: row.order_item_id,
        orderItemId: row.order_item_id,
        productId: row.product_id,
        productName: row.product_name ?? row.product_id,
        quantity: Number(row.quantity),
        price: Number(row.price),
        variantId: row.variant_id ?? undefined,
        variantLabel: row.variant_label ?? undefined,
      }));

      if (lines.length === 0) {
        res.status(409).json({
          message: "لا توجد سطور بيع مالية مرتبطة بهذا الطلب؛ لا يمكن إنشاء راجع محاسبي آمن",
        });
        return;
      }

      if (lines.some((line) => !Number.isInteger(line.quantity) || line.quantity <= 0 || !Number.isFinite(line.price) || line.price < 0)) {
        throw new Error("RETURN_ORDER_LINES_INVALID: بيانات سطور البيع غير صالحة");
      }

      res.json({ data: lines });
    } catch (error) {
      next(error);
    }
  });

  router.put("/orders/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.body?.status == null) { next(); return; }
    const parsed = statusTransitionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "بيانات تغيير حالة الطلب غير صالحة", errors: parsed.error.flatten() });
      return;
    }
    const db = getDb();
    if (!db) { res.status(503).json({ message: "قاعدة البيانات غير مهيأة" }); return; }

    const actor = actorFromRequest(req);
    try {
      const result = await db.transaction(async (tx) => {
        const lockedResult = await tx.execute(sql`
          SELECT id,order_number,status,user_id,client_ip,carrier,carrier_fee
          FROM orders WHERE id=${req.params.id} FOR UPDATE
        `);
        const locked = rowsOf<LockedOrder>(lockedResult)[0];
        if (!locked) throw Object.assign(new Error("الطلب غير موجود"), { statusCode: 404 });

        const oldStatus = locked.status;
        const input = parsed.data;
        let carrierName = input.carrier === undefined ? locked.carrier : input.carrier;
        let carrierFee = input.carrierFee ?? (locked.carrier_fee == null ? undefined : Number(locked.carrier_fee));
        const needsCarrier = ["shipped", "delivered", "rejected", "rejected_carrier"].includes(input.status);

        let company: DeliveryCompany | undefined;
        if (input.deliveryCompanyId) {
          const companyResult = await tx.execute(sql`
            SELECT id,name,default_fee FROM public.delivery_companies
            WHERE id=${input.deliveryCompanyId} AND active=true FOR SHARE
          `);
          company = rowsOf<DeliveryCompany>(companyResult)[0];
          if (!company) throw Object.assign(new Error("شركة التوصيل غير موجودة أو غير فعالة"), { statusCode: 409 });
        } else if (needsCarrier && !carrierName) {
          const companyResult = await tx.execute(sql`
            SELECT id,name,default_fee FROM public.delivery_companies
            WHERE active=true AND is_default=true LIMIT 1 FOR SHARE
          `);
          company = rowsOf<DeliveryCompany>(companyResult)[0];
          if (!company) throw Object.assign(new Error("عيّن شركة توصيل افتراضية قبل تسليم الطلب للنقل"), { statusCode: 409 });
        }
        if (company) {
          carrierName = company.name;
          carrierFee = Number(company.default_fee);
        }

        let lifecycle: LifecycleOutcome = { action: "none", reasonAr: "لا تغيير بحالة الطلب", detail: "noop" };
        if (input.status !== oldStatus) {
          lifecycle = await applyPackagingLifecycle(tx as never, {
            orderId: locked.id,newStatus: input.status,previousStatus: oldStatus,actor: actor.id,
          });
        }

        if (carrierFee !== undefined) {
          await tx.execute(sql`UPDATE orders SET carrier_fee=${String(carrierFee)}::numeric WHERE id=${locked.id}`);
        }

        const [updated] = await tx.update(orders).set({
          status: input.status,
          ...(input.shippingCost !== undefined ? { shippingCost: String(input.shippingCost) } : {}),
          ...(input.roundedTotal !== undefined ? { roundedTotal: String(input.roundedTotal) } : {}),
          ...(carrierName !== undefined ? { carrier: carrierName } : {}),
          ...(input.boxCost !== undefined ? { boxCost: String(input.boxCost) } : {}),
          ...(input.source !== undefined ? { source: input.source } : {}),
          ...(input.financiallyCounted !== undefined ? { financiallyCounted: input.financiallyCounted } : {}),
          updatedAt: new Date(),
        } as any).where(sql`${orders.id}=${locked.id}`).returning();
        if (!updated) throw new Error("فشل تحديث الطلب بعد قفله");

        const automaticReturn = input.status !== oldStatus
          ? await syncAutomaticReturnLifecycle(tx, {
              orderId: locked.id,
              orderNumber: locked.order_number,
              oldStatus,
              newStatus: input.status,
              actorId: actor.id,
              actorName: actor.name,
            })
          : { eventId: null, action: "none" as const };

        await recordFinancialChange(tx as never, {
          entityType: "order",entityId: locked.id,action: "status_change",fieldName: "status",
          oldValue: oldStatus,newValue: input.status,
          reason: input.financialReason ?? `انتقال حالة الطلب: ${oldStatus} → ${input.status}`,
          performedBy: actor.id,performedByName: actor.name ?? undefined,
        });
        if (carrierName !== locked.carrier) {
          await recordFinancialChange(tx as never, {
            entityType: "order",entityId: locked.id,action: "update",fieldName: "carrier",
            oldValue: locked.carrier,newValue: carrierName,
            reason: `اختيار شركة التوصيل للطلب — الأجرة ${carrierFee ?? 5000} د.ع`,
            performedBy: actor.id,performedByName: actor.name ?? undefined,
          });
        }
        return { order: updated, oldStatus, lifecycle, automaticReturn, clientIp: locked.client_ip };
      });

      await runPostCommitCustomerEffects(result.order, result.oldStatus, parsed.data.status);
      if (parsed.data.status === "rejected" && result.oldStatus !== "rejected") await recordRejectedIp(result.clientIp);
      res.json({ ...result.order, packagingLifecycle: result.lifecycle, automaticReturn: result.automaticReturn });
    } catch (error: any) {
      if (error?.statusCode === 404) { res.status(404).json({ message: error.message }); return; }
      next(error);
    }
  });

  return router;
}
