import { Router, Request, Response } from "express";
import { getDb } from "../db.js";
import * as schema from "../../shared/schema.js";
import { eq, desc, count, and, sql, not } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin, getSession } from "../middleware/auth.js";

import { isReviewedLearning } from "../services/learning-policy.js";

const router = Router();
const approvedCondition = sql<boolean>`COALESCE(${schema.aiLearnings.applied} = true
  AND ${schema.aiLearnings.metadata}->>'reviewStatus' = 'approved'
  AND NULLIF(${schema.aiLearnings.metadata}->>'reviewedBy', '') IS NOT NULL
  AND NULLIF(${schema.aiLearnings.metadata}->>'reviewedAt', '') IS NOT NULL, false)`;

// GET /api/admin/ai-learnings - List all learnings (paginated)
router.get("/", requireAdmin, async (req: Request, res: Response) => {
    try {
        const db = getDb();
        if (!db) return res.status(500).json({ success: false, error: "Database not available" });

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 20, 50));
        const offset = (page - 1) * limit;
        const typeFilter = req.query.type as string;
        const appliedFilter = req.query.applied as string;

        const conditions = [];
        if (typeFilter) conditions.push(eq(schema.aiLearnings.type, typeFilter));
        if (appliedFilter === "true") conditions.push(approvedCondition);
        if (appliedFilter === "false") conditions.push(not(approvedCondition));

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
            data: learnings.map(learning => ({ ...learning, applied: isReviewedLearning(learning),
                requiresReview: learning.applied === true && !isReviewedLearning(learning) })),
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
            .where(approvedCondition);
        const [pendingResult] = await db.select({ count: count() }).from(schema.aiLearnings)
            .where(not(approvedCondition));
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

const learningReviewSchema = z.object({
    applied: z.boolean().optional(),
    rule: z.string().trim().max(2000).optional(),
    correctedBehavior: z.string().trim().max(2000).optional(),
}).strict().refine(value => Object.keys(value).length > 0, "حدد التعديل المطلوب");

// Approval is explicit and attributed to an authenticated administrator.
router.patch("/:id", requireAdmin, async (req: Request, res: Response, next) => {
    try {
        const db = getDb();
        if (!db) return res.status(503).json({ success: false, error: "حفظ المراجعة غير متاح حاليا" });
        const id = z.coerce.number().int().positive().parse(req.params.id);
        const data = learningReviewSchema.parse(req.body);
        const actorId = getSession(req)?.userId;
        if (!actorId) return res.status(401).json({ success: false, error: "يجب تسجيل الدخول" });

        const updated = await db.transaction(async tx => {
            const [existing] = await tx.select().from(schema.aiLearnings)
                .where(eq(schema.aiLearnings.id, id)).limit(1).for("update");
            if (!existing) return undefined;
            const applied = data.applied ?? isReviewedLearning(existing);
            const rule = data.rule ?? existing.rule;
            const correctedBehavior = data.correctedBehavior ?? existing.correctedBehavior;
            if (applied && !(rule?.trim() || correctedBehavior?.trim())) {
                throw new z.ZodError([{ code: "custom", path: ["rule"], message: "اكتب قاعدة واضحة قبل اعتمادها" }]);
            }
            const now = new Date();
            const [result] = await tx.update(schema.aiLearnings).set({
                ...data,
                applied,
                appliedAt: applied ? now : null,
                metadata: {
                    ...(existing.metadata ?? {}),
                    reviewStatus: applied ? "approved" : "pending",
                    reviewedBy: actorId,
                    reviewedAt: now.toISOString(),
                },
            }).where(eq(schema.aiLearnings.id, id)).returning();
            return result;
        });
        if (!updated) return res.status(404).json({ success: false, error: "الملاحظة غير موجودة" });
        res.json({ success: true, data: updated });
    } catch (error) {
        next(error);
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
