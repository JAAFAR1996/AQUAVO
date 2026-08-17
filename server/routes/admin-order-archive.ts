import { Router, type NextFunction, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth.js";
import { getDb } from "../db.js";
import { storage } from "../storage/index.js";
import {
  buildCostResolver,
  buildFulfillmentResolver,
  calcOrderProfit,
  collectProductIds,
} from "../services/accounting-engine.js";

/**
 * Operational order archiving.
 *
 * This router intentionally lives OUTSIDE Accounting V2. Archiving is an admin
 * presentation/lifecycle concern: it must never delete or rewrite financial,
 * inventory, fulfillment, payment or return history.
 *
 * It is mounted before both admin-orders-v2 and the legacy admin router so the
 * unsafe legacy DELETE /orders/:id handler can no longer be reached.
 *
 * Auth is attached per route, rather than router-wide, so unrelated /api/admin
 * routes retain their existing authorization semantics without an extra gate.
 */

const ARCHIVABLE_ORDER_STATUSES = new Set([
  "delivered",
  "returned",
  "cancelled",
  "rejected_returned",
]);

type ArchiveRow = {
  id: string;
  order_number: string | null;
  status: string;
  archived_at: Date | string | null;
};

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: T[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

function wantsArchivedOrders(req: Request): boolean {
  const value = String(req.query.includeArchived ?? "").trim().toLowerCase();
  return value === "1" || value === "true";
}

async function writeArchiveAudit(
  req: Request,
  action: "archive" | "restore",
  orderId: string,
  archivedAt: Date | string | null,
): Promise<void> {
  try {
    await storage.createAuditLog({
      userId: (req as any).session?.userId || "admin",
      action,
      entityType: "order",
      entityId: orderId,
      changes: { archivedAt },
    });
  } catch (error) {
    // Audit logging must not turn a successful, already-committed archive toggle
    // into a misleading HTTP failure. The order financial audit trail itself is
    // untouched because archive is not a financial mutation.
    console.error(`[AdminOrderArchive] ${action} audit log failed`, error);
  }
}

export function createAdminOrderArchiveRouter() {
  const router = Router();

  /**
   * Canonical admin order list with the existing profit/cost enrichment intact.
   * By default archived rows stay out of operational callers; the Orders screen
   * explicitly requests includeArchived=1 so it can provide an Archive tab.
   */
  router.get("/orders", requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const db = getDb();
    if (!db) {
      res.status(503).json({ message: "قاعدة البيانات غير مهيأة" });
      return;
    }

    try {
      const archiveResult = await db.execute(sql`
        SELECT id, archived_at
        FROM public.orders
      `);
      const archivedAtById = new Map(
        rowsOf<Pick<ArchiveRow, "id" | "archived_at">>(archiveResult)
          .map((row) => [row.id, row.archived_at] as const),
      );

      const allOrders = await storage.getOrders();
      const includeArchived = wantsArchivedOrders(req);
      const visibleOrders = includeArchived
        ? allOrders
        : allOrders.filter((order) => !archivedAtById.get(order.id));

      const costs = await buildCostResolver(db, collectProductIds(visibleOrders as any));
      const fulfil = await buildFulfillmentResolver(
        db,
        new Set(visibleOrders.map((order: any) => order.id)),
      );

      const enrichedOrders = visibleOrders.map((order: any) => {
        const archivedAt = archivedAtById.get(order.id) ?? null;

        if (!order.items || !Array.isArray(order.items)) {
          return { ...order, archivedAt };
        }

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

        const profit = calcOrderProfit(order, costs, fulfil.get(order.id));
        return {
          ...order,
          items: enrichedItems,
          archivedAt,
          profit: profit.netProfit,
          revenue: profit.revenue,
          cogs: profit.cogs,
          fulfillmentCost: profit.fulfillmentCost,
          fulfillmentStatus: profit.fulfillmentStatus,
          contributionProfit: profit.contributionProfit,
          contributionMargin: profit.contributionMargin,
          costStatus: profit.costStatus,
          costsComplete: profit.costsComplete,
          estimatedCostLines: profit.estimatedCostLines,
          missingCostLines: profit.missingCostLines,
        };
      });

      res.set("Cache-Control", "no-store, private");
      res.json(enrichedOrders);
    } catch (error) {
      next(error);
    }
  });

  /**
   * DELETE keeps the existing frontend/API verb for compatibility, but its
   * semantics are deliberately SAFE: terminal orders are archived, never
   * physically deleted.
   */
  router.delete("/orders/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const db = getDb();
    if (!db) {
      res.status(503).json({ message: "قاعدة البيانات غير مهيأة" });
      return;
    }

    try {
      const archived = await db.transaction(async (tx) => {
        const lockedResult = await tx.execute(sql`
          SELECT id, order_number, status, archived_at
          FROM public.orders
          WHERE id = ${req.params.id}
          FOR UPDATE
        `);
        const locked = rowsOf<ArchiveRow>(lockedResult)[0];

        if (!locked) {
          throw Object.assign(new Error("الطلب غير موجود"), { statusCode: 404 });
        }
        if (locked.archived_at) {
          return locked;
        }
        if (!ARCHIVABLE_ORDER_STATUSES.has(locked.status)) {
          throw Object.assign(
            new Error("لا يمكن أرشفة طلب ما زال ضمن دورة التنفيذ. أكمل معالجة الطلب أو حوّله إلى حالة نهائية أولاً."),
            { statusCode: 409 },
          );
        }

        const result = await tx.execute(sql`
          UPDATE public.orders
          SET archived_at = clock_timestamp(),
              updated_at = clock_timestamp()
          WHERE id = ${locked.id}
          RETURNING id, order_number, status, archived_at
        `);
        const updated = rowsOf<ArchiveRow>(result)[0];
        if (!updated) {
          throw new Error("فشل أرشفة الطلب");
        }
        return updated;
      });

      await writeArchiveAudit(req, "archive", archived.id, archived.archived_at);
      res.set("Cache-Control", "no-store, private");
      res.json({
        success: true,
        orderNumber: archived.order_number,
        archivedAt: archived.archived_at,
      });
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 409) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      next(error);
    }
  });

  router.post("/orders/:id/restore", requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const db = getDb();
    if (!db) {
      res.status(503).json({ message: "قاعدة البيانات غير مهيأة" });
      return;
    }

    try {
      const result = await db.execute(sql`
        UPDATE public.orders
        SET archived_at = NULL,
            updated_at = clock_timestamp()
        WHERE id = ${req.params.id}
        RETURNING id, order_number, status, archived_at
      `);
      const restored = rowsOf<ArchiveRow>(result)[0];

      if (!restored) {
        res.status(404).json({ message: "الطلب غير موجود" });
        return;
      }

      await writeArchiveAudit(req, "restore", restored.id, null);
      res.set("Cache-Control", "no-store, private");
      res.json({ success: true, orderNumber: restored.order_number });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
