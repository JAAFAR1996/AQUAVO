/**
 * ⚙️ Rule Engine — Hard-coded safety checks
 * ==========================================
 * This module runs BEFORE and AFTER the AI pipeline
 * to catch errors that AI might hallucinate.
 * 
 * Pre-checks: Water parameter alerts (ammonia, nitrite, pH)
 * Post-checks: Anatomical exception overrides
 */

import type { WaterParams, UserContext } from "./agents/diagnostician-agent.js";
import type { VisionReport } from "./agents/vision-agent.js";

export interface RuleEngineAlert {
  type: "critical" | "warning" | "info";
  code: string;
  message: string;
  arabicMessage: string;
  autoAction?: string;
}

export interface PreCheckResult {
  alerts: RuleEngineAlert[];
  shouldSkipAI: boolean;       // If true, the alert IS the diagnosis
  environmentalDiagnosis?: {
    disease: string;
    arabicName: string;
    category: string;
    urgency: "critical" | "high";
    treatment: string[];
  };
}

export interface PostCheckResult {
  overrideDiagnosis: boolean;
  reason?: string;
  correctedCategory?: string;
  correctedDisease?: string;
  correctedArabicName?: string;
  correctedConfidence?: number;
}

// ═══════════════════════════════════════════════════════
// Anatomical exceptions database
// ═══════════════════════════════════════════════════════

const BALLOON_BODY_SPECIES = [
  "balloon molly", "balloon ram", "balloon belly molly",
  "pearlscale goldfish", "pearlscale", "ranchu", "lionhead",
  "ryukin", "oranda", "parrot cichlid", "blood parrot",
  "flowerhorn", "flower horn",
];

const PREGNANT_LIVEBEARERS = [
  "molly", "guppy", "platy", "swordtail", "endler",
  "endler's livebearer", "mosquitofish",
];

const LONG_FIN_SPECIES = [
  "betta", "halfmoon", "rosetail", "crowntail",
  "fantail goldfish", "veiltail goldfish", "veiltail",
  "guppy",
];

const SPOTTED_SPECIES = [
  "dalmatian molly", "dalmatian", "koi", "goldfish",
  "oscar", "flowerhorn",
];

const LABYRINTH_FISH = [
  "betta", "gourami", "dwarf gourami", "pearl gourami",
  "honey gourami", "paradise fish",
];

export class RuleEngine {

  /**
   * PRE-CHECK: Run before AI pipeline
   * Checks water parameters for obvious dangers
   */
  preCheck(waterParams?: WaterParams): PreCheckResult {
    const alerts: RuleEngineAlert[] = [];

    if (!waterParams) {
      return { alerts: [], shouldSkipAI: false };
    }

    // ── Ammonia check ──
    const ammonia = this.parseWaterValue(waterParams.ammonia);
    if (ammonia !== null) {
      if (ammonia >= 1.0) {
        alerts.push({
          type: "critical",
          code: "AMMONIA_LETHAL",
          message: "Lethal ammonia level detected",
          arabicMessage: `⚠️ مستوى الأمونيا قاتل (${ammonia} ppm)! يجب تغيير 75% من الماء فوراً.`,
        });
        return {
          alerts,
          shouldSkipAI: true,
          environmentalDiagnosis: {
            disease: "Ammonia Poisoning",
            arabicName: "تسمم الأمونيا",
            category: "environmental",
            urgency: "critical",
            treatment: [
              "تغيير 75% من الماء فوراً",
              "إضافة Seachem Prime جرعة مضاعفة (2ml لكل 40 لتر)",
              "فحص الفلتر — قد يكون متوقف أو مسدود",
              "عدم إطعام الأسماك لمدة 24 ساعة",
              "تهوية قوية — إضافة مضخة هواء",
              "إعادة فحص الأمونيا بعد 4 ساعات",
            ],
          },
        };
      } else if (ammonia >= 0.5) {
        alerts.push({
          type: "critical",
          code: "AMMONIA_DANGEROUS",
          message: "Dangerous ammonia level",
          arabicMessage: `⚠️ مستوى الأمونيا خطير (${ammonia} ppm)! تغيير 50% من الماء مطلوب.`,
        });
      } else if (ammonia > 0) {
        alerts.push({
          type: "warning",
          code: "AMMONIA_ELEVATED",
          message: "Elevated ammonia",
          arabicMessage: `مستوى الأمونيا مرتفع قليلاً (${ammonia} ppm). راقب وقم بتغيير 25% ماء.`,
        });
      }
    }

    // ── Nitrite check ──
    const nitrite = this.parseWaterValue(waterParams.nitrite);
    if (nitrite !== null) {
      if (nitrite >= 0.5) {
        alerts.push({
          type: "critical",
          code: "NITRITE_DANGEROUS",
          message: "Dangerous nitrite level",
          arabicMessage: `⚠️ النيتريت خطير (${nitrite} ppm)! أضف ملح (1g/L) + تغيير 50% ماء.`,
        });
      } else if (nitrite > 0) {
        alerts.push({
          type: "warning",
          code: "NITRITE_ELEVATED",
          message: "Elevated nitrite",
          arabicMessage: `النيتريت مرتفع (${nitrite} ppm). الدورة البيولوجية قد تكون غير مكتملة.`,
        });
      }
    }

    // ── pH check ──
    const ph = this.parseWaterValue(waterParams.ph);
    if (ph !== null) {
      if (ph < 5.5 || ph > 9.0) {
        alerts.push({
          type: "critical",
          code: "PH_EXTREME",
          message: "Extreme pH level",
          arabicMessage: `⚠️ مستوى pH خارج النطاق الآمن (${ph})! لا تغير فجأة — عدّل تدريجياً 0.3 وحدة/يوم.`,
        });
      } else if (ph < 6.0 || ph > 8.5) {
        alerts.push({
          type: "warning",
          code: "PH_SUBOPTIMAL",
          message: "Suboptimal pH",
          arabicMessage: `مستوى pH (${ph}) خارج النطاق المثالي. راقب الأسماك.`,
        });
      }
    }

    // ── Temperature check ──
    const temp = this.parseWaterValue(waterParams.temperature);
    if (temp !== null) {
      if (temp > 32) {
        alerts.push({
          type: "critical",
          code: "TEMP_TOO_HIGH",
          message: "Temperature dangerously high",
          arabicMessage: `⚠️ الحرارة مرتفعة جداً (${temp}°م)! خطر اختناق. أضف تهوية + خفض الحرارة تدريجياً.`,
        });
      } else if (temp < 18) {
        alerts.push({
          type: "warning",
          code: "TEMP_TOO_LOW",
          message: "Temperature too low",
          arabicMessage: `الحرارة منخفضة (${temp}°م). الأسماك الاستوائية تحتاج 24-28°م.`,
        });
      }
    }

    return { alerts, shouldSkipAI: false };
  }

