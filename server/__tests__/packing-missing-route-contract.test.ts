import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("packing missing summary route contract", () => {
  it("does not truncate the product rows before calculating global summary counters", () => {
    const source = readFileSync(join(process.cwd(), "server/routes/packaging-admin.ts"), "utf8");
    const start = source.indexOf('router.get(\n  \"/packing/missing\"');
    const end = source.indexOf('// ═', start);
    const route = source.slice(start, end);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(route).not.toContain("LIMIT 5000");
    expect(route).toContain("summarisePackingCompleteness");
  });
});
