import { Router, Request, Response, NextFunction } from "express";
import { triggerJob } from "../cron/scheduled-jobs.js";
import { aiMonitor } from "../services/ai-monitor.js";

const router = Router();

function getCronRequestSecret(req: Request): string | undefined {
    const authHeader = req.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.slice("Bearer ".length);
    }

    return req.get("x-cron-secret");
}

function authorizeCronRequest(req: Request, res: Response): boolean {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        if (process.env.NODE_ENV === "production") {
            console.warn("[Cron] Unauthorized cron request blocked");
            res.status(403).json({ error: "Forbidden" });
            return false;
        }

        console.warn("[Cron] CRON_SECRET is not set; allowing cron request in non-production");
        return true;
    }

    if (getCronRequestSecret(req) !== cronSecret) {
        console.warn("[Cron] Unauthorized cron request blocked");
        res.status(401).json({ error: "Unauthorized" });
        return false;
    }

    return true;
}

function requireCronAuth(req: Request, res: Response, next: NextFunction): void {
    if (!authorizeCronRequest(req, res)) {
        return;
    }

    next();
}

router.use(requireCronAuth);

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

/**
 * GET /api/cron/finance-audit
 *
 * Called by Vercel Cron every 12 hours.
 * Runs the Groq finance audit, persists result, sends Telegram alert if needed.
 * Skips silently when FINANCE_AI_AUDIT_ENABLED !== "true".
 */
router.get("/finance-audit", async (req: Request, res: Response) => {
    if (process.env.FINANCE_AI_AUDIT_ENABLED !== "true") {
        return res.status(200).json({ skipped: true, reason: "FINANCE_AI_AUDIT_ENABLED is not set" });
    }

    const startTime = Date.now();
    try {
        const result = await triggerJob("finance_audit");
        const duration = Date.now() - startTime;
        aiMonitor.log({
            event: "cron_job",
            level: "info",
            success: result.success,
            responseTimeMs: duration,
            details: { job: "finance_audit", status: result.success ? "completed" : "failed", source: "vercel_cron" },
        });
        res.status(200).json({ success: result.success, message: result.message, duration });
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[Cron] Finance audit failed: ${msg}`);
        res.status(500).json({ success: false, error: msg });
    }
});

/**
 * GET /api/cron/db-warmup
 * 
 * Called by Vercel Cron every 4 minutes to keep NEON DB warm.
 * NEON auto-suspends after ~5 min of inactivity, causing 2-5s cold start.
 * This ping prevents that penalty for real users.
 */
router.get("/db-warmup", async (req: Request, res: Response) => {
    try {
        const { getDb } = await import("../db.js");
        const { sql } = await import("drizzle-orm");
        const db = getDb();
        if (!db) {
            return res.status(200).json({ status: "skip", message: "No DB configured" });
        }
        const start = Date.now();
        await db.execute(sql`SELECT 1`);
        const duration = Date.now() - start;
        res.status(200).json({ status: "warm", latencyMs: duration, timestamp: new Date().toISOString() });
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(`[Cron] DB warmup failed: ${msg}`);
        res.status(200).json({ status: "cold", error: msg });
    }
});

export default router;
