import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { visualAI } from "../services/visual-ai";
import { sentimentAnalyzer } from "../services/sentiment-analyzer";
import { predictiveAnalytics } from "../services/predictive-analytics";
import { churnDetector } from "../services/churn-detector";
import { contentGenerator } from "../services/content-generator";
import { emailCampaignAI } from "../services/email-campaign-ai";
import { inventoryOptimizer } from "../services/inventory-optimizer";
import { autoOrderProcessor } from "../services/auto-order-processor";
import { returnsHandler } from "../services/returns-handler";
import { competitivePricer } from "../services/competitive-pricer";
import { aquariumAdvisor } from "../services/aquarium-advisor";
import { triggerJob, getJobStatus } from "../cron/scheduled-jobs";
import { fraudDetector } from "../services/fraud-detector";
import { aiDashboard } from "../services/ai-dashboard";

const router = Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/ai-analysis/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "analysis-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("يُسمح فقط بالصور (JPEG, PNG, GIF, WebP)"));
    }
  },
});

// Validation schemas
const analyzeImageByUrlSchema = z.object({
  imageUrl: z.string().url("رابط الصورة غير صالح"),
  analysisType: z.enum(["fish", "tank", "problem", "health"], {
    errorMap: () => ({ message: "نوع التحليل غير صالح" }),
  }),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
});

// ==================== Visual AI Endpoints ====================

/**
 * POST /api/ai-advanced/visual/analyze-url
 * تحليل صورة من URL
 */
router.post("/visual/analyze-url", async (req, res) => {
  try {
    const { imageUrl, analysisType, userId, sessionId } =
      analyzeImageByUrlSchema.parse(req.body);

    const result = await visualAI.analyzeImage(
      imageUrl,
      analysisType,
      userId,
      sessionId
    );

    res.json({
      success: true,
      data: result,
      message: "تم تحليل الصورة بنجاح",
    });
  } catch (error) {
    console.error("Visual AI analyze-url error:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "بيانات غير صالحة",
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "فشل تحليل الصورة",
    });
  }
});

/**
 * POST /api/ai-advanced/visual/analyze-upload
 * تحليل صورة مرفوعة
 */
router.post(
  "/visual/analyze-upload",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "لم يتم رفع أي صورة",
        });
      }

      const analysisType = req.body.analysisType;
      if (!["fish", "tank", "problem", "health"].includes(analysisType)) {
        return res.status(400).json({
          success: false,
          error: "نوع التحليل غير صالح",
        });
      }

      // Create public URL for uploaded image
      const imageUrl = `${req.protocol}://${req.get("host")}/uploads/ai-analysis/${req.file.filename}`;

      const result = await visualAI.analyzeImage(
        imageUrl,
        analysisType,
        req.body.userId,
        req.body.sessionId
      );

      res.json({
        success: true,
        data: {
          ...result,
          uploadedFile: {
            filename: req.file.filename,
            size: req.file.size,
            url: imageUrl,
          },
        },
        message: "تم رفع وتحليل الصورة بنجاح",
      });
    } catch (error) {
      console.error("Visual AI analyze-upload error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "فشل تحليل الصورة",
      });
    }
  }
);

/**
 * GET /api/ai-advanced/visual/history/:userId
 * الحصول على سجل التحليلات
 */
router.get("/visual/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const history = await visualAI.getUserAnalysisHistory(userId, limit);

    res.json({
      success: true,
      data: history,
      count: history.length,
    });
  } catch (error) {
    console.error("Visual AI history error:", error);
    res.status(500).json({
      success: false,
      error: "فشل جلب سجل التحليلات",
    });
  }
});

/**
 * GET /api/ai-advanced/visual/analysis/:id
 * الحصول على تحليل محدد
 */
router.get("/visual/analysis/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const analysis = await visualAI.getAnalysisById(id);

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error("Visual AI get analysis error:", error);
    res.status(404).json({
      success: false,
      error: error instanceof Error ? error.message : "التحليل غير موجود",
    });
  }
});

/**
 * GET /api/ai-advanced/visual/stats
 * إحصائيات التحليلات
 */
