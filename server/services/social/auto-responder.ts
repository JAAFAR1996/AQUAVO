import { db } from "../../db";
import { socialInteractions } from "../../../shared/schema";
import { inArray } from "drizzle-orm";
import { fetchInstagramComments, replyToInstagramComment, sendInstagramPrivateReply } from "./instagram-service";
import { fetchFacebookComments, replyToFacebookComment, sendFacebookPrivateReply } from "./facebook-service";

const IGNORE_SPACES_REGEX = /ق\s*ا\s*ئ\s*م\s*(?:ة|ه)/i;
const ASSET_URL = "https://www.aquavoiq.com/guides/5-mistakes";

// AQUAVO Premium Delivery Kit (No emojis, professional tone)

const INSTAGRAM_DM_VARIANTS = [
    `تم، هذا دليل الأخطاء الخمسة الشائعة بالأحواض:\n\n${ASSET_URL}\n\nإذا تريد تشخيص لحوضك، أرسل صورة واضحة للحوض والفلتر ومكان الإضاءة.\n\nولحتى توصلك الأدلة القادمة أول بأول، تابع AQUAVO.`,
    
    `وصلتك القائمة.\n\nهذا دليل مختصر يوضح أكثر الأخطاء اللي تتكرر بالأحواض، وشلون تتجنبها:\n\n${ASSET_URL}\n\nإذا تحتاج رأي مباشر بحوضك، أرسل صورة واضحة للحوض.\n\nتابع AQUAVO حتى توصلك الأدلة القادمة أول بأول.`,
    
    `هذا ملف الأخطاء الخمسة مثل ما طلبت:\n\n${ASSET_URL}\n\nاقرأه بهدوء، وإذا عندك مشكلة بحوضك أرسل صورة ونشخصها لك بشكل أوضح.\n\nالأدلة القادمة راح تنزل أولاً على صفحة AQUAVO.`,
    
    `تم إرسال الدليل.\n\nراح يساعدك تعرف وين الغلط قبل لا تخسر سمكك:\n\n${ASSET_URL}\n\nللتشخيص، أرسل صورة الحوض والفلتر ومكان الإضاءة.\n\nتابع AQUAVO حتى توصلك النصائح الجديدة أول بأول.`,
    
    `هذا دليل AQUAVO للأخطاء الخمسة الشائعة بالأحواض:\n\n${ASSET_URL}\n\nإذا تريد نحدد لك الخطوة الأنسب، أرسل صورة واضحة للحوض.\n\nتابع الصفحة حتى توصلك الأدلة القادمة.`,
    
    `القائمة جاهزة.\n\nرتبنا لك أكثر 5 أخطاء تتعب الحوض مع التصحيح المناسب وروابط المنتجات داخل الدليل:\n\n${ASSET_URL}\n\nإذا تحتاج مساعدة، أرسل صورة الحوض.\n\nتابع AQUAVO حتى ما تفوتك الأدلة القادمة.`,
    
    `تم تجهيز الدليل المطلوب.\n\nداخل الملف راح تلقى الأخطاء الخمسة، علاماتها، والتصرف الصحيح:\n\n${ASSET_URL}\n\nإذا تريد تشخيص أدق، أرسل صورة الحوض والفلتر والإضاءة.`,
    
    `هذا رابط دليل الأخطاء الخمسة:\n\n${ASSET_URL}\n\nابدأ من صفحة الفحص وتبديل المي، لأنها أكثر نقطتين تسبب مشاكل بدون ما تبين بسرعة.\n\nإذا تحتاج متابعة، أرسل صورة الحوض.`,
    
    `وصل ملف AQUAVO.\n\nالدليل يشرح أكثر الأخطاء اللي تتكرر عند المبتدئين وحتى بعض أصحاب الأحواض القديمة:\n\n${ASSET_URL}\n\nإذا تريد رأي عملي، أرسل صورة واضحة للحوض.`,
    
    `تم، هذا الدليل المجاني:\n\n${ASSET_URL}\n\nبي شرح مختصر ومباشر للأخطاء الخمسة وروابط المنتجات المناسبة من AQUAVO.\n\nتابع الصفحة حتى توصلك الإصدارات القادمة من الأدلة.`
];

