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
import { GROQ_TOOLS, aiToolsExecutor } from "./ai-tools.js";
import { customerProfiler } from "./customer-profiler.js";
import { sentimentAnalyzer } from "./sentiment-analyzer.js";
import { getDb } from "../db.js";
import * as schema from "../../shared/schema.js";
import type { ChatMessage as GroqChatMessage } from "./groq-client.js";

// Timeout Configuration
const AI_TIMEOUT_MS = 30000;
const MAX_TOOL_ROUNDS = 3;

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
// MAIN CHAT FUNCTION WITH TOOL CALLING
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

        // 4. Build message history for Groq
        const groqMessages: GroqChatMessage[] = [
            { role: "system", content: systemPrompt },
            ...history.map(msg => ({
                role: msg.role === "user" ? "user" as const : "assistant" as const,
                content: msg.content
            })),
            { role: "user", content: message }
        ];

        // 5. Sentiment analysis (non-blocking)
        try {
            const sentimentResult = await sentimentAnalyzer.analyzeSentiment(
                message,
                userId,
                sessionId
            );
            console.log(`💭 Sentiment: ${sentimentResult.sentiment} (${sentimentResult.score.toFixed(2)})`);
        } catch {
            // Sentiment is optional
        }

        // 6. Tool-calling loop
        const useTools = !isAdmin; // Tools only for customer-facing chat
        let toolRound = 0;
        let responseText = "";
        let toolProducts: any[] = [];
        let toolsDisabled = false; // Fallback flag if tool calling fails

        while (toolRound <= MAX_TOOL_ROUNDS) {
            let response;
            try {
                response = await withTimeout(
                    groqClient.chat(groqMessages, {
                        temperature: 0.7,
                        maxTokens: 1536,
                        ...(useTools && !toolsDisabled && toolRound < MAX_TOOL_ROUNDS && {
                            tools: GROQ_TOOLS,
                            tool_choice: "auto" as const,
                        }),
                    }),
                    AI_TIMEOUT_MS,
                    "انتهت مهلة الاتصال"
                );
            } catch (toolError: any) {
                // Groq returns tool_use_failed when model generates malformed function calls
                // (common with Arabic text). Retry without tools.
                if (toolError?.error?.code === "tool_use_failed" ||
                    (toolError?.message && toolError.message.includes("tool_use_failed")) ||
                    (toolError?.message && toolError.message.includes("Failed to call a function"))) {
                    console.warn("⚠️ Tool calling failed (Arabic encoding issue), retrying without tools...");
                    toolsDisabled = true;
                    continue;
                }
                throw toolError;
            }

            const choice = response.choices[0];
            const assistantMessage = choice.message;

            // If no tool calls, we have the final text response
            if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
                responseText = assistantMessage.content || "";
                break;
            }

            // AI wants to call tools - add assistant message to history
            groqMessages.push({
                role: "assistant",
                content: assistantMessage.content,
                tool_calls: assistantMessage.tool_calls.map(tc => ({
                    id: tc.id,
                    type: "function" as const,
                    function: { name: tc.function.name, arguments: tc.function.arguments }
                })),
            });

            // Execute each tool call
            for (const toolCall of assistantMessage.tool_calls) {
                let toolResult: any;
                try {
                    const args = JSON.parse(toolCall.function.arguments);

                    // Auto-inject userId for tools that need it
                    if (userId && ["add_to_cart", "get_customer_history", "get_recommendations"].includes(toolCall.function.name)) {
                        args.userId = args.userId || userId;
                    }

                    console.log(`🔧 Tool call: ${toolCall.function.name}(${JSON.stringify(args)})`);
                    toolResult = await aiToolsExecutor.executeTool(toolCall.function.name, args);

                    // Track products found via tools
                    if (toolResult.success && toolResult.data) {
                        if (["search_products", "get_recommendations", "get_deals"].includes(toolCall.function.name) && Array.isArray(toolResult.data)) {
                            toolProducts = [...toolProducts, ...toolResult.data];
                        } else if (toolCall.function.name === "get_product_details" && toolResult.data.id) {
                            toolProducts.push(toolResult.data);
                        }
                    }
                } catch (err) {
                    console.error(`Tool ${toolCall.function.name} failed:`, err);
                    toolResult = { success: false, error: "Tool execution failed" };
                }

                groqMessages.push({
                    role: "tool",
                    content: JSON.stringify(toolResult),
                    tool_call_id: toolCall.id,
                });
            }

            toolRound++;
        }

        // 7. Safety check - ensure we have a response
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
