import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/auth.js";
import { getDb } from "../db.js";
import { expenses } from "../../shared/schema.js";
import { expenseInputSchema, accountingPeriodSchema, type AccountingPeriod } from "../../shared/accounting.js";
import { and, gte, lte, eq, desc, isNull } from "drizzle-orm";
import { recordFinancialChange, actorFromRequest } from "../services/accountingAuditTrail.js";

const router = Router();
router.use(requireAdmin);

type Db = NonNullable<ReturnType<typeof getDb>>;

function getExpensesDb(res: Response): Db | null {
  const db = getDb();
  if (!db) {
    res.status(503).json({ success: false, message: "قاعدة البيانات غير مهيأة" });
    return null;
  }
  return db;
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function serializeExpense(e: typeof expenses.$inferSelect) {
  return {
    id: e.id,
    category: e.category,
    amount: toNumber(e.amount),
    description: e.description ?? null,
    expenseDate: e.expenseDate instanceof Date
      ? e.expenseDate.toISOString()
      : String(e.expenseDate),
    isRecurring: e.isRecurring ?? false,
    recurringPeriod: e.recurringPeriod ?? null,
    createdAt: e.createdAt instanceof Date
      ? e.createdAt.toISOString()
      : String(e.createdAt),
  };
}

function periodRange(period: AccountingPeriod, from?: string, to?: string): { start: Date; end: Date } {
  const now = new Date();
  if (period === "custom" && from && to) {
    const start = new Date(from);
    const end = new Date(to);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    // fall through to month default if dates are invalid
  }
  if (period === "year") {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
    };
  }
  if (period === "week") {
    const day = now.getDay();
    const diffToSat = (day + 1) % 7; // السبت بداية الأسبوع (عراقي)
    const start = new Date(now);
    start.setDate(now.getDate() - diffToSat);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (period === "day") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  // month (default)
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

// GET / — list expenses for a period + summary
router.get("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getExpensesDb(res);
    if (!db) return;

    const rawPeriod = typeof req.query.period === "string" ? req.query.period : "month";
    const parsedPeriod = accountingPeriodSchema.safeParse(rawPeriod);
    const period = parsedPeriod.success ? parsedPeriod.data : "month";
    const from = typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;

    const { start, end } = periodRange(period, from, to);

    const list = await db
      .select()
      .from(expenses)
      .where(and(gte(expenses.expenseDate, start), lte(expenses.expenseDate, end), isNull(expenses.deletedAt)))
      .orderBy(desc(expenses.expenseDate));

    const serialized = list.map(serializeExpense);

    // totalExpenses
    const totalExpenses = serialized.reduce((sum, e) => sum + e.amount, 0);

    // byCategory — grouped sum per category, sorted by total desc
    const categoryMap: Record<string, number> = {};
    for (const e of serialized) {
      categoryMap[e.category] = (categoryMap[e.category] ?? 0) + e.amount;
    }
    const byCategory = Object.entries(categoryMap)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);

    res.json({
      success: true,
      data: {
        list: serialized,
        totalExpenses,
        byCategory,
        expensesComplete: serialized.length > 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST / — create expense
router.post("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getExpensesDb(res);
    if (!db) return;

    const parsed = expenseInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "بيانات المصروف غير صالحة", errors: parsed.error.flatten() });
      return;
    }

    const { category, amount, description, expenseDate, isRecurring, recurringPeriod } = parsed.data;
    const actor = actorFromRequest(req);

    const [inserted] = await db
      .insert(expenses)
      .values({
        category,
        amount: String(amount),
        description: description ?? null,
        expenseDate: new Date(expenseDate),
        isRecurring: isRecurring ?? false,
        recurringPeriod: recurringPeriod ?? null,
      })
      .returning();

    await recordFinancialChange(db, {
      entityType: "expense",
      entityId: inserted.id,
      action: "create",
      fieldName: null,
      oldValue: null,
      newValue: { category, amount, description: description ?? null, expenseDate },
      reason: null,
      performedBy: actor.id,
      performedByName: actor.name,
    });

    res.status(201).json({ success: true, data: serializeExpense(inserted) });
  } catch (err) {
    next(err);
  }
});

// PATCH /:id — update expense
router.patch("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getExpensesDb(res);
    if (!db) return;

    const { id } = req.params as { id: string };
    // Editing a recorded expense requires a reason — it changes a past financial figure.
    const parsed = expenseInputSchema.partial().extend({ reason: z.string().trim().min(3).max(500) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "بيانات التحديث غير صالحة أو السبب مفقود", errors: parsed.error.flatten() });
      return;
    }

    // Read the current row first so we can record before→after.
    const [before] = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
    if (!before || before.deletedAt) {
      res.status(404).json({ success: false, message: "المصروف غير موجود" });
      return;
    }

    const updateData: Partial<typeof expenses.$inferInsert> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
    if (parsed.data.amount !== undefined) updateData.amount = String(parsed.data.amount);
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description ?? null;
    if (parsed.data.expenseDate !== undefined) updateData.expenseDate = new Date(parsed.data.expenseDate);
    if (parsed.data.isRecurring !== undefined) updateData.isRecurring = parsed.data.isRecurring;
    if (parsed.data.recurringPeriod !== undefined) updateData.recurringPeriod = parsed.data.recurringPeriod ?? null;

    const actor = actorFromRequest(req);
    const [updated] = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(expenses)
        .set(updateData)
        .where(eq(expenses.id, id))
        .returning();

      await recordFinancialChange(tx, {
        entityType: "expense",
        entityId: id,
        action: "update",
        fieldName: null,
        oldValue: { category: before.category, amount: toNumber(before.amount), description: before.description, expenseDate: before.expenseDate },
        newValue: { category: row.category, amount: toNumber(row.amount), description: row.description, expenseDate: row.expenseDate },
        reason: parsed.data.reason,
        performedBy: actor.id,
        performedByName: actor.name,
      });

      return [row];
    });

    res.json({ success: true, data: serializeExpense(updated) });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id — soft-delete expense (never hard-deleted: preserves period integrity)
router.delete("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getExpensesDb(res);
    if (!db) return;

    const { id } = req.params as { id: string };
    // Deleting a recorded expense requires a reason.
    const parsed = z.object({ reason: z.string().trim().min(3).max(500) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "سبب الحذف مطلوب" });
      return;
    }

    const [before] = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
    if (!before || before.deletedAt) {
      res.status(404).json({ success: false, message: "المصروف غير موجود" });
      return;
    }

    const actor = actorFromRequest(req);
    await db.transaction(async (tx) => {
      await tx
        .update(expenses)
        .set({ deletedAt: new Date(), deletedBy: actor.id, updatedAt: new Date() })
        .where(eq(expenses.id, id));

      await recordFinancialChange(tx, {
        entityType: "expense",
        entityId: id,
        action: "delete",
        fieldName: null,
        oldValue: { category: before.category, amount: toNumber(before.amount), description: before.description, expenseDate: before.expenseDate },
        newValue: null,
        reason: parsed.data.reason,
        performedBy: actor.id,
        performedByName: actor.name,
      });
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export function createExpensesRouter() {
  return router;
}
