// @vitest-environment node
import { build } from "esbuild";
import { describe, expect, it } from "vitest";

describe("bundled operator order effects", () => {
  it("includes local loyalty modules without leaving runtime paths outside the bundle", async () => {
    const result = await build({
      entryPoints: ["server/routes/admin-orders-v2.ts"],
      platform: "node",
      format: "esm",
      bundle: true,
      packages: "external",
      write: false,
      metafile: true,
      logLevel: "silent",
    });
    const dependencies = result.metafile.inputs["server/routes/admin-orders-v2.ts"].imports;
    for (const path of [
      "server/storage/loyalty-storage.ts",
      "server/storage/badge-engine.ts",
      "server/storage/challenge-storage.ts",
    ]) {
      expect(dependencies).toContainEqual(expect.objectContaining({ path, kind: "dynamic-import" }));
      expect(result.metafile.inputs[path]).toBeDefined();
    }
    const unresolvedLocalImports = Object.values(result.metafile.outputs)
      .flatMap(output => output.imports)
      .filter(dependency => dependency.external && /^\.{1,2}\//.test(dependency.path));
    expect(unresolvedLocalImports).toEqual([]);
  });
});
