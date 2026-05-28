import { db } from "../../db";
import { socialInteractions } from "../../../shared/schema";
import { inArray } from "drizzle-orm";
import { fetchInstagramComments, replyToInstagramComment, sendInstagramPrivateReply } from "./instagram-service";
import { fetchFacebookComments, replyToFacebookComment, sendFacebookPrivateReply } from "./facebook-service";

// ─────────────────────────────────────────────
// CAMPAIGN DEFINITIONS
// Source of truth: AQUAVO_CONTENT_CALENDAR.json
//   Post 6  (2026-05-21) → keyword: قائمة   → /guides/5-mistakes
//   Post 13 (2026-05-28) → keyword: سمچتي   → /guides/fish-hiding
//   Post 40 (2026-06-18) → keyword: خرافات  → /guides/water-myths
//   Post 44 (2026-06-25) → keyword: أدوات   → /guides/essential-tools
//   Calendar Post (فحص)  → keyword: فحص     → /products/c4-1123 (YEE Test Strips)
//   Calendar Post (يم)   → keyword: يم      → /guides/water-change-schedule
//
// IMPORTANT: Customer messages send HTML guide URLs ONLY.
// PDF is downloadable from inside the guide page — never linked directly.
//
// BLOCKED_TERMS — never add these as campaign terms:
//   غالي  (Post 19, 2026-06-03) — CTA does NOT ask customers to write this word
//   نعم   (Post 25, 2026-06-06) — CTA does NOT ask customers to write this word
//   Adding these would trigger automation for every "expensive?" or affirmative reply.
// ─────────────────────────────────────────────

const BASE_URL = "https://www.aquavoiq.com";

interface Campaign {
    id: string;
    // Single-word or short terms that clearly signal this campaign's intent.
    // Matched as substrings of the normalized input (phase 2).
    terms: string[];
    // Multi-word phrases that signal this campaign's intent with higher specificity.
    // Checked first (phase 1) to resolve ambiguity before single-term matching.
    phrases: string[];
    guideUrl: string;
    instagramDM: string[];
    instagramPublicSuccess: string[];
    instagramDMFailed: string[];
    facebookPublicReply: string[];
}

// ─────────────────────────────────────────────
// Arabic normalization
// - Strip tashkeel/diacritics
// - Normalize hamza-alef variants (أ إ آ ٱ) → ا
// - Normalize taa marbuta (ة) → ه
// - Remove non-Arabic-block characters (keeps چ پ گ ژ and all extended Arabic)
// - Collapse whitespace
// ─────────────────────────────────────────────
function normalize(text: string): string {
    return text
        .trim()
        .replace(/[ؐ-ًؚ-ٰٟ]/g, '') // strip tashkeel
        .replace(/[آأإٱ]/g, 'ا')    // أ إ آ ٱ → ا
        .replace(/ة/g, 'ه')                          // ة → ه
        .replace(/[^؀-ۿ\s]/g, '')                            // remove non-Arabic-block chars
        .replace(/\s+/g, ' ')
        .trim();
}

