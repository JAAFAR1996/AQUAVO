/**
 * 🔍 Vision Agent — Stage 1 of the Diagnostic Pipeline
 * =====================================================
 * This agent ONLY describes what it sees in the image.
 * It NEVER diagnoses or suggests diseases.
 * 
 * Input: Image buffer + mimeType
 * Output: Structured visual description (VisionReport)
 */

import { geminiClient } from "../gemini-client.js";

export interface VisionReport {
  imageQuality: {
    score: number;         // 1-10
    feedback: string;
    canDiagnose: boolean;
  };
  species: {
    commonName: string;
    scientificName: string;
    family: string;
    waterType: string;
    confidence: number;    // 0-1
  };
  visualObservations: {
    bodyShape: string;
    colorDescription: string;
    colorChanges: string[];
    fins: string;
    eyes: string;
    gills: string;
    scales: string;
    bodySize: string;
    visibleParasites: string[];
    lesionsOrWounds: string[];
    behaviorIfVisible: string;
  };
  overallImpression: string;   // One paragraph summary
}

const VISION_PROMPT = `أنت "العين البصرية" — خبير تصوير بيطري متخصص في أسماك الزينة.

═══════════════════════════════════════════════════════
⚠️ قواعد صارمة لا يمكن كسرها:
═══════════════════════════════════════════════════════
1. 🚫 ممنوع تشخيص أي مرض — أنت لا تشخّص أبداً.
2. 🚫 ممنوع اقتراح أدوية أو علاجات.
3. 🚫 ممنوع استخدام كلمات مثل: "مريضة"، "مصابة"، "تعاني من"، "Dropsy"، "Ich"، "Fin Rot".
4. ✅ مهمتك الوحيدة: وصف ما تراه بصرياً بدقة شديدة كأنك كاميرا طبية.
5. ✅ صِف الألوان، الأشكال، الملمس، الحجم، أي انحرافات عن الطبيعي.
6. ✅ إذا رأيت بقع بيضاء، قل "بقع بيضاء دائرية قطرها ~1mm على الزعنفة الذيلية" — لا تقل "Ich".
7. ✅ إذا رأيت انتفاخ، قل "انتفاخ في منطقة البطن بنسبة ~30% أكبر من الطبيعي" — لا تقل "Dropsy".

═══════════════════════════════════════════════════════
📋 ما يجب أن تصفه:
═══════════════════════════════════════════════════════
1. جودة الصورة (هل واضحة بما يكفي؟ إضاءة؟)
2. تحديد النوع (species) — الاسم الشائع والعلمي والعائلة
3. شكل الجسم العام
4. الألوان (طبيعية أم متغيرة؟ أين التغير؟)
5. الزعانف (سليمة؟ متآكلة الحواف؟ مضمومة؟ طولها؟)
6. العيون (حجمها طبيعي؟ بارزة؟ غائمة؟)
7. الخياشيم (لونها؟ مفتوحة؟ متورمة؟)
8. القشور (مسطحة؟ منتفخة؟ مفقودة؟)
9. حجم الجسم والبطن (طبيعي؟ منتفخ؟ هزيل؟)
10. طفيليات مرئية (أي شيء ملتصق بالجسم؟)
11. جروح أو تقرحات مرئية
12. السلوك إذا كان ظاهراً (وضعية السباحة)

أجب بصيغة JSON فقط (بدون أي نص قبله أو بعده):
{
  "imageQuality": {
    "score": 8,
    "feedback": "ملاحظات على الصورة",
    "canDiagnose": true
  },
  "species": {
    "commonName": "الاسم الشائع",
    "scientificName": "الاسم العلمي",
    "family": "العائلة",
    "waterType": "عذبة/مالحة",
    "confidence": 0.9
  },
  "visualObservations": {
    "bodyShape": "وصف شكل الجسم",
    "colorDescription": "وصف اللون العام",
    "colorChanges": ["تغير لوني 1", "تغير لوني 2"],
    "fins": "وصف حالة الزعانف",
    "eyes": "وصف العيون",
    "gills": "وصف الخياشيم",
    "scales": "وصف القشور",
    "bodySize": "وصف حجم الجسم/البطن",
    "visibleParasites": [],
    "lesionsOrWounds": [],
    "behaviorIfVisible": "وصف السلوك إن ظاهر"
  },
  "overallImpression": "ملخص بصري شامل بفقرة واحدة"
}`;

export class VisionAgent {
  /**
   * Analyze image and return pure visual description — NO diagnosis
   */
  async analyze(base64: string, mimeType: string): Promise<VisionReport> {
    const text = await geminiClient.executeWithFallback(async (client) => {
      const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent([
        VISION_PROMPT,
        {
          inlineData: {
            data: base64,
            mimeType,
          },
        },
      ]);
      const responseText = result.response.text();
      if (!responseText) throw new Error("Empty Vision Agent response");
      return responseText;
    });

    return this.parseResponse(text);
  }

  private parseResponse(text: string): VisionReport {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          imageQuality: parsed.imageQuality || { score: 5, feedback: "غير محدد", canDiagnose: true },
          species: parsed.species || { commonName: "غير محدد", scientificName: "Unknown", family: "Unknown", waterType: "غير محدد", confidence: 0.5 },
          visualObservations: {
            bodyShape: parsed.visualObservations?.bodyShape || "غير محدد",
            colorDescription: parsed.visualObservations?.colorDescription || "غير محدد",
            colorChanges: parsed.visualObservations?.colorChanges || [],
            fins: parsed.visualObservations?.fins || "غير محدد",
            eyes: parsed.visualObservations?.eyes || "غير محدد",
            gills: parsed.visualObservations?.gills || "غير محدد",
            scales: parsed.visualObservations?.scales || "غير محدد",
            bodySize: parsed.visualObservations?.bodySize || "غير محدد",
            visibleParasites: parsed.visualObservations?.visibleParasites || [],
            lesionsOrWounds: parsed.visualObservations?.lesionsOrWounds || [],
            behaviorIfVisible: parsed.visualObservations?.behaviorIfVisible || "غير ظاهر",
          },
          overallImpression: parsed.overallImpression || "غير محدد",
        };
      }
      throw new Error("No JSON found in Vision Agent response");
    } catch (error) {
      console.error("[VisionAgent] Parse error:", error);
      return {
        imageQuality: { score: 3, feedback: "تعذر تحليل الصورة بشكل كامل", canDiagnose: false },
        species: { commonName: "غير محدد", scientificName: "Unknown", family: "Unknown", waterType: "غير محدد", confidence: 0.3 },
        visualObservations: {
          bodyShape: "غير محدد",
          colorDescription: "غير محدد",
          colorChanges: [],
          fins: "غير محدد",
          eyes: "غير محدد",
          gills: "غير محدد",
          scales: "غير محدد",
          bodySize: "غير محدد",
          visibleParasites: [],
          lesionsOrWounds: [],
          behaviorIfVisible: "غير ظاهر",
        },
        overallImpression: "تعذر تحليل الصورة",
      };
    }
  }
}

export const visionAgent = new VisionAgent();
