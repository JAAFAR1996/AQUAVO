/**
 * Partner Applications Routes — برنامج شركاء المبيعات الميدانيين
 *
 * Public submission endpoint (with honeypot, rate limiting, dedupe by phone,
 * server-side validation + auto-scoring) and admin-only management endpoints.
 *
 * IMPORTANT: Auto-scoring produces a SUGGESTION only. The final decision is
 * always the admin's (finalStatus). WhatsApp messages are never sent
 * automatically — the admin copies and sends them manually.
 */

import { Router, Request, Response } from "express";
import { getDb } from "../db.js";
import { partnerApplications, partnerApplicationStatuses } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";
import { z } from "zod";

const router = Router();

// Max 3 submissions per IP per hour
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, message: "تم تجاوز عدد المحاولات المسموح. جرب لاحقاً." },
  standardHeaders: true,
  legacyHeaders: false,
});

const IRAQI_PHONE_REGEX = /^07[3-9]\d{8}$/;

function normalizePhone(phone: string): string {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("964")) digits = "0" + digits.slice(3);
  if (digits && !digits.startsWith("0")) digits = "0" + digits;
  return digits;
}

function isValidIraqiPhone(phone: string): boolean {
  return IRAQI_PHONE_REGEX.test(phone.replace(/\D/g, ""));
}

// Limit free-text length to prevent abuse / oversized payloads
const text = (max = 2000) => z.string().trim().max(max).optional().or(z.literal(""));
const yesNo = z.enum(["yes", "no"]).optional();

// Public submission schema. Section 8 consents are required-true to submit.
const submitSchema = z.object({
  // honeypot — should be empty; validated in handler (bots that fill it get a fake success)
  website: z.string().max(200).optional(),

  // Section 1 — basic terms (yes/no)
  agreeCommissionOnly: z.boolean(),
  agreeCommissionAfterReceipt: z.boolean(),
  agreeNoMoneyWithoutApproval: z.boolean(),
  agreeNoPriceChange: z.boolean(),
  agreeNoTreatment: z.boolean(),

  // Section 2 — basic info
  fullName: z.string().trim().min(3, "الاسم الثلاثي مطلوب").max(255),
  age: z.coerce.number().int().min(10).max(99),
  gender: z.enum(["male", "female"]),
  governorate: z.string().trim().min(1, "المحافظة مطلوبة").max(64),
  area: z.string().trim().min(1, "المنطقة مطلوبة").max(128),
  phone: z.string().trim().min(10).max(20),
  whatsapp: z.string().trim().max(20).optional().or(z.literal("")),
  socialLink: text(500),

  // Section 3 — field readiness
  fieldReady: yesNo,
  weeklyHours: text(64),
  transport: text(64),
  weeklyVisits: text(64),
  firstWeekPlaces: text(1500),

  // Section 4 — experience
  salesExperience: yesNo,
  soldBefore: text(),
  workedCommission: yesNo,
  relationshipsDetails: text(),
  aquariumKnowledge: text(),

  // Section 5 — commitment test (free text)
  testDiscount: text(),
  testCash: text(),
  testTreatment: text(),
  testMarkup: text(),
  testMistake: text(),

  // Section 6 — selling test (free text)
  sellWhyAquavo: text(),
  sellNewTank: text(),
  sellShopMessage: text(),
  sellFirstThreeOrders: text(),

  // Section 7 — WhatsApp verification
  agreeWhatsappEval: yesNo,
  agreeVoiceNote: yesNo,
  agreeIdLater: yesNo,
  bestContactTime: text(120),

  // Section 8 — final consents (all required true)
  consentCommissionNotJob: z.literal(true),
  consentCommissionAfterReceipt: z.literal(true),
  consentNoPriceChange: z.literal(true),
  consentNoMoneyWithoutApproval: z.literal(true),
  consentNoTreatment: z.literal(true),
  consentViolationStops: z.literal(true),
  consentDataUsage: z.literal(true),
  signature: z.string().trim().min(3, "التوقيع مطلوب").max(255),
});

type SubmitInput = z.infer<typeof submitSchema>;

/**
 * Auto-evaluation. Returns a SUGGESTION only; admin makes the final call.
 */
