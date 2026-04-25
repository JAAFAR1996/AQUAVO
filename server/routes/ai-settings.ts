/**
 * AI Agent Settings Routes - مسارات إعدادات وكلاء الذكاء الاصطناعي
 * تحكم كامل في تشغيل/إيقاف وتهيئة كل وكيل AI
 */

import { Router, Request, Response } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { getDb } from "../db.js";
import * as schema from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import { inventoryOptimizer } from "../services/inventory-optimizer.js";
import { triggerJob } from "../cron/scheduled-jobs.js";
import { churnDetector } from "../services/churn-detector.js";
import { predictiveAnalytics } from "../services/predictive-analytics.js";
import { embeddingGenerator } from "../services/embedding-generator.js";
import { smartNotifications } from "../services/smart-notifications.js";
import { verifyEmailConnection } from "../utils/email.js";

const router = Router();

// Default agents configuration
const DEFAULT_AGENTS = [
  {
    agentName: "sales",
    displayName: "وكيل المبيعات",
    description: "يتحدث مع العملاء، يفهم احتياجاتهم، ويقترح المنتجات المناسبة",
    isEnabled: true,
    autoRun: true,
    runFrequency: "manual" as const,
  },
  {
    agentName: "inventory",
    displayName: "وكيل المخزون",
    description: "يراقب مستويات المخزون ويقترح إعادة الطلب قبل النفاد",
    isEnabled: true,
    autoRun: false,
    runFrequency: "daily" as const,
  },
  {
    agentName: "pricing",
    displayName: "وكيل التسعير",
    description: "يحلل الأسعار ويقترح تعديلات لزيادة الربحية",
    isEnabled: false,
    autoRun: false,
    runFrequency: "daily" as const,
  },
  {
    agentName: "marketing",
    displayName: "وكيل التسويق",
    description: "ينشئ محتوى تسويقي ويرسل حملات بريد إلكتروني",
    isEnabled: false,
    autoRun: false,
    runFrequency: "weekly" as const,
  },
  {
    agentName: "sentiment",
    displayName: "محلل المشاعر",
    description: "يحلل مشاعر العملاء في المحادثات والتقييمات",
    isEnabled: true,
    autoRun: true,
    runFrequency: "manual" as const,
  },
  {
    agentName: "visual",
    displayName: "محلل الصور",
    description: "يحلل صور الأسماك والأحواض لتشخيص المشاكل",
    isEnabled: true,
    autoRun: true,
    runFrequency: "manual" as const,
  },
  {
    agentName: "content",
    displayName: "مولد المحتوى",
    description: "ينشئ وصف المنتجات ومقالات المدونة تلقائياً",
    isEnabled: true,
    autoRun: false,
    runFrequency: "daily" as const,
  },
  {
    agentName: "aquarium",
    displayName: "مستشار الأحواض",
    description: "يساعد في تصميم وتخطيط الأحواض المائية",
    isEnabled: true,
    autoRun: true,
    runFrequency: "manual" as const,
  },
];

// Initialize default agents if not exist
async function initializeDefaultAgents() {
  const db = getDb();
  if (!db) return;

  try {
    const existingAgents = await db.select().from(schema.aiAgentSettings);
    
    if (existingAgents.length === 0) {
      console.log("🤖 Initializing default AI agents...");
      for (const agent of DEFAULT_AGENTS) {
        await db.insert(schema.aiAgentSettings).values(agent).onConflictDoNothing();
      }
      console.log("✅ Default AI agents initialized");
    }
  } catch (error) {
    console.error("Error initializing agents:", error);
  }
}

// Initialize on module load is removed to prevent unexpected DB queries
// initializeDefaultAgents();

// GET /api/ai/settings - Get all agent settings
router.get("/settings", requireAdmin as any, async (_req: Request, res: Response) => {
  const db = getDb();
  if (!db) {
    return res.status(500).json({ success: false, error: "Database not available" });
  }

  try {
    const agents = await db.select().from(schema.aiAgentSettings);
    
    // If no agents, initialize defaults
    if (agents.length === 0) {
      await initializeDefaultAgents();
      const newAgents = await db.select().from(schema.aiAgentSettings);
      return res.json({ success: true, data: newAgents });
    }

    res.json({ success: true, data: agents });
  } catch (error) {
    console.error("Error fetching AI settings:", error);
    res.status(500).json({ success: false, error: "Failed to fetch settings" });
  }
});

// GET /api/ai/settings/:agentName - Get specific agent
router.get("/settings/:agentName", requireAdmin as any, async (req: Request, res: Response) => {
  const db = getDb();
  if (!db) {
    return res.status(500).json({ success: false, error: "Database not available" });
  }

  try {
    const { agentName } = req.params;
    const [agent] = await db
      .select()
      .from(schema.aiAgentSettings)
      .where(eq(schema.aiAgentSettings.agentName, agentName));

    if (!agent) {
      return res.status(404).json({ success: false, error: "Agent not found" });
    }

    res.json({ success: true, data: agent });
  } catch (error) {
    console.error("Error fetching agent:", error);
    res.status(500).json({ success: false, error: "Failed to fetch agent" });
  }
});

