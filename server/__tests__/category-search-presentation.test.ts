import { describe, expect, it } from "vitest";
import { CATEGORY_SEARCH, categoryFaqSchema, categorySearch } from "../../shared/category-search";
import { AQUAVO_PRODUCT_CATEGORIES } from "../../shared/seo-contract";

/**
 * The eleven listings were titled with the catalogue's taxonomy ("منتجات
 * التحكم بالحرارة"), which nobody searches, and three of them were folded
 * into /products as duplicates. These tests pin the replacement: a heading
 * and title in buyer vocabulary, unique per category, and three visible
 * questions each.
 */
describe("category search presentation", () => {
  it("covers exactly the eleven canonical categories", () => {
    expect(Object.keys(CATEGORY_SEARCH).sort()).toEqual([...AQUAVO_PRODUCT_CATEGORIES].sort());
  });

  it("gives every category a heading, a branded title under 70 chars, and three answered questions", () => {
    for (const category of AQUAVO_PRODUCT_CATEGORIES) {
      const c = categorySearch(category)!;
      expect(c, category).toBeDefined();
      expect(c.heading.length, `${category} heading`).toBeGreaterThan(8);
      expect(c.title, `${category} title`).toMatch(/ \| AQUAVO$/);
      expect(c.title.replace(/ \| AQUAVO$/, "").length, `${category} title length`).toBeLessThanOrEqual(70);
      expect(c.faq.length, `${category} faq`).toBe(3);
      for (const q of c.faq) {
        expect(q.question, `${category} question`).toMatch(/[؟?]$/);
        expect(q.answer.split(/\s+/).length, `${category} answer length`).toBeGreaterThanOrEqual(25);
        expect(q.answer.split(/\s+/).length, `${category} answer length`).toBeLessThanOrEqual(90);
      }
    }
  });

  it("uses no catalogue word 'منتجات' as the heading and repeats no title, heading or question across categories", () => {
    const seen = new Map<string, string>();
    for (const [category, c] of Object.entries(CATEGORY_SEARCH)) {
      expect(c.heading.startsWith("منتجات"), `${category} heading starts with منتجات`).toBe(false);
      for (const line of [c.title, c.heading, ...c.faq.map((q) => q.question), ...c.faq.map((q) => q.answer)]) {
        const previous = seen.get(line);
        expect(previous, `"${line.slice(0, 40)}" appears under ${previous} and ${category}`).toBeUndefined();
        seen.set(line, category);
      }
    }
  });

  it("never quotes a price, a wattage or a product name", () => {
    for (const [category, c] of Object.entries(CATEGORY_SEARCH)) {
      const text = [c.heading, c.title, ...c.faq.flatMap((q) => [q.question, q.answer])].join(" ");
      expect(text, `${category} price`).not.toMatch(/د\.ع|دينار|\d{3,}/);
      expect(text, `${category} wattage`).not.toMatch(/\d+\s*واط/);
      expect(text, `${category} brand`).not.toMatch(/HOUYI|YEE|SOBO|Hygger/i);
    }
  });

  it("resolves an English alias and builds a FAQPage from the visible questions", () => {
    expect(categorySearch("heaters")).toBe(categorySearch("التحكم بالحرارة"));
    const schema = categoryFaqSchema("filters") as { mainEntity: unknown[] };
    expect(schema.mainEntity).toHaveLength(3);
    expect(categoryFaqSchema("لا شيء")).toBeNull();
  });
});
