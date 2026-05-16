/**
 * 🏗️ Diagnostic Pipeline Orchestrator
 * ====================================
 * Coordinates the 4-agent pipeline + rule engine:
 * 
 *   Rule Engine Pre-Check (water params)
 *          ↓
 *   Stage 1: Vision Agent (image → visual description)
 *          ↓
 *   Stage 2: Diagnostician Agent (description → diagnosis)
 *          ↓
 *   Rule Engine Post-Check (anatomical exceptions)
 *          ↓
 *   Stage 3: Reviewer Agent (AI critic review)
 *          ↓
 *   Stage 4: Treatment Agent (confirmed diagnosis → treatment plan)
 *          ↓
 *   Combined Result
 */

import { visionAgent, type VisionReport } from "./agents/vision-agent.js";
import { diagnosticianAgent, type UserContext, type WaterParams, type DiagnosisReport } from "./agents/diagnostician-agent.js";
import { reviewerAgent, type ReviewVerdict } from "./agents/reviewer-agent.js";
import { treatmentAgent, type TreatmentPlan } from "./agents/treatment-agent.js";
import { ruleEngine, type RuleEngineAlert } from "./rule-engine.js";
import { vetRAG } from "./vet-rag.js";
import { feedbackRAG } from "./feedback-rag.js";
import { FollowUpService } from "./follow-up-service.js";

export interface PipelineResult {
  // Main diagnosis fields (backwards compatible with existing frontend)
  detected: string[];
  confidence: number;
  suggestions: string[];
  details: {
    // Species
    imageQuality: {
      score: number;
      feedback: string;
      canDiagnose: boolean;
    };
    speciesIdentification: {
      commonName: string;
      scientificName: string;
      family: string;
      waterType: string;
      confidence: number;
      knownVulnerabilities: string[];
    };
    // Diagnosis
    disease: string;
    arabicName: string;
    category: string;
    pathogen: string;
    symptoms: string[];
    causes: string[];
    diagnosis: string;
    differentialDiagnosis: Array<{
      disease: string;
      arabicName: string;
      probability: number;
      reasoning: string;
    }>;
    // Treatment
    treatment: string[];
    treatmentTimeline: Array<{ day: string; actions: string[] }>;
    medicationWarnings: string[];
    quarantineProtocol: {
      required: boolean;
      duration: string;
      tankSetup: string;
      steps: string[];
    };
    prevention: string[];
    urgency: string;
    prognosis: {
      recoveryChance: string;
      expectedDuration: string;
      signsOfImprovement: string[];
      signsOfDeterioration: string[];
      followUpDate: string;
    };
    waterParameters: {
      temperature: string;
      ph: string;
      ammonia: string;
      nitrite: string;
      nitrate: string;
    };
    // Pipeline intelligence metadata
    followUpQuestions?: string[];
    followUpReminder?: string;
    ruleEngineAlerts?: RuleEngineAlert[];
    reviewerCorrections?: string[];
    reviewerWarnings?: string[];
    pipelineStages: {
      visionCompleted: boolean;
      diagnosisCompleted: boolean;
      reviewCompleted: boolean;
      treatmentCompleted: boolean;
      ruleEngineUsed: boolean;
    };
  };
}

export class DiagnosticPipeline {
  