// PATCH /api/ai/settings/:agentName - Update agent settings
router.patch("/settings/:agentName", requireAdmin as any, async (req: Request, res: Response) => {
  const db = getDb();
  if (!db) {
    return res.status(500).json({ success: false, error: "Database not available" });
  }

  try {
    const { agentName } = req.params;
    const updates = schema.updateAIAgentSettingSchema.parse(req.body);

    const [updated] = await db
      .update(schema.aiAgentSettings)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(schema.aiAgentSettings.agentName, agentName))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, error: "Agent not found" });
    }

    console.log(`🤖 Agent "${agentName}" updated:`, updates);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating agent:", error);
    res.status(500).json({ success: false, error: "Failed to update agent" });
  }
});

// POST /api/ai/settings/:agentName/toggle - Quick toggle on/off
router.post("/settings/:agentName/toggle", requireAdmin as any, async (req: Request, res: Response) => {
  const db = getDb();
  if (!db) {
    return res.status(500).json({ success: false, error: "Database not available" });
  }

  try {
    const { agentName } = req.params;

    // Get current state
    const [agent] = await db
      .select()
      .from(schema.aiAgentSettings)
      .where(eq(schema.aiAgentSettings.agentName, agentName));

    if (!agent) {
      return res.status(404).json({ success: false, error: "Agent not found" });
    }

    // Toggle
    const [updated] = await db
      .update(schema.aiAgentSettings)
      .set({
        isEnabled: !agent.isEnabled,
        updatedAt: new Date(),
      })
      .where(eq(schema.aiAgentSettings.agentName, agentName))
      .returning();

    console.log(`🤖 Agent "${agentName}" toggled to: ${updated.isEnabled ? "ON" : "OFF"}`);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error toggling agent:", error);
    res.status(500).json({ success: false, error: "Failed to toggle agent" });
  }
});

// POST /api/ai/settings/:agentName/run - Manually trigger agent
router.post("/settings/:agentName/run", requireAdmin as any, async (req: Request, res: Response) => {
  const db = getDb();
  if (!db) {
    return res.status(500).json({ success: false, error: "Database not available" });
  }

  try {
    const { agentName } = req.params;

    // Get agent
    const [agent] = await db
      .select()
      .from(schema.aiAgentSettings)
      .where(eq(schema.aiAgentSettings.agentName, agentName));

    if (!agent) {
      return res.status(404).json({ success: false, error: "Agent not found" });
    }

    if (!agent.isEnabled) {
      return res.status(400).json({ success: false, error: "الوكيل معطّل. فعّله أولاً." });
    }

    // Execute the actual agent logic
    let runResult: any = null;
    let runStatus: "success" | "error" = "success";

    switch (agentName) {
      case "inventory":
        runResult = await inventoryOptimizer.analyzeAllProducts();
        break;
      case "content":
        runResult = await triggerJob("autoblog");
        break;
      case "pricing":
        runResult = await triggerJob("pricing");
        break;
      case "marketing":
        runResult = await triggerJob("email_campaigns");
        break;
      case "sentiment":
        runResult = { message: "محلل المشاعر يعمل تلقائياً مع كل محادثة" };
        break;
      case "sales":
        runResult = { message: "وكيل المبيعات يعمل تلقائياً في الشات" };
        break;
      case "visual":
        runResult = { message: "محلل الصور يعمل عند رفع صورة" };
        break;
      case "aquarium":
        runResult = { message: "مستشار الأحواض يعمل عند طلب تصميم" };
        break;
      default:
        runResult = { message: `الوكيل "${agentName}" لا يدعم التشغيل اليدوي` };
    }

    // Update stats
    const [updated] = await db
      .update(schema.aiAgentSettings)
      .set({
        lastRunAt: new Date(),
        lastRunStatus: runStatus,
        actionsToday: (agent.actionsToday || 0) + 1,
        totalActions: (agent.totalActions || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(schema.aiAgentSettings.agentName, agentName))
      .returning();

    console.log(`🤖 Agent "${agentName}" manually triggered - result:`, runResult);
    res.json({
      success: true,
      data: updated,
      result: runResult,
      message: `تم تشغيل ${agent.displayName} بنجاح`,
    });
  } catch (error) {
    console.error("Error running agent:", error);

    // Update status to error
    try {
      const { agentName } = req.params;
      await db
        .update(schema.aiAgentSettings)
        .set({ lastRunStatus: "error", updatedAt: new Date() })
        .where(eq(schema.aiAgentSettings.agentName, agentName));
    } catch { /* ignore */ }

    res.status(500).json({ success: false, error: "فشل تشغيل الوكيل" });
  }
});

// ==================== Embedding Management ====================

// GET /api/ai/embeddings/stats - Get embedding coverage stats
router.get("/embeddings/stats", requireAdmin as any, async (_req: Request, res: Response) => {
  try {
    const stats = await embeddingGenerator.getEmbeddingStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error("Error fetching embedding stats:", error);
    res.status(500).json({ success: false, error: "Failed to fetch stats" });
  }
});

// POST /api/ai/embeddings/generate-all - Generate embeddings for all products
router.post("/embeddings/generate-all", requireAdmin as any, async (_req: Request, res: Response) => {
  try {
    console.log("🧠 Admin triggered full embedding generation...");
    const result = await embeddingGenerator.generateAllEmbeddings(5);
    res.json({
      success: true,
      message: `تم توليد ${result.success} embedding بنجاح (فشل: ${result.failed})`,
      data: result,
    });
  } catch (error) {
    console.error("Error generating embeddings:", error);
    res.status(500).json({ success: false, error: "Failed to generate embeddings" });
  }
});

// POST /api/ai/embeddings/generate-missing - Generate only missing embeddings
router.post("/embeddings/generate-missing", requireAdmin as any, async (_req: Request, res: Response) => {
  try {
    console.log("🧠 Admin triggered missing embedding generation...");
    const result = await embeddingGenerator.generateMissingEmbeddings();
    res.json({
      success: true,
      message: `تم توليد ${result.success} embedding ناقص (فشل: ${result.failed})`,
      data: result,
    });
  } catch (error) {
    console.error("Error generating missing embeddings:", error);
    res.status(500).json({ success: false, error: "Failed to generate missing embeddings" });
  }
});

// POST /api/ai/embeddings/generate/:productId - Generate embedding for a single product
router.post("/embeddings/generate/:productId", requireAdmin as any, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const embedding = await embeddingGenerator.generateProductEmbedding(productId);
    if (embedding) {
      res.json({ success: true, message: "تم توليد embedding بنجاح", dimensions: embedding.length });
    } else {
      res.status(400).json({ success: false, error: "فشل توليد embedding" });
    }
  } catch (error) {
    console.error("Error generating product embedding:", error);
    res.status(500).json({ success: false, error: "Failed to generate embedding" });
  }
});

