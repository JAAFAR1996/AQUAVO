/**
 * Auto Blog Generator Service
 * يولد مدونات أسبوعية تلقائياً بناءً على سلوك المستخدمين
 * 
 * @author شريمب 🦐
 */

import { groqClient } from "./groq-client.js";
import { getDb } from "../db.js";
import { productViews, searchQueries, products, blogPosts } from "../../shared/schema.js";
import { desc, sql, count, eq } from "drizzle-orm";
import { aiMonitor } from "./ai-monitor.js";

interface BlogTopicSuggestion {
    topic: string;
    category: string;
    reason: string;
    priority: number;
}

interface GeneratedBlog {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    category: string;
    readTime: string;
    author: string;
    iconName: string;
    metaDescription?: string;
    keywords?: string[];
    faq?: Array<{ q: string; a: string }>;
}

/**
 * Generate slug from Arabic title
 */
function generateSlug(title: string): string {
    const timestamp = Date.now();
    const cleanTitle = title
        .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, '') // Keep Arabic, English, numbers
        .trim()
        .replace(/\s+/g, '-')
        .toLowerCase()
        .slice(0, 50);
    return `${cleanTitle}-${timestamp}`;
}

/**
 * تحليل سلوك المستخدمين لاكتشاف المواضيع الشائعة
 */
async function analyzeUserBehavior(): Promise<BlogTopicSuggestion[]> {
    const db = getDb();
    const suggestions: BlogTopicSuggestion[] = [];

    if (!db) {
        console.error("[AutoBlog] Database not initialized");
        return suggestions;
    }

    try {
        // 1. تحليل المنتجات الأكثر مشاهدة
        const topViewedProducts = await db
            .select({
                productId: productViews.productId,
                viewCount: count(productViews.id),
            })
            .from(productViews)
            .groupBy(productViews.productId)
            .orderBy(desc(count(productViews.id)))
            .limit(5);

        if (topViewedProducts.length > 0) {
            // جلب تفاصيل المنتجات
            for (const item of topViewedProducts) {
                if (item.productId) {
                    const product = await db.query.products.findFirst({
                        where: eq(products.id, item.productId),
                    });

                    if (product?.category) {
                        suggestions.push({
                            topic: `دليل شامل عن ${product.category}`,
                            category: product.category,
                            reason: `المنتجات في هذه الفئة تحظى باهتمام كبير (${item.viewCount} مشاهدة)`,
                            priority: 8,
                        });
                    }
                }
            }
        }

        // 2. تحليل عمليات البحث الشائعة
        const topSearches = await db
            .select({
                query: searchQueries.query,
                searchCount: count(searchQueries.id),
            })
            .from(searchQueries)
            .groupBy(searchQueries.query)
            .orderBy(desc(count(searchQueries.id)))
            .limit(10);

        for (const search of topSearches) {
            if (search.query && search.query.length > 3) {
                suggestions.push({
                    topic: `كل ما تحتاج معرفته عن ${search.query}`,
                    category: "نصائح",
                    reason: `"${search.query}" من أكثر عمليات البحث شيوعاً (${search.searchCount} بحث)`,
                    priority: 7,
                });
            }
        }

        // 3. مواضيع موسمية (تلقائية)
        const month = new Date().getMonth();
        if (month >= 5 && month <= 8) {
            // صيف
            suggestions.push({
                topic: "التعامل مع حرارة الصيف في أحواض السمك",
                category: "نصائح موسمية",
                reason: "موسم الصيف يتطلب عناية خاصة",
                priority: 9,
            });
        } else if (month >= 11 || month <= 1) {
            // شتاء
            suggestions.push({
                topic: "تدفئة الحوض في الشتاء",
                category: "نصائح موسمية",
                reason: "موسم الشتاء يتطلب تدفئة مناسبة",
                priority: 9,
            });
        }

        // 4. مواضيع عامة دائمة (إذا لم تكن هناك بيانات كافية)
        if (suggestions.length < 3) {
            const everGreenTopics = [
                { topic: "أخطاء شائعة يرتكبها المبتدئين في تربية الأسماك", category: "للمبتدئين", priority: 6 },
                { topic: "كيف تختار أول حوض لك - دليل شامل", category: "للمبتدئين", priority: 6 },
                { topic: "الدورة البيولوجية للحوض - ما يجب أن تعرفه", category: "علوم الأحواض", priority: 7 },
                { topic: "توافق الأسماك - من يعيش مع من؟", category: "أنواع الأسماك", priority: 7 },
                { topic: "أفضل النباتات المائية للمبتدئين", category: "نباتات", priority: 6 },
            ];

            for (const t of everGreenTopics) {
                suggestions.push({
                    topic: t.topic,
                    category: t.category,
                    reason: "موضوع دائم الطلب",
                    priority: t.priority,
                });
            }
        }

        // ترتيب حسب الأولوية وإزالة التكرارات
        suggestions.sort((a, b) => b.priority - a.priority);
        const uniqueSuggestions = suggestions.filter((s, index, self) =>
            index === self.findIndex(t => t.topic === s.topic)
        );

        console.log(`[AutoBlog] تم تحليل سلوك المستخدمين: ${uniqueSuggestions.length} اقتراحات`);
        return uniqueSuggestions.slice(0, 5);

    } catch (error) {
        console.error("[AutoBlog] خطأ في تحليل السلوك:", error);

        // اقتراحات افتراضية
        return [
            {
                topic: "نصائح للمبتدئين في عالم الأحواض",
                category: "للمبتدئين",
                reason: "موضوع دائم الطلب",
                priority: 5,
            }
        ];
    }
}

