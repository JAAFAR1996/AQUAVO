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
import { createNewsletterRouter } from "./routes/newsletter.js";
import { createReferralRouter } from "./routes/referral.js";
import journeyRoutes from "./routes/journey.js";
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

  // API Routes
  app.use("/api/fish", createFishRouter(storage));
  app.use("/api/products", createProductRouter());
  app.use("/api/orders", createOrderRouter());
  app.use("/api/admin", createAdminRouter()); // Contains /admin/orders, /admin/users etc.
  app.use("/api/gallery", createGalleryRouter());
  app.use("/api/system", createSystemRouter()); // For /api/system/seed
  app.use("/api/referral", createReferralRouter()); // Referral system

  // System root routes (sitemap, robots) - Handling mounting inside createSystemRouter
  // But wait, createSystemRouter defines /sitemap.xml.
  // If I mount it at /api/system, it becomes /api/system/sitemap.xml
  // I need to mount system router at root "/" for robots and sitemap!
  app.use("/", createSystemRouter());

  // User/Auth routes are tricky because they have mix of /api/register and /api/user
  // createUserRouter should likely be mounted at /api
  app.use("/api", createUserRouter());
  app.use("/api", createReviewsRouter());
  app.use("/api/cart", createCartRouter());
  app.use("/api/favorites", createFavoritesRouter());
  app.use("/api/coupons", createCouponRouter());
  app.use("/api/newsletter", createNewsletterRouter(storage));

  // Journey wizard routes
  app.use(journeyRoutes);

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
