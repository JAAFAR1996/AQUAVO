import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../db";
import {
    competitorPrices,
    pricingRules,
    products,
    type InsertCompetitorPrice,
} from "../../shared/schema";
import { eq, desc, and } from "drizzle-orm";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Competitive Pricer Service
 * يراقب أسعار المنافسين ويقترح أسعار مثالية
 */
export class CompetitivePricer {
    private model;

    constructor() {
        this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    }

    /**
     * إضافة سعر منافس
     */
    async addCompetitorPrice(params: {
        productId: string;
        competitorName: string;
        competitorUrl?: string;
        price: number;
        currency?: string;
    }): Promise<void> {
        try {
            // Get our current price
            const product = await db
                .select({ price: products.price })
                .from(products)
                .where(eq(products.id, params.productId))
                .limit(1);

            const ourPrice = product.length > 0 ? parseFloat(product[0].price) : 0;
            const competitorPrice = params.price;
            const priceDifference = ourPrice - competitorPrice;
            const priceDifferencePercent = ourPrice > 0 ? (priceDifference / ourPrice) * 100 : 0;

            await db!.insert(competitorPrices).values({
                productId: params.productId,
                competitorName: params.competitorName,
                competitorUrl: params.competitorUrl,
                competitorPrice: params.price.toString(),
                ourPrice: ourPrice.toString(),
                priceDifference: priceDifference.toString(),
                priceDifferencePercent: priceDifferencePercent.toString(),
                competitive: ourPrice <= competitorPrice,
                lastCheckedAt: new Date(),
                createdAt: new Date(),
            });
        } catch (error) {
            console.error("Error adding competitor price:", error);
            throw error;
        }
    }

