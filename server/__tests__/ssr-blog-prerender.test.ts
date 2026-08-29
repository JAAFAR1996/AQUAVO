import { describe, expect, it } from "vitest";

import {
  articlePlainText,
  cloudinaryHeroUrl,
  demoteArticleHeadings,
  renderArticleBodyHtml,
  sanitizeArticleHtml,
} from "../../api/_blog-article.js";
import {
  renderSeoPreviewShell,
  type SeoPreviewBlogPost,
} from "../../api/_seo-preview-shell.js";
import { EDITORIAL_TEAM_BYLINE } from "../../shared/editorial-author";
import { READING_TIME_LABEL } from "../../shared/article-reading";

// Shaped like a real row from `blog_posts`: the article body is first-party
// HTML authored in the admin panel, and headings inside it start at <h3>.
const POST: SeoPreviewBlogPost = {
  slug: "betta-fish-bowl-truth-iraq",
  title: "أسماك الفايتر (بيتا): هل يمكن أن تعيش في كأس ماء صغير؟",
  excerpt: "الخرافة الشائعة التي ظنناها صحيحة سنين طويلة.",
  category: "علوم الأحواض",
  author: "AQUAVO Team",
  readTime: "7 دقائق",
  imageUrl: "https://res.cloudinary.com/dyczh8ogv/image/upload/v1773199279/aquavo/blog/betta.png",
  publishedAt: "2026-03-08T00:00:00.000Z",
  createdAt: "2026-03-08T00:00:00.000Z",
  content: `
    <div class="bg-primary/5 p-6">
      <h3 class="text-xl">الخلاصة المباشرة</h3>
      <p><strong>لا، وألف لا!</strong> يحتاج الفايتر حوضاً لا يقل عن 10 لتر.</p>
    </div>`,
};

const RELATED: SeoPreviewBlogPost[] = [
  { slug: "real-vs-fake-plants", title: "نباتات طبيعية أم صناعية؟", excerpt: "مقارنة عملية." },
];

function render(post: SeoPreviewBlogPost = POST): string {
  return renderSeoPreviewShell({ kind: "blog-post", post, related: RELATED });
}

describe("article HTML sanitisation", () => {
  it("removes scripts, frames and inline event handlers", () => {
    const dirty =
      '<p onclick="steal()">نص</p><script>alert(1)</script><iframe src="https://evil.test"></iframe>';
    const clean = sanitizeArticleHtml(dirty);
    expect(clean).toContain("نص");
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("<iframe");
    expect(clean).not.toContain("onclick");
  });

  it("neutralises javascript: URLs", () => {
    expect(sanitizeArticleHtml('<a href="javascript:alert(1)">x</a>')).not.toContain("javascript:");
  });

  it("returns an empty string for missing content rather than throwing", () => {
    expect(sanitizeArticleHtml(null)).toBe("");
    expect(sanitizeArticleHtml(undefined)).toBe("");
    expect(renderArticleBodyHtml("   ")).toBe("");
  });
});

describe("heading demotion", () => {
  it("demotes h1..h5 by one level and leaves h6 alone", () => {
    expect(demoteArticleHeadings("<h1>a</h1>")).toBe("<h2>a</h2>");
    expect(demoteArticleHeadings("<h3>a</h3>")).toBe("<h4>a</h4>");
    expect(demoteArticleHeadings("<h6>a</h6>")).toBe("<h6>a</h6>");
  });

  it("keeps the post title as the only h1 even when the body ships its own", () => {
    const html = render({ ...POST, content: "<h1>عنوان داخلي</h1><p>نص</p>" });
    expect(html.match(/<h1\b/g) ?? []).toHaveLength(1);
    expect(html).toContain(POST.title);
    expect(html).toContain("عنوان داخلي");
  });
});

describe("Cloudinary hero delivery", () => {
  it("requests a modern, right-sized copy of a Cloudinary original", () => {
    const out = cloudinaryHeroUrl(POST.imageUrl as string, 1200);
    expect(out).toContain("f_auto,q_auto,c_limit,w_1200");
    expect(out).toContain("/aquavo/blog/betta.png");
  });

  it("leaves non-Cloudinary URLs and already-transformed URLs untouched", () => {
    const external = "https://cdn.example.test/a.png";
    expect(cloudinaryHeroUrl(external)).toBe(external);
    const tuned =
      "https://res.cloudinary.com/dyczh8ogv/image/upload/w_800,q_80/aquavo/blog/betta.png";
    expect(cloudinaryHeroUrl(tuned)).toBe(tuned);
  });
});

describe("prerendered blog article", () => {
  it("exposes exactly one h1 carrying the post title", () => {
    const html = render();
    expect(html.match(/<h1\b/g) ?? []).toHaveLength(1);
    expect(html).toMatch(/<h1[^>]*>[^<]*أسماك الفايتر/);
  });

  it("renders the article body as crawlable text", () => {
    const html = render();
    expect(html).toContain("يحتاج الفايتر حوضاً لا يقل عن 10 لتر");
    const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    expect(text.length).toBeGreaterThan(200);
  });

  it("links back to the blog index and to other articles", () => {
    const html = render();
    expect(html).toContain('href="/blog"');
    expect(html).toContain('href="/blog/real-vs-fake-plants"');
  });

  it("ships the hero image with alt text and reserved dimensions", () => {
    const html = render();
    const img = html.match(/<img\b[^>]*aq-ssr-hero-image[^>]*>/)?.[0] ?? "";
    expect(img).not.toBe("");
    expect(img).toContain(`alt="${POST.title}"`);
    expect(img).toContain('width="1200"');
    expect(img).toContain('height="630"');
    expect(img).toContain("f_auto,q_auto");
  });

  it("publishes the author and date it actually has, and invents none", () => {
    const html = render();
    // The team byline, not the stored "AQUAVO Team" string: the visible byline
    // and the Article author entity now name one entity.
    expect(html).toContain(EDITORIAL_TEAM_BYLINE);
    expect(html).toContain('dateTime="2026-03-08"');
    // No modification date: blog_posts.updated_at records maintenance writes,
    // not rewrites, so there is nothing here to state honestly.
    expect(html).not.toContain("dateModified");

    const bare = render({ slug: "s", title: "عنوان", content: "<p>نص</p>" });
    expect(bare).not.toContain("<time");
    expect(bare.match(/<h1\b/g) ?? []).toHaveLength(1);
  });

  it("refuses a publication date from before the post existed", () => {
    // The ten backdated posts, as production stores them.
    const html = render({
      ...POST,
      publishedAt: "2025-10-31T21:00:00.000Z",
      createdAt: "2026-02-23T01:32:11.491Z",
    });
    expect(html).not.toContain("2025-10-31");
    expect(html).toContain('dateTime="2026-02-23"');
  });

  it("states the reading time of this article, as an estimate", () => {
    const html = render();
    expect(html).toContain(READING_TIME_LABEL);
    // The stored column claims seven minutes for a fourteen-word article.
    expect(html).not.toContain("7 دقائق");
    expect(html).toContain("دقيقة واحدة");
  });

  it("still renders an article that has no hero image", () => {
    const html = render({ ...POST, imageUrl: null });
    // The class name always appears in the shell stylesheet; assert on the element.
    expect(html).not.toMatch(/<img\b/);
    expect(html).toContain("يحتاج الفايتر");
  });
});

describe("articlePlainText", () => {
  it("flattens markup to indexable prose", () => {
    expect(articlePlainText(POST.content)).toContain("الخلاصة المباشرة");
    expect(articlePlainText(POST.content)).not.toContain("<");
  });
});
