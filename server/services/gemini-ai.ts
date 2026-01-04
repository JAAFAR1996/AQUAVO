import { GoogleGenerativeAI } from "@google/generative-ai";

// Validate API Key
if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY is not set in environment variables");
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Get the model - Using Gemini 2.5 Flash (stable release June 2025)
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Timeout Configuration
const AI_TIMEOUT_MS = 30000; // 30 ثانية - الحد الأقصى لانتظار رد الـ AI

/**
 * Wrapper لإضافة timeout لأي Promise
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
        )
    ]);
}

// Advanced System Prompt - E-commerce Chatbot Best Practices 2025
const createSystemPrompt = (userName?: string, context?: ChatContext) => {
    const greeting = userName ? `اسم العميل الحالي: ${userName}. نادِه باسمه لتجربة شخصية.` : "";

    return `# أنت "أكوا" 🐠 - مساعد AQUAVO الذكي

## هويتك:
- اسمك "أكوا" وأنت خبير أسماك الزينة والأحواض
- تعمل لمتجر AQUAVO - أفضل متجر للأحواض والأسماك في العراق
- شخصيتك: ودود، متحمس، خبير، ومرح

${greeting}

## قواعد التواصل:
1. **اللغة**: العربية دائماً (لهجة عراقية خفيفة مقبولة)
2. **الأسلوب**: ودود وشخصي - استخدم اسم العميل
3. **الإيموجي**: استخدم 1-2 إيموجي مناسب في كل رد 🐠🐟💧
4. **الطول**: ردود مختصرة ومفيدة (50-150 كلمة)
5. **التحية**: رحب بالعميل باسمه إن توفر

## خبراتك:
✅ أنواع الأسماك وتوافقها
✅ إعداد الأحواض ومعداتها
✅ تغذية ورعاية الأسماك
✅ تشخيص أمراض الأسماك
✅ نصائح للمبتدئين والمحترفين
✅ توصيات المنتجات

## أهداف المحادثة:
1. مساعدة العميل بإجابات مفيدة
2. بناء علاقة شخصية ودية
3. اقتراح منتجات مناسبة من المتجر
4. تشجيع العميل على الشراء بطريقة ناعمة

## معلومات المتجر الحالية:
- عدد المنتجات: ${context?.productsCount ?? "غير متوفر"}
- منتجات بمخزون منخفض: ${context?.lowStockCount ?? "غير متوفر"}
- أفضل الفئات: ${context?.topCategories?.join("، ") ?? "أحواض، فلاتر، طعام"}

${context?.salesData ? `
## بيانات المبيعات (آخر 30 يوم):
- إجمالي الإيرادات: ${context.salesData.totalRevenue.toLocaleString()} د.ع
- عدد الطلبات: ${context.salesData.totalOrders}
- طلبات مكتملة: ${context.salesData.completedOrders}
- طلبات قيد المعالجة: ${context.salesData.processingOrders}
- طلبات معلقة: ${context.salesData.pendingOrders}
${context.salesData.topProducts.length > 0 ? `- أكثر المنتجات مبيعاً: ${context.salesData.topProducts.join("، ")}` : ''}

**استخدم هذه البيانات الحقيقية عند الإجابة عن أسئلة المبيعات!**
` : ''}

${context?.availableProducts && context.availableProducts.length > 0 ? `
## منتجات متاحة ذات صلة بالمحادثة:
${context.availableProducts.map((p, i) =>
        `${i + 1}. **${p.name}** - ${p.price} د.ع (${p.category}) ${p.rating ? `⭐ ${p.rating}` : ''}`
    ).join('\n')}

**مهم:** عندما توصي بمنتج، اذكر اسمه بالضبط كما ورد أعلاه! هذا يساعد العميل على إيجاده بسهولة.
` : ''}

## أمثلة على ردود جيدة:
❌ "مرحباً، كيف أساعدك؟"
✅ "أهلاً ${userName || "بالحبيب"}! 🐠 شلون أقدر أساعدك اليوم؟"

❌ "سمكة البيتا تحتاج ماء دافئ"
✅ "البيتا سمكة رائعة ${userName || ""}! 🐟 تحتاج حوض 10+ لتر، ماء 24-28°، وفلتر خفيف. عندنا أحواض بيتا جاهزة تناسبها!"

## تذكر:
- كل محادثة فرصة لمساعدة العميل
- اقترح منتجات AQUAVO عند المناسب
- اجعل التجربة شخصية وممتعة`;
};

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
}

/**
 * Send a message to Gemini AI and get a response
 */
