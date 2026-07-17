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
