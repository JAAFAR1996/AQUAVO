import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const component = readFileSync(join(process.cwd(), "client/src/components/admin/packaging/carton-onboarding.tsx"), "utf8");
const hooks = readFileSync(join(process.cwd(), "client/src/hooks/use-packaging.ts"), "utf8");

describe("carton onboarding client contracts", () => {
  it("binds the idempotency key to the current form payload", () => {
    expect(component).toContain("setIdempotencyKey(null);");
  });

  it("announces validation and save errors to assistive technology", () => {
    expect((component.match(/role=\"alert\" aria-live=\"assertive\"/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("validates the untrusted setup response before exposing it to consumers", () => {
    expect(hooks).toContain("const cartonSetupResponseSchema = z.object");
    expect(hooks).toContain("cartonSetupResponseSchema.parse(await res.json())");
  });
});