const CAMPAIGNS: Campaign[] = [
    // ── Campaign 1: 5 Mistakes (قائمة) ──────────────────────────────
    // Calendar Post 6 · 2026-05-21 · CTA: اكتب 'قائمة' وأرسلك الدليل الكامل
    {
        id: "5-mistakes",
        terms: [
            // Official keyword and spelling variants
            'قائمة', 'قائمه', 'القائمة', 'قايمة', 'قايمه',
            // Core campaign concept: mistakes
            'أخطاء', 'اخطاء',
        ],
        phrases: [
            // Phrases containing the keyword with extra words
            'اريد القائمة', 'اريد القائمه',
            'دزلي القائمة', 'دزلي القائمه',
            'القائمة كاملة', 'القائمه كامله',
            // Mistakes-specific phrases
            'دليل الأخطاء', 'دليل الاخطاء',
            'أخطاء المبتدئين', 'اخطاء المبتدئين',
            'أخطاء السمچ', 'اخطاء السمچ',
            'أخطاء السمج', 'اخطاء السمج',
            'أخطاء الحوض', 'اخطاء الحوض',
            'شنو الأخطاء', 'شنو الاخطاء',
            'أكثر الأخطاء', 'اكثر الاخطاء',
        ],
        guideUrl: `${BASE_URL}/guides/5-mistakes`,
        instagramDM: [
            `تم، هذا دليل الأخطاء الخمسة الشائعة بالأحواض:\n\n${BASE_URL}/guides/5-mistakes\n\nإذا تريد تشخيص لحوضك، أرسل صورة واضحة للحوض والفلتر ومكان الإضاءة.\n\nولحتى توصلك الأدلة القادمة أول بأول، تابع AQUAVO.`,

            `وصلتك القائمة.\n\nهذا دليل مختصر يوضح أكثر الأخطاء اللي تتكرر بالأحواض، وشلون تتجنبها:\n\n${BASE_URL}/guides/5-mistakes\n\nإذا تحتاج رأي مباشر بحوضك، أرسل صورة واضحة للحوض.\n\nتابع AQUAVO حتى توصلك الأدلة القادمة أول بأول.`,

            `هذا ملف الأخطاء الخمسة مثل ما طلبت:\n\n${BASE_URL}/guides/5-mistakes\n\nاقرأه بهدوء، وإذا عندك مشكلة بحوضك أرسل صورة ونشخصها لك بشكل أوضح.\n\nالأدلة القادمة راح تنزل أولاً على صفحة AQUAVO.`,

            `تم إرسال الدليل.\n\nراح يساعدك تعرف وين الغلط قبل لا تخسر سمكك:\n\n${BASE_URL}/guides/5-mistakes\n\nللتشخيص، أرسل صورة الحوض والفلتر ومكان الإضاءة.\n\nتابع AQUAVO حتى توصلك النصائح الجديدة أول بأول.`,

            `هذا دليل AQUAVO للأخطاء الخمسة الشائعة بالأحواض:\n\n${BASE_URL}/guides/5-mistakes\n\nإذا تريد نحدد لك الخطوة الأنسب، أرسل صورة واضحة للحوض.\n\nتابع الصفحة حتى توصلك الأدلة القادمة.`,

            `القائمة جاهزة.\n\nرتبنا لك أكثر 5 أخطاء تتعب الحوض مع التصحيح المناسب وروابط المنتجات داخل الدليل:\n\n${BASE_URL}/guides/5-mistakes\n\nإذا تحتاج مساعدة، أرسل صورة الحوض.\n\nتابع AQUAVO حتى ما تفوتك الأدلة القادمة.`,

            `تم تجهيز الدليل المطلوب.\n\nداخل الملف راح تلقى الأخطاء الخمسة، علاماتها، والتصرف الصحيح:\n\n${BASE_URL}/guides/5-mistakes\n\nإذا تريد تشخيص أدق، أرسل صورة الحوض والفلتر والإضاءة.`,

            `هذا رابط دليل الأخطاء الخمسة:\n\n${BASE_URL}/guides/5-mistakes\n\nابدأ من صفحة الفحص وتبديل المي، لأنها أكثر نقطتين تسبب مشاكل بدون ما تبين بسرعة.\n\nإذا تحتاج متابعة، أرسل صورة الحوض.`,

            `وصل ملف AQUAVO.\n\nالدليل يشرح أكثر الأخطاء اللي تتكرر عند المبتدئين وحتى بعض أصحاب الأحواض القديمة:\n\n${BASE_URL}/guides/5-mistakes\n\nإذا تريد رأي عملي، أرسل صورة واضحة للحوض.`,

            `تم، هذا الدليل المجاني:\n\n${BASE_URL}/guides/5-mistakes\n\nبي شرح مختصر ومباشر للأخطاء الخمسة وروابط المنتجات المناسبة من AQUAVO.\n\nتابع الصفحة حتى توصلك الإصدارات القادمة من الأدلة.`,
        ],
        instagramPublicSuccess: [
            "تم، وصلتك القائمة بالخاص.",
            "تم إرسال الدليل بالخاص.",
            "وصلتك القائمة برسالة خاصة.",
            "تم، راجع الرسائل الخاصة.",
            "أرسلنا لك الدليل بالخاص.",
            "تم إرسال ملف الأخطاء الخمسة بالخاص.",
            "القائمة وصلت للخاص.",
            "تم، الدليل صار عندك بالرسائل.",
            "وصلتك نسخة الدليل بالخاص.",
            "تم إرسال الرابط برسالة خاصة.",
        ],
        instagramDMFailed: [
            "حاولنا نرسل الدليل، لكن الخاص ما قبل يوصل. أرسل لنا كلمة قائمة بالخاص ونرسله لك مباشرة.",
            "الرسالة الخاصة ما وصلت بسبب إعدادات الحساب. أرسل كلمة قائمة بالخاص ونرسل لك الدليل.",
            "ما قدرنا نوصل الرابط بالخاص. راسل الصفحة بكلمة قائمة حتى نرسل لك الملف مباشرة.",
            "الخاص غير متاح حالياً عندك. أرسل لنا رسالة بكلمة قائمة ونوصلك الدليل.",
            "حاولنا نرسل الملف، لكن الرسالة ما وصلت. افتح محادثة معنا بكلمة قائمة ونرسله لك مباشرة.",
        ],
        facebookPublicReply: [
            `هذا رابط دليل الأخطاء الخمسة:\n${BASE_URL}/guides/5-mistakes`,
            `تفضل، ملف الأخطاء الخمسة بالأحواض:\n${BASE_URL}/guides/5-mistakes`,
            `هذا الدليل المطلوب:\n${BASE_URL}/guides/5-mistakes`,
            `تم، هذا رابط ملف AQUAVO للأخطاء الخمسة:\n${BASE_URL}/guides/5-mistakes`,
            `رابط الدليل هنا:\n${BASE_URL}/guides/5-mistakes`,
        ],
    },

    // ── Campaign 2: Fish Hiding (سمچتي / يتچمس) ─────────────────────
    // Calendar Post 13 · 2026-05-28 · CTA: اكتب 'سمچتي' بالتعليقات وأرسلك الدليل
    {
        id: "fish-hiding",
        terms: [
            // Official calendar keyword + the original campaign keyword
            'يتچمس', 'يتجمس',
            // Customer variants: "my fish" in Iraqi
            'سمچتي', 'سمجتي', 'سمكتي',
            // Hiding/disappearing behavior terms
            'مختفية', 'مختفيه', 'مختفي',
            'تختفي', 'يختفي',
            'تتخبى', 'يتخبى',
            'مخبي', 'مخبية', 'مخبيه',
            // Core concept noun
            'اختفاء',
        ],
        phrases: [
            // Specific customer phrasing patterns
            'ليش سمچتي', 'ليش سمجتي', 'ليش سمكتي',
            'ليش السمچ', 'ليش السمج', 'ليش السمك',
            'السمچ مختفي', 'السمج مختفي', 'السمك مختفي',
            'سمچتي مختفية', 'سمچتي مختفيه',
            'سمجتي مختفية', 'سمجتي مختفيه',
            'سمكتي مختفية', 'سمكتي مختفيه',
            'سمچتي تتخبى', 'سمجتي تتخبى', 'سمكتي تتخبى',
            'السمچ يظل مخبي', 'السمج يظل مخبي',
            'اختفاء السمچ', 'اختفاء السمج', 'اختفاء السمك',
            'دليل الاختفاء',
        ],
        guideUrl: `${BASE_URL}/guides/fish-hiding`,
        instagramDM: [
            `تم، هذا دليل يشرح متى اختفاء السمچ طبيعي ومتى يصير إنذار حقيقي:\n\n${BASE_URL}/guides/fish-hiding\n\nداخل الصفحة تكدر تقرأ الدليل كامل وتحمله PDF.\n\nإذا تريد رأي بحوضك، أرسل صورة واضحة للحوض والسمچة.`,

            `وصل الدليل.\n\nأغلب حالات الاختفاء طبيعية، بس أكو علامات لازم تعرفها قبل لا تفوتك:\n\n${BASE_URL}/guides/fish-hiding\n\nمن داخل الصفحة تكدر تحمل PDF.\n\nإذا تريد تشخيص مباشر، أرسل صورة الحوض والسمچة.`,

            `هذا دليل AQUAVO لاختفاء السمچ:\n\n${BASE_URL}/guides/fish-hiding\n\nيساعدك تفرق بين الاختفاء الطبيعي والمشكلة الحقيقية اللي تحتاج تشخيص سريع.\n\nداخل الصفحة في زر تحميل PDF إذا تحب تحتفظ بي.`,

            `تم.\n\nحالة الاختفاء مو دائماً مشكلة، بس لازم تعرف الفرق:\n\n${BASE_URL}/guides/fish-hiding\n\nاقرأ الدليل بالصفحة واذا تبي تحمله موجود جوّه.\n\nإذا السمچة ما تاكل أو تبين عليها علامات، أرسل صورة ونشوفها.`,

            `وصلك الدليل مثل ما طلبت:\n\n${BASE_URL}/guides/fish-hiding\n\nيوضح 4 أسباب رئيسية للاختفاء والحلول الصحيحة لكل حالة.\n\nللتشخيص الأدق، أرسل صورة واضحة للحوض ومكان السمچة.`,
        ],
        instagramPublicSuccess: [
            "تم، وصلك الدليل بالخاص.",
            "أرسلنا لك الدليل برسالة خاصة.",
            "تم إرسال الدليل بالخاص.",
            "راجع الرسائل الخاصة، وصلك الدليل.",
            "تم، الدليل صار عندك بالخاص.",
        ],
        instagramDMFailed: [
            "حاولنا نرسل الدليل بالخاص، لكن الرسالة ما وصلت. أرسل لنا كلمة سمچتي بالخاص مباشرة.",
            "الخاص غير متاح عندك. راسلنا بكلمة سمچتي ونرسل لك الدليل مباشرة.",
            "الرسالة الخاصة ما وصلت بسبب إعدادات حسابك. أرسل كلمة سمچتي بالخاص ونوصلك الدليل.",
        ],
        facebookPublicReply: [
            `هذا دليل اختفاء السمچ من AQUAVO:\n${BASE_URL}/guides/fish-hiding`,
            `تفضل، الدليل المطلوب هنا:\n${BASE_URL}/guides/fish-hiding`,
            `رابط الدليل:\n${BASE_URL}/guides/fish-hiding`,
        ],
    },

    // ── Campaign 3: Water Myths (خرافات) ────────────────────────────
    // Calendar Post 40 · 2026-06-18 · CTA: اكتب 'خرافات' بالـ DM PDF كامل
    {
        id: "water-myths",
        terms: [
            // Official keyword and spelling variants (ة→ه handled by normalize)
            'خرافات', 'خرافة', 'خرافه', 'الخرافات',
        ],
        phrases: [
            // Water-related phrases specific to myths campaign
            'مي الحوض', 'ماء الحوض',
            'المي الصافي', 'المي صافي', 'الماء الصافي', 'الماء صافي',
            'خدع المي', 'خدع الماء',
            'أشياء غلط عن المي', 'اشياء غلط عن المي',
            'معلومات غلط عن المي', 'معلومات غلط عن الماء',
            'خرافات المي', 'خرافات الماء', 'خرافات الحوض',
            'دليل الخرافات',
        ],
        guideUrl: `${BASE_URL}/guides/water-myths`,
        instagramDM: [
            `تم، هذا دليل خرافات مي الحوض:\n\n${BASE_URL}/guides/water-myths\n\nيوضح الأشياء اللي تبين طبيعية بس ممكن تضر سمچك بدون ما تنتبه.\n\nداخل الصفحة تكدر تحمل PDF الدليل كامل.`,

            `وصل الدليل.\n\nكثير من الكلام الشائع عن مي الحوض غلط وهاي الدليل يوضح الصح منه:\n\n${BASE_URL}/guides/water-myths\n\nمن داخل الصفحة تكدر تحمل PDF.\n\nإذا تريد تشخيص لحوضك، أرسل صورة واضحة.`,

            `هذا دليل AQUAVO لخرافات مي الحوض:\n\n${BASE_URL}/guides/water-myths\n\nيكشف 5 خرافات شائعة وشنو الصح فعلاً.\n\nداخل الصفحة موجود زر تحميل PDF إذا تحب تحتفظ بي.`,

            `تم.\n\nالخرافات هاي ما تبين غلط بسرعة، لهذا تسبب مشاكل خفية:\n\n${BASE_URL}/guides/water-myths\n\nاقرأ الدليل بالصفحة وداخله تكدر تحمل PDF.\n\nإذا عندك مشكلة بالمي، أرسل نتيجة فحص المي وأرشدك.`,

            `وصلك الدليل:\n\n${BASE_URL}/guides/water-myths\n\nيشرح ليش مي البوري الصافي مو بالضرورة صحي للسمچ وخرافات ثانية شائعة.\n\nإذا تريد رأي، أرسل صورة الحوض وأرقام فحص المي.`,
        ],
        instagramPublicSuccess: [
            "تم، وصلك الدليل بالخاص.",
            "أرسلنا لك دليل خرافات المي برسالة خاصة.",
            "تم إرسال الدليل بالخاص.",
            "راجع الرسائل الخاصة، وصلك الدليل.",
            "تم، الدليل صار عندك بالخاص.",
        ],
        instagramDMFailed: [
            "حاولنا نرسل الدليل بالخاص، لكن الرسالة ما وصلت. أرسل لنا كلمة خرافات بالخاص مباشرة.",
            "الخاص غير متاح عندك. راسلنا بكلمة خرافات ونرسل لك الدليل مباشرة.",
            "الرسالة الخاصة ما وصلت. أرسل كلمة خرافات بالخاص ونوصلك الدليل.",
        ],
        facebookPublicReply: [
            `هذا دليل خرافات مي الحوض من AQUAVO:\n${BASE_URL}/guides/water-myths`,
            `تفضل، الدليل المطلوب هنا:\n${BASE_URL}/guides/water-myths`,
            `رابط الدليل:\n${BASE_URL}/guides/water-myths`,
        ],
    },

    // ── Campaign 4: Essential Tools (أدوات) ─────────────────────────
    // Calendar Post 44 · 2026-06-25 · CTA: اكتب 'أدوات' بالـ DM PDF كامل
    {
        id: "essential-tools",
        terms: [
            // Official keyword and variants (أ→ا handled by normalize)
            'أدوات', 'ادوات', 'الأدوات', 'الادوات',
        ],
        phrases: [
            // Specific tool-request phrases
            'أدوات الحوض', 'ادوات الحوض',
            // "قائمة الأدوات" — checked before 5-mistakes term "قائمة" in phase 1
            'قائمة الأدوات', 'قائمة الادوات',
            'شنو اشتري', 'شنو أشتري',
            'شنو أحتاج', 'شنو احتاج',
            'شنو المهم',
            'احتياجات الحوض',
            'مستلزمات الحوض',
            'الأدوات الأساسية', 'الادوات الاساسية',
            'أدوات أساسية', 'ادوات اساسية',
            'دليل الأدوات', 'دليل الادوات',
        ],
        guideUrl: `${BASE_URL}/guides/essential-tools`,
        instagramDM: [
            `تم، هذا دليل الأدوات الأساسية لأصحاب الأحواض:\n\n${BASE_URL}/guides/essential-tools\n\nيوضح شنو المهم تشتريه من البداية وشنو تكدر تأجله.\n\nداخل الصفحة تكدر تحمل PDF القائمة الكاملة.`,

            `وصل الدليل.\n\nالفلتر والهيتر مو كافيين وهاي القائمة تشرح باقي الأدوات اللي تفرق:\n\n${BASE_URL}/guides/essential-tools\n\nمن داخل الصفحة تكدر تحمل PDF.\n\nإذا تريد مساعدة باختيار الأدوات، أرسل صورة حوضك ومقاساته.`,

            `هذا دليل AQUAVO للأدوات الأساسية:\n\n${BASE_URL}/guides/essential-tools\n\nيشرح 10 أدوات لازم تكون عند كل صاحب حوض للصيانة والطوارئ.\n\nداخل الصفحة موجود زر تحميل PDF.`,

            `تم.\n\nهاي الأدوات تساعدك تحافظ على الحوض بدون ما تنفق أكثر من اللازم:\n\n${BASE_URL}/guides/essential-tools\n\nاقرأ الدليل بالصفحة وداخله تكدر تحمل PDF.\n\nإذا تريد رأي بأداة محددة، أرسل اسمها ونكلك.`,

            `وصلك الدليل مثل ما طلبت:\n\n${BASE_URL}/guides/essential-tools\n\nيفرق بين الأدوات الضرورية من اليوم الأول والأدوات اللي تضيفها بعدين.\n\nداخل الصفحة تكدر تحمل PDF القائمة الكاملة.`,
        ],
        instagramPublicSuccess: [
            "تم، وصلك دليل الأدوات بالخاص.",
            "أرسلنا لك الدليل برسالة خاصة.",
            "تم إرسال الدليل بالخاص.",
            "راجع الرسائل الخاصة، وصلك الدليل.",
            "تم، الدليل صار عندك بالخاص.",
        ],
        instagramDMFailed: [
            "حاولنا نرسل الدليل بالخاص، لكن الرسالة ما وصلت. أرسل لنا كلمة أدوات بالخاص مباشرة.",
            "الخاص غير متاح عندك. راسلنا بكلمة أدوات ونرسل لك الدليل مباشرة.",
            "الرسالة الخاصة ما وصلت. أرسل كلمة أدوات بالخاص ونوصلك الدليل.",
        ],
        facebookPublicReply: [
            `هذا دليل الأدوات الأساسية من AQUAVO:\n${BASE_URL}/guides/essential-tools`,
            `تفضل، الدليل المطلوب هنا:\n${BASE_URL}/guides/essential-tools`,
            `رابط الدليل:\n${BASE_URL}/guides/essential-tools`,
        ],
    },

    // ── Campaign 5: Test Strips (فحص / صحف) ─────────────────────────
    // keyword: فحص (water testing). صحف included as likely keyboard transposition.
    // Sends product page for YEE 9-in-1 Test Strips (slug: c4-1123).
    {
        id: "test-strips",
        terms: [
            'فحص', 'الفحص',
            // صحف is likely a keyboard transposition of فحص — included defensively
            'صحف',
        ],
        phrases: [
            'تحليل مي', 'تحليل الماء', 'تحليل ماء',
            'فحص المي', 'فحص الماء', 'فحص مي',
            'شريط فحص', 'شرائط فحص',
            'شريط اختبار', 'شرائط اختبار',
            'نتيجة الفحص', 'نتائج الفحص',
        ],
        guideUrl: `${BASE_URL}/products/c4-1123`,
        instagramDM: [
            `تم، هذا رابط شرائط فحص المي من AQUAVO:\n\n${BASE_URL}/products/c4-1123\n\nكل شريط يكشف 9 معاملات بنفس الوقت وتقدر تقرأ النتيجة بثواني.\n\nإذا تريد مساعدة بتفسير الأرقام، أرسل لنا النتيجة.`,

            `وصلتك. هذا رابط الشريط:\n\n${BASE_URL}/products/c4-1123\n\nيفحص المي بسرعة ويبين أهم 9 قيم لازم تعرفها.\n\nإذا الأرقام مو واضحة، راسلنا ونفسرها معاك.`,

            `هذا رابط شريط فحص المي:\n\n${BASE_URL}/products/c4-1123\n\nوفر عليك وقت وجهد — نتيجة دقيقة بدون حاجة لأدوات ثانية.\n\nإذا تحتاج مساعدة، أرسل صورة النتيجة ونشوفها معاك.`,

            `تم، هذا المنتج المطلوب:\n\n${BASE_URL}/products/c4-1123\n\nشرائط YEE تغطي 9 معاملات أساسية للمي، من pH للنترات.\n\nبعد الفحص إذا تريد تفسير الأرقام، أرسل لنا.`,

            `هذا رابط شرائط الفحص من AQUAVO:\n\n${BASE_URL}/products/c4-1123\n\nأهم خطوة قبل أي تعديل على الحوض هي فحص المي — وهذا أسهل طريقة.\n\nإذا تريد مساعدة، أرسل نتيجة الفحص ونرشدك.`,
        ],
        instagramPublicSuccess: [
            "تم، وصلك الرابط بالخاص.",
            "أرسلنا لك رابط الشريط برسالة خاصة.",
            "تم إرسال الرابط بالخاص.",
            "راجع الرسائل الخاصة، وصلك الرابط.",
            "تم، الرابط صار عندك بالخاص.",
        ],
        instagramDMFailed: [
            "حاولنا نرسل الرابط بالخاص، لكن الرسالة ما وصلت. أرسل لنا كلمة فحص بالخاص ونرسله لك مباشرة.",
            "الخاص غير متاح عندك. راسلنا بكلمة فحص ونرسل لك رابط الشريط مباشرة.",
            "الرسالة الخاصة ما وصلت. أرسل كلمة فحص بالخاص ونوصلك الرابط.",
        ],
        facebookPublicReply: [
            `هذا رابط شرائط فحص المي من AQUAVO:\n${BASE_URL}/products/c4-1123`,
            `تفضل، رابط المنتج هنا:\n${BASE_URL}/products/c4-1123`,
            `رابط شرائط الفحص:\n${BASE_URL}/products/c4-1123`,
        ],
    },

    // ── Campaign 6: Water Change Schedule (يم / مي) ──────────────────
    // keyword: يم / مي (water in Iraqi dialect). Sends water-change guide.
    // NOTE: terms 'مي' and 'يم' are 2-char substrings — they will match inside
    // longer words (e.g. أمي, يمكن). Accepted risk given aquarium context.
    // Place AFTER water-myths (Campaign 3) — 'مي الحوض' phrase belongs to Campaign 3.
    {
        id: "water-change",
        terms: [
            'يم', 'مي', 'المي',
        ],
        phrases: [
            'تغيير مي', 'تغيير المي', 'تغيير الماء', 'تغيير ماء',
            'تبديل مي', 'تبديل المي', 'تبديل الماء', 'تبديل ماء',
            'جدول تغيير المي', 'جدول تبديل المي',
            'جدول تغيير الماء', 'جدول تبديل الماء',
            'متى اغير المي', 'متى اغير الماء',
            'المي يحتاج تغيير', 'الماء يحتاج تغيير',
            'جدول المي', 'مي جديد', 'ماء جديد',
            'اغير المي', 'اغير الماء',
        ],
        guideUrl: `${BASE_URL}/guides/water-change-schedule`,
        instagramDM: [
            `تم، هذا دليل جدول تغيير مي الحوض:\n\n${BASE_URL}/guides/water-change-schedule\n\nيبين لك متى تغير، قد شنو، وشنو العلامات اللي تقول المي يحتاج تجديد.\n\nإذا تريد جدول مناسب لحوضك، أرسل حجم الحوض ونرتبلك.`,

            `وصل الدليل.\n\nتغيير المي مو مجرد تبديل بماء جديد — والدليل يشرح الفرق:\n\n${BASE_URL}/guides/water-change-schedule\n\nإذا تريد جدول دقيق لحوضك، دز حجم الحوض وعدد السمچ ونرتبلك.`,

            `هذا دليل AQUAVO لجدول تغيير المي:\n\n${BASE_URL}/guides/water-change-schedule\n\nيوضح الجدول الصح حسب حجم الحوض وأهم العلامات اللي تبين المي يحتاج تجديد.\n\nإذا تريد توصية مباشرة، أرسل حجم الحوض.`,

            `تم.\n\nأكثر الناس تغير المي كثير أو قليل — وكلهم يظنون الثاني غلط:\n\n${BASE_URL}/guides/water-change-schedule\n\nداخل الدليل جدول للأحواض الصغيرة والمتوسطة والكبيرة.\n\nإذا تريد جدول خاص بحوضك، أرسل الحجم.`,

            `وصلك الدليل:\n\n${BASE_URL}/guides/water-change-schedule\n\nجدول تغيير المي يختلف حسب حجم الحوض وحمله — والدليل يشرح الفرق بشكل عملي.\n\nلجدول مخصص، أرسل حجم حوضك بالليتر.`,
        ],
        instagramPublicSuccess: [
            "تم، وصلك الدليل بالخاص.",
            "أرسلنا لك دليل جدول المي برسالة خاصة.",
            "تم إرسال الدليل بالخاص.",
            "راجع الرسائل الخاصة، وصلك الدليل.",
            "تم، الدليل صار عندك بالخاص.",
        ],
        instagramDMFailed: [
            "حاولنا نرسل الدليل بالخاص، لكن الرسالة ما وصلت. أرسل لنا كلمة يم بالخاص مباشرة.",
            "الخاص غير متاح عندك. راسلنا بكلمة يم ونرسل لك الدليل مباشرة.",
            "الرسالة الخاصة ما وصلت. أرسل كلمة يم بالخاص ونوصلك الدليل.",
        ],
        facebookPublicReply: [
            `هذا دليل جدول تغيير المي من AQUAVO:\n${BASE_URL}/guides/water-change-schedule`,
            `تفضل، دليل جدول المي هنا:\n${BASE_URL}/guides/water-change-schedule`,
            `رابط الدليل:\n${BASE_URL}/guides/water-change-schedule`,
        ],
    },
];