/**
 * توليد محتوى المدونة باستخدام AI
 */
async function generateBlogContent(topic: BlogTopicSuggestion): Promise<GeneratedBlog | null> {
    try {
        const prompt = `أنت "شريمب 🦐" - خبير أحواض سمك عراقي ودود، تكتب لموقع AQUAVO (aquavo.iq) - أول متجر أحواض متخصص في العراق.

اكتب مقال مدونة احترافي ومحسّن لمحركات البحث (SEO 2026) عن الموضوع التالي:
"${topic.topic}"

الفئة: ${topic.category}

## متطلبات SEO 2026:
1. **العنوان (Title)**: 50-60 حرف، يحتوي الكلمة المفتاحية الرئيسية، جذاب
2. **الوصف التعريفي (Meta Description)**: 150-160 حرف، يلخص المقال ويحفز النقر
3. **الكلمات المفتاحية**: 3-5 كلمات مفتاحية مرتبطة بالموضوع (عربية)
4. **بنية المحتوى**:
   - مقدمة تجيب على نية البحث مباشرة (في أول 100 كلمة)
   - استخدم h2 للأقسام الرئيسية و h3 للفروع
   - أضف قوائم (ul/ol) لتحسين Featured Snippets
   - اكتب 800-1200 كلمة (محتوى شامل)
   - أضف فقرة FAQ في النهاية (3-4 أسئلة شائعة مع إجابات قصيرة)
5. **E-E-A-T**: أظهر الخبرة والتجربة العملية (انصح بمنتجات من AQUAVO حيث يناسب)
6. **الروابط الداخلية**: اقترح 2-3 روابط لصفحات المتجر (مثل: /products?category=فلاتر)
7. **الأسلوب**: ودود، مبسط، عربية فصحى بسيطة مع لمسة عراقية
8. **Schema Markup hints**: أضف بيانات للـ structured data في حقل schema

أجب بصيغة JSON فقط:
{
    "title": "عنوان المقال (50-60 حرف)",
    "metaDescription": "وصف تعريفي محسّن لمحركات البحث (150-160 حرف)",
    "keywords": ["كلمة1", "كلمة2", "كلمة3"],
    "excerpt": "وصف مختصر 2-3 جمل للعرض في البطاقة",
    "content": "محتوى HTML كامل مع h2, h3, p, ul, ol, li, strong, a (روابط داخلية)",
    "faq": [{"q": "سؤال؟", "a": "إجابة"}],
    "readTime": "X دقائق",
    "iconName": "Fish|Droplets|Leaf|Heart|Filter|AlertTriangle",
    "schema": {"@type": "Article", "about": "الموضوع الرئيسي"}
}`;

        const responseText = await groqClient.chatText(
            [{ role: "user", content: prompt }],
            { temperature: 0.7, maxTokens: 4000, model: "llama-3.3-70b-versatile" }
        ) || "";

        // استخراج JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("[AutoBlog] لم يتم العثور على JSON في الرد");
            return null;
        }

        const blogData = JSON.parse(jsonMatch[0]);

        // إنشاء ID و slug
        const id = `auto-${Date.now()}`;
        const slug = generateSlug(blogData.title);

        // Append FAQ section as HTML if provided
        let fullContent = blogData.content || "";
        if (blogData.faq && Array.isArray(blogData.faq) && blogData.faq.length > 0) {
            fullContent += `\n<section class="faq-section"><h2>أسئلة شائعة</h2>`;
            for (const item of blogData.faq) {
                fullContent += `<div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">`;
                fullContent += `<h3 itemprop="name">${item.q}</h3>`;
                fullContent += `<div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">`;
                fullContent += `<p itemprop="text">${item.a}</p></div></div>`;
            }
            fullContent += `</section>`;
        }

        return {
            id,
            slug,
            title: blogData.title,
            excerpt: blogData.excerpt,
            content: fullContent,
            category: topic.category,
            readTime: blogData.readTime || "5 دقائق",
            author: "شريمب 🦐",
            iconName: blogData.iconName || "Fish",
            metaDescription: blogData.metaDescription || blogData.excerpt,
            keywords: blogData.keywords || [],
            faq: blogData.faq || [],
        };

    } catch (error) {
        console.error("[AutoBlog] خطأ في توليد المحتوى:", error);
        return null;
    }
}

