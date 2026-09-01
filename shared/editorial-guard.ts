/**
 * Editorial guard for AQUAVO knowledge-centre content.
 *
 * An article shipped this sentence to readers:
 *
 *   "نصيحة ذهبية من AQUAVO: … ولذلك ننصح بزيارة سوق الغزل في بغداد لشراء أفضل
 *    أنواع الأسماك والنباتات"
 *
 * — AQUAVO's own editorial voice sending its readers to a competing market to
 * buy the things AQUAVO exists to sell. A corpus scan found the same pattern in
 * fourteen more articles, plus two related failures: articles claiming AQUAVO
 * stocks goods it does not carry, and articles claiming AQUAVO has a stall at
 * that market.
 *
 * The cause was the generator prompt. It cast the model as "خبير أحواض سمك
 * عراقي" and never said where a reader may be sent, nor what AQUAVO sells, so
 * the model reached for Baghdad's best-known fish market and invented stock to
 * go with it. A prompt rule alone would not be enough — a prompt is a request,
 * not a constraint — so this module is the constraint, and the generator
 * refuses to persist an article that trips it.
 *
 * It detects intent, not a list of shop names: a purchase or visit action
 * standing near an external commercial destination. A blacklist would be
 * defeated by the next market anyone names.
 */

export type EditorialViolation = {
  rule:
    | "EXTERNAL_COMMERCIAL_REFERRAL"
    | "NAMED_EXTERNAL_MARKETPLACE"
    | "FALSE_AVAILABILITY"
    | "FALSE_PHYSICAL_PRESENCE"
    | "EXTERNAL_COMMERCIAL_LINK";
  /** The sentence, or the URL, that tripped the rule. */
  evidence: string;
};

/**
 * Marketplaces, markets and seller channels that are not AQUAVO. Naming one of
 * these in editorial content is a violation on its own: there is no reading of
 * "سوق الغزل" in an AQUAVO article that is not pointing at somewhere to shop.
 *
 * A comparison article may still name a competitor — see `allowComparison`.
 */
const NAMED_EXTERNAL_MARKETPLACE = [
  "سوق الغزل",
  "سوق الشورجة",
  "الشورجة",
  "OpenSooq",
  "السوق المفتوح",
  "AliExpress",
  "علي إكسبرس",
  "eBay",
  "Alibaba",
  "علي بابا",
  "Shein",
  "Temu",
];

/**
 * Generic external commercial destinations. These are only a violation next to
 * a purchase or visit action, because a sentence may legitimately mention that
 * shops exist without sending anyone to one.
 */
const GENERIC_EXTERNAL_DESTINATION = [
  "محل آخر",
  "متجر آخر",
  "متاجر أخرى",
  "محلات أخرى",
  "الأسواق المحلية",
  "أسواقنا المحلية",
  "السوق المحلي",
  "الأسواق الشعبية",
  "المحلات المحلية",
  "المتاجر المحلية",
  "محلات الأسماك",
  "محل الأسماك",
  "محلات الحيوانات",
  "بائعين محليين",
  "باعة محليين",
  "بائعي",
  "pet shop",
  "petshop",
];

/** Buying, ordering and visiting. The action half of the intent test. */
const PURCHASE_ACTION = [
  "اشتر",
  "اشتري",
  "تشتري",
  "شراء",
  "شرائها",
  "شرائه",
  "اطلب",
  "احصل على",
  "تحصل على",
  "يمكنك الحصول",
  "زيارة",
  "زورونا",
  "زوروا",
  "زر ",
  "توجه إلى",
  "اذهب إلى",
  "ابحث في",
  "تجدها في",
  "تجده في",
  "يمكن العثور",
  "يمكنك العثور",
  "متوفر في",
  "تتوفر في",
  "ننصح بزيارة",
  "نوصي بزيارة",
];

