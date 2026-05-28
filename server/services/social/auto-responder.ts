import { db } from "../../db";
import { socialInteractions } from "../../../shared/schema";
import { inArray } from "drizzle-orm";
import { fetchInstagramComments, replyToInstagramComment, sendInstagramPrivateReply } from "./instagram-service";
import { fetchFacebookComments, replyToFacebookComment, sendFacebookPrivateReply } from "./facebook-service";

// ─────────────────────────────────────────────
// CAMPAIGN DEFINITIONS
// Source of truth: AQUAVO_CONTENT_CALENDAR.json
//
//   Batch 1 (live):
//   Post 6  (2026-05-21) → keyword: قائمة   → /guides/5-mistakes
//   Post 13 (2026-05-28) → keyword: سمجتي   → /guides/fish-hiding
//   Post 40 (2026-06-18) → keyword: خرافات  → /guides/water-myths
//   Post 44 (2026-06-25) → keyword: أدوات   → /guides/essential-tools
//   Calendar Post (فحص)  → keyword: فحص     → /products/c4-1123 (YEE Test Strips)
//   Calendar Post (يم)   → keyword: يم      → /guides/water-change-schedule
//
//   Batch 2 (new):
//   Campaign (حوضي)  → keyword: حوضي    → consultation DM (no guide page)
//   Campaign (انقاذ) → keyword: انقاذ   → /guides/tank-rescue-plan
//   Campaign (اكل)   → keyword: اكل     → /guides/feeding-table
//   Campaign (جديد)  → keyword: جديد    → /products
//   Campaign (فلتر)  → keyword: فلتر    → /guides/filter-choice
//   Campaign (حراره) → keyword: حراره   → /guides/temperature-guide
//   Campaign (سعيد)  → keyword: سعيد    → /guides/happy-fish-signs
//   Campaign (ملح)   → keyword: ملح     → /guides/aquarium-salt
//   Campaign (وسط)   → keyword: وسط     → /guides/filter-media
//   Campaign (طحالب) → keyword: طحالب   → /guides/algae-control
//   Campaign (سلك)   → keyword: سلك     → /guides/white-scale
//   Campaign (علاج)  → keyword: علاج    → /guides/treatment-basics  [before عزل]
//   Campaign (عزل)   → keyword: عزل     → /guides/quarantine
//   Campaign (هيتر)  → keyword: هيتر    → /guides/heater-choice
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
            `تم، هذا دليل يشرح متى اختفاء السمج طبيعي ومتى يصير إنذار حقيقي:\n\n${BASE_URL}/guides/fish-hiding\n\nداخل الصفحة تكدر تقرأ الدليل كامل وتحمله PDF.\n\nإذا تريد رأي بحوضك، أرسل صورة واضحة للحوض والسمجة.`,

            `وصل الدليل.\n\nأغلب حالات الاختفاء طبيعية، بس أكو علامات لازم تعرفها قبل لا تفوتك:\n\n${BASE_URL}/guides/fish-hiding\n\nمن داخل الصفحة تكدر تحمل PDF.\n\nإذا تريد تشخيص مباشر، أرسل صورة الحوض والسمجة.`,

            `هذا دليل AQUAVO لاختفاء السمج:\n\n${BASE_URL}/guides/fish-hiding\n\nيساعدك تفرق بين الاختفاء الطبيعي والمشكلة الحقيقية اللي تحتاج تشخيص سريع.\n\nداخل الصفحة في زر تحميل PDF إذا تحب تحتفظ بي.`,

            `تم.\n\nحالة الاختفاء مو دائماً مشكلة، بس لازم تعرف الفرق:\n\n${BASE_URL}/guides/fish-hiding\n\nاقرأ الدليل بالصفحة واذا تبي تحمله موجود جوّه.\n\nإذا السمجة ما تاكل أو تبين عليها علامات، أرسل صورة ونشوفها.`,

            `وصلك الدليل مثل ما طلبت:\n\n${BASE_URL}/guides/fish-hiding\n\nيوضح 4 أسباب رئيسية للاختفاء والحلول الصحيحة لكل حالة.\n\nللتشخيص الأدق، أرسل صورة واضحة للحوض ومكان السمجة.`,
        ],
        instagramPublicSuccess: [
            "تم، وصلك الدليل بالخاص.",
            "أرسلنا لك الدليل برسالة خاصة.",
            "تم إرسال الدليل بالخاص.",
            "راجع الرسائل الخاصة، وصلك الدليل.",
            "تم، الدليل صار عندك بالخاص.",
        ],
        instagramDMFailed: [
            "حاولنا نرسل الدليل بالخاص، لكن الرسالة ما وصلت. أرسل لنا كلمة سمجتي بالخاص مباشرة.",
            "الخاص غير متاح عندك. راسلنا بكلمة سمجتي ونرسل لك الدليل مباشرة.",
            "الرسالة الخاصة ما وصلت بسبب إعدادات حسابك. أرسل كلمة سمجتي بالخاص ونوصلك الدليل.",
        ],
        facebookPublicReply: [
            `هذا دليل اختفاء السمج من AQUAVO:\n${BASE_URL}/guides/fish-hiding`,
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

    // ── Campaign 7: Tank Consultation (حوضي) ────────────────────────
    // No guide page — opens a consultation DM asking for photos.
    // "حوضي تعبان" is blocked by BLOCKED_PHRASES; "حوضي" alone is safe here.
    {
        id: "tank-consultation",
        terms: [
            'حوضي',
        ],
        phrases: [
            'عن حوضي', 'بخصوص حوضي', 'مشكلة حوضي',
            'سالك عن حوضي', 'اسالك عن حوضي',
            // Capture "تقييم حوضي" before 'يم' short-term fires on water-change-schedule
            'تقييم حوضي', 'تقييم الحوض',
        ],
        guideUrl: `${BASE_URL}/products`,
        instagramDM: [
            `وصلنا سؤالك.\n\nعشان نساعدك بشكل صحيح، أرسل لنا:\n١. صورة واضحة للحوض بالكامل\n٢. نوع الفلتر والإضاءة إذا ممكن\n٣. عدد الأسماك وأنواعها\n\nتقدر تتصفح منتجاتنا الجاهزة هنا: ${BASE_URL}/products`,

            `شكراً للتواصل.\n\nعشان نعطيك رأي دقيق، أرسل صورة واضحة للحوض والفلتر والسمچ.\n\nبعدها نقدر نقيّم الوضع ونعطيك خطوات واضحة.`,

            `وصل سؤالك.\n\nأرسل لنا صورة واضحة للحوض وأي تفاصيل عن السمچ والفلتر — ونساعدك نشخص أي مشكلة.`,
        ],
        instagramPublicSuccess: [
            "تم، راجع الرسائل الخاصة.",
            "أرسلنا لك رسالة بالخاص.",
            "تم، وصلتك رسالة خاصة — تواصل معنا هناك.",
        ],
        instagramDMFailed: [
            "الخاص غير متاح. راسلنا مباشرة بكلمة حوضي ونساعدك.",
            "الرسالة ما وصلت. افتح محادثة معنا بكلمة حوضي ونرتب معك.",
        ],
        facebookPublicReply: [
            `تواصل معنا بالخاص وأرسل صورة الحوض — نساعدك مباشرة.`,
            `أرسل لنا صورة الحوض في الخاص ونشوف الوضع معك.`,
        ],
    },

    // ── Campaign 8: Tank Rescue Plan (إنقاذ) ─────────────────────────
    {
        id: "tank-rescue-plan",
        terms: [
            'انقاذ', 'إنقاذ',
            'الانقاذ',
        ],
        phrases: [
            'خطة الانقاذ', 'خطه الانقاذ',
            'انقاذ الحوض', 'إنقاذ الحوض',
            'كيف اصلح حوضي', 'كيف أصلح حوضي',
            'حوضي ينهار', 'حوضي بالنهار', 'خطوات الانقاذ',
            'دليل الانقاذ',
        ],
        guideUrl: `${BASE_URL}/guides/tank-rescue-plan`,
        instagramDM: [
            `تم، هذا دليل خطة إنقاذ الحوض خطوة بخطوة:\n\n${BASE_URL}/guides/tank-rescue-plan\n\nالخطة مقسمة على ٣٠ يوم تبدأ من يوم صفر. إذا وضعك أسوأ، أرسل صورة واضحة للحوض ونحدد نقطة البداية الصح.`,

            `وصل الدليل.\n\nخطة الإنقاذ تمشي على مراحل — لا تتخطى أي خطوة حتى لو الحوض تحسن مبكر:\n\n${BASE_URL}/guides/tank-rescue-plan\n\nإذا تريد متابعة، أرسل صورة الحوض.`,

            `هذا دليل AQUAVO لإنقاذ الحوض:\n\n${BASE_URL}/guides/tank-rescue-plan\n\nيعطيك جدول واضح لكل مرحلة. للتشخيص الأدق، أرسل صورة الحوض وفحص المي.`,

            `تم.\n\nدليل الإنقاذ يبدأ من التقييم الأولي وصولاً للاستقرار الكامل:\n\n${BASE_URL}/guides/tank-rescue-plan\n\nأرسل صورة الحوض إذا تريد رأي مباشر.`,
        ],
        instagramPublicSuccess: [
            "تم، وصلك الدليل بالخاص.",
            "أرسلنا لك دليل الإنقاذ برسالة خاصة.",
            "تم إرسال الدليل بالخاص.",
        ],
        instagramDMFailed: [
            "الرسالة ما وصلت. أرسل كلمة انقاذ بالخاص ونرسل لك الدليل مباشرة.",
            "الخاص غير متاح. راسلنا بكلمة انقاذ ونرسل الدليل.",
        ],
        facebookPublicReply: [
            `هذا دليل إنقاذ الحوض:\n${BASE_URL}/guides/tank-rescue-plan`,
            `تفضل، دليل خطة الإنقاذ:\n${BASE_URL}/guides/tank-rescue-plan`,
        ],
    },

    // ── Campaign 9: Feeding Table (أكل) ──────────────────────────────
    {
        id: "feeding-table",
        terms: [
            'اكل', 'الاكل',
            'تغذيه', 'تغذية',
            'الغذاء',
        ],
        phrases: [
            'جدول الاكل', 'جدول التغذيه', 'جدول التغذية',
            'كمية الاكل', 'كمية الطعام',
            'كم مره اطعم', 'كم مرة اطعم', 'كم مرة تاكل',
            'دليل الاكل', 'دليل التغذيه',
            'كيف اطعم', 'كيف أطعم',
        ],
        guideUrl: `${BASE_URL}/guides/feeding-table`,
        instagramDM: [
            `تم، هذا جدول التغذية الكامل:\n\n${BASE_URL}/guides/feeding-table\n\nالقاعدة الذهبية: ما يأكله السمچ في دقيقتين هو الحد. الزيادة تعكر المي أسرع من أي شيء آخر.\n\nإذا تريد جدول مخصص لنوعك، أرسل نوع السمچ وحجمه.`,

            `وصل الدليل.\n\nدقيقتان بس — هذا كل اللي تحتاجه تحسب الكمية الصحيحة:\n\n${BASE_URL}/guides/feeding-table\n\nإذا تريد رأي بجدول تغذيتك الحالي، أرسل تفاصيل السمچ.`,

            `هذا دليل AQUAVO لجدول التغذية:\n\n${BASE_URL}/guides/feeding-table\n\nيشرح الكميات حسب حجم السمچ، أوقات التغذية، وعلامات الإفراط.`,

            `تم.\n\nدليل التغذية يحل أكثر مشكلة شائعة في الأحواض:\n\n${BASE_URL}/guides/feeding-table`,
        ],
        instagramPublicSuccess: [
            "تم، وصلك جدول التغذية بالخاص.",
            "أرسلنا لك الدليل برسالة خاصة.",
            "تم إرسال الدليل بالخاص.",
        ],
        instagramDMFailed: [
            "الرسالة ما وصلت. أرسل كلمة أكل بالخاص ونرسل الدليل مباشرة.",
            "الخاص غير متاح. راسلنا بكلمة تغذية ونوصلك الدليل.",
        ],
        facebookPublicReply: [
            `جدول التغذية من AQUAVO:\n${BASE_URL}/guides/feeding-table`,
            `تفضل، دليل التغذية هنا:\n${BASE_URL}/guides/feeding-table`,
        ],
    },

    // ── Campaign 10: New Arrivals (جديد) ─────────────────────────────
    {
        id: "new-arrivals",
        terms: [
            'جديد', 'جديده',
            'وصل', 'وصلتكم',
        ],
        phrases: [
            'شنو الجديد', 'وصل جديد', 'منتجات جديده', 'منتجات جديدة',
            'اشياء جديده', 'أشياء جديدة',
            'الجديد عندكم', 'شنو وصل', 'وصل عندكم',
        ],
        guideUrl: `${BASE_URL}/products`,
        instagramDM: [
            `تم، هذا رابط جميع منتجاتنا المتاحة حالياً:\n\n${BASE_URL}/products\n\nالمنتجات تتحدث بشكل دوري. تابع صفحة AQUAVO حتى توصلك إشعارات الوصول الجديد أول بأول.`,

            `وصلك الرابط.\n\nكل المنتجات المتوفرة حالياً موجودة هنا:\n\n${BASE_URL}/products\n\nتابعنا على إنستغرام لتعرف أول ما يوصل شيء جديد.`,

            `هذا رابط المنتجات الكاملة:\n\n${BASE_URL}/products\n\nإذا تبحث عن منتج معين، أرسل لنا اسمه ونساعدك.`,
        ],
        instagramPublicSuccess: [
            "تم، وصلك رابط المنتجات بالخاص.",
            "أرسلنا لك الرابط برسالة خاصة.",
            "تم، راجع الرسائل الخاصة.",
        ],
        instagramDMFailed: [
            "الرسالة ما وصلت. تصفح المنتجات مباشرة على الموقع أو أرسل لنا بالخاص.",
            "الخاص غير متاح. زور موقعنا مباشرة أو راسلنا.",
        ],
        facebookPublicReply: [
            `هذا رابط المنتجات الكاملة:\n${BASE_URL}/products`,
            `تفضل، رابط جميع منتجاتنا:\n${BASE_URL}/products`,
        ],
    },

    // ── Campaign 11: Filter Choice (فلتر) ────────────────────────────
    {
        id: "filter-choice",
        terms: [
            'فلتر', 'فلتره',
            'مضخه', 'مضخة',
        ],
        phrases: [
            'اختيار الفلتر', 'دليل الفلتر',
            'شنو افضل فلتر', 'اي فلتر احسن',
            'انواع الفلترات', 'أنواع الفلاتر',
            'فلتر الحوض', 'الفلتر المناسب',
        ],
        guideUrl: `${BASE_URL}/guides/filter-choice`,
        instagramDM: [
            `تم، هذا دليل اختيار الفلتر المناسب لحوضك:\n\n${BASE_URL}/guides/filter-choice\n\nيقارن بين ٤ أنواع رئيسية مع جدول الحجم وجدول الصيانة.\n\nإذا تريد توصية مباشرة، أرسل حجم الحوض وعدد الأسماك.`,

            `وصل الدليل.\n\nالفلتر الصح يوفر عليك كثير من مشاكل المي:\n\n${BASE_URL}/guides/filter-choice\n\nللتوصية المناسبة، أرسل حجم الحوض.`,

            `هذا دليل AQUAVO للفلترات:\n\n${BASE_URL}/guides/filter-choice\n\nيشرح متى تستخدم كل نوع وشلون تحسب الحجم المناسب.`,
        ],
        instagramPublicSuccess: [
            "تم، وصلك دليل الفلترات بالخاص.",
            "أرسلنا لك الدليل برسالة خاصة.",
            "تم إرسال الدليل بالخاص.",
        ],
        instagramDMFailed: [
            "الرسالة ما وصلت. أرسل كلمة فلتر بالخاص ونرسل الدليل مباشرة.",
            "الخاص غير متاح. راسلنا بكلمة فلتر ونوصلك الدليل.",
        ],
        facebookPublicReply: [
            `دليل اختيار الفلتر من AQUAVO:\n${BASE_URL}/guides/filter-choice`,
            `تفضل، دليل الفلترات هنا:\n${BASE_URL}/guides/filter-choice`,
        ],
    },

    // ── Campaign 12: Temperature Guide (حرارة) ───────────────────────
    {
        id: "temperature-guide",
        terms: [
            'حراره', 'حرارة',
            'ثيرموميتر', 'ثرموستات',
        ],
        phrases: [
            'درجة الحرارة', 'درجه الحراره',
            'حرارة الحوض', 'حراره الحوض',
            'دليل الحرارة', 'الحرارة المناسبة',
            'شكد الحرارة', 'كم درجه',
        ],
        guideUrl: `${BASE_URL}/guides/temperature-guide`,
        instagramDM: [
            `تم، هذا دليل درجات الحرارة للأحواض:\n\n${BASE_URL}/guides/temperature-guide\n\nيشرح المنطقة الآمنة، أنواع الأسماك، وأهمية الاستقرار مو بس الرقم الصح.\n\nإذا تريد توصية لنوعك، أرسل نوع السمچ.`,

            `وصل الدليل.\n\nدرجة واحدة خاطئة تفرق كثير — هذا الدليل يوضحها:\n\n${BASE_URL}/guides/temperature-guide`,

            `هذا دليل AQUAVO لدرجات الحرارة:\n\n${BASE_URL}/guides/temperature-guide\n\nيغطي أسماك المياه الدافئة والباردة مع علامات التحذير.`,
        ],
        instagramPublicSuccess: [
            "تم، وصلك دليل الحرارة بالخاص.",
            "أرسلنا لك الدليل برسالة خاصة.",
            "تم إرسال الدليل بالخاص.",
        ],
        instagramDMFailed: [
            "الرسالة ما وصلت. أرسل كلمة حرارة بالخاص ونرسل الدليل.",
            "الخاص غير متاح. راسلنا بكلمة حراره ونوصلك الدليل.",
        ],
        facebookPublicReply: [
            `دليل درجات الحرارة من AQUAVO:\n${BASE_URL}/guides/temperature-guide`,
            `تفضل، دليل الحرارة هنا:\n${BASE_URL}/guides/temperature-guide`,
        ],
    },

    // ── Campaign 13: Happy Fish Signs (سعيد) ─────────────────────────
    {
        id: "happy-fish-signs",
        terms: [
            'سعيد', 'سعيده',
            'مبسوط', 'مبسوطه',
        ],
        phrases: [
            'السمج سعيد', 'سمجتي سعيده',
            'علامات الصحه', 'علامات الصحة',
            'دليل الصحه', 'علامات السعاده',
            'كيف اعرف سمجي بخير', 'إشارات الصحه',
            'علامات سمج صحي',
        ],
        guideUrl: `${BASE_URL}/guides/happy-fish-signs`,
        instagramDM: [
            `تم، هذا دليل إشارات السمچ الصحي:\n\n${BASE_URL}/guides/happy-fish-signs\n\n٦ علامات تثبت إن السمچ بخير، وروتين مراقبة يومي لا يأخذ أكثر من دقيقتين.\n\nإذا لاحظت شيء غير طبيعي، أرسل صورة ونشخصها لك.`,

            `وصل الدليل.\n\nأغلب مشاكل الأحواض تكتشف مبكراً لو تعرف شتشوف:\n\n${BASE_URL}/guides/happy-fish-signs`,

            `هذا دليل AQUAVO لإشارات السمچ السعيد:\n\n${BASE_URL}/guides/happy-fish-signs\n\nيوضح الفرق بين السلوك الطبيعي وعلامات التحذير الأولى.`,
        ],
        instagramPublicSuccess: [
            "تم، وصلك الدليل بالخاص.",
            "أرسلنا لك دليل إشارات الصحة برسالة خاصة.",
            "تم إرسال الدليل بالخاص.",
        ],
        instagramDMFailed: [
            "الرسالة ما وصلت. أرسل كلمة سعيد بالخاص ونرسل الدليل.",
            "الخاص غير متاح. راسلنا بكلمة سعيد ونوصلك الدليل.",
        ],
        facebookPublicReply: [
            `دليل إشارات السمچ الصحي من AQUAVO:\n${BASE_URL}/guides/happy-fish-signs`,
            `تفضل، دليل علامات الصحة هنا:\n${BASE_URL}/guides/happy-fish-signs`,
        ],
    },

    // ── Campaign 14: Aquarium Salt (ملح) ─────────────────────────────
    {
        id: "aquarium-salt",
        terms: [
            'ملح', 'الملح',
            'ملوحه', 'ملوحة',
        ],
        phrases: [
            'ملح الحوض', 'كمية الملح',
            'اضيف ملح', 'أضيف ملح',
            'دليل الملح', 'هل اضيف ملح',
            'متى اضيف ملح', 'ملح البحر',
        ],
        guideUrl: `${BASE_URL}/guides/aquarium-salt`,
        instagramDM: [
            `تم، هذا دليل ملح الأحواض — متى يفيد ومتى يضر:\n\n${BASE_URL}/guides/aquarium-salt\n\nالدليل يوضح الجرعات الصحيحة لكل حالة وأهم الأخطاء الشائعة.\n\nالملح لا يتبخر — يتراكم. اقرأ تنبيه التراكم بالدليل قبل الاستخدام.`,

            `وصل الدليل.\n\nليس كل حوض يحتاج ملح — هذا الدليل يحدد متى بالضبط:\n\n${BASE_URL}/guides/aquarium-salt`,

            `هذا دليل AQUAVO لملح الأحواض:\n\n${BASE_URL}/guides/aquarium-salt\n\nيشرح الجرعات، المدد، وأنواع الأحواض التي يجب تجنب الملح فيها تماماً.`,
        ],
        instagramPublicSuccess: [
            "تم، وصلك دليل الملح بالخاص.",
            "أرسلنا لك الدليل برسالة خاصة.",
            "تم إرسال الدليل بالخاص.",
        ],
        instagramDMFailed: [
            "الرسالة ما وصلت. أرسل كلمة ملح بالخاص ونرسل الدليل.",
            "الخاص غير متاح. راسلنا بكلمة ملح ونوصلك الدليل.",
        ],
        facebookPublicReply: [
            `دليل ملح الأحواض من AQUAVO:\n${BASE_URL}/guides/aquarium-salt`,
            `تفضل، دليل الملح هنا:\n${BASE_URL}/guides/aquarium-salt`,
        ],
    },

    // ── Campaign 15: Filter Media (وسط) ──────────────────────────────
    {
        id: "filter-media",
        terms: [
            'وسط', 'وسائط', 'بيوميديا',
            'سيراميك', 'بيوبول',
        ],
        phrases: [
            'وسط الفلتر', 'وسائط الفلتر',
            'الوسائط البيولوجيه', 'وسط بيولوجي',
            'الوسط الميكانيكي', 'دليل الوسط',
            'وسط بيو', 'مواد الفلتر',
        ],
        guideUrl: `${BASE_URL}/guides/filter-media`,
        instagramDM: [
            `تم، هذا دليل وسائط الفلتر:\n\n${BASE_URL}/guides/filter-media\n\nيشرح الطبقات الثلاث (ميكانيكي/بيولوجي/كيميائي)، الترتيب الصح، وجدول الصيانة.\n\nإذا تريد توصية لنوع الوسط المناسب لفلترك، أرسل نوع الفلتر وحجم الحوض.`,

            `وصل الدليل.\n\nداخل الفلتر مدينة كاملة — كل طابق له دور:\n\n${BASE_URL}/guides/filter-media`,

            `هذا دليل AQUAVO لوسائط الفلتر:\n\n${BASE_URL}/guides/filter-media\n\nيقارن بين أنواع الوسائط البيولوجية ويشرح متى تغسل كل طبقة.`,
        ],
        instagramPublicSuccess: [
            "تم، وصلك دليل الوسائط بالخاص.",
            "أرسلنا لك الدليل برسالة خاصة.",
            "تم إرسال الدليل بالخاص.",
        ],
        instagramDMFailed: [
            "الرسالة ما وصلت. أرسل كلمة وسائط بالخاص ونرسل الدليل.",
            "الخاص غير متاح. راسلنا بكلمة وسط ونوصلك الدليل.",
        ],
        facebookPublicReply: [
            `دليل وسائط الفلتر من AQUAVO:\n${BASE_URL}/guides/filter-media`,
            `تفضل، دليل الوسائط هنا:\n${BASE_URL}/guides/filter-media`,
        ],
    },

    // ── Campaign 16: Algae Control (طحالب) ───────────────────────────
    {
        id: "algae-control",
        terms: [
            'طحالب', 'طحلب',
            'الطحالب', 'طحالبي',
        ],
        phrases: [
            'مشكلة الطحالب', 'دليل الطحالب',
            'علاج الطحالب', 'توقيف الطحالب',
            'تنظيف الطحالب', 'ازالة الطحالب',
            'الطحالب الخضراء', 'الطحالب البنية',
        ],
        guideUrl: `${BASE_URL}/guides/algae-control`,
        instagramDM: [
            `تم، هذا دليل السيطرة على الطحالب:\n\n${BASE_URL}/guides/algae-control\n\nالطحالب ما هي عدوك — هي عَرَض. الدليل يحدد السبب ويعطيك الحل الصحيح لكل نوع.\n\nإذا تريد تشخيص دقيق، أرسل صورة للحوض.`,

            `وصل الدليل.\n\nكل نوع طحالب سببه مختلف وعلاجه مختلف:\n\n${BASE_URL}/guides/algae-control`,

            `هذا دليل AQUAVO لمشكلة الطحالب:\n\n${BASE_URL}/guides/algae-control\n\nيشرح ٤ أنواع شائعة مع خطة الوقاية التي تمنع تكرارها.`,
        ],
        instagramPublicSuccess: [
            "تم، وصلك دليل الطحالب بالخاص.",
            "أرسلنا لك الدليل برسالة خاصة.",
            "تم إرسال الدليل بالخاص.",
        ],
        instagramDMFailed: [
            "الرسالة ما وصلت. أرسل كلمة طحالب بالخاص ونرسل الدليل.",
            "الخاص غير متاح. راسلنا بكلمة طحالب ونوصلك الدليل.",
        ],
        facebookPublicReply: [
            `دليل التحكم بالطحالب من AQUAVO:\n${BASE_URL}/guides/algae-control`,
            `تفضل، دليل الطحالب هنا:\n${BASE_URL}/guides/algae-control`,
        ],
    },

    // ── Campaign 17: White Scale (سلك) ────────────────────────────────
    // "سلك" = mineral scale/lime deposits on glass (Iraqi slang)
    {
        id: "white-scale",
        terms: [
            'سلك', 'جير', 'الجير', 'كلس',
            'ترسبات', 'الترسبات',
        ],
        phrases: [
            'السلك الابيض', 'الخط الابيض',
            'ترسبات بيضاء', 'دليل السلك',
            'طبشور الزجاج', 'المي الصلب',
            'الزجاج عليه ابيض', 'حواف الحوض',
            'خطوط بيضاء', 'خطوط بيض',
        ],
        guideUrl: `${BASE_URL}/guides/white-scale`,
        instagramDM: [
            `تم، هذا دليل إزالة الترسبات البيضاء من الزجاج:\n\n${BASE_URL}/guides/white-scale\n\nالطبشور على الزجاج مو وسخ — هو كالسيوم من المي. الدليل يشرح طريقة إزالته بدون كيماويات وشلون تقلله مستقبلاً.`,

            `وصل الدليل.\n\nالسلك الأبيض يطلع في كل حوض — لكن يمكن إزالته وتقليله:\n\n${BASE_URL}/guides/white-scale`,

            `هذا دليل AQUAVO للترسبات البيضاء:\n\n${BASE_URL}/guides/white-scale\n\nيشرح ٣ طرق طبيعية للإزالة وكيف تمنع التراكم المستقبلي.`,
        ],
        instagramPublicSuccess: [
            "تم، وصلك دليل السلك بالخاص.",
            "أرسلنا لك الدليل برسالة خاصة.",
            "تم إرسال الدليل بالخاص.",
        ],
        instagramDMFailed: [
            "الرسالة ما وصلت. أرسل كلمة سلك بالخاص ونرسل الدليل.",
            "الخاص غير متاح. راسلنا بكلمة سلك ونوصلك الدليل.",
        ],
        facebookPublicReply: [
            `دليل إزالة السلك الأبيض من AQUAVO:\n${BASE_URL}/guides/white-scale`,
            `تفضل، دليل الترسبات هنا:\n${BASE_URL}/guides/white-scale`,
        ],
    },

    // ── Campaign 18: Treatment Basics (علاج) — BEFORE quarantine ─────
    // Must come before عزل campaign so "سمج مريض" phrase matches here first.
    {
        id: "treatment-basics",
        terms: [
            'علاج', 'الدواء',
            'دواء', 'علاجات',
            'بقع',
        ],
        phrases: [
            'دليل العلاج', 'كيف اعالج',
            'علاج السمج', 'علاج السمچ',
            'سمج مريض', 'سمجه مريضه',
            'سمچه مريضه', 'سمك مريض',
            'علاج الحوض', 'قبل الدواء',
            'ادوية الحوض',
            // Disease symptom phrases — white spots = Ich, needs treatment guidance
            'بقع بيضاء', 'بقع على السمج', 'بقع على السمچ',
            'بقع على جسم', 'بقع ملح',
        ],
        guideUrl: `${BASE_URL}/guides/treatment-basics`,
        instagramDM: [
            `تم، هذا دليل الخطوات الأربع قبل أي علاج:\n\n${BASE_URL}/guides/treatment-basics\n\nالدواء الخاطئ يقتل أسرع من المرض. اقرأ الدليل قبل ما تفتح أي علبة.\n\nإذا تريد تشخيص، أرسل صورة أو فيديو للسمچة وأعراضها.`,

            `وصل الدليل.\n\nقبل الدواء — أربع خطوات لازم تمر فيهن:\n\n${BASE_URL}/guides/treatment-basics`,

            `هذا دليل AQUAVO لأساسيات العلاج:\n\n${BASE_URL}/guides/treatment-basics\n\nيشرح شلون تشخص، شلون تعزل، وشلون تكمل العلاج دون أخطاء شائعة.`,

            `تم.\n\nأكثر الأخطاء تصير من التسرع في العلاج — هذا الدليل يحميك منها:\n\n${BASE_URL}/guides/treatment-basics`,
        ],
        instagramPublicSuccess: [
            "تم، وصلك دليل العلاج بالخاص.",
            "أرسلنا لك الدليل برسالة خاصة.",
            "تم إرسال الدليل بالخاص.",
        ],
        instagramDMFailed: [
            "الرسالة ما وصلت. أرسل كلمة علاج بالخاص ونرسل الدليل.",
            "الخاص غير متاح. راسلنا بكلمة علاج ونوصلك الدليل.",
        ],
        facebookPublicReply: [
            `دليل أساسيات العلاج من AQUAVO:\n${BASE_URL}/guides/treatment-basics`,
            `تفضل، دليل العلاج هنا:\n${BASE_URL}/guides/treatment-basics`,
        ],
    },

    // ── Campaign 19: Quarantine (عزل) ────────────────────────────────
    {
        id: "quarantine",
        terms: [
            'عزل', 'العزل',
            'عزله', 'كرنتينا', 'قرنتينا',
        ],
        phrases: [
            'حوض العزل', 'عزل السمج', 'عزل السمچ',
            'كيف اعزل', 'دليل العزل',
            'اسبوع العزل', 'أسبوع العزل',
            'قبل ما اضيف سمج', 'قبل ما أضيف سمچ',
        ],
        guideUrl: `${BASE_URL}/guides/quarantine`,
        instagramDM: [
            `تم، هذا دليل حوض العزل:\n\n${BASE_URL}/guides/quarantine\n\nأسبوعان يحمون الحوض كله من مرض واحد. الدليل يشرح متطلبات حوض العزل البسيط وجدول الـ١٤ يوم.\n\nإذا عندك سمچ تحتاج تعزله ومو عارف كيف، أرسل لنا وضعك ونساعدك.`,

            `وصل الدليل.\n\nالعزل مو رفاهية — هو ضرورة قبل كل إضافة جديدة:\n\n${BASE_URL}/guides/quarantine`,

            `هذا دليل AQUAVO لحوض العزل:\n\n${BASE_URL}/guides/quarantine\n\nيغطي متطلبات حوض العزل، جدول الأسبوعين، ومتى يجب العزل فوراً.`,
        ],
        instagramPublicSuccess: [
            "تم، وصلك دليل العزل بالخاص.",
            "أرسلنا لك الدليل برسالة خاصة.",
            "تم إرسال الدليل بالخاص.",
        ],
        instagramDMFailed: [
            "الرسالة ما وصلت. أرسل كلمة عزل بالخاص ونرسل الدليل.",
            "الخاص غير متاح. راسلنا بكلمة عزل ونوصلك الدليل.",
        ],
        facebookPublicReply: [
            `دليل حوض العزل من AQUAVO:\n${BASE_URL}/guides/quarantine`,
            `تفضل، دليل العزل هنا:\n${BASE_URL}/guides/quarantine`,
        ],
    },

    // ── Campaign 20: Heater Choice (هيتر) ────────────────────────────
    // "هيتر شكد" is blocked by BLOCKED_PHRASES; "هيتر" alone triggers this campaign.
    {
        id: "heater-choice",
        terms: [
            'هيتر', 'الهيتر',
            'دفايه', 'مسخن',
        ],
        phrases: [
            'اختيار الهيتر', 'دليل الهيتر',
            'حجم الهيتر', 'واط الهيتر',
            'هيتر الحوض', 'الهيتر المناسب',
            'كم واط', 'شنو افضل هيتر',
        ],
        guideUrl: `${BASE_URL}/guides/heater-choice`,
        instagramDM: [
            `تم، هذا دليل اختيار الهيتر المناسب:\n\n${BASE_URL}/guides/heater-choice\n\nيشرح حساب الواط الصح حسب حجم الحوض وعوامل الغرفة.\n\nإذا تريد توصية مباشرة، أرسل حجم الحوض ودرجة الحرارة المطلوبة.`,

            `وصل الدليل.\n\nواط مو تخمين — القاعدة الصحيحة موضحة هنا:\n\n${BASE_URL}/guides/heater-choice`,

            `هذا دليل AQUAVO لاختيار الهيتر:\n\n${BASE_URL}/guides/heater-choice\n\nيحتوي جدول الواط المناسب لكل حجم حوض وعلامات الهيتر غير المناسب.`,
        ],
        instagramPublicSuccess: [
            "تم، وصلك دليل الهيتر بالخاص.",
            "أرسلنا لك الدليل برسالة خاصة.",
            "تم إرسال الدليل بالخاص.",
        ],
        instagramDMFailed: [
            "الرسالة ما وصلت. أرسل كلمة هيتر بالخاص ونرسل الدليل.",
            "الخاص غير متاح. راسلنا بكلمة هيتر ونوصلك الدليل.",
        ],
        facebookPublicReply: [
            `دليل اختيار الهيتر من AQUAVO:\n${BASE_URL}/guides/heater-choice`,
            `تفضل، دليل الهيتر هنا:\n${BASE_URL}/guides/heater-choice`,
        ],
    },
];

