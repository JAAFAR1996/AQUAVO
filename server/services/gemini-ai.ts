/**
 * AQUAVO AI Sales Agent - وكيل المبيعات الذكي
 * Version 4.0 - Powered by Groq with Tool Calling
 *
 * Features:
 * - Ultra-fast responses with Groq
 * - AI Tool Calling (search, add to cart, check stock, coupons)
 * - Customer history awareness
 * - Personalized recommendations
 * - Admin/Public separation
 * - Chat history saving
 * - Multi-API key fallback
 * - Graceful error handling with Iraqi Arabic fallbacks
 */

import { groqClient } from "./groq-client.js";
import { aiToolsExecutor } from "./ai-tools.js";
import { customerProfiler } from "./customer-profiler.js";
import { sentimentAnalyzer } from "./sentiment-analyzer.js";
import { getDb } from "../db.js";
import * as schema from "../../shared/schema.js";
import type { ChatMessage as GroqChatMessage } from "./groq-client.js";

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
    searchPerformed?: boolean;
    productsFound?: number;
}

export interface SendMessageResult {
    text: string;
    products: any[];
}

// Friendly fallback messages in Iraqi Arabic
const FALLBACK_MESSAGES = [
    "عذراً حبي، الخط ضعيف شوية 😅 جرب مرة ثانية",
    "سوري! صار خطأ بسيط، بس أني هنا. شنو كنت تسأل؟ 🦐",
    "لحظة، صار عندي مشكلة تقنية بسيطة. حاول مرة ثانية بلا زحمة 💙",
];

function getRandomFallback(): string {
    return FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)];
}

// ============================================================
// SYSTEM PROMPTS
// ============================================================

