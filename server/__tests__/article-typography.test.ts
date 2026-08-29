import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The blog article carried 22 Tailwind Typography utilities and not one of them
// applied: @tailwindcss/typography is not a dependency of this project, so no
// `.prose` rule exists in any stylesheet, while Tailwind preflight still removed
// the browser defaults those utilities were meant to replace. Measured on
// production before the fix:
//
//   paragraph spacing  0px      at every viewport
//   h2 / h3            16px     identical to body text, margin 0
//   line length        106 chars at 768px, 120 at 1366, 145 at 1920
//
// These pin the replacement, and pin that `prose` cannot come back while the
// plugin that would make it mean something is absent.

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("the article is styled by rules that exist", () => {
  it("does not use prose utilities while the plugin is not installed", () => {
    const pkg = JSON.parse(read("package.json")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const installed =
      "@tailwindcss/typography" in { ...pkg.dependencies, ...pkg.devDependencies };
    const css = read("client/src/index.css");
    const loadedAsPlugin = /@plugin\s+["'`]@tailwindcss\/typography/.test(css);

    if (installed || loadedAsPlugin) return; // prose would mean something; nothing to police.

    for (const file of ["client/src/pages/blog-post.tsx"]) {
      const source = read(file);
      for (const line of source.split(String.fromCharCode(10))) {
        if (line.trimStart().startsWith("//") || line.trimStart().startsWith("*")) continue;
        expect(
          /className=/.test(line) && /\bprose\b/.test(line),
          `${file} uses a prose class, but @tailwindcss/typography is not installed, so it styles nothing: ${line.trim()}`,
        ).toBe(false);
      }
    }
  });

  it("gives the article a measure, so a line does not run the width of a desktop", () => {
    const css = read("client/src/index.css");
    const block = css.slice(css.indexOf(".aq-article {"));
    expect(block, "no .aq-article rule").not.toBe("");
    // Capped in ch so the cap tracks the font size rather than a pixel width.
    expect(/max-width:\s*\d+ch/.test(block)).toBe(true);
  });

  it("separates paragraphs and ranks headings above body text", () => {
    const css = read("client/src/index.css");
    expect(/\.aq-article p\s*\{[^}]*margin:[^}]*em/.test(css), "paragraphs have no spacing").toBe(true);
    const h2 = css.match(/\.aq-article h2 \{([^}]*)\}/)?.[1] ?? "";
    const h3 = css.match(/\.aq-article h3 \{([^}]*)\}/)?.[1] ?? "";
    const size = (rule: string) => Number(rule.match(/font-size:\s*([\d.]+)rem/)?.[1] ?? 0);
    // Body is 1.0625rem. A heading that does not outrank it is not a heading.
    expect(size(h2)).toBeGreaterThan(1.0625);
    expect(size(h3)).toBeGreaterThan(1.0625);
    expect(size(h2)).toBeGreaterThan(size(h3));
    // A heading belongs to what follows it: more space above than below.
    expect(/margin:\s*[\d.]+em 0 [\d.]+em/.test(h2)).toBe(true);
  });

  it("keeps wide content inside its own scroll box, so the page never scrolls sideways", () => {
    const css = read("client/src/index.css");
    expect(/\.aq-article :is\(table, pre\)[^}]*overflow-x:\s*auto/.test(css)).toBe(true);
  });
});
