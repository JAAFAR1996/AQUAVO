/**
 * Customer Profiler - تحليل وبناء ملفات العملاء بالذكاء الاصطناعي
 * Analyzes customer behavior and builds AI-powered profiles
 */

import { getDb } from "../db.js";
import * as schema from "../../shared/schema.js";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// ============================================================
// CUSTOMER PROFILER CLASS
// ============================================================

export class CustomerProfiler {
    private db = getDb();

    /**
     * تحليل سلوك عميل وتحديث ملفه
     */
    async analyzeAndUpdateProfile(userId: string): Promise<void> {
        try {
            const db = this.db;
            if (!db) return;

            // 1. جمع البيانات
            const behaviorData = await this.collectBehaviorData(userId);

            // 2. تحليل بـ AI
            const analysis = await this.analyzeWithAI(behaviorData);

            // 3. حفظ الملف
            await this.saveProfile(userId, analysis);

            console.log(`✓ Updated profile for user: ${userId}`);
        } catch (error) {
            console.error("Profile analysis error:", error);
        }
    }

    /**
     * جمع بيانات السلوك
     */
    private async collectBehaviorData(userId: string) {
        const db = this.db;
        if (!db) return null;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // المنتجات التي شاهدها
        const viewedProducts = await db
            .select({
                productId: schema.productInteractions.productId,
                productName: schema.products.name,
                category: schema.products.category,
                brand: schema.products.brand,
                price: schema.products.price,
                duration: schema.productInteractions.duration,
            })
            .from(schema.productInteractions)
            .innerJoin(schema.products, eq(schema.productInteractions.productId, schema.products.id))
            .where(
                and(
                    eq(schema.productInteractions.userId, userId),
                    eq(schema.productInteractions.interactionType, "view"),
                    gte(schema.productInteractions.createdAt, thirtyDaysAgo)
                )
            )
            .orderBy(desc(schema.productInteractions.createdAt))
            .limit(50);

        // عمليات البحث
        const searches = await db
            .select({ query: schema.searchQueries.query })
            .from(schema.searchQueries)
            .where(
                and(
                    eq(schema.searchQueries.userId, userId),
                    gte(schema.searchQueries.createdAt, thirtyDaysAgo)
                )
            )
            .limit(20);

        // المشتريات
        const orders = await db
            .select({
                total: schema.orders.total,
                items: schema.orders.items,
                createdAt: schema.orders.createdAt,
            })
            .from(schema.orders)
            .where(eq(schema.orders.userId, userId))
            .orderBy(desc(schema.orders.createdAt))
            .limit(10);

        // المفضلة
        const favorites = await db
            .select({
                productName: schema.products.name,
                category: schema.products.category,
                brand: schema.products.brand,
            })
            .from(schema.favorites)
            .innerJoin(schema.products, eq(schema.favorites.productId, schema.products.id))
            .where(eq(schema.favorites.userId, userId))
            .limit(20);

        // المحادثات مع البوت
        const chats = await db
            .select({ content: schema.chatMessages.content, role: schema.chatMessages.role })
            .from(schema.chatMessages)
            .where(
                and(
                    eq(schema.chatMessages.userId, userId),
                    gte(schema.chatMessages.createdAt, thirtyDaysAgo)
                )
            )
            .limit(30);

        return {
            viewedProducts,
            searches: searches.map(s => s.query),
            orders,
            favorites,
            chats,
        };
    }

    /**
     * تحليل البيانات بالذكاء الاصطناعي
     */
    private async analyzeWithAI(data: any) {
        if (!data) return null;

        const prompt = `حلل سلوك هذا العميل واستخرج:
1. الفئات المفضلة (قائمة)
2. العلامات التجارية المفضلة (قائمة)
3. نطاق السعر المتوقع (min, max بالـ IQD)
4. الاهتمامات (قائمة كلمات مفتاحية)
5. مستوى التفاعل (low/medium/high)
6. ملخص قصير (جملة واحدة)
7. ملاحظات للمبيعات

البيانات:
- شاهد ${data.viewedProducts?.length || 0} منتج
- الفئات: ${[...new Set(data.viewedProducts?.map((p: any) => p.category) || [])].join(', ')}
- البراندات: ${[...new Set(data.viewedProducts?.map((p: any) => p.brand) || [])].join(', ')}
- بحث عن: ${data.searches?.slice(0, 10).join(', ')}
- عدد الطلبات: ${data.orders?.length || 0}
- المفضلة: ${data.favorites?.length || 0} منتج

أرجع JSON فقط بهذا الشكل:
{
  "preferredCategories": [],
  "preferredBrands": [],
  "priceRange": {"min": 0, "max": 0},
  "interests": [],
  "engagementLevel": "medium",
  "aiSummary": "",
  "aiNotes": ""
}`;

        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text();

            // استخراج JSON من الرد
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.error("AI analysis error:", error);
        }

