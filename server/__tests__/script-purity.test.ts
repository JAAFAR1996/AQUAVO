import { describe, it, expect } from "vitest";
import { findScriptViolations, SCRIPT_PURITY_RULE } from "../../shared/script-purity.js";

/**
 * Every "must reject" case below is a verbatim fragment that was live on
 * www.aquavoiq.com on 2026-09-01, across 30 of 80 published articles. Every
 * "must accept" case is Arabic the corpus legitimately publishes today — the
 * guard exists to stop token-substitution artefacts, not to stop the technical
 * English the articles are written with.
 */
describe("script purity — real contamination found in production", () => {
  const REJECT: Array<[string, string]> = [
    ["Chinese, mid-word", "الدورة البيولوجية لحوض السمك هي عملية复杂ة تنطوي على تحويل الأمونيا."],
    ["Chinese, connective", "العلف التترا ممتاز لأسماك الزينة.然而، قد يكون غالي الثمن."],
    ["Russian, relative pronoun", "تقوم بإزالة الأمونيا والنتريت، которые يمكن أن تكون ضارة للأسماك."],
    ["Russian, inside a word", "ماء الحنفية في العراق يتسم بالكлорين بدرجة عالية جداً."],
    ["Devanagari", "في العراق، जहما تصل درجات الحرارة إلى 50 درجة مئوية في الصيف."],
    ["Vietnamese, fused", "هل تساءلت يومًا عن khảية الأسماك رؤية البشر وتعرفهم؟"],
    ["Vietnamese, standalone", "دون تقديم ضمانات أو dịch vụ العملاء الجيدة للمشتري."],
    ["English spliced onto Arabic prefix", "هذه المتاجر غالبًا ما تutilize صورًا مأخوذة من الإنترنت."],
    ["English spliced, suffix side", "يجب ترك مساحة كافية لallow الأسماك بالتحرك بحرية في الحوض."],
    ["French spliced", "النصائح والخدمات التي ت besoinها من فريق الدعم لدينا."],
  ];

  for (const [name, text] of REJECT) {
    it(`rejects ${name}`, () => {
      const found = findScriptViolations(text);
      expect(found.length).toBeGreaterThan(0);
    });
  }

  it("reports the offending fragment as evidence", () => {
    const [found] = findScriptViolations("هي عملية复杂ة تنطوي على تحويل الأمونيا.");
    expect(found.rule).toBe("STRAY_SCRIPT");
    expect(found.evidence).toContain("复杂");
  });
});

describe("script purity — legitimate Arabic technical writing must pass", () => {
  const ACCEPT: Array<[string, string]> = [
    ["bare English acronyms beside Arabic punctuation", "استخدم مرشح LED، ونظام RO؟ نعم، كلاهما مناسب."],
    ["the brand name with an Arabic comma", "في AQUAVO، نوفر لك مجموعة واسعة من المنتجات عالية الجودة."],
    ["chemistry shorthand", "راقب مستوى pH و GH و KH و TDS قبل إضافة الأسماك إلى الحوض."],
    ["formulas and units", "أضف CO2 بمعدل ثابت، وثبّت الحرارة بين 24-28 درجة مئوية."],
    ["scientific binomial", "نبات الأمازون سورد (Echinodorus bleheri) من النباتات المعمرة."],
    ["product and app names", "يمكنك استخدام Adobe Lightroom أو Photoshop Express لتحسين الصورة."],
    ["European brand with Latin-1 diacritic", "جهاز Söchting Oxydator يعمل بالأكسجين النشط داخل الحوض."],
    ["English in parentheses, the corpus's own habit", "الحجر الصحي (Quarantine) مرحلة أساسية قبل إضافة أي سمكة."],
    ["a full clean paragraph", "<h2>ما هو الفحم النشط؟</h2><p>الفحم النشط يزيل الكلور والروائح، لكنه لا يعالج الأمونيا.</p>"],
    ["Arabic-Indic digits and percent", "غيّر ٢٥٪ من ماء الحوض أسبوعياً للحفاظ على جودة الماء."],
  ];

  for (const [name, text] of ACCEPT) {
    it(`accepts ${name}`, () => {
      expect(findScriptViolations(text)).toEqual([]);
    });
  }

  it("accepts empty and missing input", () => {
    expect(findScriptViolations("")).toEqual([]);
    expect(findScriptViolations(null)).toEqual([]);
    expect(findScriptViolations(undefined)).toEqual([]);
  });
});

describe("script purity — the prompt states the same rule it enforces", () => {
  it("names the blocked scripts and the allowed Latin terms", () => {
    expect(SCRIPT_PURITY_RULE).toContain("بالعربية");
    expect(SCRIPT_PURITY_RULE).toContain("pH");
  });
});
