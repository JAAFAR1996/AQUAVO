import { Router, Request, Response } from "express";
import { getDb } from "../db.js";
import * as schema from "../../shared/schema.js";
import { eq, desc, count, and, sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

// GET /api/admin/ai-learnings - List all learnings (paginated)
router.get("/", requireAdmin, async (req: Request, res: Response) => {
    try {
        const db = getDb();
        if (!db) return res.status(500).json({ success: false, error: "Database not available" });

        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
        const offset = (page - 1) * limit;
        const typeFilter = req.query.type as string;
        const appliedFilter = req.query.applied as string;

        let conditions: any[] = [];
        if (typeFilter) conditions.push(eq(schema.aiLearnings.type, typeFilter));
        if (appliedFilter === "true") conditions.push(eq(schema.aiLearnings.applied, true));
        if (appliedFilter === "false") conditions.push(eq(schema.aiLearnings.applied, false));

        const where = conditions.length > 0 ? and(...conditions) : undefined;

        const [learnings, [totalResult]] = await Promise.all([
            db.select()
                .from(schema.aiLearnings)
                .where(where)
                .orderBy(desc(schema.aiLearnings.createdAt))
                .limit(limit)
                .offset(offset),
            db.select({ count: count() })
                .from(schema.aiLearnings)
                .where(where),
        ]);

        res.json({
            success: true,
            data: learnings,
            pagination: {
                page,
                limit,
                total: totalResult?.count ?? 0,
                pages: Math.ceil((totalResult?.count ?? 0) / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching AI learnings:", error);
        res.status(500).json({ success: false, error: "Failed to fetch learnings" });
    }
});

// GET /api/admin/ai-learnings/stats - Stats summary
router.get("/stats", requireAdmin, async (_req: Request, res: Response) => {
    try {
        const db = getDb();
        if (!db) return res.status(500).json({ success: false, error: "Database not available" });

        const [totalResult] = await db.select({ count: count() }).from(schema.aiLearnings);
        const [appliedResult] = await db.select({ count: count() }).from(schema.aiLearnings)
            .where(eq(schema.aiLearnings.applied, true));
        const [pendingResult] = await db.select({ count: count() }).from(schema.aiLearnings)
            .where(eq(schema.aiLearnings.applied, false));
        const [negativeFeedbackResult] = await db.select({ count: count() }).from(schema.aiLearnings)
            .where(eq(schema.aiLearnings.type, "negative_feedback"));

        res.json({
            success: true,
            data: {
                total: totalResult?.count ?? 0,
                applied: appliedResult?.count ?? 0,
                pending: pendingResult?.count ?? 0,
                negativeFeedback: negativeFeedbackResult?.count ?? 0,
            },
        });
    } catch (error) {
        console.error("Error fetching AI learnings stats:", error);
        res.status(500).json({ success: false, error: "Failed to fetch stats" });
    }
});

// PATCH /api/admin/ai-learnings/:id - Toggle applied, edit rule
router.patch("/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
        const db = getDb();
        if (!db) return res.status(500).json({ success: false, error: "Database not available" });

        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid ID" });

        const { applied, rule, correctedBehavior } = req.body;
        const updates: any = {};

        if (typeof applied === "boolean") {
            updates.applied = applied;
            updates.appliedAt = applied ? new Date() : null;
        }
        if (typeof rule === "string") updates.rule = rule;
        if (typeof correctedBehavior === "string") updates.correctedBehavior = correctedBehavior;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ success: false, error: "No updates provided" });
        }

        await db.update(schema.aiLearnings)
            .set(updates)
            .where(eq(schema.aiLearnings.id, id));

        const [updated] = await db.select().from(schema.aiLearnings).where(eq(schema.aiLearnings.id, id));

        res.json({ success: true, data: updated });
    } catch (error) {
        console.error("Error updating AI learning:", error);
        res.status(500).json({ success: false, error: "Failed to update learning" });
    }
});

// DELETE /api/admin/ai-learnings/:id - Delete a learning
router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
        const db = getDb();
        if (!db) return res.status(500).json({ success: false, error: "Database not available" });

        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid ID" });

        await db.delete(schema.aiLearnings).where(eq(schema.aiLearnings.id, id));

        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting AI learning:", error);
        res.status(500).json({ success: false, error: "Failed to delete learning" });
    }
});

export default router;
