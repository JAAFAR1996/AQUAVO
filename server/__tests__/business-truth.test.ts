import { describe, it, expect } from "vitest";
import {
  findBusinessTruthViolations,
  businessTruthPrompt,
  AQUAVO_INVARIANTS,
  BUSINESS_TRUTH_RULE,
  type BusinessFacts,
} from "../../shared/business-truth.js";

/**
 * The live catalogue as it stood on 2026-09-02: 112 products across these 11
 * categories, no live animals, no live plants. Injected the way the generator
 * injects it, so the tests exercise the real path rather than a stub.
 */
const CATALOGUE: BusinessFacts = {
  ...AQUAVO_INVARIANTS,
  categories: [
    "تربة وديكور", "طعام الأسماك", "الفلترة والتنقية", "التهوية والأكسجين",
    "الفحص والمراقبة", "الصيانة والتنظيف", "العزل والتفريخ", "معالجة المياه",
    "أحواض", "الإضاءة", "التحكم بالحرارة",
  ],
  productTerms: [
    "سخان", "فلتر", "مضخة هواء", "معالج مياه", "مزيل كلور", "بكتيريا نافعة",
    "أزرق الميثيلين", "أوراق كاتابا", "سيفون", "شرائط فحص", "كربون نشط",
  ],
};

/**
 * Every "must reject" below is a verbatim claim that was live on
 * www.aquavoiq.com before the 2026-09-02 truth audit removed it. The audit
 * found 38 such claims across 23 of 80 articles; these are the ones that
 * define each rule.
 */
describe("business truth — the false claims that were actually published", () => {
  const REJECT: Array<[string, string, string]> = [
    [
      "AQUAVO supplies marine fish, with a one-year guarantee",
      "يجب دائمًا اختيار الأسماك المالحة من مورد موثوق به، مثل AQUAVO، الذي يوفر الأسماك المالحة عالية الجودة وضمانًا لمدة عام.",
      "LIVE_ANIMAL_OR_PLANT_SUPPLY",
    ],
    [
      "live algae-eating fish listed as in stock",
      "قم بشراء أسماك القاع المنظفة مثل أسماك الكوريدوراس والأوتوسينكلس، أو حلزونات النيريت المتوفرة في أكوافو.",
      "LIVE_ANIMAL_OR_PLANT_SUPPLY",
    ],
    [
      "live plants offered from a store section",
      "يمكنك إيجاد هذه الأنواع في متجرنا، حيث نوفر نباتات مائية منخفضة المتطلبات.",
      "LIVE_ANIMAL_OR_PLANT_SUPPLY",
    ],
    [
      "delivery of live fish across Iraq",
      "تشمل خدمات AQUAVO تسليم الأسماك إلى جميع أنحاء العراق.",
      "LIVE_ANIMAL_OR_PLANT_SUPPLY",
    ],
    [
      "an invitation to visit a branch",
      "يمكنك زيارة موقع شركة AQUAVO على الإنترنت، أو زيارة أحد فروعها في العراق، لاستشارة خبراء الشركة.",
      "PHYSICAL_LOCATION",
    ],
    [
      "a five-year warranty on all products",
      "مع وجود ضمانات لمدة تصل إلى 5 سنوات على منتجاتنا، يمكن لزباين AQUAVO التأكد من حصولهم على أفضل المنتجات.",
      "BLANKET_WARRANTY",
    ],
    [
      "a health guarantee on everything",
      "في AQUAVO، نقدم لك ضمان صحي ودعم فني لجميع منتجاتنا.",
      "BLANKET_WARRANTY",
    ],
    [
      "first professional aquarium store in Iraq",
      "AQUAVO هي أول متجر احترافي لأحواض السمك في العراق، وتقدم مجموعة واسعة من المنتجات.",
      "UNSUPPORTED_RANKING",
    ],
    [
      "the first and principal supplier",
      "متجر AQUAVO، الذي يُعتبر المورد الأول والرئيسي للمنتجات المائية في العراق.",
      "UNSUPPORTED_RANKING",
    ],
    [
      "biggest and best aquarium store",
      "يمكن الاعتماد على AQUAVO كواحدة من أفضل وأكبر متاجر الأسماك المائية في العراق.",
      "UNSUPPORTED_RANKING",
    ],
    [
      "a leading company",
      "AQUAVO هي شركة رائدة في مجال تربية الأسماك في العراق.",
      "UNSUPPORTED_RANKING",
    ],
    [
      "imported from the best factories in the world",
      "وتعد منتجات AQUAVO المصرح بها ومستوردة من أفضل المصانع العالمية خياراً مثاليًا.",
      "UNSUPPORTED_SOURCING",
    ],
    [
      "imported from all over the world",
      "تقدم AQUAVO مجموعة واسعة من المنتجات عالية الجودة المستوردة من جميع أنحاء العالم.",
      "UNSUPPORTED_SOURCING",
    ],
    [
      "AQUAVO guarantees the reader's tap water",
      "بالإضافة إلى ذلك، يضمن AQUAVO جودة مياه الصنبور المستخدمة في حاوية الأسماك.",
      "INVENTED_SERVICE_PRACTICE",
    ],
  ];

  for (const [name, text, rule] of REJECT) {
    it(`rejects ${name}`, () => {
      const found = findBusinessTruthViolations(text, CATALOGUE);
      expect(found.length).toBeGreaterThan(0);
      expect(found.map((v) => v.rule)).toContain(rule);
    });
  }

  it("reports the offending sentence as evidence", () => {
    const [found] = findBusinessTruthViolations(
      "AQUAVO هي أول متجر احترافي لأحواض السمك في العراق.",
      CATALOGUE,
    );
    expect(found.evidence).toContain("أول متجر");
  });
});