  /**
   * Execute the full 4-stage diagnostic pipeline
   */
  async execute(
    base64: string,
    mimeType: string,
    userContext: UserContext = {},
    waterParams?: WaterParams
  ): Promise<PipelineResult> {
    const pipelineStages = {
      visionCompleted: false,
      diagnosisCompleted: false,
      reviewCompleted: false,
      treatmentCompleted: false,
      ruleEngineUsed: false,
    };

    // ═══════════════════════════════════════════════════════
    // PRE-CHECK: Rule Engine (water parameters)
    // ═══════════════════════════════════════════════════════
    const preCheck = ruleEngine.preCheck(waterParams);
    let ruleEngineAlerts = preCheck.alerts;

    if (preCheck.shouldSkipAI && preCheck.environmentalDiagnosis) {
      console.log("[Pipeline] ⚡ Rule Engine auto-diagnosed environmental issue — skipping AI");
      pipelineStages.ruleEngineUsed = true;
      
      return this.buildEnvironmentalResult(preCheck.environmentalDiagnosis, ruleEngineAlerts, pipelineStages);
    }

    // ═══════════════════════════════════════════════════════
    // STAGE 1: Vision Agent — describe the image
    // ═══════════════════════════════════════════════════════
    console.log("[Pipeline] 🔍 Stage 1: Vision Agent analyzing image...");
    let visionReport: VisionReport;
    try {
      visionReport = await visionAgent.analyze(base64, mimeType);
      pipelineStages.visionCompleted = true;
      console.log(`[Pipeline] ✅ Vision: ${visionReport.species.commonName} (quality: ${visionReport.imageQuality.score}/10)`);
    } catch (error) {
      console.error("[Pipeline] ❌ Vision Agent failed:", error);
      throw new Error(`فشل تحليل الصورة بصرياً: ${error instanceof Error ? error.message : "خطأ"}`);
    }

    // ═══════════════════════════════════════════════════════
    // EARLY STOPPING: If image too blurry, stop pipeline
    // ═══════════════════════════════════════════════════════
    if (visionReport.imageQuality.score <= 3 && !visionReport.imageQuality.canDiagnose) {
      console.log(`[Pipeline] 🛑 Early Stop: Image quality too low (${visionReport.imageQuality.score}/10)`);
      return {
        detected: ["الصورة غير واضحة كفاية"],
        confidence: 0,
        suggestions: ["يرجى التقاط صورة أوضح وأقرب للسمكة"],
        details: {
          imageQuality: visionReport.imageQuality,
          speciesIdentification: {
            commonName: visionReport.species.commonName || "غير محدد",
            scientificName: visionReport.species.scientificName || "N/A",
            family: visionReport.species.family || "N/A",
            waterType: visionReport.species.waterType || "غير محدد",
            confidence: visionReport.species.confidence,
            knownVulnerabilities: [],
          },
          disease: "Image Too Blurry",
          arabicName: "الصورة غير واضحة للتشخيص",
          category: "unknown",
          pathogen: "N/A",
          symptoms: [],
          causes: [],
          diagnosis: `الصورة حصلت على تقييم ${visionReport.imageQuality.score}/10 وهو غير كافٍ للتشخيص الدقيق. ${visionReport.imageQuality.feedback}`,
          differentialDiagnosis: [],
          treatment: [],
          treatmentTimeline: [],
          medicationWarnings: [],
          quarantineProtocol: { required: false, duration: "N/A", tankSetup: "N/A", steps: [] },
          prevention: [],
          urgency: "low",
          prognosis: { recoveryChance: "N/A", expectedDuration: "N/A", signsOfImprovement: [], signsOfDeterioration: [], followUpDate: "N/A" },
          waterParameters: { temperature: "", ph: "", ammonia: "", nitrite: "", nitrate: "" },
          followUpQuestions: [
            "📸 يرجى التقاط صورة أقرب للسمكة مع إضاءة جيدة",
            "💡 تأكد أن الصورة ليست ضبابية أو مهتزة",
            "🐟 حاول تصوير السمكة من الجانب بشكل واضح",
          ],
          ruleEngineAlerts: ruleEngineAlerts.length > 0 ? ruleEngineAlerts : undefined,
          pipelineStages: { ...pipelineStages, visionCompleted: true },
        },
      };
    }

    // ═══════════════════════════════════════════════════════
    // RAG: Fetch veterinary knowledge (in parallel with nothing, but structured)
    // ═══════════════════════════════════════════════════════
    let ragContext = "";
    try {
      const ragQuery = [
        visionReport.species.commonName,
        ...visionReport.visualObservations.visibleParasites,
        ...visionReport.visualObservations.lesionsOrWounds,
        ...visionReport.visualObservations.colorChanges,
        visionReport.overallImpression,
      ].filter((s): s is string => typeof s === "string" && s.trim().length > 0);

      const ragChunks = await vetRAG.searchKnowledge(ragQuery.length > 0 ? ragQuery : ["fish disease treatment"], 3);
      if (ragChunks.length > 0) {
        ragContext = vetRAG.formatForPrompt(ragChunks);
        console.log(`[Pipeline] 📖 RAG: ${ragChunks.length} chunks (query: ${ragQuery.slice(0, 3).join(", ")})`);
      }
    } catch (ragError) {
      console.error("[Pipeline] RAG failed (non-blocking):", ragError);
    }

    // ═══════════════════════════════════════════════════════
    // FEEDBACK RAG: Fetch past corrections for this species
    // ═══════════════════════════════════════════════════════
    let similarCasesContext = "";
    try {
      similarCasesContext = await feedbackRAG.getSimilarCasesContext(
        visionReport.species.commonName,
        [] // symptoms not yet available at this stage
      );
      if (similarCasesContext) {
        console.log(`[Pipeline] 📊 FeedbackRAG: Found past cases for ${visionReport.species.commonName}`);
      }
    } catch (feedbackError) {
      console.error("[Pipeline] FeedbackRAG failed (non-blocking):", feedbackError);
    }

    // ═══════════════════════════════════════════════════════
    // STAGE 2: Diagnostician Agent — differential diagnosis
    // ═══════════════════════════════════════════════════════
    console.log("[Pipeline] 🧠 Stage 2: Diagnostician analyzing...");
    let diagnosisReport: DiagnosisReport;
    try {
      diagnosisReport = await diagnosticianAgent.diagnose(
        visionReport,
        ragContext,
        similarCasesContext, // Now injecting real past corrections!
        userContext,
        waterParams
      );
      pipelineStages.diagnosisCompleted = true;
      console.log(`[Pipeline] ✅ Diagnosis: ${diagnosisReport.primaryDiagnosis.disease} (confidence: ${(diagnosisReport.primaryDiagnosis.confidence * 100).toFixed(0)}%)`);
    } catch (error) {
      console.error("[Pipeline] ❌ Diagnostician failed:", error);
      throw new Error(`فشل التشخيص: ${error instanceof Error ? error.message : "خطأ"}`);
    }

    // ═══════════════════════════════════════════════════════
    // POST-CHECK: Rule Engine (anatomical exceptions)
    // ═══════════════════════════════════════════════════════
    const postCheck = ruleEngine.postCheck(
      visionReport.species.commonName,
      diagnosisReport.primaryDiagnosis.disease,
      userContext,
      visionReport
    );

    if (postCheck.overrideDiagnosis) {
      console.log(`[Pipeline] ⚙️ Rule Engine OVERRIDE: ${postCheck.reason}`);
      pipelineStages.ruleEngineUsed = true;
      diagnosisReport.primaryDiagnosis.disease = postCheck.correctedDisease || diagnosisReport.primaryDiagnosis.disease;
      diagnosisReport.primaryDiagnosis.arabicName = postCheck.correctedArabicName || diagnosisReport.primaryDiagnosis.arabicName;
      diagnosisReport.primaryDiagnosis.category = postCheck.correctedCategory || diagnosisReport.primaryDiagnosis.category;
      diagnosisReport.primaryDiagnosis.confidence = postCheck.correctedConfidence || diagnosisReport.primaryDiagnosis.confidence;
      diagnosisReport.primaryDiagnosis.reasoning = postCheck.reason || diagnosisReport.primaryDiagnosis.reasoning;
      diagnosisReport.isHealthy = postCheck.correctedCategory === "healthy";
      ruleEngineAlerts.push({
        type: "info",
        code: "ANATOMICAL_OVERRIDE",
        message: postCheck.reason || "Anatomical exception triggered",
        arabicMessage: postCheck.reason || "تم تصحيح التشخيص بناءً على خصائص الفصيلة",
      });
    } else if (postCheck.correctedConfidence) {
      console.log(`[Pipeline] ⚙️ Rule Engine adjusted confidence: ${postCheck.reason}`);
      pipelineStages.ruleEngineUsed = true;
      diagnosisReport.primaryDiagnosis.confidence = postCheck.correctedConfidence;
      if (postCheck.reason) {
        ruleEngineAlerts.push({
          type: "warning",
          code: "CONFIDENCE_ADJUSTED",
          message: postCheck.reason,
          arabicMessage: postCheck.reason,
        });
      }
    }

    // ═══════════════════════════════════════════════════════
    // STAGE 3: Reviewer Agent — AI second opinion
    // ═══════════════════════════════════════════════════════
    console.log("[Pipeline] ⚖️ Stage 3: Reviewer checking diagnosis...");
    let reviewVerdict: ReviewVerdict;
    try {
      reviewVerdict = await reviewerAgent.review(visionReport, diagnosisReport, userContext);
      pipelineStages.reviewCompleted = true;
      console.log(`[Pipeline] ✅ Review: ${reviewVerdict.approved ? "APPROVED" : "CORRECTED"} → ${reviewVerdict.finalDiagnosis.disease}`);
    } catch (error) {
      console.error("[Pipeline] ❌ Reviewer failed (using diagnosis as-is):", error);
      // If reviewer fails, use diagnostic result directly
      reviewVerdict = {
        approved: true,
        originalDiagnosis: diagnosisReport.primaryDiagnosis.disease,
        finalDiagnosis: diagnosisReport.primaryDiagnosis,
        corrections: [],
        warnings: [],
        anatomicalExceptionTriggered: false,
        eatingBehaviorConflict: false,
        reviewNotes: "تعذرت المراجعة — تم اعتماد التشخيص الأصلي",
      };
      pipelineStages.reviewCompleted = true;
    }

    // ═══════════════════════════════════════════════════════
    // STAGE 4: Treatment Agent — treatment plan
    // ═══════════════════════════════════════════════════════
    console.log("[Pipeline] 💊 Stage 4: Treatment Agent creating plan...");
    let treatmentPlan: TreatmentPlan;
    try {
      treatmentPlan = await treatmentAgent.plan(reviewVerdict, visionReport);
      pipelineStages.treatmentCompleted = true;
      console.log(`[Pipeline] ✅ Treatment: ${treatmentPlan.treatmentSteps.length} steps`);
    } catch (error) {
      console.error("[Pipeline] ❌ Treatment Agent failed:", error);
      treatmentPlan = {
        treatmentSteps: ["تعذر إنشاء خطة العلاج — يرجى إعادة المحاولة"],
        treatmentTimeline: [],
        medicationWarnings: [],
        quarantineProtocol: { required: false, duration: "غير محدد", tankSetup: "غير محدد", steps: [] },
        prevention: ["حافظ على جودة الماء", "تغيير 25% أسبوعياً"],
        prognosis: { recoveryChance: "غير محدد", expectedDuration: "غير محدد", signsOfImprovement: [], signsOfDeterioration: [], followUpDate: "غير محدد" },
        waterParameters: { temperature: "24-28°م", ph: "6.5-7.5", ammonia: "0 ppm", nitrite: "0 ppm", nitrate: "< 40 ppm" },
      };
      pipelineStages.treatmentCompleted = true;
    }

    // ═══════════════════════════════════════════════════════
    // FOLLOW-UP: Generate smart follow-up reminder
    // ═══════════════════════════════════════════════════════
    const followUpMessage = FollowUpService.getFollowUpMessage(
      diagnosisReport.urgency,
      reviewVerdict.finalDiagnosis.disease
    );
    const followUpDays = FollowUpService.getFollowUpDays(
      diagnosisReport.urgency,
      reviewVerdict.finalDiagnosis.disease
    );
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + followUpDays);

