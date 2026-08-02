import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("packing missing summary route contract", () => {
  it("does not truncate the product rows before calculating global summary counters", () => {
    const source = readFileSync(join(process.cwd(), "server/routes/packaging-admin.ts"), "utf8");
    const routeStart = /router\.get\(\s*["']\/packing\/missing["']/.exec(source);
    expect(routeStart).not.toBeNull();

    const start = routeStart?.index ?? -1;
    const nextRoute = source.indexOf("\nrouter.", start + 1);
    const end = nextRoute === -1 ? source.length : nextRoute;
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const route = source.slice(start, end);
    expect(route).not.toContain("LIMIT 5000");
    expect(route).toContain("summarisePackingCompleteness");
  });
});
