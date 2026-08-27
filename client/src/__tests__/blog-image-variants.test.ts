/**
 * Every local blog photograph must have the WebP the code asks for.
 *
 * `cloudinaryOnly` substitutes `/images/blog/foo.png` with `/images/blog/foo.opt.webp`,
 * which is only safe for as long as that file is really there. It was not,
 * once: a request for blog_planted_tank.webp answered 404 while the PNG
 * answered 200, which is why the substitution was removed in the first place.
 *
 * The variants now exist. This is what stops a fifth image being added without
 * one — a failure here means the site would serve a missing image, not merely
 * a heavy one.
 */
import { readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const BLOG_IMAGES = resolve(process.cwd(), "client/public/images/blog");
const originals = readdirSync(BLOG_IMAGES).filter((file) => /\.(png|jpe?g)$/i.test(file));

describe("local blog images", () => {
  it("has photographs to check, so this test cannot pass vacuously", () => {
    expect(originals.length).toBeGreaterThan(0);
  });

  it.each(originals)("%s has a .webp beside it", (file) => {
    const variant = file.replace(/\.(png|jpe?g)$/i, ".opt.webp");
    expect(() => statSync(resolve(BLOG_IMAGES, variant))).not.toThrow();
  });

  it.each(originals)("%s's variant is actually smaller than the original", (file) => {
    const variant = file.replace(/\.(png|jpe?g)$/i, ".opt.webp");
    const originalSize = statSync(resolve(BLOG_IMAGES, file)).size;
    const variantSize = statSync(resolve(BLOG_IMAGES, variant)).size;
    // Substituting a *larger* file would be a regression wearing the costume
    // of an optimization.
    expect(variantSize).toBeLessThan(originalSize);
  });
});
