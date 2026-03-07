import cron from "node-cron";
import { predictiveAnalytics } from "../services/predictive-analytics.js";
import { churnDetector } from "../services/churn-detector.js";
import { autoBlogGenerator } from "../services/auto-blog-generator.js";
import { embeddingGenerator } from "../services/embedding-generator.js";
import { smartNotifications } from "../services/smart-notifications.js";
import { aiMonitor } from "../services/ai-monitor.js";
import { emailCampaignAI } from "../services/email-campaign-ai.js";
import { sendEmail } from "../utils/email.js";

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
    emailCampaignsRunning: false,
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

    // ==================== AI Notification Engine at 4:30 AM ====================
    cron.schedule("30 4 * * *", async () => {
        if (jobStatus.smartRemindersRunning) return;
        jobStatus.smartRemindersRunning = true;
        const t = Date.now();
        aiMonitor.log({ event: "cron_job", level: "info", success: true, details: { job: "ai_notifications", status: "started" } });
        try {
            const result = await smartNotifications.runAINotificationEngine();
            console.log(`[ScheduledJobs] AI Notifications: ${result.totalProcessed} processed, ${result.pushSent} push, ${result.skippedFrequencyCap} freq-capped`);
            aiMonitor.log({ event: "notification_sent", level: "info", success: true, responseTimeMs: Date.now() - t, details: { ...result } });
            aiMonitor.log({ event: "cron_job", level: "info", success: true, responseTimeMs: Date.now() - t, details: { job: "ai_notifications", status: "completed", ...result } });
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error("[ScheduledJobs] AI Notifications failed:", error);
            aiMonitor.logError(`Cron ai_notifications failed: ${msg}`, {}, { event: "cron_job", details: { job: "ai_notifications", status: "failed" } } as any);
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

    // ==================== Weekly Email Campaigns at 10:00 AM Monday ====================
    cron.schedule("0 10 * * 1", async () => {
        if (jobStatus.emailCampaignsRunning) return;
        jobStatus.emailCampaignsRunning = true;
        const t = Date.now();
        aiMonitor.log({ event: "cron_job", level: "info", success: true, details: { job: "email_campaigns", status: "started" } });
        try {
            const result = await runWeeklyEmailCampaign();
            console.log(`[ScheduledJobs] ✅ Email campaign: ${result.emailsSent} emails sent to ${result.targetUsers} users`);
            aiMonitor.log({ event: "email_campaign", level: "info", success: true, responseTimeMs: Date.now() - t, details: { ...result } });
            aiMonitor.log({ event: "cron_job", level: "info", success: true, responseTimeMs: Date.now() - t, details: { job: "email_campaigns", status: "completed", ...result } });
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error("[ScheduledJobs] Email campaign failed:", error);
            aiMonitor.logError(`Cron email_campaigns failed: ${msg}`, {}, { event: "cron_job", details: { job: "email_campaigns", status: "failed" } } as any);
        } finally { jobStatus.emailCampaignsRunning = false; }
    }, { timezone: "Asia/Baghdad" });

    console.log("[ScheduledJobs] Cron jobs initialized successfully");
    console.log("  - 🧠 Missing Embeddings: 1:30 AM (Asia/Baghdad)");
    console.log("  - Daily Predictions: 2:00 AM (Asia/Baghdad)");
    console.log("  - Churn Analysis: 3:00 AM (Asia/Baghdad)");
    console.log("  - Conversions Check: 4:00 AM (Asia/Baghdad)");
    console.log("  - 🧠 AI Notification Engine: 4:30 AM (Asia/Baghdad)");
    console.log("  - 📝 Weekly Auto-Blog: Sunday 5:00 AM (Asia/Baghdad)");
    console.log("  - 📧 Weekly Email Campaign: Monday 10:00 AM (Asia/Baghdad)");
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
                if (jobStatus.emailCampaignsRunning) {
                    return { success: false, message: "Email campaigns already running" };
                }
                jobStatus.emailCampaignsRunning = true;
                const emailResult = await runWeeklyEmailCampaign();
                jobStatus.emailCampaignsRunning = false;
                return {
                    success: true,
                    message: `تم إرسال ${emailResult.emailsSent} إيميل لـ ${emailResult.targetUsers} مستخدم`,
                    result: emailResult,
                };

            default:
                return { success: false, message: `Unknown job: ${jobName}` };
        }
    } catch (error) {
        jobStatus.predictionsRunning = false;
        jobStatus.churnRunning = false;
        jobStatus.autoBlogRunning = false;
        jobStatus.embeddingsRunning = false;
        jobStatus.smartRemindersRunning = false;
        jobStatus.emailCampaignsRunning = false;
        return {
            success: false,
            message: error instanceof Error ? error.message : "Job failed",
        };
    }
}

/**
 * Run weekly email campaign — identifies target users, generates AI content, sends emails
 */
