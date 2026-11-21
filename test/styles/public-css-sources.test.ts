// @vitest-environment node
import { build } from "esbuild";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PRERENDERABLE_PAGES } from "../../script/prerender-static-pages";

describe("public CSS source exclusions", () => {
  it("never excludes a UI component reachable from the client, SSR or build renderers", async () => {
    const css = readFileSync(resolve("client/src/index.css"), "utf8");
    const excluded = [...css.matchAll(/@source not "(\.\/components\/ui\/[^"*{}]+\.tsx)";/g)]
      .map(match => resolve("client/src", match[1]));
    expect(excluded.length).toBeGreaterThan(0);

    // This includes every literal React.lazy/import() route in App, all API
    // renderers, static-only page entries and the inline reveal used by Vite.
    // Dependencies are parsed, never executed; no output or network is used.
    const entryPoints = [
      "client/src/main.tsx",
      "client/src/components/home/home-hero.tsx",
      "vite.config.ts",
      ...Object.values(PRERENDERABLE_PAGES).map(page => `client/src/pages/${page}.tsx`),
      ...readdirSync(resolve("api")).filter(file => /\.tsx?$/.test(file)).map(file => `api/${file}`),
    ];
    const result = await build({
      entryPoints,
      outdir: resolve(".css-graph-check"),
      bundle: true,
      write: false,
      metafile: true,
      packages: "external",
      platform: "node",
      format: "esm",
      logLevel: "silent",
      loader: { ".css": "empty", ".svg": "empty" },
      tsconfig: resolve("tsconfig.json"),
      plugins: [{
        name: "canonical-semantic-runtime-source",
        setup(builder) {
          // A clean checkout has no generated runtime yet. This is precisely
          // the source script/build.ts bundles into that generated module.
          builder.onResolve({ filter: /generated\/ssr-preview-runtime\.js$/ }, () => ({
            path: resolve("api/_ssr-preview-source.ts"),
          }));
        },
      }],
    });
    const reachable = new Set(Object.keys(result.metafile.inputs).map(file => resolve(file)));
    expect(reachable.has(resolve("client/src/pages/admin/finance.tsx"))).toBe(true);
    expect(reachable.has(resolve("client/src/pages/product-details.tsx"))).toBe(true);
    expect(reachable.has(resolve("client/src/components/products/product-reviews.tsx"))).toBe(true);
    expect(reachable.has(resolve("client/src/components/effects/first-dive-intro.tsx"))).toBe(true);
    for (const file of excluded) {
      expect(existsSync(file), `Missing excluded template: ${file}`).toBe(true);
      expect(reachable.has(file), `Restore Tailwind scanning before using ${file}`).toBe(false);
    }
  });
});
