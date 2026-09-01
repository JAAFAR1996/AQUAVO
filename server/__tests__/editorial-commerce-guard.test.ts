import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  EDITORIAL_COMMERCE_RULE,
  findEditorialViolations,
} from "../../shared/editorial-guard";

// An article shipped this to readers, in AQUAVO's own editorial voice:
//
//   "نصيحة ذهبية من AQUAVO: … ولذلك ننصح بزيارة سوق الغزل في بغداد لشراء أفضل
//    أنواع الأسماك والنباتات"
//
// AQUAVO sending its readers to a competing market to buy what AQUAVO sells.
// A corpus scan found the same shape in fourteen more articles, plus articles
// claiming AQUAVO stocks live fish, live plants and CO2 systems — none of which
// are in the catalogue — and articles claiming AQUAVO has a stall at that
// market, when it has no physical shop at all.

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("external commercial referrals are refused", () => {
  it("catches the sentence that prompted this rule", () => {
    const v = findEditorialViolations(
      "<p>نصيحة ذهبية من AQUAVO: يجب اختيار المكونات المناسبة، ولذلك ننصح بزيارة سوق الغزل في بغداد لشراء أفضل أنواع الأسماك والنباتات.</p>",
    );
    expect(v.length).toBeGreaterThan(0);
    expect(["NAMED_EXTERNAL_MARKETPLACE", "EXTERNAL_COMMERCIAL_REFERRAL"]).toContain(v[0].rule);
  });

  it("detects intent, not just a list of shop names", () => {
    // No named market anywhere — an action plus a generic external destination.
    for (const sentence of [
      "<p>يمكنك شراء الفلتر من المحلات المحلية في مدينتك.</p>",
      "<p>ننصح بزيارة محلات الأسماك القريبة منك للحصول على الصخور.</p>",
      "<p>تجدها في متجر آخر بسعر أرخص.</p>",
      "<p>يمكنك العثور على بائعين محليين يقدمون هذه الحلول.</p>",
    ]) {
      expect(findEditorialViolations(sentence), sentence).not.toHaveLength(0);
    }
  });

  it("refuses a named marketplace even without a purchase verb", () => {
    // There is no reading of "سوق الغزل" in an AQUAVO article that is not
    // pointing somewhere to shop.
    expect(findEditorialViolations("<p>في سوق الغزل تجد أنواعاً كثيرة من الصخور.</p>")).not.toHaveLength(0);
    expect(findEditorialViolations("<p>أسعار AliExpress أرخص عادة.</p>")).not.toHaveLength(0);
  });

  it("allows a comparison article to name a competitor, but not to refer to it", () => {
    const comparison = "<p>AQUAVO مقابل المتاجر المحلية وسوق الغزل — لماذا التسوق أونلاين أفضل.</p>";
    expect(findEditorialViolations(comparison, { allowComparison: true })).toHaveLength(0);
    // The exemption does not extend to actually sending the reader there.
    expect(
      findEditorialViolations("<p>يمكنك شراء سمكة الأروانا من سوق الغزل.</p>", { allowComparison: true }),
    ).not.toHaveLength(0);
  });
});

describe("availability is never invented", () => {
  // Verified against the live catalogue: 112 products across 11 categories,
  // with no live fish, no live plants, no artificial plants and no CO2 systems.
  it("refuses claims that AQUAVO stocks what it does not carry", () => {
    for (const sentence of [
      "<p>في AQUAVO، نوفر لك مجموعة واسعة من الأسماك الحية.</p>",
      "<p>يمكنك الحصول على نظام ثاني أكسيد الكربون من متجر AQUAVO.</p>",
      "<p>النباتات الصناعية من متجر AQUAVO بديل ممتاز.</p>",
      "<p>في AQUAVO نقدم لك مجموعة من النباتات المائية.</p>",
    ]) {
      const v = findEditorialViolations(sentence);
      expect(v.map((x) => x.rule), sentence).toContain("FALSE_AVAILABILITY");
    }
  });

  it("leaves true availability alone", () => {
    // AQUAVO does sell Catappa leaves, heaters, filter media and bacteria.
    for (const sentence of [
      "<p>أوراق الكاتابا (اللوز الهندي) متوفرة في AQUAVO.</p>",
      "<p>يمكنك الحصول على سخان بقدرة مناسبة من متجر AQUAVO.</p>",
      "<p>في AQUAVO نوفر بكتيريا نافعة جاهزة للأحواض.</p>",
    ]) {
      expect(findEditorialViolations(sentence), sentence).toHaveLength(0);
    }
  });
});