/**
 * حفظ المدونة في قاعدة البيانات
 */
async function saveBlogToDatabase(blog: GeneratedBlog): Promise<boolean> {
    const db = getDb();

    if (!db) {
        console.error("[AutoBlog] Database not initialized");
        return false;
    }

    try {
        await db.insert(blogPosts).values({
            id: blog.id,
            title: blog.title,
            slug: blog.slug,
            excerpt: blog.metaDescription || blog.excerpt,
            content: blog.content,
            category: blog.category,
            readTime: blog.readTime,
            author: blog.author,
            iconName: blog.iconName,
            imageUrl: "/images/blog/blog_planted_tank.png",
            isPublished: true,
            isFeatured: false,
            isAutoGenerated: true,
            publishedAt: new Date(),
        });

        console.log(`[AutoBlog] ✅ تم حفظ المدونة في قاعدة البيانات: ${blog.title}`);
        return true;
    } catch (error) {
        console.error("[AutoBlog] خطأ في حفظ المدونة:", error);
        return false;
    }
}

/**
 * تشغيل عملية توليد المدونة الأسبوعية
 */
export async function runWeeklyBlogGeneration(): Promise<{
    success: boolean;
    blogGenerated?: GeneratedBlog;
    savedToDb?: boolean;
    error?: string;
}> {
    console.log("[AutoBlog] 📝 بدء توليد المدونة الأسبوعية...");
    const startMs = Date.now();

    try {
        // 1. تحليل سلوك المستخدمين
        const suggestions = await analyzeUserBehavior();

        if (suggestions.length === 0) {
            aiMonitor.logError("Auto blog: no topic suggestions found", {}, { event: "blog_generated" });
            return { success: false, error: "لم يتم العثور على اقتراحات مواضيع" };
        }

        // 2. اختيار أفضل موضوع
        const topSuggestion = suggestions[0];
        console.log(`[AutoBlog] الموضوع المختار: ${topSuggestion.topic}`);

        // 3. توليد المحتوى
        const generatedBlog = await generateBlogContent(topSuggestion);

        if (!generatedBlog) {
            aiMonitor.logError("Auto blog: content generation failed", { topic: topSuggestion.topic }, { event: "blog_generated", model: "llama-3.3-70b-versatile" });
            return { success: false, error: "فشل توليد المحتوى" };
        }

        // 4. حفظ في قاعدة البيانات
        const saved = await saveBlogToDatabase(generatedBlog);

        console.log("[AutoBlog] ✅ تم توليد المدونة الأسبوعية بنجاح!");
        aiMonitor.log({
            event: "blog_generated",
            level: "info",
            model: "llama-3.3-70b-versatile",
            success: true,
            responseTimeMs: Date.now() - startMs,
            details: {
                title: generatedBlog.title,
                category: generatedBlog.category,
                readTime: generatedBlog.readTime,
                savedToDb: saved,
                topicReason: topSuggestion.reason,
            },
        });

        return { success: true, blogGenerated: generatedBlog, savedToDb: saved };

    } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Unknown error";
        console.error("[AutoBlog] ❌ خطأ:", error);
        aiMonitor.logError(`Auto blog generation crashed: ${errMsg}`, {}, { event: "blog_generated", model: "llama-3.3-70b-versatile", responseTimeMs: Date.now() - startMs });
        return { success: false, error: errMsg };
    }
}

/**
 * تحليل فقط (بدون توليد)
 */
export async function analyzeBlogTopics(): Promise<BlogTopicSuggestion[]> {
    return analyzeUserBehavior();
}

/**
 * جلب جميع المدونات المنشورة
 */
export async function getPublishedBlogs() {
    const db = getDb();
    if (!db) return [];
    return await db.query.blogPosts.findMany({
        where: eq(blogPosts.isPublished, true),
        orderBy: desc(blogPosts.publishedAt),
    });
}

/**
 * جلب المدونات المُولدة تلقائياً
 */
export async function getAutoGeneratedBlogs() {
    const db = getDb();
    if (!db) return [];
    return await db.query.blogPosts.findMany({
        where: eq(blogPosts.isAutoGenerated, true),
        orderBy: desc(blogPosts.createdAt),
    });
}

export const autoBlogGenerator = {
    runWeeklyBlogGeneration,
    analyzeBlogTopics,
    getPublishedBlogs,
    getAutoGeneratedBlogs,
};
