/**
 * AI Agent Settings Routes - مسارات إعدادات وكلاء الذكاء الاصطناعي
 * تحكم كامل في تشغيل/إيقاف وتهيئة كل وكيل AI
 */

import { Router, Request, Response } from "express";
import { getDb } from "../db.js";
import * as schema from "../../shared/schema.js";
import { eq } from "drizzle-orm";

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

// Initialize on module load
initializeDefaultAgents();

// GET /api/ai/settings - Get all agent settings
router.get("/settings", async (_req: Request, res: Response) => {
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
router.get("/settings/:agentName", async (req: Request, res: Response) => {
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
router.patch("/settings/:agentName", async (req: Request, res: Response) => {
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
router.post("/settings/:agentName/toggle", async (req: Request, res: Response) => {
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
router.post("/settings/:agentName/run", async (req: Request, res: Response) => {
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
      return res.status(400).json({ success: false, error: "Agent is disabled" });
    }

    // TODO: Implement actual agent run logic here
    // For now, just update the stats
    const [updated] = await db
      .update(schema.aiAgentSettings)
      .set({
        lastRunAt: new Date(),
        lastRunStatus: "success",
        actionsToday: (agent.actionsToday || 0) + 1,
        totalActions: (agent.totalActions || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(schema.aiAgentSettings.agentName, agentName))
      .returning();

    console.log(`🤖 Agent "${agentName}" manually triggered`);
    res.json({ 
      success: true, 
      data: updated,
      message: `تم تشغيل ${agent.displayName} بنجاح`,
    });
  } catch (error) {
    console.error("Error running agent:", error);
    res.status(500).json({ success: false, error: "Failed to run agent" });
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
