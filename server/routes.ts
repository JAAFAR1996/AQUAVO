import type { Server } from "http";
import express from "express";
import { createProductRouter } from "./routes/products.js";
import { createOrderRouter } from "./routes/orders.js";
import { createUserRouter } from "./routes/users.js";
import { createGalleryRouter } from "./routes/gallery.js";
import { createAdminRouter } from "./routes/admin.js";
import { createAdminOrderArchiveRouter } from "./routes/admin-order-archive.js";
import { createAdminOrdersV2Router } from "./routes/admin-orders-v2.js";
import { createAccountingAutomaticReturnsV2Router } from "./routes/accounting-automatic-returns-v2.js";
import { createAccountingMonthlyPositionV2Router } from "./routes/accounting-monthly-position-v2.js";
import { createAccountingSetupV2Router } from "./routes/accounting-setup-v2.js";
import { createAccountingSmartCarrierV2Router } from "./routes/accounting-smart-carrier-v2.js";
import { createAccountingCarrierCorrectionV2Router } from "./routes/accounting-carrier-correction-v2.js";
import { createAccountingOperationsV2Router } from "./routes/accounting-operations-v2.js";
import { createAccountingV2Router } from "./routes/accounting-v2.js";
import { createInvoiceV2Router } from "./routes/invoice-v2.js";
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
import { createAccountingEvidenceUploadV2Router } from "./routes/accounting-evidence-upload-v2.js";
import { createUploadRouter } from "./routes/upload.js";
import { createAnalyticsRouter } from "./routes/analytics.js";
import { createAccurateAdminAnalyticsRouter } from "./routes/admin-analytics-accurate.js";
import { createNotificationsRouter } from "./routes/notifications.js";
import journeyRoutes from "./routes/journey.js";
import aiRoutes from "./routes/ai.js";
import aiAdvancedRoutes from "./routes/ai-advanced.js";
import aiSettingsRoutes from "./routes/ai-settings.js";
import pricingSafetyRoutes from "./routes/pricing-safety.js";
import pricingTruthOverrideRoutes from "./routes/pricing-truth-override.js";
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
import fulfillmentAdminRouter from "./routes/fulfillment-admin.js";
import packagingAdminRouter from "./routes/packaging-admin.js";
import preparationInventoryRouter from "./routes/preparation-inventory.js";
import cartonOnboardingRouter from "./routes/carton-onboarding.js";
import { createMcpRouter } from "./routes/mcp.js";
import { createOAuthRouter } from "./routes/oauth.js";
import { storage } from "./storage/index.js";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export async function registerRoutes(httpServer: Server, app: express.Application): Promise<Server> {
  app.get("/api/settings/shipping", async (_req, res) => {
    try {
      const shippingFee = await storage.getSetting("shipping_fee");
      res.json({ shippingFee: Number(shippingFee ?? 5000) });
    } catch {
      res.json({ shippingFee: 5000 });
    }
  });

  app.use("/api/fish", createFishRouter(storage));
  app.use("/api/products", createProductRouter());
  app.use("/api/orders", createOrderRouter());

  // Archive/list handling is deliberately isolated from Accounting V2 and
  // mounted first so the legacy hard-delete route can never receive an order
  // deletion request.
  app.use("/api/admin", createAdminOrderArchiveRouter());
  app.use("/api/admin", createAdminOrdersV2Router());
  app.use("/api/admin", createAdminRouter());
  app.use("/api/admin/security", createSecurityRouter());
  app.use("/api/admin/analytics", createAccurateAdminAnalyticsRouter());

  app.use("/api/analytics", async (req, res, next) => {
    const trackingEndpoints = new Set(["/track-visit", "/presence", "/heartbeat", "/presence/leave"]);
    if (!trackingEndpoints.has(req.path)) { next(); return; }
    const pagePath = typeof req.body?.pagePath === "string" ? req.body.pagePath : "";
    if (pagePath.startsWith("/admin")) { res.json({ ok: true, skipped: "admin" }); return; }
    const userId = req.session?.userId;
    if (userId) {
      try {
        const user = await storage.getUser(userId);
        if (user?.role === "admin") { res.json({ ok: true, skipped: "admin" }); return; }
      } catch {
        // Tracking must not break navigation.
      }
    }
    next();
  });
  app.use("/api/analytics", createAnalyticsRouter());
  app.use("/api/notifications", createNotificationsRouter());
  app.use("/api/gallery", createGalleryRouter());
  app.use("/api/referral", createReferralRouter());
  app.use("/api/loyalty", createLoyaltyRouter());

  app.use("/", createOAuthRouter());
  app.use("/api/mcp", createMcpRouter());
  const systemRouter = createSystemRouter();
  app.use("/api/system", systemRouter);
  app.use("/", systemRouter);

  app.use("/api", createUserRouter());
  app.use("/api", createReviewsRouter());
  app.use("/api/cart", createCartRouter());
  app.use("/api/favorites", createFavoritesRouter());
  app.use("/api/coupons", createCouponRouter());
  app.use("/api/birthday", createBirthdayRouter());
  app.use("/api/newsletter", createNewsletterRouter(storage));
  app.use("/api/upload", createAccountingEvidenceUploadV2Router());
  app.use("/api/upload", createUploadRouter());

  app.use(journeyRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/ai", aiSettingsRoutes);
  app.use("/api/ai-advanced", aiAdvancedRoutes);
  app.use("/api/admin/ai-monitor", aiMonitorRouter);
  app.use("/api/admin/ai-learnings", aiLearningsRouter);
  app.use("/api/pricing", pricingSafetyRoutes);
  app.use("/api/pricing", pricingTruthOverrideRoutes);
  app.use("/api/pricing", pricingRoutes);
  app.use("/api/metadata", metadataRoutes);
  app.use("/api/early-access", earlyAccessRoutes);
  app.use("/api/partners", partnersRoutes);
  app.use("/api/blog", blogRouter);
  app.use("/api/cron", cronRouter);
  app.use("/api/fish-patients", fishPatientsRouter);
  app.use("/api/ai-board", aiBoardRouter);
  app.use("/api/simulation", simulationRouter);
  app.use("/api/mirofish", miroFishRouter);
  app.use("/api/capi", capiRouter);

  app.use("/api/admin/invoices", createAdminInvoicesRouter());
  app.use("/api/admin/accounting", createAccountingAutomaticReturnsV2Router());
  app.use("/api/admin/accounting", createAccountingMonthlyPositionV2Router());
  app.use("/api/admin/accounting", createAccountingSetupV2Router());
  app.use("/api/admin/accounting", createAccountingSmartCarrierV2Router());
  app.use("/api/admin/accounting", createAccountingCarrierCorrectionV2Router());
  app.use("/api/admin/accounting", createAccountingOperationsV2Router());
  app.use("/api/admin/accounting", createAccountingV2Router());
  app.use("/api/admin/accounting", createAccountingRouter());
  app.use("/api/admin/expenses", createExpensesRouter());

  app.use("/api/invoice", createInvoiceV2Router());
  app.use("/api/invoice", createInvoiceRouter());
  app.use("/api/admin/finance", createFinanceAuditRouter());
  app.use("/api/admin/fulfillment", fulfillmentAdminRouter);
  app.use("/api/admin/packaging", cartonOnboardingRouter);
  app.use("/api/admin/packaging", preparationInventoryRouter);
  app.use("/api/admin/packaging", packagingAdminRouter);

  app.use("/api", (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("API Error:", err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal server error";
    if (err.name === "ZodError") { res.status(400).json({ message: "Validation error", errors: err.errors }); return; }
    res.status(status).json({ message });
  });
  app.use("/api", (_req: express.Request, res: express.Response) => {
    res.status(404).json({ message: "Not Found" });
  });
  return httpServer;
}
