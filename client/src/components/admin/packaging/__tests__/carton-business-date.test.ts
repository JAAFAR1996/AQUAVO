import { describe, expect, it } from "vitest";
import { businessDateInBaghdad } from "../carton-onboarding";

describe("carton cost business date", () => {
  it("uses the Baghdad calendar date when UTC is still on the prior day", () => {
    expect(businessDateInBaghdad(new Date("2026-08-01T21:30:00.000Z"))).toBe("2026-08-02");
  });
});
