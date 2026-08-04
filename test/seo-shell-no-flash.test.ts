import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("semantic SSR shell handoff", () => {
  it("hides the semantic shell before first paint for JavaScript users", () => {
    const html = read("client/index.html");

    expect(html).toContain("el.classList.add('aq-js')");
    expect(html).toContain("html.aq-js #seo-root");
    expect(html).toContain("display: none !important");
  });

  it("reveals the semantic fallback when the client fails to mount", () => {
    const html = read("client/index.html");

    expect(html).toContain("aq-client-fallback");
    expect(html).toContain("root.childElementCount === 0");
    expect(html).toContain("5000");
  });

  it("still removes the shell after the real application mounts", () => {
    const main = read("client/src/main.tsx");

    expect(main).toContain("MutationObserver");
    expect(main).toContain('semanticRoot.remove()');
    expect(main).toContain('data-aq-client-ready');
  });
});
