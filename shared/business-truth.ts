/**
 * AQUAVO business truth contract for generated Knowledge Center content.
 *
 * A corpus audit on 2026-09-02 found 38 corrections across 23 of 80 published
 * articles. None of them was a language defect; every one was a *business fact
 * asserted without a source*. The generator claimed AQUAVO supplied marine fish
 * with a one-year guarantee, listed corydoras and nerite snails as in stock,
 * invited readers to visit branches that do not exist, offered warranties "up
 * to 5 years", called itself the first professional aquarium store in Iraq
 * three separate times, and named a smart lighting controller, a sterilising
 * solution, backup pumps, cooling systems and a CO2 system that have zero
 * matches in the catalogue.
 *
 * The prompt already asked for none of that. Prompts are not a control, so this
 * is the control.
 *
 * ## The default
 *
 * A knowledge article may not assert anything about AQUAVO inventory, live
 * animals, plants, physical locations, warranties, guarantees, rankings,
 * imports, availability or delivery **unless that specific fact is supplied by
 * a verified current source**. Facts arrive through `BusinessFacts` — read from
 * the live catalogue and the checkout constants — rather than being recalled by
 * the model. A claim the injected facts do not support is a violation, and the
 * absence of injected facts makes *every* such claim a violation, which is the
 * safe direction: a generator that cannot see the catalogue must not talk about
 * the catalogue.
 *
 * ## Scope, and what this is not
 *
 * This does not replace or relax `shared/editorial-guard.ts`. That guard owns
 * external commercial referrals, named marketplaces and false physical
 * presence, and it keeps enforcing all of them; the generator runs both. Where
 * the two overlap the strictest answer wins, because both fail closed.
 *
 * Knowledge articles are educational. Nothing here requires an article to
 * mention AQUAVO at all, and the cheapest way to satisfy this contract is to
 * write the article without a sales block — which is what most of them should
 * have done.
 */

export type BusinessTruthViolation = {
  rule:
    | "LIVE_ANIMAL_OR_PLANT_SUPPLY"
    | "UNVERIFIED_AVAILABILITY"
    | "PHYSICAL_LOCATION"
    | "BLANKET_WARRANTY"
    | "UNSUPPORTED_RANKING"
    | "UNSUPPORTED_SOURCING"
    | "UNSUPPORTED_DELIVERY"
    | "INVENTED_SERVICE_PRACTICE";
  /** The sentence that tripped the rule. */
  evidence: string;
};

/**
 * The verified facts an article is allowed to rely on. Everything here is read
 * from an authoritative source at call time, never hardcoded prose:
 *
 * - `categories` / `productTerms` — the live catalogue (`/api/products`)
 * - `governorates` — `GOVERNORATES` in the checkout types
 * - `deliveryFeeIqd` / `deliveryWindow` — `client/src/lib/constants/shipping.ts`
 *
 * The booleans are invariants of the business, not of a snapshot: AQUAVO is an
 * online store that sells equipment and consumables. If that ever changes, the
 * change belongs here and in the tests, deliberately — not in an article.
 */
export type BusinessFacts = {
  categories: string[];
  productTerms: string[];
  governorates: number;
  deliveryFeeIqd: number;
  deliveryWindow: string;
  sellsLiveAnimals: boolean;
  sellsLivePlants: boolean;
  physicalStoreCount: number;
  /** Warranty is limited, per-product and opt-in. There is no store-wide one. */
  hasStoreWideWarranty: boolean;
};

/**
 * The invariants, with no catalogue attached. Used when a caller has not loaded
 * the catalogue: every availability claim then fails, which is intended.
 */
export const AQUAVO_INVARIANTS: BusinessFacts = {
  categories: [],
  productTerms: [],
  governorates: 18,
  deliveryFeeIqd: 5000,
  deliveryWindow: "24 ساعة",
  sellsLiveAnimals: false,
  sellsLivePlants: false,
  physicalStoreCount: 0,
  hasStoreWideWarranty: false,
};

/** Words that mark a sentence as being about AQUAVO rather than about fish. */
const ABOUT_AQUAVO =
  /AQUAVO|أكوافو|متجرنا|منتجاتنا|خدماتنا|شركتنا|لدينا|نوفر|نقدم|زبائننا|زباين/u;

