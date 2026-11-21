import { describe, expect, it } from "vitest";
import { expenseInputSchema } from "../accounting";

describe("expense input boundaries", () => {
  const valid = {category:"other",amount:"2500",expenseDate:"2026-11-21"};
  it("accepts a valid dated expense and a real leap day", () => {
    expect(expenseInputSchema.parse(valid).amount).toBe(2500);
    expect(expenseInputSchema.safeParse({...valid,expenseDate:"2024-02-29"}).success).toBe(true);
  });
  it.each(["Infinity","NaN",-1,0,Number.MAX_SAFE_INTEGER+1])("rejects invalid money %s", amount => {
    expect(expenseInputSchema.safeParse({...valid,amount}).success).toBe(false);
  });
  it.each(["2026-02-30","2025-02-29","2026-13-01"]) ("rejects invalid calendar date %s",expenseDate => {
    expect(expenseInputSchema.safeParse({...valid,expenseDate}).success).toBe(false);
  });
});
