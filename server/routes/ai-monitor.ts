/**
 * AI Monitor API Routes — نقاط نهاية مراقبة الذكاء الاصطناعي
 * Admin-only endpoints for the AI monitoring dashboard
 */

import { Router, Request, Response } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { aiMonitor } from "../services/ai-monitor.js";
import { groqClient } from "../services/groq-client.js";

const router = Router();

// All routes require admin
router.use(requireAdmin);

/** GET /api/admin/ai-monitor/stats — overall stats */
router.get("/stats", async (_req: Request, res: Response) => {
    try {
        const hours = 24;
        const stats = await aiMonitor.getStats(hours);
        const keyCount = groqClient.getKeyCount();

        res.json({
            ...stats,
            groqKeysTotal: keyCount,
            status: (stats?.errorRate ?? 0) > 20 ? "critical" :
                    (stats?.errorRate ?? 0) > 5  ? "warning" : "healthy",
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/** GET /api/admin/ai-monitor/logs?level=error&limit=100 — recent logs */
router.get("/logs", async (req: Request, res: Response) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 100, 500);
        const level = req.query.level as string | undefined;
        const logs = await aiMonitor.getLogs(limit, level);
        res.json({ logs });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/** GET /api/admin/ai-monitor/errors — recent errors only */
router.get("/errors", async (req: Request, res: Response) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 50, 200);
        const errors = await aiMonitor.getErrors(limit);
        res.json({ errors });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/** GET /api/admin/ai-monitor/chart — hourly breakdown */
router.get("/chart", async (req: Request, res: Response) => {
    try {
        const hours = Math.min(Number(req.query.hours) || 24, 168);
        const chart = await aiMonitor.getHourlyChart(hours);
        res.json({ chart });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/** GET /api/admin/ai-monitor/models — model usage breakdown */
router.get("/models", async (req: Request, res: Response) => {
    try {
        const hours = Math.min(Number(req.query.hours) || 24, 168);
        const models = await aiMonitor.getModelUsage(hours);
        res.json({ models });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/** GET /api/admin/ai-monitor/features — per-feature breakdown (7 days) */
router.get("/features", async (req: Request, res: Response) => {
    try {
        const hours = Math.min(Number(req.query.hours) || 168, 720);
        const features = await aiMonitor.getFeatureBreakdown(hours);
        res.json({ features });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/** GET /api/admin/ai-monitor/cron-jobs — cron job history */
router.get("/cron-jobs", async (req: Request, res: Response) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 30, 100);
        const jobs = await aiMonitor.getCronJobHistory(limit);
        res.json({ jobs });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