function evaluate(input: SubmitInput, phoneValid: boolean): {
  score: number;
  suggestedStatus: "accepted" | "medium" | "rejected";
  redFlags: string[];
} {
  const redFlags: string[] = [];

  if (!input.agreeCommissionOnly) redFlags.push("لا يقبل العمولة فقط بدون راتب");
  if (!input.agreeCommissionAfterReceipt) redFlags.push("لا يقبل العمولة بعد استلام الزبون");
  if (!input.agreeNoMoneyWithoutApproval) redFlags.push("يريد يستلم فلوس بدون موافقة");
  if (!input.agreeNoPriceChange) redFlags.push("يريد يغير الأسعار من نفسه");
  if (!input.agreeNoTreatment) redFlags.push("يريد يفتي بعلاج السمچ من نفسه");
  if (typeof input.age === "number" && input.age < 18) redFlags.push("العمر أقل من 18");
  if (!phoneValid) redFlags.push("رقم الهاتف غير واضح");

  // Positive signals → score
  let score = 40;
  if (input.fieldReady === "yes") score += 15;
  if (input.salesExperience === "yes") score += 12;
  if (input.workedCommission === "yes") score += 8;
  if ((input.relationshipsDetails || "").trim().length > 10) score += 8;
  if ((input.firstWeekPlaces || "").trim().length > 10) score += 8;
  if ((input.aquariumKnowledge || "").trim().length > 10) score += 5;
  if ((input.sellShopMessage || "").trim().length > 20) score += 4;
  if (input.transport && input.transport.trim().length > 0) score += 4;
  if (input.agreeWhatsappEval === "yes" && input.agreeVoiceNote === "yes") score += 6;

  // Each red flag is a hard penalty
  score -= redFlags.length * 25;
  score = Math.max(0, Math.min(100, score));

  let suggestedStatus: "accepted" | "medium" | "rejected";
  if (redFlags.length > 0) {
    // Hard agreement violations → rejected; a single soft flag → medium
    const hardFlags = redFlags.filter(f => !f.includes("رقم الهاتف"));
    suggestedStatus = hardFlags.length > 0 ? "rejected" : "medium";
  } else if (score >= 75) {
    suggestedStatus = "accepted";
  } else if (score >= 50) {
    suggestedStatus = "medium";
  } else {
    suggestedStatus = "rejected";
  }

  return { score, suggestedStatus, redFlags };
}

/**
 * POST /api/partners/apply  (public)
 */
router.post("/apply", submitLimiter, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(500).json({ success: false, message: "قاعدة البيانات غير متاحة حالياً" });
    }

    const parsed = submitSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.errors[0]?.message || "بيانات غير صحيحة",
      });
    }
    const input = parsed.data;

    // Honeypot — bots fill hidden fields
    if (input.website && input.website.length > 0) {
      // Pretend success to avoid signalling the trap
      return res.json({ success: true, message: "تم استلام طلبك بنجاح." });
    }

    const phone = normalizePhone(input.phone);
    const phoneValid = isValidIraqiPhone(phone);
    if (!phoneValid) {
      return res.status(400).json({
        success: false,
        message: "يرجى إدخال رقم عراقي صحيح (مثال: 07701234567)",
      });
    }
    const whatsapp = input.whatsapp ? normalizePhone(input.whatsapp) : null;

    // Prevent duplicate submissions by same phone
    const existing = await db.query.partnerApplications?.findFirst({
      where: (a, { eq }) => eq(a.phone, phone),
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "هذا الرقم قدّم طلب مسبقاً. راح نتواصل وياك عند الحاجة.",
      });
    }

    const { score, suggestedStatus, redFlags } = evaluate(input, phoneValid);

    // Everything beyond the indexed columns is stored in answers JSONB
    const answers: Record<string, unknown> = {
      terms: {
        agreeCommissionOnly: input.agreeCommissionOnly,
        agreeCommissionAfterReceipt: input.agreeCommissionAfterReceipt,
        agreeNoMoneyWithoutApproval: input.agreeNoMoneyWithoutApproval,
        agreeNoPriceChange: input.agreeNoPriceChange,
        agreeNoTreatment: input.agreeNoTreatment,
      },
      experience: {
        soldBefore: input.soldBefore || "",
        workedCommission: input.workedCommission || "",
      },
      commitmentTest: {
        testDiscount: input.testDiscount || "",
        testCash: input.testCash || "",
        testTreatment: input.testTreatment || "",
        testMarkup: input.testMarkup || "",
        testMistake: input.testMistake || "",
      },
      sellingTest: {
        sellWhyAquavo: input.sellWhyAquavo || "",
        sellNewTank: input.sellNewTank || "",
        sellShopMessage: input.sellShopMessage || "",
        sellFirstThreeOrders: input.sellFirstThreeOrders || "",
      },
      whatsappVerification: {
        agreeWhatsappEval: input.agreeWhatsappEval || "",
        agreeVoiceNote: input.agreeVoiceNote || "",
        agreeIdLater: input.agreeIdLater || "",
        bestContactTime: input.bestContactTime || "",
      },
      finalConsents: {
        consentCommissionNotJob: input.consentCommissionNotJob,
        consentCommissionAfterReceipt: input.consentCommissionAfterReceipt,
        consentNoPriceChange: input.consentNoPriceChange,
        consentNoMoneyWithoutApproval: input.consentNoMoneyWithoutApproval,
        consentNoTreatment: input.consentNoTreatment,
        consentViolationStops: input.consentViolationStops,
        consentDataUsage: input.consentDataUsage,
        signature: input.signature,
      },
    };

    await db.insert(partnerApplications).values({
      fullName: input.fullName,
      age: input.age,
      gender: input.gender,
      governorate: input.governorate,
      area: input.area,
      phone,
      whatsapp,
      socialLink: input.socialLink || null,
      fieldReady: input.fieldReady || null,
      weeklyHours: input.weeklyHours || null,
      transport: input.transport || null,
      weeklyVisits: input.weeklyVisits || null,
      firstWeekPlaces: input.firstWeekPlaces || null,
      salesExperience: input.salesExperience || null,
      relationshipsDetails: input.relationshipsDetails || null,
      aquariumKnowledge: input.aquariumKnowledge || null,
      answers,
      systemScore: score,
      suggestedStatus,
      redFlags,
      finalStatus: "new",
    });

    console.log(`[Partners] ✅ New application: ${input.fullName} (${phone}) score=${score} suggested=${suggestedStatus} flags=${redFlags.length}`);

    return res.json({
      success: true,
      message: "تم استلام طلبك بنجاح. راح تتم مراجعة إجاباتك، وإذا كنت مناسب للمرحلة الثانية راح نتواصل وياك عبر واتساب.",
    });
  } catch (error: any) {
    if (error?.code === "23505") {
      return res.status(409).json({ success: false, message: "هذا الرقم قدّم طلب مسبقاً." });
    }
    console.error("[Partners] Error on apply:", error);
    return res.status(500).json({ success: false, message: "صار خطأ، جرب مرة ثانية" });
  }
});

