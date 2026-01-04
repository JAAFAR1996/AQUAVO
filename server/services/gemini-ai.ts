/**
 * AQUAVO AI Sales Agent - وكيل المبيعات الذكي
 * Version 2.0 - Gold Level with Function Calling
 * 
 * Features:
 * - Function Calling for autonomous actions
 * - Customer history awareness
 * - Personalized recommendations
 * - Cart and coupon management
 * - Admin/Public separation
 * - Chat history saving
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { AI_TOOLS, aiToolsExecutor } from "./ai-tools.js";
import { customerProfiler } from "./customer-profiler.js";
import { getDb } from "../db.js";
import * as schema from "../../shared/schema.js";

// Validate API Key
if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY is not set in environment variables");
}

// Initialize Gemini AI with Function Calling
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Model with tools for sales agent
const salesAgentModel = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    tools: [{
        functionDeclarations: AI_TOOLS.map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters as any,
        }))
    }]
});

// Simple model for basic responses
const simpleModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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

        return `أنت "أكوا" - وكيل مبيعات ذكي لمتجر AQUAVO للأسماك والأحواض في العراق.

# مهمتك:
أنت وكيل مبيعات محترف. هدفك مساعدة العميل وإتمام المبيعات.

# قدراتك:
1. البحث عن المنتجات (استخدم search_products)
2. التحقق من المخزون (استخدم check_stock)
3. تقديم توصيات مخصصة (استخدم get_recommendations)
4. إضافة منتجات للسلة (استخدم add_to_cart) - لكن اطلب موافقة العميل أولاً
5. التحقق من الكوبونات (استخدم apply_coupon)

# قواعدك:
1. ردود قصيرة ومفيدة (1-3 جمل)
2. استخدم الأدوات للحصول على معلومات حقيقية
3. لا تختلق معلومات - استخدم الأدوات
4. كن ودوداً واستخدم الإيموجي 🐠
5. إذا طلب العميل إضافة للسلة، استخدم add_to_cart
6. لا تذكر معلومات داخلية (مبيعات، إيرادات)

${userName ? `اسم العميل: ${userName}` : ''}
${profileContext}

# أسلوبك:
- ودود ومهني
- اقترح منتجات ذات صلة
- اسأل عن احتياجات العميل
- قدم نصائح عملية`;
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

        // 4. بدء المحادثة
        const chat = salesAgentModel.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: "مرحباً! 🐠 أنا أكوا، كيف أساعدك اليوم؟" }] },
                ...chatHistory,
            ],
        });

        // 5. إرسال الرسالة
        let result = await withTimeout(
            chat.sendMessage(message),
            AI_TIMEOUT_MS,
            "انتهت مهلة الاتصال"
        );

        let response = result.response;
        let responseText = response.text();

        // 6. التحقق من طلب أداة (Function Call)
        const functionCall = response.candidates?.[0]?.content?.parts?.find(
            (part: any) => part.functionCall
        );

        if (functionCall?.functionCall) {
            const { name, args } = functionCall.functionCall;
            console.log(`🔧 AI calling tool: ${name}`, args);

            // تنفيذ الأداة
            const toolResult = await aiToolsExecutor.executeTool(name, args);
            console.log(`✓ Tool result:`, toolResult);

            // إرسال النتيجة للـ AI
            const toolResponse = await chat.sendMessage([
                {
                    functionResponse: {
                        name,
                        response: toolResult,
                    },
                },
            ]);

            responseText = toolResponse.response.text();
        }

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
        const jsonModel = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

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

Return JSON array:
[{"productId": "id", "reason": "سبب قصير بالعربي"}]`;

        const result = await withTimeout(
            jsonModel.generateContent(prompt),
            AI_TIMEOUT_MS,
            "Timeout"
        );

        return JSON.parse(result.response.text());
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