const createSalesAgentPrompt = (userName?: string, customerProfile?: any, isAdmin: boolean = false): string => {

    if (!isAdmin) {
        let profileContext = "";
        if (customerProfile) {
            profileContext = `
[ملف العميل]
- الاسم: ${userName || 'زائر'}
- الاهتمامات: ${customerProfile.interests?.join(', ') || 'غير معروفة'}
- الفئات المفضلة: ${customerProfile.preferredCategories?.join(', ') || 'غير معروفة'}
- ملاحظات: ${customerProfile.aiNotes || 'عميل جديد محتمل'}
`;
        }

        return `
[الدور]
أنت "شريمب 🦐" - مستشار مبيعات ذكي وخبير أحواض في AQUAVO، أول متجر أحواض متخصص في العراق.
هدفك: **تحويل كل محادثة إلى عملية بيع** مع بناء ثقة طويلة الأمد.
تتكلم باللهجة العراقية البغدادية بطلاقة.

[قواعد صارمة - لا تكسرها أبداً]
1. 🛡️ حصري لـ AQUAVO: لا تذكر أي متجر آخر. الجواب دائماً "عدنا بـ AQUAVO".
2. 🛡️ الموقع: العراق/بغداد. نوصل لكل المحافظات.
3. 🛡️ الإيجاز: ردود قصيرة (2-4 جمل). استخدم bullet points للقوائم.
4. 🛡️ الدقة: لا تخترع أسماء أو أسعار. استخدم search_products دائماً للبيانات الحقيقية.
5. 🛡️ الأسعار بالدينار العراقي (د.ع) فقط.
6. 🛡️ NEVER write <function> tags or function call syntax in your text response. Use the tool calling API instead.
7. 🛡️ Always respond in Iraqi Arabic. Never mix Hindi, Chinese or other scripts.

[الأدوات المتاحة - استخدمها!]
IMPORTANT: When calling search_products, use ENGLISH keywords for the query parameter.
Translation: فلتر=filter, حوض=aquarium, طعام=food, سمك=fish, سخان=heater, إضاءة=light, ديكور=decoration, مضخة=pump, معالج=treatment, نبات=plant, حصى=gravel, تنظيف=cleaning
- **search_products**: ابحث بالاسم أو الفئة أو الماركة. استخدمها دائماً عند أي سؤال عن منتج.
- **get_product_details**: تفاصيل كاملة لمنتج (وصف، صور، سعر، تخفيض).
- **check_stock**: تحقق من توفر المخزون.
- **get_recommendations**: توصيات مخصصة حسب تفضيلات العميل.
- **get_deals**: العروض والتخفيضات الحالية.
- **add_to_cart**: أضف للسلة (فقط عندما يطلب العميل صراحةً).
- **apply_coupon**: تحقق من كود الخصم.
- **get_customer_history**: سجل مشتريات وتفضيلات العميل.

[آلية التفكير - قبل كل رد]
1. **النية**: تسوق؟ استشارة؟ دعم؟
2. **المشاعر**: متحمس → كن حماسي 🎉 | محتار → ساعده بحنان | حزين (سمكته ماتت) → عزّيه 💔
3. **فرصة البيع**: هل أكدر أقترح منتج إضافي؟ (cross-sell / upsell)
4. **الأداة**: هل أحتاج أبحث؟ أتحقق من المخزون؟ أضيف للسلة؟

[استراتيجيات البيع الذكية]
- **Cross-selling**: إذا يسأل عن حوض → اقترح فلتر + سخان + ديكور
- **Upselling**: إذا يشوف منتج رخيص → "عدنا نوع أحسن بفرق بسيط، يدوم أكثر"
- **الاستعجال**: "الكمية محدودة" أو "عرض لفترة محدودة" إذا كان العرض حقيقي
- **العروض**: إذا سأل عن سعر → تحقق بـ get_deals لو أكو خصم، وأخبره
- **المبتدئ**: إذا يقول "أبدي حوض" → قدم باقة كاملة (حوض + فلتر + طعام + زينة)
- **المحترف**: إذا يعرف أسماء علمية → ارفع مستوى المحادثة وقترح منتجات premium

[أسلوب الكلام]
- كلمات عراقية: "شلونك"، "أكو"، "هواية"، "بلا زحمة"، "عدنا"، "شنو"، "خوش"، "هسه"
- إيموجي باعتدال: 🐠 🦐 ✨ 🌿 💙
- اعرض السعر بوضوح: "بس **25,000 د.ع** 🔥"
- إذا فيه خصم: "~~35,000~~ **25,000 د.ع** (خصم 28%!) 🎉"

[التعامل مع عدم التوفر]
"مع الأسف، مو متوفر حالياً 😔 بس خلّيني أشوفلك بديل ممتاز!" → ثم ابحث عن بديل.

${profileContext}

[حالة المستخدم الحالية]
الاسم: ${userName || 'صديق'}
`;
    }

    // Admin Assistant System Prompt
    return `You are the Store Management Assistant for AQUAVO.

[ROLE]
- Analyze sales data & metrics
- Generate performance reports
- Monitor inventory health
- Do NOT act as a sales agent. Be professional, concise, and data-driven.
- Respond in Arabic.

[DATA ACCESS]
- Total Revenue/Orders
- Best Selling Products
- Low Stock Alerts

${userName ? `Manager: ${userName}` : ''}`;
};

// ============================================================
// PRE-EXECUTE TOOLS based on message keywords
// ============================================================

