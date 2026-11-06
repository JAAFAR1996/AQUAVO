import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("cart-session amount semantics", () => {
  it("does not invent a zero-IQD total for an unpriced cart session", () => {
    const text = readFileSync(resolve(process.cwd(), "server/services/analytics-tracker.ts"), "utf8");
    const scopes = [
      text.split("async trackCartAdd(")[1]?.split("async trackCartRemove(")[0],
      text.split("async trackCartRemove(")[1]?.split("async touchCartSession(")[0],
      text.split("async touchCartSession(")[1]?.split("async abandonStaleCartSessions(")[0],
    ];

    for (const scope of scopes) {
      expect(scope, "cart lifecycle tracking method must be present").toBeDefined();
      // Both INSERT and UPSERT paths must retain unknown, not fabricate 0 IQD.
      expect((scope?.match(/totalValue: null/g) ?? []).length).toBe(2);
      expect(scope).not.toContain("totalValue: 0");
    }
  });

  it("continues tracking cart abandonment by inactivity and conversion by order", () => {
    const text = readFileSync(resolve(process.cwd(), "server/services/analytics-tracker.ts"), "utf8");
    expect(text).toContain("async abandonStaleCartSessions(maxAgeHours = 24)");
    expect(text).toContain("async trackSessionStatus(sessionId: string, status:");
  });
});