/** Verbs and phrases that assert a thing can be obtained. */
const SUPPLY_VERB =
  /يوفر|توفر|نوفر|يقدم|تقدم|نقدم|يبيع|تبيع|نبيع|متوفر|متوفرة|متاح|متاحة|تباع|يباع|الحصول علي?ها|احصل|اشتر|شراء|يشمل|تشمل/u;

/** Live animals and plants. AQUAVO sells neither, in any catalogue snapshot. */
const LIVE_STOCK =
  /أسماك حية|سمك حي|أسماك زينة حية|نباتات مائية|نباتات حية|حلزونات|حلزون|روبيان حي|سلاحف|أسماك مالحة|الأسماك المالحة|تسليم الأسماك|توصيل الأسماك|بيع الأسماك|متاجر الأسماك/u;

/**
 * AQUAVO itself doing the supplying: a first-person supply verb, an
 * availability phrase pointing at the store, or a delivery-of-fish claim.
 */
const AQUAVO_SUPPLIES =
  /نوفر|نبيع|نقدم لك|يوفر(?:ها)? AQUAVO|توفر(?:ها)? AQUAVO|AQUAVO[^.]{0,40}(?:يوفر|توفر|يبيع|تبيع|يقدم|تقدم)|(?:متوفرة?|متاحة?|تباع|يباع)[^.]{0,30}(?:في |لدى )(?:AQUAVO|أكوافو|متجرنا)|تسليم الأسماك|توصيل الأسماك|بيع الأسماك|متاجر الأسماك/u;

/** A physical place a reader could walk into. */
const PHYSICAL_LOCATION =
  /فروعنا|فروعها|أحد فروع|فرع لنا|محلنا|معرضنا|صالة العرض|زورونا|زيارة المتجر|زيارة المحل|في محلاتنا/u;

/**
 * Warranty language that reaches past a single named product.
 *
 * `ضمان` is a false friend: as a masdar it is ordinary Arabic for "ensuring",
 * and the corpus uses it that way constantly — "لضمان حياة صحية للأسماك",
 * "وضمان تغيير الماء بانتظام". Only the noun is a warranty claim. The plural
 * `ضمانات` is always the noun; the singular counts only when it is not carrying
 * the ل- or و- prefix that makes it a purpose clause.
 */
const WARRANTY_WORD = /ضمانات|كفالة|(?<![لو])ضمان(?![ا])/u;

/**
 * ...and it has to be *offered*. "ضمان توافر مياه نقية لأسماكك" is a masdar in
 * a list of husbandry steps; "نقدم ضمانات" and "مدعومة بضمانات" are offers.
 * Requiring the offer is what separates the two without banning the word.
 */
const WARRANTY_OFFER =
  /(?:نقدم|نوفر|يوفر|توفر|تقدم|يقدم|لدينا|مدعومة ب|مدعوم ب|مع وجود|يشمل|تشمل|وخدمات|خدمات و|مع)[^.]{0,20}?(?:ال)?(?:ضمانات|ضمان|كفالة)|(?:ضمانات|ضمان|كفالة)[^.]{0,10}?(?:على|لجميع|لكل|طويل|مطول|شامل)/u;
const WARRANTY_SCOPE =
  /جميع المنتجات|كل المنتجات|لجميع|على منتجاتنا|شامل|طويلة الأجل|مطولة|لمدة عام|لمدة سنة|\d+\s*سنوات|صحي|عالية الجودة/u;

/** Rankings and firsts. */
const RANKING =
  /أفضل وأكبر|أكبر متجر|أفضل متجر|أول متجر|المتجر الأول|المورد الأول|الخيار الأول|رائدة|الرائد|الرائدة|الأول والرئيسي|رقم واحد|رقم ١|الوحيد في العراق|أعرق/u;

/** Provenance claims. */
const SOURCING =
  /مستوردة? من أفضل|مستوردة? من جميع أنحاء|مستوردة? من الخارج|من أفضل المصانع|من أفضل الشركات|المصرح بها ومستوردة/u;

/** Services AQUAVO does not document performing. */
const SERVICE_PRACTICE =
  /نقوم بالحجر الصحي|حجر صحي لأسماكنا|نفحص الأسماك|نعالج الأسماك|مزرعتنا|نربي الأسماك|يضمن AQUAVO جودة مياه|نضمن جودة مياه الصنبور/u;

