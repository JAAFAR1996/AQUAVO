/**
 * MiroFish Deep Simulation Routes — AQUAVO
 * =========================================
 * Routes that leverage the full MiroFish pipeline (graph + OASIS agents + report).
 * These are "deep analysis" endpoints — slower but far more powerful than the
 * quick Groq parallel agents in simulation.ts.
 *
 * Requires MiroFish sidecar running (docker-compose.mirofish.yml).
 * If MiroFish is offline, returns 503 with clear message.
 *
 * All admin-only except /status (which is checked by frontend).
 */

import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";
import { requireAdmin } from "../middleware/auth.js";
import {
  isMiroFishAvailable,
  runFullPipeline,
  chatWithReport,
  getTimeline,
  getAgentStats,
  uploadSeedAndBuildGraph,
  runSimulation,
  interviewAllAgents,
  generateReport,
} from "../services/mirofish-client.js";

const router = Router();

// Conservative limiter — MiroFish pipelines are expensive
const mfLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5,
  message: { success: false, error: "محرك MiroFish مشغول. حاول بعد 5 دقائق." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

// Seed files directory
const SEEDS_DIR = path.join(process.cwd(), "mirofish-seeds");

function readSeed(filename: string): string {
  const filePath = path.join(SEEDS_DIR, filename);
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf-8");
}

// ─── Health / Status ──────────────────────────────────────────
// GET /api/mirofish/status
// Used by frontend to show/hide MiroFish-powered features

router.get("/status", async (_req: Request, res: Response) => {
  const available = await isMiroFishAvailable();
  return res.json({
    available,
    message: available
      ? "محرك MiroFish يعمل — الوضع الكامل متاح"
      : "محرك MiroFish غير متاح — وضع المحاكاة السريعة نشط",
    miroFishUrl: process.env.MIROFISH_URL || "http://localhost:5001",
  });
});

// ============================================================
// 1. التوأم الثقافي — Deep (MiroFish edition)
// POST /api/mirofish/cultural-twin
// Runs a full Iraqi society simulation via MiroFish OASIS agents.
// Much richer than the quick Groq version — use for daily cron job.
// ============================================================

router.post(
  "/cultural-twin",
  requireAdmin as any,
  mfLimiter,
  async (req: Request, res: Response) => {
    const available = await isMiroFishAvailable();
    if (!available) {
      return res.status(503).json({
        success: false,
        error: "محرك MiroFish غير متاح. شغّل: docker-compose -f docker-compose.mirofish.yml up -d",
      });
    }

    try {
      const culturalSeed = readSeed("cultural-society.md");
      if (!culturalSeed) throw new Error("ملف البذرة cultural-society.md غير موجود");

      const result = await runFullPipeline({
        seedMarkdown: culturalSeed,
        simulationRequirement:
          "محاكاة ديناميكيات المجتمع العراقي من خلال شخصيات أسماك الزينة. كل نوع سمكة يمثل شريحة اجتماعية. افحص التفاعلات، التوترات، التكافل، والانسجام.",
        projectName: `AQUAVO-CulturalTwin-${Date.now()}`,
        entityTypes: [
          "Betta Splendens",
          "Koi Carp",
          "Neon Tetra",
          "Goldfish",
          "Oscar Cichlid",
          "Parrot Cichlid",
          "Corydoras Catfish",
          "Molly Fish",
        ],
        interviewPrompt:
          "ما الذي تشعر به اليوم في الحوض؟ كيف علاقتك بالأسماك الأخرى؟ ما أكبر تحدٍ تواجهه في المجتمع؟",
        maxRounds: 15,
      });

      return res.json({
        success: true,
        data: {
          simulationId: result.simulationId,
          reportId: result.reportId,
          reportContent: result.reportContent,
          agentInterviews: result.interviewResponses,
          timeline: result.timeline,
          agentStats: result.agentStats,
        },
      });
    } catch (error: any) {
      console.error("[MiroFish] Cultural Twin error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ============================================================
// 2. الكتالوج الحي — Deep (MiroFish edition)
// POST /api/mirofish/catalog-deep
// Full Iraqi buyer simulation through MiroFish OASIS engine.
// ============================================================

router.post(
  "/catalog-deep",
  requireAdmin as any,
  mfLimiter,
  async (req: Request, res: Response) => {
    const available = await isMiroFishAvailable();
    if (!available) {
      return res.status(503).json({
        success: false,
        error: "محرك MiroFish غير متاح. شغّل docker-compose.mirofish.yml",
      });
    }

    const { productName, priceIQD, costUSD, category, description } = req.body;
    if (!productName || !priceIQD) {
      return res.status(400).json({ success: false, error: "اسم المنتج والسعر مطلوبان" });
    }

    try {
      const marketSeed = readSeed("iraqi-market.md");

      // Build product-specific seed by appending product details
      const productSeed = `${marketSeed}

## المنتج المراد تحليله

**الاسم:** ${productName}
**الفئة:** ${category || "أدوات أحواض"}
**سعر البيع:** ${priceIQD} دينار عراقي
**تكلفة الاستيراد:** $${costUSD || "غير محدد"}
**الوصف:** ${description || "لا يوجد"}

## مهمة المحاكاة
ستمثل كل شريحة مستهلكين شخصيةً مستقلة تقيّم شراء هذا المنتج. سجّل ردود الفعل الصادقة لكل شريحة.
`;

      const result = await runFullPipeline({
        seedMarkdown: productSeed,
        simulationRequirement: `تقييم جدوى تسويق "${productName}" بسعر ${priceIQD} دينار للمستهلكين العراقيين. اكشف نقاط القوة والضعف والسعر المثالي.`,
        projectName: `AQUAVO-Catalog-${productName.replace(/\s/g, "_")}-${Date.now()}`,
        entityTypes: [
          "مبتدئ شاب",
          "هاوي متقدم",
          "أب عائلة",
          "صاحب محل",
          "زبون فيسبوك",
          "مقتصد",
        ],
        interviewPrompt: `هل ستشتري "${productName}" بسعر ${priceIQD} دينار؟ ولماذا؟ ما أقصى سعر تقبله؟`,
        maxRounds: 10,
      });

      return res.json({
        success: true,
        data: {
          simulationId: result.simulationId,
          productName,
          reportId: result.reportId,
          reportContent: result.reportContent,
          agentInterviews: result.interviewResponses,
          agentStats: result.agentStats,
        },
      });
    } catch (error: any) {
      console.error("[MiroFish] Catalog Deep error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ============================================================
// 3. نبي الموجة — Deep (MiroFish edition)
// POST /api/mirofish/market-forecast
// Multi-agent Iraqi market simulation for 6-month forecast.
// ============================================================

router.post(
  "/market-forecast",
  requireAdmin as any,
  mfLimiter,
  async (req: Request, res: Response) => {
    const available = await isMiroFishAvailable();
    if (!available) {
      return res.status(503).json({
        success: false,
        error: "محرك MiroFish غير متاح. شغّل docker-compose.mirofish.yml",
      });
    }

    const { topProducts, monthlyRevenue, topCategories } = req.body;

    try {
      const marketSeed = readSeed("iraqi-market.md");
      const extraContext = [
        topProducts ? `## المنتجات الأعلى مبيعاً\n${topProducts}` : "",
        topCategories ? `## الفئات الأعلى مبيعاً\n${topCategories}` : "",
        monthlyRevenue ? `## متوسط الإيرادات الشهرية\n${monthlyRevenue} دينار` : "",
      ].filter(Boolean).join("\n\n");

      const forecastSeed = `${marketSeed}\n\n## بيانات AQUAVO الحالية\n${extraContext || "لا توجد بيانات إضافية"}`;

      const result = await runFullPipeline({
        seedMarkdown: forecastSeed,
        simulationRequirement:
          "توقّع الطلب على منتجات أحواض الزينة في العراق خلال الـ 6 أشهر القادمة. حلّل الموسمية، المنافسة، والتحولات في سلوك المستهلك. أنتج توصيات استيراد دقيقة.",
        projectName: `AQUAVO-MarketForecast-${Date.now()}`,
        entityTypes: [
          "مبتدئ شاب",
          "هاوي متقدم",
          "أب عائلة",
          "صاحب محل",
          "زبون فيسبوك",
          "مقتصد",
          "مستورد",
          "منافس",
        ],
        interviewPrompt:
          "ما توقعاتك لمشترياتك خلال الـ 6 أشهر القادمة؟ ما الأحداث التي قد تغيّر قراراتك الشرائية؟",
        maxRounds: 20,
      });

      return res.json({
        success: true,
        data: {
          simulationId: result.simulationId,
          reportId: result.reportId,
          reportContent: result.reportContent,
          agentInterviews: result.interviewResponses,
          timeline: result.timeline,
          agentStats: result.agentStats,
        },
      });
    } catch (error: any) {
      console.error("[MiroFish] Market Forecast error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ============================================================
// 4. محكمة الألف سيناريو — Deep (MiroFish edition)
// POST /api/mirofish/treatment-court
// Multi-agent treatment simulation for sick fish via OASIS.
// ============================================================

router.post(
  "/treatment-court",
  mfLimiter,
  async (req: Request, res: Response) => {
    const available = await isMiroFishAvailable();
    if (!available) {
      return res.status(503).json({
        success: false,
        error: "محرك MiroFish غير متاح. شغّل docker-compose.mirofish.yml",
      });
    }

    const { species, symptoms, diagnosis, waterTemp, waterPh, waterAmmonia, tankSize } = req.body;
    if (!symptoms && !diagnosis) {
      return res.status(400).json({ success: false, error: "الأعراض أو التشخيص مطلوب" });
    }

    try {
      const diseaseSeed = readSeed("fish-diseases.md");

      const patientSeed = `${diseaseSeed}

## المريض الحالي

**النوع:** ${species || "غير محدد"}
**التشخيص:** ${diagnosis || "غير محدد"}
**الأعراض:** ${symptoms || "غير محددة"}
**حجم الحوض:** ${tankSize || "غير محدد"} لتر
**الحرارة:** ${waterTemp || "غير محددة"}°م
**pH:** ${waterPh || "غير محدد"}
**أمونيا:** ${waterAmmonia || "0"} ppm

## مهمة المحكمة
كل وكيل علاج يمثل طريقة علاج مستقلة. يجب أن يُقيّم كل وكيل فاعلية طريقته على هذه الحالة تحديداً، بناءً على معرفته البيطرية العلمية.
`;

      const result = await runFullPipeline({
        seedMarkdown: patientSeed,
        simulationRequirement: `تقييم 8 بروتوكولات علاجية مختلفة لسمكة ${species || "زينة"} مصابة بـ${diagnosis || symptoms}. أيّها الأنسب وفق هذه الحالة؟`,
        projectName: `AQUAVO-TreatmentCourt-${Date.now()}`,
        entityTypes: [
          "ملح الطعام",
          "تغيير الماء",
          "ميثيلين بلو",
          "مضاد طفيليات",
          "رفع الحرارة",
          "عزل فقط",
          "مضاد حيوي",
          "مراقبة فقط",
        ],
        interviewPrompt:
          "بناءً على بيانات المريض، ما نسبة نجاح طريقتك؟ ما الخطوات الدقيقة التي توصي بها؟ ما أكبر خطر في استخدام طريقتك لهذه الحالة؟",
        maxRounds: 10,
      });

      return res.json({
        success: true,
        data: {
          simulationId: result.simulationId,
          patientProfile: `${species || "سمكة"} — ${diagnosis || symptoms}`,
          reportId: result.reportId,
          reportContent: result.reportContent,
          treatmentAgentInterviews: result.interviewResponses,
          agentStats: result.agentStats,
        },
      });
    } catch (error: any) {
      console.error("[MiroFish] Treatment Court error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ============================================================
// 5. دردشة مع التقرير
// POST /api/mirofish/report-chat
// Chat with a previously generated MiroFish simulation report.
// ============================================================

router.post(
  "/report-chat",
  requireAdmin as any,
  async (req: Request, res: Response) => {
    const available = await isMiroFishAvailable();
    if (!available) {
      return res.status(503).json({ success: false, error: "محرك MiroFish غير متاح" });
    }

    const { simulationId, message, history } = req.body;
    if (!simulationId || !message) {
      return res.status(400).json({ success: false, error: "simulationId والرسالة مطلوبان" });
    }

    try {
      const response = await chatWithReport(simulationId, message, history || []);
      return res.json({ success: true, response });
    } catch (error: any) {
      console.error("[MiroFish] Report Chat error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ============================================================
// 6. تفاصيل المحاكاة
// GET /api/mirofish/simulation/:id/timeline
// GET /api/mirofish/simulation/:id/stats
// ============================================================

router.get(
  "/simulation/:id/timeline",
  requireAdmin as any,
  async (req: Request, res: Response) => {
    const available = await isMiroFishAvailable();
    if (!available) return res.status(503).json({ success: false, error: "MiroFish غير متاح" });

    try {
      const timeline = await getTimeline(req.params.id);
      return res.json({ success: true, timeline });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.get(
  "/simulation/:id/stats",
  requireAdmin as any,
  async (req: Request, res: Response) => {
    const available = await isMiroFishAvailable();
    if (!available) return res.status(503).json({ success: false, error: "MiroFish غير متاح" });

    try {
      const stats = await getAgentStats(req.params.id);
      return res.json({ success: true, stats });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
