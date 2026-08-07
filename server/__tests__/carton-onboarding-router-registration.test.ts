import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("carton onboarding router registration", () => {
  it("mounts the exported Express router instance without invoking it during app startup", () => {
    const routes = read("server/routes.ts");
    const cartonOnboarding = read("server/routes/carton-onboarding.ts");

    expect(cartonOnboarding).toMatch(/export\s+default\s+router\s*;?/);
    expect(routes).toMatch(
      /import\s+cartonOnboardingRouter\s+from\s+["']\.\/routes\/carton-onboarding\.js["']\s*;?/,
    );
    expect(routes).toMatch(
      /app\.use\(\s*["']\/api\/admin\/packaging["']\s*,\s*cartonOnboardingRouter\s*\)\s*;?/,
    );
    expect(routes).not.toMatch(
      /app\.use\(\s*["']\/api\/admin\/packaging["']\s*,\s*cartonOnboardingRouter\s*\(\s*\)\s*\)\s*;?/,
    );
  });
});