    // Enhance prognosis with follow-up info
    if (treatmentPlan.prognosis) {
      treatmentPlan.prognosis.followUpDate = `بعد ${followUpDays} أيام — ${followUpDate.toLocaleDateString('ar-IQ')}`;
    }

    return {
      detected: diagnosisReport.detectedSymptoms,
      confidence: reviewVerdict.finalDiagnosis.confidence,
      suggestions: treatmentPlan.treatmentSteps.slice(0, 3),
      details: {
        imageQuality: visionReport.imageQuality,
        speciesIdentification: {
          commonName: visionReport.species.commonName,
          scientificName: visionReport.species.scientificName,
          family: visionReport.species.family,
          waterType: visionReport.species.waterType,
          confidence: visionReport.species.confidence,
          knownVulnerabilities: [],
        },
        disease: reviewVerdict.finalDiagnosis.disease,
        arabicName: reviewVerdict.finalDiagnosis.arabicName,
        category: reviewVerdict.finalDiagnosis.category,
        pathogen: reviewVerdict.finalDiagnosis.pathogen,
        symptoms: diagnosisReport.detectedSymptoms,
        causes: diagnosisReport.possibleCauses,
        diagnosis: reviewVerdict.finalDiagnosis.reasoning,
        differentialDiagnosis: diagnosisReport.differentialDiagnosis.map(d => ({
          disease: d.disease,
          arabicName: d.arabicName,
          probability: d.probability,
          reasoning: d.reasoning,
        })),
        treatment: treatmentPlan.treatmentSteps,
        treatmentTimeline: treatmentPlan.treatmentTimeline,
        medicationWarnings: treatmentPlan.medicationWarnings,
        quarantineProtocol: treatmentPlan.quarantineProtocol,
        prevention: treatmentPlan.prevention,
        urgency: diagnosisReport.urgency,
        prognosis: treatmentPlan.prognosis,
        waterParameters: treatmentPlan.waterParameters,
        followUpQuestions: diagnosisReport.followUpQuestions,
        followUpReminder: followUpMessage,
        ruleEngineAlerts: ruleEngineAlerts.length > 0 ? ruleEngineAlerts : undefined,
        reviewerCorrections: reviewVerdict.corrections.length > 0 ? reviewVerdict.corrections : undefined,
        reviewerWarnings: reviewVerdict.warnings.length > 0 ? reviewVerdict.warnings : undefined,
        pipelineStages,
      },
    };
  }

  /**
   * Build result for environmental auto-diagnosis (Rule Engine pre-check)
   */
  private buildEnvironmentalResult(
    envDiagnosis: NonNullable<ReturnType<typeof ruleEngine.preCheck>["environmentalDiagnosis"]>,
    alerts: RuleEngineAlert[],
    pipelineStages: PipelineResult["details"]["pipelineStages"]
  ): PipelineResult {
    return {
      detected: [envDiagnosis.arabicName],
      confidence: 0.95,
      suggestions: envDiagnosis.treatment.slice(0, 3),
      details: {
        imageQuality: { score: 0, feedback: "لم يتم تحليل الصورة — تم التشخيص من بيانات الماء", canDiagnose: false },
        speciesIdentification: {
          commonName: "غير محدد", scientificName: "N/A", family: "N/A",
          waterType: "غير محدد", confidence: 0, knownVulnerabilities: [],
        },
        disease: envDiagnosis.disease,
        arabicName: envDiagnosis.arabicName,
        category: envDiagnosis.category,
        pathogen: "Environmental",
        symptoms: [envDiagnosis.arabicName],
        causes: ["تدهور جودة الماء"],
        diagnosis: alerts.map(a => a.arabicMessage).join("\n"),
        differentialDiagnosis: [],
        treatment: envDiagnosis.treatment,
        treatmentTimeline: [
          { day: "فوراً", actions: envDiagnosis.treatment.slice(0, 3) },
          { day: "بعد 4 ساعات", actions: ["إعادة فحص المعلمات"] },
        ],
        medicationWarnings: [],
        quarantineProtocol: { required: false, duration: "غير مطلوب", tankSetup: "غير مطلوب", steps: [] },
        prevention: ["فحوصات ماء منتظمة", "تغيير 25% أسبوعياً", "عدم الإفراط في الإطعام"],
        urgency: envDiagnosis.urgency,
        prognosis: {
          recoveryChance: "عالية إذا تم التعامل فوراً",
          expectedDuration: "24-48 ساعة",
          signsOfImprovement: ["عودة السلوك الطبيعي", "توقف اللهث"],
          signsOfDeterioration: ["استمرار اللهث", "خمول شديد"],
          followUpDate: "بعد 24 ساعة",
        },
        waterParameters: {
          temperature: "24-28°م",
          ph: "6.5-7.5",
          ammonia: "0 ppm",
          nitrite: "0 ppm",
          nitrate: "< 40 ppm",
        },
        ruleEngineAlerts: alerts,
        pipelineStages,
      },
    };
  }
}

export const diagnosticPipeline = new DiagnosticPipeline();