describe("business truth — invented products the catalogue cannot support", () => {
  const INVENTED: Array<[string, string]> = [
    ["a smart lighting controller", "اضبط مصباح حوضك عن طريق شاشة التحكم الذكية التي نوفرها في متجرنا."],
    ["a sterilising solution", "يمكنك استخدام منتجات AQUAVO لتعقيم الأخشاب، مثل محلول التعقيم الذي نقدمه في متجرنا."],
    ["cooling systems", "يمكن التغلب على الحرارة بأنظمة التبريد التي نوفرها في متجر AQUAVO."],
    ["a CO2 system", "في AQUAVO، نقدم نظام ثاني أكسيد الكربون عالي الجودة لأحواض النباتات."],
  ];

  for (const [name, text] of INVENTED) {
    it(`rejects ${name}`, () => {
      const found = findBusinessTruthViolations(text, CATALOGUE);
      expect(found.map((v) => v.rule)).toContain("UNVERIFIED_AVAILABILITY");
    });
  }

  it("accepts a product the injected catalogue really carries", () => {
    expect(
      findBusinessTruthViolations("في AQUAVO نوفر معالج مياه ومزيل كلور للأحواض.", CATALOGUE),
    ).toEqual([]);
  });

  it("fails closed when no catalogue has been injected", () => {
    const found = findBusinessTruthViolations("في AQUAVO نوفر معالج مياه ومزيل كلور للأحواض.");
    expect(found.map((v) => v.rule)).toContain("UNVERIFIED_AVAILABILITY");
  });
});

describe("business truth — verified facts must keep passing", () => {
  const ACCEPT: Array<[string, string]> = [
    ["the real delivery terms", "يوفر AQUAVO توصيلاً إلى 18 محافظة في العراق برسوم ثابتة 5,000 دينار."],
    ["delivery without a number", "يقدم AQUAVO خدمة توصيل داخل العراق."],
    ["a stocked product", "تباع أوراق كاتابا في AQUAVO وتساعد على تحميض الماء."],
    ["technical support", "في AQUAVO، نوفر دعماً فنياً لهواة تربية الأسماك."],
    ["a purely educational paragraph", "<p>الدورة البيولوجية تحوّل الأمونيا إلى نتريت ثم إلى نترات عبر بكتيريا مؤكسدة.</p>"],
    ["plants as husbandry advice, with no supply claim", "<p>وجود نباتات مائية في الحوض يساعد على استهلاك النترات وتوفير مخابئ للأسماك.</p>"],
    ["naming a fish species as advice, not as stock", "<p>أسماك الكوريدوراس ممتازة لتنظيف القاع، وتحتاج مجموعة من ستة أفراد على الأقل.</p>"],
    ["a question rather than an assertion", "هل يبيع AQUAVO أسماكاً حية؟"],
  ];

  for (const [name, text] of ACCEPT) {
    it(`accepts ${name}`, () => {
      expect(findBusinessTruthViolations(text, CATALOGUE)).toEqual([]);
    });
  }

  it("accepts empty and missing input", () => {
    expect(findBusinessTruthViolations("")).toEqual([]);
    expect(findBusinessTruthViolations(null)).toEqual([]);
    expect(findBusinessTruthViolations(undefined)).toEqual([]);
  });
});

