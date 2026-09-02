/**
 * Auto Blog Generator Service
 * Generates a weekly article from observed AQUAVO demand signals.
 */

import { groqClient } from "./groq-client.js";
import { getDb } from "../db.js";
import { productViews, searchQueries, products, blogPosts } from "../../shared/schema.js";
import { desc, count, eq } from "drizzle-orm";
import { aiMonitor } from "./ai-monitor.js";
import { EDITORIAL_TEAM_AUTHOR } from "../../shared/editorial-author.js";
import { EDITORIAL_COMMERCE_RULE, findEditorialViolations } from "../../shared/editorial-guard.js";
import { findScriptViolations, SCRIPT_PURITY_RULE } from "../../shared/script-purity.js";
import {
  findBusinessTruthViolations,
  businessTruthPrompt,
  AQUAVO_INVARIANTS,
  type BusinessFacts,
} from "../../shared/business-truth.js";

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
  model?: string;
}

function generateSlug(title: string): string {
  const timestamp = Date.now();
  const cleanTitle = title
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 50);
  return `${cleanTitle || "aquavo-guide"}-${timestamp}`;
}

async function analyzeUserBehavior(): Promise<BlogTopicSuggestion[]> {
  const db = getDb();
  const suggestions: BlogTopicSuggestion[] = [];
  if (!db) return suggestions;

  try {
    const topViewedProducts = await db
      .select({ productId: productViews.productId, viewCount: count(productViews.id) })
      .from(productViews)
      .groupBy(productViews.productId)
      .orderBy(desc(count(productViews.id)))
      .limit(5);

    for (const item of topViewedProducts) {
      if (!item.productId) continue;
      const product = await db.query.products.findFirst({ where: eq(products.id, item.productId) });
      if (!product?.category) continue;
      suggestions.push({
        topic: `دليل شامل عن ${product.category}`,
        category: product.category,
        reason: `المنتجات في هذه الفئة تحظى باهتمام كبير (${item.viewCount} مشاهدة)`,
        priority: 8,
      });
    }

    const topSearches = await db
      .select({ query: searchQueries.query, searchCount: count(searchQueries.id) })
      .from(searchQueries)
      .groupBy(searchQueries.query)
      .orderBy(desc(count(searchQueries.id)))
      .limit(10);

    for (const search of topSearches) {
      if (!search.query || search.query.length <= 3) continue;
      suggestions.push({
        topic: `كل ما تحتاج معرفته عن ${search.query}`,
        category: "نصائح",
        reason: `"${search.query}" من أكثر عمليات البحث شيوعاً (${search.searchCount} بحث)`,
        priority: 7,
      });
    }

    const month = new Date().getMonth();
    if (month >= 5 && month <= 8) {
      suggestions.push({
        topic: "التعامل مع حرارة الصيف في أحواض السمك",
        category: "نصائح موسمية",
        reason: "موسم الصيف يتطلب عناية خاصة",
        priority: 9,
      });
    } else if (month >= 11 || month <= 1) {
      suggestions.push({
        topic: "تدفئة الحوض في الشتاء",
        category: "نصائح موسمية",
        reason: "موسم الشتاء يتطلب تدفئة مناسبة",
        priority: 9,
      });
    }

    if (suggestions.length < 3) {
      for (const topic of [
        { topic: "أخطاء شائعة يرتكبها المبتدئين في تربية الأسماك", category: "للمبتدئين", priority: 6 },
        { topic: "كيف تختار أول حوض لك - دليل شامل", category: "للمبتدئين", priority: 6 },
        { topic: "الدورة البيولوجية للحوض - ما يجب أن تعرفه", category: "علوم الأحواض", priority: 7 },
        { topic: "توافق الأسماك - من يعيش مع من؟", category: "أنواع الأسماك", priority: 7 },
        { topic: "أفضل النباتات المائية للمبتدئين", category: "نباتات", priority: 6 },
      ]) {
        suggestions.push({ ...topic, reason: "موضوع دائم الطلب" });
      }
    }

    suggestions.sort((a, b) => b.priority - a.priority);
    return suggestions
      .filter((suggestion, index, self) => index === self.findIndex((candidate) => candidate.topic === suggestion.topic))
      .slice(0, 5);
  } catch (error) {
    console.error("[AutoBlog] Behavior analysis failed:", error);
    return [{
      topic: "نصائح للمبتدئين في عالم الأحواض",
      category: "للمبتدئين",
      reason: "موضوع دائم الطلب",
      priority: 5,
    }];
  }
}

