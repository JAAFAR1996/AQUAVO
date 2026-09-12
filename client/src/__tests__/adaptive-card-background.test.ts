import { describe, expect, it } from "vitest";

import { clearAdaptiveBackgroundCache } from "@/lib/adaptive-card-background";

describe("adaptive card background cache", () => {
  it("can be reset between image-analysis sessions", () => {
    expect(() => clearAdaptiveBackgroundCache()).not.toThrow();
  });
});
