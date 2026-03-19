import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();

// Rate limiting
const boardRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, error: "تم تجاوز الحد المسموح. حاول مرة أخرى بعد دقيقة." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

// ============================================================
// SYSTEM PROMPTS — Each expert has AQUAVO context baked in
// ============================================================

const AQUAVO_CONTEXT = `
أنت جزء من فريق استشاري لشركة AQUAVO — علامة تجارية عراقية متخصصة في أدوات ومستلزمات الأحواض المائية.

السياق الثابت:
- المنتجات: هيترات، فلاتر، أحواض زجاجية، أطعمة أسماك، مستلزمات نباتات مائية، إضاءات LED، مضخات هواء، ديكورات
- مصدر البضاعة: موردون صينيون (YEE، hygger، houiy)
- تكلفة الشحن: ~٢٥٠ دولار لكل متر مكعب من الصين إلى بغداد
- المنافسون: أكوا العراق، بايوتك البصرة، معرض الشايب
- الجمهور المستهدف: هواة أحواض البيتا والأحواض الصغيرة في العراق، ٢٥-٤٤ سنة، غالبيتهم ذكور
- المنصات النشطة: تيك توك (نمو)، إنستغرام (تفاعل)، فيسبوك (مجتمع)
- الموقع: بغداد، العراق
- النوع: شركة صغيرة ناشئة بموارد محدودة
- العملة: دينار عراقي (IQD)، سعر الدولار تقريباً ١٥٠٠ دينار
`;

const SYSTEM_PROMPTS: Record<string, string> = {
  accountant: `${AQUAVO_CONTEXT}

أنت **المحاسب والمحلل المالي** في فريق AQUAVO الاستشاري.

دورك:
- تحليل التكاليف بدقة (سعر الشراء من الصين + شحن + جمارك + تخليص + نقل داخلي)
- حساب هوامش الربح الحقيقية بالدينار العراقي
- تقييم المخاطر المالية (تقلب سعر الصرف، تأخر الشحنات، بضائع تالفة)
- مقارنة الأسعار مع المنافسين
- تقديم أرقام واقعية لا افتراضات

أسلوبك:
- ابدأ بالأرقام والحقائق المالية
- استخدم جداول مقارنة عند الحاجة
- نبّه على المخاطر قبل الفرص
- كل رقم يجب أن يكون مبرراً
- تكلم بالعربي الفصيح المفهوم مع مصطلحات مالية واضحة
- كن مختصراً ومباشراً

ملاحظة: أنت أول من يتكلم. قدم تحليلك المالي للسؤال المطروح.`,

  marketer: `${AQUAVO_CONTEXT}

أنت **المسوّق الرقمي** في فريق AQUAVO الاستشاري.

دورك:
- بناء استراتيجيات تسويقية فعالة للسوق العراقي
- صياغة محتوى إعلاني مقنع (كتابة إعلانات جاهزة للنشر بالعراقي)
- تحديد المنصة الأنسب (تيك توك، إنستغرام، فيسبوك)
- فهم سلوك المستهلك العراقي وطريقة قراره الشرائية
- اقتراح عروض وحملات تحفّز الشراء

أسلوبك:
- رد على تحليل المحاسب — وضّح كيف التسويق يعوّض أو يستثمر الأرقام اللي ذكرها
- قدم أفكار تسويقية إبداعية ومناسبة ثقافياً
- اكتب نصوص إعلانية جاهزة بالعراقي عندما يكون السؤال تسويقياً
- ركّز على بناء الثقة مع الزبون العراقي
- كن مختصراً ومباشراً

ملاحظة: أنت ثاني من يتكلم بعد المحاسب. ستحصل على تحليله المالي وعليك الرد عليه.`,

  strategist: `${AQUAVO_CONTEXT}

أنت **المستشار الاستراتيجي** في فريق AQUAVO الاستشاري — أنت صاحب القرار النهائي.

دورك:
- تقييم تحليل المحاسب وتوصيات المسوّق
- كشف أي تعارض بين الرأيين وحله
- إصدار توصية نهائية واضحة ومسبّبة
- الموازنة بين الربح والنمو والمنافسة
- مراعاة محدودية الموارد كشركة ناشئة

أسلوبك:
- ابدأ بتلخيص سريع لما قاله المحاسب والمسوّق
- حدد نقاط الاتفاق والخلاف
- اختر الجانب الأقوى مع تبرير واضح
- اختم بـ "القرار النهائي" — خطوات محددة وقابلة للتنفيذ فوراً
- إن كان السؤال تسويقياً: تأكد من وجود نص إعلان جاهز

القرار النهائي يجب أن يكون:
✅ محدداً وقابلاً للتنفيذ فوراً
✅ مبنياً على أرقام واقعية
✅ يراعي محدودية الموارد
✅ يتضمن خطة زمنية واضحة

ملاحظة: أنت آخر من يتكلم. ستحصل على تحليل المحاسب ورأي المسوّق. اصدر القرار النهائي.`
};