function extractJsonObject(response: string): Record<string, unknown> {
  const cleaned = response
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("BLOG_JSON_NOT_FOUND");
  const parsed = JSON.parse(cleaned.slice(start, end + 1));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("BLOG_JSON_INVALID");
  return parsed as Record<string, unknown>;
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Reads the business facts the article is allowed to rely on straight from the
 * catalogue, so the model is shown what AQUAVO sells instead of remembering it.
 *
 * On any failure this returns the invariants with an empty catalogue, which
 * makes every availability claim a violation. That is the safe direction: a
 * generator that cannot see the catalogue must not write about the catalogue.
 */
async function loadBusinessFacts(): Promise<BusinessFacts> {
  try {
    const db = getDb();
    const rows = await db
      .select({ category: products.category, name: products.name })
      .from(products);
    if (rows.length === 0) return AQUAVO_INVARIANTS;
    return {
      ...AQUAVO_INVARIANTS,
      categories: Array.from(new Set(rows.map((r) => r.category).filter(Boolean))),
      // The head noun of each product name — "سخان حوض أسود قابل لضبط الحرارة"
      // contributes "سخان" — which is the granularity a sentence names a
      // product at.
      productTerms: Array.from(
        new Set(rows.flatMap((r) => (r.name ?? "").split(/[\s—–-]+/).slice(0, 2)).filter((w) => w.length > 2)),
      ),
    };
  } catch (error) {
    console.error("[auto-blog] catalogue unavailable, failing closed on availability claims:", error);
    return AQUAVO_INVARIANTS;
  }
}

function validateGeneratedBlogData(
  value: Record<string, unknown>,
  facts: BusinessFacts = AQUAVO_INVARIANTS,
): {
  title: string;
  metaDescription: string;
  excerpt: string;
  content: string;
  readTime: string;
  iconName: string;
  keywords: string[];
  faq: Array<{ q: string; a: string }>;
} {
  const title = safeString(value.title);
  const metaDescription = safeString(value.metaDescription);
  const excerpt = safeString(value.excerpt);
  const content = safeString(value.content);
  const readTime = safeString(value.readTime) || "5 دقائق";
  const allowedIcons = new Set(["Fish", "Droplets", "Leaf", "Heart", "Filter", "AlertTriangle"]);
  const iconCandidate = safeString(value.iconName);
  const iconName = allowedIcons.has(iconCandidate) ? iconCandidate : "Fish";

  if (title.length < 20 || title.length > 120) throw new Error("BLOG_TITLE_INVALID");
  if (metaDescription.length < 60 || metaDescription.length > 220) throw new Error("BLOG_META_INVALID");
  if (excerpt.length < 30) throw new Error("BLOG_EXCERPT_INVALID");
  if (content.length < 1500 || !/<h2[\s>]/i.test(content) || !/<p[\s>]/i.test(content)) {
    throw new Error("BLOG_CONTENT_TOO_SHORT_OR_UNSTRUCTURED");
  }

  // Provider-generated HTML is treated as untrusted. Block executable or browser-event
  // markup before persistence. The blog prompt only requires simple semantic HTML.
  if (/<\s*(script|iframe|object|embed|form|input|button|style|link|meta)\b/i.test(content)) {
    throw new Error("BLOG_CONTENT_UNSAFE_TAG");
  }
  if (/\son[a-z]+\s*=|javascript\s*:/i.test(content)) {
    throw new Error("BLOG_CONTENT_UNSAFE_ATTRIBUTE");
  }

  // Editorial refusal, not just a safety refusal.
  //
  // A generated article once told readers to go and buy fish and plants at
  // سوق الغزل — AQUAVO's own voice sending its readers to a competing market —
  // and others claimed AQUAVO stocks live fish, live plants and CO2 systems it
  // does not carry. The prompt now forbids both, but a prompt is a request; this
  // is the constraint. See shared/editorial-guard.ts.
  const editorial = findEditorialViolations(content).concat(
    findEditorialViolations(title),
    findEditorialViolations(excerpt),
  );
  if (editorial.length > 0) {
    throw new Error(`BLOG_CONTENT_EDITORIAL_VIOLATION:${editorial[0].rule}:${editorial[0].evidence.slice(0, 160)}`);
  }

  // Language refusal, not a style preference.
  //
  // The generator shipped 30 of 80 published articles carrying stray Chinese,
  // Russian, Devanagari, Vietnamese, French and spliced-English fragments inside
  // Arabic sentences. Those were cleaned in migration
  // blog-language-contamination-20260901; this stops them coming back.
  // See shared/script-purity.ts.
  const script = findScriptViolations(content).concat(
    findScriptViolations(title),
    findScriptViolations(excerpt),
  );
  if (script.length > 0) {
    throw new Error(`BLOG_CONTENT_SCRIPT_IMPURITY:${script[0].rule}:${script[0].evidence.slice(0, 160)}`);
  }

  // Business-fact refusal, not a style preference.
  //
  // A claims audit on 2026-09-02 found 38 false or unsupported business claims
  // across 23 of 80 published articles: live fish and plants "in stock",
  // branches that do not exist, warranties the return policy disclaims, three
  // separate "first in Iraq" claims, and five products with no catalogue match
  // at all. The prompt had already forbidden every one of them, which is why
  // this is a gate and not another sentence in the prompt.
  // See shared/business-truth.ts.
  const business = findBusinessTruthViolations(content, facts).concat(
    findBusinessTruthViolations(title, facts),
    findBusinessTruthViolations(excerpt, facts),
  );
  if (business.length > 0) {
    throw new Error(`BLOG_CONTENT_BUSINESS_UNTRUTH:${business[0].rule}:${business[0].evidence.slice(0, 160)}`);
  }

  const keywords = Array.isArray(value.keywords)
    ? value.keywords.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 8)
    : [];
  const faq = Array.isArray(value.faq)
    ? value.faq.flatMap((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const q = safeString((item as Record<string, unknown>).q);
        const a = safeString((item as Record<string, unknown>).a);
        return q && a ? [{ q, a }] : [];
      }).slice(0, 6)
    : [];

  return { title, metaDescription, excerpt, content, readTime, iconName, keywords, faq };
}

