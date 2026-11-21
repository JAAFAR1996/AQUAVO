import type { Router as RouterType, Request, Response, NextFunction } from "express";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth, getSession } from "../middleware/auth.js";
import { createSharedRateLimitStore } from "../middleware/shared-rate-limit-store.js";
import { breedingPlanEmailInput, buildBreedingPlanEmail } from "../services/breeding-plan-email.js";

const breedingEmailIpLimiter = rateLimit({
  store: createSharedRateLimitStore("breeding-email-ip"),
  windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { message: "تم تجاوز عدد رسائل البريد المسموحة. حاول بعد ساعة." },
});
const breedingEmailUserLimiter = rateLimit({
  store: createSharedRateLimitStore("breeding-email-user"),
  windowMs: 60 * 60 * 1000, max: 3, standardHeaders: true, legacyHeaders: false,
  keyGenerator: req => getSession(req)?.userId || "unauthenticated",
  message: { message: "تم تجاوز عدد رسائل البريد المسموحة لحسابك. حاول بعد ساعة." },
});
import { createAccountEmailVerificationRouter } from "./account-email-verification.js";
import type { IStorage } from "../storage/index.js";
import { freshwaterFish } from "../../shared/initial-fish-data.js";

export function createFishRouter(storage: IStorage): RouterType {
  const router = Router();
  router.use("/breeding-plan/email/verification", createAccountEmailVerificationRouter());

  /**
   * GET /api/fish
   * Get all fish species with fallback to static data
   */
  router.get("/", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Try to get from database first
      let fish = await storage.getAllFishSpecies();

      // If database is empty, use fallback data
      if (!fish || fish.length === 0) {
        console.warn("⚠️ Database empty, using fallback fish data");
        fish = freshwaterFish as any[];
      }

      console.log(`✅ Fetched ${fish.length} fish species`);
      res.json(fish);
    } catch (err) {
      console.error("❌ Error fetching fish species:", err);
      // Fallback to static data if database fails
      console.log(`⚠️ Using fallback: ${freshwaterFish.length} fish species`);
      res.json(freshwaterFish);
    }
  });

  /**
   * GET /api/fish/:id
   * Get a specific fish species by ID
   */
  router.get("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      let fish = await storage.getFishSpeciesById(id);

      // Fallback to static data if not found in database
      if (!fish) {
        fish = freshwaterFish.find((f: any) => f.id === id) as any;
      }

      if (!fish) {
        res.status(404).json({ message: "Fish species not found" });
        return;
      }

      res.json(fish);
    } catch (err) {
      console.error("Error fetching fish species:", err);
      // Final fallback
      const fish = freshwaterFish.find((f: any) => f.id === req.params.id);
      if (fish) {
        res.json(fish);
        return;
      }
      next(err);
    }
  });

  router.post("/breeding-plan/email", requireAuth, breedingEmailIpLimiter, breedingEmailUserLimiter,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const data = breedingPlanEmailInput.parse(req.body);
        const userId = getSession(req)?.userId;
        const user = userId ? await storage.getUser(userId) : undefined;
        if (!user?.email || !user.emailVerified) {
          res.status(403).json({ message: "فعّل بريد حسابك حتى نرسل الخطة إلك" });
          return;
        }
        if (data.email && data.email.toLowerCase() !== user.email.trim().toLowerCase()) {
          res.status(403).json({ message: "نرسل الخطة إلى بريد حسابك المثبت فقط" });
          return;
        }
        const plan = buildBreedingPlanEmail(data);
        const { sendEmail } = await import("../utils/email.js");
        const sent = await sendEmail({ to: user.email, ...plan });
        if (!sent) {
          res.status(503).json({ message: "ما تم إرسال البريد. حاول بعد شوي أو نزّل الخطة PDF" });
          return;
        }
        res.json({ success: true });
      } catch (error) {
        next(error);
      }
    });

  return router;
}