        // قيم افتراضية
        return {
            preferredCategories: [],
            preferredBrands: [],
            priceRange: { min: 0, max: 100000 },
            interests: [],
            engagementLevel: "low",
            aiSummary: "عميل جديد",
            aiNotes: "",
        };
    }

    /**
     * حفظ ملف العميل
     */
    private async saveProfile(userId: string, analysis: any) {
        const db = this.db;
        if (!db || !analysis) return;

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 90); // 90 يوم

        const profileData = {
            userId,
            preferredCategories: analysis.preferredCategories,
            preferredBrands: analysis.preferredBrands,
            priceRange: analysis.priceRange,
            interests: analysis.interests,
            engagementLevel: analysis.engagementLevel,
            aiSummary: analysis.aiSummary,
            aiNotes: analysis.aiNotes,
            lastAnalyzedAt: new Date(),
            expiresAt,
            updatedAt: new Date(),
        };

        // Upsert
        const existing = await db
            .select()
            .from(schema.customerProfiles)
            .where(eq(schema.customerProfiles.userId, userId));

        if (existing.length > 0) {
            await db
                .update(schema.customerProfiles)
                .set(profileData)
                .where(eq(schema.customerProfiles.userId, userId));
        } else {
            await db.insert(schema.customerProfiles).values({
                ...profileData,
                createdAt: new Date(),
            });
        }
    }

    /**
     * جلب ملف عميل مع كل التفاصيل (للمدير)
     */
    async getFullProfile(userId: string) {
        const db = this.db;
        if (!db) return null;

        // الملف الأساسي
        const [profile] = await db
            .select()
            .from(schema.customerProfiles)
            .where(eq(schema.customerProfiles.userId, userId));

        // معلومات المستخدم
        const [user] = await db
            .select({
                id: schema.users.id,
                email: schema.users.email,
                fullName: schema.users.fullName,
                phone: schema.users.phone,
                createdAt: schema.users.createdAt,
                loyaltyPoints: schema.users.loyaltyPoints,
                loyaltyTier: schema.users.loyaltyTier,
            })
            .from(schema.users)
            .where(eq(schema.users.id, userId));

        // آخر 10 منتجات شاهدها
        const recentViews = await db
            .select({
                productName: schema.products.name,
                category: schema.products.category,
                brand: schema.products.brand,
                viewedAt: schema.productInteractions.createdAt,
            })
            .from(schema.productInteractions)
            .innerJoin(schema.products, eq(schema.productInteractions.productId, schema.products.id))
            .where(
                and(
                    eq(schema.productInteractions.userId, userId),
                    eq(schema.productInteractions.interactionType, "view")
                )
            )
            .orderBy(desc(schema.productInteractions.createdAt))
            .limit(10);

        // آخر 10 عمليات بحث
        const recentSearches = await db
            .select({
                query: schema.searchQueries.query,
                searchedAt: schema.searchQueries.createdAt,
            })
            .from(schema.searchQueries)
            .where(eq(schema.searchQueries.userId, userId))
            .orderBy(desc(schema.searchQueries.createdAt))
            .limit(10);

        // ملخص الطلبات
        const orderStats = await db
            .select({
                totalOrders: sql<number>`count(*)`,
                totalSpent: sql<number>`sum(${schema.orders.total}::numeric)`,
            })
            .from(schema.orders)
            .where(eq(schema.orders.userId, userId));

        // آخر المحادثات
        const recentChats = await db
            .select({
                role: schema.chatMessages.role,
                content: schema.chatMessages.content,
                createdAt: schema.chatMessages.createdAt,
            })
            .from(schema.chatMessages)
            .where(eq(schema.chatMessages.userId, userId))
            .orderBy(desc(schema.chatMessages.createdAt))
            .limit(20);

        return {
            user,
            profile,
            recentViews,
            recentSearches,
            orderStats: orderStats[0],
            recentChats,
        };
    }

    /**
     * تحديث تفاعل العميل بعد كل حدث
     */
    async trackInteraction(userId: string, type: string, data?: any) {
        const db = this.db;
        if (!db) return;

        // تحديث آخر تفاعل
        await db
            .update(schema.customerProfiles)
            .set({
                lastInteractionAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(schema.customerProfiles.userId, userId));
    }
}

// مثيل واحد مشترك
export const customerProfiler = new CustomerProfiler();
