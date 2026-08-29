import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { renderSeoPreviewShell, type SeoPreviewBlogPost } from "../../api/_seo-preview-shell";
import {
  ARABIC_WORDS_PER_MINUTE,
  READING_TIME_LABEL,
  articleReadingTimeLabel,
  articleWordCount,
} from "../../shared/article-reading";
import { articleDatePublished, articleDates } from "../../shared/article-dates";

// Four claims on every blog page were not supported by the data behind them:
// the reading time (two different numbers for one article), the publication
// date (ten posts dated before the row existed), the modification date (a
// maintenance write presented as a revision) and the view count (a request
// counter presented as readers). These pin the corrections.

const post = (over: Partial<SeoPreviewBlogPost> = {}): SeoPreviewBlogPost =>
  ({
    id: "1",
    slug: "post",
    title: "عنوان",
    excerpt: "مقتطف",
    author: "AQUAVO Team",
    publishedAt: "2026-08-23T02:18:09.298Z",
    ...over,
  }) as SeoPreviewBlogPost;

describe("reading time is one estimate, derived from the article", () => {
  it("counts words in the article, not tokens in its markup", () => {
    // The old count split raw HTML, so every tag became a "word".
    expect(articleWordCount("<p>واحد اثنان ثلاثة</p>")).toBe(3);
    expect(articleWordCount("<p>واحد</p><script>var a = 1 + 2 + 3;</script>")).toBe(1);
    expect(articleWordCount("")).toBe(0);
    expect(articleWordCount(null)).toBe(0);
  });

  it("labels the figure as an estimate rather than a duration", () => {
    const label = articleReadingTimeLabel(`<p>${"كلمة ".repeat(ARABIC_WORDS_PER_MINUTE * 8)}</p>`);
    expect(label).toContain(READING_TIME_LABEL);
    expect(label).toContain("8 دقائق");
  });

  it("counts one and two minutes in correct Arabic", () => {
    expect(articleReadingTimeLabel("<p>كلمة</p>")).toContain("دقيقة واحدة");
    expect(articleReadingTimeLabel(`<p>${"كلمة ".repeat(ARABIC_WORDS_PER_MINUTE * 2)}</p>`)).toContain("دقيقتان");
  });

  it("says nothing when there is no article to measure", () => {
    expect(articleReadingTimeLabel("")).toBeNull();
  });

  // The whole point of the change: the reader's page and the crawler's page
  // took their number from different places and disagreed by up to 11x.
  it("no render path reads the stored read_time column", () => {
    for (const file of [
      "api/_seo-preview-shell.tsx",
      "api/_ssr-preview-source.ts",
      "client/src/pages/blog-post.tsx",
      "client/src/pages/blog.tsx",
    ]) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      for (const line of source.split(String.fromCharCode(10))) {
        if (line.trimStart().startsWith("*") || line.trimStart().startsWith("//")) continue;
        expect(
          // A local named readTime is fine; reading it off the row is not.
          /[.]readTime\b/.test(line),
          `${file} still renders the stored read_time: ${line.trim()}`,
        ).toBe(false);
      }
    }
  });
});

describe("a post cannot be published before it exists", () => {
  it("uses the stored date when the record supports it", () => {
    expect(
      articleDatePublished({ publishedAt: "2026-03-10T14:57:36.966Z", createdAt: "2026-03-10T14:57:35.017Z" }),
    ).toBe("2026-03-10T14:57:36.966Z");
  });

  it("refuses a date from before the row was created", () => {
    // algae-war-guide, as production stores it.
    expect(
      articleDatePublished({ publishedAt: "2025-10-31T21:00:00.000Z", createdAt: "2026-02-23T01:32:11.491Z" }),
    ).toBe("2026-02-23T01:32:11.491Z");
  });

  it("falls back to the creation date when nothing was published", () => {
    expect(articleDatePublished({ publishedAt: null, createdAt: "2026-02-23T01:32:11.491Z" })).toBe(
      "2026-02-23T01:32:11.491Z",
    );
    expect(articleDatePublished({})).toBeUndefined();
  });

  it("never states a modification date", () => {
    expect(articleDates({ publishedAt: "2026-03-10T00:00:00.000Z" }).dateModified).toBeUndefined();
  });

  it("renders no dateModified on the crawler-visible article", () => {
    const html = renderSeoPreviewShell({
      kind: "blog-post",
      post: post({ publishedAt: "2025-10-31T21:00:00.000Z", createdAt: "2026-02-23T01:32:11.491Z" }),
      related: [],
    });
    expect(html).not.toContain("dateModified");
    expect(html).not.toContain("2025-10-31");
    expect(html).toContain("2026-02-23");
  });
});

describe("no surface publishes a request counter as readership", () => {
  it("does not display a view count anywhere a reader looks", () => {
    for (const file of ["client/src/pages/blog-post.tsx", "client/src/pages/blog.tsx"]) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(source, `${file} shows a view count`).not.toContain("المشاهدات");
    }
  });

  it("does not increment a counter on reading a post", () => {
    const source = readFileSync(resolve(process.cwd(), "server/routes/blog.ts"), "utf8");
    const code = source
      .split(String.fromCharCode(10))
      .filter((line) => !line.trimStart().startsWith("//") && !line.trimStart().startsWith("*"))
      .join(String.fromCharCode(10));
    // The counter is neither written nor sent; the only mention left is the
    // destructure that strips it out of the response.
    expect(code).not.toContain("db.update(blogPosts)");
    expect(code).not.toMatch(/set\(\{[^}]*viewCount/);
    expect(code).not.toMatch(/viewCount:\s*blogPosts\.viewCount/);
  });
});