/** Sentence splitter that respects Arabic punctuation and block markup. */
function sentences(html: string): string[] {
  return html
    .replace(/<(?:br|\/p|\/li|\/h[1-6]|\/blockquote|\/td)[^>]*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-zA-Z#0-9]+;/g, " ")
    .split(/(?<=[.؟!])\s+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 0);
}

/** True when the sentence is asking rather than asserting. */
function isQuestion(sentence: string): boolean {
  return /[؟?]\s*$/.test(sentence);
}

/**
 * A delivery claim is verified only if the numbers in it match the injected
 * facts. "18 محافظة" passes because `GOVERNORATES` really has 18 entries;
 * "جميع أنحاء العالم" or "خلال ساعة" does not.
 */
function deliveryClaimIsSupported(sentence: string, facts: BusinessFacts): boolean {
  const governorateCount = sentence.match(/(\d+)\s*محافظة/u);
  if (governorateCount && Number(governorateCount[1]) !== facts.governorates) return false;
  if (/عالمي|خارج العراق|دولي|جميع أنحاء العالم/u.test(sentence)) return false;
  const fee = sentence.match(/(\d[\d,]*)\s*(?:دينار|د\.ع)/u);
  if (fee && Number(fee[1].replace(/,/g, "")) !== facts.deliveryFeeIqd) return false;
  return true;
}

/**
 * Returns every business-truth violation in `html`. Empty array means clean.
 *
 * `facts` defaults to the invariants with an empty catalogue, so a caller that
 * has not loaded the catalogue cannot accidentally pass an availability claim.
 */
export function findBusinessTruthViolations(
  html: string | null | undefined,
  facts: BusinessFacts = AQUAVO_INVARIANTS,
): BusinessTruthViolation[] {
  if (typeof html !== "string" || html.length === 0) return [];
  const violations: BusinessTruthViolation[] = [];

  for (const sentence of sentences(html)) {
    if (isQuestion(sentence)) continue;
    const aboutAquavo = ABOUT_AQUAVO.test(sentence);

    // Live animals and plants: a violation whenever the sentence ties AQUAVO to
    // supplying them. Husbandry advice that merely mentions plants is fine —
    // the article may tell a reader to add plants, it may not say we sell them.
    // The supply has to be AQUAVO's, not merely mentioned in a sentence that
    // happens to name AQUAVO. "اختيار الأسماك من مورد مختص" is advice about
    // choosing a supplier and stays legal; "نوفر الأسماك" and "متوفرة في
    // أكوافو" are the claim.
    if (LIVE_STOCK.test(sentence) && AQUAVO_SUPPLIES.test(sentence) && !facts.sellsLiveAnimals) {
      violations.push({ rule: "LIVE_ANIMAL_OR_PLANT_SUPPLY", evidence: sentence });
    }

    if (PHYSICAL_LOCATION.test(sentence) && facts.physicalStoreCount === 0) {
      violations.push({ rule: "PHYSICAL_LOCATION", evidence: sentence });
    }

    if (
      WARRANTY_WORD.test(sentence) &&
      WARRANTY_OFFER.test(sentence) &&
      WARRANTY_SCOPE.test(sentence) &&
      aboutAquavo &&
      !facts.hasStoreWideWarranty
    ) {
      violations.push({ rule: "BLANKET_WARRANTY", evidence: sentence });
    }

    if (RANKING.test(sentence) && aboutAquavo) {
      violations.push({ rule: "UNSUPPORTED_RANKING", evidence: sentence });
    }

    if (SOURCING.test(sentence)) {
      violations.push({ rule: "UNSUPPORTED_SOURCING", evidence: sentence });
    }

    if (SERVICE_PRACTICE.test(sentence)) {
      violations.push({ rule: "INVENTED_SERVICE_PRACTICE", evidence: sentence });
    }

    if (aboutAquavo && /توصيل|تسليم|شحن/u.test(sentence) && !deliveryClaimIsSupported(sentence, facts)) {
      violations.push({ rule: "UNSUPPORTED_DELIVERY", evidence: sentence });
    }

    // Availability of a specific thing. Only the injected catalogue can clear
    // this, so with no catalogue loaded every such claim fails.
    if (aboutAquavo && SUPPLY_VERB.test(sentence)) {
      // Check the product the sentence actually names, not merely whether some
      // catalogue word appears somewhere in it: "لأحواض النباتات" contains the
      // category "أحواض" and would otherwise clear a claim about a CO2 system.
      const named = namedProduct(sentence);
      if (named !== null && !catalogueCovers(named, facts)) {
        violations.push({ rule: "UNVERIFIED_AVAILABILITY", evidence: sentence });
      }
    }
  }

  return violations;
}

/**
 * Concrete product nouns. A sentence saying AQUAVO "offers a wide range" is
 * vague marketing, not a checkable claim; a sentence naming a CO2 system or a
 * smart controller is, and those are the ones the audit found invented.
 */
const SPECIFIC_PRODUCT =
  /نظام ثاني أكسيد الكربون|ثاني أكسيد الكربون|شاشة التحكم|جهاز تحكم|محلول التعقيم|معقم|أنظمة التبريد|مبرد|مضخات احتياطية|مضخة احتياطية|أدوية|دواء|علاج|سخان|فلتر|مضخة|إضاءة|تربة|رمل|طعام|علف|اختبار|شرائط فحص|سيفون|مكنسة|بكتيريا|معالج مياه|مزيل كلور/u;

/** The specific product a sentence names, or null if it names none. */
function namedProduct(sentence: string): string | null {
  const match = sentence.match(SPECIFIC_PRODUCT);
  return match ? match[0] : null;
}

/**
 * True when the injected catalogue covers the named product. Matching runs
 * both ways so that "معالج مياه" clears a catalogue term of "معالج مياه"
 * and a sentence naming "فلتر" clears the "الفلترة والتنقية" category, while
 * "نظام ثاني أكسيد الكربون" clears nothing because nothing carries it.
 */
function catalogueCovers(named: string, facts: BusinessFacts): boolean {
  return facts.productTerms
    .concat(facts.categories)
    .some((term) => term.length > 2 && (term.includes(named) || named.includes(term)));
}

/**
 * Builds the injected fact block for the generator prompt. Passing the real
 * catalogue in is the point of the whole module: the model should be reading
 * these, not remembering them.
 */
export function businessTruthPrompt(facts: BusinessFacts): string {
  const lines = [
    "حقائق AQUAVO المتحقَّقة — لا تكتب أي معلومة عن المتجر خارج هذه القائمة:",
    `- المتجر إلكتروني فقط: لا توجد فروع ولا صالات عرض (${facts.physicalStoreCount} فرع).`,
    "- AQUAVO لا يبيع أسماكاً حية ولا نباتات حية ولا أي كائن حي.",
    `- التوصيل إلى ${facts.governorates} محافظة برسوم ثابتة ${facts.deliveryFeeIqd.toLocaleString("en-US")} دينار خلال ${facts.deliveryWindow}.`,
    "- لا يوجد ضمان شامل على المتجر. الضمان محدود ويظهر فقط على صفحة المنتج الذي يذكره.",
    "- ممنوع أي ادعاء بالأفضلية أو الأولوية أو الريادة في العراق.",
    "- ممنوع أي ادعاء عن مصدر الاستيراد.",
  ];
  if (facts.categories.length > 0) {
    lines.push(`- الأقسام المتوفرة فعلاً: ${facts.categories.join("، ")}.`);
    lines.push("- ممنوع ذكر أي منتج أو قسم غير موجود في هذه القائمة.");
  } else {
    lines.push("- لم تُحمَّل قائمة المنتجات، لذلك ممنوع ذكر توفر أي منتج إطلاقاً.");
  }
  lines.push("- المقال تعليمي: لا تضف فقرة ترويجية إلا إذا طُلبت صراحة.");
  return lines.join("\n");
}

/** Short prompt-side statement, for callers that only want one line. */
export const BUSINESS_TRUTH_RULE = [
  "ممنوع ذكر أي حقيقة عن متجر AQUAVO (المخزون، التوفر، الفروع، الضمان، التوصيل، الاستيراد، الأفضلية) إلا إذا كانت مذكورة حرفياً في قائمة الحقائق المتحقَّقة.",
  "AQUAVO متجر إلكتروني لمستلزمات الأحواض فقط: لا أسماك حية ولا نباتات حية ولا فروع.",
  "المقال تعليمي بالدرجة الأولى، ولا يحتاج فقرة مبيعات.",
].join(" ");
