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
      const { email, speciesId, speciesData, inputData, timeline, yearlyProduction } = req.body;

      // Import sendEmail dynamically to ensure it's available
      const { sendEmail } = await import("../utils/email.js");

      // Helper functions for translations
      const getMethodArabic = (method: string) => {
        switch (method) {
          case 'live-bearer': return 'ولّاد';
          case 'egg-layer': return 'بيّاض';
          case 'egg-clutch': return 'كتلة بيض';
          case 'bubble-nest': return 'عش فقاعات';
          case 'mouth-brooder': return 'حاضن فموي';
          default: return method;
        }
      };

      const getDifficultyArabic = (difficulty: string) => {
        switch (difficulty) {
          case 'easy': return 'سهل';
          case 'moderate': return 'متوسط';
          case 'difficult': return 'صعب';
          default: return difficulty;
        }
      };

      const getTypeArabic = (type: string) => {
        switch (type) {
          case 'fish': return 'سمكة';
          case 'snail': return 'حلزون';
          case 'shrimp': return 'روبيان';
          default: return type;
        }
      };

      const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
          case 'easy': return '#22c55e';
          case 'moderate': return '#eab308';
          case 'difficult': return '#ef4444';
          default: return '#6b7280';
        }
      };

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
                .species-name { color: #059669; font-size: 20px; margin: 10px 0; }
                .info-box { background: #ecfdf5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                .info-item { background: #f9fafb; padding: 10px; border-radius: 6px; }
                .info-label { color: #6b7280; font-size: 12px; margin-bottom: 4px; }
                .info-value { font-weight: bold; color: #1f2937; }
                .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: bold; }
                .timeline-item { border-right: 3px solid #10b981; padding-right: 15px; margin-bottom: 15px; }
                .date { color: #059669; font-weight: bold; font-size: 14px; }
                .event { font-weight: bold; font-size: 16px; margin: 5px 0; }
                .desc { color: #6b7280; font-size: 14px; }
                .production-box { background: #fef3c7; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
                .production-number { font-size: 32px; font-weight: bold; color: #92400e; }
                .section-title { color: #059669; font-size: 18px; font-weight: bold; margin: 20px 0 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
                .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="title">خطة التكاثر 🐟</div>
                    <p>تم إنشاؤها عبر AQUAVO</p>
                </div>

                ${speciesData ? `
                <!-- معلومات النوع -->
                <div class="info-box">
                    <div class="species-name">${speciesData.arabicName} (${speciesData.name})</div>
                    <div style="margin-bottom: 10px;">
                        <span class="badge" style="background: #dbeafe; color: #1e40af;">${getTypeArabic(speciesData.type)}</span>
                        <span class="badge" style="background: #f3e8ff; color: #7c3aed;">${getMethodArabic(speciesData.method)}</span>
                        <span class="badge" style="background: ${getDifficultyColor(speciesData.difficulty)}20; color: ${getDifficultyColor(speciesData.difficulty)};">${getDifficultyArabic(speciesData.difficulty)}</span>
                    </div>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">🌡️ الحرارة المثالية</div>
                            <div class="info-value">${speciesData.optimalTemp?.min || '?'} - ${speciesData.optimalTemp?.max || '?'} °C</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">💧 الرقم الهيدروجيني</div>
                            <div class="info-value">${speciesData.optimalPH?.min || '?'} - ${speciesData.optimalPH?.max || '?'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">🐠 أقل حجم حوض</div>
                            <div class="info-value">${speciesData.minTankSize || '?'} لتر</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">👶 صغار لكل دورة</div>
                            <div class="info-value">${speciesData.avgFryCount?.min || '?'} - ${speciesData.avgFryCount?.max || '?'}</div>
                        </div>
                    </div>
                </div>
                ` : ''}

                <!-- مدخلات المستخدم -->
                <div class="section-title">📝 مدخلاتك</div>
                <div class="info-box">
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">📅 تاريخ البدء</div>
                            <div class="info-value">${inputData.startDate}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">💑 عدد الأزواج</div>
                            <div class="info-value">${inputData.pairs}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">🌡️ الحرارة الحالية</div>
                            <div class="info-value">${inputData.temp}°C</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">💧 pH الحالي</div>
                            <div class="info-value">${inputData.ph}</div>
                        </div>
                    </div>
                </div>

                ${yearlyProduction ? `
                <!-- الإنتاج المتوقع -->
                <div class="production-box">
                    <div style="color: #92400e; margin-bottom: 5px;">📈 الإنتاج السنوي المتوقع</div>
                    <div class="production-number">~${yearlyProduction.toLocaleString()}</div>
                    <div style="color: #a16207; font-size: 14px;">صغير / سنة</div>
                </div>
                ` : ''}

                <!-- الجدول الزمني -->
                <div class="section-title">📆 الجدول الزمني</div>
                
                ${timeline.map((t: any) => `
                    <div class="timeline-item">
                        <div class="date">${new Date(t.date).toLocaleDateString('ar-IQ')}</div>
                        <div class="event">${t.eventAr}</div>
                        <div class="desc">${t.description}</div>
                    </div>
                `).join('')}

                <div class="footer">
                    <p>🐟 نتمنى لك مشروع تكاثر ناجح!</p>
                    <p>AQUAVO - عالم الأحياء المائية</p>
                </div>
            </div>
        </body>
        </html>
        `;

      await sendEmail({
        to: email,
        subject: `خطة التكاثر: ${speciesData?.arabicName || 'خطتك'} من AQUAVO`,
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
