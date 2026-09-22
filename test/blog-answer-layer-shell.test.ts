import { describe, expect, it } from "vitest";
import { renderSeoPreviewShell, type SeoPreviewBlogPost, type SeoPreviewProduct } from "../api/_seo-preview-shell.js";
import { DIRECT_ANSWER_HEADING } from "../shared/article-answer.js";
import { RELATED_PRODUCTS_HEADING } from "../shared/article-links.js";

/**
 * What a crawler is shown for a blog post: the article's own opening as a
 * labelled answer block, the products of the category the article is about,
 * and that category's guides — and none of those when the article does not
 * earn them. The SPA renders the same blocks from the same shared modules;
 * client/src/pages/__tests__/blog-post.test.tsx covers that side.
 */
const words = (n: number, w = "كلمة") => Array.from({ length: n }, () => w).join(" ");

const heaterPost: SeoPreviewBlogPost = {
  slug: "heater-choice-test",
  title: "كيف تختار سخان مناسب لحوضك؟",
  excerpt: "السخان يثبت درجة الحرارة.",
  content: `<p>السخان يحافظ على درجة الحرارة ثابتة في الحوض، والسخان المناسب يعتمد على حجم الماء. ${words(40)}.</p><p>${words(30)}.</p>`,
  author: "AQUAVO",
  publishedAt: "2026-05-01",
  createdAt: "2026-04-01",
};

const products: SeoPreviewProduct[] = [
  { slug: "heater-100", name: "سخان 100 واط", price: 17999, stock: 3, category: "التحكم بالحرارة" },
];

describe("blog post crawler shell — answer layer", () => {
  it("shows the answer block, the related products and the category guides", () => {
    const html = renderSeoPreviewShell({ kind: "blog-post", post: heaterPost, related: [], products });
    expect(html).toContain(DIRECT_ANSWER_HEADING);
    expect(html).toMatch(/itemprop="abstract"/i);
    expect(html).toContain("السخان يحافظ على درجة الحرارة ثابتة");
    expect(html).toContain(RELATED_PRODUCTS_HEADING);
    expect(html).toContain("/products/heater-100");
    expect(html).toContain('class="aq-ssr-guide-links"');
    expect(html).toContain("/guides/heater-choice");
  });

  it("shows none of the blocks for an article with a short opening and no clear category", () => {
    const post: SeoPreviewBlogPost = { ...heaterPost, title: "سمكة الغوبي", excerpt: "سمكة هادئة.", content: `<p>${words(10)}.</p>` };
    const html = renderSeoPreviewShell({ kind: "blog-post", post, related: [], products: [] });
    expect(html).not.toContain(DIRECT_ANSWER_HEADING);
    expect(html).not.toContain(RELATED_PRODUCTS_HEADING);
    // The heading text also lives in the shell's static chrome, so assert on the block itself.
    expect(html).not.toContain('class="aq-ssr-guide-links"');
  });

  it("keeps the post title as the only h1", () => {
    const html = renderSeoPreviewShell({ kind: "blog-post", post: heaterPost, related: [], products });
    expect(html.match(/<h1\b/g)?.length).toBe(1);
  });
});
