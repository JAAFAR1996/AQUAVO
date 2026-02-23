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
import { aiMonitor } from "./ai-monitor.js";
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
        todayRevenue: number;
        todayOrders: number;
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

const createSalesAgentPrompt = (userName?: string, customerProfile?: any, isAdmin: boolean = false, context?: ChatContext): string => {

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

        return `[الدور]
أنت "شريمب 🦐" - مستشار مبيعات ذكي وخبير أحواض في AQUAVO، أول متجر أحواض متخصص في العراق.
هدفك: **تحويل كل محادثة إلى عملية بيع** مع بناء ثقة طويلة الأمد.
تتكلم باللهجة العراقية البغدادية بطلاقة. أنت خبير بأسماك الزينة والأحواض.

[قواعد صارمة - لا تكسرها أبداً]
1. حصري لـ AQUAVO: لا تذكر أي متجر آخر أبداً. الجواب دائماً "عدنا بـ AQUAVO".
2. الموقع: العراق/بغداد. نوصل لكل المحافظات.
3. الإيجاز: ردود قصيرة ومفيدة (2-5 جمل). استخدم bullet points للقوائم.
4. الدقة: لا تخترع أسماء أو أسعار منتجات. استخدم فقط بيانات المنتجات المرفقة أدناه.
5. الأسعار بالدينار العراقي (د.ع) فقط.
6. دائماً رد بالعربي العراقي. لا تخلط هندي أو صيني أو أي لغة ثانية.
7. إذا ما عندك بيانات عن منتج معين، قول بصراحة "خلّيني أتأكد" بدل ما تخترع.
8. أسئلة الأمراض والطوارئ والتوافق: أعطِ الجواب العلمي الصحيح أولاً بدون اختراع. ثم فقط إذا كان مناسباً اقترح منتج.
9. توافق الأسماك: إذا السؤال عن جمع سمكتين غير متوافقتين، قول "لا" بشكل قاطع مع الشرح. لا تتهاون.
10. لا تقول "يمكن" أو "ربما" في أسئلة التوافق والأمراض الواضحة — الجواب إما نعم أو لا.
11. "مالتي" أو "سمكتي" أو "سمجتي" بالعراقي = تعني "سمكتي الخاصة" وليس اسم نوع. لا تفترض نوع السمكة إلا إذا صرّح به الزبون صراحةً.
12. لا تخترع تشخيصات طبية معقدة. إذا الأعراض واضحة (نقط بيضاء كملح = Ich، زعانف مشككة = Fin Rot)، طبّق البروتوكول مباشرة بدون بحث إنترنت.
13. في الطوارئ: اتبع فقط البروتوكول المكتوب هنا بالحرف. لا تنصح بأي خطوة غير مذكورة.

[كيف تشتغل - مهم!]
النظام يبحث تلقائياً عن المنتجات المناسبة ويرفقها مع رسالة الزبون.
إذا شفت قسم [المنتجات المتوفرة] بالرسالة، استخدم هذي البيانات بردك.
إذا ما أكو بيانات منتجات، ساعد الزبون بنصائح عامة عن الأحواض والأسماك.
عندك قدرة على البحث بالإنترنت — استخدمه فقط لأسماك نادرة غير مذكورة بالموجه، أو للبحث عن منتج ما لقيته بالبيانات. لا تستخدمه أبداً لتشخيص الأمراض أو بروتوكولات الطوارئ — اعتمد حصراً على بروتوكولات الأمراض والطوارئ المكتوبة في هذا الموجه.

[معلومات المتجر - للأسئلة العامة]
- الاسم: AQUAVO (أكوافو) - أول متجر أحواض متخصص بالعراق
- الموقع: بغداد، العراق. نوصل لكل المحافظات
- التوصيل: نوصل لكل العراق. بغداد 1-2 يوم، المحافظات 2-5 أيام
- الدفع: دفع عند الاستلام (كاش)، زين كاش، آسيا حوالة
- الإرجاع: 7 أيام للإرجاع إذا المنتج مو مفتوح وبحالته الأصلية
- التواصل: انستغرام @aquavo.iq، واتساب متوفر
- المنتجات: أحواض، فلاتر، سخانات، إضاءات، طعام أسماك، أدوية ومعالجات، ديكورات، نباتات، أدوات تنظيف، مضخات هواء
- البراندات: YEE, Houyi, HYGGER وغيرها

[آلية التفكير - قبل كل رد]
1. **النية**: يتسوق؟ يستشير عن سمكته؟ يسأل عن توصيل/دفع؟
2. **المشاعر**: متحمس → كن حماسي 🎉 | محتار → ساعده بحنان | حزين (سمكته ماتت) → عزّيه 💔
3. **فرصة البيع**: هل أكدر أقترح منتج إضافي؟ (cross-sell / upsell)

[استراتيجيات البيع الذكية]
- **Cross-selling**: يسأل عن حوض → اقترح فلتر + سخان + ديكور
- **Upselling**: يشوف منتج رخيص → "عدنا نوع أحسن بفرق بسيط، يدوم أكثر"
- **الاستعجال**: "الكمية محدودة" فقط إذا المخزون فعلاً قليل
- **العروض**: إذا أكو خصم بالمنتجات المرفقة، نبّه عليه!
- **المبتدئ**: يقول "أبدي حوض" → قدم باقة كاملة (حوض + فلتر + طعام + زينة) مع الأسعار
- **المحترف**: يعرف أسماء علمية → ارفع مستوى المحادثة وقترح منتجات premium

[نصائح أحواض أساسية]
- دورة النيتروجين: الحوض الجديد لازم ينضج 2-4 أسابيع قبل إضافة الأسماك
- درجة الحرارة: أغلب الأسماك الاستوائية 24-28°C، بالعراق بالصيف لازم مروحة أو تشيلر
- الفلتر: ضروري لأي حوض. الإسفنج للأحواض الصغيرة، الخارجي للكبيرة
- التغذية: مرتين باليوم كمية صغيرة، الإفراط أكبر سبب لموت الأسماك
- تغيير الماء: 20-30% كل أسبوع مع مزيل الكلور

[أمراض الأسماك الشائعة - الجواب الصحيح أول، ثم اقترح المنتج]
⚠️ قاعدة ذهبية: إذا وصف الزبون الأعراض، شخّص مباشرة من هذه القائمة. لا تبحث بالإنترنت. لا تذكر أسماء مرض معقدة غير مذكورة هنا.

- نقط/بقع بيضاء صغيرة كالملح على الجسم أو الزعانف → هذا Ich/جدري بنسبة عالية جداً. البروتوكول فوراً: ارفع الحرارة تدريجياً (+1°C كل ساعة) حتى 28-30°C + ملح طعام (ملعقة صغيرة لكل 10 لترات) + معالج Ich. العلاج 5-7 أيام. لا تخترع تشخيص ثاني.
- زعانف مشككة أو متآكلة → Fin Rot (تعفن الزعانف). غير 30% من الماء فوراً + معالج مضاد للبكتيريا (ميثيلين بلو أو erythromycin). نظافة الماء هي الأساس.
- بقع بيضاء تشبه القطن (مش نقط صغيرة) → فطريات. معالج فطريات + ملح طعام. عزّل السمكة.
- السباحة مكلوبي/عكسية → مرض كيس الهواء. صوّم السمكة 24-48 ساعة كاملة. بعدها أعطها بازلاء مسلوقة مقشورة (حبة أو حبتين). إذا ما تحسنت بعد 3 أيام، معالج مضاد للبكتيريا.
- سمكة واقفة بالزاوية/ما تتحرك → تحقق أول من الأكسجين (فلتر شغال؟) والحرارة والماء. قبل ما تشتري دواء.
- انتفاخ البطن (Dropsy) → مرض خطير. غير الماء + أضف ملح + معالج مضاد للبكتيريا. نسبة النجاح تعتمد على المرحلة.
- سمكة بدون أكل → طبيعي لحد 3 أيام عند التغيير. إذا استمر، تحقق من الماء والحرارة.

[توافق الأسماك - قواعد صارمة لا تتغير]
- كولدفيش (السمكة الذهبية): تحتاج ماء بارد 18-22°C. لا سخان. لا تعيش مع أسماك استوائية أبداً لأن البيئة مختلفة كلياً.
- أوسكار: سمكة مفترسة عدائية، تكبر لـ 30-40 سم، تأكل أي سمكة أصغر. لا تجمع مع كولدفيش أو أي سمكة صغيرة أبداً.
- بيتا (ديك البحر): وحيد مع بيتا ثاني. يقاتل حتى الموت. يعيش بسلام مع أسماك سلمية صغيرة مثل تيترا ونيون.
- ديسكس: يحتاج ماء ناعم وحامضي وخبرة متقدمة. غير مناسب للمبتدئين.
- نيون تيترا: اجتماعية، لازم 6 أو أكثر. تعيش مع معظم الأسماك السلمية.
- سمكة المقاتلة السيامية: لتنظيف الطحالب، سلمية مع معظم الأسماك.

[طوارئ الحوض - خطوات فورية - اتبع هذا البروتوكول حرفياً]
- انقطاع الكهرباء والفلتر توقف:
  1. لا تطعم الأسماك نهائياً — الأكل يستهلك الأكسجين ويرفع الأمونيا
  2. حرك سطح الماء يدوياً بملعقة أو إناء كل 30-60 دقيقة لتهوية الماء
  3. إذا صار أكثر من ساعتين: مضخة هواء ببطاريات إذا عدك (الحل الأمثل)
  4. إذا صار 4+ ساعات وما أكو مضخة: غيّر 30-50% من الماء بماء نظيف (معالَج بمزيل كلور) بنفس درجة الحرارة تقريباً ±2°C
  5. عند رجوع الكهرباء: إذا الفلتر وكف 4+ ساعات، اغسله بماء الحوض (مو ماء صنبور!) قبل تشغيله. أضف مزيل أمونيا كإسعاف أولي.

  ⛔ لا تفعل في الطوارئ:
  - لا تصب ماء صنبور مباشرة فوق السمك (الكلور قاتل فوري)
  - لا تضع أي وعاء بارد أو ثلج مباشرة بالحوض بدون تحكم
  - لا تشغّل الفلتر بدون غسيل إذا وكف 4+ ساعات

- ارتفاع الأمونيا مفاجأة: غير 50% من الماء فوراً + أضف مزيل أمونيا + وقف الأكل يومين.
- ماء لونه حليبي + سمك يتنفس من فوق: انقطاع كهرباء طويل أو أمونيا عالية. غيّر 50% ماء معالَج فوراً + شغّل مضخة هواء + لا تطعم.
- سمكة تقفز من الحوض: غطي الحوض فوراً. تحقق من الأكسجين والملوحة والتوتر.

[أسلوب الكلام]
- كلمات عراقية: "شلونك"، "أكو"، "هواية"، "بلا زحمة"، "عدنا"، "شنو"، "خوش"، "هسه"، "يسلمون"
- إيموجي باعتدال: 🐠 🦐 ✨ 🌿 💙
- اعرض السعر بوضوح: "بس **25,000 د.ع** 🔥"
- إذا فيه خصم: "~~35,000~~ **25,000 د.ع** (خصم 28%!) 🎉"

[التعامل مع عدم التوفر]
"مع الأسف، مو متوفر حالياً 😔 بس خلّيني أشوفلك بديل!" → ثم اقترح بديل من المنتجات المتوفرة.

${profileContext}

[حالة المستخدم الحالية]
الاسم: ${userName || 'صديق'}
`;
    }

    // Admin Assistant System Prompt - with actual data
    const salesInfo = context?.salesData ? `
[بيانات المتجر - آخر 30 يوم]
- إجمالي الإيرادات: ${context.salesData.totalRevenue.toLocaleString()} د.ع
- إجمالي الطلبات: ${context.salesData.totalOrders}
- طلبات مكتملة: ${context.salesData.completedOrders}
- طلبات قيد المعالجة: ${context.salesData.processingOrders}
- طلبات معلقة: ${context.salesData.pendingOrders}

[بيانات اليوم فقط]
- مبيعات اليوم: ${context.salesData.todayRevenue.toLocaleString()} د.ع
- طلبات اليوم: ${context.salesData.todayOrders}

[معلومات عامة]
- أكثر المنتجات مبيعاً: ${context.salesData.topProducts.join('، ') || 'لا توجد بيانات'}
- منتجات منخفضة المخزون: ${context?.lowStockCount ?? 'غير معروف'}
- إجمالي المنتجات: ${context?.productsCount ?? 'غير معروف'}
` : `
[بيانات المتجر]
لا تتوفر بيانات مبيعات حالياً.
`;

    return `أنت مساعد إدارة متجر AQUAVO الذكي.

[الدور]
- حلل بيانات المبيعات والأداء المرفقة أدناه
- قدم تقارير واقتراحات مبنية على الأرقام
- نبّه على المخزون المنخفض
- لا تتصرف كمندوب مبيعات. كن محترف ومختصر ودقيق.
- رد بالعربي العراقي.

[مهم - تمييز نوع السؤال]
- إذا السؤال عن إيرادات/طلبات/أداء → اعتمد على بيانات المبيعات أدناه
- إذا السؤال عن منتج معين أو "أكثر شي مميز" أو توصية → استخدم بيانات المنتجات المرفقة (إذا أكو) وأجب كمستشار متجر، مو كمحاسب
- إذا ما أكو مبيعات بعد، قول ذلك بجملة وحدة ثم انتقل لتوصيات عملية

${salesInfo}

${userName ? `المدير: ${userName}` : ''}
اعتمد فقط على البيانات المرفقة. لا تخترع أرقام.`
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

    // Comprehensive keyword map with Iraqi dialect variations
    const searchKeywords: Record<string, string> = {
        // فلتر
        "فلتر": "فلتر", "فلاتر": "فلتر", "filter": "فلتر", "فلتره": "فلتر", "تصفية": "فلتر",
        // حوض
        "حوض": "حوض", "أحواض": "حوض", "احواض": "حوض", "tank": "حوض", "aquarium": "حوض",
        "اكواريوم": "حوض", "أكواريوم": "حوض", "اكوريم": "حوض",
        // طعام
        "طعام": "طعام", "أكل": "طعام", "غذاء": "طعام", "food": "طعام", "اكل": "طعام",
        "تغذية": "طعام", "علف": "طعام",
        // سمك
        "سمك": "سمك", "أسماك": "سمك", "سمكة": "سمك", "سمجة": "سمك", "fish": "سمك",
        "سمچ": "سمك", "سمچة": "سمك", "اسماك": "سمك",
        // سخان
        "سخان": "سخان", "heater": "سخان", "حرارة": "سخان", "تدفئة": "سخان",
        // إضاءة
        "إضاءة": "إضاءة", "اضاءة": "إضاءة", "انارة": "إضاءة", "إنارة": "إضاءة",
        "ضوء": "إضاءة", "led": "إضاءة", "light": "إضاءة",
        "لمبة": "إضاءة", "ليد": "إضاءة", "نور": "إضاءة",
        // ديكور
        "ديكور": "ديكور", "زينة": "ديكور", "decoration": "ديكور", "تزيين": "ديكور",
        "صخر": "ديكور", "خشبة": "ديكور", "خشب": "ديكور",
        // مضخة
        "مضخة": "مضخة", "هواء": "مضخة هواء", "pump": "مضخة", "مضخه": "مضخة",
        "ستون": "مضخة هواء", "حجر هواء": "مضخة هواء", "بابل": "مضخة هواء",
        // معالج/دواء
        "معالج": "معالج", "علاج": "معالج", "دواء": "معالج", "treatment": "معالج",
        "مريض": "معالج", "مرض": "معالج", "بقع بيضاء": "معالج", "فطريات": "معالج",
        "ملح": "معالج", "ميثيلين": "معالج", "كلور": "معالج",
        "مكلوبي": "معالج", "مقلوبة": "معالج", "تطوف": "معالج", "تعوم": "معالج",
        "منتفخ": "معالج", "انتفاخ": "معالج", "تعفن": "معالج", "ich": "معالج",
        "جدري": "معالج", "بقع": "معالج", "نقط": "معالج",
        // نبات
        "نبات": "نبات", "نباتات": "نبات", "plant": "نبات", "نباتيه": "نبات",
        "طحلب": "نبات", "موس": "نبات",
        // حصى/رمل
        "حصى": "حصى", "رمل": "رمل", "gravel": "حصى", "تربة": "حصى", "سبستريت": "حصى",
        // تنظيف
        "تنظيف": "تنظيف", "فرشاة": "فرشاة", "cleaning": "تنظيف", "غسل": "تنظيف",
        "تنضيف": "تنظيف", "مگنس": "تنظيف", "مغناطيس": "تنظيف", "سيفون": "تنظيف",
        // أدوات أخرى
        "حاضنة": "حاضنة", "incubator": "حاضنة",
        "اسفنج": "اسفنج", "قطن": "قطن", "سيراميك": "سيراميك", "كربون": "كربون",
        "فحص": "فحص", "اختبار": "فحص", "أمونيا": "أمونيا", "test": "فحص",
        "خرطوم": "خرطوم", "أنبوب": "خرطوم",
        "شبكة": "شبكة", "شبچة": "شبكة",
        "مقياس": "مقياس حرارة", "ثرمومتر": "مقياس حرارة", "thermometer": "مقياس حرارة",
    };

    // Detect shopping intent keywords (even without specific product)
    const shoppingSignals = [
        "شنو عدكم", "شتبيعون", "شنو تبيعون", "منتجات", "شي حلو",
        "ابي", "أبي", "اريد", "أريد", "محتاج", "احتاج", "لازم",
        "ابدي", "أبدي", "ابدأ", "أبدأ", "جديد", "مبتدئ",
        "اشتري", "أشتري", "شراء", "سعر", "كم سعر", "اسعار", "أسعار",
        "لوازم", "مستلزمات", "أدوات", "باقة", "مجموعة", "ستارتر",
        "شنو الي", "شنو اللي", "ريد", "ارید",
    ];

    // Find matching product keywords
    const matchedTerms = new Set<string>();
    for (const [keyword, searchTerm] of Object.entries(searchKeywords)) {
        if (msg.includes(keyword)) {
            matchedTerms.add(searchTerm);
        }
    }

    // If no specific keywords but clear shopping intent, do a general search
    const hasShoppingIntent = shoppingSignals.some(kw => msg.includes(kw));
    if (matchedTerms.size === 0 && hasShoppingIntent) {
        // General search - fetch popular/recommended products
        try {
            const result = await aiToolsExecutor.getDeals({ limit: 5 });
            if (result.success && result.data && result.data.length > 0) {
                products = [...products, ...result.data];
            }
        } catch { /* best-effort */ }
        try {
            const result = await aiToolsExecutor.searchProducts({ query: "حوض", limit: 4 });
            if (result.success && result.data) {
                products = [...products, ...result.data];
            }
        } catch { /* best-effort */ }
    }

    // Search for products if specific keywords found (max 3 searches)
    if (matchedTerms.size > 0) {
        for (const term of Array.from(matchedTerms).slice(0, 3)) {
            try {
                const result = await aiToolsExecutor.searchProducts({ query: term, limit: 5 });
                if (result.success && result.data) {
                    products = [...products, ...result.data];
                }
            } catch { /* search is best-effort */ }
        }
    }

    // Check for deals/discount keywords
    const dealsKeywords = ["عرض", "عروض", "خصم", "تخفيض", "كوبون", "deal", "discount", "sale", "أرخص", "ارخص", "رخيص", "أوفر"];
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
    const historyKeywords = ["طلباتي", "مشترياتي", "سجل", "order", "history", "توصية", "انصحني", "اقترح",
        "نصحني", "نصيحة", "شنو تنصح", "شتنصح", "شتنصحني", "رأيك", "رايك"];
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
        const productList = unique.slice(0, 10).map(p => {
            const discount = p.originalPrice && parseFloat(p.originalPrice) > parseFloat(p.price)
                ? ` (خصم ${Math.round(((parseFloat(p.originalPrice) - parseFloat(p.price)) / parseFloat(p.originalPrice)) * 100)}% - كان ${p.originalPrice} د.ع)`
                : "";
            const stockStatus = p.stock > 10 ? "متوفر" : p.stock > 0 ? `متوفر (${p.stock} فقط)` : "نفذ";
            return `- ${p.name} | ${p.price} د.ع${discount} | ${stockStatus} | الفئة: ${p.category || '-'}`;
        }).join("\n");
        contextParts.push(`[المنتجات المتوفرة]\n${productList}`);
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

        // 2. Create system prompt (with context for admin data injection)
        const systemPrompt = createSalesAgentPrompt(context?.userName, customerProfile, isAdmin, context);

        // 3. Check Groq availability
        if (!groqClient.hasKeys()) {
            return { text: getRandomFallback(), products: [] };
        }

        // 4. Pre-execute tools based on message keywords (for all users)
        let toolProducts: any[] = [];
        let toolContext = "";
        try {
            const toolResult = await preExecuteTools(message, userId);
            toolProducts = toolResult.products;
            toolContext = toolResult.context;
            if (toolProducts.length > 0) {
                aiMonitor.log({ event: "search", level: "info", userId, sessionId, productsFound: toolProducts.length, success: true });
            }
        } catch (toolErr: any) {
            aiMonitor.logError("Tool pre-execution failed", { error: toolErr?.message }, { userId, sessionId, event: "tool_call" });
        }

        // 5. Build message with product context injected
        const userMessageWithContext = toolContext
            ? `${message}\n\n---\n${toolContext}`
            : message;

        // Limit history to last 20 messages to prevent token overflow
        const trimmedHistory = history.slice(-20);

        const groqMessages: GroqChatMessage[] = [
            { role: "system", content: systemPrompt },
            ...trimmedHistory.map(msg => ({
                role: msg.role === "user" ? "user" as const : "assistant" as const,
                content: msg.content
            })),
            { role: "user", content: userMessageWithContext }
        ];

        // 6. Sentiment analysis (fire-and-forget)
        if (userId || sessionId) {
            sentimentAnalyzer.analyzeSentiment(message, userId, sessionId).catch(() => { });
        }

        // 7. Call Groq — try compound-beta first (has web search), fallback to llama-3.3-70b
        const startMs = Date.now();
        let modelUsed = "compound-beta";
        let webSearchUsed = false;
        let fallbackUsed = false;

        const response = await withTimeout(
            (async () => {
                try {
                    const res = await groqClient.chat(groqMessages, {
                        model: "compound-beta",
                        temperature: 0.7,
                        maxTokens: 2048,
                    });
                    // compound-beta may include web search in its process
                    webSearchUsed = true;
                    return res;
                } catch (compoundErr: any) {
                    const msg = (compoundErr?.message || "").toLowerCase();
                    const isModelErr = msg.includes("model") || msg.includes("not found") ||
                        msg.includes("does not exist") || msg.includes("unsupported") ||
                        msg.includes("invalid");
                    if (isModelErr) {
                        console.warn("⚠️ compound-beta unavailable, falling back to llama-3.3-70b");
                        aiMonitor.log({ event: "fallback", level: "warning", userId, sessionId, model: "compound-beta", details: { reason: compoundErr?.message } });
                        modelUsed = "llama-3.3-70b-versatile";
                        fallbackUsed = true;
                        webSearchUsed = false;
                        return await groqClient.chat(groqMessages, {
                            temperature: 0.7,
                            maxTokens: 2048,
                        });
                    }
                    throw compoundErr;
                }
            })(),
            AI_TIMEOUT_MS,
            "انتهت مهلة الاتصال"
        );

        const responseTimeMs = Date.now() - startMs;
        const tokenCount = (response as any).usage?.total_tokens;
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
            aiMonitor.log({ event: "fallback", level: "warning", userId, sessionId, model: modelUsed, details: { reason: "empty_response" } });
        }

        // Log successful chat
        aiMonitor.log({
            event: "chat", level: "info", model: modelUsed, userId, sessionId,
            responseTimeMs, success: true, tokenCount,
            productsFound: toolProducts.length, fallbackUsed, webSearchUsed,
            messageLength: message.length,
        });

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

        // Log the error
        const errMsg = error instanceof Error ? error.message : String(error);
        const isTimeout = errMsg.includes("انتهت مهلة") || errMsg.includes("timeout");
        aiMonitor.log({
            event: isTimeout ? "timeout" : "error",
            level: isTimeout ? "warning" : "error",
            success: false, userId, sessionId,
            errorMessage: errMsg,
            errorCode: (error as any)?.status?.toString() ?? (error as any)?.code,
            messageLength: message.length,
        });

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