/**
 * Goods AQUAVO does not sell, so no article may say it supplies them.
 *
 * Verified against the live catalogue (112 products, 11 categories): no live
 * fish, no live plants, no artificial plants and no CO2 systems. AQUAVO sells
 * equipment, media, food, treatments, substrate, decor and hardware.
 *
 * This is the "never invent availability" rule in executable form. It is
 * deliberately narrow — it names only what has been checked — so it does not
 * grow into a filter that flags every mention of the shop.
 */
const GOODS_AQUAVO_DOES_NOT_SELL: readonly RegExp[] = [
  // Arabic attaches the definite article, so "أسماك حية" and "الأسماك الحية"
  // are the same claim. Matching plain substrings missed the second form.
  /(?:ال)?أسماك\s+(?:ال)?حية/,
  /(?:ال)?سمكة\s+(?:ال)?حية/,
  /(?:ال)?نباتات\s+(?:ال)?حية/,
  /(?:ال)?نباتات\s+(?:ال)?طبيعية/,
  /(?:ال)?نبات\s+(?:ال)?طبيعي/,
  /(?:ال)?نباتات\s+(?:ال)?صناعية/,
  /(?:ال)?نباتات\s+(?:ال)?مائية/,
  // Safe to include only because availability now needs a supply verb next to
  // it: "أسماك الزينة" is the subject of the whole site, and matching it on its
  // own flagged every article that named its own topic.
  /(?:ال)?أسماك\s+(?:ال)?زينة/,
  /نظام\s+ثاني\s+أكسيد\s+الكربون/,
  /أنظمة\s+ثاني\s+أكسيد\s+الكربون/,
  /CO2/i,
];

/**
 * A sentence that says AQUAVO does *not* sell something is the rule being
 * obeyed, not broken. /_seo-content.ts carries exactly this disclaimer —
 * "AQUAVO يوفر معدات ومستلزمات أحواض الزينة، ولا يبيع أسماكاً حية" — and an
 * availability check that cannot read a negation would flag the one sentence
 * in the corpus that states the truth plainly.
 */
// A question is not a claim. Anchoring to the start or end of the sentence is
// too strict: this also scans .ts sources, where an FAQ entry arrives wrapped
// in code punctuation (q: "هل AQUAVO يبيع أسماك حية؟",). A sentence carrying a
// question marker anywhere is asking, not asserting.
const INTERROGATIVE = [
  /(?:^|\s)هل\s/,
  /؟/,
];

const NEGATED_SUPPLY = [
  /لا\s+(?:ي|ت|ن)بيع/,
  /لا\s+(?:ي|ت|ن)وفر/,
  /لا\s+(?:ي|ت|ن)قدم/,
  /غير\s+متوفر/,
  /لا\s+نبيع/,
  /ليس\s+لدينا/,
  /لا\s+يتوفر/,
];

/**
 * AQUAVO is an online shop. It has no branch, no counter and no stall, so an
 * article inviting a reader to come and see one is describing a place that does
 * not exist. Five articles did — several of them placing that imaginary shop
 * inside سوق الغزل, the competing market — and one claimed a branch in all
 * eighteen governorates.
 */
const FALSE_PHYSICAL_PRESENCE = [
  /زورونا\s+في/,
  /زوروا\s+[^.]{0,20}(?:سوق|محل|فرع)/,
  /(?:زيارة\s+)?متجرنا\s+في/,
  /(?:زيارة\s+)?متجرهم\s+في/,
  /فرع\s+متوفر/,
  /فروع(?:نا)?\s+في/,
  /لدينا\s+فرع/,
  /معرضنا/,
  /تعال\s+إلى\s+(?:المحل|المتجر)/,
];

/**
 * Ways an article says AQUAVO *supplies* something. A bare "في AQUAVO" is not
 * enough: the site's whole subject is ornamental fish, so an article saying
 * "أسماك الزينة" is naming its topic, not claiming stock. The claim needs a
 * supply verb with the goods close behind it.
 */
const AQUAVO_MENTION = /AQUAVO|أكوافو/;