function buildPrompt(topic: BlogTopicSuggestion, facts: BusinessFacts): string {
  return `أنت خبير أحواض سمك عراقي تكتب لموقع AQUAVO.
اكتب مقالاً عربياً مفيداً ومحسناً لمحركات البحث عن: "${topic.topic}".
الفئة: ${topic.category}.

المطلوب:
- عنوان واضح وجذاب.
- metaDescription بين 120 و180 حرف تقريباً.
- 3-5 كلمات مفتاحية.
- محتوى HTML دلالي فقط باستخدام h2,h3,p,ul,ol,li,strong,a.
- 800-1200 كلمة تقريباً، ومقدمة تجيب نية البحث مباشرة.
- FAQ من 3-4 أسئلة.
- روابط داخلية فقط إلى مسارات تبدأ بـ / داخل AQUAVO.
- لا تستخدم script/style/iframe/form أو event handlers أو javascript URLs.
- لا تخترع ادعاءات طبية أو ضمانات أو أرقام غير مدعومة.
- ممنوع منعاً باتاً توجيه القارئ للشراء من أي متجر أو سوق أو بائع خارج AQUAVO.
  لا تذكر سوق الغزل أو الشورجة أو الأسواق أو المحلات المحلية أو البائعين
  المحليين أو المتاجر الإلكترونية الأخرى كمكان للشراء أو الزيارة.
- AQUAVO متجر إلكتروني فقط ولا يملك محلاً أو فرعاً في أي سوق.
- AQUAVO لا يبيع أسماكاً حية ولا نباتات حية ولا نباتات صناعية ولا أنظمة CO2.
  لا تقل إن هذه المنتجات متوفرة لدى AQUAVO.
- إذا كان المنتج غير متوفر لدى AQUAVO، اكتفِ بالشرح التعليمي ولا تذكر أي جهة
  شراء بديلة.
- لا تستخدم عبارات تفضيل غير مثبتة مثل "الأول في العراق" أو "أفضل متجر".

القاعدة التحريرية الملزمة (تُرفض المقالة آلياً عند مخالفتها):
${EDITORIAL_COMMERCE_RULE}

قاعدة اللغة الملزمة (تُرفض المقالة آلياً عند مخالفتها):
${SCRIPT_PURITY_RULE}

${businessTruthPrompt(facts)}

أجب JSON فقط:
{
  "title":"...",
  "metaDescription":"...",
  "keywords":["..."],
  "excerpt":"...",
  "content":"<p>...</p><h2>...</h2>",
  "faq":[{"q":"...","a":"..."}],
  "readTime":"X دقائق",
  "iconName":"Fish|Droplets|Leaf|Heart|Filter|AlertTriangle"
}`;
}