  /**
   * POST-CHECK: Run after AI diagnosis
   * Validates diagnosis against hard-coded anatomical exceptions
   */
  postCheck(
    species: string,
    diagnosedDisease: string,
    userContext: UserContext
  ): PostCheckResult {
    const speciesLower = species.toLowerCase();
    const diseaseLower = diagnosedDisease.toLowerCase();

    // ── Check 1: Balloon body species diagnosed with Dropsy ──
    if (diseaseLower.includes("dropsy") || diseaseLower.includes("edema") || diseaseLower.includes("استسقاء")) {
      const isBalloonSpecies = BALLOON_BODY_SPECIES.some(s => speciesLower.includes(s));
      if (isBalloonSpecies) {
        return {
          overrideDiagnosis: true,
          reason: `${species} لها جسم كروي/منتفخ بشكل طبيعي وراثياً — ليس استسقاء`,
          correctedDisease: "No Disease Detected",
          correctedArabicName: "سليمة — شكل طبيعي للفصيلة",
          correctedCategory: "healthy",
          correctedConfidence: 0.9,
        };
      }

      // Check pregnant livebearers
      const isLivebearer = PREGNANT_LIVEBEARERS.some(s => speciesLower.includes(s));
      if (isLivebearer) {
        return {
          overrideDiagnosis: true,
          reason: `${species} من الأسماك الولود — البطن المنتفخ قد يكون حمل وليس استسقاء`,
          correctedDisease: "Possible Pregnancy",
          correctedArabicName: "احتمال حمل — وليس استسقاء",
          correctedCategory: "healthy",
          correctedConfidence: 0.7,
        };
      }
    }

    // ── Check 2: Long-fin species diagnosed with Fin Rot ──
    if (diseaseLower.includes("fin rot") || diseaseLower.includes("tail rot") || diseaseLower.includes("تعفن الزعانف")) {
      const isLongFin = LONG_FIN_SPECIES.some(s => speciesLower.includes(s));
      if (isLongFin) {
        // Don't fully override — just reduce confidence and add warning
        return {
          overrideDiagnosis: false,
          reason: `${species} لها زعانف طويلة طبيعياً — تأكد أن التآكل حقيقي وليس شكل الزعنفة`,
          correctedConfidence: 0.5,
        };
      }
    }

    // ── Check 3: Eating well + fatal disease conflict ──
    if (userContext.eating?.includes("ممتاز") || userContext.eating?.includes("طبيعي")) {
      const fatalDiseases = ["dropsy", "septicemia", "mycobacteriosis", "tb", "استسقاء", "تسمم"];
      const isFatal = fatalDiseases.some(d => diseaseLower.includes(d));
      if (isFatal) {
        return {
          overrideDiagnosis: false,
          reason: `المالك أكد أن السمكة تأكل بشكل ممتاز — هذا يتعارض مع تشخيص ${diagnosedDisease} (الأسماك المصابة ترفض الأكل)`,
          correctedConfidence: 0.35,
        };
      }
    }

    // ── Check 4: Spotted species diagnosed with disease spots ──
    if (diseaseLower.includes("ich") || diseaseLower.includes("white spot") || diseaseLower.includes("نقط بيضاء")) {
      const isSpotted = SPOTTED_SPECIES.some(s => speciesLower.includes(s));
      if (isSpotted) {
        return {
          overrideDiagnosis: false,
          reason: `${species} لها بقع ألوان طبيعية — تأكد أن البقع البيضاء ليست ألوان وراثية`,
          correctedConfidence: 0.55,
        };
      }
    }

    return { overrideDiagnosis: false };
  }

  /**
   * Parse water parameter value from string to number
   */
  private parseWaterValue(value?: string): number | null {
    if (!value) return null;
    const num = parseFloat(value.replace(/[^0-9.]/g, ""));
    return isNaN(num) ? null : num;
  }
}

export const ruleEngine = new RuleEngine();
