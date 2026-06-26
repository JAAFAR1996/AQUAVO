import type { Server } from "http";
import express from "express";
import { createProductRouter } from "./routes/products.js";
import { createOrderRouter } from "./routes/orders.js";
import { createUserRouter } from "./routes/users.js";
import { createGalleryRouter } from "./routes/gallery.js";
import { createAdminRouter } from "./routes/admin.js";
import { createSystemRouter } from "./routes/system.js";
import { createFishRouter } from "./routes/fish.js";
import { createReviewsRouter } from "./routes/reviews.js";
import { createCartRouter } from "./routes/cart.js";
import { createFavoritesRouter } from "./routes/favorites.js";
import { createCouponRouter } from "./routes/coupons.js";
import { createBirthdayRouter } from "./routes/birthday.js";
import { createNewsletterRouter } from "./routes/newsletter.js";
import { createReferralRouter } from "./routes/referral.js";
import { createSecurityRouter } from "./routes/security.js";
import { createLoyaltyRouter } from "./routes/loyalty.js";
import { createUploadRouter } from "./routes/upload.js";
import { createAnalyticsRouter } from "./routes/analytics.js";
import { createNotificationsRouter } from "./routes/notifications.js";
import journeyRoutes from "./routes/journey.js";
import aiRoutes from "./routes/ai.js";
import aiAdvancedRoutes from "./routes/ai-advanced.js";
import aiSettingsRoutes from "./routes/ai-settings.js";
import pricingRoutes from "./routes/pricing.js";
import metadataRoutes from "./routes/metadata.js";
import earlyAccessRoutes from "./routes/early-access.js";
import partnersRoutes from "./routes/partners.js";
import blogRouter from "./routes/blog.js";
import aiMonitorRouter from "./routes/ai-monitor.js";
import aiLearningsRouter from "./routes/ai-learnings.js";
import cronRouter from "./routes/cron.js";
import fishPatientsRouter from "./routes/fish-patients.js";
import aiBoardRouter from "./routes/ai-board.js";
import simulationRouter from "./routes/simulation.js";
import miroFishRouter from "./routes/mirofish.js";
import capiRouter from "./routes/capi.js";
import { createAdminInvoicesRouter } from "./routes/admin-invoices.js";
import { createAccountingRouter } from "./routes/accounting.js";
import { createExpensesRouter } from "./routes/expenses.js";
import { createInvoiceRouter } from "./routes/invoice.js";
import { createFinanceAuditRouter } from "./routes/finance-audit.js";
import { createMcpRouter } from "./routes/mcp.js";
import { createOAuthRouter } from "./routes/oauth.js";
import { storage } from "./storage/index.js";

// Helper for session type extension if needed
declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: express.Application,
): Promise<Server> {

  // Public settings endpoint — no auth, used by checkout to display shipping fee
  app.get("/api/settings/shipping", async (_req, res) => {
    try {
      const shippingFee = await storage.getSetting("shipping_fee");
      res.json({
        shippingFee: Number(shippingFee ?? 5000),
      });
    } catch {
      res.json({ shippingFee: 5000 });
    }
  });

  // API Routes
  app.use("/api/fish", createFishRouter(storage));
  app.use("/api/products", createProductRouter());
  app.use("/api/orders", createOrderRouter());
  app.use("/api/admin", createAdminRouter());
  app.use("/api/admin/security", createSecurityRouter());
  app.use("/api/admin/analytics", createAnalyticsRouter());
  app.use("/api/analytics", createAnalyticsRouter());
  app.use("/api/notifications", createNotificationsRouter());
  app.use("/api/gallery", createGalleryRouter());
  app.use("/api/referral", createReferralRouter());
  app.use("/api/loyalty", createLoyaltyRouter());

  // System routes (sitemap, robots, health) - mount at root for correct paths
  const systemRouter = createSystemRouter();
  app.use("/api/system", systemRouter);
  app.use("/", systemRouter);

  // User/Auth routes are tricky because they have mix of /api/register and /api/user
  // createUserRouter should likely be mounted at /api
  app.use("/api", createUserRouter());
  app.use("/api", createReviewsRouter());
  app.use("/api/cart", createCartRouter());
  app.use("/api/favorites", createFavoritesRouter());
  app.use("/api/coupons", createCouponRouter());
  app.use("/api/birthday", createBirthdayRouter());
  app.use("/api/newsletter", createNewsletterRouter(storage));
  app.use("/api/upload", createUploadRouter());

  // Journey wizard routes
  app.use(journeyRoutes);

  // AI routes (chat, journey recommendations)
  app.use("/api/ai", aiRoutes);

  // AI settings routes (agent management)
  app.use("/api/ai", aiSettingsRoutes);

  // Advanced AI routes (Visual AI, Sentiment, Predictive, etc.)
  app.use("/api/ai-advanced", aiAdvancedRoutes);
  app.use("/api/admin/ai-monitor", aiMonitorRouter);
  app.use("/api/admin/ai-learnings", aiLearningsRouter);

  // Pricing AI routes
  app.use("/api/pricing", pricingRoutes);

  // Metadata routes (categories, brands, specs)
  app.use("/api/metadata", metadataRoutes);

  // Early Access Landing Page routes
  app.use("/api/early-access", earlyAccessRoutes);

  // Field Sales Partners Program routes (برنامج شركاء المبيعات الميدانيين)
  app.use("/api/partners", partnersRoutes);

  // Blog routes
  app.use("/api/blog", blogRouter);

  // Social media analytics + comment automation routes removed from the product
  // (unused marketing automation). Service modules retained for any internal use.


  // Cron job routes (Vercel Cron calls these endpoints)
  app.use("/api/cron", cronRouter);

  // Fish Patient Records (سجل الأسماك والتاريخ الطبي)
  app.use("/api/fish-patients", fishPatientsRouter);

  // AI Consultation Board (مجلس الإدارة الذكي)
  app.use("/api/ai-board", aiBoardRouter);

  // MiroFish Quick Simulation (Groq parallel agents — no Docker needed)
  app.use("/api/simulation", simulationRouter);

  // MiroFish Deep Simulation (full OASIS multi-agent pipeline)
  app.use("/api/mirofish", miroFishRouter);

  // Meta Conversions API (server-side event forwarding to Facebook)
  app.use("/api/capi", capiRouter);

  // Manual Invoices (WhatsApp orders)
  app.use("/api/admin/invoices", createAdminInvoicesRouter());
  app.use("/api/admin/accounting", createAccountingRouter());
  app.use("/api/admin/expenses", createExpensesRouter());
  app.use("/api/invoice", createInvoiceRouter());
  app.use("/api/admin/finance", createFinanceAuditRouter());

  // OAuth 2.1 Authorization Server + Well-Known discovery endpoints
  // Must be mounted at root (/) so /.well-known/... works at domain root
  app.use("/", createOAuthRouter());

  // AQUAVO MCP — remote AI access endpoint (OAuth JWT or static Bearer token)
  app.use("/api/mcp", createMcpRouter());

  // Error handling middleware
  app.use("/api", (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("API Error:", err);
    const status = err.status || 500;
    const message = err.message || "Internal server error";

    if (err.name === "ZodError") {
      res.status(400).json({
        message: "Validation error",
        errors: err.errors
      });
      return;
    }

    res.status(status).json({ message });
  });

  app.use("/api", (_req: express.Request, res: express.Response) => {
    res.status(404).json({ message: "Not Found" });
  });

  return httpServer;
}
