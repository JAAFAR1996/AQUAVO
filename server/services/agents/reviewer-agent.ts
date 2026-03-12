/**
 * ⚖️ Reviewer Agent — Stage 3 of the Diagnostic Pipeline
 * ========================================================
 * This is the "critic" agent. It receives the diagnosis from
 * the Diagnostician and tries to BREAK it by checking:
 * 1. Anatomical exceptions (Balloon Molly ≠ Dropsy)
 * 2. Eating behavior vs diagnosis consistency
 * 3. Minimum symptom count rule
 * 
 * If validation fails → it forces a correction.
 * 
 * Input: DiagnosisReport + VisionReport + UserContext
 * Output: ReviewVerdict (approved or corrected diagnosis)
 */

import { geminiClient } from "../gemini-client.js";
import type { VisionReport } from "./vision-agent.js";
import type { DiagnosisReport, UserContext } from "./diagnostician-agent.js";

export interface ReviewVerdict {
  approved: boolean;
  originalDiagnosis: string;
  finalDiagnosis: {
    disease: string;
    arabicName: string;
    category: string;
    pathogen: string;
    confidence: number;
    reasoning: string;
  };
  corrections: string[];         // What the reviewer changed and why
  warnings: string[];            // Important cautions
  anatomicalExceptionTriggered: boolean;
  eatingBehaviorConflict: boolean;
  reviewNotes: string;
}

function buildReviewerPrompt(
  visionReport: VisionReport,
  diagnosisReport: DiagnosisReport,
  userContext: UserContext
): string {
  return `أنت "المراجع الناقد" — طبيب بيطري كبير متخصص في مراجعة التشخيصات.
مهمتك الوحيدة: فحص تشخيص زميلك والتأكد من دقته.

═══════════════════════════════════════════════════════
⚠️ قواعد المراجعة الإلزامية:
═══════════════════════════════════════════════════════

✅ فحص 1 — الاستثناءات التشريحية:
الأنواع التالية لها أشكال طبيعية تُخلط مع المرض:

── بطن منتفخ (ليس Dropsy!) ──
• Balloon Molly — بطن كروي 100% طبيعي
• Pearlscale Goldfish — كروي + قشور لؤلؤية بارزة = طبيعي
• Balloon Ram — جسم كروي وراثي
• Ranchu / Lionhead — بدون ظهرية + مكعبر = طبيعي
• Ryukin Goldfish — ظهر محدب عالي = طبيعي
• Oranda — wen على الرأس = طبيعي وليس ورم
• Parrot Cichlid — فم مغلق + جسم مشوه = جيني
• Flowerhorn — نتوء الرأس (kok) = طبيعي
• Pregnant Livebearers (Molly, Guppy, Platy, Swordtail, Endler) — بطن منتفخ + بقعة حمل = حمل!

── زعانف طويلة (ليس Fin Rot!) ──
• Betta (Halfmoon, Rosetail) — زعانف طويلة متدلية = طبيعي
• Fantail / Veiltail Goldfish — ذيل طويل مزدوج = طبيعي
• Guppy ذكر — ذيل كبير ملون = طبيعي

── بقع وألوان (ليس مرض!) ──
• Dalmatian Molly — نقط سوداء = لون وراثي
• Koi / Goldfish — بقع ملونة = طبيعي
• Oscar — بقع برتقالية = علامات النوع
• Flowerhorn — بقع سوداء = طبيعي

── سلوكيات (ليس مرض!) ──
• Betta, Gourami — يصعد للسطح = تنفس هوائي طبيعي
• Corydoras — يبتلع هواء = تنفس معوي طبيعي
• Loach — ينام على جنبه = طبيعي

✅ فحص 2 — سلوك الأكل:
• إذا المالك قال "تأكل ممتاز" + التشخيص مرض قاتل (Dropsy, Septicemia) → رفض!
• Dropsy = فشل كلوي = السمكة ترفض الأكل تماماً
• سمكة تأكل بشهية + تسبح بنشاط = احتمال المرض القاتل منخفض جداً

✅ فحص 3 — عدد الأعراض:
• يجب وجود عرضين مترابطين على الأقل لتشخيص مرض
• بطن منتفخ وحده ≠ Dropsy
• بقعة بيضاء واحدة ≠ Ich
• زعنفة ممزقة ≠ Fin Rot (قد تكون عضة)

═══════════════════════════════════════════════════════
📋 التشخيص المقدم للمراجعة:
═══════════════════════════════════════════════════════
• نوع السمكة: ${visionReport.species.commonName} (${visionReport.species.scientificName})
• التشخيص: ${diagnosisReport.primaryDiagnosis.disease} (${diagnosisReport.primaryDiagnosis.arabicName})
• الفئة: ${diagnosisReport.primaryDiagnosis.category}
• الثقة: ${(diagnosisReport.primaryDiagnosis.confidence * 100).toFixed(0)}%
• المنطق: ${diagnosisReport.primaryDiagnosis.reasoning}
• الأعراض المكتشفة: ${diagnosisReport.detectedSymptoms.join("، ")}
• السمكة سليمة؟: ${diagnosisReport.isHealthy ? "نعم" : "لا"}
${userContext.eating ? `• سلوك الأكل حسب المالك: ${userContext.eating}` : ""}
${userContext.species ? `• النوع حسب المالك: ${userContext.species}` : ""}

═══════════════════════════════════════════════════════
📋 أجب بصيغة JSON فقط:
═══════════════════════════════════════════════════════
{
  "approved": true,
  "originalDiagnosis": "التشخيص الأصلي",
  "finalDiagnosis": {
    "disease": "التشخيص النهائي (قد يكون نفسه أو مختلف)",
    "arabicName": "الاسم العربي",
    "category": "الفئة",
    "pathogen": "المسبب",
    "confidence": 0.85,
    "reasoning": "المنطق النهائي"
  },
  "corrections": ["تصحيح 1 إذا وجد"],
  "warnings": ["تحذير مهم"],
  "anatomicalExceptionTriggered": false,
  "eatingBehaviorConflict": false,
  "reviewNotes": "ملاحظات المراجع"
}`;
}

