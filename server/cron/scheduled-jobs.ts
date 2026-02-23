import cron from "node-cron";
import { predictiveAnalytics } from "../services/predictive-analytics.js";
import { churnDetector } from "../services/churn-detector.js";
import { autoBlogGenerator } from "../services/auto-blog-generator.js";
import { embeddingGenerator } from "../services/embedding-generator.js";
import { smartNotifications } from "../services/smart-notifications.js";
import { aiMonitor } from "../services/ai-monitor.js";

/**
 * Scheduled Jobs Service
 * يدير المهام المجدولة (Cron Jobs) للتحليلات التنبؤية
 */

// Track if jobs are running to prevent overlapping
const jobStatus = {
    predictionsRunning: false,
    churnRunning: false,
    inventoryRunning: false,
    autoOrdersRunning: false,
    autoBlogRunning: false,
    embeddingsRunning: false,
    smartRemindersRunning: false,
};

/**
 * Initialize all cron jobs
 */
export function initializeScheduledJobs(): void {
    console.log("[ScheduledJobs] Initializing cron jobs...");

    // ==================== Daily Predictions at 2:00 AM ====================
    cron.schedule("0 2 * * *", async () => {
        if (jobStatus.predictionsRunning) return;
        jobStatus.predictionsRunning = true;
        const t = Date.now();
        aiMonitor.log({ event: "cron_job", level: "info", success: true, details: { job: "predictions", status: "started" } });
        try {
            const result = await predictiveAnalytics.runDailyPredictions();
            console.log(`[ScheduledJobs] Predictions: ${result.usersAnalyzed} users, ${result.predictionsCreated} predictions`);
            aiMonitor.log({ event: "prediction", level: "info", success: true, responseTimeMs: Date.now() - t, details: { job: "predictions", ...result } });
            aiMonitor.log({ event: "cron_job", level: "info", success: true, responseTimeMs: Date.now() - t, details: { job: "predictions", status: "completed", ...result } });
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error("[ScheduledJobs] Predictions job failed:", error);
            aiMonitor.logError(`Cron predictions failed: ${msg}`, {}, { event: "cron_job", responseTimeMs: Date.now() - t, details: { job: "predictions", status: "failed" } } as any);
        } finally { jobStatus.predictionsRunning = false; }
    }, { timezone: "Asia/Baghdad" });

    // ==================== Churn Analysis at 3:00 AM ====================
    cron.schedule("0 3 * * *", async () => {
        if (jobStatus.churnRunning) return;
        jobStatus.churnRunning = true;
        const t = Date.now();
        aiMonitor.log({ event: "cron_job", level: "info", success: true, details: { job: "churn", status: "started" } });
        try {
            const result = await churnDetector.analyzeAllUsers();
            console.log(`[ScheduledJobs] Churn: ${result.usersAnalyzed} users, ${result.highRisk} high risk, ${result.critical} critical`);
            aiMonitor.log({ event: "churn_analysis", level: "info", success: true, responseTimeMs: Date.now() - t, details: { ...result } });
            aiMonitor.log({ event: "cron_job", level: "info", success: true, responseTimeMs: Date.now() - t, details: { job: "churn", status: "completed", ...result } });
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error("[ScheduledJobs] Churn job failed:", error);
            aiMonitor.logError(`Cron churn failed: ${msg}`, {}, { event: "cron_job", details: { job: "churn", status: "failed" } } as any);
        } finally { jobStatus.churnRunning = false; }
    }, { timezone: "Asia/Baghdad" });

    // ==================== Check Conversions at 4:00 AM ====================
    cron.schedule("0 4 * * *", async () => {
        const t = Date.now();
        aiMonitor.log({ event: "cron_job", level: "info", success: true, details: { job: "conversions", status: "started" } });
        try {
            const conversions = await predictiveAnalytics.checkConversions();
            console.log(`[ScheduledJobs] Conversions: ${conversions} found`);
            aiMonitor.log({ event: "cron_job", level: "info", success: true, responseTimeMs: Date.now() - t, details: { job: "conversions", status: "completed", conversions } });
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error("[ScheduledJobs] Conversions check failed:", error);
            aiMonitor.logError(`Cron conversions failed: ${msg}`, {}, { event: "cron_job", details: { job: "conversions", status: "failed" } } as any);
        }
    }, { timezone: "Asia/Baghdad" });

    // ==================== Generate Missing Embeddings at 1:30 AM ====================
    cron.schedule("30 1 * * *", async () => {
        if (jobStatus.embeddingsRunning) return;
        jobStatus.embeddingsRunning = true;
        const t = Date.now();
        aiMonitor.log({ event: "cron_job", level: "info", success: true, details: { job: "embeddings", status: "started" } });
        try {
            const result = await embeddingGenerator.generateMissingEmbeddings();
            console.log(`[ScheduledJobs] Embeddings: ${result.success} ok, ${result.failed} failed`);
            aiMonitor.log({ event: "embedding", level: "info", success: true, responseTimeMs: Date.now() - t, details: { ...result } });
            aiMonitor.log({ event: "cron_job", level: "info", success: true, responseTimeMs: Date.now() - t, details: { job: "embeddings", status: "completed", ...result } });
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error("[ScheduledJobs] Embeddings job failed:", error);
            aiMonitor.logError(`Cron embeddings failed: ${msg}`, {}, { event: "cron_job", details: { job: "embeddings", status: "failed" } } as any);
        } finally { jobStatus.embeddingsRunning = false; }
    }, { timezone: "Asia/Baghdad" });

    // ==================== Smart Reminders at 4:30 AM ====================
    cron.schedule("30 4 * * *", async () => {
        if (jobStatus.smartRemindersRunning) return;
        jobStatus.smartRemindersRunning = true;
        const t = Date.now();
        aiMonitor.log({ event: "cron_job", level: "info", success: true, details: { job: "smart_reminders", status: "started" } });
        try {
            const result = await smartNotifications.sendReplenishmentReminders();
            console.log(`[ScheduledJobs] Smart reminders: ${result.usersNotified} users, ${result.emailsSent} emails, ${result.pushSent} push`);
            aiMonitor.log({ event: "notification_sent", level: "info", success: true, responseTimeMs: Date.now() - t, details: { ...result } });
            aiMonitor.log({ event: "cron_job", level: "info", success: true, responseTimeMs: Date.now() - t, details: { job: "smart_reminders", status: "completed", ...result } });
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error("[ScheduledJobs] Smart reminders failed:", error);
            aiMonitor.logError(`Cron smart_reminders failed: ${msg}`, {}, { event: "cron_job", details: { job: "smart_reminders", status: "failed" } } as any);
        } finally { jobStatus.smartRemindersRunning = false; }
    }, { timezone: "Asia/Baghdad" });

    // ==================== Weekly Auto-Blog at 5:00 AM Sunday ====================
    cron.schedule("0 5 * * 0", async () => {
        if (jobStatus.autoBlogRunning) return;
        jobStatus.autoBlogRunning = true;
        const t = Date.now();
        aiMonitor.log({ event: "cron_job", level: "info", success: true, details: { job: "auto_blog", status: "started" } });
        try {
            const result = await autoBlogGenerator.runWeeklyBlogGeneration();
            if (result.success) {
                console.log(`[ScheduledJobs] ✅ Auto-blog created: ${result.blogGenerated?.title}`);
                aiMonitor.log({ event: "cron_job", level: "info", success: true, responseTimeMs: Date.now() - t, details: { job: "auto_blog", status: "completed", title: result.blogGenerated?.title } });
            } else {
                console.log(`[ScheduledJobs] ⚠️ Auto-blog failed: ${result.error}`);
                aiMonitor.logError(`Auto-blog cron failed: ${result.error}`, {}, { event: "cron_job", responseTimeMs: Date.now() - t, details: { job: "auto_blog", status: "failed", error: result.error } } as any);
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error("[ScheduledJobs] Auto-blog job failed:", error);
            aiMonitor.logError(`Cron auto_blog crashed: ${msg}`, {}, { event: "cron_job", details: { job: "auto_blog", status: "failed" } } as any);
        } finally { jobStatus.autoBlogRunning = false; }
    }, { timezone: "Asia/Baghdad" });

    console.log("[ScheduledJobs] Cron jobs initialized successfully");
    console.log("  - 🧠 Missing Embeddings: 1:30 AM (Asia/Baghdad)");
    console.log("  - Daily Predictions: 2:00 AM (Asia/Baghdad)");
    console.log("  - Churn Analysis: 3:00 AM (Asia/Baghdad)");
    console.log("  - Conversions Check: 4:00 AM (Asia/Baghdad)");
    console.log("  - 🔔 Smart Reminders: 4:30 AM (Asia/Baghdad)");
    console.log("  - 📝 Weekly Auto-Blog: Sunday 5:00 AM (Asia/Baghdad)");
}

/**
 * Get current job status
 */
export function getJobStatus(): typeof jobStatus {
    return { ...jobStatus };
}

/**
 * Manually trigger a job (for testing/admin)
 */
export async function triggerJob(
    jobName: "predictions" | "churn" | "conversions" | "autoblog" | "embeddings" | "smart_reminders" | "pricing" | "email_campaigns"
): Promise<{ success: boolean; message: string; result?: unknown }> {
    try {
        switch (jobName) {
            case "predictions":
                if (jobStatus.predictionsRunning) {
                    return { success: false, message: "Job already running" };
                }
                jobStatus.predictionsRunning = true;
                const predResult = await predictiveAnalytics.runDailyPredictions();
                jobStatus.predictionsRunning = false;
                return { success: true, message: "Predictions completed", result: predResult };

            case "churn":
                if (jobStatus.churnRunning) {
                    return { success: false, message: "Job already running" };
                }
                jobStatus.churnRunning = true;
                const churnResult = await churnDetector.analyzeAllUsers();
                jobStatus.churnRunning = false;
                return { success: true, message: "Churn analysis completed", result: churnResult };

            case "conversions":
                const convResult = await predictiveAnalytics.checkConversions();
                return { success: true, message: "Conversions check completed", result: convResult };

            case "autoblog":
                if (jobStatus.autoBlogRunning) {
                    return { success: false, message: "Auto-blog job already running" };
                }
                jobStatus.autoBlogRunning = true;
                const blogResult = await autoBlogGenerator.runWeeklyBlogGeneration();
                jobStatus.autoBlogRunning = false;
                return {
                    success: blogResult.success,
                    message: blogResult.success ? "Auto-blog created successfully" : blogResult.error || "Failed",
                    result: blogResult.blogGenerated
                };

            case "embeddings":
                if (jobStatus.embeddingsRunning) {
                    return { success: false, message: "Embeddings job already running" };
                }
                jobStatus.embeddingsRunning = true;
                const embResult = await embeddingGenerator.generateMissingEmbeddings();
                jobStatus.embeddingsRunning = false;
                return { success: true, message: "Missing embeddings generated", result: embResult };

            case "smart_reminders":
                if (jobStatus.smartRemindersRunning) {
                    return { success: false, message: "Smart reminders already running" };
                }
                jobStatus.smartRemindersRunning = true;
                const reminderResult = await smartNotifications.sendReplenishmentReminders();
                jobStatus.smartRemindersRunning = false;
                return { success: true, message: "Smart reminders sent", result: reminderResult };

            case "pricing":
                return { success: true, message: "Pricing agent not implemented yet" };

            case "email_campaigns":
                return { success: true, message: "Email campaigns agent not implemented yet" };

            default:
                return { success: false, message: `Unknown job: ${jobName}` };
        }
    } catch (error) {
        jobStatus.predictionsRunning = false;
        jobStatus.churnRunning = false;
        jobStatus.autoBlogRunning = false;
        jobStatus.embeddingsRunning = false;
        jobStatus.smartRemindersRunning = false;
        return {
            success: false,
            message: error instanceof Error ? error.message : "Job failed",
        };
    }
}