router.get("/visual/stats", async (req, res) => {
  try {
    const userId = req.query.userId as string | undefined;
    const stats = await visualAI.getAnalysisStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Visual AI stats error:", error);
    res.status(500).json({
      success: false,
      error: "فشل جلب الإحصائيات",
    });
  }
});

// ==================== Sentiment Analysis Endpoints ====================

/**
 * GET /api/ai-advanced/sentiment/history/:userId
 * سجل تحليل المشاعر للمستخدم
 */
router.get("/sentiment/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const history = await sentimentAnalyzer.getUserSentimentHistory(userId, limit);

    res.json({
      success: true,
      data: history,
      count: history.length,
    });
  } catch (error) {
    console.error("Sentiment history error:", error);
    res.status(500).json({
      success: false,
      error: "فشل جلب سجل المشاعر",
    });
  }
});

/**
 * GET /api/ai-advanced/sentiment/average/:userId
 * متوسط المشاعر والاتجاه
 */
router.get("/sentiment/average/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    const average = await sentimentAnalyzer.getUserAverageSentiment(userId, days);

    res.json({
      success: true,
      data: average,
    });
  } catch (error) {
    console.error("Sentiment average error:", error);
    res.status(500).json({
      success: false,
      error: "فشل حساب متوسط المشاعر",
    });
  }
});

/**
 * GET /api/ai-advanced/sentiment/frustrated-users
 * كشف المستخدمين المحبطين
 */
router.get("/sentiment/frustrated-users", async (req, res) => {
  try {
    const threshold = parseFloat(req.query.threshold as string) || -0.3;
    const days = parseInt(req.query.days as string) || 7;

    const frustratedUsers = await sentimentAnalyzer.detectFrustratedUsers(
      threshold,
      days
    );

    res.json({
      success: true,
      data: frustratedUsers,
      count: frustratedUsers.length,
    });
  } catch (error) {
    console.error("Frustrated users detection error:", error);
    res.status(500).json({
      success: false,
      error: "فشل كشف المستخدمين المحبطين",
    });
  }
});

// ==================== Predictive Analytics Endpoints ====================

/**
 * GET /api/ai-advanced/predictions/:userId
 * الحصول على توقعات المستخدم
 */
router.get("/predictions/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const predictions = await predictiveAnalytics.getPredictionsForUser(userId);

    res.json({
      success: true,
      data: predictions,
      count: predictions.length,
    });
  } catch (error) {
    console.error("Predictions error:", error);
    res.status(500).json({
      success: false,
      error: "فشل جلب التوقعات",
    });
  }
});

/**
 * POST /api/ai-advanced/predictions/run
 * تشغيل التوقعات يدوياً (للمشرف)
 */
router.post("/predictions/run", async (req, res) => {
  try {
    const result = await triggerJob("predictions");
    res.json(result);
  } catch (error) {
    console.error("Run predictions error:", error);
    res.status(500).json({
      success: false,
      error: "فشل تشغيل التوقعات",
    });
  }
});

// ==================== Churn Detection Endpoints ====================

/**
 * GET /api/ai-advanced/churn/:userId
 * تحليل الـ churn لمستخدم
 */
router.get("/churn/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const analysis = await churnDetector.analyzeUser(userId);

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error("Churn analysis error:", error);
    res.status(500).json({
      success: false,
      error: "فشل تحليل الـ churn",
    });
  }
});

/**
 * GET /api/ai-advanced/churn/high-risk
 * الحصول على العملاء عالي الخطورة
 */
router.get("/churn-high-risk", async (req, res) => {
  try {
    const highRisk = await churnDetector.getHighRiskUsers();

    res.json({
      success: true,
      data: highRisk,
      count: highRisk.length,
    });
  } catch (error) {
    console.error("High risk users error:", error);
    res.status(500).json({
      success: false,
      error: "فشل جلب العملاء عالي الخطورة",
    });
  }
});

// ==================== Content Generator Endpoints ====================

/**
 * POST /api/ai-advanced/content/product-description
 * توليد وصف منتج
 */
router.post("/content/product-description", async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({
        success: false,
        error: "productId مطلوب",
      });
    }

    const content = await contentGenerator.generateProductDescription(productId);

    res.json({
      success: true,
      data: content,
    });
  } catch (error) {
    console.error("Content generation error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "فشل توليد المحتوى",
    });
  }
});

