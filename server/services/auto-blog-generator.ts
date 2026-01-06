/**
 * Auto Blog Generator Service
 * يولد مدونات أسبوعية تلقائياً بناءً على سلوك المستخدمين
 * 
 * @author شريمب 🦐
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDb } from "../db.js";
import { productViews, searchQueries, products, blogPosts } from "@shared/schema.js";
import { desc, sql, count } from "drizzle-orm";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

interface BlogTopicSuggestion {
    topic: string;
    category: string;
    reason: string;
    priority: number;
}

interface GeneratedBlog {
    id: string;
    title: string;
    excerpt: string;
    content: string;
    category: string;
    readTime: string;
    author: string;
    date: string;
    iconName: string;
}

/**
 * تحليل سلوك المستخدمين لاكتشاف المواضيع الشائعة
 */
async function analyzeUserBehavior(): Promise<BlogTopicSuggestion[]> {
    const db = getDb();
    const suggestions: BlogTopicSuggestion[] = [];

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
            const productIds = topViewedProducts.map(p => p.productId);
            const productDetails = await db.query.products.findMany({
                where: sql`id IN (${productIds.join(',')})`,
            });

            // اقتراح مواضيع بناءً على المنتجات الشائعة
            for (const product of productDetails) {
                if (product.category) {
                    suggestions.push({
                        topic: `دليل شامل عن ${product.category}`,
                        category: product.category,
                        reason: `المنتجات في هذه الفئة تحظى باهتمام كبير`,
                        priority: 8,
                    });
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
                    reason: `"${search.query}" من أكثر عمليات البحث شيوعاً`,
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

        // ترتيب حسب الأولوية
        suggestions.sort((a, b) => b.priority - a.priority);

        console.log(`[AutoBlog] تم تحليل سلوك المستخدمين: ${suggestions.length} اقتراحات`);
        return suggestions.slice(0, 5);

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
        const prompt = `أنت "شريمب 🦐" - خبير أحواض سمك عراقي ودود.
        
اكتب مقال مدونة احترافي ومفيد عن الموضوع التالي:
"${topic.topic}"

الفئة: ${topic.category}

المتطلبات:
1. العنوان: جذاب وفيه إيموجي مناسب
2. المقدمة: 2-3 جمل تجذب القارئ
3. المحتوى: 400-600 كلمة، مقسم لأقسام واضحة مع h2 و h3
4. النصائح: عملية وقابلة للتطبيق في العراق
5. الأسلوب: ودود، مختصر، يستخدم إيموجي بشكل معتدل
6. اللهجة: عربية فصحى بسيطة مع لمسة عراقية

أجب بصيغة JSON فقط:
{
    "title": "عنوان المقال مع إيموجي",
    "excerpt": "وصف مختصر 2-3 جمل",
    "content": "محتوى HTML كامل مع h2, h3, p, ul, li, strong",
    "readTime": "X دقائق",
    "iconName": "Fish|Droplets|Leaf|Heart|Filter|AlertTriangle"
}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // استخراج JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("[AutoBlog] لم يتم العثور على JSON في الرد");
            return null;
        }

        const blogData = JSON.parse(jsonMatch[0]);

        // إنشاء ID فريد
        const id = `auto-${Date.now()}-${topic.category.replace(/\s+/g, '-').toLowerCase()}`;

        // تنسيق التاريخ
        const now = new Date();
        const arabicMonths = [
            "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
            "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
        ];
        const dateStr = `${now.getDate()} ${arabicMonths[now.getMonth()]} ${now.getFullYear()}`;

        return {
            id,
            title: blogData.title,
            excerpt: blogData.excerpt,
            content: blogData.content,
            category: topic.category,
            readTime: blogData.readTime || "5 دقائق",
            author: "شريمب 🦐",
            date: dateStr,
            iconName: blogData.iconName || "Fish",
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

    try {
        await db.insert(blogPosts).values({
            id: blog.id,
            title: blog.title,
            excerpt: blog.excerpt,
            content: blog.content,
            category: blog.category,
            readTime: blog.readTime,
            author: blog.author,
            publishedAt: new Date(),
            imageUrl: "/images/blog/blog_planted_tank.png",
            iconName: blog.iconName,
            isPublished: true,
            isFeatured: false,
        });

        console.log(`[AutoBlog] ✅ تم حفظ المدونة: ${blog.title}`);
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
    error?: string;
}> {
    console.log("[AutoBlog] 📝 بدء توليد المدونة الأسبوعية...");

    try {
        // 1. تحليل سلوك المستخدمين
        const suggestions = await analyzeUserBehavior();

        if (suggestions.length === 0) {
            return {
                success: false,
                error: "لم يتم العثور على اقتراحات مواضيع",
            };
        }

        // 2. اختيار أفضل موضوع
        const topSuggestion = suggestions[0];
        console.log(`[AutoBlog] الموضوع المختار: ${topSuggestion.topic}`);

        // 3. توليد المحتوى
        const generatedBlog = await generateBlogContent(topSuggestion);

        if (!generatedBlog) {
            return {
                success: false,
                error: "فشل توليد المحتوى",
            };
        }

        // 4. حفظ في قاعدة البيانات
        const saved = await saveBlogToDatabase(generatedBlog);

        if (!saved) {
            // إذا فشل الحفظ في DB، يمكن إضافته للملف المحلي
            console.log("[AutoBlog] ⚠️ فشل الحفظ في DB، المدونة متاحة للمراجعة");
        }

        console.log("[AutoBlog] ✅ تم توليد المدونة الأسبوعية بنجاح!");

        return {
            success: true,
            blogGenerated: generatedBlog,
        };

    } catch (error) {
        console.error("[AutoBlog] ❌ خطأ:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * تحليل فقط (بدون توليد)
 */
export async function analyzeBlogTopics(): Promise<BlogTopicSuggestion[]> {
    return analyzeUserBehavior();
}

export const autoBlogGenerator = {
    runWeeklyBlogGeneration,
    analyzeBlogTopics,
};
