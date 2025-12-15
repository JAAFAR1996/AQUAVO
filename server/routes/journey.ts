import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { storage } from "../storage/index.js";

const router = Router();

// Validation schema for journey plan data
const journeyPlanSchema = z.object({
    tankSize: z.string().optional(),
    tankType: z.string().optional(),
    location: z.array(z.string()).optional(),
    filterType: z.string().optional(),
    heaterWattage: z.number().optional(),
    lightingType: z.string().optional(),
    substrateType: z.string().optional(),
    decorations: z.array(z.string()).optional(),
    waterSource: z.string().optional(),
    cyclingMethod: z.string().optional(),
    fishTypes: z.array(z.string()).optional(),
    stockingLevel: z.string().optional(),
    maintenancePreference: z.string().optional(),
    currentStep: z.number().optional(),
    isCompleted: z.boolean().optional(),
});

// Save or update journey plan
router.post("/api/journey/plans", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const planData = journeyPlanSchema.parse(req.body);
        const userId = (req.session as any)?.userId;
        const sessionId = req.sessionID;

        // Check for existing plan
        const existingPlan = await storage.getJourneyPlan(userId, sessionId);

        if (existingPlan) {
            const updated = await storage.updateJourneyPlan(existingPlan.id, {
                ...planData,
                updatedAt: new Date(),
            });
            return res.json({ success: true, data: updated });
        }

        const plan = await storage.createJourneyPlan({
            ...planData,
            userId,
            sessionId,
        });

        res.json({ success: true, data: plan });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                error: "Invalid plan data",
                details: error.errors,
            });
        }
        next(error);
    }
});

// Get journey plan
router.get("/api/journey/plans", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req.session as any)?.userId;
        const sessionId = req.sessionID;

        const plan = await storage.getJourneyPlan(userId, sessionId);

        res.json({ success: true, data: plan || null });
    } catch (error) {
        next(error);
    }
});

// Delete journey plan (reset)
router.delete("/api/journey/plans", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req.session as any)?.userId;
        const sessionId = req.sessionID;

        await storage.deleteJourneyPlan(userId, sessionId);

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

export default router;
