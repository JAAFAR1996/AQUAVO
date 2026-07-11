import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("document shell", () => {
  it("does not cover the React app with a timed loading overlay", () => {
    const html = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");

    expect(html).not.toContain('id="loading-shell"');
    expect(html).not.toContain("critical-shell-hide");
    expect(html).not.toContain("shell-out");
  });
});
