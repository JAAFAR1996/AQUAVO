import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "client/src/main.tsx"), "utf8");

describe("semantic SSR to interactive client handoff", () => {
  it("arms a DOM observer before React renders", () => {
    expect(source).toContain("function armSemanticShellHandoff");
    expect(source).toContain("new MutationObserver");
    expect(source).toContain("clientRoot.childElementCount === 0");
    expect(source).toContain('semanticRoot.setAttribute("aria-hidden", "true")');
    expect(source).toContain("semanticRoot.remove()");
    expect(source.indexOf("armSemanticShellHandoff();")).toBeLessThan(
      source.indexOf('createRoot(document.getElementById("root")!)'),
    );
  });

  it("keeps the effect cleanup as a second guard", () => {
    expect(source).toContain("function SemanticShellCleanup");
    expect(source).toContain("stopSemanticShellHandoff();");
  });
});