async function preExecuteTools(message: string, userId?: string): Promise<{
    products: any[];
    context: string;
}> {
    const msg = message.toLowerCase();
    let products: any[] = [];
    let contextParts: string[] = [];

    // Extract keywords for product search
    const searchKeywords: Record<string, string> = {
        "فلتر": "فلتر", "فلاتر": "فلتر", "filter": "فلتر",
        "حوض": "حوض", "أحواض": "حوض", "احواض": "حوض", "tank": "حوض", "aquarium": "حوض",
        "طعام": "طعام", "أكل": "طعام", "غذاء": "طعام", "food": "طعام",
        "سمك": "سمك", "أسماك": "سمك", "سمكة": "سمك", "سمجة": "سمك", "fish": "سمك",
        "سخان": "سخان", "heater": "سخان",
        "إضاءة": "إضاءة", "اضاءة": "إضاءة", "ضوء": "إضاءة", "led": "إضاءة", "light": "إضاءة",
        "ديكور": "ديكور", "زينة": "ديكور", "decoration": "ديكور",
        "مضخة": "مضخة", "هواء": "مضخة هواء", "pump": "مضخة",
        "معالج": "معالج", "علاج": "معالج", "دواء": "معالج", "treatment": "معالج", "مريض": "معالج",
        "نبات": "نبات", "نباتات": "نبات", "plant": "نبات",
        "حصى": "حصى", "رمل": "رمل", "gravel": "حصى",
        "تنظيف": "تنظيف", "فرشاة": "فرشاة", "cleaning": "تنظيف",
        "حاضنة": "حاضنة", "incubator": "حاضنة",
        "اسفنج": "اسفنج", "قطن": "قطن",
        "فحص": "فحص", "اختبار": "فحص", "أمونيا": "أمونيا", "test": "فحص",
    };

    // Find matching keywords
    const matchedTerms = new Set<string>();
    for (const [keyword, searchTerm] of Object.entries(searchKeywords)) {
        if (msg.includes(keyword)) {
            matchedTerms.add(searchTerm);
        }
    }

    // Search for products if keywords found
    if (matchedTerms.size > 0) {
        for (const term of Array.from(matchedTerms).slice(0, 2)) { // Max 2 searches
            try {
                const result = await aiToolsExecutor.searchProducts({ query: term, limit: 5 });
                if (result.success && result.data) {
                    products = [...products, ...result.data];
                }
            } catch { /* search is best-effort */ }
        }
    }

    // Check for deals/discount keywords
    const dealsKeywords = ["عرض", "عروض", "خصم", "تخفيض", "كوبون", "deal", "discount", "sale"];
    if (dealsKeywords.some(kw => msg.includes(kw))) {
        try {
            const deals = await aiToolsExecutor.getDeals({ limit: 5 });
            if (deals.success && deals.data) {
                products = [...products, ...deals.data];
                contextParts.push(`العروض الحالية: ${deals.data.length} منتج بتخفيض`);
            }
        } catch { /* deals is best-effort */ }
    }

    // Get customer history if logged in and asking about orders/recommendations
    const historyKeywords = ["طلباتي", "مشترياتي", "سجل", "order", "history", "توصية", "انصحني", "اقترح"];
    if (userId && historyKeywords.some(kw => msg.includes(kw))) {
        try {
            const history = await aiToolsExecutor.getCustomerHistory({ userId });
            if (history.success && history.data) {
                contextParts.push(`سجل العميل: ${history.data.recentOrders?.length || 0} طلبات، ${history.data.favorites?.length || 0} مفضلات`);
            }
        } catch { /* history is best-effort */ }
    }

    // Deduplicate products
    const unique = products.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);

    // Build context string with product data
    if (unique.length > 0) {
        const productList = unique.slice(0, 8).map(p => {
            const discount = p.originalPrice && parseFloat(p.originalPrice) > parseFloat(p.price)
                ? ` (خصم ${Math.round(((parseFloat(p.originalPrice) - parseFloat(p.price)) / parseFloat(p.originalPrice)) * 100)}% - كان ${p.originalPrice} د.ع)`
                : "";
            return `- ${p.name} | ${p.price} د.ع${discount} | ${p.stock > 0 ? "متوفر" : "نفذ"} | ID: ${p.id}`;
        }).join("\n");
        contextParts.push(`[المنتجات المتوفرة من بحثنا]\n${productList}`);
    }

    return { products: unique, context: contextParts.join("\n\n") };
}

// ============================================================
// MAIN CHAT FUNCTION - Pre-execute tools approach
// ============================================================