const INSTAGRAM_PUBLIC_SUCCESS_VARIANTS = [
    "تم، وصلتك القائمة بالخاص.",
    "تم إرسال الدليل بالخاص.",
    "وصلتك القائمة برسالة خاصة.",
    "تم، راجع الرسائل الخاصة.",
    "أرسلنا لك الدليل بالخاص.",
    "تم إرسال ملف الأخطاء الخمسة بالخاص.",
    "القائمة وصلت للخاص.",
    "تم، الدليل صار عندك بالرسائل.",
    "وصلتك نسخة الدليل بالخاص.",
    "تم إرسال الرابط برسالة خاصة."
];

const INSTAGRAM_DM_FAILED_PUBLIC_VARIANTS = [
    "حاولنا نرسل الدليل، لكن الخاص ما قبل يوصل. أرسل لنا كلمة قائمة بالخاص ونرسله لك مباشرة.",
    "الرسالة الخاصة ما وصلت بسبب إعدادات الحساب. أرسل كلمة قائمة بالخاص ونرسل لك الدليل.",
    "ما قدرنا نوصل الرابط بالخاص. راسل الصفحة بكلمة قائمة حتى نرسل لك الملف مباشرة.",
    "الخاص غير متاح حالياً عندك. أرسل لنا رسالة بكلمة قائمة ونوصلك الدليل.",
    "حاولنا نرسل الملف، لكن الرسالة ما وصلت. افتح محادثة معنا بكلمة قائمة ونرسله لك مباشرة."
];

const FACEBOOK_PUBLIC_LINK_VARIANTS = [
    `هذا رابط دليل الأخطاء الخمسة:\n${ASSET_URL}`,
    `تفضل، ملف الأخطاء الخمسة بالأحواض:\n${ASSET_URL}`,
    `هذا الدليل المطلوب:\n${ASSET_URL}`,
    `تم، هذا رابط ملف AQUAVO للأخطاء الخمسة:\n${ASSET_URL}`,
    `رابط الدليل هنا:\n${ASSET_URL}`
];

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

/**
 * Normalizes keyword text. We look for 'قائمة' variations.
 */
function isTargetKeyword(text: string): boolean {
    if (!text) return false;
    const normalized = text.replace(/[^أ-ي!]/g, ''); // Keep Arabic letters and exclamation marks
    return normalized.includes('قائمه') || normalized.includes('قائمة') || IGNORE_SPACES_REGEX.test(text);
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

        const matchedComments = [];
        const skippedWrongKeywords = [];

        for (const c of comments) {
            if (isTargetKeyword(c.text)) {
                matchedComments.push(c);
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
        const commentIds = matchedComments.map((c: any) => c.id);
        const existingRecords = await db.select({ commentId: socialInteractions.commentId })
            .from(socialInteractions)
            .where(inArray(socialInteractions.commentId, commentIds));
        
        const existingIds = new Set(existingRecords.map(r => r.commentId));

        let processedCount = 0;
        let skippedDuplicates = 0;
        const deliveryPlan = [];

        for (const comment of matchedComments) {
            if (existingIds.has(comment.id)) {
                skippedDuplicates++;
                continue;
            }

            let dmSent = false;
            let replySent = false;
            let plannedDM = "";
            let plannedReply = "";

            if (platform === 'instagram') {
                plannedDM = selectVariant(INSTAGRAM_DM_VARIANTS, comment.id);
                plannedReply = selectVariant(INSTAGRAM_PUBLIC_SUCCESS_VARIANTS, comment.id);
                const failedReply = selectVariant(INSTAGRAM_DM_FAILED_PUBLIC_VARIANTS, comment.id);

                deliveryPlan.push({
                    commentId: comment.id,
                    username: comment.username,
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
                // Facebook
                plannedReply = selectVariant(FACEBOOK_PUBLIC_LINK_VARIANTS, comment.id);
                
                deliveryPlan.push({
                    commentId: comment.id,
                    username: comment.username,
                    action: 'Facebook Public Reply with Link',
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
                // Record in database to ensure idempotency
                await db.insert(socialInteractions).values({
                    platform,
                    mediaId,
                    commentId: comment.id,
                    username: comment.username || 'unknown',
                    keywordMatched: comment.text.substring(0, 50),
                    dmSent,
                    replySent
                });
                
                // Add delay (5 seconds minimum to 10 seconds max) as requested
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
        // Mask tokens in logs
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
    intervalMs: number = 60000 // default 1 minute
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
