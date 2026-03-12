/**
 * 💊 Treatment Agent — Stage 4 of the Diagnostic Pipeline
 * ========================================================
 * This agent receives the CONFIRMED diagnosis (after review)
 * and generates a detailed treatment plan with dosages,
 * timeline, medication warnings, quarantine protocol, and prognosis.
 *
 * Input: ReviewVerdict + VisionReport (for species-specific warnings)
 * Output: TreatmentPlan
 */

import { geminiClient } from "../gemini-client.js";
import type { VisionReport } from "./vision-agent.js";
import type { ReviewVerdict } from "./reviewer-agent.js";

export interface TreatmentTimeline {
  day: string;
  actions: string[];
}

export interface QuarantineProtocol {
  required: boolean;
  duration: string;
  tankSetup: string;
  steps: string[];
}

export interface Prognosis {
  recoveryChance: string;
  expectedDuration: string;
  signsOfImprovement: string[];
  signsOfDeterioration: string[];
  followUpDate: string;
}

export interface TreatmentPlan {
  treatmentSteps: string[];
  treatmentTimeline: TreatmentTimeline[];
  medicationWarnings: string[];
  quarantineProtocol: QuarantineProtocol;
  prevention: string[];
  prognosis: Prognosis;
  waterParameters: {
    temperature: string;
    ph: string;
    ammonia: string;
    nitrite: string;
    nitrate: string;
  };
}

function buildTreatmentPrompt(
  verdict: ReviewVerdict,
  visionReport: VisionReport
): string {
  return `أنت "طبيب العلاج" — متخصص في وضع خطط علاج أسماك الزينة.
مدرب على: Fish Disease (Noga)، Handbook of Fish Diseases (Untergasser)، Merck Vet Manual.

═══════════════════════════════════════════════════════
📋 التشخيص المؤكد (بعد المراجعة):
═══════════════════════════════════════════════════════
• المرض: ${verdict.finalDiagnosis.disease} (${verdict.finalDiagnosis.arabicName})
• الفئة: ${verdict.finalDiagnosis.category}
• المسبب: ${verdict.finalDiagnosis.pathogen}
• الثقة: ${(verdict.finalDiagnosis.confidence * 100).toFixed(0)}%
• نوع السمكة: ${visionReport.species.commonName} (${visionReport.species.scientificName})
• المياه: ${visionReport.species.waterType}

${verdict.corrections.length > 0 ? `• تصحيحات المراجع: ${verdict.corrections.join("، ")}` : ""}
${verdict.warnings.length > 0 ? `• تحذيرات المراجع: ${verdict.warnings.join("، ")}` : ""}

═══════════════════════════════════════════════════════
⚠️ تحذيرات أدوية مهمة (يجب مراعاتها):
═══════════════════════════════════════════════════════
• Copper (نحاس): ⛔ خطر على اللافقاريات + الكوري + البليكو + أسماك بدون قشور
• Malachite Green: ⛔ خطر على أسماك بدون قشور — نصف الجرعة
• Formalin: ⛔ يستهلك الأكسجين — تهوية ممتازة مطلوبة
• Metronidazole: ⛔ قد يؤثر على البكتيريا النافعة
• Erythromycin: ⛔ يقتل البكتيريا النافعة — راقب النيتروجين
• Potassium Permanganate: ⛔ سام بالجرعة الزائدة — لا تتجاوز 4 mg/L

═══════════════════════════════════════════════════════
📋 المطلوب منك:
═══════════════════════════════════════════════════════
1. خطوات العلاج بالترتيب مع اسم الدواء الدقيق والجرعة المحسوبة
2. جدول زمني يوم بيوم
3. تحذيرات خاصة بنوع السمكة (${visionReport.species.commonName})
4. بروتوكول الحجر الصحي
5. نصائح الوقاية المستقبلية
6. توقعات الشفاء
7. معلمات الماء المطلوبة

${verdict.finalDiagnosis.category === "healthy" ? "⚡ ملاحظة: السمكة سليمة — قدم نصائح وقائية عامة فقط بدون أدوية." : ""}

أجب بصيغة JSON فقط:
{
  "treatmentSteps": ["خطوة 1 مع الدواء والجرعة", "خطوة 2"],
  "treatmentTimeline": [
    {"day": "اليوم 1", "actions": ["فعل 1", "فعل 2"]},
    {"day": "اليوم 2-3", "actions": ["فعل 1"]},
    {"day": "اليوم 7", "actions": ["تقييم"]}
  ],
  "medicationWarnings": ["تحذير خاص بنوع السمكة"],
  "quarantineProtocol": {
    "required": true,
    "duration": "المدة بالأيام",
    "tankSetup": "إعداد حوض العزل",
    "steps": ["خطوة 1", "خطوة 2"]
  },
  "prevention": ["نصيحة وقاية 1", "نصيحة وقاية 2"],
  "prognosis": {
    "recoveryChance": "نسبة مئوية",
    "expectedDuration": "المدة المتوقعة",
    "signsOfImprovement": ["علامة تحسن 1"],
    "signsOfDeterioration": ["علامة تدهور 1"],
    "followUpDate": "متى إعادة التقييم"
  },
  "waterParameters": {
    "temperature": "الحرارة المطلوبة",
    "ph": "مستوى pH",
    "ammonia": "مستوى الأمونيا",
    "nitrite": "مستوى النيتريت",
    "nitrate": "مستوى النيترات"
  }
}`;
}

