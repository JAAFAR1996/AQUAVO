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
    expect(html).toContain("else resolved = 'dark'");
    expect(css).toContain("--aqv-primary: #0B93A6");
    expect(css).toContain("--aqv-bg-dark: #0B1E28");
    expect(css).toContain("--aqv-bg-light: #F6F4EF");
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
