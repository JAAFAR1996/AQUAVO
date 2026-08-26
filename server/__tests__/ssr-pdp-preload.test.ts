import { describe, expect, it } from "vitest";
import { injectMeta } from "../../api/ssr-meta";

/**
 * PDP SSR image-preload parity (Phase C, Fix A).
 *
 * The PDP main image renders through `client/src/lib/cloudinary.ts`
 * `detailImage()`, which transforms Cloudinary URLs to
 * `f_auto,q_auto:good,w_800,h_800,c_limit`. The SSR-injected preload in
 * `api/ssr-meta.ts` must advertise the SAME transformed URL — otherwise the
 * browser fetches both the raw original and the transformed asset, the
 * preload goes unused, and Chrome logs "resource preloaded using link
 * preload but not used within a few seconds."
 */

const TEMPLATE = `
<head>
  <title>__META_TITLE__</title>
  <meta name="description" content="__META_DESCRIPTION__">
  <link rel="canonical" href="__META_URL__">
  <link rel="preload" fetchpriority="high" as="image" href="/images/aquascape-styles/iwagumi_aquascape_1765676307763.webp">
  <!-- Open Graph / Facebook -->
  <meta property="og:title" content="__META_TITLE__">
  <meta property="og:type" content="__META_OG_TYPE__">
  <meta property="og:url" content="__META_URL__">
  <meta property="og:image" content="__META_IMAGE__">
  <!--__JSON_LD__-->
</head>`;

const BASE_META = {
  title: "فلتر YEE 600 | AQUAVO",
  description: "فلتر عملي.",
  ogType: "product",
};

function renderProduct(image: string) {
  return injectMeta(TEMPLATE, {
    ...BASE_META,
    url: "https://www.aquavoiq.com/products/yee-filter",
    image,
  });
}

function preloadHref(html: string): string {
  const match = html.match(/<link[^>]*rel="preload"[^>]*as="image"[^>]*>/);
  return match?.[0].match(/href="([^"]*)"/)?.[1] ?? "";
}

describe("PDP SSR preload targets the rendered Cloudinary asset", () => {
  const RAW = "https://res.cloudinary.com/aquavo/image/upload/v123/products/yee-filter.jpg";
  const TRANSFORMED =
    "https://res.cloudinary.com/aquavo/image/upload/f_auto,q_auto:good,w_800,h_800,c_limit/v123/products/yee-filter.jpg";

  it("transforms a raw Cloudinary product image to the detail-size candidate (w_800/c_limit/f_auto)", () => {
    const html = renderProduct(RAW);
    const href = preloadHref(html);
    expect(href).toBe(TRANSFORMED);
    expect(href).toContain("w_800");
    expect(href).toContain("h_800");
    expect(href).toContain("c_limit");
    expect(href).toContain("f_auto");
    expect(href).toContain("q_auto:good");
  });

  it("regression guard: rejects preloading the raw/untransformed Cloudinary URL", () => {
    const html = renderProduct(RAW);
    const href = preloadHref(html);
    expect(href).not.toBe(RAW);
    expect(html).not.toContain(`href="${RAW}"`);
  });

  it("does not double-transform a Cloudinary URL that already carries transform tokens", () => {
    const alreadyTransformed =
      "https://res.cloudinary.com/aquavo/image/upload/w_1200,f_auto/v123/products/yee-filter.jpg";
    const href = preloadHref(renderProduct(alreadyTransformed));
    expect(href).toBe(alreadyTransformed);
  });

  it("preserves the fallback for local/non-Cloudinary images (no bogus Cloudinary transform)", () => {
    const local = "https://www.aquavoiq.com/images/products/yee-filter.webp";
    const href = preloadHref(renderProduct(local));
    expect(href).toBe(local);
    expect(href).not.toContain("f_auto");
    expect(href).not.toContain("w_800");
  });

  it("emits exactly one PDP image preload", () => {
    const html = renderProduct(RAW);
    const preloads = html.match(/<link[^>]*rel="preload"[^>]*as="image"[^>]*>/g) ?? [];
    expect(preloads).toHaveLength(1);
  });

  it("leaves the Open Graph product image untouched (raw absolute URL, not the preload transform)", () => {
    const html = renderProduct(RAW);
    const ogImageMatch = html.match(/<meta property="og:image" content="([^"]*)">/);
    expect(ogImageMatch?.[1]).toBe(RAW);
  });
});

