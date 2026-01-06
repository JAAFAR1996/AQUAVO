import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../db.js";
import {
    churnPredictions,
    orders,
    users,
    sentimentHistory,
    productInteractions,
} from "../../shared/schema.js";
import { eq, desc, and, gte, lt, sql, count } from "drizzle-orm";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Churn Prediction Indicators
 */
interface ChurnIndicators {
    daysSinceLastPurchase: number;
    engagementDrop: number;
    negativeSentiment: boolean;
    unsubscribed: boolean;
    cartAbandonments: number;
}

/**
 * Churn Analysis Result
 */
interface ChurnAnalysis {
    userId: string;
    churnScore: number;
    riskLevel: "low" | "medium" | "high" | "critical";
    indicators: ChurnIndicators;
    contributingFactors: Array<{
        factor: string;
        weight: number;
        description: string;
    }>;
    suggestedAction: string;
}

/**
 * Churn Detector Service
 * يكتشف العملاء المعرضين لخطر المغادرة
 */
export class ChurnDetector {
    private model;

    constructor() {
        this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    }

    /**
     * تحليل مستخدم واحد
     */
    async analyzeUser(userId: string): Promise<ChurnAnalysis> {
        try {
            const indicators = await this.calculateIndicators(userId);
            const { churnScore, contributingFactors } = this.calculateChurnScore(indicators);
            const riskLevel = this.getRiskLevel(churnScore);
            const suggestedAction = this.suggestAction(riskLevel, contributingFactors);

            return {
                userId,
                churnScore,
                riskLevel,
                indicators,
                contributingFactors,
                suggestedAction,
            };
        } catch (error) {
            console.error(`Error analyzing user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * حساب مؤشرات الـ Churn
     */
    private async calculateIndicators(userId: string): Promise<ChurnIndicators> {
        // 1. Days since last purchase
        const lastOrder = await db
            .select({ createdAt: orders.createdAt })
            .from(orders)
            .where(eq(orders.userId, userId))
            .orderBy(desc(orders.createdAt))
            .limit(1);

        const daysSinceLastPurchase = lastOrder.length > 0
            ? Math.round(
                (Date.now() - new Date(lastOrder[0].createdAt!).getTime()) /
                (1000 * 60 * 60 * 24)
            )
            : 365; // If no orders, assume high churn risk

        // 2. Engagement drop (compare last 30 days vs previous 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const recentInteractions = await db
            .select({ count: count() })
            .from(productInteractions)
            .where(
                and(
                    eq(productInteractions.userId, userId),
                    gte(productInteractions.createdAt, thirtyDaysAgo)
                )
            );

        const previousInteractions = await db
            .select({ count: count() })
            .from(productInteractions)
            .where(
                and(
                    eq(productInteractions.userId, userId),
                    gte(productInteractions.createdAt, sixtyDaysAgo),
                    lt(productInteractions.createdAt, thirtyDaysAgo)
                )
            );

        const recent = Number(recentInteractions[0]?.count || 0);
        const previous = Number(previousInteractions[0]?.count || 1); // Avoid division by zero
        const engagementDrop = previous > 0
            ? Math.max(0, Math.round(((previous - recent) / previous) * 100))
            : 0;

        // 3. Negative sentiment check
        const recentSentiments = await db
            .select({ sentiment: sentimentHistory.sentiment, score: sentimentHistory.score })
            .from(sentimentHistory)
            .where(
                and(
                    eq(sentimentHistory.userId, userId),
                    gte(sentimentHistory.createdAt, thirtyDaysAgo)
                )
            )
            .orderBy(desc(sentimentHistory.createdAt))
            .limit(5);

        const negativeSentiment = recentSentiments.some(
            (s) => s.sentiment === "negative" || s.sentiment === "very_negative" ||
                parseFloat(s.score) < -0.5
        );

        // 4. Cart abandonments
        const cartAbandons = await db
            .select({ count: count() })
            .from(productInteractions)
            .where(
                and(
                    eq(productInteractions.userId, userId),
                    eq(productInteractions.interactionType, "cart_add"),
                    gte(productInteractions.createdAt, thirtyDaysAgo)
                )
            );

        const purchases = await db
            .select({ count: count() })
            .from(productInteractions)
            .where(
                and(
                    eq(productInteractions.userId, userId),
                    eq(productInteractions.interactionType, "purchase"),
                    gte(productInteractions.createdAt, thirtyDaysAgo)
                )
            );

        const cartAdds = Number(cartAbandons[0]?.count || 0);
        const purchaseCount = Number(purchases[0]?.count || 0);
        const cartAbandonments = Math.max(0, cartAdds - purchaseCount);

        return {
            daysSinceLastPurchase,
            engagementDrop,
            negativeSentiment,
            unsubscribed: false, // Would need email subscription data
            cartAbandonments,
        };
    }

    /**
     * حساب نسبة خطر المغادرة (0-100)
     */
    private calculateChurnScore(indicators: ChurnIndicators): {
        churnScore: number;
        contributingFactors: Array<{
            factor: string;
            weight: number;
            description: string;
        }>;
    } {
        const contributingFactors: Array<{
            factor: string;
            weight: number;
            description: string;
        }> = [];

        let score = 0;

        // Days since last purchase (max 35 points)
        if (indicators.daysSinceLastPurchase > 90) {
            score += 35;
            contributingFactors.push({
                factor: "inactivity",
                weight: 35,
                description: `لم يشتري منذ ${indicators.daysSinceLastPurchase} يوم`,
            });
        } else if (indicators.daysSinceLastPurchase > 60) {
            score += 25;
            contributingFactors.push({
                factor: "inactivity",
                weight: 25,
                description: `لم يشتري منذ ${indicators.daysSinceLastPurchase} يوم`,
            });
        } else if (indicators.daysSinceLastPurchase > 30) {
            score += 15;
            contributingFactors.push({
                factor: "inactivity",
                weight: 15,
                description: `لم يشتري منذ ${indicators.daysSinceLastPurchase} يوم`,
            });
        }

        // Engagement drop (max 25 points)
        if (indicators.engagementDrop > 50) {
            score += 25;
            contributingFactors.push({
                factor: "engagement_drop",
                weight: 25,
                description: `انخفاض التفاعل بنسبة ${indicators.engagementDrop}%`,
            });
        } else if (indicators.engagementDrop > 25) {
            score += 15;
            contributingFactors.push({
                factor: "engagement_drop",
                weight: 15,
                description: `انخفاض التفاعل بنسبة ${indicators.engagementDrop}%`,
            });
        }

        // Negative sentiment (max 20 points)
        if (indicators.negativeSentiment) {
            score += 20;
            contributingFactors.push({
                factor: "negative_sentiment",
                weight: 20,
                description: "رصد مشاعر سلبية في المحادثات الأخيرة",
            });
        }

        // Cart abandonments (max 20 points)
        if (indicators.cartAbandonments >= 3) {
            score += 20;
            contributingFactors.push({
                factor: "cart_abandonment",
                weight: 20,
                description: `${indicators.cartAbandonments} سلات متروكة`,
            });
        } else if (indicators.cartAbandonments >= 1) {
            score += 10;
            contributingFactors.push({
                factor: "cart_abandonment",
                weight: 10,
                description: `${indicators.cartAbandonments} سلة متروكة`,
            });
        }

        return { churnScore: Math.min(score, 100), contributingFactors };
    }

    /**
     * تحديد مستوى الخطر
     */
    private getRiskLevel(churnScore: number): "low" | "medium" | "high" | "critical" {
        if (churnScore >= 75) return "critical";
        if (churnScore >= 50) return "high";
        if (churnScore >= 25) return "medium";
        return "low";
    }

    /**
     * اقتراح إجراء مناسب
     */
    private suggestAction(
        riskLevel: "low" | "medium" | "high" | "critical",
        factors: Array<{ factor: string; weight: number; description: string }>
    ): string {
        const mainFactor = factors.length > 0 ? factors[0].factor : "general";

        const actions: Record<string, Record<string, string>> = {
            critical: {
                inactivity: "إرسال عرض خاص 30% للعودة + اتصال شخصي",
                engagement_drop: "إرسال استبيان رضا + كوبون تحفيزي",
                negative_sentiment: "تواصل فوري للاعتذار وحل المشكلة",
                cart_abandonment: "تذكير بالسلة + خصم 25% على المنتجات",
                general: "تواصل فوري من فريق الدعم",
            },
            high: {
                inactivity: "إرسال كوبون 20% + منتجات مقترحة",
                engagement_drop: "إرسال محتوى مخصص + عروض حصرية",
                negative_sentiment: "متابعة لحل أي مشاكل",
                cart_abandonment: "تذكير بالسلة + شحن مجاني",
                general: "حملة إعادة تفعيل",
            },
            medium: {
                inactivity: "إرسال نشرة بآخر المنتجات",
                engagement_drop: "تحسين تجربة المستخدم",
                negative_sentiment: "استبيان قصير",
                cart_abandonment: "تذكير بالسلة",
                general: "متابعة دورية",
            },
            low: {
                general: "الحفاظ على التواصل المنتظم",
            },
        };

        return actions[riskLevel]?.[mainFactor] || actions[riskLevel]?.general || "متابعة";
    }

    /**
     * حفظ تحليل الـ Churn
     */
    async saveAnalysis(analysis: ChurnAnalysis): Promise<void> {
        try {
            // Check if exists
            const existing = await db
                .select()
                .from(churnPredictions)
                .where(eq(churnPredictions.userId, analysis.userId))
                .limit(1);

            const data = {
                churnScore: analysis.churnScore.toString(),
                riskLevel: analysis.riskLevel,
                indicators: analysis.indicators,
                contributingFactors: analysis.contributingFactors,
                actionPlan: analysis.suggestedAction,
                lastAnalyzedAt: new Date(),
                updatedAt: new Date(),
            };

            if (existing.length > 0) {
                await db
                    .update(churnPredictions)
                    .set(data)
                    .where(eq(churnPredictions.userId, analysis.userId));
            } else {
                await db.insert(churnPredictions).values({
                    userId: analysis.userId,
                    ...data,
                    createdAt: new Date(),
                });
            }
        } catch (error) {
            console.error("Error saving churn analysis:", error);
            throw error;
        }
    }

    /**
     * الحصول على العملاء عالي الخطورة
     */
    async getHighRiskUsers(): Promise<
        Array<{
            userId: string;
            churnScore: string;
            riskLevel: string;
            actionPlan: string | null;
            lastAnalyzedAt: Date;
        }>
    > {
        try {
            return await db
                .select({
                    userId: churnPredictions.userId,
                    churnScore: churnPredictions.churnScore,
                    riskLevel: churnPredictions.riskLevel,
                    actionPlan: churnPredictions.actionPlan,
                    lastAnalyzedAt: churnPredictions.lastAnalyzedAt,
                })
                .from(churnPredictions)
                .where(
                    sql`${churnPredictions.riskLevel} IN ('high', 'critical')`
                )
                .orderBy(desc(churnPredictions.churnScore));
        } catch (error) {
            console.error("Error getting high risk users:", error);
            throw error;
        }
    }

    /**
     * تحليل جميع المستخدمين
     */
    async analyzeAllUsers(): Promise<{
        usersAnalyzed: number;
        highRisk: number;
        critical: number;
    }> {
        console.log("[ChurnDetector] Starting analysis for all users...");

        try {
            // Get all users
            const allUsers = await db
                .selectDistinct({ id: users.id })
                .from(users);

            let highRisk = 0;
            let critical = 0;

            for (const user of allUsers) {
                if (!user.id) continue;

                try {
                    const analysis = await this.analyzeUser(user.id);
                    await this.saveAnalysis(analysis);

                    if (analysis.riskLevel === "high") highRisk++;
                    if (analysis.riskLevel === "critical") critical++;
                } catch (error) {
                    console.error(`Error analyzing user ${user.id}:`, error);
                    // Continue with other users
                }
            }

            console.log(
                `[ChurnDetector] Completed: ${allUsers.length} users, ${highRisk} high risk, ${critical} critical`
            );

            return {
                usersAnalyzed: allUsers.length,
                highRisk,
                critical,
            };
        } catch (error) {
            console.error("[ChurnDetector] Analysis failed:", error);
            throw error;
        }
    }
}

// Export singleton instance
export const churnDetector = new ChurnDetector();