/**
 * POST /api/ai-advanced/content/social-post
 * توليد منشور سوشيال ميديا
 */
router.post("/content/social-post", async (req, res) => {
  try {
    const { productId, platform } = req.body;
    if (!productId || !platform) {
      return res.status(400).json({
        success: false,
        error: "productId و platform مطلوبين",
      });
    }

    const post = await contentGenerator.generateSocialPost(productId, platform);

    res.json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error("Social post generation error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "فشل توليد المنشور",
    });
  }
});

// ==================== Inventory Optimizer Endpoints ====================

/**
 * GET /api/ai-advanced/inventory/recommendations
 * الحصول على توصيات المخزون
 */
router.get("/inventory/recommendations", async (req, res) => {
  try {
    const recommendations = await inventoryOptimizer.getUrgentRecommendations();

    res.json({
      success: true,
      data: recommendations,
      count: recommendations.length,
    });
  } catch (error) {
    console.error("Inventory recommendations error:", error);
    res.status(500).json({
      success: false,
      error: "فشل جلب توصيات المخزون",
    });
  }
});

/**
 * POST /api/ai-advanced/inventory/dismiss/:id
 * تجاهل توصية
 */
router.post("/inventory/dismiss/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await inventoryOptimizer.dismissRecommendation(id);

    res.json({
      success: true,
      message: "تم تجاهل التوصية",
    });
  } catch (error) {
    console.error("Dismiss recommendation error:", error);
    res.status(500).json({
      success: false,
      error: "فشل تجاهل التوصية",
    });
  }
});

// ==================== Auto Orders Endpoints ====================

/**
 * GET /api/ai-advanced/auto-orders/:userId
 * الحصول على الطلبات التلقائية للمستخدم
 */
router.get("/auto-orders/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await autoOrderProcessor.getUserAutoOrders(userId);

    res.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    console.error("Auto orders error:", error);
    res.status(500).json({
      success: false,
      error: "فشل جلب الطلبات التلقائية",
    });
  }
});

/**
 * POST /api/ai-advanced/auto-orders
 * إنشاء طلب تلقائي
 */
router.post("/auto-orders", async (req, res) => {
  try {
    const { userId, productId, frequency, quantity } = req.body;

    const result = await autoOrderProcessor.create({
      userId,
      productId,
      frequency,
      quantity,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Create auto order error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "فشل إنشاء الطلب التلقائي",
    });
  }
});

// ==================== Returns Endpoints ====================

/**
 * POST /api/ai-advanced/returns
 * إنشاء طلب إرجاع
 */
router.post("/returns", async (req, res) => {
  try {
    const { orderId, userId, productId, reason, description, photos } = req.body;

    const result = await returnsHandler.createRequest({
      orderId,
      userId,
      productId,
      reason,
      description,
      photos,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Create return request error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "فشل إنشاء طلب الإرجاع",
    });
  }
});

/**
 * GET /api/ai-advanced/returns/:userId
 * الحصول على طلبات الإرجاع للمستخدم
 */
router.get("/returns/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const requests = await returnsHandler.getUserRequests(userId);

    res.json({
      success: true,
      data: requests,
      count: requests.length,
    });
  } catch (error) {
    console.error("User returns error:", error);
    res.status(500).json({
      success: false,
      error: "فشل جلب طلبات الإرجاع",
    });
  }
});

// ==================== Aquarium Advisor Endpoints ====================

/**
 * POST /api/ai-advanced/aquarium/design
 * إنشاء تصميم حوض
 */
router.post("/aquarium/design", async (req, res) => {
  try {
    const { userId, name, tankSize, tankType, budget, experience, preferences } = req.body;

    const design = await aquariumAdvisor.createDesign({
      userId,
      name,
      tankSize,
      tankType,
      budget,
      experience,
      preferences,
    });

    res.json({
      success: true,
      data: design,
    });
  } catch (error) {
    console.error("Create design error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "فشل إنشاء التصميم",
    });
  }
});

/**
 * POST /api/ai-advanced/aquarium/check-compatibility
 * فحص توافق الأسماك
 */