export class TreatmentAgent {
  async plan(
    verdict: ReviewVerdict,
    visionReport: VisionReport
  ): Promise<TreatmentPlan> {
    const prompt = buildTreatmentPrompt(verdict, visionReport);

    const text = await geminiClient.executeWithFallback(async (client) => {
      const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      if (!responseText) throw new Error("Empty Treatment Agent response");
      return responseText;
    });

    return this.parseResponse(text);
  }

  private parseResponse(text: string): TreatmentPlan {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          treatmentSteps: parsed.treatmentSteps || ["لا يوجد علاج محدد"],
          treatmentTimeline: parsed.treatmentTimeline || [],
          medicationWarnings: parsed.medicationWarnings || [],
          quarantineProtocol: parsed.quarantineProtocol || {
            required: false,
            duration: "غير مطلوب",
            tankSetup: "غير مطلوب",
            steps: [],
          },
          prevention: parsed.prevention || [],
          prognosis: parsed.prognosis || {
            recoveryChance: "غير محدد",
            expectedDuration: "غير محدد",
            signsOfImprovement: [],
            signsOfDeterioration: [],
            followUpDate: "غير محدد",
          },
          waterParameters: parsed.waterParameters || {
            temperature: "24-28°م",
            ph: "6.5-7.5",
            ammonia: "0 ppm",
            nitrite: "0 ppm",
            nitrate: "< 40 ppm",
          },
        };
      }
      throw new Error("No JSON in Treatment response");
    } catch (error) {
      console.error("[TreatmentAgent] Parse error:", error);
      return {
        treatmentSteps: ["تعذر إنشاء خطة العلاج — يرجى إعادة المحاولة"],
        treatmentTimeline: [],
        medicationWarnings: [],
        quarantineProtocol: { required: false, duration: "غير محدد", tankSetup: "غير محدد", steps: [] },
        prevention: ["الحفاظ على جودة الماء", "تغيير 25% من الماء أسبوعياً"],
        prognosis: {
          recoveryChance: "غير محدد",
          expectedDuration: "غير محدد",
          signsOfImprovement: [],
          signsOfDeterioration: [],
          followUpDate: "غير محدد",
        },
        waterParameters: {
          temperature: "24-28°م",
          ph: "6.5-7.5",
          ammonia: "0 ppm",
          nitrite: "0 ppm",
          nitrate: "< 40 ppm",
        },
      };
    }
  }
}

export const treatmentAgent = new TreatmentAgent();
