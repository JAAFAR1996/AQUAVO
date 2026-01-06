import cron from "node-cron";
import { predictiveAnalytics } from "../services/predictive-analytics.js";
import { churnDetector } from "../services/churn-detector.js";

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
        timezone: "Asia/Riyadh", // Saudi Arabia timezone
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
        timezone: "Asia/Riyadh",
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
        timezone: "Asia/Riyadh",
    });

    console.log("[ScheduledJobs] Cron jobs initialized successfully");
    console.log("  - Daily Predictions: 2:00 AM (Asia/Riyadh)");
    console.log("  - Churn Analysis: 3:00 AM (Asia/Riyadh)");
    console.log("  - Conversions Check: 4:00 AM (Asia/Riyadh)");
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
    jobName: "predictions" | "churn" | "conversions"
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

            default:
                return { success: false, message: `Unknown job: ${jobName}` };
        }
    } catch (error) {
        jobStatus.predictionsRunning = false;
        jobStatus.churnRunning = false;
        return {
            success: false,
            message: error instanceof Error ? error.message : "Job failed",
        };
    }
}
