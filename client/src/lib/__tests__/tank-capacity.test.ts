import { describe, expect, it } from "vitest";
import { geometricTankLiters } from "../tank-capacity";

describe("geometricTankLiters", () => {
  it("calculates an aquarium's geometric capacity in liters", () => {
    expect(geometricTankLiters({ lengthCm: 60, widthCm: 40, heightCm: 40 })).toBe(96);
    expect(geometricTankLiters({ lengthCm: 45, widthCm: 30, heightCm: 30 })).toBe(40.5);
  });
  it("does not invent a capacity from incomplete or invalid measurements", () => {
    expect(geometricTankLiters({ lengthCm: 60, widthCm: 0, heightCm: 40 })).toBeNull();
    expect(geometricTankLiters({ lengthCm: -1, widthCm: 40, heightCm: 40 })).toBeNull();
    expect(geometricTankLiters({ lengthCm: Infinity, widthCm: 40, heightCm: 40 })).toBeNull();
    expect(geometricTankLiters({ lengthCm: 500, widthCm: 500, heightCm: 500 })).toBeNull();
  });
});
