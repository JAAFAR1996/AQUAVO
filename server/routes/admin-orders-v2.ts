import { Router, type NextFunction, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { orders } from "../../shared/schema.js";
import { orderCollectedAmount } from "../../shared/order-financials.js";
import { getDb } from "../db.js";
import { storage } from "../storage/index.js";
import { requireAccountingAdmin } from "../middleware/accounting-auth-v2.js";
import { actorFromRequest, recordFinancialChange } from "../services/accountingAuditTrail.js";
import { buildCostResolver, buildFulfillmentResolver, calcOrderProfit, collectProductIds } from "../services/accounting-engine.js";
import { applyPackagingLifecycle, type LifecycleOutcome } from "../services/packaging-lifecycle-runner.js";
import { syncAutomaticReturnLifecycle } from "../services/order-return-automation-v2.js";

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
type ActiveDeliveryCompany = DeliveryCompany & { active: boolean };
type ReturnOrderLineRow = {
  order_item_id: string;
  product_id: string;
  product_name: string | null;
  quantity: number | string;
  price: number | string;
  variant_id: string | null;
  variant_label: string | null;
};
type ArchiveRow = {
  id: string;
  order_number: string | null;
  status: string;
  archived_at: Date | string | null;
};

type LoyaltyStorageRuntime = {
  approveOrderPoints(userId: string, orderId: string, amount: number): Promise<unknown>;
  generateOrderBonus(userId: string, orderId: string): Promise<unknown>;
  checkMilestones(userId: string): Promise<unknown>;
  cancelOrderPoints(userId: string, orderId: string): Promise<unknown>;
};
type BadgeEngineRuntime = { checkAndAwardBadges(userId: string): Promise<unknown> };
type ChallengeStorageRuntime = { updateProgress(userId: string, challenge: string, amount: number): Promise<unknown> };

const ARCHIVABLE_ORDER_STATUSES = new Set([
  "delivered",
  "returned",
  "cancelled",
  "rejected_returned",
]);

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

  // Canonical admin order list. Archived orders are hidden by default so they
  // leave the operational queue without being deleted from accounting/history.
  router.get("/orders", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const db = getDb();
    if (!db) { res.status(503).json({ message: "قاعدة البيانات غير مهيأة" }); return; }

    try {
      const includeArchivedRaw = String(req.query.includeArchived ?? "").toLowerCase();
      const includeArchived = includeArchivedRaw === "1" || includeArchivedRaw === "true";

      const archiveResult = await db.execute(sql`
        SELECT id, order_number, status, archived_at
        FROM public.orders
      `);
      const archiveRows = rowsOf<ArchiveRow>(archiveResult);
      const archivedAtById = new Map(
        archiveRows.map((row) => [row.id, row.archived_at] as const),
      );

      const allOrders = await storage.getOrders();
      const visibleOrders = allOrders.filter((order) =>
        includeArchived || !archivedAtById.get(order.id),
      );

      const costs = await buildCostResolver(db, collectProductIds(visibleOrders as any));
      const fulfil = await buildFulfillmentResolver(
        db,
        new Set(visibleOrders.map((order: any) => order.id)),
      );

      const enrichedOrders = visibleOrders.map((order: any) => {
        const archivedAt = archivedAtById.get(order.id) ?? null;
        if (order.items && Array.isArray(order.items)) {
          const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();
          const enrichedItems = order.items.map((item: any) => {
            const cost = item.productId ? costs.getEffective(item.productId, createdAt) : undefined;
            const price = Number(item.priceAtPurchase ?? item.price ?? cost?.price ?? 0) || 0;
            const costPrice = item.costPrice != null
              ? Number(item.costPrice)
              : (cost?.costKnown ? cost.costPrice : null);
            return {
              ...item,
              productName: item.productName || cost?.name || `منتج #${String(item.productId ?? "").slice(0, 8)}`,
              price,
              costPrice,
            };
          });
          const p = calcOrderProfit(order, costs, fulfil.get(order.id));
          return {
            ...order,
            items: enrichedItems,
            archivedAt,
            profit: p.netProfit,
            revenue: p.revenue,
            cogs: p.cogs,
            fulfillmentCost: p.fulfillmentCost,
            fulfillmentStatus: p.fulfillmentStatus,
            contributionProfit: p.contributionProfit,
            contributionMargin: p.contributionMargin,
            costStatus: p.costStatus,
            costsComplete: p.costsComplete,
            estimatedCostLines: p.estimatedCostLines,
            missingCostLines: p.missingCostLines,
          };
        }
        return { ...order, archivedAt };
      });

      res.set("Cache-Control", "no-store, private");
      res.json(enrichedOrders);
    } catch (error) {
      next(error);
    }
  });

  // DELETE is intentionally implemented as an operational archive, not a hard
  // database delete. Orders are accounting/audit records and have many dependent
  // fulfillment, inventory and payment facts that must remain intact.
  router.delete("/orders/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const db = getDb();
    if (!db) { res.status(503).json({ message: "قاعدة البيانات غير مهيأة" }); return; }

    try {
      const result = await db.transaction(async (tx) => {
        const lockedResult = await tx.execute(sql`
          SELECT id, order_number, status, archived_at
          FROM public.orders
          WHERE id=${req.params.id}
          FOR UPDATE
        `);
        const locked = rowsOf<ArchiveRow>(lockedResult)[0];
        if (!locked) {
          throw Object.assign(new Error("الطلب غير موجود"), { statusCode: 404 });
        }
        if (locked.archived_at) return locked;
        if (!ARCHIVABLE_ORDER_STATUSES.has(locked.status)) {
          throw Object.assign(
            new Error("لا يمكن أرشفة طلب ما زال ضمن دورة التنفيذ. أكمل معالجة الطلب أو غيّر حالته إلى حالة نهائية أولاً."),
            { statusCode: 409 },
          );
        }

        const updatedResult = await tx.execute(sql`
          UPDATE public.orders
          SET archived_at=clock_timestamp(), updated_at=clock_timestamp()
          WHERE id=${locked.id}
          RETURNING id, order_number, status, archived_at
        `);
        const updated = rowsOf<ArchiveRow>(updatedResult)[0];
        if (!updated) throw new Error("فشل أرشفة الطلب");
        return updated;
      });

      try {
        await storage.createAuditLog({
          userId: (req as any).session?.userId || "admin",
          action: "archive",
          entityType: "order",
          entityId: result.id,
          changes: { archivedAt: result.archived_at },
        });
      } catch (auditError) {
        console.error("[AdminOrdersV2] archive audit log failed", auditError);
      }

      res.set("Cache-Control", "no-store, private");
      res.json({
        success: true,
        orderNumber: result.order_number,
        archivedAt: result.archived_at,
      });
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 409) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      next(error);
    }
  });

  router.post("/orders/:id/restore", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const db = getDb();
    if (!db) { res.status(503).json({ message: "قاعدة البيانات غير مهيأة" }); return; }

    try {
      const result = await db.execute(sql`
        UPDATE public.orders
        SET archived_at=NULL, updated_at=clock_timestamp()
        WHERE id=${req.params.id}
        RETURNING id, order_number, status, archived_at
      `);
      const restored = rowsOf<ArchiveRow>(result)[0];
      if (!restored) {
        res.status(404).json({ message: "الطلب غير موجود" });
        return;
      }

      try {
        await storage.createAuditLog({
          userId: (req as any).session?.userId || "admin",
          action: "restore",
          entityType: "order",
          entityId: restored.id,
          changes: { archivedAt: null },
        });
      } catch (auditError) {
        console.error("[AdminOrdersV2] restore audit log failed", auditError);
      }

      res.set("Cache-Control", "no-store, private");
      res.json({ success: true, orderNumber: restored.order_number });
    } catch (error) {
      next(error);
    }
  });

  router.get("/orders/delivery-companies", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    const db = getDb();
    if (!db) { res.status(503).json({ message: "قاعدة البيانات غير مهيأة" }); return; }

    try {
      const result = await db.execute(sql`
        SELECT id,name,default_fee,active
        FROM public.delivery_companies
        WHERE active=true
        ORDER BY name
      `);
      res.json({
        items: rowsOf<ActiveDeliveryCompany>(result).map((company) => ({
          ...company,
          default_fee: Number(company.default_fee),
        })),
      });
    } catch (error) {
      next(error);
    }
  });

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
        const enteringShipped = input.status === "shipped" && oldStatus !== "shipped";
        if (enteringShipped && !input.deliveryCompanyId) {
          throw Object.assign(new Error("اختر شركة التوصيل قبل تسليم الطلب للنقل"), { statusCode: 400 });
        }

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
        } else if (!enteringShipped && needsCarrier && !carrierName) {
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
