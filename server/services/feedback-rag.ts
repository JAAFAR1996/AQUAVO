/**
 * 🧠 Feedback RAG Service — Learning from User Corrections
 * =========================================================
 * Queries past diagnosis corrections from the database
 * and injects them into the Diagnostician Agent's context.
 * 
 * This creates REAL learning — the AI sees past mistakes
 * and user corrections as part of its context.
 */

import { db } from "../db.js";

export class FeedbackRAG {

  /**
   * Get relevant past corrections for a species/symptoms combination.
   * Returns formatted context string for the Diagnostician Agent.
   */
  async getSimilarCasesContext(
    speciesName: string,
    detectedSymptoms: string[]
  ): Promise<string> {
    if (!db) {
      console.log("[FeedbackRAG] DB not available, skipping");
      return "";
    }

    try {
      // Query past cases with corrections for this species
      const cases = await db.execute(
        `SELECT 
          dc.disease, dc.arabic_name, dc.category, dc.symptoms, dc.outcome,
          df.is_correct, df.correct_disease, df.notes, df.treatment_worked
        FROM diagnosis_cases dc
        LEFT JOIN diagnosis_feedback df ON dc.analysis_id = df.analysis_id
        WHERE 
          (dc.species_name ILIKE $1 OR dc.species_name ILIKE $2)
          AND dc.created_at > NOW() - INTERVAL '90 days'
        ORDER BY dc.created_at DESC
        LIMIT 10`,
        [
          `%${speciesName}%`,
          `%${speciesName.split(' ')[0]}%`, // Match first word of species
        ]
      );

      if (!cases.rows || cases.rows.length === 0) {
        return "";
      }

      let context = `\n═══════════════════════════════════════════════════════
📊 حالات سابقة مشابهة (من قاعدة بيانات Dr. AQUAVO):
═══════════════════════════════════════════════════════\n`;

      const corrections: string[] = [];
      const confirmedCases: string[] = [];

      for (const row of cases.rows as any[]) {
        if (row.is_correct === false && row.correct_disease) {
          // This was a WRONG diagnosis that user corrected
          corrections.push(
            `⚠️ تصحيح سابق: شُخّصت سمكة ${speciesName} بـ "${row.disease}" لكن المالك صحّح إلى "${row.correct_disease}"` +
            (row.notes ? ` — ملاحظة: "${row.notes}"` : "")
          );
        } else if (row.is_correct === true) {
          // This was a CORRECT diagnosis
          confirmedCases.push(
            `✅ حالة مؤكدة: ${speciesName} شُخّصت بـ "${row.disease}" (${row.category}) — ${row.treatment_worked ? "العلاج نجح" : "النتيجة غير مؤكدة"}`
          );
        }
      }

      if (corrections.length > 0) {
        context += `\n🔴 تصحيحات مهمة (تجنب تكرار هذه الأخطاء!):\n`;
        corrections.forEach(c => { context += `${c}\n`; });
      }

      if (confirmedCases.length > 0) {
        context += `\n🟢 حالات مؤكدة سابقة:\n`;
        confirmedCases.slice(0, 5).forEach(c => { context += `${c}\n`; });
      }

      console.log(`[FeedbackRAG] Found ${corrections.length} corrections, ${confirmedCases.length} confirmed cases for ${speciesName}`);
      return context;

    } catch (error) {
      console.error("[FeedbackRAG] Query error:", error);
      return "";
    }
  }

  /**
   * Get the medical history for a specific fish patient.
   * Used when the user has registered their fish.
   */
  async getFishHistory(fishPatientId: string): Promise<string> {
    if (!db) return "";

    try {
      const records = await db.execute(
        `SELECT 
          diagnosis, arabic_diagnosis, confidence, category,
          symptoms, treatment, water_params, outcome,
          user_notes, created_at
        FROM fish_medical_records
        WHERE fish_patient_id = $1
        ORDER BY created_at DESC
        LIMIT 10`,
        [fishPatientId]
      );

      if (!records.rows || records.rows.length === 0) {
        return "";
      }

      let context = `\n═══════════════════════════════════════════════════════
📋 السجل الطبي السابق لهذه السمكة:
═══════════════════════════════════════════════════════\n`;

      for (const row of records.rows as any[]) {
        const date = new Date(row.created_at).toLocaleDateString('ar-IQ');
        context += `\n📅 ${date}: ${row.arabic_diagnosis || row.diagnosis || "فحص عام"}`;
        if (row.confidence) context += ` (ثقة: ${(parseFloat(row.confidence) * 100).toFixed(0)}%)`;
        if (row.outcome) context += ` — النتيجة: ${row.outcome}`;
        if (row.user_notes) context += `\n   ملاحظة المالك: "${row.user_notes}"`;
        context += `\n`;
      }

      console.log(`[FeedbackRAG] Found ${records.rows.length} medical records for fish ${fishPatientId}`);
      return context;

    } catch (error) {
      console.error("[FeedbackRAG] Fish history error:", error);
      return "";
    }
  }
}

export const feedbackRAG = new FeedbackRAG();
