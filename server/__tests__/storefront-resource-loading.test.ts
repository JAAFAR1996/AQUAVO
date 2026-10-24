import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { injectMeta } from "../../api/ssr-meta";

const root = process.cwd();
const fontDir = resolve(root, "client/src/assets/storefront-fonts");
const css = readFileSync(resolve(root, "client/src/styles/storefront-fonts.css"), "utf8");
const sources = JSON.parse(readFileSync(resolve(fontDir, "SOURCES.json"), "utf8")) as {
  assets: Array<{ file: string; sha256: string; bytes: number }>;
};

describe("storefront resource loading without visual changes", () => {
  it("preloads existing startup chunks without eagerly loading optional routes", () => {
    const template = readFileSync(resolve(root, "dist/ssr-template/index.html"), "utf8");
    const hints = template.match(/<link\b[^>]*rel="modulepreload"[^>]*>/g) ?? [];
    expect(hints.length).toBeGreaterThan(0);
    for (const hint of hints) {
      const href = hint.match(/href="([^"]+)"/)?.[1];
      expect(href).toBeTruthy();
      expect(href).not.toMatch(/admin-dashboard-|model-viewer-|jspdf-|recharts-/);
      expect(readFileSync(resolve(root, "dist/public", href!.replace(/^\//, ""))).length).toBeGreaterThan(0);
    }
    expect(template).not.toContain("fonts.googleapis.com");
    const stylesheet = template.match(/<link rel="stylesheet" crossorigin href="([^"]+)"/)?.[1];
    expect(stylesheet).toBeTruthy();
    const builtCss = readFileSync(resolve(root, "dist/public", stylesheet!.replace(/^\//, "")), "utf8");
    expect(builtCss).toContain("@font-face");
    expect(builtCss).not.toContain("fonts.gstatic.com");
  });

  it("preserves dependency preloads through the SSR metadata transform", () => {
    const dependencies = ["vendor-react", "vendor-animation", "vendor-ui"];
    const hints = dependencies.map((name) => `<link rel="modulepreload" crossorigin href="/chunks/${name}-test.js">`);
    const html = injectMeta(`<html><head>${hints.join("\n")}</head><body><div id="root"></div></body></html>`, {
      title: "AQUAVO", description: "Storefront", url: "https://www.aquavoiq.com/", image: "https://www.aquavoiq.com/brand/icon.png", ogType: "website",
    });
    for (const hint of hints) expect(html).toContain(hint);
  });

  it("ships every declared font as an unchanged WOFF2 asset", () => {
    const references = [...css.matchAll(/url\(\.\.\/assets\/storefront-fonts\/([^)]*)\)/g)].map((match) => match[1]);
    expect(new Set(references)).toEqual(new Set(sources.assets.map((asset) => asset.file)));
    expect(css).not.toMatch(/url\(https?:/);
    for (const asset of sources.assets) {
      const bytes = readFileSync(resolve(fontDir, asset.file));
      expect(bytes.subarray(0, 4).toString()).toBe("wOF2");
      expect(bytes.length).toBe(asset.bytes);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(asset.sha256);
    }
  });

  it("retains all existing families, weights, character subsets and swap behavior", () => {
    const faces = css.match(/@font-face\s*\{[^}]*\}/g) ?? [];
    const expected: Record<string, number[]> = { Cairo: [400, 500, 700], Changa: [700], Inter: [400, 500, 600, 700] };
    for (const [family, weights] of Object.entries(expected)) {
      for (const weight of weights) {
        const matching = faces.filter((face) => face.includes(`font-family: '${family}'`) && face.includes(`font-weight: ${weight};`));
        expect(matching.length).toBeGreaterThan(0);
        for (const face of matching) {
          expect(face).toContain("font-display: swap");
          expect(face).toContain("unicode-range:");
        }
      }
    }
    expect(css).toContain("U+0600-06FF");
    expect(css).toContain("U+0000-00FF");
  });
});