export async function sendMessage(
    message: string,
    history: ChatMessage[] = [],
    context?: ChatContext
): Promise<SendMessageResult> {
    const db = getDb();
    const isAdmin = context?.isAdmin ?? false;
    const userId = context?.userId;
    const sessionId = context?.sessionId;

    try {
        // 1. Fetch customer profile if logged in
        let customerProfile = context?.customerProfile;
        if (userId && !isAdmin && !customerProfile) {
            try {
                const profile = await customerProfiler.getFullProfile(userId);
                customerProfile = profile?.profile;
            } catch {
                // Profile fetch is optional
            }
        }

        // 2. Create system prompt
        const systemPrompt = createSalesAgentPrompt(context?.userName, customerProfile, isAdmin);

        // 3. Check Groq availability
        if (!groqClient.hasKeys()) {
            return { text: getRandomFallback(), products: [] };
        }

        // 4. Pre-execute tools based on message keywords (for customer-facing chat)
        let toolProducts: any[] = [];
        let toolContext = "";
        if (!isAdmin) {
            try {
                const toolResult = await preExecuteTools(message, userId);
                toolProducts = toolResult.products;
                toolContext = toolResult.context;
            } catch {
                // Tool pre-execution is best-effort
            }
        }

        // 5. Build message with product context injected
        const userMessageWithContext = toolContext
            ? `${message}\n\n---\n${toolContext}`
            : message;

        const groqMessages: GroqChatMessage[] = [
            { role: "system", content: systemPrompt },
            ...history.map(msg => ({
                role: msg.role === "user" ? "user" as const : "assistant" as const,
                content: msg.content
            })),
            { role: "user", content: userMessageWithContext }
        ];

        // 6. Sentiment analysis (fire-and-forget)
        if (userId || sessionId) {
            sentimentAnalyzer.analyzeSentiment(message, userId, sessionId).catch(() => {});
        }

        // 7. Call Groq WITHOUT tool calling (products already in context)
        const response = await withTimeout(
            groqClient.chat(groqMessages, {
                temperature: 0.7,
                maxTokens: 1536,
            }),
            AI_TIMEOUT_MS,
            "انتهت مهلة الاتصال"
        );

        let responseText = response.choices[0]?.message?.content || "";

        // 8. Sanitize response - strip any raw function call tags
        responseText = responseText
            .replace(/<function=[^>]*>[\s\S]*?<\/function>/gi, "")
            .replace(/<function=[^>]*\/>/gi, "")
            .replace(/<function=[^>]*>/gi, "")
            .replace(/<\/function>/gi, "")
            .replace(/---\n\[المنتجات المتوفرة[\s\S]*$/gi, "") // Remove leaked context
            .trim();

        // Safety check
        if (!responseText || responseText.trim().length === 0) {
            responseText = "عذراً حبيبي، صار خطأ بسيط. كدر تعيد السؤال مرة ثانية؟ 🦐";
        }

        // 8. Deduplicate products
        const uniqueProducts = toolProducts.filter((p, i, arr) =>
            arr.findIndex(x => x.id === p.id) === i
        );

        // 9. Save conversation to database
        if (db) {
            const conversationId = sessionId || `conv_${Date.now()}`;

            try {
                await db.insert(schema.chatMessages).values({
                    conversationId,
                    userId: userId || null,
                    sessionId,
                    role: "user",
                    content: message,
                });

                await db.insert(schema.chatMessages).values({
                    conversationId,
                    userId: userId || null,
                    sessionId,
                    role: "assistant",
                    content: responseText,
                });

                if (userId) {
                    await customerProfiler.trackInteraction(userId, "chat");
                }
            } catch (saveError) {
                console.error("Failed to save chat:", saveError);
            }
        }

        return { text: responseText, products: uniqueProducts };

    } catch (error) {
        console.error("Groq AI Error:", error);

        if (error instanceof Error) {
            const errorMsg = error.message.toLowerCase();

            const isApiKeyError =
                errorMsg.includes("api_key") ||
                errorMsg.includes("api key") ||
                errorMsg.includes("403") ||
                errorMsg.includes("forbidden") ||
                errorMsg.includes("unregistered") ||
                errorMsg.includes("quota") ||
                errorMsg.includes("rate_limit");

            if (isApiKeyError) {
                console.log("🔄 Attempting to switch to next Groq API key...");
                groqClient.markCurrentKeyFailed(error);
            }
        }

        // Always return a friendly fallback instead of throwing
        return { text: getRandomFallback(), products: [] };
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
): Promise<SendMessageResult> {
    const prompt = `أعطني 3 توصيات منتجات لـ:
- حجم الحوض: ${preferences.tankSize ?? "غير محدد"}
- نوع الأسماك: ${preferences.fishType ?? "غير محدد"}
- الميزانية: ${preferences.budget ?? "غير محدد"}
- الخبرة: ${preferences.experience ?? "مبتدئ"}

ردك قصير ومحدد.`;

    return sendMessage(prompt, [], { userName, isAdmin: false });
}

export async function getFishCareAdvice(fishName: string, userName?: string): Promise<SendMessageResult> {
    const prompt = `معلومات مختصرة عن رعاية ${fishName}: الحوض، الحرارة، التغذية (3 نقاط فقط)`;
    return sendMessage(prompt, [], { userName, isAdmin: false });
}

export async function recommendProductsForJourney(
    wizardData: any,
    availableProducts: any[]
): Promise<any[]> {
    try {
        if (!groqClient.hasKeys()) {
            return [];
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
            groqClient.chatText([{ role: "user", content: prompt }], {
                temperature: 0.3,
                maxTokens: 1024
            }),
            AI_TIMEOUT_MS,
            "Timeout"
        );

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
