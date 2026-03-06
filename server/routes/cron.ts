import { Router, Request, Response } from "express";
import { triggerJob } from "../cron/scheduled-jobs.js";
import { aiMonitor } from "../services/ai-monitor.js";

const router = Router();

/**
 * POST /api/cron/nightly
 * 
 * Called by Vercel Cron once daily at 1:30 AM Baghdad time.
 * Runs all nightly AI tasks sequentially within one invocation.
 * Protected by CRON_SECRET header validation.
 */
router.get("/nightly", async (req: Request, res: Response) => {
    // ═══════════════════════════════════════════════
    // Security: Validate CRON_SECRET
    // Vercel sends Authorization header with Bearer token
    // ═══════════════════════════════════════════════
    const authHeader = req.headers["authorization"];
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.warn("[Cron] Unauthorized cron request blocked");
        return res.status(401).json({ error: "Unauthorized" });
    }

    console.log("[Cron] 🌙 Starting nightly tasks...");
    const startTime = Date.now();
    const results: Record<string, { success: boolean; message: string; duration: number }> = {};

    // Run tasks in priority order
    const tasks: Array<{ name: string; jobKey: Parameters<typeof triggerJob>[0] }> = [
        { name: "Embeddings", jobKey: "embeddings" },
        { name: "Predictions", jobKey: "predictions" },
        { name: "Churn Analysis", jobKey: "churn" },
        { name: "Conversions", jobKey: "conversions" },
        { name: "Smart Reminders", jobKey: "smart_reminders" },
    ];

    for (const task of tasks) {
        const taskStart = Date.now();
        try {
            console.log(`[Cron] ▶️ Running: ${task.name}...`);
            const result = await triggerJob(task.jobKey);
            const duration = Date.now() - taskStart;
            results[task.name] = {
                success: result.success,
                message: result.message,
                duration,
            };
            console.log(`[Cron] ✅ ${task.name}: ${result.message} (${duration}ms)`);

            // Log to AI monitor
            aiMonitor.log({
                event: "cron_job",
                level: "info",
                success: result.success,
                responseTimeMs: duration,
                details: { job: task.jobKey, status: result.success ? "completed" : "failed", source: "vercel_cron" },
            });
        } catch (error) {
            const duration = Date.now() - taskStart;
            const msg = error instanceof Error ? error.message : String(error);
            results[task.name] = {
                success: false,
                message: msg,
                duration,
            };
            console.error(`[Cron] ❌ ${task.name} failed: ${msg} (${duration}ms)`);

            // Log error to AI monitor
            aiMonitor.logError(`Vercel cron ${task.name} failed: ${msg}`, {}, {
                event: "cron_job",
                responseTimeMs: duration,
                details: { job: task.jobKey, status: "failed", source: "vercel_cron" },
            } as any);
        }
    }

    const totalDuration = Date.now() - startTime;
    const successCount = Object.values(results).filter(r => r.success).length;

    console.log(`[Cron] 🌙 Nightly tasks complete: ${successCount}/${tasks.length} succeeded in ${totalDuration}ms`);

    res.status(200).json({
        success: true,
        totalDuration,
        completed: `${successCount}/${tasks.length}`,
        results,
    });
});

/**
 * POST /api/cron/weekly-blog
 * 
 * Called by Vercel Cron once weekly (Sunday at 5:00 AM Baghdad).
 * Generates a new blog post automatically.
 */
router.get("/weekly-blog", async (req: Request, res: Response) => {
    // Security: Validate CRON_SECRET
    const authHeader = req.headers["authorization"];
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    console.log("[Cron] 📝 Starting weekly blog generation...");
    const startTime = Date.now();

    try {
        const result = await triggerJob("autoblog");
        const duration = Date.now() - startTime;

        aiMonitor.log({
            event: "cron_job",
            level: "info",
            success: result.success,
            responseTimeMs: duration,
            details: { job: "auto_blog", status: result.success ? "completed" : "failed", source: "vercel_cron" },
        });

        console.log(`[Cron] 📝 Blog: ${result.message} (${duration}ms)`);
        res.status(200).json({ success: result.success, message: result.message, duration });
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[Cron] ❌ Blog failed: ${msg}`);
        res.status(500).json({ success: false, error: msg });
    }
});

/**
 * GET /api/cron/email-campaigns
 * 
 * Called by Vercel Cron weekly (Monday at 10:00 AM Baghdad = 7:00 AM UTC).
 * Sends automated email campaigns to target audiences.
 */
router.get("/email-campaigns", async (req: Request, res: Response) => {
    // Security: Validate CRON_SECRET
    const authHeader = req.headers["authorization"];
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    console.log("[Cron] 📧 Starting weekly email campaign...");
    const startTime = Date.now();

    try {
        const result = await triggerJob("email_campaigns");
        const duration = Date.now() - startTime;

        aiMonitor.log({
            event: "cron_job",
            level: "info",
            success: result.success,
            responseTimeMs: duration,
            details: { job: "email_campaigns", status: result.success ? "completed" : "failed", source: "vercel_cron" },
        });

        console.log(`[Cron] 📧 Email Campaign: ${result.message} (${duration}ms)`);
        res.status(200).json({ success: result.success, message: result.message, duration });
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[Cron] ❌ Email campaign failed: ${msg}`);
        res.status(500).json({ success: false, error: msg });
    }
});

export default router;