const SUPPLY_VERB = /(?:نوفر|يوفر|توفر|نبيع|يبيع|تبيع|نقدم|يقدم|تقدم|الحصول على|احصل على|شراء|اشتر)/g;

/**
 * What a supply verb is actually offering, when it is not goods. "نقدم لكم
 * معلومات" and "نوفر لك الخبرة" are not availability claims, and treating them
 * as such flagged the one sentence in fin-rot-treatment-guide that is pure
 * teaching.
 */
const NON_GOODS_OBJECT = /معلومات|نصائح|شرح|الخبرة|خبرة|الجودة|الموثوقية|الحلول|حلول|الدعم|خدمات|الخدمات|بيئة|تجربة|ضمان/;

/** Characters between the supply verb and the goods for the claim to be one. */
const SUPPLY_PROXIMITY = 45;

/**
 * The other direction: the goods come first and AQUAVO is named as the source —
 * "النباتات الصناعية من متجر AQUAVO". Same claim, opposite word order.
 */
const SOURCED_FROM_AQUAVO = /(?:من|لدى|في)\s+(?:متجر\s+)?(?:AQUAVO|أكوافو)/;

/**
 * Many tips open "نصيحة ذهبية من AQUAVO:". That is a byline on the advice, not
 * a claim about stock, and counting it as an AQUAVO mention made every branded
 * tip that happened to say "أسماك الزينة" look like an availability claim.
 */
const TIP_BYLINE = /^\s*نصيحة\s+ذهبية\s+من\s+(?:AQUAVO|أكوافو)\s*:?/;

function claimsAvailability(rawSentence: string, goods: readonly RegExp[]): boolean {
  const sentence = rawSentence.replace(TIP_BYLINE, " ");
  if (!AQUAVO_MENTION.test(sentence)) return false;

  for (const re of goods) {
    const m = re.exec(sentence);
    if (!m) continue;
    const after = sentence.slice(m.index + m[0].length, m.index + m[0].length + 30);
    if (SOURCED_FROM_AQUAVO.test(after)) return true;
  }

  SUPPLY_VERB.lastIndex = 0;
  for (let m = SUPPLY_VERB.exec(sentence); m; m = SUPPLY_VERB.exec(sentence)) {
    const after = sentence.slice(m.index + m[0].length, m.index + m[0].length + SUPPLY_PROXIMITY);
    if (!goods.some((re) => re.test(after))) continue;
    // "نوفر لك الخبرة … في تربية الأسماك" offers expertise, not fish.
    const upToGoods = after.slice(0, after.search(goods.find((re) => re.test(after))!));
    if (NON_GOODS_OBJECT.test(upToGoods)) continue;
    return true;
  }
  return false;
}


/**
 * Mentions that are not commercial destinations even though they share a word
 * with one. The Amazon basin and the Amazon sword plant are not a marketplace,
 * and a labour market is not a fish market.
 */
const NOT_A_DESTINATION = [
  "نهر الأمازون",
  "غابات الأمازون",
  "أمازون سورد",
  "الأمازون سورد",
  "Amazon Sword",
  "حوض الأمازون",
  "منطقة الأمازون",
  "سوق العمل",
  "دراسة السوق",
];

const has = (haystack: string, needles: readonly string[]): string | null => {
  const lower = haystack.toLowerCase();
  for (const n of needles) {
    if (lower.includes(n.toLowerCase())) return n;
  }
  return null;
};

