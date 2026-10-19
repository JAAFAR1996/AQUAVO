import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { renderSeoPreviewShell, type SeoPreviewBlogPost } from "../../api/_seo-preview-shell";
import {
  EDITORIAL_TEAM_BYLINE,
  EDITORIAL_TEAM_PROFILE_PATH,
  articleAuthorEntity,
} from "../../shared/editorial-author";

// Four separate code paths emit the blog author, and each one hard-coded
// {"@type":"Person"}. That is a claim that a human named "AQUAVO Team" wrote
// 70 of the 81 published posts. These tests fail against that state.

const AUTHOR_SCHEMA_SITES = [
  "api/blog-ssr.ts",
  "api/ssr-meta.ts",
  "api/_ssr-preview-source.ts",
  "client/src/components/seo/meta-tags.tsx",
];

const post = (author: string): SeoPreviewBlogPost =>
  ({
    id: "1",
    slug: "post",
    title: "عنوان",
    excerpt: "مقتطف",
    author,
    publishedAt: "2026-08-23T02:18:09.298Z",
  }) as SeoPreviewBlogPost;

describe("no render path hard-codes Person for an article author", () => {
  it("never hard-codes Person for an article author", () => {
    for (const file of AUTHOR_SCHEMA_SITES) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(source, `${file} should resolve the author entity`).toContain("articleAuthorEntity");
      for (const line of source.split(String.fromCharCode(10))) {
        if (!/author:/.test(line)) continue;
        // A review author is a real person who wrote that review; only the
        // article author is the claim being corrected here.
        if (line.includes("review.author")) continue;
        expect(
          line.includes("Person"),
          `${file} hard-codes a Person author: ${line.trim()}`,
        ).toBe(false);
      }
    }
  });

  it("resolves the stored author through the shared entity, not inline", () => {
    for (const file of AUTHOR_SCHEMA_SITES) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      for (const line of source.split(String.fromCharCode(10))) {
        if (!/^\s*author:/.test(line)) continue;
        if (line.includes("review.author")) continue;
        // A type declaration (`author: string;`) is not an entity.
        if (!/[({]/.test(line)) continue;
        // A literal Organization is fine where the author genuinely is AQUAVO
        // and no stored byline is involved, as the guides already do.
        if (line.includes("Organization")) continue;
        expect(
          line.includes("articleAuthorEntity"),
          `${file} builds an author entity inline: ${line.trim()}`,
        ).toBe(true);
      }
    }
  });
});

// The byline element itself, not merely a /about link somewhere on the page —
// the shell footer links /about on every page, so a page-wide search would
// pass without the byline being a link at all.
const bylineElement = (html: string): Element => {
  const document = new DOMParser().parseFromString(html, "text/html");
  const byline = document.querySelector('article[itemtype="https://schema.org/Article"] [itemprop="author"]');
  expect(byline, "no byline element rendered").not.toBeNull();
  return byline!;
};

describe("visible byline and schema name the same entity", () => {
  it.each(["AQUAVO Team", "AQUAVO Editorial Team", "شريمب 🦐"])("types the %s byline as the same Organization as JSON-LD", (author) => {
    const html = renderSeoPreviewShell({ kind: "blog-post", post: post(author), related: [] });
    const byline = bylineElement(html);
    const entity = articleAuthorEntity(author);
    // Without this nested item, an author anchor is a URL value. Schema.org
    // author accepts an Organization or Person, not a URL or plain string.
    expect(byline.hasAttribute("itemscope")).toBe(true);
    expect(byline.getAttribute("itemtype")).toBe(`https://schema.org/${entity["@type"]}`);
    expect(byline.getAttribute("itemid")).toBe(entity["@id"]);
    expect(byline.querySelector('[itemprop="name"]')?.getAttribute("content")).toBe(entity.name);
    expect(byline.textContent).toBe(EDITORIAL_TEAM_BYLINE);
    const profileLink = byline.querySelector('a[itemprop="url"]');
    expect(profileLink?.getAttribute("href")).toBe(EDITORIAL_TEAM_PROFILE_PATH);
    expect(entity.url).toBe(`https://www.aquavoiq.com${EDITORIAL_TEAM_PROFILE_PATH}`);
  });

  it("types a named byline as a Person while leaving the visible name unlinked", () => {
    const html = renderSeoPreviewShell({ kind: "blog-post", post: post("Jane Doe"), related: [] });
    const byline = bylineElement(html);
    const entity = articleAuthorEntity("Jane Doe");
    expect(byline.hasAttribute("itemscope")).toBe(true);
    expect(byline.getAttribute("itemtype")).toBe(`https://schema.org/${entity["@type"]}`);
    expect(byline.querySelector('[itemprop="name"]')?.getAttribute("content")).toBe(entity.name);
    expect(byline.textContent).toBe("Jane Doe");
    expect(byline.hasAttribute("itemid")).toBe(false);
    expect(byline.querySelector('a, [itemprop="url"]')).toBeNull();
  });

  // The assistant persona is not a named author. It resolves to the team, so
  // its byline reads as the editorial team and links where the schema points.
  it("renders the assistant persona as the editorial team", () => {
    const html = renderSeoPreviewShell({ kind: "blog-post", post: post("شريمب 🦐"), related: [] });
    const byline = bylineElement(html);
    expect(byline.textContent).toBe(EDITORIAL_TEAM_BYLINE);
    expect(byline.textContent).not.toContain("شريمب");
    expect(byline.querySelector("a")?.getAttribute("href")).toBe(EDITORIAL_TEAM_PROFILE_PATH);
  });

  it("keeps the published date the post actually carries", () => {
    const html = renderSeoPreviewShell({ kind: "blog-post", post: post("AQUAVO Team"), related: [] });
    expect(html).toContain("2026-08-23");
  });
});
