import { describe, expect, it } from "vitest";
import { isTrackingAllowed } from "../tracking-environment";

describe("tracking environment isolation", () => {
  it("disables unique Vercel Preview and deployment hosts", () => {
    expect(isTrackingAllowed("aquavo-abc123-jaafar1996s-projects.vercel.app")).toBe(false);
  });

  it("allows the production domains", () => {
    expect(isTrackingAllowed("www.aquavoiq.com")).toBe(true);
    expect(isTrackingAllowed("aquavoiq.com")).toBe(true);
    expect(isTrackingAllowed("aquavo.vercel.app")).toBe(true);
  });
});