export class ReviewerAgent {
  async review(
    visionReport: VisionReport,
    diagnosisReport: DiagnosisReport,
    userContext: UserContext
  ): Promise<ReviewVerdict> {
    const prompt = buildReviewerPrompt(visionReport, diagnosisReport, userContext);

    const text = await geminiClient.executeWithFallback(async (client) => {
      const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      if (!responseText) throw new Error("Empty Reviewer response");
      return responseText;
    });

    return this.parseResponse(text, diagnosisReport);
  }

  private parseResponse(text: string, originalDiagnosis: DiagnosisReport): ReviewVerdict {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          approved: parsed.approved !== false,
          originalDiagnosis: originalDiagnosis.primaryDiagnosis.disease,
          finalDiagnosis: {
            disease: parsed.finalDiagnosis?.disease || originalDiagnosis.primaryDiagnosis.disease,
            arabicName: parsed.finalDiagnosis?.arabicName || originalDiagnosis.primaryDiagnosis.arabicName,
            category: parsed.finalDiagnosis?.category || originalDiagnosis.primaryDiagnosis.category,
            pathogen: parsed.finalDiagnosis?.pathogen || originalDiagnosis.primaryDiagnosis.pathogen,
            confidence: parsed.finalDiagnosis?.confidence || originalDiagnosis.primaryDiagnosis.confidence,
            reasoning: parsed.finalDiagnosis?.reasoning || originalDiagnosis.primaryDiagnosis.reasoning,
          },
          corrections: parsed.corrections || [],
          warnings: parsed.warnings || [],
          anatomicalExceptionTriggered: parsed.anatomicalExceptionTriggered || false,
          eatingBehaviorConflict: parsed.eatingBehaviorConflict || false,
          reviewNotes: parsed.reviewNotes || "",
        };
      }
      throw new Error("No JSON in Reviewer response");
    } catch (error) {
      console.error("[ReviewerAgent] Parse error:", error);
      // On parse failure, approve the original diagnosis as-is
      return {
        approved: true,
        originalDiagnosis: originalDiagnosis.primaryDiagnosis.disease,
        finalDiagnosis: originalDiagnosis.primaryDiagnosis,
        corrections: [],
        warnings: ["تعذر مراجعة التشخيص — تم اعتماد التشخيص الأصلي"],
        anatomicalExceptionTriggered: false,
        eatingBehaviorConflict: false,
        reviewNotes: "فشل في تحليل استجابة المراجع",
      };
    }
  }
}

export const reviewerAgent = new ReviewerAgent();
