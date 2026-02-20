import cron from "node-cron";
import { predictiveAnalytics } from "../services/predictive-analytics.js";
import { churnDetector } from "../services/churn-detector.js";
import { autoBlogGenerator } from "../services/auto-blog-generator.js";
import { embeddingGenerator } from "../services/embedding-generator.js";
import { smartNotifications } from "../services/smart-notifications.js";

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
        if (jobStatus.predictionsRunning) {
            console.log("[ScheduledJobs] Predictions job already running, skipping...");
            return;
        }

        console.log("[ScheduledJobs] Starting daily predictions job...");
        jobStatus.predictionsRunning = true;

        try {
            const result = await predictiveAnalytics.runDailyPredictions();
            console.log(
                `[ScheduledJobs] Predictions completed: ${result.usersAnalyzed} users, ${result.predictionsCreated} predictions`
            );
        } catch (error) {
            console.error("[ScheduledJobs] Predictions job failed:", error);
        } finally {
            jobStatus.predictionsRunning = false;
        }
    }, {
        timezone: "Asia/Baghdad",
    });

    // ==================== Churn Analysis at 3:00 AM ====================
    cron.schedule("0 3 * * *", async () => {
        if (jobStatus.churnRunning) {
            console.log("[ScheduledJobs] Churn job already running, skipping...");
            return;
        }

        console.log("[ScheduledJobs] Starting churn analysis job...");
        jobStatus.churnRunning = true;

        try {
            const result = await churnDetector.analyzeAllUsers();
            console.log(
                `[ScheduledJobs] Churn analysis completed: ${result.usersAnalyzed} users, ${result.highRisk} high risk, ${result.critical} critical`
            );
        } catch (error) {
            console.error("[ScheduledJobs] Churn job failed:", error);
        } finally {
            jobStatus.churnRunning = false;
        }
    }, {
        timezone: "Asia/Baghdad",
    });

    // ==================== Check Conversions at 4:00 AM ====================
    cron.schedule("0 4 * * *", async () => {
        console.log("[ScheduledJobs] Starting conversions check...");

        try {
            const conversions = await predictiveAnalytics.checkConversions();
            console.log(`[ScheduledJobs] Conversions check completed: ${conversions} conversions found`);
        } catch (error) {
            console.error("[ScheduledJobs] Conversions check failed:", error);
        }
    }, {
        timezone: "Asia/Baghdad",
    });

    // ==================== Generate Missing Embeddings at 1:30 AM ====================
    cron.schedule("30 1 * * *", async () => {
        if (jobStatus.embeddingsRunning) {
            console.log("[ScheduledJobs] Embeddings job already running, skipping...");
            return;
        }

        console.log("[ScheduledJobs] 🧠 Starting daily embedding generation for new products...");
        jobStatus.embeddingsRunning = true;

        try {
            const result = await embeddingGenerator.generateMissingEmbeddings();
            console.log(
                `[ScheduledJobs] Embeddings completed: ${result.success} generated, ${result.failed} failed`
            );
        } catch (error) {
            console.error("[ScheduledJobs] Embeddings job failed:", error);
        } finally {
            jobStatus.embeddingsRunning = false;
        }
    }, {
        timezone: "Asia/Baghdad",
    });

    // ==================== Smart Reminders at 4:30 AM (after predictions) ====================
    cron.schedule("30 4 * * *", async () => {
        if (jobStatus.smartRemindersRunning) {
            console.log("[ScheduledJobs] Smart reminders already running, skipping...");
            return;
        }

        console.log("[ScheduledJobs] 🔔 Starting smart reminder notifications...");
        jobStatus.smartRemindersRunning = true;

        try {
            const result = await smartNotifications.sendReplenishmentReminders();
            console.log(
                `[ScheduledJobs] Smart reminders completed: ${result.usersNotified} users, ${result.emailsSent} emails, ${result.pushSent} push`
            );
        } catch (error) {
            console.error("[ScheduledJobs] Smart reminders failed:", error);
        } finally {
            jobStatus.smartRemindersRunning = false;
        }
    }, {
        timezone: "Asia/Baghdad",
    });

    // ==================== Weekly Auto-Blog at 5:00 AM Sunday (Baghdad) ====================
    cron.schedule("0 5 * * 0", async () => {
        if (jobStatus.autoBlogRunning) {
            console.log("[ScheduledJobs] Auto-blog job already running, skipping...");
            return;
        }

        console.log("[ScheduledJobs] 📝 Starting weekly auto-blog generation...");
        jobStatus.autoBlogRunning = true;

        try {
            const result = await autoBlogGenerator.runWeeklyBlogGeneration();
            if (result.success) {
                console.log(`[ScheduledJobs] ✅ Auto-blog created: ${result.blogGenerated?.title}`);
            } else {
                console.log(`[ScheduledJobs] ⚠️ Auto-blog failed: ${result.error}`);
            }
        } catch (error) {
            console.error("[ScheduledJobs] Auto-blog job failed:", error);
        } finally {
            jobStatus.autoBlogRunning = false;
        }
    }, {
        timezone: "Asia/Baghdad",
    });

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

