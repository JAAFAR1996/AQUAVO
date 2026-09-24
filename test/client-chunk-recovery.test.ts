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

  it("uses a static vector accountant PDF module without stale dynamic image chunks", () => {
    const wrapper = read("client/src/lib/accountant-pdf-v2.ts");
    const vector = read("client/src/lib/accountant-pdf-vector.tsx");
    expect(wrapper).toContain('from "./accountant-pdf-vector"');
    expect(vector).toContain('from "@react-pdf/renderer"');
    expect(vector).not.toContain("html-to-image");
    expect(vector).not.toContain("jsPDF");
    expect(vector).not.toContain('import("');
  });

  it("installs stale-chunk recovery before the app bootstrap import", () => {
    const main = read("client/src/main.tsx");
    expect(main).toContain("installChunkLoadRecovery();");
    expect(main.indexOf("installChunkLoadRecovery();")).toBeLessThan(main.indexOf('import("./App")'));
    expect(main).toContain("recoverFromDynamicImportError(error)");
  });
});