// ─────────────────────────────────────────────
// BLOCKED_PHRASES — pre-checked before any campaign matching.
// Any input containing one of these (after normalization) returns null immediately.
// Prevents price queries, complaints, and false-positive partial matches.
// ─────────────────────────────────────────────
const BLOCKED_PHRASES: string[] = [
    // Complaint / sick-tank phrases (حوضي alone is a campaign; "تعبان" variant is not)
    'حوضي تعبان', 'حوض تعبان',
    // Purchase intent (should go to human sales)
    'اريد اشتري', 'ابي اشتري',
    // Delivery queries
    'توصيل',
    // Price queries
    'سعره', 'شكد سعر', 'كم سعر', 'السعر كم', 'يكلف كم', 'بكم يكلف',
    // Predator questions (unrelated campaign content)
    'اكل صغار', 'ياكل صغار', 'تاكل صغار', 'صغارها',
    // Heater price query (هيتر alone triggers heater campaign; with price = block)
    'هيتر شكد', 'شكد الهيتر',
    // Electrical wire queries — سلك alone triggers white-scale; electrical context = block
    'سلك كهرباء', 'كهرباء سلك', 'سلك كهربائي', 'واير', 'كيبل',
];

// ─────────────────────────────────────────────
// Two-phase keyword matching
//
// Phase 0: BLOCKED_PHRASES pre-check → return null immediately
// Phase 1: multi-word phrase matching (higher specificity)
//   - Resolves ambiguity before single-term matching
//   - Example: "قائمة الأدوات" → essential-tools (phrase) wins
//     over "قائمة" → 5-mistakes (term)
//
// Phase 2: single-term matching
//   - Each term is unique to its campaign — no cross-campaign overlap
//   - Returns first campaign match in CAMPAIGNS order
//
// BLOCKED (never add as terms): "غالي" (Post 19) / "نعم" (Post 25) — see header comment
// ─────────────────────────────────────────────
function matchCampaign(text: string): Campaign | null {
    if (!text?.trim()) return null;

    const n = normalize(text);
    if (!n) return null; // e.g. pure-Latin input like "pdf"

    // Phase 0: block price queries, complaints, false-positive phrases
    if (BLOCKED_PHRASES.some(p => n.includes(normalize(p)))) return null;

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
