import { describe, expect, it } from "vitest";

import { renderSeoPreviewShell, type SeoPreviewProduct } from "../../api/_seo-preview-shell";
import {
  CATEGORY_CHECKS_HEADING,
  CATEGORY_CONTENT,
  categoryContent,
} from "../../shared/category-content";
import { AQUAVO_PRODUCT_CATEGORIES } from "../../shared/seo-contract";

// The eleven category listings entered the sitemap carrying 24 words of prose
// each — and it was the same 24 words on all eleven, with only the category
// name substituted into "منتجات {category}". Eleven commercial landing pages,
// no unique content between them. These tests fail against that state.

const product = (category: string): SeoPreviewProduct =>
  ({ id: "1", slug: "p", name: "منتج", category, price: "1000", stock: 3 }) as SeoPreviewProduct;

const render = (category?: string) =>
  renderSeoPreviewShell({ kind: "products", products: [product(category ?? "أحواض")], category });

const textOf = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

describe("category content: every category has its own words", () => {
  it("covers exactly the eleven canonical categories", () => {
    expect(Object.keys(CATEGORY_CONTENT).sort()).toEqual([...AQUAVO_PRODUCT_CATEGORIES].sort());
  });

  it("gives every category an intro and a buying checklist", () => {
    for (const category of AQUAVO_PRODUCT_CATEGORIES) {
      const content = categoryContent(category);
      expect(content, `${category} has no content`).toBeDefined();
      expect(content!.intro.length, `${category} intro`).toBeGreaterThanOrEqual(2);
      expect(content!.checks.length, `${category} checks`).toBeGreaterThanOrEqual(3);
      expect(content!.metaDescription.length, `${category} description`).toBeGreaterThan(60);
    }
  });

  it("shares no sentence between two categories", () => {
    const seen = new Map<string, string>();
    for (const [category, content] of Object.entries(CATEGORY_CONTENT)) {
      for (const line of [...content.intro, ...content.checks, content.metaDescription]) {
        const previous = seen.get(line);
        expect(previous, `"${line.slice(0, 40)}" appears under ${previous} and ${category}`).toBeUndefined();
        seen.set(line, category);
      }
    }
  });

  it("resolves an English alias to the same content as the canonical value", () => {
    expect(categoryContent("filters")).toBe(categoryContent("الفلترة والتنقية"));
  });

  it("returns nothing for a category it was not written for", () => {
    expect(categoryContent("لا شيء")).toBeUndefined();
    expect(categoryContent(undefined)).toBeUndefined();
  });

  // The rule that keeps this honest: category-level guidance only. A price, a
  // wattage or a "we tested" claim here would be a specification nobody
  // established. The guides carry the figures.
  it("states no price, no specification and no testing claim", () => {
    const forbidden = [/\d+\s*واط/, /\d+\s*دينار/, /IQD/, /جربنا/, /اختبرنا/, /فحصنا منتجاتنا/, /مضمون/, /الأفضل بالعراق/];
    for (const [category, content] of Object.entries(CATEGORY_CONTENT)) {
      const all = [...content.intro, ...content.checks, content.metaDescription].join(" ");
      for (const pattern of forbidden) {
        expect(pattern.test(all), `${category} makes a claim it cannot support: ${pattern}`).toBe(false);
      }
    }
  });

  it("carries no emoji, per the AQUAVO content rule", () => {
    const decoration = new RegExp("[\\p{Extended_Pictographic}]", "u");
    for (const [category, content] of Object.entries(CATEGORY_CONTENT)) {
      const all = [...content.intro, ...content.checks, content.metaDescription].join(" ");
      expect(decoration.test(all), `${category} contains an emoji`).toBe(false);
    }
  });
});

describe("category listing: the content reaches the crawler", () => {
  it("renders the intro and the checklist on a category listing", () => {
    const html = render("الفلترة والتنقية");
    const content = categoryContent("الفلترة والتنقية")!;
    expect(html).toContain(CATEGORY_CHECKS_HEADING);
    for (const line of [...content.intro, ...content.checks]) {
      expect(textOf(html), `missing: ${line.slice(0, 40)}`).toContain(line);
    }
  });

  it("gives each category visibly different prose", () => {
    const a = textOf(render("طعام الأسماك"));
    const b = textOf(render("الإضاءة"));
    expect(a).not.toBe(b);
    for (const line of categoryContent("طعام الأسماك")!.checks) {
      expect(b).not.toContain(line);
    }
  });

  // Measured the way the live audit measured it: prose inside <main> with
  // the lists stripped, so a long product list cannot disguise a page that
  // says nothing. Live, every one of the eleven scored 24 words that way —
  // the identical template. Both measures are asserted, because the buying
  // checklist is real content and stripping every <ul> would hide it.
  it("lifts every category listing well past the 24-word template", () => {
    for (const category of AQUAVO_PRODUCT_CATEGORIES) {
      const html = render(category);
      const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? html;
      const count = (value: string) => textOf(value).split(/\s+/).filter(Boolean).length;
      const paragraphs = count(main.replace(/<ul[\s\S]*?<\/ul>/g, " "));
      const everything = count(main);
      expect(paragraphs, `${category} prose is still thin: ${paragraphs} words`).toBeGreaterThan(55);
      expect(everything, `${category} total is still thin: ${everything} words`).toBeGreaterThan(110);
    }
  });

  it("leaves the unfiltered /products listing alone", () => {
    const html = render(undefined);
    expect(html).not.toContain(CATEGORY_CHECKS_HEADING);
  });
});

describe("category listing: each category gets its own meta description", () => {
  it("gives no two categories the same description", () => {
    const all = AQUAVO_PRODUCT_CATEGORIES.map((c) => categoryContent(c)!.metaDescription);
    expect(new Set(all).size).toBe(all.length);
  });

  it("keeps every description inside a sensible snippet length", () => {
    for (const category of AQUAVO_PRODUCT_CATEGORIES) {
      const description = categoryContent(category)!.metaDescription;
      expect(description.length, `${category}: ${description.length} chars`).toBeLessThanOrEqual(200);
    }
  });

  it("names the category subject in its own description", () => {
    // A description that could sit under any of the eleven is the failure this
    // replaces, so each must at least mention what it is about.
    const subject: Record<string, string> = {
      "الفلترة والتنقية": "فلتر",
      "التحكم بالحرارة": "سخان",
      "الإضاءة": "إضاءة",
      "معالجة المياه": "كلور",
      "طعام الأسماك": "تغذية",
      "تربة وديكور": "ديكور",
      "التهوية والأكسجين": "هواء",
      "الصيانة والتنظيف": "صيانة",
      "العزل والتفريخ": "عزل",
      "الفحص والمراقبة": "فحص",
      "أحواض": "حوض",
    };
    for (const [category, word] of Object.entries(subject)) {
      expect(categoryContent(category)!.metaDescription, `${category} description is generic`).toContain(word);
    }
  });
});
