import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isDynamicImportError } from "../client/src/lib/chunk-recovery";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("client stale chunk recovery", () => {
  it("recognizes browser dynamic-import failures without matching ordinary errors", () => {
    expect(isDynamicImportError(new TypeError("Failed to fetch dynamically imported module: /chunks/x.js"))).toBe(true);
    expect(isDynamicImportError(new Error("Importing a module script failed."))).toBe(true);
    expect(isDynamicImportError(new Error("ChunkLoadError: Loading chunk 123 failed."))).toBe(true);
    expect(isDynamicImportError(new Error("network request failed"))).toBe(false);
    expect(isDynamicImportError(new Error("validation failed"))).toBe(false);
  });

  it("bundles accountant PDF dependencies with the finance route instead of fetching them on click", () => {
    const pdf = read("client/src/lib/accountant-pdf-v2.ts");
    expect(pdf).toContain('import { jsPDF } from "jspdf";');
    expect(pdf).toContain('import { getFontEmbedCSS, toJpeg } from "html-to-image";');
    expect(pdf).not.toContain('import("jspdf")');
    expect(pdf).not.toContain('import("html-to-image")');
  });

  it("installs stale-chunk recovery before the app bootstrap import", () => {
    const main = read("client/src/main.tsx");
    expect(main).toContain("installChunkLoadRecovery();");
    expect(main.indexOf("installChunkLoadRecovery();")).toBeLessThan(main.indexOf('import("./App")'));
    expect(main).toContain("recoverFromDynamicImportError(error)");
  });
});