/**
 * A bare `href` preload is not enough for a responsive <img>.
 *
 * The PDP main image carries `srcSet={detailImageSrcSet(...)}` (400/600/800/
 * 1200w) and `sizes="(max-width: 512px) 100vw, 512px"`. The preload advertised
 * only the w_800 href, so on a 412px phone at 2.625 DPR — needing ~1082px —
 * the img resolved to the 1200w candidate while the preload had fetched 800w.
 * The preload went unused and the LCP image was not discovered until React
 * rendered it: LCP 3,399 ms, 3,145 ms of it load delay.
 *
 * The preload's imagesrcset/imagesizes must therefore stay identical to the
 * img's srcset/sizes, or the two silently pick different candidates again.
 */
describe("PDP preload matches the responsive candidates the <img> will choose", () => {
  const RAW = "https://res.cloudinary.com/aquavo/image/upload/v123/products/yee-filter.jpg";

  function preloadTag(html: string): string {
    return html.match(/<link[^>]*rel="preload"[^>]*as="image"[^>]*>/)?.[0] ?? "";
  }

  function attr(tag: string, name: string): string {
    return tag.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? "";
  }

  it("advertises every width the img's srcset offers", () => {
    const tag = preloadTag(renderProduct(RAW));
    const srcset = attr(tag, "imagesrcset");
    expect(srcset).not.toBe("");
    for (const width of [400, 600, 800, 1200]) {
      expect(srcset).toContain(`w_${width},h_${width},c_limit`);
      expect(srcset).toContain(`${width}w`);
    }
  });

  it("uses the exact sizes attribute the PDP img uses", () => {
    const tag = preloadTag(renderProduct(RAW));
    expect(attr(tag, "imagesizes")).toBe("(max-width: 512px) 100vw, 512px");
  });

  it("builds each candidate with the same transform as detailImageSrcSet", () => {
    const tag = preloadTag(renderProduct(RAW));
    const candidates = attr(tag, "imagesrcset").split(", ");
    expect(candidates).toHaveLength(4);
    for (const candidate of candidates) {
      expect(candidate).toContain("f_auto");
      expect(candidate).toContain("q_auto:good");
      expect(candidate).toMatch(/ \d+w$/);
    }
  });

  it("keeps fetchpriority=high alongside the responsive attributes", () => {
    const tag = preloadTag(renderProduct(RAW));
    expect(tag).toContain('fetchpriority="high"');
    expect(tag).toContain('as="image"');
  });

  it("still emits exactly one preload, href included, for the scanner to fall back on", () => {
    const html = renderProduct(RAW);
    expect(html.match(/<link[^>]*rel="preload"[^>]*as="image"[^>]*>/g) ?? []).toHaveLength(1);
    expect(attr(preloadTag(html), "href")).toContain("w_800");
  });

  it("omits imagesrcset for a local image, rather than inventing Cloudinary candidates", () => {
    const tag = preloadTag(renderProduct("https://www.aquavoiq.com/images/products/yee.webp"));
    expect(tag).not.toContain("imagesrcset");
    expect(tag).not.toContain("f_auto");
  });

  it("omits imagesrcset for an already-transformed URL, rather than double-transforming", () => {
    const tag = preloadTag(
      renderProduct("https://res.cloudinary.com/aquavo/image/upload/w_1200,f_auto/v123/p.jpg"),
    );
    expect(tag).not.toContain("imagesrcset");
  });
});

describe("Home hero preload is unaffected by the PDP preload fix", () => {
  it("keeps the 48vw home hero preload and does not apply any Cloudinary transform", () => {
    const html = injectMeta(TEMPLATE, {
      title: "AQUAVO",
      description: "وصف.",
      url: "https://www.aquavoiq.com/",
      image: "https://www.aquavoiq.com/brand/aquavo-v2-horizontal.png",
    });
    expect(html).toContain("iwagumi_aquascape_1765676307763.webp");
    expect(html).not.toContain("66vw");
    const preloads = html.match(/<link[^>]*rel="preload"[^>]*as="image"[^>]*>/g) ?? [];
    expect(preloads).toHaveLength(1);
  });
});
