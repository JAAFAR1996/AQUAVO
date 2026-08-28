import { build as esbuild } from "esbuild";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

/**
 * Prerender the hook-free static pages to static HTML at build time.
 *
 * These routes render real content for a person and almost nothing for a
 * crawler. api/_seo-preview-shell.tsx serves them as `StaticPage`: a breadcrumb,
 * an H1 and a one-sentence summary. Measured on production, comparing the
 * <main> landmark on both sides:
 *
 *   /terms            crawler  16 words   browser 479
 *   /about            crawler  63 words   browser 412
 *   /sustainability   crawler  20 words   browser 242
 *   /privacy-policy   crawler  20 words   browser 235
 *   /return-policy    crawler  19 words   browser 188
 *
 * Rather than copying that copy into a second place, the real page component is
 * rendered here and the result is handed to the crawler shell. The component
 * stays the only source of truth, so the two can never disagree, and the
 * browser is untouched — it still gets the SPA.
 *
 * A page is listed only after its prerendered output was compared against the
 * browser and found to match. Several were tried and rejected because a static
 * render shows an unfilled state rather than the page a visitor reads:
 *
 *   /fish-encyclopedia  renders "أكثر من 0 نوع" -- a literal zero count -- where
 *                       a visitor sees 1,680 words. Publishing that to a crawler
 *                       would state something untrue.
 *   /aquarium-wizard    renders one word.
 *   /tank-builder       same component as /aquarium-wizard.
 *   /deals              needs CartProvider.
 *   /community-gallery  needs AuthProvider.
 *   /journey            needs QueryClientProvider.
 *
 * Those keep the existing summary path, which is thin but accurate.
 *
 * /about is deliberately excluded even though it qualifies technically. Its
 * crawler shell publishes business facts the React page does not carry -- the
 * registered legal name, that there is no walk-in shop, and that AQUAVO sells
 * no live animals -- so swapping content in would drop disclosures. That one
 * needs an editorial decision about where those facts belong, not a rendering
 * change.
 */
export const PRERENDERABLE_PAGES: Record<string, string> = {
  "/beginner-guide": "beginner-guide",
  "/calculators": "calculators",
  "/contact": "contact",
  "/fish-compatibility": "fish-compatibility",
  "/fish-breeding-calculator": "fish-breeding-calculator",
  "/fish-finder": "fish-finder",
  "/fish-health": "fish-health-diagnosis",
  "/fish-health-diagnosis": "fish-health-diagnosis",
  "/privacy-policy": "privacy-policy",
  "/return-policy": "return-policy",
  "/shipping": "shipping",
  "/sustainability": "sustainability",
  "/terms": "terms",
  "/why-aquavo": "why-aquavo",
};

/**
 * Strip everything that belongs to the document head or would duplicate what
 * the shell already emits. MetaTags renders its own JSON-LD and head tags, and
 * the crawler document already carries canonical, robots and structured data.
 */
function stripHeadArtefacts(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<title[\s\S]*?<\/title>/gi, "")
    .replace(/<meta\b[^>]*\/?>/gi, "")
    .replace(/<link\b[^>]*\/?>/gi, "");
}

/**
 * The shell already emits the page's H1, and that is the heading currently
 * indexed. The prerendered content is appended under it, so the page's own H1
 * becomes an H2 to keep exactly one H1 and a valid heading order.
 */
function demoteHeading(html: string): string {
  return html.replace(/<h1(\s[^>]*)?>/gi, "<h2$1>").replace(/<\/h1>/gi, "</h2>");
}

/** Take the inside of the page's own <main>, since the shell supplies one. */
function innerMain(html: string): string {
  const match = html.match(/<main[^>]*>([\s\S]*)<\/main>/i);
  return (match ? match[1] : html).trim();
}

export async function prerenderStaticPages(): Promise<Record<string, string>> {
  await mkdir("generated", { recursive: true });
  const entry = "generated/static-pages-entry.tsx";
  const bundle = "generated/static-pages-entry.mjs";

  const imports = Object.entries(PRERENDERABLE_PAGES)
    .map(([route, file], index) => `import P${index} from "../client/src/pages/${file}";`)
    .join("\n");
  const table = Object.keys(PRERENDERABLE_PAGES)
    .map((route, index) => `  ${JSON.stringify(route)}: P${index},`)
    .join("\n");

  await writeFile(
    entry,
    [
      'import { renderToStaticMarkup } from "react-dom/server";',
      'import { createElement } from "react";',
      imports,
      "const PAGES = {",
      table,
      "};",
      "export function renderAll() {",
      "  const out = {};",
      "  for (const [route, Component] of Object.entries(PAGES)) {",
      "    out[route] = renderToStaticMarkup(createElement(Component));",
      "  }",
      "  return out;",
      "}",
      "",
    ].join("\n"),
  );

  await esbuild({
    entryPoints: [entry],
    outfile: bundle,
    platform: "node",
    format: "esm",
    bundle: true,
    jsx: "automatic",
    logLevel: "silent",
    define: {
      "process.env.NODE_ENV": '"production"',
      // Client modules read Vite's import.meta.env (analytics keys and the
      // like). Node has no such object; an empty one makes every lookup
      // undefined, which is what these pages already handle for a visitor who
      // has analytics disabled. No key is embedded in the prerendered HTML.
      "import.meta.env": "{}",
    },
    alias: {
      "@": resolve("client/src"),
      "@shared": resolve("shared"),
      // Same reason as the hero prerender: the real Link reaches for browser
      // globals under Node, while the component keeps importing real wouter so
      // navigation stays client-side once React has mounted.
      wouter: resolve("script/wouter-static-link.tsx"),
      // See script/dompurify-static-stub.ts: the real package pulls jsdom and
      // an optional native canvas binding that cannot resolve here, and nothing
      // it sanitises survives the strip below.
      "isomorphic-dompurify": resolve("script/dompurify-static-stub.ts"),
    },
    banner: {
      js: "import { createRequire } from 'module';const require = createRequire(import.meta.url);",
    },
  });

  const module_ = (await import(`${pathToFileURL(resolve(bundle)).href}?t=${Date.now()}`)) as {
    renderAll: () => Record<string, string>;
  };

  const rendered: Record<string, string> = {};
  for (const [route, html] of Object.entries(module_.renderAll())) {
    const cleaned = demoteHeading(innerMain(stripHeadArtefacts(html)));
    if (cleaned.length < 400) {
      throw new Error(`prerendered ${route} is suspiciously small (${cleaned.length} chars)`);
    }
    if (/<script|<\/head>|application\/ld\+json/i.test(cleaned)) {
      throw new Error(`prerendered ${route} still carries head/script artefacts`);
    }
    if (/<h1[\s>]/i.test(cleaned)) {
      throw new Error(`prerendered ${route} still carries an h1; the shell owns it`);
    }
    rendered[route] = cleaned;
  }

  await rm(entry, { force: true });
  await rm(bundle, { force: true });
  return rendered;
}

export async function generateStaticPagesModule(): Promise<void> {
  const pages = await prerenderStaticPages();
  await writeFile(
    "api/_prerendered-pages.ts",
    "// AUTO-GENERATED by script/prerender-static-pages.ts — do not edit\n" +
      `export const PRERENDERED_PAGES: Record<string, string> = ${JSON.stringify(pages, null, 1)};\n`,
  );
}