router.post("/aquarium/check-compatibility", async (req, res) => {
  try {
    const { fish1, fish2 } = req.body;
    if (!fish1 || !fish2) {
      return res.status(400).json({
        success: false,
        error: "fish1 و fish2 مطلوبين",
      });
    }

    const compatibility = await aquariumAdvisor.checkFishCompatibility(fish1, fish2);

    res.json({
      success: true,
      data: compatibility,
    });
  } catch (error) {
    console.error("Compatibility check error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "فشل فحص التوافق",
    });
  }
});

/**
 * GET /api/ai-advanced/aquarium/:designId/shopping-list
 * توليد قائمة تسوق من التصميم
 */
router.get("/aquarium/:designId/shopping-list", async (req, res) => {
  try {
    const { designId } = req.params;
    const shoppingList = await aquariumAdvisor.generateShoppingList(designId);

    res.json({
      success: true,
      data: shoppingList,
    });
  } catch (error) {
    console.error("Shopping list error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "فشل توليد قائمة التسوق",
    });
  }
});

// ==================== Cron Jobs Status ====================

/**
 * GET /api/ai-advanced/jobs/status
 * حالة الـ cron jobs
 */
router.get("/jobs/status", (req, res) => {
  try {
    const status = getJobStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("Jobs status error:", error);
    res.status(500).json({
      success: false,
      error: "فشل جلب حالة الـ jobs",
    });
  }
});

// ==================== Fraud Detection Endpoints ====================

/**
 * POST /api/ai-advanced/fraud/analyze/:orderId
 * تحليل طلب للكشف عن الاحتيال
 */
router.post("/fraud/analyze/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await fraudDetector.analyzeOrder(orderId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Fraud analysis error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "فشل تحليل الطلب",
    });
  }
});

/**
 * GET /api/ai-advanced/fraud/high-risk
 * الحصول على الطلبات عالية الخطورة
 */
router.get("/fraud/high-risk", async (req, res) => {
  try {
    const highRiskOrders = await fraudDetector.getHighRiskOrders();

    res.json({
      success: true,
      data: highRiskOrders,
      count: highRiskOrders.length,
    });
  } catch (error) {
    console.error("High risk orders error:", error);
    res.status(500).json({
      success: false,
      error: "فشل جلب الطلبات المشبوهة",
    });
  }
});

/**
 * POST /api/ai-advanced/fraud/scan
 * فحص جميع الطلبات الحديثة
 */
router.post("/fraud/scan", async (req, res) => {
  try {
    const result = await fraudDetector.analyzeRecentOrders();

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Fraud scan error:", error);
    res.status(500).json({
      success: false,
      error: "فشل فحص الطلبات",
    });
  }
});

// ==================== AI Dashboard Endpoints ====================

/**
 * GET /api/ai-advanced/dashboard/summary
 * ملخص اليوم الذكي
 */
router.get("/dashboard/summary", async (req, res) => {
  try {
    const summary = await aiDashboard.getDailySummary();

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    res.status(500).json({
      success: false,
      error: "فشل جلب الملخص",
    });
  }
});

/**
 * GET /api/ai-advanced/dashboard/quick-stats
 * إحصائيات سريعة
 */
router.get("/dashboard/quick-stats", async (req, res) => {
  try {
    const stats = await aiDashboard.getQuickStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Quick stats error:", error);
    res.status(500).json({
      success: false,
      error: "فشل جلب الإحصائيات",
    });
  }
});

/**
 * GET /api/ai-advanced/dashboard/forecast
 * توقعات الأسبوع
 */
router.get("/dashboard/forecast", async (req, res) => {
  try {
    const forecast = await aiDashboard.getWeeklyForecast();

    res.json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    console.error("Forecast error:", error);
    res.status(500).json({
      success: false,
      error: "فشل جلب التوقعات",
    });
  }
});

// ==================== Health Check ====================

/**
 * GET /api/ai-advanced/health
 * فحص صحة الخدمة
 */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "AI Advanced Features",
    status: "operational",
    features: {
      visualAI: true,
      sentimentAnalysis: true,
      predictiveAnalytics: true,
      churnDetection: true,
      contentGenerator: true,
      emailCampaigns: true,
      inventoryOptimizer: true,
      autoOrders: true,
      returns: true,
      aquariumAdvisor: true,
      fraudDetection: true,
      aiDashboard: true,
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;