/**
 * GET /api/partners/applications  (admin)
 */
router.get("/applications", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    if (!db) return res.status(500).json({ success: false, message: "Database not available" });

    const apps = await db.query.partnerApplications?.findMany({
      orderBy: (a, { desc }) => [desc(a.createdAt)],
    });

    return res.json({ success: true, applications: apps || [], count: apps?.length || 0 });
  } catch (error) {
    console.error("[Partners] Error listing applications:", error);
    return res.status(500).json({ success: false, message: "Error fetching applications" });
  }
});

/**
 * GET /api/partners/applications/:id  (admin)
 */
router.get("/applications/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    if (!db) return res.status(500).json({ success: false, message: "Database not available" });

    const app = await db.query.partnerApplications?.findFirst({
      where: (a, { eq }) => eq(a.id, req.params.id),
    });
    if (!app) return res.status(404).json({ success: false, message: "الطلب غير موجود" });

    return res.json({ success: true, application: app });
  } catch (error) {
    console.error("[Partners] Error fetching application:", error);
    return res.status(500).json({ success: false, message: "Error fetching application" });
  }
});

/**
 * PATCH /api/partners/applications/:id  (admin)
 * Update final status and/or admin notes.
 */
const updateSchema = z.object({
  finalStatus: z.enum(partnerApplicationStatuses).optional(),
  adminNotes: z.string().trim().max(5000).optional(),
});

router.patch("/applications/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    if (!db) return res.status(500).json({ success: false, message: "Database not available" });

    const parsed = updateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "بيانات غير صحيحة" });
    }

    const existing = await db.query.partnerApplications?.findFirst({
      where: (a, { eq }) => eq(a.id, req.params.id),
    });
    if (!existing) return res.status(404).json({ success: false, message: "الطلب غير موجود" });

    const updates: Record<string, unknown> = {};
    if (parsed.data.finalStatus !== undefined) {
      updates.finalStatus = parsed.data.finalStatus;
      updates.reviewedAt = new Date();
      if (parsed.data.finalStatus === "contacted" && !existing.contactedAt) {
        updates.contactedAt = new Date();
      }
    }
    if (parsed.data.adminNotes !== undefined) {
      updates.adminNotes = parsed.data.adminNotes;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "لا يوجد تغيير" });
    }

    await db.update(partnerApplications).set(updates).where(eq(partnerApplications.id, req.params.id));

    const updated = await db.query.partnerApplications?.findFirst({
      where: (a, { eq }) => eq(a.id, req.params.id),
    });
    return res.json({ success: true, application: updated });
  } catch (error) {
    console.error("[Partners] Error updating application:", error);
    return res.status(500).json({ success: false, message: "Error updating application" });
  }
});

export default router;