// ==================== Smart Reminders Trigger ====================

// POST /api/ai/run-predictions - Manually trigger daily predictions
router.post("/run-predictions", requireAdmin as any, async (_req: Request, res: Response) => {
  try {
    const result = await predictiveAnalytics.runDailyPredictions();
    res.json({
      success: true,
      message: `تحليل ${result.usersAnalyzed} مستخدم، ${result.predictionsCreated} تنبؤ جديد`,
      data: result,
    });
  } catch (error) {
    console.error("Error running predictions:", error);
    res.status(500).json({ success: false, error: "Failed to run predictions" });
  }
});

// POST /api/ai/run-smart-reminders - Trigger smart notification reminders
router.post("/run-smart-reminders", requireAdmin as any, async (_req: Request, res: Response) => {
  try {
    const result = await smartNotifications.sendReplenishmentReminders();
    res.json({
      success: true,
      message: `تم إرسال ${result.emailsSent} إيميل و ${result.pushSent} إشعار لـ ${result.usersNotified} مستخدم`,
      data: result,
    });
  } catch (error) {
    console.error("Error running smart reminders:", error);
    res.status(500).json({ success: false, error: "Failed to send reminders" });
  }
});

// ==================== Email System Status ====================

// GET /api/ai/email-status - Check if email system is configured and working
router.get("/email-status", requireAdmin as any, async (_req: Request, res: Response) => {
  try {
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    const configured = !!(smtpHost && smtpUser && smtpPass);
    let connected = false;

    if (configured) {
      connected = await verifyEmailConnection();
    }

    res.json({
      success: true,
      data: {
        configured,
        connected,
        host: smtpHost || "غير محدد",
        user: smtpUser ? smtpUser.replace(/(.{3}).*(@.*)/, "$1***$2") : "غير محدد",
        port: process.env.SMTP_PORT || "587",
        secure: process.env.SMTP_SECURE === "true",
      },
    });
  } catch (error) {
    console.error("Error checking email status:", error);
    res.status(500).json({ success: false, error: "Failed to check email status" });
  }
});

// Helper function to check if an agent is enabled (for use in other services)
export async function isAgentEnabled(agentName: string): Promise<boolean> {
  const db = getDb();
  if (!db) return true; // Default to enabled if DB unavailable

  try {
    const [agent] = await db
      .select({ isEnabled: schema.aiAgentSettings.isEnabled })
      .from(schema.aiAgentSettings)
      .where(eq(schema.aiAgentSettings.agentName, agentName));

    return agent?.isEnabled ?? true;
  } catch {
    return true; // Default to enabled on error
  }
}

// Helper to get agent's fallback message
export async function getAgentFallback(agentName: string): Promise<string> {
  const db = getDb();
  if (!db) return "عذراً، هذه الخدمة غير متاحة حالياً";

  try {
    const [agent] = await db
      .select({ config: schema.aiAgentSettings.config })
      .from(schema.aiAgentSettings)
      .where(eq(schema.aiAgentSettings.agentName, agentName));

    return agent?.config?.fallbackMessage || "عذراً، هذه الخدمة غير متاحة حالياً";
  } catch {
    return "عذراً، هذه الخدمة غير متاحة حالياً";
  }
}

export default router;