/** Split into sentences, so intent is judged inside one thought. */
export function editorialSentences(text: string): string[] {
  const plain = text
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ");
  return plain
    .split(/(?<=[.!?؟])\s+|\n+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export type EditorialGuardOptions = {
  /**
   * Allow a named competitor to appear, for the handful of articles whose
   * subject genuinely is the comparison ("AQUAVO مقابل المتاجر المحلية").
   * Purchase referrals and false availability are still refused.
   */
  allowComparison?: boolean;
};

/**
 * Every editorial rule this content breaks. Empty means it passes.
 */
export function findEditorialViolations(
  html: string | null | undefined,
  options: EditorialGuardOptions = {},
): EditorialViolation[] {
  if (typeof html !== "string" || !html.trim()) return [];
  const violations: EditorialViolation[] = [];

  for (const sentence of editorialSentences(html)) {
    if (sentence.length > 800) continue;

    const exempt = has(sentence, NOT_A_DESTINATION);
    // A question is not a claim, and it is not a referral either.
    const asking = INTERROGATIVE.some((re) => re.test(sentence));

    const named = has(sentence, NAMED_EXTERNAL_MARKETPLACE);
    const generic = has(sentence, GENERIC_EXTERNAL_DESTINATION);
    const action = has(sentence, PURCHASE_ACTION);

    // Each rule is judged independently: one sentence can break several, and a
    // reviewer needs to see all of them rather than only the first.
    if (named && !exempt && !asking && !options.allowComparison) {
      violations.push({ rule: "NAMED_EXTERNAL_MARKETPLACE", evidence: sentence });
    }

    // Intent: an action standing next to an external commercial destination.
    // Reported separately from the bare name so a sentence that only mentions a
    // market is distinguishable from one that sends the reader to it.
    // A named market counts here too: the comparison exemption excuses naming a
    // competitor, never sending a reader to one to buy something.
    // A comparison article exists to weigh local shops against buying online, so
    // it must be able to say "الأسواق الشعبية" while arguing against them. It
    // still may not point at a specific named market.
    const destination = options.allowComparison ? named : generic || named;
    if (action && destination && !exempt && !asking) {
      violations.push({ rule: "EXTERNAL_COMMERCIAL_REFERRAL", evidence: sentence });
    }

    // Availability AQUAVO cannot honour — unless the sentence is denying it.
    const denied = NEGATED_SUPPLY.some((re) => re.test(sentence));
    if (claimsAvailability(sentence, GOODS_AQUAVO_DOES_NOT_SELL) && !denied && !asking) {
      violations.push({ rule: "FALSE_AVAILABILITY", evidence: sentence });
    }

    if (!asking && FALSE_PHYSICAL_PRESENCE.some((re) => re.test(sentence))) {
      violations.push({ rule: "FALSE_PHYSICAL_PRESENCE", evidence: sentence });
    }
  }

  // Outbound links to somewhere a reader can buy. First-party AQUAVO links and
  // AQUAVO's own social accounts are not referrals.
  // exec in a loop rather than matchAll: the root tsconfig sets no `target`, so
  // it defaults low enough that tsc rejects iterating a RegExp iterator
  // (TS2802). Same constraint documented in shared/author-name.ts.
  const hrefPattern = /href=["']([^"']+)["']/gi;
  for (let match = hrefPattern.exec(html); match; match = hrefPattern.exec(html)) {
    const url = match[1];
    if (!/^https?:/i.test(url)) continue;
    if (/aquavoiq\.com/i.test(url)) continue;
    if (/instagram\.com\/aquavo_iq/i.test(url)) continue;
    if (
      /(amazon|aliexpress|ebay|noon|opensooq|alibaba|shein|temu|daraz|jumia)\./i.test(url) ||
      /\/(shop|store|product|cart|checkout|buy)\b/i.test(url)
    ) {
      violations.push({ rule: "EXTERNAL_COMMERCIAL_LINK", evidence: url });
    }
  }

  return violations;
}

/** The rule, in the words the generator prompt and the reviewers both use. */
export const EDITORIAL_COMMERCE_RULE = [
  "AQUAVO editorial content must never recommend purchasing from another retailer,",
  "shop, marketplace, market, seller, competitor, Facebook/Instagram seller, or",
  "commercial destination.",
  "If AQUAVO does not sell the referenced item, remain educational. Never invent",
  "availability and never route the customer to a competitor.",
].join(" ");
