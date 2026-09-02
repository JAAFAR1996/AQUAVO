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

/**
 * Pass 1's *migration* post-flight tested only `[一-鿿぀-ヿЀ-ӿऀ-ॿ]` — Han, Kana,
 * Cyrillic, Devanagari — and so certified a corpus that still carried Hangul,
 * Thai, Hebrew and Latin-Extended. The guard itself was always right about
 * these; nothing had ever pinned them. These four fragments are verbatim from
 * production on 2026-09-02, after pass 1 had run.
 */
describe("script purity — residue pass 1's post-flight regex could not see", () => {
  const REJECT: Array<[string, string]> = [
    ["Hangul, fused", "فإنها تتطلب ظروف معينة لتربية 성공ية."],
    ["Thai, inside a word", "غالبًا ما يكون معرضًا للتعرض للคลور بكميات زائدة."],
    ["Hebrew, leading a word", "طفيلي يصيب الأسماك بسبب الإجهاد. לעلاجه بسرعة: ارفع درجة الحرارة."],
    ["Vietnamese, fused mid-word", "السيكلد الإفريقية، التي تمتاز bằngرارها وعدوانيتها."],
  ];

  for (const [name, text] of REJECT) {
    it(`rejects ${name}`, () => {
      expect(findScriptViolations(text).length).toBeGreaterThan(0);
    });
  }
});

/**
 * SPLICED_LATIN fails closed. `وCO2` is correct Arabic — the conjunction و
 * proclitic on a Latin technical term — and the guard rejects it anyway,
 * because ب and ل are proclitics too and `بbehind` / `لallow` are exactly how
 * the real corruption arrived. Exempting proclitics would readmit those, so the
 * rule stays strict and the one live instance was spaced in the content
 * instead. This pins the trade-off so it is not silently "fixed" later.
 */
describe("script purity — SPLICED_LATIN fails closed on Arabic proclitics", () => {
  it("rejects a conjunction welded to a Latin term, though the Arabic is correct", () => {
    expect(findScriptViolations("خلل في التوازن بين الإضاءة والمغذيات وCO2").length).toBeGreaterThan(0);
  });

  it("accepts the same sentence once the term is separated", () => {
    expect(findScriptViolations("خلل في التوازن بين الإضاءة والمغذيات و CO2")).toEqual([]);
  });

  it("still rejects the corruption that motivates the strictness", () => {
    expect(findScriptViolations("مساحة كافية لallow الأسماك").length).toBeGreaterThan(0);
    expect(findScriptViolations("الأسبابbehind تعفن الجذور").length).toBeGreaterThan(0);
  });
});

describe("script purity — the prompt states the same rule it enforces", () => {
  it("names the blocked scripts and the allowed Latin terms", () => {
    expect(SCRIPT_PURITY_RULE).toContain("بالعربية");
    expect(SCRIPT_PURITY_RULE).toContain("pH");
  });
});
