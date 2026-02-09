import { groqClient } from "./groq-client.js";
import { db } from "../db.js";
import {
    generatedContent,
    products,
    type InsertGeneratedContent,
} from "../../shared/schema.js";
import { eq, desc } from "drizzle-orm";

/**
 * Content Generator Service
 * يولد محتوى تسويقي باستخدام الذكاء الاصطناعي
 */
export class ContentGenerator {

    /**
     * توليد وصف منتج
     */
    async generateProductDescription(productId: string): Promise<{
        shortDescription: string;
        longDescription: string;
        seoMeta: {
            title: string;
            description: string;
            keywords: string[];
        };
    }> {
        try {
            if (!db) throw new Error("Database not initialized");
            if (!groqClient.hasKeys()) {
                throw new Error("No Groq API keys configured");
            }

            // Get product info
            const product = await db
                .select()
                .from(products)
                .where(eq(products.id, productId))
                .limit(1);

            if (product.length === 0) {
                throw new Error("Product not found");
            }

            const p = product[0];

            const prompt = `
أنت خبير في كتابة محتوى تسويقي لمتجر أحواض الأسماك.

معلومات المنتج:
- الاسم: ${p.name}
- العلامة التجارية: ${p.brand || "غير محدد"}
- السعر: ${p.price} دينار عراقي
- الفئة: ${p.category || "عام"}
- الوصف الحالي: ${p.description || "لا يوجد"}

المطلوب:
1. وصف قصير (50-100 كلمة): جذاب ومختصر
2. وصف طويل (200-300 كلمة): تفصيلي مع الفوائد والاستخدامات
3. عنوان SEO (60 حرف كحد أقصى)
4. وصف SEO (155 حرف كحد أقصى)
5. كلمات مفتاحية (5-8 كلمات)

أجب بصيغة JSON فقط:
{
  "shortDescription": "...",
  "longDescription": "...",
  "seoTitle": "...",
  "seoDescription": "...",
  "keywords": ["...", "..."]
}
`;

            const text = await groqClient.chatText([{ role: "user", content: prompt }], {
                temperature: 0.7,
                maxTokens: 1024,
                model: "llama-3.1-8b-instant"
            });

            // Parse JSON response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("Failed to parse AI response");
            }

            const parsed = JSON.parse(jsonMatch[0]);

            // Save generated content
            await this.saveContent({
                contentType: "description", // Matched to schema enum
                productId: productId,
                generatedText: parsed.shortDescription,
                prompt: "Product Description Generation",
                metadata: {
                    shortDescription: parsed.shortDescription,
                    longDescription: parsed.longDescription,
                    seoTitle: parsed.seoTitle,
                    seoDescription: parsed.seoDescription,
                    keywords: parsed.keywords,
                } as any,
                status: "draft",
            });

            return {
                shortDescription: parsed.shortDescription,
                longDescription: parsed.longDescription,
                seoMeta: {
                    title: parsed.seoTitle,
                    description: parsed.seoDescription,
                    keywords: parsed.keywords,
                },
            };
        } catch (error) {
            console.error("Error generating product description:", error);
            throw error;
        }
    }

    /**
     * توليد منشور سوشيال ميديا
     */
    async generateSocialPost(
        productId: string,
        platform: "instagram" | "facebook" | "twitter"
    ): Promise<{
        text: string;
        hashtags: string[];
        callToAction: string;
    }> {
        try {
            if (!db) throw new Error("Database not initialized");
            if (!groqClient.hasKeys()) {
                throw new Error("No Groq API keys configured");
            }

            const product = await db
                .select()
                .from(products)
                .where(eq(products.id, productId))
                .limit(1);

            if (product.length === 0) {
                throw new Error("Product not found");
            }

            const p = product[0];

            const platformLimits = {
                instagram: 2200,
                facebook: 500,
                twitter: 280,
            };

            const prompt = `
أنت خبير سوشيال ميديا لمتجر أحواض الأسماك AQUAVO.

المنتج: ${p.name}
السمكة: ${p.price} دينار عراقي
المنصة: ${platform}
الحد الأقصى للحروف: ${platformLimits[platform]}

اكتب منشور جذاب باللغة العربية:
1. النص الأساسي (مع إيموجي مناسب)
2. 5-7 هاشتاقات عربية وإنجليزية
3. Call to Action قوي

أجب بصيغة JSON فقط:
{
  "text": "...",
  "hashtags": ["...", "..."],
  "callToAction": "..."
}
`;

            const text = await groqClient.chatText([{ role: "user", content: prompt }], {
                temperature: 0.8,
                maxTokens: 1024,
                model: "llama-3.1-8b-instant"
            });

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("Failed to parse AI response");
            }

            const parsed = JSON.parse(jsonMatch[0]);

            await this.saveContent({
                contentType: "social_post",
                productId: productId,
                generatedText: parsed.text,
                metadata: {
                    hashtags: parsed.hashtags,
                    callToAction: parsed.callToAction,
                    platform,
                } as any,
                status: "draft",
            });

            return parsed;
        } catch (error) {
            console.error("Error generating social post:", error);
            throw error;
        }
    }

    /**
     * توليد محتوى بريد إلكتروني
     */
    async generateEmailContent(
        type: "welcome" | "promotional" | "cart_reminder" | "re_engagement",
        context: Record<string, unknown>
    ): Promise<{
        subject: string;
        preheader: string;
        body: string;
        ctaText: string;
    }> {
        try {
            if (!db) throw new Error("Database not initialized");
            if (!groqClient.hasKeys()) {
                throw new Error("No Groq API keys configured");
            }

            const typePrompts = {
                welcome: "بريد ترحيبي للعميل الجديد",
                promotional: "عرض ترويجي جذاب",
                cart_reminder: "تذكير بالسلة المتروكة",
                re_engagement: "إعادة تفعيل عميل غير نشط",
            };

            const prompt = `
أنت خبير email marketing لمتجر أحواض الأسماك AQUAVO.

نوع البريد: ${typePrompts[type]}
السياق: ${JSON.stringify(context)}

اكتب بريد إلكتروني احترافي:
1. العنوان (subject): جذاب ومختصر (50 حرف)
2. Preheader: يظهر بعد العنوان (80 حرف)
3. نص البريد: واضح ومقنع
4. نص زر CTA: قوي ومحفز

أجب بصيغة JSON فقط:
{
  "subject": "...",
  "preheader": "...",
  "body": "...",
  "ctaText": "..."
}
`;

            const text = await groqClient.chatText([{ role: "user", content: prompt }], {
                temperature: 0.7,
                maxTokens: 1024,
                model: "llama-3.1-8b-instant"
            });

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("Failed to parse AI response");
            }

            const parsed = JSON.parse(jsonMatch[0]);

            await this.saveContent({
                contentType: "email",
                generatedText: parsed.body,
                metadata: {
                    type,
                    subject: parsed.subject,
                    preheader: parsed.preheader,
                    ctaText: parsed.ctaText,
                    ...context,
                } as any,
                status: "draft",
            });

            return parsed;
        } catch (error) {
            console.error("Error generating email content:", error);
            throw error;
        }
    }

    /**
     * حفظ المحتوى المولد
     */
    async saveContent(data: InsertGeneratedContent): Promise<void> {
        try {
            if (!db) throw new Error("Database not initialized");
            await db.insert(generatedContent).values({
                ...data,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        } catch (error) {
            console.error("Error saving content:", error);
            throw error;
        }
    }

    /**
     * الحصول على المحتوى المولد
     */
    async getGeneratedContent(
        contentType?: string,
        status?: string
    ): Promise<
        Array<{
            id: string;
            contentType: string;
            content: unknown;
            status: string | null;
            createdAt: Date;
        }>
    > {
        try {
            if (!db) throw new Error("Database not initialized");
            let query = db.select().from(generatedContent);

            if (contentType) {
                query = query.where(eq(generatedContent.contentType, contentType)) as typeof query;
            }
            if (status) {
                query = query.where(eq(generatedContent.status, status)) as typeof query;
            }

            // Adjust return type to match what we can actually get
            const results = await query.orderBy(desc(generatedContent.createdAt)).limit(50);

            return results.map(r => ({
                id: r.id,
                contentType: r.contentType,
                content: {
                    text: r.generatedText,
                    metadata: r.metadata
                },
                status: r.status,
                createdAt: r.createdAt
            }));

        } catch (error) {
            console.error("Error getting content:", error);
            throw error;
        }
    }

    /**
     * تحديث حالة المحتوى
     */
    async updateContentStatus(
        contentId: string,
        status: "draft" | "approved" | "published" | "rejected"
    ): Promise<void> {
        try {
            if (!db) throw new Error("Database not initialized");
            await db
                .update(generatedContent)
                .set({
                    status,
                    ...(status === "published" ? { publishedAt: new Date() } : {}),
                    updatedAt: new Date(),
                })
                .where(eq(generatedContent.id, contentId));
        } catch (error) {
            console.error("Error updating content status:", error);
            throw error;
        }
    }
}

// Export singleton instance
export const contentGenerator = new ContentGenerator();
