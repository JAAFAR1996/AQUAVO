import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "client/src/main.tsx"), "utf8");
const rootSource = readFileSync(resolve(process.cwd(), "client/src/storefront-root.tsx"), "utf8");

describe("semantic SSR to interactive client handoff", () => {
  it("arms a DOM observer before React renders", () => {
    expect(source).toContain("function armSemanticShellHandoff");
    expect(source).toContain("new MutationObserver");
    expect(source).toContain("clientRoot.childElementCount === 0");
    expect(source).toContain('semanticRoot.setAttribute("aria-hidden", "true")');
    expect(source).toContain("semanticRoot.remove()");
    expect(source).toContain('mountStorefront(document.getElementById("root")!');
    expect(source.indexOf("armSemanticShellHandoff();")).toBeLessThan(
      source.indexOf('mountStorefront(document.getElementById("root")!'),
    );
  });

  it("keeps the effect cleanup as a second guard", () => {
    expect(rootSource).toContain("useEffect(() => {");
    expect(rootSource).toContain('document.getElementById("seo-root")?.remove()');
    expect(rootSource).toContain("onReady?.()");
    expect(source).toContain('mountStorefront(document.getElementById("root")!, stopSemanticShellHandoff)');
    // SSR children are not proof of a client commit; only the root effect
    // may complete the semantic handoff for the hydrated home.
    expect(source).toContain('if (clientRoot?.dataset.aqSsr === "home") return () => undefined');
  });
});
