import { db } from "../db.js";
import {
    aiEmailMetrics,
    churnPredictions,
    users,
    type InsertAIEmailMetric,
} from "../../shared/schema.js";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { contentGenerator } from "./content-generator.js";

/**
 * Email Campaign AI Service
 * يدير حملات البريد الذكية بناءً على سلوك العملاء
 */
export class EmailCampaignAI {

    /**
     * إنشاء حملة بريد إلكتروني
     */
    async createCampaign(params: {
        name: string;
        type: "welcome" | "promotional" | "cart_reminder" | "re_engagement" | "churn_prevention";
        targetAudience?: "all" | "high_risk" | "new_customers" | "inactive";
        context?: Record<string, unknown>;
    }): Promise<{
        campaignId: string;
        emailContent: {
            subject: string;
            preheader: string;
            body: string;
            ctaText: string;
        };
        targetUsers: number;
    }> {
        try {
            // Get target audience
            const targetUsers = await this.getTargetAudience(params.targetAudience || "all");

            // Generate email content
            const emailContent = await contentGenerator.generateEmailContent(
                params.type === "churn_prevention" ? "re_engagement" : params.type,
                {
                    ...params.context,
                    audienceSize: targetUsers.length,
                }
            );

            // Create campaign metrics record
            const campaignId = `campaign_${Date.now()}`;

            // Save initial metrics for tracking
            for (const user of targetUsers) {
                await this.saveMetrics({
                    campaignId,
                    userId: user.id,
                    emailType: params.type,
                    subject: emailContent.subject,
                    status: "scheduled",
                    sentAt: new Date(),
                });
            }

            return {
                campaignId,
                emailContent,
                targetUsers: targetUsers.length,
            };
        } catch (error) {
            console.error("Error creating campaign:", error);
            throw error;
        }
    }

    /**
     * الحصول على الجمهور المستهدف
     */
    private async getTargetAudience(
        audience: "all" | "high_risk" | "new_customers" | "inactive"
    ): Promise<Array<{ id: string; email: string }>> {
        try {
            switch (audience) {
                case "high_risk":
                    // Get users with high churn risk
                    const highRisk = await db
                        .select({
                            id: users.id,
                            email: users.email,
                        })
                        .from(users)
                        .innerJoin(churnPredictions, eq(users.id, churnPredictions.userId))
                        .where(
                            sql`${churnPredictions.riskLevel} IN ('high', 'critical')`
                        )
                        .limit(100);
                    return highRisk;

                case "new_customers":
                    // Users registered in last 7 days
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                    const newUsers = await db
                        .select({
                            id: users.id,
                            email: users.email,
                        })
                        .from(users)
                        .where(gte(users.createdAt, sevenDaysAgo))
                        .limit(100);
                    return newUsers;

                case "inactive":
                    // Users with no recent activity (last login > 30 days ago)
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                    const inactiveUsers = await db
                        .select({
                            id: users.id,
                            email: users.email,
                        })
                        .from(users)
                        .where(
                            sql`${users.createdAt} < ${thirtyDaysAgo}`
                        )
                        .limit(100);
                    return inactiveUsers;

                default:
                    const allUsers = await db
                        .select({
                            id: users.id,
                            email: users.email,
                        })
                        .from(users)
                        .limit(500);
                    return allUsers;
            }
        } catch (error) {
            console.error("Error getting target audience:", error);
            throw error;
        }
    }

    /**
     * حفظ مقاييس البريد
     */
    async saveMetrics(data: InsertAIEmailMetric): Promise<void> {
        try {
            await db.insert(aiEmailMetrics).values(data);
        } catch (error) {
            console.error("Error saving email metrics:", error);
            throw error;
        }
    }

    /**
     * تتبع تفاعل البريد
     */
    async trackInteraction(
        campaignId: string,
        userId: string,
        action: "opened" | "clicked" | "unsubscribed" | "converted"
    ): Promise<void> {
        try {
            const updateData: Record<string, Date> = {};

            switch (action) {
                case "opened":
                    updateData.openedAt = new Date();
                    break;
                case "clicked":
                    updateData.clickedAt = new Date();
                    break;
                case "unsubscribed":
                    updateData.unsubscribedAt = new Date();
                    break;
                case "converted":
                    updateData.convertedAt = new Date();
                    break;
            }

            await db
                .update(aiEmailMetrics)
                .set(updateData)
                .where(
                    and(
                        eq(aiEmailMetrics.campaignId, campaignId),
                        eq(aiEmailMetrics.userId, userId)
                    )
                );
        } catch (error) {
            console.error("Error tracking interaction:", error);
            throw error;
        }
    }

    /**
     * الحصول على إحصائيات الحملة
     */
    async getCampaignStats(campaignId: string): Promise<{
        total: number;
        sent: number;
        opened: number;
        clicked: number;
        converted: number;
        unsubscribed: number;
        openRate: number;
        clickRate: number;
        conversionRate: number;
    }> {
        try {
            const metrics = await db
                .select()
                .from(aiEmailMetrics)
                .where(eq(aiEmailMetrics.campaignId, campaignId));

            const total = metrics.length;
            const sent = metrics.filter((m) => m.sentAt).length;
            const opened = metrics.filter((m) => m.openedAt).length;
            const clicked = metrics.filter((m) => m.clickedAt).length;
            const converted = metrics.filter((m) => m.convertedAt).length;
            const unsubscribed = metrics.filter((m) => m.unsubscribedAt).length;

            return {
                total,
                sent,
                opened,
                clicked,
                converted,
                unsubscribed,
                openRate: total > 0 ? Math.round((opened / total) * 100) : 0,
                clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
                conversionRate: clicked > 0 ? Math.round((converted / clicked) * 100) : 0,
            };
        } catch (error) {
            console.error("Error getting campaign stats:", error);
            throw error;
        }
    }

    /**
     * الحصول على جميع الحملات
     */
    async getAllCampaigns(): Promise<
        Array<{
            campaignId: string;
            emailType: string;
            subject: string;
            sentAt: Date;
            recipientCount: number;
        }>
    > {
        try {
            const campaigns = await db
                .select({
                    campaignId: aiEmailMetrics.campaignId,
                    emailType: aiEmailMetrics.emailType,
                    subject: aiEmailMetrics.subject,
                    sentAt: aiEmailMetrics.sentAt,
                })
                .from(aiEmailMetrics)
                .groupBy(
                    aiEmailMetrics.campaignId,
                    aiEmailMetrics.emailType,
                    aiEmailMetrics.subject,
                    aiEmailMetrics.sentAt
                )
                .orderBy(desc(aiEmailMetrics.sentAt));

            // Get recipient counts
            const result = [];
            for (const campaign of campaigns) {
                if (!campaign.campaignId) continue;

                const stats = await this.getCampaignStats(campaign.campaignId);
                result.push({
                    ...campaign,
                    recipientCount: stats.total,
                });
            }

            return result;
        } catch (error) {
            console.error("Error getting campaigns:", error);
            throw error;
        }
    }
}

// Export singleton instance
export const emailCampaignAI = new EmailCampaignAI();
