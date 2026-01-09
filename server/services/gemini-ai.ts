/**
 * AQUAVO AI Sales Agent - وكيل المبيعات الذكي
 * Version 3.0 - Powered by Groq (Ultra Fast)
 * 
 * Features:
 * - Ultra-fast responses with Groq
 * - Customer history awareness
 * - Personalized recommendations
 * - Admin/Public separation
 * - Chat history saving
 * - Multi-API key fallback
 */

import { groqClient } from "./groq-client.js";
import { AI_TOOLS, aiToolsExecutor } from "./ai-tools.js";
import { customerProfiler } from "./customer-profiler.js";
import { sentimentAnalyzer } from "./sentiment-analyzer.js";
import { getDb } from "../db.js";
import * as schema from "../../shared/schema.js";

// Groq is now the AI provider - much faster than Gemini!
// Uses llama-3.3-70b-versatile model

// Timeout Configuration
const AI_TIMEOUT_MS = 30000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
        )
    ]);
}

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

export interface ChatContext {
    productsCount?: number;
    lowStockCount?: number;
    topCategories?: string[];
    recentOrdersCount?: number;
    userName?: string;
    userId?: string;
    sessionId?: string;
    isAdmin?: boolean;
    salesData?: {
        totalRevenue: number;
        totalOrders: number;
        completedOrders: number;
        pendingOrders: number;
        processingOrders: number;
        topProducts: string[];
    };
    availableProducts?: Array<{
        id: string;
        name: string;
        price: string;
        category: string;
        rating: number | null;
    }>;
    customerProfile?: any;
}

// ============================================================
// SYSTEM PROMPTS
// ============================================================

const createSalesAgentPrompt = (userName?: string, customerProfile?: any, isAdmin: boolean = false): string => {

    if (!isAdmin) {
        // وكيل المبيعات للعملاء
        let profileContext = "";
        if (customerProfile) {
            profileContext = `
# معلومات العميل:
- الاهتمامات: ${customerProfile.interests?.join(', ') || 'غير محدد'}
- الفئات المفضلة: ${customerProfile.preferredCategories?.join(', ') || 'غير محدد'}
- العلامات المفضلة: ${customerProfile.preferredBrands?.join(', ') || 'غير محدد'}
- ملاحظات: ${customerProfile.aiNotes || 'عميل جديد'}`;
        }

        return `أنت "شريمب 🦐" - مستشار أحواض سمك ودود لمتجر AQUAVO في العراق.

# ⚠️ القاعدة الأهم - لا تخالفها أبداً:
لا تذكر أي منتج، ولا تقترح شراء أي شيء، ولا تستخدم أي أداة (search_products, check_stock, get_recommendations)
إلا إذا قال العميل بوضوح كلمات مثل:
- "أريد شراء" أو "أبي أشتري"
- "أريد منتج" أو "أبي منتج"
- "ما تنصحني" أو "شو تنصحني"
- "أعطني توصية" أو "رشحلي"
- "كم سعر" أو "شكد سعر"

إذا سأل سؤالاً عاماً مثل "كيف أعتني بالسمك" أو "درجة الحرارة المناسبة" = أجب من معرفتك فقط ولا تذكر منتجات!

# مهمتك:
أنت خبير أسماك. أجب على الأسئلة العامة مباشرة وبإيجاز (1-3 جمل).

# أسلوبك:
- ودود 🦐🐠
- مختصر ومفيد
- لا تقل "لا أستطيع" - أنت خبير!
- لا تذكر أي بيانات داخلية (مبيعات، أرباح)

${userName ? `اسم العميل: ${userName}` : ''}
${profileContext}`;
    }

    // للمدير
    return `أنت مساعد إدارة متجر AQUAVO.

# قدراتك:
- تحليل البيانات وتقديم تقارير
- اقتراحات لتحسين المبيعات
- معلومات عن العملاء والمخزون

# قواعدك:
1. ردود مختصرة ومحددة
2. استخدم البيانات الحقيقية فقط
3. قدم توصيات عملية

${userName ? `المدير: ${userName}` : ''}`;
};

// ============================================================
// MAIN CHAT FUNCTION WITH FUNCTION CALLING
// ============================================================

