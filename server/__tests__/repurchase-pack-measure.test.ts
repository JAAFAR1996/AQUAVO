import { describe, expect, it } from "vitest";
import { parseRepurchasePackMeasure } from "../services/growth-operating-system.js";

describe("repurchase pack measure parser", () => {
  it("normalizes Arabic and English volume labels", () => {
    expect(parseRepurchasePackMeasure("500 مل")).toEqual({ dimension: "volume", amount: 500 });
    expect(parseRepurchasePackMeasure("1000ml")).toEqual({ dimension: "volume", amount: 1000 });
    expect(parseRepurchasePackMeasure("1.5 لتر")).toEqual({ dimension: "volume", amount: 1500 });
  });

  it("normalizes mass labels", () => {
    expect(parseRepurchasePackMeasure("210 g")).toEqual({ dimension: "mass", amount: 210 });
    expect(parseRepurchasePackMeasure("2.5 كغم")).toEqual({ dimension: "mass", amount: 2500 });
  });

  it("normalizes count-based consumables and Arabic digits", () => {
    expect(parseRepurchasePackMeasure("50 شريط")).toEqual({ dimension: "count", amount: 50 });
    expect(parseRepurchasePackMeasure("٥٠ شريط")).toEqual({ dimension: "count", amount: 50 });
  });

  it("does not invent a pack size from unrelated variants", () => {
    expect(parseRepurchasePackMeasure("أسود")).toBeNull();
    expect(parseRepurchasePackMeasure("12/16 ملم")).toBeNull();
  });
});
