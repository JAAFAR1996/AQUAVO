import type { Request, Response, NextFunction } from "express";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage/index.js";

// Extend express-session types
declare module "express-session" {
    interface SessionData {
        userId?: string;
        journeyDraft?: boolean;
    }
}

const router = Router();

// Helper to get session data safely
const getSessionUserId = (req: Request): string | undefined => {
    return req.session?.userId;
};

const getSessionId = (req: Request): string => {
    return req.sessionID || "";
};

// Validation schema for journey plan data
const planText = z.string().max(500);
const planChoices = z.array(planText).max(30);
const journeyPlanSchema = z.object({
    tankSize: planText.optional(),
    tankType: planText.optional(),
    location: planChoices.optional(),
    filterType: planText.optional(),
    heaterWattage: z.number().finite().min(0).max(10000).optional(),
    lightingType: planText.optional(),
    substrateType: planText.optional(),
    decorations: planChoices.optional(),
    waterSource: planText.optional(),
    cyclingMethod: planText.optional(),
    fishTypes: planChoices.optional(),
    stockingLevel: planText.optional(),
    maintenancePreference: planText.optional(),
    currentStep: z.number().int().min(0).max(100).optional(),
    isCompleted: z.boolean().optional(),
});

// Save or update journey plan
router.post("/api/journey/plans", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const planData = journeyPlanSchema.parse(req.body);
        const userId = getSessionUserId(req);
        const sessionId = getSessionId(req);

        if (!req.session || !sessionId) {
            res.status(503).json({ success: false, error: "تعذر حفظ الجلسة. حاول مرة ثانية." });
            return;
        }
        // saveUninitialized:false intentionally avoids cookies on ordinary page
        // reads. A guest draft is a real session mutation: persist its identity
        // before writing a plan that later requests must be able to retrieve.
        req.session.journeyDraft = true;
        await new Promise<void>((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));

        // Check for existing plan
        const existingPlan = await storage.getJourneyPlan(userId, sessionId);

        if (existingPlan) {
            const updated = await storage.updateJourneyPlan(existingPlan.id, {
                ...planData,
                updatedAt: new Date(),
            });
            res.json({ success: true, data: updated });
            return;
        }

        const plan = await storage.createJourneyPlan({
            ...planData,
            userId,
            sessionId,
        });

        res.json({ success: true, data: plan });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({
                success: false,
                error: "Invalid plan data",
                details: error.issues,
            });
            return;
        }
        next(error);
    }
});

// Get journey plan
router.get("/api/journey/plans", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = getSessionUserId(req);
        const sessionId = getSessionId(req);

        if (!userId && !req.session?.journeyDraft) {
            res.json({ success: true, data: null });
            return;
        }

        const plan = await storage.getJourneyPlan(userId, sessionId);

        res.json({ success: true, data: plan || null });
    } catch (error) {
        next(error);
    }
});

// Delete journey plan (reset)
router.delete("/api/journey/plans", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = getSessionUserId(req);
        const sessionId = getSessionId(req);

        if (!userId && !req.session?.journeyDraft) {
            res.json({ success: true });
            return;
        }

        await storage.deleteJourneyPlan(userId, sessionId);

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

export default router;