// ─────────────────────────────────────────────
// Two-phase keyword matching
//
// Phase 1: multi-word phrase matching (higher specificity)
//   - Resolves ambiguity before single-term matching
//   - Example: "قائمة الأدوات" → essential-tools (phrase) wins
//     over "قائمة" → 5-mistakes (term)
//
// Phase 2: single-term matching
//   - Each term is unique to its campaign — no cross-campaign overlap
//   - Returns first campaign match in CAMPAIGNS order
//
// Safety: "دليل" / "pdf" / "سلام" / "سعر" / "فلتر" / "هيتر" / "حوضي تعبان" / "اريد اشتري" → no match
// BLOCKED (never add): "غالي" (Post 19) / "نعم" (Post 25) — see header comment
// ─────────────────────────────────────────────
function matchCampaign(text: string): Campaign | null {
    if (!text?.trim()) return null;

    const n = normalize(text);
    if (!n) return null; // e.g. pure-Latin input like "pdf"

    // Phase 1: phrase matching — check all campaigns in order, return first match
    for (const campaign of CAMPAIGNS) {
        if (campaign.phrases.some(p => n.includes(normalize(p)))) {
            return campaign;
        }
    }

    // Phase 2: single-term matching — return first campaign whose term appears in text
    for (const campaign of CAMPAIGNS) {
        if (campaign.terms.some(t => n.includes(normalize(t)))) {
            return campaign;
        }
    }

    return null;
}

