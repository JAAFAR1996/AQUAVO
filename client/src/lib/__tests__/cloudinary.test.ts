/**
 * Cloudinary responsive image helpers (Phase H).
 */
import { describe, it, expect } from 'vitest';
import { blogCardImage, blogHeroImage, cardImage, cardImageSrcSet, detailImage, detailImageSrcSet } from '../cloudinary';

const CLOUDINARY_URL = 'https://res.cloudinary.com/demo/image/upload/v1/product.jpg';
const LOCAL_URL = '/images/products/filter.jpg';

describe('cardImageSrcSet', () => {
  it('returns undefined for local/non-Cloudinary URLs', () => {
    expect(cardImageSrcSet(LOCAL_URL)).toBeUndefined();
    expect(cardImageSrcSet(null)).toBeUndefined();
    expect(cardImageSrcSet(undefined)).toBeUndefined();
  });

  it('builds a multi-width descriptor list for Cloudinary URLs', () => {
    const srcSet = cardImageSrcSet(CLOUDINARY_URL);
    expect(srcSet).toBeDefined();
    for (const width of [300, 400, 600, 800]) {
      expect(srcSet).toContain(`${width}w`);
    }
    // Every entry should carry the card crop/background transform, same as cardImage().
    expect(srcSet).toContain('c_pad');
    expect(srcSet).toContain('b_auto');
  });

  it('does not double-transform an already-transformed Cloudinary URL', () => {
    const alreadyTransformed = 'https://res.cloudinary.com/demo/image/upload/w_200/v1/product.jpg';
    expect(cardImageSrcSet(alreadyTransformed)).toBeUndefined();
  });

  it('stays consistent with the single-image cardImage() helper', () => {
    // cardImage() picks width 400 with the same crop/background — that
    // combination should appear as one of the srcSet entries.
    const single = cardImage(CLOUDINARY_URL);
    const srcSet = cardImageSrcSet(CLOUDINARY_URL) ?? '';
    const width400Entry = srcSet.split(', ').find((entry) => entry.endsWith(' 400w'));
    expect(width400Entry?.replace(/ 400w$/, '')).toBe(single);
  });
});

describe('detailImageSrcSet', () => {
  it('returns undefined for local/non-Cloudinary URLs', () => {
    expect(detailImageSrcSet(LOCAL_URL)).toBeUndefined();
  });

  it('builds a multi-width descriptor list for Cloudinary URLs', () => {
    const srcSet = detailImageSrcSet(CLOUDINARY_URL);
    expect(srcSet).toBeDefined();
    for (const width of [400, 600, 800, 1200]) {
      expect(srcSet).toContain(`${width}w`);
    }
  });

  it('stays consistent with the single-image detailImage() helper', () => {
    const single = detailImage(CLOUDINARY_URL);
    const srcSet = detailImageSrcSet(CLOUDINARY_URL) ?? '';
    const width800Entry = srcSet.split(', ').find((entry) => entry.endsWith(' 800w'));
    expect(width800Entry?.replace(/ 800w$/, '')).toBe(single);
  });
});

/**
 * Blog image helpers.
 *
 * Blog was the one image surface that never went through this module: articles
 * shipped their Cloudinary original, so a 497 KB PNG hero was the LCP element
 * on every post (measured LCP 14.4 s on a throttled phone). The same asset
 * through `blogHeroImage` is 29 KB of WebP.
 */
describe('blogHeroImage', () => {
  it('serves a Cloudinary hero as auto-format, hero-width, without upscaling', () => {
    const url = blogHeroImage(CLOUDINARY_URL);
    expect(url).toContain('f_auto');
    expect(url).toContain('q_auto:good');
    expect(url).toContain('w_1200');
    // c_limit never enlarges an original that is already smaller than 1200px.
    expect(url).toContain('c_limit');
  });

  it('does not constrain height, so a wide hero keeps its aspect ratio', () => {
    expect(blogHeroImage(CLOUDINARY_URL)).not.toContain('h_');
  });

  it('leaves an already-transformed URL alone rather than double-transforming', () => {
    const transformed = 'https://res.cloudinary.com/demo/image/upload/w_600,f_auto/v1/hero.png';
    expect(blogHeroImage(transformed)).toBe(transformed);
  });

  it('returns an empty string for a missing image, so callers fall back', () => {
    expect(blogHeroImage(null)).toBe('');
    expect(blogHeroImage(undefined)).toBe('');
    expect(blogHeroImage('')).toBe('');
  });
});

describe('blogCardImage', () => {
  it('requests a card-sized copy, smaller than the hero', () => {
    const url = blogCardImage(CLOUDINARY_URL);
    expect(url).toContain('w_600');
    expect(url).toContain('f_auto');
    expect(url).toContain('c_limit');
    expect(url).not.toContain('w_1200');
  });

  it('returns an empty string for a missing image, so callers fall back', () => {
    expect(blogCardImage(null)).toBe('');
  });
});