async function runWeeklyEmailCampaign(): Promise<{
    campaignId: string;
    targetUsers: number;
    emailsSent: number;
    emailsFailed: number;
    campaignType: string;
}> {
    console.log("[EmailCampaign] Starting weekly email campaign...");

    // Step 1: Create campaign (targets high-risk churn users first, then all)
    let campaignType: "churn_prevention" | "promotional" = "churn_prevention";
    let targetAudience: "high_risk" | "all" | "inactive" = "high_risk";

    // Try to create a churn prevention campaign first
    let campaign = await emailCampaignAI.createCampaign({
        name: `weekly_campaign_${new Date().toISOString().split("T")[0]}`,
        type: campaignType,
        targetAudience,
        context: { week: getWeekNumber(), autoGenerated: true },
    });

    // If no high-risk users, fall back to promotional for inactive
    if (campaign.targetUsers === 0) {
        campaignType = "promotional";
        targetAudience = "inactive";
        campaign = await emailCampaignAI.createCampaign({
            name: `weekly_promo_${new Date().toISOString().split("T")[0]}`,
            type: campaignType,
            targetAudience,
            context: { week: getWeekNumber(), autoGenerated: true },
        });
    }

    console.log(`[EmailCampaign] Campaign ${campaign.campaignId} — ${campaign.targetUsers} target users (${campaignType})`);

    if (campaign.targetUsers === 0) {
        console.log("[EmailCampaign] No target users found, skipping send.");
        return {
            campaignId: campaign.campaignId,
            targetUsers: 0,
            emailsSent: 0,
            emailsFailed: 0,
            campaignType,
        };
    }

    // Step 2: Build the HTML email
    const baseUrl = process.env.VITE_PUBLIC_BASE_URL || "https://www.aquavoiq.com";
    const logoUrl = `${baseUrl}/logo_aquavo.png`;

    const emailHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Tajawal', Arial, sans-serif; background-color: #f0fdf4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 40px 20px; text-align: center; color: white; }
        .content { padding: 40px 30px; color: #334155; line-height: 1.8; }
        .btn { display: block; width: fit-content; margin: 20px auto 0; background-color: #10b981; color: white; padding: 14px 32px; border-radius: 99px; text-decoration: none; font-weight: bold; }
        .footer { background-color: #f1f5f9; padding: 20px; text-align: center; color: #94a3b8; font-size: 13px; }
        .logo-img { max-width: 150px; margin-bottom: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${logoUrl}" alt="AQUAVO" class="logo-img">
            <h1 style="margin:0; font-size: 24px;">${campaign.emailContent.subject}</h1>
            <p style="margin-top:10px; opacity:0.9;">${campaign.emailContent.preheader}</p>
        </div>
        <div class="content">
            ${campaign.emailContent.body}
            <a href="${baseUrl}" class="btn">${campaign.emailContent.ctaText}</a>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} AQUAVO. جميع الحقوق محفوظة.</p>
            <p>صنع بحب 💚 لأجل هواة الأسماك في العراق</p>
        </div>
    </div>
</body>
</html>`;

    // Step 3: Send emails (in batches of 5 to avoid SMTP limits)
    // Get target users to send to
    const allCampaignMetrics = await emailCampaignAI.getCampaignStats(campaign.campaignId);
    let emailsSent = 0;
    let emailsFailed = 0;

    // Fetch users for this campaign from the database
    const dbInstance = (await import("../db.js")).db;
    const { aiEmailMetrics, users } = await import("../../shared/schema.js");
    const { eq } = await import("drizzle-orm");

    if (!dbInstance) {
        console.error("[EmailCampaign] Database not available");
        return {
            campaignId: campaign.campaignId,
            targetUsers: campaign.targetUsers,
            emailsSent: 0,
            emailsFailed: 0,
            campaignType,
        };
    }

    const campaignRecipients = await dbInstance
        .select({
            userId: aiEmailMetrics.userId,
            email: users.email,
        })
        .from(aiEmailMetrics)
        .innerJoin(users, eq(aiEmailMetrics.userId, users.id))
        .where(eq(aiEmailMetrics.campaignId, campaign.campaignId))
        .limit(50); // Max 50 emails per campaign cycle

    for (const recipient of campaignRecipients) {
        if (!recipient.email) continue;

        try {
            const success = await sendEmail({
                to: recipient.email,
                subject: campaign.emailContent.subject,
                html: emailHtml,
                text: `${campaign.emailContent.preheader}\n\n${campaign.emailContent.body}\n\nتسوق الآن: ${baseUrl}`,
            });

            if (success) {
                emailsSent++;
                // Track as sent
                await emailCampaignAI.trackInteraction(campaign.campaignId, recipient.userId, "opened");
            } else {
                emailsFailed++;
            }

            // Small delay between emails to avoid SMTP throttling
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
            emailsFailed++;
            console.error(`[EmailCampaign] Failed to send to ${recipient.email}:`, err);
        }
    }

    console.log(`[EmailCampaign] ✅ Done — Sent: ${emailsSent}, Failed: ${emailsFailed}`);

    return {
        campaignId: campaign.campaignId,
        targetUsers: campaign.targetUsers,
        emailsSent,
        emailsFailed,
        campaignType,
    };
}

/** Get ISO week number of current date */
function getWeekNumber(): number {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

