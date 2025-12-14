import { Router } from "express";
import type { IStorage } from "../storage/index.js";
import { freshwaterFish } from "../../shared/initial-fish-data.js";

export function createFishRouter(storage: IStorage) {
  const router = Router();

  /**
   * GET /api/fish
   * Get all fish species with fallback to static data
   */
  router.get("/", async (_req, res, next) => {
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
  router.get("/:id", async (req, res, next) => {
    try {
      const { id } = req.params;
      let fish = await storage.getFishSpeciesById(id);

      // Fallback to static data if not found in database
      if (!fish) {
        fish = freshwaterFish.find((f: any) => f.id === id) as any;
      }

      if (!fish) {
        return res.status(404).json({ message: "Fish species not found" });
      }

      res.json(fish);
    } catch (err) {
      console.error("Error fetching fish species:", err);
      // Final fallback
      const fish = freshwaterFish.find((f: any) => f.id === req.params.id);
      if (fish) {
        return res.json(fish);
      }
      next(err);
    }
  });

  router.post("/breeding-plan/email", async (req, res) => {
    try {
      const { email, speciesId, inputData, timeline } = req.body;

      // Import sendEmail dynamically to ensure it's available
      const { sendEmail } = await import("../utils/email.js");

      const html = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0fdf4; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 20px; }
                .title { color: #064e3b; font-size: 24px; font-weight: bold; }
                .info-box { background: #ecfdf5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                .timeline-item { border-right: 3px solid #10b981; padding-right: 15px; margin-bottom: 15px; }
                .date { color: #059669; font-weight: bold; font-size: 14px; }
                .event { font-weight: bold; font-size: 16px; margin: 5px 0; }
                .desc { color: #6b7280; font-size: 14px; }
                .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #9ca3af; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="title">خطة التكاثر 🐟</div>
                    <p>تم إنشاؤها عبر Fish Web</p>
                </div>

                <div class="info-box">
                    <p><strong>تاريخ البدء:</strong> ${inputData.startDate}</p>
                    <p><strong>عدد الأزواج:</strong> ${inputData.pairs}</p>
                    <p><strong>ظروف الماء:</strong> ${inputData.temp}°C | pH ${inputData.ph}</p>
                </div>

                <h3>الجدول الزمني:</h3>
                
                ${timeline.map((t: any) => `
                    <div class="timeline-item">
                        <div class="date">${new Date(t.date).toLocaleDateString('ar-IQ')}</div>
                        <div class="event">${t.eventAr}</div>
                        <div class="desc">${t.description}</div>
                    </div>
                `).join('')}

                <div class="footer">
                    <p>نتمنى لك مشروع تكاثر ناجح!</p>
                </div>
            </div>
        </body>
        </html>
        `;

      await sendEmail({
        to: email,
        subject: `خطة التكاثر الخاصة بك من Fish Web`,
        html: html
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Email error:", error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  return router;
}
