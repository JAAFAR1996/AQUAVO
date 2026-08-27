import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Core Web Vitals wiring contract.
 *
 * The two regressions pinned here were both invisible to every other test,
 * because each is about *which* helper a page calls and *how much room* a
 * placeholder reserves — not about any helper's own behaviour, which
 * `client/src/lib/__tests__/cloudinary.test.ts` already covers.
 *
 * Mounting these pages to assert the same facts would mean mocking the whole
 * product/blog data layer, wouter, framer-motion and the cart/wishlist
 * contexts for a single branch, so this reads the source instead — the same
 * approach `document-shell.test.ts` already takes in this repo.
 *
 * Measured on production before the fix, throttled to 4x CPU / Slow 4G at
 * 412x915 @2.625 DPR:
 *   - blog article LCP 14,436 ms, LCP element = the raw 497 KB Cloudinary PNG
 *   - product CLS 0.60, from the footer laying out at y=529 then being shoved
 *     down when the real product content replaced a 400px skeleton
 */

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

/**
 * The single <img …/> tag that mentions `helper`. The inner `(?!<img)` guard
 * stops the match from starting at an earlier tag and swallowing everything up
 * to this one — which would silently read a *different* image's attributes.
 */
function imgTagUsing(text: string, helper: string): string {
  const pattern = new RegExp(`<img(?:(?!<img)[\\s\\S])*?${helper}(?:(?!<img)[\\s\\S])*?/>`);
  const match = text.match(pattern)?.[0];
  if (!match) throw new Error(`no <img> using ${helper}`);
  return match;
}

describe("blog images go through the Cloudinary helpers", () => {
  it("the article hero is optimized and never the raw imageUrl", () => {
    const blogPost = source("client/src/pages/blog-post.tsx");
    expect(blogPost).toContain("blogHeroImage(post.imageUrl)");
    // The raw URL straight into src is exactly what shipped the 497 KB PNG.
    expect(blogPost).not.toContain('src={post.imageUrl || "/brand/aquavo-v2-horizontal.png"}');
  });

  it("the article hero is eager and high priority, because it is the LCP element", () => {
    const blogPost = source("client/src/pages/blog-post.tsx");
    const heroImg = imgTagUsing(blogPost, "blogHeroImage");
    expect(heroImg).toContain('loading="eager"');
    expect(heroImg).toContain('fetchPriority="high"');
    expect(heroImg).not.toContain('loading="lazy"');
  });

  it("the listing hero is optimized, and the below-the-fold grid is lazy and card-sized", () => {
    const blog = source("client/src/pages/blog.tsx");
    expect(blog).toContain("blogHeroImage(featuredPost.imageUrl)");
    expect(blog).toContain("blogCardImage(post.imageUrl)");

    const cardImg = imgTagUsing(blog, "blogCardImage");
    expect(cardImg).toContain('loading="lazy"');
    // Only the one hero may claim high priority; a grid of eager images would
    // compete with it for bandwidth.
    expect(cardImg).not.toContain('fetchPriority="high"');
  });

  it("no blog page passes a bare imageUrl into an img src any more", () => {
    for (const path of ["client/src/pages/blog.tsx", "client/src/pages/blog-post.tsx"]) {
      const text = source(path);
      expect(text).not.toMatch(/src=\{(?:featuredPost|post)\.imageUrl\s*\|\|/);
    }
  });
});

describe("the product loading skeleton reserves the space the content will need", () => {
  const productDetails = () => source("client/src/pages/product-details.tsx");

  it("reserves at least a viewport, so the footer starts below the fold", () => {
    expect(productDetails()).toContain("min-h-[calc(100vh-4rem)]");
  });

  it("no longer collapses to the bare 400px block that caused the shift", () => {
    // This exact skeleton laid the footer out at ~529px: above the fold, so
    // every later push counted in full against CLS.
    expect(productDetails()).not.toContain('<Skeleton className="h-[400px] w-full rounded-xl" />');
  });

  it("keeps the skeleton identifiable, so the shift can be re-measured", () => {
    expect(productDetails()).toContain('data-testid="pdp-loading-skeleton"');
  });
});

describe("blog related-article thumbnails", () => {
  /**
   * These are 80-pixel squares that rendered each article's full-size
   * original. Measured on production with Lighthouse (mobile, simulated
   * throttling), the three of them on one article page were:
   *
   *   895,394  image/png  /images/blog/blog_planted_tank.png
   *   833,214  image/png  .../v1773199287/aquavo/blog/turtle.png
   *   714,185  image/png  .../v1773199289/aquavo/blog/planted.png
   *
   * 2.44 MB to paint 19,200 pixels — more than the page's entire JavaScript
   * payload (1.12 MB), and image/png was the single largest resource type on
   * the page by a factor of two.
   *
   * A first attempt fixed `RelatedArticles` in blog/blog-components.tsx, which
   * is not the component this page renders — blog-post.tsx has its own markup.
   * That is what this pins: the page a reader actually loads.
   */
  const page = source("client/src/pages/blog-post.tsx");

  it("asks for a thumbnail-sized copy, not the article's original", () => {
    const tag = imgTagUsing(page, "blogThumbImage");
    expect(tag).toContain("related.imageUrl");
  });

  it("reserves the 80px box so the sidebar does not shift", () => {
    const tag = imgTagUsing(page, "blogThumbImage");
    expect(tag).toContain("width={80}");
    expect(tag).toContain("height={80}");
  });

  it("keeps them lazy — they sit in a sidebar below the fold", () => {
    const tag = imgTagUsing(page, "blogThumbImage");
    expect(tag).toContain('loading="lazy"');
  });

  it("still falls back to the brand mark when an article has no image", () => {
    const tag = imgTagUsing(page, "blogThumbImage");
    expect(tag).toContain("/brand/aquavo-v2-icon.svg");
  });

  it("leaves the hero on the hero-width helper, not the thumbnail one", () => {
    // blogHeroImage and blogThumbImage must not be transposed.
    const hero = imgTagUsing(page, "blogHeroImage");
    expect(hero).toContain('fetchPriority="high"');
    expect(hero).toContain('loading="eager"');
  });
});