describe("AQUAVO has no physical shop, and no article may say it does", () => {
  it("refuses an invitation to visit a shop that does not exist", () => {
    for (const sentence of [
      "<p>زورونا في سوق الغزل أو عبر موقعنا الإلكتروني.</p>",
      "<p>يمكنك زيارة متجرنا في سوق الغزل أو عبر الإنترنت.</p>",
      "<p>كما يمكنهم زيارة متجرهم في سوق الغزل للاطلاع على المنتجات.</p>",
      "<p>يتميز AQUAVO بخدمة التوصيل السريعة، وفرع متوفر في 18 محافظة.</p>",
    ]) {
      const rules = findEditorialViolations(sentence).map((v) => v.rule);
      expect(rules, sentence).toContain("FALSE_PHYSICAL_PRESENCE");
    }
  });

  it("leaves online delivery claims alone", () => {
    expect(
      findEditorialViolations("<p>نوصل طلبك إلى جميع المحافظات عبر متجرنا الإلكتروني.</p>"),
    ).toHaveLength(0);
  });
});

describe("legitimate content is not flagged", () => {
  it("does not mistake the Amazon basin or the Amazon sword for a marketplace", () => {
    for (const sentence of [
      "<p>تعيش هذه الأسماك في نهر الأمازون في أمريكا الجنوبية.</p>",
      "<p>نبات الأمازون سورد يحتاج إلى ضوء ساطع.</p>",
      "<p>حوض بيوتوب يحاكي غابات الأمازون.</p>",
    ]) {
      expect(findEditorialViolations(sentence), sentence).toHaveLength(0);
    }
  });

  it("keeps scientific and manufacturer references", () => {
    const html =
      '<p>راجع <a href="https://www.fishbase.se/summary/Betta-splendens.html">FishBase</a> ' +
      'و<a href="https://www.epa.gov/ground-water-and-drinking-water">EPA</a> للتفاصيل.</p>';
    expect(findEditorialViolations(html)).toHaveLength(0);
  });

  it("keeps AQUAVO's own links and social accounts", () => {
    const html =
      '<p><a href="https://www.aquavoiq.com/products">منتجاتنا</a> ' +
      '<a href="https://www.instagram.com/aquavo_iq/">إنستغرام</a></p>';
    expect(findEditorialViolations(html)).toHaveLength(0);
  });

  it("refuses an outbound link to somewhere a reader can buy", () => {
    const html = '<p><a href="https://www.amazon.ae/dp/B01">اشترِ من هنا</a></p>';
    expect(findEditorialViolations(html).map((v) => v.rule)).toContain("EXTERNAL_COMMERCIAL_LINK");
  });
});

describe("the generator cannot persist a violating article", () => {
  it("runs the guard before saving, and states the rule in its prompt", () => {
    const src = read("server/services/auto-blog-generator.ts");
    expect(src).toContain("findEditorialViolations");
    expect(src).toContain("BLOG_CONTENT_EDITORIAL_VIOLATION");
    // The prompt carries the same rule text the guard enforces, from one source.
    expect(src).toContain("EDITORIAL_COMMERCE_RULE");
    expect(src).toContain("سوق الغزل");
    // The guard must run inside the validator, not after the insert.
    const validatorStart = src.indexOf("function validateGeneratedBlogData");
    const saveStart = src.indexOf("async function saveBlogToDatabase");
    const guardAt = src.indexOf("findEditorialViolations(content)");
    expect(guardAt).toBeGreaterThan(validatorStart);
    expect(guardAt).toBeLessThan(saveStart);
  });

  it("tells the chat assistant the same thing", () => {
    const src = read("server/services/gemini-ai.ts");
    expect(src).toContain("النزاهة التجارية");
    expect(src.match(/النزاهة التجارية/g) ?? []).toHaveLength(2); // both system prompts
    expect(src).toContain("ما يبيع اسماك حية");
  });

  it("states the rule once, in words a reviewer can apply", () => {
    expect(EDITORIAL_COMMERCE_RULE).toContain("never recommend purchasing from another retailer");
    expect(EDITORIAL_COMMERCE_RULE).toContain("Never invent");
  });
});

describe("repo-backed educational content is clean", () => {
  // The blog bodies live in Neon and are corrected by a separate data migration.
  // Everything the repository itself ships is held clean here.
  const files = [
    "client/src/data/blog-articles.ts",
    "shared/faq-content.ts",
    "shared/category-content.ts",
    "api/_seo-content.ts",
    "api/_guides-content.ts",
  ];

  for (const file of files) {
    it(`${file} contains no external commercial referral`, () => {
      const violations = findEditorialViolations(read(file));
      expect(
        violations.map((v) => `${v.rule}: ${v.evidence.slice(0, 120)}`),
      ).toEqual([]);
    });
  }
});