/**
 * Denials must pass. A guard that blocks "AQUAVO does not sell live fish" would
 * forbid the single most useful sentence a knowledge article can contain — and
 * it did, until a Phase 3 rewrite tripped over it.
 */
describe("business truth — truthful denials are not claims", () => {
  const ACCEPT: Array<[string, string]> = [
    ["a denial of live fish", "AQUAVO لا يبيع أسماكاً حية، فاشترِ الأسماك من مصدر مختص."],
    ["a dialect denial of live plants", "(AQUAVO ما يبيع نباتات حية، فهذا جزء تدبّره من مصدر مختص.)"],
    ["a denial of a physical branch", "AQUAVO متجر إلكتروني وما يملك فرعاً في أي سوق."],
    ["a denial of a blanket warranty", "لا يوجد ضمان شامل على جميع المنتجات في AQUAVO."],
    ["an availability denial", "أنظمة ثاني أكسيد الكربون غير متوفرة في AQUAVO حالياً."],
  ];

  for (const [name, text] of ACCEPT) {
    it(`accepts ${name}`, () => {
      expect(findBusinessTruthViolations(text, CATALOGUE)).toEqual([]);
    });
  }

  it("still rejects the positive form of the same claim", () => {
    const found = findBusinessTruthViolations("AQUAVO يبيع أسماكاً حية بأسعار جيدة.", CATALOGUE);
    expect(found.map((v) => v.rule)).toContain("LIVE_ANIMAL_OR_PLANT_SUPPLY");
  });
});

describe("business truth — delivery claims are checked against the injected numbers", () => {
  it("rejects a governorate count that is not the real one", () => {
    const found = findBusinessTruthViolations("يوفر AQUAVO توصيلاً إلى 25 محافظة في العراق.", CATALOGUE);
    expect(found.map((v) => v.rule)).toContain("UNSUPPORTED_DELIVERY");
  });

  it("rejects a delivery fee that is not the real one", () => {
    const found = findBusinessTruthViolations("يقدم AQUAVO توصيلاً برسوم 2,000 دينار.", CATALOGUE);
    expect(found.map((v) => v.rule)).toContain("UNSUPPORTED_DELIVERY");
  });

  it("rejects international delivery", () => {
    const found = findBusinessTruthViolations("يقدم AQUAVO شحناً إلى جميع أنحاء العالم.", CATALOGUE);
    expect(found.map((v) => v.rule)).toContain("UNSUPPORTED_DELIVERY");
  });
});

describe("business truth — the prompt carries the injected facts, not remembered ones", () => {
  it("states the invariants", () => {
    const prompt = businessTruthPrompt(CATALOGUE);
    expect(prompt).toContain("لا يبيع أسماكاً حية");
    expect(prompt).toContain("18 محافظة");
    expect(prompt).toContain("5,000");
    expect(prompt).toContain("لا توجد فروع");
  });

  it("lists the real categories so the model reads them instead of guessing", () => {
    const prompt = businessTruthPrompt(CATALOGUE);
    expect(prompt).toContain("الفلترة والتنقية");
    expect(prompt).toContain("معالجة المياه");
  });

  it("forbids availability claims outright when no catalogue was loaded", () => {
    expect(businessTruthPrompt(AQUAVO_INVARIANTS)).toContain("ممنوع ذكر توفر أي منتج");
  });

  it("tells the model the article is educational", () => {
    expect(BUSINESS_TRUTH_RULE).toContain("تعليمي");
  });
});
