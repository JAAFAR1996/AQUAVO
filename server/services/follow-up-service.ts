/**
 * 📅 Follow-Up Notification Service
 * ===================================
 * Manages follow-up reminders for fish patients.
 * - Calculates next follow-up date based on diagnosis urgency
 * - Returns pending follow-ups for a user
 * - Marks follow-ups as completed
 */

import { db } from "../db.js";
import { sql } from "drizzle-orm";

export interface FollowUpReminder {
  id: string;
  fishName: string;
  species?: string;
  lastDiagnosis: string;
  followUpDate: string;
  daysUntil: number;
  isOverdue: boolean;
  imageUrl?: string;
  recordId: string;
}

export class FollowUpService {

  /**
   * Calculate follow-up date based on diagnosis urgency
   */
  static getFollowUpDays(urgency: string, disease: string): number {
    // Pregnancy: follow up in 7 days
    if (disease.toLowerCase().includes("pregnancy") || disease.includes("حمل")) {
      return 7;
    }
    switch (urgency) {
      case "critical": return 2;   // 2 days for critical cases
      case "high": return 5;       // 5 days
      case "medium": return 10;    // 10 days
      case "low": return 14;       // 2 weeks
      default: return 14;          // default 2 weeks
    }
  }

  /**
   * Get all pending follow-ups for a user
   */
  static async getPendingFollowUps(userId: string): Promise<FollowUpReminder[]> {
    if (!db) return [];

    try {
      const result = await db.execute(sql`
        SELECT 
          fmr.id as record_id,
          fmr.diagnosis,
          fmr.arabic_diagnosis,
          fmr.follow_up_date,
          fmr.follow_up_completed,
          fmr.image_url,
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

      if (!result.rows) return [];

      const now = new Date();
      return (result.rows as any[]).map(row => {
        const followUpDate = new Date(row.follow_up_date);
        const diffMs = followUpDate.getTime() - now.getTime();
        const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        return {
          id: row.fish_id,
          fishName: row.fish_name,
          species: row.species,
          lastDiagnosis: row.arabic_diagnosis || row.diagnosis || "فحص عام",
          followUpDate: followUpDate.toISOString(),
          daysUntil,
          isOverdue: daysUntil < 0,
          imageUrl: row.image_url,
          recordId: row.record_id,
        };
      });
    } catch (error) {
      console.error("[FollowUpService] Error fetching follow-ups:", error);
      return [];
    }
  }

  /**
   * Schedule a follow-up for a fish medical record
   */
  static async scheduleFollowUp(
    recordId: string,
    followUpDate: Date
  ): Promise<boolean> {
    if (!db) return false;

    try {
      await db.execute(sql`
        UPDATE fish_medical_records 
        SET follow_up_date = ${followUpDate.toISOString()}, follow_up_completed = false 
        WHERE id = ${recordId}
      `);
      return true;
    } catch (error) {
      console.error("[FollowUpService] Error scheduling follow-up:", error);
      return false;
    }
  }

  /**
   * Mark a follow-up as completed
   */
  static async completeFollowUp(recordId: string): Promise<boolean> {
    if (!db) return false;

    try {
      await db.execute(sql`
        UPDATE fish_medical_records 
        SET follow_up_completed = true 
        WHERE id = ${recordId}
      `);
      return true;
    } catch (error) {
      console.error("[FollowUpService] Error completing follow-up:", error);
      return false;
    }
  }

  /**
   * Get follow-up summary text for the diagnosis result
   */
  static getFollowUpMessage(urgency: string, disease: string): string {
    const days = this.getFollowUpDays(urgency, disease);
    
    if (disease.toLowerCase().includes("pregnancy") || disease.includes("حمل")) {
      return `📅 متابعة بعد ${days} أيام — لمراقبة تطور الحمل وصحة الأم. تأكد من توفير بيئة هادئة ومناسبة للولادة.`;
    }
    
    switch (urgency) {
      case "critical":
        return `🚨 متابعة عاجلة بعد ${days} يومين! — حالة حرجة تحتاج مراقبة مستمرة. إذا ساءت الحالة قبل ذلك، أعد التشخيص فوراً.`;
      case "high":
        return `⚠️ متابعة بعد ${days} أيام — لمراقبة استجابة السمكة للعلاج. التقط صورة جديدة عند المتابعة.`;
      case "medium":
        return `📋 متابعة بعد ${days} أيام — لتأكيد تحسن الحالة واستمرار العلاج.`;
      default:
        return `📅 متابعة بعد ${days} يوم — فحص روتيني للتأكد من الصحة العامة.`;
    }
  }
}