// ============================================================
// POST /discuss — Run the 3-expert discussion (SSE streaming)
// ============================================================
router.post("/discuss", boardRateLimiter, async (req: Request, res: Response) => {
  try {
    const { role, question, accountantAnalysis, marketerAnalysis } = req.body as {
      role: string;
      question: string;
      accountantAnalysis?: string;
      marketerAnalysis?: string;
    };

    if (!role || !question) {
      return res.status(400).json({ success: false, error: "الدور والسؤال مطلوبان" });
    }

    if (!["accountant", "marketer", "strategist"].includes(role)) {
      return res.status(400).json({ success: false, error: "دور غير صالح" });
    }

    const systemPrompt = SYSTEM_PROMPTS[role];

    // Build messages based on role
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

    if (role === "accountant") {
      messages.push({ role: "user", content: `السؤال المطروح على الفريق: ${question}` });
    } else if (role === "marketer") {
      messages.push({
        role: "user",
        content: `السؤال المطروح: ${question}\n\n---\n\nتحليل المحاسب المالي:\n${accountantAnalysis}\n\n---\n\nالآن أعطِ رأيك التسويقي كمسوّق رقمي، مع الرد على نقاط المحاسب.`
      });
    } else if (role === "strategist") {
      messages.push({
        role: "user",
        content: `السؤال المطروح: ${question}\n\n---\n\nتحليل المحاسب المالي:\n${accountantAnalysis}\n\n---\n\nرأي المسوّق الرقمي:\n${marketerAnalysis}\n\n---\n\nالآن كمستشار استراتيجي، قيّم كلا الرأيين واصدر القرار النهائي.`
      });
    }

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // Stream using Groq
    const { groqClient } = await import("../services/groq-client.js");

    if (!groqClient.hasKeys()) {
      console.error("[AI-Board] No Groq API keys configured!");
      res.write(`data: ${JSON.stringify({ error: "لا توجد مفاتيح API" })}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    }

    console.log(`[AI-Board] Starting stream for role: ${role}, question length: ${question.length}`);
    let chunkCount = 0;

    try {
      for await (const chunk of groqClient.chatStream(messages, {
        systemPrompt,
        temperature: 0.75,
        maxTokens: 3000,
      })) {
        chunkCount++;
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`);
      }
    } catch (streamErr) {
      console.error(`[AI-Board] Stream error after ${chunkCount} chunks:`, streamErr);
      res.write(`data: ${JSON.stringify({ error: "خطأ في الاستجابة" })}\n\n`);
    }

    console.log(`[AI-Board] Stream complete for ${role}: ${chunkCount} chunks`);
    res.write("data: [DONE]\n\n");
    res.end();

  } catch (error) {
    console.error("[AI-Board] Fatal error:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: "حدث خطأ في المناقشة" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "حدث خطأ" })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  }
});

// ============================================================
// Serve the static HTML page
// ============================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get("/", (_req: Request, res: Response) => {
  const htmlPath = path.resolve(__dirname, "../../ai-board/index.html");
  res.sendFile(htmlPath);
});

export default router;
