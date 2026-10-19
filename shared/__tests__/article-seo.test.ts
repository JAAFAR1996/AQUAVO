import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildArticleSeoMeta, type ArticleSeoInput } from "../article-seo";
import { ARTICLE_SEARCH_COPY } from "../article-seo-copy";
import { buildProductSeoMeta, type ProductSeoInput } from "../product-seo";

const source = JSON.parse(readFileSync("reports/i18n/source-cache.json", "utf8")) as {
  posts: Array<ArticleSeoInput & { slug: string }>;
  products: Array<ProductSeoInput & { slug: string }>;
};
const post = (slug: string) => source.posts.find((value) => value.slug === slug)!;

describe("article search copy", () => {
  it("uses a concise topic title without replacing the complete source", () => {
    const original = Object.freeze({ ...post("nitrogen-cycle-simple-arabic-explained") });
    const before = JSON.stringify(original);
    const meta = buildArticleSeoMeta(original);
    expect(meta.title).toBe("الدورة البيولوجية لحوض السمك (Nitrogen Cycle) | AQUAVO");
    expect(meta.description).toContain("الأمونيا والنتريت والنترات");
    expect(JSON.stringify(original)).toBe(before);
  });

  it.each([
    ["fish-keeping-stress-relief-mental-health", /40%|علاج نفسي|تثبت/],
    ["5-hardy-fish-for-beginners", /لا تموت|أخطاء المبتدئين|تتحمل/],
    ["black-beard-algae-removal-steps", /خطوتين|القضاء عليها|المجربة/],
  ] as const)("describes the topic without republishing unsupported promises: %s", (slug, promise) => {
    const meta = buildArticleSeoMeta(post(slug));
    expect(`${meta.title} ${meta.description}`).not.toMatch(promise);
    expect(meta.description.length).toBeGreaterThanOrEqual(100);
    expect(meta.description.length).toBeLessThanOrEqual(160);
  });

  it("does not apply a slug's old title or excerpt to revised source copy", () => {
    const original = post("fish-keeping-stress-relief-mental-health");
    const renamed = { ...original, title: "موضوع مختلف عن صيانة معدات الحوض", excerpt: "مقتطف جديد عن الموضوع المختلف." };
    expect(buildArticleSeoMeta(renamed)).toEqual({ title: `${renamed.title} | AQUAVO`, description: renamed.excerpt });
    const revisedExcerpt = "مقتطف جديد اختاره الكاتب للمقال نفسه.";
    expect(buildArticleSeoMeta({ ...original, excerpt: revisedExcerpt }).description).toBe(revisedExcerpt);
  });

  it("keeps translated articles in their own language instead of using Arabic overrides", () => {
    const meta = buildArticleSeoMeta({
      slug: "nitrogen-cycle-simple-arabic-explained",
      title: "The aquarium nitrogen cycle | AQUAVO Blog",
      excerpt: "An introduction to aquarium cycling and interpreting water tests.",
    }, { locale: "en" });
    expect(meta.title).toBe("The aquarium nitrogen cycle | AQUAVO");
    expect(meta.description).toBe("An introduction to aquarium cycling and interpreting water tests.");
  });

  it("keeps an uncurated long title whole and does not invent filler for a sparse article", () => {
    const title = "A new article about a specific aquarium subject and the exact qualifiers that identify its scope";
    expect(buildArticleSeoMeta({ title, excerpt: "A short factual introduction." })).toEqual({
      title: `${title} | AQUAVO`, description: "A short factual introduction.",
    });
  });

  it("cleans metadata decoration and keeps one brand suffix", () => {
    const meta = buildArticleSeoMeta({ title: "<b>الماء &amp; الفلتر</b> 🤝 | مدونة AQUAVO | AQUAVO العراق", excerpt: "<p>نص من المقال.</p><script>unread()</script>" });
    expect(meta).toEqual({ title: "الماء & الفلتر | AQUAVO", description: "نص من المقال." });
  });

  it("covers the actual published corpus without stale curated entries or metadata length regressions", () => {
    for (const [slug, copy] of Object.entries(ARTICLE_SEARCH_COPY)) {
      expect(post(slug)?.title, slug).toBe(copy.sourceTitle);
      if (copy.description) expect(post(slug).excerpt, slug).toBe(copy.sourceExcerpt);
    }
    for (const article of source.posts) {
      const meta = buildArticleSeoMeta(article);
      expect(meta.title.length, article.slug).toBeLessThanOrEqual(70);
      expect(meta.description.length, article.slug).toBeGreaterThanOrEqual(100);
      expect(meta.description.length, article.slug).toBeLessThanOrEqual(160);
    }
    // The shared service fallback must not trade the mop fix for regressions
    // in another product's quantities, title or snippet length.
    for (const product of source.products) {
      const meta = buildProductSeoMeta(product);
      expect(meta.title.length, product.slug).toBeLessThanOrEqual(70);
      expect(meta.description.length, product.slug).toBeGreaterThanOrEqual(100);
      expect(meta.description.length, product.slug).toBeLessThanOrEqual(160);
    }
  });
});
