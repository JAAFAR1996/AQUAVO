import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("carton onboarding router registration", () => {
  it("mounts the exported Express router instance without invoking it during app startup", () => {
    const routes = read("server/routes.ts");
    const cartonOnboarding = read("server/routes/carton-onboarding.ts");

    expect(cartonOnboarding).toContain("export default router;");
    expect(routes).toContain(
      'import cartonOnboardingRouter from "./routes/carton-onboarding.js"',
    );
    expect(routes).toContain(
      'app.use("/api/admin/packaging", cartonOnboardingRouter);',
    );
    expect(routes).not.toContain(
      'app.use("/api/admin/packaging", cartonOnboardingRouter());',
    );
  });
});
