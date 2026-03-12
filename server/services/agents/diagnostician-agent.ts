/**
 * 🧠 Diagnostician Agent — Stage 2 of the Diagnostic Pipeline
 * ============================================================
 * This agent receives the VISUAL DESCRIPTION (not the image)
 * plus RAG knowledge + similar cases + user context,
 * then produces a differential diagnosis.
 *
 * Input: VisionReport + RAG context + user context + water params
 * Output: DiagnosisReport with ranked differential diagnoses
 */

import { geminiClient } from "../gemini-client.js";
import type { VisionReport } from "./vision-agent.js";

export interface WaterParams {
  temperature?: string;
  ph?: string;
  ammonia?: string;
  nitrite?: string;
  nitrate?: string;
}

export interface UserContext {
  species?: string;
  eating?: string;
  symptoms?: string;
}

export interface DifferentialItem {
  disease: string;
  arabicName: string;
  category: string;
  pathogen: string;
  probability: number;
  reasoning: string;
  matchingSymptoms: string[];
  ruledOutReason?: string;
}

export interface DiagnosisReport {
  think: string;
  primaryDiagnosis: {
    disease: string;
    arabicName: string;
    category: string;
    pathogen: string;
    confidence: number;
    reasoning: string;
  };
  differentialDiagnosis: DifferentialItem[];
  detectedSymptoms: string[];
  possibleCauses: string[];
  urgency: "low" | "medium" | "high" | "critical";
  isHealthy: boolean;
  followUpQuestions?: string[];
}

function buildDiagnosticianPrompt(
  visionReport: VisionReport,
  ragContext: string,
  similarCasesContext: string,
  userContext: UserContext,
  waterParams?: WaterParams
): string {
  let prompt = `أنت "المشخّص" — استشاري طب أسماك زينة مع خبرة 20 سنة.
مدرب على المراجع: Fish Disease (Noga)، Handbook of Fish Diseases (Untergasser)، Clinical Guide to Fish Medicine، Merck Vet Manual.

═══════════════════════════════════════════════════════
⚠️ قواعد صارمة:
═══════════════════════════════════════════════════════
1. أنت لا ترى الصورة — تعتمد فقط على الوصف البصري المقدم لك.
2. لا تخترع أعراض غير مذكورة في الوصف البصري.
3. إذا الأعراض غير كافية → confidence أقل من 0.5 + أضف أسئلة متابعة.
4. يجب وجود عرضين مترابطين على الأقل لتشخيص مرض.
5. بطن منتفخ وحده ≠ Dropsy. بقعة بيضاء واحدة ≠ Ich. زعنفة ممزقة ≠ Fin Rot.
6. إذا المالك قال "تأكل ممتاز" وأنت تشك بمرض قاتل → خفض الثقة 30%.
7. إذا السمكة سليمة → isHealthy: true + confidence: 0.95.
8. 🤰 قاعدة الحمل (مهم جداً!):
   - إذا السمكة من الأنواع الولودة (Molly, Guppy, Platy, Swordtail) + بطن منتفخ متناسق + قشور مسطحة (بدون pine-coning) → الحمل أرجح من Dropsy
   - إذا يوجد Gravid Spot (بقعة داكنة قرب الزعنفة الشرجية) → الحمل مؤكد تقريباً (confidence 0.9+)
   - Dropsy يتطلب pine-coning (قشور منتفخة للخارج) — بدونه لا تشخص Dropsy

═══════════════════════════════════════════════════════
📊 معايرة الثقة:
═══════════════════════════════════════════════════════
• 90%+ = أعراض واضحة متعددة + تطابق كامل
• 70-89% = أعراض واضحة لكن تتشابه مع أكثر من مرض
• 50-69% = عرض واحد + باقي غير مؤكد
• أقل من 50% = لا تشخص! أضف أسئلة متابعة

═══════════════════════════════════════════════════════
📋 الوصف البصري من العين الطبية:
═══════════════════════════════════════════════════════
• نوع السمكة: ${visionReport.species.commonName} (${visionReport.species.scientificName})
• العائلة: ${visionReport.species.family} | المياه: ${visionReport.species.waterType}
• ثقة التعرف: ${(visionReport.species.confidence * 100).toFixed(0)}%

• شكل الجسم: ${visionReport.visualObservations.bodyShape}
• اللون: ${visionReport.visualObservations.colorDescription}
• تغيرات لونية: ${visionReport.visualObservations.colorChanges.join("، ") || "لا يوجد"}
• الزعانف: ${visionReport.visualObservations.fins}
• العيون: ${visionReport.visualObservations.eyes}
• الخياشيم: ${visionReport.visualObservations.gills}
• القشور: ${visionReport.visualObservations.scales}
• حجم الجسم/البطن: ${visionReport.visualObservations.bodySize}
• طفيليات مرئية: ${visionReport.visualObservations.visibleParasites.join("، ") || "لا يوجد"}
• جروح/تقرحات: ${visionReport.visualObservations.lesionsOrWounds.join("، ") || "لا يوجد"}
• السلوك: ${visionReport.visualObservations.behaviorIfVisible}
• الانطباع العام: ${visionReport.overallImpression}

• جودة الصورة: ${visionReport.imageQuality.score}/10 — ${visionReport.imageQuality.feedback}

• 🤰 مؤشرات الحمل:
  - شكل البطن: ${visionReport.pregnancyIndicators?.abdominalShape || "غير محدد"}
  - بقعة الحمل (Gravid Spot): ${visionReport.pregnancyIndicators?.gravidSpot ? "موجودة ✅" : "غير موجودة"}
  - نوع ولود (Livebearer): ${visionReport.pregnancyIndicators?.isLivebearer ? "نعم ✅" : "لا"}
  - سلوك يشير للحمل: ${visionReport.pregnancyIndicators?.behaviorSigns || "غير ظاهر"}
`;

  // Add user context
  if (userContext.species || userContext.eating || userContext.symptoms) {
    prompt += `\n═══════════════════════════════════════════════════════
👤 معلومات من المالك (ثق بكلامه أكثر من التخمين):
═══════════════════════════════════════════════════════\n`;
    if (userContext.species) prompt += `• النوع حسب المالك: ${userContext.species}\n`;
    if (userContext.eating) prompt += `• سلوك الأكل: ${userContext.eating}\n`;
    if (userContext.symptoms) prompt += `• الأعراض الملاحظة: ${userContext.symptoms}\n`;
  }

  // Add water params
  if (waterParams && (waterParams.ammonia || waterParams.ph || waterParams.temperature)) {
    prompt += `\n═══════════════════════════════════════════════════════
🧪 فحوصات الماء:
═══════════════════════════════════════════════════════\n`;
    if (waterParams.temperature) prompt += `• الحرارة: ${waterParams.temperature}\n`;
    if (waterParams.ph) prompt += `• pH: ${waterParams.ph}\n`;
    if (waterParams.ammonia) prompt += `• الأمونيا: ${waterParams.ammonia}\n`;
    if (waterParams.nitrite) prompt += `• النيتريت: ${waterParams.nitrite}\n`;
    if (waterParams.nitrate) prompt += `• النيترات: ${waterParams.nitrate}\n`;
  }

  // Add RAG
  if (ragContext) {
    prompt += `\n${ragContext}\n`;
  }

  // Add similar cases
  if (similarCasesContext) {
    prompt += `\n${similarCasesContext}\n`;
  }

  prompt += `
═══════════════════════════════════════════════════════
📋 أجب بصيغة JSON فقط:
═══════════════════════════════════════════════════════
{
  "think": "تفكيرك الداخلي: 1) ما الأعراض الحقيقية؟ 2) هل يوجد أكثر من عرض؟ 3) هل سلوك الأكل يتوافق؟ 4) ما التشخيص الأرجح؟",
  "primaryDiagnosis": {
    "disease": "اسم المرض بالإنجليزية أو No Disease Detected",
    "arabicName": "اسم المرض بالعربية أو سليمة - لا يوجد مرض",
    "category": "parasitic/bacterial/fungal/viral/environmental/nutritional/physical/healthy",
    "pathogen": "اسم المسبب العلمي أو N/A",
    "confidence": 0.85,
    "reasoning": "لماذا اخترت هذا التشخيص"
  },
  "differentialDiagnosis": [
    {
      "disease": "اسم المرض",
      "arabicName": "الاسم العربي",
      "category": "الفئة",
      "pathogen": "المسبب",
      "probability": 0.6,
      "reasoning": "لماذا",
      "matchingSymptoms": ["عرض 1"]
    }
  ],
  "detectedSymptoms": ["عرض 1 مفصل", "عرض 2 مفصل"],
  "possibleCauses": ["سبب 1", "سبب 2"],
  "urgency": "low/medium/high/critical",
  "isHealthy": false,
  "followUpQuestions": ["سؤال متابعة 1 إذا الثقة منخفضة"]
}`;

  return prompt;
}