/**
 * Deterministic variant selection based on commentId string
 */
function selectVariant(variants: string[], seedString: string): string {
    let hash = 0;
    for (let i = 0; i < seedString.length; i++) {
        hash = seedString.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % variants.length;
    return variants[index];
}

export async function processCommentsForMedia(
    platform: 'instagram' | 'facebook',
    mediaId: string,
    accessToken: string,
    sinceTimestamp?: number,
    dryRun: boolean = false
) {
    try {
        let comments = [];
        if (platform === 'instagram') {
            comments = await fetchInstagramComments(mediaId, accessToken);
        } else {
            comments = await fetchFacebookComments(mediaId, accessToken);
        }

        // Filter new comments
        if (sinceTimestamp) {
            comments = comments.filter((c: any) => new Date(c.timestamp).getTime() > sinceTimestamp);
        }

        const matchedComments: Array<{ comment: any; campaign: Campaign }> = [];
        const skippedWrongKeywords: any[] = [];

        for (const c of comments) {
            const campaign = matchCampaign(c.text);
            if (campaign) {
                matchedComments.push({ comment: c, campaign });
            } else {
                skippedWrongKeywords.push(c);
            }
        }

        if (matchedComments.length === 0) {
            return {
                matched: 0,
                processed: 0,
                skippedWrongKeywords: skippedWrongKeywords.length,
                skippedDuplicates: 0,
                deliveryPlan: [],
                dryRun
            };
        }

        // Get already processed comments
        const commentIds = matchedComments.map(({ comment }) => comment.id);
        const existingRecords = await db.select({ commentId: socialInteractions.commentId })
            .from(socialInteractions)
            .where(inArray(socialInteractions.commentId, commentIds));

        const existingIds = new Set(existingRecords.map(r => r.commentId));

        let processedCount = 0;
        let skippedDuplicates = 0;
        const deliveryPlan = [];

        for (const { comment, campaign } of matchedComments) {
            if (existingIds.has(comment.id)) {
                skippedDuplicates++;
                continue;
            }

            let dmSent = false;
            let replySent = false;
            let plannedDM = "";
            let plannedReply = "";

            if (platform === 'instagram') {
                plannedDM = selectVariant(campaign.instagramDM, comment.id);
                plannedReply = selectVariant(campaign.instagramPublicSuccess, comment.id);
                const failedReply = selectVariant(campaign.instagramDMFailed, comment.id);

                deliveryPlan.push({
                    commentId: comment.id,
                    username: comment.username,
                    campaign: campaign.id,
                    guideUrl: campaign.guideUrl,
                    action: 'Instagram DM + Public Reply',
                    plannedDM,
                    plannedReply,
                    failedReplyFallback: failedReply
                });

                if (!dryRun) {
                    try {
                        await sendInstagramPrivateReply(comment.id, plannedDM, accessToken);
                        dmSent = true;
                    } catch (e) {
                        console.error(`[AutoResponder] IG DM failed for comment ${comment.id}:`, e);
                    }

                    try {
                        const replyToUse = dmSent ? plannedReply : failedReply;
                        await replyToInstagramComment(comment.id, replyToUse, accessToken);
                        replySent = true;
                    } catch (e) {
                        console.error(`[AutoResponder] IG Reply failed for comment ${comment.id}:`, e);
                    }
                }
            } else {
                // Facebook: public reply with guide URL
                plannedReply = selectVariant(campaign.facebookPublicReply, comment.id);

                deliveryPlan.push({
                    commentId: comment.id,
                    username: comment.username,
                    campaign: campaign.id,
                    guideUrl: campaign.guideUrl,
                    action: 'Facebook Public Reply with Guide Link',
                    plannedReply
                });

                if (!dryRun) {
                    try {
                        await replyToFacebookComment(comment.id, plannedReply, accessToken);
                        replySent = true;
                    } catch (e) {
                        console.error(`[AutoResponder] FB Public Reply failed for comment ${comment.id}:`, e);
                    }
                }
            }

            if (!dryRun) {
                await db.insert(socialInteractions).values({
                    platform,
                    mediaId,
                    commentId: comment.id,
                    username: comment.username || 'unknown',
                    keywordMatched: comment.text.substring(0, 50),
                    dmSent,
                    replySent
                });

                // 5–10 second delay between messages
                const delayMs = Math.floor(Math.random() * 5000) + 5000;
                await new Promise(r => setTimeout(r, delayMs));
            }

            processedCount++;
        }

        return {
            matched: matchedComments.length,
            processed: processedCount,
            skippedWrongKeywords: skippedWrongKeywords.length,
            skippedDuplicates,
            deliveryPlan,
            dryRun
        };
    } catch (error: any) {
        const errorMessage = error.message ? error.message.replace(accessToken, '***TOKEN***') : 'Unknown error';
        console.error(`[AutoResponder] Error processing ${platform} comments for media ${mediaId}:`, errorMessage);
        throw new Error(errorMessage);
    }
}

// Background poller state
const monitorIntervals: Record<string, NodeJS.Timeout> = {};

export function startMonitorMode(
    platform: 'instagram' | 'facebook',
    mediaId: string,
    accessToken: string,
    intervalMs: number = 60000
) {
    const key = `${platform}_${mediaId}`;
    if (monitorIntervals[key]) {
        console.log(`[AutoResponder] Monitor already running for ${key}`);
        return;
    }

    console.log(`[AutoResponder] Starting Monitor Mode for ${key}`);
    const sinceTimestamp = Date.now();

    const interval = setInterval(async () => {
        try {
            await processCommentsForMedia(platform, mediaId, accessToken, sinceTimestamp, false);
        } catch (error) {
            console.error(`[AutoResponder] Polling error for ${key}:`, error);
        }
    }, intervalMs);

    monitorIntervals[key] = interval;
}

export function stopMonitorMode(platform: 'instagram' | 'facebook', mediaId: string) {
    const key = `${platform}_${mediaId}`;
    if (monitorIntervals[key]) {
        clearInterval(monitorIntervals[key]);
        delete monitorIntervals[key];
        console.log(`[AutoResponder] Stopped Monitor Mode for ${key}`);
    }
}
