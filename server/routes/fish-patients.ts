/**
 * 🐟 Fish Patient Records API Routes
 * ====================================
 * CRUD operations for user's fish and their medical records.
 * Enables tracking individual fish health over time.
 */

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { db } from "../db.js";
import { fishPatients, fishMedicalRecords } from "../../shared/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

// ── Helper: Get authenticated userId ──
function getUserId(req: Request): string | null {
  return (req as any).user?.id || (req as any).session?.userId || null;
}

/**
 * GET /api/fish-patients
 * List all fish for the current user
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: "يجب تسجيل الدخول" });
    }

    const patients = await db
      .select()
      .from(fishPatients)
      .where(eq(fishPatients.userId, userId))
      .orderBy(desc(fishPatients.createdAt));

    res.json({ success: true, data: patients });
  } catch (error) {
    console.error("[FishPatients] List error:", error);
    next(error);
  }
});

/**
 * POST /api/fish-patients
 * Register a new fish
 */
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: "يجب تسجيل الدخول" });
    }

    const { name, species, scientificName, age, gender, tankSize, waterType, photoUrl, notes } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: "اسم السمكة مطلوب" });
    }

    const [patient] = await db
      .insert(fishPatients)
      .values({
        userId,
        name: name.trim(),
        species: species || null,
        scientificName: scientificName || null,
        age: age || null,
        gender: gender || null,
        tankSize: tankSize || null,
        waterType: waterType || null,
        photoUrl: photoUrl || null,
        notes: notes || null,
      })
      .returning();

    res.status(201).json({ success: true, data: patient });
  } catch (error) {
    console.error("[FishPatients] Create error:", error);
    next(error);
  }
});

/**
 * GET /api/fish-patients/:id
 * Get a fish with its medical records
 */
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: "يجب تسجيل الدخول" });
    }

    const { id } = req.params;

    const [patient] = await db
      .select()
      .from(fishPatients)
      .where(and(eq(fishPatients.id, id), eq(fishPatients.userId, userId)));

    if (!patient) {
      return res.status(404).json({ success: false, error: "السمكة غير موجودة" });
    }

    const records = await db
      .select()
      .from(fishMedicalRecords)
      .where(eq(fishMedicalRecords.fishPatientId, id))
      .orderBy(desc(fishMedicalRecords.createdAt));

    res.json({ success: true, data: { patient, records } });
  } catch (error) {
    console.error("[FishPatients] Get error:", error);
    next(error);
  }
});

/**
 * PATCH /api/fish-patients/:id
 * Update fish info
 */
router.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: "يجب تسجيل الدخول" });
    }

    const { id } = req.params;
    const { name, species, age, gender, tankSize, waterType, notes, isActive } = req.body;

    const [updated] = await db
      .update(fishPatients)
      .set({
        ...(name !== undefined && { name }),
        ...(species !== undefined && { species }),
        ...(age !== undefined && { age }),
        ...(gender !== undefined && { gender }),
        ...(tankSize !== undefined && { tankSize }),
        ...(waterType !== undefined && { waterType }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      })
      .where(and(eq(fishPatients.id, id), eq(fishPatients.userId, userId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, error: "السمكة غير موجودة" });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("[FishPatients] Update error:", error);
    next(error);
  }
});

/**
 * DELETE /api/fish-patients/:id
 * Delete a fish (soft delete — sets isActive to false)
 */
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: "يجب تسجيل الدخول" });
    }

    const { id } = req.params;

    const [updated] = await db
      .update(fishPatients)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(fishPatients.id, id), eq(fishPatients.userId, userId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, error: "السمكة غير موجودة" });
    }

    res.json({ success: true, message: "تم حذف السمكة" });
  } catch (error) {
    console.error("[FishPatients] Delete error:", error);
    next(error);
  }
});

/**
 * POST /api/fish-patients/:id/records
 * Add a medical record for a fish
 */
router.post("/:id/records", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: "يجب تسجيل الدخول" });
    }

    const { id } = req.params;

    // Verify fish belongs to user
    const [patient] = await db
      .select()
      .from(fishPatients)
      .where(and(eq(fishPatients.id, id), eq(fishPatients.userId, userId)));

    if (!patient) {
      return res.status(404).json({ success: false, error: "السمكة غير موجودة" });
    }

    const { diagnosis, arabicDiagnosis, confidence, category, symptoms, treatment, waterParams, userNotes, outcome, followUpDate, imageUrl, analysisId } = req.body;

    const [record] = await db
      .insert(fishMedicalRecords)
      .values({
        fishPatientId: id,
        analysisId: analysisId || null,
        diagnosis: diagnosis || null,
        arabicDiagnosis: arabicDiagnosis || null,
        confidence: confidence ? String(confidence) : null,
        category: category || null,
        symptoms: symptoms || null,
        treatment: treatment || null,
        waterParams: waterParams || null,
        userNotes: userNotes || null,
        outcome: outcome || null,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        imageUrl: imageUrl || null,
      })
      .returning();

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    console.error("[FishPatients] Add record error:", error);
    next(error);
  }
});

/**
 * PATCH /api/fish-patients/:fishId/records/:recordId
 * Update a medical record (e.g., mark outcome, complete follow-up)
 */
router.patch("/:fishId/records/:recordId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: "يجب تسجيل الدخول" });
    }

    const { recordId } = req.params;
    const { outcome, userNotes, followUpCompleted } = req.body;

    const [updated] = await db
      .update(fishMedicalRecords)
      .set({
        ...(outcome !== undefined && { outcome }),
        ...(userNotes !== undefined && { userNotes }),
        ...(followUpCompleted !== undefined && { followUpCompleted }),
      })
      .where(eq(fishMedicalRecords.id, recordId))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, error: "السجل غير موجود" });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("[FishPatients] Update record error:", error);
    next(error);
  }
});

/**
 * GET /api/fish-patients/follow-ups/pending
 * Get all pending follow-ups for the current user
 */
router.get("/follow-ups/pending", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: "يجب تسجيل الدخول" });
    }

    const result = await db.execute(sql`
      SELECT 
        fmr.id as record_id,
        fmr.diagnosis,
        fmr.arabic_diagnosis,
        fmr.follow_up_date,
        fmr.image_url,
        fmr.created_at as record_date,
        fp.id as fish_id,
        fp.name as fish_name,
        fp.species
      FROM fish_medical_records fmr
      JOIN fish_patients fp ON fmr.fish_patient_id = fp.id
      WHERE fp.user_id = ${userId}
        AND fmr.follow_up_date IS NOT NULL
        AND fmr.follow_up_completed = false
      ORDER BY fmr.follow_up_date ASC
      LIMIT 20
    `);

    const now = new Date();
    const followUps = (result.rows as any[]).map(row => {
      const followUpDate = new Date(row.follow_up_date);
      const diffMs = followUpDate.getTime() - now.getTime();
      const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      return {
        recordId: row.record_id,
        fishId: row.fish_id,
        fishName: row.fish_name,
        species: row.species,
        diagnosis: row.arabic_diagnosis || row.diagnosis || "فحص عام",
        followUpDate: followUpDate.toISOString(),
        recordDate: row.record_date,
        daysUntil,
        isOverdue: daysUntil < 0,
        imageUrl: row.image_url,
      };
    });

    res.json({ success: true, data: followUps });
  } catch (error) {
    console.error("[FishPatients] Follow-ups error:", error);
    next(error);
  }
});

export default router;