export class DiagnosticianAgent {
  async diagnose(
    visionReport: VisionReport,
    ragContext: string,
    similarCasesContext: string,
    userContext: UserContext,
    waterParams?: WaterParams
  ): Promise<DiagnosisReport> {
    const prompt = buildDiagnosticianPrompt(
      visionReport,
      ragContext,
      similarCasesContext,
      userContext,
      waterParams
    );

    const text = await geminiClient.executeWithFallback(async (client) => {
      const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      if (!responseText) throw new Error("Empty Diagnostician response");
      return responseText;
    });

    return this.parseResponse(text);
  }

  private parseResponse(text: string): DiagnosisReport {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          think: parsed.think || "",
          primaryDiagnosis: {
            disease: parsed.primaryDiagnosis?.disease || "Unknown",
            arabicName: parsed.primaryDiagnosis?.arabicName || "غير محدد",
            category: parsed.primaryDiagnosis?.category || "unknown",
            pathogen: parsed.primaryDiagnosis?.pathogen || "N/A",
            confidence: parsed.primaryDiagnosis?.confidence || 0.5,
            reasoning: parsed.primaryDiagnosis?.reasoning || "",
          },
          differentialDiagnosis: parsed.differentialDiagnosis || [],
          detectedSymptoms: parsed.detectedSymptoms || [],
          possibleCauses: parsed.possibleCauses || [],
          urgency: parsed.urgency || "medium",
          isHealthy: parsed.isHealthy || false,
          followUpQuestions: parsed.followUpQuestions,
        };
      }
      throw new Error("No JSON in Diagnostician response");
    } catch (error) {
      console.error("[DiagnosticianAgent] Parse error:", error);
      return {
        think: "تعذر تحليل الاستجابة",
        primaryDiagnosis: {
          disease: "Analysis Error",
          arabicName: "خطأ في التحليل",
          category: "unknown",
          pathogen: "N/A",
          confidence: 0.3,
          reasoning: "تعذر تحليل استجابة الذكاء الاصطناعي",
        },
        differentialDiagnosis: [],
        detectedSymptoms: [],
        possibleCauses: [],
        urgency: "medium",
        isHealthy: false,
        followUpQuestions: ["يرجى إعادة المحاولة بصورة أوضح"],
      };
    }
  }
}

export const diagnosticianAgent = new DiagnosticianAgent();
