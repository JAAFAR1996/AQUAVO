import { describe, expect, it } from "vitest";
import { articleParagraphs, cutAtSentence, directAnswer, DIRECT_ANSWER_MAX_WORDS, DIRECT_ANSWER_MIN_WORDS } from "../article-answer";
import { articleFaqSchema, articleQuestions, isQuestionHeading } from "../article-faq";
import { articleCategoryScores, productCategoryForArticle, relatedProductsForArticle } from "../article-links";

const words = (n: number, w = "كلمة") => Array.from({ length: n }, () => w).join(" ");

describe("directAnswer", () => {
  it("returns null when the opening is shorter than the floor", () => {
    expect(directAnswer(`<p>${words(20)}.</p>`)).toBeNull();
  });

  it("joins consecutive paragraphs until the floor is reached", () => {
    const html = `<p>${words(25)}.</p><p>${words(25)}.</p><p>${words(50)}.</p>`;
    const out = directAnswer(html)!;
    expect(out).not.toBeNull();
    const n = out.split(/\s+/).length;
    expect(n).toBeGreaterThanOrEqual(DIRECT_ANSWER_MIN_WORDS);
    expect(n).toBeLessThanOrEqual(DIRECT_ANSWER_MAX_WORDS);
  });

  it("cuts a long opener at a sentence boundary, never mid-sentence", () => {
    const html = `<p>${words(50)}. ${words(30)}؟ ${words(40)}.</p>`;
    const out = directAnswer(html)!;
    expect(out.endsWith("؟")).toBe(true);
    // 50 words + "." and 30 words + "؟": the third sentence would cross 90.
    expect(out.split(/\s+/).length).toBe(80);
  });

  it("returns null when no sentence ends inside the ceiling", () => {
    expect(directAnswer(`<p>${words(200)}</p>`)).toBeNull();
    expect(cutAtSentence(words(120), 90)).toBeNull();
  });

  it("ignores headings and lists, strips inline markup", () => {
    const html = `<h2>عنوان</h2><ul><li>${words(60)}.</li></ul><p><strong>${words(45)}</strong>.</p>`;
    expect(articleParagraphs(html)).toHaveLength(1);
    expect(directAnswer(html)).not.toContain("<");
  });
});

describe("articleQuestions", () => {
  it("recognises Arabic question forms", () => {
    expect(isQuestionHeading("كم مرة أغير ماء الحوض؟")).toBe(true);
    expect(isQuestionHeading("شلون تنظف الفلتر")).toBe(true);
    expect(isQuestionHeading("هل السخان ضروري بالصيف")).toBe(true);
    expect(isQuestionHeading("الطريقة العملية")).toBe(false);
    expect(isQuestionHeading("أخطاء شائعة")).toBe(false);
  });

  it("pairs each question heading with the first paragraph under it, trimmed", () => {
    const html = [
      `<h3>كم مرة أغير الماء؟</h3><p>${words(30)}.</p><p>ignored</p>`,
      `<h3>الطريقة العملية</h3><p>not a question</p>`,
      `<h3>شلون أعرف الفلتر يشتغل</h3><p>${words(120)}. ${words(5)}.</p>`,
    ].join("");
    const q = articleQuestions(html);
    expect(q).toHaveLength(2);
    expect(q[0].question).toBe("كم مرة أغير الماء؟");
    expect(q[0].answer.split(/\s+/)).toHaveLength(30);
    expect(q[1].answer.split(/\s+/).length).toBeLessThanOrEqual(DIRECT_ANSWER_MAX_WORDS);
  });

  it("publishes nothing for a single question", () => {
    expect(articleQuestions(`<h3>ليش الماء عكر؟</h3><p>${words(10)}.</p>`)).toEqual([]);
    expect(articleFaqSchema(`<h3>ليش الماء عكر؟</h3><p>${words(10)}.</p>`)).toBeNull();
  });

  it("skips a question heading with no paragraph before the next heading", () => {
    const html = `<h3>سؤال أول؟</h3><h3>سؤال ثاني؟</h3><p>ج</p><h3>سؤال ثالث؟</h3><p>ج</p>`;
    expect(articleQuestions(html).map((q) => q.question)).toEqual(["سؤال ثاني؟", "سؤال ثالث؟"]);
  });
});

describe("productCategoryForArticle", () => {
  it("scores the category whose vocabulary dominates, with title hits doubled", () => {
    const article = { title: "شلون تنظف فلتر الحوض صح", content: `<p>الفلتر يحتاج ميديا نظيفة والاسفنج يغسل بماء الحوض. الفلتر مو الشي الوحيد.</p>` };
    expect(productCategoryForArticle(article)).toBe("الفلترة والتنقية");
    expect(articleCategoryScores(article)["الفلترة والتنقية"]).toBeGreaterThanOrEqual(3);
  });

  it("returns null when nothing clears the floor", () => {
    expect(productCategoryForArticle({ title: "أنواع الغوبي", content: "<p>سمكة هادئة تحب الجماعات.</p>" })).toBeNull();
  });

  it("returns null on a near tie rather than guessing", () => {
    const article = { title: "", content: `<p>${"فلتر ".repeat(4)}${"سخان ".repeat(4)}</p>` };
    expect(productCategoryForArticle(article)).toBeNull();
  });
});

describe("relatedProductsForArticle", () => {
  const article = { title: "كيف تختار سخان مناسب", content: "<p>السخان والحرارة ودرجة الحرارة الثابتة.</p>" };
  const products = [
    { slug: "a", category: "التحكم بالحرارة", stock: 0, price: 1000 },
    { slug: "b", category: "التحكم بالحرارة", stock: 3, price: 0 },
    { slug: "c", category: "التحكم بالحرارة", stock: 3, price: 1000 },
    { slug: "d", category: "الفلترة والتنقية", stock: 3, price: 1000 },
    { slug: "e", category: "التحكم بالحرارة", stock: 1, price: 500 },
    { slug: "f", category: "التحكم بالحرارة", stock: 1, price: 500 },
    { slug: "g", category: "التحكم بالحرارة", stock: 1, price: 500 },
  ];

  it("keeps only in-stock, priced products of the article's category, capped at three", () => {
    expect(relatedProductsForArticle(article, products).map((p) => p.slug)).toEqual(["c", "e", "f"]);
  });

  it("returns nothing when the article has no clear category", () => {
    expect(relatedProductsForArticle({ title: "الغوبي", content: "<p>سمكة.</p>" }, products)).toEqual([]);
  });
});