export async function sendMessage(
    message: string,
    history: ChatMessage[] = [],
    context?: ChatContext
): Promise<string> {
    const db = getDb();
    const isAdmin = context?.isAdmin ?? false;
    const userId = context?.userId;
    const sessionId = context?.sessionId;

    try {
        // 1. جلب ملف العميل إذا كان مسجلاً
        let customerProfile = context?.customerProfile;
        if (userId && !isAdmin && !customerProfile) {
            const profile = await customerProfiler.getFullProfile(userId);
            customerProfile = profile?.profile;
        }

        // 2. إنشاء الـ prompt
        const systemPrompt = createSalesAgentPrompt(context?.userName, customerProfile, isAdmin);

        // 3. بناء سجل المحادثة
        const chatHistory = history.map((msg) => ({
            role: msg.role === "user" ? "user" as const : "model" as const,
            parts: [{ text: msg.content }],
        }));

        // 4. تحضير الرسائل لـ Groq
        if (!groqClient.hasKeys()) {
            throw new Error("No Groq API keys configured");
        }

        // بناء سجل المحادثة
        const groqMessages: Array<{ role: "system" | "user" | "assistant", content: string }> = [
            { role: "system", content: systemPrompt },
            ...history.map(msg => ({
                role: msg.role === "user" ? "user" as const : "assistant" as const,
                content: msg.content
            })),
            { role: "user", content: message }
        ];

        // 5. تحليل مشاعر الرسالة (Sentiment Analysis) - اختياري
        try {
            const sentimentResult = await sentimentAnalyzer.analyzeSentiment(
                message,
                userId,
                sessionId
            );
            console.log(`💭 Sentiment: ${sentimentResult.sentiment} (${sentimentResult.score.toFixed(2)})`);
        } catch (sentError) {
            console.error("Sentiment analysis failed:", sentError);
        }

        // 6. إرسال الرسالة إلى Groq (سريع جداً!)
        let responseText = await withTimeout(
            groqClient.chat(groqMessages, {
                temperature: 0.7,
                maxTokens: 1024
            }),
            AI_TIMEOUT_MS,
            "انتهت مهلة الاتصال"
        );

        // 7. حفظ المحادثة في قاعدة البيانات
        if (db) {
            const conversationId = sessionId || `conv_${Date.now()}`;

            try {
                // حفظ رسالة المستخدم
                await db.insert(schema.chatMessages).values({
                    conversationId,
                    userId: userId || null,
                    sessionId,
                    role: "user",
                    content: message,
                });

                // حفظ رد الـ AI
                await db.insert(schema.chatMessages).values({
                    conversationId,
                    userId: userId || null,
                    sessionId,
                    role: "assistant",
                    content: responseText,
                });

                // تحديث تفاعل العميل
                if (userId) {
                    await customerProfiler.trackInteraction(userId, "chat");
                }
            } catch (saveError) {
                console.error("Failed to save chat:", saveError);
            }
        }

        return responseText;

    } catch (error) {
        console.error("Gemini AI Error:", error);

        if (error instanceof Error) {
            const errorMsg = error.message.toLowerCase();

            // Check if this is a retryable API key error
            const isApiKeyError =
                errorMsg.includes("api_key") ||
                errorMsg.includes("api key") ||
                errorMsg.includes("403") ||
                errorMsg.includes("forbidden") ||
                errorMsg.includes("unregistered") ||
                errorMsg.includes("quota") ||
                errorMsg.includes("rate_limit");

            if (isApiKeyError) {
                // Try to switch to next API key
                console.log("🔄 Attempting to switch to next Groq API key...");
                groqClient.markCurrentKeyFailed(error);

                // Check if we have more keys to try
                const keyCount = groqClient.getKeyCount();
                if (keyCount > 1) {
                    throw new Error("حدث خطأ مؤقت، يرجى المحاولة مرة أخرى");
                }
            }

            if (error.message.includes("مهلة") || error.message.includes("timeout")) {
                throw new Error("انتهت مهلة الاتصال. حاول مرة أخرى.");
            }
            if (error.message.includes("API_KEY") || error.message.includes("API key")) {
                throw new Error("مفتاح API غير صالح");
            }
            if (error.message.includes("RATE_LIMIT") || error.message.includes("quota")) {
                throw new Error("تم تجاوز حد الطلبات، حاول لاحقاً");
            }
            if (error.message.includes("SAFETY")) {
                throw new Error("تم حظر الرسالة لأسباب أمنية");
            }
            throw new Error(`خطأ: ${error.message}`);
        }

        throw new Error("حدث خطأ غير متوقع");
    }
}

// ============================================================
// SPECIALIZED FUNCTIONS
// ============================================================

export async function generateRecommendations(
    preferences: {
        tankSize?: string;
        fishType?: string;
        budget?: string;
        experience?: string;
    },
    userName?: string
): Promise<string> {
    const prompt = `أعطني 3 توصيات منتجات لـ:
- حجم الحوض: ${preferences.tankSize ?? "غير محدد"}
- نوع الأسماك: ${preferences.fishType ?? "غير محدد"}
- الميزانية: ${preferences.budget ?? "غير محدد"}
- الخبرة: ${preferences.experience ?? "مبتدئ"}

ردك قصير ومحدد.`;

    return sendMessage(prompt, [], { userName, isAdmin: false });
}

export async function getFishCareAdvice(fishName: string, userName?: string): Promise<string> {
    const prompt = `معلومات مختصرة عن رعاية ${fishName}: الحوض، الحرارة، التغذية (3 نقاط فقط)`;
    return sendMessage(prompt, [], { userName, isAdmin: false });
}

export async function recommendProductsForJourney(
    wizardData: any,
    availableProducts: any[]
): Promise<any[]> {
    try {
        if (!groqClient.hasKeys()) {
            throw new Error("No Groq API keys configured");
        }

        const productsCatalog = availableProducts.slice(0, 50).map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            price: p.price
        }));

        const prompt = `Based on this tank setup:
${JSON.stringify(wizardData, null, 2)}

Select 5-6 essential products from:
${JSON.stringify(productsCatalog)}

Return ONLY a JSON array with no extra text:
[{"productId": "id", "reason": "سبب قصير بالعربي"}]`;

        const result = await withTimeout(
            groqClient.chat([{ role: "user", content: prompt }], {
                temperature: 0.3,
                maxTokens: 1024
            }),
            AI_TIMEOUT_MS,
            "Timeout"
        );

        // Parse JSON from response
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return [];
    } catch (error) {
        console.error("AI Recommendation Error:", error);
        return [];
    }
}

// ============================================================
// ADMIN CUSTOMER INSIGHTS
// ============================================================

export async function getCustomerInsights(userId: string): Promise<any> {
    return customerProfiler.getFullProfile(userId);
}

export async function analyzeCustomer(userId: string): Promise<void> {
    return customerProfiler.analyzeAndUpdateProfile(userId);
}
