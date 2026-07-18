import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("document shell", () => {
  it("does not cover the React app with a timed loading overlay", () => {
    const html = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");

    expect(html).not.toContain('id="loading-shell"');
    expect(html).not.toContain("critical-shell-hide");
    expect(html).not.toContain("shell-out");
    expect(html).toContain("<!--__JSON_LD__-->");
  });

  it("uses the approved v2 colors, fonts and favicon in the document shell", () => {
    const html = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");
    const css = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

    expect(html).toContain('content="#0B93A6"');
    expect(html).toContain('/brand/aquavo-v2-favicon.png');
    expect(html).toContain("family=Inter");
    expect(html).not.toContain("Outfit");
    // First-time visitors and read failures default to Light (no dark flash).
    expect(html).toContain("var resolved = 'light'");
    expect(html).not.toContain("else resolved = 'dark'");
    expect(css).toContain("--aqv-primary: #0B93A6");
    expect(css).toContain("--aqv-bg-dark: #0B1E28");
    expect(css).toContain("--aqv-bg-light: #F6F4EF");
  });

  it("preloads the real hero LCP asset with sizes matching the runtime <img> on the home page", () => {
    const html = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");
    const home = readFileSync(resolve(process.cwd(), "client/src/pages/home.tsx"), "utf8");

    // The static preload in the document shell must reference the same file the
    // home page actually renders as its LCP image (otherwise the preload wastes
    // bandwidth on the wrong asset and does nothing for LCP).
    const preloadMatch = html.match(/<link rel="preload"[^>]*as="image"[^>]*>/);
    expect(preloadMatch).not.toBeNull();
    const preloadTag = preloadMatch![0];

    const hrefMatch = preloadTag.match(/href="([^"]+)"/);
    expect(hrefMatch).not.toBeNull();
    expect(home).toContain(hrefMatch![1]);

    // The preload's imagesizes must match the <img>'s sizes attribute for the same
    // asset, or the browser's preload scanner can fetch the wrong responsive
    // variant and the preload becomes counter-productive.
    const imagesizesMatch = preloadTag.match(/imagesizes="([^"]+)"/);
    expect(imagesizesMatch).not.toBeNull();
    expect(home).toContain(`sizes="${imagesizesMatch![1]}"`);
  });

  it("loads each font family via a single Google Fonts stylesheet request (no duplicates)", () => {
    const html = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");

    const stylesheetLinks = Array.from(
      html.matchAll(/<link\b(?=[^>]*\bfonts\.googleapis\.com)(?=[^>]*rel="stylesheet")[^>]*>/g)
    );
    // One live <link rel="stylesheet"> plus its <noscript> fallback copy is expected;
    // more than that means a duplicate/blocking font request was introduced.
    expect(stylesheetLinks.length).toBe(2);

    const preconnects = Array.from(html.matchAll(/<link rel="preconnect" href="https:\/\/fonts\.(googleapis|gstatic)\.com"[^>]*>/g));
    expect(preconnects.length).toBe(2);
  });

  it("ships the approved v2 logo assets through the web manifest", () => {
    const manifestPath = resolve(process.cwd(), "client/public/manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      theme_color: string;
      background_color: string;
      icons: Array<{ src: string; sizes: string }>;
    };

    expect(manifest.theme_color).toBe("#0B93A6");
    expect(manifest.background_color).toBe("#0B1E28");
    expect(manifest.icons).toEqual([
      {
        src: "/brand/aquavo-v2-favicon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ]);
    expect(existsSync(resolve(process.cwd(), "client/public/brand/aquavo-v2-horizontal.svg"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "client/public/brand/aquavo-v2-icon.svg"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "client/public/brand/aquavo-v2-favicon.png"))).toBe(true);
  });
});