async function generateBlogContent(topic: BlogTopicSuggestion): Promise<GeneratedBlog | null> {
  if (!groqClient.hasKeys()) return null;

  const facts = await loadBusinessFacts();
  const prompt = buildPrompt(topic, facts);
  const models = ["llama-3.3-70b-versatile", "openai/gpt-oss-20b"];

  for (const model of models) {
    try {
      const responseText = await groqClient.chatText(
        [{ role: "user", content: prompt }],
        { temperature: 0.65, maxTokens: 4500, model },
      );
      if (!responseText) continue;

      const blogData = validateGeneratedBlogData(extractJsonObject(responseText), facts);
      let fullContent = blogData.content;
      if (blogData.faq.length > 0) {
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
        id: `auto-${Date.now()}`,
        slug: generateSlug(blogData.title),
        title: blogData.title,
        excerpt: blogData.excerpt,
        content: fullContent,
        category: topic.category,
        readTime: blogData.readTime,
        // Not the chat assistant's persona. Attributing a generated article to
        // "شريمب" published a named human with an invented fifteen-year career
        // as its author; this is AQUAVO editorial content and says so.
        author: EDITORIAL_TEAM_AUTHOR,
        iconName: blogData.iconName,
        metaDescription: blogData.metaDescription,
        keywords: blogData.keywords,
        faq: blogData.faq,
        model,
      };
    } catch (error) {
      console.warn(`[AutoBlog] ${model} generation rejected:`, error instanceof Error ? error.message : error);
    }
  }

  return null;
}

async function saveBlogToDatabase(blog: GeneratedBlog): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

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
    return true;
  } catch (error) {
    console.error("[AutoBlog] Database save failed:", error);
    return false;
  }
}

export async function runWeeklyBlogGeneration(): Promise<{
  success: boolean;
  blogGenerated?: GeneratedBlog;
  savedToDb?: boolean;
  error?: string;
}> {
  const startMs = Date.now();

  try {
    const suggestions = await analyzeUserBehavior();
    if (suggestions.length === 0) {
      aiMonitor.logError("Auto blog: no topic suggestions found", {}, { event: "blog_generated" });
      return { success: false, error: "لم يتم العثور على اقتراحات مواضيع" };
    }

    // Do not lose a whole weekly run because one topic or one model returns malformed output.
    // Try the best three demand-backed topics before failing the job.
    for (const suggestion of suggestions.slice(0, 3)) {
      const generatedBlog = await generateBlogContent(suggestion);
      if (!generatedBlog) continue;

      const saved = await saveBlogToDatabase(generatedBlog);
      if (!saved) {
        aiMonitor.logError("Auto blog: generated content but database save failed", { topic: suggestion.topic }, {
          event: "blog_generated",
          model: generatedBlog.model,
          responseTimeMs: Date.now() - startMs,
        });
        return { success: false, blogGenerated: generatedBlog, savedToDb: false, error: "فشل حفظ المقال في قاعدة البيانات" };
      }

      aiMonitor.log({
        event: "blog_generated",
        level: "info",
        model: generatedBlog.model,
        success: true,
        responseTimeMs: Date.now() - startMs,
        details: {
          title: generatedBlog.title,
          category: generatedBlog.category,
          readTime: generatedBlog.readTime,
          savedToDb: true,
          topicReason: suggestion.reason,
        },
      });
      return { success: true, blogGenerated: generatedBlog, savedToDb: true };
    }

    aiMonitor.logError("Auto blog: all topic/model attempts failed validation", {}, {
      event: "blog_generated",
      responseTimeMs: Date.now() - startMs,
    });
    return { success: false, error: "فشل توليد محتوى صالح بعد محاولات متعددة" };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    aiMonitor.logError(`Auto blog generation crashed: ${errMsg}`, {}, {
      event: "blog_generated",
      responseTimeMs: Date.now() - startMs,
    });
    return { success: false, error: errMsg };
  }
}

export async function analyzeBlogTopics(): Promise<BlogTopicSuggestion[]> {
  return analyzeUserBehavior();
}

export async function getPublishedBlogs() {
  const db = getDb();
  if (!db) return [];
  return db.query.blogPosts.findMany({
    where: eq(blogPosts.isPublished, true),
    orderBy: desc(blogPosts.publishedAt),
  });
}

export async function getAutoGeneratedBlogs() {
  const db = getDb();
  if (!db) return [];
  return db.query.blogPosts.findMany({
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
