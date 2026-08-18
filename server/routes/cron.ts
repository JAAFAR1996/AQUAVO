import { Router, Request, Response, NextFunction } from "express";
import { triggerJob } from "../cron/scheduled-jobs.js";
import { aiMonitor } from "../services/ai-monitor.js";
import { getDb } from "../db.js";
import { runAutomaticPeriodClose } from "../services/accounting-auto-close-v2.js";
import { runDueDeliveryCareJobs } from "../services/customer-messaging.js";
import { cleanupWhatsAppProviderStatusEvents } from "../services/whatsapp-provider-status.js";

const router = Router();

function getCronRequestSecret(req: Request): string | undefined {
  const authHeader = req.get("authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice("Bearer ".length);
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
  if (!authorizeCronRequest(req, res)) return;
  next();
}
router.use(requireCronAuth);

router.get("/nightly", async (_req: Request, res: Response) => {
  console.log("[Cron] Starting nightly tasks...");
  const startTime = Date.now();
  const results: Record<string, { success: boolean; message: string; duration: number }> = {};
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
      const result = await triggerJob(task.jobKey);
      const duration = Date.now() - taskStart;
      results[task.name] = { success: result.success, message: result.message, duration };
      aiMonitor.log({ event: "cron_job", level: "info", success: result.success, responseTimeMs: duration, details: { job: task.jobKey, status: result.success ? "completed" : "failed", source: "vercel_cron" } });
    } catch (error) {
      const duration = Date.now() - taskStart;
      const message = error instanceof Error ? error.message : String(error);
      results[task.name] = { success: false, message, duration };
      aiMonitor.logError(`Vercel cron ${task.name} failed: ${message}`, {}, { event: "cron_job", responseTimeMs: duration, details: { job: task.jobKey, status: "failed", source: "vercel_cron" } } as any);
    }
  }
  const totalDuration = Date.now() - startTime;
  const successCount = Object.values(results).filter((result) => result.success).length;
  res.status(200).json({ success: true, totalDuration, completed: `${successCount}/${tasks.length}`, results });
});

router.get("/weekly-blog", async (_req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const result = await triggerJob("autoblog");
    const duration = Date.now() - startTime;
    aiMonitor.log({ event: "cron_job", level: "info", success: result.success, responseTimeMs: duration, details: { job: "auto_blog", status: result.success ? "completed" : "failed", source: "vercel_cron" } });
    res.status(200).json({ success: result.success, message: result.message, duration });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

router.get("/email-campaigns", async (_req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const result = await triggerJob("email_campaigns");
    const duration = Date.now() - startTime;
    aiMonitor.log({ event: "cron_job", level: "info", success: result.success, responseTimeMs: duration, details: { job: "email_campaigns", status: result.success ? "completed" : "failed", source: "vercel_cron" } });
    res.status(200).json({ success: result.success, message: result.message, duration });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Runs every day. Automatic accounting close is always executed first and is
 * independent from the optional AI audit. PostgreSQL uses Asia/Baghdad and
 * exact calendar month boundaries, so the first run after a month ends closes
 * it when all blockers are zero; otherwise the next daily run retries.
 */
router.get("/finance-audit", async (_req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const db = getDb();
    const automaticClose = db ? await runAutomaticPeriodClose(db) : [];

    if (process.env.FINANCE_AI_AUDIT_ENABLED !== "true") {
      return res.status(200).json({
        success: true,
        automaticClose,
        aiAudit: { skipped: true, reason: "FINANCE_AI_AUDIT_ENABLED is not set" },
        duration: Date.now() - startTime,
      });
    }

    const result = await triggerJob("finance_audit");
    const duration = Date.now() - startTime;
    aiMonitor.log({ event: "cron_job", level: "info", success: result.success, responseTimeMs: duration, details: { job: "finance_audit", status: result.success ? "completed" : "failed", source: "vercel_cron", automaticClose } });
    return res.status(200).json({ success: result.success, message: result.message, automaticClose, duration });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Cron] Finance close/audit failed: ${message}`);
    return res.status(500).json({ success: false, error: message });
  }
});

/**
 * Recovery worker for post-delivery WhatsApp care messages.
 * Vercel Hobby cannot schedule sub-daily Cron Jobs, so production is invoked by
 * a protected GitHub Actions schedule every five minutes. The existing admin
 * delivered button remains the primary immediate-send path; this worker covers
 * provider retries, browser interruption, stale serverless claims, provider
 * status reconciliation and bounded provider-event retention cleanup.
 */
router.get("/customer-messaging", async (_req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const result = await runDueDeliveryCareJobs(5);
    let providerEventsCleaned = 0;
    try {
      providerEventsCleaned = await cleanupWhatsAppProviderStatusEvents(500);
    } catch {
      // Cleanup is maintenance only. It must not turn a successful messaging
      // recovery invocation into a failed outbound worker response.
    }

    const duration = Date.now() - startTime;
    aiMonitor.log({
      event: "cron_job",
      level: "info",
      success: true,
      responseTimeMs: duration,
      details: {
        job: "customer_messaging_delivery_care",
        status: "completed",
        source: "external_scheduler",
        ...result,
        providerEventsCleaned,
      },
    });
    return res.status(200).json({ success: true, duration, ...result, providerEventsCleaned });
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    aiMonitor.logError(`Customer messaging retry worker failed: ${message}`, {}, {
      event: "cron_job",
      responseTimeMs: duration,
      details: { job: "customer_messaging_delivery_care", status: "failed", source: "external_scheduler" },
    } as any);
    return res.status(500).json({ success: false, error: "CUSTOMER_MESSAGING_WORKER_FAILED", duration });
  }
});

router.get("/db-warmup", async (_req: Request, res: Response) => {
  try {
    const { sql } = await import("drizzle-orm");
    const db = getDb();
    if (!db) return res.status(200).json({ status: "skip", message: "No DB configured" });
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    return res.status(200).json({ status: "warm", latencyMs: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(200).json({ status: "cold", error: message });
  }
});

export default router;