export async function sendMessage(
    message: string,
    history: ChatMessage[] = [],
    context?: ChatContext
): Promise<string> {
    try {
        const systemPrompt = createSystemPrompt(context?.userName, context);

        // Personalized greeting
        const greeting = context?.userName
            ? `أهلاً ${context.userName}! 🐠 أنا أكوا، مساعدك الشخصي في AQUAVO. كيف أقدر أساعدك اليوم؟`
            : "أهلاً! 🐠 أنا أكوا، مساعد AQUAVO الذكي. كيف أقدر أساعدك اليوم؟";

        // Build chat history
        const chatHistory = history.map((msg) => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }],
        }));

        // Start chat with history
        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: systemPrompt }],
                },
                {
                    role: "model",
                    parts: [{ text: greeting }],
                },
                ...chatHistory,
            ],
        });

        // Send message and get response (مع timeout للحماية من التعليق)
        const result = await withTimeout(
            chat.sendMessage(message),
            AI_TIMEOUT_MS,
            "انتهت مهلة الاتصال بالذكاء الاصطناعي. حاول مرة أخرى."
        );
        const response = await result.response;
        const text = response.text();

        return text;
    } catch (error) {
        console.error("Gemini AI Error Details:", {
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
            fullError: error,
        });

        // Handle specific errors
        if (error instanceof Error) {
            // Timeout error
            if (error.message.includes("مهلة الاتصال") || error.message.includes("timeout")) {
                throw new Error("انتهت مهلة الاتصال بالذكاء الاصطناعي. حاول مرة أخرى.");
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
            // Network errors
            if (error.message.includes("fetch") || error.message.includes("network") || error.message.includes("ECONNREFUSED")) {
                throw new Error("خطأ في الاتصال بالشبكة. تحقق من الإنترنت.");
            }
            // Return the actual error message for debugging
            throw new Error(`خطأ في الذكاء الاصطناعي: ${error.message}`);
        }

        throw new Error("حدث خطأ غير متوقع في الذكاء الاصطناعي");
    }
}

/**
 * Generate product recommendations based on preferences
 */
export async function generateRecommendations(
    preferences: {
        tankSize?: string;
        fishType?: string;
        budget?: string;
        experience?: string;
    },
    userName?: string
): Promise<string> {
    const prompt = `${userName ? `العميل ${userName} ` : "عميل "}يسأل عن توصيات منتجات:
- حجم الحوض: ${preferences.tankSize ?? "غير محدد"}
- نوع الأسماك المفضل: ${preferences.fishType ?? "غير محدد"}
- الميزانية: ${preferences.budget ?? "غير محدد"}
- مستوى الخبرة: ${preferences.experience ?? "مبتدئ"}

قدم 5 منتجات موصى بها من AQUAVO مع أسعار تقريبية.`;

    return sendMessage(prompt, [], { userName });
}

/**
 * Analyze sales data and provide insights
 */
export async function analyzeSalesData(
    salesData: {
        totalSales: number;
        ordersCount: number;
        topProducts: string[];
        period: string;
    }
): Promise<string> {
    const prompt = `حلل بيانات المبيعات:
- إجمالي: ${salesData.totalSales.toLocaleString()} د.ع
- الطلبات: ${salesData.ordersCount}
- أفضل المنتجات: ${salesData.topProducts.join("، ")}
- الفترة: ${salesData.period}

قدم تحليل مختصر مع 3 توصيات عملية.`;

    return sendMessage(prompt);
}

/**
 * Get fish care advice
 */
export async function getFishCareAdvice(fishName: string, userName?: string): Promise<string> {
    const prompt = `${userName ? `${userName} يسأل عن ` : "سؤال عن "}رعاية سمكة ${fishName}.
قدم دليل مختصر يشمل:
1. الحوض المناسب
2. درجة الحرارة والـ pH
3. التغذية
4. التوافق
5. منتجات AQUAVO المناسبة`;

    return sendMessage(prompt, [], { userName });
}

/**
 * Generate AI recommendations for Journey Wizard
 * Returns a JSON string of product IDs and reasons
 */
export async function recommendProductsForJourney(
    wizardData: any,
    availableProducts: any[]
): Promise<any[]> {
    try {
        // Use a specific model instance for JSON generation to ensure structure
        const jsonModel = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        // Filter products to reduce token usage (send only necessary fields)
        const productsCatalog = availableProducts.map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            price: p.price,
            tags: [p.category, p.name].join(" ")
        }));

        const prompt = `You are an expert aquarist AI for AQUAVO.
        
User Tank Profile:
${JSON.stringify(wizardData, null, 2)}

Available Products Catalog:
${JSON.stringify(productsCatalog)}

Task:
1. Analyze the user's tank profile (size, type, fish, etc).
2. Select the top 6-8 MOST ESSENTIAL products from the catalog for THIS SPECIFIC setup.
3. For each product, write a short, personalized reason (in Arabic) explaining WHY it is needed for their specific choice (e.g., "Because you chose Angelfish, this heater is needed...").
4. Return a JSON array.

Format:
[
  {
    "productId": "id",
    "reason": "السبب بالعربية"
  }
]
`;

        const result = await withTimeout(
            jsonModel.generateContent(prompt),
            AI_TIMEOUT_MS,
            "Timeout generating recommendations"
        );

        const responseText = result.response.text();
        return JSON.parse(responseText);
    } catch (error) {
        console.error("AI Recommendation Error:", error);
        return [];
    }
}
