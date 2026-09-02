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

/**
 * Rule 3, FOREIGN_LEXICAL. Every "must reject" below is a verbatim fragment
 * that was live on www.aquavoiq.com on 2026-09-02, after the script sweep had
 * certified the corpus clean. None of them trips STRAY_SCRIPT (wrong script
 * ranges), FOREIGN_DIACRITIC (Latin-1, not Latin-Extended) or SPLICED_LATIN
 * (not welded to an Arabic letter) — which is precisely why they survived.
 */
describe("script purity — standalone foreign words in Latin/Latin-1", () => {
  const REJECT: Array<[string, string]> = [
    ["Vietnamese, two bare words", "حيث يتم ترتيب الصخور في دائرة حول نقطة trung tâm."],
    ["Turkish, mid-sentence", "قد يكون استخدام مياه الحوض معرضًا للمخاطر بسبب yüksek نسبة الكلور."],
    ["Vietnamese verb", "ولكن يمكن phân إلى ثلاث فئات رئيسية."],
    ["Vietnamese adverb", "يجب ترك الأخشاب المتحجرة لتجف hoàn قبل إضافتها إلى الحوض."],
    ["Portuguese connective", "يجب também مراعاة تقلبات التيار الكهربائي في العراق."],
    ["French possessive", "اختر الأنواع التي تتناسب مع ظروف votre حوضك."],
    ["Spanish noun", "يلعب دورًا هامًا في حماية salud الحوض وجمال الأسماك."],
    ["Indonesian/German noun", "جودة الماء هو faktor آخر مهم في تربية الأسماك الزينة."],
    ["bare English verb", "إزالة طحالب اللحية السوداء لا تحتاج require خبرة كبيرة."],
    ["bare English noun", "مع وجود warranties وضمانات على منتجاتنا لمدة سنة."],
  ];

  for (const [name, text] of REJECT) {
    it(`rejects ${name}`, () => {
      const found = findScriptViolations(text);
      expect(found.length).toBeGreaterThan(0);
      expect(found.some((v) => v.rule === "FOREIGN_LEXICAL")).toBe(true);
    });
  }
});

/**
 * The false-positive half, and the reason this is not a "no Latin words" rule.
 * Every case is real usage from the live corpus that must keep working.
 */
describe("script purity — lexical rule must not break legitimate Latin usage", () => {
  const ACCEPT: Array<[string, string]> = [
    ["lowercase technical shorthand", "راقب مستوى pH و GH و KH و TDS قبل إضافة الأسماك إلى الحوض."],
    ["formulas and abbreviations", "أضف CO2 بمعدل ثابت، واستخدم فلتر RO وإضاءة LED مناسبة."],
    ["a scientific binomial", "نبات الأمازون سورد (Echinodorus bleheri) من النباتات المعمرة."],
    ["a bare capitalised genus", "بكتيريا Nitrosomonas تؤكسد الأمونيا، و Nitrospira تكمل الخطوة الثانية."],
    ["a European brand with a Latin-1 diacritic", "جهاز Söchting Oxydator يعمل بالأكسجين النشط داخل الحوض."],
    ["a multi-word brand and model", "استخدم فلتر SUNSUN HW-304B مع ميديا YEE متعددة الطبقات."],
    ["an English gloss in parentheses", "الحجر الصحي (Quarantine) مرحلة أساسية قبل إضافة أي سمكة."],
    ["a lowercase phrase inside parentheses", "السلاحف تحتاج منطقة جافة للتشمس (basking area) بحرارة 30-35 درجة."],
    ["a lowercase word continuing a capitalised name", "أضف أوراق لوز هندي مجففة (تباع باسم Catappa leaves) لتحمض الماء."],
    ["an Arabic gloss marker introducing an English phrase", "الدم يتحول للون بني، ولهذا يسمونه بالإنجليزية brown blood disease."],
    ["accepted lowercase scientific shorthand", "نوع من Nitrospira يسمى comammox يقدر يكمل الطريق كله لحاله."],
    ["units written bare", "أضف 5 ml لكل 20 لتر، وثبّت الحرارة على 26 درجة."],
    ["the brand beside Arabic punctuation", "في AQUAVO، نوفر لك مجموعة واسعة من مستلزمات الأحواض."],
    ["a full clean paragraph", "<h2>ما هو الفحم النشط؟</h2><p>الفحم النشط يزيل الكلور والروائح، لكنه لا يعالج الأمونيا.</p>"],
  ];

  for (const [name, text] of ACCEPT) {
    it(`accepts ${name}`, () => {
      expect(findScriptViolations(text)).toEqual([]);
    });
  }

  it("ignores markup, attributes and URLs rather than reading them as prose", () => {
    const html =
      '<p class="lead" dir="rtl">راجع <a href="https://aquavoiq.com/blog/nitrogen-cycle-simple-arabic-explained">دليل الدورة</a> قبل الإضافة.</p>';
    expect(findScriptViolations(html)).toEqual([]);
  });
});

describe("script purity — the prompt states the same rule it enforces", () => {
  it("names the blocked scripts and the allowed Latin terms", () => {
    expect(SCRIPT_PURITY_RULE).toContain("بالعربية");
    expect(SCRIPT_PURITY_RULE).toContain("pH");
    expect(SCRIPT_PURITY_RULE).toContain("بالإنجليزية");
  });
});