    /**
     * تحليل أسعار منتج
     */
    async analyzePricing(productId: string): Promise<{
        ourPrice: number;
        avgCompetitorPrice: number;
        lowestCompetitorPrice: number;
        highestCompetitorPrice: number;
        pricePosition: "lowest" | "competitive" | "average" | "high";
        suggestedPrice: number;
        reasoning: string;
    }> {
        try {
            // Get our product
            const product = await db
                .select()
                .from(products)
                .where(eq(products.id, productId))
                .limit(1);

            if (product.length === 0) {
                throw new Error("Product not found");
            }

            const ourPrice = parseFloat(product[0].price);

            // Get competitor prices
            const competitors = await db!
                .select()
                .from(competitorPrices)
                .where(eq(competitorPrices.productId, productId))
                .orderBy(desc(competitorPrices.lastCheckedAt));

            if (competitors.length === 0) {
                return {
                    ourPrice,
                    avgCompetitorPrice: 0,
                    lowestCompetitorPrice: 0,
                    highestCompetitorPrice: 0,
                    pricePosition: "competitive",
                    suggestedPrice: ourPrice,
                    reasoning: "لا توجد بيانات أسعار منافسين",
                };
            }

            const prices = competitors.map((c: { competitorPrice: string }) => parseFloat(c.competitorPrice));
            const avgCompetitorPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
            const lowestCompetitorPrice = Math.min(...prices);
            const highestCompetitorPrice = Math.max(...prices);

            // Determine price position
            let pricePosition: "lowest" | "competitive" | "average" | "high";
            if (ourPrice <= lowestCompetitorPrice) {
                pricePosition = "lowest";
            } else if (ourPrice <= avgCompetitorPrice * 0.95) {
                pricePosition = "competitive";
            } else if (ourPrice <= avgCompetitorPrice * 1.05) {
                pricePosition = "average";
            } else {
                pricePosition = "high";
            }

            // Use AI to suggest optimal price
            const prompt = `
أنت خبير تسعير لمتجر أحواض الأسماك.

معلومات المنتج: ${product[0].name}
سعرنا الحالي: ${ourPrice} دينار
متوسط سعر المنافسين: ${avgCompetitorPrice.toFixed(0)} دينار
أقل سعر منافس: ${lowestCompetitorPrice} دينار
أعلى سعر منافس: ${highestCompetitorPrice} دينار

اقترح سعر مثالي يحقق:
1. التنافسية في السوق
2. هامش ربح معقول (15-25%)
3. جذب العملاء

أجب بصيغة JSON:
{
  "suggestedPrice": 0,
  "reasoning": "..."
}
`;

            const result = await this.model.generateContent(prompt);
            const text = result.response.text();

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            let suggestedPrice = ourPrice;
            let reasoning = "";

            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                suggestedPrice = parsed.suggestedPrice;
                reasoning = parsed.reasoning;
            }

            return {
                ourPrice,
                avgCompetitorPrice,
                lowestCompetitorPrice,
                highestCompetitorPrice,
                pricePosition,
                suggestedPrice,
                reasoning,
            };
        } catch (error) {
            console.error("Error analyzing pricing:", error);
            throw error;
        }
    }

    /**
     * إنشاء قاعدة تسعير
     */
    async createPricingRule(params: {
        productId?: string;
        category?: string;
        ruleType: "match_lowest" | "beat_by_percent" | "fixed_margin";
        value: number;
        minPrice?: number;
        maxPrice?: number;
    }): Promise<{ ruleId: string }> {
        try {
            const [rule] = await db
                .insert(pricingRules)
                .values({
                    productId: params.productId,
                    category: params.category,
                    ruleType: params.ruleType,
                    value: params.value.toString(),
                    minPrice: params.minPrice?.toString(),
                    maxPrice: params.maxPrice?.toString(),
                    isActive: true,
                    createdAt: new Date(),
                })
                .returning({ id: pricingRules.id });

            return { ruleId: rule.id };
        } catch (error) {
            console.error("Error creating pricing rule:", error);
            throw error;
        }
    }

    /**
     * تطبيق قواعد التسعير
     */
    async applyPricingRules(): Promise<{
        productsUpdated: number;
        errors: number;
    }> {
        console.log("[CompetitivePricer] Applying pricing rules...");

        try {
            const rules = await db
                .select()
                .from(pricingRules)
                .where(eq(pricingRules.isActive, true));

            let updated = 0;
            let errors = 0;

            for (const rule of rules) {
                try {
                    // Get products to apply rule
                    let productsToUpdate;

                    if (rule.productId) {
                        productsToUpdate = await db
                            .select()
                            .from(products)
                            .where(eq(products.id, rule.productId));
                    } else if (rule.category) {
                        productsToUpdate = await db
                            .select()
                            .from(products)
                            .where(eq(products.category, rule.category));
                    } else {
                        continue;
                    }

                    for (const product of productsToUpdate) {
                        const analysis = await this.analyzePricing(product.id);
                        let newPrice: number;

                        switch (rule.ruleType) {
                            case "match_lowest":
                                newPrice = analysis.lowestCompetitorPrice;
                                break;
                            case "beat_by_percent":
                                newPrice =
                                    analysis.lowestCompetitorPrice *
                                    (1 - parseFloat(rule.value) / 100);
                                break;
                            case "fixed_margin":
                                // Assuming cost is 70% of current price
                                const estimatedCost = parseFloat(product.price) * 0.7;
                                newPrice = estimatedCost * (1 + parseFloat(rule.value) / 100);
                                break;
                            default:
                                continue;
                        }

                        // Apply min/max constraints
                        if (rule.minPrice && newPrice < parseFloat(rule.minPrice)) {
                            newPrice = parseFloat(rule.minPrice);
                        }
                        if (rule.maxPrice && newPrice > parseFloat(rule.maxPrice)) {
                            newPrice = parseFloat(rule.maxPrice);
                        }

                        // Update product price
                        await db
                            .update(products)
                            .set({ price: newPrice.toFixed(0) })
                            .where(eq(products.id, product.id));

                        updated++;
                    }
                } catch (error) {
                    console.error(`Error applying rule ${rule.id}:`, error);
                    errors++;
                }
            }

            console.log(
                `[CompetitivePricer] Complete: ${updated} products updated, ${errors} errors`
            );

            return { productsUpdated: updated, errors };
        } catch (error) {
            console.error("[CompetitivePricer] Failed:", error);
            throw error;
        }
    }

    /**
     * الحصول على أسعار المنافسين لمنتج
     */
    async getCompetitorPrices(productId: string): Promise<
        Array<{
            competitorName: string;
            competitorPrice: string;
            lastCheckedAt: Date;
        }>
    > {
        try {
            return await db!
                .select({
                    competitorName: competitorPrices.competitorName,
                    competitorPrice: competitorPrices.competitorPrice,
                    lastCheckedAt: competitorPrices.lastCheckedAt,
                })
                .from(competitorPrices)
                .where(eq(competitorPrices.productId, productId))
                .orderBy(desc(competitorPrices.lastCheckedAt));
        } catch (error) {
            console.error("Error getting competitor prices:", error);
            throw error;
        }
    }
}

// Export singleton instance
export const competitivePricer = new CompetitivePricer();
